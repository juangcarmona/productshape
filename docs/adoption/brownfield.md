# Adopting in a brownfield product

This guide covers adopting Product Definition as Code for an existing system: software that already has behaviour, users and accumulated decisions, but no canonical product model. The path is initialize, recover a model from evidence, validate it into a baseline, then operate through Product Changes like any other repository.

Read this first: **automated brownfield recovery is out of scope in v0.1.** What exists is the Recover workflow — a defined, human-driven process — and the `recover-product` skill contract that assists it. No tool will scan your codebase and emit a product model. Plan for recovery to be real analytical work; the methodology structures it, it does not eliminate it.

> The CLI ships as [`@prodshape/cli`](https://www.npmjs.com/package/@prodshape/cli). The commands below use `prodshape`; the `product-definition` alias is equivalent through v0.x. See [Limitations](../limitations.md).

## 1. Initialize

A brownfield repository usually already has a populated `docs/`, so check what `init` would do before it does it:

```bash
prodshape init --ai claude --dry-run
```

The dry run writes nothing and reports every path it would create, preserve, regenerate or overwrite, plus any conflict — a file that already exists and is not managed by the installation lock. Nothing is overwritten without `--force`, and existing files are reported as preserved.

```bash
prodshape init --ai claude
```

This creates `docs/product/` and `.product/` and touches nothing else — your source code, build and existing documentation are untouched. Details of what `init` creates and the authority rules are in [Installing into an existing repository](existing-repository.md).

`init` scaffolds one directory per artifact kind under `docs/product/model/`. The layout is a recommendation, not a rule — discovery walks the model directory recursively and keys on the frontmatter `type` — but taking it means not having to invent a taxonomy. Use `--flat` to opt out.

## 2. Recover a candidate model

The Recover operation reconstructs product knowledge from what the system already tells you. The workflow is described in [Recover](../methodology/recover.md); the essentials:

**Evidence sources.** Anything that records product behaviour or intent: source code and its tests, API contracts, UI flows, database constraints, existing documentation and wikis, issue trackers and old tickets, support conversations, and — often the highest-value source — interviews with the people who operate and maintain the system.

**Candidates carry provenance and confidence.** Each recovered artifact is a _candidate_: a schema-conformant draft that records where the knowledge came from (which files, tests, tickets or conversations) and how confident the recovery is in it. A business rule read directly from a validation test is not the same as one inferred from a variable name, and the candidate must say so — in frontmatter, so it can be queried:

```yaml
provenance:
  source: src/orders/validation.ts (limit check), tests/orders/limits.spec.ts
  confidence: high
  recovered-from: observation
```

`source` and `confidence` are required whenever `provenance` is present. The full contract, and the allowed frontmatter for every artifact kind, is in the [Frontmatter reference](../specification/frontmatter-reference.md#provenance) — read it before authoring, or query it per kind without leaving the terminal:

```bash
prodshape schema business-rule
```

Frontmatter is a closed contract: an unrecognised property is a `PRODUCT002` error, so inventing a field to hold something the schema does not model will fail validation. Put such things in the body.

**A human validates before anything becomes active.** Candidates enter the model with status `draft`. A person who understands the product reviews each candidate — confirming, correcting or discarding it — before it is promoted to `active`. Recovered knowledge is never auto-canonical: the tool and the skill propose, the human decides. This boundary is deliberate and permanent, not a v0.1 gap.

The `recover-product` skill drives this loop: it reads evidence you point it at, drafts candidates with provenance and confidence recorded, and queues them for your review. It is installed by `init --ai`. Without it, the same workflow works by hand using the templates in `.product/templates/`.

## 3. Establish the baseline

Recovery is an input activity to `CHG-INITIAL`, not a separate lifecycle: the validated candidates become the proposed future state of the reserved initialisation change, which is applied and accepted exactly as in the greenfield path. Provenance and confidence live on the proposed artifacts, never on the change itself. Validate it:

```bash
prodshape validate
```

Fix errors; review warnings. Warnings like `PRODUCT105` (business rule with no consumers) or `PRODUCT103` (requirement unreachable from any actor) are common in recovered models and usually point at knowledge you have not finished connecting — see [Validation](../specification/validation.md).

`PRODUCT111` is the recovery-specific one: a `draft` candidate whose `provenance.confidence` is `low`. It is not a defect to fix but a queue to work through — every artifact resting on weak evidence, listed by the tool rather than tracked by hand. It stops firing when the candidate is accepted into the baseline or its evidence improves.

If validation reports `PRODUCT101` (file name not aligned with its ID), fix every occurrence at once:

```bash
prodshape fix --filenames
```

This works on Windows and macOS, where a casing-only rename is otherwise a silent no-op.

## 4. Set honest expectations

- **Recovery is incremental.** You do not need the whole system modelled before the baseline is useful. Start with the areas you are about to change; a partial but validated model beats a complete but unreviewed one.
- **The model records what the product does, not what the code looks like.** Artifacts must not contain implementation design (see [Artifacts](https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md)). If recovery is producing class inventories, it has drifted.
- **Some knowledge is simply gone.** Where nobody can confirm a rule's rationale, record what is observable and note the uncertainty in the artifact body rather than inventing a justification.

## 5. Operate through Product Changes

Once `CHG-INITIAL` is accepted, every subsequent semantic evolution, including corrections to recovered artifacts, goes through a Product Change: overlay validation, human approval, explicit apply, and acceptance by merge. From this point the workflow is identical to the greenfield path; follow [Adopting in a greenfield product](greenfield.md#5-run-your-first-product-change) and [Change](../methodology/change.md).
