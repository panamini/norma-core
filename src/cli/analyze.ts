import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { StructuredCompositionAnalysisInputV1 } from "../structured-composition-analysis.js";
import { analyzeStructuredCompositionV1 } from "../structured-composition-analysis.js";
import {
  LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
  createLocalStructuredAnalyzeReportBundle,
} from "../local-report/structured-analyze-report.js";

const RESULT_KIND = "norma-cli-analyze-result" as const;
const ERROR_KIND = "norma-cli-analyze-error" as const;
const COMMAND = "analyze" as const;
const SUPPORTED_SCENARIO_NAMES = Object.freeze([
  "alignment-basic",
  "ratio-comparison",
  "symmetry-test",
  "boundary-case",
  "invalid-case",
] as const);

type SupportedScenarioName = (typeof SUPPORTED_SCENARIO_NAMES)[number];

interface WritableLike {
  write(chunk: string): unknown;
}

interface CliIo {
  stdout: WritableLike;
  stderr: WritableLike;
}

interface ScenarioRef {
  readonly name: string;
  readonly path: string;
}

interface AnalyzeArgs {
  readonly scenario: ScenarioRef;
  readonly outputDir: string;
}

class CliInputError extends Error {
  readonly code = "InvalidCliInput" as const;
}

class ScenarioLoadError extends Error {
  readonly code = "InvalidScenarioJson" as const;
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "../../..");
const scenarioDir = join(repoRoot, "examples", "structured-analyze", "scenarios");
const defaultOutputRoot = join(repoRoot, ".norma", "analyze");

export async function runNormaCli(args: readonly string[], io: CliIo): Promise<number> {
  if (args[0] !== COMMAND) {
    writeJson(io.stderr, errorEnvelope(null, 1, "InvalidCliInput", analyzeUsage()));
    return 1;
  }

  return runAnalyzeCommand(args.slice(1), io);
}

async function runAnalyzeCommand(args: readonly string[], io: CliIo): Promise<number> {
  let parsedArgs: AnalyzeArgs;
  let input: unknown;

  try {
    parsedArgs = parseAnalyzeArgs(args);
    input = await readScenarioJson(parsedArgs.scenario.path);
  } catch (error) {
    const code = error instanceof ScenarioLoadError ? error.code : "InvalidCliInput";
    const message = error instanceof Error ? error.message : analyzeUsage();
    writeJson(io.stderr, errorEnvelope(null, 1, code, message));
    return 1;
  }

  const result = analyzeStructuredCompositionV1(input as StructuredCompositionAnalysisInputV1 | null | undefined);
  if (result.status !== "valid") {
    writeJson(io.stderr, {
      kind: ERROR_KIND,
      command: COMMAND,
      status: "error",
      exitCode: 2,
      scenario: parsedArgs.scenario.name,
      scenarioPath: parsedArgs.scenario.path,
      outputDir: parsedArgs.outputDir,
      resultStatus: result.status,
      analysisId: result.analysisId,
      diagnostics: result.diagnostics,
      error: {
        code: "InvalidScenario",
        message: "Scenario did not pass structured analysis validation.",
      },
    });
    return 2;
  }

  try {
    const bundle = createLocalStructuredAnalyzeReportBundle(input);
    await writeBundleAtomically(parsedArgs.outputDir, bundle.artifacts);
    writeJson(io.stdout, {
      kind: RESULT_KIND,
      command: COMMAND,
      status: "ok",
      exitCode: 0,
      scenario: parsedArgs.scenario.name,
      scenarioPath: parsedArgs.scenario.path,
      outputDir: parsedArgs.outputDir,
      resultStatus: bundle.result.status,
      analysisId: bundle.summary.analysisId,
      files: LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
    });
    return 0;
  } catch (error) {
    writeJson(io.stderr, errorEnvelope(
      parsedArgs.scenario.name,
      3,
      "ReportWriteFailed",
      error instanceof Error ? error.message : "Unable to write report bundle.",
    ));
    return 3;
  }
}

function parseAnalyzeArgs(args: readonly string[]): AnalyzeArgs {
  let scenarioSpecifier: string | null = null;
  let outputDir: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];

    if (arg === "--") {
      continue;
    }

    if (arg === "--out" || arg === "--output") {
      if (outputDir !== null || typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
        throw new CliInputError(analyzeUsage());
      }
      outputDir = resolve(process.cwd(), value);
      index += 1;
      continue;
    }

    if (typeof arg !== "string" || arg.length === 0 || arg.startsWith("--") || scenarioSpecifier !== null) {
      throw new CliInputError(analyzeUsage());
    }

    scenarioSpecifier = arg;
  }

  if (scenarioSpecifier === null) {
    throw new CliInputError(analyzeUsage());
  }

  const scenario = resolveScenario(scenarioSpecifier);
  return {
    scenario,
    outputDir: outputDir ?? join(defaultOutputRoot, scenario.name),
  };
}

