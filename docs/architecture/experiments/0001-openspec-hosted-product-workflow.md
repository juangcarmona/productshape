# Experiment 0001: OpenSpec-hosted product workflow

Status: spike complete, decision pending. This document records what the experiment proved, what it changed, and what remains uncertain. It is an experiment record, not an ADR: no accepted decision is rewritten here, and the tensions with existing ADRs are recorded rather than resolved.

## What was tested

Whether OpenSpec can be the workflow and change engine for PDaC product evolution while ProductShape provides only the deterministic capabilities OpenSpec lacks, without ProductShape's Product Change lifecycle acting as the orchestrator. The spike implements the PRODUCT workflow only; DELIVERY stays a separate future workflow, and a higher-level caller (a human, a command, an agentic wrapper) decides which workflow to invoke and how to compose them.

The shipped shape:

```text
requested product intent
        |
/opsx:new <name> --schema product          OpenSpec change pinned to the managed product schema
        |
/opsx:continue or /opsx:ff                 proposal.md, then product/change.md + product/proposed/**
        |
/opsx:apply <name>                         openspec instructions apply surfaces the schema's apply instruction
        |
node openspec/schemas/product/scripts/product-apply.mjs --change <name>
        |
applyOpenSpecProductChange                 @prodshape/integration-openspec over @prodshape/core
        |
docs/product/model                         written only for a valid change in the apply-authorised state
        |
fresh model validation                     apply ends here and never archives
        |
/opsx:archive <name>                       a separate action; moves only the container
        |
deriveDeliveryContext                      fresh read, fresh graph, impact: the future DELIVERY handoff
```

Evidence: `tests/integration/openspec-product-workflow.test.ts` (deterministic rails end to end on a ten-kind greenfield fixture, including the fail-closed refusals and the schema-pin invariant), `tests/integration/openspec-product-cli.test.ts` (the OpenSpec routing proof against the real CLI), `tests/integration/openspec-product-packed.test.ts` (the production bridge on a packed consumer, no resolution override), `tests/integration/openspec-product-schema.test.ts` (the ownership-proven managed lifecycle), and this repository itself, which installs the schema and passes doctor with the product workflow reported available.

## Upstream constraints that shaped the design (OpenSpec 1.11.0)

- No validation extension point exists: no hook, script, config key or exit gate anywhere in the schema or configuration format. Deterministic validation can only be invoked by an instruction and enforced by the rail itself.
- Artifact completion is file existence; content is never read. Any artifact whose existence stands for a verdict is therefore a false gate, so the spike ships no validation.md: the deterministic validation result is runtime truth inside the apply rail, which revalidates at apply time and fails closed. A prior validate call is never a precondition token, which also removes the time-of-check to time-of-use gap.
- A schema's `generates` can never leave the change directory, and nothing in OpenSpec writes outside `openspec/`. Applying to `docs/product/model` is necessarily the integration's job.
- `openspec archive` is content-agnostic: it moves the whole change directory and merges nothing for a schema without a `specs/` artifact (`skip_specs` is recorded automatically since 1.7.0). Apply and archive stay separate operations; archive owns only the container move.
- Schema dependencies are advisory ordering, not gates, and `openspec validate` checks only the spec-driven shape. The product workflow's floor is 1.7.0 (skip_specs, declaration-order artifacts, schema-agnostic skill instructions); below it the installed schema files are inert and the integration reports the product workflow unavailable while the citation lane keeps working.

## The executable bridge

`/opsx:apply` follows `openspec instructions apply --json`, whose instruction must name a concrete invocation. The bridge is two managed scripts installed with the schema (`product-validate.mjs`, `product-apply.mjs`) that resolve the locally installed `@prodshape/integration-openspec` and call the library rails; they parse arguments and print reports, and duplicate no apply logic.

Two suites prove it at different depths. The CLI suite proves the OpenSpec routing and drives the scripts through the documented entry override, because workspace temp fixtures have no `node_modules`. The packed-consumer suite proves production resolution: it packs `@prodshape/core` and `@prodshape/integration-openspec`, installs the tarballs as local devDependencies in a fresh consumer repository exactly as documented, installs the schema through the installed package by bare specifier, and runs the installed bridge scripts with no override through refusal, dry run, apply and separate archive.

One installation-contract gap remains recorded rather than hidden: the published ProductShape CLI bundles this integration, so a consumer that installed only the CLI does not have `@prodshape/integration-openspec` in `node_modules`, and the bridge says so and stops. The product workflow therefore requires `npm install --save-dev @prodshape/integration-openspec` today (this repository consumes its own package as a workspace devDependency). Whether the supported installation contract should install the package, or a different invocation surface should exist, is a migration question for after the spike; per the spike's constraints no new CLI or bin was added.

