# Validation

Structural validation is deterministic. Given the same repository content, validation MUST produce
the same diagnostics in the same order on every platform. AI is never used to enforce structural
invariants.

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

Diagnostics MUST be available in machine-readable JSON (`--format json`) and MUST be ordered
deterministically (by file, then code, then target).

Warnings are not errors. `validation.warnings-as-errors` in `.product/config.yaml` MAY escalate
them for a repository; tools MUST NOT escalate unilaterally.

## Error codes

| Code         | Condition                                                                              |
| ------------ | -------------------------------------------------------------------------------------- |
| `PRODUCT001` | Invalid YAML frontmatter or unparseable artifact document                              |
| `PRODUCT002` | JSON Schema violation (missing required field, unknown property, invalid value)        |
| `PRODUCT003` | Unknown artifact `type`                                                                |
| `PRODUCT004` | ID prefix does not match the artifact type                                             |
| `PRODUCT005` | Duplicate ID                                                                           |
| `PRODUCT006` | Reference to an unknown ID                                                             |
| `PRODUCT007` | Relationship targets a disallowed artifact type                                        |
| `PRODUCT008` | Active artifact references a retired artifact                                          |
| `PRODUCT009` | Required body section missing or out of order                                          |
| `PRODUCT020` | Product Change addition whose ID already exists in the baseline                        |
| `PRODUCT021` | Product Change modification of an ID that does not exist in the baseline               |
| `PRODUCT022` | Product Change removal of an ID that does not exist in the baseline                    |
| `PRODUCT023` | Overlay produces duplicate IDs                                                         |
| `PRODUCT024` | Removal leaves a dangling reference from an active artifact in the overlay             |
| `PRODUCT025` | Concurrent active Product Changes with overlapping modify/remove operations            |
| `PRODUCT026` | Proposed artifact not listed in operations, or operation without its proposed artifact |
| `PRODUCT027` | Baseline revision incompatible at promotion without explicit resolution                |
| `PRODUCT030` | Delivery slice references a different Product Change than the one containing it        |
| `PRODUCT031` | Partial requirement coverage without a `scope` field                                   |
| `PRODUCT032` | Delivery slice dependency cycle                                                        |
| `PRODUCT040` | Handoff generated from (or referencing) a non-approved slice                           |
| `PRODUCT041` | Handoff missing required artifacts                                                     |
| `PRODUCT042` | Invalid or unverifiable content digest                                                 |
| `PRODUCT043` | Implemented requirement without a coverage mapping                                     |
| `PRODUCT050` | Invalid configuration or unknown top-level configuration key                           |
| `PRODUCT051` | Managed integration file modified by hand                                              |
| `PRODUCT052` | Expected managed or generated file missing                                             |

`PRODUCT050`–`PRODUCT052` are reported by `doctor` and integration commands; product-model
validation does not inspect managed files.

## Warning codes

| Code         | Condition                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| `PRODUCT101` | Artifact file name not aligned with its ID                                                                   |
| `PRODUCT102` | Active use case not present in any journey                                                                   |
| `PRODUCT103` | Requirement not reachable from any actor (see [Relationships → Reachability](relationships.md#reachability)) |
| `PRODUCT104` | Deprecated artifact still referenced by an active artifact                                                   |
| `PRODUCT105` | Business rule with no consumers                                                                              |
| `PRODUCT106` | Domain term with no usage                                                                                    |
| `PRODUCT107` | Bounded context with no owned domain language                                                                |
| `PRODUCT108` | Product Change approved with unresolved open questions                                                       |
| `PRODUCT109` | Delivery slice affecting artifacts outside its requirements' closure                                         |
| `PRODUCT110` | Handoff context containing artifacts outside the recomputed closure                                          |

## Exit codes

| Code | Meaning                                                 |
| ---- | ------------------------------------------------------- |
| `0`  | Success; warnings allowed (unless `warnings-as-errors`) |
| `1`  | Validation or conformance errors                        |
| `2`  | Invalid invocation or configuration                     |
| `3`  | Unexpected internal failure                             |

## Digests

Content digests are SHA-256 over the artifact's UTF-8 bytes with CRLF and CR line endings
normalized to LF, rendered as `sha256:<lowercase hex>`. This normalization is mandatory: digests
MUST be identical across operating systems and Git line-ending configurations.

## Determinism requirements

- Artifact discovery, graph compilation, traversal, impact analysis and diagnostic ordering MUST
  be deterministic and platform-independent.
- Generated outputs (`product-graph.json`, indexes, Mermaid, diagnostics JSON) MUST be
  byte-identical for identical input content, and `product-graph.json` MUST carry a versioned
  schema identifier.
