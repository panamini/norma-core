import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
} from "../dist/src/local-report/structured-analyze-report.js";
import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const scenarioDir = join(repoRoot, "examples", "structured-analyze", "scenarios");
const reportCommandPath = join(repoRoot, "bin", "norma-core-report.mjs");

const validScenarios = Object.freeze([
  {
    name: "alignment-basic",
    decisionStatus: "a_closer",
    ratioPackRef: "norma.basic-proportions@0.1.0",
  },
  {
    name: "ratio-comparison",
    decisionStatus: "a_closer",
    ratioPackRef: "norma.geometry-harmonies@0.1.0",
  },
  {
    name: "symmetry-test",
    decisionStatus: "tie",
    ratioPackRef: "norma.basic-proportions@0.1.0",
  },
  {
    name: "boundary-case",
    decisionStatus: "tie",
    ratioPackRef: "norma.basic-proportions@0.1.0",
  },
]);

const topLevelInputKeys = Object.freeze([
  "contractVersion",
  "analysisId",
  "compositionA",
  "compositionB",
  "acceptance",
  "ratioPack",
  "packLock",
  "ruleSetRef",
  "evaluationProfile",
  "evaluationTolerances",
  "comparisonTolerances",
  "tolerancePolicy",
  "operationContext",
  "provenance",
]);

