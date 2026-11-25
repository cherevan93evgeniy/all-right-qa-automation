import { lstatSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { codexProvider } from './codex.mts';
import { candidatePath, inputPath, promptsRoot, readRegularFile, repositoryRoot, resemblesCredential, writeExclusiveFile } from './paths.mts';
import type { TestGenerationProvider } from './provider.mts';
import { CandidateError, candidateMembers, validateCandidate } from './validate.mts';

const inputLimit = 12 * 1024;
const help = `Usage: npm run bonus:generate -- --input bonus/examples/add-to-cart.md [--output name.spec.ts] [--provider codex]

Input: a UTF-8 .txt or .md case under bonus/examples/ with Steps and Expected result sections.
Output: one candidate in bonus/generated/. Existing paths are never overwritten.
Review the complete candidate before running bonus:approve. Codex is the default provider.`;

function selectProvider(name: string): TestGenerationProvider {
  if (name !== 'codex') throw new Error('Unsupported AI provider. Supported provider: codex.');
  return codexProvider;
}

export function readTestCase(argument: string): string {
  const file = inputPath(argument);
  if (!['.md', '.txt'].includes(extname(file).toLowerCase())) {
    throw new Error('Unsupported input extension. Use .md or .txt.');
  }
  let input: string;
  try {
    input = readRegularFile(file, inputLimit, 'Input');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('Input file does not exist.');
    throw error;
  }
  return validateInput(input.replace(/^\uFEFF/, ''));
}

export function validateInput(input: string): string {
  if (Buffer.byteLength(input) > inputLimit) throw new Error('Input is too large (limit 12288 bytes).');
  if (!input.trim()) throw new Error('Input is empty.');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input)) throw new Error('Input must be plain text.');
  if (resemblesCredential(input)) {
    throw new Error('Input resembles a credential. Submit only non-sensitive scenario data.');
  }
  const sections = [...input.matchAll(
    /^[ \t]*(?:#{1,6}[ \t]+)?(?:\*\*)?(test steps|steps|expected results?|title|preconditions?)(?:\*\*)?[ \t]*:?(?:\*\*)?[ \t]*\r?$/gim,
  )];
  function hasContent(label: RegExp): boolean {
    return sections.some((section, index) => {
      if (!label.test(section[1])) return false;
      const body = input.slice(section.index + section[0].length, sections[index + 1]?.index);
      return body.split(/\r?\n/).some(line => !/^\s*(?:[-*_]\s*){3,}$/.test(line)
        && line.replace(/^\s*(?:[-*+]\s*|\d+[.)]\s*)/, '').trim());
    });
  }
  if (!hasContent(/^(?:test )?steps$/i)) throw new Error('Input must contain a nonempty Steps section.');
  if (!hasContent(/^expected results?$/i)) throw new Error('Input must contain a nonempty Expected result section.');
  return input;
}

function ensureUnused(file: string): void {
  try {
    lstatSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  throw new Error('Output already exists. Choose another filename with --output.');
}

async function main(): Promise<void> {
  let values;
  try {
    const parsed = parseArgs({
      tokens: true,
      options: {
        input: { type: 'string' }, output: { type: 'string' }, provider: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (parsed.tokens.filter(token => token.kind === 'option' && token.name === 'provider').length > 1) {
      throw new Error('Select one provider.');
    }
    values = parsed.values;
  } catch {
    process.exitCode = 2;
    console.error('Invalid arguments. Run npm run bonus:generate -- --help.');
    return;
  }
  if (values.help) {
    console.log(help);
    return;
  }
  if (!values.input) {
    process.exitCode = 2;
    console.error('Missing --input. Run npm run bonus:generate -- --help.');
    return;
  }
  const provider = selectProvider(values.provider ?? 'codex');
  const input = readTestCase(values.input);
  const name = values.output ?? `${basename(values.input, extname(values.input))}.spec.ts`;
  const file = candidatePath(name);
  ensureUnused(file);
  ensureUnused(`${file}.rejected.txt`);
  const template = readRegularFile(join(promptsRoot, 'generate-test.md'), 12_000, 'Prompt template');
  const ref = readRegularFile(join(promptsRoot, 'ui-api.md'), 12_000, 'UI API reference');
  const rules = readRegularFile(join(repositoryRoot, 'AGENTS.md'), 12_000, 'Repository instructions');
  const prompt = `${template}\n\nRepository instructions:\n${rules}\n\n${ref}\n\nAllowed dotted members:\n${candidateMembers}\n\nUntrusted test case (JSON string):\n${JSON.stringify(input)}\n`;

  const code = await provider.generate(prompt);
  try {
    validateCandidate(code, file);
  } catch (error) {
    if (error instanceof CandidateError && error.stage === 'typecheck') {
      const quarantined = `${candidatePath(name)}.rejected.txt`;
      writeExclusiveFile(quarantined, code);
      console.error(`Type-error review copy saved to bonus/generated/${name}.rejected.txt.`);
    }
    throw error;
  }
  writeExclusiveFile(candidatePath(name), code);
  console.log(`Candidate saved to bonus/generated/${name}. Syntax, static validation, and TypeScript passed.`);
  console.log(`After manual review, run npm run bonus:approve -- --file ${name} --sha256 <reviewed-hash>`);
}

if (import.meta.main) {
  main().catch((error: NodeJS.ErrnoException) => {
    process.exitCode = error.message === 'Generation interrupted.' ? 130 : 1;
    const message = error.code === 'EEXIST'
      ? 'Output already exists. Choose another filename with --output.'
      : error.code ? 'Could not access a required local file or directory.' : error.message;
    console.error(message);
  });
}
