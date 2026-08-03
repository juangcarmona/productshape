# Design: add-snapshot-ranked-search

## Context

The search carried forward from `SLI-SNAPSHOT-002` and untouched by the two slices since is a single pass over the artifact list that pushes any substring match and breaks at 25 hits. It has no notion of where the match occurred, so a body mention and a title match are indistinguishable, and document order decides what a reader sees.

Everything ranking needs is already available in the browser: each artifact in the embedded data carries its identifier, title, kind and rendered body, and the plain-text index built lazily for the existing search is reusable as-is.

## Goals / Non-Goals

**Goals**

- Rank by where the match occurred, in the order `FR-SNAPSHOT-004` fixes.
- Match kinds as well as identifiers, titles and bodies.
- Report total matches whenever display is limited; never drop a higher-ranked match for a lower one.
- Keyboard operation, clearing that preserves the selection, an explicit no-results state.
- Deterministic ordering.
- Do not regress artifact-selection latency; set the search-latency budget from measurement.

**Non-Goals**

- Fuzzy matching, stemming, synonym expansion, or relevance scoring beyond the fixed tier order. The ranking is specified and deterministic, not learned or tuned.
- Semantic or AI-assisted search.
- Searching anything the snapshot does not contain — history, active changes, slices, handoffs.
- The focused neighbourhood and layered map (`SLI-SNAPSHOT-006`).

## Decisions

### D1 — Five integer tiers, sorted by (tier, identifier)

Each match is classified into the tier `FR-SNAPSHOT-004` names — exact id, id prefix, exact-or-prefix title, title substring, body — and results sort by tier, then by identifier. Identifiers are unique and stable by rule, so the ordering is **total**: no ties, nothing left to arrival order, and identical content yields identical results without any extra sorting key.

**An identifier substring that is not a prefix sits in the title-substring tier.** `FR-SNAPSHOT-004` requires partial identifiers to be matched and names "identifier prefix" as tier 2, but says nothing about where a mid-identifier match belongs — `product` inside `UC-PRODUCT-READ`, for instance. It goes in the substring tier, below prefix-title matches, because a match in the middle of an identifier is weaker evidence of intent than a title that begins with the query. The requirement leaves this open; recording it so the boundary is a decision rather than an accident of implementation order.

Kind matching folds into the title tier rather than earning its own: a reader typing `use case` is expressing the same kind of intent as typing a title, and giving it a separate tier would mean choosing whether kind beats title on no evidence.

### D2 — Score every artifact, then cap; never cap then score

The previous implementation stopped scanning at the cap, which is what made ranking impossible — it could not know whether a better match existed further down. Scoring now visits every artifact and the cap applies to _display_ only.

This is the one place the slice spends time it did not spend before, and it is spent deliberately: a cheap wrong answer is what the slice exists to remove. Measured against the representative models; the budget follows the figures.

### D3 — The total match count is always reported when display is limited

The count comes from the full scored set, so "73 matches, showing 25" is a fact rather than an estimate. Without it a reader who sees five results concludes the model lacks what they are looking for, and the snapshot's entire claim is that it contains the model completely. This is a correctness requirement, not a courtesy.

### D4 — Snippets come from the same plain-text index, windowed around the match

The lazily built lowercase body index locates the match; the snippet is cut from the original-case text around it with ellipses where it was trimmed, and inserted with `textContent`. Nothing authored can become markup because nothing authored is ever assigned as HTML on this path.

Snippets appear only for body-tier results. A title or identifier match needs no excerpt — the reason it matched is already on screen — and adding one would be noise.

### D5 — Results are a listbox-flavoured list, navigated with arrows, committed with Enter

Arrow keys move a `data-active` marker, Enter follows the marked result, Escape clears. The field keeps focus throughout so typing and refining never require a hand off to the mouse, and the active option is reported with `aria-activedescendant` so assistive technology follows the same cursor the eye does. Results remain ordinary links, so clicking, middle-clicking and copying all still behave.

### D6 — Clearing restores browsing without touching the selection

The query is presentation state, not navigation state: the router owns the selected artifact and search never clears it. Clearing empties the result list and leaves the detail exactly as it was — which is what makes search safe to use exploratively.

## Risks / Trade-offs

- **Scoring every artifact costs more than stopping early.** Deliberate (D2) and measured. If the figures disappoint, the mitigation is a smarter index, not a return to capped scanning.
- **Tier boundaries are judgement.** Folding kind into the title tier (D1) is a choice the product does not dictate. Recorded so it can be revisited with evidence.
- **`aria-activedescendant` needs the field and list wired consistently**; getting it half-right is worse than not using it. Covered by tests asserting the attribute tracks the marker.

## Migration Plan

None. The generated file is disposable and regenerated by `prodshape graph --format html`; no data, no configuration and no CLI surface changes.

## Open Questions

None for this slice. `CHG-SNAPSHOT-002` carries one — the interaction form of the focused neighbourhood — which belongs to `SLI-SNAPSHOT-006` and does not touch search.
