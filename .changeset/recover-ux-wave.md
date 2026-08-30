---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/distribution': minor
'@prodshape/integration-openspec': patch
'@prodshape/integration-speckit': patch
---

The recover UX wave, from the first external recovery run (#196-#206, one change per lesson the run taught).

Recovery sessions grow the operations the run had to improvise: `recover unmark` retracts a wrong finding instead of leaving hand-editing session state as the only repair (#197); `recover mark --glob` / `--sources` applies one identical finding to a whole pending selection in a single state write, all or nothing (#198); the brief's ordered `tiers` drive inventory order so SDD specs and product documentation are served before source code instead of relying on path order (#199); and the brief's `git.branch` opts into checkpoint discipline, where the CLI creates the dedicated recovery branch, refuses a dirty tracked tree, and records one `recover(CHG-INITIAL): <step>` commit per state-mutating command (#205, with FR-RECOVER-001 amended by CHG-RECOVER-GIT-001 to permit exactly that and nothing more).

Artifact id lists are now validated when they are recorded: `mark --artifacts` splits on commas and whitespace and rejects anything that is not a plausible artifact id, with a hint to quote the list, because the npm PowerShell shim turns an unquoted comma list into one space-joined argument that used to be stored silently and only explode later in `recover check` (#196). `prodshape cite` accepts `SB-` ids: `emitCitation` still carried a pre-RFC-0084 pattern, and the id grammar is now derived from the canonical kind-prefix map so a future kind cannot be forgotten again (#206).

Two new canonical skills ship with their `/product:bind` and `/product:refine` commands: `bind-consumers` backfills scope declarations and citations into existing SDD consumer documents after an initial baseline, recording drift instead of fixing it, and `refine-product` runs the question-driven refinement interview whose answers become an ordinary Product Change (#202, #203). The recover-product skill is hardened where the external run stumbled (author candidates by copying templates, check after the first candidate, quote artifact lists, `SB-` in the prefix list, map evidence in the same step as creating a candidate) and its handover now offers the next moves: checkpoint commit, snapshot preview, the exact lifecycle commands, and the consumer-binding follow-up (#200, #204).

Both SDD context blocks now enumerate the whole model, bounded contexts and structured behaviours included; already-integrated repositories pick the wording up through `prodshape integration update` (#201).
