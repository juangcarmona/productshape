---
id: CON-SDD-AGNOSTIC
type: constraint
title: Product Definition remains independent of any SDD framework
status: active
applies-to:
  - BC-DELIVERY-INTEGRATION
---

## Constraint

The product model admits no concept, folder convention, artifact format or lifecycle state from any SDD framework. Integration with SDD frameworks happens exclusively through the Citation Contract and framework-specific integrations; nothing on the product side may assume, name or depend on a particular framework.

## Rationale

SDD frameworks are younger and more volatile than the product knowledge they help deliver, and teams choose different ones — or replace them mid-product. If a framework's concepts leaked into the product model, the product definition would inherit that framework's churn and its adopters, and switching frameworks would mean rewriting product truth that never actually changed. Fixing the boundary at the Citation Contract keeps product knowledge durable across delivery fashions and keeps every framework equally supportable through its own integration.

## Consequences

- Impossible: product artifacts that reference framework-native concepts, statuses or folders; framework-specific fields in the product model; a product lifecycle coupled to a framework's change lifecycle (archiving an SDD change can never promote a Product Change).
- Harder: exploiting a specific framework's richer native features from the product side — any such convenience must be expressed in the framework's integration, behind the contract.
- Mandatory: every framework integration is delivered as a framework-specific integration built on the Citation Contract; framework knowledge lives only in integrations; the contract is versioned so integrations can evolve without destabilizing the product model or each other.
