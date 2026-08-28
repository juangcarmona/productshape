---
'@prodshape/core': minor
'@prodshape/distribution': minor
---

`uses-terms` can be authored by every permitted semantic source per RFC 0072: Business Rules, Domain Terms, Functional Requirements, Quality Requirements and Constraints join Use Cases (Structured Behaviour arrives with its artifact kind). The relationship stays canonical from the consuming artifact to a Domain Term, reverse views stay derived, and `PRODUCT106` now reads "Domain term has no incoming uses-terms relationship", which is exactly what the graph checks; a prose mention still never counts. The vendored schemas track spec v0.2.0 (`5faef0e`), the authoring templates show the field on the five new kinds, and the frontmatter reference now documents a `oneOf` field by its forms (the FR and QR `verification` entries) instead of as `unknown`.
