---
description: Draft and validate a product change — AI-assisted artifact generation with structured intent, affected-artifact tracking, and open-questions visibility. The change is delivered via a pull request. Use /product:change or /ps:change.
allowed-tools:
  - prodshape validate
  - prodshape change validate
  - prodshape change list
  - prodshape impact
  - prodshape inspect
  - prodshape schema
  - prodshape graph
---

Use the `analyze-product-change` skill.

## Quick reference

```bash
prodshape change validate          # Validate the working tree as a proposed change
prodshape change list              # List change drafts under docs/product/changes/
prodshape validate                 # Validate the current model (baseline)
prodshape impact <ID>              # Check structural reach of an artifact
prodshape inspect <ID>             # Inspect an artifact
prodshape schema <kind>            # Check the frontmatter contract for a kind
```

## Stop conditions

- `prodshape change validate` reports zero errors.
- All open questions are resolved or explicitly accepted by the engineer.
- The engineer confirms the change is ready to open as a PR.
