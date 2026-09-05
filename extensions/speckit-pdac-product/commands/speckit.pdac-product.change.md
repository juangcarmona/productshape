---
description: Create or continue exactly one named ProductShape Product Change.
---

# Product Change

Use the user-provided name as one lowercase kebab-case path segment. Start or continue it with `prodshape speckit-product create <name>` and the matching container under `.specify/productshape/changes/<name>/`; never search by recency and never use `.specify/extensions/` or `docs/product/changes/active`. For the first definition of an empty model, pass `--initial`: the change gets the reserved id `CHG-INITIAL`.

Read the accepted model, inspect the graph around the requested product meaning, and ask product-semantic questions one at a time. Record working memory, decisions, rationale, unresolved questions and conscious exclusions in the proposal/change container. Author complete proposed future-state artifacts there. Do not edit `docs/product/model`, approve, apply, or archive.

Use the locally installed ProductShape adapter bridge for deterministic path validation and preflight. Do not interpolate the user's text into shell workflow steps.
