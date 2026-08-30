import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parse } from 'yaml';
import { stableJson } from './outputs.js';

/**
 * Recovery session state: deterministic, generated, non-canonical bookkeeping for brownfield
 * recovery. Everything here lives under `<generated.root>/recovery/<session-id>/` and is never
 * part of the product model. The semantic work of recovery (reading evidence, extracting
 * candidates, judging meaning) happens in the recover-product skill; this module only records
 * what was declared, what was processed and what remains.
 */

export const recoveryStateSchemaId = 'product-definition-as-code/recovery-state/v1alpha1';
export const recoveryInventorySchemaId = 'product-definition-as-code/recovery-inventory/v1alpha1';
export const recoveryLeadsSchemaId = 'product-definition-as-code/recovery-leads/v1alpha1';
export const recoveryQuestionsSchemaId = 'product-definition-as-code/recovery-questions/v1alpha1';
export const recoveryCoverageSchemaId = 'product-definition-as-code/recovery-coverage/v1alpha1';
export const recoveryBriefSchemaId = 'product-definition-as-code/recovery-brief/v1alpha1';

/** Bumped only when the on-disk layout changes incompatibly; loaders refuse newer versions. */
export const recoveryFormatVersion = 1;

/** The reserved initialisation change every recovery session writes into. */
export const recoveryChangeId = 'CHG-INITIAL';

export type EvidenceKind = 'repo-file' | 'external-file' | 'external-url' | 'user-input';

/**
 * `pending`: inventoried, not yet fully classified.
 * `processed`: every relevant section classified; carries at least one finding.
 * `stale`: content changed after processing; previous findings are no longer trusted.
 * `missing`: inventoried earlier but no longer present on disk.
 * `excluded`: deliberately taken out of scope, with a recorded reason.
 */
export type EvidenceStatus = 'pending' | 'processed' | 'stale' | 'missing' | 'excluded';

/**
 * Every relevant section of a processed source is one of these. The first two map evidence to
 * candidate artifacts; the middle two park unresolved meaning where it stays visible; the last
 * two require a reason, because "nothing to see here" is itself a claim someone must be able
 * to audit.
 */
export type FindingClassification =
  'represented' | 'duplicate' | 'contradiction' | 'question' | 'out-of-scope' | 'no-product-intent';

export const findingClassifications: readonly FindingClassification[] = [
  'represented',
  'duplicate',
  'contradiction',
  'question',
  'out-of-scope',
  'no-product-intent',
];

export interface EvidenceFinding {
  classification: FindingClassification;
  /** Candidate artifact IDs (required for represented and duplicate). */
  artifacts?: string[];
  /** Linked question ID (required for question, optional for contradiction). */
  question?: string;
  /** Required for out-of-scope and no-product-intent. */
  reason?: string;
  note?: string;
  recordedAt: string;
}

export interface EvidenceItem {
  /** E-0001, E-0002, ... assigned in deterministic inventory order. */
  id: string;
  kind: EvidenceKind;
  /** Repository-relative POSIX path (repo-file) or the path the user supplied (external-file). */
  path?: string;
  url?: string;
  title?: string;
  /** Session-relative POSIX path of captured external content, when a snapshot was taken. */
  snapshot?: string;
  /** Content digest (sha256:<hex> over LF-normalized bytes); absent when nothing is hashable yet. */
  digest?: string;
  /** How this source entered the authorised scope. */
  authorization: 'brief' | 'user';
  status: EvidenceStatus;
  findings: EvidenceFinding[];
  /** Why the item is excluded, when status is excluded. */
  reason?: string;
  addedAt: string;
  processedAt?: string;
}

export type LeadKind = 'repo' | 'external' | 'user';

