# Deriving the check set: Azure Pipelines

## Where the checks are defined

Pipeline definitions are YAML, conventionally under `pipelines/` or at the repository root. A definition's `trigger:` and `pr:` blocks say how a run starts.

Read every `script:`, `bash:`, `pwsh:` and task step in the stages whose path filters match this change. Then follow every `template:` reference: shared templates hold most of the real steps, and the calling file alone is never the check set. Templates may live in another repository declared under `resources:`.

## Which checks actually gate the merge

Being triggered and being **required** are different facts. A definition carrying `trigger: none` / `pr: none` can still be a required Build policy on the target branch, added by hand and invisible in the YAML.

```bash
az repos policy list --branch <target>          # every policy on the branch
az repos pr policy list --id <pull-request-id>  # what this PR must satisfy
```

List every Build policy with its definition id. Treat the query result as the only evidence; a pipeline file, a README or an unchecked task item is not.

## Verifying the merge tree

Pull-request validation builds `refs/pull/<id>/merge`: the branch merged with the current target:

```bash
git fetch origin
git rev-list --count HEAD..origin/<target>   # must be 0
```

## Mirroring the configuration

Carry over the `--configuration` a build uses, the exact script name, the `workingDirectory`, and any variable the step reads from a variable group. A group's values may be unavailable locally: a check that depends on one is `unrunnable`, reported by name, never assumed to pass.
