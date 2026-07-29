---
'@prodshape/core': minor
'@prodshape/cli': minor
---

The Product Snapshot becomes a navigable graph. Every artifact reference on the generated page is
now a link in both directions — the declared frontmatter references and the derived reverse views
("referenced by") no authored file states. An inline SVG visualization presents the model's
shape: selecting a node highlights its relationships and jumps to the artifact. Client-side
search over artifact IDs, titles and content works fully offline. Still one self-contained,
read-only, byte-identical file with no external resources and no dependencies.

This completes `CHG-SNAPSHOT-001` (second and final delivery slice): the full snapshot scope —
browse, read, follow, visualize, search — is delivered.
