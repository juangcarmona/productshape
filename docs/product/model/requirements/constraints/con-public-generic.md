---
id: CON-PUBLIC-GENERIC
type: constraint
title: The public framework stays generic and free of private context
status: active
---

## Constraint

The public framework — specification, toolkit, templates, skills, fixtures and documentation —
contains no corporate processes, no private product details, no private prompts and no
organization-specific terminology. Learnings from real adoptions flow back only in generic form:
as generic issues, synthetic fixtures or sanitized documentation.

## Rationale

The framework is developed in the open while being exercised on real products inside real
organizations. Those two facts must never mix: private product knowledge leaking into a public
repository is a confidentiality breach, and organization-specific vocabulary or process baked into
the framework would silently narrow it until it fits only its first adopters. Fixing this boundary
protects the organizations that self-apply the framework and protects the framework's claim to be
generally adoptable.

## Consequences

- Impossible: committing real product artifacts, internal process descriptions, private prompts,
  customer names or organization-specific terminology to the public repository; using a real
  private model as a test fixture or documentation example.
- Harder: feeding adoption experience back — every lesson must first be translated into a generic
  issue, a synthetic fixture reproducing the structural situation, or sanitized documentation,
  which costs effort and loses some specificity.
- Mandatory: examples and fixtures are synthetic; contributions from private adoptions are
  reviewed for leaked context before they land; the framework's vocabulary stays the methodology's
  own, never an adopting organization's.