## Authorisation policy stays outside the mechanism

`status: approved` in the hosted change.md is the apply-authorised protocol state (PRODUCT028 refuses anything else). Under ProductShape's accepted `BR-CHANGE-001` policy, that state records human product approval. The integration never performs the transition and cannot authenticate or judge its actor from a file; it enforces only the state at the deterministic write boundary. A command or agentic wrapper may route the already-approved change into the rail, but MUST NOT be described as granting product approval. Merging the resulting baseline remains a separate human decision.

## Corrective validation pass

Two independent reviews of the implementation heads reproduced the blockers below; each was reproduced again before its fix and now carries a regression suite.

- Hosted apply was not fully fail-closed. The pre-write blocking set omitted the baseline's own load diagnostics, and per-document defects (parse failures, schema violations, body-section defects) of artifacts a change never touches are load-time diagnostics graph-level overlay revalidation never re-emits, so a valid delta over an invalid baseline applied and only the post-write validation reported PRODUCT002 and PRODUCT009, violating FR-CHANGE-002's resulting-model obligation. Apply now blocks on configuration, baseline, change, operation, concurrency and overlay diagnostics before any mutation, and the refusal leaves the model and the change container byte-identical.
- The managed schema lifecycle could destroy user content: add overwrote a pre-existing user schema, remove deleted hand-edited managed files, and remove with absent metadata deleted a coincidentally named user schema. Ownership is now recorded and proven per ADR 0008: the metadata records each managed file's installed content digest, add fails closed on collisions before writing anything, update replaces only proven-managed content, remove deletes only proven files and preserves and reports hand-edited ones, and with no record nothing under `openspec/schemas/` is touched.
- The rail did not enforce the schema boundary: any change carrying `product/change.md` was treated as a hosted Product Change, so a `spec-driven` change applied through the product rail. The `.openspec.yaml` pin is now load-bearing: only `schema: product` enters listing, validation, apply and concurrency, and missing, malformed or wrong pins fail closed with the model and container untouched.
- The first ownership fix still trusted schema-level metadata too broadly. A hostile recorded path could escape the product schema and delete an arbitrary repository file, a fresh install adopted a byte-identical user file, and obsolete managed assets had no safe lifecycle. Metadata paths and digests are now validated, ownership is proven per exact file, add never adopts a pre-existing file, and update or remove touches an obsolete asset only while its recorded digest still matches.
- Change-container discovery still accepted traversal names and only inspected the `schema` field, so structurally invalid OpenSpec metadata could enter the rail or silently disappear from cross-container concurrency. Names now follow OpenSpec 1.11's kebab-case constraint before path resolution, the complete 1.11 metadata shape is checked locally, and a malformed product-shaped container makes listing, validation, apply and concurrency fail closed.

The pass also replaced the too-strong "bridge proven end to end" claim with the two-suite evidence above, kept the hosted PRODUCT028 runtime mechanism limited to the required state while making the shipped guidance explicit that ProductShape's accepted policy requires human product approval, and added `@prodshape/cli` to the changeset because the CLI ships the bundled integration and its staged schema assets.

## Findings made along the way

- Concurrency now spans both change containers: a hosted change and a native change under `docs/product/changes/active/` touching the same artifact report PRODUCT025 against each other. Before the spike the two containers could not exist, so the blind spot is closed at its birth.
- A hosted change in a terminal status (applied, rejected, superseded) is inert change history awaiting its container move. The native lifecycle expresses that state by location; the hosted container keeps the directory until `openspec archive` runs, so status carries the lifecycle there. Without this rule an applied-but-not-archived change would fire concurrency diagnostics against every successor.
- `planApply` needed no changes: its `set-status` action targets the change's own file wherever it lives, and its contract explicitly lets callers filter the returned action set, which is how the ProductShape-lifecycle `move-change` action stays out of the hosted plan.
- `.product/generated/**` and `.product/cache/**` play no part anywhere: deleting them changes nothing, asserted by test.

## Responsibility classification

