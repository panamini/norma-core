import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";
import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";
import {
  isExactR6CStructuredAnalyzeMcpChangeSet,
  r7aPostR1PrivateOperatingModelChangedFiles,
  r7StructuredAnalyzeHardeningChangedFiles,
} from "./changed-file-guard.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");
const analyzeToolName = "norma.analyzeStructuredCompositionV1";
const finalToolInventory = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
  analyzeToolName,
];
const exactAnalyzeAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
};

function requiredOutput(result, label) {
  assert.equal(result.status, "ok", label);
  assert.ok(result.output, label);
  return result.output;
}

function ratioPackRef(pack) {
  return `${pack.id}@${pack.version}`;
}

function r3SourceRefs({ caseId, surface, ratioPack, ruleSetRef, evaluationProfile, tolerancePolicy, evaluationTolerances }) {
  return [
    { kind: "structured-analysis-input", ref: `${caseId}:structured-input` },
    { kind: "surface", ref: surface.id },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: ruleSetRef },
    { kind: "evaluation-profile", ref: evaluationProfile.id },
    { kind: "tolerance-policy", ref: tolerancePolicy.id },
    { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
    { kind: "coordinate-system", ref: surface.coordinateSystem.id },
    { kind: "metric-policy", ref: surface.metricPolicy.id },
  ];
}

function createR3MvpInput(caseId, { width, height, compositionAElements, compositionBElements }) {
  const base = core.createMvpDemoInput();
  const coordinateSystem = {
    ...structuredClone(base.surface.coordinateSystem),
    id: `${caseId}:2d-metric`,
  };
  const metricPolicy = {
    ...structuredClone(base.surface.metricPolicy),
    id: `${caseId}:pixel-length-policy`,
  };
  const tolerancePolicy = {
    ...structuredClone(base.tolerancePolicy),
    id: `${caseId}:tolerance-policy`,
  };
  const evaluationTolerances = {
    ...structuredClone(base.evaluationTolerances),
    id: `${caseId}:evaluation-tolerances`,
  };
  const surface = {
    ...structuredClone(base.surface),
    id: `surface:${caseId}:${width}x${height}`,
    coordinateSystem,
    metricPolicy,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width, height },
  };
  const ratioPack = structuredClone(base.ratioPack);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }), `${caseId}:pack-lock`);
  const sourceRefs = r3SourceRefs({
    caseId,
    surface,
    ratioPack,
    ruleSetRef: base.ruleSetRef,
    evaluationProfile: base.evaluationProfile,
    tolerancePolicy,
    evaluationTolerances,
  });
  const operationContext = requiredOutput(core.createOperationContext({
    operationName: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: coordinateSystem,
    metricPolicy,
    tolerancePolicy,
    roundingPolicy: base.operationContext.roundingPolicy.value,
    numericPolicy: base.operationContext.numericPolicy.value,
    orderingPolicy: base.operationContext.orderingPolicy.value,
    featureFlags: { structuredAnalyzeHarness: true, [`${caseId}:explicit`]: true },
    sourceRefs,
  }), `${caseId}:operation-context`);

  return {
    surface,
    ratioPack,
    packLock,
    ruleSetRef: base.ruleSetRef,
    compositionA: {
      kind: "composition-2d",
      id: `composition:${caseId}:A`,
      coordinateSystem,
      metricPolicy,
      tolerancePolicy,
      surface,
      elements: compositionAElements,
    },
    compositionB: {
      kind: "composition-2d",
      id: `composition:${caseId}:B`,
      coordinateSystem,
      metricPolicy,
      tolerancePolicy,
      surface,
      elements: compositionBElements,
    },
    evaluationProfile: base.evaluationProfile,
    tolerancePolicy,
    evaluationTolerances,
    comparisonTolerances: {
      ...structuredClone(base.comparisonTolerances),
      id: `${caseId}:comparison-tolerances`,
    },
    operationContext,
  };
}

