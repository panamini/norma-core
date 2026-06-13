import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "@norma/core";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const expectedFunctionExports = [
  "createMvpDemoInput",
  "runMvpDemo",
  "verifyArtifactFreshness",
  "verifyRun",
  "replayRun",
  "serializeCanonicalJson",
  "canonicalizeForSerialization",
  "canonicalizeRefs",
  "canonicalizeOutputRefs",
  "canonicalizeDiagnostics",
  "canonicalizeWarnings",
  "canonicalizeErrors",
];

const expectedConstantExports = [
  "CORE_VERSION",
  "DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY",
  "STABLE_SERIALIZATION_VERSION",
];

const forbiddenExports = [
  "createCli",
  "runCli",
  "createSdk",
  "createClient",
  "createApi",
  "createServer",
  "createMcp",
  "createMcpServer",
  "createAdapter",
  "camera",
  "image",
  "vision",
  "cad",
  "cloud",
  "plugin",
  "marketplace",
];

test("PR25 imports the built package root through @norma/core", () => {
  assert.equal(typeof core, "object");
  assert.equal(core.CORE_VERSION, "0.1.0-pr12");
});

test("PR25 exposes approved V1.5 trust-layer exports from the package root", () => {
  for (const exportName of expectedFunctionExports) {
    assert.equal(typeof core[exportName], "function", `${exportName} should be exported`);
  }

  for (const exportName of expectedConstantExports) {
    assert.ok(exportName in core, `${exportName} should be exported`);
  }

  assert.equal(core.STABLE_SERIALIZATION_VERSION, "stable-serialization-v1");
});

test("PR25 keeps CLI SDK API MCP adapter and media/CAD surfaces absent", () => {
  for (const exportName of forbiddenExports) {
    assert.equal(exportName in core, false, `${exportName} must not be exported`);
  }
});

test("PR25 preserves private package metadata and root export targets", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.version, "0.1.0");

  assert.equal("bin" in packageJson, false);
  assert.equal("publishConfig" in packageJson, false);
  assert.equal("dependencies" in packageJson, false);
  assert.equal("optionalDependencies" in packageJson, false);
  assert.equal("peerDependencies" in packageJson, false);

  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });

  assert.equal(existsSync(join(repoRoot, "dist/src/index.js")), true);
  assert.equal(existsSync(join(repoRoot, "dist/src/index.d.ts")), true);
});

test("PR25 runs a minimal package-root MVP verification smoke path", () => {
  const input = core.createMvpDemoInput();
  const result = core.runMvpDemo(input);

  assert.equal(result.status, "ok");
  assert.ok(result.output);

  const demo = result.output;
  const verificationInput = {
    run: demo.runEnvelope,
    mode: "audit_only",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    expectedOutputRefs: [...demo.runEnvelope.outputRefs.refs].reverse(),
    expectedOperationName: demo.runEnvelope.operationName,
    expectedOperationVersion: demo.runEnvelope.operationVersion,
  };
  const verification = core.verifyRun(verificationInput);

  assert.equal(verification.kind, "run-verification");
  assert.equal(verification.status, "verified");
  assert.equal(verification.mode, "audit_only");
  assert.equal(verification.operationName, "core.mvp-demo.run");
  assert.deepEqual({
    replayAttempted: verification.replaySummary.replayAttempted,
    replayRequired: verification.replaySummary.replayRequired,
  }, {
    replayAttempted: false,
    replayRequired: false,
  });
  assert.ok(Array.isArray(verification.warnings));
  assert.ok(Array.isArray(verification.errors));
});
