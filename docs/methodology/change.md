# Change

Change is the central operation of v0.1 and the only one that works end to end. After the initial
baseline, every semantic evolution of the product — however small — travels this path. A requested
modification never silently edits the model; it becomes a **Product Change**, an explicit,
validated, human-approved delta. The normative contract is
[Product Changes](../specification/product-changes.md).

## The path, step by step

### 0. Explore the idea (optional)

When the request is fuzzy — an idea that hasn't reached "what should be different and why" —
`ps:explore` is the recommended first step. It reads the full product graph upfront, reasons
from a high-altitude structural view to surface gaps and affected areas, and through conversation
sharpens the idea into a well-formed change request. It ends by offering to hand off to
`ps:change`. Engineers with a clear request may skip this step and begin at step 1 directly.
If `ps:change` detects that the intent is unclear, it will warn the user and recommend
`ps:explore` before proceeding.

### 1. A change is requested

An idea, a stakeholder request, a defect that turns out to be a definition gap, findings reported
back from an SDD workflow. At this point it is a request, nothing more.

### 2. Inspect the current graph

Before proposing anything, look at what exists. The tooling answers deterministically: what does
this artifact relate to, what is reachable from it, what would a removal leave dangling. This is
[structural impact](product-graph.md) — the certain, mechanical starting point.

### 3. Identify affected artifacts

On top of the structural result, semantic judgment: which connected artifacts are meaningfully
affected, which merely adjacent. AI can assist here; the conclusion is a human's.

### 4. Describe the delta

The Product Change (`CHG-…`) declares its operations — `add`, `modify`, `remove` — and carries a
**complete proposed future-state artifact** for every addition and modification. Not a diff, not
an instruction like "update the rule": the full artifact as it should exist afterwards, under the
change's `proposed/` directory, alongside the problem statement, intended outcome, rationale and
scope in `change.md`.

### 5. Surface unresolved product decisions

Questions the change raises but does not answer go in its `## Open Questions` section — visibly.
AI drafting a change must preserve them, never resolve them by inventing an answer. Approving a
change with open questions still unresolved is possible, but the tooling warns about it.

### 6. Validate the overlay

The tooling compiles the **overlay** — the baseline with the change's operations applied
virtually, touching no baseline file — and runs full structural validation on it: schema and ID
rules, relationship integrity, dangling references left by removals, overlaps with other active
changes. See [Validation](../specification/validation.md).

**Human approval point 1 — the Product Change.** A person moves the change to `approved`. This is
a decision about what the product should become; no tool or AI makes it. The baseline is still
untouched.

### 7. Slice the change

The approved change is divided into delivery slices — coherent, implementable, verifiable
increments with explicit requirement coverage. AI may propose the decomposition; the tooling
validates references, coverage declarations and dependency cycles. See
[Delivery slicing](delivery-slicing.md).

**Human approval point 2 — each slice.** Slice status `approved` is a human decision. Tooling
cannot judge whether a slice is a good increment; a person does.

### 8. Project to the backlog

Each approved slice is represented by a backlog item in whatever tracker the team uses. The item
references product artifacts by stable ID and never copies the definition. In v0.1 this is a
recorded reference (for example `github:owner/repo#123`), with no API automation. See
[Backlog projection](backlog-projection.md).

### 9. Generate the handoff

For an approved slice of a validated overlay, the tooling generates a **Product Handoff**
(`HOF-…`): the exact product subgraph the increment needs, selected by a deterministic closure
rule, with content digests and source revision recorded. Generation refuses non-approved slices.
See [SDD handoff](sdd-handoff.md).

### 10. SDD implements

The handoff feeds the SDD framework's native workflow — with OpenSpec: proposal, specs, design,
tasks, implementation. SDD owns that workflow entirely. It may report questions and
contradictions back; it must not rewrite product knowledge, and archiving an SDD change never
promotes anything.

### 11. Verify

The slice's `verification` declarations state, in product terms, how the increment is confirmed.
Traceability evidence for the implemented requirements is collected through the adapter's
coverage mapping; promotion will demand it.

### 12. Promote — explicitly

**Human approval point 3 — promotion.** Promotion is the only operation that applies a Product
Change to the baseline, and it is never implicit — not triggered by an AI hook, not by SDD
archival, not by any automation. The tooling enforces the preconditions: change status
`implemented`, every approved slice `completed` or explicitly `cancelled`, traceability evidence
present, the overlay revalidated, and the baseline unchanged since `base-revision` for every
artifact the change touches (otherwise the change must be explicitly rebased first). A `--dry-run`
reports every action without performing any. Promotion applies the operations to
`docs/product/model`, moves the change to `changes/completed/`, and creates no Git commits —
committing is the user's decision.

The loop closes: the definition now includes what was built, and the next change starts from it.

## Where the hard gates sit

| Gate                     | Who decides | What tooling validates there                                                                                         |
| ------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Change approval (step 6) | Human       | Overlay compiles and validates; overlaps with other active changes; open-question warning                            |
| Slice approval (step 7)  | Human       | References, coverage declarations, dependency cycles                                                                 |
| Promotion (step 12)      | Human       | Status preconditions, slice completion, traceability evidence, overlay revalidation, baseline-revision compatibility |

Everything between the gates — drafting, impact interpretation, slicing proposals, context
assembly — is where AI assists. Everything at the gates is a person's call, checked by a
deterministic tool.
