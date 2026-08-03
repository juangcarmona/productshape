# Validation

Structural validation is deterministic. Given the same repository content, validation MUST produce the same diagnostics in the same order on every platform. AI is never used to enforce structural invariants.

## Diagnostics

Every diagnostic carries:

| Field      | Presence        | Meaning                                            |
| ---------- | --------------- | -------------------------------------------------- |
| `severity` | always          | `error` or `warning`                               |
| `code`     | always          | stable code from the tables below                  |
| `message`  | always          | human-readable explanation                         |
| `file`     | always          | repository-relative source file (POSIX separators) |
| `artifact` | when available  | artifact ID                                        |
| `field`    | when available  | frontmatter field or relationship                  |
| `target`   | when applicable | referenced target ID                               |

Diagnostics MUST be available in machine-readable JSON (`--format json`) and MUST be ordered deterministically (by file, then code, then target).

Warnings are not errors. `validation.warnings-as-errors` in `.product/config.yaml` MAY escalate them for a repository; tools MUST NOT escalate unilaterally.

## Error codes

| Code | Condition |
| --- | --- |
| `PRODUCT001` | Invalid YAML frontmatter or unparseable artifact document |
| `PRODUCT002` | JSON Schema violation (missing required field, unknown property, invalid value) |
| `PRODUCT003` | Unknown artifact `type` |
| `PRODUCT004` | ID prefix does not match the artifact type |
| `PRODUCT005` | Duplicate ID |
| `PRODUCT006` | Reference to an unknown ID |
| `PRODUCT007` | Relationship targets a disallowed artifact type |
| `PRODUCT008` | Active artifact references a retired artifact |
| `PRODUCT009` | Required body section missing or out of order |
| `PRODUCT042` | Invalid or unverifiable citation digest |
| `PRODUCT050` | Invalid configuration or unknown top-level configuration key |
| `PRODUCT051` | Managed integration file modified by hand |
| `PRODUCT052` | Expected managed or generated file missing |
| `PRODUCT060` | Unresolved citation: target id or anchor does not resolve |
| `PRODUCT062` | Tampered embedded projection: the embedded block differs from canonical content at the recorded digest |
| `PRODUCT063` | Anchor not found: the target resolves but the named anchor does not exist within it |

`PRODUCT050`–`PRODUCT052` are reported by `doctor` and integration commands; product-model validation does not inspect managed files.

## Warning codes

| Code | Condition |
| --- | --- |
| `PRODUCT101` | Artifact file name not aligned with its ID |
| `PRODUCT102` | Active use case not present in any journey |
| `PRODUCT103` | Requirement not reachable from any actor (see [Relationships → Reachability](relationships.md#reachability)); product-wide constraints are reachable by definition |
| `PRODUCT104` | Deprecated artifact still referenced by an active artifact |
| `PRODUCT105` | Business rule with no consumers |
| `PRODUCT106` | Domain term with no usage |
| `PRODUCT107` | Bounded context with no owned domain language |
| `PRODUCT111` | Draft artifact whose `provenance.confidence` is `low` |

`PRODUCT061` is a warning despite its `0xx` numbering: the citation contract (spec/citation-contract.md) fixes it as a warning so a stale citation does not block a consumer pipeline unless the repository escalates it via `warnings-as-errors`. Tools MUST NOT apply per-artifact-type severity defaults.

`PRODUCT101` is resolved mechanically by `prodshape fix --filenames`, which renames each file to `<id.toLowerCase()>.md`. It renames through a temporary name so it also works on case-insensitive filesystems, where a casing-only rename is otherwise a silent no-op. `--dry-run` reports the plan and exits non-zero when anything would change, which makes it usable as a CI gate: `PRODUCT101` is a warning, so it is not otherwise caught unless `warnings-as-errors` is set.

`PRODUCT111` marks recovered knowledge that needs human validation rather than a defect to repair; see [Frontmatter reference → Provenance](frontmatter-reference.md#provenance).

## Exit codes

| Code | Meaning                                                 |
| ---- | ------------------------------------------------------- |
| `0`  | Success; warnings allowed (unless `warnings-as-errors`) |
| `1`  | Validation or conformance errors                        |
| `2`  | Invalid invocation or configuration                     |
| `3`  | Unexpected internal failure                             |

## Digests

Content digests are SHA-256 over the artifact's UTF-8 bytes with CRLF and CR line endings normalized to LF, rendered as `sha256:<lowercase hex>`. This normalization is mandatory: digests MUST be identical across operating systems and Git line-ending configurations.

## Determinism requirements

- Artifact discovery, graph compilation, traversal, impact analysis and diagnostic ordering MUST be deterministic and platform-independent.
- Generated outputs (`product-graph.json`, indexes, Mermaid, diagnostics JSON) MUST be byte-identical for identical input content, and `product-graph.json` MUST carry a versioned schema identifier.
