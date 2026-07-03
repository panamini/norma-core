import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import test from "node:test";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const subprocessTimeoutMs = 60_000;

const requiredTarballFiles = [
  "README.md",
  "dist/src/index.d.ts",
  "dist/src/index.js",
  "dist/src/local-report/guided-inspection-artifact-contract.d.ts",
  "dist/src/local-report/guided-inspection-artifact-contract.js",
  "dist/src/local-report/guided-inspection-consumer-proof.d.ts",
  "dist/src/local-report/guided-inspection-consumer-proof.js",
  "dist/src/local-report/guided-inspection-package-api-v1.d.ts",
  "dist/src/local-report/guided-inspection-package-api-v1.js",
  "package.json",
].sort();

const allowedTarballPathPatterns = [
  /^README\.md$/u,
  /^package\.json$/u,
  /^dist\/src\/.*\.(?:d\.ts|js)$/u,
];

const forbiddenTarballPathPatterns = [
  /^\.github\//u,
  /^AGENTS\.md$/u,
  /^bin\//u,
  /^docs\//u,
  /^examples\//u,
  /^src\/.*\.ts$/u,
  /^tests\//u,
  /^viewer\//u,
  /^(?:package-lock|pnpm-lock|yarn\.lock)/u,
  /^tsconfig\.json$/u,
];

const forbiddenTarballDecoys = [
  [".github", "workflows", "release.yml"],
  ["AGENTS.md"],
  ["bin", "norma-cli.mjs"],
  ["docs", "PUBLIC_PACKAGE_PUBLISHING_GATE.md"],
  ["examples", "structured-analyze", "basic-grid-alignment.json"],
  ["src", "index.ts"],
  ["tests", "guided-inspection-package-root-api.test.mjs"],
  ["viewer", "read-only-result-viewer.html"],
  ["package-lock.json"],
  ["tsconfig.json"],
];

test("PR99 package metadata stays private and local-only with a minimal files allowlist", async () => {
  const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.private, true);
  assert.deepEqual(packageJson.files, [
    "dist/src/**/*.d.ts",
    "dist/src/**/*.js",
    "README.md",
  ]);
  assert.deepEqual(Object.keys(packageJson.exports).sort(), ["."]);
  assert.equal(packageJson.exports["."].types, "./dist/src/index.d.ts");
  assert.equal(packageJson.exports["."].default, "./dist/src/index.js");

  for (const fieldName of [
    "bin",
    "publishConfig",
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    assert.equal(Object.hasOwn(packageJson, fieldName), false, `${fieldName} should stay absent`);
  }

  assert.deepEqual(Object.keys(packageJson.devDependencies).sort(), ["typescript"]);
});

test("PR99 npm pack tarball is intentionally bounded", async () => {
  const { files, cleanup } = await packFromTempWorkspace();

  try {
    const tarballFiles = files.map((file) => file.path).sort();

    for (const requiredTarballFile of requiredTarballFiles) {
      assert.equal(tarballFiles.includes(requiredTarballFile), true, requiredTarballFile);
    }

    for (const tarballFile of tarballFiles) {
      assert.equal(
        allowedTarballPathPatterns.some((allowedPattern) => allowedPattern.test(tarballFile)),
        true,
        tarballFile,
      );

      for (const forbiddenPattern of forbiddenTarballPathPatterns) {
        assert.doesNotMatch(tarballFile, forbiddenPattern, tarballFile);
      }
    }
  } finally {
    await cleanup();
  }
});

test("PR99 packed tarball installs and imports from a temp external-style consumer", async () => {
  const { packedTarballPath, cleanup } = await packFromTempWorkspace();
  const consumerRoot = await mkTempDir("norma-pr99-consumer-");

  try {
    await writeFile(
      join(consumerRoot, "package.json"),
      `${JSON.stringify({ type: "module", private: true }, null, 2)}\n`,
    );
    await run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", packedTarballPath], {
      cwd: consumerRoot,
      timeout: subprocessTimeoutMs,
    });

    const proofScriptPath = join(consumerRoot, "proof.mjs");
    await writeFile(proofScriptPath, consumerProofScript());

    const { stdout, stderr } = await run(process.execPath, [proofScriptPath], {
      cwd: consumerRoot,
      timeout: subprocessTimeoutMs,
    });
    const proof = JSON.parse(stdout);

    assert.equal(stderr, "");
    assert.deepEqual(proof, {
      exportedFunctions: [
        "consumeGuidedInspectionDemoEnvelopeV1",
        "createGuidedInspectionArtifactContractV1",
      ],
      canonicalTruth: "result.json",
      resultRole: "canonical-truth",
      derivedArtifacts: [
        ["guide.html", "derived-inspection-artifact", true],
        ["report.html", "derived-inspection-artifact", false],
        ["visual.svg", "derived-inspection-artifact", false],
        ["summary.json", "derived-inspection-artifact", false],
        ["summary.md", "derived-inspection-artifact", false],
      ],
      localOnly: true,
      hasPackageLevelBin: false,
    });
  } finally {
    await cleanup();
    await rm(consumerRoot, { recursive: true, force: true });
  }
});

