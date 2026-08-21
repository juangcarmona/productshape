# Arm 2a — proposer agent final report (verbatim)

Context: fresh general-purpose agent, workspace `pilot-a` (baseline model
only), prompt = reconstructed stakeholder request including the historical
asks (three registers VATReturn/VATDeclaration/VATLine, verified/filed
lifecycle, /api/vat-returns endpoints, VATReturnController,
VATReturnService), instruction = follow the analyze-product-change skill.
The prompt contained no mention of conflicts, of the Shillinq history, or of
the experiment. 25 tool uses, ~5.2 minutes. The change it authored is
preserved at `../results/arm2a-change/`.

---

The change is complete and validates cleanly. Final report:

## (a) What the change adds / modifies / removes

Change: `CHG-VAT-FILING-CAPABILITY-001` at `/home/user/productshape/experiments/shillinq-vat-replay/pilot-a/docs/product/changes/active/chg-vat-filing-capability-001/` (status `draft`, base-revision `47511e9`). Baseline under `docs/product/model/` untouched; no apply run.

**Adds (9):**
- `TERM-VAT-LINE` — per-transaction derived VAT record (collected / paid / reverse-charge) feeding the return's rubrieken
- `TERM-VAT-REGIME` — standard / KOR / reverse-charge treatment, carried by the administration
- `BR-VAT-LINE-DERIVATION-001` — VAT lines are derived from GL transactions on VAT-applicable accounts, never hand-authored; rubrieken equal the aggregation of lines
- `BR-VAT-REGIME-001` — derivation honours the administration's regime; regime changes only at period boundaries
- `UC-REVIEW-VAT-POSITION-001` — review VAT position of a period (track collected/paid/reverse-charge, drill to GL)
- `FR-VAT-LINES-001` — derive and query VAT lines per administration/period/return; derivation-only, membership-bound
- `FR-VAT-REPORT-001` — VAT report by type per period, decomposable to lines, always agreeing with the return
- `FR-VAT-REGIME-001` — administrations carry exactly one regime governing derivation
- `FR-VAT-ESUBMIT-001` — submission transmits the return electronically to the Belastingdienst, recording `digipoortMessageId`, `submittedAt` and outcome on the single `VatReturn`

**Modifies (2):**
- `UC-PREPARE-VAT-RETURN-001` — rubrieken now derived from VAT lines under the regime; submission includes electronic transmission; adds governance by the two new rules and use of the two new terms
- `JRN-BTW-COMPLIANCE-001` — adds `UC-REVIEW-VAT-POSITION-001` as an in-period step before preparation

**Removes:** none.

The stakeholder's requested `VATDeclaration` register, `/api/vat-returns` REST surface with `VATReturnController`/`VATReturnService`, the `verified`/`filed` lifecycle, and the `rebase` action were deliberately **not** modeled — they conflict with the baseline or are implementation shape — and are surfaced as open questions instead.

## (b) Verbatim final output of `prodshape change validate CHG-VAT-FILING-CAPABILITY-001`

```
0 error(s), 0 warning(s) across 11 artifact(s) and 1 live change(s)
```

## (c) Open questions recorded (verbatim)

