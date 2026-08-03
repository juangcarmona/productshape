---
id: UC-SCHEMA-001
type: use-case
title: Discover the allowed frontmatter for an artifact kind
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors: []
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-IDENTITY-001
uses-terms:
  - TERM-PRODUCT-ARTIFACT
---

## Goal

An authoritative answer to "what may I write in the frontmatter of this artifact kind?", obtained
before authoring rather than discovered from validation errors.

## Trigger

The Product Engineer is about to author or recover an artifact and needs to know which properties
the kind accepts — typically because the knowledge they hold does not obviously map onto a field
they have seen in a template.

## Preconditions

- None. The answer describes the artifact contracts themselves, so it does not depend on a product
  model existing.

## Main Flow

1. The engineer asks for the contract of one artifact kind, by the kind's name or by its ID prefix.
2. The required properties are listed with their types and, where constrained, their permitted
   values or identifier patterns.
3. The optional properties are listed the same way, including nested properties and the contract of
   array elements.
4. The required body sections for the kind are stated, in order.
5. The answer states that the frontmatter is closed: an unrecognised property is rejected rather
   than ignored.
6. The answer names where the same contract is documented in full.

## Alternative Flows

- The engineer asks without naming a kind: every kind is listed with its identifier prefix, so the
  right one can be chosen and asked about.
- The engineer wants the answer for another tool rather than to read: it is available in a
  machine-readable form under a stable schema identifier.

## Failure Conditions

- An unrecognised kind: the request is reported as an invalid request, listing the kinds that exist,
  rather than answered with a guess or with a fact about the model.

## Postconditions

- The engineer knows every property the kind accepts and can author without trial and error.
- The repository state is unmodified.
