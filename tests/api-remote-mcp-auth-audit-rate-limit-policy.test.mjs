import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

const policyDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md",
);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const roadmapStatusDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-roadmap-status-update.md",
);
const readinessCheckpointDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-remote-mcp-api-readiness-checkpoint.md",
);
const apiContractDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-api-contract-decision.md",
);
const docsDir = join(repoRoot, "docs");
const packageJsonPath = join(repoRoot, "package.json");
const packageLockPath = join(repoRoot, "package-lock.json");
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");

const existingMcpRemoteDocs = [
  "docs/MCP_REMOTE_THREAT_MODEL.md",
  "docs/MCP_REMOTE_APPROVAL_DECISION.md",
  "docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
];

const requiredPolicySections = [
  "# API and Remote MCP Auth Audit Rate-Limit Policy",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Official References Checked",
  "## Policy Non-Approval Boundary",
  "## Auth Policy",
  "## Authorization and Scope Policy",
  "## Audit Log Policy",
  "## Rate-Limit Policy",
  "## Body Size and Payload Policy",
  "## Timeout Policy",
  "## Structured Error Policy",
  "## Redaction Policy",
  "## Retention Policy",
  "## Write Action and Approval Policy",
  "## Future Implementation Requirements",
  "## Runtime Deployment Package Boundary",
  "## Final Decision",
];

const approvedCallableTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];

const blockedRuntimeDeploymentApiUiPaths = [
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
  "src/mcp/http-server.ts",
  "src/mcp/streamable-http.ts",
  "src/mcp/sse.ts",
  "src/mcp/websocket.ts",
  "src/mcp/auth.ts",
  "src/mcp/deployment.ts",
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
];

test("PR51 policy doc exists under docs/decisions with required headings", () => {
  assert.equal(existsSync(policyDocPath), true);
  assert.equal(
    basename(policyDocPath),
    "2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md",
  );

  const policyDoc = readDoc(policyDocPath);
  assertHeadingsInOrder(policyDoc, requiredPolicySections);
  assertDocMentions(policyDoc, [
    "PR51 is docs/contract-tests only",
    "PR51 defines policy only",
    "PR51 applies to the future minimal Norma API and to any later future remote MCP runtime",
    "PR51 does not implement auth",
    "PR51 does not implement authorization",
    "PR51 does not implement audit logs",
    "PR51 does not implement rate limits",
    "PR51 does not implement body-size limits",
    "PR51 does not implement timeouts",
    "PR51 does not implement structured-error runtime",
    "PR51 does not implement redaction",
    "PR51 does not implement retention",
    "PR51 does not implement an API server",
    "PR51 does not implement remote MCP runtime",
  ]);
});

test("PR51 references roadmap PR50 and PR39 through PR50 source documents", () => {
  assert.equal(existsSync(businessRoadmapDocPath), true);
  assert.equal(existsSync(roadmapStatusDocPath), true);
  assert.equal(existsSync(readinessCheckpointDocPath), true);
  assert.equal(existsSync(apiContractDocPath), true);

  const policyDoc = readDoc(policyDocPath);

  assertDocMentions(policyDoc, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-15-roadmap-status-update.md",
    "docs/decisions/2026-06-15-remote-mcp-api-readiness-checkpoint.md",
    "docs/decisions/2026-06-15-api-contract-decision.md",
    "PR39 through PR50 are source documents for the current remote MCP/API readiness boundary",
  ]);

  for (const prNumber of Array.from({ length: 12 }, (_, index) => `PR${39 + index}`)) {
    assert.match(policyDoc, new RegExp(`\\b${prNumber}\\b`), `${prNumber} should be documented`);
  }
});

