# Tasks: add-snapshot-navigation

## 1. Relationship navigation (no script needed)

- [ ] 1.1 In `buildSnapshotHtml`, render a **References** list (outgoing edges with kind) and a
      **Referenced by** list (incoming edges with kind) on every artifact article, as anchor
      links, using the graph's deterministic edge order.
- [ ] 1.2 Unit tests: outgoing reference is a link; derived incoming reference is a link;
      artifacts with no relationships render no empty sections.

## 2. Search

- [ ] 2.1 Embed a JSON search index (`id`, `title`, `kind`, collapsed body text) built from the
      sorted artifact list.
- [ ] 2.2 Add the sidebar search input and the embedded script's search routine: substring match
      over id/title/text, results as navigable links, hidden without JavaScript.
- [ ] 2.3 Unit tests: index contains every artifact with searchable text; the script block is
      byte-stable across builds.

## 3. Graph visualization

- [ ] 3.1 Generate an inline SVG at build time: nodes on a circle grouped by kind (colored by
      kind), edges as lines, deterministic trigonometric layout from the sorted node order.
- [ ] 3.2 Script: clicking a node toggles neighborhood highlighting (CSS classes on its edges
      and neighbors, others dimmed) and offers navigation to the artifact's anchor.
- [ ] 3.3 Unit tests: SVG contains one node element per artifact and one line per edge;
      identical content yields byte-identical SVG.

## 4. Contract preservation and verification

- [ ] 4.1 Update slice-1 assertions: exactly one script block; search input allowed but no
      form/mutation elements; page still self-contained (no external references).
- [ ] 4.2 Determinism: double generation byte-identity over the self-applied model still holds.
- [ ] 4.3 Manual verification in a browser from `file://` offline: follow links both directions,
      select nodes in the visualization, search by ID/title/content (SLI-SNAPSHOT-002
      verification).
- [ ] 4.4 Full suite + format check; record coverage evidence for FR-SNAPSHOT-002 (now fully
      covered together with slice 1) in this change's coverage mapping.
