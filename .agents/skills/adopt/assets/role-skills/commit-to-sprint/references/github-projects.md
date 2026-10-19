# commit-to-sprint: GitHub Projects

An iteration field on the project board plays the role of a sprint. Resolve the project id, the iteration field id and the current iteration's option id during adoption.

```bash
gh project item-edit --id <item-id> --field-id <iteration-field-id> \
   --project-id <project-id> --iteration-id <current-iteration-id>
```

A team using no iterations does not install this role.
