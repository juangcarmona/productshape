# read-work-item: GitHub Issues

```bash
gh issue view <number> --json number,title,body,state,labels,assignees,projectItems
```

| Contract field | GitHub source |
| --- | --- |
| identifier | `number` |
| title | `title` |
| description | `body`: Markdown |
| state | `OPEN`/`CLOSED`, plus the lifecycle state carried elsewhere |
| type | a label, or the repository's issue types |
| assignee | `assignees` |
| labels | `labels` |
| acceptance criteria | a section of `body`, by project convention |

## Notes

- GitHub's own `state` is only open or closed. **The lifecycle state lives elsewhere**: a `status:` label, or a single-select field in Projects. Resolve which during adoption and record it.
- `body` is Markdown with no schema. Where the project keeps acceptance criteria under a heading, name that heading in the configuration rather than guessing at parse time.
