# Measurements: add-explorer-overview-catalog (SLI-EXPLORER-001)

Reference environment: Linux 6.6.87.2-microsoft-standard-WSL2, x64, Intel Core Ultra 7 155H, 22 CPUs, 15.4 GiB, Node v24.14.0. jsdom figures (no layout/paint), lower bounds, per the harness's standing note. Machine-readable: `measurements.json`.

| Model | Artifacts | Opening B | Load (gen ms) | Search p95 | First search | Filter p95 |
| --- | --- | --- | --- | --- | --- | --- |
| current-product-model | 81 | 10,006 | 4.4–8.3 | 8.37 ms | 11.55 ms | 16.67 ms |
| synthetic-5x | 365 | 10,153 | 20.8–22.6 | 13.49 ms | 14.68 ms | 34.01 ms |
| synthetic-10x | 730 | 10,986 | 45.7–47.9 | 20.35 ms | 28.84 ms | 61.39 ms |

- **Loading the Explorer**: the opening document grows 1.10× across 9× artifacts (target < 2×), with zero artifact-level nodes/edges at open; generation stays linear per artifact and far inside the 5 s ceiling.
- **Searching and filtering**: filter p95 61 ms and search p95 20 ms at the 730-artifact corpus — no perceptible wait; growth across the tenfold range is proportional to list size, not superlinear. No numeric budget is asserted beyond the ones already agreed; these figures are the recorded evidence future budgets derive from.
- Existing search figures remain within their previously recorded ranges.
