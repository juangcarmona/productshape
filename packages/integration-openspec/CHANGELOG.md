# @prodshape/integration-openspec

## 0.4.0

### Minor Changes

- fb9b7b6: OpenSpec citation coverage (CHG-OPENSPEC-COVERAGE-001, -002 and -003, FR-OPENSPEC-001):

  - The merged proposal rules now require an impact pass before any proposal content is written: compare the change's intent (the backlog item, if there is one) with the whole product definition to find every artifact the change depends on, alters or contradicts; widen that list with `prodshape impact <ID>`; record the list in the proposal; cite every impacted artifact from each document that uses it; and name the neighbours that were checked and left out.
  - The merged proposal rules now require surfacing product-definition drift: when the change's goals contradict or go beyond the definition, the divergence is recorded in the proposal as an explicit warning naming the artifacts involved — with the marker `<!-- pdac-drift ids="..." summary="..." -->` on its own line — and the decision (a Product Change, or an adjusted change) belongs to humans. Drift is never fixed quietly.
  - New `prodshape drift` command: list every recorded drift warning across consumer documents (`--provider openspec` covers the whole population, archived material marked), reporting document, artifacts (with whether each still exists in the model) and summary. A report, never a gate: recorded drift exits 0.
  - `citations verify --provider openspec` now always includes archived changes and checks their citations, reporting everything found in archived material as a warning (archived history cannot be edited; its drift is information). The scope gate keeps applying to current documents only. `--include-archived` now applies the full gate — scope declarations and error severities — to archived documents too.

### Patch Changes

- Updated dependencies [fb9b7b6]
  - @prodshape/core@0.16.0

## 0.3.1

### Patch Changes

- Updated dependencies [cd1b100]
  - @prodshape/core@0.15.0

## 0.3.0

### Minor Changes

- df69fb8: Consumer-verification diagnostics leave the reserved band: `PRODUCT070`/`PRODUCT074`/`PRODUCT075` become `PRODUCT064`/`PRODUCT065`/`PRODUCT066`, matching the numbering spec RFC 0042 allocates for unclassified documents, bound documents without citations and invalid scope declarations, and the OpenSpec adapter mechanics `PRODUCT071`/`PRODUCT072`/`PRODUCT073` become `PRODUCT067`/`PRODUCT068`/`PRODUCT069` beside them. `PRODUCT070`-`PRODUCT079` returns fully to the reservation RFC 0021 states for model-repository resolution. The conditions, severities and precedence are unchanged; only the numbers move, while they are hours old and nothing external depends on them.

### Patch Changes

- Updated dependencies [376afcd]
- Updated dependencies [df69fb8]
  - @prodshape/core@0.14.0

## 0.2.0

### Minor Changes

- 3f591ca: Provider-aware OpenSpec citation enforcement. A reusable, framework-neutral SDD integration-provider contract now lives in core (`SddIntegrationProvider`): a provider enumerates the expected current native consumer documents of its workspace, and core classifies each enumerated document into exactly one effective scope state — `bound` (carries citations or declares `pdac-scope: cited`), `exempt` (a human declared `pdac-scope: none`), or `unclassified` (neither, which fails). OpenSpec enumeration (the `openspec/` layout, changes/archive lifecycle split and the `openspec` CLI) moved out of core into `@prodshape/integration-openspec`, which implements the contract as the first adapter; core no longer exports `discoverOpenSpecPopulation`. `prodshape citations verify --provider openspec` verifies the enumerated population instead of globbing for citation syntax: an unclassified current document fails (`PRODUCT070`), a bound document with zero citations fails (new `PRODUCT074`), an invalid or contradicted scope declaration fails (new `PRODUCT075`), a valid exemption passes but stays visible in text and JSON results, archived changes stay excluded unless `--include-archived`, and a workspace with current documents can never pass vacuously because zero citations were discovered. The provider JSON result uses the `citations-provider/v1alpha1` schema with document states and per-state totals. `integration add openspec` now also teaches the scope model through `openspec/config.yaml` guidance, states the exact provider-aware verification command, and installs a CI-ready example at `.product/integrations/openspec.ci.yml` that makes the repository's configured stale-citation policy explicit without ever changing it; `update`, `check` and `remove` manage that file alongside the rest. The gate never invokes `openspec validate`, and it establishes citation grounding and population coverage only — not semantic completeness or implementation conformance.
- 3b331a5: SDD-aware initialization. `prodshape init` detects SDD frameworks present in the repository (OpenSpec via `openspec/`, Kiro via `.kiro/`, Spec Kit via `.specify/`) and reports them; `--sdd openspec` wires the OpenSpec integration in the same run, bootstrapping the workspace first (`openspec init --tools none`, through `npx -y @fission-ai/openspec@1` when the CLI is not installed) when none exists. Kiro and Spec Kit receive printed setup guidance because they install through their own tooling. In an interactive terminal a bare `init` asks, informed by the detection; with an explicit `--sdd` value, `--sdd none`, or no terminal it never prompts, and `--dry-run` describes the SDD actions without executing anything. `doctor` now points at `prodshape integration add openspec` when a workspace exists without the integration. The OpenSpec integration records the exact strings it injects into `openspec/config.yaml`, so a later update replaces outdated PDaC entries instead of accumulating duplicates, `detectOpenSpecVersion` consults the repository's `node_modules/.bin` so a devDependency install counts, and the CLI-not-found message names the real package (`@fission-ai/openspec`).

### Patch Changes

- 0170f81: Align generated initialization, recovery and OpenSpec guidance with the independent Product Change lifecycle: overlay validation, human product approval, explicit apply, pull-request review and merge acceptance remain distinct from implementation and delivery evidence.
- Updated dependencies [885e4b0]
- Updated dependencies [0170f81]
- Updated dependencies [de5e199]
- Updated dependencies [213d2e1]
- Updated dependencies [d4c2ba8]
- Updated dependencies [3f591ca]
  - @prodshape/core@0.13.0
