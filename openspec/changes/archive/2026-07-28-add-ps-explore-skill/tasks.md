## 1. Skill file

- [x] 1.1 Create `skills/explore-product/` directory
- [x] 1.2 Write `skills/explore-product/SKILL.md` — thinking-partner stance, full model read
      upfront, analysis mode (structural gaps, inconsistencies, affected nodes), greenfield
      mode (empty/minimal model detection), mixed-audience language guidance, and explicit
      handoff phrasing to `ps:change`
- [x] 1.3 Register `ps:explore` in `.claude/settings.json` pointing to
      `skills/explore-product/SKILL.md`

## 2. Skill registration verification

- [x] 2.1 Invoke `ps:explore` in a test session to confirm the skill activates and loads
      the product model
- [x] 2.2 Verify greenfield mode activates when `docs/product/model` is empty or absent
- [x] 2.3 Verify analysis mode surfaces at least one structural observation from the
      real product model

## 3. Documentation updates

- [x] 3.1 Update project README to add `ps:explore` as the first step in the change
      workflow, with a one-liner description
- [x] 3.2 Update `docs/methodology/` (change or define flow docs) to show the full
      workflow: `ps:explore` → `ps:change` → `ps:slice` → `ps:handoff`
- [x] 3.3 Add `ps:explore` to any skill reference list or table in the docs
