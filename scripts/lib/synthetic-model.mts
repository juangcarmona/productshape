/**
 * The synthetic reference models QR-SCALABILITY-001 defines, in one place.
 *
 * Both the measurement harness and the screenshot harness need the 5x and 10x reference models, and
 * they must be the *same* models: measured integrity figures and the visual evidence a reviewer looks
 * at have to describe one artifact, not two that drifted apart.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const longTitle =
  'Artifact with a deliberately long title that exercises truncation, wrapping and layout ' +
  'behaviour in list rendering and in the detail header at every viewport width';

function body(sections: number, id: string): string {
  return Array.from(
    { length: sections },
    (_, i) => `## Section ${i + 1}

Authored prose for ${id} describing it in enough detail to be representative of a real product
model body, with a reference to \`ACT-A-001\` and some *emphasis* and a list:

- first bullet with moderate length text
- second bullet with moderate length text
- third bullet with moderate length text
`,
  ).join('\n');
}

/**
 * Write a synthetic model at the given multiple of the reference shape. Dense by construction:
 * every use case cites the first 8 terms and 4 rules, so early terms and the first context become
 * high-degree hubs; half the constraints are isolated; one artifact carries a long title and body.
 */
export async function writeSyntheticModel(root: string, scale: number): Promise<void> {
  const model = join(root, 'docs/product/model');
  for (const dir of [
    'actors',
    'journeys',
    'use-cases',
    'business-rules',
    'domain/terms',
    'domain/bounded-contexts',
    'requirements/functional',
    'requirements/quality',
    'requirements/constraints',
  ]) {
    await mkdir(join(model, dir), { recursive: true });
  }
  await mkdir(join(root, 'docs/product/changes'), { recursive: true });
  await mkdir(join(root, '.product'), { recursive: true });
  await writeFile(
    join(root, '.product/config.yaml'),
    `schema: product-definition-as-code/config/v1alpha1
product:
  root: docs/product
  model: docs/product/model
  changes: docs/product/changes
generated:
  root: .product/generated
  commit: false
validation:
  warnings-as-errors: false
  require-journey-for-use-case: false
  require-requirement-reachability: false
`,
    'utf8',
  );

  const pad = (i: number): string => String(i + 1).padStart(3, '0');
  const n = {
    bc: 2 * scale,
    act: 4 * scale,
    term: 10 * scale,
    br: 6 * scale,
    uc: 16 * scale,
    jrn: 4 * scale,
    fr: 21 * scale,
    qr: 4 * scale,
    con: 6 * scale,
  };
  const bcs = Array.from({ length: n.bc }, (_, i) => `BC-C-${pad(i)}`);
  const acts = Array.from({ length: n.act }, (_, i) => `ACT-A-${pad(i)}`);
  const terms = Array.from({ length: n.term }, (_, i) => `TERM-T-${pad(i)}`);
  const brs = Array.from({ length: n.br }, (_, i) => `BR-R-${pad(i)}`);
  const ucs = Array.from({ length: n.uc }, (_, i) => `UC-U-${pad(i)}`);
  const jrns = Array.from({ length: n.jrn }, (_, i) => `JRN-J-${pad(i)}`);

  const write = (dir: string, id: string, content: string): Promise<void> =>
    writeFile(join(model, dir, `${id.toLowerCase()}.md`), content, 'utf8');

  await Promise.all(
    bcs.map((id, i) =>
      write(
        'domain/bounded-contexts',
        id,
        `---\nid: ${id}\ntype: bounded-context\ntitle: Bounded context ${i + 1}\nstatus: active\n---\n\n## Responsibility\n${body(2, id)}\n## Language\n${body(1, id)}\n## Boundaries\n${body(1, id)}\n## External Relationships\n${body(1, id)}\n`,
      ),
    ),
  );
  await Promise.all(
    acts.map((id, i) =>
      write(
        'actors',
        id,
        `---\nid: ${id}\ntype: actor\ntitle: ${i === 0 ? longTitle : `Actor ${i + 1}`}\nstatus: active\nactor-kind: human\n---\n\n## Purpose\n${body(i === 0 ? 12 : 2, id)}\n## Goals\n${body(1, id)}\n## Responsibilities\n${body(1, id)}\n## Boundaries\n${body(1, id)}\n`,
      ),
    ),
  );
  await Promise.all(
    terms.map((id, i) =>
      write(
        'domain/terms',
        id,
        `---\nid: ${id}\ntype: domain-term\ntitle: Term ${i + 1}\nstatus: active\ndefined-in: ${bcs[i % bcs.length]}\n---\n\n## Definition\n${body(1, id)}\n## Distinguish From\n${body(1, id)}\n## Usage\n${body(1, id)}\n`,
      ),
    ),
  );
  await Promise.all(
    brs.map((id, i) =>
      write(
        'business-rules',
        id,
        `---\nid: ${id}\ntype: business-rule\ntitle: Rule ${i + 1}\nstatus: active\napplies-to:\n  - ${bcs[i % bcs.length]}\n---\n\n## Rule\n${body(1, id)}\n## Rationale\n${body(1, id)}\n## Examples\n${body(1, id)}\n## Exceptions\n${body(1, id)}\n`,
      ),
    ),
  );
  await Promise.all(
    ucs.map((id, i) => {
      const t = terms
        .slice(0, Math.min(terms.length, 8))
        .map((x) => `  - ${x}`)
        .join('\n');
      const r = brs
        .slice(0, Math.min(brs.length, 4))
        .map((x) => `  - ${x}`)
        .join('\n');
      return write(
        'use-cases',
        id,
        `---\nid: ${id}\ntype: use-case\ntitle: Use case ${i + 1}\nstatus: ${i % 7 === 0 ? 'draft' : 'active'}\nprimary-actor: ${acts[i % acts.length]}\nsupporting-actors:\n  - ${acts[(i + 1) % acts.length]}\nbounded-context: ${bcs[0]}\ngoverned-by:\n${r}\nuses-terms:\n${t}\n---\n\n## Goal\n${body(2, id)}\n## Trigger\n${body(1, id)}\n## Preconditions\n${body(1, id)}\n## Main Flow\n${body(3, id)}\n## Alternative Flows\n${body(2, id)}\n## Failure Conditions\n${body(1, id)}\n## Postconditions\n${body(1, id)}\n`,
      );
    }),
  );
  await Promise.all(
    jrns.map((id, i) => {
      const steps =
        ucs
          .slice(i * 3, i * 3 + 4)
          .map((x) => `  - use-case: ${x}`)
          .join('\n') || `  - use-case: ${ucs[0]}`;
      return write(
        'journeys',
        id,
        `---\nid: ${id}\ntype: journey\ntitle: Journey ${i + 1}\nstatus: active\nprimary-actor: ${acts[i % acts.length]}\nsteps:\n${steps}\n---\n\n## Intended Outcome\n${body(2, id)}\n## Entry Conditions\n${body(1, id)}\n## Journey Narrative\n${body(3, id)}\n## Variants and Branches\n${body(1, id)}\n## Completion Conditions\n${body(1, id)}\n`,
      );
    }),
  );
  await Promise.all(
    Array.from({ length: n.con }, (_, i) => {
      const id = `CON-K-${pad(i)}`;
      // Half the constraints are isolated: no applies-to, therefore degree zero.
      const applies = i % 2 === 0 ? `applies-to:\n  - ${bcs[i % bcs.length]}\n` : '';
      return write(
        'requirements/constraints',
        id,
        `---\nid: ${id}\ntype: constraint\ntitle: Constraint ${i + 1}\nstatus: active\n${applies}---\n\n## Constraint\n${body(1, id)}\n## Rationale\n${body(1, id)}\n## Consequences\n${body(1, id)}\n`,
      );
    }),
  );
  await Promise.all(
    Array.from({ length: n.fr }, (_, i) => {
      const id = `FR-F-${pad(i)}`;
      return write(
        'requirements/functional',
        id,
        `---\nid: ${id}\ntype: functional-requirement\ntitle: Functional requirement ${i + 1}\nstatus: active\nderived-from:\n  - ${ucs[i % ucs.length]}\n  - ${brs[i % brs.length]}\nverification:\n  - scenario: Scenario one for requirement ${i + 1}\n  - scenario: Scenario two for requirement ${i + 1}\n---\n\n## Requirement\n${body(2, id)}\n## Rationale\n${body(1, id)}\n## Acceptance Scenarios\n${body(2, id)}\n`,
      );
    }),
  );
  await Promise.all(
    Array.from({ length: n.qr }, (_, i) => {
      const id = `QR-Q-${pad(i)}`;
      return write(
        'requirements/quality',
        id,
        `---\nid: ${id}\ntype: quality-requirement\ntitle: Quality requirement ${i + 1}\nstatus: active\nquality-attribute: attribute-${i + 1}\napplies-to:\n  - ${ucs[i % ucs.length]}\n  - ${jrns[i % jrns.length]}\nverification:\n  - scenario: Scenario for quality ${i + 1}\n---\n\n## Requirement\n${body(1, id)}\n## Measurement\n${body(1, id)}\n## Verification\n${body(1, id)}\n`,
      );
    }),
  );
}
