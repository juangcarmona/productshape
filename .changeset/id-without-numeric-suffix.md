---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/distribution': minor
'@prodshape/integration-openspec': patch
---

**Breaking:** artifact IDs no longer carry a numeric suffix. An ID is `PREFIX-NAME` (`UC-IMPACT`, `FR-CITE`, `BR-IDENTITY`); a number is appended only to break a tie between two IDs that would otherwise be equal, as a plain integer without padding (`FR-ORDERS-CONFIRM-2`). The identifier grammar is unchanged and still accepts `UC-IMPACT-001`, so existing models keep validating. What changes is the convention: the bundled templates, skills and examples, the ID guidance given to AI assistants, and the ProductShape model itself, whose 67 suffixed IDs were renamed (the changelog carries the map and the reason). IDs stay immutable after this one-time migration (BR-IDENTITY).

Added: `prodshape fix --id-suffixes` and a step of `prodshape integration update` migrate an existing model. They detect IDs ending in a numeric suffix, never rename into a collision (those IDs are reported and left as they are), show the plan (old to new, files renamed, references and citation digests updated), and change nothing without explicit consent: a terminal asks, scripts and CI default to a dry run unless `--apply-id-migration` is passed, and `--dry-run` reports only and exits 1 while a migration is pending. Applying updates frontmatter, relationships, file names, prose references, citations and sidecars and live Product Change overlays as one unit, re-pins only citations that were current, and rolls everything back if validation would get worse. `prodshape doctor` mentions suffixed IDs informationally.

Migration: run `prodshape integration update` after upgrading, read the plan, and either answer yes or run `prodshape fix --id-suffixes --apply-id-migration`; then `prodshape validate` and `prodshape citations verify`. To opt out, decline or never pass the flag: nothing else in the toolkit requires suffix-free IDs. Completed Product Changes, archived specs and changelog history keep the old IDs. Anything outside the model that mentions an old ID (scripts, docs, other repositories) is yours to update.
