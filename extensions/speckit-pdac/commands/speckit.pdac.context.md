---
description: 'Fetch the cited context projection for the artifacts a feature implements, ready to feed into specification'
---

# Fetch the Cited Context Projection

Ground the feature you are about to specify in the repository's accepted product definition (Product Definition as Code, canonical under `docs/product/model`) instead of paraphrasing it. This command produces the cited starting material for the specify phase.

## Prerequisites

- ProductShape must be available: `npx prodshape --version` succeeds. If it does not, report that this workspace has no ProductShape installation and stop; do not improvise product context.
- The product model must validate: `npx prodshape validate` exits 0. If it does not, report the diagnostics and stop.

## Behavior

1. Identify the product artifacts the feature implements or constrains.
   - If the user named artifact IDs, use them.
   - Otherwise, discover them: read the product model (default `docs/product/model`), compare the feature's intent with the whole definition to find every artifact it depends on, alters or contradicts, then widen the result with `npx prodshape impact <ID>` on each artifact found. Read a candidate in full with `npx prodshape inspect <ID>`.
2. Render the projection: `npx prodshape context <ID> [<ID>...]`. It carries each artifact's canonical text with a ready inline citation, plus the structural neighborhood as a cited listing. Use `--depth <n>` to widen and `--format json` when a machine-readable form is needed.
3. Hand the projection to the specify phase and keep every citation line next to the text derived from it. The projection is derived and disposable; the model stays canonical.

## Rules

- Never write a citation record by hand and never invent artifact ids or digests; only `prodshape cite` and `prodshape context` emit citation records.
- If the feature's goals contradict the product definition, or need behaviour it does not describe, that is product-definition drift: record it in the spec under a 'Product definition drift' note using the pdac-drift marker documented in `.specify/memory/pdac.md`, and leave the resolution to humans through a Product Change. Never edit `docs/product/model` from Spec Kit work.
- Full guidance lives in `.specify/memory/pdac.md` when the ProductShape integration is installed (`npx prodshape integration add speckit`).
