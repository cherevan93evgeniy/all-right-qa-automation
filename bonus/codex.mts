import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';
import { generatedRoot, promptsRoot, readRegularFile, withScratchDirectory } from './paths.mts';
import type { TestGenerationProvider } from './provider.mts';

const version = 'codex-cli 0.172.0';
const captureLimit = 256 * 1024;
const generationTimeoutMs = 180_000;
const allowedEnvironment = new Set([
  'PATH', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR',
  'LOCALAPPDATA', 'APPDATA', 'PROGRAMDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'COMMONPROGRAMFILES',
  'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'CODEX_HOME', 'XDG_CONFIG_HOME',
  'XDG_DATA_HOME', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS',
]);

const execFlags = [
  '--no-daemon', '--ask-for-approval', 'never', 'exec', '--strict-config', '--ignore-user-config', '--ignore-rules',
  '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only',
  '--disable', 'shell_tool', '--disable', 'shell_snapshot', '--disable', 'view_image',
  '--disable', 'apps', '--disable', 'plugins', '--disable', 'hooks', '--disable', 'memories',
  '--disable', 'multi_agent', '--disable', 'browser_use', '--disable', 'computer_use',
  '--disable', 'image_generation', '--enable', 'skip_host_skill_discovery',
  '-c', 'mcp_servers={}', '-c', 'web_search="disabled"', '-c', 'project_doc_max_bytes=0', '-c', 'project_root_markers=[]',
  '-c', 'forced_login_method="chatgpt"', '-c', 'analytics.enabled=false',
  '-c', 'feedback.enabled=false', '--json', '--color', 'never',
];

function executable(): string {
  const search = (process.env.PATH ?? '').split(delimiter).filter(isAbsolute);
  if (process.platform !== 'win32') {
    const binary = search.map(directory => join(directory, 'codex')).find(existsSync);
    if (binary) return binary;
  } else {
    const platform = process.arch === 'arm64' ? 'arm64' : 'x64';
    const target = platform === 'arm64' ? 'aarch64-pc-windows-msvc' : 'x86_64-pc-windows-msvc';
    for (const directory of search) {
      const npmScope = join(directory, 'node_modules', '@openai');
      const candidates = [join(directory, 'codex.exe')];
      if (existsSync(join(directory, 'codex.cmd'))) {
        // Resolve the native binary used by the official npm shim. No cmd.exe command string.
        for (const scope of [join(npmScope, 'codex', 'node_modules', '@openai'), npmScope]) {
          candidates.push(join(scope, `codex-win32-${platform}`, 'vendor', target, 'bin', 'codex.exe'));
        }
      }
      const binary = candidates.find(existsSync);
      if (binary) return binary;
    }
  }
  throw new Error('Codex CLI is unavailable. Install the official Codex CLI and add it to PATH.');
}

type Result = { status: number; stdout: string; stderr: string };
type RunOptions = { cwd: string; timeoutMs: number; input?: string; onLine?: (line: string) => void };

