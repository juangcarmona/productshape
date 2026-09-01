---
id: FR-OPENSPEC-001
type: functional-requirement
title: Integrate with OpenSpec through citations that bind, configuration that informs and a hosted product workflow that governs
status: active
derived-from:
  - UC-CITATIONS-VERIFY-001
  - BR-SDD-001
  - BR-MUTATION-001
  - CON-SDD-AGNOSTIC
verification:
  - id: S1
    scenario: An OpenSpec document that depends on canonical product text carries a citation to every artifact it derives from, and citation verification resolves each one against the product model
  - id: S2
    scenario: The integration merges PDaC authority context and citation rules into openspec/config.yaml, preserving existing schema, context, rules, guidance, comments and unrelated user configuration
  - id: S3
    scenario: The integration writes only official OpenSpec surfaces, the configuration file and the project-local schema directory, plus ProductShape integration metadata; it never patches generated commands or skills, never modifies OpenSpec built-in schemas and never writes into a native spec-driven change's documents
  - id: S4
    scenario: The integration enumerates the consumer documents of an OpenSpec workspace, distinguishing current changes from archived history, so each can carry a scope declaration
  - id: S5
    scenario: Product IDs appear verbatim in citations and configuration, and resolve without translation
  - id: S6
    scenario: The merged rules direct the consumer to find impacted product artifacts as a separate propose step, first by comparing the change's intent with the whole product definition, then by widening the result through the product graph, citing every impacted artifact and naming the neighbours it checked and left out
  - id: S7
    scenario: Default verification excludes archived historical changes; explicitly included archived material has every citation defect reported as a warning, and the scope-declaration gate applies to current documents only
  - id: S8
    scenario: The merged rules direct the consumer to record product-definition drift in its proposal as an explicit warning naming the artifacts involved, carried by a machine-readable drift marker, leaving the resolution to humans through the change process
  - id: S9
    scenario: The product deterministically lists every recorded drift warning across the consumer documents, telling current from archived material and reporting the document, the artifacts involved and the summary, as a report that never blocks
  - id: S10
    scenario: Adding, updating and removing the integration can be reported without performing them, the repository stays byte-identical, and the report matches what performing them produces
  - id: S11
    scenario: An operation that reports no changes changes no byte, and the recorded installation moment is preserved across every later run
  - id: S12
    scenario: Recorded integration metadata that exists but cannot be trusted stops the operation instead of reading as not installed
  - id: S13
    scenario: Adding the integration installs the product schema as managed files, byte-idempotently and dry-run reportable; removing the integration deletes them while preserving user schemas and user files, and a hand-edited managed schema file is reported
  - id: S14
    scenario: A hosted product change validates as an overlay on the untouched baseline, and operations overlapping another live change in either container are reported against each change
  - id: S15
    scenario: Apply of a hosted product change revalidates at apply time, refuses outside the apply-authorised status with the model untouched, writes the delta preserving stable IDs, flips the hosted change status to applied in place and never moves its container
  - id: S16
    scenario: Archiving a hosted product change moves only its container and never applies, authorises or edits the model
  - id: S17
    scenario: Below the product workflow's OpenSpec floor the installed schema files stay intact, the product workflow is reported unavailable rather than usable, and the citation lane keeps working
---

## Requirement

The product MUST integrate with OpenSpec through three mechanisms with distinct ownership.

Citations bind. An OpenSpec document that depends on canonical product text MUST carry a citation to every product artifact it derives from, in inline or marker-block form. Citations live in the consumer document and are authored by whoever authors that document; the product side MUST NOT write citations into native OpenSpec files. Citations are verified against the product model through citation verification.

Configuration informs. The integration merges PDaC authority context and citation rules into the official OpenSpec configuration surface (`openspec/config.yaml`), preserving existing schema, context, rules, guidance, comments and unrelated user configuration. Its repository writes MUST be limited to official OpenSpec surfaces, the configuration file and the project-local schema directory, plus ProductShape's own integration metadata. It MUST NOT patch OpenSpec-generated commands or skills, MUST NOT modify OpenSpec's built-in schemas, and MUST NOT write into a native spec-driven change's documents.

