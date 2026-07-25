# Adopting in a brownfield product

This guide covers adopting Product Definition as Code for an existing system: software that
already has behaviour, users and accumulated decisions, but no canonical product model. The path
is initialize, recover a model from evidence, validate it into a baseline, then operate through
Product Changes like any other repository.

Read this first: **automated brownfield recovery is out of scope in v0.1.** What exists is the
Recover workflow — a defined, human-driven process — and the `recover-product` skill contract that
assists it. No tool will scan your codebase and emit a product model. Plan for recovery to be real
analytical work; the methodology structures it, it does not eliminate it.

> **Milestone note.** The `product-definition` CLI does not exist yet; commands below arrive with
> the `implement-product-graph-core` change and its successors. See
> [Limitations of v0.1](../limitations-v0.1.md).

## 1. Initialize

```bash
product-definition init --ai claude --sdd openspec
```

This creates `docs/product/` and `.product/` and touches nothing else — your source code, build
and existing documentation are untouched. Details of what `init` creates and the authority rules
are in [Installing into an existing repository](existing-repository.md).

## 2. Recover a candidate model

The Recover operation reconstructs product knowledge from what the system already tells you. The
workflow is described in [Recover](../methodology/recover.md); the essentials:

**Evidence sources.** Anything that records product behaviour or intent: source code and its
tests, API contracts, UI flows, database constraints, existing documentation and wikis, issue
trackers and old tickets, support conversations, and — often the highest-value source — interviews
with the people who operate and maintain the system.

**Candidates carry provenance and confidence.** Each recovered artifact is a _candidate_: a
schema-conformant draft that records where the knowledge came from (which files, tests, tickets or
conversations) and how confident the recovery is in it. A business rule read directly from a
validation test is not the same as one inferred from a variable name, and the candidate must say
so.

**A human validates before anything becomes active.** Candidates enter the model with status
`draft`. A person who understands the product reviews each candidate — confirming, correcting or
discarding it — before it is promoted to `active`. Recovered knowledge is never auto-canonical:
the tool and the skill propose, the human decides. This boundary is deliberate and permanent, not
a v0.1 gap.

The `recover-product` skill (available once AI integrations ship in
`package-ai-and-sdd-integrations`) drives this loop: it reads evidence you point it at, drafts
candidates with provenance and confidence noted, and queues them for your review. Without the
skill, the same workflow works by hand using the templates in `templates/`.

## 3. Establish the baseline

Recovery is the brownfield form of the initial-baseline bootstrap exception: validated candidates
are authored directly into `docs/product/model` as the first accepted baseline, without a Product
Change. Validate it:

```bash
product-definition validate
```

Fix errors; review warnings. Warnings like `PRODUCT105` (business rule with no consumers) or
`PRODUCT103` (requirement unreachable from any actor) are common in recovered models and usually
point at knowledge you have not finished connecting — see
[Validation](../specification/validation.md).

## 4. Set honest expectations

- **Recovery is incremental.** You do not need the whole system modelled before the baseline is
  useful. Start with the areas you are about to change; a partial but validated model beats a
  complete but unreviewed one.
- **The model records what the product does, not what the code looks like.** Artifacts must not
  contain implementation design (see [Artifacts](../specification/artifacts.md)). If recovery is
  producing class inventories, it has drifted.
- **Some knowledge is simply gone.** Where nobody can confirm a rule's rationale, record what is
  observable and note the uncertainty in the artifact body rather than inventing a justification.

## 5. Operate through Product Changes

Once the baseline is accepted, the bootstrap exception is closed. Every subsequent semantic
evolution — including corrections to recovered artifacts — goes through a Product Change:
overlay validation, approval, delivery slices, handoffs to your SDD framework, and explicit
promotion. From this point the workflow is identical to the greenfield path; follow
[Adopting in a greenfield product](greenfield.md#5-run-your-first-product-change) and
[Change](../methodology/change.md).
