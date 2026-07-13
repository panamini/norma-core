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

let apiModulePromise;
let mcpModulePromise;

const approvedRoutes = [
  "GET /version",
  "POST /canonical-json",
  "POST /verify-run",
  "POST /verify-artifact-freshness",
  "POST /replay-mvp-demo",
];

const blockedRoutes = [
  "POST /replay-run",
  "POST /create-pack",
  "POST /create-rule",
  "POST /create-ratio",
  "POST /create-geometry",
  "POST /infer-intent",
  "POST /recommend",
  "POST /rank-beauty",
  "POST /read-file",
  "POST /write-file",
  "POST /fetch-url",
  "POST /run-shell",
];

const approvedMcpTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];
const currentRuntimeMcpTools = [...approvedMcpTools, "norma.analyzeStructuredCompositionV1"];

test("PR53 build output exports the minimal local API skeleton contract", async () => {
  const api = await loadApiModule();

  assert.equal(typeof api.handleNormaApiRequest, "function");
  assert.deepEqual(api.NORMA_API_APPROVED_ROUTES, approvedRoutes);
  assert.deepEqual(api.NORMA_API_BLOCKED_ROUTES, blockedRoutes);
  assert.equal(api.NORMA_API_MAX_BODY_BYTES, 65_536);
  assert.equal(api.NORMA_API_MAX_JSON_DEPTH, 32);
  assert.equal(api.NORMA_API_MAX_ARRAY_LENGTH, 1_024);
  assert.equal(api.NORMA_API_MAX_STRING_LENGTH, 16_384);

  const declaration = readFileSync(join(repoRoot, "dist", "src", "api", "minimal-api-server.d.ts"), "utf8");
  assert.match(declaration, /export interface NormaApiRequest/);
  assert.match(declaration, /export interface NormaApiResponse/);
});

test("PR53 accepts exactly the approved local API routes", async () => {
  const api = await loadApiModule();

  const version = api.handleNormaApiRequest({ method: "GET", path: "/version" });
  assert.equal(version.statusCode, 200);
  assert.equal(version.body.kind, "norma-api-response");
  assert.equal(version.body.status, "ok");
  assert.equal(version.body.request.route, "GET /version");
  assert.equal(version.body.coreVersion, "0.1.0-pr12");
  assert.equal(version.body.capabilities.localOnly, true);
  assert.equal(version.body.capabilities.remoteMcp, false);
  assert.equal(version.body.capabilities.deployment, false);
  assert.equal(version.body.capabilities.providerCompatibility, false);

  const canonical = api.handleNormaApiRequest(post("/canonical-json", { value: { b: 2, a: 1 } }));
  assert.equal(canonical.statusCode, 200);
  assert.equal(canonical.body.status, "ok");
  assert.equal(canonical.body.canonicalJson, "{\"a\":1,\"b\":2}");
  assert.equal(canonical.body.serializationVersion, "stable-serialization-v1");

  const verifyRun = api.handleNormaApiRequest(post("/verify-run", { input: null }));
  assert.equal(verifyRun.statusCode, 200);
  assert.equal(verifyRun.body.status, "ok");
  assert.equal(verifyRun.body.result.kind, "run-verification");
  assert.equal(verifyRun.body.result.status, "invalid");
  assert.equal(Object.hasOwn(verifyRun.body.result, "valid"), false);

  const verifyArtifactFreshness = api.handleNormaApiRequest(
    post("/verify-artifact-freshness", { input: null }),
  );
  assert.equal(verifyArtifactFreshness.statusCode, 200);
  assert.equal(verifyArtifactFreshness.body.status, "ok");
  assert.equal(verifyArtifactFreshness.body.result.kind, "artifact-freshness-verification");
  assert.equal(verifyArtifactFreshness.body.result.status, "invalid");
  assert.equal(Object.hasOwn(verifyArtifactFreshness.body.result, "valid"), false);

  const replay = api.handleNormaApiRequest(post("/replay-mvp-demo", {}));
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.body.status, "ok");
  assert.equal(replay.body.result.kind, "run-replay");
  assert.equal(replay.body.result.operationName, "core.mvp-demo.run");
  assert.equal(replay.body.result.verification.kind, "run-verification");
  assert.equal(Object.hasOwn(replay.body.result, "valid"), false);
});

