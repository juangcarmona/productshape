# Definition of Done: reference

Reference material. **This is not your Definition of Done.** It is the starting point the `adopt` capability walks with your team, one dimension at a time, to derive one that fits your process, tooling, risks and quality expectations.

Symmetric with the Definition of Ready: same posture, same walk, opposite end of the lifecycle. One asks whether the *problem* is defined; this one asks whether the *change* is done.

## What the Done gate asks

> **Is the resulting change sufficiently verified?**

The Done gate sits at the end of the `implement` capability. It decides whether a change can enter the `integrate` capability, which refuses to merge anything that has not passed it.

`Done` here means **the change is finished and proven**: integration is mechanical after it. If your team's Definition of Done means "deployed to production", say so during adoption and it will be recorded that way.

### What stays out

Whether the approved design was *wise*. That was settled at the Plan gate. This gate asks whether the change **conforms** to what was agreed: the mirror of the rule that keeps design out of the Definition of Ready.

## The two lanes

Every dimension your team keeps is classified into one of two lanes. This classification is the single most useful thing adopt produces, because it decides what can be automated and what must wait for a person.

| | **Deterministic** | **Judgement** |
| --- | --- | --- |
| Settled by | An agent or CI, mechanically | A named human role |
| Produces | Evidence | A decision |
| Fails as | A red check | An unmet expectation |
| Example | The suite passes; coverage ≥ threshold; no secret in the diff | The tests actually cover the risk; this limitation is acceptable |

**A dimension may belong to both lanes, and usually should.** *Tests* is the clearest case: "the suite is green" is deterministic; "the suite exercises what could go wrong" is judgement. Splitting a dimension across lanes is a better answer than forcing it into one.

Two failure modes to avoid, and adopt actively pushes against both:

- **Everything classified as judgement**: the loop automates nothing and the definition becomes theatre. Adopt discovers what CI already runs *before* asking, so the deterministic lane starts populated rather than empty.
- **Everything classified as deterministic**: nobody ever looks at the change. *Human review* is never satisfiable mechanically, and `verify-done` will not mark a judgement item satisfied on its own.

A definition improves over time mostly by **moving items from judgement to deterministic**. That is the concrete shape of process improvement, and it is exactly what the `review` capability proposes.

## Reference dimensions

> A change is done when every applicable item is satisfied and its evidence exists. Inapplicable items are marked `N/A` with a reason.

| # | Dimension | What it asks | Typical lane |
| --- | --- | --- | --- |
| 1 | **Acceptance criteria** | Every criterion on the item is demonstrably met | Both |
| 2 | **Implementation completeness** | Planned tasks finished, or dropped with a recorded reason. No placeholders, no dead code, no silent scope loss | Both |
| 3 | **Tests** | Unit, integration and end-to-end coverage appropriate to the change and the risk it carries | Both |
| 4 | **Quality checks** | Linters, analyzers, formatting, coverage thresholds: whatever this project's toolchain enforces | Deterministic |
| 5 | **Security** | Dependency, secret and vulnerability checks proportionate to the change's exposure | Both |
| 6 | **Architecture / design conformance** | The change matches the approach approved at the Plan gate; deviations recorded, not silent | Judgement |
| 7 | **Documentation** | User-facing, operational and developer documentation updated wherever behaviour changed | Both |
| 8 | **Product / spec consistency** | Specifications, product documentation and the change agree with one another | Both |
| 9 | **Evidence** | The artifacts proving the above exist and are linked: CI results, test reports, screenshots, runtime observations | Deterministic |
| 10 | **Human review** | The roles this project requires have reviewed and approved what they are responsible for | Judgement |
| 11 | **Known limitations** | What is deliberately not addressed is stated, not left to be discovered | Both |

"Typical lane" is a starting suggestion for the conversation, never an answer. A regulated project may put documentation entirely in the judgement lane; a mature one may have automated most of dimension 8.

## The adopt walk

Discovery runs first. Whatever the repository's CI already executes (test suites, analyzers, scanners, coverage gates) is most of the deterministic lane, and it is discoverable from the pipeline configuration itself. Adopt brings those findings as confirmations.

Then one concrete question per dimension. Every dimension the team keeps also gets a **lane**, and every judgement item gets an **owning role**.

```text
ACCEPTANCE CRITERIA
How is "criteria met" established?
-> a test per criterion / demonstrated in review / both
   lane: deterministic | judgement | both       role: ...

IMPLEMENTATION COMPLETENESS
What counts as complete beyond "the tasks are ticked"?
-> no TODOs / no dead code / no feature flags left open / ...

TESTS
Which levels must exist before a change is Done?
[I found <these suites> in your CI: is that the bar?]
-> unit / integration / E2E / proportionate to risk
   lane: deterministic (green) + judgement (adequate)

QUALITY CHECKS
Which checks gate a change?
[I found <these analyzers and thresholds>: anything else?]
   lane: deterministic

SECURITY
Which security checks gate a change, and who judges exposure?
-> dependency scan / secret scan / SAST / none automated
   role: ...

ARCHITECTURE CONFORMANCE
Who confirms the change matches the approved approach?
-> author / reviewer / architect / nobody, it is reviewed as code
   lane: judgement       role: ...

DOCUMENTATION
What must be updated before a change is Done?
-> user docs / runbooks / API reference / changelog / none

PRODUCT / SPEC CONSISTENCY
Must specs and product docs be updated in the same change?
-> Always / When behaviour changed / Separately / Not tracked

EVIDENCE
What must be attached or linked?
-> CI run / test report / screenshots / runtime capture

HUMAN REVIEW
Which roles must sign off, and on what specifically?
-> engineering / QA / product / security / ...

KNOWN LIMITATIONS
Where are they recorded?
-> the item / the pull request / a follow-up item / not tracked
```

Each answer produces one of: **keep**, **adapt**, or **drop** with a recorded reason: plus a lane, plus a role where the lane is judgement.

## The question no reference can answer

After the dimensions are settled, adopt asks:

> **What else must be true before your team is comfortable saying: "this change is done"?**

This is where a team adds a rollback plan, a migration dry-run, a feature-flag strategy, a performance budget signed off, a customer acceptance, a compliance attestation: whatever their context demands.

## Where the result goes

The adopted definition is written into `docs/engineering-lifecycle.md` in the team's own repository, under the `## Definition of Done` section, with each item carrying its lane and, for judgement items, its owning role.

`verify-done` reads it at the Done gate: it runs the deterministic lane, collects the evidence, and presents every judgement item to the role that owns it. It never marks a judgement item satisfied on its own.

the `review` capability may later propose amendments, shown as a diff and confirmed by a human, never applied silently.
