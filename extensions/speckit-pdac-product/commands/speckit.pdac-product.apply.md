---
description: Apply one human-authorized Product Change after fail-closed revalidation.
---

# Apply Product Change

Before applying, confirm a human has deliberately set `status: approved` after all product-semantic questions are resolved. Show `prodshape speckit-product apply <name> --dry-run`, then invoke it without `--dry-run`. It re-reads and revalidates immediately before every write and refuses before any write if unauthorized, invalid, stale, or unsafe. It writes only the accepted model and the hosted applied status, never commits, and never archives. Relay the affected citations it lists: each names a delivery document that now cites old meaning and must be re-grounded. Stop after apply and ask the human to invoke archive separately.
