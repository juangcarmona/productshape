# Shillinq VAT replay — results

Companion to [PROTOCOL.md](PROTOCOL.md). Baseline, arms, outcome scale and
validity threats are defined there and not repeated.

## Verdict summary

| Failure | Arm 1a change gate | Arm 1b citation gate | Arm 1c evasion | Arm 2a proposer | Arm 2b implementer |
|---|---|---|---|---|---|
| F1 second VAT model | MISSED | BLOCKED* | evaded | _pending_ | _pending_ |
| F2 forbidden controller/service | MISSED | BLOCKED* | evaded | _pending_ | _pending_ |
| F3 missing tenant rule | MISSED | BLOCKED* | evaded | _pending_ | _pending_ |

\* Blocked for being *unbound*, not for being *wrong*: PRODUCT064 fails the
packet because no document cites the product model at all. The block is
indiscriminate across F1/F2/F3 — it stops the packet, it does not name the
contradictions.

## Arm 1a — deterministic change gate: MISSED

CHG-VATBTW-REPLAY-001 transcribes the June packet's product-visible deltas
(TERM-VATRETURN with the 17-field model and verified/filed lifecycle;
UC-VATRETURN-FILING-001; FR-VATRETURN-REGISTERS-001 for the three registers;
FR-VATRETURN-API-001 for the seven endpoints, three controllers and
VATReturnService) as a faithful scribe, next to a baseline that contains
TERM-VAT-RETURN, BR-VAT-SINGLE-ENTITY-001 and BR-VAT-GENERIC-API-001.

```
$ prodshape change validate CHG-VATBTW-REPLAY-001
0 error(s), 0 warning(s) across 11 artifact(s) and 1 live change(s)
```

The overlay validator checks structure, references and ID uniqueness
(PRODUCT005/PRODUCT023 are ID-level); it has no semantic-duplicate or
rule-contradiction diagnostics. A Product Change that adds a second model of
an existing entity, under a different ID, validates clean. This confirms the
external audit's caution verbatim: current machinery cannot infer that
VatReturn and VATReturn mean the same business object.

What the workflow does add over the historical process: the contradiction is
now *reviewable in one place* — a human product approval is mandatory before
apply, and the reviewer of this change sees `add: TERM-VATRETURN` in a model
whose terms directory already contains `term-vat-return.md`. That is
process-level visibility, not a diagnostic. Full output:
[results/arm1a-change-validate.txt](results/arm1a-change-validate.txt).

## Arm 1b — deterministic citation gate: BLOCKED (indiscriminately)

The verbatim historical packet (proposal.md, design.md, tasks.md,
specs/bookkeeping-vat-btw-filing/spec.md at Shillinq commit `58414417`),
placed as a live OpenSpec change with zero modification:

```
$ prodshape citations verify --provider openspec
error PRODUCT064 .../proposal.md: Consumer document is unclassified: declare
  'pdac-scope: none' (exempt) or bind it with at least one PDaC citation
error PRODUCT064 .../design.md:   (same)
error PRODUCT064 .../tasks.md:    (same)
error PRODUCT064 .../specs/bookkeeping-vat-btw-filing/spec.md: (same)
4 document(s): 0 bound, 0 exempt, 4 unclassified
0 citation(s): 0 current, 0 stale, 0 tampered, 0 unresolved
```

The packet as historically authored cannot merge under this CI gate. Zero
citations is a set of failures, never a pass. Note the precise character of
the block: PRODUCT064 fires because the packet ignores the product model
entirely — which is the actual root failure in the historical episode — but
it would fire identically on a perfectly conforming uncited packet. It
blocks the *disconnection*, not the *contradiction*. Full output:
[results/arm1b-verbatim-verify.txt](results/arm1b-verbatim-verify.txt).

The integration's proposal rule goes further than the mechanical gate: "If
the change implements altered product behaviour, name the Product Change
(CHG id) ... If no overlay-validated and human-approved Product Change
exists yet, stop and ask for one instead of proceeding." The June packet
alters product behaviour (new entity, new lifecycle, new API surface), and
no such Product Change exists — under the contract, a conforming author must
stop at the proposal stage. Whether an agent under pressure actually stops
is what Arm 2b measures.

## Arm 1c — adversarial evasion: gate passes, contradiction intact

Minimum evasion: `<!-- pdac-scope: none -->` on proposal, design and
spec.md; one mechanically valid citation of FR-VAT-STORE-001 pasted at the
top of tasks.md — the requirement that the tasks most directly violate.

```
$ prodshape citations verify --provider openspec
4 document(s): 1 bound, 3 exempt, 0 unclassified
1 citation(s): 1 current, 0 stale, 0 tampered, 0 unresolved
```

Green. The digest machinery verifies integrity and freshness of the cited
text, not the semantic consistency of the citing document with it. The
contract anticipates this ("Binding and exemption are human declarations:
never declare 'pdac-scope: none' merely because citations are missing") but
cannot enforce it; the enforcement surface is the pull-request diff, where
three blanket exemptions on a feature that plainly touches product behaviour
are anomalous and reviewable. Full output:
[results/arm1c-evasion-verify.txt](results/arm1c-evasion-verify.txt).

## Arm 2a — agent proposer replay

_Pending: agent running at time of writing. Result inserted below when its
final report arrives; transcript retained under transcripts/._

## Arm 2b — agent implementer replay

_Pending: agent running at time of writing._

## Conclusions

_Pending Arm 2._