| Existing responsibility | Classification after the spike |
| --- | --- |
| Deterministic parsing, schema validation, graph compilation, overlay validation, apply planning and execution, diff, digests (`@prodshape/core`) | Reusable PDaC semantic primitive; still uniquely necessary |
| Graph traversal and impact (`analyzeImpact`) | Reusable PDaC semantic primitive; feeds both workflows and the wrapper |
| Product Change delta format (change.md plus proposed/**) | Reusable PDaC semantic contract; identical in both containers |
| ProductShape Product Change lifecycle (change create, validate, apply, archive over `docs/product/changes/`) | Replaceable by the OpenSpec Product workflow as the change container; still the governing mechanism for repositories without OpenSpec, and still what this repository used for its own model change in this spike |
| Product Change container relocation (active to completed) | OpenSpec capability in the hosted lane (`openspec archive`); lifecycle machinery in the native lane |
| Change scaffolding and status bookkeeping | OpenSpec Product workflow capability (schema templates and instructions; product approval remains human under accepted ProductShape policy) |
| Overlay validation and apply invocation surface | OpenSpec Product workflow capability through the bridge; the deterministic rail stays in the integration library |
| Citations, drift, scope population | Still uniquely necessary; unchanged by this spike and shared by both lanes |
| Deciding PRODUCT versus DELIVERY and composing them | Caller and wrapper responsibility, out of scope here by design; human product approval remains a separate accepted-policy obligation |
| Generated AI guidance (`PDAC_CONTEXT_BLOCK`, rules) | Still necessary; rescoped to name the two lanes |
| `.product/templates/**` | Potentially obsolete for the hosted workflow: the schema instructions reach the canonical templates through `prodshape template <kind>`, so a second template authority under `.product/` is duplication. Existing ProductShape workflows still consume it; recorded as a migration question, nothing deleted |
| `.product/generated/**` | Optional, regenerable export; confirmed outside the runtime architecture |

## The five questions

1. Can OpenSpec Product changes replace ProductShape Product Changes as the workflow and change container? Yes for the container and the orchestration: the spike governed real PDaC changes end to end with OpenSpec owning new, continue, apply routing and archive, and the deterministic rails enforcing PDaC semantics. The replacement is not yet total: repositories without OpenSpec still need the native lifecycle, and this repository's own governance used it in this very pull request.
2. What deterministic PDaC capabilities must remain in `@prodshape/core`? Everything the spike reused: parsing and schema validation, graph compilation and traversal, overlay validation with the change codes, apply planning and fail-closed execution, digests and diffs, impact, and the repository path contract. No core change was needed, which is itself a finding: the primitives were already container-agnostic.
3. Which current ProductShape workflow responsibilities become unnecessary? In the hosted lane: change scaffolding, the active directory convention, archive-state directories and the container move. The semantic obligations (validation, drift, status gate, diff) all remain, provided by the rails rather than the lifecycle.
4. Is maintaining both containers justified by any unique guarantee? The native lifecycle's unique guarantees today are independence from OpenSpec and location-expressed lifecycle states that need no status field trust. Cross-container concurrency now removes the strongest argument against coexistence (silent overlap). Long term, two containers are two things to explain; the assessment leans toward one container per repository, chosen by whether the repository runs OpenSpec, rather than both at once.
5. What minimum capability will the future Delivery schema need to consume the freshly accepted product model? Exactly what `deriveDeliveryContext` proves: re-read `docs/product/model` from disk, recompile the graph, verify the model is error-free, and select context (artifacts, digests, impact neighbourhoods) for the delivery change to cite. No proposal state, no generated files, no carry-over from the product workflow.

## Tensions recorded, not resolved

- ADR 0005 says the integration never generates OpenSpec's own files, and ADR 0004 fixes `docs/product/changes/active/` as the location of every semantic evolution. The accepted model was amended through CHG-OPENSPEC-PRODUCT-001 (the schema directory is an official extension surface; hosting is a second container), but the ADRs still describe the pre-spike architecture. If the experiment is adopted, both ADRs need successors; an experiment does not rewrite them.
- The PDaC specification locates Product Changes under `docs/product/changes/` and fixes apply's final obligation as the move to `changes/completed/`. The hosted lane satisfies every apply obligation except that move, which the container's owner performs instead. Whether the specification should recognise a hosted container is a spec-level question this implementation spike deliberately does not answer.
- The bridge's installation requirement (the integration package as a local dependency) is the weakest link in the `/opsx:apply` path and the first thing a promotion decision should settle.

## Explicitly out of scope, unchanged by this spike

The delivery schema and workflow, the wrapper that composes PRODUCT and DELIVERY, Issue automation and classification, ADR work, the ProductShape CLI surface, `docs/product/changes/**` and every existing command, `openspec/specs` as anything other than consumer documents, and stock `/opsx:sync`, which remains delta specs into `openspec/specs` and plays no part in the product lane.
