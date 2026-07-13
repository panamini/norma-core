import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertCurrentMcpRuntimeSourceBoundary,
  assertCurrentRemoteMcpPackageBoundary,
} from "./current-remote-mcp-boundary.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const goldenDir = join(repoRoot, "tests", "goldens", "api");

let apiModulePromise;
let mcpModulePromise;

const approvedMcpTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];
const currentRuntimeMcpTools = [...approvedMcpTools, "norma.analyzeStructuredCompositionV1"];

const expectedRootMcpRemoteDocs = [
  "MCP_REMOTE_THREAT_MODEL.md",
  "MCP_REMOTE_APPROVAL_DECISION.md",
  "MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
].sort();

const forbiddenWorkflowPattern = /(?:deploy|deployment|remote-mcp|server|publish)/i;

const standaloneGoldenCases = [
  ["version.success.json", () => request("GET", "/version")],
  ["canonical-json.success.json", () => request("POST", "/canonical-json", { value: { b: 2, a: 1 } })],
  ["canonical-json.invalid-payload.json", () => request("POST", "/canonical-json", {})],
  ["verify-run.invalid-input.json", () => request("POST", "/verify-run", { input: null })],
  [
    "verify-artifact-freshness.invalid-input.json",
    () => request("POST", "/verify-artifact-freshness", { input: null }),
  ],
  ["replay-mvp-demo.success.json", () => request("POST", "/replay-mvp-demo", {})],
  ["replay-mvp-demo.reject-caller-run.json", () => request("POST", "/replay-mvp-demo", { run: {} })],
  ["blocked-replay-run.json", () => request("POST", "/replay-run", { run: {} })],
  ["query-string-rejected.json", () => ({ method: "GET", path: "/version?access_token=[REDACTED:API key param]" })],
  ["malformed-json.json", () => ({ method: "POST", path: "/canonical-json", bodyText: "{" })],
];

const rejectionCases = [
  ["canonical-json.extra-hidden-field", request("POST", "/canonical-json", { value: {}, hidden: true })],
  ["canonical-json.unsupported-policy", request("POST", "/canonical-json", { value: {}, policy: "other" })],
  ["verify-run.extra-hidden-field", request("POST", "/verify-run", { input: null, hidden: true })],
  [
    "verify-artifact-freshness.extra-hidden-field",
    request("POST", "/verify-artifact-freshness", { input: null, hidden: true }),
  ],
  ["unsupported-route", { method: "GET", path: "/unknown" }],
  ["unsupported-method", { method: "GET", path: "/canonical-json" }],
  ["body-too-large", () => bodyTextRequest("POST", "/canonical-json", `{"value":"${"x".repeat(65_536)}"}`)],
  ["json-depth-limit", request("POST", "/canonical-json", { value: makeDeepObject(33) })],
  ["array-length-limit", request("POST", "/canonical-json", { value: new Array(1_025).fill(0) })],
  ["string-length-limit", request("POST", "/canonical-json", { value: "x".repeat(16_385) })],
];

test("PR54 golden envelopes match the PR53 local in-process API handler", async () => {
  const api = await loadApiModule();

  for (const [goldenName, requestFactory] of standaloneGoldenCases) {
    const actual = api.handleNormaApiRequest(requestFactory());
    const expected = readGolden(goldenName);
    assert.deepEqual(actual, expected, `${goldenName} must match the checked-in golden envelope`);
    assertEnvelope(actual);
  }

  const expectedRejections = readGolden("rejections.json");
  const actualRejections = rejectionCases.map(([name, requestValue]) => {
    const actualRequest = typeof requestValue === "function" ? requestValue() : requestValue;
    const response = api.handleNormaApiRequest(actualRequest);
    assertEnvelope(response);
    return { name, response };
  });

  assert.deepEqual(actualRejections, expectedRejections);
});

test("PR54 golden envelopes preserve version capabilities and replay structure", async () => {
  const api = await loadApiModule();

  const version = api.handleNormaApiRequest(request("GET", "/version"));
  assert.equal(version.body.capabilities.localOnly, true);
  assert.equal(version.body.capabilities.remoteMcp, false);
  assert.equal(version.body.capabilities.deployment, false);
  assert.equal(version.body.capabilities.providerCompatibility, false);

  const replay = api.handleNormaApiRequest(request("POST", "/replay-mvp-demo", {}));
  assert.equal(replay.body.result.kind, "run-replay");
  assert.equal(replay.body.result.operationName, "core.mvp-demo.run");
});

