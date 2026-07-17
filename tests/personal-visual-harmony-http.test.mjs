import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import {
  createPersonalVisualHarmonyHttpServerV1,
} from "../dist/src/mcp/personal-visual-harmony-http-server.js";
import {
  createPersonalVisualHarmonyWidgetHtmlV1,
  PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
  PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
  PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
  PersonalVisualHarmonySessionServiceV1,
} from "../dist/src/mcp/personal-visual-harmony-app.js";
import { createPersonalVisualHarmonyPixelCropPlanV1 } from "../dist/src/personal-visual-harmony-pixel-refinement.js";

const ACCESS_TOKEN = "A".repeat(43);
const PROTOCOL_VERSION = "2025-11-25";

function widgetScriptFunction(name, nextLinePrefix, bindings) {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/u)?.[1];
  assert.ok(script);
  const functionStart = script.indexOf(`function ${name}(`);
  const asyncFunctionStart = script.indexOf(`async function ${name}(`);
  const start = asyncFunctionStart !== -1 && asyncFunctionStart <= functionStart
    ? asyncFunctionStart
    : functionStart;
  assert.notEqual(start, -1, `Missing widget function ${name}`);
  const end = script.indexOf(`\n${nextLinePrefix}`, start);
  assert.notEqual(end, -1, `Missing widget function boundary after ${name}`);
  const source = script.slice(start, end);
  const bindingNames = Object.keys(bindings);
  return new Function(...bindingNames, `"use strict";${source};return ${name};`)(
    ...bindingNames.map((bindingName) => bindings[bindingName]),
  );
}

