<!-- pdac-scope: cited -->

# <Requested product change title>

Declare the document scope on the first line: keep `pdac-scope: cited` when this proposal carries citations (the normal case), or replace it with `<!-- pdac-scope: none reason="<why no product text is involved>" -->`.

## Why

The request as it arrived: the Issue, ask or observation that started this change, in one or two sentences.

## Requested Product Intent

What the product should mean once this change is accepted, in product language. Destination, not steps; no implementation detail.

## Impacted Product Areas

Every accepted artifact this intent depends on, alters or contradicts. One line per artifact: the id, why it is impacted, and a citation payload on its own line directly under it (emit with `prodshape cite --id <ID> --digest <digest>`, never write one by hand).

## Neighbours Checked and Left Out

Artifacts inspected through the graph (impact, relationships) and judged out of scope, each with the one-line reason. Write `None.` when the impact list already covers everything inspected.

## No Product Delta

Only when the honest verdict is that this request changes no product meaning: state that verdict and the reason, and stop the workflow here (no delta artifact follows). Delete this section otherwise.

## Open Questions for the Product Owner

Questions that must be answered before the delta can be authored or authorised. Write `None.` when there are none.
