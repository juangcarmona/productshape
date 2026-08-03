---
id: CON-MARKDOWN-001
type: constraint
title: Canonical product knowledge lives in authored files under version control
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Constraint

All canonical product knowledge is expressed in authored Markdown and YAML files inside the repository, versioned by the repository's own version control. No database, service, wiki, tracker or any other external store holds product truth; anything outside the authored files is at most a derived, regenerable projection.

## Rationale

This boundary is deliberately fixed by the methodology itself: "as code" is the founding premise. Product knowledge kept in files gains everything source code already has — diffs, reviews, branches, history, blame and offline access — and stays equally readable to humans and AI assistants without any intermediary system. The moment truth moves into an external store, the repository becomes a copy, copies drift, and the review-based change flow the methodology is built on loses its subject.

## Consequences

- Impossible: querying or editing product truth through any system of record other than the repository; a "live" product definition that differs from the committed files.
- Harder: concurrent editing at scale and rich text or embedded media, which are limited to what Markdown in a repository can express; large models must be navigated with tooling rather than a database.
- Mandatory: every knowledge change is a file change that travels through version control review; all tooling reads and writes authored files; derived stores, caches and indexes must be reproducible from the files at any time and can never be authoritative.
