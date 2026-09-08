import { access } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * AI provider detection for initialization.
 *
 * Detection is a passive filesystem inspection: it looks for the marker directory each provider
 * creates in a repository and never executes provider tooling. Rendering the ProductShape assets
 * for a provider lives in that provider's own integration package; this registry only carries
 * what the installer needs to route the user.
 *
 * A provider appearing here is a statement that its marker can be recognised, not that
 * ProductShape can render for it: `rendererFor` remains the single source of truth for that.
 */
export type AiProviderId = 'claude' | 'copilot' | 'codex' | 'opencode';

export interface AiProvider {
  id: AiProviderId;
  /** Human-readable name, as printed in reports and prompts. */
  name: string;
  /** Repository-relative directory whose presence marks the provider as in use. */
  marker: string;
  /** What the marker means for a maintainer choosing between providers. */
  notes: string;
}

export const aiProviders: readonly AiProvider[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    marker: '.claude',
    notes: 'Skills and commands under .claude/, read by Claude Code.',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    marker: '.github/prompts',
    notes: 'Prompt files under .github/prompts/, read by GitHub Copilot.',
  },
  {
    // Named for the standard rather than for Codex: .agents is the Agent Skills discovery path,
    // read by OpenCode, Gemini CLI, VS Code, Cursor and others (agentskills.io/clients). The
    // provider id stays `codex` because renaming it would break an installed surface.
    id: 'codex',
    name: 'Agent Skills',
    marker: '.agents',
    notes:
      'The Agent Skills open standard layout under .agents/, read by OpenAI Codex, OpenCode, Gemini CLI, VS Code, Cursor and other clients (agentskills.io/clients).',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    marker: '.opencode',
    notes: 'Skills and commands under .opencode/, read by OpenCode.',
  },
];

export function aiProviderById(id: string): AiProvider | undefined {
  return aiProviders.find((provider) => provider.id === id);
}

/** Detect which supported AI providers are present at the repository root, by marker. */
export async function detectAiProviders(root: string): Promise<AiProvider[]> {
  const detected: AiProvider[] = [];
  for (const provider of aiProviders) {
    try {
      await access(join(root, ...provider.marker.split('/')));
      detected.push(provider);
    } catch {
      // Marker absent: provider not in use.
    }
  }
  return detected;
}
