# pdac-product Spec Kit extension

## 0.1.0

- Add independent ProductShape product authoring and bounded recovery commands for Spec Kit 1.0.4+.
- Apply reports the citations the change affects, with the status each will hold.
- `create --initial` scaffolds the reserved `CHG-INITIAL` baseline change.
- `refine` works on the edited change: it refreshes `impact.json` from the operations, `--note` appends working memory, `--input` stays for structured input.