test("PR51 records official references with access date and policy-only effects", () => {
  const policyDoc = readDoc(policyDocPath);
  const officialReferencesSection = sectionBetween(
    policyDoc,
    "## Official References Checked",
    "## Policy Non-Approval Boundary",
  );

  assertDocMentions(officialReferencesSection, [
    "Access date: 2026-06-16",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/transports",
    "https://modelcontextprotocol.io/specification/2025-11-25/server/tools",
    "https://developers.openai.com/api/docs/guides/tools-connectors-mcp",
    "https://developers.openai.com/api/docs/mcp",
    "https://code.claude.com/docs/en/mcp",
    "https://platform.claude.com/docs/en/agents-and-tools/mcp-connector",
    "PR51 changes no implementation approval decision",
    "PR51 approves no auth runtime",
    "PR51 approves no HTTP runtime",
    "PR51 approves no remote MCP runtime or deployment",
  ]);
});

test("PR51 keeps implementation runtime deployment UI package and publishing blocked", () => {
  const policyDoc = readDoc(policyDocPath);

  assertDocMentions(policyDoc, [
    "API implementation remains blocked",
    "Remote MCP runtime remains blocked",
    "API server skeleton remains blocked until PR52 explicitly approves implementation",
    "Deployment remains blocked",
    "UI implementation remains blocked",
    "Package publishing remains blocked",
    "Local STDIO remains the only approved MCP runtime",
    "PR51 does not approve auth runtime",
    "PR51 does not approve audit log runtime",
    "PR51 does not approve rate-limit runtime",
    "PR51 does not approve deployment",
    "PR51 does not approve package/dependency changes",
    "PR51 does not approve UI",
    "PR51 does not approve public npm publishing",
  ]);

  assert.doesNotMatch(policyDoc, /\bAPI implementation\s+is\s+approved\b/i);
  assert.doesNotMatch(policyDoc, /\bremote MCP runtime\s+is\s+approved\b/i);
  assert.doesNotMatch(policyDoc, /\bauth runtime\s+is\s+approved\b/i);
  assert.doesNotMatch(policyDoc, /\baudit log runtime\s+is\s+approved\b/i);
  assert.doesNotMatch(policyDoc, /\brate-limit runtime\s+is\s+approved\b/i);
  assert.doesNotMatch(policyDoc, /\bdeployment\s+is\s+approved\b/i);
  assert.doesNotMatch(policyDoc, /\bUI implementation\s+is\s+approved\b/i);
});

test("PR51 auth policy defines token audience and STDIO boundaries without secrets or env behavior", () => {
  const policyDoc = readDoc(policyDocPath);
  const authSection = sectionBetween(policyDoc, "## Auth Policy", "## Authorization and Scope Policy");

  assertDocMentions(authSection, [
    "Future HTTP/API auth must be explicit",
    "No anonymous remote API",
    "Tokens must not be accepted from query strings",
    "Tokens must not be logged",
    "Token validation must include audience/resource binding",
    "Invalid, expired, and missing tokens must return structured errors",
    "STDIO must remain separate from the HTTP auth flow",
    "Secrets must not be read or introduced in PR51",
    "PR51 must not add environment-variable behavior",
  ]);
});

test("PR51 authorization and scope policy preserves allowlists and source-truth boundaries", () => {
  const policyDoc = readDoc(policyDocPath);
  const scopeSection = sectionBetween(
    policyDoc,
    "## Authorization and Scope Policy",
    "## Audit Log Policy",
  );

  assertDocMentions(scopeSection, [
    "route/tool allowlists",
    "Least-privilege scopes",
    "Scope challenge behavior",
    "Blocked routes remain blocked",
    "`POST /replay-run` remains blocked",
    "`norma.replayRun` remains blocked as MCP exposure",
    "`replay-mvp-demo` remains fixed-demo-only",
    "No agent-created packs, rules, ratios, tolerances, or geometry are approved",
    "No prompt-as-source behavior is approved",
    "No artifact-as-source behavior is approved",
    "No hidden pack or tolerance selection is approved",
  ]);
});

test("PR51 audit policy allows only safe metadata and blocks sensitive fields", () => {
  const policyDoc = readDoc(policyDocPath);
  const auditSection = sectionBetween(policyDoc, "## Audit Log Policy", "## Rate-Limit Policy");

  assertDocMentions(auditSection, [
    "request id",
    "timestamp",
    "route/tool name",
    "decision outcome",
    "status",
    "error code",
    "auth subject id or hashed subject id",
    "scope names",
    "approval decision",
    "blocked-route attempts",
    "rate-limit decisions",
    "latency bucket",
    "payload size bucket",
    "operation version",
    "serialization version",
  ]);

  assertDocMentions(auditSection, [
    "raw tokens",
    "secrets",
    "full request bodies",
    "full response bodies",
    "source geometry payloads",
    "pack content payloads",
    "artifact content payloads",
    "prompt text",
    "stack traces",
    "arbitrary user documents",
    "PR51 adds no audit storage",
  ]);
});

