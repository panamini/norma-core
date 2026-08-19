import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { handleMcpJsonRpcRequest } from "../dist/src/mcp/stdio-protocol.js";
import {
  createRemoteMcpHttpServer,
  validateRemoteMcpJsonLimits,
  withRemoteMcpAdmissionDeadline,
  withRemoteMcpDeadline,
  RemoteMcpRequestTimeoutError,
} from "../dist/src/mcp/remote-http-server.js";
import { RemoteMcpAdmissionController } from "../dist/src/mcp/remote-http-limits.js";
import {
  PERSONAL_VISUAL_HARMONY_CONFIRM_MEASUREMENT_PAIR_TOOL,
  PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
  PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
  PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
  PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
  PERSONAL_VISUAL_HARMONY_WIDGET_MIME_TYPE,
  PERSONAL_VISUAL_HARMONY_WIDGET_URI,
} from "../dist/src/mcp/personal-visual-harmony-app.js";
import { createInMemoryRlsDataAdapter } from "../dist/src/mcp/remote-http-authorization-data.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const analyzeToolName = "norma.analyzeStructuredCompositionV1";
const protocol = "2025-11-25";
const PERSONAL_VISUAL_HARMONY_WIDGET_DOMAIN =
  "https://norma-core-remote-mcp-beta-production.up.railway.app";
const PERSONAL_VISUAL_HARMONY_WIDGET_UI_META = {
  prefersBorder: true,
  domain: PERSONAL_VISUAL_HARMONY_WIDGET_DOMAIN,
  csp: {
    connectDomains: [],
    resourceDomains: ["https://*.oaiusercontent.com"],
  },
};

