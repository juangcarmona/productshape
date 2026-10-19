# read-work-item: Jira

Read through the Atlassian tooling available to the session, or the REST API with a token. Prefer the tooling over raw HTTP when both exist.

| Contract field | Jira source |
| --- | --- |
| identifier | `key` |
| title | `fields.summary` |
| description | `fields.description`: rich text, often a document structure rather than a string |
| state | `fields.status.name` |
| type | `fields.issuetype.name` |
| assignee | `fields.assignee.displayName` |
| labels | `fields.labels` |
| acceptance criteria | a custom field, `<customfield_xxxxx>` |

## Notes

- **Custom field ids are per-instance.** Resolve `<customfield_xxxxx>` during adoption and record it in the configuration's *Work item fields* table. Never carry an id between projects.
- Rich text arrives as a document structure. Render it; do not stringify it and hope.
- The status name is what the board shows and what the transition role matches on. Report it verbatim, capitalisation included.