test("scenario pack valid inputs analyze and produce deterministic report bundles", async () => {
  for (const scenario of validScenarios) {
    const inputPath = scenarioPath(scenario.name);
    const input = await readJson(inputPath);
    assertExplicitStructuredInput(input, scenario.name);

    const directResult = core.analyzeStructuredCompositionV1(input);
    assert.equal(directResult.status, "valid", scenario.name);
    assert.equal(directResult.decision.status, scenario.decisionStatus, scenario.name);
    assert.equal(`${input.ratioPack.id}@${input.ratioPack.version}`, scenario.ratioPackRef, scenario.name);

    const firstDir = await mkdtemp(join(tmpdir(), `norma-scenario-${scenario.name}-a-`));
    const secondDir = await mkdtemp(join(tmpdir(), `norma-scenario-${scenario.name}-b-`));

    try {
      const firstCommand = await runReportCommand(inputPath, firstDir);
      const secondCommand = await runReportCommand(inputPath, secondDir);

      assert.equal(firstCommand.status, "ok", scenario.name);
      assert.equal(firstCommand.resultStatus, "valid", scenario.name);
      assert.deepEqual(firstCommand.files, LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES, scenario.name);
      assert.equal(secondCommand.status, firstCommand.status, scenario.name);
      assert.equal(secondCommand.resultStatus, firstCommand.resultStatus, scenario.name);
      assert.equal(secondCommand.analysisId, firstCommand.analysisId, scenario.name);
      assert.deepEqual(secondCommand.files, firstCommand.files, scenario.name);

      const result = await readJson(join(firstDir, "result.json"));
      const summary = await readJson(join(firstDir, "summary.json"));
      const summaryMarkdown = await readFile(join(firstDir, "summary.md"), "utf8");
      const visualSvg = await readFile(join(firstDir, "visual.svg"), "utf8");
      const reportHtml = await readFile(join(firstDir, "report.html"), "utf8");

      assert.deepEqual(result, directResult, scenario.name);
      assert.equal(summary.status, "valid", scenario.name);
      assert.equal(summary.input.ratioPackRef, scenario.ratioPackRef, scenario.name);
      assert.equal(summary.scope.directAnalyzeStructuredCompositionV1, true, scenario.name);
      assert.equal(summary.scope.mcpRuntimeChange, false, scenario.name);
      assert.match(summaryMarkdown, /# Local Structured Analyze Report/u, scenario.name);
      assert.match(visualSvg, /^<svg/u, scenario.name);
      assert.match(reportHtml, /<!doctype html>/u, scenario.name);

      for (const fileName of LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES) {
        assert.equal(
          await readFile(join(firstDir, fileName), "utf8"),
          await readFile(join(secondDir, fileName), "utf8"),
          `${scenario.name}:${fileName}`,
        );
      }
    } finally {
      await rm(firstDir, { recursive: true, force: true });
      await rm(secondDir, { recursive: true, force: true });
    }
  }
});

test("scenario pack invalid case fails cleanly and deterministically", async () => {
  const input = await readJson(scenarioPath("invalid-case"));
  assertExplicitStructuredInput(input, "invalid-case");

  const first = core.analyzeStructuredCompositionV1(input);
  const second = core.analyzeStructuredCompositionV1(input);

  assert.deepEqual(second, first);
  assert.equal(first.status, "invalid");
  assert.equal(first.measurements, null);
  assert.equal(first.evaluations, null);
  assert.equal(first.comparison, null);
  assert.equal(first.decision, null);
  assert.deepEqual(first.outputRefs, []);
  assert.ok(first.diagnostics.some((diagnostic) => diagnostic.code === "DuplicateGeometrySourceId"));
});

test("report CLI accepts escaped positional paths", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "norma-scenario-escaped-positional-"));
  const inputPath = join(tempDir, "--input.json");
  const outputDir = join(tempDir, "out");

  try {
    await writeFile(inputPath, await readFile(scenarioPath("alignment-basic"), "utf8"));
    const { stdout } = await execFileAsync(process.execPath, [
      reportCommandPath,
      "--",
      inputPath,
      outputDir,
    ], { cwd: repoRoot });
    const command = JSON.parse(stdout);

    assert.equal(command.status, "ok");
    assert.equal(command.resultStatus, "valid");
    assert.deepEqual(command.files, LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("scenario pack leaves the MCP tool inventory at six tools", () => {
  const response = JSON.parse(handleMcpJsonRpcMessage(JSON.stringify({
    jsonrpc: "2.0",
    id: "r8-1-tools-list",
    method: "tools/list",
  })));

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, "r8-1-tools-list");
  assert.deepEqual(
    response.result.tools.map((tool) => tool.name),
    [
      "norma.getVersion",
      "norma.serializeCanonicalJson",
      "norma.verifyRun",
      "norma.verifyArtifactFreshness",
      "norma.replayMvpDemo",
      "norma.analyzeStructuredCompositionV1",
    ],
  );
});

async function runReportCommand(inputPath, outputDir) {
  const { stdout } = await execFileAsync(process.execPath, [
    reportCommandPath,
    "--input",
    inputPath,
    "--out",
    outputDir,
  ], { cwd: repoRoot });

  return JSON.parse(stdout);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function scenarioPath(name) {
  return join(scenarioDir, `${name}.json`);
}

function assertExplicitStructuredInput(input, scenarioName) {
  assert.deepEqual(Object.keys(input), topLevelInputKeys, scenarioName);
  assert.equal(input.contractVersion, core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION, scenarioName);
  assert.equal(input.compositionA.kind, "composition-2d", scenarioName);
  assert.equal(input.compositionB.kind, "composition-2d", scenarioName);
  assert.equal(input.acceptance.accepted, true, scenarioName);
  assert.equal(input.acceptance.mode, "user_supplied_structured_data", scenarioName);
  assert.equal(input.ratioPack.kind, "ratio-pack", scenarioName);
  assert.equal(input.packLock.kind, "pack-lock", scenarioName);
  assert.equal(typeof input.ruleSetRef, "string", scenarioName);
  assert.equal(input.evaluationProfile.kind, "evaluation-profile", scenarioName);
  assert.equal(input.evaluationTolerances.kind, "evaluation-tolerances", scenarioName);
  assert.equal(input.comparisonTolerances.kind, "tie-policy", scenarioName);
  assert.equal(input.tolerancePolicy.kind, "tolerance-policy", scenarioName);
  assert.equal(input.operationContext.kind, "operation-context", scenarioName);
  assert.equal(input.provenance.kind, "structured-composition-analysis-provenance", scenarioName);
}
