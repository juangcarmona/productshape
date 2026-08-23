# Landscape research: independent validation and the Spec Kit bridge proposal

**Date:** 2026-08-23
**Validates:** "Product Definition as Code and ProductShape: prior art, competitors, and the gap worth owning" (research dated 2026-08-23)
**Status:** proposal. Turn section 4 into issues after review.

## 1. Validation verdict

The research holds up. Its load-bearing claims were re-checked against primary sources
(GitHub issues, the live repositories, and this codebase) rather than re-read. Result:
every structural conclusion survives; one piece of evidence needs to be restated, and
one piece of evidence is stronger than the research reports.

### Claims verified against primary sources

| Claim in the research | Verification | Result |
|---|---|---|
| RFC 0004 defines the ownership boundary (Product Change is not a PR, no handoff container, citations not copies) | Read `product-definition-as-code/spec` issue #4 in full; closed as completed via merged PR #5 | Confirmed verbatim, including the removal of Product Handoff, Delivery Slices, Promotion and Reconciliation from the normative model |
| ProductShape 0.13.0 ships an executable release contract expecting `PRODUCT061` on a stale citation | `PRODUCT061` appears in 28 files including `scripts/release-contract-smoke.mts`, the conformance suite, and the diagnostic registry pinned to a spec revision | Confirmed |
| Snapshot/delta is already proposed with the right shape | Issue #56: derived projection, no new artifact family, feeds `citations verify` | Confirmed; the research's Priority-1 recommendation and the issue are the same design |
| Spec Kit closed the product-level PRD request | Issue github/spec-kit#1527 fetched | Confirmed with a correction, see below |
| PRD-Led Context Engineering is the closest open competitor | Repo fetched: 185 stars, typed IDs, gated progressive PRD, devgraph, agent squads; no content-fingerprint citations and no separate change overlay | Confirmed, including the exact differentiation the research claims |
| PAELLADOC is the closest commercial match, graph-centred | Historic repo fetched: archived 2026-05-19, AGPL plus commercial licence, "current product is a desktop orchestrator at paelladoc.com" | Consistent; paelladoc.com itself is not independently verifiable from here, and the research already correctly labels its capabilities as documented claims rather than verified ones |
| Spec Kit detection already exists in ProductShape | `packages/distribution/src/sdd.ts` registers `speckit` with marker `.specify`, `installable: false`, guidance-only | Confirmed |

### Correction: how Spec Kit #1527 was closed

The research says the closed issue makes Spec Kit's boundary "unusually explicit."
Not quite: **#1527 was closed as "not planned" by the stale bot**, with no visible
maintainer statement about scope. A stale-closure is weaker evidence of a deliberate
boundary than the research implies. Any public prior-art page must not say "Spec Kit
rejected PRDs". The request went unanswered, which is different.

### Strengthening: the demand pattern is bigger than one issue

The same search surfaced at least four Spec Kit issues asking for the product level,
**all closed "not planned"**:

- **#404**: roundtripping, reverse a repo back into artifacts for SDD (the brownfield/recover use case)
- **#1047**: project-level PRD generation and phase/status tracking
- **#1116**: support importing a large PRD into multiple specs
- **#1527**: a `/speckit.prd` command to import and sync with an existing PRD

Four independent users asked for an upstream product layer; none of it was built.
That repeated, unserved demand is stronger evidence than a single explicit rejection
would have been, and it should be cited as a pattern.

### Where to keep healthy skepticism

- The prior-art **feature matrix** (Y/P/N per third-party tool) encodes judgment calls
  on capabilities the author could not run. Treat "P" cells as directional, not audited.
- The research is a single-author, single-pass web review. Its two strongest safeguards,
  labeling unverifiable vendor claims and refusing the "AI code costs more" narrative,
  held up under checking, which raises confidence in the rest, but the matrix should not
  be republished as fact without per-cell sourcing.

## 2. Perspective: what the research undersells

Two things matter more than the research gives them credit for.

**The conformance suite is the moat, not the CLI.** The `spec` repo already has
implementation-independent conformance cases (`citation-stale`, `citation-tampered-and-stale`,
`concurrent-changes`, `digest-bytes-not-text`, and more). Every listed competitor is either a
product (PAELLADOC, Kiro, enterprise RM) or a methodology plus templates (PRD-Led, BMAD).
None is a **contract a second implementation could pass**. Doorstop proves the mechanism
is 12 years old; a conformance suite is what turns a mechanism into a category. The
research's recommendation #9 (cross-layer drift fixtures) is therefore not one item among
twelve. It is the difference between "one maintainer's tool" and "a spec with a reference
implementation," and it deserves P0 ranking alongside the prior-art page.

**The Spec Kit gap should be filled sideways, not head-on.** What the four issues asked
for, importing a PRD and decomposing it into feature specs, is *delivery decomposition*,
which RFC 0004 explicitly places outside PDaC ownership. Building `/speckit.prd` as
requested would violate the project's own boundary and recreate the handoff container
that RFC 0004 just removed. The boundary-respecting fill is different and smaller:

1. PDaC supplies the **bounded, cited context** a human feeds into `/speckit.specify`
   for a feature *they* chose to cut.
