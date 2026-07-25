# Limitations of v0.1

An honest account of what v0.1 does not do: what is planned but not yet built, what is deliberately
excluded, and where the design has known limits. Genuinely open decisions are tracked separately in
[OPEN-DECISIONS.md](../OPEN-DECISIONS.md).

## Not yet implemented at the current milestone

v0.1 is being built through four OpenSpec changes under `openspec/changes/`. Only the first is
complete, so at this milestone:

- **No CLI.** The `product-definition` binary does not exist. `init`, `validate`, `graph`,
  `inspect` and `impact` arrive with `implement-product-graph-core`.
- **No graph compiler.** The product graph, derived reverse relationships, structural validation
  beyond frontmatter schemas, and generated outputs (`product-graph.json`, indexes, Mermaid) are
  part of `implement-product-graph-core`.
- **No change overlays or handoffs.** Product Change overlay validation, delivery-slice tooling,
  handoff generation, staleness checking, coverage checking and promotion arrive with
  `implement-product-change-and-handoff`.
- **No AI or SDD integrations.** The six canonical skills, `/product:*` commands, hooks, the
  generated Claude Code and GitHub Copilot integrations, the OpenSpec adapter, `integration
add`/`update` and `doctor` arrive with `package-ai-and-sdd-integrations`.

What exists today from `establish-product-definition-foundation`: the methodology and manifesto,
the normative [specification](specification/index.md), JSON Schemas and authoring templates, the
repository's own product model under `docs/product/model`, conformance fixtures, and a minimal
parsing and schema-validation core. Everything above is specified; none of it is executable yet.

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
