---
id: BR-CHANGE-001
type: business-rule
title: Product-model changes follow the Product Change lifecycle
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Rule

Every semantic evolution of the Product Definition MUST begin as a Product Change: an explicit delta with its rationale, operations and complete proposed future-state artifacts. The change MUST validate as an overlay while the accepted baseline remains untouched, MUST receive human product approval before apply, and MUST be applied explicitly on a working branch. Apply materializes and archives the change; it does not accept it. A human merge of the pull request carrying the applied result accepts the resulting baseline. Tools MUST NOT grant product approval, merge, auto-approve or self-merge.

Product-definition work and implementation work have independent cadence. They MAY share a pull request, or implementation MAY follow in a later change, but the Product Change, its applied definition and the implementation remain distinct. Product Change status MUST NOT attest implementation, verification, release or deployment.

## Rationale

The accepted model is the record of product intent as decided today, not a delivery report. If proposed ideas could edit it directly, the baseline would stop distinguishing accepted knowledge from discussion. The Product Change preserves semantic intent before any model file moves; overlay validation proves the proposed future state structurally sound; product approval authorizes materialization; apply changes only the working branch; and merge accepts the resulting definition. Each boundary answers a different question and none can substitute for another.

## Examples

- A stakeholder reports an urgent contradiction in an active business rule. The correction becomes a Product Change, validates as an overlay, receives product approval, is applied on a branch and is reviewed before merge; urgency changes the pace, not the lifecycle.
- A definition-only pull request is merged before implementation begins. The baseline now expresses accepted intent, while implementation, verification, release and deployment remain pending delivery facts.
- Product definition and implementation share one pull request. Reviewers still assess the Product Change and applied model separately from the code, and the merge does not turn Product Change status into delivery status.

## Exceptions

None. The initial baseline enters through `CHG-INITIAL`: proposed artifacts over an empty model, overlay validation, product approval, apply, pull-request review and merge acceptance.
