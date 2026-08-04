# Drafting checklist

## Before drafting

- [ ] `prodshape validate` passes on the current model (zero errors).
- [ ] The change request is understood — restate it in one sentence.
- [ ] A directory slug has been chosen for the change draft (e.g. `chg-add-cite`).

## During drafting

- [ ] A `change.md` draft exists under `docs/product/changes/<slug>/`.
- [ ] Each affected artifact has been identified (add/modify/remove).
- [ ] New artifacts follow the correct schema (`prodshape schema <kind>`).
- [ ] Relationship edges (derived-from, governed-by, uses-terms, etc.) are correct.
- [ ] Body sections match the required sections for each artifact type.
- [ ] The `affected-artifacts` list in the change draft matches the actual changes.

## After drafting

- [ ] `prodshape change validate` reports zero errors.
- [ ] Open questions are listed in the change draft.
- [ ] No artifacts reference retired prefixes (SLI-, HOF- are retired and never reused).