test("PR137 runs one authenticated stateless Streamable HTTP tool with local parity", async (t) => {
  const logs = [];
  const config = runtimeConfig();
  const server = createRemoteMcpHttpServer(config, {
    verifyAccessToken: deterministicVerifier,
    log: (event) => logs.push(event),
  });
  await listen(server);
  t.after(() => close(server));
  const port = server.address().port;

  const health = await request(port, { method: "GET", path: "/healthz" });
  assert.equal(health.status, 200);
  assert.deepEqual(health.json, {
    status: "ok",
    service: "norma-core-remote-mcp",
    version: "0.1.0-pr137",
  });
  assert.deepEqual((await request(port, { method: "GET", path: "/readyz" })).json, health.json);

  const metadata = await request(port, {
    method: "GET",
    path: "/.well-known/oauth-protected-resource/mcp",
  });
  assert.equal(metadata.status, 200);
  assert.deepEqual(metadata.json, {
    resource: "http://127.0.0.1/mcp",
    authorization_servers: ["https://tenant.example/resources/norma"],
    scopes_supported: ["norma:structured-analyze"],
    bearer_methods_supported: ["header"],
  });
  assert.deepEqual(
    (await request(port, {
      method: "GET",
      path: "/.well-known/oauth-protected-resource",
    })).json,
    metadata.json,
  );

  const missingAuth = await mcpRequest(port, initializeRequest(protocol), { authorization: undefined });
  assert.equal(missingAuth.status, 401);
  assert.match(missingAuth.headers["www-authenticate"], /^Bearer resource_metadata=/u);

  const initialized = await mcpRequest(port, initializeRequest(protocol));
  assert.equal(initialized.status, 200);
  assert.equal(initialized.json.result.protocolVersion, protocol);
  assert.deepEqual(initialized.json.result.serverInfo, {
    name: "norma-core-remote-mcp",
    version: "0.1.0-pr137",
  });
  assert.equal(initialized.headers["mcp-session-id"], undefined);

  const list = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "list",
    method: "tools/list",
    params: {},
  });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.result.tools.map((tool) => tool.name), [
    PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
    PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
    PERSONAL_VISUAL_HARMONY_CONFIRM_MEASUREMENT_PAIR_TOOL,
    PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
    analyzeToolName,
  ]);
  const prepareTool = list.json.result.tools[0];
  const refinePixelsTool = list.json.result.tools[1];
  const measurementPairTool = list.json.result.tools[2];
  const confirmTool = list.json.result.tools[3];
  assert.equal(prepareTool._meta["openai/outputTemplate"], PERSONAL_VISUAL_HARMONY_WIDGET_URI);
  assert.equal(prepareTool._meta.ui.resourceUri, PERSONAL_VISUAL_HARMONY_WIDGET_URI);
  assert.equal(Object.hasOwn(refinePixelsTool._meta.ui, "resourceUri"), false);
  assert.equal(Object.hasOwn(measurementPairTool._meta.ui, "resourceUri"), false);
  assert.equal(Object.hasOwn(confirmTool._meta.ui, "resourceUri"), false);
  assert.deepEqual(prepareTool._meta.securitySchemes, [{
    type: "oauth2",
    scopes: ["norma:structured_analyze"],
  }]);
  assert.deepEqual(list.json.result.tools[4].annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    idempotentHint: true,
  });
  assert.deepEqual(list.json.result.tools[4].securitySchemes, [{
    type: "oauth2",
    scopes: ["norma:structured_analyze"],
  }]);

  const resources = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "resources",
    method: "resources/list",
    params: {},
  });
  assert.equal(resources.status, 200);
  assert.deepEqual(resources.json.result.resources.map((resource) => resource.uri), [PERSONAL_VISUAL_HARMONY_WIDGET_URI]);
  assert.deepEqual(resources.json.result.resources[0]._meta.ui, PERSONAL_VISUAL_HARMONY_WIDGET_UI_META);
  assert.equal(PERSONAL_VISUAL_HARMONY_WIDGET_URI, "ui://widget/norma-personal-visual-harmony-v24.html");
  const widget = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "widget",
    method: "resources/read",
    params: { uri: PERSONAL_VISUAL_HARMONY_WIDGET_URI },
  });
  assert.equal(widget.status, 200);
  assert.equal(widget.json.result.contents[0].uri, PERSONAL_VISUAL_HARMONY_WIDGET_URI);
  assert.equal(widget.json.result.contents[0].mimeType, PERSONAL_VISUAL_HARMONY_WIDGET_MIME_TYPE);
  assert.deepEqual(widget.json.result.contents[0]._meta.ui, PERSONAL_VISUAL_HARMONY_WIDGET_UI_META);
  assert.deepEqual(widget.json.result.contents[0]._meta["openai/widgetCSP"], {
    connect_domains: [],
    resource_domains: ["https://*.oaiusercontent.com"],
  });
  assert.equal(
    widget.json.result.contents[0]._meta["openai/widgetDomain"],
    PERSONAL_VISUAL_HARMONY_WIDGET_DOMAIN,
  );
  assert.match(widget.json.result.contents[0].text, /window[.]openai/u);
  const cachedWidget = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "cached-widget",
    method: "resources/read",
    params: { uri: "ui://widget/norma-personal-visual-harmony-v8.html" },
  });
  assert.equal(cachedWidget.status, 200);
  assert.equal(cachedWidget.json.result.contents[0].uri, "ui://widget/norma-personal-visual-harmony-v8.html");
  assert.equal(cachedWidget.json.result.contents[0].mimeType, "text/html+skybridge");
  for (const legacyUri of [
    "ui://widget/norma-personal-visual-harmony-v20.html",
    "ui://widget/norma-personal-visual-harmony-v23.html",
  ]) {
    const legacyWidget = await mcpRequest(port, {
      jsonrpc: "2.0",
      id: `legacy-widget-${legacyUri}`,
      method: "resources/read",
      params: { uri: legacyUri },
    });
    assert.equal(legacyWidget.status, 200);
    assert.equal(legacyWidget.json.result.contents[0].uri, legacyUri);
    assert.equal(legacyWidget.json.result.contents[0].mimeType, PERSONAL_VISUAL_HARMONY_WIDGET_MIME_TYPE);
  }

  const prepared = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "prepare",
    method: "tools/call",
    params: {
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/remote-visual-image",
          file_id: "remote-visual-image",
          mime_type: "image/png",
        },
        candidates: [{
          id: "frame",
          label: "Cadre visible",
          role: "frame",
          reason: "Bords visibles du cadre de l’image.",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        }],
      },
    },
  });
  assert.equal(prepared.status, 200);
  assert.equal(prepared.json.result.structuredContent.status, "confirmation_required");
  assert.equal(prepared.json.result.structuredContent.coreRun, false);

  const invalidMeasurementPair = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "invalid-measurement-pair",
    method: "tools/call",
    params: {
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_MEASUREMENT_PAIR_TOOL,
      arguments: {},
    },
  });
  assert.equal(invalidMeasurementPair.status, 200);
  assert.equal(invalidMeasurementPair.json.result.isError, true);

  const input = JSON.parse(await readFile(
    join(repoRoot, "examples", "structured-analyze", "scenarios", "alignment-basic.json"),
    "utf8",
  ));
  const callBody = {
    jsonrpc: "2.0",
    id: "analyze",
    method: "tools/call",
    params: { name: analyzeToolName, arguments: { input } },
  };
  const remote = await mcpRequest(port, callBody);
  const local = handleMcpJsonRpcRequest(callBody);
  assert.equal(remote.status, 200);
  assert.deepEqual(remote.json.result.structuredContent, local.result.structuredContent);
  assert.equal(remote.json.result.content[0].text, local.result.content[0].text);
  assert.equal(JSON.stringify(remote.json.result.structuredContent), JSON.stringify(local.result.structuredContent));
  assert.deepEqual(JSON.parse(remote.json.result.content[0].text), remote.json.result.structuredContent);
  assert.equal(remote.headers["mcp-session-id"], undefined);

  assert.ok(logs.some((event) => event.outcome === "allow" && event.protocolVersion === protocol));
  assert.ok(logs.some((event) => event.tool === PERSONAL_VISUAL_HARMONY_PREPARE_TOOL && event.outcome === "allow"));
  assert.ok(logs.some((event) => (
    event.tool === PERSONAL_VISUAL_HARMONY_CONFIRM_MEASUREMENT_PAIR_TOOL
    && event.outcome === "allow"
  )));
  assert.ok(logs.some((event) => event.tool === analyzeToolName && event.outcome === "allow"));
  assert.ok(logs.some((event) => event.tool === "mcp" && event.outcome === "allow"));
  const serializedLogs = JSON.stringify(logs);
  assert.equal(serializedLogs.includes("valid-subject-a"), false);
  assert.equal(serializedLogs.includes(input.analysisId), false);
  assert.equal(serializedLogs.includes("auth0|subject-a"), false);
});

