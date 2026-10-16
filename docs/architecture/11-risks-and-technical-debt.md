---
title: Risks and Technical Debt
arc42-section: '11'
description: Prioritized architectural risks, technical debt, evidence, and mitigation.
---

# Risks and Technical Debt

| Risk or debt | Architectural impact | Evidence | Priority | Mitigation or decision |
| --- | --- | --- | --- | --- |
| Generated documentation and released CLI can describe different baselines | A newcomer may follow commands not present in the installed package | Repository `main` can be newer than the supported npm release; README calls this out | High | Keep published walkthroughs pinned to the supported CLI baseline and run the release-contract smoke workflow |
| The public model explorer is a point-in-time view | Readers may treat an older generated model as current | Snapshot embeds its source revision; GitHub Pages publishes on `main` merges | Medium | Display the source revision and regenerate during the same site deployment |
| Structural validation cannot determine whether product meaning is true or current | A schema-valid model can still be semantically incomplete | Deterministic core intentionally owns structural checks; people own semantic decisions | Medium | Preserve human review and make semantic limits clear in adoption guidance |
| Site content may drift from implementation or product intent | Public claims and onboarding steps become misleading | Site pages and CLI docs are separately authored sources | Medium | Build the supported version into generated pages, link canonical guides, and review public-copy changes with release updates |
