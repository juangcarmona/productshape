---
id: FR-SNAPSHOT-006
type: functional-requirement
title: Hold one selected artifact and address every view
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-IDENTITY-001
verification:
  - scenario: Browsing, search results, relationship links and every graph projection converge on the same single selected artifact
  - scenario: Exactly one navigation mechanism owns state transitions, and the address always reflects the state the page is in
  - scenario: The address encodes at least the active view, the selected artifact and the relevant graph mode
  - scenario: Opening the page at an address naming an artifact opens on that artifact, from file:// and from static hosting alike
  - scenario: Browser Back and Forward restore previously visited views and selections
  - scenario: An address naming an artifact the snapshot does not contain produces an explicit, useful state naming the unresolved identifier
  - scenario: A legacy bare-identifier fragment resolves to that artifact permanently, and is normalized to the current route in place without adding a history entry
  - scenario: Pressing Back immediately after opening a legacy fragment leaves the snapshot rather than returning to the un-normalized address
  - scenario: No exploration state is persisted anywhere other than the address of the current view
---

## Requirement

The Product Snapshot MUST hold exactly one selected artifact at a time, shared by every part of the
page. Selecting an artifact from the artifact list, from a search result, from a declared or derived
relationship link, or from a node in any Graph Projection MUST update that same selection, and every
surface displaying the artifact MUST reflect that it is selected.

Exactly one navigation mechanism MUST own state transitions. No part of the page may change the
selected artifact or the active view without that mechanism, and the page's address MUST always
reflect the state the page is in.

The addressable state MUST represent at least the active view, the selected artifact's identifier,
and the relevant graph mode. Addressing MUST use the URL fragment, so that it works identically when
the file is opened directly from local disk over `file://` and when it is served from ordinary
static hosting, with no server-side routing and no request at navigation time.

Opening the page at an address naming an artifact MUST open on that artifact. Browser Back and
Forward MUST restore previously visited views and selections. An address naming an artifact the
snapshot does not contain MUST produce an explicit state that names the identifier it could not
resolve and offers a way to continue exploring — never an empty page, a silent redirect to the
default view, or an error the reader cannot act on.

Legacy fragments in the form earlier snapshots produced — a bare artifact identifier, such as
`#FR-SNAPSHOT-002` — MUST resolve to that artifact. This inbound compatibility is permanent: it MUST
NOT be treated as transitional and MUST NOT be withdrawn once shared links are assumed to have aged
out. Newly generated navigation within the page MAY use the current fragment route rather than the
legacy form.

On resolving a legacy fragment, the page MUST normalize the address to the current route for the
same artifact, and MUST do so in place — replacing the current history entry rather than adding one.
Normalization MUST NOT create a redundant entry that makes Back return to the un-normalized address:
pressing Back immediately after arriving on a legacy fragment MUST leave the snapshot, exactly as it
would after arriving on a current-route address.

No exploration state MAY be persisted anywhere other than the address of the current view: the page
MUST NOT write to browser storage, cookies or any other durable store.

## Rationale

The current snapshot has four separate ideas of what the reader is looking at. Native anchors move
the document, the sidebar has no selected state, search results are plain links, and the graph keeps
its own highlight that requires a second click to become navigation. Nothing agrees, so nothing
accumulates: a reader who selects a node, searches, and clicks a relationship has no continuous
sense of place. A single selected artifact is what turns four disconnected controls into one
instrument, and it is what makes the focused relationship projection possible at all, since a
neighbourhood needs an anchor.

Requiring one mechanism to own transitions is a correctness requirement rather than an architectural
preference. When both an anchor and a script can change what is displayed, the address and the
display drift apart, and the first symptom is a Back button that returns to the wrong artifact — a
failure a reader experiences as the page losing their work.

The fragment is the only addressing mechanism that satisfies the product's existing constraints. It
survives `file://`, where path-based routing has no server to rewrite it and no origin to satisfy;
it needs no configuration on static hosting; and it never issues a request. It also gives the reader
something to copy, which is how a snapshot stops being a document someone reads and becomes
something two people can point at together — the same reason artifact identifiers are stable in the
first place.

Honouring old fragments is required because the current snapshot already emits and publishes them:
every relationship link, every sidebar entry and every search result in a snapshot generated today
is a bare-identifier fragment, and those snapshots have been shared. Breaking them would break links
in messages and intranet pages that nobody can go back and fix.

That compatibility is permanent rather than transitional because the links it protects live in places
the product cannot see or migrate — a message thread, an email, a wiki page, a ticket comment, a
slide. There is no moment at which they can be known to have aged out, so a sunset date would only
convert a certainty into a guess, and the cost of keeping the guarantee is a single identifier form
the router already has to recognize. Artifact identifiers are immutable by rule, which is what makes
a permanent guarantee cheap: the legacy form names exactly what the current form names.

Normalizing in place, rather than by navigation, is what keeps that compatibility invisible. If
resolving a legacy fragment pushed a history entry, the reader's first Back would return them to the
address they just arrived from and re-normalize it — a trap that looks like the page refusing to let
them leave. Replacing the entry means a legacy arrival and a current-route arrival are
indistinguishable from the reader's side, including in their history.

Refusing durable storage keeps the snapshot honest about being read-only. A page that remembered
where a reader had been would hold state the authored files do not, which is precisely the pattern
the product's constraints reject; putting all of it in the address means the state is visible,
shareable and disposable.

## Acceptance Scenarios

- The reader selects an artifact from the list, then finds another through search, then follows a
  relationship link, then selects a node in a projection. At every step exactly one artifact is
  selected, every surface showing it agrees, and the address changes to match.
- The reader copies the address while reading one artifact, opens it in a new window from local disk
  with networking disabled, and lands on the same artifact in the same view.
- The same address is opened from a static web server. It resolves identically, with no server
  configuration and no request beyond the file itself.
- The reader follows three relationships in sequence and presses Back three times, returning through
  the same artifacts in reverse order; Forward retraces them.
- The reader opens an address naming an identifier that is not in the snapshot. The page names the
  identifier, explains that this snapshot does not contain it, and offers orientation or search as a
  way on.
- A fragment of the form `#FR-SNAPSHOT-002`, as produced by an earlier snapshot, is opened. It
  resolves to `FR-SNAPSHOT-002`, and the address becomes the current route for that artifact without
  a second entry appearing in history.
- Back is pressed immediately after arriving on a legacy fragment. The reader leaves the snapshot;
  they are not returned to the un-normalized address.
- A legacy fragment naming an identifier the snapshot does not contain produces the same explicit
  unresolved-identifier state as a current-route address naming it.
- After exploring, browser storage and cookies are inspected. The snapshot has written nothing.