test("PR99 docs keep publication auth tag release provenance hosted provider and source-truth expansion blocked", async () => {
  const decisionDoc = await readFile(
    join(repoRoot, "docs", "decisions", "2026-07-03-package-tarball-local-install-readiness.md"),
    "utf8",
  );
  const roadmap = await readFile(join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md"), "utf8");
  const combinedDocs = `${decisionDoc}\n${roadmap}`;

  for (const snippet of [
    "PR99 does not publish `@norma/core`",
    "PR99 keeps `private: true`",
    "No package-level `bin` is approved",
    "PR99 requires `npm pack --json` evidence",
    "temporary external-style consumer",
    "`result.json` remains the canonical machine-consumable Norma truth",
    "`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` remain derived local inspection artifacts only",
    "PR100: decide public package publish authorization and release operations boundary",
  ]) {
    assert.match(combinedDocs, new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "i"), snippet);
  }

  for (const blockedSurface of [
    "npm publish",
    "registry mutation",
    "npm auth setup",
    "provenance setup",
    "release workflow",
    "git tag",
    "release/version bump",
    "dependency changes",
    "lockfile changes",
    "hosted MCP",
    "ChatGPT connector runtime",
    "OpenAI/provider calls",
    "image/CAD/Figma/provider adapters",
    "public package publication",
  ]) {
    assertNoApproval(combinedDocs, blockedSurface);
  }
});

async function packFromTempWorkspace() {
  assert.equal(existsSync(join(repoRoot, "dist", "src", "index.js")), true, "run npm run build before PR99 pack proof");

  const packRoot = await mkTempDir("norma-pr99-pack-");
  await copyFile(join(repoRoot, "package.json"), join(packRoot, "package.json"));
  await copyFile(join(repoRoot, "README.md"), join(packRoot, "README.md"));
  await mkdir(join(packRoot, "dist"), { recursive: true });
  await cp(join(repoRoot, "dist", "src"), join(packRoot, "dist", "src"), { recursive: true });
  await seedForbiddenTarballDecoys(packRoot);

  const { stdout } = await run("npm", ["pack", "--json"], {
    cwd: packRoot,
    timeout: subprocessTimeoutMs,
  });
  const packResult = JSON.parse(stdout);
  assert.equal(Array.isArray(packResult), true);
  assert.equal(packResult.length, 1);

  const [packed] = packResult;
  const packedTarballPath = join(packRoot, packed.filename);
  assert.equal(existsSync(packedTarballPath), true);

  return {
    files: packed.files,
    packedTarballPath,
    cleanup: () => rm(packRoot, { recursive: true, force: true }),
  };
}

async function mkTempDir(prefix) {
  const { mkdtemp } = await import("node:fs/promises");

  return mkdtemp(join(tmpdir(), prefix));
}

async function run(command, args, options) {
  return execFileAsync(command, args, {
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
}

async function seedForbiddenTarballDecoys(packRoot) {
  for (const pathParts of forbiddenTarballDecoys) {
    const decoyPath = join(packRoot, ...pathParts);
    await mkdir(dirname(decoyPath), { recursive: true });
    await writeFile(decoyPath, "forbidden tarball decoy\n");
  }
}

function consumerProofScript() {
  return `
import * as packageRoot from "@norma/core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const packageJson = JSON.parse(await readFile(join("node_modules", "@norma", "core", "package.json"), "utf8"));
const outputDir = "/tmp/norma-pr99-guided-consumer";
const envelope = {
  status: "ok",
  outputDir,
  resultJson: join(outputDir, "result.json"),
  guideHtml: join(outputDir, "guide.html"),
  reportHtml: join(outputDir, "report.html"),
  visualSvg: join(outputDir, "visual.svg"),
  summaryJson: join(outputDir, "summary.json"),
  summaryMarkdown: join(outputDir, "summary.md"),
  canonicalTruth: "result.json",
  derivedArtifacts: true,
  localOnly: true,
};
const proof = packageRoot.consumeGuidedInspectionDemoEnvelopeV1(envelope);

console.log(JSON.stringify({
  exportedFunctions: Object.keys(packageRoot)
    .filter((name) => name.includes("GuidedInspection"))
    .sort(),
  canonicalTruth: proof.canonicalTruth,
  resultRole: proof.resultJson.role,
  derivedArtifacts: proof.derivedArtifacts.map((artifact) => [
    artifact.name,
    artifact.role,
    artifact.required,
  ]),
  localOnly: proof.localOnly,
  hasPackageLevelBin: Object.hasOwn(packageJson, "bin"),
}));
`;
}

function assertNoApproval(doc, surface) {
  for (const approvalPattern of approvalPatterns(surface)) {
    assert.doesNotMatch(
      doc,
      approvalPattern,
      `${surface} approval wording must remain absent`,
    );
  }
}

function approvalPatterns(surface) {
  const surfacePattern = escapeRegExp(surface).replace(/\s+/g, "\\s+");
  const separator = "[\\s:;,.-]+";

  return [
    new RegExp(`\\b${surfacePattern}\\b(?:\\s+(?:is|are|was|were))?${separator}approved\\b`, "i"),
    new RegExp(`(?:^|[\\n.;])\\s*(?:[-*]\\s*)?approved\\b${separator}${surfacePattern}\\b`, "i"),
    new RegExp(`(?:^|[\\n.;])\\s*(?:PR99|this\\s+decision|the\\s+decision|this\\s+PR|the\\s+PR)\\s+approv(?:e|es|ed|ing)\\b[^\\n.;]*\\b${surfacePattern}\\b`, "i"),
  ];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
