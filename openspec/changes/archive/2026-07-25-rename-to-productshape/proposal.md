# Rename to ProductShape

## Why

The Product Handoff HOF-GITHUB-2 (see `product-handoff.yaml` and `product-context.md` in this change) delivers slice SLI-BRAND-001 of Product Change CHG-BRAND-001: the branding decision that fixes ProductShape as the public brand of the reference implementation while "Product Definition as Code" remains the name of the methodology. The reference implementation needs its public ProductShape identity to ship, and it must gain that identity while every existing semantic keeps working. This change implements CON-BRAND-001 by renaming the public surfaces and preserving the methodology's contracts unchanged.

## What Changes

- Rename the npm scope `@product-definition-as-code/*` to `@prodshape/*` across all packages (e.g. `@prodshape/core`, `@prodshape/cli`, `@prodshape/openspec`, `@prodshape/claude`, `@prodshape/copilot`).
- Make `prodshape` the primary CLI binary, keeping `product-definition` as a temporary v0.x compatibility alias that produces identical output.
- Keep `/product:*` as the canonical command namespace and generate an optional `/ps:*` shorthand alias (`/ps:change`, `/ps:impact`, `/ps:handoff`) in the Claude and Copilot renderers.
- Rename the GitHub repository to `productshape` and update the git remote.
- Present the ProductShape brand in the README and documentation title and public references; the methodology name stays "Product Definition as Code" and the two read as distinct layers.
- Deliberately unchanged (semantics preserved, not part of the brand):
  - the `.product/` configuration directory,
  - the `product-definition-as-code/...` schema identifiers and their URN form,
  - the `PRODUCT###` diagnostic codes.

## Capabilities

### New Capabilities

- `public-brand`: The ProductShape public identity of the reference implementation, with all existing methodology semantics preserved.

### Modified Capabilities

_None._

## Impact

- Packages: npm scope and package names move to `@prodshape/*`.
- CLI binary: `prodshape` becomes primary; `product-definition` stays as a temporary v0.x alias.
- Generated assets: Claude and Copilot renderers gain the `/ps:*` alias and are regenerated with the ProductShape brand, with no managed-file drift.
- Repository: renamed to `productshape`; the git remote is updated.
- Docs: README and documentation title present ProductShape as the reference implementation of the Product Definition as Code methodology.
- Preserved: the `.product/` directory, the `product-definition-as-code/...` schema identifiers and the `PRODUCT###` diagnostic codes name the methodology's contracts, not the brand, and are left unchanged. Implements product requirement CON-BRAND-001 (CHG-BRAND-001 / SLI-BRAND-001); see the sidecar handoff for the full product context and digests.
