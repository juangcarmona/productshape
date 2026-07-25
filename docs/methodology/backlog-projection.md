# Backlog projection

Teams already have a backlog tool, and Product Definition as Code does not replace it. Backlog
projection is the thin, deliberate bridge: each approved [delivery slice](delivery-slicing.md) is
represented by one backlog item, and the two are linked by reference.

## The backlog item references, never copies

A projected backlog item carries three things:

- **References to product artifacts by stable ID.** `SLI-HANDOFF-001`, `FR-HANDOFF-001`,
  `UC-HANDOFF-001` — pointers into the definition, resolvable in the repository at any time.
- **The slice outcome.** The one-sentence product outcome the slice preserves, so the item is
  meaningful in the backlog view without opening the repository.
- **A link to the (future) handoff.** Once the [Product Handoff](sdd-handoff.md) is generated for
  the slice, the item and the handoff reference each other through the work-item reference below.

What the item never does is duplicate the product definition. Copying use-case flows, rules or
acceptance content into ticket descriptions creates a second version that starts aging the moment
it is pasted. The definition stays in the repository, versioned and validated; the backlog item
points at it. Anyone — human or agent — needing the full context follows the IDs, or reads the
generated handoff context.

## The backlog tool is not the source of truth

This is the projection's one rule worth repeating. The tracker orders work, tracks status and
hosts discussion — its actual jobs. Product truth lives in the canonical Markdown under
`docs/product` (see the
[canonical-authority table](../specification/index.md#canonical-authority)). If a ticket comment
uncovers a real product decision, that decision travels back as an update to the
[Product Change](change.md) — it does not live and die in the tracker.

## v0.1: references, no automation

In v0.1, projection means **recording a work-item reference** — no API calls, no automatic issue
creation. You create the backlog item in your tracker however you normally do, then record its
reference in the handoff's `work-item` block, using the provider form such as:

```text
github:owner/repo#123
```

which appears in the handoff as:

```yaml
work-item:
  provider: github
  repository: owner/repository
  id: '123'
  title: Generate framework-independent Product Handoffs
```

That reference is what carries traceability: from a requirement, through its slice and handoff,
to the unit of work that implemented it — and back. Automated projection (creating issues through
provider APIs) is a natural later extension; v0.1 deliberately ships the reference contract
without the automation.
