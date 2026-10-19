import { access } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * SDD framework detection for initialization and doctor.
 *
 * Detection is a passive filesystem inspection: it looks for the marker directory each framework
 * creates in a repository and never executes framework tooling. Framework-specific behaviour
 * beyond detection (installing, merging configuration) lives in the framework's own integration
 * package; this registry only carries what the installer needs to route the user.
 */
export type SddFrameworkId = 'openspec' | 'kiro' | 'speckit';

export interface SddFramework {
  id: SddFrameworkId;
  /** Human-readable name, as printed in reports and prompts. */
  name: string;
  /** Repository-relative directory whose presence marks the framework as in use. */
  marker: string;
  /** Whether ProductShape can set the framework up end to end (first-party integration). */
  installable: boolean;
  /** Setup guidance for frameworks that install through their own tooling. */
  guidance: string[];
}

export const sddFrameworks: readonly SddFramework[] = [
  {
    id: 'openspec',
    name: 'OpenSpec',
    marker: 'openspec',
    installable: true,
    guidance: [],
  },
  {
    id: 'kiro',
    name: 'Kiro',
    marker: '.kiro',
    installable: false,
    guidance: [
      'Kiro sets itself up from inside the Kiro IDE; see https://kiro.dev/docs for setup, then cite product artifacts from its specs with: prodshape cite',
    ],
  },
  {
    id: 'speckit',
    name: 'Spec Kit',
    marker: '.specify',
    installable: false,
    guidance: [
      'Spec Kit installs through its own tooling (specify init); see https://github.com/github/spec-kit for setup, then wire the ProductShape integration with: prodshape integration add speckit',
    ],
  },
];

export function sddFrameworkById(id: string): SddFramework | undefined {
  return sddFrameworks.find((framework) => framework.id === id);
}

/** Detect which supported SDD frameworks are present at the repository root, by marker. */
export async function detectSddFrameworks(root: string): Promise<SddFramework[]> {
  const detected: SddFramework[] = [];
  for (const framework of sddFrameworks) {
    try {
      await access(join(root, ...framework.marker.split('/')));
      detected.push(framework);
    } catch {
      // Marker absent: framework not in use.
    }
  }
  return detected;
}