export function runSubprocess(command: string, args: string[], options: RunOptions): Promise<Result> {
  return new Promise((resolve, reject) => {
    const posix = process.platform !== 'win32';
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => allowedEnvironment.has(name.toUpperCase())));
    const child = spawn(command, args, {
      cwd: options.cwd, env, shell: false, detached: posix, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let failure: Error | undefined;
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let pending = Buffer.alloc(0);
    let size = 0;
    const decoder = new TextDecoder('utf-8', { fatal: true });

    function deliverLine(line: Buffer): void {
      let decoded: string;
      try {
        decoded = decoder.decode(line);
      } catch {
        throw new Error('Codex returned invalid UTF-8 in its JSONL stream.');
      }
      options.onLine?.(decoded);
    }

    function stop(error: Error): void {
      if (failure) return;
      failure = error;
      if (child.pid) {
        try {
          if (posix) process.kill(-child.pid, 'SIGKILL');
          else child.kill('SIGKILL');
        } catch {
          child.kill('SIGKILL');
        }
      }
      child.stdin.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
    }
    const interrupt = () => stop(new Error('Generation interrupted.'));
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    const timer = setTimeout(() => stop(new Error('Codex timed out. No candidate was written.')), options.timeoutMs);
    function capture(chunk: Buffer, destination: Buffer[]): boolean {
      if (failure) return false;
      size += chunk.length;
      if (size > captureLimit) {
        stop(new Error('Codex output exceeded the capture limit.'));
        return false;
      }
      destination.push(chunk);
      return true;
    }
    child.stdout.on('data', (chunk: Buffer) => {
      if (!capture(chunk, stdout) || !options.onLine) return;
      const lines = Buffer.concat([pending, chunk]);
      let start = 0;
      try {
        for (let index = lines.indexOf(10); index !== -1; index = lines.indexOf(10, start)) {
          deliverLine(lines.subarray(start, index));
          start = index + 1;
        }
        pending = lines.subarray(start);
      } catch (error) {
        stop(error instanceof Error ? error : new Error('Codex sent an invalid event.'));
      }
    });
    child.stderr.on('data', (chunk: Buffer) => capture(chunk, stderr));
    child.stdin.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EPIPE') stop(new Error('Could not send the prompt to Codex.'));
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      stop(new Error(error.code === 'ENOENT' ? 'Codex CLI is unavailable.' : 'Could not start Codex.'));
    });
    child.once('close', (status, signal) => {
      clearTimeout(timer);
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
      if (failure) reject(failure);
      else if (signal || status === null) reject(new Error('Generation interrupted.'));
      else {
        try {
          if (pending.length) deliverLine(pending);
          resolve({ status, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') });
        } catch (error) {
          reject(error);
        }
      }
    });
    child.stdin.end(options.input);
  });
}

export function decodeResponse(message: string): string {
  if (!message.trim()) throw new Error('Codex returned no candidate.');
  let response: unknown;
  try {
    response = JSON.parse(message);
  } catch {
    throw new Error('Codex returned invalid JSON instead of the response object.');
  }
  if (!response || typeof response !== 'object' || Object.keys(response).length !== 2
    || !('code' in response) || !('limitation' in response)
    || typeof response.code !== 'string' || typeof response.limitation !== 'string') {
    throw new Error('Codex response did not match the expected schema.');
  }
  if (response.limitation.trim() && !response.code.trim()) {
    throw new Error('Codex reported that it could not implement the case with the supplied UI API.');
  }
  if (response.limitation !== '' || !response.code.trim()) {
    throw new Error('Codex returned an empty or ambiguous candidate.');
  }
  return response.code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const usageFields = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens'];

// Based on exec_events.rs and event_processor_with_jsonl_output.rs at rust-v0.172.0.
export function createCodexStream() {
  let state: 'initial' | 'thread' | 'running' | 'completed' = 'initial';
  let message: string | undefined;
  let sawStreamError = false;
  const itemIds = new Set<string>();
  const malformed = () => new Error('Codex returned an event with invalid fields.');
  const invalidOrder = () => new Error('Codex returned events out of turn order.');

  function onLine(line: string): void {
    if (!line.trim()) return;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error('Codex returned malformed JSONL.');
    }
    if (!isRecord(event) || typeof event.type !== 'string') throw malformed();
    const keys = Object.keys(event).length;
    if (state === 'completed') throw invalidOrder();
    switch (event.type) {
      case 'thread.started':
        if (keys !== 2 || typeof event.thread_id !== 'string' || !event.thread_id.trim()) throw malformed();
        if (state !== 'initial') throw invalidOrder();
        state = 'thread';
        break;
      case 'turn.started':
        if (keys !== 1) throw malformed();
        if (state !== 'thread') throw invalidOrder();
        state = 'running';
        break;
      case 'turn.completed': {
        const usage = event.usage;
        if (keys !== 2 || !isRecord(usage) || Object.keys(usage).length !== usageFields.length
          || !usageFields.every(field => typeof usage[field] === 'number' && Number.isSafeInteger(usage[field]) && usage[field] >= 0)) {
          throw malformed();
        }
        if (state !== 'running') throw invalidOrder();
        if (message === undefined) throw new Error('Codex completed the turn without a final response.');
        state = 'completed';
        break;
      }
      case 'turn.failed':
        if (keys !== 2 || !isRecord(event.error) || typeof event.error.message !== 'string') throw malformed();
        if (state !== 'running') throw invalidOrder();
        throw new Error('Codex reported a failed turn. Diagnostics were withheld.');
      case 'error':
        if (keys !== 2 || typeof event.message !== 'string') throw malformed();
        if (state !== 'running') throw invalidOrder();
        // The CLI omits its retry flag here. Require completion and a successful exit.
        sawStreamError = true;
        break;
      case 'item.started':
      case 'item.updated':
      case 'item.completed': {
        const item = event.item;
        if (keys !== 2 || !isRecord(item) || typeof item.id !== 'string' || !item.id.trim()
          || typeof item.type !== 'string') throw malformed();
        if (!['reasoning', 'agent_message', 'error'].includes(item.type)) {
          throw new Error('Codex reported an unexpected tool or execution event.');
        }
        // This CLI emits warnings as completed error items, including at startup.
        if (Object.keys(item).length !== 3 || typeof item[item.type === 'error' ? 'message' : 'text'] !== 'string') throw malformed();
        if (event.type !== 'item.completed' || itemIds.has(item.id)
          || (item.type === 'error' ? state === 'initial' : state !== 'running')) throw invalidOrder();
        itemIds.add(item.id);
        if (item.type === 'agent_message' && typeof item.text === 'string') {
          if (message !== undefined) throw new Error('Codex returned more than one final response.');
          message = item.text;
        }
        break;
      }
      default:
        throw new Error('Codex returned an unexpected event type.');
    }
  }

  function finish(): string {
    if (state !== 'completed' || message === undefined) {
      throw new Error(sawStreamError
        ? 'Codex reported a stream error without completing the turn. Diagnostics were withheld.'
        : 'Codex returned an incomplete event stream.');
    }
    return decodeResponse(message);
  }

  return { onLine, finish };
}

