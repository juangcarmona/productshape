# Publication delivery verification

The implementation-stage gate tables below retain the historical pre-approval status. The dated integration update at the end supersedes their pending CI/audit/human approval entries; it does not rewrite historical evidence.

Implementation source: `0c6d2af436efcd01d655fcdb4af2d712d86257f7`. Subsequent evidence-only commits do not change the implementation. Local checks ran on the frozen implementation tree before commit; clean output provenance was recorded after commit. No canonical product or architecture document changed.

## Acceptance criteria

| Issue #300 criterion | Deterministic/runtime evidence | Remaining judgement |
| --- | --- | --- |
| 1. Coherent family and correct destinations | Shared shell; profile-aware portal/Product Snapshot/Architecture Snapshot/public links. Eight builder tests include local link validation at root/subpath and Snapshot copy equality. Runtime covers public EN/ES, portal, architecture overview/section and all twelve architecture links. | Maintainer assesses clarity and visual consistency. |
| 2. Themes, mobile and standalone contract | Real Chromium controls/layout checks at 320/390/1024/1440; desktop light/mobile dark captures; explicit/system appearance assets, mobile Enter/Escape/focus return. Snapshot stays self-contained with URL-only state and byte-identical copying after generation. Narrow CSS correction keeps controls reachable and both tables locally scrollable with native table semantics. | Maintainer judges usability/accessibility coverage and visual result. |
| 3. Profile boundaries and canonical architecture | Both profiles validate at root and /review/; minimal temporary public checkout builds without architecture/snapshot/manifest inputs. Engineering preserves twelve sections and source links; existing valid/invalid/absent E2E fixtures pass. | Maintainer confirms retained purpose/content. |
| 4. Upload artifact, provenance and 404 | Public build has root index.html/404.html/publication.json; validator runs on the exact upload directory. Clean manifests identify source SHA and dirty:false. Local Cloudflare Wrangler checks root/deep links and rejects absent engineering/model/unknown routes with custom HTTP404. | Review the retained CI artifact and its source identity. |
| 5. Exact manual handoff | Operations runbook includes tested build/validation commands, archive root, conditional dashboard/Wrangler modes, preview/production branch semantics, source-aware upload, rollback and custom-domain prerequisites with official references. | Maintainer confirms documentation completeness; owner later verifies actual account/project mode and authorizes any publication. |
| 6. Automated/browser evidence and no production operation | All16 local checks pass; 70 test files/1039 tests pass with0 skipped. Final clean-source runtime reports, screenshots and checksums are retained alongside this record: 12 rendered scenarios, two shortcut checks, all twelve architecture routes, 60 layout cases across twelve boundary widths, four offline Snapshot interaction cases and ten local Cloudflare route checks. GitHub CI must be checked at the final PR head. No upload, credentials, DNS or production operation occurred. | Required human-owned Done judgement and maintainer approval remain pending. |

## Local deterministic lane

See [checks/results.json](checks/results.json) for every command, exit code, duration and log. All sixteen commands exited0: lint, formatting, typecheck, build, full tests, lifecycle validation, release workflow validation, packed release smoke, model/change validation, graph, doctor, OpenSpec citations, managed integration check, all OpenSpec artifact validation and release drift. Tests include this change's eight builder cases, nine Spec Kit consumer cases, and124 Snapshot cases. The release smoke intentionally produces a stale citation inside its synthetic fixture and asserts PRODUCT061; that expected fixture output is not a repository citation failure.

Local environment was Linux Node22.22.1 with pnpm11.1.0 and pinned OpenSpec1.11.0/Spec Kit1.0.4. The GitHub Actions Node22/24 Windows/macOS/Linux matrix and pinned packaged conformance jobs remain separate evidence; local Linux success is not a claim about the matrix. Record their actual final-head results in the PR.

## Verification correction and durable guard

The first nominally successful full suite ran1034 tests and silently skipped five real Spec Kit cases even with PRODSHAPE_REQUIRE_SPECKIT=1. The pinned CLI reports `specify 1.0.4`; the synchronous support probe expected a version starting at the first character, while the required-mode test used a more permissive parser. Thus the process could report the required tool present without running its gated cases.

The single owning guard is `tests/conformance/speckit-consumer.test.ts`: normalize the version token in its support probe and require the actual supported-tool predicate in required mode. Counterfactual: with the original failed probe, required mode now fails instead of skipping. The complete final suite then ran all1039 tests with0 skipped. No product version, supported-version threshold or lifecycle gate was relaxed. This correction is verification hardening within the run, not a new product feature or a retrospective written before merge.

## Definition of Done

