---
id: FR-EXPLORE-001
type: functional-requirement
title: Provide a product-graph-aware idea-exploration skill
status: draft
derived-from:
  - UC-EXPLORE-001
  - UC-CHANGE-001
  - BR-AI-001
verification:
  - scenario: The AI assistant reads the full product model before asking the first question
  - scenario: The AI assistant surfaces at least one structural observation from the graph before or during the first exchange
  - scenario: The AI assistant activates greenfield mode when the product model is absent or contains fewer than three artifact files
  - scenario: The AI assistant offers the explicit handoff phrase to ps:change when the idea reaches sufficient clarity
  - scenario: The AI assistant does not create or modify any product model artifact during the session
  - scenario: When executing ps:change with an unclear request, the AI assistant warns the user, names what is unclear, and recommends ps:explore before proceeding
---

## Requirement

The product MUST provide a `ps:explore` skill that the AI assistant executes as a
product-graph-aware thinking partner. When invoked, the assistant MUST read all artifacts under
`docs/product/model` before asking the first question. It MUST reason from a high-altitude
structural view of the product graph, identifying gaps, inconsistencies and artifact clusters
plausibly affected by the user's idea, and it MUST use those observations to ask targeted
questions rather than generic ones. When the product model is absent or minimal (fewer than
approximately three artifact files), the assistant MUST enter greenfield mode: explaining the
ProductShape artifact vocabulary in business language and guiding the user toward landing their
idea in the correct artifact families. The skill MUST serve both product owners and developers
without requiring knowledge of internal artifact identifiers. Every session MUST end with an
explicit offer to proceed to `ps:change`: "I'd say we now have a clear enough idea of what
should change and why — want me to turn this into a Product Change, or is there anything you'd
like to refine first?" The assistant MUST NOT create or modify any product artifact during an
exploration session, and MUST NOT invoke `ps:change` without explicit user confirmation.

When the AI assistant is executing `ps:change` and detects that the change request is ambiguous
or insufficiently formed, it MUST warn the user, name specifically what is unclear, and
recommend invoking `ps:explore` before proceeding. The engineer retains the decision to explore
or continue with partial clarity and record the gaps as open questions.

## Rationale

The change workflow's entry condition — that the intent is already "stated well enough to
analyze" — is a barrier for users who arrive with a fuzzy idea. By loading the product graph
upfront and reasoning structurally before the first question, the skill turns the existing model
into a scaffold for questioning rather than a blank slate. This produces sharper questions,
surfaces gaps the user may not have noticed, and yields a better-formed change request as output.
The explicit handoff phrase keeps agency with the user while making the next step unambiguous.
The greenfield mode extends the same value to teams that are just beginning to define their
product.

## Acceptance Scenarios

- A product owner describes a vague idea. The assistant loads the product model, cites a related
  journey and a gap it notices, asks a targeted question connecting the idea to an existing use
  case, and after several exchanges offers the explicit handoff phrase.
- A developer invokes `ps:explore` in a repository with no product model. The assistant explains
  what actors, journeys and use cases are, asks the developer to describe the product's primary
  users and goals, and guides the conversation toward a structured intent.
- The user declines the handoff offer and continues refining. The session continues; no product
  artifact is created or modified at any point.
- The user confirms the handoff. The session ends and the user proceeds to `ps:change` with a
  clear statement of what should change and why.
