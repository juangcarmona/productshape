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

Evidence: `tests/integration/openspec-product-workflow.test.ts` (deterministic rails end to end on a ten-kind greenfield fixture), `tests/integration/openspec-product-cli.test.ts` (the OpenSpec routing proof and the bridge execution proof against the real CLI), `tests/integration/openspec-product-schema.test.ts` (managed schema lifecycle), and this repository itself, which installs the schema and passes doctor with the product workflow reported available.

## Upstream constraints that shaped the design (OpenSpec 1.11.0)

- No validation extension point exists: no hook, script, config key or exit gate anywhere in the schema or configuration format. Deterministic validation can only be invoked by an instruction and enforced by the rail itself.
- Artifact completion is file existence; content is never read. Any artifact whose existence stands for a verdict is therefore a false gate, so the spike ships no validation.md: the deterministic validation result is runtime truth inside the apply rail, which revalidates at apply time and fails closed. A prior validate call is never a precondition token, which also removes the time-of-check to time-of-use gap.
- A schema's `generates` can never leave the change directory, and nothing in OpenSpec writes outside `openspec/`. Applying to `docs/product/model` is necessarily the integration's job.
- `openspec archive` is content-agnostic: it moves the whole change directory and merges nothing for a schema without a `specs/` artifact (`skip_specs` is recorded automatically since 1.7.0). Apply and archive stay separate operations; archive owns only the container move.
- Schema dependencies are advisory ordering, not gates, and `openspec validate` checks only the spec-driven shape. The product workflow's floor is 1.7.0 (skip_specs, declaration-order artifacts, schema-agnostic skill instructions); below it the installed schema files are inert and the integration reports the product workflow unavailable while the citation lane keeps working.

## The executable bridge

`/opsx:apply` follows `openspec instructions apply --json`, whose instruction must name a concrete invocation. The bridge is two managed scripts installed with the schema (`product-validate.mjs`, `product-apply.mjs`) that resolve the locally installed `@prodshape/integration-openspec` and call the library rails; they parse arguments and print reports, and duplicate no apply logic. The bridge is proven end to end in the CLI suite.

One installation-contract gap was discovered and is recorded rather than hidden: the published ProductShape CLI bundles this integration, so a consumer that installed only the CLI does not have `@prodshape/integration-openspec` in `node_modules`, and the bridge says so and stops. The product workflow therefore requires `npm install --save-dev @prodshape/integration-openspec` today (this repository consumes its own package as a workspace devDependency). Whether the supported installation contract should install the package, or a different invocation surface should exist, is a migration question for after the spike; per the spike's constraints no new CLI or bin was added.

## Authorisation is policy, not mechanism

`status: approved` in the hosted change.md is the apply-authorised protocol state (PRODUCT028 refuses anything else). The transition into it belongs to the caller's authorisation policy: a human, a command, an agentic wrapper or an automated workflow. The integration never performs or judges that transition, nothing requires interactive confirmation, and the tests assert only the state, never who produced it. Merging the resulting baseline remains a human decision, as the accepted contract requires.

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
| Change scaffolding and status bookkeeping | OpenSpec Product workflow capability (schema templates and instructions; status transitions are caller policy) |
| Overlay validation and apply invocation surface | OpenSpec Product workflow capability through the bridge; the deterministic rail stays in the integration library |
| Citations, drift, scope population | Still uniquely necessary; unchanged by this spike and shared by both lanes |
| Deciding PRODUCT versus DELIVERY, composing them, authorising apply | Caller and wrapper responsibility, out of scope here by design |
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
