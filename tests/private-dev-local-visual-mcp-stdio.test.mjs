import assert from "node:assert/strict";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createControlledLocalLiveVisualCandidateCaptureV1,
  createControlledLocalLiveVisualCandidateResumeV1,
  finalizeLocalVisualHumanCandidateSelectionIdentityV1,
} from "../dist/src/local-report/controlled-local-live-visual-candidate-observation-demo.js";
import {
  PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
  PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL,
  PRIVATE_DEV_LOCAL_VISUAL_MCP_TOOLS,
  PrivateDevLocalVisualMcpProtocolV1,
} from "../dist/src/mcp/private-dev-local-visual-mcp-protocol.js";
import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";
import {
  resolvePrivateDevLocalVisualMcpJobRootV1,
  writePrivateDevLocalVisualMcpArtifactsAtomically,
} from "../bin/norma-core-private-dev-visual-mcp-stdio.mjs";

const BIN = new URL("../bin/norma-core-private-dev-visual-mcp-stdio.mjs", import.meta.url);
const BIN_PATH = fileURLToPath(BIN);
const ACCEPTED_AT = "2026-07-11T12:00:00.000Z";

test("PR134 dedicated tool inventory is exact, closed, and does not widen the general MCP server", () => {
  assert.deepEqual(PRIVATE_DEV_LOCAL_VISUAL_MCP_TOOLS.map(({ name }) => name), [
    PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
    PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL,
  ]);
  for (const tool of PRIVATE_DEV_LOCAL_VISUAL_MCP_TOOLS) {
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.doesNotMatch(JSON.stringify(tool.inputSchema), /path|url|image|candidateIds|geometry|providerData|outputDir/iu);
    assert.equal(tool.outputSchema.oneOf.length, 2);
    assert.equal(tool.outputSchema.oneOf[1].additionalProperties, false);
    assert.equal(tool.outputSchema.oneOf[1].properties.tool.const, tool.name);
    assert.equal(tool.outputSchema.oneOf[1].properties.code.enum.includes("internal_error"), true);
  }
  assert.deepEqual(PRIVATE_DEV_LOCAL_VISUAL_MCP_TOOLS[0].annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    idempotentHint: true,
  });
  assert.deepEqual(PRIVATE_DEV_LOCAL_VISUAL_MCP_TOOLS[1].annotations, {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
    idempotentHint: false,
  });

  const general = JSON.parse(handleMcpJsonRpcMessage(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  })));
  assert.deepEqual(general.result.tools.map(({ name }) => name), [
    "norma.getVersion",
    "norma.serializeCanonicalJson",
    "norma.verifyRun",
    "norma.verifyArtifactFreshness",
    "norma.replayMvpDemo",
    "norma.analyzeStructuredCompositionV1",
  ]);
});

