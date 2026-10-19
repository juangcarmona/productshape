<!-- pdac-scope: none reason="This proposal restructures repository paths only; it does not change Product Definition behavior." -->

# Make ProductShape's repository layout source-oriented and easy to navigate

## Why

ProductShape currently keeps maintained implementation under several top-level directories (`packages/`, `site/`, and `scripts/`). That layout makes the repository boundary less obvious, scatters executable source from documentation and canonical assets, and makes it harder to understand where a change belongs.

Raccord and DomusMind use a clearer repository shape: documentation and repository-level assets remain discoverable at the root, while maintained implementation is grouped under a source directory. ProductShape should adopt the same principle without changing package names, published entry points, generated artifacts, or product behavior.

## Scope

### In scope

- Move maintained packages to `src/packages/*`.
- Move public-site source, assets, authored content, and site-specific diagrams to `src/public-site/`.
- Move maintained repository scripts to `src/scripts/`.
- Update workspace configuration, package metadata, build scripts, workflows, tests, architecture documentation, runbooks, and contributor guidance to use the new paths.
- Add an architecture decision and a repository map that make source ownership and generated-output boundaries explicit.
- Add structural checks that prevent stale executable-source paths from silently returning.

### Out of scope

- Changing package names, exports, CLI behavior, published files, public URLs, or runtime behavior.
- Moving `docs/`, `tests/`, `openspec/`, `.product/`, `.archify/`, canonical schemas, skills, commands, templates, examples, or other repository-level canonical assets into `src/`.
- Replacing the existing public-site design or publication process.
- Introducing a new package, framework, deployment target, or product capability.

## Target layout

```text
docs/                         # canonical engineering and product documentation
src/
  packages/*                  # maintained workspace packages
  public-site/                # public-site source, content, assets, diagrams
  scripts/                    # maintained build and validation scripts
tests/                        # repository-level tests and fixtures
openspec/                     # product and engineering change specifications
skills/ commands/ templates/ schemas/ extensions/ examples/
                              # canonical repository assets and instructions
dist/                         # derived output, ignored or generated as today
_site/                        # derived site output, ignored or generated as today
```

The implementation must document the exact treatment of every current top-level path before moving files. In particular, `dist/`, package `dist/` directories, `_site/`, and generated ProductShape artifacts remain derived outputs; they are not source inputs.

## Product and lifecycle impact

This is an engineering repository-structure change. It does not alter the Product Model, introduce product behavior, or require a Product Change. The proposal must still preserve the existing publication and canonical-source rules, and it must pass the repository lifecycle gates before implementation begins.

## Acceptance criteria

- The approved plan identifies every maintained source directory that moves and every root-level directory that intentionally remains.
- The implementation target has one coherent maintained-source boundary at `src/` for packages, public-site source, and scripts.
- Workspace discovery, package builds, CLI packaging, public-site builds, publication workflows, tests, and documentation resolve the new paths without changing their observable contracts.
- No stale reference to the old maintained-source paths remains in active configuration, workflows, scripts, tests, or canonical architecture documentation, except where a migration note or historical record explicitly requires it.
- Generated outputs remain derived and are not treated as authored source.
- Structural and regression checks fail clearly if the old source directories or broken path assumptions return.
- The implementation plan records verification evidence for both deterministic checks and runtime/publication surfaces.

## Dependencies and risks

- The change depends on the current package workspace and public-site build contracts, including the GitHub Pages workflow and publication runbooks.
- The highest risk is an incomplete path migration that passes a local package check but breaks site publication, package metadata, or a workflow-only path.
- The implementation should be isolated in its own branch and verified from a clean install so stale local directories cannot mask missing references.

## Work item

This proposal refines and plans [#303](https://github.com/juangcarmona/productshape/issues/303). It intentionally stops at the Planned gate; implementation requires a separately approved `implement` step.
