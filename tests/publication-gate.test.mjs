import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SUBPROCESS_TIMEOUT_MS = 30_000;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const gateDocPath = join(repoRoot, "docs", "PUBLIC_PACKAGE_PUBLISHING_GATE.md");
const packageJsonPath = join(repoRoot, "package.json");
const PUBLISH_INSTRUCTION_ALLOWED_CONTEXTS = [
  "do not",
  "must not",
  "forbidden",
  "future",
  "later",
  "not execute",
  "approved in that later",
];
const BROAD_REPO_MATERIAL_PREFIXES = [
  "AGENTS.md",
  "bin/",
  "docs/",
  "examples/",
  "src/",
  "tests/",
  "tsconfig.json",
];

test("PR32 publication gate documents current blockers", () => {
  const doc = readDoc(gateDocPath);

  assertDocMentions(doc, [
    "blocked_until_explicit_publication_approval",
    "private: true",
    "dist",
    "npm pack --dry-run",
    "scope ownership",
    "provenance",
    "license",
    "human release approval",
  ]);
});

test("PR32 publication gate preserves no-publish rules", () => {
  const doc = readDoc(gateDocPath);

  assertDocMentions(doc, [
    "PR32 does not publish",
    "Do not run npm publish",
    "Do not run npm version",
    "Do not create, move, or delete git tags",
    "Do not remove private: true",
  ]);

  const badInstructions = forbiddenStandalonePublishInstructions(doc);

  assert.deepEqual(badInstructions, []);
});

test("PR32 publication gate documents future package-change requirements", () => {
  const doc = readDoc(gateDocPath);

  assertDocMentions(doc, [
    "files allowlist",
    "dist/src/index.js",
    "dist/src/index.d.ts",
    "packed tarball",
    "TypeScript types",
    "README.md",
    "LICENSE",
    "package-level bin",
  ]);
});

test("PR32 publication gate keeps package metadata unchanged", () => {
  const packageJson = parsePackageJson();

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });

  for (const fieldName of [
    "publishConfig",
    "bin",
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    assert.equal(Object.hasOwn(packageJson, fieldName), false, `${fieldName} should stay absent`);
  }

  assertPackageScriptsAvoidCommands(packageJson);
});

test("PR32 dry-run package audit remains informational", () => {
  const doc = readDoc(gateDocPath);
  const { packageObject, filePaths } = readDryRunPackageAudit();

  assert.match(doc, /dry-run inspection is informational only/i);
  assertMissingDistBlockerDocumentedWhenPresent(doc, filePaths);
  assertBroadRepoMaterialBlockerDocumentedWhenPresent(doc, filePaths);
});

function readDryRunPackageAudit() {
  const packOutput = runNpmPackDryRunJson();
  const packageObject = packOutput[0];
  assert.ok(packageObject, "npm pack output should include a package object");
  assert.match(`${packageObject.id ?? packageObject.name ?? ""}`, /@norma\/core/);
  assertFilesArrayWhenPresent(packageObject);
  return { packageObject, filePaths: extractPackFilePaths(packOutput) };
}

function assertFilesArrayWhenPresent(packageObject) {
  if ("files" in packageObject) {
    assert.equal(Array.isArray(packageObject.files), true);
  }
}

function assertMissingDistBlockerDocumentedWhenPresent(doc, filePaths) {
  const missingDist =
    !filePaths.includes("dist/src/index.js") || !filePaths.includes("dist/src/index.d.ts");
  if (missingDist) {
    assert.match(doc, /missing dist\/ is a blocker/i);
  }
}

function assertBroadRepoMaterialBlockerDocumentedWhenPresent(doc, filePaths) {
  const broadRepoMaterialPresent = filePaths.some(isBroadRepoMaterial);
  if (broadRepoMaterialPresent) {
    assert.match(doc, /broad repo material is a blocker/i);
  }
}

test("PR32 publication gate documents consumer and CLI boundaries", () => {
  const doc = readDoc(gateDocPath);

  assertDocMentions(doc, [
    "docs/CONSUMER_COMPATIBILITY.md",
    "@norma/core",
    "no SDK runtime",
    "no API",
    "no MCP",
    "local-only CLI",
    "package-level bin",
    "source truth",
    "artifacts",
  ]);
});

test("PR32 publication gate records npm official rule references", () => {
  const doc = readDoc(gateDocPath);

  assertDocMentions(doc, [
    "npm publish --access public",
    "npm pack --dry-run",
    "provenance",
    "scoped package",
    "2FA",
    "name/version",
    "https://docs.npmjs.com/",
  ]);
});

test("PR32 publication gate does not add publish scripts or release metadata", () => {
  const packageJson = parsePackageJson();

  for (const fieldName of ["publishConfig", "bin"]) {
    assert.equal(Object.hasOwn(packageJson, fieldName), false, `${fieldName} should stay absent`);
  }

  const scripts = packageJson.scripts ?? {};
  for (const scriptName of [
    "publish",
    "release",
    "prepack",
    "postpack",
    "prepublishOnly",
    "version",
  ]) {
    assert.equal(Object.hasOwn(scripts, scriptName), false, `${scriptName} script should stay absent`);
  }

  assertPackageScriptsAvoidCommands(packageJson);
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function parsePackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8"));
}

function runNpmPackDryRunJson() {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: SUBPROCESS_TIMEOUT_MS,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.notEqual(result.stdout.trim(), "", "npm pack should produce JSON stdout");

  const parsed = JSON.parse(result.stdout);
  assert.equal(Array.isArray(parsed), true, "npm pack JSON output should be an array");
  assert.ok(parsed.length > 0, "npm pack JSON output should include at least one package");
  return parsed;
}

function extractPackFilePaths(packOutput) {
  return packOutput.flatMap((packageObject) => {
    if (!Array.isArray(packageObject.files)) {
      return [];
    }
    return packageObject.files
      .map((entry) => entry?.path)
      .filter((path) => typeof path === "string");
  });
}

function assertDocMentions(doc, phrases) {
  for (const phrase of phrases) {
    assert.match(doc, new RegExp(escapeRegExp(phrase), "i"), `${phrase} should be documented`);
  }
}

function assertPackageScriptsAvoidCommands(packageJson) {
  const scripts = packageJson.scripts ?? {};
  for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
    assert.doesNotMatch(scriptName, /^(?:publish|release|version)$/i);
    assert.doesNotMatch(scriptCommand, /\bnpm\s+(?:publish|version|dist-tag|access|owner|unpublish)\b/i);
    assert.doesNotMatch(scriptCommand, /\bgit\s+tag\b/i);
  }
}

function forbiddenStandalonePublishInstructions(doc) {
  return doc.split(/\r?\n/).filter(isStandalonePublishInstruction);
}

function isStandalonePublishInstruction(line) {
  const normalized = line.toLowerCase();
  return looksLikePublishInstruction(normalized) && !isForbiddenOrFutureContext(normalized);
}

function looksLikePublishInstruction(value) {
  return /\b(?:run|execute)\s+`?npm publish\b/.test(value) || /\bpublish now\b/.test(value);
}

function isForbiddenOrFutureContext(value) {
  return PUBLISH_INSTRUCTION_ALLOWED_CONTEXTS.some((phrase) => value.includes(phrase));
}

function isBroadRepoMaterial(filePath) {
  return BROAD_REPO_MATERIAL_PREFIXES.some((prefix) => pathMatchesPrefix(filePath, prefix));
}

function pathMatchesPrefix(filePath, prefix) {
  const exactPath = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return filePath === exactPath || filePath.startsWith(prefix);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
