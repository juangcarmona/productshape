---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/distribution': minor
---

Conformance and robustness polish (issue #65).

- **The diagnostic registry now tracks a pinned spec revision.** `docs/specification/.source.json` records the spec commit the local code tables are checked against, `pnpm registry:sync` vendors the normative code-to-severity extract as `docs/specification/.spec-registry.json`, and the conformance test compares the local tables and every emission against it instead of against themselves. Codes ProductShape issues beyond the normative registry (`PRODUCT070`–`PRODUCT075`) are declared explicitly, so divergence is a reviewed decision rather than a silent one. The precise extraction also surfaced a real gap: `PRODUCT061` (stale citation) was explained in prose but had no row in the warning-code table, and now has one.
- **`citations verify` consumer roots are configurable.** The scan root was hardcoded to `openspec/`, so a repository keeping its consumer documents anywhere else had to name the directory on every invocation. `citations.consumer-roots` (default `['openspec']`) now names the directories scanned when no target is given, several may be listed, and a configured root that does not exist is an error rather than an empty pass. The JSON result reports `targets` (the list actually scanned) in place of the single `target` field.
- **`validate` no longer writes as a side effect.** A read-only verdict mutated the tree to produce it, leaving untracked `.product/generated` directories wherever it ran — including inside other repositories' conformance fixtures. Generation is now opt-in via `validate --write-generated`; `prodshape graph` remains the dedicated generator.
- **`change list --all` help text** now names the `superseded` history it has always included.
- **`PRODUCT108` section matching is exact.** The Open Questions heading is anchored to a line start and to exactly two hashes, so a `### Open Questions` subsection of another section is no longer read as the change's own, and list items inside fenced code blocks are no longer counted as open questions.
- **`PRODUCT025` compares every pair of changes.** Self-exclusion matched on `id`, so two changes both missing an `id` skipped each other and a real overlap disappeared behind the missing-id defect. Identity is now the change document.
