import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  createPersonalVisualHarmonyMcpServerV1,
  createPersonalVisualHarmonyWidgetHtmlV1,
  PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
  PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
  PERSONAL_VISUAL_HARMONY_WIDGET_MIME_TYPE,
  PERSONAL_VISUAL_HARMONY_WIDGET_URI,
  PersonalVisualHarmonySessionServiceV1,
} from "../dist/src/mcp/personal-visual-harmony-app.js";

const repoRoot = new URL("..", import.meta.url).pathname.replace(/\/$/u, "");
const GOLDEN_MAJOR = 0.6180339887498949;

function candidates() {
  return [
    {
      id: "major",
      label: "Zone principale",
      role: "structural-region",
      reason: "Grande partition visible",
      x: 0,
      y: 0,
      width: GOLDEN_MAJOR,
      height: 1,
    },
    {
      id: "minor",
      label: "Zone secondaire",
      role: "structural-region",
      reason: "Petite partition adjacente",
      x: GOLDEN_MAJOR,
      y: 0,
      width: 1 - GOLDEN_MAJOR,
      height: 1,
    },
  ];
}

async function createConnectedClient() {
  const service = new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-13T15:00:00.000Z"),
    createSessionId: () => "session:test-personal-visual-harmony",
  });
  const server = createPersonalVisualHarmonyMcpServerV1({ service });
  const client = new Client(
    { name: "norma-personal-visual-harmony-test", version: "1.0.0" },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    server,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

test("ChatGPT App MCP lists the exact tools, file schema, app-only confirmation, and widget resource", async () => {
  const connected = await createConnectedClient();
  try {
    const listed = await connected.client.listTools();
    assert.deepEqual(listed.tools.map(({ name }) => name).sort(), [
      PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
    ].sort());

    const prepareTool = listed.tools.find(({ name }) => name === PERSONAL_VISUAL_HARMONY_PREPARE_TOOL);
    const confirmTool = listed.tools.find(({ name }) => name === PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL);
    assert.ok(prepareTool);
    assert.ok(confirmTool);
    assert.deepEqual(prepareTool._meta["openai/fileParams"], ["image"]);
    assert.equal(prepareTool._meta.ui.resourceUri, PERSONAL_VISUAL_HARMONY_WIDGET_URI);
    assert.deepEqual(prepareTool._meta.ui.visibility, ["model", "app"]);
    assert.deepEqual(confirmTool._meta.ui.visibility, ["app"]);
    assert.deepEqual(prepareTool.inputSchema.properties.image.required.sort(), ["download_url", "file_id"]);
    assert.deepEqual(Object.keys(prepareTool.inputSchema.properties.image.properties).sort(), [
      "download_url",
      "file_id",
      "file_name",
      "mime_type",
    ]);
    assert.equal(prepareTool.inputSchema.properties.image.additionalProperties, false);

    const resources = await connected.client.listResources();
    assert.deepEqual(resources.resources.map(({ uri }) => uri), [PERSONAL_VISUAL_HARMONY_WIDGET_URI]);
    const resource = await connected.client.readResource({ uri: PERSONAL_VISUAL_HARMONY_WIDGET_URI });
    assert.equal(resource.contents.length, 1);
    assert.equal(resource.contents[0].mimeType, PERSONAL_VISUAL_HARMONY_WIDGET_MIME_TYPE);
    assert.equal(resource.contents[0].text, createPersonalVisualHarmonyWidgetHtmlV1());
    assert.match(resource.contents[0].text, /window\.openai\.getFileDownloadUrl/u);
    assert.match(resource.contents[0].text, /window\.openai\.callTool/u);
    assert.match(resource.contents[0].text, /window\.openai\.sendFollowUpMessage/u);
    assert.match(resource.contents[0].text, /window\.openai\?\.setWidgetState/u);
    assert.match(resource.contents[0].text, /completedVisualHarmony/u);
    assert.match(resource.contents[0].text, /completedWidgetStateFor\(payload\)/u);
    assert.match(resource.contents[0].text, /candidateSetIdentity:state\.payload\.prepared\.candidateSetIdentity/u);
    assert.match(resource.contents[0].text, /selectedCandidateIds:\[\.\.\.state\.selected\]/u);
    assert.match(resource.contents[0].text, /sourcePixelWidth:state\.dimensions\.width/u);
    assert.match(resource.contents[0].text, /confirmedSelectionIdentity/u);
    assert.match(resource.contents[0].text, /mappedGeometryContentIdentity/u);
    assert.match(resource.contents[0].text, /ratioPackRefs/u);
    assert.match(resource.contents[0].text, /revalidateCompleted\(payload,completed\)/u);
    assert.match(resource.contents[0].text, /CORE REVALIDÉ/u);
    assert.match(resource.contents[0].text, /RAPPORT MÉMORISÉ · NON REVALIDÉ/u);
    assert.doesNotMatch(resource.contents[0].text, /CORE VÉRIFIÉ · MÉMORISÉ/u);
    assert.match(resource.contents[0].text, /status:"CORE_VERIFIED"/u);
    assert.match(resource.contents[0].text, /scrollToBottom:true/u);
    assert.match(resource.contents[0].text, /confirmClientReviewedSelection:true/u);
    assert.match(resource.contents[0].text, /la session de démo a expiré/u);
    assert.doesNotMatch(resource.contents[0].text, /download_url/u);
  } finally {
    await connected.close();
  }
});

test("prepare keeps Core stopped and confirm runs deterministic Core only after the literal widget gate", async () => {
  const connected = await createConnectedClient();
  try {
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image",
          file_id: "file-private-opaque-id",
          mime_type: "image/png",
          file_name: "private-name.png",
        },
        candidates: candidates(),
      },
    });
    assert.equal(prepared.isError, undefined);
    assert.equal(prepared.structuredContent.status, "confirmation_required");
    assert.equal(prepared.structuredContent.coreRun, false);
    assert.equal(prepared.structuredContent.candidateEvidenceOnly, true);
    assert.equal(prepared.structuredContent.explicitSelectionConfirmationRequired, true);
    assert.doesNotMatch(JSON.stringify(prepared.structuredContent), /file-private-opaque-id|private-signed-image|private-name/u);
    assert.doesNotMatch(JSON.stringify(prepared.content), /file-private-opaque-id|private-signed-image|private-name/u);

    const widgetMeta = prepared._meta.normaPersonalVisualHarmony;
    assert.equal(widgetMeta.stage, "confirmation_required");
    assert.equal(widgetMeta.fileId, "file-private-opaque-id");
    assert.equal(widgetMeta.sessionId, "session:test-personal-visual-harmony");
    assert.match(widgetMeta.overlaySvg, /^<svg/u);

    const rejected = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: false,
      },
    });
    assert.equal(rejected.isError, true);

    const confirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
      },
    });
    assert.equal(confirmed.isError, undefined);
    assert.equal(confirmed.structuredContent.status, "completed");
    assert.equal(confirmed.structuredContent.explicitSelectionConfirmation, true);
    assert.equal(confirmed.structuredContent.confirmationMode, "client_asserted_widget_interaction");
    assert.equal(confirmed.structuredContent.serverVerifiedHumanPresence, false);
    assert.equal("explicitHumanConfirmation" in confirmed.structuredContent, false);
    assert.equal(confirmed.structuredContent.coreInputAuthority, "confirmed_structured_geometry");
    assert.equal(confirmed.structuredContent.coreRun, true);
    assert.ok(confirmed.structuredContent.relationshipCount >= 2);
    assert.ok(confirmed.structuredContent.matches.some(({ ratioLabel }) => ratioLabel === "φ major"));
    assert.ok(confirmed.structuredContent.matches.some(({ ratioLabel }) => ratioLabel === "φ minor"));
    assert.match(confirmed.structuredContent.canonicalResultIdentity, /^sha256:[0-9a-f]{64}$/u);
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /^<svg/u);
    assert.equal(confirmed._meta.normaPersonalVisualHarmony.stage, "completed");

    const replay = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["minor", "major"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
      },
    });
    assert.equal(replay.structuredContent.canonicalResultIdentity, confirmed.structuredContent.canonicalResultIdentity);

    const conflicting = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
      },
    });
    assert.equal(conflicting.isError, true);
  } finally {
    await connected.close();
  }
});

