## Context

ProductShape has six skills today: `ps:define`, `ps:recover`, `ps:audit`, `ps:change`, `ps:slice`, and `ps:handoff`. The first substantive workflow entry point is `ps:change` (analyze-product-change), which expects a well-formed change request: "what should be different and why." Users — both product owners and developers — often arrive with a fuzzy idea that isn't yet that crisp. The sibling OpenSpec toolkit has `opsx:explore` for this exact gap, but it is OpenSpec-native and unaware of ProductShape's product model structure.

`ps:explore` fills the gap by being the first skill a user would invoke when they have an idea but aren't yet ready to commit to a Product Change.

## Goals / Non-Goals

**Goals:**

- Provide a thinking-partner stance that helps users clarify and prepare an idea before `ps:change`.
- Load and reason over the full product model at the start to enable high-altitude structural analysis.
- Surface gaps, inconsistencies, and affected nodes in the existing graph to sharpen questions.
- Detect a greenfield/empty model and switch to an explanatory mode instead of analysis mode.
- Serve a mixed audience (product owners and developers) using business language by default.
- End every session with an explicit handoff offer to `ps:change`.

**Non-Goals:**

- Does not modify the product model or create Product Change artifacts (that's `ps:change`).
- Does not replace `ps:change` — it prepares the user for it.
- Does not execute structural validation (that's the CLI's job).
- Does not handle implementation planning (that's `opsx:explore` + `opsx:propose`).

## Decisions

### 1. Read full product model upfront

**Decision**: The skill reads all artifacts under `docs/product/model` at invocation time, before the first question.

**Rationale**: The product model is typically small (tens of files, ~hundreds of lines total). Reading it upfront costs little context but enables two things a lazy approach can't: (a) the skill can lead the conversation by surfacing what it already notices in the graph (gaps, orphaned actors, journeys with no use cases) rather than waiting for the user to describe something that turns out to be already modelled; (b) when the user describes an idea, the skill can immediately identify which existing nodes are affected rather than asking generic questions.

**Alternative considered**: Read only metadata / index files first, then load details on demand. Rejected because it adds complexity and the cost difference is negligible at typical model sizes.

### 2. Two-mode operation: analysis vs. greenfield

**Decision**: If `docs/product/model` is absent, empty, or contains fewer than ~3 artifact files, the skill enters greenfield mode. Otherwise it enters analysis mode.

**Rationale**: An empty model cannot be "analysed" for gaps. Greenfield mode shifts the skill from asking "what changes?" to explaining ProductShape's vocabulary (actors, journeys, use cases, business rules, domain terms) and helping the user land their idea into that structure. This prevents a confusing experience when a new adopter first runs the skill.

**Alternative considered**: Always enter analysis mode, just with an empty graph. Rejected because the skill would produce vacuous responses ("no actors found, no journeys found…").

### 3. Skill as a single SKILL.md file

**Decision**: Implement as a SKILL.md at `skills/explore-product/SKILL.md`, registered in `.claude/settings.json` as `ps:explore`. This matches every other ProductShape skill's structure and deployment pattern.

**Rationale**: Consistency with existing skills (ps:change, ps:audit, etc.) means the same authoring conventions, the same activation mechanism, and the same discoverability path.

**Alternative considered**: Implement as a separate CLI command. Rejected because the exploration is conversational, not deterministic — it belongs in the AI skill layer, not in the CLI.

### 4. Explicit handoff language, not an auto-transition

**Decision**: The skill ends by offering to continue to `ps:change`, never auto-invoking it.

**Rationale**: The user must decide when they're ready. An auto-transition would skip the validation that exploration is complete and the change request is actually clear. The exact phrasing — _"I'd say we now have a clear enough idea of what should change and why — want me to turn this into a Product Change, or is there anything you'd like to refine first?"_ — keeps agency with the user while making the next step obvious.

## Risks / Trade-offs

- **Large model → long context load** → The full-model read could be expensive on very large products. Mitigation: document a recommended model size cap in the skill body; for large models, suggest scoping to a specific area before exploring.
- **Skill body completeness vs. flexibility** → A highly prescriptive skill body risks being too rigid; too loose risks being a blank slate. Mitigation: structure the skill around stances and heuristics (like `opsx:explore`) rather than fixed workflows.
- **Greenfield threshold** → The 3-artifact heuristic for "minimal model" is arbitrary. Mitigation: treat it as a starting point; the skill body can use qualitative judgment ("the model feels sparse") rather than a hard count.

## Open Questions

- Should the skill automatically run a `prodshape validate` before reading the model, to surface structural errors early? (Likely yes — but leave for implementation decision.)
- Should there be a `ps:explore <change-name>` argument form to explore in the context of an already-open Product Change? (Not in scope for v1, but worth noting for v2.)
