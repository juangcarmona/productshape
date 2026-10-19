<!-- pdac-scope: none reason="These tasks concern repository maintenance and verification; they do not change Product Definition behavior." -->

# Tasks

- [ ] 1. Create the repository map and ADR
  - [ ] 1.1 Inventory every current top-level directory and classify its ownership and lifecycle role.
  - [ ] 1.2 Add the next ADR and contributor-facing repository map before moving files.
  - [ ] 1.3 Record the exact root-level canonical assets and generated-output boundaries.
- [ ] 2. Move workspace packages into `src/packages/`
  - [ ] 2.1 Move all current workspace packages while preserving package names, exports, and package-local assets.
  - [ ] 2.2 Update workspace discovery, package metadata, build configuration, internal paths, and lockfile references.
  - [ ] 2.3 Verify package build, typecheck, tests, CLI smoke behavior, and packed-file contents from a clean install.
- [ ] 3. Move public-site source into `src/public-site/`
  - [ ] 3.1 Move site source, authored content, assets, diagrams, and site-local configuration.
  - [ ] 3.2 Move maintained scripts into `src/scripts/` and update root-relative path resolution.
  - [ ] 3.3 Update GitHub workflows, artifact paths, publication runbooks, and validation commands.
  - [ ] 3.4 Build and validate the public and engineering surfaces, including links and root/subpath behavior.
- [ ] 4. Reconcile repository references
  - [ ] 4.1 Update architecture documentation, contributor guidance, examples, tests, and active configuration.
  - [ ] 4.2 Preserve historical references only where explicitly labeled; remove stale active references to old source paths.
  - [ ] 4.3 Confirm canonical Product Model and OpenSpec boundaries remain unchanged.
- [ ] 5. Add guardrails and evidence
  - [ ] 5.1 Add a structural layout/path guard that detects missing new paths and reintroduced old source directories.
  - [ ] 5.2 Run the deterministic CI-equivalent suite and record its evidence.
  - [ ] 5.3 Run runtime/public-site verification where required and record limitations without claiming production publication.
  - [ ] 5.4 Complete lifecycle, architecture, documentation, security, and human-review gates before integration.
