# Evidence intake and classification

## The recovery brief

The brief is the contract for the whole session: it declares the evidence population, the boundaries, and the interaction rules. Author it with the user, write it as YAML, and pass it to `prodshape recover start --brief <file>`. The brief is persisted inside the session state, so a resumed session works within exactly the same boundaries.

```yaml
schema: product-definition-as-code/recovery-brief/v1alpha1
scope: One sentence on the product or bounded context being recovered
roots: [src, docs, tests]
include: ['**/*.md', '**/*.ts', '**/*.sql']
exclude: ['docs/archive/**']
forbidden: ['infra/vault/**']
ignore: ['**/generated/**', 'docs/minutes-2019/**']
languages: [en, es]
known-actors: [Shopper, Warehouse operator]
known-journeys: []
known-use-cases: []
known-terminology: [order, basket, fulfilment]
synonyms:
  cart: basket
  WMS2: fulfilment service
known-contradictions:
  - Docs say the order limit is 5000; the code enforces 10000
authority:
  - Tests over code comments
  - Code over documentation
  - The user over everything
secondary-evidence:
  code: true
  tests: true
  issues: false
  commit-history: false
  external: true
batch-size: 10
confirm:
  - Anything about refunds
  - Any actor beyond the known list
external-sources:
  - url: https://example.test/help
    title: Public help centre
  - file: notes/operator-interview.md
    title: Operator interview notes
```

Field notes:

- `roots`, `include`, `exclude` define the repository evidence population. Repository-wide recovery means this declared population, not the whole filesystem.
- `forbidden` paths are never traversed, listed or read; secret material (`.env`, keys, certificates) is forbidden by default and a brief can only add to that floor, not remove it.
- `ignore` is for generated or historical material the user wants out: recorded separately so the report can say what was deliberately skipped.
- `synonyms` maps obsolete names to current ones so evidence written in the old vocabulary still lands on the right candidate.
- `authority` states which source wins when sources disagree at the same confidence. Contradictions are still recorded; authority informs your recommendation, not a silent resolution.
- `secondary-evidence` switches whole evidence classes on or off. With `external: false`, never propose an online source at all.
- `confirm` lists areas where the user wants to approve candidates before you record them.
- `external-sources` pre-authorises the listed items and nothing else. Anything discovered later needs fresh authorisation.

## Classifying evidence

A source is processed only when every relevant section is classified. The six classifications, recorded with `prodshape recover mark --source <id> --as <classification>`:

| Classification | Meaning | Required flags |
| --- | --- | --- |
| `represented` | This content is captured by one or more candidates | `--artifacts <ID,...>` |
| `duplicate` | Repeats evidence an existing candidate already carries; provenance merged | `--artifacts <ID,...>` |
| `contradiction` | Conflicts with other evidence or an existing candidate | `--note <what conflicts>`, ideally `--question <Q-id>` |
| `question` | Cannot be interpreted without the user | `--question <Q-id>` |
| `out-of-scope` | Real content, outside the agreed product scope | `--reason <why>` |
| `no-product-intent` | Contains nothing about what the product is or must do | `--reason <why>` |

The last two require a reason because "nothing to see here" is itself a claim a reviewer must be able to audit. `--complete` on the final mark declares the source fully classified; the CLI refuses it when no findings exist.

If a source changed since it was inventoried, `mark` refuses until you re-read it and pass `--accept-changed`, which refreshes the hash and drops the invalidated findings. Never mark content you have not re-read.

## External and user-provided evidence

Three kinds beyond repository files, all first class once authorised, none ever assumed:

- Online resources: `recover evidence add --url <url> --title <t> --authorized`. Fetch only after the user names or approves the exact resource in the conversation. Save the fetched content and freeze it: `recover evidence snapshot E-00NN --file <downloaded>`; the snapshot lives in the session directory and gives the hash checker stable bytes.
- External files (outside the inventoried roots, or supplied by the user): `recover evidence add --file <path> --title <t> --authorized`. Hashed immediately.
- User statements: `recover evidence add --text "<statement>" --title "<who said it, about what>"`. Stored in the session directory and hashed. This is how stakeholder knowledge becomes citable provenance (`recovered-from: interview`).

Authorisation is per source. A user who authorised one wiki page authorised that page, not the wiki. When in doubt, ask; the flag exists so the record shows the question was asked.