test("PR51 rate-limit policy covers subject IP route invalid blocked and replay controls", () => {
  const policyDoc = readDoc(policyDocPath);
  const rateLimitSection = sectionBetween(
    policyDoc,
    "## Rate-Limit Policy",
    "## Body Size and Payload Policy",
  );

  assertDocMentions(rateLimitSection, [
    "Rate limits are required before public or remote exposure",
    "Per-subject limits are required when auth exists",
    "Per-IP fallback policy",
    "Route/tool-specific limits",
    "Blocked route attempts must count",
    "Invalid requests must count",
    "Replay endpoints must be stricter than version and canonical-json endpoints",
    "Rate-limit errors must be structured and no-stack-trace",
  ]);
});

test("PR51 body-size and payload policy blocks hidden payload file URL filesystem and shell behavior", () => {
  const policyDoc = readDoc(policyDocPath);
  const bodySizeSection = sectionBetween(
    policyDoc,
    "## Body Size and Payload Policy",
    "## Timeout Policy",
  );

  assertDocMentions(bodySizeSection, [
    "maximum request body size",
    "Malformed JSON rejection",
    "Extra hidden fields rejection",
    "Nested object depth policy",
    "Array length policy",
    "String length policy",
    "No arbitrary file upload",
    "No URL fetch by API",
    "No filesystem reads or writes",
    "No shell execution",
  ]);
});

test("PR51 timeout policy requires bounded work and structured timeout errors", () => {
  const policyDoc = readDoc(policyDocPath);
  const timeoutSection = sectionBetween(policyDoc, "## Timeout Policy", "## Structured Error Policy");

  assertDocMentions(timeoutSection, [
    "request timeout",
    "Route-specific timeout budget",
    "No unbounded work",
    "No background jobs are introduced by PR51",
    "Timeout errors must be structured and no-stack-trace",
  ]);
});

test("PR51 structured error policy includes safe fields and blocks sensitive internals", () => {
  const policyDoc = readDoc(policyDocPath);
  const errorSection = sectionBetween(policyDoc, "## Structured Error Policy", "## Redaction Policy");

  assertDocMentions(errorSection, [
    "status",
    "error code",
    "message",
    "diagnostics when safe",
    "request id when available",
    "operation version when available",
    "serialization version when available",
    "stack traces",
    "internal filesystem paths",
    "environment variables",
    "tokens/secrets",
    "raw unredacted user payloads",
  ]);
});

test("PR51 redaction policy covers tokens headers cookies bodies prompts and source payloads", () => {
  const policyDoc = readDoc(policyDocPath);
  const redactionSection = sectionBetween(policyDoc, "## Redaction Policy", "## Retention Policy");

  assertDocMentions(redactionSection, [
    "redact tokens",
    "redact secrets",
    "redact Authorization headers",
    "redact cookies",
    "redact raw request bodies from logs",
    "redact prompt text from logs",
    "redact user-provided source payloads from logs unless a later explicit data policy allows a safe subset",
  ]);
});

test("PR51 retention policy requires explicit retention before deployment and adds no storage", () => {
  const policyDoc = readDoc(policyDocPath);
  const retentionSection = sectionBetween(
    policyDoc,
    "## Retention Policy",
    "## Write Action and Approval Policy",
  );

  assertDocMentions(retentionSection, [
    "Retention period must be explicit before deployment",
    "Local development may use no persistent audit storage unless approved",
    "Remote/public deployment needs explicit retention and deletion policy",
    "PR51 itself adds no storage",
  ]);
});

