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

The repository gains everything needed to define a product as code: the product definition
structure, valid configuration, artifact templates, and — when chosen — installed AI and SDD
integrations, without disturbing anything already in the repository. Initialization is the moment
a repository adopts the methodology by installing its reference implementation, so the two must
stay distinguishable from the very first command.

## Trigger

The Repository Maintainer runs `prodshape init`, optionally selecting AI providers and
an SDD framework through command options or interactive prompts.

## Preconditions

- The command is run inside a repository the maintainer controls.
- The chosen integrations, if any, correspond to providers and frameworks the toolkit supports.

## Main Flow

1. The maintainer runs `prodshape init` and chooses AI providers and an SDD framework,
   or none.
2. The product tree is created under `docs/product`: a home for the current model, with a directory
   per artifact kind, and a home for Product Changes with one directory per lifecycle state. The
   per-kind layout is a recommendation the maintainer can decline; artifacts are discovered wherever
   they sit under the model directory.
3. The repository configuration is written, recording the chosen integrations.
4. Artifact templates are rendered into the repository so authors start from the contracts
   rather than blank files.
5. The selected AI skills and SDD adapter are installed for the chosen providers and framework.
6. The command prints what was created and the recommended next steps: define the initial model,
   then validate.

## Alternative Flows

- No integrations: the maintainer selects neither AI providers nor an SDD framework; the
  structure and configuration are created and integrations can be added later by running
  initialization again.
- Re-initialization: running the command in an already initialized repository adds what is
  missing and leaves existing user content alone.
- Report only: the maintainer asks what initialization would do without doing it. Every path is
  reported by what would happen to it — created, preserved, regenerated, overwritten, or in
  conflict — and nothing is written. This is the usual first step in a repository that already has
  content, where the maintainer needs to know the answer before accepting the risk.

## Failure Conditions

- A file the command would create already exists with user content: the command stops and asks
  for explicit confirmation, or requires `--force`; it never overwrites silently.
- An unsupported provider or framework is requested: the command reports the supported options
  and makes no changes.

## Postconditions

- The product definition structure exists in the repository.
- The configuration is present and valid.
- Chosen integrations are installed, and no pre-existing file was overwritten without explicit
  consent.