| Configured item | Deterministic status | Human owner/status |
| --- | --- | --- |
| 1. Acceptance criteria | Evidence mapped above. | Repository Maintainer judgement pending. |
| 2. Implementation completeness | Implementation tasks completed; final audit/evidence reconciliation tracked in tasks/run record. | Repository Maintainer judgement pending. |
| 3. Tests | All16 local commands pass; full1039 tests including real Spec Kit; browser evidence retained. Final-head CI result must be recorded. | Repository Maintainer coverage judgement pending. |
| 4. Quality checks | Local deterministic lane passes; final-head CI required before green claim. | None. |
| 5. Security | No account credential, deployment or DNS operation; source changes are static rendering/CSS/validation. | Maintainer relevance/review judgement pending. |
| 6. Architecture/design conformance | Approved initial/amended plans; unchanged canonical architecture, Snapshot API/data/state contract. | Repository Maintainer judgement pending. |
| 7. Documentation | Runbook, README, design system, changelog and patch changesets updated. | Repository Maintainer completeness judgement pending. |
| 8. Product/spec consistency | Model/change/OpenSpec/citation/integration validation passes; no canonical artifact changes. | Product Engineer applicability/consistency judgement pending. |
| 9. Evidence | Local check logs, runtime/visual receipts, provenance and CI links must be present in final PR. | None. |
| 10. Human review | Unmet. | Required Repository Maintainer approval before merge. |
| 11. Known limitations | Listed below. | Repository Maintainer judgement pending. |

## Limitations and next actions

Cloudflare account/project mode remains unverified. Local Pages emulation proves prepared routing, not a hosted deployment. No hosted public preview, production publication or domain/TLS activation is claimed. The owner activates productshape.dev later under a separate publication instruction. E2E reports remain absent until their pipeline produces them; no run/result is fabricated.

#296 remains open/in-progress despite merged #297, has an active unsynced OpenSpec change and no retrospective. This follow-up does not administratively close or archive that debt. Required human-owned judgements and maintainer approval stop this Fast Forward run before merge; it is not complete.

## Independent audit correction round1

The isolated gpt-6-astra audit of1e0891d652186c1509989da2dbd2668714de52a7 requested two P2 corrections: Spanish toolbar overflow at1217/1441px and a validator that accepted an external wrong canonical or an empty sitemap. The corrected validator checks every shell canonical against its exact origin/base/route and requires the complete deduplicated sitemap inventory, excluding standalone Snapshot/report canonical requirements. Negative fixtures include wrong external canonical, empty/missing-entry/wrong-origin sitemaps. Desktop navigation now yields available width with fluid link padding and a contained overflow fallback. Expanded breakpoint evidence and a complete sixteen-command rerun passed on corrected source `0c6d2af436efcd01d655fcdb4af2d712d86257f7`; final clean-source manifests, served/disk hashes and Snapshot copy equality passed too. The earlier1e0891d runtime receipt remains historical evidence and is not presented as proof of these later corrections.

## Packaged conformance and final-head supplement

The isolated Node24 packaged jobs passed on the earlier1e0891d source: candidate147/147 with0 skips; stable45/45 plus12 pinned digests; the required negative control failed the expected11 cases. Reports retain that original source and tarball identity. `packaged-conformance/package-equivalence.json` proves all85 member-file hashes in the corrected0c6d2af repack are byte-identical; archive metadata makes the compressed tarball hash differ. No package source changed in the correction. These reports are supporting evidence, not a claim that the historical tarball has a new identity. Final GitHub Actions independently repacks and runs the configured jobs at the final evidence head.

This committed evidence necessarily precedes its own final-head CI/audit. The final CI URLs/results and isolated gpt-6-astra final decision are durable supplements on PR#301 after this head exists. The two outgoing task checkboxes for those events remain explicitly pending here until the PR supplement records them; no implementation scope is deferred. Human-owned Done judgements and maintainer approval remain unmet regardless of those results.

## Integration update — 2026-10-19

The [terminal PR supplement](https://github.com/juangcarmona/productshape/pull/301#issuecomment-6268058397) completes tasks 3.5/3.6: all final-head CI checks passed and the isolated gpt-6-astra reviewer approved `335ec4ec747a0af25da3481d1a5857f11a9b144f` with no outstanding findings after correction round 1 of 3. The human maintainer then explicitly approved: “Approved. Merge PR #301 and close the loop. Keep the Cloudflare activation pending; I’ll handle that manual step later.”

This human decision satisfies the previously pending human-owned integration judgements and maintainer approval; no forge review vote is fabricated. The plan contains no delta specs (`skip_specs: true`), so no main spec is changed. Only issue #300 is archived. Integration remains in progress until fresh audit/CI of the archive commit and the authorized merge; retrospective and tracker closure follow merge. Cloudflare activation and actual account/project/domain verification remain pending.
