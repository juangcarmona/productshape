# The divergence is in the canonical specs, not just the archive

Correction and strengthening of the evidence base for this pilot.

Earlier framing rested part of the case on an **archived** OpenSpec change
whose `design.md` forbade `VATReturnService.php` while its `tasks.md`
ordered it built. That is weak evidence and was rightly challenged: an
archive is a historical record of what was once proposed. It carries no
obligation to remain true, and a contradiction inside it can legitimately
have been resolved later.

The layer that carries the obligation is `openspec/specs/` — the canonical
capability specs. Those must not diverge.

**They diverge.** Verified in `ConductionNL/shillinq` at both the audited
snapshot `5841441755d8053255a33d143107ba1660e66e1c` (2026-08-08) and the
current `origin/development` head `4382edcede36d8c0e4fe7ab97cc9faa01bf09f53`
(2026-08-21), across 160 canonical spec files.

## 1. One canonical file forbids and requires the same thing

All of the following live in a single file:
`openspec/specs/bookkeeping-vat-btw-filing/spec.md`.

**It forbids the service and the controller** — REQ-VBTW-001 (L25–33):

> BTW (omzetbelasting) periodic returns MUST be declared as a register ...
> with the `VatReturn` schema as the canonical entity. No custom PHP model,
> no custom database table, no parallel storage ... The register is exposed
> through OpenRegister's generic CRUD HTTP surface; shillinq adds no
> per-app controller for BTW filing.

with a verification scenario (L48–52) demanding "no shillinq-side
controller in the call path", and REQ-VBTW-005 (L181–183):

> Per ADR-031 anti-pattern list, shillinq MUST NOT author a
> `VatReturnService::transition*` method. The lifecycle is the only state
> machine.

**It requires the service and the second model** — REQ-VBTW-013 (L412–422),
about 380 lines later in the same file:

> `VatSuppletieDetectionService::detect()` MUST accept a filed (submitted or
> later) `VATReturn` id, recompute the same GL-derived per-rubriek grouping
> `VATReturnService::deriveVATLines()` produces ... and diff it
> bucket-by-bucket against the `VATDeclaration` rows already persisted for
> that return ... and MUST NOT mutate the original `VATReturn`, its
> `VATDeclaration`s, or its `VATLine`s.

REQ-VBTW-014 continues on the same footing (`VatCorrection` compiled from a
`VATReturn`). So canonical text mandates, as MUST, the all-caps entity
cluster and the very service that canonical text forbids two requirements
earlier. This is not drift between canon and code. It is canon against
canon, inside one file, in force at the same commit.

## 2. Canonical text knowingly records the contradiction — and cites the archive to explain it

The same file's Notes section (L510–514):

> This delta bridges a pre-existing dual-schema situation
> (`VATReturn`/all-caps vs. `VatReturn`/mixed-case) documented in
> `design.md`; `originalVatReturnId` on the compiled `VatCorrection` points
> at the all-caps `VATReturn.id` **because that is the only schema with
> real, computed per-rubriek data today.**

Three things are admitted here in canonical text: that two schemas model
one concept; that the officially canonical `VatReturn` is the empty one;
and that the explanation lives in `design.md` — a document inside an
archived change. Canonical truth defers to the archive to account for its
own inconsistency, which inverts the direction authority is supposed to
flow.

The file header shows the mechanism. It lists three contributing changes,
the last being `btw-suppletie-detection` _(archived 2026-07-13)_ — the
change that contributed REQ-VBTW-013/014. The archived change's
contradiction was **promoted into canon** by a spec merge that added new
requirements without reconciling them against REQ-VBTW-001 and
REQ-VBTW-005. Archiving is where the divergence was laundered into
canonical text.

## 3. Two more canonical specs are built on the forbidden model

- `openspec/specs/bookkeeping-aansluitingen/spec.md`, REQ-AANS-007
  (L228–231): "Source A MUST be
  `VATReturnService::computeCurrentDeclarations()`'s live BTW-grootboek
  recompute; source B MUST be `VATReturnService::fetchFiledDeclarations()`'s
  as-filed snapshot for the same `VATReturn`." A second canonical spec
  mandates the forbidden service by name, twice, as MUST.
