---
id: FR-EXPLORER-BUSINESS-LENS
type: functional-requirement
title: Read a use case in business language through the business lens
status: active
derived-from:
  - UC-EXPLORER-BROWSE
  - BR-CANONICAL
verification:
  - scenario: One visible control turns the business lens on and off from every view, and its state is a presentation choice carried in the address
  - scenario: With the lens on, a use case under the reader's attention shows a business card with its Goal and Trigger as authored, its actors and journeys, the business rules it must obey by their statements, the structured behaviours that prove them with given, when and then, and its functional requirements, quality requirements and constraints one line each
  - scenario: The card states what a change to the use case would put in question, as the one-hop impact of the compiled graph, by name
  - scenario: The card shows no artifact identifier and no relationship type name, and connects its sections with plain verbs such as used by, must obey and proved by
  - scenario: Every fact on the card comes from the data the Product Explorer embeds, quoted or derived without rewording; a section with nothing to show says so, and nothing the Product Explorer does not carry is presented
  - scenario: Every artifact named on the card is one step from becoming the focus or opening in the Reader
  - scenario: With the lens on, the Focus view labels relationships with the same plain verbs and names neighbours by title
  - scenario: With the lens off, nothing about the views changes
---

## Requirement

The Product Explorer MUST offer a **business lens**: one visible control, present on every view, that switches the Explorer between its engineering presentation and a business presentation of the same model. The lens is a presentation choice: turning it on or off MUST update the address in place as FR-EXPLORER-ADDRESSING defines, and MUST NOT change the selected artifact or the active view.

With the lens on, the use case under the reader's attention — hovered, focused by keyboard or selected on a map, or shown in the Reader — MUST be presented as a **business card** stating:

- its **Goal** and its **Trigger**, as the use case's own sections author them;
- **who uses it**: its primary and supporting actors, and the journeys it is a step of;
- **what it must obey**: each business rule governing it, by the rule's statement as authored;
- **how that is proved**: each structured behaviour illustrating one of those rules or verifying a requirement derived from the use case, with its given, when and then;
- **what it must do**: each functional requirement derived from it, one line each by title;
- **what it must also be**: each quality requirement and constraint that applies to it, one line each by title;
- **what a change would put in question**: the artifacts the compiled graph's one-hop impact names for the use case, by title, grouped by kind.

The card MUST NOT show artifact identifiers or relationship type names. It MUST connect its sections with plain verbs — "used by", "part of", "must obey", "proved by", "must do", "must also be", "a change here puts in question" — and name each artifact by its title. Every fact on it MUST come from the data the Product Explorer embeds, quoted or derived without rewording, and a section the model gives nothing for MUST say so rather than disappear. The card MUST NOT present anything the Product Explorer does not carry — such as Product Changes in progress or the freshness of citations — and MUST NOT summarise, interpret or rank what it quotes. Every artifact named on the card MUST be one step from becoming the focus or opening in the Reader.

With the lens on, the Focus view MUST label each relationship with the same plain verbs and name each neighbour by title, keeping kind visible by token and icon. Artifacts of other kinds under the reader's attention MUST be presented by title, plain kind name and their first authored statement, without identifiers. With the lens off, every view MUST present exactly as it does without this requirement.

## Rationale

The Product Explorer's widest audience — product owners, stakeholders, people preparing a decision — asks of a use case what it is for, when it starts, who it serves, what it must respect, how anyone knows it works and what moving it would disturb. The model already answers every one of those questions, but scattered across a use case, its rules, behaviours, requirements and the reverse references the files never state, and labelled in the vocabulary of its relationships. Gathering those answers on one card in the reader's language turns the Product Explorer from a model to navigate into a product to understand, without adding a single fact the canonical files do not hold.

Quoting rather than summarising, and saying so when a section is empty, keeps the lens as honest as the rest of the Explorer: a business reader is the one least able to notice an invented sentence, so none may appear. Omitting changes in progress and citation freshness is not a gap the lens papers over; those belong to the repository side, as UC-EXPLORER-BROWSE states.

## Acceptance Scenarios

- A reader turns the lens on and hovers a use case on the Overview map: the card shows its Goal and Trigger exactly as authored, its actors and journeys, the statements of its governing rules, the behaviours proving them with given, when and then, its quality requirements and constraints one line each, and what a change would put in question. No identifier and no relationship type name appears.
- A use case with no governing rule shows that section stating there is none.
- From the card the reader opens a governing rule in the Focus view, then in the Reader, in one step each.
- With the lens on, the Focus view on a use case labels its neighbours "used by", "must obey" and "proved by" and names them by title.
- The reader turns the lens off: every view is exactly as before, and the address changed in place without a new history entry.
- The card is compared with the embedded data: every sentence on it is present there, verbatim or as a derived list, and nothing else is shown.
