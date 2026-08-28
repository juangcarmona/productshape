---
'@prodshape/core': minor
'@prodshape/cli': minor
---

`PRODUCT002` and parsed-configuration `PRODUCT050` diagnostics locate the failure with an escaped RFC 6901 JSON Pointer in `field`, per RFC 0085: array indexes are ordinary pointer segments, a missing or additional property is identified as though it were present, and the empty string points at the document root. `citations verify` refuses to verify against a product model with validation errors: it reports those errors and exits 1 instead of computing citation statuses over broken input (`change validate` already reports baseline errors and fails the same way; this closes the one command that silently verified against a broken model). The core API's `compareCodeUnits` is replaced by `compareCodePoints`, and the deterministic diagnostic ordering now compares by Unicode code point, the order the validation contract mandates; for ASCII output nothing changes.
