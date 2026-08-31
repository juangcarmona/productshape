---
id: CHG-MUTATION-SAFETY-001
type: product-change
title: Repository mutation stays inside the repository, is planned before it acts, and never destroys unrecorded content
status: applied
base-revision: 'b2da1c0e1341ca35d02e9f26cb9e77a09a344aaf'
operations:
  add:
    - BR-MUTATION-001
  modify:
    - FR-DISTRIBUTION-001
    - FR-OPENSPEC-001
    - FR-SPECKIT-001
  remove: []
---

## Problem

The product writes into repositories it does not own, and the record of what it owns lives in the same working tree anyone can edit. Four promises the product implicitly makes about that were not obligations anywhere in the definition, and all four were broken.

The installation lock names the files the product manages. Nothing said those names must stay inside the repository, so a lock naming `../../.ssh/authorized_keys` was read, joined onto the repository root and deleted. The document that decides what gets deleted was the one document nobody validated.

`integration add --dry-run` promised a report. It produced one after writing every managed file, then printed that nothing had been written. A report that is wrong about the thing it reports is worse than no report, because it is the one a maintainer consults precisely when they are unwilling to risk the real run.

Removing an integration deleted every file the lock named, including files a human had edited. The digest that would have distinguished the product's own untouched output from someone's work was recorded, present and ignored. The same product refuses to overwrite a hand-edited file during installation and deleted it during removal.

A malformed, unreadable or off-contract lock was read as "no integrations installed". The failure mode is not a crash but a false green: drift checking reports that every managed file matches a record it could not read, and the next install rewrites files whose recorded digests were just discarded. The configured location of generated output had the same shape of gap: a repository could point it outside itself and the product would write there.

Underneath all four sits one absence. There was no stated rule about repository mutation at all, so each command decided for itself what a path was allowed to be, when to look before acting, and what an unreadable file meant.

## Intended Product Outcome

A new business rule states the mutation contract once: every path the product resolves from a repository-controlled document is a normalized repository-relative path and resolves inside the repository; every mutating operation is planned before it acts and can report the plan without performing it; the product deletes only content it can prove it wrote and that has not changed since; and persistent state that exists but cannot be trusted stops the operation instead of being treated as absent.

The three integration requirements inherit it concretely. Installation and removal of a provider integration, and of the OpenSpec and Spec Kit integrations, each report what they would do without doing it, and what the report says matches what performing it produces, including a refusal. Removal preserves and names any managed file that has diverged from its record, keeps that file's entry so it stays covered by drift checking, and deletes it only when destruction is explicitly requested. An operation that changes nothing changes no byte: it does not rewrite managed files, and it does not rewrite the metadata that records the installation, so a first-install date stays a first-install date.

The rule applies to writable roots. A read-only scan target is separate and stays separate: consumer document roots may point outside the repository, because reading them writes nothing.

## Rationale

A business rule rather than four requirement amendments, because the four defects are one missing rule seen four times. Each command had its own idea of what a path could be and what an unreadable file meant, and a product that answers the same question differently in four places will answer it differently in the fifth. Stating it once is also what makes it enforceable: there is one contract to test against, not four behaviours to keep in agreement.

Containment is stated over the resolved target, not over the text of the path, because the text has more spellings than any list of forbidden prefixes covers, and because normalizing a path that meant to escape accepts it. The rule refuses the escape rather than repairing it: a document that names a target outside the repository is wrong about something, and quietly rewriting it to a target inside would act on a guess about what it meant.

Plan-before-act is the general form of the dry-run defect. A flag consulted after the writes is not a preview; it is a confession. Requiring the report and the outcome to come from the same computed plan is what makes the report worth consulting, and it is the same obligation initialization already carries — this change extends it to the rest of the mutating surface rather than inventing a second standard.

Drift-safe removal follows from the canonical-source rule. `FR-DISTRIBUTION-001` already reasons that a file a human has touched stops being the product's to delete; that reasoning was written about regeneration and is no less true about removal. Keeping the entry for a preserved file matters as much as keeping the file: dropping it would leave the file on disk and remove it from every future integrity check, which is the exact outcome the requirement's existing ownership argument rejects. An explicit force option exists because a maintainer who has read the report and wants the files gone should not have to delete them by hand — the rule is that destruction is requested, not that it is impossible.

Failing closed on untrustworthy state is the difference between an error and a lie. Absent state is a real, supported answer: nothing is installed. Unreadable state is not an answer at all, and reporting it as absence produces a clean verdict about an installation nobody could verify. Only the not-found condition may mean absence, because it is the only condition that means it.

Byte-idempotence is stated because "reports no changes" and "makes no changes" had come apart. A metadata file that stamps a new timestamp on every invocation makes every no-op visible in a diff, which teaches maintainers to ignore the diff. Preserving the install date and recording a separate last-changed date keeps both facts true; adding a moving date without the fixed one would have lost the fact that was actually worth recording.

## Affected Product Areas

`BC-PRODUCT-DEFINITION` for the mutation rule itself and for `FR-DISTRIBUTION-001`; `BC-DELIVERY-INTEGRATION` for `FR-OPENSPEC-001` and `FR-SPECKIT-001`, whose repository-write boundaries gain the plan, preservation and idempotence obligations.

`FR-INIT-001` is untouched: it already carries the report-matches-outcome and never-destroy-user-content obligations for initialization, and this change generalizes them rather than restating them there. `FR-DOCTOR-001` is untouched as a requirement; health reporting stays read-only. Citation verification, drift listing, the product graph, validation and every normative diagnostic keep their current meaning, ordering and exit codes.

## Open Questions

None.

## Product Acceptance

- `BR-MUTATION-001` exists and states path containment, plan-before-act, drift-safe deletion and fail-closed state loading as one rule over repository mutation.
- `BR-MUTATION-001` states that read-only scan targets are outside its scope and says why.
- `FR-DISTRIBUTION-001` requires installation and removal to be reportable without acting, with the report matching the outcome including a refusal.
- `FR-DISTRIBUTION-001` requires removal to preserve and report a diverged managed file, to keep its record, and to delete it only on an explicit destructive request.
- `FR-DISTRIBUTION-001` requires an operation that changes nothing to change no byte.
- `FR-OPENSPEC-001` and `FR-SPECKIT-001` require their repository writes to be planned, reportable without acting, and byte-idempotent, and require their recorded installation metadata to preserve the original installation moment.
- Each modified requirement carries scenarios covering the report, the preserved file, the explicit destructive request, the untrustworthy record and the unchanged no-op.

## Out of Scope

Implementation: module and package boundaries, the name of the destructive option, the internal shape of a plan, error types and message wording. The broader architecture and performance work tracked separately. Any change to normative diagnostics, their severities, their ordering or the documented exit codes. Any new command. Any change to what citation verification, drift listing or the graph do.
