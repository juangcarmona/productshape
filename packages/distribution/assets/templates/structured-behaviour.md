---
id: SB-EXAMPLE-001
type: structured-behaviour
title: Example Structured Behaviour
status: draft
illustrates:
  - UC-EXAMPLE-001
given:
  - An observable context condition holds
when: One product-level stimulus occurs
then:
  - An observable outcome follows
uses-terms: []
---

<!--
Structured behaviour: one concrete, implementation-independent example of accepted observable
product behaviour, with explicit context (given), a single stimulus (when) and observable
outcomes (then). All given entries and all then entries are conjunctive; alternatives are
separate SB artifacts, never an ambiguous "or" clause.
illustrates: the use cases, business rules or constraints this example makes concrete (required).
given (optional) / when / then: format-neutral product clauses. Never start a clause with a
literal GIVEN, WHEN, THEN or AND keyword in any letter case; renderers supply those words.
Never name test classes, step definitions, selectors, mocks or other implementation machinery.
uses-terms (optional): TERM ids whose definitions interpreting this example requires.
provenance (optional): the evidence behind recovered knowledge. Set it on recovered
(brownfield) artifacts; leave it unset when authoring from intent. It records evidence,
never authorship: git history remains the record of who changed what and when.
provenance:
  source: path/to/evidence.ts      # required; may also be a URL, a ticket, or an interview
  confidence: high | medium | low  # required; how strongly the evidence supports the claim
  recovered-from: observation | inference | interview | documentation  # optional
A draft whose confidence is low is reported as PRODUCT111, so candidates needing human
validation are derivable from validation output.
Contract: https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md
Schema reference: docs/specification/frontmatter-reference.md#structured-behaviour
-->

## Intent

Why this example is product-significant: what accepted result it establishes.

## Boundaries

What this example does not assert where a reader could otherwise mistake it for broader behaviour. `None.` is valid when no material boundary is known.
