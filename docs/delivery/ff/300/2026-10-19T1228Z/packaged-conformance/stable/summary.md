## Pinned PDaC conformance

| Input | Pin |
| --- | --- |
| ProductShape | `@prodshape/cli 0.22.1` built from `1e0891d652186c1509989da2dbd2668714de52a7` |
| Packaged artifact | `prodshape-cli-0.22.1.tgz` (`sha256:6e8fd0d0dc063f212fea372990df5d58a764ac2015a4462c0365c4e41bbac75e`) |
| PDaC specification | [`b3f44d2179a58bbee0478fae517ab75f3249ca39`](https://github.com/product-definition-as-code/spec/commit/b3f44d2179a58bbee0478fae517ab75f3249ca39) |
| pdac-conformance | `1.0.1` |
| Profile | full published v0.2.0 conformance tests (kernel, reference profile and reference workflow) |

Commands:

```text
prodshape validate --root . --consumers .
prodshape change validate --root . --consumers .
prodshape citations verify . --root .
pdac-conformance digests --spec pdac-spec
```

| Check             | Total | Passed/verified | Failed | Errored | Skipped |
| ----------------- | ----: | --------------: | -----: | ------: | ------: |
| Conformance cases |    45 |              45 |      0 |       0 |       0 |
| Pinned digests    |    12 |              12 |      0 |       0 |       0 |

Citation coverage: 12 citation(s) across 11 case(s), including 11 sidecar-ledger record(s) from 10 mapping-shaped ledger(s) and 1 marker-block record(s).

Negative control: removing citation verification makes 11 case(s) fail: 6 expected citation diagnostic(s) go missing and 6 mutation guard(s) exercise nothing; 0 cases errored or skipped.

Evidence: [workflow run](https://github.com/juangcarmona/productshape/pull/301) and the `pdac-conformance-1e0891d652186c1509989da2dbd2668714de52a7` artifact.

Limitation: the published tests are not a complete normative set. Repository-only clauses and currently unexpressed apply cases remain outside this executable profile.