test("PR134 real STDIO lifecycle inspects then resumes with exact PR129 result parity", async () => {
  const job = await createJob();
  const direct = createControlledLocalLiveVisualCandidateResumeV1({
    providerExecutionReceipt: job.fixture.capture.providerExecutionReceipt,
    candidateObservationEnvelope: job.fixture.capture.candidateObservationEnvelope,
    humanCandidateSelection: job.fixture.selection,
    acceptedAt: ACCEPTED_AT,
  });
  const server = startServer(job.root);
  try {
    const initialize = await server.request(initializeRequest(1));
    assert.equal(initialize.result.protocolVersion, "2025-06-18");
    assert.deepEqual(initialize.result.capabilities, { tools: { listChanged: false } });
    server.notify({ jsonrpc: "2.0", method: "notifications/initialized" });

    const list = await server.request({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    assert.deepEqual(list.result.tools.map(({ name }) => name), [
      PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
      PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL,
    ]);

    const inspectionResponse = await server.request(toolCall(
      3,
      PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
      {},
    ));
    assert.equal(inspectionResponse.result.isError, false);
    const inspection = inspectionResponse.result.structuredContent;
    assert.equal(inspection.status, "ready_to_resume");
    assert.equal(inspection.candidateCount, 2);
    assert.equal(inspection.selectedCandidateCount, 2);
    assert.doesNotMatch(JSON.stringify(inspection), /operator:private-dev|"x"|"y"|https?:|\/private\//u);

    const resumeResponse = await server.request(toolCall(
      4,
      PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL,
      resumeArgs(inspection),
    ));
    assert.equal(resumeResponse.result.isError, false);
    const result = resumeResponse.result.structuredContent;
    assert.equal(result.status, "completed");
    assert.equal(result.canonicalResultJson, "result.json");
    assert.equal(result.canonicalTruth, "result.json");
    assert.equal(result.networkTransportUsed, false);
    assert.doesNotMatch(JSON.stringify(result), /operator:private-dev|\/private\/|https?:/u);

    const outputFiles = (await readdir(join(job.root, "norma-output"))).sort();
    assert.deepEqual(outputFiles, result.artifacts);
    assert.equal(
      await readFile(join(job.root, "norma-output", "result.json"), "utf8"),
      direct.artifacts["result.json"],
    );

    const repeated = await server.request(toolCall(
      5,
      PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL,
      resumeArgs(inspection),
    ));
    assert.equal(repeated.result.isError, true);
    assert.equal(repeated.result.structuredContent.code, "output_exists");
  } finally {
    await server.close();
    assert.equal(server.stderr, "");
    await job.cleanup();
  }
});

test("PR134 stale selection after inspect fails closed and the process survives", async () => {
  const job = await createJob();
  const server = startServer(job.root);
  try {
    await server.request(initializeRequest(1));
    server.notify({ jsonrpc: "2.0", method: "notifications/initialized" });
    const inspected = (await server.request(toolCall(
      2,
      PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
      {},
    ))).result.structuredContent;

    const replacement = createSelection(job.fixture.capture, [0], "operator:replacement");
    await writeFile(
      join(job.root, "human-candidate-selection.json"),
      `${JSON.stringify(replacement)}\n`,
      "utf8",
    );
    const stale = await server.request(toolCall(
      3,
      PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL,
      resumeArgs(inspected),
    ));
    assert.equal(stale.result.isError, true);
    assert.equal(stale.result.structuredContent.code, "stale_human_selection");
    await assert.rejects(readFile(join(job.root, "norma-output", "result.json"), "utf8"));

    const after = await server.request(toolCall(
      4,
      PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
      {},
    ));
    assert.equal(after.result.isError, false);
    assert.equal(after.result.structuredContent.humanSelectionContentIdentity, replacement.selectionContentIdentity);
  } finally {
    await server.close();
    await job.cleanup();
  }
});

test("PR134 missing, oversized, symlinked, and malformed artifacts return redacted errors", async () => {
  for (const mutation of [
    async (job) => rm(join(job.root, "human-candidate-selection.json")),
    async (job) => writeFile(join(job.root, "provider-execution-receipt.json"), "x".repeat(64 * 1024 + 1)),
    async (job) => {
      const target = join(job.root, "selection-target.json");
      await writeFile(target, JSON.stringify(job.fixture.selection));
      await rm(join(job.root, "human-candidate-selection.json"));
      await symlink(target, join(job.root, "human-candidate-selection.json"));
    },
    async (job) => writeFile(join(job.root, "candidate-observation.json"), "{not-json", "utf8"),
  ]) {
    const job = await createJob();
    await mutation(job);
    const server = startServer(job.root);
    try {
      await server.request(initializeRequest(1));
      server.notify({ jsonrpc: "2.0", method: "notifications/initialized" });
      const response = await server.request(toolCall(
        2,
        PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
        {},
      ));
      assert.equal(response.result.isError, true);
      assert.equal([
        "missing_required_artifact", "artifact_too_large", "unsafe_artifact", "malformed_artifact",
      ].includes(response.result.structuredContent.code), true);
      assert.deepEqual(Object.hasOwn(response.result.structuredContent, "path"), false);
    } finally {
      await server.close();
      await job.cleanup();
    }
  }
});

test("PR134 rejects relative, URL-like, symlinked, and replaced job roots", async () => {
  await assert.rejects(resolvePrivateDevLocalVisualMcpJobRootV1("relative/job"));
  await assert.rejects(resolvePrivateDevLocalVisualMcpJobRootV1("https://example.invalid/job"));

  const target = await realpath(await mkdtemp(join(tmpdir(), "norma-pr134-root-target-")));
  const link = `${target}-link`;
  await symlink(target, link);
  try {
    await assert.rejects(resolvePrivateDevLocalVisualMcpJobRootV1(link));
  } finally {
    await rm(link, { force: true });
    await rm(target, { recursive: true, force: true });
  }

  const job = await createJob();
  const movedRoot = `${job.root}-moved`;
  const server = startServer(job.root);
  try {
    await server.request(initializeRequest(1));
    server.notify({ jsonrpc: "2.0", method: "notifications/initialized" });
    await rename(job.root, movedRoot);
    await symlink(movedRoot, job.root);
    const response = await server.request(toolCall(
      2,
      PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
      {},
    ));
    assert.equal(response.result.isError, true);
    assert.equal(response.result.structuredContent.code, "unsafe_artifact");
  } finally {
    await server.close();
    await rm(job.root, { force: true });
    await rm(movedRoot, { recursive: true, force: true });
  }
});

test("PR134 protocol enforces lifecycle, busy state, cancellation, and deadlines", async () => {
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  const runtime = {
    inspect: async () => ({ status: "not-used" }),
    resume: async (_request, signal) => {
      await Promise.race([
        waiting,
        new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true })),
      ]);
      return { status: "not-used" };
    },
  };
  const protocol = new PrivateDevLocalVisualMcpProtocolV1(runtime, { toolTimeoutMs: 1_000 });
  assert.equal(JSON.parse(await protocol.handleLine(JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "tools/list",
  }))).error.message, "Server not initialized");
  await protocol.handleLine(JSON.stringify(initializeRequest(2)));
  await protocol.handleLine(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }));

  const resume = protocol.handleLine(JSON.stringify(toolCall(
    "resume",
    PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL,
    fakeResumeArgs(),
  )));
  const invalidWhileBusy = JSON.parse(await protocol.handleLine(JSON.stringify(toolCall(
    "invalid-busy",
    PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
    { unexpected: true },
  ))));
  assert.equal(invalidWhileBusy.error.code, -32602);
  const busy = JSON.parse(await protocol.handleLine(JSON.stringify(toolCall(
    "busy",
    PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
    {},
  ))));
  assert.equal(busy.result.structuredContent.code, "job_busy");
  assert.equal(await protocol.handleLine(JSON.stringify({
    jsonrpc: "2.0",
    method: "notifications/cancelled",
    params: { requestId: "resume", reason: "operator cancelled" },
  })), null);
  assert.equal(await resume, null);
  release();

  const timeoutProtocol = new PrivateDevLocalVisualMcpProtocolV1({
    inspect: async (signal) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
    resume: runtime.resume,
  }, { toolTimeoutMs: 10 });
  await timeoutProtocol.handleLine(JSON.stringify(initializeRequest(1)));
  await timeoutProtocol.handleLine(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }));
  const timedOut = JSON.parse(await timeoutProtocol.handleLine(JSON.stringify(toolCall(
    2,
    PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
    {},
  ))));
  assert.equal(timedOut.result.isError, true);
  assert.equal(timedOut.result.structuredContent.code, "deadline_exceeded");

  const oversizedString = JSON.parse(await timeoutProtocol.handleLine(JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL, arguments: { value: "x".repeat(64 * 1024 + 1) } },
  })));
  assert.equal(oversizedString.error.code, -32600);
});