function resolveScenario(specifier: string): ScenarioRef {
  const normalizedSpecifier = specifier.replaceAll("\\", "/");
  const fileName = basename(normalizedSpecifier);
  const scenarioName = fileName.endsWith(".json") ? fileName.slice(0, -".json".length) : fileName;

  const directPath = resolve(process.cwd(), specifier);
  if (isExplicitScenarioPath(specifier)) {
    if (existsSync(directPath)) {
      return { name: scenarioName, path: directPath };
    }
    throw new CliInputError(`Scenario file not found: ${specifier}.`);
  }

  if (!isSupportedScenarioName(scenarioName)) {
    throw new CliInputError(`Unsupported scenario: ${specifier}. ${analyzeUsage()}`);
  }

  const bundledScenarioPath = join(scenarioDir, `${scenarioName}.json`);
  if (existsSync(bundledScenarioPath)) {
    return { name: scenarioName, path: bundledScenarioPath };
  }

  throw new CliInputError(`Scenario file not found: ${specifier}.`);
}

async function readScenarioJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ScenarioLoadError(`Invalid scenario JSON: ${path}.`);
    }
    throw new ScenarioLoadError(`Unable to read scenario JSON: ${path}.`);
  }
}

async function writeBundleAtomically(
  outputDir: string,
  artifacts: Record<(typeof LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES)[number], string>,
): Promise<void> {
  const parentDir = dirname(outputDir);

  if (outputDir === parentDir) {
    throw new Error("Output directory cannot be a filesystem root.");
  }

  await mkdir(parentDir, { recursive: true });
  await assertSafeOutputTarget(outputDir);
  const tempDir = await mkdtemp(join(parentDir, `.${basename(outputDir)}-tmp-`));
  const backupDir = `${tempDir}-previous`;
  let outputMovedToBackup = false;

  try {
    for (const fileName of LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES) {
      await writeFile(join(tempDir, fileName), artifacts[fileName], "utf8");
    }

    if (existsSync(outputDir)) {
      await rename(outputDir, backupDir);
      outputMovedToBackup = true;
    }

    try {
      await rename(tempDir, outputDir);
      outputMovedToBackup = false;
      try {
        await rm(backupDir, { recursive: true, force: true });
      } catch {
        // The new report bundle is already committed; backup cleanup is best effort.
      }
    } catch (error) {
      if (outputMovedToBackup && !existsSync(outputDir)) {
        await rename(backupDir, outputDir);
        outputMovedToBackup = false;
      }
      throw error;
    }
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    if (outputMovedToBackup && !existsSync(outputDir)) {
      await rename(backupDir, outputDir);
    }
    throw error;
  }
}

async function assertSafeOutputTarget(outputDir: string): Promise<void> {
  if (!existsSync(outputDir)) {
    return;
  }

  const outputStat = await stat(outputDir);
  if (!outputStat.isDirectory()) {
    throw new Error("Output path already exists and is not a directory.");
  }

  const entries = (await readdir(outputDir)).sort(compareStrings);
  const expectedEntries = [...LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES].sort(compareStrings);
  if (!sameStringList(entries, expectedEntries)) {
    throw new Error("Output directory already exists and is not a Norma analyze report bundle.");
  }
}

function errorEnvelope(
  scenario: string | null,
  exitCode: number,
  code: string,
  message: string,
) {
  return {
    kind: ERROR_KIND,
    command: COMMAND,
    status: "error",
    exitCode,
    scenario,
    error: {
      code,
      message,
    },
  };
}

function writeJson(target: WritableLike, value: unknown): void {
  target.write(`${JSON.stringify(value)}\n`);
}

function isSupportedScenarioName(value: string): value is SupportedScenarioName {
  return SUPPORTED_SCENARIO_NAMES.includes(value as SupportedScenarioName);
}

function isExplicitScenarioPath(value: string): boolean {
  return value.includes("/") || value.includes("\\") || value.endsWith(".json");
}

function sameStringList(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function compareStrings(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function analyzeUsage(): string {
  return "Usage: node bin/norma-cli.mjs analyze <alignment-basic|ratio-comparison|symmetry-test|boundary-case|invalid-case|scenario-file.json> [--out <output-dir>]";
}