test("prepare rejects rectangles that pass scalar schema bounds but cross the image edge", async () => {
  const connected = await createConnectedClient();
  try {
    const response = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/image",
          file_id: "file-id",
        },
        candidates: [{
          ...candidates()[0],
          x: 0.8,
          width: 0.4,
        }],
      },
    });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /positive normalized rectangle/u);
  } finally {
    await connected.close();
  }
});

test("STDIO entrypoint is disabled by default and initializes the personal app when explicitly enabled", async () => {
  const disabled = spawnSync(
    process.execPath,
    ["bin/norma-core-personal-visual-harmony-mcp-stdio.mjs"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(disabled.status, 2);
  assert.equal(disabled.stdout, "");
  assert.equal(disabled.stderr, "norma_personal_visual_harmony_mcp_disabled_by_default\n");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      "bin/norma-core-personal-visual-harmony-mcp-stdio.mjs",
      "--enable-personal-visual-harmony-demo",
    ],
    cwd: repoRoot,
    stderr: "pipe",
  });
  const client = new Client(
    { name: "norma-personal-visual-harmony-stdio-test", version: "1.0.0" },
    { capabilities: {} },
  );
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(({ name }) => name).sort(), [
      PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
    ].sort());
    const resources = await client.listResources();
    assert.deepEqual(resources.resources.map(({ uri }) => uri), [PERSONAL_VISUAL_HARMONY_WIDGET_URI]);
  } finally {
    await client.close();
  }
});
