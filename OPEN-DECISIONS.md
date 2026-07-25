# Open Decisions

This file lists only the decisions that are currently **open**. Each entry says why the decision
matters and the interim position held until it is made.

When a decision is made, its entry is **removed** — not marked "resolved" and kept. The decision
then lives in the one artifact that enforces it: a promoted product constraint for product
decisions, the code and configuration for implementation decisions, or the Git history for the
reasoning. It is never duplicated back into this file, so this list stays short and true to its
name. Entry IDs are stable and are not renumbered when an entry is removed; other documents may
reference them.

## OD-002: Hook enforcement for GitHub Copilot

**Why it matters:** Canonical hooks are deterministic guards. Claude Code has a native hook runtime;
GitHub Copilot does not offer an equivalent mechanism, so guard enforcement is asymmetric across
providers.

**Interim position:** Canonical hooks are provider-neutral JSON descriptors in `hooks/`. The Claude
integration renders executable Claude Code hooks. The Copilot integration renders the hook
expectations as documentation only, and the gap is recorded in `docs/limitations-v0.1.md`.

## OD-003: Coverage-evidence policy without an SDD adapter

**Why it matters:** Product Change promotion requires traceability evidence. With the OpenSpec
adapter, evidence is a validated `product-coverage.yaml`. Repositories using no SDD framework (or an
unsupported one) have no defined evidence format.

**Interim position:** v0.1 defines evidence through the adapter contract only. The promotion check
validates coverage files referenced from handoffs generated for the change. Evidence policy for
other SDD frameworks is deferred until a second adapter exists.

## OD-005: npm publication

**Why it matters:** Publishing creates a permanent public contract (names, scope, semver
expectations).

**Interim position:** The brand and scope are final: packages are laid out publish-ready under
`@prodshape/*`. Publishing still requires per-package `publishConfig` and explicit human approval;
nothing is published and no GitHub release is created without it.

## OD-006: Handoff resolution in shallow or partial clones

**Why it matters:** Handoff staleness detection can fall back to reading artifact content at the
recorded source revision. In shallow clones that revision may be absent.

**Interim position:** `prodshape handoff status` reports `source-revision-unavailable` when the
recorded revision cannot be resolved. Whether to add an optional remote-fetch fallback is deferred.
