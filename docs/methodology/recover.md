# Recover

Recover is the brownfield operation: reconstructing a product definition for a system that already exists. Most products live here — years of shipped behaviour, no canonical definition, the real product knowledge distributed across code and colleagues.

Be clear about scope up front: **semantic extraction is never automated.** No tool scans a codebase and emits a product model; reading meaning out of evidence belongs to the person doing the recovery and the assistant helping them. What the tooling makes deterministic is everything around that judgement: the evidence population and its hashes, per-source coverage, checkpoints and resumption, leads and questions, validation, and the guarantee that recovered knowledge enters the model through the same validated, human-approved path as everything else.

## Evidence sources

A product definition can be reconstructed from many kinds of evidence, of unequal reliability:

- **Specification documents** — SDD artifacts (OpenSpec's `openspec/specs/`, Spec Kit's feature specs): behaviour already stated in product terms that survived review. Usually the densest starting point, which is why a recovery brief typically tiers them first.
- **Code** — what the system actually does, including behaviour nobody remembers deciding.
- **Tests** — behaviour someone cared enough to pin down; often the closest thing to intent.
- **API surfaces** — the operations and contracts exposed to other systems.
- **User interfaces** — the interactions offered to human actors.
- **Database schemas** — the entities, invariants and constraints the product assumes.
- **Production behaviour** — logs, traces and usage revealing which paths are real.
- **Documentation** — of any age; treat its claims as dated, not as current truth.
- **Tickets and history** — why things changed, and what was rejected along the way.
- **Stakeholder knowledge** — the undocumented rules and meanings in people's heads; often the only source for _why_.

## Observed behaviour is not inferred intent

The central discipline of Recover is keeping two statements apart:

- _The system rejects orders above 10,000._ — observed. Verifiable against evidence.
- _Orders above 10,000 require approval because of fraud risk._ — inferred. A hypothesis about intent that the evidence does not prove.

Both are valuable; conflating them is how accidental behaviour gets enshrined as product policy. A recovered candidate always states which kind of claim it is making, and inferred intent stays labeled as inference until a human confirms it.

## Provenance and confidence

Every recovered candidate carries:

- **Provenance** — which evidence produced it: the code path, the test, the schema, the person.
- **Confidence** — how strongly the evidence supports it. A rule enforced by code and covered by tests is not in the same class as a meaning guessed from a column name.

Candidates without provenance are opinions. The human validating recovery must be able to follow every claim back to its evidence.

This is recorded in the artifact's own frontmatter, in the optional `provenance` object, so it can be queried and validated rather than living only in prose:

```yaml
provenance:
  source: src/orders/validation.ts (limit check), tests/orders/limits.spec.ts
  confidence: high
  recovered-from: observation
```

`source` and `confidence` are required whenever provenance is present; `recovered-from` classifies the recovery method (`observation`, `inference`, `interview`, `documentation`) and may be omitted when the evidence is genuinely more than one of them. The full contract is in the [Frontmatter reference](../specification/frontmatter-reference.md#provenance).

A `draft` candidate whose confidence is `low` is reported as `PRODUCT111`, so the review queue is derivable from `prodshape validate` rather than maintained by hand. Greenfield artifacts authored from intent leave `provenance` unset: there is no evidence to cite.

## Contradictions are findings, not noise

Recovery routinely surfaces conflicts: the code does one thing, the documentation claims another, two modules use the same term with different meanings, a test asserts behaviour a stakeholder says is wrong. These contradictions are among the most valuable outputs of the operation — each one is a product decision that was never actually made, or was made twice. They are surfaced explicitly, recorded as open questions, and left unresolved until a human resolves them. Recovery never picks a winner silently.

## Output and validation

Initial recovery produces the proposed future state of `CHG-INITIAL`: draft candidate artifacts under the change's `proposed/` directory, never edits to the accepted model. When a baseline already exists, recovered knowledge is proposed as an ordinary Product Change instead (see [Change](change.md)); `CHG-INITIAL` is the reserved initialisation change and is never reused. Either way the gate is the same:

**A human must validate recovered semantics before anything becomes canonical.** Deterministic tooling checks the structure of candidates like any other artifact; no tool and no model decides that a recovered claim is true. The person validating confirms observed behaviour, judges inferred intent, resolves or defers contradictions, and approves what enters the model.

## The recovery session

Whole-repository recovery outlives any single sitting, so the workflow runs as a bounded, resumable session with a deterministic split of responsibilities. The CLI (`prodshape recover ...`) owns the bookkeeping: it inventories the authorised evidence population from a user-authored recovery brief (repository roots and filters, plus user-provided files and explicitly authorised online resources), hashes every hashable source, serves bounded batches in the brief's declared tier order, records how each source was classified (one source at a time, or one identical finding across a whole selection in a single bulk call), retracts a wrong finding on request instead of leaving session files to be edited by hand, tracks leads and questions with their answers, detects changed or missing evidence, revalidates the `CHG-INITIAL` overlay, computes coverage and completion, and writes the final report. When the brief opts in with a dedicated recovery branch, the CLI also records one checkpoint commit per state-mutating command, so the working tree matches persisted state at every boundary and the whole session is disposable by deleting the branch. The recovery skill owns the semantics: reading evidence, extracting candidates with provenance and confidence, reconciling duplicates and contradictions, and asking the user when meaning is uncertain. Session state lives under the generated-output root, is schema-validated, survives interruption, and is never canonical.

A session is complete only when every authorised source is classified, every lead is resolved, every question is answered or explicitly deferred, all artifact families were probed, duplicates are reconciled, the overlay validates, no evidence hash is stale, and the accepted model is untouched. The final report states all of it, including that nothing was accepted: acceptance stays with the human reviewing the change.
