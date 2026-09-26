# PDaC v0.3 qualification

Tracking: https://github.com/juangcarmona/productshape/issues/264

The accepted contracts are spec revision `ec68206de270b0d3102ab03a5a9dc9c5785d356a` and conformance runner revision `252f8171b34ee9bff29716043cc69b53155a9dad`. Existing v1alpha1 repositories retain their semantics; v1alpha2 explicitly selects v0.3.

Implementation and review sequence:

1. Vendor versioned schemas; select the contract in `config.ts`, `schema-registry.ts` and `repository.ts`. Add Domain Lifecycle and coverage relationships in `artifact.ts`, `relationships.ts`, `graph.ts` and lifecycle validation. Test old and new contracts.
2. Implement one-hop impact accounting in core, wired through `overlay.ts` and `apply.ts`. Normalize effective changes, deduplicate causes, validate acknowledgements, and enforce ordered apply gates. Preserve independent model diagnostics.
3. Unify the live citation population used by verification and apply. Surface the sorted prospective report before writes, excluding archives and the applying container. Stale consumer citations do not block apply. Exercise rollback and dry-run equivalence.
4. Add explicitly selected external Verification Evidence documents, with schema and semantic checks, immutable outcomes and independently evaluated citation freshness.
5. Qualify the packaged implementation using pinned v0.2 and v0.3 suites. Add the trusted operation adapter, CI evidence, migration documentation and changesets.

PRs follow these dependencies. A conformance failure is investigated against the normative contract; neither the adapter nor fixtures may conceal an implementation defect. Publishing a release follows successful qualification and maintainer review.
