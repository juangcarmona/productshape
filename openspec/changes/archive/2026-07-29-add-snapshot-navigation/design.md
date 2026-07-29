# Design: add-snapshot-navigation

## Context

Slice 1 established `buildSnapshotHtml` in `@prodshape/core`: pure function, fixed ordering,
embedded CSS, anchor navigation, no script. This slice adds the graph layer on top without
disturbing the generation contract. The compiled graph already carries everything needed:
`outgoing` and `incoming` edge indexes per artifact — the derived reverse views are free.

## Goals / Non-Goals

**Goals**

- Bidirectional relationship links on every artifact view.
- Graph visualization with node-selection neighborhood highlighting.
- Offline client-side search (IDs, titles, content).
- Preserve: single file, determinism, self-containment, read-only.

**Non-Goals**

- Structural impact views, changes/slices/handoffs rendering, hosting (all out of scope of
  CHG-SNAPSHOT-001 or later changes).
- Graph layout sophistication: a readable deterministic layout beats a beautiful random one.

## Decisions

### D1 — Relationship sections rendered server-side (generation time), not by script

Each artifact article gains two rendered lists: **References** (outgoing edges, with edge kind)
and **Referenced by** (incoming edges, with edge kind) — plain HTML links to `#ID` anchors,
built from `graph.outgoing`/`graph.incoming`. Works with JavaScript disabled; script is reserved
for what genuinely needs it (search, visualization). Edge ordering follows the graph's already
deterministic edge sort.

### D2 — One embedded hand-written script, dependency-free

A single `<script>` block (static string in the builder, ~200 lines) implements search and the
visualization. No bundler, no library, no CDN — determinism by construction, auditability by
reading. The slice-1 unit assertion "no `<script>`" is replaced by "exactly one script block,
byte-stable".

### D3 — Search over an embedded JSON index

A `<script type="application/json">` element carries `[{id, title, kind, text}]` (text =
body plain text, lowercased, whitespace-collapsed). Search is substring match over id/title/text,
results capped and rendered as links. Index built from the same sorted artifact list as the
page — deterministic.

### D4 — Visualization: inline SVG, deterministic circular layout, CSS-class highlighting

Nodes placed on a circle grouped by kind (the graph's sorted node order), edges as lines,
node color by kind. Clicking a node adds a `selected` class: its edges and neighbors get
highlighted via CSS, others dimmed; a second click (or the node's label link) navigates to the
artifact anchor. A deterministic trigonometric layout computed at generation time — no physics,
no randomness, no runtime layout engine. The whole SVG is generated server-side; the script only
toggles classes.

### D5 — Placement

The visualization sits in a dedicated section at the top of `<main>` (after the header, before
Actors); search is an input in the sticky sidebar with a results panel. Both degrade gracefully:
without JavaScript the SVG still shows the shape, search input hides itself.

## Risks / Trade-offs

- **64+ nodes on a circle gets dense** → group by kind around the circle and highlight on
  selection; density is acceptable because neighborhood highlighting is the primary reading
  mode, the overview is secondary.
- **Body text in the search index roughly doubles page size** → still well under 1 MB for
  models this size; acceptable, monitor with adopters.
- **Search input violates "no `<input>`" slice-1 test** → that assertion was about mutating
  controls; it becomes "no form submission, no mutation" — the spec's read-only requirement is
  about product knowledge, and search input mutates nothing.

## Migration Plan

Additive to the generated page only. Regenerated snapshots gain the features; no CLI surface,
config or existing output format changes. Golden files update once, reviewed.

## Open Questions

None blocking.
