import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "@norma/core";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const cliDocPath = join(repoRoot, "docs", "CLI.md");

function runCli(args) {
  return spawnSync(process.execPath, ["bin/norma-core.mjs", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function parseCliJson(result) {
  assert.equal(result.stderr, "");
  const trimmed = result.stdout.trim();
  assert.notEqual(trimmed, "");
  return JSON.parse(trimmed);
}

function readCliDoc() {
  return readFileSync(cliDocPath, "utf8");
}

function withTempDir(callback) {
  const dir = mkdtempSync(join(tmpdir(), "norma-core-cli-contract-"));
  try {
    return callback(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeJson(dir, fileName, value) {
  const filePath = join(dir, fileName);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}

function assertResultEnvelope(json, command, exitCode) {
  assert.equal(json.kind, "norma-core-cli-result");
  assert.equal(json.command, command);
  assert.equal(json.status, "ok");
  assert.equal(json.coreVersion, core.CORE_VERSION);
  assert.equal(json.exitCode, exitCode);
}

function assertErrorEnvelope(json, command, exitCode) {
  assert.equal(json.kind, "norma-core-cli-error");
  assert.equal(json.command, command);
  assert.equal(json.status, "error");
  assert.equal(json.coreVersion, core.CORE_VERSION);
  assert.equal(json.exitCode, exitCode);
  assert.equal(json.error.code, "InvalidCliInput");
  assert.equal(typeof json.error.message, "string");
}

function assertRequiredKeys(json, keys) {
  for (const key of keys) {
    assert.equal(Object.hasOwn(json, key), true, `${key} should be present`);
  }
}

test("PR28 documents CLI command list covered by help output", () => {
  const helpResult = runCli(["help"]);
  assert.equal(helpResult.status, 0);
  const help = parseCliJson(helpResult);
  const doc = readCliDoc();

  assertResultEnvelope(help, "help", 0);
  assert.deepEqual(help.commands, [
    "version",
    "mvp-demo",
    "verify-run <input.json>",
    "verify-artifact-freshness <input.json>",
    "replay-run <input.json>",
    "help",
    "--help",
  ]);

  for (const command of help.commands) {
    assert.match(doc, new RegExp(`node bin/norma-core\\.mjs ${escapeRegExp(command)}`));
  }
});

test("PR28 CLI result envelope keeps required top-level fields", () => {
  const versionResult = runCli(["version"]);
  assert.equal(versionResult.status, 0);
  const version = parseCliJson(versionResult);

  assertRequiredKeys(version, [
    "kind",
    "command",
    "status",
    "coreVersion",
    "exitCode",
  ]);
  assertResultEnvelope(version, "version", 0);
});

test("PR28 CLI error envelope keeps required top-level fields", () => {
  const missingInput = runCli(["verify-run"]);
  assert.equal(missingInput.status, 1);
  const json = parseCliJson(missingInput);

  assertRequiredKeys(json, [
    "kind",
    "command",
    "status",
    "coreVersion",
    "exitCode",
    "error",
  ]);
  assertErrorEnvelope(json, "verify-run", 1);
});

test("PR28 CLI operation non-success uses exit code 2 with result envelope", () => {
  withTempDir((dir) => {
    const inputPath = writeJson(dir, "invalid-artifact-freshness.json", {});
    const result = runCli(["verify-artifact-freshness", inputPath]);
    assert.equal(result.status, 2);
    const json = parseCliJson(result);

    assertResultEnvelope(json, "verify-artifact-freshness", 2);
    assert.equal(json.result.kind, "artifact-freshness-verification");
    assert.equal(json.result.status, "invalid");
    assert.equal(json.result.errors.some((error) => error.code === "InvalidArtifactInput"), true);
  });
});

test("PR28 docs mention every implemented CLI command", () => {
  const doc = readCliDoc();
  const help = parseCliJson(runCli(["help"]));

  for (const command of help.commands) {
    assert.match(doc, new RegExp(`node bin/norma-core\\.mjs ${escapeRegExp(command)}`));
  }
});

test("PR28 docs preserve local-only non-goals and output policy", () => {
  const doc = readCliDoc();
  const lowerDoc = doc.toLowerCase();

  for (const phrase of [
    "local-only",
    "no sdk",
    "no api",
    "no mcp",
    "no adapter",
    "no package publish",
    "no new norma logic",
    "json output envelope",
    "exit code policy",
  ]) {
    assert.match(lowerDoc, new RegExp(escapeRegExp(phrase)));
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
