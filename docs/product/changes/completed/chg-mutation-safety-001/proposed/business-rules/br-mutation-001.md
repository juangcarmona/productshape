---
id: BR-MUTATION-001
type: business-rule
title: Repository mutation is contained, planned, drift-safe and fails closed
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
  - BC-DELIVERY-INTEGRATION
---

## Rule

The product writes into repositories it does not own, and it reads the paths it writes to from documents those repositories control. Every such mutation obeys four obligations.

**Contained.** A path read from a repository-controlled document — an installation record, integration metadata, repository configuration — MUST be a normalized repository-relative path: non-empty, POSIX-separated, free of empty and dot segments, and neither absolute nor drive-qualified. Its resolved target MUST lie inside the repository. A path that fails either test MUST be refused, named and left unresolved; it MUST NOT be normalized into an acceptable one. Every read, write, rename and deletion of a repository-relative path MUST be resolved under this rule. A configured writable root is held to the same contract, and a repository whose configuration names an escaping writable root MUST be refused as invalid configuration before any command-specific work begins.

**Planned.** A mutating operation MUST determine its complete effect before performing any part of it, and MUST be able to report that effect — including a refusal — without performing it. What the report states MUST be what performing it produces.

**Drift-safe.** The product MUST delete or overwrite only content it can prove it wrote and that has not changed since it was recorded. Content that has diverged MUST be preserved and reported. The record of a preserved file MUST be kept, so the file stays covered by integrity checking rather than becoming unowned. Destroying diverged content MUST require an explicit request, and MUST report exactly what it destroyed.

**Fail closed.** Persistent state the product depends on MUST be treated as absent only when it is genuinely not there. State that exists but cannot be read, parsed or validated MUST stop the operation and be reported, never be replaced with an empty or default value.

This rule governs writable targets. A read-only scan target — a configured root the product only reads documents from — is outside its scope and MAY resolve outside the repository, because reading writes nothing.

## Rationale

The product's dangerous operations are driven by a document that lives in the working tree. The installation record names the files the product will regenerate and delete, and anyone who can edit the repository can edit it. Treating that document as trusted input made the most destructive operation in the product the one with the least validation.

Containment is stated over the resolved target rather than over the spelling of the path because the spellings outnumber any list of forbidden prefixes: a parent segment, a leading separator, a drive letter, a backslash and a segment that only becomes an escape after resolution are five ways to say the same thing. Refusing rather than normalizing follows from what a bad path means. A document naming a target outside the repository is wrong about something; rewriting it into a target inside is acting on a guess about which part was the mistake.

Planning before acting is what makes a preview trustworthy. A preview computed by a different code path than the action is a second implementation that will drift from the first, and a preview produced after the action has already happened is not a preview at all. Deriving both from one computed plan makes the agreement structural rather than a promise to keep two branches in step. Reporting a refusal is part of it: a preview that reports success where the real run would refuse fails in the case a maintainer ran it for.

Drift safety is the canonical-source rule applied to deletion. Authored content is canonical; the product's generated projections are not. The moment a human edits a managed file, that file holds content the product did not write, and deleting it destroys work no regeneration restores. Keeping the record of a preserved file matters as much as keeping the file: dropping the record leaves the file on disk and removes it from every future integrity check, which is how a file the product no longer watches keeps teaching an assistant instructions the repository abandoned. An explicit destructive request exists because the judgement is the maintainer's; what the rule forbids is making it for them.

Failing closed is the difference between an error and a false verdict. Absence is a real answer — nothing is installed — and it is safe to act on. Unreadable state is not an answer, and treating it as absence produces a clean report about an installation nobody could verify, then rewrites files whose records were just discarded. Only the not-found condition may mean absence, because it is the only condition that means it.

The read-only exception is stated explicitly so it is a decision rather than an omission. Consumer documents legitimately live outside the product repository — a sibling checkout, a shared specification tree — and the property that makes pointing at them safe is that scanning them writes nothing. Holding scan targets to a containment rule written for writable roots would forbid a supported layout while preventing nothing.

## Examples

- An installation record names `../../.ssh/authorized_keys`. Loading it fails, the operation stops, the offending entry is named, and nothing outside the repository is read, written or deleted.
- A maintainer asks what installing an integration would do. Every target is reported by outcome and the repository is byte-identical afterwards; installing for real then produces exactly what was reported.
- The same maintainer removes the integration after editing one of its managed files. The edited file is kept and named, its record is kept, the rest is removed, and a second run with an explicit destructive request removes the edited file too and says so.
- The installation record is truncated by a bad merge. Health and drift checks fail and say the record cannot be trusted, instead of reporting that nothing is installed and that all managed files match.
- An integration is added twice. The second run reports no changes and rewrites nothing at all — not the managed files, not the record, not the installation metadata whose original installation moment is preserved.
- Repository configuration points the generated-output root at `../outside`. The command refuses as invalid configuration before generating anything. The same repository points a consumer-document root at a sibling checkout, and verification scans it and writes nothing.

## Exceptions

Paths this implementation fixes as its own literals, rather than reading from a repository-controlled document, are not repository-controlled input. They are still resolved under the containment rule, because a single resolver is what makes the guarantee checkable.