test("PR266 passes provider-neutral auth context to the injected data boundary and denies missing context", async (t) => {
  const logs = [];
  const observedContexts = [];
  const innerAdapter = createInMemoryRlsDataAdapter([
    { id: "record-a", tenant: "tenant-subject-a", payload: { value: "A" } },
  ], "norma:structured-analyze");
  const authorizationDataAdapter = {
    async withTransaction(context, operation) {
      observedContexts.push(context);
      return innerAdapter.withTransaction(context, operation);
    },
  };
  const server = createRemoteMcpHttpServer(runtimeConfig(), {
    verifyAccessToken: deterministicVerifier,
    authorizationDataAdapter,
    log: (event) => logs.push(event),
  });
  await listen(server);
  t.after(() => close(server));
  const port = server.address().port;

  const allowed = await mcpRequest(port, initializeRequest(protocol));
  assert.equal(allowed.status, 200);
  assert.equal(observedContexts.length, 1);
  assert.equal(observedContexts[0].subject, "provider-subject-a");
  assert.equal(observedContexts[0].tenant, "tenant-subject-a");
  assert.equal(JSON.stringify(observedContexts[0]).includes("valid-subject-a"), false);
  assert.equal(JSON.stringify(logs).includes("valid-subject-a"), false);

  const deniedServer = createRemoteMcpHttpServer(runtimeConfig(), {
    verifyAccessToken: async () => ({
      rawToken: "valid-without-context",
      subjectId: "pseudonymous-without-context",
      scopes: ["norma:structured-analyze"],
      clientId: "test-client",
      expiresAt: Math.floor(Date.now() / 1_000) + 300,
    }),
    authorizationDataAdapter: innerAdapter,
    log: () => {},
  });
  await listen(deniedServer);
  t.after(() => close(deniedServer));
  const denied = await mcpRequest(deniedServer.address().port, initializeRequest(protocol));
  assert.equal(denied.status, 403);
  assert.equal(denied.json.error.code, "authorization_context_required");
});

