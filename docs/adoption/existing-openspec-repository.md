# Adopting in an existing OpenSpec repository

This guide is for repositories that already run OpenSpec. Product Definition as Code adds a product-definition layer above your existing workflow; OpenSpec keeps owning everything it owns today. This repository itself works exactly this way.

> The CLI ships as [`@prodshape/cli`](https://www.npmjs.com/package/@prodshape/cli) and includes the OpenSpec adapter. The commands below use `prodshape`; the `product-definition` alias is equivalent through v0.x. The contracts are fixed in the [specification](https://github.com/product-definition-as-code/spec). See [Limitations](../limitations.md).

## What Product Definition adds

OpenSpec answers "how do we specify, design and verify this implementation increment?". Product Definition answers the question upstream of that: "what is the product, and what exactly are we changing about it?". It adds:

- A canonical Product Definition under `docs/product/model`: actors, journeys, use cases, rules, terms, contexts, requirements and constraints, compiled into a validated product graph.
- Product Changes: explicit, validated semantic deltas against that definition, each carrying the reason it exists.
- Citations: machine-verifiable references from your OpenSpec documents to canonical product text, so drift between the two is detected rather than discovered.

The flow becomes: Product Definition → Product Change → apply → accept by merge → **native OpenSpec workflow, citing the definition** → implementation → verification.

Note what is not in that list. Product Definition does not decompose your work, does not hand you a package, and does not gate on whether anything was built. Whether accepted product intent has been implemented is a fact about delivery, and delivery is yours.

## What OpenSpec keeps owning

Everything native. The `openspec/` directory, its folder layout, `proposal.md`, `design.md`, `tasks.md`, spec deltas, the propose/apply/archive lifecycle and its tooling are unchanged. Product Definition never writes into OpenSpec's own artifacts, never drives its lifecycle, and OpenSpec never rewrites canonical product knowledge.

## How the two layers bind: citations

An OpenSpec document that depends on product knowledge cites it rather than restating it. A citation records the artifact `id`, a content `digest`, and optionally an `anchor` naming a verification scenario within that artifact:

```bash
prodshape cite --id FR-SHORTEN-001 --file docs/product/model/requirements/functional/fr-shorten-001.md
prodshape cite --id UC-SHORTEN-001 --anchor S2 --file docs/product/model/use-cases/uc-shorten-001.md
```

Three forms are available through `--form`: `inline` (the default, a single line inside prose), `marker-block` (a delimited block carrying an embedded projection of the cited text) and `sidecar-ledger` (a YAML file listing a document's citations). Use whichever suits the document; the verification semantics are identical.

Verify them at any time, and in CI:

```bash
prodshape citations verify openspec
```

Every citation resolves to exactly one status:

| Status | Meaning |
| --- | --- |
| `current` | The cited text is unchanged since the citation was written. |
| `stale` | The cited artifact effectively changed; the citing document needs a human's attention. |
| `tampered` | A marker block's embedded projection does not match the canonical content at the recorded digest. |
| `unresolved` | The cited ID, or the named anchor within it, does not exist. |

`stale` is a warning, so it reports drift without blocking a consumer pipeline unless the repository escalates it with `validation.warnings-as-errors`. `tampered` and `unresolved` are errors.

A citation carries exactly one of these statuses, in this precedence: `unresolved`, `tampered`, `stale`, `current`. A marker block whose embedded projection was hand-edited reports `tampered` even when the cited artifact has also changed since the citation was recorded; a citation is never both.

## Where the boundary is enforced

- **Consumers never write to the model.** An OpenSpec change that discovers a business rule is wrong reports it; it does not edit `docs/product/model`. The correction flows through a Product Change like any other evolution.
- **Archiving never accepts anything.** Completing and archiving the OpenSpec change is OpenSpec's decision and only OpenSpec's. The Product Definition moves when a human applies an approved Product Change and merges the result, and at no other time.
- **Applying is not accepting.** `prodshape change apply` materializes a change into the working tree and creates no commit. The pull request is where a human accepts it.

## Getting started in an OpenSpec repository

1. **Install the layer.** `prodshape init --ai claude` adds `docs/product/`, `.product/` and the generated integration files. Your `openspec/` directory is untouched. See [Installing into an existing repository](existing-repository.md).
2. **Establish the definition.** Recover it from what you have already specified: your OpenSpec specs are unusually good evidence, because they already state behaviour in product terms. Follow [Adopting in a brownfield product](brownfield.md); the result is `CHG-INITIAL`.
3. **Cite from your next OpenSpec change.** Where a spec restates product behaviour, replace the restatement with a citation, and add `prodshape citations verify openspec` to CI.
4. **Run the first change through both layers.** Create a Product Change, validate its overlay, have a human approve it, apply it, and open a pull request. Then work the OpenSpec change that implements it exactly as you always have, citing the artifacts it depends on.
