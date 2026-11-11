---
id: CHG-ID-NOSUFFIX
type: product-change
title: Drop the numeric suffix from artifact IDs
status: applied
base-revision: '4e800be9d618bb7f6613c5aba6b8c19849024f9c'
operations:
  add:
    - BR-ID-FORM
    - UC-ID-MIGRATE
    - FR-ID-MIGRATION
  modify:
    - BR-IDENTITY
  remove: []
---

Schema reference: docs/specification/frontmatter-reference.md#product-change

## Problem

Artifact IDs carry a numeric suffix (`UC-IMPACT-001`, `FR-CITE-001`) only by habit: the identifier grammar never required it, and the alpha templates and skill examples taught it. The number encodes nothing, makes IDs harder to read in a list or a citation, and invites gaps and renumbering. 67 of the 94 artifacts of this repository's own model carry one. The model has no rule about the form of an ID, and no way for an adopter who followed the habit to leave it.

## Intended Product Outcome

An ID names the thing it identifies: `PREFIX-NAME`. A number appears only to break a tie between two IDs that would otherwise be equal. This model follows the convention: every suffix was removed in one pass, and where two requirements would have collided each now takes a name from its title (`FR-CHANGE-VALIDATE`, `FR-CHANGE-APPLY`, `FR-SNAPSHOT-SEARCH` and so on). Adopters get a consent-based migration step in the upgrade that does the same to their model, never renames into a collision and leaves everything valid, or rolls back. IDs stay immutable after this one-time migration.

## Rationale

The product's own thesis is that the words in the model matter; the IDs are the words everything else points at. Removing noise from them is cheap now, while the model is the reference implementation's own, and expensive later. Because IDs are otherwise immutable (BR-IDENTITY), the exception is recorded here, made explicit in BR-IDENTITY, and offered to adopters only with their consent. The mechanical rename of the 68 existing IDs is not listed as operations (it would be 68 removals and 68 additions of the same artifacts); it is recorded in `rename-map.md` beside this change, and the operations carry the product decisions: the rule, the use case, the requirement and the change to BR-IDENTITY.

## Affected Product Areas

Identity and the form of IDs (`BR-IDENTITY`, new `BR-ID-FORM`), and the repair operations of the product (`UC-FIX`, new `UC-ID-MIGRATE` and `FR-ID-MIGRATION`). Every artifact file name and reference in this repository follows the rename. This is a breaking change for adopters who cite or script against the old IDs, released as a minor bump while the project is 0.x.

## Open Questions

None.

## Product Acceptance

Approved by Juan G. Carmona, owner and decision maker of ProductShape, who also waived the immutability of the existing IDs for this single migration. A reviewer reads the proposed artifacts, confirms that `prodshape validate` and `prodshape citations verify` are green on the renamed model, and that the CHANGELOG states the breaking change with its migration path.

## Out of Scope

Renaming completed Product Changes, archived specifications or historical changelog entries, which describe the past. Renaming `CHG-` identifiers of changes that already exist. Any change to the identifier grammar or the schemas, which already accept both forms. Publishing the release.
