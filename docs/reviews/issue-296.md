# Issue #296 — ProductShape publication surfaces

Date: 2026-10-19. Work item: [#296](https://github.com/juangcarmona/productshape/issues/296). Implementation: [PR #297](https://github.com/juangcarmona/productshape/pull/297), merged as `632670261100b46751d6aa3eefd1b099986169d5`. Completion and handoff: [#300](https://github.com/juangcarmona/productshape/issues/300) and [PR #301](https://github.com/juangcarmona/productshape/pull/301).

## Post-merge result

The public ProductShape site and engineering portal were separated and validated. The engineering portal retained source-aware Product Snapshot, Architecture Snapshot and optional E2E boundaries; the public site retained its independent content and diagram purpose. The follow-up completion work validated profile boundaries, navigation, source metadata, responsive behavior, generated Snapshot preservation and the Cloudflare handoff. Main CI, publication builds, conformance checks and runtime evidence passed for the delivered implementation.

Production Cloudflare upload, account/project confirmation, DNS and `productshape.dev` activation remain owner-controlled and were not claimed as completed. These are operational follow-up actions, not an implementation defect.

## Three reflections

1. **What worked:** the publication surfaces were delivered as separate static profiles while preserving canonical Product Definition and architecture sources. Source metadata, route/profile validation and runtime evidence made the boundary reviewable.
2. **What did not:** the umbrella issue remained `status:in-progress` after its implementation PR merged, and its OpenSpec deltas and retrospective were not reconciled at the same time as completion. The closeout is correcting that process drift.
3. **What to change next time:** close the umbrella tracker item, sync accepted OpenSpec deltas, archive the plan and create the per-item retrospective as part of the integration closeout rather than leaving those as separate debt.

## Effort

Human active time: **not captured**. Agent active time: **not captured**. Cost: **not captured**. Tokens: **not captured**. Source: no configured agent-telemetry location or session-to-work-item mapping was available; no collector was started and no effort was estimated.

## Amendments

**None.** The closeout gap is addressed by this retrospective, specification reconciliation and tracker cleanup. No lifecycle, Ready/Done or role amendment is proposed.
