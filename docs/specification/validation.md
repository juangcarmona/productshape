# Validation

Structural validation is deterministic. Given the same repository content, validation MUST produce the same diagnostics in the same order on every platform. AI is never used to enforce structural invariants.

## Diagnostics

Every diagnostic carries:

| Field | Presence | Meaning |
| --- | --- | --- |
| `severity` | always | `error` or `warning` |
| `code` | always | stable code from the tables below |
| `message` | always | human-readable explanation |
| `file` | always | repository-relative source or expected file (POSIX separators) |
| `artifact` | when applicable | ID of the Product Artifact the diagnostic is about; never a Product Change or unresolved ID |
| `change` | when applicable | ID of the Product Change the diagnostic is about |
| `field` | when applicable | frontmatter field, relationship or body section |
| `target` | when applicable | referenced, operated-on or cited ID exactly as authored, whether or not it resolves |
| `line` | payload only | one-based consumer-file line carrying a citation payload |
| `entry` | sidecar only | one-based citation entry within the sidecar's `citations` sequence |

`artifact`, `change` and `target` are distinct subjects. A citation diagnostic uses `target` for the cited ID. An unresolved ID never appears in `artifact`, because resolution is what would establish that it identifies an artifact. A Product Change ID appears in `change`, never `artifact`.

Diagnostics MUST be available in machine-readable JSON (`--format json`) and MUST be ordered deterministically by `file`, then `line` (absent before present), then `entry` (absent before present), then `code`, `field`, `target`, `artifact` and `change`, comparing absent strings as empty strings. Numeric fields sort numerically; strings sort by Unicode code point.

Warnings are not errors. `validation.warnings-as-errors` in `.product/config.yaml` MAY make a command fail when warnings are present; tools MUST NOT escalate unilaterally, and the emitted diagnostic severity remains `warning`, so machine-readable output is identical with the option on or off.

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
| `PRODUCT020` | Product Change addition whose ID already exists in the baseline |
| `PRODUCT021` | Product Change modification of an ID that does not exist in the baseline |
| `PRODUCT022` | Product Change removal of an ID that does not exist in the baseline |
| `PRODUCT023` | Overlay produces duplicate IDs |
| `PRODUCT024` | Removal leaves a dangling reference from an active artifact in the overlay |
| `PRODUCT025` | Concurrent live Product Changes with overlapping modify/remove operations |
| `PRODUCT026` | Proposed artifact not listed in operations, or operation without its proposed artifact |
| `PRODUCT027` | Baseline revision incompatible at apply: either the base-revision could not be resolved to a commit, or it resolved and a touched artifact's content digest differs from it |
| `PRODUCT028` | Apply attempted on a Product Change whose status is not `approved` |
| `PRODUCT042` | Invalid or unverifiable citation digest |
| `PRODUCT050` | Invalid configuration or unknown top-level configuration key |
| `PRODUCT051` | Managed integration file modified by hand |
| `PRODUCT052` | Expected managed or generated file missing |
| `PRODUCT060` | Unresolved citation: target id or anchor does not resolve |
| `PRODUCT062` | Tampered embedded projection: the embedded block differs from canonical content at the recorded digest |
| `PRODUCT063` | Anchor not found: the target resolves but the named anchor does not exist within it |
| `PRODUCT064` | Unclassified consumer document: an expected current SDD consumer document carries no explicit scope declaration (citations alone never bind) |
| `PRODUCT065` | Bound consumer document with zero citations: the document declares `pdac-scope: cited` but carries no citation records |
| `PRODUCT066` | Invalid exemption: a `pdac-scope: none` declaration with an empty reason or contradicted by citations in the same document |
| `PRODUCT067` | Malformed citation carrier: a malformed payload candidate or sidecar file, a sidecar without its consumer file, or a consumer using both carriers |
| `PRODUCT068` | Provider workspace cannot be resolved: no `openspec/` directory found and no alternative root configured |
| `PRODUCT069` | OpenSpec CLI missing or unsupported version: `openspec` is not on PATH or reports an unparseable version |

`PRODUCT020` to `PRODUCT028` apply to Product Changes and their overlays. They are reported when a change is validated or applied, never when validating the baseline alone, and never against the inert archives under `changes/completed/`, `changes/rejected/` and `changes/superseded/`.

`PRODUCT027` and `PRODUCT028` are apply preconditions: both are evaluated before anything is written and reported with the working tree untouched. The invocation itself is well formed in either case, so apply exits `1`, not `2`.

`PRODUCT050` is reported by any command that discovers an invalid configuration: exactly one diagnostic against `.product/config.yaml`, exit `2`, before artifact discovery or command-specific work, and never a fallback to defaults. `PRODUCT051` and `PRODUCT052` are reported by `doctor` and integration commands; product-model validation does not inspect managed files.