test("temporary personal HTTP MCP uses a capability path and keeps state across stateless requests", async (t) => {
  const service = new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-13T15:00:00.000Z"),
    createSessionId: () => "session:test-personal-http-demo",
  });
  const { server, mcpPath } = createPersonalVisualHarmonyHttpServerV1({
    accessToken: ACCESS_TOKEN,
    service,
  });
  await listen(server);
  t.after(() => close(server));
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  const port = address.port;

  assert.equal(mcpPath, `/personal/${ACCESS_TOKEN}/mcp`);
  const health = await request(port, { method: "GET", path: "/healthz" });
  assert.equal(health.status, 200);
  assert.equal(health.json.exposure, "temporary_loopback_personal_demo");
  assert.equal((await request(port, { method: "POST", path: "/personal/wrong-token-which-is-long-enough/mcp" })).status, 404);
  const disallowedGet = await request(port, { method: "GET", path: mcpPath });
  assert.equal(disallowedGet.status, 405);
  assert.equal(disallowedGet.headers.allow, "POST, OPTIONS");
  const preflight = await request(port, {
    method: "OPTIONS",
    path: mcpPath,
    headers: { origin: "https://chatgpt.com" },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers["access-control-allow-origin"], "https://chatgpt.com");
  assert.equal((await request(port, {
    method: "OPTIONS",
    path: mcpPath,
    headers: { origin: "https://attacker.invalid" },
  })).status, 403);

  const initialized = await mcpRequest(port, mcpPath, initializeRequest());
  assert.equal(initialized.status, 200);
  assert.equal(initialized.json.result.protocolVersion, PROTOCOL_VERSION);
  assert.equal(initialized.headers["mcp-session-id"], undefined);
  const legacyInitialized = await mcpRequest(port, mcpPath, initializeRequest("2025-06-18"));
  assert.equal(legacyInitialized.status, 200);
  assert.equal(legacyInitialized.json.result.protocolVersion, "2025-06-18");
  const negotiatedFromUnknown = await mcpRequest(port, mcpPath, initializeRequest("2099-01-01"));
  assert.equal(negotiatedFromUnknown.status, 200);
  assert.equal(negotiatedFromUnknown.json.result.protocolVersion, PROTOCOL_VERSION);
  assert.equal((await request(port, {
    method: "POST",
    path: mcpPath,
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      origin: "https://attacker.invalid",
    },
    body: JSON.stringify(initializeRequest()),
  })).status, 403);

  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${port}${mcpPath}`),
    { requestInit: { headers: { origin: "https://chatgpt.com" } } },
  );
  const client = new Client(
    { name: "personal-visual-harmony-http-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
  t.after(() => client.close());

  const listed = await client.listTools();
  assert.deepEqual(
    listed.tools.map(({ name }) => name),
    [
      PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
      PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
    ],
  );

  const prepared = await client.callTool({
    name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
    arguments: {
      image: {
        download_url: "https://files.example.test/private-signed-image",
        file_id: "file-private-http-demo",
        mime_type: "image/png",
      },
      candidates: goldenCandidates(),
      triangleConstructionRequests: goldenTriangleConstructionRequests(),
    },
  });
  assert.equal(prepared.structuredContent.status, "confirmation_required");
  assert.equal(prepared.structuredContent.coreRun, false);
  assert.doesNotMatch(JSON.stringify(prepared.structuredContent), /file-private-http-demo|private-signed-image/u);
  assert.doesNotMatch(JSON.stringify(prepared.content), /file-private-http-demo|private-signed-image/u);

  const widgetPayload = prepared._meta.normaPersonalVisualHarmony;
  assert.equal(widgetPayload.sessionId, "session:test-personal-http-demo");
  assert.equal(widgetPayload.fileId, "file-private-http-demo");
  assert.equal(widgetPayload.prepared.triangleConstructionRequests.length, 1);

  const oblique = goldenCandidates().find(({ id }) => id === "oblique");
  const cropPlan = createPersonalVisualHarmonyPixelCropPlanV1({
    primitive: oblique.primitive,
    sourcePixelWidth: 1_000,
    sourcePixelHeight: 618,
  });
  assert.equal(cropPlan.status, "ready");
  const refined = await client.callTool({
    name: PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
    arguments: {
      sessionId: widgetPayload.sessionId,
      candidateSetIdentity: widgetPayload.prepared.candidateSetIdentity,
      candidateId: oblique.id,
      reviewedPrimitive: oblique.primitive,
      sourcePixelWidth: 1_000,
      sourcePixelHeight: 618,
      luminanceBase64: Buffer.alloc(cropPlan.rasterWidth * cropPlan.rasterHeight, 128).toString("base64"),
      recovery: {
        fileId: widgetPayload.fileId,
        sourceImageMediaType: "image/png",
        candidates: goldenCandidates(),
        triangleConstructionRequests: widgetPayload.prepared.triangleConstructionRequests,
      },
    },
  });
  assert.equal(refined.structuredContent.proposal.status, "abstained");
  assert.equal(refined.structuredContent.proposal.proposalAdopted, false);
  assert.equal(refined.structuredContent.proposal.automaticAcceptance, false);
  assert.equal(refined.structuredContent.proposal.coreRun, false);

  const confirmed = await client.callTool({
    name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
    arguments: {
      sessionId: widgetPayload.sessionId,
      candidateSetIdentity: widgetPayload.prepared.candidateSetIdentity,
      selectedCandidateIds: ["major", "minor"],
      confirmedVisualGuideCandidateIds: ["oblique"],
      constructionLayers: [
        "support-line-extensions",
        "format-diagonals",
        "junction-angles",
        "triangles",
        "triangle-medians",
        "triangle-altitudes",
        "triangle-centroids",
      ],
      sourcePixelWidth: 1_000,
      sourcePixelHeight: 618,
      confirmClientReviewedSelection: true,
      recovery: {
        fileId: widgetPayload.fileId,
        sourceImageMediaType: "image/png",
        candidates: goldenCandidates(),
        triangleConstructionRequests: widgetPayload.prepared.triangleConstructionRequests,
      },
    },
  });
  assert.equal(confirmed.structuredContent.status, "completed");
  assert.equal(confirmed.structuredContent.coreRun, true);
  assert.equal(confirmed.structuredContent.serverVerifiedHumanPresence, false);
  assert.equal(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.supportLineExtensions.length,
    1,
  );
  assert.equal(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.formatDiagonals.length,
    2,
  );
  assert.ok(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.junctionAngles.length > 0,
  );
  assert.equal(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.triangles.length,
    1,
  );
  assert.equal(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.triangles[0].coreAuthority,
    false,
  );
  assert.equal(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.triangleMedians.length,
    3,
  );
  assert.ok(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.triangleMedians
      .every(({ sourceTruth, coreAuthority }) => sourceTruth === false && coreAuthority === false),
  );
  assert.equal(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.triangleAltitudes.length,
    3,
  );
  assert.ok(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.triangleAltitudes
      .every(({ sourceTruth, coreAuthority, foot }) => (
        sourceTruth === false
        && coreAuthority === false
        && Number.isFinite(foot.x)
        && Number.isFinite(foot.y)
      )),
  );
  assert.equal(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.triangleCentroids.length,
    1,
  );
  assert.equal(
    confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.triangleCentroids[0].coreAuthority,
    false,
  );
  assert.equal(confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.coreRun, false);
  assert.ok(confirmed.structuredContent.matches.some(({ ratioLabel }) => ratioLabel === "φ major"));
  assert.match(confirmed.structuredContent.canonicalResultIdentity, /^sha256:[0-9a-f]{64}$/u);
});

test("widget confirmation accepts one rounded explicit junction triangle with medians and centroid over HTTP", async (t) => {
  let sessionCounter = 0;
  const service = new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-17T17:00:00.000Z"),
    createSessionId: () => `session:test-v5-rounded-triangle:${String(++sessionCounter)}`,
  });
  const { server, mcpPath } = createPersonalVisualHarmonyHttpServerV1({
    accessToken: ACCESS_TOKEN,
    service,
  });
  await listen(server);
  t.after(() => close(server));
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");

  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${address.port}${mcpPath}`),
    { requestInit: { headers: { origin: "https://chatgpt.com" } } },
  );
  const client = new Client(
    { name: "personal-visual-harmony-v5-regression", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
  t.after(() => client.close());

  const candidates = v5Candidates();
  const prepared = await client.callTool({
    name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
    arguments: {
      image: {
        download_url: "https://files.example.test/v5-synthetic-fixture",
        file_id: "file-v5-synthetic-fixture",
        mime_type: "image/png",
      },
      candidates,
      triangleConstructionRequests: v5RoundedTriangleConstructionRequests(),
    },
  });
  assert.equal(
    prepared.isError,
    undefined,
    `v5 preparation rejected: ${prepared.content?.[0]?.text ?? "missing connector error"}`,
  );
  assert.equal(prepared.structuredContent.triangleRequestCount, 1);
  assert.equal(prepared.structuredContent.coreRun, false);

  const widgetPayload = prepared._meta.normaPersonalVisualHarmony;
  const pixelRecovery = widgetScriptFunction(
    "pixelRecovery",
    "async function requestPixelProposal",
    {},
  );
  const callConfirmation = widgetScriptFunction(
    "callConfirmation",
    "function finishConfirmingPayload",
    {
      CONFIRM_TOOL: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      pixelRecovery,
      callAppTool: (name, args) => client.callTool({ name, arguments: args }),
    },
  );
  const confirmed = await callConfirmation(
    widgetPayload,
    ["core-frame"],
    ["parent-red", "parent-blue", "parent-vertical", "main-trapezoid", "main-ellipse"],
    [
      "support-line-extensions",
      "junction-angles",
      "triangles",
      "triangle-medians",
      "triangle-centroids",
    ],
    { width: 1_200, height: 800 },
  );

  assert.equal(
    confirmed.isError,
    undefined,
    `v5 widget confirmation rejected: ${confirmed.content?.[0]?.text ?? "missing connector error"}`,
  );
  assert.equal(confirmed.structuredContent.status, "completed");
  assert.equal(confirmed.structuredContent.coreRun, true);
  const constructions = confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis;
  assert.equal(constructions.triangles.length, 1);
  assert.equal(constructions.triangleMedians.length, 3);
  assert.equal(constructions.triangleCentroids.length, 1);
  assert.equal(constructions.triangleCentroids[0].candidateEvidenceOnly, true);
  assert.equal(constructions.triangleCentroids[0].sourceTruth, false);
  assert.equal(constructions.triangleCentroids[0].coreAuthority, false);
  assert.equal(constructions.coreRun, false);

  const mismatchedRequests = structuredClone(v5RoundedTriangleConstructionRequests());
  mismatchedRequests[0].vertices[0].point.x = 0.51;
  const mismatchedPrepared = await client.callTool({
    name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
    arguments: {
      image: {
        download_url: "https://files.example.test/v5-synthetic-fixture-mismatch",
        file_id: "file-v5-synthetic-fixture-mismatch",
        mime_type: "image/png",
      },
      candidates,
      triangleConstructionRequests: mismatchedRequests,
    },
  });
  assert.equal(mismatchedPrepared.isError, undefined);
  const mismatchedConfirmation = await callConfirmation(
    mismatchedPrepared._meta.normaPersonalVisualHarmony,
    ["core-frame"],
    ["parent-red", "parent-blue", "parent-vertical"],
    [
      "support-line-extensions",
      "junction-angles",
      "triangles",
      "triangle-medians",
      "triangle-centroids",
    ],
    { width: 1_200, height: 800 },
  );
  assert.equal(mismatchedConfirmation.isError, true);
  assert.equal(
    mismatchedConfirmation.content[0].text,
    "Triangle vertex point does not match its stable parent geometry.",
  );
});

