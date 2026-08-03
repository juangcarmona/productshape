---
id: CON-NO-WEB-UI
type: constraint
title: The product provides no interactive web application; static snapshot projections are permitted
status: active
---

## Constraint

The product ships no interactive web application of any kind: no browser-based editor, no dashboard, no portal, no hosted or served surface through which product knowledge is created, modified or approved. The one permitted web-facing form is the Product Snapshot: a generated, static, self-contained, read-only projection of the product model, regenerable at any time from the authored files and never authoritative. All authoring and evolution of the product definition happens through the authored files, the command-line tool and AI assistants operating on the repository.

## Rationale

The original boundary deferred every web surface from v0.1 to keep the focus on the substance of the methodology, while stating the condition under which a web surface could ever arrive: as a projection over the same files and commands, never as a new home for product truth. The Product Snapshot satisfies that condition exactly — it is read-only by nature, involves no server, and holds nothing the authored files do not. The rule that matters is therefore not "no web" but "no interactive web application": a surface where product knowledge could be viewed and edited outside the files and their review flow remains exactly the pattern the methodology rejects, while a static projection extends the product's reach to people who will never clone a repository, without moving truth anywhere.

## Consequences

- Impossible: browsing, editing or approving product knowledge through a hosted or local web application; any web surface that holds product state the authored files do not; a snapshot that accepts input, requires a server, or fetches remote resources to function.
- Harder: real-time or collaborative consumption — a snapshot reflects the model at its recorded revision and is only as current as its last regeneration.
- Mandatory: every product capability remains fully usable through files and the command line; the snapshot is generated output, reproducible from the authored files at any time; any richer web surface in the future must still arrive as a projection over the same files and commands, never as a new home for product truth.
