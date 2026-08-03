---
id: FR-SNAPSHOT-006
type: functional-requirement
title: Hold one selected artifact and address every view
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-IDENTITY-001
verification:
  - scenario: The Catalog, the Artifact Reader, the Focused Topology and every other surface converge on the same single selected artifact
  - scenario: Exactly one navigation mechanism owns state transitions, and the address always reflects the state the page is in
  - scenario: The address encodes the active surface, the selected artifact, the Catalog's query-and-filter state when active, and the Focused Topology's explicit disclosure state
  - scenario: Opening the page at an address naming an artifact opens on that artifact, from file:// and from static hosting alike
  - scenario: Browser Back and Forward restore previously visited surfaces, selections and exploration states, preserving the reader's navigation context
  - scenario: An address naming an artifact the snapshot does not contain produces an explicit, useful state naming the unresolved identifier
  - scenario: A legacy bare-identifier fragment resolves to that artifact permanently, and is normalized to the current route in place without adding a history entry
  - scenario: Pressing Back immediately after opening a legacy fragment leaves the snapshot rather than returning to the un-normalized address
  - scenario: No exploration state is persisted anywhere other than the address of the current view
---

## Requirement

The Product Snapshot MUST hold exactly one selected artifact at a time, shared by every part of the page. Selecting an artifact from the Catalog, from a search result, from a declared or derived relationship link, from the Artifact Reader or from the Focused Topology MUST update that same selection, and every surface displaying the artifact MUST reflect that it is selected. The Catalog, the Reader and the Focused Topology share one coherent selection state; no surface holds a selection of its own.

Exactly one navigation mechanism MUST own state transitions. No part of the page may change the selected artifact or the active surface without that mechanism, and the page's address MUST always reflect the state the page is in.

The addressable state MUST represent at least: the active surface, the selected artifact's identifier, the Catalog's query-and-filter state when one is active, and the Focused Topology's explicit disclosure state. Addressing MUST use the URL fragment, so that it works identically when the file is opened directly from local disk over `file://` and when it is served from ordinary static hosting, with no server-side routing and no request at navigation time.

Opening the page at an address naming an artifact MUST open on that artifact. Browser Back and Forward MUST restore previously visited surfaces, selections and exploration states, so that a reader's navigation context — where they came from and what discovery was in progress — survives moving focus to a related artifact and returning. An address naming an artifact the snapshot does not contain MUST produce an explicit state that names the identifier it could not resolve and offers a way to continue exploring — never an empty page, a silent redirect, or an error the reader cannot act on.

Legacy fragments in the form earlier snapshots produced — a bare artifact identifier, such as `#FR-SNAPSHOT-002` — MUST resolve to that artifact. This inbound compatibility is permanent: it MUST NOT be treated as transitional and MUST NOT be withdrawn. On resolving a legacy fragment, the page MUST normalize the address to the current route in place — replacing the current history entry rather than adding one — so pressing Back immediately after arriving leaves the snapshot.

No exploration state MAY be persisted anywhere other than the address of the current view: the page MUST NOT write to browser storage, cookies or any other durable store.

## Rationale

One selected artifact shared by every surface is what turns four surfaces into one instrument. Without it, the Catalog, the Reader and the projection each hold a private idea of "current", and nothing the reader does accumulates. With it, moving between finding, reading and traversing is one continuous exploration.

Requiring one mechanism to own transitions is a correctness requirement rather than an architectural preference: when two mechanisms can change what is displayed, the address and the display drift apart, and the first symptom is a Back button that returns to the wrong place — a failure a reader experiences as the page losing their work. Addressing the Catalog's query state and the projection's disclosure state extends the same reasoning to discovery: a result set two people cannot share is a result set they cannot discuss.

The fragment is the only addressing mechanism that satisfies the product's constraints: it survives `file://`, needs no hosting configuration, and never issues a request. Honouring bare-identifier fragments permanently protects links living in places the product cannot see or migrate; artifact identifiers are immutable by rule, which is what makes a permanent guarantee cheap. Refusing durable storage keeps the snapshot honest about being read-only: all reader state is visible, shareable and disposable, in the address and nowhere else.

## Acceptance Scenarios

- The reader selects an artifact in the Catalog, another through search, follows a relationship in the Reader, and refocuses the Focused Topology. At every step exactly one artifact is selected, every surface agrees, and the address changes to match.
- The reader copies the address mid-exploration — a query and filters active, an artifact selected — and opens it in a new window from local disk with networking disabled: the same state appears. The same address served from static hosting resolves identically.
- The reader follows three relationships and presses Back three times, returning through the same artifacts in reverse order with their contexts intact; Forward retraces them.
- An address naming an unknown identifier produces a state that names it and offers orientation and search as ways forward.
- A legacy fragment such as `#FR-SNAPSHOT-002` resolves to its artifact and normalizes in place; Back immediately afterwards leaves the snapshot.
- After exploring, browser storage and cookies are inspected: the snapshot has written nothing.
