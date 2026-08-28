import { isAlias, isMap, isPair, isScalar, isSeq } from 'yaml';
import type { Node, Pair } from 'yaml';
import { appendPointerToken } from './json-pointer.js';

/** One YAML-feature violation, located by its RFC 6901 JSON Pointer instance path. */
export interface YamlFeatureViolation {
  /** JSON Pointer instance path; empty string for the document itself. */
  path: string;
  /** The forbidden feature, for message composition. */
  feature: 'alias' | 'anchor' | 'tag' | 'merge key';
}

/**
 * Collect the YAML features the PDaC contracts forbid in strict documents: aliases, anchors,
 * tags and merge keys. Duplicate mapping keys are already a parse error under YAML 1.2 defaults.
 */
export function collectForbiddenYamlFeatures(
  node: unknown,
  path: string,
  out: YamlFeatureViolation[],
): void {
  if (node === null || node === undefined) return;
  if (isAlias(node)) {
    out.push({ path, feature: 'alias' });
    return;
  }
  const withAnchor = node as { anchor?: string; tag?: string };
  if (typeof withAnchor.anchor === 'string' && withAnchor.anchor.length > 0) {
    out.push({ path, feature: 'anchor' });
  }
  if (typeof withAnchor.tag === 'string' && withAnchor.tag.length > 0) {
    out.push({ path, feature: 'tag' });
  }
  if (isMap(node)) {
    for (const item of node.items as Pair[]) {
      if (!isPair(item)) continue;
      const key = item.key;
      const keyText = isScalar(key) ? String(key.value) : undefined;
      const childPath = keyText === undefined ? path : appendPointerToken(path, keyText);
      if (keyText === '<<') {
        out.push({ path: childPath, feature: 'merge key' });
      }
      if (key !== null && key !== undefined && !isScalar(key)) {
        collectForbiddenYamlFeatures(key, childPath, out);
      }
      collectForbiddenYamlFeatures(item.value, childPath, out);
    }
    return;
  }
  if (isSeq(node)) {
    (node.items as Node[]).forEach((item, index) => {
      collectForbiddenYamlFeatures(item, appendPointerToken(path, String(index)), out);
    });
  }
}
