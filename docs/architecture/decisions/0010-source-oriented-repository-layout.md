---
title: Source-oriented repository layout and Astro publication shell
status: accepted
date: 2026-10-19
---

# ADR 0010: Source-oriented repository layout and Astro publication shell

## Context

Maintained packages, publication source and repository automation were spread across root-level `packages/`, `site/` and `scripts/` directories. The layout made source ownership harder to discover and made the two publication profiles look like an exception to the repository's documentation and test boundaries. The publication site also needed a maintainable static engine with locale and diagram extension points while retaining the existing appearance and standalone Product Snapshot boundary.

## Decision

Move maintained implementation beneath `src/`: workspace packages under `src/packages/`, the Astro publication project under `src/public-site/`, and repository automation under `src/scripts/`. Keep canonical documentation under `docs/` and verification under `tests/`.

Use Astro as the static build and route shell for both public and engineering profiles. During the migration, Astro consumes the existing deterministic content compiler's HTML as a compatibility adapter so route structure and appearance remain stable. The generated Product Snapshot stays a separately generated, byte-for-byte handoff. Authored Mermaid diagrams use static HTML/SVG output, while selected Archify artifacts remain explanatory static HTML with explicit provenance and source links.

## Consequences

- Contributors have predictable source, documentation and test boundaries.
- Workspace package names, exports and published contents remain independent of their repository paths.
- Astro provides the locale, component and static-route extension point without forcing a visual redesign.
- The compatibility adapter is temporary implementation detail and must not become a second canonical content source.
- Mermaid and Archify remain derived views; authored Markdown, product model artifacts and architecture sources remain authoritative.
- CI and local commands must use the `src/` paths, and the layout guard must prevent the old source directories from returning.

## Alternatives considered

- Keep the root-level layout: rejected because it preserves the navigation problem that motivated the change.
- Rewrite every existing page as Astro components in one change: rejected because it creates unnecessary visual and route regression risk; the adapter permits incremental migration.
- Make Mermaid or Archify the canonical graph: rejected because diagrams are explanatory or convenience views and cannot replace the Product Model.
