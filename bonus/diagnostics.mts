import assert from 'node:assert/strict';
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { watch } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { createCodexStream, decodeResponse, requireSuccessfulExit, runSubprocess } from './codex.mts';
import { readTestCase, validateInput } from './generate.mts';
import { bonusRoot, candidatePath, examplesRoot, generatedRoot, repositoryRoot, withScratchDirectory, writeExclusiveFile } from './paths.mts';
import { CandidateError, validateCandidate } from './validate.mts';

const validInput = '## Steps\n1. Open login.\n\n## Expected result\n- The form is visible.';
const fixtureImport = "import { test, expect } from '../../fixtures/ui.fixture';";
const validBody = 'await loginPage.open(); await expect(loginPage.form).toBeVisible();';
const virtualFile = candidatePath('diagnostic.spec.ts');
const spec = (body: string) => `${fixtureImport}
test('synthetic diagnostic', async ({ loginPage, page }) => { ${body} });`;

test('validates both plain text and Markdown section headings', () => {
  assert.equal(validateInput(validInput), validInput);
  assert.equal(validateInput('Steps:\r\nOpen login.\r\nExpected result:\r\nForm visible.').includes('\r\n'), true);
  assert.doesNotThrow(() => validateInput('Steps:\nRead the quantity.\nExpected result:\n1'));
});

const inputFailures: Array<[string, () => unknown, RegExp]> = [
  ['missing input file', () => readTestCase(join(examplesRoot, 'missing-diagnostic-case.md')), /does not exist/],
  ['empty input', () => validateInput('\n  '), /empty/],
  ['missing steps', () => validateInput('Expected result:\nForm visible.'), /Steps section/],
  ['a Markdown divider in place of steps', () => validateInput('Steps:\n---\nExpected result:\nForm visible.'), /Steps section/],
  ['missing expected result', () => validateInput('Steps:\nOpen Login.'), /Expected result section/],
  ['unsupported extension', () => readTestCase(join(examplesRoot, 'case.json')), /Unsupported input extension/],
  ['oversized input', () => validateInput('x'.repeat(12_289)), /too large/],
  ['input outside the scenario directory', () => readTestCase(join(repositoryRoot, 'AGENTS.md')), /under bonus\/examples/],
];
for (const [name, attempt, message] of inputFailures) {
  test(`rejects ${name}`, () => assert.throws(attempt, message));
}

test('rejects traversal, absolute output, Windows alternate streams and reserved names', () => {
  for (const name of ['../out.spec.ts', 'nested/out.spec.ts', 'C:\\out.spec.ts', '/out.spec.ts',
    'out.spec.ts:stream', 'nul.spec.ts', 'out.spec.ts\n']) {
    assert.throws(() => candidatePath(name), /plain lowercase/);
  }
});

