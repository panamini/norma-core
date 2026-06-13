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
  assert.equal(trimmed.split("\n").length, 1);
  return JSON.parse(trimmed);
}

function withTempDir(callback) {
  const dir = mkdtempSync(join(tmpdir(), "norma-core-cli-"));
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

function createTruthPath() {
  const input = core.createMvpDemoInput();
  const result = core.runMvpDemo(input);
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return { input, demo: result.output };
}

function verifyRunInput(demo) {
  return {
    run: demo.runEnvelope,
    mode: "audit_only",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    expectedOutputRefs: demo.runEnvelope.outputRefs,
    expectedOperationName: demo.runEnvelope.operationName,
    expectedOperationVersion: demo.runEnvelope.operationVersion,
  };
}

function replayRunInput(input, demo) {
  return {
    run: demo.runEnvelope,
    mvpDemoInput: input,
    recordedMvpResult: demo,
    packLock: demo.packLock,
    operationContext: demo.operationContext,
  };
}

test("PR27 CLI version prints JSON core version", () => {
  const result = runCli(["version"]);
  assert.equal(result.status, 0);
  const json = parseCliJson(result);

  assert.deepEqual(json, {
    kind: "norma-core-cli-result",
    command: "version",
    status: "ok",
    coreVersion: core.CORE_VERSION,
    exitCode: 0,
  });
});

test("PR27 CLI help prints JSON command list", () => {
  for (const helpArg of ["help", "--help"]) {
    const result = runCli([helpArg]);
    assert.equal(result.status, 0);
    const json = parseCliJson(result);

    assert.equal(json.kind, "norma-core-cli-result");
    assert.equal(json.command, "help");
    assert.equal(json.status, "ok");
    assert.equal(json.coreVersion, core.CORE_VERSION);
    assert.equal(json.exitCode, 0);
    assert.deepEqual(json.commands, [
      "version",
      "mvp-demo",
      "verify-run <input.json>",
      "verify-artifact-freshness <input.json>",
      "replay-run <input.json>",
      "help",
      "--help",
    ]);
    assert.equal(json.inputRequirements["verify-run"], "explicit JSON file");
    assert.equal(json.notes.localOnly, true);
    assert.equal(json.notes.createsNormaTruth, false);
  }
});

test("PR27 CLI mvp-demo runs the MVP truth path", () => {
  const result = runCli(["mvp-demo"]);
  assert.equal(result.status, 0);
  const json = parseCliJson(result);

  assert.equal(json.kind, "norma-core-cli-result");
  assert.equal(json.command, "mvp-demo");
  assert.equal(json.status, "ok");
  assert.equal(json.coreVersion, core.CORE_VERSION);
  assert.equal(json.exitCode, 0);
  assert.equal(json.result.status, "ok");
  assert.equal(json.result.output.kind, "mvp-demo-result");
  assert.equal(json.result.output.demoReport.truthSource, "structured-core-objects");
});

test("PR27 CLI verify-run accepts explicit JSON input", () => {
  withTempDir((dir) => {
    const { demo } = createTruthPath();
    const inputPath = writeJson(dir, "verify-run.json", verifyRunInput(demo));
    const before = readFileSync(inputPath, "utf8");

    const result = runCli(["verify-run", inputPath]);
    assert.equal(result.status, 0);
    const json = parseCliJson(result);

    assert.equal(json.kind, "norma-core-cli-result");
    assert.equal(json.command, "verify-run");
    assert.equal(json.status, "ok");
    assert.equal(json.exitCode, 0);
    assert.equal(json.result.kind, "run-verification");
    assert.equal(json.result.status, "verified");
    assert.equal(json.result.operationName, "core.mvp-demo.run");
    assert.equal(readFileSync(inputPath, "utf8"), before);
  });
});

test("PR27 CLI replay-run accepts explicit MVP replay JSON input", () => {
  withTempDir((dir) => {
    const { input, demo } = createTruthPath();
    const inputPath = writeJson(dir, "replay-run.json", replayRunInput(input, demo));

    const result = runCli(["replay-run", inputPath]);
    assert.equal(result.status, 0);
    const json = parseCliJson(result);

    assert.equal(json.kind, "norma-core-cli-result");
    assert.equal(json.command, "replay-run");
    assert.equal(json.status, "ok");
    assert.equal(json.exitCode, 0);
    assert.equal(json.result.kind, "run-replay");
    assert.equal(json.result.status, "replayed");
    assert.equal(json.result.replayAttempted, true);
  });
});

test("PR27 CLI verify-artifact-freshness returns structured JSON for invalid minimal input", () => {
  withTempDir((dir) => {
    const inputPath = writeJson(dir, "minimal-artifact-freshness.json", {});

    const result = runCli(["verify-artifact-freshness", inputPath]);
    assert.equal(result.status, 2);
    const json = parseCliJson(result);

    assert.equal(json.kind, "norma-core-cli-result");
    assert.equal(json.command, "verify-artifact-freshness");
    assert.equal(json.status, "ok");
    assert.equal(json.exitCode, 2);
    assert.equal(json.result.kind, "artifact-freshness-verification");
    assert.equal(json.result.status, "invalid");
    assert.equal(json.result.errors.some((error) => error.code === "InvalidArtifactInput"), true);
  });
});

test("PR27 CLI rejects missing command with JSON error", () => {
  const result = runCli([]);
  assert.equal(result.status, 1);
  const json = parseCliJson(result);

  assert.equal(json.kind, "norma-core-cli-error");
  assert.equal(json.command, null);
  assert.equal(json.status, "error");
  assert.equal(json.coreVersion, core.CORE_VERSION);
  assert.equal(json.exitCode, 1);
  assert.equal(json.error.code, "InvalidCliInput");
  assert.equal(json.error.message, "Command is required.");
});

test("PR27 CLI rejects unknown commands with JSON error", () => {
  const result = runCli(["unknown-command"]);
  assert.equal(result.status, 1);
  const json = parseCliJson(result);

  assert.equal(json.kind, "norma-core-cli-error");
  assert.equal(json.command, "unknown-command");
  assert.equal(json.status, "error");
  assert.equal(json.coreVersion, core.CORE_VERSION);
  assert.equal(json.exitCode, 1);
  assert.equal(json.error.code, "InvalidCliInput");
});

test("PR27 CLI rejects invalid JSON with JSON error", () => {
  withTempDir((dir) => {
    const inputPath = join(dir, "invalid.json");
    writeFileSync(inputPath, "{ invalid json\n");

    const result = runCli(["verify-run", inputPath]);
    assert.equal(result.status, 1);
    const json = parseCliJson(result);

    assert.equal(json.kind, "norma-core-cli-error");
    assert.equal(json.command, "verify-run");
    assert.equal(json.status, "error");
    assert.equal(json.coreVersion, core.CORE_VERSION);
    assert.equal(json.exitCode, 1);
    assert.equal(json.error.code, "InvalidCliInput");
  });
});

test("PR27 CLI keeps package metadata unchanged", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.version, "0.1.0");
  assert.equal("bin" in packageJson, false);
  assert.equal("publishConfig" in packageJson, false);
  assert.equal("dependencies" in packageJson, false);
  assert.equal("optionalDependencies" in packageJson, false);
  assert.equal("peerDependencies" in packageJson, false);
});
