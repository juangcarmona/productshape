# Design: add-explorer-overview-catalog

## Decisions

**Catalog state as a query string on the fragment.** `#/artifacts` and `#/artifacts/<id>` accept `?k=&s=&c=&f=&q=` in that fixed order, so identical states serialize identically (deterministic, linkable). Filter and query edits are disclosure, not navigation: they `replaceState`, keeping Back for places rather than keystrokes. Selection remains a push and carries the state, which is what makes open-and-return resume for free — the state never left the address.

**Controls are the mirror of the address, not its owner.** `applyCatalogState()` projects the parsed address into the filter variables and control values on every address-driven render; handlers go the other way through the single `go()` mechanism. Neither side mutates without the router, per FR-SNAPSHOT-006.

**Context filter is data-driven.** The select is generated only when the model declares `bounded-context` values; the embedded payload carries each artifact's context so filtering needs no frontmatter parsing at read time.

## Risks

Query strings inside fragments are plain fragment content — no server, no request, `file://`-safe; values are encodeURIComponent-escaped both ways, and undecodable values degrade to absent rather than throwing.