2. PDaC **verifies citations** inside `specs/**` so a later Product Change makes the
   affected feature specs visibly stale.

That is exactly the "meet Spec Kit at its intake boundary" recommendation in the
research, and it is honest to say publicly: *Spec Kit users asked for a product level
four times; here it is, as a layer above Spec Kit rather than a fork of it.*

## 3. The Spec Kit bridge: design and sizing

### Answer to "we could fill that gap in a couple of days, right?"

**Yes for the working MVP; plan roughly a week for the version worth announcing.**
The expensive part of the OpenSpec integration (citation core, digests, statuses,
scope states, providers, drift markers) is already framework-independent in
`packages/core`. The Spec Kit bridge reuses all of it. What remains:

### Component A: `integration-speckit` provider (about 1 day)

A document provider modeled on `packages/integration-openspec/src/population.ts`:

- Enumerate `specs/<NNN-feature>/{spec.md,plan.md,tasks.md}` as consumer documents.
- Apply the existing scope-state model (bound / exempt / unclassified) per document.
- Wire `prodshape citations verify --provider speckit`.
- Flip `installable` semantics in `sdd.ts` from guidance-only to configured
  (Spec Kit still installs itself via `specify init`; ProductShape only configures).

Simpler than OpenSpec's integration: there is no `config.yaml` merge protocol, no
archive semantics, and no CLI version handshake. Spec Kit's `.specify/` holds templates
and memory; feature specs live in `specs/`.

### Component B: cited context projection (about 1 day)

A derived, non-canonical output (per RFC 0004: "a generated view ... may be provided for
convenience, but it is not an additional canonical product artifact"):

- `prodshape context --id <ID>... [--format speckit|markdown]`
- Walks the graph from the given artifacts (reusing `impact` traversal), renders the
  cited excerpts with `<!-- pdac:cite id=... digest=... -->` records already attached.
- Output is pasted into or referenced by `/speckit.specify`; the citations land in the
  generated `spec.md` and are verifiable from day one.

Naming guard: this is a **context projection**, never a "handoff". That term and the
container it implied were removed from the normative model by RFC 0004.

### Component C: agent guidance without polluting the constitution (about half a day)

Spec Kit's `memory/constitution.md` governs *how* software is built; the research is
right that it must not carry product intent. Ship a small instruction block (analogous
to the OpenSpec `PDAC_CONTEXT_BLOCK`) installed as a separate memory/context file that
tells agents: cite via `prodshape cite`, check impact before writing a spec, record
drift with the existing `pdac-drift` marker. Instructions, not intent.

### Component D: the public payload (2 to 3 days, the part that actually matters)

- A reference scenario repo: one business rule cited by a Spec Kit feature spec **and**
  an OpenSpec change; one Product Change modifies the rule; CI reports both consumers
  stale. This is reference scenario #1 from the research, with Spec Kit as the second
  consumer: one artifact demonstrates both the bridge and the multi-consumer story.
- Conformance fixture: "accepted Product Change makes one Spec Kit feature spec stale."
- A response on spec-kit #1527 (and a short post) showing the gap filled as a layer
  above, explicitly not asking Spec Kit to change anything. Frame with the corrected
  evidence: four unserved requests, not a rejection.

### What the bridge must NOT do

- No decomposition of the product definition into features (the human and Spec Kit own that).
- No writes to Spec Kit's templates, scripts, or constitution.
- No copied product prose into `spec.md` beyond cited excerpts.
- No sync engine; verification is read-only and deterministic.

## 4. Prioritized improvement set

| # | Improvement | Effort | Why now |
|---|---|---|---|
| P0-a | Spec Kit bridge (components A to D above) | about 1 week to announceable | Proven unserved demand (4 closed issues); ProductShape is uniquely ready (citation core is framework-independent, `.specify` already detected); it creates the public story |
| P0-b | Prior-art and differentiation page | about 1 day, pure writing | All content exists in the research; correct the #1527 framing (stale-closed pattern, not rejection); credit Doorstop by name. This page is what makes every other claim credible |
| P0-c | Cross-layer conformance fixtures (research rec. #9) | 2 to 3 days | Upgraded from the research's P1: the conformance suite is what makes PDaC a contract rather than a tool; the Spec Kit fixture from P0-a starts it |
| P1-a | Issue #56 snapshot/delta | already designed | Feeds `citations verify --delta` (targeted verification) and gives every consumer a "what changed" feed; do after the bridge so the delta has two consumer types to demonstrate against |
| P1-b | `citations verify --explain` | small | The research is right that the next value is explanation, not new statuses: show old/new fingerprint, causing change, target diff, remediation choices |
| P2 | Pilot evidence (research rec. #2) | ongoing | Two or three real external pilots with published numbers; without this the gap stays "credible but unvalidated". The Spec Kit reference scenario is the recruiting demo |

Sequencing rationale: the bridge first because it converts research into a public,
demonstrable claim within days; the prior-art page ships with it so the announcement
pre-empts the "Doorstop did this in 2014" objection instead of receiving it; the delta
lands next because with two consumer families (OpenSpec plus Spec Kit) targeted
verification finally has something to target.
