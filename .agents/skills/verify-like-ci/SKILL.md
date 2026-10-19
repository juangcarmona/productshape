---
name: verify-like-ci
description: "Run the checks CI will run, locally, derived from the pipeline definitions rather than memory. Use when about to push, when claiming a change is green, or after fixing what a linter or test reported."
metadata:
  plugin: agentic-sdlc
  author: "juangcarmona"
---

## Purpose

One responsibility: prove locally that every check the pipeline runs passes, so CI is never the first place a failure appears.

A change is green when **the commands CI runs** exit 0 here, in CI's configuration. A subset that passes proves nothing about the rest.

**Output:** one line per check (command, observed exit code, verdict), and a single overall verdict. For a test check, the line also names a test *this change touched* that appeared in the run.

CI-system specifics live in the references. Read the one matching this project: [`references/azure-pipelines.md`](references/azure-pipelines.md) or [`references/github-actions.md`](references/github-actions.md).

## When to use

- Before committing or pushing.
- Before claiming a change is green.
- Before raising or un-drafting a pull request.
- After fixing anything a linter, analyzer or test reported.
- As the deterministic lane of the Done gate, where `verify-done` calls this skill.

## When not to use

- Producing the Done gate's verdict. That is `verify-done`, which calls this skill for one of its two lanes.
- Observing the change in a running application and capturing artifacts. That is `verify-runtime`.
- Reading the outcome of a run that already happened on the server. That is `inspect-ci-result`.

## Workflow

1. **Verify the tree CI verifies, not the branch's own.** Most systems validate the *merge* of the branch with the current target branch, so checks passing on a stale branch prove nothing about the run CI will do. Fetch, then require the branch to be zero commits behind the target; if it is not, bring it up to date before running any check. *Done when:* the branch is not behind in this session. A run on a behind tree is reported `stale-tree(<n> behind)`, never green.
2. **Verify the tree in front of you, not one verified earlier.** A verdict belongs to the tree that produced it; nothing else inherits it. Content edited after a green run is `stale-verification`; content never verified is `unverified`. Neither is green, and both clear the same way: run the checks again. *Done when:* the reported verdict describes the current content.
3. **Enumerate the checks from the pipeline definitions, not from memory.** Read the validation pipeline and every template or workflow it includes, and list each command it executes for the areas this change touches, in order. *Done when:* the list was derived from the definitions **in this session**, never recalled.
4. **Resolve which checks actually gate the merge from the branch protection, not from the pipeline file.** A pipeline's trigger block says how a run *starts*; whether a run is *required* is a branch-protection fact the pipeline file cannot express, and the two answers differ. Query the target branch's protection rules. *Done when:* the gating set came from that query in this session. **A pipeline file, a README, or a task list is never evidence for this**: a task list records what someone intended, not what is configured.
5. **Mirror CI's configuration.** Carry over what the definition passes: build configuration, the exact script name, the working directory. A debug build does not stand in for a release one, and one project's tests do not stand in for the whole run.
6. **Run each command to a terminal exit code** and record it. *Done when:* every enumerated check has an exit code observed in this session. No check is marked green by inference from another.
7. **On a test check, confirm the change's own tests were among those that ran — where the change has testable code.** Exit 0 proves the command succeeded, not that it covered anything: a runner exits 0 just as happily when it collected none of the changed code's specs. Read the run's own output and name a test or spec file **this change added or edited** in it; where the change added tests, their count must be visible in the total. *Done when:* such a test is named. Cannot name one, and the check is `uncovering(<what ran instead>)`, never green, and the cause is found before going further. **This requirement applies only where the change includes testable code.** For documentation- or configuration-only changes, no changed test is expected: instead, confirm the test check ran and exited 0, and report it as `not-applicable(no testable code changed)` rather than `uncovering`. Forcing a false `uncovering` on a docs-only change makes the gate unsatisfiable for changes this plugin explicitly supports.
8. **After any fix, re-run the whole command** the pipeline runs, not the sub-command that failed.
9. **Report the table and the overall verdict.** All zero means green. Any non-zero means red, naming the check. A check that cannot run on this machine is `unrunnable(<reason>)`, never passing, and the caller is told which pipeline check remains unproven rather than left to assume coverage.

## Validation

- The check list was derived from the pipeline definitions in this session, not recalled.
- The gating set came from a branch-protection query, not from a pipeline file or a task list.
- The branch is zero commits behind the target, and the verdict describes the current content.
- Every enumerated check has an exit code observed in this session; none was inferred from another.
- The command that produced each reported verdict *could have* failed the chain.
- A test check names a test or spec file this change added or edited that appeared in the run, **or** reports `not-applicable(no testable code changed)` where the change is documentation- or configuration-only.
- `unrunnable`, `uncovering`, `stale-tree` and `stale-verification` are reported by name, never folded into green.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| Enumerating checks from memory of what they were last month | Derive the list from the pipeline definitions, in this session |
| Reporting a subset as green for the whole | A subset that passes proves nothing about the rest |
| Treating a queued or in-progress run as a passing one | Only a terminal exit code is a verdict |
| Re-running only the sub-command that failed | A chained command (`a && b`, `a; b`) stops at the first failure, so the later checks never ran. Their silence is not a pass. Re-run the full chain |
| Piping the checked command, `lint \| tail -2 && build` | The chain reads `tail`'s exit code, which is always 0, so a failed check scrolls past. No pipe on the checked command, or `set -o pipefail` before the chain |
| Reading an auto-fixer's exit 0 as the check's verdict | A formatter or `--fix` succeeding says the fixer worked. Run the check again |
| Reporting `unrunnable` as passing | A check needing credentials or infrastructure this machine lacks is unproven, by name |
| Green on the branch, red on the merge build | The target branch had landed a change the branch's own checks never scanned. Step 1 |
| A green run, then one more edit, pushed without re-running | Nothing recorded *what* had been verified, so the new tree inherited the old verdict by implication. Step 2 |
| Assuming `trigger: none` means the pipeline does not gate the merge | It was a required check by branch policy, and the claim reached three artifacts before the gate went red. Step 4 |
| A bare runner invocation that collected one workspace project | 22 passing tests reported while 79 others, including 11 written that day, were never collected. Green on every pull request for three weeks. Step 7 |
