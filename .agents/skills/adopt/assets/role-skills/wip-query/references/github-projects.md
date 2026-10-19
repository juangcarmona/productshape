# wip-query: GitHub Projects

```bash
# Label-based state: paginate to avoid undercounting
gh issue list --label "status:in-progress" --state open --json number,title --limit 100 --search ""
# If more than 100 results, page with --search "sort:created-asc" and offset

# Projects field-based state: query all project items, then filter
gh project item-list <project-number> --owner <owner> --format json --limit 100
```

`gh issue list` is paginated and its default page can undercount active items. Page through all results before counting.

Where the lifecycle state lives in a label, filter on that label **and** exclude container issues (epics, parents, or any type the project uses to group work). A bare `--label "status:in-progress"` includes container issues because no type filter is applied, inflating the count and letting a configured WIP cap be bypassed. Query all project items, filter every configured container type out, and count only leaf work items.

Where the lifecycle state lives in a Projects field rather than a label, query the project's items, filter on that field, exclude container items, and paginate before counting.
