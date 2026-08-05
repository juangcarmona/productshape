# Define

Define is the greenfield operation: establishing a product definition where none exists. Its output is a set of draft artifacts that, once validated and approved by a human, become the product's initial baseline.

Define is a way of thinking before it is a sequence of steps. The artifact families depend on each other conceptually — actors ground journeys, journeys yield use cases, use cases surface rules and language, requirements derive from all of it — but the model is a graph, not a waterfall. In practice you loop: a use case reveals a missing actor, a rule forces a term to be defined, a requirement sends you back to sharpen a journey. The flow below is the natural order of discovery, not a gate sequence.

## The flow

1. **Understand intent.** What outcome should this product create, for whom, and why now? Resist writing artifacts until the intent can be said in a sentence that a stakeholder would sign.

2. **Identify actors before features.** Who and what interacts with the product — people, external systems, scheduled processes? Starting from actors keeps the definition anchored in outcomes; starting from features produces a definition of the software you were already planning to build. Actors are not personas: no demographics, no fiction, just purpose, goals, responsibilities and boundaries.

3. **Shape journeys around outcomes.** For each significant actor goal, describe the end-to-end path to the outcome — including branches, failures, waiting and manual steps. A journey earns its place by ending in something the actor values, not by covering a screen flow.

4. **Derive use cases from journey steps.** Each meaningful interaction in a journey becomes a use case: trigger, preconditions, main flow, alternatives, failures, postconditions — observable behaviour, never implementation design.

5. **Extract business rules.** Whenever a use case says "unless", "must", "only when" — that is a rule trying to stay hidden in a flow. Pull it out as an independently identifiable Business Rule so every use case and requirement it governs can reference it by ID.

6. **Establish terms and contexts.** Every word that two people could read differently gets a Domain Term, and every term is defined in a Bounded Context. If the same word means two things, that is two terms in two contexts — the definition should record the ambiguity you discovered, not paper over it.

7. **Derive requirements.** Functional Requirements, Quality Requirements and Constraints, each traceable to the use cases, rules or constraints it derives from, each with verification scenarios. A requirement with no derivation is a decision with no reason.

8. **Preserve uncertainty.** Unresolved questions are recorded, visibly, where they arise. An open question in the definition is information; a silently invented answer is a defect. AI assisting with Define operates under this obligation explicitly: it drafts, it proposes, it flags — it never resolves a product decision on its own.

9. **Draft, then validate.** Artifacts are authored as `draft`. Deterministic validation checks structure: frontmatter schemas, ID rules, relationship integrity, required body sections. See [Validation](../specification/validation.md). Validation says nothing about whether the product is right — that is the next step's job.

10. **Human approval.** A person reviews the drafts and accepts them. Only then do artifacts become `active` — part of the accepted product definition. Nothing becomes canonical without this step.

## Define produces CHG-INITIAL

There is no exception for the first definition. Define's output is the proposed future state of a Product Change with the reserved identifier `CHG-INITIAL`, which is validated, approved, applied and accepted exactly like every later change. The normative rule, from [Product Changes](https://github.com/product-definition-as-code/spec/blob/main/spec/product-changes.md):

> `CHG-INITIAL` is reserved for the single initialisation change that establishes the first Product Definition. A product MUST NOT have more than one `CHG-INITIAL`. Every semantic evolution after it MUST be represented through a Product Change.

Greenfield and brownfield both arrive here: authoring from intent and recovering from a running system are two ways of producing the same change. One mechanism means one thing to explain, and nothing that only applies once.

## What Define hands you

A validated, human-approved baseline under `docs/product/model`: the reference point every future [Change](change.md) is a delta against, and the text every consumer document cites. The artifact contracts it must satisfy are in [Artifacts](https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md) for what each kind means, [Frontmatter reference](../specification/frontmatter-reference.md) for the exact fields each one accepts, and [Identifiers](https://github.com/product-definition-as-code/spec/blob/main/spec/identifiers.md) for how they are named. Frontmatter is a closed contract, so it is worth reading the field tables — or running `prodshape schema <kind>`, which prints the same contract and needs no repository — before authoring rather than discovering the boundaries from validation errors.
