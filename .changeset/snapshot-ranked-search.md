---
'@prodshape/core': minor
---

Product Snapshot: ranked offline search

Search matched substrings without ranking, walked the artifact list in document order and stopped at
a cap. Querying `product` against this repository's own model matched 73 artifacts, showed 25, hid 48
without saying so, and returned **none** of the eight artifacts whose titles begin with "Product" —
including the term "Product Snapshot" itself.

- Results are **ranked**: exact identifier, then identifier prefix, then exact or prefix title, then
  title substring, then body content. Ties break on identifier, so ordering is total and deterministic.
- Artifact **kinds** are searchable alongside identifiers, titles and bodies.
- Every result shows identifier, title and kind; a body match also shows a **snippet** of the matching
  content, inserted as text.
- **Truncation is never silent** — the page states the total match count whenever it limits what it
  displays, and never shows a lower-ranked match in place of a higher-ranked one.
- **Keyboard**: arrows move an active result reported with `aria-activedescendant`, Enter follows it,
  Escape clears. Clearing never discards the selected artifact.
- A query matching nothing says so and repeats the query.

Also fixes a latency defect the ranking work exposed: the body-text index was built by parsing every
rendered artifact through the DOM on the first keystroke, costing **849 ms** on a 730-artifact model.
It now strips the generator's known tag vocabulary textually and warms during idle time — **15.5 ms**
for the same first query, a 98% reduction.
