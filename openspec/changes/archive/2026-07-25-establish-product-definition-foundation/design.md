# Design — establish-product-definition-foundation

## Context

This change is documentation- and contract-heavy by design. The architectural decisions were fixed
at Gate 0 and are recorded as ADRs 0001–0008; this design note only records how those decisions are
realized in this change.

## Key decisions

1. **Docs layering without duplication.** README answers "what/why/try it"; `docs/manifesto.md` is
   the opinionated position; `docs/methodology/` explains how humans apply the methodology;
   `docs/specification/` is the only normative source. Each layer links to the next instead of
   repeating it.
2. **Schema-specific lifecycles.** `schemas/common.schema.json` exposes `artifactStatus`,
   `productChangeStatus` and `deliverySliceStatus` as separate `$defs`; artifact schemas reference
   `common.schema.json#/$defs/...` by `$ref`. No shared generic status enum exists.
3. **`owns-terms` is derived.** The bounded-context schema and template omit it entirely
   (`additionalProperties: false` rejects manual authoring). The derivation appears in the
   relationships specification and ADR 0002.
4. **Frontmatter-only schema validation.** JSON Schema validates frontmatter. Required body
   sections are specified normatively in `artifacts.md` and enforced later by the deterministic
   validator (change `implement-product-graph-core`); the foundation slice validates frontmatter
   only.
5. **Minimal core slice.** `packages/core` ships only `parseArtifactFile` (gray-matter),
   `normalizeToLf` + `sha256Digest`, a schema registry (ajv, 2020-12) and diagnostic types. No
   discovery, graph, references or CLI — those belong to the next change. The public API is shaped
   so the next change extends rather than rewrites it.
6. **Initial-baseline bootstrap exception.** The self-hosted model is authored directly into
   `docs/product/model` (allowed only for the first accepted baseline). Every later semantic
   change to the model must go through a Product Change; this is stated in the spec, the Define
   methodology, ADR 0004 and `docs/product/README.md`.

## Alternatives considered

- One shared status enum for all lifecycles — rejected at Gate 0 (correction 5): it validates
  nonsense states across kinds.
- Validating body sections with JSON Schema — rejected: frontmatter is data, bodies are prose;
  heading checks belong to the deterministic validator where line-level diagnostics are possible.