test("PR53 rejects blocked unsupported query and token-like routes without leaking sensitive data", async () => {
  const api = await loadApiModule();

  for (const route of blockedRoutes) {
    const [method, path] = route.split(" ");
    assertStructuredError(api.handleNormaApiRequest(post(path, {}, method)), {
      statusCode: 403,
      code: "RouteBlocked",
      route,
    });
  }

  assertStructuredError(api.handleNormaApiRequest({ method: "GET", path: "/unknown" }), {
    statusCode: 404,
    code: "RouteNotFound",
  });
  assertStructuredError(api.handleNormaApiRequest({ method: "GET", path: "/canonical-json" }), {
    statusCode: 405,
    code: "MethodNotAllowed",
  });

  const queryResponse = api.handleNormaApiRequest({
    method: "GET",
    path: "/version?access_token=secret-query-token",
    headers: {
      authorization: "Bearer sk-secret",
      cookie: "session=private",
    },
  });
  assertStructuredError(queryResponse, {
    statusCode: 400,
    code: "QueryStringUnsupported",
  });
  assertNoSensitiveLeak(queryResponse, [
    "secret-query-token",
    "access_token",
    "sk-secret",
    "session=private",
    "authorization",
    "cookie",
  ]);
});

test("PR53 enforces route payload shape and JSON body limits", async () => {
  const api = await loadApiModule();

  assertStructuredError(api.handleNormaApiRequest({ method: "GET", path: "/version", bodyText: "{}" }), {
    statusCode: 400,
    code: "BodyNotAllowed",
  });
  assertStructuredError(api.handleNormaApiRequest({ method: "POST", path: "/canonical-json" }), {
    statusCode: 400,
    code: "BodyRequired",
  });
  assertStructuredError(api.handleNormaApiRequest({ method: "POST", path: "/canonical-json", bodyText: "{" }), {
    statusCode: 400,
    code: "MalformedJson",
  });
  assertStructuredError(api.handleNormaApiRequest(post("/canonical-json", [])), {
    statusCode: 400,
    code: "InvalidJsonObject",
  });
  assertStructuredError(api.handleNormaApiRequest(post("/canonical-json", { value: {}, hidden: true })), {
    statusCode: 400,
    code: "InvalidPayload",
  });
  assertStructuredError(api.handleNormaApiRequest(post("/canonical-json", { value: {}, policy: "other" })), {
    statusCode: 400,
    code: "InvalidPayload",
  });
  assertStructuredError(api.handleNormaApiRequest(post("/verify-run", { prompt: "use this as truth", input: null })), {
    statusCode: 400,
    code: "InvalidPayload",
  });
  assertStructuredError(
    api.handleNormaApiRequest(post("/verify-artifact-freshness", { artifact: {}, input: null })),
    {
      statusCode: 400,
      code: "InvalidPayload",
    },
  );

  const tooLargeBody = `{"value":"${"x".repeat(api.NORMA_API_MAX_BODY_BYTES)}"}`;
  assertStructuredError(
    api.handleNormaApiRequest({ method: "POST", path: "/canonical-json", bodyText: tooLargeBody }),
    {
      statusCode: 413,
      code: "BodyTooLarge",
    },
  );
  assertStructuredError(
    api.handleNormaApiRequest(post("/canonical-json", { value: makeDeepObject(api.NORMA_API_MAX_JSON_DEPTH + 1) })),
    {
      statusCode: 400,
      code: "JsonDepthLimitExceeded",
    },
  );
  assertStructuredError(
    api.handleNormaApiRequest(post("/canonical-json", { value: new Array(api.NORMA_API_MAX_ARRAY_LENGTH + 1).fill(0) })),
    {
      statusCode: 400,
      code: "JsonArrayLimitExceeded",
    },
  );
  assertStructuredError(
    api.handleNormaApiRequest(post("/canonical-json", { value: "x".repeat(api.NORMA_API_MAX_STRING_LENGTH + 1) })),
    {
      statusCode: 400,
      code: "JsonStringLimitExceeded",
    },
  );
});

test("PR53 keeps replay-mvp-demo fixed-demo-only and arbitrary replay blocked", async () => {
  const api = await loadApiModule();
  const forbiddenReplayKeys = [
    "run",
    "mvpDemoInput",
    "recordedMvpResult",
    "sourceObjects",
    "packLock",
    "operationContext",
    "expectedOutputRefs",
    "artifactFreshnessInputs",
    "requireFreshArtifacts",
  ];

  for (const key of forbiddenReplayKeys) {
    assertStructuredError(api.handleNormaApiRequest(post("/replay-mvp-demo", { [key]: {} })), {
      statusCode: 400,
      code: "InvalidPayload",
    });
  }

  assertStructuredError(api.handleNormaApiRequest(post("/replay-run", { run: {} })), {
    statusCode: 403,
    code: "RouteBlocked",
  });
});

