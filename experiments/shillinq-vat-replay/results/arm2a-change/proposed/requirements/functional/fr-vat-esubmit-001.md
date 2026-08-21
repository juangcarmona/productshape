---
id: FR-VAT-ESUBMIT-001
type: functional-requirement
title: Submitted VAT returns are transmitted electronically to the Belastingdienst
status: active
derived-from:
  - UC-PREPARE-VAT-RETURN-001
verification:
  - scenario: Submitting a complete draft return transitions it to submitted, transmits it electronically to the Belastingdienst, and records the transmission reference (digipoortMessageId) and submittedAt on the return
  - scenario: The Belastingdienst outcome recorded against the transmission moves the return to accepted or rejected, preserving the full transmission history on the return
  - scenario: A failed transmission leaves the return with its attempt recorded and retryable by the vat-administrator; no filing state is lost
  - scenario: A submission attempt on a return with incomplete rubrieken is rejected with the missing fields named and nothing is transmitted
---

## Requirement

When a VAT administrator submits a period's VAT return, the product MUST
transmit the declaration electronically to the Belastingdienst and MUST
record on the same `VatReturn` the transmission reference
(`digipoortMessageId`), the submission time (`submittedAt`) and the
subsequent outcome (`acceptedAt`, or the rejection), so that the entire
filing history — preparation, transmission, outcome, correction — is
auditable on the single canonical entity. Transmission failures MUST be
recorded and retryable without losing lifecycle state. Only members with
the `vat-administrator` role in the administration may submit.

## Rationale

The stakeholder requires preparing and submitting VAT returns
electronically to the Belastingdienst; today operators re-key returns into
external tax software and the transmission evidence lives outside the
product. The `VatReturn` register already reserves `digipoortMessageId`
(FR-VAT-STORE-001); this requirement gives it product meaning. The choice
of channel (direct SBR/Digipoort versus an intermediary) and its relation
to BR-VAT-GENERIC-API-001's exception note remain open questions on
CHG-VAT-FILING-CAPABILITY-001.

## Acceptance Scenarios

Submit a complete draft return: state becomes `submitted`,
`digipoortMessageId` and `submittedAt` are set; simulate an accepting
outcome: state becomes `accepted` with `acceptedAt` set; simulate a
transmission failure: the return remains auditable with the failed attempt
recorded and a retry succeeds without creating a second return.