export interface RecoveryLead {
  /** L-0001, L-0002, ... */
  id: string;
  description: string;
  /** Evidence ID or free-form origin of the lead. */
  source?: string;
  kind: LeadKind;
  status: 'open' | 'resolved';
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface RecoveryQuestion {
  /** Q-0001, Q-0002, ... */
  id: string;
  text: string;
  /** Evidence summary the question rests on. */
  context?: string;
  options?: string[];
  recommendation?: string;
  status: 'open' | 'answered' | 'deferred';
  answer?: string;
  /** Required when status is deferred. */
  deferredReason?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface FamilyProbe {
  outcome: 'none-found';
  note: string;
  recordedAt: string;
}

/** The last deterministic validation of the CHG-INITIAL overlay, with a freshness fingerprint. */
export interface ValidationRecord {
  at: string;
  errors: number;
  warnings: number;
  /** Artifact IDs reported as PRODUCT111 (draft resting on low-confidence evidence). */
  lowConfidence: string[];
  /** Digest over the change directory contents when validation ran; staleness is a mismatch. */
  changeDigest: string;
}

export interface ModelSnapshotEntry {
  /** Repository-relative POSIX path. */
  file: string;
  digest: string;
}

export interface SecondaryEvidencePolicy {
  code: boolean;
  tests: boolean;
  issues: boolean;
  commitHistory: boolean;
  external: boolean;
}

/**
 * The user-authored recovery brief: the declared evidence population and the boundaries of the
 * session. Persisted verbatim in the state so a later agent session resumes with the same scope.
 */
export interface RecoveryBrief {
  scope?: string;
  roots: string[];
  include: string[];
  exclude: string[];
  /** Never traversed, never listed, never readable through this session. */
  forbidden: string[];
  /** Generated or historical material to ignore (kept separate from exclude for the record). */
  ignore: string[];
  languages: string[];
  knownActors: string[];
  knownJourneys: string[];
  knownUseCases: string[];
  knownTerminology: string[];
  /** Likely synonyms and obsolete names, mapped old name to current name. */
  synonyms: Record<string, string>;
  knownContradictions: string[];
  /** Source authority and priority rules, highest first, free-form statements. */
  authority: string[];
  secondaryEvidence: SecondaryEvidencePolicy;
  batchSize: number;
  /** Areas where the user requires explicit confirmation before candidates are recorded. */
  confirm: string[];
  /**
   * Ordered evidence tiers: the inventory is enumerated tier by tier (path order within a
   * tier, unmatched sources last), so `recover next` serves the densest sources first instead
   * of relying on path order. Free-form `authority` stays the reasoning-side counterpart.
   */
  tiers: { name: string; globs: string[] }[];
  /**
   * Opt-in git discipline: the session runs on this dedicated branch and every state-mutating
   * recover command records a checkpoint commit. Absent, the tool never touches git.
   */
  git?: { branch: string };
  externalSources: { url?: string; file?: string; title: string }[];
}

export interface RecoveryState {
  schema: string;
  formatVersion: number;
  sessionId: string;
  cliVersion: string;
  createdAt: string;
  updatedAt: string;
  /** Always CHG-INITIAL: initial brownfield recovery has exactly one destination. */
  changeId: string;
  /** Repository-relative POSIX path of the change directory candidates are written into. */
  changeDir: string;
  brief: RecoveryBrief;
  /**
   * The accepted model at session start. Initial recovery requires it to be empty and to stay
   * untouched; any drift is a doctrine violation the check surfaces.
   */
  modelSnapshot: ModelSnapshotEntry[];
  familyProbes: Record<string, FamilyProbe>;
  counters: { evidence: number; lead: number; question: number };
  validation?: ValidationRecord;
  nextAction?: string;
}

export interface RecoveryInventory {
  schema: string;
  sessionId: string;
  items: EvidenceItem[];
}

export interface RecoveryLeadsFile {
  schema: string;
  sessionId: string;
  leads: RecoveryLead[];
}

export interface RecoveryQuestionsFile {
  schema: string;
  sessionId: string;
  questions: RecoveryQuestion[];
}

/** A recovery session state file that cannot be trusted. The message lists every defect found. */
export class RecoveryStateError extends Error {
  constructor(
    readonly file: string,
    readonly problems: string[],
  ) {
    super(
      `Recovery state file '${file}' is not usable:\n` +
        problems.map((p) => `  ${p}`).join('\n') +
        `\nReconcile the session directory by hand or start a new session; recovery state is generated material and safe to discard.`,
    );
  }
}

const sessionIdPattern = /^[a-z0-9][a-z0-9-]*$/;

export function isValidSessionId(value: string): boolean {
  return sessionIdPattern.test(value);
}

export function nextSequentialId(prefix: 'E' | 'L' | 'Q', counter: number): string {
  return `${prefix}-${String(counter).padStart(4, '0')}`;
}

export function defaultRecoveryBrief(): RecoveryBrief {
  return {
    roots: ['.'],
    include: ['**/*'],
    exclude: [],
    // Secret material is never evidence. These defaults hold even when the brief says nothing.
    forbidden: ['**/.env', '**/.env.*', '**/*.pem', '**/*.key', '**/id_rsa*', '**/secrets/**'],
    ignore: [],
    languages: [],
    knownActors: [],
    knownJourneys: [],
    knownUseCases: [],
    knownTerminology: [],
    synonyms: {},
    knownContradictions: [],
    authority: [],
    secondaryEvidence: {
      code: true,
      tests: true,
      issues: false,
      commitHistory: false,
      external: false,
    },
    batchSize: 10,
    confirm: [],
    tiers: [],
    externalSources: [],
  };
}

export interface RecoveryBriefResult {
  brief: RecoveryBrief;
  errors: string[];
}

const briefStringListKeys = {
  roots: 'roots',
  include: 'include',
  exclude: 'exclude',
  forbidden: 'forbidden',
  ignore: 'ignore',
  languages: 'languages',
  'known-actors': 'knownActors',
  'known-journeys': 'knownJourneys',
  'known-use-cases': 'knownUseCases',
  'known-terminology': 'knownTerminology',
  'known-contradictions': 'knownContradictions',
  authority: 'authority',
  confirm: 'confirm',
} as const;

const knownBriefKeys = new Set([
  'schema',
  'scope',
  ...Object.keys(briefStringListKeys),
  'synonyms',
  'secondary-evidence',
  'batch-size',
  'tiers',
  'git',
  'external-sources',
]);

function readStringList(value: unknown, key: string, errors: string[]): string[] | undefined {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || v.length === 0)) {
    errors.push(`'${key}' must be a list of non-empty strings`);
    return undefined;
  }
  return value as string[];
}

