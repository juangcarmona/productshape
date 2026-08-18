---
id: CHG-RELEASE-CONTRACT-001
type: product-change
title: Make the released CLI and public guidance one executable contract
status: applied
base-revision: '0170f81f95ac7515a5401356da330749228da207'
operations:
  add:
    - FR-RELEASE-001
  modify:
    - UC-INIT-001
    - FR-SNAPSHOT-004
    - QR-SCALABILITY-001
  remove: []
---

## Problem

The supported CLI release and the public guidance can describe different command surfaces. A user can copy a primary example that the package identified as current cannot execute, and the CLI cannot report which package version is actually running. Canonical snapshot requirements also repeat model-size observations that drift whenever the model changes.

## Intended Product Outcome

The public quickstart identifies an exact supported CLI release and every command in it executes against that release. Each installed or packed CLI reports its package version through `prodshape --version`, and the release gate proves the documented initialization and citation-drift workflow from a clean tarball installation. Unreleased behaviour is explicitly marked. Model-size evidence is derived during measurement rather than copied into canonical requirements.

## Rationale

Installation instructions, CLI behaviour and release notes are one public contract. Testing them separately permits each to be internally correct while the user-visible workflow is broken. Deriving the version from package metadata and executing the published workflow against the packed artifact removes both duplicate version state and workspace-only assumptions.

## Affected Product Areas

Repository adoption, CLI release identity, public quickstart verification, and snapshot measurement evidence.

## Open Questions

None.

## Product Acceptance

Accept when the overlay validates cleanly and states that an exact supported package, its primary quickstart, packed installation, version output, citation verification and stale detection form one executable release contract, while model counts are measured rather than manually maintained.

## Out of Scope

Publishing an npm package, deploying the website, adding unrelated CLI behaviour, weakening validation, or changing Product Snapshot search and scalability behaviour.
