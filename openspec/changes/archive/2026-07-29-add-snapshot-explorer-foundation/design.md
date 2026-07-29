# Design: add-snapshot-explorer-foundation

## Context

`buildSnapshotHtml` in `@prodshape/core` currently emits every artifact as live markup (73 articles,
~299 KB of the 459 KB file), a circular SVG of all 73 nodes and 196 edges, and one embedded script
doing substring search and node highlighting. Measured on synthetic models, live markup stays ~68% of
the file and grows 10.8× across a tenfold model, while the inert search index — already 152 KB —
never enters the DOM. The two concerns are therefore already separable in practice: the file can
carry everything while the document renders one thing.

This slice is the dependency root of `CHG-SNAPSHOT-002`. It establishes the orientation view, the
master–detail reading surface, the single selected-artifact state with fragment addressing, the
presentation system and the measurement harness. Three later slices build on all five.

## Goals / Non-Goals

**Goals**

- Opening document carries orientation only: no artifact body, no artifact-level graph.
- Exactly one active artifact detail, rendered on demand from embedded data.
- One selected artifact, one navigation mechanism, fragment-addressed, legacy fragments permanent.
- The presentation system and the accessibility baseline that later slices inherit.
- A reusable measurement harness, a named reference environment, and a measured selection budget.
- Preserve: exactly one self-contained file, `file://` operation, static hosting, offline, byte-identical
  regeneration, read-only, generic across products.

**Non-Goals**

- The specified relationship groups (`SLI-SNAPSHOT-004`), ranked search (`SLI-SNAPSHOT-005`), the
  layered model map and focused neighbourhood (`SLI-SNAPSHOT-006`).
- Removing the legacy whole-model visualization — see D5.
- Dark mode, theme switching, any appearance preference.
- Choosing a UI framework or graph library. This slice adds no dependency; see D2.

## Decisions

### D1 — Artifact content moves from live markup to inert embedded data

Bodies, metadata and relationship structure are serialized once into an inert
`<script type="application/json">` region alongside the existing search index, and rendered into the
detail pane on demand. The opening markup carries the orientation view and the artifact list's
identifying fields only.

This is what makes the opening document independent of model size, and it is the whole point of the
change: packaging keeps everything, presentation shows one thing. Determinism is unaffected —
serialization follows the graph's existing sort, and the JSON is emitted with `<` escaped exactly as
the current index already is.

**Consequence for escaping.** Escaping now has two paths, not one: markup emitted at generation time,
and data rendered into the DOM at open time. The second path does not inherit the first's protection.
The spec states both explicitly, and both are unit-tested with the same hostile fixture.

### D2 — No dependency is added by this slice

The orientation view, the artifact list, master–detail rendering and a fragment router are small
enough to implement directly. Adding a component framework or a graph library here would commit
`CHG-SNAPSHOT-002` to it before the slices that might justify it (`SLI-SNAPSHOT-006`'s projections)
have been designed, and the Product Change is explicit that a dependency requires a concrete
capability and measured justification. Deferring the decision costs nothing now and keeps the
generated size measurable against the existing baseline.

This is a decision for this slice only, not a verdict on the later ones.

**Amended during implementation.** D2 governs what ships inside the generated file. One dev-only
dependency was added: `jsdom` (with `@types/jsdom`), so the page's own embedded script can be driven
in a real document and the runtime scenarios the spec states — one active detail, legacy-fragment
normalization without an extra history entry, escaping after navigating away and back, nothing
persisted — are verified automatically rather than asserted from markup. It has no effect on the
generated output, its self-containment or its size, and the library itself ships no DOM code. The
`packages/core` tsconfig gains `DOM` in `lib` for the same reason, noted inline there.

### D3 — One fragment router owns all state transitions

A single router reads and writes `location.hash` and is the only thing that changes the active view or
the selected artifact. Every surface — list, and later search results, relationship links and
projections — calls the router rather than mutating state directly.

Route shape: `#/` for orientation, `#/artifacts` for the list, `#/artifacts/<ID>` for a selected
artifact. The graph mode joins the route in `SLI-SNAPSHOT-006`; the router's state object carries a
slot for it now so that slice adds a value rather than a mechanism.

The alternative — native anchors for artifacts plus script for everything else — is what the current
snapshot does, and it is why Back behaves unpredictably there: two mechanisms, one address. Requiring
a single owner is what makes Back and Forward correct rather than incidental.

### D4 — Legacy fragments resolve, then normalize via history replacement

On load and on hash change, a bare-identifier fragment (`#FR-SNAPSHOT-002`) is recognized, resolved to
the artifact, and the address rewritten to `#/artifacts/FR-SNAPSHOT-002` with a history replacement
rather than a push.

A push would leave the un-normalized address as the previous entry, so the reader's first Back would
return there and re-normalize — a loop that reads as the page refusing to let them leave. Replacement
makes a legacy arrival indistinguishable from a current-route arrival, including in history. Artifact
identifiers are immutable by rule, so the mapping is total and the guarantee is cheap to keep
permanently.

### D5 — The legacy whole-model visualization is retained, demoted, not deleted

The circular SVG is removed from the opening view and reached only on explicit request. Its behaviour
is otherwise untouched. `SLI-SNAPSHOT-006` replaces it with the layered model map and the focused
neighbourhood, and deletes it then.

Deleting it here would regress a capability shipped in v0.4.x for the three slices between this one
and its replacement — a reader who has the graph today would lose it and get nothing back until the
last slice lands. Demoting it satisfies this slice's actual obligation (no artifact-level graph in the
opening document) without that gap. The same reasoning applies to the existing relationship lists and
existing search: carried forward unchanged, replaced by `SLI-SNAPSHOT-004` and `SLI-SNAPSHOT-005`.