test("PR134 accepts initialized metadata and omitted arguments for the empty inspect tool", async () => {
  let inspectCalls = 0;
  const protocol = new PrivateDevLocalVisualMcpProtocolV1({
    inspect: async () => {
      inspectCalls += 1;
      return { status: "ready_to_resume" };
    },
    resume: async () => assert.fail("resume must not run without its required arguments"),
  });

  await protocol.handleLine(JSON.stringify(initializeRequest(1)));
  assert.equal(await protocol.handleLine(JSON.stringify({
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: { _meta: { "test/client": "pr134" } },
  })), null);

  const inspected = JSON.parse(await protocol.handleLine(JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL },
  })));
  assert.equal(inspected.result.isError, false);
  assert.equal(inspected.result.structuredContent.status, "ready_to_resume");
  assert.equal(inspectCalls, 1);

  const invalidResume = JSON.parse(await protocol.handleLine(JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL },
  })));
  assert.equal(invalidResume.error.code, -32602);
});

test("PR134 final publish fails closed if the output directory appears at commit time", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "norma-pr134-publish-race-")));
  let committed = false;
  try {
    await assert.rejects(
      () => writePrivateDevLocalVisualMcpArtifactsAtomically(
        root,
        { "summary.json": "{}\n", "result.json": "{}\n" },
        new AbortController().signal,
        () => { committed = true; },
        {
          rename: async (source, destination) => {
            await mkdir(destination);
            return rename(source, destination);
          },
        },
      ),
      (error) => error?.code === "output_exists",
    );
    assert.equal(committed, false);
    await assert.rejects(readFile(join(root, "norma-output", "result.json"), "utf8"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("PR134 cancellation and write failures remove staging without publishing output", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "norma-pr134-write-")));
  try {
    const controller = new AbortController();
    let openCount = 0;
    await assert.rejects(() => writePrivateDevLocalVisualMcpArtifactsAtomically(
      root,
      { "summary.json": "{}\n", "result.json": "{}\n" },
      controller.signal,
      () => assert.fail("cancelled write must not commit"),
      {
        open: async (...args) => {
          const { open } = await import("node:fs/promises");
          const handle = await open(...args);
          openCount += 1;
          if (openCount === 1) {
            const originalWrite = handle.writeFile.bind(handle);
            handle.writeFile = async (...writeArgs) => {
              await originalWrite(...writeArgs);
              controller.abort("cancelled");
            };
          }
          return handle;
        },
      },
    ));
    assert.equal((await readdir(root)).some((name) => name.startsWith(".norma-output")), false);
    await assert.rejects(readFile(join(root, "norma-output", "result.json"), "utf8"));

    let writes = 0;
    await assert.rejects(
      () => writePrivateDevLocalVisualMcpArtifactsAtomically(
        root,
        { "summary.json": "{}\n", "result.json": "{}\n" },
        new AbortController().signal,
        () => assert.fail("failed write must not commit"),
        {
          open: async (...args) => {
            writes += 1;
            if (writes === 2) throw new Error("simulated write failure");
            const { open } = await import("node:fs/promises");
            return open(...args);
          },
        },
      ),
      (error) => error?.code === "artifact_write_failed",
    );
    assert.equal((await readdir(root)).some((name) => name.startsWith(".norma-output")), false);
    await assert.rejects(readFile(join(root, "norma-output", "result.json"), "utf8"));

    await mkdir(join(root, ".norma-output.lock"));
    await assert.rejects(
      () => writePrivateDevLocalVisualMcpArtifactsAtomically(
        root,
        { "summary.json": "{}\n", "result.json": "{}\n" },
        new AbortController().signal,
        () => assert.fail("busy write must not commit"),
      ),
      (error) => error?.code === "job_busy",
    );
    await rm(join(root, ".norma-output.lock"), { recursive: true, force: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("PR134 entrypoint is disabled by default and contains no provider/network/config surface", async () => {
  const job = await createJob();
  try {
    assert.deepEqual(await runEntrypoint(["--job-root", job.root]), {
      exitCode: 2,
      stdout: "",
      stderr: "disabled_by_default\n",
    });
    assert.deepEqual(await runEntrypoint([
      "--enable-private-dev-visual-pilot", "--job-root", job.root, "--extra",
    ]), {
      exitCode: 1,
      stdout: "",
      stderr: "invalid_cli_usage\n",
    });
    assert.deepEqual(await runEntrypoint([
      "--enable-private-dev-visual-pilot", "--job-root", "relative/job",
    ]), {
      exitCode: 1,
      stdout: "",
      stderr: "invalid_job_root\n",
    });
  } finally {
    await job.cleanup();
  }

  const source = await readFile(BIN, "utf8");
  assert.doesNotMatch(source, /process\.env|api\.openai|\bfetch\b|XMLHttpRequest|WebSocket|node:https?|oauth|bearer/iu);
});

async function createJob() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "norma-pr134-job-")));
  const fixture = createFixture();
  await Promise.all([
    writeFile(join(root, "provider-execution-receipt.json"), `${JSON.stringify(fixture.capture.providerExecutionReceipt)}\n`),
    writeFile(join(root, "candidate-observation.json"), `${JSON.stringify(fixture.capture.candidateObservationEnvelope)}\n`),
    writeFile(join(root, "human-candidate-selection.json"), `${JSON.stringify(fixture.selection)}\n`),
  ]);
  return {
    root,
    fixture,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

function createFixture() {
  const capture = createControlledLocalLiveVisualCandidateCaptureV1({
    sourceImageBytes: pngBytes(640, 480),
    sourceImageMediaType: "image/png",
    rawProviderResponseBytes: providerResponseBytes([
      { x: 0.1, y: 0.15, width: 0.2, height: 0.25, providerConfidence: null },
      { x: 0.5, y: 0.2, width: 0.18, height: 0.3, providerConfidence: null },
    ]),
    responseStatusCode: 200,
    timeoutMs: 30_000,
  });
  return {
    capture,
    selection: createSelection(capture, [0, 1], "operator:private-dev"),
  };
}

function createSelection(capture, indexes, actorId) {
  const candidate = capture.candidateObservationEnvelope;
  return finalizeLocalVisualHumanCandidateSelectionIdentityV1({
    contractId: "norma.local-visual-human-candidate-selection@1",
    contractVersion: 1,
    selectionId: `human-selection:${actorId}:${indexes.join("-")}`,
    candidateObservationId: candidate.observationId,
    candidateObservationContentIdentity: candidate.observationContentIdentity,
    providerExecutionReceiptContentIdentity:
      capture.providerExecutionReceipt.executionReceiptContentIdentity,
    acceptanceActor: { actorClass: "human", actorId },
    geometryAction: "accept_exact",
    selections: indexes.map((candidateIndex, order) => ({
      order,
      candidateId: candidate.rectangleCandidates[candidateIndex].candidateId,
      acceptedPrimitiveId: `accepted-rectangle:${String(order + 1)}`,
    })),
    authority: {
      explicitHumanSelection: true,
      providerAuthority: false,
      confidenceAuthority: false,
      automaticAcceptance: false,
      coordinateCorrectionAllowed: false,
      coordinateRepairAllowed: false,
    },
  });
}

function startServer(jobRoot) {
  const child = spawn(process.execPath, [
    BIN_PATH,
    "--enable-private-dev-visual-pilot",
    "--job-root",
    jobRoot,
  ], { stdio: ["pipe", "pipe", "pipe"], timeout: 10_000 });
  const lines = createInterface({ input: child.stdout });
  const queue = [];
  const waiters = [];
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  lines.on("line", (line) => {
    const value = JSON.parse(line);
    const waiter = waiters.shift();
    if (waiter === undefined) queue.push(value);
    else waiter(value);
  });
  return {
    get stderr() { return stderr; },
    notify(message) { child.stdin.write(`${JSON.stringify(message)}\n`); },
    async request(message) {
      child.stdin.write(`${JSON.stringify(message)}\n`);
      if (queue.length > 0) return queue.shift();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = waiters.indexOf(onResponse);
          if (index >= 0) waiters.splice(index, 1);
          child.kill("SIGKILL");
          reject(new Error("timed out waiting for MCP response"));
        }, 5_000);
        const onResponse = (value) => {
          clearTimeout(timeout);
          resolve(value);
        };
        waiters.push(onResponse);
      });
    },
    async close() {
      child.stdin.end();
      await once(child, "exit");
      lines.close();
    },
  };
}

