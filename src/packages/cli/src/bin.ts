#!/usr/bin/env node
import { runCli } from './program.js';

// Prompting is wired only for a real terminal: scripts, CI and pipes get the deterministic
// non-interactive behaviour, which is part of the CLI contract rather than a fallback.
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env['CI']);

const code = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  out: (line) => console.log(line),
  err: (line) => console.error(line),
  ...(interactive
    ? {
        prompt: async (question: string) => {
          const { createInterface } = await import('node:readline/promises');
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          try {
            return await rl.question(question);
          } finally {
            rl.close();
          }
        },
      }
    : {}),
});
process.exit(code);
