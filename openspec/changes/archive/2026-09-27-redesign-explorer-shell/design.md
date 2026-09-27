<!-- pdac-scope: cited -->

## Context

The generator is `buildSnapshotHtml` in `packages/core/src/snapshot.ts`. It is one TypeScript module that emits one HTML file with:

- an inline stylesheet;
- an inert JSON data block;
- one ES5 application script with a single router (`go`) and hash routing.

The module has to keep satisfying the contracts in the rest of `snapshot-generation`:

- **Determinism:** byte-identical output for identical content.
- **Self-containment:** no external resource and exactly two scripts.
- **A bounded opening document:** no artifact body, and no `<svg>` or artifact-level graph in the markup before the data block.
- **Legacy routes:** they must still resolve.
- **Escaping:** on both channels.

The validated mockup, built from this repository's own model, fixes the visual direction. See proposal.md for the motivation.

## Goals / Non-Goals

**Goals:**

- Deliver every requirement in the delta spec without a framework, a bundler step, or any change to the generation contract.
- Keep existing addresses working: `k`, `s`, `c`, `f`, `q` and `x`, plus the legacy and withdrawn routes.

**Non-Goals:**

- Phone-width redesign. The existing narrow-viewport behaviour, list and detail as separate states, is kept.
- Changing the data model that the CLI compiles.

## Decisions

