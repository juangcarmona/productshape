# 0009 — Reference documentation is generated from the contracts

Status: Accepted
Date: 2026-07-26

## Context

The first adoption of the methodology outside this repository added a `provenance` field to 28
recovered artifacts, because the methodology requires recovered knowledge to carry provenance and
nothing said which frontmatter properties were allowed. Every artifact failed with `PRODUCT002`, a
diagnostic that reports a property as invalid without stating which properties are valid. The only
complete statement of the contract was the JSON Schemas, which no template and no adoption guide
referenced.

The obvious fix — write a reference chapter listing the allowed fields — creates a second source of
truth for a contract the schemas already define. This project already knows how that ends: the
reasoning in [0002 — The graph is derived](0002-the-graph-is-derived.md) is that two hand-maintained
copies of one relationship drift apart and nobody knows which side is right. A hand-written field
reference is the same shape of problem, with a worse failure mode: when documentation and validator
disagree, an author trusts the documentation, is rejected by the validator, and concludes the
documentation cannot be trusted — which returns them to guessing, the behaviour the chapter existed
to prevent.

## Decision

Reference documentation that restates a machine-readable contract is **generated from that contract**,
and a conformance check fails the build when the two disagree.

The instance that fixes the pattern is the
[frontmatter reference](../../specification/frontmatter-reference.md). Its per-kind field tables are
rendered from the canonical JSON Schemas by `pnpm docs:frontmatter`; the surrounding prose — what a
kind is for, why a field exists, which options were rejected — is hand-written and untouched by the
generator, delimited by explicit region markers. `prodshape schema <kind>` renders the same
descriptors for the terminal, so the document, the command and the validator cannot describe three
different contracts.

Three properties make the guarantee real rather than intended:

- **Coverage is checked in both directions and without a hardcoded count.** Every schema must have a
  documented section and every section must have a schema, so a contract added later fails the build
  rather than being quietly undocumented.
- **The check compares semantic content, not bytes.** Table cells are normalized before comparison,
  because the repository formatter reflows Markdown tables. Exempting a specification file from the
  repository's formatting rules to make a byte comparison work would trade a real invariant for a
  convenient test.
- **The generated document is committed.** Readers on GitHub, and tools that never run the generator,
  see the current contract without a build step.

This extends rather than replaces the existing derivation decisions: the graph is derived from
artifacts (0002), vendor assets are derived from canonical assets (0008), and reference documentation
is derived from contracts (this decision). The same test applies in each case — if a thing can be
computed from a canonical source, it is computed, and the computation is verified.

The decision does not apply to documentation that carries meaning the contract cannot express.
`docs/specification/artifacts.md` remains hand-written: a schema can state that `actor-kind` accepts
four values, but not that actors are not personas.

## Consequences

Positive:

- The documented contract cannot drift from the enforced one. A schema change that is not regenerated
  fails CI with a message naming the command that fixes it.
- Adding a document kind cannot silently ship undocumented, because coverage is derived rather than
  enumerated.
- One descriptor feeds the document, the terminal output and the machine-readable form, so a
  presentation change happens once.

Negative:

- Contributors must run a generator after changing a schema; the failure is loud, but it is a step
  that did not exist before.
- The reference's expressiveness is bounded by what the schemas encode. Nuance that matters to a
  reader but has no schema representation has to live in the hand-written prose around the tables,
  which is a judgement call each time.
- Region markers are structure in a specification file, and a contributor editing prose near a
  boundary can put text where the generator will overwrite it. The check catches this, but the failure
  points at the table rather than at the misplaced sentence.