test("PR51 write-action policy keeps API read-only by default and requires approval tests", () => {
  const policyDoc = readDoc(policyDocPath);
  const writeSection = sectionBetween(
    policyDoc,
    "## Write Action and Approval Policy",
    "## Future Implementation Requirements",
  );

  assertDocMentions(writeSection, [
    "Norma API V1 must be read-only / verification-only by default",
    "Write actions remain blocked",
    "Agent-created packs, rules, ratios, tolerances, and geometry remain blocked",
    "Any future write action requires explicit approval policy and tests",
    "OpenAI/Claude connector approval semantics must be rechecked before provider compatibility is claimed",
  ]);
});

test("PR51 requires future implementation tests before API or remote MCP implementation", () => {
  const policyDoc = readDoc(policyDocPath);
  const requirementsSection = sectionBetween(
    policyDoc,
    "## Future Implementation Requirements",
    "## Runtime Deployment Package Boundary",
  );

  assertDocMentions(requirementsSection, [
    "auth required or explicit exception",
    "no tokens in query strings",
    "no token logging",
    "audience/resource binding",
    "invalid, expired, and missing token structured errors",
    "route/tool allowlists",
    "least-privilege scopes",
    "scope challenge behavior",
    "blocked route attempts",
    "blocked `POST /replay-run`",
    "blocked `norma.replayRun`",
    "fixed-demo-only `replay-mvp-demo`",
    "safe audit metadata only",
    "sensitive audit field rejection",
    "per-subject and per-IP rate-limit policy",
    "route/tool-specific rate limits",
    "invalid and blocked requests counted",
    "max body size",
    "malformed JSON rejection",
    "extra hidden fields rejection",
    "nested object depth, array length, and string length limits",
    "no file upload, URL fetch, filesystem read/write, or shell execution",
    "request timeout and route-specific timeout",
    "structured errors with no stack traces",
    "redaction of tokens, secrets, Authorization headers, cookies, raw request bodies, prompt text, and source payloads",
    "explicit retention and deletion policy before deployment",
    "write actions blocked by default",
    "These tests must exist before implementation, not after it",
  ]);
});

test("PR51 adds no root-level MCP_REMOTE docs beyond the PR39 through PR44 legacy exception set", () => {
  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  const expectedRootMcpRemoteDocs = existingMcpRemoteDocs.map((path) => basename(path)).sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);

  for (const docPath of existingMcpRemoteDocs) {
    assert.equal(existsSync(join(repoRoot, docPath)), true, `${docPath} must remain at its current path`);
  }
});

test("PR51 keeps package runtime deployment API and UI surfaces absent or unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);

  assertPackageBoundary(packageJson, packageLock);
  assert.deepEqual(filesUnder("src/api"), ["src/api/minimal-api-server.ts"]);
  assert.deepEqual(filesUnder("src/mcp"), ["src/mcp/stdio-protocol.ts"]);
  assert.equal(existsSync(wrapperPath), true);
  assertPathsAbsent(blockedRuntimeDeploymentApiUiPaths);
  assertMcpBoundaryHasNoRemoteRuntimeSurface();
});

test("PR51 keeps current MCP tools exactly and replayRun blocked", async () => {
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr51-tools-list",
    method: "tools/list",
  });

  assert.deepEqual(
    [...toolsListResponse.result.tools.map((tool) => tool.name)].sort(),
    [...approvedCallableTools].sort(),
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr51-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.equal(replayRunResponse.error.code, -32602);
  assert.equal(replayRunResponse.error.message, "Unknown tool: norma.replayRun");

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr51-arbitrary-replay-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayMvpDemo",
      arguments: {
        run: {},
      },
    },
  });

  assert.equal(arbitraryReplayResponse.error.code, -32602);
  assert.equal(arbitraryReplayResponse.error.message, "Invalid params");
});

