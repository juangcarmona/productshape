# Adopting in an existing Spec Kit repository

This guide is for repositories that already run [GitHub Spec Kit](https://github.com/github/spec-kit). Product Definition as Code adds a product-definition layer above your existing workflow; Spec Kit keeps owning everything it owns today: the constitution, templates, scripts, the specify/plan/tasks lifecycle and every feature directory.

> These commands use `prodshape`; the `product-definition` alias is equivalent through v0.x. The contracts are fixed in the [specification](https://github.com/product-definition-as-code/spec). See [Limitations](../limitations.md).

## What Product Definition adds

Spec Kit answers "how do we turn a feature description into a specification, a plan and tasks?". Product Definition answers the question upstream of that: "what is the product, and what exactly are we changing about it?". Spec Kit users have asked for that upstream layer repeatedly (spec-kit issues [#404](https://github.com/github/spec-kit/issues/404), [#1047](https://github.com/github/spec-kit/issues/1047), [#1116](https://github.com/github/spec-kit/issues/1116), [#1527](https://github.com/github/spec-kit/issues/1527), all closed as not planned); this integration provides it as a layer above Spec Kit, asking nothing of Spec Kit itself.

- A canonical Product Definition under `docs/product/model`, compiled into a validated product graph.
- Product Changes: explicit, validated semantic deltas against that definition.
- Citations: machine-verifiable references from your feature documents to canonical product text, so drift between the two is detected rather than discovered.
- A cited context projection to start each feature from: `prodshape context <ID> [<ID>...]` renders the canonical text of the artifacts the feature implements, citations attached, ready to feed into your specify run.

Note what is not in that list. Product Definition does not decompose a product definition into features, does not generate specs, and does not gate on whether anything was built. Which features to cut and how to specify them stays with you and Spec Kit.

## Setup

Spec Kit workspaces are created by Spec Kit's own tooling; run `specify init` first if you have not. Then:

```bash
npx prodshape init            # scaffold docs/product/model if you have no definition yet
npx prodshape integration add speckit
```

The integration configures two of Spec Kit's own customization surfaces, plus its own files, all removable with `prodshape integration remove speckit`:

- A managed "Product Grounding (PDaC)" block merged into `.specify/templates/spec-template.md`, `plan-template.md` and `tasks-template.md` (sentinel-delimited; your template content is preserved). Spec Kit's specify, plan and tasks commands copy the resolved template into every document they generate, so the block, and its instruction to cite instead of restate, reaches the generating agent at authoring time.
- `.specify/memory/pdac.md`: a fully managed guidance file carrying the complete rules and exact syntaxes the template blocks point to. It is workflow instruction, never product intent, and it never touches `.specify/memory/constitution.md`.
- `.product/integrations/speckit.ci.yml`: a CI-ready verification example.
- `.product/integrations/speckit.json`: ProductShape's integration metadata.

Brownfield: if the product has no definition yet, recover one from the existing system first (see [brownfield](brownfield.md)).

## The loop, feature by feature

1. Identify the product artifacts the feature implements (compare intent with the model, widen with `prodshape impact <ID>`).
2. `prodshape context BR-REFUND-001 FR-CHECKOUT-002` and feed the projection into your specify run. The canonical text arrives with ready citations; keep them next to the text derived from them.
3. Specify, plan and task natively with Spec Kit.
4. Verify: `npx prodshape citations verify --provider speckit`.

Verification enumerates the `spec.md`, `plan.md` and `tasks.md` of every feature directory under `specs/` and requires each to be bound (it carries citations) or exempt (a human declared `pdac-scope: none`). Zero discovered citations over enumerated documents is a set of failures, never a pass. Spec Kit has no archive lifecycle, so the whole population is current.

When the accepted definition later changes through a Product Change, the citations in affected feature specs report `stale` (`PRODUCT061`), and CI points at exactly the features whose grounding moved. If a feature's goals contradict the definition, record drift with `<!-- pdac-drift ids="..." summary="..." -->` and review it with `prodshape drift --provider speckit`; the resolution is a human decision through the change process, never a quiet edit.

## How citation is enforced instead of re-definition

Three layers, from steering to gate:

1. **Generation time (templates).** Every generated `spec.md`, `plan.md` and `tasks.md` carries the managed Product Grounding section, so the agent filling the template is told to cite (with the exact commands) at the moment it would otherwise paraphrase. The unfilled placeholder deliberately contains no parseable citation and no scope declaration, so it can never satisfy the gate by itself.
2. **Session context (memory).** `.specify/memory/pdac.md` holds the full rules and syntaxes; `prodshape context` supplies the canonical text pre-cited, making the grounded path the cheapest path.
3. **The deterministic gate (the only hard enforcement).** `prodshape citations verify --provider speckit` enumerates the gated documents of every feature and requires each to be bound or exempt. An agent that deletes or ignores the section produces an unclassified document (`PRODUCT064`) and the gate fails; a bound document whose cited artifact later changed reports `PRODUCT061`. Steering can be ignored; the gate cannot.

Optionally, add a citation-discipline principle to your constitution yourself (for example: "Behaviour derived from the product definition is cited by artifact id and digest, never restated; divergence is recorded as drift and resolved through a Product Change"). Spec Kit natively enforces the constitution through the plan template's Constitution Check gate and `/speckit-analyze`. The integration never writes the constitution for you: it is yours, and this keeps product intent out of it.

Two maintenance notes: `specify init --force` and Spec Kit upgrades regenerate templates, which wipes the managed blocks; `prodshape integration check` detects that and `prodshape integration update` re-merges. And if you install a Spec Kit preset or extension that overrides template resolution, the overriding template shadows the project one; merge the block into your override or re-point the preset.

## Optional: the pdac Spec Kit extension (in-loop verification)

The [`speckit-pdac` extension](../../extensions/speckit-pdac/README.md) packages the bridge through Spec Kit's own extension mechanism. It adds two commands, `speckit.pdac.context` (fetch the cited context projection before specifying) and `speckit.pdac.verify` (run the citation gate and repair findings), plus optional hooks that run verification automatically after the specify, plan and tasks phases. That moves the first verification from CI into the generation session itself: an unclassified document or a stale citation surfaces while the agent that produced it can still fix it.

Install from the ProductShape extension catalog (add it once as a trusted install source, then install by name):

```bash
specify extension catalog add https://raw.githubusercontent.com/juangcarmona/productshape/main/extensions/catalog.json --name pdac --install-allowed
specify extension add pdac
```

`specify extension update pdac` follows new releases; every catalog entry pins the release asset and its sha256, verified before install. Alternatives: install from a checkout with `specify extension add /path/to/productshape/extensions/speckit-pdac --dev`, or from a release asset with `specify extension add pdac --from <url>`. Verify with `specify extension list`; remove with `specify extension remove pdac`. The extension only adds commands and hooks over the same deterministic operations; it gains no write authority over the product model, and its hooks degrade to a successful no-op in a workspace without ProductShape. The extension and `prodshape integration add speckit` compose; each also works alone.
