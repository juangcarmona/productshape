---
id: CHG-INIT-SDD-001
type: product-change
title: Initialization detects SDD frameworks and adopts a supported one in the same run
status: applied
base-revision: '116283fc4dc3410e0aa6755b2b55c004f1e3572a'
operations:
  add:
    - FR-INIT-002
  modify:
    - UC-INIT-001
    - BR-SDD-001
    - CON-SDD-AGNOSTIC
    - JRN-ADOPT-001
  remove: []
---

## Problem

`UC-INIT-001` promises that initialization installs a chosen SDD framework integration, selected "through command options or interactive prompts", but no functional requirement carries that behaviour: `FR-INIT-001` covers only structural safety. Adopting the methodology in a repository that already runs an SDD framework therefore requires a separate integration command that initialization never mentions in its next steps, and a repository without an SDD framework gets no path at all. The first-run experience contradicts the use case, and the adoption walkthroughs compensate with long manual recipes.

`BR-SDD-001` and `CON-SDD-AGNOSTIC` still describe the integration boundary in terms of versioned Product Handoffs and adapters consuming a handoff contract. That architecture was replaced by the Citation Contract: citations bind consumer documents to the product model, and configuration informs through the framework's own surface. The two boundary artifacts contradict `FR-OPENSPEC-001`, which already derives from them.

## Intended Product Outcome

Initialization detects SDD frameworks already present in the target repository and reports what it found. When a detected framework has a first-party integration, initialization can install that integration in the same run and recommends the brownfield recovery workflow as the next step. When no SDD framework is present, initialization offers the supported frameworks: the one with a first-party integration installs end to end from the same command, and the others receive printed setup guidance because they install through their own tooling.

Interaction is optional. An explicit framework selection, an explicit opt out, and a non-interactive environment each produce deterministic behaviour without prompting. Report-only initialization describes the SDD actions a real run would take, executes no external command and writes nothing.

`BR-SDD-001` and `CON-SDD-AGNOSTIC` state the boundary in Citation Contract vocabulary: SDD frameworks consume canonical product knowledge through citations that bind and configuration that informs, framework knowledge lives only in framework-specific integrations, and nothing on the product side assumes, names or depends on a particular framework. `JRN-ADOPT-001` describes the existing-framework variant as configuring the integration during initialization so the repository's documents can cite the definition from day one.

## Rationale

Adoption begins with initialization, and the first command a team runs defines whether the methodology feels installable or assembled by hand. Detection is cheap and safe, so reporting what is already in the repository costs nothing and routes the maintainer to the right next step. Installing the first-party integration in the same run removes the seam between "the structure exists" and "the framework is wired", which is exactly where adopters stall today. Frameworks that install through their own tooling get guidance rather than an installation attempt, because a half-driven third-party installer would violate the trust that `FR-INIT-001` establishes.

Determinism without a terminal is not a convenience: initialization runs in CI and in scripts, and a command that prompts in one environment and not another produces reports that cannot be trusted. The same reasoning that makes report-only initialization a distinct obligation in `FR-INIT-001` makes "report the SDD actions, execute nothing" a distinct obligation here.

The boundary artifacts are corrected in the same change because the new requirement derives from them: a requirement must not derive from rules whose text describes a contract the product no longer has.

## Affected Product Areas

Initialization (`UC-INIT-001`, new `FR-INIT-002`), the delivery integration boundary (`BR-SDD-001`, `CON-SDD-AGNOSTIC`) and the adoption journey (`JRN-ADOPT-001`), within `BC-PRODUCT-DEFINITION` and `BC-DELIVERY-INTEGRATION`. `FR-INIT-001` is untouched: structural safety remains its single concern. `FR-OPENSPEC-001` is untouched: what the integration does once installed does not change.

## Open Questions

None.

## Product Acceptance

- `FR-INIT-002` exists, derives from `UC-INIT-001`, `BR-SDD-001` and `CON-SDD-AGNOSTIC`, and carries detection, same-run adoption, guidance, non-interactive determinism and report-only scenarios.
- `UC-INIT-001` names detection as a step of the main flow and describes the existing-framework and no-framework paths without promising an installation for frameworks that install through their own tooling.
- `BR-SDD-001` and `CON-SDD-AGNOSTIC` no longer mention Product Handoffs, handoff contracts or adapters; both state the boundary through the Citation Contract and framework-specific integrations.
- `JRN-ADOPT-001` describes the existing-framework variant through citations, not handoffs.

## Out of Scope

Implementation: command flag names, prompt mechanics, detection markers, bootstrap commands, package layout and tests. What the OpenSpec integration does once installed (`FR-OPENSPEC-001`) and how citations are verified (`FR-CITATIONS-VERIFY-001`) do not change.
