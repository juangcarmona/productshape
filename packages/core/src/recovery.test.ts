import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  defaultRecoveryBrief,
  parseRecoveryBrief,
  recoveryChangeId,
  recoveryFormatVersion,
  recoveryInventorySchemaId,
  recoveryStateSchemaId,
  validateRecoveryInventory,
  validateRecoveryState,
  validateSessionConsistency,
  writeJsonAtomic,
  type RecoveryInventory,
  type RecoveryLeadsFile,
  type RecoveryQuestionsFile,
  type RecoveryState,
} from './recovery.js';
import { recoveryLeadsSchemaId, recoveryQuestionsSchemaId } from './recovery.js';

const scratchDirs: string[] = [];

afterAll(async () => {
  for (const dir of scratchDirs) await rm(dir, { recursive: true, force: true });
});

describe('parseRecoveryBrief', () => {
  it('accepts a full brief and applies it over the defaults', () => {
    const { brief, errors } = parseRecoveryBrief(
      [
        'schema: product-definition-as-code/recovery-brief/v1alpha1',
        'scope: The ordering subsystem of the shop',
        'roots:',
        '  - src',
        '  - docs',
        'include:',
        "  - '**/*.md'",
        "  - '**/*.ts'",
        'exclude:',
        "  - 'docs/archive/**'",
        'forbidden:',
        "  - 'infra/vault/**'",
        'ignore:',
        "  - '**/generated/**'",
        'languages: [en, es]',
        'known-actors: [Shopper]',
        'known-terminology: [order, basket]',
        'synonyms:',
        '  cart: basket',
        'known-contradictions:',
        '  - docs say limit 5000, code enforces 10000',
        'authority:',
        '  - tests over documentation',
        'secondary-evidence:',
        '  code: true',
        '  tests: true',
        '  issues: true',
        '  commit-history: false',
        '  external: true',
        'batch-size: 3',
        'confirm:',
        '  - anything about refunds',
        'external-sources:',
        '  - url: https://example.test/help',
        '    title: Public help centre',
        '  - file: notes/interview.md',
        '    title: Interview notes',
      ].join('\n'),
      'brief.yaml',
    );
    expect(errors).toEqual([]);
    expect(brief.scope).toContain('ordering');
    expect(brief.roots).toEqual(['src', 'docs']);
    expect(brief.batchSize).toBe(3);
    expect(brief.synonyms).toEqual({ cart: 'basket' });
    expect(brief.secondaryEvidence.issues).toBe(true);
    expect(brief.externalSources).toHaveLength(2);
    // The user's forbidden entries extend the secret-material floor, never replace it.
    expect(brief.forbidden).toContain('infra/vault/**');
    expect(brief.forbidden).toContain('**/.env');
  });

  it('rejects unknown keys, bad types and out-of-range batch sizes', () => {
    const { errors } = parseRecoveryBrief(
      ['surprise: true', 'roots: src', 'batch-size: 0'].join('\n'),
      'brief.yaml',
    );
    expect(errors.some((e) => e.includes("Unknown recovery brief key 'surprise'"))).toBe(true);
    expect(errors.some((e) => e.includes("'roots' must be a list"))).toBe(true);
    expect(errors.some((e) => e.includes("'batch-size' must be an integer"))).toBe(true);
  });

  it('requires exactly one of url or file per external source', () => {
    const { errors } = parseRecoveryBrief(
      [
        'external-sources:',
        '  - title: Both',
        '    url: https://example.test',
        '    file: a.md',
      ].join('\n'),
      'brief.yaml',
    );
    expect(errors.some((e) => e.includes("exactly one of 'url' or 'file'"))).toBe(true);
  });

  it('an empty brief yields the defaults', () => {
    const { brief, errors } = parseRecoveryBrief('', 'brief.yaml');
    expect(errors).toEqual([]);
    expect(brief).toEqual(defaultRecoveryBrief());
  });
});

function minimalState(): RecoveryState {
  return {
    schema: recoveryStateSchemaId,
    formatVersion: recoveryFormatVersion,
    sessionId: 'session-001',
    cliVersion: '0.0.0-test',
    createdAt: '2026-08-12T00:00:00.000Z',
    updatedAt: '2026-08-12T00:00:00.000Z',
    changeId: recoveryChangeId,
    changeDir: 'docs/product/changes/active/chg-initial',
    brief: defaultRecoveryBrief(),
    modelSnapshot: [],
    familyProbes: {},
    counters: { evidence: 0, lead: 0, question: 0 },
  };
}

