# read-work-item-links: GitHub Issues

GitHub has no first-class link type. Relationships are expressed as references in the body, in timeline events, as sub-issues, and as parent issues where the repository uses them.

```bash
gh issue view <number> --json body,projectItems
gh api repos/{owner}/{repo}/issues/<number>/timeline --jq '.[] | select(.event=="cross-referenced")'
gh api graphql -f query='query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){issue(number:$number){parent{number title state} subIssues(first:50){nodes{number title state}}}}}' -F owner=<owner> -F repo=<repo> -F number=<number>
```

The `parent` and `subIssues` fields expose the GitHub sub-issue hierarchy. Query them to report the parent/epic state and linked-item state the contract requires. Where the repository does not use sub-issues, report that the hierarchy is unavailable rather than leaving the parent/dependency context empty. Report the relationship as the project expresses it, and say plainly that direction is a convention here rather than a typed fact.
