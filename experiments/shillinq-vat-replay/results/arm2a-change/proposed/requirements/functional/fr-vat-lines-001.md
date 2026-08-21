---
id: FR-VAT-LINES-001
type: functional-requirement
title: Derive per-transaction VAT lines from VAT-applicable GL accounts
status: active
derived-from:
  - UC-REVIEW-VAT-POSITION-001
  - UC-PREPARE-VAT-RETURN-001
  - BR-VAT-LINE-DERIVATION-001
verification:
  - scenario: A GL posting on a VAT-applicable revenue account yields exactly one VAT line of type collected, carrying the transaction reference, taxable base, VAT amount, rate, administrationId and filing period
  - scenario: A GL posting on an account not marked VAT-applicable yields no VAT line
  - scenario: Correcting a source posting and re-deriving replaces the affected lines; no API or UI path creates, edits or deletes a VAT line directly
  - scenario: A non-member listing an administration's VAT lines receives a masked 404
---

## Requirement

The product MUST derive one VAT line (TERM-VAT-LINE) for the VAT effect of
each general-ledger transaction whose account is marked VAT-applicable, in
the transaction's administration and filing period. Each line MUST carry at
least: the source transaction reference, `administrationId`, the filing
period, the taxable base, the VAT amount, the applicable rate, and a VAT
type of `collected` (sales/AR), `paid` (purchases/AP) or `reverse-charge`.
Lines MUST be queryable per administration and period, and per return once
a return exists for the period. Lines MUST NOT be creatable, editable or
deletable directly; they change only by re-derivation after source postings
change. Access is bound to administration membership.

## Rationale

Tracking collected versus paid VAT by period is the substance of the
requested capability, and the derived line is the audit link between the
general ledger and the return's rubrieken that operators currently lose by
preparing returns in external tax software. Derivation-only keeps
BR-VAT-LINE-DERIVATION-001 enforceable.

## Acceptance Scenarios

Post a sales invoice and a purchase invoice on VAT-applicable accounts and
a wage posting on a non-applicable account: exactly two lines exist for the
period — one `collected`, one `paid` — each resolving to its source
transaction; the period listing for a member returns them, the same request
by a non-member returns 404.
