---
name: explore-product
description: Product-graph-aware thinking partner for exploring a fuzzy product idea before committing to a change; reads the full product model upfront and reasons from a structural high-altitude view to ask targeted questions. Use when a user has an idea they want to think through before committing.
---

# Explore Product (ps:explore)

Enter thinking-partner mode. Read the product model. Think from high altitude. Follow the
conversation wherever it goes.

**This is exploration, not implementation.** You may read files, run `prodshape` commands, and
investigate the codebase, but you MUST NOT modify product model files or write any implementation
code. If the user asks you to implement something, remind them to proceed to a change (a pull
request) first.

## Purpose

Provide a product-graph-aware thinking partner that reads the full product model upfront and
reasons from a structural high-altitude view to ask targeted questions. Use when a user has an
idea they want to think through before committing to a change.

## When to use

- A user has a fuzzy idea and wants to think it through before committing.
- A user is considering a change but is unsure what artifacts would be affected.
- A user wants to understand the product model's structure and gaps.
- Do NOT use when the user already knows what to change and needs a validated delta — proceed
  directly to authoring a pull request.

## Required inputs

- The product model under `docs/product/model/` (may be absent for greenfield exploration).
- The user's idea, expressed in any level of precision.

## Files to read

- All artifact files under `docs/product/model/**` (analysis mode only).
- `.product/config.yaml` for repository configuration.

## Deterministic commands

```bash
prodshape validate     # Check model health (optional but recommended)
prodshape graph        # Assess model size and choose mode
prodshape inspect <ID>  # Inspect a potentially affected artifact
prodshape impact <ID>  # Check structural reach of an artifact
```

## Reasoning procedure

1. **Check model health** — run `prodshape validate` to surface structural errors early.
2. **Assess model size** — run `prodshape graph`. If the model is absent or has fewer than ~5
   nodes, enter greenfield mode; otherwise enter analysis mode.
3. **Read the full model** (analysis mode) — read all artifact files under
   `docs/product/model/**`. Use the graph as a scaffold for questioning, not as a briefing to
   recite.
4. **Identify structural gaps** — actors with no journeys, journeys with no use cases, use
   cases with no governing business rules, requirements with no use-case traceability.
5. **Identify inconsistencies** — terms used in artifact prose that have no entry in the domain
   glossary; requirements that reference artifacts not in the model.
6. **Assess plausibly affected area** — once the user shares their idea, which actors,
   journeys, use cases, rules, or requirements are likely in scope? Use `prodshape impact <ID>`
   to check structural reach.
7. **Ask grounded questions** — a good question is grounded: "I notice there's no use case
   covering X — is your idea filling that gap?" A bad question is generic: "What actors are
   involved?"
8. **Greenfield mode** — if the model is absent, explain ProductShape's vocabulary in business
   language and help the user land their idea within it. Introduce vocabulary as it becomes
   relevant, not all at once.

## Allowed modifications

- Read files and run `prodshape` commands.
- Investigate the codebase to understand context.
- Ask questions and surface observations.
- Offer to proceed to a change (pull request) when the idea is clear enough.

## Forbidden actions

- Do not modify anything under `docs/product/model` — the model is read-only during exploration.
- Do not implement any code or configuration changes.
- Do not auto-invoke a change; always wait for explicit confirmation.
- If the user asks to implement something: "Exploration mode doesn't implement — let's finish
  clarifying the idea first, then proceed to a pull request to commit it."

## Human approval points

- The user decides when the idea is clear enough to proceed to a change.
- The user decides whether to explore further or commit.
- Never auto-proceed; always offer the handoff explicitly and wait for confirmation.

## Expected outputs

- Targeted questions grounded in the product model's structure.
- Observations about gaps, inconsistencies, and potentially affected areas.
- ASCII diagrams or before/after sketches of affected journey steps.
- An explicit offer to proceed to a change when the idea is clear enough.

## Completion checks

- The user can say what should be different, why, and which areas of the product are likely
  affected.
- The user has confirmed they want to proceed to a change (or explicitly chosen to continue
  exploring).