function sourceIdsForComposition(composition) {
  return [
    composition.id,
    composition.surface.id,
    ...composition.elements.map((element) => element.id),
    ...(composition.anchors ?? []).map((anchor) => anchor.id),
    ...composition.elements.flatMap((element) => (element.anchors ?? []).map((anchor) => anchor.id)),
  ];
}

function acceptedSourceIds(compositionA, compositionB) {
  return [...new Set([
    ...sourceIdsForComposition(compositionA),
    ...sourceIdsForComposition(compositionB),
  ])].sort((first, second) => first.localeCompare(second));
}

function structuredInputFromR3(caseId, r3Input, acceptedAt = "2026-06-25T00:00:00Z") {
  const acceptedIds = acceptedSourceIds(r3Input.compositionA, r3Input.compositionB);
  const acceptance = {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: "test-caller",
    acceptedAt,
    acceptedSourceIds: acceptedIds,
    acceptanceRecordId: `acceptance:${caseId}`,
  };

  return {
    contractVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId: `analysis:${caseId}`,
    compositionA: r3Input.compositionA,
    compositionB: r3Input.compositionB,
    acceptance,
    ratioPack: r3Input.ratioPack,
    packLock: r3Input.packLock,
    ruleSetRef: r3Input.ruleSetRef,
    evaluationProfile: r3Input.evaluationProfile,
    evaluationTolerances: r3Input.evaluationTolerances,
    comparisonTolerances: r3Input.comparisonTolerances,
    tolerancePolicy: r3Input.tolerancePolicy,
    operationContext: r3Input.operationContext,
    provenance: {
      kind: "structured-composition-analysis-provenance",
      sourceKind: "user_supplied_structured_data",
      externalSourceRef: { kind: "test-fixture", ref: caseId },
      callerSourceIds: acceptedIds,
      adapter: null,
      mappingVersion: "r6c-test-mapping-v1",
      normalizationVersion: null,
      transformationSteps: [],
      acceptanceRecord: acceptance,
      operationContextRef: r3Input.operationContext.ref,
    },
  };
}

function createR3CaseAInput() {
  return structuredInputFromR3("r6c-case-a", createR3MvpInput("r6c-case-a", {
    width: 900,
    height: 600,
    compositionAElements: [
      { kind: "element", id: "case-a-left-panel", geometry: { kind: "rect", x: 0, y: 0, width: 300, height: 600 } },
      { kind: "element", id: "case-a-middle-panel", geometry: { kind: "rect", x: 300, y: 0, width: 300, height: 600 } },
      { kind: "element", id: "case-a-right-panel", geometry: { kind: "rect", x: 600, y: 0, width: 300, height: 600 } },
    ],
    compositionBElements: [
      { kind: "element", id: "case-a-wide-panel", geometry: { kind: "rect", x: 0, y: 0, width: 520, height: 600 } },
      { kind: "element", id: "case-a-offset-panel", geometry: { kind: "rect", x: 500, y: 0, width: 250, height: 600 } },
    ],
  }));
}

function createR3CaseBInput() {
  return structuredInputFromR3("r6c-case-b", createR3MvpInput("r6c-case-b", {
    width: 600,
    height: 900,
    compositionAElements: [
      { kind: "element", id: "case-b-wide-panel", geometry: { kind: "rect", x: 0, y: 0, width: 420, height: 900 } },
      { kind: "element", id: "case-b-offset-panel", geometry: { kind: "rect", x: 390, y: 0, width: 150, height: 900 } },
    ],
    compositionBElements: [
      { kind: "element", id: "case-b-left-panel", geometry: { kind: "rect", x: 0, y: 0, width: 200, height: 900 } },
      { kind: "element", id: "case-b-middle-panel", geometry: { kind: "rect", x: 200, y: 0, width: 200, height: 900 } },
      { kind: "element", id: "case-b-right-panel", geometry: { kind: "rect", x: 400, y: 0, width: 200, height: 900 } },
    ],
  }));
}

function createDuplicateIdInput() {
  const input = createR3CaseAInput();
  input.compositionA = {
    ...input.compositionA,
    elements: input.compositionA.elements.map((element, index) => (
      index === 1 ? { ...element, id: input.compositionA.elements[0].id } : element
    )),
  };
  return input;
}