async function runEntrypoint(args) {
  const child = spawn(process.execPath, [BIN_PATH, ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5_000,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const [exitCode] = await once(child, "exit");
  return { exitCode, stdout, stderr };
}

function initializeRequest(id) {
  return {
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "norma-pr134-test-client", version: "1.0.0" },
    },
  };
}

function toolCall(id, name, args) {
  return { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } };
}

function resumeArgs(inspection) {
  return {
    expectedProviderExecutionReceiptContentIdentity:
      inspection.providerExecutionReceiptContentIdentity,
    expectedCandidateObservationContentIdentity:
      inspection.candidateObservationContentIdentity,
    expectedHumanSelectionContentIdentity: inspection.humanSelectionContentIdentity,
    acceptedAt: ACCEPTED_AT,
    confirmResumeFinalizedSelection: true,
  };
}

function fakeResumeArgs() {
  return {
    expectedProviderExecutionReceiptContentIdentity: `sha256:${"1".repeat(64)}`,
    expectedCandidateObservationContentIdentity: `sha256:${"2".repeat(64)}`,
    expectedHumanSelectionContentIdentity: `sha256:${"3".repeat(64)}`,
    acceptedAt: ACCEPTED_AT,
    confirmResumeFinalizedSelection: true,
  };
}

function pngBytes(width, height) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  setUint32Be(bytes, 8, 13);
  bytes.set([73, 72, 68, 82], 12);
  setUint32Be(bytes, 16, width);
  setUint32Be(bytes, 20, height);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

function providerResponseBytes(rectangles) {
  return new TextEncoder().encode(JSON.stringify({
    id: "response:pr134-stdio-test",
    object: "response",
    status: "completed",
    error: null,
    model: "configured-model",
    output: [{
      id: "message:pr134-stdio-test",
      type: "message",
      status: "completed",
      role: "assistant",
      content: [{
        type: "output_text",
        annotations: [],
        text: JSON.stringify({ schemaVersion: "controlled-rectangle-candidates@1", rectangles }),
      }],
    }],
  }));
}

function setUint32Be(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}
