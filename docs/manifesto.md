# Manifesto

## The limiting factor moves left

For decades the slowest part of building software was building it. Teams organized everything
around that bottleneck: thin tickets, just-in-time specification, product knowledge living in
people's heads and in the code, because the code was where all the time went anyway.

AI-assisted engineering changes the constraint. When implementation accelerates, the limiting
factor moves left, into questions that were always there but could be answered slowly:

- What is this product, and who is it for?
- Which actors interact with it, and what outcomes do they pursue?
- What behaviour is intended, and which rules govern it?
- What do our words mean, and where does each meaning hold?
- Which requirements follow from all of that, and why?
- When something changes, what else is affected?
- What is a coherent increment of the product, as opposed to a convenient increment of the code?
- And when an AI agent implements an increment, what context does it actually need — precisely,
  and nothing else?

An agent that writes code in minutes amplifies whatever understanding it is given. Give it a vague
ticket and it produces confident, fast, plausible software for a product nobody defined. The
scarce asset is no longer implementation capacity. It is a product definition worth implementing.

## A backlog is not a product definition

Backlogs are queues of work. They are good at ordering effort and bad at holding knowledge.

A user story describes a delivery increment — one step, for one actor, at one moment in the
product's history. It says what to add or change next. It does not say what the product _is_. Sum
every story ever completed and you still do not get a product definition; you get an archaeology
problem. The rules are scattered across acceptance criteria that were true at the time. The
language drifts from ticket to ticket. The actors are implied. Closed tickets are where product
knowledge goes to die.

Teams know this, which is why the real product definition usually lives somewhere else: in the
heads of the two people who have been around longest.

## An SDD spec is not one either

Spec-Driven Development is a real improvement: it makes an implementation increment explicit,
reviewable and verifiable before code is written. We build on it, not against it.

But an SDD spec answers a bounded question: _how does this one increment change the software?_ It
is scoped to a change, owned by a delivery workflow, and archived when the change ships. It
inherits the backlog's shape — a sequence of deltas — with better rigor per delta. What is still
missing is the thing the deltas are deltas _of_: a canonical, current, validated description of
the product that every increment reads from and, once verified, writes back to.

Product Definition as Code adds that layer in front. Definition first, then change, then slice,
then handoff to SDD, then implementation, then verification, then explicit promotion back into
the definition. The loop closes.

## Two assertions

**The relationships are the methodology.** Actors, journeys, use cases, business rules, domain
terms, bounded contexts and requirements are not a filing system. Their value is in the typed
connections between them: which actor a use case serves, which rules govern it, which terms it
uses, which requirements derive from it. Those connections are what let a tool answer "what is
structurally affected if this changes?" and what let a handoff carry exactly the context one
increment needs. Artifacts without relationships are just better-organized documents.

**Markdown is the source of truth; the graph is compiled from Markdown.** Product knowledge is
authored as plain Markdown files with YAML frontmatter, versioned in Git, reviewed in pull
requests, diffable and mergeable like everything else engineers trust. (Delivery slices, being
structured decompositions, are authored as YAML — the specification's
[canonical-authority table](specification/index.md#canonical-authority) is exact.) The product
graph is derived from those files, always rebuildable, never authored, never a database you must
keep alive. If the graph disappeared, nothing would be lost.

## Explicit change or nothing

A definition that can be edited casually is a definition nobody can trust. So the baseline — the
product as currently defined — is modified by exactly one operation: promotion of a verified
Product Change. Everything else is a proposal. A change states its delta explicitly, carries
complete proposed future-state artifacts, keeps its open questions visible, and is validated as
an overlay against the baseline before a human approves it. The one exception is the first
baseline itself, which may be established directly because there is nothing yet to change against;
from that moment on, the exception is closed.

This is the same discipline that made code trustworthy: no direct pushes to main, every change
reviewable as a diff, history that explains itself. Product knowledge deserves the pipeline code
already has.

## Who does what

The methodology divides responsibility deliberately, and the division is not negotiable.

**Deterministic tools enforce structure.** Identity, schema conformance, relationship integrity,
lifecycle rules, overlay validation, digests, staleness. Given the same files, the tooling
produces the same answer on every machine, every time. Structure is never enforced by AI.

**AI does semantic work.** Drafting artifacts, proposing journeys and slices, tracing the likely
meaning of a change, assembling context. AI operates under hard obligations: it preserves open
questions instead of resolving them by fiat, and it never invents a product decision. Uncertainty
is a first-class citizen of the definition, not an embarrassment to be smoothed over.

**Humans decide.** Approving a Product Change, approving a delivery slice, promoting verified
work into the current definition. These are judgment calls about what the product should be, and
no tool or model makes them. Every path from "proposed" to "canonical" passes through a person.

## What this is not

- **Not a product-management platform.** No boards, no workflow engine, no dashboards. Your
  backlog tool keeps its job; it just stops pretending to be the source of truth.
- **Not a graph database.** There is no server, no query engine to operate, no store to migrate.
  The graph is a compiled artifact of your repository.
- **Not an ontology.** The artifact types are a small, opinionated vocabulary for defining
  products, not a universal knowledge model. If you need OWL, this will disappoint you.
- **Not a roadmapping tool.** It says what the product is and how it changes, not when, in what
  order of business priority, or for which quarter.

## What this is

A methodology and a toolkit for keeping a product definition the way we learned to keep code:
versioned, reviewed, validated, and changed only through explicit, traceable deltas. Files you
own, in a repository you already have, checked by tools that never guess.

Two names carry this deliberately. **Product Definition as Code** is the methodology — the
long-lived, implementation-independent concept and its normative specification. **ProductShape** is
its reference implementation — the first shipped toolkit that realizes the methodology, exactly as
OpenSpec is an implementation of Spec-Driven Development. The two names coexist on purpose: a
methodology can have more than one implementation, and binding the ideas to one tool's name would
quietly narrow both.

The methodology starts in the [overview](methodology/overview.md). The contracts live in the
[specification](specification/index.md).
