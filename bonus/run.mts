import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { readApproval } from './approval.mts';
import { bonusRoot, candidatePath, repositoryRoot, withScratchDirectory, writeExclusiveFile } from './paths.mts';

const usage = 'Explicitly select one spec. Usage: npm run bonus:test -- --file name.spec.ts';

function readExecutionSelection(args: string[]): string {
  try {
    const { values, tokens } = parseArgs({ args, tokens: true, options: { file: { type: 'string' } } });
    if (values.file && tokens.length === 1) return values.file;
  } catch {
    // Report the same usage for malformed arguments and a missing selection.
  }
  throw new Error(usage);
}

function runPlaywright(directory: string, name: string): Promise<void> {
  const require = createRequire(import.meta.url);
  const cli = join(dirname(require.resolve('playwright/package.json')), 'cli.js');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'test', '--config', join(bonusRoot, 'playwright.config.mts')], {
      cwd: repositoryRoot,
      env: { ...process.env, BONUS_RUN_DIRECTORY: basename(directory), BONUS_RUN_FILE: name },
      shell: false,
      windowsHide: true,
      stdio: 'inherit',
    });
    child.once('error', () => reject(new Error('Could not start Playwright.')));
    child.once('close', (status, signal) => {
      if (status === 0) resolve();
      else reject(new Error(signal ? 'Playwright was interrupted.' : `Playwright exited with code ${status}.`));
    });
  });
}

async function main(): Promise<void> {
  const name = readExecutionSelection(process.argv.slice(2));
  const approved = readApproval(name);
  await withScratchDirectory(join(bonusRoot, '.run-'), async directory => {
    writeExclusiveFile(candidatePath(name, directory), approved.source);
    return runPlaywright(directory, name);
  }, name);
}

if (import.meta.main) {
  main().catch((error: NodeJS.ErrnoException) => {
    process.exitCode = 1;
    console.error(error.code ? 'Could not access a required local file or directory.' : error.message);
  });
}
