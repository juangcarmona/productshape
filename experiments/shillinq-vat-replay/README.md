# Shillinq VAT replay

An external falsification pilot for Product Definition as Code: replaying
the OpenSpec change that gave Shillinq (ConductionNL/shillinq) two
contradictory VAT return models, against a PDaC baseline recovered from the
product truth that was canonically accepted at Shillinq commit
`5841441755d8053255a33d143107ba1660e66e1c`.

- [PROTOCOL.md](PROTOCOL.md) — question under test, arms, outcome scale,
  pre-registered predictions, validity threats.
- [REPORT.md](REPORT.md) — results.
- `pilot/` — the PDaC workspace: recovered baseline model (11 artifacts) and
  the Arm 1a transcription change.
- `results/` — verbatim tool outputs per arm.
- `transcripts/` — Arm 2 agent final reports, verbatim.
- `fetch-shillinq-packet.sh` — fetches the verbatim historical OpenSpec
  packet from the pinned Shillinq commit (EUPL-1.2 content, deliberately not
  committed into this Apache-2.0 repository).

The forensic groundwork (what actually happened in Shillinq, verified claim
by claim) is summarized in PROTOCOL.md's "Question under test".

This is forensic research on a public repository. Before presenting any of
it publicly as a case study, obtain the maintainers' participation.