`PRODUCT064`, `PRODUCT065` and `PRODUCT066` are reported only by provider-aware verification (`citations verify --provider <name>`). The SDD integration provider enumerates the expected current consumer-document population, excluding archived history by default per the citation contract, and every current document carries exactly one explicit scope declaration: `bound` (`pdac-scope: cited` with at least one citation) or `exempt` (`pdac-scope: none` with a non-empty human-authored reason and no citations). A document with no declaration, or an unrecognized one, is `unclassified` and fails; citations alone never bind, and exemption is never inferred from missing citations, file names, generated content or AI assessment. A tool never creates or renews an exemption without an explicit human request. Enumerating the population is what makes a zero-citation result over current documents a set of failures instead of a vacuous pass. Explicitly including archived material (`--include-archived`) verifies the citations it carries, with every defect reported as a warning — archived history cannot be edited, so its drift is information rather than something to fix — and the scope gate stays current-only. The report names the provider identity and integration version. This establishes citation grounding and population coverage only: it never proves semantic completeness, semantic correctness or implementation conformance, which remain review questions.

`PRODUCT067` enforces the citation carriers. A consumer document uses exactly one carrier: comment payloads in the document, or the adjacent `<stem>.citations.yml` sidecar. The payload grammar is closed (`id="…" digest="…"` with an optional `anchor="…"`, in that order, double-quoted, nothing else), and discovery treats a `pdac:cite` token followed by payload-like `id=` text as a candidate, so a malformed candidate is reported at its line rather than disappearing as prose. A sidecar must satisfy the normative `citation-sidecar` schema (one YAML document, exactly one non-empty `citations` sequence of closed records, no duplicate keys, aliases, anchors, tags or merge keys); a malformed sidecar file is one diagnostic, never one per failed schema keyword, and its consumer file must exist. Using both carriers is one diagnostic against the consumer file, and the citation statuses of both carriers stay suppressed until the conflict is resolved. The legacy brace form and bare-sequence sidecars remain readable as explicitly non-conforming extensions.

A citation's status is evaluated in a fixed order: invalid digest, unresolved target, unresolved anchor, tampered, stale, current; the first match wins. A citation carries the diagnostic of its status and no other, so `PRODUCT062` (tampered) and `PRODUCT061` (stale) are never both reported for the same citation. An embedded projection's faithfulness is judged against its recorded digest alone, never against the target's current content, so a tampered embedding is reported as `PRODUCT062` even when the cited target has also changed since the citation was recorded.

## Warning codes

| Code | Condition |
| --- | --- |
| `PRODUCT061` | Stale citation: the target resolves but its canonical content changed since the citation was recorded |
| `PRODUCT101` | Artifact file name not aligned with its ID |
| `PRODUCT102` | Active use case not present in any journey |
| `PRODUCT103` | Requirement not reachable from any actor (see [Relationships → Reachability](https://github.com/product-definition-as-code/spec/blob/main/spec/relationships.md#reachability)); product-wide constraints are reachable by definition |
| `PRODUCT104` | Deprecated artifact still referenced by an active artifact |
| `PRODUCT105` | Business rule with no consumers |
| `PRODUCT106` | Domain term with no usage |
| `PRODUCT107` | Bounded context with no owned domain language |
| `PRODUCT108` | Product Change in status `approved` with an unresolved question (a list item) under `## Open Questions` |
| `PRODUCT111` | Draft artifact whose `provenance.confidence` is `low` |

`PRODUCT061` is a warning despite its `0xx` numbering: the citation contract (spec/citation-contract.md) fixes it as a warning so a stale citation does not block a consumer pipeline unless the repository escalates it via `warnings-as-errors`. Tools MUST NOT apply per-artifact-type severity defaults.

`PRODUCT101` is resolved mechanically by `prodshape fix --filenames`, which renames each file to `<id.toLowerCase()>.md`. It renames through a temporary name so it also works on case-insensitive filesystems, where a casing-only rename is otherwise a silent no-op. `--dry-run` reports the plan and exits non-zero when anything would change, which makes it usable as a CI gate: `PRODUCT101` is a warning, so it is not otherwise caught unless `warnings-as-errors` is set.

`PRODUCT111` marks recovered knowledge that needs human validation rather than a defect to repair; see [Frontmatter reference → Provenance](frontmatter-reference.md#provenance).

`PRODUCT108` fires at `approved` and nowhere else. Approval is the human decision that authorizes apply, so an unanswered question at that point has stopped being elaboration and become a decision nobody made. While the change is `draft` or `proposed` the section is a working list and carries no diagnostic.

It is state-based, not transition-based: the warning is reported on every validation of a change in status `approved`, not only at the moment the status changes, so it is reproducible from repository content alone. An unresolved question is a Markdown list item within the `## Open Questions` section, at any nesting depth — bullet or ordered, and a list item counts regardless of its content, task-list checkboxes included. Resolving a question therefore means removing its list item: deleting it, or folding it into the prose that answers it. Prose is not a question, so `None.` and an empty section are resolved by construction. The rule is syntactic on purpose, because no deterministic tool can judge whether prose contains an open question and two implementations reading the same bytes have to agree.

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

- Artifact discovery, graph compilation, traversal, product diff computation, impact analysis and diagnostic ordering MUST be deterministic and platform-independent.
- Generated outputs (`product-graph.json`, indexes, Mermaid, diagnostics JSON) MUST be byte-identical for identical input content, and `product-graph.json` MUST carry a versioned schema identifier.

Product diff determinism is semantic: the same baseline and applied result MUST yield the same set of impacted artifacts, impact kinds and resulting digests. Byte-identity of the diff report is not required while its serialization remains unfixed.
