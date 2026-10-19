# Definition of Ready: reference

Reference material. **This is not your Definition of Ready.** It is the starting point the `adopt` capability walks with your team, one dimension at a time, to derive one that fits how you actually work. Every dimension can be kept, adapted or dropped with a recorded reason.

There is no universal checklist here to comply with. What makes a problem ready varies with domain, risk and regulation, and a definition somebody else wrote is a definition nobody follows.

## What the Ready gate asks

> **Is the problem sufficiently defined?**

The Ready gate sits at the end of the `refine` capability. It decides whether a work item can enter the `propose` capability.

### What stays out

Architecture and detailed solution design. That is what the `propose` capability is for, and its own gate asks whether the solution is sufficiently designed.

*A Definition of Ready that demands a design is a Definition of Ready no item ever passes.*

Two dimensions below sit deliberately close to that line and stop short of it:

- **Existing decisions** links decisions that already exist. It never asks anyone to make a new one.
- **Test impact** identifies which scenarios are affected. The test plan itself is an output of the `propose` capability.

## How the Ready gate is verified

Unlike the Done gate, readiness has no build to run and no suite to go green. It is a **semantic** judgement about a piece of writing, and that is something an agent can make.

So the gate runs as an agentic check, not a human meeting:

1. The agent reads the refined work item and evaluates it against **this project's** adopted Definition of Ready, dimension by dimension.
2. Every applicable dimension satisfied → the item passes, and the agent says which dimensions it judged inapplicable and why.
3. Anything missing, vague or contradictory → the agent **alerts the human**, naming the specific dimensions and what it could not find. Never a bare refusal.

A human always remains free to override in either direction. The point of automating the check is that no item reaches planning with an undefined problem by accident, not that a person is removed from the decision.

## Reference dimensions

> A work item is ready when every applicable item is explicit enough to plan and implement. Inapplicable items are marked `N/A` with a reason.

1. **Title**: states the desired outcome, not the activity.
2. **Description**: explains the intent, problem and relevant context.
3. **Actor / stakeholder**: identifies who needs or is affected by the change.
4. **Priority**: explicitly established when the team uses prioritisation.
5. **Dependencies**: known dependencies are identified, or explicitly none.
6. **Acceptance criteria**: observable and verifiable conditions for success.
7. **Scope**: what is included and explicitly excluded.
8. **Product rules**: relevant business rules, requirements or constraints are identified.
9. **Affected behaviour**: existing use cases, flows or behaviours that may change are identified.
10. **Quality expectations**: relevant performance, security, accessibility, reliability or other qualities are stated.
11. **Test impact**: expected new or affected automated/E2E scenarios are identified.
12. **Existing decisions**: relevant specifications, ADRs or previous decisions are linked when they exist.
13. **Unknowns / risks**: material uncertainty that could invalidate planning is resolved or explicitly recorded.

## The adopt walk

the `adopt` capability does not ask *"do you have a Definition of Ready?"*; that question produces a shrug. It asks one concrete question per dimension, about the team's actual work items, with this reference already on the table.

Discovery runs first: whatever the tracker already requires, whatever fields the team already fills, whatever their existing process documents say. Findings arrive as confirmations, not blank questions.

```text
TITLE
Do you require work items to state an outcome?
-> Yes / No / Adapt

DESCRIPTION
What must a description contain before anyone can act on it?
-> ...

ACTOR / STAKEHOLDER
Must every item identify who is affected?
-> Yes / Only when applicable / No

PRIORITY
Do you prioritise explicitly, and must it be set before Ready?
-> Yes / We do not prioritise formally / Later

DEPENDENCIES
Must dependencies be explicitly listed?
-> Yes, including "none" / Only known dependencies / No

ACCEPTANCE CRITERIA
What must be true before an item is Ready?
-> ...

SCOPE
Do you require an explicit out-of-scope statement?
-> Always / When ambiguity exists / No

PRODUCT RULES
Where are these recorded in this project?
-> spec repository / product docs / the item itself / external / not used

AFFECTED BEHAVIOUR
Should refinement identify existing flows the change may alter?
-> Always / When applicable / No

QUALITY EXPECTATIONS
Which qualities must be stated up front?
-> performance / security / accessibility / reliability / ... / none

TEST IMPACT
Should refinement identify affected or new E2E scenarios?
-> Always / When applicable / Later, when the solution is proposed

EXISTING DECISIONS
Which sources should refinement inspect?
-> ADRs / specs / product docs / ...

UNKNOWNS / RISKS
Must material uncertainty be resolved before planning, or is recording it enough?
-> Resolved / Recorded / Not tracked
```

Each answer produces one of: **keep** as written, **adapt** the wording, or **drop** with a recorded reason.

## The question no reference can answer

After the dimensions are settled, adopt asks:

> **What else must be true before your team is comfortable saying: "this item is ready to be planned"?**

This is where a team adds an investment or funding category, a UX design link, a data classification, customer approval, a required tracker field: whatever their context demands. The reference gets a team to a sane baseline in minutes. This question gets them to *their* Definition of Ready.

## Where the result goes

The adopted definition is written into `docs/engineering-lifecycle.md` in the team's own repository, under the `## Definition of Ready` section. That file is what every command reads; nothing in this plugin hardcodes a team's answers.

the `review` capability may later propose amendments to it, shown as a diff and confirmed by a human, never applied silently.
