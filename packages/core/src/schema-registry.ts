import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { idPrefixByType, isMarkdownDocumentType } from './artifact.js';
import type { Diagnostic } from './diagnostics.js';
import { codes } from './diagnostics.js';

/** A loaded JSON Schema document, keyed by kind. Retained so the schemas can be described. */
export type RawSchema = Record<string, unknown>;

export class SchemaRegistry {
  private readonly validators = new Map<string, ValidateFunction>();

  /**
   * The parsed schema documents, including `common`. Retained because the schemas are the
   * single source of truth for the frontmatter reference: `prodshape schema` and the
   * reference document are both derived from these rather than restating them.
   */
  private readonly sources = new Map<string, RawSchema>();

  private constructor(private readonly ajv: Ajv2020) {}

  /** Load the schemas bundled with this package. */
  static loadBundled(): Promise<SchemaRegistry> {
    return SchemaRegistry.load(fileURLToPath(new URL('../schemas/', import.meta.url)));
  }

  /** Load every *.schema.json file from a directory (typically the repository's schemas/). */
  static async load(schemaDir: string): Promise<SchemaRegistry> {
    const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true });
    addFormats.default(ajv);
    const registry = new SchemaRegistry(ajv);

    const entries = (await readdir(schemaDir)).filter((f) => f.endsWith('.schema.json')).sort();
    const schemas = new Map<string, Record<string, unknown>>();
    for (const entry of entries) {
      const schema = JSON.parse(await readFile(join(schemaDir, entry), 'utf8')) as Record<
        string,
        unknown
      >;
      ajv.addSchema(schema);
      schemas.set(entry.replace(/\.schema\.json$/, ''), schema);
    }
    // Compile in a second pass so cross-schema $refs (all via common) resolve.
    for (const [kind, schema] of schemas) {
      registry.sources.set(kind, schema);
      if (kind === 'common') continue;
      registry.validators.set(kind, ajv.compile({ $ref: schema.$id as string }));
    }
    return registry;
  }

  has(kind: string): boolean {
    return this.validators.has(kind);
  }

  /** Every validatable document kind, sorted. Excludes `common`, which is definitions only. */
  kinds(): string[] {
    return [...this.validators.keys()].sort();
  }

  /** The parsed schema document for a kind, or undefined when the kind is unknown. */
  rawSchema(kind: string): RawSchema | undefined {
    return this.sources.get(kind);
  }

  /** Every parsed schema document, including `common` so `$ref`s can be resolved. */
  rawSchemas(): ReadonlyMap<string, RawSchema> {
    return this.sources;
  }

  /**
   * Validate a document's structured data against the schema for its kind.
   * For Markdown artifacts the kind is the frontmatter `type`; for YAML documents
   * it is the document kind (delivery-slice, product-handoff, product-coverage).
   */
  validate(kind: string, data: unknown, file: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const record = (data ?? {}) as Record<string, unknown>;
    const artifact = typeof record.id === 'string' ? record.id : undefined;

    const validator = this.validators.get(kind);
    if (!validator) {
      return [
        {
          severity: 'error',
          code: codes.unknownArtifactType,
          message: `Unknown artifact type '${kind}'`,
          file,
          artifact,
        },
      ];
    }

    // Dedicated prefix/type mismatch diagnostic; the schema pattern would also
    // reject it, so matching id-pattern violations are folded into PRODUCT004.
    let prefixMismatch = false;
    if (isMarkdownDocumentType(kind) && artifact !== undefined) {
      const prefix = idPrefixByType[kind];
      if (prefix && !artifact.startsWith(`${prefix}-`)) {
        prefixMismatch = true;
        diagnostics.push({
          severity: 'error',
          code: codes.idPrefixMismatch,
          message: `ID '${artifact}' does not use the '${prefix}-' prefix required for type '${kind}'`,
          file,
          artifact,
          field: 'id',
        });
      }
    }

    if (!validator(data)) {
      for (const error of validator.errors ?? []) {
        if (prefixMismatch && error.instancePath === '/id') continue;
        const field = error.instancePath.replace(/^\//, '').replaceAll('/', '.') || undefined;
        diagnostics.push({
          severity: 'error',
          code: codes.schemaViolation,
          message: `${error.instancePath || 'document'} ${error.message ?? 'is invalid'}`,
          file,
          artifact,
          field,
        });
      }
    }

    // PRODUCT005: duplicate verification scenario ids within a single FR/QR artifact.
    // JSON Schema cannot express "unique by property", so this is a structural check.
    // Scenario ids are optional, but when present they must be unique within the artifact
    // so a citation anchor resolves to exactly one scenario.
    if (kind === 'functional-requirement' || kind === 'quality-requirement') {
      const verification = (record as { verification?: unknown }).verification;
      if (Array.isArray(verification)) {
        const seenScenarioIds = new Map<string, number>();
        for (const entry of verification) {
          if (typeof entry !== 'object' || entry === null) continue;
          const scenarioId = (entry as Record<string, unknown>).id;
          if (typeof scenarioId !== 'string' || scenarioId.length === 0) continue;
          seenScenarioIds.set(scenarioId, (seenScenarioIds.get(scenarioId) ?? 0) + 1);
        }
        for (const [scenarioId, count] of seenScenarioIds) {
          if (count > 1) {
            diagnostics.push({
              severity: 'error',
              code: codes.duplicateId,
              message: `Duplicate verification scenario id '${scenarioId}' (${count} occurrences)`,
              file,
              artifact,
              field: 'verification[].id',
            });
          }
        }
      }
    }
    return diagnostics;
  }
}
