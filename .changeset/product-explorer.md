---
'@prodshape/core': minor
---

Product Snapshot: the Product Explorer

The snapshot's exploration experience is now the Product Explorer: four coordinated surfaces over
one selection and one addressable state. Completeness means every artifact and canonical
relationship is reachable — not that every node is simultaneously rendered.

- **Overview** — identity, revision, aggregate counts by kind with an entry point into each
  artifact family, the kind-level relationship aggregate, a neutral report of artifacts holding no
  relationships, and global search on the first screen.
- **Catalog** — discovery as a workspace: search by identifier, title and content; filters over
  canonical fields only (kind, status, and bounded context where the model declares one); the
  query-and-filter state lives in the address, so a result set is deterministic and shareable, and
  opening a result and returning resumes the discovery.
- **Artifact Reader** — the selected artifact dominates: authored content with its heading
  hierarchy, relationships grouped by meaning in both directions with complete counts on every
  group, titles and identifiers on every entry, one-step refocus, and a named, retraceable
  navigation context. The model is navigable as a graph through reading alone.
- **Focused Topology** — a visual projection beside the Reader that is local, bounded and
  progressive: the selected artifact anchors its immediate relationship groups, typed and counted;
  small neighbourhoods open whole while large groups start collapsed with their complete counts;
  disclosure is addressable (`?x=`) and replaces history; refocusing draws a new neighbourhood
  rather than accumulating; sets too dense to draw legibly fall back to a structured list; the
  arrangement re-allocates on expand so nothing collides or leaves the canvas; and pan, zoom and
  fit work by pointer and keyboard.

There is no whole-product drawing of any kind. The earlier whole-model circle, the layered map and
the standalone projection routes are gone; old `#/graph` addresses resolve in place into the
integrated view, and bare-identifier fragments keep their permanent guarantee. The page remains one
static, self-contained, offline, deterministic file with no global scroll — each region scrolls on
its own.
