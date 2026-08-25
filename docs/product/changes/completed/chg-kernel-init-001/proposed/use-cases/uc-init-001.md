---
id: UC-INIT-001
type: use-case
title: Initialize Product Definition in a repository
status: active
primary-actor: ACT-REPOSITORY-MAINTAINER
supporting-actors: []
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CANONICAL-001
uses-terms:
  - TERM-CURRENT-PRODUCT-MODEL
  - TERM-PRODUCT-ARTIFACT
  - TERM-METHODOLOGY
  - TERM-REFERENCE-IMPLEMENTATION
---

## Goal

The Repository Maintainer can install the exact supported ProductShape CLI release identified by the public guidance, confirm its version, and give the repository everything real adoption needs: the kernel — the product definition structure, valid configuration and guidance — with artifact templates and schemas discoverable on demand, and the full per-kind layout, the template library and AI and SDD integrations as explicit expansions, without disturbing anything already in the repository. Initialization is the moment a repository adopts the methodology by installing its reference implementation, so the two must stay distinguishable from the first command.

## Trigger

The Repository Maintainer copies the primary quickstart or runs `prodshape init`, optionally selecting AI providers and an SDD framework through command options or interactive prompts.

## Preconditions

- The command is run inside a repository the maintainer controls.
- The exact supported `@prodshape/cli` package version named by the public guidance is available for installation.
- The chosen integrations, if any, correspond to providers and frameworks the installed release supports.

## Main Flow

1. The maintainer installs the exact supported `@prodshape/cli` release named by the primary guidance and confirms the installed identity with `prodshape --version`.
2. The maintainer runs `prodshape init`.
3. The command detects supported SDD frameworks already present in the repository and reports what it found, without executing framework tooling or modifying anything.
4. The maintainer chooses AI providers and an SDD framework, or none, through command options or, in an interactive environment, prompts informed by the detection.
5. The product tree is created under `docs/product`: a home for the current model and a home for live Product Changes; the change archives materialize when the first change is applied or archived. Selecting the full profile also scaffolds a directory per artifact kind and the change archives up front. The per-kind layout is a recommendation the maintainer can decline; artifacts are discovered wherever they sit under the model directory.
6. The repository configuration is written, recording the chosen integrations.
7. Authoring templates and the allowed frontmatter of every kind are printed on demand, so authors start from the contracts rather than blank files without a copied template tree; selecting the full profile or an AI integration renders the template library into the repository, because installed skills author from it.
8. The selected AI integrations are installed. A chosen SDD framework with a first-party integration is set up and its integration wired in the same run; any other supported framework receives printed setup guidance, because it installs through its own tooling.
9. The command prints what was created and the recommended next steps: author the proposed future state of `CHG-INITIAL`, validate its overlay, obtain product approval, apply it explicitly and open a pull request whose merge accepts the initial baseline. When an SDD framework was detected or wired in an established repository, the next steps recommend the brownfield recovery workflow as the input to `CHG-INITIAL`.
10. The maintainer validates the initialized repository and can follow the documented citation workflow without changing tools or package versions.

## Alternative Flows

- No integrations: the maintainer selects neither AI providers nor an SDD framework; the kernel is created and every expansion can be added later by running initialization again.
- Kernel default: with no expansion selected, initialization writes a handful of files, so seeing first value never costs the full profile. Validating the still-empty model states that no product definition exists yet and names the route to the first accepted baseline, rather than presenting emptiness as completed adoption.
- Existing SDD framework: the repository already uses a supported SDD framework. Detection reports it, and the maintainer can wire its first-party integration in the same run or decline and add it later; the next steps recommend recovering the product definition from the existing system.
- Non-interactive environment: with no explicit selection, the command never prompts; it reports the detection and the next steps and takes no SDD action.
- Re-initialization: running the command in an already initialized repository adds what is missing and leaves existing user content alone.
- Report only: the maintainer asks what initialization would do without doing it. Every path is reported by what would happen to it — created, preserved, regenerated, overwritten, or in conflict — and the SDD actions a real run would take are described; nothing is written and no external command runs. This is the usual first step in a repository that already has content, where the maintainer needs to know the answer before accepting the risk.
- Unreleased behaviour: public guidance marks it explicitly and does not present it as available in the supported published baseline.

## Failure Conditions

- The package version named by the primary guidance cannot execute one of its commands: the release contract is invalid and the release gate fails before publication.
- A file the command would create already exists with user content: the command stops and asks for explicit confirmation, or requires `--force`; it never overwrites silently.
- An unsupported provider or framework is requested: the command reports the supported options and makes no changes.
- The structure is created but the SDD integration step fails: the command reports the partial outcome distinctly, naming what succeeded, what failed and the command that retries only the failed step.

## Postconditions

- The installed CLI has reported the same version carried by its package metadata.
- The product definition structure exists in the repository and validates.
- The configuration is present and valid.
- Chosen integrations are installed, and no pre-existing file was overwritten without explicit consent.
- The primary documented citation workflow can run against the same installed package and detect later drift.