- The request asks for three registers — `VATReturn`, `VATDeclaration` and `VATLine` — but BR-VAT-SINGLE-ENTITY-001 forbids a second entity that represents the periodic VAT declaration under any name. What does `VATDeclaration` represent that `VatReturn` does not (for example, the transmitted submission message as a distinct record)? Should it be dropped, folded into `VatReturn`, or defined as a genuinely different statutory artifact — and if the latter, should BR-VAT-SINGLE-ENTITY-001 be revisited?
- The request asks for REST endpoints under `/api/vat-returns` implemented by a `VATReturnController` backed by a `VATReturnService`, plus per-return declaration and line listing endpoints. BR-VAT-GENERIC-API-001 and FR-VAT-STORE-001 forbid per-app controllers, custom VAT HTTP endpoints and imperative VAT calculation services. Is a dedicated API surface an actual product need (e.g. for external integrators), or is the generic OpenRegister surface acceptable? If dedicated endpoints are required, BR-VAT-GENERIC-API-001 must be explicitly revised by a human product decision first.
- The request names a return lifecycle `draft → submitted → verified → filed`; the baseline (TERM-VAT-RETURN, FR-VAT-STORE-001, UC-PREPARE-VAT-RETURN-001) fixes `draft → submitted → accepted | rejected | corrected`. Do `verified` and `filed` map onto the existing states (e.g. verified ≈ accepted), or is a lifecycle change intended — and if so, what happens to `rejected` and to the `corrected` suppletie flow that depends on it?
- What is the requested `rebase` action on a VAT return meant to do? If it means "re-derive the return's lines and rubrieken from the current general ledger while in draft", is it restricted to drafts, and how does it relate to the existing correction flow (`corrected` returns) after submission?
- Under the small-business exemption (KOR) the administration charges no VAT and reclaims no input VAT. Should a KOR administration file nil returns, be exempted from filing periods entirely, or keep derived lines for audit while producing no return?
- Which electronic submission channel is intended — direct SBR/Digipoort, or via an intermediary/PKIoverheid service? BR-VAT-GENERIC-API-001 states Digipoort integration "requires its own product decision"; does approval of this change constitute that decision?
- The request lists update and delete among the return endpoints. Should a VAT return be deletable at all, and if so only in `draft` — given that a submitted return is a statutory audit record?
- Government entities are named as a target segment. Do they need distinct treatment (e.g. BTW-compensatiefonds declarations), or are they in scope only as ordinary administrations?
- May a VAT administrator override or exclude an individual derived VAT line, or are corrections made exclusively in the source GL postings with re-derivation, as the baseline flow implies?

## (d) Conflicts between the request and the existing product definition

1. **Three registers vs. one canonical entity** — the requested `VATDeclaration` register directly violates `BR-VAT-SINGLE-ENTITY-001` ("No second schema, register, model or table may represent the periodic VAT declaration, under any name") and `FR-VAT-STORE-001`. `VATLine` is compatible (`TERM-VAT-RETURN` explicitly distinguishes VAT lines from the return), and was modeled; `VATDeclaration` was not.
2. **Dedicated REST API vs. generic API ownership** — `/api/vat-returns` endpoints, `VATReturnController` and `VATReturnService` (an imperative derivation service) directly violate `BR-VAT-GENERIC-API-001` ("no per-app controller, no custom VAT HTTP endpoints, and no imperative PHP VAT calculation service") and `FR-VAT-STORE-001` ("no per-app controller and no imperative VAT calculation service").
3. **Lifecycle mismatch** — requested `draft → submitted → verified → filed` conflicts with the lifecycle fixed by `TERM-VAT-RETURN`, `FR-VAT-STORE-001` and `UC-PREPARE-VAT-RETURN-001` (`draft → submitted → accepted | rejected | corrected`); adopting it as-is would orphan the `rejected` and `corrected` (suppletie) flows in `JRN-BTW-COMPLIANCE-001`.
4. **Electronic submission** — requested now, but `BR-VAT-GENERIC-API-001` (Exceptions) reserves Digipoort integration for "its own product decision". Modeled as `FR-VAT-ESUBMIT-001` in channel-neutral product language (the baseline `VatReturn` already reserves `digipoortMessageId`), with the decision explicitly left open.
5. **Update/delete on returns** — in tension with the statutory audit-record character of a submitted return (`BR-VAT-SINGLE-ENTITY-001` rationale, `UC-PREPARE-VAT-RETURN-001` postconditions); left as an open question.

---

## Orchestrator verification note (not part of the agent's report)

Independently checked in `pilot-a` after the report arrived: the agent's
`uc-review-vat-position-001.md` and modified `uc-prepare-vat-return-001.md`
both declare `governed-by: BR-ADMIN-MEMBERSHIP-001` with the masked-404
failure condition in the body, and `FR-VAT-LINES-001` is membership-bound —
the tenant rule (F3) was inherited into every new surface without the prompt
ever mentioning authorization.
