#!/usr/bin/env node

// CI evidence harness only: pdac-conformance owns case execution and diagnostic comparison.

import { spawn } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { sameDiagnosticMultiset } from './pdac-conformance-diagnostics.mjs';

const profile =
  'full published v0.2.0 conformance tests (kernel, reference profile and reference workflow)';
const citationDiagnosticCodes = new Set([
  'PRODUCT042',
  'PRODUCT060',
  'PRODUCT061',
  'PRODUCT062',
  'PRODUCT063',
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function parseOptions(argv) {
  const allowed = new Set([
    'spec',
    'spec-sha',
    'prodshape',
    'productshape-package',
    'tarball',
    'runner',
    'runner-version',
    'reports',
    'source-sha',
    'evidence-url',
  ]);
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    invariant(flag?.startsWith('--'), `Expected an option at ${flag ?? '(end of arguments)'}`);
    const name = flag.slice(2);
    invariant(allowed.has(name), `Unknown option --${name}`);
    invariant(value !== undefined && !value.startsWith('--'), `Missing value for --${name}`);
    invariant(options[name] === undefined, `Option --${name} was provided more than once`);
    options[name] = value;
  }

  for (const name of [
    'spec',
    'spec-sha',
    'prodshape',
    'productshape-package',
    'tarball',
    'runner',
    'runner-version',
    'reports',
    'source-sha',
  ]) {
    invariant(options[name], `Missing required option --${name}`);
  }
  invariant(/^[0-9a-f]{40}$/.test(options['spec-sha']), '--spec-sha must be a full commit SHA');
  invariant(/^[0-9a-f]{40}$/.test(options['source-sha']), '--source-sha must be a full commit SHA');
  return options;
}

function renderArg(value) {
  return /^[A-Za-z0-9_./:@=+-]+$/.test(value) ? value : JSON.stringify(value);
}

function renderCommand(argv) {
  return argv.map(renderArg).join(' ');
}

function runnerCommand(argv) {
  for (const value of argv) {
    invariant(!value.includes('"'), `Command argument contains an unsupported quote: ${value}`);
  }
  return argv.map((value) => (/\s/.test(value) ? `"${value}"` : value)).join(' ');
}

/**
 * Run a command. With `stdoutFile` the command writes stdout straight to that file and the
 * result reads it back: pdac-conformance@1.0.0 exits before a piped stdout drains, so a JSON
 * report larger than the pipe buffer truncates mid-string (pdac-conformance#22); file writes
 * are synchronous on both platforms and immune. Drop the redirect once a fixed runner is pinned.
 */
async function execute(file, args, stdoutFile) {
  const fd = stdoutFile === undefined ? 'pipe' : openSync(stdoutFile, 'w');
  const result = await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(file, args, { stdio: ['ignore', fd, 'pipe'] });
    let stdout = '';
    let stderr = '';
    if (stdoutFile === undefined) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => (stdout += chunk));
    }
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', rejectPromise);
    child.on('close', (code, signal) => {
      resolvePromise({ code: code ?? (signal ? 3 : 0), stdout, stderr });
    });
  });
  if (stdoutFile !== undefined) {
    closeSync(fd);
    result.stdout = await readFile(stdoutFile, 'utf8');
  }
  return result;
}

