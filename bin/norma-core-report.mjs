import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
  createLocalStructuredAnalyzeReportBundle,
} from "../dist/src/local-report/structured-analyze-report.js";

const [inputPath, outputDir] = process.argv.slice(2);

class CliUsageError extends Error {}

try {
  if (typeof inputPath !== "string" || typeof outputDir !== "string" || process.argv.length !== 4) {
    throw new CliUsageError("Usage: node bin/norma-core-report.mjs <structured-input.json> <output-dir>");
  }

  const input = JSON.parse(await readFile(inputPath, "utf8"));
  const bundle = createLocalStructuredAnalyzeReportBundle(input);
  const resolvedOutputDir = resolve(outputDir);

  await mkdir(resolvedOutputDir, { recursive: true });
  for (const fileName of LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES) {
    await writeFile(join(resolvedOutputDir, fileName), bundle.artifacts[fileName], "utf8");
  }

  process.stdout.write(`${JSON.stringify({
    kind: "local-structured-analyze-report-kit-cli-result",
    status: "ok",
    analysisId: bundle.summary.analysisId,
    resultStatus: bundle.result.status,
    outputDir: resolvedOutputDir,
    files: LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
  })}\n`);
  process.exitCode = bundle.result.status === "valid" ? 0 : 2;
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    kind: "local-structured-analyze-report-kit-cli-error",
    status: "error",
    error: {
      code: error instanceof CliUsageError ? "InvalidCliUsage" : "LocalReportFailed",
      message: error instanceof Error ? error.message : "Unexpected local report failure.",
    },
  })}\n`);
  process.exitCode = error instanceof CliUsageError ? 1 : 3;
}
