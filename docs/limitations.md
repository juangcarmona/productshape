# Limitations

An honest account of what the toolkit does not do: where the implemented scope has operational limits, what is deliberately excluded, and where the design has known limits. Genuinely open decisions are tracked separately in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md).

> Current as of 0.2. This file is deliberately unversioned: a limitations document named after one release stops describing the product at the next one.

## Implementation status

Everything the methodology describes is implemented: the `prodshape` CLI (with its `product-definition` alias), the graph compiler, change overlays, delivery slices, handoffs, coverage checking, promotion, and the AI and SDD integrations. The `@prodshape/*` packages are published to npm and the CLI can also be built from the repository. The loop is not theoretical here — this repository defines itself with its own methodology and has taken several Product Changes through it end to end.

Honest operational limitations within that scope:

- **Claude Code hooks are not auto-wired.** The Claude integration renders the hook descriptors as a ready-to-merge fragment at `.claude/hooks/product-definition.json`; merging it into `.claude/settings.json` remains a manual step.
- **Copilot hook rendering is documentation only.** GitHub Copilot has no hook runtime, so the same guards render as conventions rather than enforcement. See [OD-002](../OPEN-DECISIONS.md#od-002-hook-enforcement-for-github-copilot) and the design limitation below.
- **`recover-product` defines the workflow only.** The skill guides a human-driven recovery session; there is no automated brownfield extraction. Its _output_ is now typed rather than prose — candidates carry a validated `provenance` object — and low-confidence drafts are reported as `PRODUCT111`, so the human review queue is derivable from validation output. The analysis itself is still yours to do.
- **PRODUCT109, PRODUCT110 and PRODUCT111 are advisory.** The closure-quality diagnostics — a slice affecting artifacts outside its requirements' closure, a handoff context outside the recomputed closure — and the low-confidence-draft warning are warnings, and never block on their own.
- **Unknown nested configuration keys are ignored silently.** Only unknown _top-level_ keys in `.product/config.yaml` are rejected, so a misspelling inside `integrations` or `validation` does nothing at all, with no diagnostic. See [OD-007](../OPEN-DECISIONS.md#od-007-validation-of-nested-configuration-keys).
- **`handoff status` needs Git history for moved artifacts.** Digest recomputation for artifacts no longer in the working tree reads the handoff's recorded source revision, which a shallow or partial clone may be unable to resolve. See [OD-006](../OPEN-DECISIONS.md#od-006-handoff-resolution-in-shallow-or-partial-clones) and the design limitation below.

## Deliberately excluded

These are scope decisions, not gaps. None of them is on the current path:

- Graph database (the graph is compiled from Markdown, held in memory, serialized to files)
- Web UI and visual editor
- MCP server
- Jira integration
- Automatic GitHub issue creation
- Spec Kit integration (OpenSpec is the only SDD adapter)
- Multi-repository product graphs
- Organization-wide catalogs and remote registries
- Automatic brownfield recovery (the Recover workflow is human-driven; see [the brownfield guide](adoption/brownfield.md))
- AI model routing, custom agents and personas
- Opportunity solution trees, roadmaps, OKRs, release planning and portfolio management
- DDD aggregate modelling (bounded contexts are product-language boundaries only)
- Architecture documentation generation
- Runtime observability and product analytics
- Marketplace, hosted service and telemetry
- Universal plugin architecture (the adapter and provider seams exist, but only for the shipped integrations)

## Known design limitations

- **Guard enforcement is asymmetric across AI providers.** Canonical hooks are deterministic guards. Claude Code has a native hook runtime and enforces them; GitHub Copilot has no equivalent, so the Copilot integration renders hook expectations as documentation only. A Copilot-assisted session relies on convention where a Claude Code session has enforcement. See [OD-002](../OPEN-DECISIONS.md#od-002-hook-enforcement-for-github-copilot).
- **Handoff staleness falls back to Git history.** When a referenced artifact is gone from the working tree (for example after promotion), digest recomputation reads the content at the handoff's recorded source revision. In a shallow or partial clone that revision may be unresolvable, and `handoff status` reports `source-revision-unavailable` rather than an answer. See [OD-006](../OPEN-DECISIONS.md#od-006-handoff-resolution-in-shallow-or-partial-clones).
- **Coverage evidence is defined only for OpenSpec.** Promotion requires traceability evidence, and its format is defined solely through the OpenSpec adapter (`product-coverage.yaml`). Repositories using no SDD framework, or an unsupported one, have no defined evidence format. See [OD-003](../OPEN-DECISIONS.md#od-003-coverage-evidence-policy-without-an-sdd-adapter).
- **Handoff identifiers are not unique when one work item delivers several slices.** A handoff ID is derived from the work-item reference alone, so two slices delivered by one pull request or ticket produce two distinct handoffs sharing an ID, and nothing rejects it. Evidence discovery is unaffected — it matches on the recorded change and slice, not the ID — so the consequence is human-facing identity. One work item per slice keeps IDs unique. See [OD-009](../OPEN-DECISIONS.md#od-009-product-handoff-identity-when-one-work-item-delivers-several-slices).

## Methodology limits

Limits of the approach itself, independent of implementation progress:

- **Structural impact is not semantic impact.** `impact` reports which artifacts are reachable through graph edges — deterministically, and nothing more. It cannot tell you whether a change actually breaks a reachable behaviour; that judgment belongs to humans, assisted by AI skills that reason over the structural result.
- **Warnings are deliberately not errors.** Diagnostics like an unused business rule or a requirement unreachable from any actor flag _probable_ model debt, and models under construction legitimately trigger them. Tools never escalate warnings unilaterally; a repository opts in via `validation.warnings-as-errors`.
- **Recovered knowledge is never auto-canonical.** No recovery output enters the active model without human validation, which means brownfield adoption costs real review effort by design. A methodology that silently trusted inferred product knowledge would corrupt the one thing the canonical model is for.
