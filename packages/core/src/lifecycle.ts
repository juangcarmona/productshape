import type { Diagnostic } from './diagnostics.js';
import type { LoadedArtifact } from './model.js';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const localId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(value);

function index(entries: RecordValue[]): Map<string, RecordValue[]> {
  const result = new Map<string, RecordValue[]>();
  for (const entry of entries) {
    if (localId(entry.id)) result.set(entry.id, [...(result.get(entry.id) ?? []), entry]);
  }
  return result;
}

/** Local state identities never become product graph nodes or citation anchors. */
export function validateLifecycles(artifacts: LoadedArtifact[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const byId = new Map<string, LoadedArtifact[]>();
  for (const artifact of artifacts) {
    if (artifact.id) byId.set(artifact.id, [...(byId.get(artifact.id) ?? []), artifact]);
  }
  const emit = (artifact: LoadedArtifact, code: string, field: string, target?: string) => {
    diagnostics.push({
      severity: code === 'PRODUCT112' || code === 'PRODUCT113' ? 'warning' : 'error',
      code,
      file: artifact.file,
      artifact: artifact.id,
      field,
      ...(target !== undefined ? { target } : {}),
      message: lifecycleMessages[code] ?? code,
    });
  };

  for (const lifecycle of artifacts.filter((a) => a.type === 'domain-lifecycle')) {
    const rawStates = lifecycle.frontmatter.states;
    const rawTransitions = lifecycle.frontmatter.transitions;
    const states = Array.isArray(rawStates) ? rawStates.filter(record) : [];
    const transitions = Array.isArray(rawTransitions) ? rawTransitions.filter(record) : [];
    const stateIndex = index(states);
    const transitionIndex = index(transitions);
    for (const [namespace, entries] of [
      ['states', stateIndex],
      ['transitions', transitionIndex],
    ] as const) {
      for (const [id, matches] of entries) {
        if (matches.length > 1) emit(lifecycle, 'PRODUCT010', `${namespace}[${id}].id`, id);
      }
    }

    const stateShape =
      Array.isArray(rawStates) &&
      states.length === rawStates.length &&
      states.every(
        (state) =>
          localId(state.id) && (state.initial === undefined || typeof state.initial === 'boolean'),
      );
    const initial = states.filter((s) => s.initial === true);
    if (stateShape && initial.length !== 1) emit(lifecycle, 'PRODUCT012', 'states');
    const uniqueStates = stateShape && [...stateIndex.values()].every((v) => v.length === 1);
    let validReferences =
      Array.isArray(rawTransitions) && transitions.length === rawTransitions.length;
    for (const transition of transitions) {
      if (!localId(transition.id) || transitionIndex.get(transition.id)?.length !== 1) {
        validReferences = false;
        continue;
      }
      const prefix = `transitions[${transition.id}]`;
      const sources = Array.isArray(transition.from) ? transition.from.filter(localId) : [];
      if (
        !Array.isArray(transition.from) ||
        sources.length !== transition.from.length ||
        sources.length === 0 ||
        !localId(transition.to)
      ) {
        validReferences = false;
      }
      for (const [field, targets] of [
        ['from', sources],
        ['to', localId(transition.to) ? [transition.to] : []],
      ] as const) {
        for (const target of new Set(targets)) {
          const matches = stateIndex.get(target);
          if (!matches && stateShape) {
            emit(lifecycle, 'PRODUCT011', `${prefix}.${field}`, target);
            validReferences = false;
          }
          if (field === 'from' && matches?.length === 1 && matches[0]?.terminal === true) {
            emit(lifecycle, 'PRODUCT013', `${prefix}.from`, target);
          }
        }
      }
    }

    if (lifecycle.status !== 'active' || !lifecycle.id || byId.get(lifecycle.id)?.length !== 1)
      continue;
    if (uniqueStates && validReferences && initial.length === 1) {
      const reached = new Set<string>([initial[0]?.id as string]);
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const transition of transitions) {
          if (
            (transition.from as string[]).some((id) => reached.has(id)) &&
            !reached.has(transition.to as string)
          ) {
            reached.add(transition.to as string);
            expanded = true;
          }
        }
      }
      for (const id of stateIndex.keys()) {
        if (!reached.has(id)) emit(lifecycle, 'PRODUCT112', `states[${id}]`, id);
      }
    }
    for (const [id, matches] of transitionIndex) {
      if (matches.length !== 1) continue;
      const covered = artifacts.some((a) => {
        const pair = a.frontmatter['covers-transition'];
        return (
          a.type === 'structured-behaviour' &&
          a.status === 'active' &&
          record(pair) &&
          pair.lifecycle === lifecycle.id &&
          pair.transition === id
        );
      });
      if (!covered) emit(lifecycle, 'PRODUCT113', `transitions[${id}]`, id);
    }
  }

  for (const behaviour of artifacts.filter((a) => a.type === 'structured-behaviour')) {
    const pair = behaviour.frontmatter['covers-transition'];
    if (!record(pair) || typeof pair.lifecycle !== 'string' || !localId(pair.transition)) continue;
    const targets = byId.get(pair.lifecycle);
    const lifecycle = targets?.length === 1 ? targets[0] : undefined;
    if (lifecycle?.type !== 'domain-lifecycle' || !lifecycle.id?.startsWith('LC-')) continue;
    const transitions = lifecycle.frontmatter.transitions;
    if (!Array.isArray(transitions) || !transitions.every((t) => record(t) && localId(t.id)))
      continue;
    const matches = index(transitions).get(pair.transition);
    if (!matches) emit(behaviour, 'PRODUCT014', 'covers-transition.transition', pair.transition);
  }
  return diagnostics;
}

const lifecycleMessages: Record<string, string> = {
  PRODUCT010: 'Local lifecycle ID is duplicated within its namespace',
  PRODUCT011: 'Transition references an unknown local state',
  PRODUCT012: 'Lifecycle must contain exactly one initial state',
  PRODUCT013: 'A terminal state cannot be a transition source',
  PRODUCT014: 'Coverage selects an unknown local transition',
  PRODUCT112: 'State is unreachable from the initial state',
  PRODUCT113: 'Transition has no active Structured Behaviour coverage',
};
