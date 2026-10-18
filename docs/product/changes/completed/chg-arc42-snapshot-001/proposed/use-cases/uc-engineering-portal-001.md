---
id: UC-ENGINEERING-PORTAL-001
type: use-case
title: Explore ProductShape engineering outputs
status: draft
primary-actor: ACT-ENGINEERING-READER
supporting-actors: []
bounded-context: BC-PUBLICATION
governed-by: []
uses-terms:
  - TERM-ARCHITECTURE-SNAPSHOT
---

## Goal

The reader understands ProductShape's published engineering outputs, their source identity and how to reach the canonical sources.

## Trigger

The reader opens the ProductShape engineering portal.

## Preconditions

- The engineering portal is available.
- The portal lists only outputs that have been produced and published.

## Main Flow

1. The reader sees distinct entries for the Product Snapshot, Architecture Snapshot and any available E2E journey reports.
2. The reader selects an output and sees its purpose and source identity, including revision or run information when available.
3. The reader follows a link to the relevant canonical source for further detail.

## Alternative Flows

- If no E2E report is available, the portal does not imply that a journey has been run or passed.
- If a source revision or run identity is unavailable for an output, the portal identifies that limitation rather than inventing one.

## Failure Conditions

- An unavailable output cannot be opened; the portal does not display a stale or partial artifact as current.
- A broken source link is presented as unavailable rather than as evidence that the projection is canonical.

## Postconditions

- The reader can distinguish Product, Architecture and E2E outputs and identify the source represented by the output.
