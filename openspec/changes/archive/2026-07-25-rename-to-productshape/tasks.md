# Tasks — rename-to-productshape

- [x] 1.1 Rename the npm scope `@product-definition-as-code/*` to `@prodshape/*` across every package and update all internal dependency references
- [x] 1.2 Add the primary `prodshape` binary and keep `product-definition` as a temporary v0.x compatibility alias producing identical output
- [x] 1.3 Generate the `/ps:*` alias in the Claude and Copilot renderers alongside the canonical `/product:*` namespace, and regenerate the managed assets with no drift
- [x] 1.4 Rebrand the README and documentation to present ProductShape as the reference implementation while keeping the methodology named Product Definition as Code
- [x] 1.5 Rename the GitHub repository to `productshape` and update the git remote
- [x] 1.6 Map this change's coverage evidence in `product-coverage.yaml` and run the coverage check
- [x] 1.7 Verify build, test, `validate` and `doctor` all pass on the renamed repository
- [x] 1.8 Confirm the `.product/` directory, the `product-definition-as-code/...` schema identifiers and the `PRODUCT###` diagnostic codes are unchanged
