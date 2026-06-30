import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const inputPath = join(repoRoot, "examples/structured-analyze/usecases/structured-layout-real-usecase.json");
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");
const defaultOutputDir = join(tmpdir(), "norma-core-real-usecase-report");

class CliUsageError extends Error {}

try {
  const { outputDir } = parseDemoArgs(process.argv.slice(2));
  const resolvedOutputDir = resolve(outputDir);

  await access(inputPath);
  const reportCommand = await execFileAsync(process.execPath, [reportCommandPath, inputPath, resolvedOutputDir], {
    cwd: repoRoot,
    maxBuffer: 10 * 1024 * 1024,
  });

  const reportResult = parseReportCommandOutput(reportCommand.stdout);
  const files = await outputFiles(resolvedOutputDir, reportResult.files);
  if (!("result.json" in files)) {
    throw new Error("Expected report command to produce result.json.");
  }

  process.stdout.write(`${JSON.stringify({
    status: "ok",
    input: inputPath,
    outputDir: resolvedOutputDir,
    resultJson: files["result.json"],
    ...(files["report.html"] ? { reportHtml: files["report.html"] } : {}),
    ...(files["visual.svg"] ? { visualSvg: files["visual.svg"] } : {}),
    ...(files["summary.json"] ? { summaryJson: files["summary.json"] } : {}),
    ...(files["summary.md"] ? { summaryMarkdown: files["summary.md"] } : {}),
    files,
    canonicalTruth: "result.json",
    derivedArtifacts: true,
  })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    status: "error",
    error: {
      code: error instanceof CliUsageError ? "InvalidCliUsage" : "RealUsecaseDemoFailed",
      message: error instanceof Error ? error.message : "Unexpected real-usecase demo failure.",
    },
  })}\n`);
  process.exitCode = error instanceof CliUsageError ? 1 : 3;
}

function parseDemoArgs(args) {
  if (args.length === 0) {
    return { outputDir: defaultOutputDir };
  }

  if (args.length === 2 && args[0] === "--output" && typeof args[1] === "string" && args[1] !== "") {
    return { outputDir: args[1] };
  }

  throw new CliUsageError("Usage: node bin/norma-core-real-usecase-demo.mjs [--output <dir>]");
}

function parseReportCommandOutput(stdout) {
  const value = JSON.parse(stdout);
  if (!value || typeof value !== "object" || !Array.isArray(value.files)) {
    throw new Error("Report command did not return a files array.");
  }

  return value;
}

async function outputFiles(outputDir, fileNames) {
  const sortedFileNames = [...fileNames].sort();

  for (const fileName of sortedFileNames) {
    await access(join(outputDir, fileName));
  }

  return Object.fromEntries(sortedFileNames.map((fileName) => [fileName, join(outputDir, fileName)]));
}
