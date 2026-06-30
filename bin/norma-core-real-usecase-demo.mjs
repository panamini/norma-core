import { execFile } from "node:child_process";
import { access, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const inputPath = join(repoRoot, "examples/structured-analyze/usecases/structured-layout-real-usecase.json");
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");
const defaultOutputDirPrefix = join(tmpdir(), "norma-core-real-usecase-report-");
const reportCommandTimeoutMs = 30_000;
const reportCommandFailureTextLimit = 4_096;

class CliUsageError extends Error {}

export {
  reportCommandFailureTextLimit,
  runRealUsecaseDemoCli,
};

async function createRealUsecaseDemoResult(args, options = {}) {
  const { outputDir } = await parseDemoArgs(args, options);
  const resolvedOutputDir = resolve(outputDir);
  const runReportCommand = options.execFileAsync ?? execFileAsync;
  const timeoutMs = options.reportCommandTimeoutMs ?? reportCommandTimeoutMs;

  await access(inputPath);
  const reportCommand = await executeReportCommand(runReportCommand, resolvedOutputDir, timeoutMs);

  const reportResult = parseReportCommandOutput(reportCommand.stdout);
  const files = await outputFiles(resolvedOutputDir, reportResult.files);
  if (!("result.json" in files)) {
    throw new Error("Expected report command to produce result.json.");
  }

  return {
    status: "ok",
    input: inputPath,
    outputDir: resolvedOutputDir,
    resultJson: files["result.json"],
    ...derivedArtifactFields(files),
    files,
    canonicalTruth: "result.json",
    derivedArtifacts: true,
  };
}

async function runRealUsecaseDemoCli({
  args = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  options = {},
} = {}) {
  try {
    const result = await createRealUsecaseDemoResult(args, options);
    stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${JSON.stringify(createRealUsecaseDemoErrorEnvelope(error))}\n`);
    return error instanceof CliUsageError ? 1 : 3;
  }
}

function createRealUsecaseDemoErrorEnvelope(error) {
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

  if (isOutputArgPair(args)) {
    return { outputDir: args[1] };
  }

  throw new CliUsageError("Usage: node bin/norma-core-real-usecase-demo.mjs [--output <dir>]");
}

async function executeReportCommand(runReportCommand, resolvedOutputDir, timeoutMs) {
  try {
    return await runReportCommand(process.execPath, [reportCommandPath, inputPath, resolvedOutputDir], {
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024,
      timeout: timeoutMs,
    });
  } catch (error) {
    const wrapped = new Error(error instanceof Error ? error.message : "Report command failed.");
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

  for (const fileName of sortedFileNames) {
    await access(join(outputDir, fileName));
  }

  return Object.fromEntries(sortedFileNames.map((fileName) => [fileName, join(outputDir, fileName)]));
}

function derivedArtifactFields(files) {
  return withoutNullValues({
    reportHtml: files["report.html"],
    visualSvg: files["visual.svg"],
    summaryJson: files["summary.json"],
    summaryMarkdown: files["summary.md"],
  });
}

function isOutputArgPair(args) {
  return args.length === 2 && args[0] === "--output" && typeof args[1] === "string" && args[1] !== "";
}

function errorCode(error) {
  return error instanceof CliUsageError ? "InvalidCliUsage" : "RealUsecaseDemoFailed";
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "Unexpected real-usecase demo failure.";
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

function withoutNullValues(fields) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null && value !== undefined));
}

function isRecord(value) {
  return value !== null && typeof value === "object";
}

function isCliEntrypoint() {
  return process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

if (isCliEntrypoint()) {
  process.exitCode = await runRealUsecaseDemoCli();
}