function createDuplicateAnchorIdInput() {
  const input = createR3CaseAInput();
  input.compositionA = {
    ...input.compositionA,
    anchors: [
      { kind: "anchor", id: input.compositionA.elements[0].id, point: { kind: "point", x: 100, y: 100 } },
      { kind: "anchor", id: input.compositionA.elements[0].id, point: { kind: "point", x: 200, y: 200 } },
    ],
  };
  return input;
}

function createDuplicateCompositionBElementIdInput() {
  const input = createR3CaseAInput();
  input.compositionB = {
    ...input.compositionB,
    elements: input.compositionB.elements.map((element, index) => (
      index === 1 ? { ...element, id: input.compositionB.elements[0].id } : element
    )),
  };
  return input;
}

function createForgedCallerSourceIdInput() {
  const input = createR3CaseAInput();
  input.provenance = {
    ...input.provenance,
    callerSourceIds: [...input.provenance.callerSourceIds, "forged-source-id"],
  };
  return input;
}

test("R6C tools/list exposes exactly six tools and annotates only Structured Analyze", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "r6c-tools-list",
    method: "tools/list",
  });

  assert.deepEqual(response.result.tools.map((tool) => tool.name), finalToolInventory);
  assert.equal(response.result.tools.length, 6);
  for (const tool of response.result.tools.slice(0, 5)) {
    assert.equal(Object.hasOwn(tool, "annotations"), false, `${tool.name} keeps prior annotation state`);
  }

  const analyzeTool = response.result.tools[5];
  assert.equal(analyzeTool.name, analyzeToolName);
  assert.equal(analyzeTool.title, "Analyze structured composition");
  assert.match(analyzeTool.description, /explicitly accepted user-supplied structured composition data/);
  assert.match(analyzeTool.description, /does not accept prompts, images, files, URLs/);
  assert.match(analyzeTool.description, /closer to the declared proportional system/);
  assert.deepEqual(analyzeTool.annotations, exactAnalyzeAnnotations);
  assert.deepEqual(analyzeTool.inputSchema.required, ["input"]);
  assert.equal(analyzeTool.inputSchema.additionalProperties, false);
  assert.equal(analyzeTool.inputSchema.properties.input.additionalProperties, false);
  assert.equal(analyzeTool.outputSchema.additionalProperties, false);
  assert.equal(analyzeTool.outputSchema.properties.result.additionalProperties, false);
  assertNoBooleanTrueAdditionalProperties(analyzeTool.inputSchema, "inputSchema");
  assertNoBooleanTrueAdditionalProperties(analyzeTool.outputSchema, "outputSchema");
});

test("R7.2 exact guard set rejects unrelated files", () => {
  assert.equal(isExactR6CStructuredAnalyzeMcpChangeSet(r7StructuredAnalyzeHardeningChangedFiles), true);
  assert.equal(
    isExactR6CStructuredAnalyzeMcpChangeSet(
      [...r7StructuredAnalyzeHardeningChangedFiles, "tests/unrelated.test.mjs"].sort(),
    ),
    false,
  );
  assert.equal(
    isExactR6CStructuredAnalyzeMcpChangeSet(
      r7StructuredAnalyzeHardeningChangedFiles.filter((file) => file !== "tests/structured-composition-analysis.test.mjs"),
    ),
    false,
  );
});

test("R7A.1 exact guard set rejects unrelated and legacy R6C mixed files", () => {
  assert.equal(isExactR6CStructuredAnalyzeMcpChangeSet(r7aPostR1PrivateOperatingModelChangedFiles), true);
  assert.equal(
    isExactR6CStructuredAnalyzeMcpChangeSet(
      [...r7aPostR1PrivateOperatingModelChangedFiles, "src/index.ts"].sort(),
    ),
    false,
  );
  assert.equal(
    isExactR6CStructuredAnalyzeMcpChangeSet([
      "docs/BUSINESS_READINESS_ROADMAP.md",
      "docs/MCP_TOOL_CONTRACT.md",
      "docs/OPERATIONS_RUNBOOK.md",
      "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
      "docs/decisions/2026-06-26-post-r1-private-operating-model.md",
      "src/mcp/stdio-protocol.ts",
      "tests/mcp-structured-composition-analysis-contract.test.mjs",
      "tests/r6c-structured-analyze-mcp-change-set.mjs",
    ].sort()),
    false,
  );
});

