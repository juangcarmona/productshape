---
'@prodshape/core': minor
'@prodshape/cli': minor
---

Impact analysis understands the vocabulary's impact polarity per RFC 0093. Every canonical relationship row carries its `Polarity` (`dependency` or `governance`), and `analyzeImpact` reports `questioned`: the artifacts one authored hop away that a change to the analyzed artifact puts in question. A dependency edge questions its source when its target changes, a governance (`applies-to`) coupling questions either end, and a changed dependency source never questions what it cited, so a changed Quality Requirement's constrained use cases now surface even though a reverse walk never reaches them. `prodshape impact` prints the set with its coupling edge and polarity, before the reachability sections, as assistance and never authority.
