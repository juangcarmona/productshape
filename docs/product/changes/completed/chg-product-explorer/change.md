---
id: CHG-PRODUCT-EXPLORER
type: product-change
title: 'Call the generated product page the Product Explorer'
status: applied
base-revision: '6bc807f05d8283c0bd2dddac9077a8ae7b946b30'
operations:
  add:
    - ACT-PRODUCT-STAKEHOLDER
    - FR-EXPLORER-ADDRESSING
    - FR-EXPLORER-BUSINESS-LENS
    - FR-EXPLORER-CATALOG
    - FR-EXPLORER-ORIENTATION
    - FR-EXPLORER-PAGE
    - FR-EXPLORER-PROJECTIONS
    - FR-EXPLORER-READER
    - FR-EXPLORER-SEARCH
    - FR-EXPLORER-TOPOLOGY
    - JRN-EXPLORER
    - UC-EXPLORER-BROWSE
    - UC-EXPLORER-GENERATE
  modify:
    - ACT-ENGINEERING-READER
    - BC-PUBLICATION
    - BR-CANONICAL
    - CON-NO-WEB-UI
    - FR-ENGINEERING-PORTAL
    - FR-PARSE
    - FR-PUBLIC-SITE
    - QR-ACCESSIBILITY
    - QR-DETERMINISM
    - QR-PORTABILITY
    - QR-PRESENTATION
    - QR-SCALABILITY
    - SB-REGENERATION-RESTORES
    - TERM-ARCHITECTURE-SNAPSHOT
    - TERM-GRAPH-PROJECTION
    - TERM-PRODUCT-ARTIFACT
    - TERM-PRODUCT-EXPLORER
    - TERM-PRODUCT-GRAPH
    - UC-ENGINEERING-PORTAL
  remove:
    - ACT-PRODUCT-EXPLORER
    - FR-SNAPSHOT-ADDRESSING
    - FR-SNAPSHOT-BUSINESS-LENS
    - FR-SNAPSHOT-CATALOG
    - FR-SNAPSHOT-ORIENTATION
    - FR-SNAPSHOT-PAGE
    - FR-SNAPSHOT-PROJECTIONS
    - FR-SNAPSHOT-READER
    - FR-SNAPSHOT-SEARCH
    - FR-SNAPSHOT-TOPOLOGY
    - JRN-SNAPSHOT
    - TERM-PRODUCT-SNAPSHOT
    - UC-SNAPSHOT
    - UC-SNAPSHOT-EXPLORE
---

## Problem

The model names one thing twice. The generated page is the Product Snapshot, and what opening it is like is the Product Explorer. Readers, the public site and the engineering portal meet both names for what they experience as one page, and the Explorer (Overview, Focus, Columns, Catalog, Reader, business lens) is what they actually use. The owner has decided that the page is called the Product Explorer from end to end, and that "Product Snapshot" is not used again. The model also has an actor already titled "Product Explorer" (the person who reads the product without the repository), which would collide with that name.

## Intended Product Outcome

There is one name, the **Product Explorer**: the generated, self-contained HTML file and the experience of opening it. `TERM-PRODUCT-EXPLORER` carries both meanings. The artifacts that were named after the snapshot are retired and replaced by artifacts named after the Explorer, with the same requirements and scenarios: `FR-EXPLORER-*` replace `FR-SNAPSHOT-*`, `JRN-EXPLORER` replaces `JRN-SNAPSHOT`, `UC-EXPLORER-GENERATE` replaces `UC-SNAPSHOT` and `UC-EXPLORER-BROWSE` replaces `UC-SNAPSHOT-EXPLORE`. The person who reads the product without the repository is the **Product Stakeholder** (`ACT-PRODUCT-STAKEHOLDER`, replacing `ACT-PRODUCT-EXPLORER`). Every other artifact that mentioned the snapshot now says Product Explorer.

The generating command does not change (`prodshape graph --format html`). The file it writes is `explorer.html`, and generation removes a `snapshot.html` left by an earlier release (`FR-EXPLORER-PAGE`). The Architecture Snapshot is a different output and keeps its name.

## Rationale

The product's thesis is that the words in the model must be unambiguous, and the reader-facing name is the one people say. Retiring and replacing the IDs, rather than renaming them, keeps `BR-IDENTITY`: no ID is reused, the retired IDs keep meaning what they meant in the change history, and the new IDs say what they identify (`BR-ID-FORM`). The command stays as it is because it already generates the page; only the name of what it writes changes, and the generator cleans up the old name so adopters do not carry a stale copy.

## Affected Product Areas

The Product Explorer (formerly Product Snapshot) and its journey, use cases and requirements; the actor who reads it; the domain terms that mention it; the quality requirements measured against it; the publication context (public site and engineering portal). Every requirement and scenario keeps its meaning; only names, IDs and the generated file name change.

## Open Questions

None.

## Product Acceptance

Approved by Juan G. Carmona, owner and decision maker of ProductShape, who chose the name Product Explorer for the page, Product Stakeholder for the actor, and kept the command. A reviewer reads the added artifacts against the ones they replace and confirms that each requirement, scenario and acceptance test says what it said before under the new name, that `FR-EXPLORER-PAGE` adds the `explorer.html` file name and the removal of `snapshot.html`, and that `prodshape change validate CHG-PRODUCT-EXPLORER` reports zero errors.

## Out of Scope

The Architecture Snapshot, which is a different output. Completed Product Changes, archived specifications and historical changelog entries, which describe the past and keep the old name. Any change to what the Explorer does. The command line, which keeps `prodshape graph --format html`.
