---
'@prodshape/core': minor
'@prodshape/cli': minor
---

Citation status precedence: tampered wins over stale, and the JSON envelope carries diagnostics

The specification determined the citation status precedence (spec PR #19, closing spec issue #17): invalid digest, unresolved target, unresolved anchor, tampered, stale, current, first match wins, and a citation carries the diagnostic of its status and no other.

`verifyCitation` previously gated the tamper check on the target's digest still matching the recorded one, so a hand-edited embedded projection whose cited target had also changed fell through to staleness. A citation that used to report `stale` (`PRODUCT061`, a warning, exit `0`) for that combination now reports `tampered` (`PRODUCT062`, an error, exit `1`). A consumer pipeline that was green on this combination can turn red; that is the point of the fix, since the defect it now surfaces was there all along.

`prodshape citations verify --format json` now carries a `diagnostics` array alongside `citations` and `summary`, escalated the same way `validate` and `change validate` already report theirs. The array was already computed and spent only on summary counts, so `PRODUCT042` and `PRODUCT060` through `PRODUCT063` were unreachable to any machine reader of the citations command. They are reachable now.
