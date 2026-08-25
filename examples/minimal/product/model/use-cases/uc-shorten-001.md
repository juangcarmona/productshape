---
id: UC-SHORTEN-001
type: use-case
title: Shorten a URL
status: active
primary-actor: ACT-VISITOR
bounded-context: BC-SHORTENING
governed-by:
  - BR-VALID-URL-001
uses-terms:
  - TERM-SHORT-LINK
---

## Goal

The visitor obtains a short link for a long URL.

## Trigger

The visitor submits a URL to be shortened.

## Preconditions

None.

## Main Flow

1. The visitor submits a URL.
2. The service validates it (BR-VALID-URL-001).
3. The service returns a short link.

## Alternative Flows

None.

## Failure Conditions

An invalid URL is rejected with a message naming what is wrong.

## Postconditions

The short link resolves to the submitted URL.