A hosted product workflow governs. The integration MUST install a project-local OpenSpec schema named `product` whose changes host a Product Change: the semantic delta, `product/change.md` plus `product/proposed/**`, inside the OpenSpec change directory, against the accepted model. The installation MUST follow this requirement's managed-surface obligations: byte-idempotent, dry-run reportable, recorded in the integration metadata, verifiable, and removable without touching user-authored files. The product workflow's OpenSpec version floor is capability-specific: below it the installed schema files stay intact and inert, the integration MUST report the product workflow unavailable rather than usable, and the citation lane MUST keep working. A hosted product change MUST validate as an overlay while the baseline stays untouched, and concurrency MUST span both containers: operations overlapping another live change, hosted or under the product definition's active change directory, are reported against each change, while a hosted change in a terminal status is inert change history awaiting its container move. Apply of a hosted product change MUST revalidate at apply time and MUST honour the obligations of `FR-CHANGE-002` with one exception, the container move: the hosted change's status is set to `applied` in place, the framework's own archive operation moves the container later, and that archive MUST NOT apply, authorise or edit the model. The apply-authorised state is `status: approved`; the transition into it belongs to the caller's authorisation policy, and the integration MUST NOT perform or judge that transition.

The merged rules MUST direct the consumer to find the impacted product artifacts as a separate step of its propose phase, before proposal content is written, and MUST define that step as understanding first: the consumer compares the change's intent and goals — the backlog item that started the loop, where one exists — with the whole product definition, finding every artifact the change depends on, alters or contradicts, and only then widens the result through the product graph from each artifact it found. The resulting list goes into the proposal, every impacted artifact is cited from each document of the change that uses it, and a neighbour that was checked and left out is named in the proposal rather than dropped silently.

The merged rules MUST direct the consumer to surface product-definition drift: when the change's goals contradict the product definition, or need behaviour it does not describe, the divergence MUST be recorded in the proposal as an explicit warning naming the artifacts involved, and the decision — propose a Product Change, adjust the change, or another human agreement — belongs to humans through the change process. The consumer MUST NOT fix drift quietly, weaken or omit a citation to hide it, or write around the conflict. Drift is a question of meaning no tool can decide, so a recorded drift warning is never a conformance criterion and citation verification neither detects nor blocks on it.

A recorded drift warning MUST carry a machine-readable marker on a line of its own inside the drift note: `<!-- pdac-drift ids="<ID>[, <ID>...]" summary="<one line>" -->`, where `ids` names the product artifacts involved and `summary` states the divergence in one line. The product MUST provide a deterministic way to list every recorded drift warning across the consumer documents — telling current from archived material — reporting for each the document and location, the artifacts involved and whether each still exists in the current model, and the summary, so a product owner reviews open drift from one listing. The listing is a report and MUST NOT block: it adds no diagnostic, no failing exit code for recorded drift, and no judgement of the drift itself.

The integration MUST be able to enumerate the consumer documents of an OpenSpec workspace — distinguishing current changes from archived history — so that each document can carry a scope declaration and verification can be enforced over a known population. Default verification MUST exclude archived historical changes, because the citation contract fixes the default population to current documents. Including archived material MUST be an explicit request; the citations it carries are then verified, with every problem found in archived material reported as a warning, because archived history cannot be edited and its drift is information rather than something a consumer can fix in place. The scope-declaration gate MUST apply to current documents only. Every current consumer document MUST carry exactly one explicit scope declaration: `pdac-scope: cited` for a bound document that carries at least one citation, or `pdac-scope: none` with a non-empty human-authored reason for an exempt one. Citations alone MUST NOT bind a document, and the integration MUST NOT create or renew an exemption without an explicit human request. Verification MUST fail when an expected current consumer document has no scope declaration. Zero discovered citations MUST NOT automatically mean success. Population-aware verification MUST report the provider identity and the integration version.

Every product artifact ID MUST be preserved verbatim across both mechanisms, so that citations and configuration refer to the same IDs the product model uses.

The integration's repository writes are repository mutations and MUST satisfy `BR-MUTATION-001`. Adding, updating and removing the integration MUST each be reportable without performing them, leaving the repository byte-identical, and the report MUST agree with what performing it produces. An operation that reports no changes MUST change no byte: neither the merged configuration, nor the installed example, nor the recorded integration metadata. The recorded metadata MUST preserve the moment the integration was first installed across every later add, update and no-op; a separate recorded moment MAY state when managed content last changed, and MUST move only when it did. Recorded metadata that exists but cannot be read, parsed or validated MUST stop the operation and be reported, and MUST NOT be treated as an absent record.

