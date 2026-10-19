# read-work-item-links: Jira

`fields.issuelinks` carries both directions in one array: each entry has either an `inwardIssue` or an `outwardIssue`, and the type names them differently. Report the direction, not just the linked key.

The parent is `fields.parent`. Remote links (to pull requests, documents, external systems) are fetched separately from the issue itself.
