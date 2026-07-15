import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import {
  createPersonalVisualHarmonyHttpServerV1,
} from "../dist/src/mcp/personal-visual-harmony-http-server.js";
import {
  PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
  PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
  PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
  PersonalVisualHarmonySessionServiceV1,
} from "../dist/src/mcp/personal-visual-harmony-app.js";
import { createPersonalVisualHarmonyPixelCropPlanV1 } from "../dist/src/personal-visual-harmony-pixel-refinement.js";

const ACCESS_TOKEN = "A".repeat(43);
const PROTOCOL_VERSION = "2025-11-25";

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
    },
  });
  assert.equal(prepared.structuredContent.status, "confirmation_required");
  assert.equal(prepared.structuredContent.coreRun, false);
  assert.doesNotMatch(JSON.stringify(prepared.structuredContent), /file-private-http-demo|private-signed-image/u);
  assert.doesNotMatch(JSON.stringify(prepared.content), /file-private-http-demo|private-signed-image/u);

  const widgetPayload = prepared._meta.normaPersonalVisualHarmony;
  assert.equal(widgetPayload.sessionId, "session:test-personal-http-demo");
  assert.equal(widgetPayload.fileId, "file-private-http-demo");

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
      constructionLayers: ["support-line-extensions", "format-diagonals"],
      sourcePixelWidth: 1_000,
      sourcePixelHeight: 618,
      confirmClientReviewedSelection: true,
      recovery: {
        fileId: widgetPayload.fileId,
        sourceImageMediaType: "image/png",
        candidates: goldenCandidates(),
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
  assert.equal(confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis.coreRun, false);
  assert.ok(confirmed.structuredContent.matches.some(({ ratioLabel }) => ratioLabel === "φ major"));
  assert.match(confirmed.structuredContent.canonicalResultIdentity, /^sha256:[0-9a-f]{64}$/u);
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