function parseJson(text, source) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${source} is not valid JSON: ${error.message}`);
  }
}

function multiset(values) {
  const result = new Map();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}

function sameMultiset(left, right) {
  if (left.size !== right.size) return false;
  for (const [key, count] of left) {
    if (right.get(key) !== count) return false;
  }
  return true;
}

function assertPinnedSpec(report, expectedSha, name) {
  const observed = report?.provenance?.observed?.spec;
  invariant(observed?.revision === expectedSha, `${name} used spec ${observed?.revision}`);
  invariant(observed.dirty === false, `${name} used a dirty spec checkout`);
  const claimed = report?.provenance?.claimed?.spec;
  invariant(
    claimed?.version === '0.2.0' && claimed?.serializationVersion === 'v1alpha1',
    `${name} claims (${claimed?.version}, ${claimed?.serializationVersion}); expected (0.2.0, v1alpha1)`,
  );
}

function assertRuns(report, expectedArgv, name) {
  invariant(Array.isArray(report.cases), `${name} has no cases array`);
  for (const testCase of report.cases) {
    invariant(
      testCase.runs?.length === expectedArgv.length,
      `${name}/${testCase.name}: expected ${expectedArgv.length} command runs, got ${testCase.runs?.length ?? 0}`,
    );
    for (let index = 0; index < expectedArgv.length; index += 1) {
      const actual = testCase.runs[index]?.argv;
      const expected = [...expectedArgv[index], '--format', 'json'];
      invariant(
        JSON.stringify(actual) === JSON.stringify(expected),
        `${name}/${testCase.name}: command ${index + 1} was not executed as configured`,
      );
    }
  }
}

function assertPositive(report, result, specSha, expectedArgv) {
  invariant(result.code === 0, `pdac-conformance run exited ${result.code}`);
  invariant(
    result.stderr.trim() === '',
    `pdac-conformance run wrote to stderr: ${result.stderr.trim()}`,
  );
  assertPinnedSpec(report, specSha, 'conformance report');
  const summary = report.summary;
  invariant(summary?.total > 0, 'No conformance cases were reported');
  invariant(
    report.cases.length === summary.total,
    'Conformance case total does not match the report',
  );
  invariant(summary.passed === summary.total, 'Not every conformance case passed');
  invariant(summary.failed === 0, `${summary.failed} conformance case(s) failed`);
  invariant(summary.errored === 0, `${summary.errored} conformance case(s) errored`);
  invariant(summary.skipped === 0, `${summary.skipped} conformance case(s) were skipped`);
  invariant(
    report.cases.every((entry) => entry.status === 'pass'),
    'A case was not executed to pass',
  );
  assertRuns(report, expectedArgv, 'conformance report');
}

function assertDigests(report, result, specSha, caseCount) {
  invariant(result.code === 0, `pdac-conformance digests exited ${result.code}`);
  invariant(
    result.stderr.trim() === '',
    `pdac-conformance digests wrote to stderr: ${result.stderr.trim()}`,
  );
  assertPinnedSpec(report, specSha, 'digest report');
  invariant(report.summary?.total > 0, 'No pinned digests were verified');
  invariant(
    report.summary.verified === report.summary.total,
    'Not every pinned digest was verified',
  );
  invariant(report.summary.failed === 0, `${report.summary.failed} pinned digest(s) failed`);
  invariant(report.summary.cases === caseCount, 'Digest and conformance case totals differ');
  invariant(
    report.skipped?.length === 0,
    `${report.skipped?.length ?? 0} digest case(s) were skipped`,
  );
}

function citationRun(testCase, expectedArgv) {
  const expected = [...expectedArgv, '--format', 'json'];
  const matches = testCase.runs.filter(
    (run) => JSON.stringify(run.argv) === JSON.stringify(expected),
  );
  invariant(
    matches.length === 1,
    `${testCase.name}: citation command did not execute exactly once`,
  );
  return matches[0];
}

async function assertCitationCoverage(report, digestReport, specDir, citationArgv) {
  const payloads = new Map();
  const citations = [];

  for (const testCase of report.cases) {
    const run = citationRun(testCase, citationArgv);
    const payload = parseJson(run.stdout, `${testCase.name} citation output`);
    // An invalid-configuration fixture stops every command before its work: the run reports the
    // PRODUCT050 diagnostics envelope with exit 2 instead of a citation scan. That is the
    // contract, not missing coverage, so the case contributes no citations.
    if (
      run.exitCode === 2 &&
      payload.schema === 'product-definition-as-code/diagnostics/v1alpha1' &&
      payload.diagnostics?.some((diagnostic) => diagnostic.code === 'PRODUCT050')
    ) {
      continue;
    }
    // An invalid-baseline fixture refuses citation verification: the run reports the model's
    // error diagnostics envelope with exit 1 instead of a citation scan. The refusal is the
    // contract, so the case contributes no citations.
    if (
      run.exitCode === 1 &&
      payload.schema === 'product-definition-as-code/diagnostics/v1alpha1' &&
      payload.diagnostics?.some((diagnostic) => diagnostic.severity === 'error')
    ) {
      continue;
    }
    invariant(
      payload.schema === 'product-definition-as-code/citations/v1alpha1',
      `${testCase.name}: unexpected citation schema ${payload.schema}`,
    );
    // `citations verify` reports `targets` (the list actually scanned) since consumer roots
    // became configurable; this harness passes `.` explicitly, so the list is exactly that.
    invariant(
      Array.isArray(payload.targets) && payload.targets.length === 1 && payload.targets[0] === '.',
      `${testCase.name}: citation targets were not exactly the repository root`,
    );
    invariant(Array.isArray(payload.citations), `${testCase.name}: no citations array`);
    invariant(
      Array.isArray(payload.diagnostics),
      `${testCase.name}: no citation diagnostics array`,
    );
    invariant(
      payload.summary?.total === payload.citations.length,
      `${testCase.name}: citation count does not match its summary`,
    );
    payloads.set(testCase.name, payload);
    citations.push(...payload.citations.map((citation) => ({ case: testCase.name, ...citation })));
  }

  invariant(citations.length > 0, 'The citation command discovered zero citations');
  invariant(
    citations.length === digestReport.pins.length,
    `ProductShape discovered ${citations.length} citations but pdac-conformance found ${digestReport.pins.length} pins`,
  );

  const citationCounts = multiset(
    citations.map((citation) =>
      JSON.stringify([
        citation.case,
        citation.source,
        citation.form,
        citation.id,
        citation.digest,
        citation.anchor ?? null,
      ]),
    ),
  );
  const pinCounts = multiset(
    digestReport.pins.map((pin) =>
      JSON.stringify([
        pin.case,
        pin.source.startsWith('repo/') ? pin.source.slice(5) : pin.source,
        pin.kind === 'ledger' ? 'sidecar-ledger' : 'marker-block',
        pin.id,
        pin.pinned,
        pin.anchor ?? null,
      ]),
    ),
  );
  invariant(
    sameMultiset(citationCounts, pinCounts),
    'ProductShape citation discovery does not match the pins independently found by pdac-conformance',
  );

  const mappedLedgerFiles = new Set();
  let mappedLedgerPins = 0;
  for (const pin of digestReport.pins.filter((entry) => entry.kind === 'ledger')) {
    const ledger = resolve(specDir, 'conformance', 'cases', pin.case, pin.source);
    const casesRoot = resolve(specDir, 'conformance', 'cases');
    invariant(
      ledger.startsWith(`${casesRoot}/`),
      `Ledger escaped the conformance cases: ${pin.source}`,
    );
    const contents = await readFile(ledger, 'utf8');
    if (/^citations:\s*(?:#.*)?$/m.test(contents)) {
      mappedLedgerFiles.add(ledger);
      mappedLedgerPins += 1;
    }
  }
  invariant(
    mappedLedgerFiles.size > 0,
    'The pinned suite contains no mapping-shaped sidecar ledger',
  );
  invariant(mappedLedgerPins > 0, 'No citation from a mapping-shaped sidecar ledger was exercised');

  return {
    payloads,
    total: citations.length,
    cases: [...payloads.values()].filter((payload) => payload.summary.total > 0).length,
    sidecars: citations.filter((citation) => citation.form === 'sidecar-ledger').length,
    markers: citations.filter((citation) => citation.form === 'marker-block').length,
    mappedLedgerFiles: mappedLedgerFiles.size,
    mappedLedgerPins,
  };
}

function assertNegativeControl(
  report,
  result,
  positiveReport,
  citationPayloads,
  specSha,
  expectedArgv,
) {
  invariant(result.code === 1, `Negative control must exit 1, got ${result.code}`);
  invariant(
    result.stderr.trim() === '',
    `Negative control wrote to stderr: ${result.stderr.trim()}`,
  );
  assertPinnedSpec(report, specSha, 'negative-control report');
  invariant(
    report.summary?.total === positiveReport.summary.total,
    'Negative control case total changed',
  );
  invariant(
    report.cases.length === report.summary.total,
    'Negative-control case total is inconsistent',
  );
  invariant(report.summary.skipped === 0, 'Negative control skipped a case');
  invariant(report.summary.errored === 0, 'Negative control errored a case');
  assertRuns(report, expectedArgv, 'negative-control report');

  const positiveByName = new Map(positiveReport.cases.map((entry) => [entry.name, entry]));
  let expectedFailures = 0;
  let missingDiagnostics = 0;

  for (const testCase of report.cases) {
    invariant(positiveByName.has(testCase.name), `Negative control added case ${testCase.name}`);
    const citationDiagnostics = (citationPayloads.get(testCase.name)?.diagnostics ?? []).filter(
      (diagnostic) => citationDiagnosticCodes.has(diagnostic.code),
    );
    const expectedMissing = testCase.missing ?? [];

    if (citationDiagnostics.length > 0) {
      expectedFailures += 1;
      missingDiagnostics += expectedMissing.length;
      invariant(testCase.status === 'fail', `${testCase.name}: omission did not fail the case`);
      invariant(
        sameDiagnosticMultiset(expectedMissing, citationDiagnostics),
        `${testCase.name}: failure was not the expected missing citation diagnostics`,
      );
      invariant(
        testCase.missing.every((diagnostic) => citationDiagnosticCodes.has(diagnostic.code)),
        `${testCase.name}: negative control failed for a non-citation diagnostic`,
      );
    } else {
      invariant(testCase.status === 'pass', `${testCase.name}: unrelated negative-control failure`);
      invariant(testCase.missing.length === 0, `${testCase.name}: unexpected missing diagnostics`);
    }

    invariant(
      testCase.unexpected.length === 0,
      `${testCase.name}: negative control emitted unexpected diagnostics`,
    );
    invariant(
      testCase.ordering === undefined,
      `${testCase.name}: negative control had an ordering failure`,
    );
    invariant(
      testCase.reason === undefined,
      `${testCase.name}: negative control had a command error`,
    );
  }

  invariant(expectedFailures > 0, 'Negative control did not expose any citation-dependent case');
  invariant(missingDiagnostics > 0, 'Negative control had no missing citation diagnostic');
  invariant(report.summary.failed === expectedFailures, 'Negative control failed unrelated cases');
  invariant(
    report.summary.passed === report.summary.total - expectedFailures,
    'Negative-control counts differ',
  );

  return { failedCases: expectedFailures, missingDiagnostics };
}

function renderConformanceText(metadata, report) {
  const lines = [
    'Pinned PDaC conformance',
    `ProductShape: @prodshape/cli ${metadata.productshape.version} from ${metadata.productshape.sourceSha}`,
    `Tarball: ${metadata.productshape.tarball} (sha256:${metadata.productshape.tarballSha256})`,
    `Specification: ${metadata.spec.repository}@${metadata.spec.commit}`,
    `Runner: pdac-conformance ${metadata.runner.version}`,
    `Profile: ${metadata.profile}`,
    '',
    'Commands:',
    ...metadata.commands.implementation.map((command) => `  ${command}`),
    '',
    ...report.cases.map((entry) => `  ${entry.status.padEnd(5)} ${entry.name}`),
    '',
    `${report.summary.total} case(s): ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped, ${report.summary.errored} errored`,
  ];
  return `${lines.join('\n')}\n`;
}

function renderDigestText(report) {
  const lines = [
    'Pinned digest verification',
    '',
    ...report.pins.map(
      (pin) => `  ${pin.status.padEnd(20)} ${pin.case}: ${pin.source} [${pin.id ?? '?'}]`,
    ),
    '',
    `${report.summary.verified} of ${report.summary.total} pinned digest(s) verified across ${report.summary.cases} case(s); ${report.skipped.length} skipped`,
  ];
  return `${lines.join('\n')}\n`;
}

function renderNegativeText(report, control) {
  const lines = [
    'Citation omission negative control',
    'Expected result: pdac-conformance exits 1 only because citation diagnostics are missing.',
    '',
  ];
  for (const testCase of report.cases) {
    lines.push(`  ${testCase.status.padEnd(5)} ${testCase.name}`);
    for (const diagnostic of testCase.missing) {
      lines.push(
        `        missing ${diagnostic.severity ?? '?'} ${diagnostic.code ?? '?'} ${diagnostic.file ?? '?'}${diagnostic.artifact ? ` [${diagnostic.artifact}]` : ''}`,
      );
    }
  }
  lines.push(
    '',
    `${report.summary.total} case(s): ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped, ${report.summary.errored} errored`,
    `Expected citation-only failures: ${control.failedCases} case(s), ${control.missingDiagnostics} missing diagnostic(s)`,
  );
  return `${lines.join('\n')}\n`;
}

function renderSummary(metadata) {
  const evidence = metadata.evidenceUrl
    ? `\nEvidence: [workflow run](${metadata.evidenceUrl}) and the \`pdac-conformance-${metadata.productshape.sourceSha}\` artifact.\n`
    : '';
  return `## Pinned PDaC conformance

| Input | Pin |
| --- | --- |
| ProductShape | \`@prodshape/cli ${metadata.productshape.version}\` built from \`${metadata.productshape.sourceSha}\` |
| Packaged artifact | \`${metadata.productshape.tarball}\` (\`sha256:${metadata.productshape.tarballSha256}\`) |
| PDaC specification | [\`${metadata.spec.commit}\`](https://github.com/${metadata.spec.repository}/commit/${metadata.spec.commit}) |
| pdac-conformance | \`${metadata.runner.version}\` |
| Profile | ${metadata.profile} |

Commands:

\`\`\`text
${metadata.commands.implementation.join('\n')}
${metadata.commands.digests}
\`\`\`

| Check | Total | Passed/verified | Failed | Errored | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: |
| Conformance cases | ${metadata.conformance.total} | ${metadata.conformance.passed} | ${metadata.conformance.failed} | ${metadata.conformance.errored} | ${metadata.conformance.skipped} |
| Pinned digests | ${metadata.digests.total} | ${metadata.digests.verified} | ${metadata.digests.failed} | 0 | ${metadata.digests.skipped} |

Citation coverage: ${metadata.citations.total} citation(s) across ${metadata.citations.cases} case(s), including ${metadata.citations.sidecars} sidecar-ledger record(s) from ${metadata.citations.mappedLedgerFiles} mapping-shaped ledger(s) and ${metadata.citations.markers} marker-block record(s).

Negative control: removing \`prodshape citations verify .\` makes ${metadata.negativeControl.failedCases} case(s) fail with ${metadata.negativeControl.missingDiagnostics} expected missing citation diagnostic(s); 0 cases errored or skipped.
${evidence}
Limitation: the published tests are not a complete normative set. Repository-only clauses and currently unexpressed apply cases remain outside this executable profile.
`;
}