test("PR265 keeps visual sessions isolated by authenticated subject", async (t) => {
  const server = createRemoteMcpHttpServer(runtimeConfig(), {
    verifyAccessToken: deterministicVerifier,
    log: () => {},
  });
  await listen(server);
  t.after(() => close(server));
  const port = server.address().port;

  const prepared = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "prepare-subject-a",
    method: "tools/call",
    params: {
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/remote-visual-image",
          file_id: "remote-visual-image",
          mime_type: "image/png",
        },
        candidates: [{
          id: "frame",
          label: "Cadre visible",
          role: "frame",
          reason: "Bords visibles du cadre de l’image.",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        }],
      },
    },
  });
  const visual = prepared.json.result._meta.normaPersonalVisualHarmony;
  const crossSubject = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "confirm-subject-b",
    method: "tools/call",
    params: {
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: visual.sessionId,
        candidateSetIdentity: visual.prepared.candidateSetIdentity,
        selectedCandidateIds: ["frame"],
        confirmedVisualGuideCandidateIds: [],
        constructionLayers: [],
        sourcePixelWidth: 8,
        sourcePixelHeight: 8,
        confirmClientReviewedSelection: true,
        recovery: {
          fileId: visual.fileId,
          sourceImageMediaType: visual.sourceImageMediaType,
          candidates: visual.prepared.candidates,
        },
      },
    },
  }, { authorization: "Bearer valid-subject-b" });
  assert.equal(crossSubject.status, 200);
  assert.equal(crossSubject.json.result.isError, true);
  assert.match(JSON.stringify(crossSubject.json.result), /different subject/u);
});

test("PR259 advertises a provider scope alias while retaining Norma's canonical scope", async (t) => {
  const config = { ...runtimeConfig(), authorizationScope: "norma:structured_analyze" };
  const server = createRemoteMcpHttpServer(config, {
    verifyAccessToken: deterministicVerifier,
    log: () => {},
  });
  await listen(server);
  t.after(() => close(server));
  const port = server.address().port;

  const metadata = await request(port, {
    method: "GET",
    path: "/.well-known/oauth-protected-resource/mcp",
  });
  assert.deepEqual(metadata.json.scopes_supported, ["norma:structured_analyze"]);

  const missingAuth = await mcpRequest(port, initializeRequest(protocol), { authorization: undefined });
  assert.match(
    missingAuth.headers["www-authenticate"],
    /scope="norma:structured_analyze"/u,
  );
});

