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
expectations as documentation only, and the gap is recorded in `docs/limitations.md`.

## OD-003: Coverage-evidence policy without an SDD adapter

**Why it matters:** Product Change promotion requires traceability evidence. With the OpenSpec
adapter, evidence is a validated `product-coverage.yaml`. Repositories using no SDD framework (or an
unsupported one) have no defined evidence format.

**Interim position:** v0.1 defines evidence through the adapter contract only. With the OpenSpec
adapter configured, promotion verifies coverage evidence discovered from the handoffs generated
for the change and refuses without it (PRODUCT044). Without any SDD provider configured,
promotion refuses unless the human passes `--accept-external-evidence`, which records a loud
PRODUCT044 warning asserting that evidence exists outside the tooling; the flag has no effect
when an adapter is configured. Evidence policy for other SDD frameworks is deferred until a
second adapter exists.

## OD-006: Handoff resolution in shallow or partial clones

**Why it matters:** Handoff staleness detection can fall back to reading artifact content at the
recorded source revision. In shallow clones that revision may be absent.

**Interim position:** `prodshape handoff status` reports `source-revision-unavailable` when the
recorded revision cannot be resolved. Whether to add an optional remote-fetch fallback is deferred.

## OD-007: Validation of nested configuration keys

**Why it matters:** `.product/config.yaml` rejects unknown **top-level** keys as `PRODUCT050`, but
keys nested inside `product`, `generated`, `integrations` and `validation` are read by name and
otherwise ignored. A misspelling such as `shorthand-command` or `warnings-as-error` therefore does
nothing at all, silently: the repository behaves as though the setting were absent, and no diagnostic
says why. The narrower the setting's effect, the longer that goes unnoticed.

**Interim position:** Unknown nested keys are ignored. The configuration reference lists every
accepted key per section and warns that misspellings are silent, and a conformance test round-trips
the configuration `init` generates through the parser so the two cannot disagree. Whether to reject
unknown nested keys — and whether that is a `PRODUCT050` error or a new warning, given it would fail
repositories that currently carry harmless extra keys — is deferred.

## OD-008: Depth of installation-lock verification

**Why it matters:** `integration update --check` verifies that every path the installation lock
records exists and still matches its digest (`PRODUCT051` / `PRODUCT052`). It does not verify that
the lock equals what the currently installed toolkit _would_ render. A lock that is internally
consistent but stale relative to the renderer therefore passes.

**Interim position:** The gap is currently unreachable for consumers: managed files are committed, so
there is nothing to install in a fresh checkout; canonical assets ship inside the package and cannot
be edited in place; and a framework-version mismatch is already reported by `doctor`. An npm-ci-style
`install --frozen` was considered for this release and deferred as redundant on those grounds. If a
second renderer or user-supplied canonical assets ever land, the right shape is a re-render comparison
inside the existing `--check`, not a new command.

## OD-009: Product Handoff identity when one work item delivers several slices

**Why it matters:** A Product Handoff ID is derived only from the work-item reference —
`HOF-<provider>-<work-item id>` — so the delivery slice is not part of it. One work item covering two
slices therefore produces two distinct handoffs carrying the same ID, and nothing rejects it. The
symptom is visible: after promoting `CHG-CLI-POLISH-001`, whose two slices were both delivered by pull
request 13, `prodshape inspect BR-IDENTITY-001` reports
`handoffs: HOF-GITHUB-13, HOF-GITHUB-13`. Two different packages, one name, no way to tell them
apart. That sits badly with `BR-IDENTITY-001`, which makes stable IDs the identity of everything else
in the model.

What is **not** affected: evidence discovery never resolves a handoff by ID. The coverage check reads
`product-handoff.yaml` from the SDD change directory it was given, and promotion matches sidecars on
`source.product-change` and `source.delivery-slice`. So coverage, promotion and staleness detection are
unambiguous today; the collision is confined to human-facing identity and to the `handoff:` field in
`product-coverage.yaml`, which names an ID that is no longer unique.

**Interim position:** One work item per delivery slice is the intended shape, and it keeps IDs unique.
The collision is reachable whenever a single pull request or ticket delivers several slices, which is
a reasonable thing to do and which this repository has now done once. Three candidate fixes are open,
each with a cost: include the slice in the ID (unique, but the ID stops naming the work-item link,
which is its purpose); append a disambiguating sequence (unique and stable-ish, but the number carries
no meaning); or refuse to generate a second handoff for a work item that already has one (forces the
intended shape, but blocks a legitimate workflow). Deferred until a second SDD adapter or real
multi-slice usage shows which property matters most.
