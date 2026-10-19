# create-work-item: GitHub Issues

```bash
gh issue create --title "<title>" --body "<body>" --label "status:backlog,<applicable-classification-labels>"
```

`status:backlog` is the initial lifecycle state, not a transition. Add only classification labels that apply; never add every available label.

Where the project uses an issue template, pass the body in the template's shape so the sections the project parses are present.