test("R6C Case A valid direct and MCP results are identical and deterministic", () => {
  const input = createR3CaseAInput();
  const { direct, response, repeatedResponse } = assertDirectMcpParity(input, "r6c-case-a");

  assert.equal(direct.status, "valid");
  assert.equal(response.result.structuredContent.status, "valid");
  assert.equal(response.result.structuredContent.result.comparison.status, "a_closer");
  assert.deepEqual(response.result.structuredContent.result.inputRefs, direct.inputRefs);
  assert.deepEqual(response.result.structuredContent.result.provenance, direct.provenance);
  assert.deepEqual(response.result.structuredContent.result.diagnostics, direct.diagnostics);
  assert.deepEqual(repeatedResponse.result.structuredContent, response.result.structuredContent);
});

test("R6D Structured Analyze tolerates only root MCP metadata before schema validation", () => {
  const input = createR3CaseAInput();
  const plainResponse = callAnalyze(input, "r6d-meta-plain");
  const metaResponse = parseToolResultResponse({
    jsonrpc: "2.0",
    id: "r6d-meta-root",
    method: "tools/call",
    params: {
      name: analyzeToolName,
      arguments: {
        input,
        _meta: {
          progressToken: "progress-1",
        },
      },
      _meta: {
        progressToken: "progress-2",
      },
    },
  });

  assert.deepEqual(metaResponse.result.structuredContent, plainResponse.result.structuredContent);

  const nestedMetaResponse = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "r6d-nested-meta-rejected",
    method: "tools/call",
    params: {
      name: analyzeToolName,
      arguments: {
        input: {
          ...input,
          _meta: {
            progressToken: "progress-1",
          },
        },
      },
    },
  });

  assert.deepEqual(nestedMetaResponse, {
    jsonrpc: "2.0",
    id: "r6d-nested-meta-rejected",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
});

test("R6C Case B valid direct and MCP results are identical and select B", () => {
  const input = createR3CaseBInput();
  const { direct, response } = assertDirectMcpParity(input, "r6c-case-b");

  assert.equal(direct.status, "valid");
  assert.equal(response.result.structuredContent.status, "valid");
  assert.equal(response.result.structuredContent.result.comparison.status, "b_closer");
  assert.notDeepEqual(createR3CaseAInput().compositionA.elements, input.compositionA.elements);
});

test("R6C Case C duplicate source ID returns direct invalid result over MCP", () => {
  const input = createDuplicateIdInput();
  const { direct, response } = assertDirectMcpParity(input, "r6c-case-c");

  assert.equal(direct.status, "invalid");
  assert.equal(response.result.structuredContent.status, "invalid");
  assert.ok(direct.diagnostics.some((diagnostic) => diagnostic.code === "DuplicateGeometrySourceId"));
  assert.deepEqual(direct.outputRefs, []);
  assert.equal(direct.measurements, null);
  assert.equal(direct.evaluations, null);
  assert.equal(direct.comparison, null);
  assert.equal(direct.decision, null);
  assert.equal(direct.replayReadiness, null);
  assert.equal(direct.serializationSummary, null);
});

test("R1 duplicate anchor source ID returns direct invalid result over MCP", () => {
  const input = createDuplicateAnchorIdInput();
  const { direct, response } = assertDirectMcpParity(input, "r1-duplicate-anchor");

  assert.equal(direct.status, "invalid");
  assert.equal(response.result.structuredContent.status, "invalid");
  assert.ok(direct.diagnostics.some((diagnostic) => diagnostic.code === "DuplicateGeometrySourceId"));
  assert.deepEqual(direct.outputRefs, []);
  assert.equal(direct.measurements, null);
  assert.equal(direct.evaluations, null);
  assert.equal(direct.comparison, null);
  assert.equal(direct.decision, null);
  assert.equal(direct.replayReadiness, null);
  assert.equal(direct.serializationSummary, null);
});

