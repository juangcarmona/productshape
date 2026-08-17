---
id: ACT-PRODUCT-ENGINEER
type: actor
title: Product Engineer
status: active
actor-kind: human
---

## Purpose

The Product Engineer defines and evolves what the product is. They turn intent, discussion and discovery into explicit product artifacts, and they carry every semantic modification through the change flow so the product definition stays the single trustworthy account of the product.

## Goals

- Keep a coherent, traceable product definition in which every requirement can be followed back to the actors, journeys, use cases and rules it serves.
- Express every intended modification as an explicit, reviewable Product Change rather than as an unrecorded edit.
- Keep delivery work grounded in accepted product intent through citations, without coupling the definition to one delivery process or cadence.
- Keep open questions visible until a human answers them.

## Responsibilities

- Author and refine product artifacts: actors, journeys, use cases, rules, terms, contexts and requirements.
- Inspect artifacts and analyze structural impact before proposing modifications.
- Create Product Changes with complete proposed artifacts, rationale and open questions.
- Add citations to consumer documents and verify that they still resolve to the intended product content.
- Keep product-definition work and implementation work distinct even when they share a pull request.
- Run validation regularly and resolve the diagnostics it reports.

## Boundaries

- Does not equate authoring a Product Change, applying it on a working branch or merging its result; product approval and baseline acceptance are separate human decisions.
- Does not own or edit the native artifacts of the configured SDD framework; the citation boundary separates product definition from delivery specification.
- Does not maintain reverse relationships by hand; derived views come from tooling.
