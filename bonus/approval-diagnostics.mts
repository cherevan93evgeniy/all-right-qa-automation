import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { test } from 'node:test';
import { runSubprocess } from './codex.mts';
import { bonusRoot, generatedRoot, verifyDirectory } from './paths.mts';

test('approves exact synthetic bytes and executes only the explicitly selected spec', async () => {
  verifyDirectory(generatedRoot);
  const workspace = mkdtempSync(join(generatedRoot, '.approval-check-'));
  const bonus = join(workspace, 'bonus');
  const generated = join(bonus, 'generated');
  const approved = join(bonus, 'approved');
  const fixtures = join(workspace, 'fixtures');
  const name = 'synthetic.spec.ts';
  const candidate = join(generated, name);
  const record = join(approved, `${name}.approved.json`);
  const source = '\uFEFF' + [
    "import { test, expect } from '../../fixtures/ui.fixture';",
    "test('synthetic approval workflow', async ({ loginPage }) => {",
    "  expect(loginPage.name).toBe('local fixture');",
    '});', '',
  ].join('\r\n');
  const sha256 = createHash('sha256').update(source).digest('hex');
  const cli = (entry: string, ...args: string[]) =>
    runSubprocess(process.execPath, [join(bonus, entry), ...args], { cwd: workspace, timeoutMs: 20_000 });
  const approve = (hash: string) => cli('approval.mts', '--file', name, '--sha256', hash);
  const run = () => cli('run.mts', '--file', name);
  async function rejects(result: ReturnType<typeof cli>, reason: RegExp): Promise<void> {
    const output = await result;
    assert.notEqual(output.status, 0);
    assert.match(output.stderr, reason);
  }

  try {
    mkdirSync(bonus);
    mkdirSync(generated);
    mkdirSync(fixtures);
    for (const file of ['approval.mts', 'paths.mts', 'validate.mts', 'run.mts', 'playwright.config.mts']) {
      copyFileSync(join(bonusRoot, file), join(bonus, file));
    }
    writeFileSync(join(fixtures, 'ui.fixture.ts'), `
      import { test as base, expect } from '@playwright/test';
      export const test = base.extend<{ loginPage: { name: string } }>({
        loginPage: async ({}, use) => { await use({ name: 'local fixture' }); },
      });
      export { expect };
    `);
    writeFileSync(candidate, source);
    writeFileSync(join(generated, 'unrelated.spec.ts'), 'intentionally invalid TypeScript');

    await rejects(cli('run.mts'), /Explicitly select one spec/);
    await rejects(cli('run.mts', '--file', name, '--file', name), /Explicitly select one spec/);
    const redirected = join(bonus, 'redirect-target');
    mkdirSync(redirected);
    symlinkSync(redirected, approved, process.platform === 'win32' ? 'junction' : 'dir');
    await rejects(approve(sha256), /symlinks or junctions/);
    await rejects(run(), /symlinks or junctions/);
    unlinkSync(approved);
    mkdirSync(approved);
    writeFileSync(join(approved, name), source);
    writeFileSync(join(approved, 'unrelated.spec.ts.approved.json'), 'intentionally invalid record');
    await rejects(run(), /No approval record/);
    await rejects(approve('0'.repeat(64)), /Candidate SHA-256 does not match/);
    await rejects(approve('invalid'), /64-character hexadecimal SHA-256/);
    await rejects(cli('approval.mts', '--file', '../synthetic.spec.ts', '--sha256', sha256), /plain lowercase/);
    const linkedCandidate = join(generated, 'linked.spec.ts');
    linkSync(candidate, linkedCandidate);
    await rejects(cli('approval.mts', '--file', 'linked.spec.ts', '--sha256', sha256), /regular, unlinked file/);
    unlinkSync(linkedCandidate);

    const invalidSource = source.replace("expect(loginPage.name).toBe('local fixture');", 'expect(true).toBe(true);');
    writeFileSync(candidate, invalidSource);
    await rejects(approve(createHash('sha256').update(invalidSource).digest('hex')), /Assertions comparing only primitive literals/);
    writeFileSync(candidate, source);
    const approval = await approve(sha256.toUpperCase());
    assert.equal(approval.status, 0, approval.stderr);
    assert.deepEqual(JSON.parse(readFileSync(record, 'utf8')), { sha256, source });
    await rejects(approve(sha256), /Approval already exists/);
    assert.deepEqual(JSON.parse(readFileSync(record, 'utf8')), { sha256, source });

    writeFileSync(record, JSON.stringify({ sha256, source: source + '// modified' }));
    await rejects(run(), /Approved source does not match its recorded SHA-256/);
    writeFileSync(record, JSON.stringify({ sha256, source }));
    const staged = mkdtempSync(join(bonus, '.run-'));
    writeFileSync(join(staged, name), source + '// modified');
    const config = join(bonus, 'playwright.config.mts');
    const configLoader = `
      process.env.BONUS_RUN_DIRECTORY = process.argv[1];
      process.env.BONUS_RUN_FILE = process.argv[2];
      import(require('node:url').pathToFileURL(process.argv[3]).href).catch(error => {
        console.error(error.message);
        process.exitCode = 1;
      });
    `;
    await rejects(runSubprocess(process.execPath, ['-e', configLoader, '', '', config],
      { cwd: workspace, timeoutMs: 5_000 }), /Use npm run bonus:test/);
    await rejects(runSubprocess(process.execPath, ['-e', configLoader, basename(staged), name, config],
      { cwd: workspace, timeoutMs: 5_000 }), /Staged source does not match the approved SHA-256/);
    unlinkSync(join(staged, name));
    rmdirSync(staged);

    const result = await run();
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /synthetic approval workflow/);
    assert.match(result.stdout, /1 passed/);
    assert.equal(readdirSync(bonus).some(file => file.startsWith('.run-')), false);
  } finally {
    verifyDirectory(workspace);
    if (dirname(workspace) === generatedRoot && basename(workspace).startsWith('.approval-check-')) {
      rmSync(workspace, { recursive: true });
    }
  }
});
