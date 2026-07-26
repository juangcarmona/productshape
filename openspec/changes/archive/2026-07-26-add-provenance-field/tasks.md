# Tasks — add-provenance-field

- [x] 1.1 Define `$defs/provenance` in `common.schema.json` and reference it from all nine artifact
      schemas, in both the canonical directory and the core mirror
- [x] 1.2 Add fixtures proving the field is accepted, that an unknown sub-field is rejected, and
      that `confidence` is required when `source` is present
- [x] 1.3 Add `PRODUCT111` to the codes, to the warning table in `validation.md`, and to
      `validateModel`; not configuration-gated
- [x] 1.4 Add a warning-level fixture model (outside `invalid-models/`, which is an error inventory)
      proving only the low-confidence draft is flagged
- [x] 1.5 Amend the "MUST NOT carry metadata" rule in `artifacts.md` so the specification and the
      schemas agree
- [x] 1.6 Name the concrete field in `docs/methodology/recover.md` and the brownfield guide
- [x] 1.7 Rewrite `recover-product` step 5 to emit frontmatter, remove the obsolete
      "schemas reject unknown fields" rationale, and regenerate the managed integration files
- [x] 1.8 Add the commented guidance block to the nine artifact templates and mirror the directory