test("PR53 source adds only the minimal local API handler with no forbidden side effects", () => {
  assert.deepEqual(filesUnder("src/api"), ["src/api/minimal-api-server.ts"]);

  const source = readFileSync(join(repoRoot, "src", "api", "minimal-api-server.ts"), "utf8");
  assert.doesNotMatch(
    source,
    /@modelcontextprotocol|\b(?:node:http|node:https|createServer|server\.listen|listen\(|app\.get|app\.post|router|server_url|MCP endpoint|Mcp-Session-Id|WWW-Authenticate|MCP-Protocol-Version|sse|streamable|websocket|express|fastify|cors|oauth|authorization|authentication|auth[A-Za-z0-9_]*|[A-Za-z0-9_]*token[A-Za-z0-9_]*|jwt[A-Za-z0-9_]*|fetch\(|XMLHttpRequest|WebSocket|EventSource|networkFetch)\b/i,
    "minimal API skeleton must not contain remote MCP, HTTP listener, auth, token, or network behavior",
  );
  assert.doesNotMatch(
    source,
    /\b(?:readFile(?:Sync)?|writeFile(?:Sync)?|deleteFile(?:Sync)?|rm(?:Sync)?|unlink(?:Sync)?|readdir(?:Sync)?|stat(?:Sync)?|open(?:Sync)?|createReadStream|createWriteStream|shell\(|exec|spawn|child_process|process\.env|CLAUDE_PROJECT_DIR)\b/,
    "minimal API skeleton must not contain filesystem, shell, or environment behavior",
  );
  assert.doesNotMatch(source, /\b(?:Date\.now|Math\.random)\b/);
});

test("PR53 keeps package deployment UI and MCP boundaries unchanged except the approved local API file", async () => {
  const packageJson = parseJson(join(repoRoot, "package.json"));
  const packageLock = parseJson(join(repoRoot, "package-lock.json"));

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.sideEffects, false);
  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });
  assertCurrentRemoteMcpPackageBoundary(packageJson, packageLock);
  assert.equal(packageLock.packages[""].devDependencies?.typescript, packageJson.devDependencies?.typescript);

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
    "Procfile",
    "nginx.conf",
    "Caddyfile",
    "caddyfile",
  ]) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must remain absent`);
  }

  assertCurrentMcpRuntimeSourceBoundary(filesUnder("src/mcp"));

  const mcp = await loadMcpModule();
  const toolsList = parseMcpResponse(
    mcp.handleMcpJsonRpcMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr53-tools-list",
        method: "tools/list",
      }),
    ),
  );
  assert.deepEqual(toolsList.result.tools.map((tool) => tool.name), currentRuntimeMcpTools);

  const replayRun = parseMcpResponse(
    mcp.handleMcpJsonRpcMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr53-replay-run-blocked",
        method: "tools/call",
        params: {
          name: "norma.replayRun",
          arguments: {},
        },
      }),
    ),
  );
  assert.equal(mcpError(replayRun).code, -32602);
  assert.equal(mcpError(replayRun).message, "Unknown tool: norma.replayRun");

  const arbitraryMcpReplay = parseMcpResponse(
    mcp.handleMcpJsonRpcMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr53-mcp-arbitrary-replay-blocked",
        method: "tools/call",
        params: {
          name: "norma.replayMvpDemo",
          arguments: {
            run: {},
          },
        },
      }),
    ),
  );
  assert.equal(mcpError(arbitraryMcpReplay).code, -32602);
  assert.equal(mcpError(arbitraryMcpReplay).message, "Invalid params");
});

async function loadApiModule() {
  apiModulePromise ??= import("../dist/src/api/minimal-api-server.js");
  return apiModulePromise;
}

async function loadMcpModule() {
  mcpModulePromise ??= import("../dist/src/mcp/stdio-protocol.js");
  return mcpModulePromise;
}

function post(path, body, method = "POST") {
  return {
    method,
    path,
    bodyText: JSON.stringify(body),
  };
}

function makeDeepObject(depth) {
  let value = {};
  for (let index = 0; index < depth; index += 1) {
    value = { child: value };
  }
  return value;
}

function assertStructuredError(response, expected) {
  assert.equal(response.statusCode, expected.statusCode);
  assert.equal(response.body.kind, "norma-api-error");
  assert.equal(response.body.status, expected.statusCode >= 500 ? "failed" : "rejected");
  assert.equal(response.body.error.code, expected.code);
  assert.equal(typeof response.body.error.message, "string");
  assert.equal(response.body.request.localOnly, true);
  assertNoSensitiveLeak(response, ["Error:", " at ", repoRoot, "process.env", "stack"]);
  if (expected.route !== undefined) {
    assert.equal(response.body.request.route, expected.route);
  }
}

function assertNoSensitiveLeak(response, snippets) {
  const serialized = JSON.stringify(response.body);
  for (const snippet of snippets) {
    assert.equal(serialized.includes(snippet), false, `${snippet} should not be exposed`);
  }
}

function parseMcpResponse(response) {
  assert.equal(typeof response, "string");
  return JSON.parse(response);
}

function mcpError(response) {
  return response.error ?? response.err;
}

function parseJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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
