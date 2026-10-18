# ProductShape Explorer design system

The Product Snapshot Explorer is the reference implementation for ProductShape's compact reader interface. This guide extracts its reusable visual language for the public site and related tools such as ArcShape. Product identity, product content and navigation may differ between projects; the visual tokens and interaction patterns can be reused independently.

## Principles

- Treat the interface as a reading and modeling instrument: compact, quiet and text-first.
- Use a neutral surface, thin dividers and low-radius controls. Reserve shadows for temporary overlays.
- Keep hierarchy in alignment, spacing, weight and labels. Avoid gradients, blur, oversized headings and decorative card stacks.
- Use color to distinguish artifact kinds, always alongside an icon and a readable text token.
- Support light, dark and system appearance with the same contrast and hierarchy.

## Core tokens

The exact Explorer values live in `packages/core/src/snapshot.ts`. The public site maps them to its `--paper`, `--surface`, `--ink`, `--text`, `--muted`, `--line`, `--accent` and `--code` aliases in `assets/site.css`.

| Role            | Light     | Dark      |
| --------------- | --------- | --------- |
| Page            | `#ffffff` | `#0f1216` |
| Panel           | `#f6f7f9` | `#141920` |
| Raised surface  | `#ffffff` | `#1a2029` |
| Primary text    | `#12161d` | `#eef1f5` |
| Supporting text | `#4f5560` | `#9aa3b2` |
| Divider         | `#dfe3ea` | `#262d37` |
| Strong divider  | `#bfc6d1` | `#3a4350` |
| Accent          | `#1c4fa3` | `#7aa7ff` |

Use the system sans-serif stack for prose and controls, and a system monospace stack for identifiers, kind tokens, shortcuts and code. The working density is 14px interface text, 1.5 line-height, 4px spacing increments, compact rows and 2px keyboard focus outlines.

## Artifact kinds

Every kind keeps a stable color in both appearances and across projects. Pair it with its SVG symbol and short identifier token. Never use the color by itself to communicate kind.

| Kind                   | Token | Light     | Dark      |
| ---------------------- | ----- | --------- | --------- |
| Actor                  | ACT   | `#2359b5` | `#80a9ff` |
| Journey                | JRN   | `#6941c6` | `#ab8ffa` |
| Use case               | UC    | `#18794e` | `#4fcb8c` |
| Business rule          | BR    | `#b54708` | `#f79c50` |
| Domain term            | TERM  | `#8a6100` | `#e3b544` |
| Bounded context        | BC    | `#0b7285` | `#43c4da` |
| Functional requirement | FR    | `#b0287a` | `#f27ec2` |
| Quality requirement    | QR    | `#56607a` | `#a9b2c5` |
| Constraint             | CON   | `#b42318` | `#f7776c` |
| Structured behaviour   | SB    | `#466c10` | `#a5d05a` |

## Engineering section colors

Engineering sections use four semantic color families instead of twelve unrelated colors. The groups follow the arc42 distinction between requirements, architecture views, concepts and decisions, and risks/reference material. Each of the first three families uses an existing PDaC artifact-kind color as its anchor; risks and reference use the neutral text color. Each badge pairs a short section code with its own 16px SVG icon; the section number stays at the row's right edge. Color adds a secondary cue and never replaces the label.

| Family | Sections and codes | Palette anchor | Light | Dark |
| --- | --- | --- | --- | --- |
| Requirements and quality | 01 GOAL, 02 CON, 03 CTX, 10 QR | Functional requirement | `#b0287a` | `#f27ec2` |
| Structures and views | 05 BBV, 06 RUN, 07 DEP | Bounded context | `#0b7285` | `#43c4da` |
| Concepts, technologies and decisions | 04 STR, 08 XCC, 09 ADR | Business rule | `#b54708` | `#f79c50` |
| Risks and reference | 11 RTD, 12 GLO | Quality requirement | `#56607a` | `#a9b2c5` |

## Components and behavior

- **Top bar:** one compact row shared by the public site and Product Snapshot on wide screens: product mark and name, a small version or revision badge, tab-style primary navigation, a flexible spacer, search, appearance controls and a keyboard-shortcut action. On compact screens, keep the brand and essential actions together, then give the primary navigation its own horizontally scrollable row. Never shrink or clip labels and controls to force the desktop row to fit.
- **Navigation list:** group rows are about 42px high, divided by 1px rules. A small disclosure icon, kind icon, kind token, label and count keep the hierarchy scannable. The selected group gets a visible selection rule and remains in view.
- **Kind marker:** a 1px outline, 3px corner radius, 12px monospace token and 16px symbol. Keep the text token next to the symbol at every size.
- **Engineering overview:** use the standard 1160px content width; center a clear page title above twelve linked section cards. Each card carries its section icon, short code, title and description, using its semantic color family; explain all four families in a small legend below the grid. Collapse the two-column grid to one column on narrow screens. On mobile, turn the section sidebar into a horizontally scrollable row of complete, labeled section links.
- **Public page rhythm:** keep marketing and documentation pages within the same compact scale as the Explorer. Page titles top out at 2.75rem, page-hero top padding at 3.25rem, and section spacing at 4rem. Keep the home hero's product image beside its text on wide screens, then stack them on narrow screens. Check actual content and navigation at desktop, tablet and phone widths; responsive behavior should preserve the hierarchy and access to every action at each size.
- **Controls:** square or 3–4px radius, with hover and selected states expressed through surface and border changes. Keyboard focus uses a 2px accent outline with offset.
- **Panels:** use the page and panel surfaces with 1px dividers. Use elevation only for transient dialogs and menus.
- **Appearance:** system mode follows `prefers-color-scheme`; explicit light and dark selections override it. Keep kind and status meanings stable as the surfaces change.

## Customization

Projects can override surface and accent tokens while keeping the semantic roles. Keep kind tokens stable when shared product artifacts cross project boundaries. If a project adds a kind, assign one color per appearance and pair it with a recognizable icon and readable text token. Check text contrast and keyboard focus after changing colors. Do not customize the component geometry unless the target product has a different density or input context.

Snapshot identity is configurable at generation time: `prodshape graph --format html --product-name Lyceum` produces “Lyceum’s Product Snapshot”. Without a project name, the title remains “Product Snapshot”. The quiet attribution sits at the bottom of the artifact navigation and reads “Build with ProductShape” with the generating CLI version. Its link can point to a project-specific ProductShape URL with `--product-url`; it defaults to the ProductShape public site.

## Reference implementation

- Explorer tokens, SVG symbols, list and shell: `packages/core/src/snapshot.ts`.
- Public site aliases and component styles: `site/assets/site.css`.
- ArcShape's standalone architecture reader: sibling repository `arcshape/tools/arc42-site/shell.mjs`.
