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

const pr71ApprovedChangedFiles = [
  "src/index.ts",
  "src/measurements.ts",
  "tests/core-skeleton.test.mjs",
  "tests/measurements.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/structured-json-input-viewer.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  "tests/verification-replay-result-viewer.test.mjs",
];

const pr72ApprovedChangedFiles = [
  "bin/norma-core-mcp-stdio.mjs",
  "src/mcp/stdio-protocol.ts",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/mcp-stdio-server-skeleton.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const pr75ApprovedChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-19-post-mvp-product-vision-and-adapter-architecture.md",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

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
  const isPr71ApprovedChangeSet = isExactPr71ApprovedChangeSet(changed);
  const isPr72ApprovedChangeSet = isExactPr72ApprovedChangeSet(changed);
  const isPr75ApprovedChangeSet = isExactPr75ApprovedChangeSet(changed);

  assert.deepEqual(changed.filter((file) => file === "package.json" || file === "package-lock.json"), []);
  assert.deepEqual(
    changed.filter((file) => (
      file === "src/index.ts" &&
      !isPr71ApprovedChangeSet
    )),
    [],
  );
  assert.deepEqual(changed.filter((file) => file === "tsconfig.json"), []);
  assert.deepEqual(
    changed.filter((file) => isUnapprovedPr75DocsChange(file, isPr75ApprovedChangeSet)),
    [],
  );
  assert.deepEqual(changed.filter((file) => file.startsWith("src/api/")), []);
  assert.deepEqual(
    changed.filter((file) => isUnapprovedPr72PrefixChange(file, "src/mcp/", isPr72ApprovedChangeSet)),
    [],
  );
  assert.deepEqual(
    changed.filter((file) => isUnapprovedPr72PrefixChange(file, "bin/", isPr72ApprovedChangeSet)),
    [],
  );
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

// fallow-ignore-next-line code-duplication
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
    const output = execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split("\n").filter(Boolean).sort();
  } catch {
    return null;
  }
}

function isExactPr71ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr71ApprovedChangedFiles);
}

function isExactPr72ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr72ApprovedChangedFiles);
}

function isExactPr75ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr75ApprovedChangedFiles);
}

function isUnapprovedPr72PrefixChange(file, prefix, isPr72ApprovedChangeSet) {
  return file.startsWith(prefix) && !(isPr72ApprovedChangeSet && pr72ApprovedChangedFiles.includes(file));
}

function isUnapprovedPr75DocsChange(file, isPr75ApprovedChangeSet) {
  return file.startsWith("docs/") && !(isPr75ApprovedChangeSet && pr75ApprovedChangedFiles.includes(file));
}

function isExactChangedFileSet(changed, approvedFiles) {
  return changed.length === approvedFiles.length && approvedFiles.every((file) => changed.includes(file));
}

function assertNoRemoteUrl(source) {
  assert.doesNotMatch(source, /\bhttps?:\/\//i);
  assert.doesNotMatch(source, /(^|[^.])\/\//);
}
