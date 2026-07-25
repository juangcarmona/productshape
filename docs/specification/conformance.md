# Conformance

## Repository conformance

A repository conforms to Product Definition as Code v0.1 when:

1. Its canonical product definition lives under a configured product root (default
   `docs/product`) with the model/changes layout defined in this specification.
2. Every product artifact satisfies the [artifact contracts](artifacts.md): valid frontmatter per
   schema, required body sections, valid lifecycle state.
3. Every ID satisfies the [identifier rules](identifiers.md) and every reference satisfies the
   [relationship vocabulary](relationships.md).
4. Structural validation of the baseline reports no errors. Warnings are permitted.
5. Every Product Change satisfies the [change contract](product-changes.md) and its overlay
   validates without errors.
6. Every Delivery Slice satisfies the [slice contract](delivery-slices.md).
7. Every Product Handoff kept in the repository satisfies the
   [handoff contract](handoff-contract.md).
8. Semantic evolution after the initial accepted baseline happens only through Product Changes,
   and the baseline is modified only by explicit promotion.

## Implementation conformance

An implementation (tooling) conforms when:

1. It validates all of the above deterministically, emitting the diagnostic codes, fields,
   ordering and exit codes defined in [Validation](validation.md).
2. It compiles the product graph exclusively from canonical files and can always rebuild every
   derived output.
3. It derives reverse relationships and never requires reciprocal authoring.
4. It computes digests with the mandated LF normalization.
5. It never mutates the baseline except during explicit promotion, and never promotes implicitly.
6. It treats warnings as non-fatal unless the repository opts into `warnings-as-errors`.

## Violation mapping

Each normative statement in this specification maps to a diagnostic in
[Validation](validation.md); the conformance fixtures under `tests/fixtures` and
`examples/invalid` exercise representative violations and assert their codes. A change to
normative behaviour MUST update the specification, the diagnostic table and the fixtures together.
