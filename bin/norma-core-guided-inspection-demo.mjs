import { execFile } from "node:child_process";
import { realpathSync } from "node:fs";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceInputPath = "examples/structured-analyze/usecases/structured-layout-real-usecase.json";
const inputPath = join(repoRoot, sourceInputPath);
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");
const defaultOutputDirPrefix = join(tmpdir(), "norma-core-guided-inspection-demo-");
const reportCommandTimeoutMs = 30_000;
const reportCommandFailureTextLimit = 4_096;
const reportArtifactDescriptors = Object.freeze([
  { fileName: "report.html", envelopeField: "reportHtml" },
  { fileName: "result.json" },
  { fileName: "visual.svg", envelopeField: "visualSvg" },
  { fileName: "summary.json", envelopeField: "summaryJson" },
  { fileName: "summary.md", envelopeField: "summaryMarkdown" },
]);
const reportArtifactFileNames = Object.freeze(reportArtifactDescriptors.map(({ fileName }) => fileName));
const derivedReportArtifactDescriptors = Object.freeze(
  reportArtifactDescriptors.filter(({ envelopeField }) => typeof envelopeField === "string"),
);
const reportArtifactFileNameSet = new Set(reportArtifactFileNames);

class CliUsageError extends Error {}

export {
  runGuidedInspectionDemoCli,
};

async function createGuidedInspectionDemoResult(args, options = {}) {
  const { outputDir } = await parseDemoArgs(args, options);
  const resolvedOutputDir = resolve(outputDir);
  const runReportCommand = options.execFileAsync ?? execFileAsync;
  const timeoutMs = options.reportCommandTimeoutMs ?? reportCommandTimeoutMs;

  await access(inputPath);
  const reportCommand = await executeReportCommand(runReportCommand, resolvedOutputDir, timeoutMs);
  const reportResult = parseReportCommandOutput(reportCommand.stdout);
  const files = await outputFiles(resolvedOutputDir, reportResult.files);
  const resultJson = files["result.json"];

  if (!resultJson) {
    throw new Error("Expected report command to produce result.json.");
  }

  const result = JSON.parse(await readFile(resultJson, "utf8"));
  const guideHtml = join(resolvedOutputDir, "guide.html");
  await writeFile(guideHtml, createGuideHtml({ result, files }), "utf8");
  await access(guideHtml);

  return {
    status: "ok",
    outputDir: resolvedOutputDir,
    guideHtml,
    resultJson,
    ...derivedArtifactFields(files),
    canonicalTruth: "result.json",
    derivedArtifacts: true,
    localOnly: true,
  };
}

