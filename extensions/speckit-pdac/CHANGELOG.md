# Changelog

All notable changes to the pdac Spec Kit extension. This file tracks the extension (`extensions/speckit-pdac`), which releases on its own `speckit-pdac-v*` tags. The ProductShape CLI and `@prodshape/integration-speckit` have their own changelogs.

## 0.2.0

Verified against Spec Kit 1.0.1: the extension installs from the release archive and from a development path, registers both commands as agent skills, lands all three hooks, reports its facets through `specify extension info`, and removes cleanly. The `specs/<feature>/` layout, the managed template names and the hook names are unchanged on the 1.x line. Also re-verified installing and registering on 0.7.2, the declared floor.

- `speckit.pdac.verify` now says what actually clears a `PRODUCT064` unclassified document. Binding takes two things, not one: a citation, and a scope declaration in a carrier the verifier reads. It previously said to bind by citing alone, which leaves the document unclassified and pushes the session toward declaring an exemption or deleting the section, the outcomes the gate exists to prevent.
- Declared `category: process` and `effect: read-write`, the facets the community catalog and `specify extension info` display. `process` is the honest facet: the extension's three hooks are lifecycle hooks and its purpose is a gate on the specify → plan → tasks loop, not documentation generation.
- Declared `homepage` and the `requires.tools` entry for ProductShape, both part of the manifest schema and both previously absent, so the catalog entry the release generates is complete.
- `requires.speckit_version` moved from `>=0.2.0`, a floor nobody had verified, to `>=0.7.2`, the lowest version with evidence behind it.
- The required ProductShape version is `>=0.16.0`. The previously documented `>=0.14.0` does not hold: 0.14.0 introduced the Spec Kit provider, but `citations verify --provider speckit --format json` — step 1 of `speckit.pdac.verify` — fails there, and 0.14.0 does not read the exemption carrier the command instructs the agent to write. 0.15.0 was never published.
- Ships its own `LICENSE`. The release archive is built from this directory alone, so the repository-root license never reached it, and a license file inside the extension is a publishing requirement.
- The description states the boundary — the extension never writes the product model — and fits the 200-character catalog limit.

## 0.1.0

First release. Two commands, `speckit.pdac.context` (fetch the cited context projection before specifying) and `speckit.pdac.verify` (run the citation gate and repair findings), plus optional hooks after the specify, plan and tasks phases.
