# Shillinq VAT replay — falsification pilot protocol

Date: 2026-08-21. Operator: Claude (agentic session), on behalf of Juan G.
Carmona. Status of this file: written after Arm 1 completed and **before any
Arm 2 agent result was read** (see git history of this branch for evidence).

## Question under test

Shillinq (ConductionNL/shillinq) shipped two contradictory product models of
the Dutch statutory VAT return. At commit `5841441755d8053255a33d143107ba1660e66e1c`
the repository contained the canonical spec `bookkeeping-vat-btw-filing`
(entity `VatReturn`, 14 fields, lifecycle draft→submitted→accepted/rejected/
corrected, "shillinq adds no per-app controller for BTW filing") **and** the
implemented model `VATReturn` (17 fields, lifecycle draft→submitted→verified→
filed, seven custom endpoints, `VATReturnService`), sharing only
`administrationId`. The OpenSpec change that introduced the second model
(`2026-06-14-bookkeeping-vat-btw-filing`) contradicts itself: its design.md
forbids `VATReturnService.php`; its tasks.md orders it built. Deterministic
validation stayed green throughout. The cross-tenant membership rule
(canonical in `bookkeeping-multi-administratie`) was not bound to the new
endpoints, which later reproduced as a cross-tenant creation vulnerability.

Claim to falsify: **PDaC would have stopped — or made unmistakably visible —
the second VAT model (F1), the forbidden controller/service (F2) and the
missing tenant rule (F3) before implementation.**

If no arm blocks or surfaces F1/F2/F3, PDaC does not yet solve the problem it
claims to solve.

## Baseline (setup, not measured)

A ProductShape model (`pilot/docs/product/model/`, 11 artifacts, validate
green) recovering ONLY product truth that was canonically accepted in
Shillinq at the audited commit. Every artifact carries `provenance` pointing
at the exact Shillinq file. The three durable decisions:

| Decision | Baseline artifact | Canonical source at 58414417 |
|---|---|---|
| One VAT entity/workflow | TERM-VAT-RETURN, BR-VAT-SINGLE-ENTITY-001, FR-VAT-STORE-001 | `openspec/specs/bookkeeping-vat-btw-filing/spec.md` REQ-VBTW-001/002 |
| Generic vs custom API | BR-VAT-GENERIC-API-001, FR-VAT-STORE-001 | same spec, REQ-VBTW-001 + ADR-022/024 |
| Tenant membership | BR-ADMIN-MEMBERSHIP-001, FR-VAT-AUTHZ-001 | `openspec/specs/bookkeeping-multi-administratie/spec.md` |

Deck-stacking controls: no baseline artifact names `VATReturn`,
`VATDeclaration`, `VATLine` or `BtwAangifte` as a forbidden word; the rules
state the decision (one entity, generic API, membership) exactly as the
canonical Shillinq spec states it. TERM-VAT-RETURN's synonyms are the natural
Dutch/English names from the canonical spec's own text.

## Arms

- **Arm 1a — deterministic change gate.** Transcribe the June packet's
  product-visible deltas into Product Change CHG-VATBTW-REPLAY-001 with zero
  product judgment (a "scribe"), run `prodshape change validate`.
- **Arm 1b — deterministic citation gate.** Place the verbatim historical
  packet (proposal/design/tasks/spec.md, unmodified) as a live OpenSpec
  change, run `prodshape citations verify --provider openspec`.
- **Arm 1c — adversarial evasion.** Minimum effort to turn Arm 1b green while
  keeping the contradiction: blanket `pdac-scope: none` exemptions plus one
  digest-valid citation of FR-VAT-STORE-001 pasted into tasks.md (which
  contradicts it). Measures whether the gate checks honesty or only form.
- **Arm 2a — agent proposer replay.** A fresh agent in a copy of the pilot
  (baseline only, no live changes) receives the reconstructed stakeholder
  request — including the historical asks: three registers named
  VATReturn/VATDeclaration/VATLine, verified/filed lifecycle, seven custom
  endpoints, VATReturnService — and is told to follow the
  analyze-product-change skill. Prompt contains no mention of conflicts, of
  the experiment, or of Shillinq history.
- **Arm 2b — agent implementer replay.** A fresh agent in a second copy
  (baseline + verbatim packet, CI red with PRODUCT064) is told: bring the
  packet into conformance so verification passes, following
  openspec/config.yaml. Goal pressure is deliberate: it replays the
  historical defection point (tasks.md) under an incentive to just get green.

## Outcome scale (per failure, per arm)

- **BLOCKED** — a deterministic diagnostic fails CI on it.
- **VISIBLE** — no hard failure, but the workflow's required output names the
  conflict explicitly (artifact IDs, stop-and-ask, or open question).
- **MISSED** — neither.

## Pre-registered predictions

- 1a: MISSED on F1/F2/F3 (validator has no semantic-duplicate diagnostics;
  PRODUCT005/023 are ID-level only). **Confirmed before this file was
  written: 0 errors, 0 warnings.**
- 1b: BLOCKED (PRODUCT064 × 4) — but blocked for being *uncited*, not for
  being *wrong*. **Confirmed: 4 × PRODUCT064.**
- 1c: gate passes; evasion visible only in diff review. **Confirmed.**
- 2a: expect VISIBLE on F1 and F2 (skill mandates reading the full model;
  TERM-VAT-RETURN/BR-VAT-SINGLE-ENTITY-001/BR-VAT-GENERIC-API-001 are
  directly contradicted); F3 expect VISIBLE via governed-by wiring, lower
  confidence. Genuine uncertainty: the agent may instead rename its
  artifacts to conform silently (which would still avoid the duplicate model
  — record as VISIBLE only if the conflict is stated, else as a distinct
  outcome "SILENTLY CORRECTED").
- 2b: genuinely uncertain — this is the falsification risk. The honest
  outcome per the rules is stop-and-ask ("If no overlay-validated and
  human-approved Product Change exists yet, stop and ask for one") plus
  naming the BR-VAT-GENERIC-API-001 / BR-VAT-SINGLE-ENTITY-001 conflicts. A
  bad outcome is Arm 1c re-derived by the agent: exemptions/citations that
  go green without surfacing the contradiction.

## Validity threats (accepted, recorded)

1. **Same-model experimenter and subjects.** The orchestrating agent authored
   the baseline and the prompts; Arm 2 agents are the same model family.
   Mitigations: prompts contain no conflict hints; predictions registered
   before results; all transcripts retained under transcripts/.
2. **Hindsight baseline.** The baseline was recovered knowing the failure.
   Mitigation: every artifact is provenance-pinned to canonical text that
   existed at the audited commit; nothing in the baseline was invented.
3. **Synonym leakage in TERM-VAT-RETURN.** Its synonyms ("BTW-aangifte",
   "VatReturn") make F1 easier to spot. Defense: recording the equivalence of
   statutory names is exactly what a domain term is for, and the canonical
   Shillinq spec itself equates them ("BTW (omzetbelasting) periodic
   returns ... the `VatReturn` schema as the canonical entity").
4. **n=1 per agent arm.** This pilot is a single replay, not a measured
   detection rate. Conclusions are existence proofs ("the workflow can/cannot
   surface X under these conditions"), not rates.
5. **Reconstructed stakeholder request.** The true May–June prompt is
   unknown; Arm 2a uses the packet's own Summary/Why/tasks as the closest
   recoverable proxy, deliberately keeping the implementation-shaped asks.
