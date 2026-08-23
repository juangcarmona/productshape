---
id: CHG-SPECKIT-002
type: product-change
title: 'Distribute the Spec Kit integration as a Spec Kit extension'
status: applied
base-revision: '0dd6320d1c45807913a6b0297892a158984cf4f2'
operations:
  add: []
  modify:
    - FR-SPECKIT-001
  remove: []
---

## Problem

FR-SPECKIT-001 defines the Spec Kit integration's mechanisms and its write-surface boundary, but says nothing about distribution through Spec Kit's own extension mechanism. Spec Kit ships an extension system (installable commands, catalogs, and hooks that run a command after the specify, plan and tasks phases). Without a stated position, packaging the integration as an extension would either happen outside the accepted definition or be read as widening the boundary, and in-loop verification (running the citation gate right after each generation phase, inside the session that can fix findings) would remain undefined even though the mechanism exists.

## Intended Product Outcome

FR-SPECKIT-001 states that the integration may additionally be distributed as a Spec Kit extension providing a context command, a verification command and optional post-phase hooks, all over the same deterministic operations. The extension gains no write authority over the product model, does not alter verification semantics, and its hooks are optional so a workspace without ProductShape keeps working. The write-surface boundary already stated by the requirement is explicitly unchanged.

## Rationale

The extension mechanism is Spec Kit's native distribution and automation surface, and hooks are the only way to run verification inside the generation loop rather than after it in CI. Stating the extension in the requirement keeps the integration's boundary authoritative over every distribution form: a reader of FR-SPECKIT-001 alone can tell what an extension may and may not do.

## Affected Product Areas

Delivery integration (BC-DELIVERY-INTEGRATION): FR-SPECKIT-001 only. The citation contract, the context projection (FR-CONTEXT-001, UC-CONTEXT-001) and the OpenSpec integration are untouched. Nothing is added or removed.

## Open Questions

None.

## Product Acceptance

FR-SPECKIT-001 carries an S8 scenario naming the extension's commands, its optional post-phase hooks, its no-write-authority boundary and its graceful no-op in a workspace without ProductShape, and a paragraph stating that distribution through an extension changes nothing about the write-surface boundary.

## Out of Scope

The extension implementation itself (extensions/speckit-pdac: manifest, command files, README and tests) follows this change; it is not part of it. Publishing to a Spec Kit catalog and any community announcement are distribution work outside the Product Definition. No diagnostic code is introduced, retired or renumbered.
