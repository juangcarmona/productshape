# Changelog

All notable changes to the pdac Spec Kit extension. This file tracks the extension (`extensions/speckit-pdac`), which releases on its own `speckit-pdac-v*` tags. The ProductShape CLI and `@prodshape/integration-speckit` have their own changelogs.

## 0.2.0

Verified against Spec Kit 1.0.1: the extension installs, registers both commands as agent skills and lands all three hooks. The `specs/<feature>/` layout, the managed template names and the hook names are unchanged on the 1.x line.

- `speckit.pdac.verify` now says what actually clears a `PRODUCT064` unclassified document. Binding takes two things, not one: a citation, and a scope declaration in a carrier the verifier reads. It previously said to bind by citing alone, which leaves the document unclassified and pushes the session toward declaring an exemption or deleting the section, the outcomes the gate exists to prevent.
- Declared `category: docs` and `effect: read-write`, the facets the community catalog and `specify extension info` display.
- `requires.speckit_version` moved from `>=0.2.0`, a floor nobody had verified, to `>=0.7.2`, the lowest version with evidence behind it.

## 0.1.0

First release. Two commands, `speckit.pdac.context` (fetch the cited context projection before specifying) and `speckit.pdac.verify` (run the citation gate and repair findings), plus optional hooks after the specify, plan and tasks phases.
