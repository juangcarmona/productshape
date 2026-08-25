---
id: BR-VALID-URL-001
type: business-rule
title: Only well-formed absolute URLs are shortened
status: active
applies-to:
  - UC-SHORTEN-001
---

## Rule

The service shortens a URL only when it is a well-formed absolute web address.

## Rationale

A short link to a malformed address would fail for everyone who receives it.

## Examples

`https://example.org/a/very/long/path` is accepted; `not-a-url` is rejected.

## Exceptions

None.