/**
 * Parse and strictly validate a recovery brief. Unknown keys are errors for the same reason they
 * are in `.product/config.yaml`: a silently ignored boundary is a boundary the user believes is
 * enforced and is not.
 */
export function parseRecoveryBrief(content: string, file: string): RecoveryBriefResult {
  const brief = defaultRecoveryBrief();
  const errors: string[] = [];

  let data: unknown;
  try {
    data = parse(content);
  } catch (cause) {
    errors.push(
      `Recovery brief is not valid YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return { brief, errors };
  }
  if (data === null || data === undefined) return { brief, errors };
  if (typeof data !== 'object' || Array.isArray(data)) {
    errors.push('Recovery brief must be a YAML mapping');
    return { brief, errors };
  }

  const record = data as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!knownBriefKeys.has(key)) errors.push(`Unknown recovery brief key '${key}'`);
  }

  if (record.schema !== undefined && record.schema !== recoveryBriefSchemaId) {
    errors.push(`Unsupported recovery brief schema '${String(record.schema)}'`);
  }

  if (record.scope !== undefined) {
    if (typeof record.scope !== 'string' || record.scope.length === 0) {
      errors.push(`'scope' must be a non-empty string`);
    } else {
      brief.scope = record.scope;
    }
  }

  for (const [key, property] of Object.entries(briefStringListKeys)) {
    const value = record[key];
    if (value === undefined) continue;
    const list = readStringList(value, key, errors);
    if (list === undefined) continue;
    if (key === 'forbidden') {
      // The secret-material defaults are a floor, not a suggestion: a brief can add to them
      // but cannot switch them off.
      brief.forbidden = [...new Set([...brief.forbidden, ...list])].sort();
    } else {
      brief[property] = list;
    }
  }

  if (record.synonyms !== undefined) {
    const synonyms = record.synonyms;
    if (typeof synonyms !== 'object' || synonyms === null || Array.isArray(synonyms)) {
      errors.push(`'synonyms' must be a mapping of old name to current name`);
    } else {
      const result: Record<string, string> = {};
      for (const [oldName, currentName] of Object.entries(synonyms)) {
        if (typeof currentName !== 'string' || currentName.length === 0) {
          errors.push(`'synonyms.${oldName}' must be a non-empty string`);
          continue;
        }
        result[oldName] = currentName;
      }
      brief.synonyms = result;
    }
  }

  if (record['secondary-evidence'] !== undefined) {
    const policy = record['secondary-evidence'];
    if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
      errors.push(`'secondary-evidence' must be a mapping`);
    } else {
      const source = policy as Record<string, unknown>;
      const keys: [string, keyof SecondaryEvidencePolicy][] = [
        ['code', 'code'],
        ['tests', 'tests'],
        ['issues', 'issues'],
        ['commit-history', 'commitHistory'],
        ['external', 'external'],
      ];
      const known = new Set(keys.map(([k]) => k));
      for (const key of Object.keys(source)) {
        if (!known.has(key)) errors.push(`Unknown 'secondary-evidence' key '${key}'`);
      }
      for (const [key, property] of keys) {
        const value = source[key];
        if (value === undefined) continue;
        if (typeof value !== 'boolean') {
          errors.push(`'secondary-evidence.${key}' must be a boolean`);
          continue;
        }
        brief.secondaryEvidence[property] = value;
      }
    }
  }

  if (record['batch-size'] !== undefined) {
    const value = record['batch-size'];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 500) {
      errors.push(`'batch-size' must be an integer between 1 and 500`);
    } else {
      brief.batchSize = value;
    }
  }

  if (record.tiers !== undefined) {
    const value = record.tiers;
    if (!Array.isArray(value)) {
      errors.push(`'tiers' must be a list`);
    } else {
      const tiers: RecoveryBrief['tiers'] = [];
      value.forEach((entry, index) => {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
          errors.push(`'tiers[${index}]' must be a mapping`);
          return;
        }
        const tier = entry as Record<string, unknown>;
        for (const key of Object.keys(tier)) {
          if (!['name', 'globs'].includes(key)) {
            errors.push(`Unknown 'tiers[${index}]' key '${key}'`);
          }
        }
        if (typeof tier.name !== 'string' || tier.name.length === 0) {
          errors.push(`'tiers[${index}].name' is required`);
          return;
        }
        const globs = readStringList(tier.globs, `tiers[${index}].globs`, errors);
        if (globs === undefined || globs.length === 0) {
          if (globs !== undefined) errors.push(`'tiers[${index}].globs' must not be empty`);
          return;
        }
        tiers.push({ name: tier.name, globs });
      });
      brief.tiers = tiers;
    }
  }

  if (record.git !== undefined) {
    const value = record.git;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`'git' must be a mapping`);
    } else {
      const git = value as Record<string, unknown>;
      for (const key of Object.keys(git)) {
        if (key !== 'branch') errors.push(`Unknown 'git' key '${key}'`);
      }
      if (typeof git.branch !== 'string' || git.branch.length === 0) {
        errors.push(`'git.branch' is required when 'git' is declared`);
      } else {
        brief.git = { branch: git.branch };
      }
    }
  }

  if (record['external-sources'] !== undefined) {
    const value = record['external-sources'];
    if (!Array.isArray(value)) {
      errors.push(`'external-sources' must be a list`);
    } else {
      const sources: RecoveryBrief['externalSources'] = [];
      value.forEach((entry, index) => {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
          errors.push(`'external-sources[${index}]' must be a mapping`);
          return;
        }
        const source = entry as Record<string, unknown>;
        for (const key of Object.keys(source)) {
          if (!['url', 'file', 'title'].includes(key)) {
            errors.push(`Unknown 'external-sources[${index}]' key '${key}'`);
          }
        }
        const url = source.url;
        const filePath = source.file;
        const title = source.title;
        if (typeof title !== 'string' || title.length === 0) {
          errors.push(`'external-sources[${index}].title' is required`);
          return;
        }
        const hasUrl = typeof url === 'string' && url.length > 0;
        const hasFile = typeof filePath === 'string' && filePath.length > 0;
        if (hasUrl === hasFile) {
          errors.push(`'external-sources[${index}]' must set exactly one of 'url' or 'file'`);
          return;
        }
        sources.push(hasUrl ? { url: url as string, title } : { file: filePath as string, title });
      });
      brief.externalSources = sources;
    }
  }

  if (errors.length === 0 && brief.roots.length === 0) {
    errors.push(`'roots' must declare at least one source root`);
  }

  return { brief, errors: errors.map((message) => `${file}: ${message}`) };
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function validateFinding(finding: unknown, where: string, problems: string[]): void {
  if (typeof finding !== 'object' || finding === null) {
    problems.push(`${where} is not an object`);
    return;
  }
  const record = finding as Record<string, unknown>;
  const classification = record.classification;
  if (
    typeof classification !== 'string' ||
    !(findingClassifications as readonly string[]).includes(classification)
  ) {
    problems.push(`${where} has an unknown classification '${String(classification)}'`);
    return;
  }
  if (
    (classification === 'represented' || classification === 'duplicate') &&
    (!isStringArray(record.artifacts) || record.artifacts.length === 0)
  ) {
    problems.push(`${where} (${classification}) must list at least one candidate artifact`);
  }
  if (
    (classification === 'out-of-scope' || classification === 'no-product-intent') &&
    (typeof record.reason !== 'string' || record.reason.length === 0)
  ) {
    problems.push(`${where} (${classification}) must carry a reason`);
  }
  if (classification === 'question' && typeof record.question !== 'string') {
    problems.push(`${where} (question) must reference a question ID`);
  }
  if (!isIsoTimestamp(record.recordedAt)) {
    problems.push(`${where} has no valid recordedAt timestamp`);
  }
}

const evidenceStatuses = new Set(['pending', 'processed', 'stale', 'missing', 'excluded']);
const evidenceKinds = new Set(['repo-file', 'external-file', 'external-url', 'user-input']);

export function validateRecoveryInventory(value: unknown, problems: string[]): void {
  if (typeof value !== 'object' || value === null) {
    problems.push('inventory is not an object');
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.schema !== recoveryInventorySchemaId) {
    problems.push(
      `inventory schema is '${String(record.schema)}', expected '${recoveryInventorySchemaId}'`,
    );
  }
  if (!Array.isArray(record.items)) {
    problems.push('inventory.items is not a list');
    return;
  }
  const seen = new Set<string>();
  record.items.forEach((item, index) => {
    const where = `items[${index}]`;
    if (typeof item !== 'object' || item === null) {
      problems.push(`${where} is not an object`);
      return;
    }
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== 'string' || !/^E-\d{4,}$/.test(entry.id)) {
      problems.push(`${where} has an invalid id '${String(entry.id)}'`);
    } else if (seen.has(entry.id)) {
      problems.push(`${where} duplicates evidence id '${entry.id}'`);
    } else {
      seen.add(entry.id);
    }
    if (typeof entry.kind !== 'string' || !evidenceKinds.has(entry.kind)) {
      problems.push(`${where} has an unknown kind '${String(entry.kind)}'`);
    }
    if (typeof entry.status !== 'string' || !evidenceStatuses.has(entry.status)) {
      problems.push(`${where} has an unknown status '${String(entry.status)}'`);
    }
    if (entry.authorization !== 'brief' && entry.authorization !== 'user') {
      problems.push(`${where} has an unknown authorization '${String(entry.authorization)}'`);
    }
    if (entry.kind === 'repo-file' && typeof entry.path !== 'string') {
      problems.push(`${where} is a repo-file without a path`);
    }
    if (entry.kind === 'external-url' && typeof entry.url !== 'string') {
      problems.push(`${where} is an external-url without a url`);
    }
    if (
      entry.status === 'excluded' &&
      (typeof entry.reason !== 'string' || entry.reason.length === 0)
    ) {
      problems.push(`${where} is excluded without a reason`);
    }
    if (!Array.isArray(entry.findings)) {
      problems.push(`${where} has no findings list`);
    } else {
      if (entry.status === 'processed' && entry.findings.length === 0) {
        problems.push(`${where} is processed but carries no findings`);
      }
      entry.findings.forEach((finding, findingIndex) =>
        validateFinding(finding, `${where}.findings[${findingIndex}]`, problems),
      );
    }
    if (!isIsoTimestamp(entry.addedAt)) problems.push(`${where} has no valid addedAt timestamp`);
  });
}

export function validateRecoveryLeadsFile(value: unknown, problems: string[]): void {
  if (typeof value !== 'object' || value === null) {
    problems.push('leads file is not an object');
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.schema !== recoveryLeadsSchemaId) {
    problems.push(
      `leads schema is '${String(record.schema)}', expected '${recoveryLeadsSchemaId}'`,
    );
  }
  if (!Array.isArray(record.leads)) {
    problems.push('leads is not a list');
    return;
  }
  record.leads.forEach((lead, index) => {
    const where = `leads[${index}]`;
    if (typeof lead !== 'object' || lead === null) {
      problems.push(`${where} is not an object`);
      return;
    }
    const entry = lead as Record<string, unknown>;
    if (typeof entry.id !== 'string' || !/^L-\d{4,}$/.test(entry.id)) {
      problems.push(`${where} has an invalid id '${String(entry.id)}'`);
    }
    if (typeof entry.description !== 'string' || entry.description.length === 0) {
      problems.push(`${where} has no description`);
    }
    if (entry.kind !== 'repo' && entry.kind !== 'external' && entry.kind !== 'user') {
      problems.push(`${where} has an unknown kind '${String(entry.kind)}'`);
    }
    if (entry.status !== 'open' && entry.status !== 'resolved') {
      problems.push(`${where} has an unknown status '${String(entry.status)}'`);
    }
    if (
      entry.status === 'resolved' &&
      (typeof entry.resolution !== 'string' || entry.resolution.length === 0)
    ) {
      problems.push(`${where} is resolved without a resolution`);
    }
  });
}

export function validateRecoveryQuestionsFile(value: unknown, problems: string[]): void {
  if (typeof value !== 'object' || value === null) {
    problems.push('questions file is not an object');
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.schema !== recoveryQuestionsSchemaId) {
    problems.push(
      `questions schema is '${String(record.schema)}', expected '${recoveryQuestionsSchemaId}'`,
    );
  }
  if (!Array.isArray(record.questions)) {
    problems.push('questions is not a list');
    return;
  }
  record.questions.forEach((question, index) => {
    const where = `questions[${index}]`;
    if (typeof question !== 'object' || question === null) {
      problems.push(`${where} is not an object`);
      return;
    }
    const entry = question as Record<string, unknown>;
    if (typeof entry.id !== 'string' || !/^Q-\d{4,}$/.test(entry.id)) {
      problems.push(`${where} has an invalid id '${String(entry.id)}'`);
    }
    if (typeof entry.text !== 'string' || entry.text.length === 0) {
      problems.push(`${where} has no text`);
    }
    if (entry.status !== 'open' && entry.status !== 'answered' && entry.status !== 'deferred') {
      problems.push(`${where} has an unknown status '${String(entry.status)}'`);
    }
    if (
      entry.status === 'answered' &&
      (typeof entry.answer !== 'string' || entry.answer.length === 0)
    ) {
      problems.push(`${where} is answered without an answer`);
    }
    if (
      entry.status === 'deferred' &&
      (typeof entry.deferredReason !== 'string' || entry.deferredReason.length === 0)
    ) {
      problems.push(`${where} is deferred without a reason`);
    }
  });
}

export function validateRecoveryState(value: unknown, problems: string[]): void {
  if (typeof value !== 'object' || value === null) {
    problems.push('state is not an object');
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.schema !== recoveryStateSchemaId) {
    problems.push(
      `state schema is '${String(record.schema)}', expected '${recoveryStateSchemaId}'`,
    );
  }
  if (record.formatVersion !== recoveryFormatVersion) {
    problems.push(
      `state format version is ${String(record.formatVersion)}, this CLI reads version ${recoveryFormatVersion}`,
    );
  }
  if (typeof record.sessionId !== 'string' || !isValidSessionId(record.sessionId)) {
    problems.push(`state has an invalid sessionId '${String(record.sessionId)}'`);
  }
  if (record.changeId !== recoveryChangeId) {
    problems.push(
      `state targets change '${String(record.changeId)}'; initial recovery writes only to ${recoveryChangeId}`,
    );
  }
  if (typeof record.changeDir !== 'string' || record.changeDir.length === 0) {
    problems.push('state has no changeDir');
  }
  if (typeof record.cliVersion !== 'string') problems.push('state has no cliVersion');
  if (!isIsoTimestamp(record.createdAt)) problems.push('state has no valid createdAt timestamp');
  if (!isIsoTimestamp(record.updatedAt)) problems.push('state has no valid updatedAt timestamp');
  if (typeof record.brief !== 'object' || record.brief === null) {
    problems.push('state has no recovery brief');
  }
  if (!Array.isArray(record.modelSnapshot)) {
    problems.push('state has no model snapshot');
  }
  const counters = record.counters as Record<string, unknown> | undefined;
  if (
    typeof counters !== 'object' ||
    counters === null ||
    typeof counters.evidence !== 'number' ||
    typeof counters.lead !== 'number' ||
    typeof counters.question !== 'number'
  ) {
    problems.push('state has no usable id counters');
  }
  if (record.familyProbes !== undefined) {
    if (typeof record.familyProbes !== 'object' || record.familyProbes === null) {
      problems.push('state.familyProbes is not an object');
    }
  }
}

/**
 * Cross-file consistency: ids referenced across the session files must exist and counters must
 * cover every issued id, otherwise a resumed session would mint duplicates.
 */
export function validateSessionConsistency(
  state: RecoveryState,
  inventory: RecoveryInventory,
  leads: RecoveryLeadsFile,
  questions: RecoveryQuestionsFile,
  problems: string[],
): void {
  const maxIssued = (ids: string[]): number =>
    ids.reduce((max, id) => Math.max(max, Number(id.slice(2)) || 0), 0);

  if (state.counters.evidence < maxIssued(inventory.items.map((i) => i.id))) {
    problems.push('evidence counter is behind the highest issued evidence id');
  }
  if (state.counters.lead < maxIssued(leads.leads.map((l) => l.id))) {
    problems.push('lead counter is behind the highest issued lead id');
  }
  if (state.counters.question < maxIssued(questions.questions.map((q) => q.id))) {
    problems.push('question counter is behind the highest issued question id');
  }

  const questionIds = new Set(questions.questions.map((q) => q.id));
  for (const item of inventory.items) {
    for (const finding of item.findings) {
      if (finding.question !== undefined && !questionIds.has(finding.question)) {
        problems.push(`${item.id} references unknown question '${finding.question}'`);
      }
    }
  }

  for (const file of [inventory.sessionId, leads.sessionId, questions.sessionId]) {
    if (file !== state.sessionId) {
      problems.push(`session files disagree on the session id ('${file}' vs '${state.sessionId}')`);
    }
  }
}

async function readJson(path: string, file: string): Promise<unknown> {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch {
    throw new RecoveryStateError(file, ['file is missing']);
  }
  try {
    return JSON.parse(content) as unknown;
  } catch (cause) {
    throw new RecoveryStateError(file, [
      `file is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
    ]);
  }
}