describe('validateRecoveryState', () => {
  it('accepts a well-formed state', () => {
    const problems: string[] = [];
    validateRecoveryState(minimalState(), problems);
    expect(problems).toEqual([]);
  });

  it('rejects a state that targets any change but CHG-INITIAL', () => {
    const problems: string[] = [];
    validateRecoveryState({ ...minimalState(), changeId: 'CHG-SNEAKY-001' }, problems);
    expect(problems.some((p) => p.includes('writes only to CHG-INITIAL'))).toBe(true);
  });

  it('rejects a newer format version instead of guessing at it', () => {
    const problems: string[] = [];
    validateRecoveryState({ ...minimalState(), formatVersion: 999 }, problems);
    expect(problems.some((p) => p.includes('format version'))).toBe(true);
  });
});

describe('validateRecoveryInventory', () => {
  it('rejects processed items without findings and exclusions without reasons', () => {
    const problems: string[] = [];
    validateRecoveryInventory(
      {
        schema: recoveryInventorySchemaId,
        sessionId: 'session-001',
        items: [
          {
            id: 'E-0001',
            kind: 'repo-file',
            path: 'a.md',
            authorization: 'brief',
            status: 'processed',
            findings: [],
            addedAt: '2026-08-12T00:00:00.000Z',
          },
          {
            id: 'E-0002',
            kind: 'repo-file',
            path: 'b.md',
            authorization: 'brief',
            status: 'excluded',
            findings: [],
            addedAt: '2026-08-12T00:00:00.000Z',
          },
        ],
      },
      problems,
    );
    expect(problems.some((p) => p.includes('processed but carries no findings'))).toBe(true);
    expect(problems.some((p) => p.includes('excluded without a reason'))).toBe(true);
  });

  it('rejects findings that skip their required fields', () => {
    const problems: string[] = [];
    validateRecoveryInventory(
      {
        schema: recoveryInventorySchemaId,
        sessionId: 'session-001',
        items: [
          {
            id: 'E-0001',
            kind: 'repo-file',
            path: 'a.md',
            authorization: 'brief',
            status: 'pending',
            findings: [
              { classification: 'represented', recordedAt: '2026-08-12T00:00:00.000Z' },
              { classification: 'no-product-intent', recordedAt: '2026-08-12T00:00:00.000Z' },
            ],
            addedAt: '2026-08-12T00:00:00.000Z',
          },
        ],
      },
      problems,
    );
    expect(problems.some((p) => p.includes('must list at least one candidate artifact'))).toBe(
      true,
    );
    expect(problems.some((p) => p.includes('must carry a reason'))).toBe(true);
  });
});

describe('validateSessionConsistency', () => {
  it('catches counters behind issued ids and dangling question references', () => {
    const problems: string[] = [];
    const inventory: RecoveryInventory = {
      schema: recoveryInventorySchemaId,
      sessionId: 'session-001',
      items: [
        {
          id: 'E-0005',
          kind: 'repo-file',
          path: 'a.md',
          authorization: 'brief',
          status: 'pending',
          findings: [
            {
              classification: 'question',
              question: 'Q-0009',
              recordedAt: '2026-08-12T00:00:00.000Z',
            },
          ],
          addedAt: '2026-08-12T00:00:00.000Z',
        },
      ],
    };
    const leads: RecoveryLeadsFile = {
      schema: recoveryLeadsSchemaId,
      sessionId: 'session-001',
      leads: [],
    };
    const questions: RecoveryQuestionsFile = {
      schema: recoveryQuestionsSchemaId,
      sessionId: 'session-001',
      questions: [],
    };
    validateSessionConsistency(minimalState(), inventory, leads, questions, problems);
    expect(problems.some((p) => p.includes('evidence counter is behind'))).toBe(true);
    expect(problems.some((p) => p.includes("unknown question 'Q-0009'"))).toBe(true);
  });
});

describe('writeJsonAtomic', () => {
  it('replaces the target and leaves no temporary file behind', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-recovery-io-'));
    scratchDirs.push(dir);
    const target = join(dir, 'state.json');
    await writeJsonAtomic(target, { generation: 1 });
    await writeJsonAtomic(target, { generation: 2 });
    expect(JSON.parse(await readFile(target, 'utf8'))).toEqual({ generation: 2 });
    expect(await readdir(dir)).toEqual(['state.json']);
  });
});
