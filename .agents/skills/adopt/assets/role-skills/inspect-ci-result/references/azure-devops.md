# inspect-ci-result: Azure Pipelines

## What gates the merge

A pipeline's `trigger:`/`pr:` block says how a run starts. Whether it is **required** is a branch-policy fact:

```bash
az repos policy list --branch <target>
az repos pr policy list --id <pull-request-id>
```

A definition carrying `trigger: none` can still be a required Build policy, added by hand and invisible in the YAML. The policy query is the only evidence.

## Reading a run

Fetch the build for the branch or PR, then its timeline to find the failing stage and job, then that job's log. Report the excerpt, not the whole log.

## States

`succeeded`, `failed`, `canceled`, `partiallySucceeded`, and a run still `inProgress` or `notStarted`. Only the first is a pass.
