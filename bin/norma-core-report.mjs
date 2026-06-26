import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
  createLocalStructuredAnalyzeReportBundle,
} from "../dist/src/local-report/structured-analyze-report.js";

class CliUsageError extends Error {}

try {
  const { inputPath, outputDir } = parseReportArgs(process.argv.slice(2));

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

function parseReportArgs(args) {
  if (args[0] === "--") {
    return parseReportArgs(args.slice(1));
  }

  if (args.length === 2 && !args.some((arg) => arg.startsWith("--"))) {
    return { inputPath: args[0], outputDir: args[1] };
  }

  let inputPath = null;
  let outputDir = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];

    if ((arg === "--input" || arg === "--out") && (typeof value !== "string" || value.startsWith("--"))) {
      throw new CliUsageError(reportUsage());
    }

    if (arg === "--input") {
      if (inputPath !== null) throw new CliUsageError(reportUsage());
      inputPath = value;
      index += 1;
      continue;
    }

    if (arg === "--out") {
      if (outputDir !== null) throw new CliUsageError(reportUsage());
      outputDir = value;
      index += 1;
      continue;
    }

    throw new CliUsageError(reportUsage());
  }

  if (inputPath === null || outputDir === null) {
    throw new CliUsageError(reportUsage());
  }

  return { inputPath, outputDir };
}

function reportUsage() {
  return "Usage: node bin/norma-core-report.mjs <structured-input.json> <output-dir> or node bin/norma-core-report.mjs --input <structured-input.json> --out <output-dir>";
}