1. **Appearance tokens in CSS, choice in the address.**
   - How it works:
     - Every colour is a custom property.
     - Light values sit on `:root`.
     - Dark values sit under `@media (prefers-color-scheme: dark)`, scoped to `:root:not([data-appearance="light"])`, and again under `:root[data-appearance="dark"]`.
     - The router sets `data-appearance` from the address parameter `a` (`light` or `dark`; absent means the environment's preference).
     - Kind colours become `--k-<kind>` per appearance, and markup refers to them through a `k-<kind>` class.
     - The data block carries the light and dark palettes so the contrast tests can check both.
   - Alternative rejected: a script-computed palette. It would make appearance depend on script timing and would not honour `prefers-color-scheme` before the script runs.
   <!-- pdac:cite id="QR-PRESENTATION-001" digest="sha256:d16a3c4eb8a38f0282d47a962ec3822bcd882f1910131d504ed0d2ed75352e88" -->
2. **Presentation choices travel as catalog-state parameters.**
   - `a` (appearance) and `m` (`rail` when the master area is collapsed) join the fixed serialization order after the discovery keys: `k s c f q x a m`.
   - Every generated link already appends `catQuery(state.cat)`, so they survive navigation for free.
   - Links in the static markup are re-targeted by a delegated click handler that merges the current presentation parameters.
   - "Clear filters" clears `k`, `s`, `c` and `f` only.
   <!-- pdac:cite id="FR-SNAPSHOT-006" digest="sha256:b29e1faa337fb90b5dcac8b9ddeb92325c7acb2c29a2b18bb512ec2e6be7bf3f" -->
3. **Kind icons are a sprite the script creates.**
   - Icon path data lives in the script as a constant.
   - At start-up the script injects one hidden `<svg>` of `<symbol>`s and decorates every `.token[data-kind]` with a `<use>`.
   - The opening document keeps no `<svg>`, so the bounded-opening contract and its test hold unchanged. Before the script runs, the page shows tokens without icons, which is still a complete kind signal.
   <!-- pdac:cite id="QR-SCALABILITY-001" digest="sha256:ce964e20dec3fb9facb301afb75ef2026c908a05ea56b11f3de1981522a7dfe1" -->
4. **Search is an ARIA dialog, not native `<dialog>`.**
   - A `div[role=dialog][aria-modal=true]` holds the ranked search.
   - It keeps the existing ids (`q-body`, `q-body-results`, `q-body-status`), so the ranking engine and its tests carry over.
   - Focus handling:
     - Focus is trapped with Tab and Shift+Tab.
     - Escape closes the dialog.
     - Focus returns to the invoking element.
   - Alternative rejected: native `showModal`. Its support is uneven in the DOM the suite drives, and the router needs to own open and close.
5. **One narrowing state, shown in two places.**
   - The dialog's chips and the list's chip strip read and write the same `k`, `s` and `c`, one value each, which keeps today's addresses.
   - `q` is in the address exactly while the dialog is open.
   - Opening a result pushes the artifact address without `q`, so Back reopens the dialog on the query. That is how the discovery "resumes".
   - A legacy `f` still narrows and shows as a chip, but no control creates it.
   <!-- pdac:cite id="FR-SNAPSHOT-008" digest="sha256:b9ae2520c7778c6c7a90d1866db57873cfa0fe5e2995a05b8786a7797efd281a" -->
   <!-- pdac:cite id="FR-SNAPSHOT-004" digest="sha256:79141d7904dd9088a5f0643acb9217c0badc0e6356e4053b6fcf4c817c35b5ec" -->
6. **The master area is a grouped disclosure list plus a rail.**
   - Kind groups are buttons with `aria-expanded`.
   - Which groups the reader opened is held in memory only. It is reader state, and the spec does not require it in the address.
   - The selection's group is always open, and every group is open while a narrowing is active.
   - The rail is the same aside in a collapsed grid column, with one button per kind.
   <!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->
7. **Identifier links are added after rendering.**
   - After the escaped body HTML is assigned, a TreeWalker over its text nodes, skipping existing anchors, wraps each token that matches the identifier pattern and names a known artifact.
   - This adds only anchors, so the text content stays byte-for-byte the authored text.
   - In metadata, comma lists made entirely of known identifiers render as reference chips; other values get the same text-node linking.
8. **The Focused Topology is an HTML-and-SVG layer computed as rows.**
   - Groups are fixed-width buttons, placed in rows by a pure function of the pane width, group count and open group, over a directed SVG line layer.
   - Declared groups go above the anchor and referencing groups below. The canvas height grows and the pane scrolls.
   - Pan and zoom are dropped. The rows cannot overlap, so there is nothing to pan to.
   - `x` names the single open group index (`-` for none), and an old multi-index `x` opens its first index.
   - Member lists are anchored lists of links, so members route through the router like any link.
   - When layout reports zero width, as in the test DOM, a fixed width stands in, so tests are deterministic.
   <!-- pdac:cite id="FR-SNAPSHOT-009" digest="sha256:ab9721cb7fb71a07fa8a48789379024ecd0eeda9122267329ee3dcbc20718ff7" -->
   <!-- pdac:cite id="FR-SNAPSHOT-005" digest="sha256:6f4280d6db76da8e0188db3dbb63e55d8df4ea045950cea506a50beae1d9259b" -->
9. **The Overview's bounded parts are static; the unbounded parts render on demand.**
   - Rendered statically, because they are bounded by kinds:
     - identity;
     - totals;
     - composition;
     - the aggregate table;
     - the kind-by-kind grid.
   - Rendered by the script from the data block, because they grow with the model:
     - journeys and their steps;
     - contexts and their reference counts;
     - the most-relationships list (top 6, criterion stated);
   - The opening document therefore stays bounded by kinds.
   <!-- pdac:cite id="FR-SNAPSHOT-003" digest="sha256:e943d44f1e487316d7c50a59534c220a155da3387a93954a882be0754a615b07" -->
10. **Keyboard shortcuts are an accelerator only.**
    - The shortcuts:
      - `/` and `Ctrl`/`Cmd+K`: search.
      - `Ctrl`/`Cmd+B`: master area.
      - `j` and `k`: next and previous.
      - `?`: the shortcut list.
    - None fires while typing in a field.
    - Each one's action has a visible control, and the shortcut list is reachable from a header button.
    <!-- pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->

## Risks / Trade-offs

- [The rewrite touches most of the application script and about 40 DOM tests] → The existing suites stay the acceptance baseline. Tests change only where the spec delta changed behaviour, such as orbit, pan and zoom, and the fixed filter form. Ranking, routing, escaping and grouping tests are kept as they are.
- [jsdom has no layout] → Layout-dependent guarantees are checked on computed positions from the pure row function, which makes overlap testable. Real-browser evidence comes from the screenshot harness in both appearances.
- [A delegated link handler could fight the router] → It only rewrites the href of same-document `#/` links that lack presentation parameters, then lets the ordinary hashchange flow run.
- [Dark kind colours could fail AA on dark panels] → The contrast test is extended to both token sets and both kind palettes.

## Migration Plan

This is a generator change only. Existing snapshots stay valid files, and regenerating yields the new shell. Addresses from older snapshots keep resolving, as covered in decisions 2, 5 and 8. To roll back, revert the commit and regenerate.
