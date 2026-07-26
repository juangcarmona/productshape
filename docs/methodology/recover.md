# Recover

Recover is the brownfield operation: reconstructing a product definition for a system that
already exists. Most products live here — years of shipped behaviour, no canonical definition,
the real product knowledge distributed across code and colleagues.

Be clear about scope up front: **automated recovery is out of scope in v0.1.** This page
documents the workflow, its obligations and its extension point, so that recovery skills and
tools can be built against a stable contract. What v0.1 guarantees is the destination — recovered
knowledge enters the model through the same validated, human-approved paths as everything else.

## Evidence sources

A product definition can be reconstructed from many kinds of evidence, of unequal reliability:

- **Code** — what the system actually does, including behaviour nobody remembers deciding.
- **Tests** — behaviour someone cared enough to pin down; often the closest thing to intent.
- **API surfaces** — the operations and contracts exposed to other systems.
- **User interfaces** — the interactions offered to human actors.
- **Database schemas** — the entities, invariants and constraints the product assumes.
- **Production behaviour** — logs, traces and usage revealing which paths are real.
- **Documentation** — of any age; treat its claims as dated, not as current truth.
- **Tickets and history** — why things changed, and what was rejected along the way.
- **Stakeholder knowledge** — the undocumented rules and meanings in people's heads; often the
  only source for _why_.

## Observed behaviour is not inferred intent

The central discipline of Recover is keeping two statements apart:

- _The system rejects orders above 10,000._ — observed. Verifiable against evidence.
- _Orders above 10,000 require approval because of fraud risk._ — inferred. A hypothesis about
  intent that the evidence does not prove.

Both are valuable; conflating them is how accidental behaviour gets enshrined as product policy.
A recovered candidate always states which kind of claim it is making, and inferred intent stays
labeled as inference until a human confirms it.

## Provenance and confidence

Every recovered candidate carries:

- **Provenance** — which evidence produced it: the code path, the test, the schema, the person.
- **Confidence** — how strongly the evidence supports it. A rule enforced by code and covered by
  tests is not in the same class as a meaning guessed from a column name.

Candidates without provenance are opinions. The human validating recovery must be able to follow
every claim back to its evidence.

This is recorded in the artifact's own frontmatter, in the optional `provenance` object, so it can
be queried and validated rather than living only in prose:

```yaml
provenance:
  source: src/orders/validation.ts (limit check), tests/orders/limits.spec.ts
  confidence: high
  recovered-from: observation
```

`source` and `confidence` are required whenever provenance is present; `recovered-from` classifies
the recovery method (`observation`, `inference`, `interview`, `documentation`) and may be omitted
when the evidence is genuinely more than one of them. The full contract is in the
[Frontmatter reference](../specification/frontmatter-reference.md#provenance).

A `draft` candidate whose confidence is `low` is reported as `PRODUCT111`, so the review queue is
derivable from `prodshape validate` rather than maintained by hand. Greenfield artifacts authored
from intent leave `provenance` unset: there is no evidence to cite.

## Contradictions are findings, not noise

Recovery routinely surfaces conflicts: the code does one thing, the documentation claims another,
two modules use the same term with different meanings, a test asserts behaviour a stakeholder
says is wrong. These contradictions are among the most valuable outputs of the operation — each
one is a product decision that was never actually made, or was made twice. They are surfaced
explicitly, recorded as open questions, and left unresolved until a human resolves them. Recovery
never picks a winner silently.

## Output and validation

Recovery produces draft candidate artifacts — actors, use cases, rules, terms, requirements —
or, when a baseline already exists, a recovery Product Change proposing them as an explicit
delta (see [Change](change.md)). Either way the gate is the same:

**A human must validate recovered semantics before anything becomes canonical.** Deterministic
tooling checks the structure of candidates like any other artifact; no tool and no model decides
that a recovered claim is true. The person validating confirms observed behaviour, judges
inferred intent, resolves or defers contradictions, and approves what enters the model.

## The extension point

The workflow above — evidence in, candidates with provenance and confidence out, contradictions
surfaced, human validation gating the model — is the contract that future recovery skills and
tools implement. v0.1 fixes the contract and the destination formats
([Artifacts](../specification/artifacts.md),
[Product Changes](../specification/product-changes.md)); the automation that fills the pipeline
is deliberately left to later versions and to adopters, who can start today by performing the
workflow manually with AI assistance.
