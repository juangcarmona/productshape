## ADDED Requirements

### Requirement: Skill activation and thinking-partner stance
The system SHALL provide a `ps:explore` skill that enters a thinking-partner mode for exploring
product ideas. The skill SHALL NOT write code, modify product model files, or create Product
Change artifacts during a session. The skill SHALL function as a thinking partner, not a
workflow executor.

#### Scenario: User invokes ps:explore with an idea
- **WHEN** a user invokes `ps:explore` with a description of an idea
- **THEN** the skill enters thinking-partner mode and begins exploring the idea without
  executing any changes to the repository

#### Scenario: User asks to implement during explore session
- **WHEN** a user asks the skill to implement something during an explore session
- **THEN** the skill declines and reminds the user to exit explore mode and create a
  Product Change first

### Requirement: Full product model loaded upfront
The skill SHALL read all artifact files under `docs/product/model` at activation time, before
asking the first question. The skill SHALL use this full model as context for all questions
and observations during the session.

#### Scenario: Model exists and is loaded
- **WHEN** the skill activates and `docs/product/model` contains artifact files
- **THEN** the skill reads the full model before engaging the user

#### Scenario: Model is absent or empty
- **WHEN** the skill activates and `docs/product/model` does not exist or contains no
  artifact files
- **THEN** the skill enters greenfield mode instead of analysis mode

### Requirement: High-altitude structural analysis in analysis mode
When a product model exists, the skill SHALL reason from a high-altitude view of the product
graph before asking questions. It SHALL identify and surface: (a) structural gaps such as
actors with no journeys, journeys with no use cases, or use cases with no business rules;
(b) inconsistencies such as referenced terms missing from the domain glossary; (c) nodes
potentially affected by the user's idea.

#### Scenario: Skill surfaces a gap to sharpen a question
- **WHEN** the user describes an idea that touches an area of the product graph with
  structural gaps
- **THEN** the skill surfaces the gap as part of its questioning, e.g., "I notice there's
  no journey covering X — is your idea filling that gap or is it something else?"

#### Scenario: Skill identifies affected nodes
- **WHEN** the user describes an idea
- **THEN** the skill identifies which actors, journeys, use cases, or rules in the existing
  model are potentially affected and references them in its questions

### Requirement: Greenfield mode for new or minimal products
The skill SHALL detect when the product model is new or minimal (absent or containing fewer
artifacts than a meaningful graph). In greenfield mode, the skill SHALL explain ProductShape's
artifact vocabulary (actors, journeys, use cases, business rules, domain terms, requirements)
and guide the user toward landing their idea within that structure.

#### Scenario: Greenfield user with no prior knowledge
- **WHEN** a user invokes the skill on a repository with no product model
- **THEN** the skill explains what actors, journeys, and use cases are in plain business
  language, and helps the user articulate their idea using those concepts

#### Scenario: Minimal model detected
- **WHEN** the product model exists but contains very few artifacts
- **THEN** the skill uses greenfield mode heuristics and does not try to analyse structural
  gaps in an incomplete graph

### Requirement: Mixed-audience language
The skill SHALL use business language by default — avoiding internal artifact identifiers
such as `UC-`, `BR-`, `JRN-` — unless using the identifier aids clarity (e.g., pointing to a
specific node the user should be aware of). The skill SHALL be equally accessible to product
owners without technical backgrounds and to developers with full system knowledge.

#### Scenario: Product owner with no ProductShape knowledge
- **WHEN** a product owner describes an idea using business terminology only
- **THEN** the skill responds in business language, translating into artifact vocabulary
  only when it helps anchor the idea to the product graph

#### Scenario: Developer exploring a technically precise idea
- **WHEN** a developer uses artifact identifiers or technical language
- **THEN** the skill accepts and uses that vocabulary naturally without forcing translation
  to business language

### Requirement: Explicit handoff to ps:change
The skill SHALL end every meaningful exploration session by explicitly offering to continue to
`ps:change`. The offer SHALL be phrased to confirm readiness while leaving the decision to
the user.

#### Scenario: Exploration reaches a clear, stable idea
- **WHEN** the explored idea has reached sufficient clarity that a Product Change could be
  written from it
- **THEN** the skill offers: "I'd say we now have a clear enough idea of what should change
  and why — want me to turn this into a Product Change, or is there anything you'd like to
  refine first?"

#### Scenario: User declines the handoff
- **WHEN** the user wants to continue refining rather than proceed to ps:change
- **THEN** the skill continues the exploration session without pressure

### Requirement: README and docs reflect the new entry point
The project README and methodology documentation SHALL document `ps:explore` as the recommended
first step before `ps:change` when starting from a fuzzy idea. The documented workflow SHALL
show the full path: `ps:explore` → `ps:change` → `ps:slice` → `ps:handoff`.

#### Scenario: New user reads the README
- **WHEN** a new user reads the project README
- **THEN** they find `ps:explore` described as the entry point for exploring product ideas
  before committing to a change

#### Scenario: Methodology docs show the full workflow
- **WHEN** a user reads the change methodology documentation
- **THEN** the workflow diagram or description includes `ps:explore` as the first step