test("R7.2 semantic invalid inputs preserve direct and MCP parity", () => {
  for (const [id, input, expectedDiagnosticCode] of [
    ["r7-duplicate-composition-b-element", createDuplicateCompositionBElementIdInput(), "DuplicateGeometrySourceId"],
    ["r7-forged-caller-source-id", createForgedCallerSourceIdInput(), "MissingProvenance"],
  ]) {
    const { direct, response } = assertDirectMcpParity(input, id);

    assert.equal(direct.status, "invalid");
    assert.equal(response.result.structuredContent.status, "invalid");
    assert.ok(direct.diagnostics.some((diagnostic) => diagnostic.code === expectedDiagnosticCode));
    assert.deepEqual(direct.outputRefs, []);
    assert.equal(direct.measurements, null);
    assert.equal(direct.evaluations, null);
    assert.equal(direct.comparison, null);
    assert.equal(direct.decision, null);
    assert.equal(direct.replayReadiness, null);
    assert.equal(direct.serializationSummary, null);
  }
});

test("R7.2 MCP remains usable after semantic invalid Structured Analyze input", () => {
  const invalidResponse = callAnalyze(createDuplicateCompositionBElementIdInput(), "r7-semantic-invalid");
  const validResponse = callAnalyze(createR3CaseAInput(), "r7-valid-after-semantic-invalid");

  assert.equal(Object.hasOwn(invalidResponse, "error"), false);
  assert.equal(invalidResponse.result.isError, false);
  assert.equal(invalidResponse.result.structuredContent.status, "invalid");
  assert.equal(validResponse.result.structuredContent.status, "valid");
  assert.equal(validResponse.result.structuredContent.result.comparison.status, "a_closer");
});

test("R6C domain-invalid acceptance returns successful invalid structuredContent", () => {
  const input = createR3CaseAInput();
  input.acceptance = { ...input.acceptance, accepted: false };
  input.provenance.acceptanceRecord = input.acceptance;
  const direct = core.analyzeStructuredCompositionV1(input);
  const response = callAnalyze(input, "r6c-domain-invalid");

  assert.equal(Object.hasOwn(response, "error"), false);
  assert.equal(response.result.isError, false);
  assert.equal(direct.status, "invalid");
  assert.equal(response.result.structuredContent.status, "invalid");
  assert.deepEqual(response.result.structuredContent.result, direct);
  assert.ok(direct.diagnostics.some((diagnostic) => diagnostic.code === "InvalidInputShape"));
});

test("R6C transport-invalid tool arguments return sanitized invalid params errors", () => {
  const input = createR3CaseAInput();
  const badInputFields = ["prompt", "image", "file", "url", "recommendation", "beautyScore", "intentInference", "hiddenTolerance"];
  const invalidRequests = [
    { name: analyzeToolName },
    { name: analyzeToolName, arguments: {} },
    { name: analyzeToolName, arguments: { input, extra: true } },
    { name: analyzeToolName, arguments: { input: null } },
    { name: analyzeToolName, arguments: { input: "bad" } },
    { name: analyzeToolName, arguments: { input: { ...input, contractVersion: "wrong" } } },
    { name: analyzeToolName, arguments: { input: { ...input, analysisId: 42 } } },
    { name: analyzeToolName, arguments: { input: { ...input, compositionA: {} } } },
    ...badInputFields.map((field) => ({ name: analyzeToolName, arguments: { input: { ...input, [field]: "blocked" } } })),
  ];

  for (const params of invalidRequests) {
    assertTransportInvalidAnalyzeResponse({
      jsonrpc: "2.0",
      id: "r6c-invalid-params",
      method: "tools/call",
      params,
    });
  }
});

