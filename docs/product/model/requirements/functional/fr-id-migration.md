---
id: FR-ID-MIGRATION
type: functional-requirement
title: Migrate numeric ID suffixes only with consent, atomically and without collisions
status: active
derived-from:
  - UC-ID-MIGRATE
  - BR-ID-FORM
  - BR-IDENTITY
verification:
  - id: S1
    scenario: An ID whose suffix-free form is unique is renamed together with its file, every reference to it and the digests of the current citations that name it
  - id: S2
    scenario: IDs that would collide when the suffix is removed keep their numbers and are reported
  - id: S3
    scenario: A refused or unanswered request changes nothing, and a non-interactive run changes nothing unless the explicit consent flag is given
  - id: S4
    scenario: Reporting the plan writes nothing and is distinguishable from a model that needs no migration
  - id: S5
    scenario: A migration that would leave the model or its citations worse is rolled back completely
  - id: S6
    scenario: Running the migration again after it succeeded changes nothing
---

## Requirement

The product MUST detect artifact IDs that end in a numeric segment and MUST compute, for each, the ID it would take without that segment. It MUST NOT rename an ID into an existing ID, nor several IDs into one: those IDs MUST be reported and left as they are, so the number acts only as a tie-breaker.

The product MUST show the plan before changing anything: each old and new ID, the files renamed, the references updated and the citation digests re-pinned. It MUST change the repository only with explicit consent: an interactive run MUST ask, and a run that cannot ask MUST change nothing unless the explicit consent flag is passed. The migration MUST be offered as a step of the upgrade and MUST also be requestable by name.

When applied, the product MUST update artifact frontmatter and relationships, file names, prose references, citations in payloads and sidecars, and the files of live Product Changes as one unit. It MUST re-pin only citations that were current before the migration; a stale, tampered or unresolved citation MUST stay as it was. It MUST NOT modify completed Product Changes or archived material. If validation or citation verification is worse afterwards, it MUST restore every file and name and report why.

The migration MUST be idempotent. Planning MUST write nothing and MUST be distinguishable from having nothing to migrate.

## Rationale

IDs are immutable because everything references them, which is also why the migration is dangerous: a half-applied rename leaves a model that points at things that no longer exist. Consent is therefore explicit and applying is all-or-nothing. Refusing to rename into a collision keeps identity unambiguous; leaving stale citations stale keeps the migration from hiding information that a human should still see.

## Acceptance Scenarios

- Given a model with `UC-IMPACT-001`, `FR-CITE-001` and a spec citing `FR-CITE-001`, when the engineer consents, then the files are `uc-impact.md` and `fr-cite.md`, the spec cites `FR-CITE` with the new digest and validation passes.
- Given `FR-INIT-001` and `FR-INIT-002`, when the plan is shown, then both are reported as colliding and neither is renamed.
- Given a pipeline run without the consent flag, when the migration step runs, then the plan is printed and the working tree is unchanged.
- Given a failing validation after the writes, when the migration finishes, then every file is back to its previous content and name.