test("PR137 rejects methods protocols hosts origins media types and every unapproved capability", async (t) => {
  const config = { ...runtimeConfig(), allowedOrigins: new Set(["https://chatgpt.com"]) };
  const server = createRemoteMcpHttpServer(config, { verifyAccessToken: deterministicVerifier, log: () => {} });
  await listen(server);
  t.after(() => close(server));
  const port = server.address().port;

  for (const method of ["GET", "DELETE"]) {
    const response = await request(port, { method, path: "/mcp" });
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, "POST");
  }

  assert.equal((await mcpRequest(port, initializeRequest("2025-03-26"))).status, 400);
  assert.equal((await mcpRequest(port, initializeRequest("2024-11-05"))).status, 400);
  assert.equal((await mcpRequest(port, initializeRequest("2025-06-18"))).json.result.protocolVersion, "2025-06-18");

  const listWithoutProtocol = await request(port, {
    method: "POST",
    path: "/mcp",
    headers: authorizedHeaders(),
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });
  assert.equal(listWithoutProtocol.status, 400);

  assert.equal((await mcpRequest(port, { jsonrpc: "2.0", id: 1, method: "resources/list", params: {} })).status, 200);
  assert.equal((await mcpRequest(port, { jsonrpc: "2.0", id: 1, method: "prompts/list", params: {} })).json.error.code, -32601);
  const unapprovedTool = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "norma.getVersion", arguments: {} },
  });
  assert.equal(unapprovedTool.status, 200);
  assert.equal(unapprovedTool.json.result.isError, true);

  const wrongHost = await mcpRequest(port, initializeRequest(protocol), { host: "attacker.invalid" });
  assert.equal(wrongHost.status, 400);
  assert.equal(wrongHost.json.error.code, "host_rejected");
  const wrongForwardedHost = await mcpRequest(port, initializeRequest(protocol), {
    "x-forwarded-host": "attacker.invalid",
  });
  assert.equal(wrongForwardedHost.status, 400);
  const wrongOrigin = await mcpRequest(port, initializeRequest(protocol), { origin: "https://attacker.invalid" });
  assert.equal(wrongOrigin.status, 403);
  const allowedOrigin = await mcpRequest(port, initializeRequest(protocol), { origin: "https://chatgpt.com" });
  assert.equal(allowedOrigin.status, 200);
  const absentOrigin = await mcpRequest(port, initializeRequest(protocol));
  assert.equal(absentOrigin.status, 200);

  const wrongMedia = await request(port, {
    method: "POST",
    path: "/mcp",
    headers: { ...authorizedHeaders(), "mcp-protocol-version": protocol, "content-type": "text/plain" },
    body: "{}",
  });
  assert.equal(wrongMedia.status, 415);
  assert.equal(wrongMedia.json.error.code, "unsupported_media_type");

  const batch = await mcpRequest(port, [initializeRequest(protocol)]);
  assert.equal(batch.status, 400);
  assert.equal(batch.json.error.code, "protocol_rejected");
});

