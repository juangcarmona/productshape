# Shop example

A small online shop described as a product model: 39 artifacts covering catalogue, cart, checkout, payment, order tracking, cancellation and refunds. It is the model behind the refund-window demo on [pdac.dev](https://pdac.dev/) (`BR-REFUND-001`, a 30-day refund window).

The public site generates its example Product Snapshot from this directory on every build and serves it at `/en/explore/`.

Layout mirrors a consumer repository: the model is under `docs/product/model/`, and `openspec/`, `.agents/`, `src/` and `tests/e2e/` hold consumer documents that cite the refund rule and its behaviours. The C# and Gherkin files are illustrations for the citations; there is no application to build or run.

## Running the CLI against this example

```bash
prodshape validate --root examples/shop
prodshape citations verify --root examples/shop
cd examples/shop && prodshape graph --format html --product-name "Example shop"
```

Validation reports `0 error(s), 0 warning(s)` across the 39 artifacts and every citation is `current`. The conformance tests check both on every run.

## Identifiers

`BR-REFUND-001` keeps its numeric suffix because the published drift demo uses that ID. `SB-REFUND-001` and `SB-REFUND-002` keep theirs because removing the suffix would make them collide. The other artifacts use IDs without a numeric suffix.

## Formatting

The files are kept byte-for-byte as authored, and the repository formatter skips this directory: reformatting a cited artifact changes its digest and turns its citations stale.
