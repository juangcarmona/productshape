---
id: BC-PUBLICATION
type: bounded-context
title: ProductShape Publication
status: active
---

## Responsibility

The language of presenting ProductShape information to readers outside its repository workflow. It distinguishes the public explanation of ProductShape from read-only outputs of its engineering process.

## Language

This context uses public site, engineering portal, Product Snapshot, Architecture Snapshot, E2E report, source revision, canonical source and derived output. A snapshot or report is a projection of its source, not the source itself.

## Boundaries

The public site explains ProductShape and its process. The engineering portal exposes outputs from ProductShape's own engineering work. Product Definition remains canonical for ProductShape product intent; architecture documents remain canonical for its architecture; journey execution records remain canonical for E2E results. This context does not define ArcShape as part of ProductShape or define a cross-product dependency.

## External Relationships

Readers use these publication surfaces without participating in the repository workflow. ProductShape's repository may use ArcShape as a separate tool to generate its own architecture documentation; the products remain independently useful and independently governed.