test('rejects a redirected output directory component', () => {
  const scratch = mkdtempSync(join(generatedRoot, '.path-check-'));
  const destination = join(scratch, 'target');
  const redirect = join(scratch, 'redirect');
  mkdirSync(destination);
  try {
    symlinkSync(destination, redirect, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => candidatePath('case.spec.ts', redirect), /symlinks or junctions/);
  } finally {
    try {
      unlinkSync(redirect);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    rmdirSync(destination);
    rmdirSync(scratch);
  }
});

test('rejects redirected input paths and invalid UTF-8', () => {
  const scratch = mkdtempSync(join(examplesRoot, '.input-check-'));
  const original = join(scratch, 'source.md');
  const hardLink = join(scratch, 'linked.md');
  const redirect = join(scratch, 'redirect');
  try {
    writeFileSync(original, Buffer.from([0xc3, 0x28]), { flag: 'wx' });
    assert.throws(() => readTestCase(original), /must be UTF-8 text/);
    linkSync(original, hardLink);
    assert.throws(() => readTestCase(hardLink), /regular, unlinked file/);
    symlinkSync(scratch, redirect, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => readTestCase(join(redirect, 'source.md')), /symlinks or junctions/);
  } finally {
    for (const file of [redirect, hardLink, original]) {
      try {
        unlinkSync(file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    rmdirSync(scratch);
  }
});

test('exclusive creation rejects a competing output and preserves its bytes', () => {
  const scratch = mkdtempSync(join(generatedRoot, '.exclusive-check-'));
  const target = candidatePath('existing.spec.ts', scratch);
  try {
    writeExclusiveFile(target, 'first writer');
    assert.throws(() => writeExclusiveFile(target, 'second writer'), { code: 'EEXIST' });
    assert.equal(readFileSync(target, 'utf8'), 'first writer');
  } finally {
    unlinkSync(target);
    rmdirSync(scratch);
  }
});

test('rejects an existing output before starting Codex', async () => {
  const name = `diagnostic-existing-${process.pid}.spec.ts`;
  const target = candidatePath(name);
  const marker = 'Synthetic diagnostic marker';
  writeFileSync(target, marker, { flag: 'wx' });
  try {
    const cli = join(bonusRoot, 'generate.mts');
    const input = join(examplesRoot, 'add-to-cart.md');
    const result = await runSubprocess(process.execPath, [cli, '--input', input, '--output', name],
      { cwd: repositoryRoot, timeoutMs: 5_000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Output already exists/);
    assert.equal(readFileSync(target, 'utf8'), marker);
  } finally {
    unlinkSync(target);
  }
});

test('rejects unsupported and malformed providers before attempting generation', async () => {
  const cli = join(bonusRoot, 'generate.mts');
  const options = { cwd: repositoryRoot, timeoutMs: 5_000 };
  for (const [args, reason] of [
    [['--provider', 'unsupported', '--input', 'unused.md'], /Unsupported AI provider.*codex/],
    [['--provider'], /Invalid arguments/],
    [['--provider', 'unsupported', '--provider', 'codex'], /Invalid arguments/],
  ] satisfies [string[], RegExp][]) {
    const result = await runSubprocess(process.execPath, [cli, ...args], options);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, reason);
  }
});

test('typechecks in-memory assertions using fixed expectations against observed data', () => {
  assert.doesNotThrow(() => validateCandidate(spec(`${validBody} expect(page.url()).toBe('https://example.invalid/');`), virtualFile));
});

const memberError = /Property access is outside the supported UI test API/;
const bindingError = /Only local and approved imported bindings are available/;
const importError = /Import source or form is prohibited/;
const validationFailures: Array<[string, string, CandidateError['stage'], RegExp]> = [
  ['invalid TypeScript', spec('const missing = ;'), 'syntax', /TS1109/],
  ['unexpected top-level code', spec(validBody).replace(fixtureImport, `${fixtureImport}\nconst extra = 1;`), 'static', /Only supported named imports/],
  ['prohibited filesystem import', `import { readFileSync } from 'node:fs';\n${spec(validBody)}`, 'static', importError],
  ['dynamic imports', spec(`await import('node:fs'); ${validBody}`), 'static', /ImportKeyword/],
  ['child-process execution', `import { execSync } from 'node:child_process';\n${spec(validBody)}`, 'static', importError],
  ['filesystem access through a global', spec(`require('fs'); ${validBody}`), 'static', bindingError],
  ['indirect filesystem access via a global alias', spec(`const load = require; load('fs'); ${validBody}`), 'static', bindingError],
  ['arbitrary browser navigation', spec(`await page.goto('https://example.invalid'); ${validBody}`), 'static', memberError],
  ['arbitrary networking', spec(`await fetch('https://example.invalid'); ${validBody}`), 'static', bindingError],
  ['environment access', spec(`expect(process.env).toBeVisible(); ${validBody}`), 'static', memberError],
  ['runtime code evaluation', spec(`eval('diagnostic-only'); ${validBody}`), 'static', bindingError],
  ['function constructors', spec(`new Function('diagnostic-only'); ${validBody}`), 'static', /NewExpression/],
  ['computed property access', spec(`await page['goto']('https://example.invalid'); ${validBody}`), 'static', /ElementAccessExpression/],
  ['destructured raw browser capabilities', spec(`const { goto } = page; await goto('https://example.invalid'); ${validBody}`), 'static', /Only simple product-data destructuring/],
  ['aliased test declaration', spec(`const register = test; ${validBody}`), 'static', /reserved for the top-level declaration/],
  ['a bare expect call without a matcher', spec('expect(loginPage.form);'), 'static', /Expected a Playwright matcher call/],
  ['a literal-only assertion', spec('expect(true).toBe(true);'), 'static', /Assertions comparing only primitive literals/],
  ['a fixed assertion timeout', spec('await expect(loginPage.form).toBeVisible({ timeout: 500 });'), 'static', /Explicit timeouts/],
  ['focused test', spec(validBody).replace("test('", "test.only('"), 'static', /Expected a plain test/],
  ['skipped test', spec(`test.skip(); ${validBody}`), 'static', memberError],
  ['fixme test', spec(`test.fixme(); ${validBody}`), 'static', memberError],
  ['compiler suppression directives', `// @ts-nocheck\n${spec(validBody)}`, 'static', /Compiler and source-map directives/],
  ['type mismatch on approved API', spec(`await loginPage.login(5, 5); ${validBody}`), 'typecheck', /TS2345/],
];
for (const [name, code, stage, reason] of validationFailures) {
  test(`rejects ${name} without executing the spec`, () => {
    assert.throws(() => validateCandidate(code, virtualFile),
      error => error instanceof CandidateError && error.stage === stage && reason.test(error.message));
  });
}

test('rejects unexpected, empty, and ambiguous model output', () => {
  assert.throws(() => decodeResponse('```typescript\ncode\n```'), /invalid JSON/);
  assert.throws(() => decodeResponse(''), /no candidate/);
  assert.throws(() => decodeResponse('{"code":" ","limitation":""}'), /empty or ambiguous/);
  assert.throws(() => decodeResponse('{"code":"code","note":"unexpected"}'), /expected schema/);
  assert.throws(() => decodeResponse('{"code":"","limitation":"diagnostic detail"}'), /could not implement/);
  assert.equal(decodeResponse(JSON.stringify({ code: spec(validBody) + '\n', limitation: '' })), spec(validBody) + '\n');
});

const thread = { type: 'thread.started', thread_id: 'synthetic-thread' };
const started = { type: 'turn.started' };
const message = {
  type: 'item.completed',
  item: { id: 'item_1', type: 'agent_message', text: JSON.stringify({ code: spec(validBody), limitation: '' }) },
};
const completed = {
  type: 'turn.completed',
  usage: { input_tokens: 1, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0 },
};

function parseEvents(events: object[]): string {
  const stream = createCodexStream();
  for (const event of events) stream.onLine(JSON.stringify(event));
  return stream.finish();
}

test('accepts one completed response after a warning item and a recovered stream error', async () => {
  const warning = { type: 'item.completed', item: { id: 'item_0', type: 'error', message: 'Synthetic warning' } };
  const reasoning = { type: 'item.completed', item: { id: 'item_2', type: 'reasoning', text: 'Synthetic reasoning' } };
  const retryError = { type: 'error', message: 'Synthetic retryable error' };
  const events = [thread, warning, started, retryError, reasoning, message, completed];
  const stream = createCodexStream();
  const lines = events.map(event => JSON.stringify(event)).join('\r\n');
  const result = await runSubprocess(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', lines],
    { cwd: repositoryRoot, timeoutMs: 5_000, onLine: stream.onLine });
  requireSuccessfulExit(result);
  assert.equal(stream.finish(), spec(validBody));
});

test('rejects malformed JSONL, invalid fields and unexpected event types', () => {
  assert.throws(() => createCodexStream().onLine('{'), /malformed JSONL/);
  assert.throws(() => parseEvents([{ type: 'thread.started' }]), /invalid fields/);
  assert.throws(() => parseEvents([thread, { type: 'unexpected' }]), /unexpected event type/);
  assert.throws(() => parseEvents([thread, started, message, { type: 'turn.completed', usage: {} }]), /invalid fields/);
  const toolItem = { type: 'item.started', item: { id: 'item_0', type: 'command_execution' } };
  assert.throws(() => parseEvents([thread, started, toolItem]), /unexpected tool or execution event/);
});

test('requires the ordered lifecycle and exactly one final response', () => {
  assert.throws(() => parseEvents([thread, message, started, completed]), /out of turn order/);
  assert.throws(() => parseEvents([thread, started, message, { ...message, item: { ...message.item, id: 'item_2' } }]),
    /more than one final response/);
  assert.throws(() => parseEvents([thread, started, completed]), /without a final response/);
  assert.throws(() => parseEvents([thread, started, message]), /incomplete event stream/);
  assert.throws(() => parseEvents([thread, started, message, completed, started]), /out of turn order/);
});

test('sanitizes fatal error events and rejects malformed warning items', () => {
  const secret = 'synthetic diagnostic text';
  assert.throws(() => parseEvents([thread, started, { type: 'error', message: secret }]),
    { message: 'Codex reported a stream error without completing the turn. Diagnostics were withheld.' });
  assert.throws(() => parseEvents([thread, started, { type: 'turn.failed', error: { message: secret } }]),
    { message: 'Codex reported a failed turn. Diagnostics were withheld.' });
  assert.throws(() => parseEvents([thread, { type: 'item.completed', item: { id: 'item_0', type: 'error' } }]),
    /invalid fields/);
});

test('handles a mock nonzero subprocess exit without relaying diagnostics', async () => {
  const result = await runSubprocess(process.execPath, ['-e', 'console.error("diagnostic marker"); process.exit(7)'],
    { cwd: repositoryRoot, timeoutMs: 5_000 });
  assert.throws(() => requireSuccessfulExit(result), { message: 'Codex exec failed with exit code 7. Diagnostics were withheld.' });
});

test('caps combined subprocess output and rejects invalid stream encoding', async () => {
  const options = { cwd: repositoryRoot, timeoutMs: 5_000, onLine: createCodexStream().onLine };
  await assert.rejects(runSubprocess(process.execPath, ['-e',
    'process.stdout.write(Buffer.alloc(150 * 1024, 32)); process.stderr.write(Buffer.alloc(150 * 1024, 32));'],
    options), /output exceeded the capture limit/);
  await assert.rejects(runSubprocess(process.execPath, ['-e', 'process.stdout.write(Buffer.from([0xc3, 10]));'],
    options), /invalid UTF-8 in its JSONL stream/);
});

test('terminates a mock subprocess on timeout', async () => {
  await assert.rejects(runSubprocess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'],
    { cwd: repositoryRoot, timeoutMs: 300 }), /Codex timed out/);
});

test('preserves the original operation error when cleanup also fails', async context => {
  const original = new Error('Original synthetic failure');
  const log = context.mock.method(console, 'error', () => {});
  let directory: string | undefined;
  try {
    await assert.rejects(withScratchDirectory(join(generatedRoot, '.cleanup-check-'), async scratch => {
      directory = scratch;
      writeExclusiveFile(join(scratch, 'unexpected.txt'), 'marker');
      throw original;
    }), error => error === original);
    assert.match(String(log.mock.calls[0]?.arguments[0]), /Could not clean up the temporary directory/);
  } finally {
    if (directory) {
      unlinkSync(join(directory, 'unexpected.txt'));
      rmdirSync(directory);
    }
  }
});

test('observes a self-terminating Windows descendant after its parent times out', {
  skip: process.platform !== 'win32',
}, async context => {
  await withScratchDirectory(join(generatedRoot, '.timeout-check-'), async directory => {
    const marker = 'mock-child.spec.ts';
    const markerPath = join(directory, marker);
    const childCode = `
      const fs = require("node:fs");
      console.log("mock-child-ready");
      setTimeout(() => fs.writeFileSync(process.argv[1], "finished"), 2200);
    `;
    const parentCode = `
      require("node:child_process").spawn(process.execPath, ["-e", process.argv[1], process.argv[2]], {
        shell: false, windowsHide: true, stdio: ["ignore", 1, "ignore"],
      });
      setInterval(() => {}, 1000);
    `;
    let ready = false;
    await assert.rejects(runSubprocess(process.execPath, ['-e', parentCode, childCode, markerPath], {
      cwd: directory, timeoutMs: 1500, onLine: line => { ready ||= line === 'mock-child-ready'; },
    }), /Codex timed out/);
    assert.equal(ready, true, 'the controlled descendant must start before its parent times out');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const events = watch(directory, { signal: controller.signal });
      const pending = events.next();
      if (existsSync(markerPath)) controller.abort();
      await pending.catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ABORT_ERR') throw error;
      });
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
    context.diagnostic(existsSync(markerPath)
      ? 'The controlled descendant reached its completion marker after the parent timeout.'
      : 'The controlled descendant did not reach its completion marker after the parent timeout.');
  }, 'mock-child.spec.ts');
});
