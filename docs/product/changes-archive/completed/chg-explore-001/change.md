---
id: CHG-EXPLORE-001
type: product-change
title: Add product-idea exploration step before committing to a change
status: implemented
base-revision: '97624b4cd4bdefacaa70dde2a979401fe2d48a2a'
operations:
  add:
    - UC-EXPLORE-001
    - FR-EXPLORE-001
  modify:
    - JRN-CHANGE-001
    - UC-CHANGE-001
  remove: []
---

## Problem

The ProductShape change workflow starts at `ps:change`, which requires a well-formed request: "what should be different and why." Product owners and developers often arrive with a fuzzy idea that has not yet reached that level of clarity. There is no guided step in the product for exploring and sharpening an idea against the existing product graph before committing to a Product Change. Users either skip the thinking step and produce weaker changes, or rely on informal conversation outside the product workflow.

## Intended Product Outcome

After this change, the ProductShape methodology includes an explicit exploration step at the entry of the change journey. A user with a fuzzy idea invokes `ps:explore`, which loads the product graph, reasons from a structural high-altitude view (surfacing gaps, inconsistencies and potentially affected artifacts), challenges and enriches the idea through conversation, and ends with an explicit offer to proceed to `ps:change` once the idea is sufficiently clear. When the product model is absent or minimal, the skill adapts to a greenfield mode that explains the product vocabulary and helps the user land their idea in the right artifact families.

## Rationale

The change journey's entry condition — "The intent of the modification is stated well enough to analyze" — is a real barrier for product owners and developers who do not yet have that clarity. Placing an exploration use case before the inspect-and-change steps removes that barrier: the product graph itself becomes the scaffold for questioning, producing sharper ideas and better change requests as output. The AI assistant is already the primary executor of `ps:change`; this change gives it a defined role one step earlier in the same journey.

## Affected Product Areas

- **JRN-CHANGE-001** (modify): the journey gains UC-EXPLORE-001 as its first step and its entry conditions broaden to allow fuzzy ideas as a valid starting point.
- **UC-CHANGE-001** (modify): gains a new alternative flow — when the AI assistant detects that the change request is ambiguous or insufficiently formed, it warns the user, explains what is unclear, and recommends invoking `ps:explore` before proceeding.
- **UC-EXPLORE-001** (add): new use case capturing the exploration interaction and its handoff to `ps:change`.
- **FR-EXPLORE-001** (add): new functional requirement specifying what the AI assistant must do when executing the exploration skill — load the full model, reason structurally, support greenfield contexts, and offer an explicit handoff. Also covers the `ps:change` warning behavior when intent is unclear.

## Open Questions

<!-- No open questions. Both decisions have been resolved by the product owner:
     1. UC-EXPLORE-001 remains optional in JRN-CHANGE-001 — engineers with a well-formed
        request may skip it; the AI assistant running ps:change warns and recommends explore
        when intent is unclear.
     2. No constraint requiring exploration evidence before a change is created — the product
        engineer is responsible for transmitting anything required for a sound change. -->

## Product Acceptance

- The change journey (`JRN-CHANGE-001`) lists `UC-EXPLORE-001` as its first step.
- A Product Engineer with a fuzzy idea can invoke `ps:explore`, engage with the AI assistant using the product graph as context, and arrive at a clear request suitable for `ps:change`.
- When the product model is absent or minimal, the exploration step guides the user through the ProductShape artifact vocabulary rather than attempting structural analysis.
- The AI assistant ends every exploration session by explicitly offering to proceed to `ps:change`, never auto-invoking it.

## Out of Scope

- The implementation of the `ps:explore` skill file (tracked separately in the OpenSpec change `add-ps-explore-skill`).
- Any constraint requiring exploration evidence before a change can be created.
- Greenfield exploration as a replacement for `ps:define` — `ps:explore` complements the define workflow but does not replace it.
