import type { LoadedChange } from './changes.js';
import type { Diagnostic } from './diagnostics.js';
import { sortDiagnostics } from './diagnostics.js';
import type { ProductGraph } from './graph.js';
import { compileGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import { validateModel } from './validate.js';

/**
 * Apply a Product Change's operations to the baseline artifact list.
 * Pure: baseline files are never touched; the result is a new list.
 */
export function applyOverlay(baseline: LoadedArtifact[], change: LoadedChange): LoadedArtifact[] {
  const removed = new Set(change.operations.remove);
  const modified = new Set(change.operations.modify);
  const overlay = baseline.filter(
    (artifact) => !artifact.id || (!removed.has(artifact.id) && !modified.has(artifact.id)),
  );
  overlay.push(...change.proposed);
  return overlay;
}

/** Operation-level errors: PRODUCT020-022 and PRODUCT026. */
export function validateOperations(change: LoadedChange, baseline: LoadedArtifact[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const baselineIds = new Set(baseline.map((a) => a.id).filter(Boolean));
  const changeId = change.id;

  for (const id of change.operations.add) {
    if (baselineIds.has(id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT020',
        message: `Addition '${id}' already exists in the baseline`,
        file: change.file,
        change: changeId,
        field: 'operations.add',
        target: id,
      });
    }
  }
  for (const id of change.operations.modify) {
    if (!baselineIds.has(id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT021',
        message: `Modification target '${id}' does not exist in the baseline`,
        file: change.file,
        change: changeId,
        field: 'operations.modify',
        target: id,
      });
    }
  }
  for (const id of change.operations.remove) {
    if (!baselineIds.has(id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT022',
        message: `Removal target '${id}' does not exist in the baseline`,
        file: change.file,
        change: changeId,
        field: 'operations.remove',
        target: id,
      });
    }
  }

  // PRODUCT026: proposed/ and operations must match in both directions.
  const declared = new Set([...change.operations.add, ...change.operations.modify]);
  const proposedIds = new Set(change.proposed.map((a) => a.id).filter(Boolean));
  for (const artifact of change.proposed) {
    if (artifact.id && !declared.has(artifact.id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT026',
        message: `Proposed artifact '${artifact.id}' is not listed in operations.add or operations.modify`,
        file: artifact.file,
        artifact: artifact.id,
      });
    }
  }
  for (const id of declared) {
    if (!proposedIds.has(id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT026',
        message: `Operation on '${id}' has no proposed future-state artifact under proposed/`,
        file: change.file,
        change: changeId,
        field: change.operations.add.includes(id) ? 'operations.add' : 'operations.modify',
        target: id,
      });
    }
  }

  return diagnostics;
}

/** PRODUCT025: overlapping modify/remove operations across concurrent live changes. */
export function validateConcurrency(
  change: LoadedChange,
  otherChanges: LoadedChange[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const touched = new Set([...change.operations.modify, ...change.operations.remove]);
  for (const other of otherChanges) {
    // Identity is the change document, not its `id`: a change whose frontmatter is missing an `id`
    // still has to be compared against every other change. Excluding by `id` made two id-less
    // changes skip each other (undefined === undefined), hiding a real overlap behind a separate
    // defect. `file` is unique per change, so it excludes exactly the change under validation.
    if (other.file === change.file) continue;
    const overlap = [...other.operations.modify, ...other.operations.remove].filter((id) =>
      touched.has(id),
    );
    for (const id of [...new Set(overlap)].sort()) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT025',
        message: `'${id}' is also modified or removed by concurrent change '${other.id ?? other.file}'`,
        file: change.file,
        change: change.id,
        field: change.operations.modify.includes(id) ? 'operations.modify' : 'operations.remove',
        target: id,
      });
    }
  }
  return diagnostics;
}

/**
 * A Markdown list item: any bullet or ordered marker, at any indentation.
 *
 * Content is deliberately not inspected. Nothing in the syntax distinguishes an answered item from
 * an open one — task-list checkboxes included — so an item counts as a question whatever it says,
 * and resolving a question means removing its list item rather than annotating it.
 */
const LIST_ITEM = /^[ \t]*(?:[-*+]|\d+[.)])(?=[ \t]|$)/m;

