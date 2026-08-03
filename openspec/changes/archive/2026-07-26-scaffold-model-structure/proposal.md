# Scaffold the Model Structure

## Why

`prodshape init` already created one directory per artifact kind, but nothing said so: the layout appeared in no specification chapter and no adoption guide. The first adoption outside this repository therefore had to invent a taxonomy, and independently arrived at a different one.

Worse, the directories did not survive a commit. Git does not track empty directories, so a fresh clone of a newly initialized repository had no structure at all — the recommendation disappeared before anyone saw it.

## What Changes

- Write a `.gitkeep` into each scaffolded directory, so the recommended layout is committed before any artifact is authored.
- Document the layout in `docs/specification/artifacts.md` at SHOULD level, and in both adoption guides, stating explicitly that discovery is layout-independent.
- Add `init --flat` for repositories that prefer no subdirectories. It still creates the model directory itself, so `validate` and `doctor` have something to read.
- Add a conformance test pinning the scaffold list to core's `modelSubdirByType`, the map promotion writes into. Nothing linked the two, so they could have silently diverged.

### Rejected: flattening `product.model` onto `product.root`

The retro proposed defaulting `product.model` to `product.root`, removing the `model/` path segment on the grounds that it adds no information.

It cannot be done as proposed. `discoverModelFiles` globs `**/*.md` recursively under the model directory, ignoring only `index.md`. With `model` equal to `root`, discovery would ingest `docs/product/changes/**/*.md` — change documents and proposed future-state artifacts — and `docs/product/README.md` as baseline artifacts. That collapses the separation between the current model and proposed changes, which is the whole point of ADR 0004 and of the authority table in `docs/specification/index.md`.

The segment could be kept safe with explicit exclusions, but then `model/` is doing real work: it is what makes "everything under here is the baseline" true by construction rather than by a list of exceptions. Keeping it is the cheaper guarantee.

### Rejected: adopting the taxonomy the first adopter chose

They chose a flatter eight-directory layout (`domain/` for terms, `bounded-contexts/` alongside it, `constraints/` separate from `requirements/`). It is defensible, and the fact that it was reached independently is evidence it reads naturally. But the nested layout is already shipped, already used by this repository's 59 artifacts, and already the target of promotion. Changing it would cost a migration to buy a preference. The layout being _written down_ was the actual gap.

## Capabilities

### Modified Capabilities

- `distribution`: initialization commits the recommended layout and can opt out of it.

## Impact

- `packages/distribution`: `modelScaffoldDirs` and `changeScaffoldDirs` become exported constants.
- `docs/specification/artifacts.md` and both adoption guides.
- No change to discovery, validation or promotion behaviour.
