# Bring an existing product under ProductShape

Use this guide when your product already has users, behaviour and a history, but no agreed product model. You will install ProductShape, gather evidence for a first model, review that model with people who know the product, and accept it as a baseline. Later changes follow the regular Product Change process.

One expectation matters up front: **ProductShape will not scan your code and invent a product model.** You and, if useful, an AI assistant inspect the evidence and propose what the product means. A person reviews every candidate before it becomes part of the accepted model. ProductShape keeps the work organized: it tracks which evidence you examined, what it supports, what remains uncertain, and what still needs review. Recovery is analysis work; the tools help you keep it bounded and resumable.

> These commands target the supported published baseline, [`@prodshape/cli@0.22.0`](https://www.npmjs.com/package/@prodshape/cli/v/0.22.0). They use `prodshape`; the `product-definition` alias is equivalent through v0.x. See [Limitations](../limitations.md).

## 1. Preview and install ProductShape

A brownfield repository usually already has a populated `docs/`, so check what `init` would do before it does it:

```bash
prodshape init --ai claude --dry-run
```

The dry run writes nothing and reports every path it would create, preserve, regenerate or overwrite, plus any conflict — a file that already exists and is not managed by the installation lock. Nothing is overwritten without `--force`, and existing files are reported as preserved.

```bash
prodshape init --ai claude
```

This creates `docs/product/` and `.product/` and touches nothing else — your source code, build and existing documentation are untouched. Details of what `init` creates and the authority rules are in [Installing into an existing repository](existing-repository.md).

A brownfield repository that already runs OpenSpec can wire the integration in the same command with `prodshape init --sdd openspec`, or afterwards with `prodshape integration add openspec`; see [Adopting in an existing OpenSpec repository](existing-openspec-repository.md).

`init` scaffolds one directory per artifact kind under `docs/product/model/`. The layout is a recommendation, not a rule — discovery walks the model directory recursively and keys on the frontmatter `type` — but taking it means not having to invent a taxonomy. Use `--flat` to opt out.

## 2. Recover what the evidence supports

The Recover operation reconstructs product knowledge from what the system already tells you. The workflow is described in [Recover](../methodology/recover.md); the essentials:

**Start with a recovery brief.** Before reviewing files, agree on the product area, evidence to include or exclude, languages, known terms and actors, and how to handle conflicting sources. Rank the evidence so the most direct product documents are reviewed before source code, set a manageable batch size, and note which findings need your personal confirmation. You can also set `git.branch` to run the recovery on a dedicated branch; ProductShape then records a checkpoint commit at each step. Start the session with:

```bash
prodshape recover start --brief brief.yaml   # inventory the declared evidence, hash it, checkpoint
prodshape recover next                       # the next bounded batch to read
prodshape recover mark --source E-0001 --as represented --artifacts "UC-CHECKOUT,BR-LIMIT"   # record classifications (quote the list)
prodshape recover mark --glob 'src/**' --as no-product-intent --reason "..." --complete      # one identical finding for a whole selection
prodshape recover unmark --source E-0001 --last   # retract a wrong finding; session files are never edited by hand
prodshape recover status                     # coverage, open questions and completion criteria
prodshape recover check                      # detect changed evidence, revalidate the overlay
prodshape recover report                     # the final report, once complete
```

The session lives under `.product/generated/recovery/<session-id>/` and survives interruption: a new conversation (or a different assistant) resumes from `recover status` with the same boundaries, because the brief travels inside the session state. Repository-wide recovery means that declared population plus what you explicitly authorise, never arbitrary filesystem or internet access.

**What counts as evidence?** Use anything that records product behaviour or intent: existing documentation, API contracts, user flows, database constraints, source code and tests, tickets, support conversations, and interviews with the people who run or maintain the product. You can also add files, statements, or online resources that you explicitly authorize with `prodshape recover evidence add`. Where content is available, ProductShape records a hash so later changes can be detected.

**Record the source and confidence for each candidate.** A recovered artifact is a draft, not a fact. Its provenance says which files, tests, tickets, or conversations support it and how strong that evidence is. A rule stated in a test is better supported than one inferred from a variable name; record that difference in frontmatter:

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

**Review every candidate before accepting it.** Candidates start with status `draft`. Someone who understands the product confirms, corrects, or discards each one before it becomes `active`. ProductShape and the AI assistant can propose; only a person decides what the model says.

The `recover-product` skill drives this loop: it reads evidence you point it at, drafts candidates with provenance and confidence recorded, and queues them for your review. It is installed by `init --ai`. Without it, the same workflow works by hand using the templates in `.product/templates/`.

## 3. Accept the first baseline

Recovery is an input activity to `CHG-INITIAL`, not a separate lifecycle: the candidates become the proposed future state of the reserved initialisation change, which is validated, receives human product approval, is applied on a working branch and is accepted by merge exactly as in the greenfield path. Provenance and confidence live on the proposed artifacts, never on the change itself. While the session runs, `prodshape recover check` revalidates the whole overlay; after apply, validate the proposed resulting model before opening the pull request:

```bash
prodshape validate
```

Fix errors; review warnings. Warnings like `PRODUCT105` (business rule with no consumers) or `PRODUCT103` (requirement unreachable from any actor) are common in recovered models and usually point at knowledge you have not finished connecting — see [Validation](../specification/validation.md).

`PRODUCT111` is the recovery-specific one: a `draft` candidate whose `provenance.confidence` is `low`. It is not a defect to fix but a queue to work through — every artifact resting on weak evidence, listed by the tool rather than tracked by hand. It stops firing when the candidate is accepted into the baseline or its evidence improves. Once the baseline is accepted, the `refine-product` skill (`/product:refine`) works exactly this queue: it interviews you through the weak spots one question at a time and turns your answers into an ordinary Product Change.

In an SDD workspace (OpenSpec, Spec Kit), one more step follows apply: your existing specification documents were read as evidence but never written to, so they are unclassified until they declare scope and cite the new baseline, and `prodshape citations verify --provider <name>` fails on them by design until then. The `bind-consumers` skill (`/product:bind`) drives that backfill; ship it in the same pull request as the applied `CHG-INITIAL` when you can. See [Adopting in an existing OpenSpec repository](existing-openspec-repository.md).

If validation reports `PRODUCT101` (file name not aligned with its ID), fix every occurrence at once:

```bash
prodshape fix --filenames
```

This works on Windows and macOS, where a casing-only rename is otherwise a silent no-op.

## 4. Keep uncertainty visible

- **Recovery is incremental.** You do not need the whole system modelled before the baseline is useful. Start with the areas you are about to change; a partial but validated model beats a complete but unreviewed one.
- **The model records what the product does, not what the code looks like.** Artifacts must not contain implementation design (see [Artifacts](https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md)). If recovery is producing class inventories, it has drifted.
- **Some knowledge is simply gone.** Where nobody can confirm a rule's rationale, record what is observable and note the uncertainty in the artifact body rather than inventing a justification.

## 5. Make later changes through Product Changes

Once the applied `CHG-INITIAL` result is accepted by merge, every later product change, including corrections to recovered artifacts, follows the same path: validate the proposed change, get human approval, apply it explicitly, and accept the resulting baseline through merge. From then on, follow [Make your first product change](greenfield.md#5-make-your-first-product-change) and the [Change walkthrough](../methodology/change.md).
