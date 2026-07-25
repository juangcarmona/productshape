# Invalid examples

Deliberately broken artifacts, kept small so each file demonstrates one violation and the
diagnostic it produces. The conformance suite asserts these stay broken in exactly the documented
way. The full violation catalogue lives in
[the validation specification](../../docs/specification/validation.md); more fixtures are under
`tests/fixtures/invalid/`.

| File                            | Violation                                | Diagnostic   |
| ------------------------------- | ---------------------------------------- | ------------ |
| `actor-wrong-prefix.md`         | Actor using an `FR-` ID                  | `PRODUCT004` |
| `bounded-context-owns-terms.md` | Authoring the derived `owns-terms` field | `PRODUCT002` |
