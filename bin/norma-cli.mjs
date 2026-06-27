#!/usr/bin/env node

try {
  const { runNormaCli } = await import("../dist/src/cli/analyze.js");

  process.exitCode = await runNormaCli(process.argv.slice(2), {
    stdout: process.stdout,
    stderr: process.stderr,
  });
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    kind: "norma-cli-analyze-error",
    command: "analyze",
    status: "error",
    exitCode: 3,
    scenario: null,
    error: {
      code: "InternalCliError",
      message: error instanceof Error ? error.message : "Unexpected CLI failure.",
    },
  })}\n`);
  process.exitCode = 3;
}