export function requireSuccessfulExit(response: Result): void {
  if (response.status === 0) return;
  const diagnostics = `${response.stderr}\n${response.stdout}`;
  if (/\b401\b|unauthorized|authentication required|not logged in/i.test(diagnostics)) {
    throw new Error('Codex could not authenticate. Run codex login and sign in with your own account.');
  }
  if (/\b429\b|rate.limit|usage limit/i.test(diagnostics)) {
    throw new Error('Codex could not complete generation within the account usage limits.');
  }
  throw new Error(`Codex exec failed with exit code ${response.status}. Diagnostics were withheld.`);
}

async function generateWithCodex(cwd: string, schema: string, prompt: string): Promise<string> {
  const binary = executable();
  const check = { cwd, timeoutMs: 15_000 };
  const installed = await runSubprocess(binary, ['--version'], check);
  if (installed.status !== 0 || installed.stdout.trim() !== version) {
    throw new Error(`Use the audited Codex CLI version ${version.split(' ')[1]} for this generator.`);
  }
  const auth = await runSubprocess(binary, ['login', 'status', '-c', 'forced_login_method="chatgpt"'], check);
  if (auth.status !== 0 || !/^Logged in using ChatGPT$/m.test(`${auth.stdout}\n${auth.stderr}`.replace(/\r/g, ''))) {
    throw new Error('ChatGPT authentication is unavailable. Run codex login and sign in with your own account.');
  }

  const stream = createCodexStream();
  const response = await runSubprocess(binary, [...execFlags, '--output-schema', schema, '-'], {
    cwd, timeoutMs: generationTimeoutMs, input: prompt, onLine: stream.onLine,
  });
  requireSuccessfulExit(response);
  return stream.finish();
}

export const codexProvider: TestGenerationProvider = {
  async generate(prompt) {
    const schema = join(promptsRoot, 'response.schema.json');
    readRegularFile(schema, 4_000, 'Response schema');
    return withScratchDirectory(join(generatedRoot, '.codex-'), cwd => generateWithCodex(cwd, schema, prompt));
  },
};
