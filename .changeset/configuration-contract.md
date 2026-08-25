---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/distribution': minor
---

Adopt the normative v1alpha1 configuration contract. `.product/config.yaml` is now the kernel shape (`version`, `product-root`, `validation.warnings-as-errors`, `extensions`) validated against the vendored specification schema, with every ProductShape setting under `extensions.prodshape` (generated, integrations, citations). An invalid file produces exactly one `PRODUCT050` and exit `2` before any other work, with no fallback to defaults. Discovery walks parents for the configuration file, then applies defaults at the enclosing git root; `docs/product` alone no longer marks a root. `warnings-as-errors` now fails the command while emitted severity stays `warning` (`escalateWarnings` is replaced by `blockingDiagnostics`), and the `require-journey-for-use-case` and `require-requirement-reachability` toggles are removed because configuration cannot suppress the normative warnings PRODUCT102 and PRODUCT103. Existing repositories migrate by moving tool settings under `extensions.prodshape` and replacing the `schema` key with `version: v1alpha1`.
