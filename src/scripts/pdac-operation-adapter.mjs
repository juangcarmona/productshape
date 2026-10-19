// Trusted translation only: invokes the packaged CLI and preserves its diagnostics and report order.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { cli: { type: 'string' }, request: { type: 'string' } } });
if (!values.cli || !values.request) throw new Error('--cli and --request are required');
const request = JSON.parse(readFileSync(values.request, 'utf8'));
const args = ['--serialization-version', 'v1alpha2'];
for (const path of request.currentEvidence ?? []) args.push('--current-evidence', path);
switch (request.operation) {
  case 'validate':
    args.push('validate', '--root', '.', '--consumers', '.');
    break;
  case 'apply':
    args.push('change', 'apply', request.change);
    break;
  case 'apply-dry-run':
    args.push('change', 'apply', request.change, '--dry-run');
    break;
  case 'verify-evidence':
    args.push('evidence', 'verify', ...request.evidence);
    break;
  default:
    throw new Error(`Unknown operation: ${request.operation}`);
}
args.push('--format', 'json');
const child = spawnSync(process.execPath, [values.cli, ...args], {
  encoding: 'utf8',
  cwd: process.cwd(),
  maxBuffer: 16 * 1024 * 1024,
});
if (child.error) throw child.error;
if (child.stderr) process.stderr.write(child.stderr);
const output = JSON.parse(child.stdout);
const normalized = { diagnostics: output.diagnostics ?? [] };
if (output.affectedCitations !== undefined) {
  normalized.affectedCitations = {
    count: output.affectedCitations.length,
    records: output.affectedCitations.map((record) => ({
      file: record.source,
      ...(record.line !== undefined ? { line: record.line } : {}),
      ...(record.entry !== undefined ? { entry: record.entry } : {}),
      target: record.id,
      ...(record.anchor !== undefined ? { anchor: record.anchor } : {}),
      status: record.prospectiveStatus,
    })),
  };
}
if (output.diff)
  normalized.productDiff = Object.values(output.diff)
    .flat()
    .map(({ id, kind, digest }) => ({ id, kind, ...(digest !== undefined ? { digest } : {}) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
if (output.documents) {
  normalized.evidenceResults = output.documents.flatMap((document) => document.evidenceResults);
  if (output.documents.length === 1 && output.documents[0].runRevision !== undefined)
    normalized.runRevision = output.documents[0].runRevision;
}
console.log(JSON.stringify(normalized));
process.exitCode = child.status ?? 3;
