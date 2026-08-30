# Adopting in an existing OpenSpec repository

This guide is for repositories that already run OpenSpec. Product Definition as Code adds a product-definition layer above your existing workflow; OpenSpec keeps owning everything it owns today. This repository itself works exactly this way.

The order of adoption is: install the layer with one command, recover the product definition from the system you already have through an agent-driven session, accept it by merge, then let your OpenSpec documents cite it instead of restating it.

> These commands target the supported published baseline, [`@prodshape/cli@0.16.0`](https://www.npmjs.com/package/@prodshape/cli/v/0.16.0), which includes the OpenSpec integration. They use `prodshape`; the `product-definition` alias is equivalent through v0.x. The contracts are fixed in the [specification](https://github.com/product-definition-as-code/spec). See [Limitations](../limitations.md).

## What Product Definition adds

OpenSpec answers "how do we specify, design and verify this implementation increment?". Product Definition answers the question upstream of that: "what is the product, and what exactly are we changing about it?". It adds:

- A canonical Product Definition under `docs/product/model`: actors, journeys, use cases, rules, terms, contexts, requirements and constraints, compiled into a validated product graph.
- Product Changes: explicit, validated semantic deltas against that definition, each carrying the reason it exists.
- Citations: machine-verifiable references from your OpenSpec documents to canonical product text, so drift between the two is detected rather than discovered.

Note what is not in that list. Product Definition does not decompose your work, does not hand you a package, and does not gate on whether anything was built. Whether accepted product intent has been implemented is a fact about delivery, and delivery is yours.

## What OpenSpec keeps owning

Everything native. The `openspec/` directory, its folder layout, `proposal.md`, `design.md`, `tasks.md`, spec deltas, the propose/apply/archive lifecycle and its tooling are unchanged. Product Definition never writes into OpenSpec's own artifacts, never drives its lifecycle, and OpenSpec never rewrites canonical product knowledge.

## Step 1: install the layer

```bash
npx prodshape init --sdd openspec --ai copilot --full
```

One command, three effects, all reversible:

- `init --full` creates `docs/product/` (the model, the change lifecycle, the archives) and `.product/` (configuration, authoring templates, generated outputs). Prefer `--full` for a real system; the default kernel layout is deliberately minimal.
- `--sdd openspec` merges the PDaC citation rules additively into `openspec/config.yaml` (your entries survive; `prodshape integration remove openspec` takes it back out) and installs a CI-ready example at `.product/integrations/openspec.ci.yml`.
- `--ai copilot` generates the agent surface described next. Pick your provider, or several: `--ai claude,copilot,codex`.

Add `--dry-run` first to see every file the command would write. Check the result any time with `prodshape doctor`, and after upgrading the CLI regenerate everything with `prodshape integration update`.

## The AI integrations

Every provider gets the same command and skill set, rendered where that tool looks for them. The commands are thin prompts; the skills carry the procedure, so the behaviour is identical across providers.

| Provider | Files generated | You trigger |
| --- | --- | --- |
| `copilot` | `.github/prompts/product-*.prompt.md` and `.github/skills/<name>/` | `/product-recover`, `/product-define`, `/product-change`, ... |
| `claude` | `.claude/commands/product/*.md` and `.claude/skills/<name>/` | `/product:recover`, `/product:define`, `/product:change`, ... |
| `codex` | `.agents/commands/product/*.md` and `.agents/skills/<name>/` | the Agent Skills open standard layout; works with any tool that reads it |

The commands: `recover` (rebuild the definition from an existing system), `define` (author new product intent), `change` (elaborate a Product Change), `explore` (think through a fuzzy idea against the model), `impact` (structural impact of touching an artifact), `audit` (review model quality), `bind` (backfill scope declarations and citations into existing SDD documents once a baseline exists), `refine` (interview you through the model's weak spots and turn the answers into a Product Change). All of them propose; none of them can accept, apply to the baseline, or merge. `--shorthand` adds `/ps:` aliases.

## Step 2: recover the definition with the agent

Your repository already runs OpenSpec, so the product knowledge exists: in `openspec/specs/`, in the code, in tests, in people. Recovery is the brownfield path, it is agent-driven end to end, and it writes the reserved first change `CHG-INITIAL` for you. Trigger it and tell the agent where the knowledge lives, inside the repository and beyond it. For example:

```text
/product-recover  NOTE: most of the product documentation is in docs/, and the onboarding guide lives in Confluence at https://yourcompany.atlassian.net/wiki/spaces/PROD; you may read it.
```

Tell it what it cannot discover on its own: where documentation lives, which external sources exist, what is out of scope. What the repository already states needs no telling; `openspec/specs/` is by definition implemented truth, and the workflow treats it as evidence without being asked. Naming an external source like that Confluence page is what authorises the agent to read it; external files and URLs you have not named and approved stay unread, and everything the agent does read is registered and hashed as evidence so later drift in it is detected too.

What happens, in order:

1. **The brief comes first.** Before reading anything, the agent drafts a recovery brief and puts it to you: product scope, known terminology, source authority order (for example User > Tests > Code > Documentation), ordered evidence tiers that drive the batch order (`openspec/specs/` and product documentation first, source code last, instead of alphabetical luck), which secondary evidence to use, batch size, the areas where it must confirm with you instead of deciding, and optionally a `git.branch` declaration: with it, the session runs on that dedicated branch and the CLI records one checkpoint commit per step, so undoing the whole experiment is deleting a branch. Nothing is read until you approve.
2. **You decide what counts as evidence.** Expect targeted questions. Your `openspec/specs/` directory is the highest-value evidence in the repository, since it already states behaviour in product terms and has survived review; include it. Proposed changes under `openspec/changes/` are speculative rather than current truth; usually exclude them.
3. **The session runs in bounded batches.** `prodshape recover start` inventories and hashes every authorised source in the brief's tier order; the agent processes them through `recover next`, classifies every relevant section, and persists every lead, contradiction and question through `recover` commands. Whole classes of corroborating material (typically implementation code) are classified in one bulk call, `recover mark --glob 'src/**' ...`, instead of a thousand single marks, and a wrong finding is retracted with `recover unmark` rather than by editing session state. Progress lives in the session state, not in the chat, so the session survives interruption and resumes from `prodshape recover status`. `prodshape recover check` re-hashes evidence and verifies nothing escaped.
4. **Everything lands inside `CHG-INITIAL`.** Candidates arrive under `docs/product/changes/active/chg-initial/proposed/`, each carrying `provenance` (the evidence behind it) and a confidence level, with observed behaviour and inferred intent labelled apart. The accepted model under `docs/product/model` is never touched; the agent never applies, commits or merges.
5. **You accept, or you do not.** The session ends with a report, the candidate list with confidence, the contradictions and the open questions. Review `CHG-INITIAL`, decide, set it to `approved`, then:

```bash
npx prodshape change validate CHG-INITIAL
npx prodshape change apply CHG-INITIAL
```

Apply materializes the model on your working branch and archives the change; it never commits. Open a pull request; the merge is what accepts the baseline. Once accepted, `/product-refine` picks up where recovery stopped: it interviews you through the low-confidence queue (`PRODUCT111`), the deferred questions and any recorded drift, one question at a time, and turns your answers into an ordinary Product Change.

As a scale reference: recovering [DomusMind](https://github.com/juangcarmona/domusmind), a family-organizer with OpenSpec specs for areas, calendar, family, lists, meal planning, tasks and its web app, inventoried 1103 evidence sources and processed them in batches of ten, with the OpenSpec specs included as evidence and one proposed change under `openspec/changes/` excluded as speculative.

Greenfield instead? If there is no built system to recover from, skip recovery: author intent with `/product-define`, or scaffold `CHG-INITIAL` by hand with `prodshape change create CHG-INITIAL`. The [greenfield guide](greenfield.md) covers that path.

That first session's lessons are what shaped the current workflow: the brief's evidence tiers, bulk classification, retractable findings and the opt-in git checkpoint discipline all come from where it struggled. If you run a recovery, [open an issue](https://github.com/juangcarmona/productshape/issues) with what the session produced and where it struggled; real sessions are the evidence the next iteration is shaped from.

## Step 3: bind the documents you already have

Recovery reads your OpenSpec documents as evidence; it never writes into them. So the moment the baseline lands, every existing document under `openspec/specs/` (and in any active change) is still `unclassified`: it declares no scope and cites nothing, and Step 4's verification will fail on all of them, by design. That gap is the point: it forces the binding to actually happen instead of being assumed.

`/product-bind` (the `bind-consumers` skill) drives the backfill. Per current document, the agent finds the governing artifacts, inserts citations under the text they ground, and declares `pdac-scope: cited`; where a document contradicts the model it records a drift marker for you instead of quietly fixing either side, where the document knows something the model does not it proposes a Product Change candidate, and exemptions (`pdac-scope: none`) are written only with a reason you approved. Done means the Step 4 command exits clean. Ship the applied `CHG-INITIAL` and the bindings in the same pull request when you can: the baseline and the documents grounded on it are one reviewable decision.

For the documents you write afterwards, the rule is the same in the small: cite instead of restating. Print a citation record (the digest is computed for you) and paste it into the spec inside a Markdown comment, after the requirement text, never between the heading and the text, because OpenSpec reads the first paragraph under a requirement heading as the requirement itself:

```bash
prodshape cite --id BR-REFUND-001 --file docs/product/model/business-rules/br-refund-001.md
```

```diff
 ### Requirement: Refund handling

-The system SHALL accept refund requests within 30 days of delivery and reject later requests with a clear message.
+The system SHALL accept refund requests within the refund window defined by BR-REFUND-001 and reject later requests with a clear message.
+
+{pdac:cite id="BR-REFUND-001" digest="sha256:b5c5806732cb3e3f32a6b7da97fd3e712a1bb733b4bb50e2840874ae64713228"}
```

Never write a citation record by hand: only `prodshape cite` and `prodshape context` emit them. `prodshape context <ID> [<ID>...]` renders the canonical text with citations attached, ready to feed an OpenSpec change from cited material instead of paraphrase. The merged rules in `openspec/config.yaml` direct the agent working a change through an impact pass first: compare the item's intent with the whole definition, widen with `prodshape impact <ID>`, cite every impacted artifact. If the item contradicts or goes beyond the definition, the rules require an explicit drift marker on its own line, `<!-- pdac-drift ids="BR-REFUND-001" summary="PBI wants 14 days; the rule says 30" -->`, so the developer and the product owner decide together. `prodshape drift --provider openspec` lists all recorded drift; it is a report, never a gate, because a failing check would teach people not to record drift.

## Step 4: verify, and gate it in CI

```bash
prodshape citations verify --provider openspec
```

Provider-aware verification enumerates the expected OpenSpec consumer documents (each change's `proposal.md`, `design.md`, `tasks.md` and spec deltas, plus `openspec/specs/`) and gives each current document exactly one scope state: `bound` (declares `pdac-scope: cited` and carries at least one citation), `exempt` (a human declared `pdac-scope: none` with a non-empty reason), or `unclassified`, which fails (`PRODUCT064`). Citations alone never bind, exemption is never inferred from missing citations, and because the population is enumerated, zero citations over current documents is a set of failures, never a vacuous pass. Archived changes are excluded by default; `--include-archived` checks the citations history carries, reported as warnings, since archived history cannot be fixed in place.

Every citation resolves to one status: `current`, `stale` (the cited artifact changed; a warning), `tampered` (an embedded projection was hand-edited; an error) or `unresolved` (the cited ID or anchor no longer exists; an error). When a later Product Change moves an artifact your specs cite, the affected citations report `stale` with file and line, so nobody has to remember which specs depend on which rules.

By default `stale` reports without blocking. To make it block the merge, set `warnings-as-errors: true` under the existing `validation:` key in `.product/config.yaml`; the same command then exits 1. The installed `.product/integrations/openspec.ci.yml` is a CI-ready example that states how your repository's chosen policy applies; the integration never changes that policy for you. Keep the two pipeline verdicts separate: `openspec validate` is about your specs, `prodshape citations verify --provider openspec` is about their grounding, and neither invokes or fails the other.

## Where the boundary is enforced

- **Consumers never write to the model.** An OpenSpec change that discovers a business rule is wrong reports it; it does not edit `docs/product/model`. The correction flows through a Product Change like any other evolution.
- **Archiving never accepts anything.** Completing and archiving the OpenSpec change is OpenSpec's decision and only OpenSpec's. It cannot approve or apply a Product Change, accept a Product Definition or attest delivery.
- **Applying is not accepting.** `prodshape change apply` materializes a change into the working tree and creates no commit. A pull-request merge accepts the resulting baseline.
