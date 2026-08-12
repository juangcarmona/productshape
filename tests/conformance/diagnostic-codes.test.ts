/**
 * The diagnostic codes emitted by the implementation and the tables in
 * docs/specification/validation.md are a single contract that must change together
 * (packages/core/src/diagnostics.ts says so; nothing enforced it until this test).
 *
 * Codes are emitted as string literals across many modules rather than from one registry, so
 * the check is a scan of the sources rather than an import.
 *
 * Two invariants are checked: every code appears in the table its number belongs to, and every
 * emission uses the severity its number promises. The second exists because the first is blind to
 * runtime severity, which is how `change validate` shipped a PRODUCT0xx code as a warning.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { codes } from '@prodshape/core';
import { describe, expect, it } from 'vitest';
import { listFilesRecursive, repoRoot } from '../helpers.js';

const CODE = /PRODUCT\d{3}/g;

/**
 * A diagnostic literal: `severity` immediately followed by `code`, which is how every emission in
 * the sources is written. The severity test below asserts this pattern accounts for every
 * `severity:` field found, so an emission written in a different shape fails the scan rather than
 * escaping it silently.
 */
const EMISSION = /severity: '(error|warning)',\s*code: (?:codes\.(\w+)|'(PRODUCT\d{3})')/g;
const SEVERITY_FIELD = /severity: '(?:error|warning)',/g;

/** `codes` values keyed by member name, to resolve `code: codes.foo` in the scanned sources. */
const codeByName = new Map<string, string>(Object.entries(codes));

/**
 * Codes specified but not yet emitted anywhere. Each entry needs a reason; an empty list means
 * the specification and the implementation are exactly in step. Do not add an entry to silence
 * a genuine omission — implement the check or remove the row from validation.md.
 */
const specifiedButNotEmitted: string[] = [];

async function sourceFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const pkg of ['core', 'cli', 'distribution', 'integration-openspec']) {
    files.push(...(await listFilesRecursive(join(repoRoot, 'packages', pkg, 'src'), '.ts')));
  }
  return files.filter((file) => !file.endsWith('.test.ts') && !file.endsWith('test-support.ts'));
}

async function emittedCodes(): Promise<Set<string>> {
  const found = new Set<string>();
  for (const file of await sourceFiles()) {
    for (const match of (await readFile(file, 'utf8')).matchAll(CODE)) found.add(match[0]);
  }
  return found;
}

interface Emission {
  file: string;
  code: string;
  severity: 'error' | 'warning';
}

/** Every diagnostic literal in the sources, with the severity it is emitted at. */
async function emissions(): Promise<{ emissions: Emission[]; severityFields: number }> {
  const found: Emission[] = [];
  let severityFields = 0;
  for (const file of await sourceFiles()) {
    const source = await readFile(file, 'utf8');
    severityFields += [...source.matchAll(SEVERITY_FIELD)].length;
    for (const match of source.matchAll(EMISSION)) {
      const [, severity, member, literal] = match;
      const code = literal ?? codeByName.get(member as string);
      if (code === undefined) throw new Error(`${file}: 'codes.${member}' is not a known code`);
      found.push({
        file: file.slice(repoRoot.length),
        code,
        severity: severity as Emission['severity'],
      });
    }
  }
  return { emissions: found, severityFields };
}

/** Codes listed in one `## <heading>` section's table. */
function documentedCodes(doc: string, heading: string): Set<string> {
  const start = doc.indexOf(`## ${heading}`);
  if (start === -1) throw new Error(`validation.md has no '## ${heading}' section`);
  const rest = doc.slice(start + heading.length);
  const end = rest.indexOf('\n## ');
  const section = end === -1 ? rest : rest.slice(0, end);
  return new Set([...section.matchAll(CODE)].map((m) => m[0]));
}

describe('diagnostic codes', () => {
  it('every emitted code is documented in validation.md, in the right table', async () => {
    const doc = await readFile(join(repoRoot, 'docs', 'specification', 'validation.md'), 'utf8');
    const errors = documentedCodes(doc, 'Error codes');
    const warnings = documentedCodes(doc, 'Warning codes');

    for (const code of [...(await emittedCodes())].sort()) {
      // Errors occupy PRODUCT0xx and warnings PRODUCT1xx, with one exception: PRODUCT061
      // (stale citation) is a warning despite its 0xx numbering, per the citation contract.
      // A code in the wrong table means the severity in the source and the severity in the
      // specification disagree.
      const isWarning = code.startsWith('PRODUCT1') || code === 'PRODUCT061';
      const expected = isWarning ? warnings : errors;
      const table = isWarning ? 'Warning codes' : 'Error codes';
      expect.soft([...expected], `${code} should be under '## ${table}'`).toContain(code);
    }
  });

  it('every documented code is emitted, unless explicitly listed as not yet implemented', async () => {
    const doc = await readFile(join(repoRoot, 'docs', 'specification', 'validation.md'), 'utf8');
    const documented = [
      ...documentedCodes(doc, 'Error codes'),
      ...documentedCodes(doc, 'Warning codes'),
    ].sort();
    const emitted = await emittedCodes();
    const missing = documented.filter(
      (code) => !emitted.has(code) && !specifiedButNotEmitted.includes(code),
    );
    expect(missing).toEqual([]);
  });

  it('emits every code at the severity its number promises', async () => {
    const { emissions: found, severityFields } = await emissions();

    // The scan must see every emission, or the invariant below is vacuous for the ones it missed.
    // This is what let `change validate` ship PRODUCT006 as a warning: the tests above check the
    // tables in validation.md, and nothing checked what severity the code is emitted at.
    expect(found).not.toHaveLength(0);
    expect(found.length, 'every `severity:` field must be part of a scanned emission').toBe(
      severityFields,
    );

    for (const emission of found) {
      const isWarning = emission.code.startsWith('PRODUCT1') || emission.code === 'PRODUCT061';
      const expected = isWarning ? 'warning' : 'error';
      expect
        .soft(
          emission.severity,
          `${emission.code} in ${emission.file} must be emitted as '${expected}'`,
        )
        .toBe(expected);
    }
  });

  it('numbers codes consistently with their severity range', async () => {
    const doc = await readFile(join(repoRoot, 'docs', 'specification', 'validation.md'), 'utf8');
    // Error codes are all PRODUCT0xx.
    expect([...documentedCodes(doc, 'Error codes')].filter((c) => !/^PRODUCT0/.test(c))).toEqual(
      [],
    );
    // Warning codes are PRODUCT1xx, except PRODUCT061 (stale citation), which the citation
    // contract fixes as a warning despite its 0xx numbering.
    expect(
      [...documentedCodes(doc, 'Warning codes')].filter(
        (c) => !/^PRODUCT1/.test(c) && c !== 'PRODUCT061',
      ),
    ).toEqual([]);
  });
});
