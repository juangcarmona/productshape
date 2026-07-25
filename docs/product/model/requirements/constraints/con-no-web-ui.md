---
id: CON-NO-WEB-UI
type: constraint
title: The product provides no web interface in v0.1
status: active
---

## Constraint

Version 0.1 of the product ships no web interface of any kind: no browser-based editor, viewer,
dashboard or portal. All interaction with the product definition happens through the authored
files, the command-line tool and AI assistants operating on the repository.

## Rationale

This boundary is deliberately fixed to keep v0.1 focused on the substance of the methodology: the
artifact contracts, deterministic validation, the change flow and the handoff contract. A web
interface would multiply the surface to design, build and support before the model it would
display has proven itself, and it would tempt the product toward exactly the pattern the
methodology rejects — a place where product knowledge is viewed and edited outside the files and
their review flow. Files, CLI and AI assistants together already cover authoring, navigation and
enforcement for the adopters v0.1 targets.

## Consequences

- Impossible: browsing, editing or approving product knowledge through a hosted or local web
  application; graphical dashboards as a supported product surface in v0.1.
- Harder: reaching stakeholders who will not read Markdown or run a command-line tool; visual
  exploration is limited to generated outputs such as diagrams rendered by external viewers.
- Mandatory: every product capability must be fully usable through files and the command line;
  documentation and onboarding must assume no graphical surface; any future web interface must
  arrive as a projection over the same files and commands, never as a new home for product truth.