async function runGuidedInspectionDemoCli({
  args = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  options = {},
} = {}) {
  try {
    const result = await createGuidedInspectionDemoResult(args, options);
    stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${JSON.stringify(createGuidedInspectionDemoErrorEnvelope(error))}\n`);
    return error instanceof CliUsageError ? 1 : 3;
  }
}

function createGuidedInspectionDemoErrorEnvelope(error) {
  return {
    status: "error",
    error: withoutNullValues({
      code: errorCode(error),
      message: errorMessage(error),
      reportCommand: reportCommandFailure(error),
    }),
  };
}

async function parseDemoArgs(args, options = {}) {
  if (args.length === 0) {
    const makeTempOutputDir = options.mkdtemp ?? mkdtemp;
    return { outputDir: await makeTempOutputDir(defaultOutputDirPrefix) };
  }

  if (args.length === 2 && args[0] === "--output" && typeof args[1] === "string" && args[1] !== "") {
    return { outputDir: args[1] };
  }

  throw new CliUsageError("Usage: node bin/norma-core-guided-inspection-demo.mjs [--output <dir>]");
}

async function executeReportCommand(runReportCommand, resolvedOutputDir, timeoutMs) {
  try {
    return await runReportCommand(process.execPath, [reportCommandPath, inputPath, resolvedOutputDir], {
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024,
      timeout: timeoutMs,
    });
  } catch (error) {
    const wrapped = new Error("Report command failed.");
    wrapped.cause = error;
    wrapped.reportCommandFailure = reportCommandFailureDetails(error, timeoutMs);
    throw wrapped;
  }
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
  const filePaths = Object.fromEntries(sortedFileNames.map((fileName) => [fileName, safeOutputFilePath(outputDir, fileName)]));

  for (const fileName of sortedFileNames) {
    await access(filePaths[fileName]);
  }

  return filePaths;
}

function derivedArtifactFields(files) {
  return withoutNullValues(
    Object.fromEntries(
      derivedReportArtifactDescriptors.map(({ fileName, envelopeField }) => [envelopeField, files[fileName]]),
    ),
  );
}

function createGuideHtml({ result, files }) {
  const comparisonStatus = stringOrNull(result?.comparison?.status);
  const decisionStatus = stringOrNull(result?.decision?.status);
  const selectedEvaluationRef = stringOrNull(result?.decision?.selectedEvaluationRef);
  const resultStatus = stringOrNull(result?.status) ?? "unknown";
  const artifactLinkItems = guideArtifactLinkItems(files);
  const derivedArtifactSummary = guideDerivedArtifactSummary(files);
  const guideValues = {
    sourceInputPath: staticGuideText(sourceInputPath, "source input"),
    resultStatus: staticGuideText(resultStatus, "status"),
    comparisonStatus: staticGuideText(displayValue(comparisonStatus), "comparison"),
    decisionStatus: staticGuideText(displayValue(decisionStatus), "decision"),
    selectedEvaluationRef: staticGuideText(displayValue(selectedEvaluationRef), "selected evaluation ref"),
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Norma Local Guided Inspection Demo</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, sans-serif;
      line-height: 1.5;
      color: #17202a;
      background: #f6f8fa;
    }
    body {
      margin: 0;
      padding: 32px;
    }
    main {
      max-width: 920px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d7dde5;
      border-radius: 8px;
      padding: 28px;
    }
    h1,
    h2 {
      margin: 0 0 12px;
      line-height: 1.2;
    }
    h1 {
      font-size: 28px;
    }
    h2 {
      margin-top: 28px;
      font-size: 18px;
    }
    p {
      margin: 0 0 12px;
    }
    dl {
      display: grid;
      grid-template-columns: minmax(160px, 220px) 1fr;
      gap: 8px 16px;
      margin: 0;
    }
    dt {
      font-weight: 700;
      color: #3a4655;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    ul {
      margin: 0;
      padding-left: 20px;
    }
    a,
    code {
      color: #0f4c81;
    }
  </style>
</head>
<body>
  <main>
    <h1>Norma Local Guided Inspection Demo</h1>
    <p>This local-only guide shows what Norma produced from the existing real-usecase Structured Analyze report workflow.</p>
    <dl>
      <dt>Source input</dt>
      <dd><code>${guideValues.sourceInputPath}</code></dd>
      <dt>Status</dt>
      <dd><code>${guideValues.resultStatus}</code></dd>
      <dt>Comparison</dt>
      <dd><code>${guideValues.comparisonStatus}</code></dd>
      <dt>Decision</dt>
      <dd><code>${guideValues.decisionStatus}</code></dd>
      <dt>Selected evaluation ref</dt>
      <dd><code>${guideValues.selectedEvaluationRef}</code></dd>
      <dt>Canonical truth</dt>
      <dd><a href="result.json"><code>result.json</code></a></dd>
    </dl>

    <h2>Inspection Artifacts</h2>
    <p><code>result.json</code> is the canonical Norma truth. ${derivedArtifactSummary}</p>
    <ul>
${artifactLinkItems}
    </ul>

    <h2>Metric Policy Boundary</h2>
    <p><code>metricPolicy</code> remains existing engine output and context only. This guided demo does not infer, modify, optimize, recommend, or reinterpret from <code>metricPolicy</code>.</p>

    <h2>Blocked Surfaces</h2>
    <ul>
      <li>No hosted MCP.</li>
      <li>No ChatGPT connector runtime.</li>
      <li>No image, CAD, Figma, or provider adapter.</li>
      <li>No recommendation, optimization, inference, correction, or beauty scoring.</li>
      <li>No package publication.</li>
    </ul>
  </main>
</body>
</html>
`;
}

function safeOutputFilePath(outputDir, fileName) {
  if (
    typeof fileName !== "string" ||
    fileName === "" ||
    isAbsolute(fileName) ||
    fileName !== basename(fileName) ||
    !reportArtifactFileNameSet.has(fileName)
  ) {
    throw new Error("Report command returned an unsafe or unexpected output filename.");
  }

  const resolvedOutputDir = resolve(outputDir);
  const resolvedFilePath = resolve(resolvedOutputDir, fileName);
  const relativeFilePath = relative(resolvedOutputDir, resolvedFilePath);

  if (relativeFilePath === "" || relativeFilePath.startsWith("..") || isAbsolute(relativeFilePath)) {
    throw new Error("Report command output filename escapes the output directory.");
  }

  return resolvedFilePath;
}

function guideArtifactLinkItems(files) {
  return presentDerivedReportArtifactNames(files)
    .map((fileName) => `      <li><a href="${fileName}"><code>${fileName}</code></a></li>`)
    .join("\n");
}

function guideDerivedArtifactSummary(files) {
  const artifactNames = [...presentDerivedReportArtifactNames(files), "guide.html"];
  return `${formatCodeList(artifactNames)} ${artifactNames.length === 1 ? "is a derived inspection artifact" : "are derived inspection artifacts"}.`;
}

function presentDerivedReportArtifactNames(files) {
  return derivedReportArtifactDescriptors.map(({ fileName }) => fileName).filter((fileName) => files[fileName]);
}

function formatCodeList(values) {
  if (values.length === 1) {
    return `<code>${values[0]}</code>`;
  }

  return `${values.slice(0, -1).map((value) => `<code>${value}</code>`).join(", ")}, and <code>${values.at(-1)}</code>`;
}

function stringOrNull(value) {
  return typeof value === "string" ? value : null;
}

function displayValue(value) {
  return typeof value === "string" && value !== "" ? value : "not present";
}

function errorCode(error) {
  return error instanceof CliUsageError ? "InvalidCliUsage" : "GuidedInspectionDemoFailed";
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "Unexpected guided inspection demo failure.";
}

function reportCommandFailure(error) {
  return isRecord(error) && isRecord(error.reportCommandFailure) ? error.reportCommandFailure : null;
}

function reportCommandFailureDetails(error, timeoutMs) {
  const record = isRecord(error) ? error : {};
  const details = {
    timeoutMs,
    ...exitCodeMetadata(record.code),
  };

  assignDefined(details, "signal", typeof record.signal === "string" ? record.signal : null);
  assignDefined(details, "killed", typeof record.killed === "boolean" ? record.killed : null);
  assignDefined(details, "timedOut", timedOutMetadata(record));
  assignDefined(details, "stdout", boundedText(record.stdout));
  assignDefined(details, "stderr", boundedText(record.stderr));
  assignDefined(details, "error", boundedErrorMetadata(error));

  return details;
}

function boundedText(value) {
  if (typeof value !== "string" && !Buffer.isBuffer(value)) {
    return null;
  }

  const text = Buffer.isBuffer(value) ? value.toString("utf8") : value;
  return {
    text: text.slice(0, reportCommandFailureTextLimit),
    length: text.length,
    truncated: text.length > reportCommandFailureTextLimit,
  };
}

function boundedErrorMetadata(error) {
  const record = isRecord(error) ? error : {};
  const instance = error instanceof Error ? error : {};

  return boundedTextFields({
    name: instance.name,
    message: instance.message,
    code: record.code,
  });
}

function exitCodeMetadata(code) {
  if (typeof code === "number") return { exitCode: code };
  if (typeof code === "string") return { errorCode: code };
  return {};
}

function timedOutMetadata(record) {
  if (typeof record.timedOut === "boolean") return record.timedOut;
  if (record.killed === true && record.signal === "SIGTERM") return true;
  return null;
}

function assignDefined(target, key, value) {
  if (value !== null) {
    target[key] = value;
  }
}

function boundedTextFields(fields) {
  const entries = Object.entries(fields)
    .filter(([, value]) => typeof value === "string" && value !== "")
    .map(([key, value]) => [key, boundedText(value)]);

  return entries.length === 0 ? null : Object.fromEntries(entries);
}

function staticGuideText(value, label) {
  if (!/^[ A-Za-z0-9:._/-]+$/u.test(value)) {
    throw new Error(`Unexpected ${label} value for static guide HTML.`);
  }

  return value;
}

function withoutNullValues(fields) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null && value !== undefined));
}

function isRecord(value) {
  return value !== null && typeof value === "object";
}

function isCliEntrypoint() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  process.exitCode = await runGuidedInspectionDemoCli();
}
