---
'@prodshape/core': minor
'@prodshape/cli': minor
---

Add the Product Snapshot: `prodshape graph --format html` generates one static, self-contained,
read-only HTML page projecting the whole product model — every artifact rendered and organized by
kind with visible status badges, frontmatter metadata, anchor navigation, and the source revision
stamped on the page. The file opens from local disk with no server, no network and no scripts,
and regenerating from identical model content yields a byte-identical file.

This is the first delivery slice of `CHG-SNAPSHOT-001`: it introduces the Product Explorer — the
person who wants to understand the product deeply without cloning a repository or running a CLI.
Relationship links, the graph visualization and client-side search arrive with the second slice.

`@prodshape/core` gains `buildSnapshotHtml` and a minimal deterministic Markdown renderer
(`renderMarkdown`, `escapeHtml`) with no new dependencies.