## Rationale

The two original mechanisms are split by who owns the words. A citation is a claim the consumer makes about its own text, so it belongs in the consumer's document under the consumer's authorship, and a tool that wrote citations into native documents would colonize the framework the boundary rules protect. Configuration is information the product side supplies through the framework's own customization surface, so it must never pretend to be the consumer's work: the integration adds context and rules additively, and everything it writes is separable from the native workflow without loss.

The hosted product workflow follows the same ownership rule rather than bending it. The project-local schema directory is the framework's official surface for project extensions, exactly as the configuration file is, so installing managed files there is configuration, not a fork: the built-in schemas stay untouched, and a workspace with the integration removed is still a fully valid OpenSpec workspace. The container split follows from ownership too: the accepted model and its change history belong to the product side, the OpenSpec change directory belongs to the framework, so apply materializes the model and sets the hosted status in place while the framework's own archive relocates its container. Authorisation stays a policy of the caller because the change contract fixes the protocol state, approved, and forbids tools from deciding product intent; who performs that transition is a decision the integration has no business making, and validation at apply time is what keeps a stale earlier verdict from authorising a write.

The impact pass starts with understanding because an SDD loop starts from intent written in natural language, and which artifacts that intent depends on, alters or contradicts is a question about meaning that graph traversal cannot answer: traversal widens a list of impacted artifacts, it cannot find the first one. Deterministic tools enforce structure, AI does the understanding, humans decide — so comparing against the whole definition is the agent's job, widening is the graph's, and the resulting citations make the coverage reviewable. Naming what was checked and left out keeps that judgement visible where a reviewer can question it.

Drift is surfaced rather than decided because the divergence is a disagreement between two human-owned statements of intent: the backlog item and the product definition. The consumer can detect that disagreement but must not settle it — `BR-SDD-001` reserves the resolution to humans through the change process. A recorded warning in the proposal is the smallest step that guarantees the disagreement reaches the developer and the product owner; anything less allows silent divergence, anything more has a tool deciding product intent.

The drift marker exists because the warning has two readers: the reviewer of one change reads the prose in place, while the product owner sweeping the workspace needs a listing, and a warning that must be hunted for will be missed. The listing never blocks because a blocking check would punish recording drift, teaching consumers not to record it — the marker buys visibility, not enforcement.

Enumeration and scope declarations are required because verification is framework-blind by constraint and therefore cannot know which documents of a workspace consume product knowledge. That knowledge is framework-specific, so it lives in the integration, and enforcement stands on it: a verifier that cannot name its population can only guess at coverage. Zero discovered citations must not mean success because an empty result could mean the population was not enumerated, not that no citations are needed. The declaration is explicit even where citations exist because it is a statement of intent about the document, and inferring it from content would let a stray citation classify a document nobody reviewed; the exemption carries a reason because the reader deciding whether it still holds needs the why. Archived material is excluded by default because the citation contract fixes the default population to current documents; when a reader explicitly asks for history, its citation defects report at warning severity, since failing on uneditable documents would turn history into a permanent failure. The scope gate stays current-only because binding and exemption are declared while a document is being written, and demanding them from history creates failures no one can honestly resolve.

The mutation obligations matter here for a reason specific to this integration: what it writes is a merge into a file the repository owns. A merge that runs before anyone has seen what it would do, or that rewrites the file byte-identically on every invocation, makes the user's own configuration file unreadable as a record of their decisions. Preserving the first-installation moment is part of the same property — a timestamp that moves on every run records nothing except that the command was run, and it makes every no-op appear in the diff of a file the repository reviews. Failing closed on unreadable metadata is load-bearing beyond hygiene: that metadata records the exact strings this integration injected, and losing it makes the next update append duplicates alongside the entries it should have replaced.

Preserving product IDs is what makes the round trip possible in both mechanisms. A citation of FR-X and configuration recorded against FR-X can be validated against FR-X in the product model without a translation table that could rot. This is the concrete shape of the framework-independence constraint: one integration, a versioned contract, and no OpenSpec concept leaking back into the product model.
