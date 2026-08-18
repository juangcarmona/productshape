---
id: FR-SNAPSHOT-004
type: functional-requirement
title: Find artifacts through ranked offline search
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
verification:
  - scenario: Search works with no network access, matching artifact IDs exactly and partially, titles, kinds and body content
  - scenario: Results are ranked exact ID, then ID prefix, then exact or prefix title, then title substring, then body match
  - scenario: A query equal to an artifact ID puts that artifact first
  - scenario: Each result identifies the artifact by ID, title and kind, and shows a safe snippet where a body match is what produced the hit
  - scenario: When results are limited, the page states how many matches exist and never drops higher-ranked matches to show lower-ranked ones
  - scenario: Results are navigable and selectable by keyboard, and the query can be cleared without losing the current artifact
  - scenario: A query matching nothing produces an explicit no-results state naming the query
  - scenario: Identical queries against identical model content produce identical result order
---

## Requirement

The Product Snapshot MUST provide search that works entirely offline, over the data embedded in the file, with no network access. Search MUST match against artifact identifiers — both exact and partial — artifact titles, artifact kinds, and artifact body content.

Results MUST be ranked, in this order of precedence:

1. exact identifier match;
2. identifier prefix match;
3. exact or prefix title match;
4. title substring match;
5. body content match.

A query equal to an artifact's identifier MUST place that artifact first. Each result MUST identify its artifact by identifier, title and kind. Where a result was produced by a body match, it MUST show a snippet of the matching content, escaped so authored content cannot become markup or executable.

If the page limits how many results it displays, it MUST state how many matches exist in total, and MUST NOT display a lower-ranked match in place of a higher-ranked one. Truncation MUST never be silent. The total MUST be derived from the embedded model for that snapshot rather than copied into documentation or source comments.

Search MUST be fully operable from the keyboard: reaching the field, moving through results, selecting a result, and clearing the query. Selecting a result MUST make its artifact the single selected artifact as defined by FR-SNAPSHOT-006. Clearing the query MUST return the reader to browsing without discarding the artifact they had selected. A query matching no artifact MUST produce an explicit no-results state that names the query rather than an empty list.

For identical model content, identical queries MUST produce identical result ordering.

## Rationale

Search is how a reader who already knows what they are looking for avoids the rest of the model entirely, which makes it the most important single control on a page built around progressive disclosure. The unranked implementation walked the index in document order and stopped at a fixed display limit, so broad queries could omit deliberate identifier or title matches while earlier body-only matches consumed the visible results. A reader searching for a concept they heard in a meeting could therefore be shown the wrong artifacts and no indication that better matches existed.

The ranking order encodes how identifiers are actually used in this methodology. Artifact IDs are stable, quoted in conversations, pasted into review comments and recorded in citations, so a query that looks like an ID is almost always an attempt to reach exactly that artifact — which is why an exact ID match outranks everything, and an ID prefix outranks title text. Titles are the next most deliberate signal, and body matches are the broadest and least precise, so they come last rather than first.

Requiring truncation to be visible is a correctness requirement, not a courtesy. A reader who sees only the displayed subset and does not know more matches exist will conclude the model does not contain what they are looking for, and the snapshot's whole claim is that it contains the model completely. The exact total belongs to the generated snapshot, because any count copied into canonical prose drifts when the model changes.

Deterministic result ordering follows the same reasoning that makes the file byte-identical: two people looking at the same snapshot and typing the same query must be able to talk about the same result order and mean the same artifacts.

## Acceptance Scenarios

- With networking disabled, the reader types an artifact identifier exactly. That artifact is the first result.
- The reader types a partial identifier such as `FR-SNAPSHOT`. Every artifact whose identifier begins with it appears above artifacts matched only by title or body.
- The reader enters a broad query that matches more artifacts than the display limit. Identifier and title matches appear above body-only matches, and the page states the exact total derived from that snapshot's embedded model.
- The reader types a phrase that appears only inside one artifact's body. That artifact is found, and the result shows a snippet containing the phrase.
- An artifact body containing `<script>` and quote characters produces a snippet in which they are displayed as text; nothing executes and no element is created from the snippet.
- The reader reaches the search field, moves down the results and selects one entirely by keyboard. The selected artifact becomes the page's single selection.
- The reader clears the query. Browsing resumes and the artifact they had selected is still selected.
- The reader types a string matching nothing. The page states that nothing matches and repeats the query it searched for.
- The same query is run against two snapshots generated from identical model content on different platforms. The result order is identical.