async function sha256(path) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const specDir = resolve(options.spec);
  const reportsDir = resolve(options.reports);
  await mkdir(reportsDir, { recursive: true });
  await Promise.all([
    access(specDir),
    access(options.prodshape),
    access(options['productshape-package']),
    access(options.tarball),
    access(options['runner']),
  ]);

  const packageJson = parseJson(
    await readFile(options['productshape-package'], 'utf8'),
    'installed ProductShape package.json',
  );
  invariant(packageJson.name === '@prodshape/cli', `Installed package is ${packageJson.name}`);

  const runnerVersionResult = await execute(options['runner'], ['--version']);
  invariant(runnerVersionResult.code === 0, 'Cannot read pdac-conformance version');
  const runnerVersion = runnerVersionResult.stdout.trim();
  invariant(
    runnerVersion === options['runner-version'],
    `Expected pdac-conformance ${options['runner-version']}, got ${runnerVersion}`,
  );

  const specRevisionResult = await execute('git', ['-C', specDir, 'rev-parse', 'HEAD']);
  invariant(
    specRevisionResult.code === 0,
    `Cannot read spec revision: ${specRevisionResult.stderr}`,
  );
  invariant(
    specRevisionResult.stdout.trim() === options['spec-sha'],
    `Expected spec ${options['spec-sha']}, got ${specRevisionResult.stdout.trim()}`,
  );

  const implementationArgv = [
    [options.prodshape, 'validate', '--root', '.', '--consumers', '.'],
    [options.prodshape, 'change', 'validate', '--root', '.', '--consumers', '.'],
    [options.prodshape, 'citations', 'verify', '.', '--root', '.'],
  ];
  // The negative control proves the suite depends on citation verification by removing it
  // entirely. `--consumers` re-adds citation detection to the retained commands, so it must be
  // stripped here too or the control stops controlling anything.
  const negativeArgv = [
    [options.prodshape, 'validate', '--root', '.'],
    [options.prodshape, 'change', 'validate', '--root', '.'],
  ];
  const implementationCommands = implementationArgv.map(runnerCommand);
  const negativeCommands = negativeArgv.map(runnerCommand);

  const tarballDigest = await sha256(options.tarball);
  // Claimed provenance rides every runner invocation: the version pair the claim names, and the
  // implementation identity the runner records without verification.
  const provenanceArgs = [
    '--spec-version',
    '0.2.0',
    '--serialization-version',
    'v1alpha1',
    '--implementation-name',
    packageJson.name,
    '--implementation-version',
    packageJson.version,
    '--implementation-artifact',
    `sha256:${tarballDigest}`,
  ];
  const runArgs = ['run', '--spec', specDir, ...provenanceArgs];
  for (const command of implementationCommands) runArgs.push('--command', command);
  runArgs.push('--format', 'json');

  const negativeArgs = ['run', '--spec', specDir, ...provenanceArgs];
  for (const command of negativeCommands) negativeArgs.push('--command', command);
  negativeArgs.push('--format', 'json');

  const digestArgs = ['digests', '--spec', specDir, ...provenanceArgs, '--format', 'json'];

  const digestResult = await execute(
    options['runner'],
    digestArgs,
    join(reportsDir, 'digests.json'),
  );
  const digestReport = parseJson(digestResult.stdout, 'digests.json');

  const conformanceResult = await execute(
    options['runner'],
    runArgs,
    join(reportsDir, 'conformance.json'),
  );
  const conformanceReport = parseJson(conformanceResult.stdout, 'conformance.json');

  const negativeResult = await execute(
    options['runner'],
    negativeArgs,
    join(reportsDir, 'negative-control.json'),
  );
  const negativeReport = parseJson(negativeResult.stdout, 'negative-control.json');

  assertPositive(conformanceReport, conformanceResult, options['spec-sha'], implementationArgv);
  assertDigests(digestReport, digestResult, options['spec-sha'], conformanceReport.summary.total);
  const citationCoverage = await assertCitationCoverage(
    conformanceReport,
    digestReport,
    specDir,
    implementationArgv[2],
  );
  const negativeControl = assertNegativeControl(
    negativeReport,
    negativeResult,
    conformanceReport,
    citationCoverage.payloads,
    options['spec-sha'],
    negativeArgv,
  );

  const metadata = {
    schema: 'productshape/pdac-conformance-evidence/v1',
    generatedAt: new Date().toISOString(),
    profile,
    productshape: {
      package: packageJson.name,
      version: packageJson.version,
      sourceSha: options['source-sha'],
      tarball: basename(options.tarball),
      tarballSha256: tarballDigest,
    },
    spec: {
      repository: 'product-definition-as-code/spec',
      commit: options['spec-sha'],
    },
    runner: { package: 'runner', version: runnerVersion },
    commands: {
      implementation: implementationArgv.map((argv) =>
        renderCommand(['prodshape', ...argv.slice(1)]),
      ),
      digests: 'pdac-conformance digests --spec pdac-spec',
      actual: {
        conformance: renderCommand([options['runner'], ...runArgs]),
        negativeControl: renderCommand([options['runner'], ...negativeArgs]),
        digests: renderCommand([options['runner'], ...digestArgs]),
      },
    },
    conformance: conformanceReport.summary,
    digests: { ...digestReport.summary, skipped: digestReport.skipped.length },
    citations: {
      total: citationCoverage.total,
      cases: citationCoverage.cases,
      sidecars: citationCoverage.sidecars,
      markers: citationCoverage.markers,
      mappedLedgerFiles: citationCoverage.mappedLedgerFiles,
      mappedLedgerPins: citationCoverage.mappedLedgerPins,
    },
    negativeControl: {
      ...negativeReport.summary,
      expectedExitCode: 1,
      actualExitCode: negativeResult.code,
      ...negativeControl,
    },
    evidenceUrl: options['evidence-url'],
  };

  await Promise.all([
    writeFile(join(reportsDir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`),
    writeFile(
      join(reportsDir, 'conformance.txt'),
      renderConformanceText(metadata, conformanceReport),
    ),
    writeFile(join(reportsDir, 'digests.txt'), renderDigestText(digestReport)),
    writeFile(
      join(reportsDir, 'negative-control.txt'),
      renderNegativeText(negativeReport, negativeControl),
    ),
    writeFile(join(reportsDir, 'summary.md'), renderSummary(metadata)),
  ]);

  process.stdout.write(renderSummary(metadata));
}

const reportsIndex = process.argv.indexOf('--reports');
const fallbackReports = reportsIndex === -1 ? undefined : process.argv[reportsIndex + 1];

main().catch(async (error) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  if (fallbackReports) {
    try {
      await mkdir(fallbackReports, { recursive: true });
      await writeFile(join(fallbackReports, 'failure.txt'), `${message}\n`);
    } catch {
      // The original error is the useful failure.
    }
  }
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
