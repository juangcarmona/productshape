# Product definition

This directory is the canonical product definition of this repository, managed with
Product Definition as Code.

- `model/` holds the accepted Product Definition (the baseline).
- `changes/active/` holds live Product Changes, each with its complete proposed future state.
  `changes/completed/`, `changes/rejected/` and `changes/superseded/` hold the change history,
  one directory per terminal status, and are inert; they materialize when the first change is
  applied or archived.

The definition changes through exactly one mechanism: a Product Change, validated as an overlay,
approved by a human, applied with `prodshape change apply`, and accepted when a human merges the
pull request carrying the result. Product-definition work and implementation work may share that
pull request or proceed at different times, but apply, acceptance and delivery remain distinct.

Validate with `prodshape validate`. Print an authoring template with
`prodshape template <kind>` and the allowed frontmatter with `prodshape schema <kind>`;
`prodshape init --full` installs the template library under `.product/templates/`.
