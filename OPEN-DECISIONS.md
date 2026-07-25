# Open Decisions

This file records genuine product and project decisions that are deliberately unresolved.
Each entry explains why the decision matters and what the interim position is.
Entries are removed when a decision is made and recorded (in an ADR, the specification, or a Product Change).

## OD-001: Public brand of the reference implementation

**Why it matters:** Public APIs, package names, diagnostic prefixes and command names become
compatibility surfaces once adopted. Choosing a brand late is cheap; renaming an adopted API is not.

**Direction under review (via [CHG-BRAND-001], not yet promoted):** the methodology keeps the name
**Product Definition as Code**; its reference implementation adopts the public brand
**ProductShape**. The project is evaluating:

- **ProductShape** as the public brand (repository, website, documentation title, public references).
- `@prodshape/*` as the npm scope (developer-friendly short form).
- `prodshape` as the CLI binary, with `product-definition` retained only as a temporary v0.x alias.

Deliberately kept methodology-level and unchanged: the `.product/` configuration directory, the
`product-definition-as-code/...` schema identifiers, the `PRODUCT###` diagnostic codes and the
canonical `/product:*` command namespace (with an optional `/ps:*` shorthand alias). No acronym is
part of any public API. This entry is resolved when CHG-BRAND-001 is promoted.

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

**Interim position:** Codes are stable within v0.1.x. Whether the `PRODUCT` prefix survives the
final branding decision (OD-001) is open. A rename, if it ever happens, would be a breaking change
handled with explicit versioning.

## OD-005: npm publication

**Why it matters:** Publishing creates a permanent public contract (names, scope, semver
expectations).

**Interim position:** Packages are laid out publish-ready under `@product-definition-as-code/*`,
but nothing is published and no GitHub release is created without explicit human approval.

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
