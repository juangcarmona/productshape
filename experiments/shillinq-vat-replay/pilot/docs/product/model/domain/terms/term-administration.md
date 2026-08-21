---
id: TERM-ADMINISTRATION
type: domain-term
title: Administration
status: active
defined-in: BC-BOOKKEEPING
synonyms:
  - administratie
  - tenant
provenance:
  source: https://github.com/ConductionNL/shillinq/blob/5841441755d8053255a33d143107ba1660e66e1c/openspec/specs/bookkeeping-multi-administratie/spec.md
  confidence: high
  recovered-from: documentation
---

## Definition

A bookkeeping entity (one set of books) managed in Shillinq. Every financial
record belongs to exactly one administration via `administrationId`. Users
hold membership in specific administrations, with a role per membership;
membership is the unit of access.

## Distinguish From

A Nextcloud user account (a user may be a member of many administrations, or
none) and an organization (one organization may run several administrations).

## Usage

All record access, queries and mutations are scoped to administrations the
acting user is a member of.
