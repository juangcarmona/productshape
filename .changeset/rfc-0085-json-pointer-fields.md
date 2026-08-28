---
'@prodshape/core': minor
'@prodshape/cli': minor
---

`PRODUCT002` and parsed-configuration `PRODUCT050` diagnostics locate the failure with an escaped RFC 6901 JSON Pointer in `field`, per RFC 0085: array indexes are ordinary pointer segments, a missing or additional property is identified as though it were present, and the empty string points at the document root. `citations verify` now refuses to verify against a product model with validation errors: it reports those errors and exits 1 instead of computing citation statuses over broken input, the same soundness precondition `change validate` already applies to the baseline.