- `openspec/specs/accountant-portal/spec.md` (L43–44): status cards are
  composed from "the most recent `VATReturn`'s `statusCode` plus a
  statutory one-month filing deadline ... when not yet `filed`". This
  consumes the all-caps model's field name (`statusCode`) and its lifecycle
  vocabulary (`filed`) — neither exists in the canonical `VatReturn`, whose
  declared states are `draft`/`submitted`/`accepted`/`rejected`/`corrected`
  under a `state` field.

Name distribution across the 160 canonical specs: `VatReturn` appears in 6,
`VATReturn` in 3, and two specs (`bookkeeping-vat-btw-filing`,
`bookkeeping-aansluitingen`) use both spellings for the two different
things.

## 4. After the repair, canon names an entity that no longer ships

The collision repair renamed the all-caps schema to `BtwAangifte` in code.
At HEAD:

- `BtwAangifte` is a shipped schema and appears in **zero** canonical specs.
- `VATReturn` appears in **3** canonical specs and is **no longer** a
  shipped schema.

So the entity that carries the real VAT data has no canonical coverage at
all, and three canonical specs still place MUST obligations on a schema
name that no longer exists. The repair moved the code and left canon
behind — the same failure to reconcile, one layer up.

## 5. Referential integrity of the specs folder (measured, not inflated)

Checked with a link resolver over all 160 canonical spec files, because a
figure of "19 references to a spec that never existed" was circulating and
should not be repeated unverified:

- 18 markdown links; 4 genuinely broken, all pointing into
  `../../changes/portal-contribution/` (a change directory that is gone).
  Two further hits were external issue URLs, not broken paths.
- 46 `specs/<name>` path references; 5 name specs that do not exist:
  `validations`, `bookkeeping-quote-order-invoice`,
  `grant-subsidy-management`, `multi-currency`, `accounts-receivable-core`.

**I could not reproduce the "19 references" figure in the specs folder.**
Minor referential rot exists (9 dangling references in total); it is not
the headline, and the headline does not need it.

## What this changes for the pilot

1. **The evidence is stronger and cleaner.** The case no longer depends on
   an archive being read as if it were binding. The contradiction is in the
   authoritative layer, at the audited commit, still live today.

2. **The recovered baseline picked one side of a canonical contradiction.**
   `pilot/docs/product/model/` was built from REQ-VBTW-001/002 and
   `bookkeeping-multi-administratie`, i.e. the half of canon saying *one
   entity, generic API, membership-scoped*. Canon simultaneously said the
   opposite in REQ-VBTW-013/014 and in two other specs. The baseline is
   therefore not a neutral transcription of canon — it is canon **with the
   contradiction resolved in favour of the stated product decision**.
   Recorded as a validity threat: the Arm 2 agents were held to an
   internally consistent model, which the real repository never had.

3. **A new honest limit, and it is the important one.** Arm 1a already
   showed `prodshape validate` has no semantic-contradiction diagnostics.
   This finding shows the failure mode it would miss is exactly the one
   that actually happened: *the authoritative layer contradicting itself*.
   Nothing in PDaC's deterministic machinery would stop a
   `BR-VAT-GENERIC-API-001` ("no per-app controller") and a later
   `FR-SUPPLETIE-DRIFT-001` ("MUST call `VATReturnService::deriveVATLines()`")
   from coexisting in an accepted baseline. Being one graph with typed edges
   makes the two artifacts *reviewable together* — the historical repo had
   them 380 lines apart in one file and nobody noticed — but reviewability
   is not enforcement.

   So the recommendation list from REPORT.md gains a third item, ranked
   first: **a contradiction check between accepted artifacts** — at minimum,
   flag when a new requirement's text names an implementation artifact that
   an accepted business rule prohibits by name. The `audit-product-model`
   skill is the natural place for the semantic version; a mechanical
   name-based prohibition check is cheap and would have fired here.
