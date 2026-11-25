import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { approvedRoot, candidateLimit, candidatePath, readRegularFile, writeExclusiveFile } from './paths.mts';
import { validateCandidate } from './validate.mts';

const hashPattern = /^[a-f0-9]{64}$/i;
const recordLimit = candidateLimit * 6 + 256;
type Approval = { sha256: string; source: string };

function sha256(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

function recordPath(name: string): string {
  return `${candidatePath(name, approvedRoot)}.approved.json`;
}

function approveCandidate(name: string, reviewedHash: string): void {
  const file = candidatePath(name);
  const record = recordPath(name);
  if (!hashPattern.test(reviewedHash)) throw new Error('Expected a 64-character hexadecimal SHA-256.');
  const source = readRegularFile(file, candidateLimit, 'Candidate');
  const hash = sha256(source);
  if (hash !== reviewedHash.toLowerCase()) throw new Error('Candidate SHA-256 does not match the reviewed hash.');
  validateCandidate(source, file);
  writeExclusiveFile(record, JSON.stringify({ sha256: hash, source }));
}

export function readApproval(name: string): Approval {
  const file = recordPath(name);
  let text: string;
  try {
    text = readRegularFile(file, recordLimit, 'Approval record');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('No approval record for the selected spec. Review it and run bonus:approve first.');
    }
    throw error;
  }
  let record: unknown;
  try {
    record = JSON.parse(text);
  } catch {
    throw new Error('Invalid approval record.');
  }
  if (!record || typeof record !== 'object' || Object.keys(record).length !== 2
    || !('source' in record) || typeof record.source !== 'string'
    || !('sha256' in record) || typeof record.sha256 !== 'string' || !hashPattern.test(record.sha256)) {
    throw new Error('Invalid approval record.');
  }
  if (Buffer.byteLength(record.source) > candidateLimit || sha256(record.source) !== record.sha256) {
    throw new Error('Approved source does not match its recorded SHA-256 or size limit.');
  }
  return { sha256: record.sha256, source: record.source };
}

export function validateStagedApproval(name: string, file: string): void {
  const approved = readApproval(name);
  const source = readRegularFile(file, candidateLimit, 'Staged spec');
  if (sha256(source) !== approved.sha256) throw new Error('Staged source does not match the approved SHA-256.');
  validateCandidate(source, file);
}

function main(): void {
  const usage = 'Usage: npm run bonus:approve -- --file name.spec.ts --sha256 <reviewed-hash>';
  let values;
  try {
    const parsed = parseArgs({ tokens: true, options: { file: { type: 'string' }, sha256: { type: 'string' } } });
    if (parsed.tokens.length !== 2) throw new Error(usage);
    values = parsed.values;
  } catch {
    throw new Error(usage);
  }
  if (!values.file || !values.sha256) throw new Error(usage);
  approveCandidate(values.file, values.sha256);
  console.log(`Recorded local approval for ${values.file}.`);
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    process.exitCode = 1;
    const failure = error as NodeJS.ErrnoException;
    console.error(failure.code === 'EEXIST' ? 'Approval already exists. Existing records are never overwritten.'
      : failure.code === 'ENOENT' ? 'Candidate or required directory does not exist.'
        : failure.code ? 'Could not access a required local file or directory.' : failure.message);
  }
}
