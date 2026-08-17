# Adopting in an existing OpenSpec repository

This guide is for repositories that already run OpenSpec. Product Definition as Code adds a product-definition layer above your existing workflow; OpenSpec keeps owning everything it owns today. This repository itself works exactly this way.

Want to start typing? Jump to [the walkthrough](#the-walkthrough-first-rule-first-citation-first-drift): first rule, first citation and first detected drift.

> The CLI ships as [`@prodshape/cli`](https://www.npmjs.com/package/@prodshape/cli) and includes the OpenSpec integration. The commands below use `prodshape`; the `product-definition` alias is equivalent through v0.x. The contracts are fixed in the [specification](https://github.com/product-definition-as-code/spec). See [Limitations](../limitations.md).

## What Product Definition adds

OpenSpec answers "how do we specify, design and verify this implementation increment?". Product Definition answers the question upstream of that: "what is the product, and what exactly are we changing about it?". It adds:

- A canonical Product Definition under `docs/product/model`: actors, journeys, use cases, rules, terms, contexts, requirements and constraints, compiled into a validated product graph.
- Product Changes: explicit, validated semantic deltas against that definition, each carrying the reason it exists.
- Citations: machine-verifiable references from your OpenSpec documents to canonical product text, so drift between the two is detected rather than discovered.

The flow becomes: accepted Product Definition → proposed Product Change → overlay validation → product approval → apply on a working branch → accept the resulting baseline by merge → **native OpenSpec workflow, citing the definition** → implementation → verification.

Note what is not in that list. Product Definition does not decompose your work, does not hand you a package, and does not gate on whether anything was built. Whether accepted product intent has been implemented is a fact about delivery, and delivery is yours.

Product-definition work and implementation work have independent cadence. They may share a pull request, or OpenSpec implementation work may follow later, but the Product Change, the applied model and the implementation remain different things.

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
- **Archiving never accepts anything.** Completing and archiving the OpenSpec change is OpenSpec's decision and only OpenSpec's. It cannot approve or apply a Product Change, accept a Product Definition or attest delivery.
- **Applying is not accepting.** `prodshape change apply` materializes a change into the working tree and creates no commit. A pull-request merge accepts the resulting baseline.

## The walkthrough: first rule, first citation, first drift

You need: Node.js 22 or later, npm, and your OpenSpec repository, meaning a git repository with at least one commit (the change record pins a `base-revision`) and an `openspec/` directory. Every step is copy-paste, and the output under each command comes from a real run. The walkthrough models a refund window; where it says "the checkout spec", read "whichever of your specs restates the rule you pick", and expect your own paths in the output.

### 1. Install the layer and wire the integration (2 minutes)

```bash
npm install -g @prodshape/cli
prodshape init --sdd openspec
```

`init` creates `docs/product/` and `.product/`, detects your `openspec/` workspace, and wires the OpenSpec integration in the same run: PDaC citation rules are merged additively into `openspec/config.yaml` (reversible with `prodshape integration remove openspec`) and the integration is recorded under `.product/integrations/`. Nothing else in `openspec/` is touched, and your own configuration entries survive the merge. In an interactive terminal a bare `prodshape init` detects the workspace and asks before wiring; in scripts and CI it never prompts and prints the exact command instead. Add `--ai claude`, `--ai copilot` or `--ai claude,copilot` if you also want the generated skills and agent files for Claude Code, GitHub Copilot or both.

### 2. Author CHG-INITIAL, the first Product Change (5 minutes)

The definition changes through exactly one mechanism, an explicit Product Change, and initialisation is no exception: the first artifact enters through the reserved change `CHG-INITIAL`. Pick one business rule your OpenSpec specs restate.

Record the commit your change is based on:

```bash
git rev-parse --short HEAD
```

Create `docs/product/changes/active/chg-initial/change.md`, putting that commit in `base-revision`:

```markdown
---
id: CHG-INITIAL
type: product-change
title: Establish the first Product Definition
status: proposed
base-revision: 'e7af6cd'
operations:
  add:
    - BR-REFUND-001
  modify: []
  remove: []
---

## Problem

The product has no definition: the refund window lives only inside an OpenSpec spec, restated where it is used instead of defined where it is owned.

## Intended Product Outcome

An accepted Product Definition carrying the one business rule the checkout specs depend on, so they can cite it instead of restating it.

## Rationale

Initialisation uses the same mechanism as every later change, so the product has one way to evolve rather than two.

## Affected Product Areas

The whole model; it did not exist before this change.

## Open Questions

None.

## Product Acceptance

The applied model validates without errors and the checkout spec's citation of BR-REFUND-001 reports current.

## Out of Scope

Modeling the rest of the product; the [brownfield guide](brownfield.md) covers that.
```

Create the proposed artifact, `docs/product/changes/active/chg-initial/proposed/business-rules/br-refund-001.md`:

```markdown
---
id: BR-REFUND-001
type: business-rule
title: Refund window
status: active
---

## Rule

Refunds are accepted within 30 days of delivery.

## Rationale

Customers need a predictable window; finance needs a bounded liability.

## Examples

A delivery on March 1 may be refunded through March 31.

## Exceptions

None.
```

Validate the change as an overlay on the (empty) baseline:

```bash
prodshape change validate
```

```text
warning PRODUCT105 docs/product/changes/active/chg-initial/proposed/business-rules/br-refund-001.md [BR-REFUND-001]: Business rule 'BR-REFUND-001' has no consumers
0 error(s), 1 warning(s) across 0 artifact(s) and 1 live change(s)
```

The warning is the graph working: a business rule no use case consumes is suspicious, and in a one-artifact model that is exactly the situation. Nothing blocks.

### 3. Approve and apply (2 minutes)

Approval is a human decision the tool never makes. Edit `change.md` and set `status: approved`. Then:

```bash
prodshape change apply CHG-INITIAL
```

```text
Applied CHG-INITIAL:
  Add BR-REFUND-001 at docs/product/model/business-rules/br-refund-001.md
  Set CHG-INITIAL status to applied
  Move change to docs/product/changes/completed/chg-initial
Product diff: 1 added, 0 modified, 0 removed
  BR-REFUND-001	added	sha256:b5c5806732cb3e3f32a6b7da97fd3e712a1bb733b4bb50e2840874ae64713228
Applied and archived. Nothing was committed: open a pull request so a human can accept it.
```

The rule is now materialized in the model on this working branch and the change is archived under `completed/`. It is not yet in the accepted baseline. Commit the result, open a pull request and continue after a human merges it and you update your local canonical branch. The following steps assume `BR-REFUND-001` is accepted.

```bash
prodshape validate
```

```text
warning PRODUCT105 docs/product/model/business-rules/br-refund-001.md [BR-REFUND-001]: Business rule 'BR-REFUND-001' has no consumers
0 error(s), 1 warning(s) across 1 artifact(s)
```

### 4. Cite it from your OpenSpec spec (3 minutes)

Print the rule's citation record; the digest is computed for you:

```bash
prodshape cite --id BR-REFUND-001 --file docs/product/model/business-rules/br-refund-001.md
```

```text
{pdac:cite id="BR-REFUND-001" digest="sha256:b5c5806732cb3e3f32a6b7da97fd3e712a1bb733b4bb50e2840874ae64713228"}
```

In the spec that restates the rule, let the citation replace the restated number, and paste the printed line after the requirement text. After, never between the heading and the text: OpenSpec reads the first paragraph under a requirement heading as the requirement itself.

```diff
 ### Requirement: Refund handling

-The system SHALL accept refund requests within 30 days of delivery and reject later requests with a clear message.
+The system SHALL accept refund requests within the refund window defined by BR-REFUND-001 and reject later requests with a clear message.
+
+{pdac:cite id="BR-REFUND-001" digest="sha256:b5c5806732cb3e3f32a6b7da97fd3e712a1bb733b4bb50e2840874ae64713228"}
```

Verify; `citations verify` scans `openspec/` by default:

```bash
prodshape citations verify
```

```text
current	BR-REFUND-001	openspec/specs/checkout/spec.md:13
1 citation(s): 1 current, 0 stale, 0 tampered, 0 unresolved
```

### 5. See it catch drift through another Product Change

Create `CHG-REFUND-WINDOW-001` against the accepted commit. Its `operations.modify` contains `BR-REFUND-001`, and its `proposed/business-rules/br-refund-001.md` is the complete future-state rule with 30 days changed to 14. Keep the accepted model untouched while drafting. The installed Product Change template contains every required body section.

Validate the overlay, obtain human product approval, then dry-run and apply it on a working branch:

```bash
prodshape change validate CHG-REFUND-WINDOW-001
prodshape change apply CHG-REFUND-WINDOW-001 --dry-run
prodshape change apply CHG-REFUND-WINDOW-001
```

Apply materializes the proposed 14-day rule on the branch; it does not accept it. Now verify the existing citation:

```bash
prodshape citations verify
```

```text
stale	BR-REFUND-001	openspec/specs/checkout/spec.md:13
warning PRODUCT061 openspec/specs/checkout/spec.md [BR-REFUND-001]: Citation of 'BR-REFUND-001' is stale: canonical content changed since the citation was recorded
1 citation(s): 0 current, 1 stale, 0 tampered, 0 unresolved
```

Nobody had to remember that the checkout spec depends on that rule, and the drift is visible before the proposed definition is merged.

### 6. Gate it in CI (1 minute)

`stale` is a warning, so it reports without blocking until the repository escalates it. In `.product/config.yaml`, find the `validation:` section `init` created and set `warnings-as-errors: true`. Edit the existing key; appending a second `validation:` section is invalid YAML. The same command now exits `1`:

```bash
prodshape citations verify
```

```text
stale	BR-REFUND-001	openspec/specs/checkout/spec.md:13
error PRODUCT061 openspec/specs/checkout/spec.md [BR-REFUND-001]: Citation of 'BR-REFUND-001' is stale: canonical content changed since the citation was recorded
1 citation(s): 0 current, 1 stale, 0 tampered, 0 unresolved
```

Add `prodshape citations verify` to CI and drift blocks the merge instead of waiting to be noticed.

### Where to go next

- Resolve the proposed drift on its branch: refresh the citation if the 14-day definition should proceed, then review and merge the applied result; otherwise close the branch without merging. Never rewrite the archived Product Change.
- Model the rest of the product incrementally through [the brownfield guide](brownfield.md): your OpenSpec specs are unusually good evidence, because they already state behaviour in product terms. A partial but validated model beats a complete but unreviewed one.
- Wire `prodshape citations verify` into the pipeline that runs `openspec validate`, and keep the two verdicts separate: one is about your specs, the other about their grounding.