test("R12 transport-invalid Structured Analyze inputs never expose engine results", () => {
  const input = createR3CaseAInput();
  const malformedInputs = [
    { id: "r12-missing-params" },
    { id: "r12-string-params", params: "bad" },
    { id: "r12-null-params", params: null },
    { id: "r12-missing-name", params: { arguments: { input } } },
    { id: "r12-wrong-name-type", params: { name: 42, arguments: { input } } },
    { id: "r12-wrong-arguments-type", params: { name: analyzeToolName, arguments: [] } },
    { id: "r12-missing-input", params: { name: analyzeToolName, arguments: {} } },
    { id: "r12-unknown-wrapper-field", params: { name: analyzeToolName, arguments: { input, unknown: true } } },
    {
      id: "r12-wrong-operation-name",
      params: {
        name: analyzeToolName,
        arguments: { input: { ...input, operationContext: { ...input.operationContext, operationName: "wrong" } } },
      },
    },
    {
      id: "r12-wrong-operation-version",
      params: {
        name: analyzeToolName,
        arguments: { input: { ...input, operationContext: { ...input.operationContext, operationVersion: "wrong" } } },
      },
    },
    { id: "r12-missing-composition", params: { name: analyzeToolName, arguments: { input: { ...input, compositionA: undefined } } } },
    {
      id: "r12-malformed-nested-type",
      params: {
        name: analyzeToolName,
        arguments: {
          input: {
            ...input,
            compositionA: {
              ...input.compositionA,
              surface: { ...input.compositionA.surface, bounds: "bad" },
            },
          },
        },
      },
    },
    { id: "r12-nested-meta", params: { name: analyzeToolName, arguments: { input: { ...input, _meta: { progressToken: "hidden" } } } } },
  ];

  for (const malformedInput of malformedInputs) {
    assertTransportInvalidAnalyzeResponse({
      jsonrpc: "2.0",
      id: malformedInput.id,
      method: "tools/call",
      ...(Object.hasOwn(malformedInput, "params") ? { params: malformedInput.params } : {}),
    });
  }
});

