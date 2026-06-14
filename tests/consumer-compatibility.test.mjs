import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const examplePath = join(repoRoot, "examples", "consumer", "v1-5-trust-layer.ts");
const consumerTsconfigPath = join(repoRoot, "examples", "consumer", "tsconfig.json");
const compatibilityDocPath = join(repoRoot, "docs", "CONSUMER_COMPATIBILITY.md");
const distIndexPath = join(repoRoot, "dist", "src", "index.js");
const distTypesPath = join(repoRoot, "dist", "src", "index.d.ts");
const consumerTypecheckTimeoutMs = 10_000;

const approvedPackageRootExports = [
  "CORE_VERSION",
  "STABLE_SERIALIZATION_VERSION",
  "DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY",
  "serializeCanonicalJson",
  "canonicalizeForSerialization",
  "canonicalizeRefs",
  "canonicalizeOutputRefs",
  "canonicalizeDiagnostics",
  "canonicalizeWarnings",
  "canonicalizeErrors",
  "verifyArtifactFreshness",
  "verifyRun",
  "replayRun",
  "createMvpDemoInput",
  "runMvpDemo",
];

test("PR31 typed consumer example imports only from the package root", () => {
  const source = readFileSync(examplePath, "utf8");

  assert.match(source, /from "@norma\/core"/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:\.\.\/)*src(?:\/|["'])/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(?:\.\.\/)*dist(?:\/|["'])/);
  assert.doesNotMatch(source, /\bclass\s+NormaClient\b/);
  assert.doesNotMatch(source, /\bcreateSdk\b/);
  assert.doesNotMatch(source, /\bcreateClient\b/);
  assert.doesNotMatch(source, /\bconsole\.log\b/);
  assert.match(source, /\bexport\s+const\s+consumerSummary\b/);
});

test("PR31 typed consumer example compiles against built package types", () => {
  const tscPath = join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");

  assert.equal(existsSync(distIndexPath), true, "dist/src/index.js should exist after build");
  assert.equal(existsSync(distTypesPath), true, "dist/src/index.d.ts should exist after build");
  assert.equal(existsSync(tscPath), true, "local TypeScript binary should exist");
  assert.equal(existsSync(consumerTsconfigPath), true, "consumer tsconfig should exist");

  const result = spawnSync(tscPath, ["-p", "examples/consumer/tsconfig.json", "--noEmit"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: consumerTypecheckTimeoutMs,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("PR31 consumer tsconfig checks package declarations", () => {
  const consumerTsconfig = JSON.parse(readFileSync(consumerTsconfigPath, "utf8"));

  assert.equal(consumerTsconfig.compilerOptions?.skipLibCheck, false);
  assert.equal(consumerTsconfig.compilerOptions?.noUncheckedIndexedAccess, true);
  assert.equal(consumerTsconfig.compilerOptions?.exactOptionalPropertyTypes, true);
});

test("PR31 compatibility docs mention approved package-root exports", () => {
  const doc = readFileSync(compatibilityDocPath, "utf8");

  for (const exportName of approvedPackageRootExports) {
    assert.match(doc, new RegExp(`\\b${escapeRegExp(exportName)}\\b`), `${exportName} should be documented`);
  }
});

test("PR31 compatibility docs preserve result handling rules", () => {
  const doc = readFileSync(compatibilityDocPath, "utf8");
  const lowerDoc = doc.toLowerCase();

  for (const phrase of [
    "boolean `valid`",
    "status",
    "warnings",
    "errors",
    "provenance",
    "mismatches",
    "artifactfreshness",
    "unknown statuses",
    "non-success",
  ]) {
    assert.match(lowerDoc, new RegExp(escapeRegExp(phrase.toLowerCase())));
  }
});

test("PR31 compatibility docs preserve source-truth and publication boundaries", () => {
  const doc = readFileSync(compatibilityDocPath, "utf8");
  const lowerDoc = doc.toLowerCase();

  for (const phrase of [
    "structured source objects",
    "artifacts are derived",
    "prompt text is never source truth",
    "package remains private",
    "npm pack --dry-run",
    "not publication approval",
    "no npm publish",
    "no sdk runtime",
    "no api",
    "no mcp",
    "no adapter",
  ]) {
    assert.match(lowerDoc, new RegExp(escapeRegExp(phrase)));
  }
});

test("PR31 keeps package metadata unchanged", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

  assert.deepEqual({
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    private: packageJson.private,
    rootExport: packageJson.exports?.["."],
  }, {
    name: "@norma/core",
    version: "0.1.0",
    type: "module",
    private: true,
    rootExport: {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });

  for (const fieldName of [
    "publishConfig",
    "bin",
    "files",
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    assert.equal(Object.hasOwn(packageJson, fieldName), false, `${fieldName} should stay absent`);
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
