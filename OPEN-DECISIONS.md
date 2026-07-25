# Open Decisions

This file records genuine product and project decisions that are deliberately unresolved.
Each entry explains why the decision matters and what the interim position is.
Entries are removed when a decision is made and recorded (in an ADR, the specification, or a Product Change).

## OD-001: Public brand of the reference implementation — RESOLVED

**Resolved** by `CHG-BRAND-001`, promoted into the baseline as constraint `CON-BRAND-001`. The
reference implementation is publicly branded **ProductShape**; the methodology keeps the name
**Product Definition as Code**. The npm scope is `@prodshape/*`, the primary CLI binary is
`prodshape` (with `product-definition` as a temporary v0.x alias), the canonical command namespace
`/product:*` stays with an optional `/ps:*` alias, and the `.product/` directory, the
`product-definition-as-code/...` schema identifiers and the `PRODUCT###` diagnostic codes are
retained as methodology-level. The name is final. This stub is kept because other documents
reference the OD-001 anchor; the authoritative record is `CON-BRAND-001`.

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

## OD-004: Permanence of the `PRODUCT###` diagnostic code family

**Why it matters:** Diagnostic codes are machine-readable API. Tools and CI pipelines will match on
them.

**Resolved** by the branding decision (OD-001 / `CON-BRAND-001`): the `PRODUCT###` codes are
retained as methodology-level identifiers, independent of the ProductShape brand. They remain
stable within v0.1.x; any future rename would be a breaking change handled with explicit
versioning.

## OD-005: npm publication

**Why it matters:** Publishing creates a permanent public contract (names, scope, semver
expectations).

**Interim position:** The brand and scope are now final (OD-001): packages are laid out
publish-ready under `@prodshape/*`. Publishing still requires per-package `publishConfig` and
explicit human approval; nothing is published and no GitHub release is created without it.

## OD-006: Handoff resolution in shallow or partial clones

**Why it matters:** Handoff staleness detection can fall back to reading artifact content at the
recorded source revision. In shallow clones that revision may be absent.

**Interim position:** `product-definition handoff status` reports `source-revision-unavailable`
when the recorded revision cannot be resolved. Whether to add an optional remote-fetch fallback is
deferred.

## OD-007: Node.js support floor

**Why it matters:** The support floor constrains dependency choices and syntax targets for
consumers.

**Interim position:** v0.1 requires Node >= 20.10 (`engines` field) and is tested on Node 20 and
current LTS in CI. A longer-term LTS support policy is deferred.
