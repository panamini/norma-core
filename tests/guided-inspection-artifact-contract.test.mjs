import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createGuidedInspectionArtifactContract } from "../dist/src/local-report/guided-inspection-artifact-contract.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const outputDir = join(repoRoot, "tmp", "nonexistent-guided-inspection-output");
const helperSourcePath = join(repoRoot, "src", "local-report", "guided-inspection-artifact-contract.ts");

test("missing result.json throws a deterministic error", () => {
  assert.throws(
    () => createGuidedInspectionArtifactContract({
      outputDir,
      artifacts: ["guide.html", "summary.json"],
    }),
    /requires result\.json/,
  );
});

test("result.json maps to canonicalTruth and resultJson without filesystem dependency", () => {
  const contract = createGuidedInspectionArtifactContract({
    outputDir,
    artifacts: ["result.json"],
  });

  assert.deepEqual(contract, {
    canonicalTruth: "result.json",
    resultJson: join(outputDir, "result.json"),
    derivedArtifacts: {},
    localOnly: true,
  });
});

test("derived artifact subsets do not change canonical truth or resultJson", () => {
  const withHtml = createGuidedInspectionArtifactContract({
    outputDir,
    artifacts: ["result.json", "guide.html", "report.html"],
  });
  const withData = createGuidedInspectionArtifactContract({
    outputDir,
    artifacts: ["summary.md", "result.json", "summary.json", "visual.svg"],
  });

  for (const contract of [withHtml, withData]) {
    assert.equal(contract.canonicalTruth, "result.json");
    assert.equal(contract.resultJson, join(outputDir, "result.json"));
    assert.equal(contract.localOnly, true);
  }

  assert.deepEqual(withHtml.derivedArtifacts, {
    "guide.html": join(outputDir, "guide.html"),
    "report.html": join(outputDir, "report.html"),
  });
  assert.deepEqual(withData.derivedArtifacts, {
    "visual.svg": join(outputDir, "visual.svg"),
    "summary.json": join(outputDir, "summary.json"),
    "summary.md": join(outputDir, "summary.md"),
  });
});

test("HTML SVG Markdown and JSON contents are never parsed", async () => {
  const contract = createGuidedInspectionArtifactContract({
    outputDir,
    artifacts: ["result.json", "guide.html", "visual.svg", "summary.md", "summary.json"],
  });
  const helperSource = await readFile(helperSourcePath, "utf8");

  assert.equal(contract.resultJson, join(outputDir, "result.json"));
  assert.doesNotMatch(helperSource, /node:fs|node:fs\/promises|readFile|existsSync|statSync|JSON\.parse|DOMParser/u);
});

test("invalid outputDir values are rejected", () => {
  const invalidOutputDirs = [
    "",
    "relative/out",
    "http://example.test/out",
    "https://example.test/out",
    "file:///tmp/out",
  ];

  if (process.platform !== "win32") {
    invalidOutputDirs.push("C:\\tmp\\guided-inspection");
    invalidOutputDirs.push("\\\\server\\share\\guided-inspection");
  }

  for (const invalidOutputDir of invalidOutputDirs) {
    assert.throws(
      () => createGuidedInspectionArtifactContract({
        outputDir: invalidOutputDir,
        artifacts: ["result.json"],
      }),
      /outputDir must be a non-empty absolute local filesystem path/,
      invalidOutputDir,
    );
  }
});

test("invalid artifact references are rejected", () => {
  for (const invalidArtifact of [
    "",
    join(outputDir, "result.json"),
    "../result.json",
    "subdir/result.json",
    "subdir\\result.json",
    "http://example.test/result.json",
    "https://example.test/result.json",
    "file:///tmp/result.json",
    "unknown.json",
    "result.json.bak",
  ]) {
    assert.throws(
      () => createGuidedInspectionArtifactContract({
        outputDir,
        artifacts: ["result.json", invalidArtifact],
      }),
      /artifact|Unknown guided inspection artifact/,
      invalidArtifact,
    );
  }
});

test("duplicate artifact names are rejected before path mapping", () => {
  assert.throws(
    () => createGuidedInspectionArtifactContract({
      outputDir,
      artifacts: ["result.json", "summary.md", "summary.md"],
    }),
    /Duplicate guided inspection artifact: summary\.md/,
  );
});

test("differently ordered artifact arrays produce deterministic output and stable object keys", () => {
  const first = createGuidedInspectionArtifactContract({
    outputDir,
    artifacts: ["summary.md", "visual.svg", "result.json", "guide.html", "summary.json", "report.html"],
  });
  const second = createGuidedInspectionArtifactContract({
    outputDir,
    artifacts: ["report.html", "summary.json", "guide.html", "result.json", "visual.svg", "summary.md"],
  });

  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first), ["canonicalTruth", "resultJson", "derivedArtifacts", "localOnly"]);
  assert.deepEqual(Object.keys(first.derivedArtifacts), [
    "guide.html",
    "report.html",
    "visual.svg",
    "summary.json",
    "summary.md",
  ]);
});

test("package-private helper is not exposed from the root package", async () => {
  const packageRoot = await import("../dist/src/index.js");
  const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  const currentIndex = await readFile(join(repoRoot, "src", "index.ts"), "utf8");

  assert.equal("createGuidedInspectionArtifactContract" in packageRoot, false);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.doesNotMatch(currentIndex, /guided-inspection-artifact-contract/u);

  await assert.rejects(
    import("@norma/core/local-report/guided-inspection-artifact-contract"),
    /Package subpath .* is not defined by "exports"/,
  );
});
