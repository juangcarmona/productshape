# Design — implement-product-graph-core

## Context

ADRs 0002 (derived graph), 0003 (stable IDs) and 0007 (deterministic core) fix the constraints.
This note records implementation shape only.

## Key decisions

1. **Module layout in core**: `discovery` (fast-glob), `model` (load + per-document validation),
   `relationships` (the canonical field table as data), `graph` (nodes/edges/indexes),
   `validate` (baseline invariants + warnings), `impact`, `inspect`, `outputs` (generated files),
   `config`. The relationship table lives in one exported constant so validation, graph, impact
   and the future handoff closure all read the same data.
2. **Load once, derive everything**: `loadModel(root)` returns artifacts + per-document
   diagnostics; `compileGraph(model)` and `validateModel(model, graph, config)` are pure functions
   over that result. No global state, no caching beyond one run.
3. **Determinism**: all lists sorted (nodes by ID; edges by from/kind/to; diagnostics by
   file/code/target); paths stored POSIX; digests LF-normalized; JSON emitted with 2-space
   indent and trailing newline for stable bytes.
4. **Warnings gated by config**: PRODUCT102 emits only when `require-journey-for-use-case` is
   true; PRODUCT103 only when `require-requirement-reachability` is true. Other warnings are
   always on. `warnings-as-errors` affects the exit code, not the severity labels.
5. **CLI = thin orchestration**: commander per command, one `runCommand` wrapper mapping thrown
   `CliError(exitCode)` and unexpected errors to the documented exit codes; text and JSON
   renderers side by side.
6. **Reachability** (PRODUCT103): undirected BFS over canonical product edges from all actors;
   requirements not visited are flagged — matching the specification's definition.

## Alternatives considered

- A generic graph library — rejected: adjacency maps over ~10 edge kinds need no dependency.
- Validating references during parsing — rejected: reference resolution needs the whole model;
  keeping phases separate keeps diagnostics attributable and the code testable.