The cost is that between this slice and `SLI-SNAPSHOT-006` the page briefly offers both the legacy
visualization and the new kind-level aggregate. That is visible only to someone regenerating
mid-change, and it is preferable to a functional regression.

### D6 — The presentation system is established here because everything inherits it

Kind palette, accent, type scale, border treatment, spacing and control shape are defined once in this
slice's stylesheet. Later slices consume them and add no new visual vocabulary. `QR-PRESENTATION-001`
is deliberately partial in every slice for this reason: whether each kind's colour is identical across
_every_ view is only answerable once every view exists, which is `SLI-SNAPSHOT-006`.

Light-only is a product decision, not a limitation to work around: no `prefers-color-scheme` branch,
no theme attribute, no toggle.

### D7 — Measurement is infrastructure established once, extended thrice

This slice builds the harness and records the reference environment (hardware, OS, browser version),
then measures what it introduces: opening-document composition, generated size per authored byte,
generation time per artifact, and artifact-selection latency. The selection budget is derived from
those figures and agreed before implementation approval.

`SLI-SNAPSHOT-005` extends the same harness for search and `SLI-SNAPSHOT-006` for graph interaction,
each setting only its own budget. No budget is invented before the interaction exists, and none is
deferred to a consolidation phase — `CHG-SNAPSHOT-002` rules out both.

Representative models: the current ProductShape model (73 artifacts, 196 relationships) plus
materially larger synthetic models at roughly 5× and 10× (365/1,645 and 730/3,290, maximum degree 171,
30 artifacts with no relationships), containing dense relationships, high-degree and isolated
artifacts, and long titles and bodies.

## Risks / Trade-offs

- **Rendering from data is a new failure surface.** A serialization or escaping mistake now shows as a
  broken or unsafe detail pane rather than broken markup. Mitigated by testing both escaping paths
  with the same hostile fixture and by asserting embedded-data completeness against the compiled graph.
- **The opening view must not become a dashboard.** Orientation invites invented summary. The spec
  forbids fabricated importance, health, ranking and ordering, and the unconnected-artifact group has
  explicit presentation rules; both are verified by inspection, which is weaker than a unit test.
- **Two graph surfaces coexist temporarily** (D5). Accepted to avoid regressing shipped capability.
- **Accessibility and presentation evidence is browser-based**, so it is slower and less repeatable
  than unit tests. Mitigated by recording screenshots and figures against a named environment so later
  comparison is possible.

## Migration Plan

No data migration. The generated file is disposable and regenerated by
`prodshape graph --format html`; the CLI surface does not change. Shared links keep working: legacy
bare-identifier fragments resolve permanently (D4). Adopters need do nothing.

## Open Questions

None. `CHG-SNAPSHOT-002` carries no unresolved product questions — its four open questions were
resolved by the product owner before approval, and the resolutions are recorded in the change and
realized in the proposed artifacts.

The one decision this slice defers deliberately is D2: whether a component framework or graph library
is justified is a `SLI-SNAPSHOT-006` question, to be answered with measurement rather than preference.