/**
 * The `## Open Questions` section body, up to the next `##` heading or the end of the document.
 *
 * The heading is anchored to a line start and to exactly two hashes: `### Open Questions` is a
 * subsection of something else, and matching it would attribute its questions to a section the
 * change does not have. The terminator is a `##` heading for the same reason — a `###` subsection
 * inside Open Questions is part of it, not the start of the next section.
 */
const OPEN_QUESTIONS_SECTION = /(?:^|\n)##[ \t]+Open Questions[ \t]*\r?\n([\s\S]*?)(?=\n##[ \t]|$)/;

/**
 * Drop fenced code blocks (``` or ~~~) from a Markdown body.
 *
 * A list-looking line inside a fence is a code sample, not a question: a change that documents
 * `- [ ] item` in an example block has not thereby left a question open. A fence closes on a fence
 * of the same character, at least as long, carrying no info string; an unterminated fence runs to
 * the end of the body.
 */
function withoutFencedCode(body: string): string {
  const kept: string[] = [];
  let open: { char: string; length: number } | undefined;
  for (const line of body.split('\n')) {
    const fence = /^[ \t]*(`{3,}|~{3,})[ \t]*(\S*)/.exec(line);
    const marker = fence?.[1];
    if (open === undefined) {
      if (marker) {
        open = { char: marker[0] as string, length: marker.length };
        continue;
      }
      kept.push(line);
      continue;
    }
    if (marker && marker[0] === open.char && marker.length >= open.length && !fence?.[2]) {
      open = undefined;
    }
  }
  return kept.join('\n');
}

/**
 * PRODUCT108: a change in status `approved` carrying unresolved open questions.
 *
 * Approval is the human product decision that authorizes apply, so it is the point at which an
 * unanswered question stops being elaboration and starts being a decision nobody made.
 *
 * State-based, not transition-based: the warning is reported on every validation of an approved
 * change, so it is reproducible from repository content alone with no need to know when the status
 * changed. Syntactic for the same reason — two implementations reading the same bytes have to
 * agree, and no deterministic tool can judge whether prose contains an open question, so prose
 * such as `None.` and an empty section carry no warning.
 */
export function validateOpenQuestions(change: LoadedChange): Diagnostic[] {
  if (change.status !== 'approved') return [];
  const section = OPEN_QUESTIONS_SECTION.exec(change.body);
  const sectionBody = withoutFencedCode(section?.[1] ?? '');
  if (!LIST_ITEM.test(sectionBody)) return [];
  return [
    {
      severity: 'warning',
      code: 'PRODUCT108',
      message: `Change is 'approved' but its Open Questions section still lists unresolved questions; resolve a question by removing its list item`,
      file: change.file,
      change: change.id,
      field: 'Open Questions',
    },
  ];
}

export interface ChangeValidation {
  overlayArtifacts: LoadedArtifact[];
  overlayGraph: ProductGraph;
  diagnostics: Diagnostic[];
}

/**
 * Full Product Change validation: per-document diagnostics, operation errors, concurrency and the
 * overlay graph revalidated end to end. Overlay-context recodes: duplicates become PRODUCT023,
 * dangling references caused by removals become PRODUCT024.
 */
export function validateChange(
  change: LoadedChange,
  baseline: LoadedArtifact[],
  otherChanges: LoadedChange[],
): ChangeValidation {
  const overlayArtifacts = applyOverlay(baseline, change);
  const overlayGraph = compileGraph(overlayArtifacts);
  const removed = new Set(change.operations.remove);

  const overlayDiagnostics = validateModel(overlayArtifacts, overlayGraph).map(
    (diagnostic): Diagnostic => {
      if (diagnostic.code === 'PRODUCT005') {
        return {
          ...diagnostic,
          code: 'PRODUCT023',
          message: `Overlay produces duplicate IDs: ${diagnostic.message}`,
        };
      }
      if (diagnostic.code === 'PRODUCT006' && diagnostic.target && removed.has(diagnostic.target)) {
        return {
          ...diagnostic,
          code: 'PRODUCT024',
          message: `Removal of '${diagnostic.target}' leaves a dangling reference`,
        };
      }
      return diagnostic;
    },
  );

  const diagnostics = sortDiagnostics([
    ...change.diagnostics,
    ...validateOperations(change, baseline),
    ...validateConcurrency(change, otherChanges),
    ...validateOpenQuestions(change),
    ...overlayDiagnostics,
  ]);

  return { overlayArtifacts, overlayGraph, diagnostics };
}
