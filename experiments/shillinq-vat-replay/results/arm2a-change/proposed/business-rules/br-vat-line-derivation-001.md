---
id: BR-VAT-LINE-DERIVATION-001
type: business-rule
title: VAT lines are derived from the general ledger, never authored
status: active
applies-to:
  - BC-BOOKKEEPING
  - UC-PREPARE-VAT-RETURN-001
  - UC-REVIEW-VAT-POSITION-001
---

## Rule

Every VAT line (TERM-VAT-LINE) MUST be derived from exactly one
general-ledger transaction of the same administration whose account is
marked VAT-applicable, and MUST remain traceable to that transaction. VAT
lines MUST NOT be created, edited or deleted by hand: a wrong VAT amount is
corrected in the source posting, and the affected period's lines are
re-derived. Amounts on a VAT return's rubrieken MUST equal the aggregation
of the period's derived lines.

## Rationale

The capability exists to preserve the audit trail that operators lose today
by exporting GL data into external tax software. That trail only holds if
the chain GL transaction → VAT line → rubriek → filed return is derived at
every link. A hand-edited line would make the return reconcile to nothing
and turn the filing history into an unauditable spreadsheet.

## Examples

A sales invoice posting of EUR 1,000 + EUR 210 BTW on a VAT-applicable
revenue account yields one `collected` VAT line of 210 in the posting's
period. Discovering the invoice should have been EUR 900 is fixed by
correcting the posting; re-derivation replaces the line, and the draft
return's rubriek follows. Directly editing the line from 210 to 189 is not
possible.

## Exceptions

None. Transactions on accounts that are not VAT-applicable produce no VAT
line; that is the account marking's decision, not a manual exclusion of a
line.
