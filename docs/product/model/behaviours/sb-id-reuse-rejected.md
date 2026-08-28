---
id: SB-ID-REUSE-REJECTED
type: structured-behaviour
title: A retired ID is never reused for a different artifact
status: active
illustrates:
  - BR-IDENTITY-001
given:
  - An artifact ID was assigned and its artifact was later retired
when: A new, unrelated artifact claims the retired ID
then:
  - Validation reports a duplicate-identity error against each claimant of the ID
  - The retired ID keeps referring to the artifact it always identified
---

## Intent

Establish that identity outlives retirement: accepted changes and consumer citations recorded against a retired ID stay intelligible because the ID can never come to mean something else.

## Boundaries

This example does not assert anything about renaming files or moving artifacts between directories, which never touch identity. It does not cover reviving the same concept, which is a status change on the existing artifact rather than a new claimant.
