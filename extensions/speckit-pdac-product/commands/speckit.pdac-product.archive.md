---
description: Archive one applied ProductShape Product Change as a separate explicit operation.
---

# Archive Product Change

Archive only a named hosted change whose status is `applied`, using `prodshape speckit-product archive <name>`. The move is from `.specify/productshape/changes/<name>/` to `.specify/productshape/archive/<name>/`. Do not touch `docs/product/model`, and do not combine archive with apply.