test("PR137 keeps anonymous and authenticated admission buckets independent", () => {
  let now = 1_000_000;
  const controller = new RemoteMcpAdmissionController(() => now);
  for (let index = 0; index < 600; index += 1) {
    assert.equal(controller.recordUnauthorizedAttempt(), true);
  }
  assert.equal(controller.recordUnauthorizedAttempt(), false);
  assert.deepEqual(controller.snapshot(), {
    authenticatedAttempts: 0,
    unauthorizedAttempts: 600,
    subjectEntries: 0,
  });

  const first = controller.enterAuthenticatedAttempt("subject-a");
  const second = controller.enterAuthenticatedAttempt("subject-a");
  const third = controller.enterAuthenticatedAttempt("subject-a");
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.deepEqual(third, { allowed: false, code: "subject_concurrency" });
  assert.deepEqual(controller.snapshot(), {
    authenticatedAttempts: 2,
    unauthorizedAttempts: 600,
    subjectEntries: 1,
  });
  first.release();
  second.release();

  for (let index = 0; index < 118; index += 1) {
    const admission = controller.enterAuthenticatedAttempt(`subject-${index + 10}`);
    assert.equal(admission.allowed, true);
    admission.release();
  }
  assert.deepEqual(controller.enterAuthenticatedAttempt("subject-over-global"), {
    allowed: false,
    code: "authenticated_capacity",
  });

  now += 60_001;
  const afterWindow = controller.enterAuthenticatedAttempt("subject-after-window");
  assert.equal(afterWindow.allowed, true);
  afterWindow.release();

  const rateController = new RemoteMcpAdmissionController(() => now);
  for (let index = 0; index < 30; index += 1) {
    const admission = rateController.enterAuthenticatedAttempt("rate-subject");
    assert.equal(admission.allowed, true);
    admission.release();
  }
  assert.deepEqual(rateController.enterAuthenticatedAttempt("rate-subject"), {
    allowed: false,
    code: "subject_rate",
  });

  const cleanupController = new RemoteMcpAdmissionController(() => now);
  const oldSubject = cleanupController.enterAuthenticatedAttempt("old-subject");
  assert.equal(oldSubject.allowed, true);
  oldSubject.release();
  now += 3_600_001;
  const currentSubject = cleanupController.enterAuthenticatedAttempt("current-subject");
  assert.equal(currentSubject.allowed, true);
  currentSubject.release();
  assert.equal(cleanupController.snapshot().subjectEntries, 1);
});

test("PR308 keeps SAM perception status polls outside the subject action quota", () => {
  const controller = new RemoteMcpAdmissionController(() => 1_000_000);
  for (let index = 0; index < 30; index += 1) {
    const admission = controller.enterAuthenticatedAttempt("rate-subject", "action");
    assert.equal(admission.allowed, true);
    admission.release();
  }
  assert.deepEqual(controller.enterAuthenticatedAttempt("rate-subject", "action"), {
    allowed: false,
    code: "subject_rate",
  });

  const poll = controller.enterAuthenticatedAttempt("rate-subject", "non_action");
  assert.equal(poll.allowed, true);
  poll.release();
  assert.deepEqual(controller.enterAuthenticatedAttempt("rate-subject", "action"), {
    allowed: false,
    code: "subject_rate",
  });
});

test("PR308 promotes a provisional authenticated slot into one action attempt", () => {
  const controller = new RemoteMcpAdmissionController(() => 1_000_000);
  const provisional = controller.enterAuthenticatedAttempt("promotion-subject", "non_action");
  assert.equal(provisional.allowed, true);
  assert.deepEqual(provisional.promoteToAction(), { allowed: true });
  provisional.release();

  for (let index = 1; index < 30; index += 1) {
    const admission = controller.enterAuthenticatedAttempt("promotion-subject", "action");
    assert.equal(admission.allowed, true);
    admission.release();
  }
  assert.deepEqual(controller.enterAuthenticatedAttempt("promotion-subject", "action"), {
    allowed: false,
    code: "subject_rate",
  });
});

test("PR308 does not charge action quota for rejected SAM status polls", () => {
  const controller = new RemoteMcpAdmissionController(() => 1_000_000);
  const firstPoll = controller.enterAuthenticatedAttempt("poll-subject", "non_action");
  const secondPoll = controller.enterAuthenticatedAttempt("poll-subject", "non_action");
  assert.equal(firstPoll.allowed, true);
  assert.equal(secondPoll.allowed, true);
  assert.deepEqual(controller.enterAuthenticatedAttempt("poll-subject", "non_action"), {
    allowed: false,
    code: "subject_concurrency",
  });
  firstPoll.release();
  secondPoll.release();

  for (let index = 0; index < 30; index += 1) {
    const admission = controller.enterAuthenticatedAttempt("poll-subject", "action");
    assert.equal(admission.allowed, true);
    admission.release();
  }
  assert.deepEqual(controller.enterAuthenticatedAttempt("poll-subject", "action"), {
    allowed: false,
    code: "subject_rate",
  });
});

