# Change

Change is the central operation of v0.1. After the first Product Definition, every semantic evolution of the product, however small, travels this path. A requested modification never silently edits the model; it becomes a **Product Change**: an explicit, validated, human-approved delta. The normative contract is [Product Changes](https://github.com/product-definition-as-code/spec/blob/main/spec/product-changes.md).

A Product Change is not a pull request, a delivery container or an implementation state. The pull request is where a human reviews and accepts the change; it is not the change itself.

## The path, step by step

### 0. Explore the idea (optional)

When the request is fuzzy, an idea that has not reached "what should be different and why", `ps:explore` is the recommended first step. It reads the full product graph upfront, reasons from a high-altitude structural view to surface gaps and affected areas, and through conversation sharpens the idea into a well-formed change request. It ends by offering to hand off to `ps:change`. Engineers with a clear request may skip this step and begin at step 1 directly. If `ps:change` detects that the intent is unclear, it will warn the user and recommend `ps:explore` before proceeding.

### 1. A change is requested

An idea, a stakeholder request, a defect that turns out to be a definition gap, findings reported back from an SDD workflow. At this point it is a request, nothing more.

### 2. Inspect the current graph

Before proposing anything, look at what exists. The tooling answers deterministically: what does this artifact relate to, what is reachable from it, what would a removal leave dangling. This is [structural impact](product-graph.md), the certain, mechanical starting point.

### 3. Identify affected artifacts

On top of the structural result, semantic judgment: which connected artifacts are meaningfully affected, which merely adjacent. AI can assist here; the conclusion is a human's.

### 4. Describe the delta

The Product Change (`CHG-…`) declares its operations, `add`, `modify` and `remove`, and carries a **complete proposed future-state artifact** for every addition and modification. Not a diff, not an instruction like "update the rule": the full artifact as it should exist afterwards, under the change's `proposed/` directory, alongside the problem statement, intended outcome, rationale and scope in `change.md`. It records the baseline commit it was written against in `base-revision`.

### 5. Surface unresolved product decisions

Questions the change raises but does not answer go in its `## Open Questions` section, visibly. AI drafting a change must preserve them, never resolve them by inventing an answer. Approving a change with open questions still unresolved is possible, and the tooling warns about it (`PRODUCT108`).

### 6. Validate the overlay

The tooling compiles the **overlay**, the baseline with the change's operations applied virtually and no baseline file touched, and runs full structural validation on it: schema and ID rules, relationship integrity, dangling references left by removals, overlaps with other live changes. See [Validation](../specification/validation.md).

Elaboration happens here. A change stays `draft` or `proposed` for as long as it takes; several changes may be live at once, and while a change is live the baseline artifacts it touches remain authoritative and unchanged.

**Human approval point 1, the Product Change.** A person moves the change to `approved`. This is a decision about what the product should become, and no tool or AI makes it. It says nothing about whether anything has been built.

### 7. Apply, explicitly

**Human approval point 2, running apply.** Apply is the operation that materializes an approved change, and it is never implicit: not triggered by an AI hook, not by SDD archival, not by any automation. The tooling enforces the preconditions: status `approved`, the overlay revalidated, and the baseline unchanged since `base-revision` for every artifact the change touches, otherwise the change must be explicitly rebased first. A `--dry-run` reports every action without performing any.

Apply writes the operations into `docs/product/model`, computes the **product diff** between the baseline and the result, moves the change to `changes/completed/` with status `applied`, and creates no Git commits. Applied means materialized and archived. It does not mean accepted.

### 8. Accept, by merging

**Human approval point 3, acceptance.** The applied result is offered as a pull request. CI runs `prodshape validate`, a person reviews the resulting definition, and the merge is what makes it the accepted Product Definition. A tool that treated a successful apply as acceptance would be deciding product intent, which is the one thing it must never do.

The loop closes: the definition now says something new, citations into the artifacts that effectively changed report `stale`, and the next change starts from the new baseline.

## Intent, effective change and impact

Three things, never substitutable for one another:

| Concept | Authoritative for |
| --- | --- |
| The change's `operations` | What the change **intended** |
| The product diff | What **effectively** changed, with the resulting digests |
| Impact | Which citations are affected, derived from the diff and the citation index |

They can legitimately disagree. A declared modification whose proposed text turns out identical to the baseline changed nothing, and reporting it as changed would send every citation of that artifact stale for no reason. So the diff is computed from the applied result, never read off the operations.

## Change history

`docs/product/changes/` is the semantic history; Git history is the file history.

A `draft` or `proposed` change may be edited, rewritten or discarded freely: it is a workspace, not a record. If the baseline moves under a live change, the change is rebased rather than patched, which means regenerating the proposed artifacts, updating `base-revision` and revalidating the overlay.

An applied and accepted change is immutable. Any later correction is expressed as a new Product Change. A decision that is superseded is superseded by a change, never by an edit.

## Where the hard gates sit

| Gate | Who decides | What tooling validates there |
| --- | --- | --- |
| Change approval (step 6) | Human | Overlay compiles and validates; overlaps with other live changes; open-question warning |
| Apply (step 7) | Human | Status precondition, overlay revalidation, baseline-revision compatibility, resulting model validity |
| Acceptance (step 8) | Human | Structural validation of the proposal as a CI gate |

Everything between the gates, drafting, impact interpretation and context assembly, is where AI assists. Everything at the gates is a person's call, checked by a deterministic tool.
