---
id: CON-NO-WEB-UI
type: constraint
title: The product provides no interactive web application; static snapshot projections are permitted
status: active
---

## Constraint

The product ships no interactive web application of any kind: no browser-based editor, no dashboard, no portal, no hosted or served surface through which product knowledge is created, modified or approved. The one permitted web-facing form is the Product Snapshot: a generated, self-contained, read-only projection of the product model, regenerable at any time from the authored files and never authoritative.

A Product Snapshot MAY behave as an application within the file it is. Client-side behaviour is permitted exactly to the extent that it only chooses which of the file's own already-embedded content is displayed — navigating, selecting, searching, filtering, expanding, arranging and rendering content the file already contains. Such a snapshot remains static in the sense this constraint means: it is a fixed artifact whose every possible state is determined by its own bytes.

A Product Snapshot MUST NOT require a server or any runtime process; MUST NOT issue any network request or load any external script, stylesheet, font, image or data at open time or afterwards; MUST NOT persist anything outside the address of the current view — no browser storage, no cookies, no session, no database; MUST NOT accept input that becomes product knowledge; and MUST NOT offer any capability to create or modify artifacts, grant product approval, apply a Product Change or accept a baseline. Accepting a search query or a selection is not accepting input in this sense: neither changes anything the file contains, and neither survives the reader closing it.

All authoring happens in Product Changes through files and AI assistants operating on the repository; validation and explicit apply happen through the command-line tool, and acceptance happens through human merge review.

## Rationale

The original boundary deferred every web surface from v0.1 to keep the focus on the substance of the methodology, while stating the condition under which a web surface could ever arrive: as a projection over the same files and commands, never as a new home for product truth. The Product Snapshot satisfies that condition exactly — it is read-only by nature, involves no server, and holds nothing the authored files do not. The rule that matters is therefore not "no web" but "no interactive web application": a surface where product knowledge could be viewed and edited outside the files and their review flow remains exactly the pattern the methodology rejects, while a static projection extends the product's reach to people who will never clone a repository, without moving truth anywhere.

The boundary is stated in terms of what a snapshot may do rather than how interactive it may appear, because "static" is ambiguous once a page discloses its content progressively, and an ambiguous constraint is unenforceable. A snapshot that renders one artifact at a time from data it already carries is doing nothing a printed table of contents does not do; a snapshot that fetched an artifact, remembered a reader, or accepted an edit would be a different kind of thing entirely, whether or not it looked more or less interactive. The distinction that carries the methodology's intent is where knowledge lives and whether the file is self-sufficient — not how much script runs.

Refusing persistence is part of the same line. State the reader can see, copy and discard — held in the address of the current view — keeps the snapshot disposable and shareable. State the snapshot remembered on their behalf would be state the authored files do not have, which is where the drift this constraint exists to prevent begins.

## Consequences

- Impossible: browsing, editing or approving product knowledge through a hosted or local web application; any web surface that holds product state the authored files do not; a snapshot that accepts input that becomes product knowledge, requires a server or a build step to open, fetches remote resources to function, or stores anything durably on the reader's machine.
- Harder: real-time or collaborative consumption — a snapshot reflects the model at its recorded revision and is only as current as its last regeneration. Anything a reader would want remembered between visits must either live in the address they keep, or not exist.
- Mandatory: every product capability remains fully usable through files and the command line; the snapshot is generated output, reproducible from the authored files at any time; the snapshot contains everything it can ever display; and any richer web surface in the future must still arrive as a projection over the same files and commands, never as a new home for product truth.
