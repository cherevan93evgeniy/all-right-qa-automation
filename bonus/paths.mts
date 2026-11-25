import { closeSync, constants, fstatSync, lstatSync, mkdtempSync, openSync, readSync, realpathSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const bonusRoot = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = dirname(bonusRoot);
export const generatedRoot = join(bonusRoot, 'generated');
export const approvedRoot = join(bonusRoot, 'approved');
export const examplesRoot = join(bonusRoot, 'examples');
export const promptsRoot = join(bonusRoot, 'prompts');
export const candidateLimit = 24 * 1024;
export const resemblesCredential = (text: string): boolean =>
  /(?:\b(?:sk-(?:proj-)?[a-z0-9_-]{16,}|(?:ghp_|gho_|github_pat_)[a-z0-9_]{16,})|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(text);

export function verifyDirectory(directory: string): void {
  const root = parse(directory).root;
  let current = root;
  for (const segment of directory.slice(root.length).split(sep).filter(Boolean)) {
    current = join(current, segment);
    const entry = lstatSync(current);
    if (entry.isSymbolicLink() || !entry.isDirectory() || relative(current, realpathSync.native(current))) {
      throw new Error('Directory must be a real local directory without symlinks or junctions.');
    }
  }
}

export function candidatePath(name: string, directory = generatedRoot): string {
  if (!name.endsWith('.spec.ts') || !/^[a-z0-9][a-z0-9-]{0,79}\.spec\.ts$/.test(name)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])\./.test(name)) {
    throw new Error('Expected a plain lowercase <name>.spec.ts filename.');
  }
  verifyDirectory(directory);
  return join(directory, name);
}

export function readRegularFile(file: string, limit: number, label: string): string {
  verifyDirectory(dirname(file));
  const before = lstatSync(file);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
    throw new Error(`${label} must be a regular, unlinked file.`);
  }
  if (before.size > limit) throw new Error(`${label} is too large (limit ${limit} bytes).`);
  const handle = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const actual = fstatSync(handle);
    if (!actual.isFile() || actual.nlink !== 1 || actual.dev !== before.dev || actual.ino !== before.ino) {
      throw new Error(`${label} changed while opening it.`);
    }
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const bytes = readSync(handle, buffer, length, buffer.length - length, null);
      if (bytes === 0) break;
      length += bytes;
    }
    if (length > limit) throw new Error(`${label} is too large (limit ${limit} bytes).`);
    try {
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, length));
    } catch {
      throw new Error(`${label} must be UTF-8 text.`);
    }
  } finally {
    closeSync(handle);
  }
}

export function writeExclusiveFile(file: string, content: string): void {
  verifyDirectory(dirname(file));
  writeFileSync(file, content, { flag: 'wx', mode: 0o600 });
}

export async function withScratchDirectory<T>(
  prefix: string,
  operation: (directory: string) => Promise<T>,
  stagedFile?: string,
): Promise<T> {
  verifyDirectory(dirname(prefix));
  const directory = mkdtempSync(prefix);
  let operationFailed = false;
  try {
    return await operation(directory);
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      verifyDirectory(directory);
      if (stagedFile) {
        try {
          unlinkSync(candidatePath(stagedFile, directory));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }
      rmdirSync(directory);
    } catch {
      const message = 'Could not clean up the temporary directory. Inspect the local scratch directory.';
      if (!operationFailed) throw new Error(message);
      console.error(message);
    }
  }
}

export function inputPath(argument: string): string {
  const file = resolve(argument);
  const child = relative(examplesRoot, file);
  if (!child || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child) || child.includes(':')) {
    throw new Error('Place the input case under bonus/examples/.');
  }
  return file;
}
