# Tasks — document-frontmatter-schema

- [x] 1.1 Retain the parsed schema documents in `SchemaRegistry` and expose `kinds()`, `rawSchema()` and `rawSchemas()` (additive; no change to validation behaviour)
- [x] 1.2 Add `describeKind` / `describeAllKinds` with `$ref` resolution that merges sibling keywords and descends into nested objects and array elements
- [x] 1.3 Render the terminal and Markdown forms from one descriptor, escaping pipes so union ID patterns do not shatter the tables
- [x] 1.4 Write `docs/specification/frontmatter-reference.md` prose plus generated regions for all 13 kinds; add the generator and the `docs:frontmatter` script
- [x] 1.5 Add `prodshape schema [kind]` with ID-prefix aliases, `--format json`, exit 2 on an unknown kind, and no repository resolution
- [x] 1.6 Point every template at its reference section
- [x] 1.7 Link the reference from the greenfield and brownfield guides and from `artifacts.md`
- [x] 1.8 Add the drift test: bidirectional coverage, cell-exact tables, fixed header, template anchors resolve
