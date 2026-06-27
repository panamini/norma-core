#!/usr/bin/env node

import { runNormaCli } from "../dist/src/cli/analyze.js";

process.exitCode = await runNormaCli(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
});