test("R6C spawned STDIO process survives malformed Structured Analyze calls", async () => {
  const child = spawn(process.execPath, [wrapperPath], {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const input = createR3CaseAInput();
  const messages = [
    { jsonrpc: "2.0", id: "r6c-spawn-init", method: "initialize" },
    { jsonrpc: "2.0", id: "r6c-spawn-list", method: "tools/list" },
    { jsonrpc: "2.0", id: "r6c-spawn-analyze", method: "tools/call", params: { name: analyzeToolName, arguments: { input } } },
    { jsonrpc: "2.0", id: "r6c-spawn-bad", method: "tools/call", params: { name: analyzeToolName, arguments: {} } },
    { jsonrpc: "2.0", id: "r6c-spawn-after-bad", method: "tools/call", params: { name: "norma.getVersion", arguments: {} } },
  ];

  const stdoutLines = await readStdoutLinesBeforeClosingStdin(child, messages);
  child.stdin.end();

  assert.equal(JSON.parse(stdoutLines[1]).result.tools.length, 6);
  assert.equal(JSON.parse(stdoutLines[2]).result.structuredContent.tool, analyzeToolName);
  assert.equal(JSON.parse(stdoutLines[2]).result.structuredContent.result.comparison.status, "a_closer");
  assert.deepEqual(JSON.parse(stdoutLines[3]), {
    jsonrpc: "2.0",
    id: "r6c-spawn-bad",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
  assert.equal(JSON.parse(stdoutLines[4]).result.structuredContent.tool, "norma.getVersion");
});

test("R12 spawned STDIO Structured Analyze responses are byte-stable for identical input", async () => {
  const child = spawn(process.execPath, [wrapperPath], {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const input = createR3CaseAInput();
  const messages = [
    { jsonrpc: "2.0", id: "r12-spawn-init", method: "initialize" },
    { jsonrpc: "2.0", id: "r12-spawn-analyze-1", method: "tools/call", params: { name: analyzeToolName, arguments: { input } } },
    { jsonrpc: "2.0", id: "r12-spawn-analyze-2", method: "tools/call", params: { name: analyzeToolName, arguments: { input } } },
  ];

  const stdoutLines = await readStdoutLinesBeforeClosingStdin(child, messages);
  child.stdin.end();
  const first = JSON.parse(stdoutLines[1]);
  const second = JSON.parse(stdoutLines[2]);

  assert.deepEqual(second.result.structuredContent, first.result.structuredContent);
  assert.equal(second.result.content[0].text, first.result.content[0].text);
  assert.deepEqual(JSON.parse(first.result.content[0].text), first.result.structuredContent);
});

function assertDirectMcpParity(input, id) {
  const before = core.serializeCanonicalJson(input);
  const direct = core.analyzeStructuredCompositionV1(input);
  const response = callAnalyze(input, id);
  const repeatedResponse = callAnalyze(input, `${id}-repeat`);
  const outputSchema = analyzeToolDescriptor().outputSchema;

  assert.equal(core.serializeCanonicalJson(input), before);
  assert.equal(response.result.isError, false);
  assert.equal(response.result.content.length, 1);
  assert.equal(response.result.content[0].type, "text");
  assert.deepEqual(Object.keys(response.result.structuredContent), ["kind", "tool", "status", "result"]);
  assert.deepEqual(response.result.structuredContent, {
    kind: "norma-mcp-tool-result",
    tool: analyzeToolName,
    status: direct.status,
    result: direct,
  });
  assert.deepEqual(response.result.structuredContent.result, direct);
  assert.equal(response.result.content[0].text, core.serializeCanonicalJson(response.result.structuredContent));
  assert.deepEqual(JSON.parse(response.result.content[0].text), response.result.structuredContent);
  assert.equal(repeatedResponse.result.content[0].text, response.result.content[0].text);
  assert.deepEqual(repeatedResponse.result.structuredContent, response.result.structuredContent);
  assertConformsToSchema(response.result.structuredContent, outputSchema);

  return { direct, response, repeatedResponse };
}

function callAnalyze(input, id) {
  return parseToolResultResponse({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: analyzeToolName,
      arguments: {
        input,
      },
    },
  });
}

function analyzeToolDescriptor() {
  return parseToolsListResponse({
    jsonrpc: "2.0",
    id: "r6c-descriptor",
    method: "tools/list",
  }).result.tools[5];
}

function parseToolsListResponse(message) {
  const response = parseRequiredResponse(message);
  assert.equal(response.error, undefined);
  assert.ok(response.result);
  assert.ok(Array.isArray(response.result.tools));
  return response;
}

function parseToolResultResponse(message) {
  const response = parseRequiredResponse(message);
  assert.equal(response.error, undefined);
  assert.ok(response.result);
  assert.ok(Object.hasOwn(response.result, "structuredContent"));
  return response;
}

function assertTransportInvalidAnalyzeResponse(message) {
  const response = parseRequiredResponse(message);

  assert.deepEqual(response, {
    jsonrpc: "2.0",
    id: message.id,
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
  assert.equal(Object.hasOwn(response, "result"), false);
  assert.equal(Object.hasOwn(response, "structuredContent"), false);
  const responseText = JSON.stringify(response);
  for (const forbiddenLeak of [
    "structured-composition-analysis-result",
    "norma-mcp-tool-result",
    "DuplicateGeometrySourceId",
    "InvalidInputShape",
    "diagnostics",
    "measurements",
    "evaluations",
    "comparison",
    "decision",
    "replayReadiness",
  ]) {
    assert.equal(responseText.includes(forbiddenLeak), false, forbiddenLeak);
  }
}

function parseRequiredResponse(message) {
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.notEqual(response, null);
  assert.equal(response.endsWith("\n"), false);
  return JSON.parse(response);
}

function assertConformsToSchema(value, schema, path = "structuredContent") {
  if (schema.oneOf !== undefined) {
    const matches = schema.oneOf.filter((candidate) => schemaMatches(value, candidate, path));
    assert.equal(matches.length, 1, `${path} must match exactly one oneOf schema`);
    return;
  }

  if (Object.hasOwn(schema, "const")) {
    assert.deepEqual(value, schema.const, `${path} must match const`);
  }

  if (schema.enum !== undefined) {
    assert.ok(schema.enum.includes(value), `${path} must be in enum`);
  }

  if (schema.type === "null") {
    assert.equal(value, null, `${path} must be null`);
    return;
  }

  if (schema.type === "array") {
    assert.equal(Array.isArray(value), true, `${path} must be an array`);
    for (const [index, item] of value.entries()) {
      assertConformsToSchema(item, schema.items ?? {}, `${path}[${index}]`);
    }
    return;
  }

  if (schema.type !== undefined && schema.type !== "object") {
    assert.equal(typeof value, schema.type, `${path} must be ${schema.type}`);
    if (schema.type === "number") {
      assert.equal(Number.isFinite(value), true, `${path} must be finite`);
    }
    return;
  }

  if (schema.type !== "object") {
    return;
  }

  assert.notEqual(value, null, `${path} must be an object`);
  assert.equal(Array.isArray(value), false, `${path} must not be an array`);
  const properties = schema.properties ?? {};

  for (const key of schema.required ?? []) {
    assert.equal(Object.hasOwn(value, key), true, `${path}.${key} is required`);
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      assert.equal(Object.hasOwn(properties, key), true, `${path}.${key} is not declared`);
    }
  }

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (Object.hasOwn(value, key)) {
      assertConformsToSchema(value[key], propertySchema, `${path}.${key}`);
    }
  }

  if (typeof schema.additionalProperties === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (!Object.hasOwn(properties, key)) {
        assertConformsToSchema(nestedValue, schema.additionalProperties, `${path}.${key}`);
      }
    }
  }
}

function assertNoBooleanTrueAdditionalProperties(schema, path) {
  if (schema === null || typeof schema !== "object") {
    return;
  }

  assert.notEqual(schema.additionalProperties, true, `${path}.additionalProperties must not be boolean true`);

  if (schema.properties !== undefined) {
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      assertNoBooleanTrueAdditionalProperties(propertySchema, `${path}.properties.${key}`);
    }
  }

  if (schema.items !== undefined) {
    assertNoBooleanTrueAdditionalProperties(schema.items, `${path}.items`);
  }

  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties === "object") {
    assertNoBooleanTrueAdditionalProperties(schema.additionalProperties, `${path}.additionalProperties`);
  }

  for (const branchKey of ["oneOf", "anyOf", "allOf"]) {
    if (Array.isArray(schema[branchKey])) {
      for (const [index, branchSchema] of schema[branchKey].entries()) {
        assertNoBooleanTrueAdditionalProperties(branchSchema, `${path}.${branchKey}[${index}]`);
      }
    }
  }
}

function schemaMatches(value, schema, path) {
  if (schema.type === "null") {
    return value === null;
  }

  if (schema.type === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) {
    return false;
  }

  if (schema.type === "array" && !Array.isArray(value)) {
    return false;
  }

  if (schema.type !== undefined && schema.type !== "object" && schema.type !== "array" && schema.type !== "null" && typeof value !== schema.type) {
    return false;
  }

  try {
    assertConformsToSchema(value, schema, path);
    return true;
  } catch {
    return false;
  }
}

function readStdoutLinesBeforeClosingStdin(child, messages) {
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for stdout before stdin closed. stderr: ${stderr}`));
    }, 10_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const parts = stdout.split("\n");
      const completedLines = stdout.endsWith("\n") ? parts : parts.slice(0, -1);
      const lines = completedLines.filter((line) => line.length > 0);
      if (lines.length >= messages.length) {
        clearTimeout(timeout);
        resolve(lines.slice(0, messages.length));
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`MCP wrapper exited before responses were read. code=${code} signal=${signal} stderr=${stderr}`));
    });

    child.stdin.write(messages.map((message) => JSON.stringify(message)).join("\n"));
    child.stdin.write("\n");
  });
}
