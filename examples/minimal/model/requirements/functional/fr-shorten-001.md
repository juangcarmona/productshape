---
id: FR-SHORTEN-001
type: functional-requirement
title: Issue a resolving short link for every accepted URL
status: active
derived-from:
  - UC-SHORTEN-001
  - BR-VALID-URL-001
verification:
  - scenario: Submitting a well-formed URL returns a short link that resolves to it
  - scenario: Submitting a malformed URL is rejected with a reason
---

## Requirement

For every accepted URL, the service MUST issue a short link that resolves to exactly that URL.

## Rationale

Resolution is the whole value of a short link.

## Acceptance Scenarios

A well-formed URL yields a working short link; a malformed URL is rejected with a reason.