/**
 * Rename with a short bounded retry. Windows transiently refuses to replace a file another
 * process (search indexer, antivirus) holds open; retrying is the established cure and the
 * loop is a no-op on the first success everywhere else.
 */
async function renameReplacing(from: string, to: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EPERM' && code !== 'EACCES') throw error;
      lastError = error;
      await delay(10 * (attempt + 1));
    }
  }
  throw lastError;
}

/**
 * Atomic write: the content lands under a temporary name and is renamed into place, so an
 * interrupted run leaves either the previous file or the new one, never a torn file.
 */
export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, stableJson(value), 'utf8');
  await renameReplacing(temporary, path);
}

export const sessionFileNames = {
  state: 'state.json',
  inventory: 'inventory.json',
  leads: 'leads.json',
  questions: 'questions.json',
  coverage: 'coverage.json',
  report: 'report.md',
} as const;

export interface LoadedRecoverySession {
  /** Absolute path of the session directory. */
  dir: string;
  /** Repository-relative POSIX path of the session directory. */
  relDir: string;
  state: RecoveryState;
  inventory: RecoveryInventory;
  leads: RecoveryLeadsFile;
  questions: RecoveryQuestionsFile;
}

/** Load and strictly validate every session file; throws RecoveryStateError on any defect. */
export async function readRecoverySessionFiles(
  dir: string,
  relDir: string,
): Promise<LoadedRecoverySession> {
  const statePath = join(dir, sessionFileNames.state);
  const stateRaw = await readJson(statePath, `${relDir}/${sessionFileNames.state}`);
  const stateProblems: string[] = [];
  validateRecoveryState(stateRaw, stateProblems);
  if (stateProblems.length > 0) {
    throw new RecoveryStateError(`${relDir}/${sessionFileNames.state}`, stateProblems);
  }
  const state = stateRaw as unknown as RecoveryState;

  const inventoryRaw = await readJson(
    join(dir, sessionFileNames.inventory),
    `${relDir}/${sessionFileNames.inventory}`,
  );
  const inventoryProblems: string[] = [];
  validateRecoveryInventory(inventoryRaw, inventoryProblems);
  if (inventoryProblems.length > 0) {
    throw new RecoveryStateError(`${relDir}/${sessionFileNames.inventory}`, inventoryProblems);
  }
  const inventory = inventoryRaw as unknown as RecoveryInventory;

  const leadsRaw = await readJson(
    join(dir, sessionFileNames.leads),
    `${relDir}/${sessionFileNames.leads}`,
  );
  const leadsProblems: string[] = [];
  validateRecoveryLeadsFile(leadsRaw, leadsProblems);
  if (leadsProblems.length > 0) {
    throw new RecoveryStateError(`${relDir}/${sessionFileNames.leads}`, leadsProblems);
  }
  const leads = leadsRaw as unknown as RecoveryLeadsFile;

  const questionsRaw = await readJson(
    join(dir, sessionFileNames.questions),
    `${relDir}/${sessionFileNames.questions}`,
  );
  const questionsProblems: string[] = [];
  validateRecoveryQuestionsFile(questionsRaw, questionsProblems);
  if (questionsProblems.length > 0) {
    throw new RecoveryStateError(`${relDir}/${sessionFileNames.questions}`, questionsProblems);
  }
  const questions = questionsRaw as unknown as RecoveryQuestionsFile;

  const consistencyProblems: string[] = [];
  validateSessionConsistency(state, inventory, leads, questions, consistencyProblems);
  if (consistencyProblems.length > 0) {
    throw new RecoveryStateError(relDir, consistencyProblems);
  }

  return { dir, relDir, state, inventory, leads, questions };
}

/**
 * Persist a session. State goes first: its counters cover every id the other files may
 * reference, so a crash between writes leaves counter gaps (harmless) rather than duplicate ids.
 */
export async function writeRecoverySessionFiles(session: LoadedRecoverySession): Promise<void> {
  await writeJsonAtomic(join(session.dir, sessionFileNames.state), session.state);
  await writeJsonAtomic(join(session.dir, sessionFileNames.questions), session.questions);
  await writeJsonAtomic(join(session.dir, sessionFileNames.leads), session.leads);
  await writeJsonAtomic(join(session.dir, sessionFileNames.inventory), session.inventory);
}
