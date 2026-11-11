---
id: UC-ID-MIGRATE
type: use-case
title: Migrate numeric ID suffixes away from an existing model
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-IDENTITY
  - BR-ID-FORM
uses-terms:
  - TERM-PRODUCT-ARTIFACT
  - TERM-CITATION
  - TERM-CURRENT-PRODUCT-MODEL
---

## Goal

An adopter whose artifact IDs end in numeric suffixes moves to suffix-free IDs in one reviewed step, with every reference, file name and citation following, or keeps the IDs they have.

## Trigger

The engineer upgrades the toolkit, or asks for the migration by name, in a repository whose model carries IDs such as `UC-IMPACT-001`.

## Preconditions

- The repository contains a product model.
- The engineer can review the plan before anything is written.

## Main Flow

1. The upgrade, or the explicit request, detects artifacts whose IDs end in a numeric suffix and computes the ID each would take without it.
2. The plan is shown: each old and new ID, the files that would be renamed, the references and citations that would be updated, and the IDs that are left alone because renaming would collide.
3. The engineer is asked for consent. An AI assistant presents the plan and asks; it never answers for the engineer.
4. On consent, the migration updates frontmatter, relationships, file names, citations, sidecars and live Product Change overlays together.
5. Validation and citation verification are re-run and report no new problem.

## Alternative Flows

- The engineer declines: nothing is changed, and the repository keeps working with its numeric suffixes.
- The run is not interactive and does not carry the explicit consent flag: the plan is reported and nothing is changed.
- The engineer asks only for the plan: it is reported, nothing is written, and the outcome is distinguishable from "nothing to migrate" so it can gate a pipeline.
- No artifact carries a numeric suffix: the engineer is told so and nothing is changed.

## Failure Conditions

- Removing a suffix would collide with another ID, or several IDs would become the same: those IDs are reported and left as they are; the rest of the plan stands.
- Validation or citation verification would be worse after the migration: every file and name is restored and the reason is reported.
- A citation was already stale or unresolved: it stays so; the migration never turns a finding into a pass.

## Postconditions

- Either every collision-free ID is suffix-free and the model validates with its citations current, or nothing changed and the engineer knows why.
- Completed Product Changes and archived specifications are untouched: they describe the past.
