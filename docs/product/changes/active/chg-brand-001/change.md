---
id: CHG-BRAND-001
type: product-change
title: Adopt ProductShape as the public brand of the reference implementation
status: approved
base-revision: 077f9e5413ca46281af499697a2d0e96f216f645
operations:
  add:
    - TERM-METHODOLOGY
    - TERM-REFERENCE-IMPLEMENTATION
    - CON-BRAND-001
  modify: []
  remove: []
---

## Problem

The public name of the project was deliberately left unresolved ([OPEN-DECISIONS OD-001]): the
methodology is called "Product Definition as Code", but the reference implementation — the toolkit,
its packages, its repository and its command surface — has no settled brand, only placeholder names
chosen to avoid committing early. Shipping v0.1.0 requires a public identity, and that identity
must not be conflated with the methodology: a methodology can have more than one implementation,
and binding the ideas to one tool's name would quietly narrow both. The project also lacks
first-class vocabulary for the distinction itself, so "methodology" and "implementation" are used
loosely in documentation and AI reasoning.

## Intended Product Outcome

The product model names the two identities explicitly and keeps them distinct. **Product Definition
as Code** is the methodology — the long-lived, implementation-independent concept. **ProductShape**
is its reference implementation — the first shipped toolkit that realizes the methodology, exactly
as OpenSpec is an implementation of Spec-Driven Development. The model gains two first-class domain
terms (Methodology, Reference Implementation) and a product-wide constraint fixing the naming
policy, so future documentation and AI reasoning can rely on the distinction rather than
reconstruct it.

## Rationale

The methodology and its implementation have different lifecycles and audiences. The methodology is
ideas plus a normative specification that could be implemented more than once; the implementation
is one shipped toolkit that must claim a name, a package namespace and a release channel to exist
publicly. Naming them as two distinct layers lets the tool carry a memorable public brand now —
which shipping requires — without tying the methodology's contracts to it, and lets either evolve
without dragging the other.

The distinction earns first-class **terms** rather than living only inside a constraint: it is
foundational vocabulary that the manifesto, the adoption guides and every AI skill lean on, so a
reader or an assistant should be able to look it up as domain language. The **constraint** remains
alongside the terms because the terms define meaning while the constraint fixes the *policy* — that
public identity must keep the two names distinct and that the reference implementation ships under
a settled brand. Definitions and policy are complementary, not redundant.

## Decisions

Recorded from the branding review. Model-level decisions are realized by this change's overlay;
the rest are implementation decisions realized later (see Out of Scope).

- **Public brand:** the reference implementation is **ProductShape**. Marketing subtitle
  "ProductShape — Product Definition as Code".
- **npm scope:** `@prodshape/*` (developer-friendly short form), e.g. `@prodshape/core`,
  `@prodshape/cli`, `@prodshape/openspec`, `@prodshape/claude`, `@prodshape/copilot`.
- **CLI binary:** `prodshape`, with `product-definition` kept only as a temporary compatibility
  alias during v0.x and removed before v1.
- **Command namespace:** `/product:*` stays canonical (it describes product intent and is stable
  across brand evolution); an optional shorthand alias `/ps:*` is generated (`/ps:change`,
  `/ps:impact`, `/ps:handoff`). Not `prs:*` — `ps` maps clearly to ProductShape and is easier to
  type.
- **Configuration directory:** `.product/` is kept — it belongs to the methodology, not the brand.
- **Schema identifiers:** the `product-definition-as-code/...` namespace (and URN form) is kept —
  schemas define the methodology contract, and rebranding them is version churn with no payoff.
- **Diagnostic identifiers:** `PRODUCT###` is kept — diagnostics belong to the methodology and stay
  implementation-independent.
- **Domain vocabulary:** the Methodology / Reference Implementation distinction becomes two
  first-class domain terms (this change).

## Affected Product Areas

**Product-model impact (this change's overlay):**

- Add `TERM-METHODOLOGY` and `TERM-REFERENCE-IMPLEMENTATION` (defined in `BC-PRODUCT-DEFINITION`),
  naming Product Definition as Code as the methodology and ProductShape as its reference
  implementation.
- Add `CON-BRAND-001`, a product-wide constraint fixing the naming policy.
- No use case, requirement, journey or rule is modified. The CLI binary appears in 15 model
  artifact bodies, but because `product-definition` remains a working alias throughout v0.x those
  bodies stay accurate; updating them is deferred until the alias is dropped (see Out of Scope).
- The `/product:*` namespace is not referenced anywhere in the model, so keeping it canonical and
  adding the `/ps:*` alias has no model footprint.

**Implementation and distribution impact (out of this overlay; realized through a later OpenSpec
change):**

- Repository renamed to `productshape`; documentation title and public references become
  ProductShape; README gains the two-identity framing.
- Packages republished under `@prodshape/*`; because nothing is published yet this is a clean
  rename.
- `prodshape` binary added with `product-definition` as a temporary alias; generated Claude and
  Copilot assets regenerated (`integration update`) to add the `/ps:*` alias.
- Examples keep their synthetic, brand-neutral product; only CLI command references change.
- `.product/`, the `product-definition-as-code/...` schema identifiers and the `PRODUCT###`
  diagnostic codes are all kept unchanged.
- `OPEN-DECISIONS.md` OD-001 is updated to record the chosen direction (done now as a repository
  document; it is not a product artifact and so is not part of this overlay).

Interaction with existing constraints: `CON-PUBLIC-GENERIC` requires the framework's vocabulary to
stay the methodology's own and free of adopter-specific terms; ProductShape is the framework's own
brand, not an adopter's, so the two constraints coexist.

## Open Questions

None. Two items were considered during the branding review and are settled rather than left open.
The exact v0.x release at which the `product-definition` binary alias is removed is deferred to a
follow-up Product Change and is recorded under Out of Scope, not a decision this change makes. The
two new domain terms are accepted as foundational vocabulary even though no use case references
them yet — the resulting two advisory `PRODUCT106` warnings are an accepted, non-blocking tradeoff
that a later change may clear by referencing the terms from a use case.

## Product Acceptance

- The model defines Methodology and Reference Implementation as domain terms and names ProductShape
  as the reference implementation of Product Definition as Code.
- The model carries a product-wide constraint stating the brand is ProductShape, the methodology
  name is retained, and public identity keeps the two distinct.
- No existing use case, requirement or term is silently rebranded by this change; the binary alias
  keeps current behaviour accurate.

## Out of Scope

- All mechanical renames (repository, npm scope and package names, the `prodshape` binary and its
  alias, README and documentation, generated Claude/Copilot assets and the `/ps:*` alias, examples)
  are implementation work in a later OpenSpec change after this Product Change is approved. Per the
  branding review, the first delivery slice is dedicated exclusively to renaming public assets
  while preserving all existing semantics.
- Updating the 15 model artifacts that name the `product-definition` binary: deferred until the
  alias is removed (a follow-up Product Change).
- Delivery slices, backlog items, handoff generation and promotion: not created here; the change
  stays in Draft pending review.
- npm publication itself (OD-005): a downstream release action.
