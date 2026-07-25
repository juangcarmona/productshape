# Product Changes

Each subdirectory of `active/` is one Product Change: a proposed delta against the current product
model, with its complete proposed future-state artifacts under `proposed/` and its delivery slices
under `slices/`. The contract is normative in
[the specification](../../specification/product-changes.md).

- `active/` — changes being drafted, reviewed, approved or implemented. The baseline under
  `../model` never changes while a change sits here.
- `completed/` — changes that were explicitly promoted into the baseline. Kept for traceability.
- `rejected/` — changes that were declined. Kept for the record; their IDs are never reused.

Validate a change with `product-definition change validate <CHG-ID>`; promote one, after
implementation and verification, with `product-definition change promote <CHG-ID>` (dry-run
first). Promotion is always explicit and human-triggered.
