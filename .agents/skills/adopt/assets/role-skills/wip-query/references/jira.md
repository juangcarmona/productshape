# wip-query: Jira

```text
project = <KEY> AND status = "<in-progress>" AND issuetype not in (<containers>)
```

Record the exact query in the configuration's *Work in progress* section. Excluding only `Epic` is the common mistake: a project using an extra hierarchy level above epics will count those too, and the cap fires when nothing is really in flight.