test("personal HTTP MCP rejects weak path tokens and oversized declared requests", async (t) => {
  assert.throws(
    () => createPersonalVisualHarmonyHttpServerV1({ accessToken: "too-short" }),
    /43-128 URL-safe/u,
  );

  const { server, mcpPath } = createPersonalVisualHarmonyHttpServerV1({
    accessToken: ACCESS_TOKEN,
    maxRequestBytes: 64,
  });
  await listen(server);
  t.after(() => close(server));
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");

  const response = await request(address.port, {
    method: "POST",
    path: mcpPath,
    headers: {
      accept: "application/json, text/event-stream",
      "content-length": "65",
      "content-type": "application/json",
    },
  });
  assert.equal(response.status, 413);
  assert.equal(response.json.error, "payload_too_large");
});

function goldenCandidates() {
  return [
    {
      id: "major",
      label: "Zone principale",
      role: "primary-subject",
      reason: "Partie majeure observée par ChatGPT.",
      x: 0,
      y: 0,
      width: 0.618034,
      height: 1,
    },
    {
      id: "minor",
      label: "Zone complémentaire",
      role: "structural-region",
      reason: "Partie mineure observée par ChatGPT.",
      x: 0.618034,
      y: 0,
      width: 0.381966,
      height: 1,
    },
    {
      id: "oblique",
      label: "Oblique observée",
      role: "structural-region",
      reason: "Segment oblique visible mesuré sans cible harmonique.",
      x: 0.12,
      y: 0.18,
      width: 0.7,
      height: 0.64,
      primitive: {
        kind: "segment",
        start: { x: 0.12, y: 0.82 },
        end: { x: 0.82, y: 0.18 },
      },
    },
  ];
}

