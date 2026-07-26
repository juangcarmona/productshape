# Tasks — make-shorthand-opt-in-and-document-lockfile

- [x] 1.1 Add `integrations.shorthand-commands` to the configuration shape, defaults and parser
- [x] 1.2 Add a render options parameter to both provider renderers, duplicated per ADR 0008, and
      thread it through installation
- [x] 1.3 Generate the canonical commands unconditionally and the aliases only when opted in
- [x] 1.4 Add `init --shorthand`, persisting the setting; let existing configuration win unless
      `--force`
- [x] 1.5 Delete files a provider no longer renders when their on-disk digest still matches the lock;
      leave and report hand-edited ones
- [x] 1.6 Split the renderer snapshots into default and shorthand variants
- [x] 1.7 Add a behavioural test that flipping the option changes both renderers' output, since
      structural typing cannot catch a renderer that ignores it
- [x] 1.8 Add a round-trip test between the configuration `init` writes and the parser that reads it
- [x] 1.9 Opt this repository in, and confirm no committed managed file or lock entry changes
- [x] 1.10 Document the installation lock, and correct the wrong claims about `init`, `.gitignore` and
      the configuration paths
