# create-branch: convention

Record the project's convention during adoption. Common shapes:

| Shape | Example |
| --- | --- |
| `<type>/<ITEM>-<slug>` | `feature/PROJ-123-export-report` |
| `<ITEM>-<slug>` | `PROJ-123-export-report` |
| `<user>/<slug>` | requires the item id to live elsewhere |

The only hard requirement the loop places on the name is that the **work item identifier is recoverable from it**. Everything else is the team's taste.

Always `git fetch` the base before branching. Branching from a stale local reference produces a branch that is behind before any work starts, and the verification stage will then refuse it as a stale tree.