function goldenTriangleConstructionRequests() {
  return [{
    requestId: "http-explicit-oblique-triangle",
    vertices: [
      {
        point: { x: 0.12, y: 0.82 },
        parent: {
          kind: "observed-line-endpoint",
          candidateId: "oblique",
          endpoint: "start",
        },
      },
      {
        point: { x: 0.82, y: 0.18 },
        parent: {
          kind: "observed-line-endpoint",
          candidateId: "oblique",
          endpoint: "end",
        },
      },
      {
        point: { x: 0, y: 0 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "format-diagonal", diagonal: "vertex-0-to-2" },
            { kind: "frame-edge", frameEdgeIndex: 0 },
          ],
        },
      },
    ],
  }];
}

function v5Candidates() {
  return [
    {
      id: "core-frame",
      label: "Cadre rectangulaire Core",
      role: "structural-region",
      reason: "Rectangle structurel visible dans la fixture synthétique.",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    {
      id: "parent-red",
      label: "Parent A — diagonale rouge",
      role: "structural-region",
      reason: "Segment rouge stable mesuré sans ajustement harmonique.",
      x: 0.12,
      y: 0.19,
      width: 0.74,
      height: 0.63,
      primitive: {
        kind: "segment",
        start: { x: 0.12, y: 0.82 },
        end: { x: 0.86, y: 0.19 },
      },
    },
    {
      id: "parent-blue",
      label: "Parent B — diagonale bleue",
      role: "structural-region",
      reason: "Segment bleu stable mesuré sans ajustement harmonique.",
      x: 0.1,
      y: 0.18,
      width: 0.78,
      height: 0.59,
      primitive: {
        kind: "segment",
        start: { x: 0.1, y: 0.18 },
        end: { x: 0.88, y: 0.77 },
      },
    },
    {
      id: "parent-vertical",
      label: "Parent C — axe vertical pointillé",
      role: "structural-region",
      reason: "Axe vertical stable mesuré sans ajustement harmonique.",
      x: 0.53,
      y: 0.08,
      width: 0,
      height: 0.84,
      primitive: {
        kind: "axis",
        start: { x: 0.53, y: 0.08 },
        end: { x: 0.53, y: 0.92 },
      },
    },
    {
      id: "main-trapezoid",
      label: "Trapèze principal",
      role: "structural-region",
      reason: "Quadrilatère visible conservé comme guide séparé.",
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
      primitive: {
        kind: "quadrilateral",
        vertices: [
          { x: 0.25, y: 0.2 },
          { x: 0.75, y: 0.2 },
          { x: 0.8, y: 0.8 },
          { x: 0.2, y: 0.8 },
        ],
      },
    },
    {
      id: "main-ellipse",
      label: "Ellipse oblique visible",
      role: "structural-region",
      reason: "Ellipse visible conservée comme guide séparé.",
      x: 0.3,
      y: 0.25,
      width: 0.4,
      height: 0.5,
      primitive: {
        kind: "ellipse",
        center: { x: 0.5, y: 0.5 },
        radiusX: 0.2,
        radiusY: 0.25,
        rotationDegrees: 18,
      },
    },
  ];
}

function v5RoundedTriangleConstructionRequests() {
  return [{
    requestId: "v5-explicit-parent-triangle",
    vertices: [
      {
        point: { x: 0.509, y: 0.489 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "support-line-extension", candidateId: "parent-red" },
            { kind: "support-line-extension", candidateId: "parent-blue" },
          ],
        },
      },
      {
        point: { x: 0.53, y: 0.471 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "support-line-extension", candidateId: "parent-red" },
            { kind: "support-line-extension", candidateId: "parent-vertical" },
          ],
        },
      },
      {
        point: { x: 0.53, y: 0.505 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "support-line-extension", candidateId: "parent-blue" },
            { kind: "support-line-extension", candidateId: "parent-vertical" },
          ],
        },
      },
    ],
  }];
}

function initializeRequest(protocolVersion = PROTOCOL_VERSION) {
  return {
    jsonrpc: "2.0",
    id: "initialize",
    method: "initialize",
    params: {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: "personal-visual-harmony-http-test", version: "1.0.0" },
    },
  };
}

function mcpRequest(port, path, body) {
  const headers = {
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  };
  if (body.method !== "initialize") headers["mcp-protocol-version"] = PROTOCOL_VERSION;
  return request(port, {
    method: "POST",
    path,
    headers,
    body: JSON.stringify(body),
  });
}

function request(port, options) {
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest({
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
    outgoing.on("error", reject);
    if (options.body !== undefined) outgoing.write(options.body);
    outgoing.end();
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
    server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  });
}
