# Tasks — scaffold-model-structure

- [x] 1.1 Replace the directory-only scaffolding with planned `.gitkeep` files, so the structure is
      committed and is accounted for like every other created file
- [x] 1.2 Verify the markers are invisible to the tooling: artifact discovery skips dotfiles, change
      discovery considers only directories
- [x] 1.3 Add `init --flat`, collapsing the per-kind directories but keeping the model directory and
      the three change lifecycle directories
- [x] 1.4 Export the scaffold lists and add a conformance test pinning them to core's
      `modelSubdirByType`
- [x] 1.5 Document the recommended layout, and its non-normative status, in the specification and
      both adoption guides
- [x] 1.6 Record the rejection of flattening `product.model` onto `product.root`, with the discovery
      collision that makes it unsafe
