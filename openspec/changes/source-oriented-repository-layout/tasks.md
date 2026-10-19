<!-- pdac-scope: none reason="These tasks concern repository and site maintenance; they do not change Product Definition behavior." -->

# Tasks

- [x] 1. Create the repository map and ADR
  - [x] 1.1 Inventory every current top-level directory and classify its ownership and lifecycle role.
  - [x] 1.2 Add the next ADR and contributor-facing repository map before moving files.
  - [x] 1.3 Record the exact root-level canonical assets and generated-output boundaries.
- [x] 2. Move workspace packages into `src/packages/`
  - [x] 2.1 Move all current workspace packages while preserving package names, exports, and package-local assets.
  - [x] 2.2 Update workspace discovery, package metadata, build configuration, internal paths, and lockfile references.
  - [x] 2.3 Verify package build, typecheck, tests, CLI smoke behavior, and packed-file contents from a clean install.
- [x] 3. Move public-site source into `src/public-site/`
  - [x] 3.1 Move site source, authored content, locale data, assets, diagrams, and site-local configuration.
  - [x] 3.2 Move maintained scripts into `src/scripts/` and update root-relative path resolution.
  - [x] 3.3 Replace the custom site renderer with Astro for the public and engineering shells/profile pages while preserving the current route tree, publication profiles, and standalone Snapshot handoff.
  - [x] 3.4 Add locale/content configuration that preserves English and Spanish and supports a new locale without duplicating templates.
  - [x] 3.5 Add Mermaid Markdown rendering and an Archify-enhanced static HTML rendering path with explicit renderer/provenance/source metadata.
  - [x] 3.6 Update GitHub workflows, artifact paths, publication runbooks, and validation commands.
  - [x] 3.7 Build and validate the public and engineering surfaces, including links, root/subpath behavior, diagrams, and locale fallback.
- [x] 4. Preserve current appearance
  - [x] 4.1 Capture public and engineering browser baselines as CI review artifacts.
  - [x] 4.2 Add browser regression checks for representative routes, desktop/narrow layouts, light/dark/system appearance, navigation, focus, typography, spacing, and stable icon/token usage.
  - [x] 4.3 Resolve visual drift before integration; representative route HTML remains byte-identical and browser checks pass without an intentional design change.
- [x] 5. Reconcile repository references
  - [x] 5.1 Update architecture documentation, contributor guidance, examples, tests, and active configuration.
  - [x] 5.2 Preserve historical references only where explicitly labeled; remove stale active references to old source paths.
  - [x] 5.3 Confirm canonical Product Model and OpenSpec boundaries remain unchanged.
- [x] 6. Add guardrails and evidence
  - [x] 6.1 Add a structural layout/path guard that detects missing new paths and reintroduced old source directories.
  - [x] 6.2 Run the deterministic CI-equivalent suite and record its evidence.
  - [x] 6.3 Run runtime/public-site and visual verification where required and record limitations without claiming production publication.
- [x] 6.4 Complete lifecycle, architecture, documentation, security, and human-review gates before integration; owner/admin bypass recorded under the lifecycle policy exception.
