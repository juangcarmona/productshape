---
id: TERM-PRODUCT-EXPLORER
type: domain-term
title: Product Explorer
status: active
defined-in: BC-PRODUCT-DEFINITION
synonyms:
  - explorer
  - Product Explorer page
---

## Definition

A generated, read-only, self-contained projection of the product graph at a recorded source revision: one HTML file containing every artifact, its relationships in both directions, a search index and the graph projections, explorable in a browser with no repository, tooling or server. Completeness is a property of the file: it holds the whole model and makes all of it reachable. It is derived and regenerable at any time, it retains nothing the reader does, and it is never authoritative.

Opening it gives coordinated views through which a reader understands the complete product model —

- an **Overview** that orients the reader and maps the product: one region per artifact kind with every artifact as a chip, use cases and domain terms grouped by bounded context, beside the kind-level aggregate of the relationships;
- a **Focus view** that centres one artifact with its direct neighbours around it, grouped by kind, and the rest of the model behind them;
- a **Columns view** that lays the whole model out in one column per kind, in the order the methodology explains a product, with every relationship drawn;
- a **Catalog** for large-scale discovery through search, filters and browsing;
- an **Artifact Reader** in which the selected artifact, its full authored content and its canonical relationships dominate;
- and a **business lens** that presents a use case in business language on one card.

On every map, hovering or keyboard-focusing an artifact lights it and its direct neighbours; choosing it opens the Focus view. The maps are accelerators: **every artifact and canonical relationship is reachable and readable through the Reader, the Catalog, search and deep links**, whether or not any map is drawn.

The views are one instrument: they share one selection state, one navigation mechanism and one addressable exploration state, so moving between them never loses the reader's place. The Explorer opens offline from a single file, regenerates byte-identically, ranks its search, supports light, dark and the system appearance, is fully operable from the keyboard, and never carries meaning by colour alone.

## Distinguish From

- **A diagramming tool.** The Explorer's maps are laid out deterministically from the compiled graph; the reader pans and zooms them but never arranges, annotates or saves them, and they imply nothing about importance or sequence that the model does not record.
- **A Graph Projection.** A projection is one purpose-built rendering of part of the graph. The Explorer is the whole experience; the kind-level aggregate and its three map views are its projections.
- **The Product Graph.** The graph is the derived structure the toolkit computes and reasons over; the Product Explorer renders that structure for people. The graph exists for tools and validation, the Explorer for people without the repository.
- **A consumer document.** A consumer document uses citations to bind its own delivery or design statements to canonical product text. The Product Explorer instead projects the whole model for human exploration and carries no delivery state.
- **A web application.** The Product Explorer involves no server, no database, no session, no stored state and no editing; it is a file. Its interactivity only chooses which of its own embedded content is displayed. The product's constraints continue to forbid interactive web applications.
- **An editor or platform.** The Explorer is read-only. Product knowledge evolves through the Product Change workflow, never through the Explorer.
- **The Architecture Snapshot.** The Architecture Snapshot is generated from architecture documentation and describes how a system is designed; the Product Explorer is generated from the product model and describes product intent.

## Usage

The graph command's HTML format (`prodshape graph --format html`) generates the Product Explorer from the current model as `explorer.html` in the generated-output area, stamping the source revision into the page. It is the artifact that crosses the boundary between the repository and the people who will never open one; its recorded revision lets a reader judge whether a shared copy still reflects the current model, and because the selected artifact is addressable within the file, it is also how one person points another at one specific part of the product definition. Until this release the same file was called the Product Snapshot and written as `snapshot.html`.

The Explorer opens on the Overview. A reader sees the shape of the product on its map, focuses an artifact to see what surrounds it, steps back to the Columns view to follow a thread across kinds, finds artifacts through the Catalog and search, and reads them in the Reader — whichever serves the question. With the business lens on, a use case reads as what it is for, who uses it, what it must obey and how that is proved. Every artifact and every canonical relationship is reachable through more than one of these routes, so nothing the model records depends on any single view being usable.
