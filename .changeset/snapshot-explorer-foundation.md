---
'@prodshape/core': minor
---

Product Snapshot: orient first, read one artifact at a time

`prodshape graph --format html` now generates a progressive-disclosure explorer instead of a fully
expanded report. The file still contains the whole model — every artifact body and every relationship
— but it carries them as inert embedded data and renders on demand, so the document the browser
parses at open time holds the orientation view only.

- **Opens on an overview**: identity, revision, artifact and relationship totals, counts by kind with
  entry points, a kind-level relationship aggregate, and a neutral report of the artifacts holding no
  relationships. No artifact body and no artifact-level graph at open.
- **Master–detail reading**: exactly one artifact detail at a time, with its metadata, authored
  Markdown, and its declared and derived references kept apart.
- **One selected artifact, addressable**: a single fragment router owns every state transition, so
  direct links work from `file://` and static hosting and Back/Forward retrace exploration. Fragments
  produced by earlier snapshots (`#FR-SNAPSHOT-002`) keep resolving permanently and are normalized in
  place without adding a history entry.
- **Presentation**: light-only, system sans-serif with monospaced identifiers and revisions, thin
  borders, one accent plus a stable per-kind palette, and no meaning carried by colour alone.
- **Accessibility**: landmarks and heading outline, keyboard operation, visible focus, `aria-current`
  on the selected artifact, WCAG 2.1 AA text contrast, reduced-motion respected.
- **Smaller and flat at scale**: the generated file drops ~47% (459,704 → 246,167 bytes for this
  repository's own model) and the opening document grows 1.12× across a tenfold larger model, where it
  previously grew 10.55×.
- Markdown link targets are restricted to `http`, `https` and `mailto`, so an authored
  `javascript:` or `data:` URL renders as inert text rather than an executable link.

The whole-model graph is no longer part of the opening view and is opened on request. Generation
remains deterministic and byte-identical for identical model content, offline, self-contained and
read-only, and the CLI is unchanged.
