---
'@prodshape/core': minor
'@prodshape/cli': minor
---

Enforce the citation carriers per the frozen citation contract, with the normative `PRODUCT067`. The payload grammar is closed (`id`, `digest`, optional `anchor`, in that order, double-quoted, nothing else) and a malformed `pdac:cite` candidate is reported at its line instead of disappearing as prose. Sidecars are validated against the normative `citation-sidecar` schema: one YAML document, exactly one non-empty `citations` sequence of closed records, no forbidden YAML features; a malformed sidecar file is one diagnostic and its consumer file must exist. A consumer using both payloads and a sidecar gets one `PRODUCT067` with the citation statuses of both carriers suppressed until resolved, and a consumer document now reads its adjacent sidecar directly. `parseCitations` returns `{ records, diagnostics, suppressed }` and `scanCitations` returns `{ records, diagnostics }`. The never-emitted `unsupportedOpenSpecStore` code is retired; legacy brace citations and bare-sequence ledgers remain readable as non-conforming extensions.
