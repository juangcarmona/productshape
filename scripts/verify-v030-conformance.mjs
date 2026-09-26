import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: Object.fromEntries(
    ['cli', 'runner', 'spec', 'tarball', 'reports'].map((key) => [key, { type: 'string' }]),
  ),
});
for (const key of ['cli', 'runner', 'spec', 'tarball', 'reports'])
  if (!values[key]) throw new Error(`--${key} is required`);
const root = fileURLToPath(new URL('..', import.meta.url));
const cli = realpathSync(values.cli);
if (cli.startsWith(realpathSync(root)))
  throw new Error('Qualification must use an isolated installed package');
const packageInfo = JSON.parse(readFileSync(join(dirname(cli), '..', 'package.json'), 'utf8'));
const artifact =
  'sha256:' + createHash('sha256').update(readFileSync(values.tarball)).digest('hex');
const command = (args) =>
  args.map((arg) => `"${String(arg).replaceAll('\\', '/').replaceAll('"', '\\"')}"`).join(' ');
const adapter = join(root, 'scripts', 'pdac-operation-adapter.mjs');
mkdirSync(values.reports, { recursive: true });
const args = [
  values.runner,
  'run',
  '--spec',
  resolve(values.spec),
  '--command',
  command([
    process.execPath,
    cli,
    '--serialization-version',
    'v1alpha2',
    'validate',
    '--root',
    '.',
    '--consumers',
    '.',
  ]),
  '--adapter-command',
  command([process.execPath, adapter, '--cli', cli]),
  '--format',
  'json',
  '--spec-version',
  '0.3.0',
  '--serialization-version',
  'v1alpha2',
  '--implementation-name',
  'ProductShape',
  '--implementation-version',
  packageInfo.version,
  '--implementation-artifact',
  artifact,
];
const child = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
writeFileSync(join(values.reports, 'v030-conformance.json'), child.stdout ?? '');
writeFileSync(join(values.reports, 'v030-stderr.txt'), child.stderr ?? '');
if (child.error) throw child.error;
const report = JSON.parse(child.stdout);
console.log(JSON.stringify(report.summary));
if (child.status !== 0 || report.summary.total === 0 || report.summary.skipped !== 0)
  process.exitCode = 1;