test("stateless MCP scaffolding and SAM status polls stay outside the subject action quota", async (t) => {
  const logs = [];
  const admissionController = new RemoteMcpAdmissionController(() => 1_000_000);
  for (let index = 0; index < 30; index += 1) {
    const admission = admissionController.enterAuthenticatedAttempt("pseudonymous-subject-a", "action");
    assert.equal(admission.allowed, true);
    admission.release();
  }
  const server = createRemoteMcpHttpServer(runtimeConfig(), {
    admissionController,
    verifyAccessToken: deterministicVerifier,
    log: (event) => logs.push(event),
  });
  await listen(server);
  t.after(() => close(server));
  const port = server.address().port;

  const statusPoll = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "status-after-action-budget",
    method: "tools/call",
    params: {
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: {
        sessionId: "session-missing-for-rate-test",
        candidateSetIdentity: `sha256:${"a".repeat(64)}`,
        appCapability: "a".repeat(32),
        jobId: "job-missing-for-rate-test",
      },
    },
  });
  assert.notEqual(statusPoll.status, 429);
  assert.ok(logs.some((event) => (
    event.tool === PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL
    && event.outcome === "allow"
  )), JSON.stringify(logs));

  for (let index = 0; index < 3; index += 1) {
    const initialized = await mcpRequest(port, initializeRequest(protocol));
    assert.equal(initialized.status, 200);
    const listed = await mcpRequest(port, {
      jsonrpc: "2.0",
      id: `list-after-action-budget-${index}`,
      method: "tools/list",
      params: {},
    });
    assert.equal(listed.status, 200);
  }

  const actionAfterBudget = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "prepare-after-action-budget",
    method: "tools/call",
    params: {
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {},
    },
  });
  assert.equal(actionAfterBudget.status, 429);
  assert.equal(actionAfterBudget.json.error.code, "subject_rate");
  assert.ok(logs.some((event) => (
    event.tool === PERSONAL_VISUAL_HARMONY_PREPARE_TOOL
    && event.errorCode === "subject_rate"
  )));
});

test("PR137A subject denials cannot consume global authenticated capacity", () => {
  const controller = new RemoteMcpAdmissionController(() => 1_000_000);
  const first = controller.enterAuthenticatedAttempt("noisy-subject");
  const second = controller.enterAuthenticatedAttempt("noisy-subject");
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);

  for (let index = 0; index < 28; index += 1) {
    assert.deepEqual(controller.enterAuthenticatedAttempt("noisy-subject"), {
      allowed: false,
      code: "subject_concurrency",
    });
  }
  for (let index = 0; index < 150; index += 1) {
    assert.deepEqual(controller.enterAuthenticatedAttempt("noisy-subject"), {
      allowed: false,
      code: "subject_rate",
    });
  }

  assert.deepEqual(controller.snapshot(), {
    authenticatedAttempts: 2,
    unauthorizedAttempts: 0,
    subjectEntries: 1,
  });
  const unrelated = controller.enterAuthenticatedAttempt("unrelated-subject");
  assert.equal(unrelated.allowed, true);
  assert.deepEqual(controller.snapshot(), {
    authenticatedAttempts: 3,
    unauthorizedAttempts: 0,
    subjectEntries: 2,
  });

  unrelated.release();
  first.release();
  second.release();
});

