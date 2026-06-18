import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const htmlPath = join(repoRoot, "viewer", "read-only-result-viewer.html");
const jsPath = join(repoRoot, "viewer", "read-only-result-viewer.js");
const cssPath = join(repoRoot, "viewer", "read-only-result-viewer.css");
const localModelPath = "../dist/local-viewer/read-only-viewer-model.js";
const currentBuildModelPath = "../dist/src/local-viewer/read-only-viewer-model.js";

test("PR68 static viewer files exist", () => {
  assert.equal(existsSync(htmlPath), true, "viewer/read-only-result-viewer.html must exist");
  assert.equal(existsSync(jsPath), true, "viewer/read-only-result-viewer.js must exist");
  assert.equal(existsSync(cssPath), true, "viewer/read-only-result-viewer.css must exist");
});

test("PR68 HTML references local CSS and module JS", () => {
  const html = readFileSync(htmlPath, "utf8");

  assert.match(html, /<link\b[^>]*href=["']\.\/read-only-result-viewer\.css["'][^>]*>/);
  assert.match(html, /<script\b[^>]*type=["']module["'][^>]*src=["']\.\/read-only-result-viewer\.js["'][^>]*>/);
});

test("PR68 HTML provides paste-only JSON input and output regions", () => {
  const html = readFileSync(htmlPath, "utf8");

  assert.match(html, /<textarea\b[^>]*(?:data-viewer-input|id=["']structured-json-input["'])/);
  assert.match(html, /<button\b[^>]*data-viewer-render/);
  assert.match(html, /data-viewer-output/);
  assert.match(html, /data-viewer-provenance/);
  assert.match(html, /Local Static Read-Only Result Viewer/);
});

test("PR68 HTML keeps file upload media network and remote surfaces absent", () => {
  const html = readFileSync(htmlPath, "utf8");
  const scriptTags = [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0]);
  const disallowedScripts = scriptTags.filter(
    (tag) =>
      !/<script\b[^>]*type=["']importmap["'][^>]*>/i.test(tag) &&
      !/<script\b[^>]*type=["']module["'][^>]*src=["']\.\/read-only-result-viewer\.js["'][^>]*>/i.test(tag),
  );

  assert.doesNotMatch(html, /<input\b[^>]*type=["']?file\b/i);
  assert.doesNotMatch(html, /<canvas\b/i);
  assert.doesNotMatch(html, /\b(?:drag|drop|draggable|DataTransfer)\b/i);
  assert.doesNotMatch(html, /<\s*(?:video|audio|img|picture|source|track|iframe|object|embed)\b/i);
  assert.deepEqual(disallowedScripts, []);
  assert.doesNotMatch(html, /<link\b[^>]*href=["'](?!\.\/read-only-result-viewer\.css["'])/i);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /\baction\s*=/i);
  assertNoRemoteUrl(html);
});

test("PR68 HTML maps the documented local model path to the current build output", () => {
  const html = readFileSync(htmlPath, "utf8");

  assert.match(html, /<script\b[^>]*type=["']importmap["'][^>]*>/i);
  assert.equal(html.includes(`"${localModelPath}": "${currentBuildModelPath}"`), true);
});

test("PR68 JS exports pure static helper functions", async () => {
  const viewer = await import("../viewer/read-only-result-viewer.js");

  assert.equal(typeof viewer.formatViewerScalar, "function");
  assert.equal(typeof viewer.modelToStaticViewTree, "function");
  assert.equal(typeof viewer.renderStaticViewTree, "function");
  assert.equal(typeof viewer.mountReadOnlyResultViewer, "function");
});

test("PR68 JS avoids unsafe HTML and code execution APIs", () => {
  const js = readFileSync(jsPath, "utf8");

  for (const marker of [
    "innerHTML",
    "outerHTML",
    "insertAdjacentHTML",
    "eval(",
    "new Function",
    "createElement(\"script\"",
    "createElement('script'",
    "append(\"<",
    "appendChild(\"<",
  ]) {
    assert.equal(js.includes(marker), false, `${marker} must stay absent`);
  }
});

test("PR68 JS avoids network file upload media storage worker and remote behavior", () => {
  const js = readFileSync(jsPath, "utf8");

  for (const marker of [
    "fetch(",
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "sendBeacon",
    "FileReader",
    "type=\"file\"",
    "type='file'",
    "upload",
    "getUserMedia",
    "mediaDevices",
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "document.cookie",
    "Worker(",
    "SharedWorker",
    "serviceWorker",
    "navigator.clipboard",
  ]) {
    assert.equal(js.includes(marker), false, `${marker} must stay absent`);
  }

  assertNoRemoteUrl(js);
});

test("PR68 JS references only the local built read-only viewer model path", () => {
  const js = readFileSync(jsPath, "utf8");
  const modelPathMatches = js.match(/\.\.\/dist\/[^"']*read-only-viewer-model\.js/g) ?? [];

  assert.deepEqual(modelPathMatches, [localModelPath]);
  assert.equal(js.includes("../dist/src/local-viewer/read-only-viewer-model.js"), false);
  assert.equal(js.includes("../dist/src/index.js"), false);
  assert.equal(js.includes("../src/index.ts"), false);
  assert.equal(js.includes("@norma/core"), false);
});

test("PR68 CSS contains no external imports or asset URLs", () => {
  const css = readFileSync(cssPath, "utf8");

  assert.doesNotMatch(css, /@import\b/i);
  assert.doesNotMatch(css, /\burl\s*\(/i);
  assertNoRemoteUrl(css);
});

test("PR68 static view tree preserves provenance and truth boundary fields", async () => {
  const { modelToStaticViewTree } = await import("../viewer/read-only-result-viewer.js");
  const tree = modelToStaticViewTree(sampleModel());

  assert.deepEqual(tree.provenance, [
    { label: "source truth", value: "explicit-structured-input" },
    { label: "artifacts", value: "derived display data only" },
    { label: "prompt text", value: "not source truth" },
    { label: "displayability", value: "not source-truth validation" },
  ]);
});

test("PR68 static helper output is deterministic for the same input model", async () => {
  const { modelToStaticViewTree } = await import("../viewer/read-only-result-viewer.js");
  const model = sampleModel();

  assert.deepEqual(modelToStaticViewTree(model), modelToStaticViewTree(model));
});

test("PR68 branch keeps protected package docs runtime and API surfaces unchanged", () => {
  const changed = branchChangedFiles();

  assert.deepEqual(changed.filter((file) => file === "package.json" || file === "package-lock.json"), []);
  assert.deepEqual(changed.filter((file) => file === "src/index.ts"), []);
  assert.deepEqual(changed.filter((file) => file === "tsconfig.json"), []);
  assert.deepEqual(changed.filter((file) => file.startsWith("docs/")), []);
  assert.deepEqual(changed.filter((file) => file.startsWith("src/api/")), []);
  assert.deepEqual(changed.filter((file) => file.startsWith("src/mcp/")), []);
  assert.deepEqual(changed.filter((file) => file.startsWith("bin/")), []);
  assert.deepEqual(changed.filter((file) => file.startsWith("examples/")), []);
});

function sampleModel() {
  return {
    kind: "readOnlyViewerModel",
    status: "displayable",
    classification: "verification-like-result",
    sourceMode: "explicit-json-text",
    displayable: true,
    notDisplayableReason: null,
    title: "Verification result",
    summary: "Input is displayable as local read-only derived display data.",
    sections: [
      {
        id: "status",
        title: "Status",
        rows: [{ label: "value", value: "verified" }],
      },
    ],
    warnings: [{ code: "WarningCode", severity: "warning", message: "Visible warning" }],
    errors: [],
    provenance: {
      sourceTruth: "explicit-structured-input",
      artifactsAreDerived: true,
      promptIsSourceTruth: false,
      displayabilityIsTruthValidation: false,
    },
  };
}

function branchChangedFiles() {
  const probes = [
    gitFiles(["diff", "--name-only", "main...HEAD"]),
    gitFiles(["diff", "--name-only", "origin/main...HEAD"]),
    gitFiles(["diff", "--name-only"]),
    gitFiles(["diff", "--cached", "--name-only"]),
    gitFiles(["ls-files", "--others", "--exclude-standard"]),
  ];
  const successful = probes.filter((files) => files !== null);
  assert.notEqual(successful.length, 0, "Unable to inspect changed files with git");
  return successful
    .flat()
    .filter((file, index, files) => files.indexOf(file) === index)
    .sort();
}

function gitFiles(args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .filter(Boolean)
      .sort();
  } catch {
    return null;
  }
}

function assertNoRemoteUrl(source) {
  assert.doesNotMatch(source, /\bhttps?:\/\//i);
  assert.doesNotMatch(source, /(^|[^.])\/\//);
}
