import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const decisionPath = "docs/decisions/2026-06-25-structured-analyze-v1-contract.md";
const roadmapPath = "docs/BUSINESS_READINESS_ROADMAP.md";
const mcpContractPath = "docs/MCP_TOOL_CONTRACT.md";
const operationsRunbookPath = "docs/OPERATIONS_RUNBOOK.md";
const protocolSourcePath = "src/mcp/stdio-protocol.ts";

const currentMcpTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
  "norma.analyzeStructuredCompositionV1",
];

const futureAnalyzeTool = "norma.analyzeStructuredCompositionV1";

test("R6A decision approves one direct structured analysis operation without runtime scope", () => {
  const decision = read(decisionPath);

  assertHeadingsInOrder(decision, [
    "# Structured Analyze V1 Contract",
    "## Status",
    "## Decision",
    "## Contract Selection",
    "## Input Boundary",
    "## Operation Semantics",
    "## Result Contract",
    "## Deterministic Fixtures",
    "## MCP Tool Contract",
    "## Compatibility",
    "## Validation Gates",
    "## Rollback",
  ]);

  assertIncludes(decision, [
    "R6A is contract docs/tests only.",
    "R6A.1 amends this contract",
    "export name: analyzeStructuredCompositionV1",
    "operation name: core.structured-composition-analysis.analyze",
    "operation version: 0.1.0-r6",
    "input type: StructuredCompositionAnalysisInputV1",
    "result type: StructuredCompositionAnalysisResultV1",
    "R6A does not implement runtime code",
    "R6C exposes the operation through exactly one local STDIO MCP tool",
  ]);
});

test("R6A input boundary keeps explicit accepted Core compositions as source truth", () => {
  const decision = read(decisionPath);

  assertIncludes(decision, [
    "explicit user-supplied Core `Composition2D` data",
    "It does not consume `AcceptedGeometry@1` directly.",
    "structured-composition-analysis-input.v1",
    "`compositionA` and `compositionB` must be explicit Core `Composition2D` payloads",
    "`accepted` must be exactly `true` before downstream computation can run.",
    "user_supplied_structured_data",
    "`acceptedAt` is operational metadata.",
    "may be echoed in provenance",
    "must not affect deterministic",
    "measurement, evaluation, comparison, decision",
    "run identity",
    "meaningful analysis",
    "equality",
    "Deterministic equality tests should compare analysis-significant output",
  ]);
});

test("R6A.1 input contract requires executable pack rules and explicit tolerances", () => {
  const decision = read(decisionPath);

  assertIncludes(decision, [
    "ratioPack: RatioPack;",
    "ruleSetRef: string;",
    "evaluationTolerances: EvaluationTolerances;",
    "comparisonTolerances: TiePolicy;",
    "`packLock` is identity/hash metadata only.",
    "It cannot supply executable rules.",
    "`ratioPack` supplies the executable `ruleSets` and `ruleDeclarations`.",
    "`ruleSetRef` selects the exact rule set from `ratioPack`.",
    "validate coherence between `ratioPack`, `packLock`, `ruleSetRef`, and",
    "`operationContext`",
    "must not silently select `BASIC_PROPORTIONS_PACK`",
    "hidden built-in pack default",
    "`evaluationProfile` does not embed tolerances.",
    "`evaluationTolerances` is",
    "required explicitly",
    "`comparisonTolerances` is required explicitly",
    "maps to the current Core `TiePolicy` type",
    "Missing evaluation tolerances",
    "missing comparison/tie tolerances",
    "unsupported tolerance policies",
    "implicit output-affecting operation context policies",
    "rather than defaulting",
  ]);
});

test("R6A result contract separates invalid domain input from internal failures", () => {
  const decision = read(decisionPath);

  assertIncludes(decision, [
    "structured-composition-analysis-result",
    "structured-composition-analysis-result.v1",
    "valid",
    "invalid",
    "The returned direct-operation statuses are only `valid` and `invalid`.",
    "Human-facing text may describe a valid result as analyzed",
    "Ordinary malformed or domain-invalid caller input must return",
    "`status: \"invalid\"`",
    "no downstream measurements, evaluations, comparison, decision",
    "output refs, run ref",
    "replay-readiness data",
    "Unexpected internal failures may throw in the direct operation boundary.",
    "JSON-RPC `-32603`",
    "must not return a normal `failed` result variant unless a future ADR defines",
  ]);

  assertNotIncludes(decision, [
    "Allowed `status` values are:\n\n```text\nvalid\ninvalid\nfailed\n```",
  ]);
});

