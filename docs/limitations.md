# Limitations

An honest account of what the toolkit does not do: where the implemented scope has operational limits, what is deliberately excluded, and where the design has known limits. Genuinely open decisions are tracked separately in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md).

> Supported baseline: `@prodshape/cli@0.19.0`, the version `main` is prepared to release; the latest version actually on npm can trail it until the release workflow completes. This file is deliberately unversioned: a limitations document named after one release stops describing the product at the next one. Items explicitly labelled **Unreleased** describe the next release candidate on `main`, not the published packages.

## Implementation status

The supported baseline includes the `prodshape` CLI (with its `product-definition` v0.x alias and `--version`), graph compilation, Product Change overlay validation and apply with the affected-citation report, citation emission and verification (including provider-aware OpenSpec and Spec Kit population verification), Structured Behaviour authoring with scenario references, Product Snapshot generation, deterministic brownfield recovery sessions, SDD-aware initialization, `prodshape change create` and `prodshape drift`, and generated AI, OpenSpec and Spec Kit integrations. The current packages are published under `@prodshape/*`; the current OpenSpec library is `@prodshape/integration-openspec`, while `@prodshape/adapter-openspec` is a legacy name retained only for older consumers. Versions `0.10.0` and `0.15.0` were prepared but never published; their changes shipped in `0.11.0` and `0.16.0` respectively (see the [root changelog](../CHANGELOG.md)).

Honest operational limitations within that scope:

- **Claude Code hooks are not auto-wired.** The Claude integration renders the hook descriptors as a ready-to-merge fragment at `.claude/hooks/product-definition.json`; merging it into `.claude/settings.json` remains a manual step.
- **Copilot hook rendering is documentation only.** GitHub Copilot has no hook runtime, so the same guards render as conventions rather than enforcement. See [OD-002](../OPEN-DECISIONS.md#od-002-hook-enforcement-for-github-copilot) and the design limitation below.
- **`recover-product` automates the bookkeeping, never the analysis.** `prodshape recover` makes the session deterministic (evidence inventory and hashes, bounded batches, coverage, leads, questions, checkpoints, the final report) and confines output to the proposed overlay of `CHG-INITIAL`; there is still no automated brownfield extraction. Candidates carry a validated `provenance` object and low-confidence drafts are reported as `PRODUCT111`, so the human review queue is derivable from validation output. The analysis itself is still yours to do, and external sources are read only with your explicit authorisation.
- **PRODUCT108 and PRODUCT111 are advisory.** Approving a change that still lists open questions, and a low-confidence recovered draft, are warnings and never block on their own.
- **Unknown nested configuration keys are ignored silently.** Only unknown _top-level_ keys in `.product/config.yaml` are rejected, so a misspelling inside `integrations` or `validation` does nothing at all, with no diagnostic. See [OD-007](../OPEN-DECISIONS.md#od-007-validation-of-nested-configuration-keys).
- **Baseline-drift detection needs Git history.** Apply compares each artifact the change touches against its content at `base-revision`, which a shallow or partial clone may be unable to resolve. Where the revision is unreachable the check reports drift rather than silently passing, so the failure mode is a refusal to apply, not an unsafe apply.

## Deliberately excluded

These are scope decisions, not gaps. None of them is on the current path:

- Graph database (the graph is compiled from Markdown, held in memory, serialized to files)
- Web UI and visual editor
- MCP server
- Jira integration
- Automatic GitHub issue creation
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
- **Citations resolve within one repository.** A consumer document in a different repository cannot yet bind to this product definition; cross-repository resolution is deferred to a later specification revision.
- **The product diff is reported, not persisted.** Apply computes and reports the diff, including each impacted artifact's resulting digest, but records it in its output rather than in a stored artifact. Capturing it durably needs a serialization the specification has not yet fixed.

## Methodology limits

Limits of the approach itself, independent of implementation progress:

- **Structural impact is not semantic impact.** `impact` reports which artifacts are reachable through graph edges — deterministically, and nothing more. It cannot tell you whether a change actually breaks a reachable behaviour; that judgment belongs to humans, assisted by AI skills that reason over the structural result.
- **Warnings are deliberately not errors.** Diagnostics like an unused business rule or a requirement unreachable from any actor flag _probable_ model debt, and models under construction legitimately trigger them. Tools never escalate warnings unilaterally; a repository opts in via `validation.warnings-as-errors`.
- **Recovered knowledge is never auto-canonical.** No recovery output enters the active model without human validation, which means brownfield adoption costs real review effort by design. A methodology that silently trusted inferred product knowledge would corrupt the one thing the canonical model is for.
