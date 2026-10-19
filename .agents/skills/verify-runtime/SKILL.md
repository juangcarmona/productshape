---
name: verify-runtime
description: "Drive the real application to observe a change working, and capture evidence a reviewer can open. Use when a change alters a user-facing surface, or when the Definition of Done requires runtime evidence."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

One responsibility: make a change **observable**, and leave behind artifacts a reviewer can inspect without rebuilding anything.

Tests prove the code does what the tests say. They do not prove a person can use the change. A green suite and a broken screen coexist comfortably.

**Output:** the evidence artifacts, their paths, and a plain statement of what was observed: including anything observed that was *not* expected.

## When to use

- When a change alters or adds a user-facing surface.
- When the tests pass but nobody has seen the change run.
- When the project's Definition of Done requires runtime evidence under its evidence dimension.
- As the evidence step of the Done gate, where `verify-done` calls this skill.

## When not to use

- Running the checks the pipeline runs. That is `verify-like-ci`.
- Producing the Done gate's verdict from the evidence. That is `verify-done`, which calls this skill.
- Inventing a boot procedure for a project that documents one. Use the project's own run scripts, contributing guide or end-to-end harness.

## Workflow

1. **Establish how this project runs.** Read the project's own instructions: its contributing guide, its run scripts, its end-to-end harness. Where the project has a skill or documented recipe for booting the application, use it; this skill does not invent a boot procedure. *Done when:* the command that starts the application, and the command that drives it, are both known and came from the project.
2. **Prefer the end-to-end harness over manual driving.** Where one exists it already solves the hard parts: dependencies started, data seeded, a real browser or client attached, artifacts written on every run. Driving by hand is the fallback, not the default.
3. **Build what the runtime actually serves.** A change to a front end that is served from a built bundle is not visible until the bundle is rebuilt. Running against a stale artifact produces evidence of the *previous* change. *Done when:* what is running was built from the current tree.
4. **Exercise the change's own path.** Reach the surface this change altered and perform the action a user would. Where the change has several branches (an error state, an empty state, a permission denial), exercise the ones the acceptance criteria mention. *Done when:* every criterion claiming a visible behaviour has been observed.
5. **Capture the evidence.** Screenshots, recordings, traces, response payloads, log excerpts: whatever the project's Definition of Done requires under its evidence dimension. Store them where the project keeps such artifacts and report the paths. *Done when:* each observation has an artifact a reviewer can open.
6. **Read the evidence you captured.** Open the screenshots. Look at them. Capturing an artifact and never inspecting it is a ritual, not a verification, and the defects this step exists to catch are exactly the ones the tests did not encode. *Done when:* each artifact has been inspected and what it shows is stated.
7. **Report what was observed**, including anything unexpected. A layout that is wrong, a label that is stale, a flash of the wrong state: these are findings, not noise, and they are cheapest to fix now.

## Validation

- The run and drive commands came from the project, not from this skill.
- What was running was built from the current tree.
- Every acceptance criterion claiming a visible behaviour has been observed.
- Each observation has an artifact a reviewer can open, with its path reported.
- Each artifact was inspected and what it shows is stated.
- Anything unexpected is reported as a finding.
- A surface that could not be driven here is named as unobserved, and the evidence dimension is left unmet.
- No credential, token or personal data is inside a captured artifact.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Substituting a passing test suite for observing the change | A green suite and a broken screen coexist comfortably |
| Writing "verified manually" in a summary | Evidence is what a reviewer can open, not a claim |
| Capturing artifacts and never opening them | An artifact nobody looked at proves nothing. Step 6 is the step that finds defects |
| Presenting evidence from a stale build | It is evidence of the previous change. Rebuild what the runtime serves |
| Reporting what should have happened rather than what was seen | If the observation contradicts the acceptance criteria, that is the finding |
| Quietly satisfying the evidence dimension for a surface that cannot be driven here | Report it as unobserved, by name, and leave the dimension unmet |
| Booting infrastructure the project does not use, or inventing a run procedure | Use the project's own harness and scripts |
| Driving by hand where an end-to-end harness exists | The harness already seeds data and writes artifacts on every run |
| Leaving credentials, tokens or personal data in a captured artifact | Scrub before storing |
