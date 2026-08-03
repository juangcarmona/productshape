---
id: CON-BRAND-001
type: constraint
title: The reference implementation is branded ProductShape; the methodology remains Product Definition as Code
status: active
---

## Constraint

The methodology is named "Product Definition as Code" and retains that name. Its reference implementation is publicly branded "ProductShape" — the name under which the toolkit is distributed and the public identity it presents. Public identity MUST keep the two distinct: "Product Definition as Code" names the ideas, the normative specification and the versioned contracts; "ProductShape" names the tool and the namespace under which it ships. No public-facing surface may present ProductShape as the methodology or "Product Definition as Code" as a product name, and the reference implementation MUST NOT ship publicly without this settled brand. The concrete distribution identifiers chosen for ProductShape are recorded in the adopting Product Change and realized in implementation; this constraint fixes the policy, not the mechanics.

## Rationale

A methodology and an implementation of it are different things with different lifecycles and audiences. The methodology is a set of ideas and a specification that could be implemented more than once; the reference implementation is one shipped toolkit that must claim a brand, a package namespace and a release channel to exist publicly. Fixing the brand as a distinct layer above the methodology name lets the tool carry a memorable public identity — which shipping requires — without binding the methodology's contracts to it, and keeps either free to evolve without dragging the other. It settles, deliberately and on the record, a naming decision that was left open precisely so it would not harden into an accidental brand at first publish.

## Consequences

- Impossible: shipping the reference implementation publicly without a settled brand; presenting "Product Definition as Code" as the name of a product; presenting "ProductShape" as the methodology rather than as an implementation of it.
- Harder: nothing structural — but the two-name discipline must be maintained wherever both names appear, so documentation and public copy carry a small, permanent editorial obligation.
- Mandatory: the public brand of the reference implementation is ProductShape; the methodology name is used for the ideas, the specification and the contracts; and the distinction is made explicit wherever a reader could otherwise conflate them.
