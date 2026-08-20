# Minimal example

The smallest coherent product model: one artifact of every kind, describing a deliberately tiny imaginary product (a link-shortening service). Use it to see each contract in isolation or as a starting point for a new model. The conformance suite validates this example on every run.

Layout mirrors a consumer repository's `docs/product/model/`.

## Running the CLI against this example

The example carries its own `.product/config.yaml` (pointing `product.model` at `model/`), so it is a self-contained product repository. Validate it directly, without leaving the monorepo root:

```bash
prodshape validate --root examples/minimal
```

Or run from inside the directory — repository discovery stops at this example's own configuration instead of walking up to the monorepo's model:

```bash
cd examples/minimal
prodshape validate
```

Both runs report `0 error(s), 0 warning(s)` across the nine artifacts. `prodshape citations verify` accepts the same `--root` option. Validation refreshes `.product/generated/` here (gitignored, never canonical).
