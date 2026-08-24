---
id: CHG-INIT-IGNORE-001
type: product-change
title: Initialization may extend the repository ignore rules when explicitly asked
status: proposed
base-revision: '8d73a5b1b8682d99d2dcd1cf15a0a657ad85a975'
operations:
  add: []
  modify:
    - FR-INIT-001
  remove: []
---

## Problem

`FR-INIT-001` forbids initialization from editing the repository's ignore rules under any circumstance: it MUST NOT do so "on the user's behalf". The obligation it leaves in its place is a printed line of advice, and advice printed once into a terminal is not a contract. The result is that every adopting repository must reproduce the same two rules by hand, and the state initialization leaves behind is one where regenerable output is tracked by default.

The failure this produces is not cosmetic. An adopter who reads a `.product/` directory full of untracked files reaches for the safe-looking remedy and ignores the whole directory, which removes `config.yaml`, `installation.lock.json`, the authoring templates and the integration records from history. Every other clone then has an installation that `doctor` cannot verify, `integration update` cannot reconcile and citation verification cannot configure. The alternative mistake, committing the generated tree, fills history with recovery sessions and cached output that no reader is meant to read.

The prohibition and the printed advice also disagree with each other. Initialization already knows exactly which rules the repository needs, including when `generated.root` relocates them, and it says so; what it may not do is act on what it knows. A product that computes the correct answer and then requires the user to transcribe it is asking the user to be its output device.

## Intended Product Outcome

Initialization may add the regenerable-output rules to the repository's ignore file when the user explicitly asks it to, through a command option or an interactive confirmation. Without an explicit request it writes nothing, and a non-interactive environment is never asked, so scripted and CI runs stay deterministic.

When it does write, it only ever adds. Existing content is preserved exactly, the added rules are those the repository does not already cover in any equivalent form, and running it again adds nothing. The rules follow the configured generated root rather than a fixed path. Report-only initialization describes the change to the ignore file and performs none of it.

Initialization additionally states which parts of the installation belong in version control, so the question the ignore rules raise is answered in the same breath as the rules themselves.

## Rationale

The prohibition was right about the danger and wrong about the remedy. What `FR-INIT-001` protects is the adopter's content: the first command a team runs must not destroy files that existed before it. An append that preserves every existing byte does not put content at risk, and the requirement's own structural-safety machinery already reports it as a distinct outcome that a dry run must predict exactly. The property worth keeping is therefore not "never touch the ignore file" but "never touch it unasked", which is the same consent rule the rest of initialization already runs on.

Requiring an explicit request rather than defaulting to the write is what keeps that consent real. A silent edit to a file the user owns would be indistinguishable, from the adopter's side, from the behaviour the original prohibition existed to prevent, and it would be discovered in a diff rather than in a decision. An option satisfies scripts, a confirmation satisfies humans, and the absence of both satisfies CI.

Deriving the rules from configuration rather than hardcoding them follows from the same reasoning that made the generated root configurable: a rule that names a path the repository does not use ignores nothing while appearing to have solved the problem.

Stating what to commit belongs in this change because the ignore rules are only half of the answer. Telling an adopter what to exclude without telling them what to keep is what produces the more damaging of the two mistakes, and initialization is the only moment at which the question is guaranteed to be asked.

## Affected Product Areas

Initialization only, within `BC-PRODUCT-DEFINITION`. `FR-INIT-001` gains a bounded exception to its ignore-rule prohibition and keeps every other structural-safety obligation unchanged. `FR-INIT-002` is untouched: SDD detection and adoption are unaffected. `FR-DOCTOR-001` is untouched: health reporting stays read-only and gains no ignore-rule check, so a repository whose rules are absent is not reported as unhealthy.

## Open Questions

None.

## Product Acceptance

- `FR-INIT-001` permits extending the ignore rules only on an explicit request, and continues to forbid it otherwise.
- `FR-INIT-001` requires the write to be additive, idempotent, derived from the configured generated root, and absent from non-interactive runs that did not ask for it.
- `FR-INIT-001` requires report-only initialization to describe the ignore-file outcome without performing it, under the existing agreement between report and outcome.
- `FR-INIT-001` requires the printed next steps to state which parts of the installation are version controlled.
- The scenarios list covers the explicit request, the untouched default, additive idempotence and the report.

## Out of Scope

Implementation: the option name, the wording of the confirmation, how equivalent existing rules are recognised, and the file's line endings. Ignore formats other than the one `.gitignore` uses. Any health check over the ignore rules, and any change to what `doctor` reports.
