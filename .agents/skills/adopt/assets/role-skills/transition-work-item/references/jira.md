# transition-work-item: Jira

## Always fetch first

Fetch the transitions available **from the issue's current status** and select from that list. A workflow scheme shared across teams may offer more or fewer paths than any diagram shows, and the diagram is not the system of record.

## The transition screen under-reports its required fields

A transition screen's metadata is not a reliable list of what it requires. Send every field the configuration's *Work item fields* table names for that transition and read the error, rather than trusting a `required` flag.

Two failure modes worth knowing:

- A rich-text field rejected because plain text was sent where a document structure was expected.
- A category or classification field required only on this transition's screen, appearing nowhere in the issue's own field list.

## Human-only transitions

The configuration's *Transitions no command ever fires* table lists moves such as blocked, rejected, reopened or deprioritised. Report finding one. Never fire one, and never reverse one.
