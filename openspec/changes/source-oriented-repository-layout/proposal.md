<!-- pdac-scope: none reason="This proposal changes repository structure and site implementation technology without changing Product Definition semantics or user-facing content." -->

# Make ProductShape's repository layout source-oriented and easy to navigate

## Why

ProductShape currently keeps maintained implementation under several top-level directories (`src/packages/`, `src/public-site/`, and `src/scripts/`). That layout makes the repository boundary less obvious, scatters executable source from documentation and canonical assets, and makes it harder to understand where a change belongs.

Raccord and DomusMind use a clearer repository shape: documentation and repository-level assets remain discoverable at the root, while maintained implementation is grouped under a source directory. ProductShape should adopt the same principle without changing package names, published entry points, generated artifacts, current site appearance, or product behavior. The site migration should also establish Astro as a maintainable static site engine, with first-class localization and authored Mermaid/Archify diagram support.

## Scope

### In scope

- Move maintained packages to `src/packages/*`.
- Move public-site and engineering-site shell source, assets, authored content, and site-specific diagrams to `src/public-site/`.
- Move maintained repository scripts to `src/scripts/`.
- Migrate the site shells to Astro while preserving the current static outputs, routes, profiles, visual language, and publication boundaries. The standalone Product Snapshot remains generated separately and copied byte-for-byte.
- Preserve the current English and Spanish routes while making additional locales maintainable through content/configuration rather than duplicated page templates.
- Support Mermaid diagrams in authored Markdown and Archify-enhanced diagrams in the Astro build, with explicit renderer identity, source links, provenance, and static/publishable output.
- Update workspace configuration, package metadata, build scripts, workflows, tests, architecture documentation, runbooks, and contributor guidance to use the new paths and site engine.
- Add an architecture decision and a repository map that make source ownership and generated-output boundaries explicit.
- Add structural checks that prevent stale executable-source paths from silently returning.

### Out of scope

- Changing package names, exports, CLI behavior, published files, public URLs, or runtime behavior.
- Moving `docs/`, `tests/`, `openspec/`, `.product/`, `.archify/`, canonical schemas, skills, commands, templates, examples, or other repository-level canonical assets into `src/`.
- Redesigning the existing public-site appearance or changing the publication destinations.
- Replacing the standalone Product Snapshot generator or making the Product Model depend on Astro, Mermaid, or Archify.
- Adding new language content beyond preserving the existing locales and proving the locale extension path.

## Target layout

```text
docs/                         # canonical engineering and product documentation
src/
  packages/*                     # maintained workspace packages
  public-site/                # Astro site shells, content, assets, diagrams
  scripts/                       # maintained build and validation scripts
tests/                        # repository-level tests and fixtures
openspec/                     # product and engineering change specifications
skills/ commands/ templates/ schemas/ extensions/ examples/
                              # canonical repository assets and instructions
dist/                         # derived output, ignored or generated as today
_site/                        # derived site output, ignored or generated as today
```

The implementation must document the exact treatment of every current top-level path before moving files. In particular, `dist/`, package `dist/` directories, `_site/`, and generated ProductShape artifacts remain derived outputs; they are not source inputs.

The Astro migration owns the public and engineering site shells/profile pages. The standalone Product Snapshot remains a separately generated artifact and must be copied without rewriting its HTML or URL-state contract. Mermaid is an authored diagram format; Archify is an optional enhanced renderer/artifact path for diagrams that need richer HTML interaction. Neither is a canonical Product Model source.

## Product and lifecycle impact

This is an engineering repository-structure change. It does not alter the Product Model, introduce product behavior, or require a Product Change. The proposal must still preserve the existing publication and canonical-source rules, and it must pass the repository lifecycle gates before implementation begins.

## Acceptance criteria

- The approved plan identifies every maintained source directory that moves and every root-level directory that intentionally remains.
- The implementation target has one coherent maintained-source boundary at `src/` for packages, public-site source, and scripts.
- Workspace discovery, package builds, CLI packaging, Astro public/engineering builds, publication workflows, tests, and documentation resolve the new paths without changing their observable contracts.
- The Astro site preserves the current appearance and observable navigation: route structure, content hierarchy, typography, spacing, color tokens, iconography, light/dark/system themes, responsive behavior, focus states, and publication-profile separation.
- Existing English and Spanish routes remain available; a new locale can be added by adding localized content/configuration without duplicating the site templates, while missing translations follow an explicit documented fallback.
- Authored Markdown can contain Mermaid diagrams that render to static accessible HTML/SVG. Authored diagrams may also select an Archify-enhanced rendering path that produces static HTML suitable for the existing publication targets.
- Every rendered diagram identifies whether it is Mermaid or Archify output, links to its canonical or authored source where applicable, records source revision/provenance, and remains understandable without colour alone.
- Mermaid and Archify rendering works at the public root path and engineering base path without requiring a network service or a client-side runtime for diagrams that are published as static output.
- No stale reference to the old maintained-source paths remains in active configuration, workflows, scripts, tests, or canonical architecture documentation, except where a migration note or historical record explicitly requires it.
- Generated outputs remain derived and are not treated as authored source.
- Structural and regression checks fail clearly if the old source directories or broken path assumptions return.
- The implementation plan records verification evidence for both deterministic checks and runtime/publication surfaces.

## Dependencies and risks

- The change depends on the current package workspace and public-site build contracts, including the GitHub Pages workflow and publication runbooks.
- The change also depends on preserving the current site rendering contract while introducing Astro, locale data, Mermaid rendering, and optional Archify artifacts.
- The highest risks are an incomplete path migration, visual drift hidden by functional tests, locale fallback errors, or diagram tooling that creates non-portable output or silently presents derived explanations as canonical data.
- The implementation should be isolated in its own branch and verified from a clean install so stale local directories cannot mask missing references.

## Work item

This proposal refines and plans [#303](https://github.com/juangcarmona/productshape/issues/303). It intentionally stops at the Planned gate; implementation requires a separately approved `implement` step.
