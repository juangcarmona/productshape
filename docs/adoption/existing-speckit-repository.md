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

The integration writes exactly three files, all removable with `prodshape integration remove speckit`:

- `.specify/memory/pdac.md`: a fully managed guidance file for the agents that run your specify, plan and tasks commands. It is workflow instruction, never product intent, and it never touches `.specify/memory/constitution.md`.
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
