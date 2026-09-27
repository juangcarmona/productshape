<!-- pdac-scope: cited -->

## 1. Appearance and visual system

- [x] 1.1 Replace every literal colour in the stylesheet and the script with custom properties; add light and dark token sets under `:root`, `prefers-color-scheme: dark` and `[data-appearance]`, including the revised kind palette (`--k-<kind>`), status colours and projection strokes. Verify by a test asserting the stylesheet declares both sets and that no hex literal appears outside token blocks.
- [x] 1.2 Carry the light and dark kind palettes and the status pairs in the data block, and extend the WCAG AA contrast test to both appearances. Verify with the extended contrast test.
- [x] 1.3 Add the appearance control (light, dark, system) to the header, driven by address parameter `a`, updating the address in place. Verify with a DOM test that choosing an option sets `data-appearance`, rewrites the address without growing history, and writes nothing to storage.
- [x] 1.4 Add the kind-icon sprite, created by the script, and decorate every kind token with its icon. Verify that the opening document still contains no `<svg>` and that every rendered token carries an icon `<use>`.
<!-- pdac:cite id="QR-PRESENTATION-001" digest="sha256:d16a3c4eb8a38f0282d47a962ec3822bcd882f1910131d504ed0d2ed75352e88" -->
<!-- pdac:cite id="QR-SCALABILITY-001" digest="sha256:ce964e20dec3fb9facb301afb75ef2026c908a05ea56b11f3de1981522a7dfe1" -->

## 2. Shell, master area and narrowing

- [x] 2.1 Rebuild the header as one line: title, short revision with the full revision in its title attribute, view tabs, search control, appearance control and a shortcuts button. Verify with the landmarks and heading-outline test and the revision-stamp test.
- [x] 2.2 Remove the fixed filter form. Add the chip strip above the list for active `k`, `s`, `c` and `f`, each removable, plus a clear-all control. Verify with DOM tests that removing a chip widens the list, clearing restores it, and the address updates in place.
- [x] 2.3 Render the list as collapsible kind groups (`aria-expanded`, count, icon). Keep the selection's group open and marked, and the entry revealed. Verify with a DOM test following a relationship into a closed kind.
- [x] 2.4 Add master-area collapse to a kind rail (control plus `Ctrl+B`, address `m=rail`). Clicking a rail kind restores the area with that group open. Verify with a DOM test covering control, shortcut, marker and restore.
- [x] 2.5 Preserve presentation parameters across static links through a delegated handler. Verify that clicking an Overview family link keeps `a` and `m`.
<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->
<!-- pdac:cite id="FR-SNAPSHOT-006" digest="sha256:b29e1faa337fb90b5dcac8b9ddeb92325c7acb2c29a2b18bb512ec2e6be7bf3f" -->
<!-- pdac:cite id="FR-SNAPSHOT-008" digest="sha256:b9ae2520c7778c6c7a90d1866db57873cfa0fe5e2995a05b8786a7797efd281a" -->

## 3. Search dialog

- [x] 3.1 Move the ranked search into an ARIA modal dialog, keeping the `q-body` ids and the ranking engine. It opens from the header control, `/` and `Ctrl`/`Cmd+K` on every view, traps focus, closes on Escape, clicking outside or its close control, and returns focus. Verify by keeping the ranked-search suite green and adding open/close/focus tests.
- [x] 3.2 Add kind, status and context chips in the dialog, sharing the catalog narrowing, and rank within it. Keep `q` in the address while the dialog is open. Selecting a result pushes the artifact without `q`, so Back reopens the query. Verify with DOM tests for narrowing, the address and resume-on-Back.
<!-- pdac:cite id="FR-SNAPSHOT-004" digest="sha256:79141d7904dd9088a5f0643acb9217c0badc0e6356e4053b6fcf4c817c35b5ec" -->
<!-- pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->

## 4. Reader

- [x] 4.1 Link known identifiers in metadata (reference chips for all-identifier lists) and in the authored body (text-node wrapping), carrying catalog state. Unknown identifiers stay text. Verify that the body's text content is unchanged and that hostile content still never executes.
- [x] 4.2 Add previous/next with position-in-kind, `j`/`k`, and copy ID / copy link with a status message. Verify with DOM tests over a filtered list.
- [x] 4.3 Make relationship group headers read as direction glyph, readable verb, kind token and count, with per-direction totals and a summary line linking to each direction. Verify that group-count tests still sum to the compiled graph and that totals are stated.
<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->

## 5. Focused Topology

- [x] 5.1 Replace the orbit with the row layout: fixed-width group buttons stating type, kind and count, declared above and referencing below, directed lines, and canvas height growing with a scrollable pane. Verify with tests that compute every group's box from the layout and assert no overlap, no horizontal overflow, and direction by position.
- [x] 5.2 Add single-open-group member lists (address `x`, replacing history; Escape closes; members route to a refocus that resets disclosure). Verify by adapting the disclosure, refocus and legacy-route tests.
- [x] 5.3 Add two-way highlighting between projection groups and Reader groups, and scroll the counterpart into view on open. Verify with a DOM test on hover and focus classes.
- [x] 5.4 Add the resizable Reader/topology split (`role=separator`, pointer and arrow keys, nothing stored). Verify with a DOM test for the keyboard resize.
<!-- pdac:cite id="FR-SNAPSHOT-009" digest="sha256:ab9721cb7fb71a07fa8a48789379024ecd0eeda9122267329ee3dcbc20718ff7" -->
<!-- pdac:cite id="FR-SNAPSHOT-005" digest="sha256:6f4280d6db76da8e0188db3dbb63e55d8df4ea045950cea506a50beae1d9259b" -->

## 6. Overview

- [x] 6.1 Lay the Overview out in two columns. Render the kind-by-kind grid statically, with each non-empty cell linking to the source-kind catalog, and keep the aggregate table and composition. Verify that grid cells sum the aggregate rows and that the opening document stays bounded.
- [x] 6.2 Render the derived entry points on demand: journeys with their use cases in step order, contexts with reference counts, and the most-relationships list with its counts and stated criterion. Verify the counts against the compiled graph and that no importance wording appears.
- [x] 6.3 Make the Overview search control open the dialog. Verify with a DOM test.
<!-- pdac:cite id="FR-SNAPSHOT-003" digest="sha256:e943d44f1e487316d7c50a59534c220a155da3387a93954a882be0754a615b07" -->

## 7. Verification, evidence and citations

- [x] 7.1 Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm test`, and confirm the snapshot suite is green. Regenerate the self-model snapshot and review it in a browser at 1440×900 in light and dark, panel open and collapsed, confirming nothing is clipped and there is no horizontal scroll.
- [x] 7.2 Extend `scripts/screenshot-snapshot.mts` with dark, rail and search-dialog shots, and refresh `docs/assets/snapshot/`.
- [x] 7.3 Add a changeset for `@prodshape/core` and `@prodshape/cli`.
- [x] 7.4 Refresh the citations this change affects: archive the change so `openspec/specs/snapshot-generation/spec.md` carries the new digests, then confirm `prodshape citations verify --provider openspec` reports no stale citation and `openspec validate --specs --strict` passes.
<!-- pdac:cite id="CON-NO-WEB-UI" digest="sha256:467b7a87238629673c45dac7b72e85e4cb17a969cbcdbf6f4bf5d1711209ddbf" -->
