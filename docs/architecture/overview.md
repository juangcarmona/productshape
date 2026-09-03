# Toolkit architecture

This document describes the implementation architecture of the Product Definition as Code toolkit for v0.1: the monorepo layout, the packages and their boundaries, the deterministic-core versus AI-reasoning split, the dependency policy and the cross-platform requirements.

It is deliberately separate from the product model under `docs/product`. The product model describes _what the product is_ — actors, behaviour, rules, language, requirements — and must not leak implementation design. This document describes _how the toolkit is built_. Nothing here is canonical product knowledge, and nothing under `docs/product` may reference packages, classes or dependencies described here.

The founding constraints behind this architecture were fixed at Gate 0 and are recorded as [architecture decision records](decisions/0001-markdown-is-canonical.md) 0001–0008; 0009 was added later, in response to the first adoption outside this repository. Where this overview and an ADR appear to disagree, the ADR wins.

## Monorepo layout

The toolkit is a TypeScript monorepo using pnpm workspaces and ESM throughout.

```text
packages/
├── core/                  # pure library: parsing, graph, validation, changes, citations
├── cli/                   # commander commands, output, exit codes
├── distribution/          # init, provider-asset rendering, update/drift/doctor
├── integration-claude/    # Claude Code provider mapping and templates
├── integration-copilot/   # GitHub Copilot provider mapping and templates
├── integration-codex/     # Codex provider mapping and templates
├── integration-openspec/  # OpenSpec citation lane + hosted product workflow
└── integration-speckit/   # Spec Kit guidance and metadata integration
skills/                    # canonical AI skills (7)
commands/                  # canonical thin /product:* commands (8)
templates/                 # canonical authoring templates
schemas/                   # JSON Schemas for artifact kinds
docs/                      # manifesto, methodology, specification, this architecture
```

v0.1 is delivered through four OpenSpec changes: `establish-product-definition-foundation` (contracts, schemas, minimal parsing core), `implement-product-graph-core` (graph, validation, CLI), `implement-product-change` (overlays, apply, product diff) and `package-ai-and-sdd-integrations` (distribution, provider integrations, OpenSpec adapter).

## Packages and responsibilities

| Package | Responsibility |
| --- | --- |
| `core` | Parsing (frontmatter, YAML), JSON Schema validation, graph compilation, diagnostics, change overlays, apply planning, product diffs, digests, citation emission and verification, and the repository-relative path contract every mutation resolves through. Pure library: no provider or OpenSpec knowledge, no `process.exit`, no console output. |
| `cli` | commander command definitions, human and JSON output, exit codes 0/1/2/3. Orchestration only; all domain logic lives in the packages it calls. |
| `distribution` | `init`, rendering canonical AI assets into provider formats, managed-file headers and content hashes, `installation.lock.json`, `integration update`, drift detection, `doctor`. Owns repository mutation for managed files (`src/mutation.ts`): safe path resolution, validated lock loading, plan and conflict classification, plan application and drift-aware removal. |
| `integration-speckit` | Configures a Spec Kit workspace with PDaC guidance (managed memory file plus sentinel-delimited template blocks) and records integration metadata. Never writes the constitution or feature directories. |
| `integration-claude` | Claude Code-specific mapping and templates only (renders `.claude/` assets, including executable hooks). |
| `integration-copilot` | GitHub Copilot-specific mapping and templates only (renders `.github/` assets; hooks render as documentation — see OD-002). |
| `integration-codex` | Codex-specific mapping and templates only (renders `.agents/` assets). |
| `integration-openspec` | Two lanes. The citation lane configures an OpenSpec workspace with PDaC citation rules (merges into `openspec/config.yaml`) and records integration metadata. The product lane installs the managed `product` schema at `openspec/schemas/product-change/` and provides the deterministic rails of the hosted product workflow (overlay validation, apply-time revalidation, delivery-context derivation). Never patches OpenSpec-generated files, never modifies OpenSpec's built-in schemas, never writes into a native spec-driven change's documents. |

## Dependency graph

Internal dependencies are strictly acyclic:

```text
cli ─────────────► core
cli ─────────────► integration-openspec ──► core
cli ─────────────► integration-speckit ───► core
cli ─────────────► distribution ─┬───► core
                                 ├───► integration-claude
                                 ├───► integration-copilot
                                 └───► integration-codex

integration-claude:   no internal dependencies
integration-copilot:  no internal dependencies
integration-codex:    no internal dependencies
```

The provider integration packages export their renderers as plain, structurally typed objects. `distribution` consumes them through TypeScript structural typing; there is deliberately no shared types package. This keeps the provider packages dependency-free and lets a future provider integration be added without touching any existing package's imports.