function assertPackageBoundary(packageJson, packageLock) {
  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.sideEffects, false);
  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });
  const typescriptRange = packageJson.devDependencies?.typescript;
  assert.equal(typeof typescriptRange, "string", "typescript devDependency should remain declared");
  assert.equal(
    packageLock.packages[""].devDependencies?.typescript,
    typescriptRange,
    "package-lock root should mirror package.json typescript range",
  );

  for (const fieldName of [
    "publishConfig",
    "bin",
    "files",
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    assert.equal(Object.hasOwn(packageJson, fieldName), false, `${fieldName} should stay absent`);
    assert.equal(
      Object.hasOwn(packageLock.packages[""], fieldName),
      false,
      `${fieldName} should stay absent in lock root`,
    );
  }

  assertNoMcpDependency(packageJson);
  assertNoMcpDependency(packageLock.packages[""]);
}

function assertPathsAbsent(paths) {
  for (const path of paths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }
}

function assertMcpBoundaryHasNoRemoteRuntimeSurface() {
  for (const path of [...filesUnder("src/mcp"), "bin/norma-core-mcp-stdio.mjs"]) {
    const source = readDoc(join(repoRoot, path));
    assertNoRemoteMcpRuntimeSurface(source, path);
    assertNoMcpRuntimeSideEffects(source, path);
  }
}

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function parseJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function loadHandleMcpJsonRpcMessage() {
  handleMcpJsonRpcMessagePromise ??= import("../dist/src/mcp/stdio-protocol.js")
    .then((module) => {
      assert.equal(
        typeof module.handleMcpJsonRpcMessage,
        "function",
        "dist/src/mcp/stdio-protocol.js should export handleMcpJsonRpcMessage",
      );
      return module.handleMcpJsonRpcMessage;
    })
    .catch((error) => {
      assert.fail(
        `Build output is required before PR51 MCP runtime contract validation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

  return handleMcpJsonRpcMessagePromise;
}

async function parseRequiredResponse(message) {
  const handleMcpJsonRpcMessage = await loadHandleMcpJsonRpcMessage();
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.ok(response != null, "Handler must return a non-null/undefined JSON-RPC response");
  return JSON.parse(response);
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

function assertHeadingsInOrder(doc, headings) {
  let previousIndex = -1;

  for (const heading of headings) {
    const headingPattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m");
    const match = headingPattern.exec(doc);
    assert.notEqual(match, null, `${heading} should exist as a heading`);
    assert.ok(match.index > previousIndex, `${heading} should appear after the previous heading`);
    previousIndex = match.index;
  }
}

function sectionBetween(doc, startHeading, endHeading) {
  const startMatch = new RegExp(`^${escapeRegExp(startHeading)}\\s*$`, "m").exec(doc);
  assert.notEqual(startMatch, null, `${startHeading} should exist as a heading`);
  const endPattern = new RegExp(`^${escapeRegExp(endHeading)}\\s*$`, "m");
  endPattern.lastIndex = startMatch.index + startMatch[0].length;
  const afterStart = doc.slice(startMatch.index + startMatch[0].length);
  const endMatch = endPattern.exec(afterStart);
  assert.notEqual(endMatch, null, `${endHeading} should exist as a heading`);
  return afterStart.slice(0, endMatch.index);
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet), "i"), `${snippet} should be documented`);
  }
}

function assertNoRemoteMcpRuntimeSurface(source, path) {
  assert.doesNotMatch(
    source,
    /@modelcontextprotocol|\b(?:modelcontextprotocol|FastMCP|McpServer|StdioServerTransport|createServer|server_url|MCP endpoint|Mcp-Session-Id|WWW-Authenticate|https?[A-Za-z0-9_]*(?:Server|Transport|Endpoint)|sse|streamable|websocket|networkFetch|XMLHttpRequest|WebSocket)\b/i,
    `${path} must not contain remote MCP runtime markers`,
  );
}

function assertNoMcpRuntimeSideEffects(source, path) {
  assert.doesNotMatch(
    source,
    /\b(?:readFile(?:Sync)?|writeFile(?:Sync)?|deleteFile(?:Sync)?|rm(?:Sync)?|unlink(?:Sync)?|readdir(?:Sync)?|stat(?:Sync)?|open(?:Sync)?|createReadStream|createWriteStream|shell|exec|spawn|child_process|process\.env|CLAUDE_PROJECT_DIR)\b/,
    `${path} must not contain MCP runtime filesystem, shell, or environment behavior`,
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
