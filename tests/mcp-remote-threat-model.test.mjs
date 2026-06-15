import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const threatModelPath = join(repoRoot, "docs", "MCP_REMOTE_THREAT_MODEL.md");
const contractDocPath = join(repoRoot, "docs", "MCP_TOOL_CONTRACT.md");
const protocolSourcePath = join(repoRoot, "src", "mcp", "stdio-protocol.ts");
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");
const packageJsonPath = join(repoRoot, "package.json");

test("PR39 remote MCP threat model exists and keeps remote blocked", () => {
  assert.equal(existsSync(threatModelPath), true);
  const doc = readFileSync(threatModelPath, "utf8");

  assertDocMentions(doc, [
    "Remote MCP implementation is not approved",
    "Current approved MCP transport is local STDIO only",
    "PR39 is a threat model and approval gate only",
    "This document does not approve HTTP, SSE, Streamable HTTP, WebSocket",
    "Future implementation requires a separate explicit approval PR",
    "Remote MCP remains blocked after PR39",
    "Local STDIO remains the only approved MCP runtime",
    "No remote implementation is approved by this document",
  ]);
});

test("PR39 threat model covers required remote MCP transport and auth risks", () => {
  const doc = readFileSync(threatModelPath, "utf8");

  assertDocMentions(doc, [
    "Origin validation",
    "DNS rebinding",
    "OAuth 2.1",
    "protected resource metadata",
    "WWW-Authenticate",
    "token audience validation",
    "token passthrough",
    "CORS policy",
    "session ID entropy",
    "rate limits",
    "body size limits",
  ]);
});

test("PR39 threat model covers prompt tool data and source-truth risks", () => {
  const doc = readFileSync(threatModelPath, "utf8");

  assertDocMentions(doc, [
    "prompt injection",
    "tool poisoning",
    "resources: blocked",
    "prompts: blocked",
    "file tools: blocked",
    "network tools: blocked",
    "shell tools: blocked",
    "MCP must not create Norma truth",
    "Prompt text is never source truth",
    "Artifacts are derived and never source truth",
    "Tokens must never be logged",
    "Source objects must not be logged by default",
  ]);
});

test("PR39 threat model lists current tools and keeps arbitrary replay blocked", () => {
  const doc = readFileSync(threatModelPath, "utf8");

  assertDocMentions(doc, [
    "norma.getVersion",
    "norma.serializeCanonicalJson",
    "norma.verifyRun",
    "norma.verifyArtifactFreshness",
    "norma.replayMvpDemo",
    "norma.replayRun`: blocked",
    "arbitrary replay: blocked",
    "approval gate",
    "Proposed Sequence After PR39",
  ]);
});

test("PR39 does not add remote runtime files or package drift", () => {
  const contractDoc = readFileSync(contractDocPath, "utf8");
  const protocolSource = readFileSync(protocolSourcePath, "utf8");
  const wrapperSource = readFileSync(wrapperPath, "utf8");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  assert.match(contractDoc, /Remote MCP is not approved|Remote MCP requires a separate threat model/);
  assert.doesNotMatch(protocolSource, /createServer|listen\(|app\.get|app\.post|router|route|Mcp-Session-Id|WWW-Authenticate/);
  assert.doesNotMatch(wrapperSource, /createServer|listen\(|app\.get|app\.post|router|route|Mcp-Session-Id|WWW-Authenticate/);
  assert.doesNotMatch(
    protocolSource,
    /http|https|sse|streamable|websocket|express|fastify|cors|oauth|auth|token|fetch\(|XMLHttpRequest|WebSocket/i,
  );
  assert.doesNotMatch(
    wrapperSource,
    /http|https|sse|streamable|websocket|express|fastify|cors|oauth|auth|token|fetch\(|XMLHttpRequest|WebSocket/i,
  );

  assert.equal(packageJson.private, true);
  assert.equal(Object.hasOwn(packageJson, "bin"), false);
  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "optionalDependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "peerDependencies"), false);
});

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet), "i"), `${snippet} should be documented`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
