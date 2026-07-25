#!/usr/bin/env node
import { runCli } from './program.js';

const code = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  out: (line) => console.log(line),
  err: (line) => console.error(line),
});
process.exit(code);