`distribution` and the two SDD integration packages depend on `core` for one thing: the repository-relative path contract and the resolver every mutation goes through (`core/src/repo-path.ts`). `BR-MUTATION-001` requires _one_ resolver, and `core` is the only package all three can reach; a second copy would be a second contract. `distribution` still computes no model validation — `doctor` receives validation and SDD-integration verdicts from its caller, so the dependency stays a path contract and does not become a dependency on the model.

## Deterministic core and AI reasoning

The boundary is fixed by ADR 0007 and holds everywhere in the toolkit:

- **Deterministic code decides structure.** `core` and `cli` enforce every structural invariant: schemas, identifier rules, reference resolution, overlay compilation, digests, diagnostic ordering. Given the same repository content they produce the same result on every platform. AI is never consulted for a structural verdict.
- **AI reasons about semantics.** The canonical skills (define, recover, explore, analyze, audit) do the semantic work — eliciting knowledge, drafting artifacts, judging coherence — and always end by invoking deterministic validation.
- **Hooks guard.** Hooks are deterministic guard descriptors that invoke CLI commands. They block or warn; they never approve, apply or rewrite. Humans hold every approval point.

## Approved dependencies

Runtime and tooling dependencies are limited to this list. Anything else requires a new decision.

| Dependency | Justification |
| --- | --- |
| `commander` | CLI argument parsing and command tree for the `prodshape` binary. |
| `gray-matter` | Extracting YAML frontmatter from Markdown artifacts. |
| `yaml` | Parsing and serializing standalone YAML files (configuration, citation ledgers, lock files). |
| `ajv` + `ajv-formats` | JSON Schema (2020-12) validation of frontmatter and YAML documents. |
| `fast-glob` | Deterministic, cross-platform artifact file discovery. |
| `vitest` | Test runner for all packages. |
| `tsx` | Running TypeScript directly during development. |
| `tsup` | Building ESM package outputs. |
| TypeScript, ESLint, Prettier | Language, linting and formatting baseline. |

Explicitly forbidden in v0.1: NestJS, Nx, Turborepo, dependency-injection frameworks, graph database clients, ORMs, web frameworks, React, an MCP server, and plugin frameworks. The toolkit is a set of plain libraries plus one CLI; every forbidden item adds a runtime or architectural weight the problem does not need.

## Derived outputs

Everything the toolkit computes is derived and rebuildable (ADRs 0001 and 0002):

- Graph outputs (`product-graph.json`, indexes, Mermaid diagrams, traceability reports) are written under `.product/generated/`. They are regenerable and non-canonical, so adopters are advised to ignore them in Git; `init` does not modify a repository's ignore rules on its behalf.
- Product diffs, citation-verification reports and Product Snapshots are derived views or reports. They are non-canonical and can be reproduced from canonical artifacts and consumer citations.
- Provider assets under `.claude/` and `.github/` are generated with managed-file headers and tracked in `installation.lock.json` (ADR 0008).

No command requires a generated file as input to rebuild it.

## Cross-platform requirements

The toolkit runs identically on Windows, macOS and Linux (Node >= 22, the current LTS lines):

- No path-separator assumptions: paths are handled through Node's path APIs internally and are always emitted with POSIX separators in diagnostics, citations and generated files.
- No shell assumptions: nothing shells out to platform-specific tools for core behaviour.
- No case-sensitivity assumptions about the filesystem.
- Digests are SHA-256 over UTF-8 content with CRLF/CR normalized to LF, so they are identical across operating systems and Git line-ending configurations.
- Generated outputs are byte-identical for identical input content, regardless of platform.

## Architecture decision records

| ADR | Decision |
| --- | --- |
| [0001](decisions/0001-markdown-is-canonical.md) | Markdown is canonical |
| [0002](decisions/0002-the-graph-is-derived.md) | The graph is derived |
| [0003](decisions/0003-stable-identifiers-over-paths.md) | Stable identifiers over paths |
| [0004](decisions/0004-current-model-and-changes-are-separated.md) | Current model and changes are separated |
| [0005](decisions/0005-product-definition-is-sdd-agnostic.md) | Product Definition is SDD-agnostic |
| [0006](decisions/0006-product-handoff-is-the-integration-contract.md) | The citation contract is the integration contract |
| [0007](decisions/0007-deterministic-core-and-ai-reasoning-are-separated.md) | Deterministic core and AI reasoning are separated |
| [0008](decisions/0008-vendor-assets-are-generated.md) | Vendor assets are generated |
| [0009](decisions/0009-reference-documentation-is-generated.md) | Reference documentation is generated |
