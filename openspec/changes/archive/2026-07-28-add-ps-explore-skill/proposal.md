## Why

ProductShape's change workflow begins at `ps:change`, which requires the user to already know "what should be different and why." Product owners and developers often start with a fuzzy idea that needs to be challenged, refined, and grounded in the existing product model before it can become a well-formed change request. There is no guided entry point for that pre-proposal thinking — this gap makes the workflow feel abrupt and produces weaker change requests.

## What Changes

- Introduce a new `ps:explore` skill that acts as a product-graph-aware thinking partner before `ps:change` is invoked.
- The skill reads the full product model upfront and reasons from a high-altitude structural view, surfacing gaps, inconsistencies, and affected nodes to sharpen the questions it asks.
- When the product model is empty or minimal, the skill switches to greenfield mode: it explains how ProductShape structures a product and guides the user toward valid artifact families.
- The skill ends with a natural handoff: _"I'd say we now have a clear enough idea of what should change and why — want me to turn this into a Product Change, or is there anything you'd like to refine first?"_ — bridging directly to `ps:change`.
- The skill serves a mixed audience (product owners and developers equally); language is business-level by default but uses artifact vocabulary when helpful.
- Documenting the `ps:explore` → `ps:change` entry path in the README and product docs.

## Capabilities

### New Capabilities

- `product-exploration`: The `ps:explore` skill — loading the product graph, running structural analysis, conducting a guided idea-refinement conversation, and handing off to `ps:change`.

### Modified Capabilities

<!-- none -->

## Impact

- New skill file at `skills/explore-product/SKILL.md` (registered as `ps:explore`).
- README and methodology docs updated to reflect the new workflow entry point.
- No CLI changes, no breaking changes to existing skills or artifacts.
