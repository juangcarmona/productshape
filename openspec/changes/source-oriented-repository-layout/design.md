<!-- pdac-scope: none reason="This design defines repository and site implementation boundaries only; it does not change Product Definition semantics." -->

# Design

## Repository boundary

Use `src/` as the maintained implementation boundary:

- `src/packages/*` contains the existing workspace packages, preserving package names, package entry points, exports, and publication behavior.
- `src/public-site/` contains the Astro site shells for the public and engineering profiles, authored content, locale data, assets, diagrams, and site-local configuration.
- `src/scripts/` contains maintained repository scripts, including the public-site builder and validation helpers.

Keep repository-level concerns at the root when they are canonical inputs, shared test infrastructure, or lifecycle/configuration boundaries:

- `docs/`, `tests/`, `openspec/`, `.product/`, and `.archify/` remain at the root.
- `skills/`, `commands/`, `templates/`, `schemas/`, `extensions/`, and `examples/` remain at the root as canonical repository assets and contributor-facing instructions.
- Root package-manager and CI configuration remains at the root.
- `dist/`, package `dist/` directories, `_site/`, and other generated outputs remain derived and are not moved into the maintained-source tree unless the implementation evidence shows a tool-specific requirement.

## Migration rules

1. Inventory current paths and classify each as maintained source, canonical input, test infrastructure, configuration, or generated output before changing paths.
2. Move files with repository history preserved, then update all consumers in the same change.
3. Update `pnpm-workspace.yaml`, package `repository.directory` metadata where applicable, package build configuration, internal relative imports, and lockfile metadata without changing package identity or exports.
4. Make the public-site builder resolve paths from the repository root and its new `src/public-site/` and `src/scripts/` locations, so invocation from a clean checkout remains deterministic.
5. Update GitHub Actions path filters, artifact paths, deployment packaging, runbooks, architecture pages, and contributor documentation in the same migration.
6. Add a repository-layout guard that checks the new required paths, rejects the old maintained-source directories, and allows explicitly documented historical references.

## Astro and localization boundary

Astro is the site engine for the public and engineering shells/profile pages. It emits static files for the existing publication targets and base paths. The migration must preserve the current generated route tree, navigation destinations, profile separation, metadata, and standalone Snapshot handoff. Astro does not take ownership of the Product Model compiler or rewrite the standalone Snapshot.

Keep content separate from templates:

- Existing `en` and `es` content remains the compatibility baseline.
- A locale registry and typed content shape make adding a locale a content/configuration change rather than a page-template copy.
- Locale fallback is explicit and testable; it must never silently render an untranslated page while claiming it is localized.
- Canonical Markdown under `docs/` remains canonical. Astro adapters may transform it for presentation, but they do not edit or replace the source documents.

## Mermaid and Archify diagram boundary

The site accepts two authored/derived diagram paths:

- Mermaid fenced blocks in Markdown are authored source and render during the Astro build into static accessible HTML/SVG. They remain a convenience/explanatory view, not canonical graph truth.
- Archify artifacts are an enhanced rendering path for selected diagrams that need richer HTML interaction or source-backed presentation. Their candidate/source input, pinned revision, renderer identity, and validation receipt travel with the publication evidence.

The integration must not assume that every Mermaid construct converts to Archify. A diagram declares its renderer, unsupported conversions fail visibly, and a source-backed Archify artifact is linked to the same canonical source or authored intent as the Mermaid view. Neither renderer may require a production network service or browser-side fetch to display a published static artifact.

## Appearance preservation

Capture a visual baseline of the current public and engineering shells before implementation. Compare the migrated Astro outputs across representative desktop and narrow viewports and light/dark/system states. Preserve the current compact ProductShape language: text-first density, fine dividers, low-radius controls, stable icons/tokens, visible focus, and color-independent meaning. Any intentional visual change must be split into a separate approved item.

## Compatibility and rollback

The migration changes internal paths and the site engine, but consumers should observe the same package names, CLI behavior, public-site output, generated artifact contracts, current appearance, and publication destinations. A rollback is a revert of the single implementation change; no data migration or external service change is required.

## Verification strategy

- Structural: layout guard, path-reference scan, OpenSpec/lifecycle validation, and documentation link checks.
- Workspace: clean install, package build, typecheck, unit tests, CLI packaging/smoke checks, and package-file assertions.
- Public site: build Astro public and engineering profiles from a clean checkout, validate generated output and links, and exercise the configured root/subpath behavior.
- Visual and locale: compare route screenshots/DOM assertions for the current appearance, verify light/dark/system states and responsive navigation, preserve `en`/`es`, and add a fixture proving a new locale can be registered without a template copy.
- Diagrams: render Mermaid from Markdown, build at least one Archify-enhanced diagram, validate static output/provenance/source links, test the no-colour reading path, and verify both renderers at public and engineering base paths.
- Publication: validate workflow references, artifact collection, and deployment packaging without claiming a production deployment.
- Repository hygiene: inspect the final tree, confirm no stale source directories remain, and collect CI evidence from the branch.

## Architecture record

Implementation must add the next repository ADR using the shared ADR template. It should record the source-oriented boundary, Astro as the site engine, locale/content ownership, Mermaid/Archify renderer boundaries, deliberate root-level canonical assets, generated-output rules, compatibility promise, and the alternatives considered (leaving the scattered layout in place, moving every repository asset under `src/`, or keeping the custom static builder).