test("PR54 keeps runtime package deployment UI and MCP boundaries unchanged", async () => {
  assert.deepEqual(filesUnder("src/api"), ["src/api/minimal-api-server.ts"]);
  assertCurrentMcpRuntimeSourceBoundary(filesUnder("src/mcp"));
  assert.equal(existsSync(join(repoRoot, "bin", "norma-core-mcp-stdio.mjs")), true);

  const packageJson = parseJson(join(repoRoot, "package.json"));
  const packageLock = parseJson(join(repoRoot, "package-lock.json"));
  assertCurrentRemoteMcpPackageBoundary(packageJson, packageLock);

  for (const path of [
    "src/server",
    "src/routes",
    "src/http",
    "src/auth",
    "src/audit",
    "src/rate-limit",
    "src/rateLimit",
    "src/ui",
    "src/viewer",
    "src/app",
    "bin/norma-core-api.mjs",
    "bin/norma-core-server.mjs",
    "bin/norma-core-mcp-http.mjs",
    "bin/norma-core-mcp-server.mjs",
    "Dockerfile",
    "docker-compose.yml",
    "compose.yml",
    ".env",
    ".env.example",
    "serverless.yml",
    "vercel.json",
    "netlify.toml",
    "wrangler.toml",
    "fly.toml",
    "render.yaml",
    "Procfile",
    "nginx.conf",
    "Caddyfile",
    "caddyfile",
  ]) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must remain absent`);
  }

  for (const path of filesUnder(".github/workflows")) {
    assert.doesNotMatch(path, forbiddenWorkflowPattern);
    assert.doesNotMatch(readFileSync(join(repoRoot, path), "utf8"), forbiddenWorkflowPattern);
  }

  const actualRootMcpRemoteDocs = readdirSync(join(repoRoot, "docs"))
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);
  assertRoadmapBoundary();

  const mcp = await loadMcpModule();
  const toolsList = parseMcpResponse(
    mcp.handleMcpJsonRpcMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr54-tools-list",
        method: "tools/list",
      }),
    ),
  );
  assert.deepEqual(
    [...toolsList.result.tools.map((tool) => tool.name)].sort(),
    [...currentRuntimeMcpTools].sort(),
  );

  const replayRun = parseMcpResponse(
    mcp.handleMcpJsonRpcMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr54-replay-run-blocked",
        method: "tools/call",
        params: { name: "norma.replayRun", arguments: {} },
      }),
    ),
  );
  assert.equal(mcpError(replayRun).code, -32602);
  assert.equal(mcpError(replayRun).message, "Unknown tool: norma.replayRun");

  const arbitraryReplay = parseMcpResponse(
    mcp.handleMcpJsonRpcMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr54-arbitrary-replay-blocked",
        method: "tools/call",
        params: { name: "norma.replayMvpDemo", arguments: { run: {} } },
      }),
    ),
  );
  assert.equal(mcpError(arbitraryReplay).code, -32602);
  assert.equal(mcpError(arbitraryReplay).message, "Invalid params");
});

test("PR54 scans only relevant runtime paths for forbidden API runtime drift", () => {
  for (const path of filesUnder("src/api")) {
    assertNoApiRuntimeDrift(readFileSync(join(repoRoot, path), "utf8"), path);
  }

  for (const path of [...filesUnder("src/mcp"), "bin/norma-core-mcp-stdio.mjs", "package.json", "package-lock.json"]) {
    assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
  }
});

async function loadApiModule() {
  apiModulePromise ??= import("../dist/src/api/minimal-api-server.js");
  return apiModulePromise;
}

async function loadMcpModule() {
  mcpModulePromise ??= import("../dist/src/mcp/stdio-protocol.js");
  return mcpModulePromise;
}

function request(method, path, body) {
  if (body === undefined) {
    return { method, path };
  }

  return bodyTextRequest(method, path, JSON.stringify(body));
}

function bodyTextRequest(method, path, bodyText) {
  return { method, path, bodyText };
}

function readGolden(name) {
  return parseJson(join(goldenDir, name));
}

function parseJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function makeDeepObject(depth) {
  let value = {};
  for (let index = 0; index < depth; index += 1) {
    value = { child: value };
  }
  return value;
}

function assertEnvelope(response) {
  assertNoSensitiveLeak(response);
  assert.equal(response.body.request.localOnly, true);

  if (response.body.kind === "norma-api-response") {
    assert.equal(response.body.status, "ok");
    return;
  }

  assert.equal(response.body.kind, "norma-api-error");
  assert.match(response.body.status, /^(?:rejected|failed)$/);
  assert.equal(typeof response.body.error.code, "string");
  assert.equal(typeof response.body.error.message, "string");
}

function assertNoSensitiveLeak(response) {
  const serialized = JSON.stringify(response.body);
  for (const snippet of [
    "stack",
    "Error:",
    "process.env",
    "CLAUDE_PROJECT_DIR",
    "/Volumes/",
    "secret",
    "token",
    "authorization",
    "cookie",
  ]) {
    assert.equal(serialized.includes(snippet), false, `${snippet} should not appear in an API envelope`);
  }
}

function filesUnder(path) {
  const absolutePath = join(repoRoot, path);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return relativeFiles(absolutePath, path).sort();
}

function relativeFiles(absolutePath, relativePath) {
  const stat = statSync(absolutePath);
  if (stat.isFile()) {
    return [relativePath];
  }

  assert.equal(stat.isDirectory(), true, `${relativePath} should be a file or directory`);
  return readdirSync(absolutePath).flatMap((entry) =>
    relativeFiles(join(absolutePath, entry), `${relativePath}/${entry}`),
  );
}

function assertRoadmapBoundary() {
  const roadmap = readFileSync(join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md"), "utf8");
  assert.match(roadmap, /# Norma Core Business Readiness Roadmap/);
}

function parseMcpResponse(response) {
  assert.equal(typeof response, "string");
  return JSON.parse(response);
}

function mcpError(response) {
  assert.equal(typeof response.error, "object");
  return response.error;
}

function assertNoMcpDependency(packageJson) {
  for (const dependencyGroup of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
  ]) {
    for (const dependencyName of Object.keys(dependencyGroup ?? {})) {
      assert.doesNotMatch(dependencyName, /modelcontextprotocol|@modelcontextprotocol|mcp/i);
    }
  }
}

function assertNoApiRuntimeDrift(source, path) {
  assert.doesNotMatch(
    source,
    /@modelcontextprotocol|\b(?:node:http|node:https|createServer|server\.listen|express|fastify|cors|StdioServerTransport|McpServer|WWW-Authenticate|MCP-Protocol-Version|EventSource|WebSocket|XMLHttpRequest|networkFetch|child_process|process\.env|readFile|writeFile|createReadStream|createWriteStream|exec|spawn)\b|\.listen\(|fetch\(|shell\(/i,
    `${path} must not contain forbidden API runtime drift`,
  );
}
