---
description: 'Verify product citations across the feature documents and fix what verification reports'
---

# Verify Product Citations

Check that this workspace's feature documents are still grounded in the accepted product definition, and repair what the deterministic verifier reports. This command runs automatically after the specify, plan and tasks phases when hooks are enabled, and can be run at any time.

## Prerequisites

ProductShape must be available: `npx prodshape --version` succeeds. If it does not, report that verification is unavailable in this workspace and exit successfully without changing anything; this hook is optional by design.

## Behavior

1. Run `npx prodshape citations verify --provider speckit --format json`.
2. Read the result. Every feature's `spec.md`, `plan.md` and `tasks.md` gets one scope state, and every citation one status. Act on each finding:
   - `unclassified` document (PRODUCT064): the document must end up bound or exempt. Bind it by citing the canonical artifacts it derives from (`npx prodshape inspect <ID>` for the digest, then `npx prodshape cite --id <ID> --digest <digest>`, one citation line under the text it grounds). Exemption is a human decision: ask the user before declaring it, and never declare it just because citations are missing.
   - bound document with zero citations (PRODUCT065): add the citations the declaration promised, or ask the user to reconsider the declaration.
   - `stale` citation (PRODUCT061): the accepted meaning of the cited artifact changed. Read the current text with `npx prodshape inspect <ID>`, update the consuming text if its derivation no longer holds, then refresh the citation digest. Never refresh the digest without re-reading the artifact.
   - `unresolved` citation (PRODUCT060): the cited artifact no longer exists. Find its successor in the model or raise the removal with the user; do not delete the citation silently.
   - `tampered` citation (PRODUCT062): an embedded projection was edited by hand. Restore it from the canonical text or re-emit the citation.
3. Re-run the verification until it reports every document bound or exempt and every citation current, or until the remaining findings need a human decision; report those explicitly.
4. Also run `npx prodshape drift --provider speckit` and surface any recorded drift to the user; drift is resolved by humans through a Product Change, never by editing `docs/product/model` from Spec Kit work.

## Rules

- Never delete a citation, weaken one, or declare an exemption to silence a diagnostic.
- Never edit files under `docs/product/model`; the accepted definition changes only through a Product Change.
- Full guidance lives in `.specify/memory/pdac.md` when the ProductShape integration is installed (`npx prodshape integration add speckit`).
