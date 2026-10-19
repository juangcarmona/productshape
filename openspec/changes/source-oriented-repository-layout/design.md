<!-- pdac-scope: none reason="This design defines implementation paths and verification only; it does not change Product Definition behavior." -->

# Design

## Repository boundary

Use `src/` as the maintained implementation boundary:

- `src/packages/*` contains the existing workspace packages, preserving package names, package entry points, exports, and publication behavior.
- `src/public-site/` contains the existing public-site source, authored content, assets, diagrams, and site-local configuration.
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

## Compatibility and rollback

The migration is path-only. Consumers should observe the same package names, CLI behavior, public-site output, generated artifact contracts, and publication destinations. A rollback is a revert of the single implementation change; no data migration or external service change is required.

## Verification strategy

- Structural: layout guard, path-reference scan, OpenSpec/lifecycle validation, and documentation link checks.
- Workspace: clean install, package build, typecheck, unit tests, CLI packaging/smoke checks, and package-file assertions.
- Public site: build from a clean checkout, validate generated output and links, and exercise the configured root/subpath behavior.
- Publication: validate workflow references, artifact collection, and deployment packaging without claiming a production deployment.
- Repository hygiene: inspect the final tree, confirm no stale source directories remain, and collect CI evidence from the branch.

## Architecture record

Implementation must add the next repository ADR using the shared ADR template. It should record the source-oriented boundary, the deliberate root-level canonical assets, generated-output rules, compatibility promise, and the alternatives considered (leaving the scattered layout in place or moving every repository asset under `src/`).
