---
id: CHG-CLI-POLISH-001
type: product-change
title: Make the authoring contract discoverable and mechanically repairable
status: implemented
base-revision: 6101919cb510eae461df0c5871465a0f5b721c27
operations:
  add:
    - UC-SCHEMA-001
    - FR-SCHEMA-001
    - UC-FIX-001
    - FR-FIX-001
  modify: []
  remove: []
---

## Problem

The first adoption of Product Definition as Code outside its reference repository surfaced two gaps
that are product gaps, not implementation details.

**The authoring contract was not discoverable.** The methodology requires recovered artifacts to
carry provenance, so the adopter added a `provenance` field to 28 artifacts. Every one failed with
`PRODUCT002` — "document must NOT have additional properties" — a diagnostic that says a property is
wrong without saying which properties are right. The only complete statement of the contract was the
JSON Schemas, which no template and no adoption guide pointed at. There was no way to ask the product
"what may I write on a business rule?" except to guess and read the errors.

**A reported defect could not be repaired.** `PRODUCT101` warns that a file name does not match its
artifact's ID. On Windows and macOS the fix is impossible by hand: renaming `ACT-ADMIN.md` to
`act-admin.md` is a no-op, because on a case-insensitive filesystem those are the same file. The
adopter attempted it, the rename silently did nothing, and the warnings stayed. A diagnostic the
product raises but no one can act on is a diagnostic that teaches people to ignore diagnostics.

## Intended Product Outcome

Both gaps close as product capabilities rather than as documentation.

A Product Engineer can ask the product what frontmatter a given artifact kind accepts, and get an
authoritative answer without a repository, without network access, and before deciding what to
author. The answer comes from the same definitions validation enforces, so it cannot describe a
contract the validator does not apply.

A Product Engineer can repair filename misalignment mechanically, on any filesystem, and can gate it
so it does not accumulate. The repair is idempotent, refuses ambiguous cases rather than guessing,
and never leaves the model half-renamed.

## Rationale

Both belong in the model rather than in a guide because both are things the product _does_ for a
user, not things a reader must be told.

Documentation alone would not have prevented the provenance incident. The adopter was not
under-informed; they were reasoning from the methodology's own requirement toward a field the schema
did not have, in a repository where nothing could answer the question locally. A queryable contract
removes the guessing step. Grounding it in the schemas rather than in prose is what keeps the answer
true over time — a documented contract drifts, a derived one cannot.

Filename repair earns a requirement rather than a note because the alternative is asking adopters to
work around a platform behaviour the product knows about. A warning the product raises on Windows and
cannot resolve on Windows is a defect in the product, not in the user's shell.

The two are one change because they share a cause: the product reported problems it did not help
solve. Splitting them would produce two changes with the same rationale and the same slice boundary.

## Affected Product Areas

**This change's overlay:**

- Add `UC-SCHEMA-001` and `FR-SCHEMA-001`: querying the allowed frontmatter for an artifact kind.
- Add `UC-FIX-001` and `FR-FIX-001`: mechanically repairing filename misalignment.
- No existing artifact is modified. `UC-INIT-001` and `FR-INIT-001` describe what initialization
  creates and what it must not destroy; the dry-run report and the scaffolding placeholders are new
  ways of satisfying those obligations, not new obligations, so neither artifact's statement changes.
- `BR-IDENTITY-001` already fixes the identifier and file-naming rule that `FR-FIX-001` repairs
  toward, so `FR-FIX-001` derives from it rather than restating it.

**Out of this overlay (implementation, realized through the accompanying OpenSpec changes):**

- The frontmatter reference chapter and its generator, `PRODUCT111`, the `provenance` schema field,
  initialization scaffolding placeholders and `--flat`, the dry-run report, the two health checks, the
  shorthand configuration key, and the installation-lock documentation.

## Open Questions

None. Two decisions were considered and settled rather than deferred. Flattening the model directory
onto the product root was rejected because artifact discovery would then ingest the changes
directory as baseline artifacts, collapsing the separation the authority model depends on. Adopting
the flatter directory taxonomy the adopter independently chose was rejected because the existing one
is already shipped and already the target of promotion; the gap was that it was never written down.

## Product Acceptance

- A Product Engineer can obtain the complete allowed frontmatter for any artifact kind, including
  which fields are required and what values they accept, without a product repository present.
- The answer is derived from the definitions validation enforces, so a contract change cannot leave
  the answer stale.
- A Product Engineer can resolve every reported filename misalignment in one step, on a
  case-insensitive filesystem, and re-running the repair changes nothing.
- An ambiguous repair is refused with its reason rather than applied, and no partial rename is left
  behind.

## Out of Scope

- Automating any other diagnostic's repair. `PRODUCT101` is mechanical because the correct name is
  derivable from the ID; the remaining warnings require judgement about the model's meaning.
- Making the frontmatter contract extensible. It stays closed: the value of `PRODUCT002` is that an
  unrecognised field is an error rather than a silently ignored one.
- Delivery slice approval, handoff generation and promotion: this change stays `draft` pending
  review.