test("R6A fixtures require valid A B determinism and duplicate-ID invalid proof", () => {
  const decision = read(decisionPath);

  assertIncludes(decision, [
    "Case A: R3 structured case A, expected `decision.status` `a_closer`.",
    "Case B: R3 structured case B, expected `decision.status` `b_closer`.",
    "Case C: case A with a duplicate composition element ID",
    "diagnostic `DuplicateGeometrySourceId`",
    "no output refs",
    "direct-core/MCP parity",
  ]);
});

test("R6C docs move Structured Analyze from future contract to current MCP runtime", () => {
  const decision = read(decisionPath);
  const mcpContract = read(mcpContractPath);
  const runbook = read(operationsRunbookPath);

  assertIncludes(decision, [
    futureAnalyzeTool,
    "The tool descriptor must declare `inputSchema` and `outputSchema` from first",
    "introduction.",
    "\"readOnlyHint\": true",
    "\"destructiveHint\": false",
    "\"idempotentHint\": true",
    "\"openWorldHint\": false",
    "These annotations describe client-facing behavior only.",
    "Malformed `tools/call` params or malformed tool arguments must return JSON-RPC",
    "`-32602`",
    "Validly shaped domain-invalid analysis input must return structured",
  ]);

  assertIncludes(decision, [
    "R6B must not silently select `BASIC_PROPORTIONS_PACK`",
    "R6B must not return a normal `failed` result variant",
  ]);

  assertIncludes(mcpContract, [
    "R6C Structured Analyze MCP Runtime",
    futureAnalyzeTool,
    "R6C moves Structured Analyze into the current local STDIO runtime inventory.",
    "append the new tool after the original five tools",
    "Original five tools keep their descriptor, outputSchema, annotation state, and tools/call behavior.",
    "`ratioPack`, `ruleSetRef`, `packLock`, `evaluationProfile`",
    "`evaluationTolerances`, `comparisonTolerances`, `tolerancePolicy`",
    "\"openWorldHint\": false",
  ]);

  assertIncludes(runbook, [
    "Current inventory is exactly the six tools listed below.",
    "norma.analyzeStructuredCompositionV1",
  ]);
});

test("R6A roadmap links the decision and keeps future implementation split", () => {
  const roadmap = read(roadmapPath);

  assertIncludes(roadmap, [
    "## R6A Structured Analyze V1 Contract",
    decisionPath,
    "R6A is contract docs/tests only.",
    "R6A.1 clarifies that `packLock` is identity/hash metadata only",
    "must require explicit `ratioPack`, `ruleSetRef`, `evaluationTolerances`",
    "`comparisonTolerances`",
    "R6B implements the direct `analyzeStructuredCompositionV1` operation",
    "R6C exposes at most one MCP tool",
    "no image, vision, camera, CAD, plugin, hosted MCP, public submission",
    "or runtime expansion beyond the one structured-analysis MCP tool",
  ]);
});

test("R6C exposes the Structured Analyze MCP tool at runtime", () => {
  const protocolSource = read(protocolSourcePath);
  const toolsListResponse = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "r6c-tools-list",
    method: "tools/list",
  });
  const toolNames = toolsListResponse.result.tools.map((tool) => tool.name);

  assert.deepEqual(toolNames, currentMcpTools);
  assert.equal(toolNames.includes(futureAnalyzeTool), true);
  assert.equal(protocolSource.includes(futureAnalyzeTool), true);
});

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function parseRequiredResponse(message) {
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.notEqual(response, null);
  return JSON.parse(response);
}

function assertIncludes(source, snippets) {
  const normalizedSource = normalizeWhitespace(source);
  for (const snippet of snippets) {
    assert.match(normalizedSource, new RegExp(escapeRegExp(normalizeWhitespace(snippet)), "i"), `${snippet} should be documented`);
  }
}

function assertNotIncludes(source, snippets) {
  const normalizedSource = normalizeWhitespace(source);
  for (const snippet of snippets) {
    assert.doesNotMatch(normalizedSource, new RegExp(escapeRegExp(normalizeWhitespace(snippet)), "i"), `${snippet} should not be documented`);
  }
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function assertHeadingsInOrder(source, expectedHeadings) {
  let previousIndex = -1;
  for (const heading of expectedHeadings) {
    const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m");
    const match = pattern.exec(source);
    assert.notEqual(match, null, `${heading} should exist as a heading`);
    assert.ok(match.index > previousIndex, `${heading} should appear after the previous heading`);
    previousIndex = match.index;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
