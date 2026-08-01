# Measurements: add-focused-topology (SLI-EXPLORER-003)

Reference environment: Linux 6.6.87.2-microsoft-standard-WSL2, x64, Intel Core Ultra 7 155H,
22 CPUs, 15.4 GiB, Node v24.14.0. jsdom figures (no layout/paint), lower bounds. Machine-readable:
`measurements.json`.

| Model                 | Artifacts | File B    | Focus render p95 | Expand p95 | Filter p95 | Search p95 |
| --------------------- | --------- | --------- | ---------------- | ---------- | ---------- | ---------- |
| current-product-model | 81        | 367,841   | 11.72 ms         | 3.47 ms    | 11.33 ms   | 7.75 ms    |
| synthetic-5x          | 365       | 1,268,945 | 32.37 ms         | 6.15 ms    | 26.41 ms   | 13.2 ms    |
| synthetic-10x         | 730       | 2,461,844 | 58.52 ms         | 15.03 ms   | 45.98 ms   | 19.39 ms   |

- **Expanding a bounded relationship group**: p95 15 ms at 730 artifacts on the highest-degree
  focus — no perceptible wait, no material degradation across the tenfold range.
- **The file shrank** with the layered map withdrawn (2.46 MB vs 2.52 MB at 10x), and the opening
  document still grows 1.10× across 9× artifacts with zero artifact-level elements at open.
- No numeric budget is asserted beyond those already agreed; these figures are the recorded
  evidence budgets derive from.
- All seven reader operations of QR-SCALABILITY-001 are now measured across the three slices'
  records: load + search/filter (SLI-EXPLORER-001), open/read/refocus/back-forward (selection
  figures, this harness), expand (this record).