test("PR137 enforces depth string aggregate-array and timeout limits", async () => {
  let deep = { leaf: true };
  for (let index = 0; index < 65; index += 1) deep = { nested: deep };
  assert.equal(validateRemoteMcpJsonLimits(deep), "json_depth_exceeded");
  assert.equal(validateRemoteMcpJsonLimits({ value: "x".repeat(65_537) }), "json_string_exceeded");
  assert.equal(validateRemoteMcpJsonLimits({ values: Array.from({ length: 4_097 }, () => 0) }), "json_array_elements_exceeded");
  assert.equal(validateRemoteMcpJsonLimits({ values: Array.from({ length: 4_096 }, () => 0) }), null);

  await assert.rejects(
    () => withRemoteMcpDeadline(new Promise(() => {}), 5),
    RemoteMcpRequestTimeoutError,
  );
  assert.equal(await withRemoteMcpDeadline(Promise.resolve("ok"), 100), "ok");

  let settleTimedOutTask;
  let releases = 0;
  let cancellations = 0;
  const timedOutTask = new Promise((resolve) => {
    settleTimedOutTask = resolve;
  });
  await assert.rejects(
    () => withRemoteMcpAdmissionDeadline(
      timedOutTask,
      5,
      () => { releases += 1; },
      () => { cancellations += 1; },
    ),
    RemoteMcpRequestTimeoutError,
  );
  assert.equal(cancellations, 1);
  assert.equal(releases, 0, "the concurrency slot must remain held while timed-out work is unsettled");
  settleTimedOutTask("settled");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releases, 1);

  let successfulReleases = 0;
  assert.equal(await withRemoteMcpAdmissionDeadline(
    Promise.resolve("completed"),
    100,
    () => { successfulReleases += 1; },
    () => assert.fail("completed work must not be cancelled"),
  ), "completed");
  assert.equal(successfulReleases, 1);
});

function runtimeConfig() {
  return {
    port: 3000,
    nodeEnv: "test",
    publicUrl: new URL("http://127.0.0.1/"),
    resourceUrl: new URL("http://127.0.0.1/mcp"),
    issuer: new URL("https://tenant.example/"),
    authorizationServerUrl: new URL("https://tenant.example/resources/norma"),
    jwksUrl: new URL("https://tenant.example/keys"),
    authorizationScope: "norma:structured-analyze",
    audience: "https://norma.example/api",
    auditHashKey: "test-only-audit-key-that-is-at-least-32-characters",
    allowedOrigins: new Set(),
  };
}

async function deterministicVerifier(token) {
  if (!token.startsWith("valid-")) throw new Error("invalid token");
  const subject = token.slice("valid-".length);
  return {
    rawToken: token,
    subjectId: `pseudonymous-${subject}`,
    scopes: ["norma:structured-analyze"],
    clientId: "test-client",
    expiresAt: Math.floor(Date.now() / 1000) + 300,
    authorizationContext: {
      subject: `provider-${subject}`,
      tenant: `tenant-${subject}`,
      scopes: ["norma:structured-analyze"],
      audience: "https://norma.example/api",
      expiresAt: Math.floor(Date.now() / 1000) + 300,
    },
  };
}

function initializeRequest(version) {
  return {
    jsonrpc: "2.0",
    id: "initialize",
    method: "initialize",
    params: {
      protocolVersion: version,
      capabilities: {},
      clientInfo: { name: "pr137-test", version: "1.0.0" },
    },
  };
}

function authorizedHeaders() {
  return {
    host: "127.0.0.1",
    authorization: "Bearer valid-subject-a",
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  };
}

function mcpRequest(port, body, overrides = {}) {
  const headers = { ...authorizedHeaders(), ...overrides };
  if (overrides.authorization === undefined && Object.hasOwn(overrides, "authorization")) {
    delete headers.authorization;
  }
  if (!Array.isArray(body) && body.method !== "initialize") {
    headers["mcp-protocol-version"] = protocol;
  }
  return request(port, {
    method: "POST",
    path: "/mcp",
    headers,
    body: JSON.stringify(body),
  });
}

function request(port, options) {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: "127.0.0.1",
      port,
      method: options.method,
      path: options.path,
      headers: { host: "127.0.0.1", ...(options.headers ?? {}) },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: response.statusCode,
          headers: response.headers,
          text,
          json: text === "" ? null : JSON.parse(text),
        });
      });
    });
    request.on("error", reject);
    if (options.body !== undefined) request.write(options.body);
    request.end();
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
