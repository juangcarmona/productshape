# Limitations of v0.1

An honest account of what v0.1 does not do: where the implemented scope has operational limits,
what is deliberately excluded, and where the design has known limits. Genuinely open decisions are tracked separately in
[OPEN-DECISIONS.md](../OPEN-DECISIONS.md).

## Implementation status

v0.1 is complete as scoped. All four OpenSpec changes — `establish-product-definition-foundation`,
`implement-product-graph-core`, `implement-product-change-and-handoff` and
`package-ai-and-sdd-integrations` — are implemented: the `product-definition` CLI, the graph
compiler, change overlays, handoffs, coverage checking, promotion and the AI and SDD integrations
all work today. The package is not published to npm; the CLI is built from the repository (see
[OD-005](../OPEN-DECISIONS.md#od-005-npm-publication)).

Honest operational limitations within that scope:

- **Claude Code hooks are not auto-wired.** The Claude integration renders the hook descriptors as
  a ready-to-merge fragment at `.claude/hooks/product-definition.json`; merging it into
  `.claude/settings.json` remains a manual step.
- **Copilot hook rendering is documentation only.** GitHub Copilot has no hook runtime, so the
  same guards render as conventions rather than enforcement. See
  [OD-002](../OPEN-DECISIONS.md#od-002-hook-enforcement-for-github-copilot) and the design
  limitation below.
- **`recover-product` defines the workflow only.** The skill guides a human-driven recovery
  session; there is no automated brownfield extraction.
- **PRODUCT109 and PRODUCT110 are advisory.** The closure-quality diagnostics — a slice affecting
  artifacts outside its requirements' closure, a handoff context outside the recomputed closure —
  are warnings and never block on their own.
- **`handoff status` needs Git history for moved artifacts.** Digest recomputation for artifacts
  no longer in the working tree reads the handoff's recorded source revision, which a shallow or
  partial clone may be unable to resolve. See
  [OD-006](../OPEN-DECISIONS.md#od-006-handoff-resolution-in-shallow-or-partial-clones) and the
  design limitation below.

## Deliberately excluded from v0.1

These are scope decisions, not gaps. None of them is on the v0.1 path:

- Graph database (the graph is compiled from Markdown, held in memory, serialized to files)
- Web UI and visual editor
- MCP server
- Jira integration
- Automatic GitHub issue creation
- Spec Kit integration (OpenSpec is the only SDD adapter)
- Multi-repository product graphs
- Organization-wide catalogs and remote registries
- Automatic brownfield recovery (the Recover workflow is human-driven; see
  [the brownfield guide](adoption/brownfield.md))
- AI model routing, custom agents and personas
- Opportunity solution trees, roadmaps, OKRs, release planning and portfolio management
- DDD aggregate modelling (bounded contexts are product-language boundaries only)
- Architecture documentation generation
- Runtime observability and product analytics
- Marketplace, hosted service and telemetry
- Universal plugin architecture (the adapter and provider seams exist, but only for the shipped
  integrations)
- Final public brand and acronym (see
  [OD-001](../OPEN-DECISIONS.md#od-001-final-brand-short-command-name-and-acronym))

## Known design limitations

- **Guard enforcement is asymmetric across AI providers.** Canonical hooks are deterministic
  guards. Claude Code has a native hook runtime and enforces them; GitHub Copilot has no
  equivalent, so the Copilot integration renders hook expectations as documentation only. A
  Copilot-assisted session relies on convention where a Claude Code session has enforcement. See
  [OD-002](../OPEN-DECISIONS.md#od-002-hook-enforcement-for-github-copilot).
- **Handoff staleness falls back to Git history.** When a referenced artifact is gone from the
  working tree (for example after promotion), digest recomputation reads the content at the
  handoff's recorded source revision. In a shallow or partial clone that revision may be
  unresolvable, and `handoff status` reports `source-revision-unavailable` rather than an answer.
  See [OD-006](../OPEN-DECISIONS.md#od-006-handoff-resolution-in-shallow-or-partial-clones).
- **Coverage evidence is defined only for OpenSpec.** Promotion requires traceability evidence,
  and v0.1 defines its format solely through the OpenSpec adapter (`product-coverage.yaml`).
  Repositories using no SDD framework, or an unsupported one, have no defined evidence format.
  See [OD-003](../OPEN-DECISIONS.md#od-003-coverage-evidence-policy-without-an-sdd-adapter).

## Methodology limits

Limits of the approach itself, independent of implementation progress:

- **Structural impact is not semantic impact.** `impact` reports which artifacts are reachable
  through graph edges — deterministically, and nothing more. It cannot tell you whether a change
  actually breaks a reachable behaviour; that judgment belongs to humans, assisted by AI skills
  that reason over the structural result.
- **Warnings are deliberately not errors.** Diagnostics like an unused business rule or a
  requirement unreachable from any actor flag _probable_ model debt, and models under construction
  legitimately trigger them. Tools never escalate warnings unilaterally; a repository opts in via
  `validation.warnings-as-errors`.
- **Recovered knowledge is never auto-canonical.** No recovery output enters the active model
  without human validation, which means brownfield adoption costs real review effort by design.
  A methodology that silently trusted inferred product knowledge would corrupt the one thing the
  canonical model is for.
