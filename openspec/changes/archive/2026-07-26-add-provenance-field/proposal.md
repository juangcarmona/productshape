# Add the Provenance Field

## Why

The methodology requires recovered artifacts to carry provenance and confidence: "candidates without
provenance are opinions" (`docs/methodology/recover.md`). The v0.1 schemas had nowhere to put it.

The `recover-product` skill worked around this by instructing the model to record provenance in a
`## Recovery Provenance` body subsection, explicitly "because the schemas reject unknown fields". So
the one piece of information that determines how far to trust a recovered artifact lived in prose:
not queryable, not validated, and impossible to use to build a review queue.

The first adoption outside this repository hit the other end of the same gap — it added the field
itself, on 28 artifacts, and deleted it again after 28 `PRODUCT002` errors.

## What Changes

- Add an optional `provenance` object to all nine artifact kinds, defined once in
  `common.schema.json`: `source` and `confidence` required when present, `recovered-from` optional.
  The object is closed, like every other schema in the family.
- Add warning `PRODUCT111` for a `draft` artifact whose `provenance.confidence` is `low`, so the
  queue of candidates needing human validation is derivable from validation output.
- Amend `docs/specification/artifacts.md`, which forbade exactly this ("artifacts MUST NOT carry
  author, owner, date, version or review metadata. Git history provides provenance"). Git history
  remains the record of authorship; provenance records the _evidence_ behind a claim.
- Update `recover-product` to emit the frontmatter object, and drop the obsolete rationale.
- Carry the field as commented guidance in the nine artifact templates.

### Rejected options

- **Provenance on `product-change`.** A recovery change carries provenance on its proposed
  artifacts, which are ordinary artifact documents. The change document is not a claim about the
  system.
- **An open `provenance` object.** It would be the one place a typo passes silently, and the natural
  home for the author/owner/date metadata `artifacts.md` forbids.
- **Making `recovered-from` required.** Real evidence is often several of these at once — a rule read
  from a pinned test is both observation and documentation — and requiring the field invites
  guessing.
- **Configuration-gating PRODUCT111.** `PRODUCT102` and `PRODUCT103` are gated because they encode
  model-shape policies a repository may reasonably reject. `PRODUCT111` reports what one artifact
  says about itself.
- **`PRODUCT053`, as originally proposed.** `PRODUCT0xx` is the error range; warnings are
  `PRODUCT1xx`.

## Capabilities

### Modified Capabilities

- `artifact-schemas`: a shared optional field on every artifact kind.
- `structural-validation`: a new model-quality warning.
- `ai-skills`: recovery records provenance in frontmatter.

## Impact

- `schemas/` and its mirror in `packages/core/schemas/` (10 files each).
- `packages/core`: `codes.lowConfidenceDraft` and one loop in `validateModel`.
- Fixtures: one valid, two invalid, and one warning-level model.
- The self-hosted model gains no provenance: its artifacts were authored from intent, so claiming
  evidence for them would be false. Coverage comes from fixtures instead.
