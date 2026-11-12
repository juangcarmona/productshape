<!-- pdac-scope: cited -->

## Context

The three maps share one engine. Each builder lays out a plane in pixels, and `fitMap` places a camera over the plane's fit box. On a phone, the Overview and Focus layouts are designed for a wide screen, and fitting them shrinks every label. The phone header, type size and catalog opening already shipped as a fix (phase 1).

<!-- pdac:cite id="FR-EXPLORER-TOPOLOGY" digest="sha256:8509d81d58828ef42f862d8b56403db999bdf66e65fc1aa1288853c6a0a5a66c" -->

## Decisions

- **Re-lay out for the phone instead of a separate list projection.** Every map keeps its engine: lighting, the summary card, arrow keys, the roving tab stop and the address all keep working unchanged. Only geometry and the camera change. A list projection would duplicate the Reader.
- **One predicate, `isPhone()`, evaluated with `matchMedia('(max-width: 40rem)')`.**
  - Each map's build key includes it, so crossing the boundary redraws the map once.
  - A `change` listener rebuilds the active map.
  - Without `matchMedia`, as in jsdom, the page behaves as on a desktop.
- **Overview on a phone.** Each tile has at most two chip columns, and the row target is the widest tile, so tiles stack. The camera's zoom (`k`) is the width fit capped at 1, anchored at the top, as the Columns view already does.
- **Focus on a phone.** One column 300px wide:
  - the centre box, then each group heading and its boxes;
  - edges drawn as an elbow from a spine at x = −14 into each box's left edge, so every drawn neighbour keeps exactly one line;
  - no background marks, so the dots' selection paths do not exist on a phone, which FR-EXPLORER-TOPOLOGY now allows.
- **Columns on a phone.** The camera's zoom is the full width over one column, capped at 1.15. The camera is placed at the selected artifact's column, otherwise the first.
- **Reader swipe.**
  - The handler is \`touchstart\`/\`touchend\` on \`#detail\`.
  - A swipe needs |dx| > 60px, |dx| > 2·|dy| and less than 600ms.
  - It is ignored when the touch starts inside a horizontally scrollable element (code blocks, tables).
  - It calls the same \`stepTo\` as the buttons.
- **Sticky Reader bar.** CSS only: \`.rbar { position: sticky; top: 0 }\` on a phone, with a background.

## Risks / Trade-offs

- **Phone and desktop layouts differ for the same address.** This is deterministic per viewport, which the requirements already allow.
- **No background marks on a phone.** Those artifacts are still reachable from the Overview, the Catalog and search.
