import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  branchChangedFiles,
  isExactChangedFileSet,
  isExactR1GeometrySourceIdentityChangeSet,
  isExactR6CStructuredAnalyzeMcpChangeSet,
  r1GeometrySourceIdentityChangedFiles,
  r6cStructuredAnalyzeMcpChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const htmlPath = join(repoRoot, "viewer", "read-only-result-viewer.html");
const jsPath = join(repoRoot, "viewer", "read-only-result-viewer.js");
const cssPath = join(repoRoot, "viewer", "read-only-result-viewer.css");
const localModelPath = "../dist/local-viewer/read-only-viewer-model.js";
// fallow-ignore-next-line code-duplication
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

const pr76ApprovedChangedFiles = [
  "docs/decisions/2026-06-19-geometry-observation-and-perception-provider-contract-approval.md",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
];

const pr77ApprovedChangedFiles = pr76ApprovedChangedFiles;

const pr78ApprovedChangedFiles = [
  "docs/decisions/2026-06-19-geometry-observation-and-perception-provider-contract-approval.md",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
];

const pr80ApprovedChangedFiles = [
  "docs/decisions/2026-06-20-accepted-geometry-to-core-mapping-contract-approval.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
];

const pr101ReplayChangedFiles = [
  "src/mcp/stdio-protocol.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-stdio-server-skeleton.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r2aOutputSchemaChangedFiles = [
  "src/mcp/stdio-protocol.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
  "tests/mcp-verify-tools-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r2bOutputSchemaChangedFiles = [
  "src/mcp/stdio-protocol.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-replay-mvp-demo-contract.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
  "tests/mcp-verify-tools-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r4CurrentOperationsRunbookChangedFiles = [
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r5PostMvpAdapterArchitectureChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-24-post-mvp-adapter-architecture.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r6aStructuredAnalyzeContractChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-tool-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-analyze-v1-contract.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r6a1StructuredAnalyzeExecutableContractChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-analyze-v1-contract.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r6bStructuredAnalyzeImplementationChangedFiles = [
  "src/index.ts",
  "src/structured-composition-analysis.ts",
  "tests/package-consumption.test.mjs",
  "tests/structured-composition-analysis.test.mjs",
].sort();

const r6bStructuredAnalyzeGuardMaintenanceChangedFiles = [
  ...r6bStructuredAnalyzeImplementationChangedFiles,
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/structured-json-input-viewer.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  "tests/verification-replay-result-viewer.test.mjs",
].sort();

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

test("R22 HTML names existing Structured Analyze result JSON without adding active surfaces", () => {
  const html = readFileSync(htmlPath, "utf8");

  assert.match(html, /existing Structured Analyze result JSON/);
  assert.match(html, /Direct engine output and result JSON remain canonical truth/);
  assertNoRemoteUrl(html);
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

test("R22 local viewer docs describe Structured Analyze inspection without runtime product overclaims", () => {
  const docs = [
    readFileSync(join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md"), "utf8"),
    readFileSync(join(repoRoot, "docs", "examples", "read-only-result-viewer-workflow.md"), "utf8"),
    readFileSync(join(repoRoot, "docs", "onboarding", "README.md"), "utf8"),
  ].join("\n");

  for (const required of [
    "Structured Analyze result JSON",
    "existing deterministic output",
    "does not run analysis",
    "does not recompute",
    "local-only",
    "static",
    "read-only",
    "canonical truth",
    "derived inspection",
  ]) {
    assert.equal(docs.includes(required), true, `${required} should be documented`);
  }

  for (const forbiddenClaim of [
    "hosted dashboard is supported",
    "public product is supported",
    "SDK is ready",
    "API runtime is ready",
    "remote MCP is supported",
    "runs analysis from the viewer",
    "recomputes results from the viewer",
    "optimizes results",
    "recommends corrections",
    "scores aesthetics",
    "infers geometry from prompts",
    "infers geometry from images",
  ]) {
    assert.equal(docs.includes(forbiddenClaim), false, `${forbiddenClaim} must not be claimed`);
  }
});

// fallow-ignore-next-line complexity
test("PR68 branch keeps protected package docs runtime and API surfaces unchanged", () => {
  const changed = branchChangedFiles();
  const isPr71ApprovedChangeSet = isExactPr71ApprovedChangeSet(changed);
  const isPr72ApprovedChangeSet = isExactPr72ApprovedChangeSet(changed);
  const isPr75ApprovedChangeSet = isExactPr75ApprovedChangeSet(changed);
  const isPr76ApprovedChangeSet = isExactPr76ApprovedChangeSet(changed);
  const isPr77ApprovedChangeSet = isExactPr77ApprovedChangeSet(changed);
  const isPr78ApprovedChangeSet = isExactPr78ApprovedChangeSet(changed);
  const isPr80ApprovedChangeSet = isExactPr80ApprovedChangeSet(changed);
  const isPr101ReplayChangeSet = isExactPr101ReplayChangeSet(changed);
  const isR2AOutputSchemaChangeSet = isExactR2AOutputSchemaChangeSet(changed);
  const isR2BOutputSchemaChangeSet = isExactR2BOutputSchemaChangeSet(changed);
  const isR4CurrentOperationsRunbookChangeSet = isExactChangedFileSet(changed, r4CurrentOperationsRunbookChangedFiles);
  const isR5PostMvpAdapterArchitectureChangeSet = isExactChangedFileSet(
    changed,
    r5PostMvpAdapterArchitectureChangedFiles,
  );
  const isR6AStructuredAnalyzeContractChangeSet = isExactChangedFileSet(
    changed,
    r6aStructuredAnalyzeContractChangedFiles,
  );
  const isR6A1StructuredAnalyzeExecutableContractChangeSet = isExactChangedFileSet(
    changed,
    r6a1StructuredAnalyzeExecutableContractChangedFiles,
  );
  const isR6BStructuredAnalyzeImplementationChangeSet = isExactChangedFileSet(
    changed,
    r6bStructuredAnalyzeImplementationChangedFiles,
  );
  const isR6BStructuredAnalyzeGuardMaintenanceChangeSet = isExactChangedFileSet(
    changed,
    r6bStructuredAnalyzeGuardMaintenanceChangedFiles,
  );
  const isR1GeometrySourceIdentityChangeSet = isExactR1GeometrySourceIdentityChangeSet(changed);
  const isR6CStructuredAnalyzeMcpChangeSet = isExactR6CStructuredAnalyzeMcpChangeSet(changed);
  const sharedApprovedChangedFiles = sharedExactApprovedChangedFiles(changed);
  const isSharedApprovedFile = (file) => sharedApprovedChangedFiles?.includes(file) === true;
  const approvedDocChangeSets = [
    sharedApprovedChangedFiles ?? [],
    isPr75ApprovedChangeSet ? pr75ApprovedChangedFiles : [],
    isPr76ApprovedChangeSet ? pr76ApprovedChangedFiles : [],
    isPr77ApprovedChangeSet ? pr77ApprovedChangedFiles : [],
    isPr78ApprovedChangeSet ? pr78ApprovedChangedFiles : [],
    isPr80ApprovedChangeSet ? pr80ApprovedChangedFiles : [],
    isR4CurrentOperationsRunbookChangeSet ? r4CurrentOperationsRunbookChangedFiles : [],
    isR5PostMvpAdapterArchitectureChangeSet ? r5PostMvpAdapterArchitectureChangedFiles : [],
    isR6AStructuredAnalyzeContractChangeSet ? r6aStructuredAnalyzeContractChangedFiles : [],
    isR6A1StructuredAnalyzeExecutableContractChangeSet ? r6a1StructuredAnalyzeExecutableContractChangedFiles : [],
    isR6BStructuredAnalyzeGuardMaintenanceChangeSet ? r6bStructuredAnalyzeGuardMaintenanceChangedFiles : [],
    isR1GeometrySourceIdentityChangeSet ? r1GeometrySourceIdentityChangedFiles : [],
    isR6CStructuredAnalyzeMcpChangeSet ? r6cStructuredAnalyzeMcpChangedFiles : [],
  ];

  assert.deepEqual(
    changed.filter((file) => (file === "package.json" || file === "package-lock.json") && !isSharedApprovedFile(file)),
    [],
  );
  assert.deepEqual(
    changed.filter((file) => (
	      file === "src/index.ts" &&
	      !isPr71ApprovedChangeSet &&
	      !isR6BStructuredAnalyzeImplementationChangeSet &&
	      !isR6BStructuredAnalyzeGuardMaintenanceChangeSet &&
	      !isR1GeometrySourceIdentityChangeSet &&
	      !isSharedApprovedFile("src/index.ts")
	    )),
    [],
  );
  assert.deepEqual(
    changed.filter((file) => (
      file === "src/structured-composition-analysis.ts" &&
      !isR6BStructuredAnalyzeImplementationChangeSet &&
      !isR6BStructuredAnalyzeGuardMaintenanceChangeSet
    )),
    [],
  );
  assert.deepEqual(changed.filter((file) => file === "tsconfig.json"), []);
  assert.deepEqual(
    changed.filter((file) => isUnapprovedDocsChange(file, approvedDocChangeSets)),
    [],
  );
  assert.deepEqual(changed.filter((file) => file.startsWith("src/api/")), []);
  assert.deepEqual(
    changed.filter((file) => isUnapprovedMcpChange(
      file,
      isPr72ApprovedChangeSet,
      isPr101ReplayChangeSet,
      isR2AOutputSchemaChangeSet,
      isR2BOutputSchemaChangeSet,
      isR6CStructuredAnalyzeMcpChangeSet,
    )),
    [],
  );
  assert.deepEqual(
    changed.filter((file) => (
      isUnapprovedPr72PrefixChange(file, "bin/", isPr72ApprovedChangeSet) &&
      !isSharedApprovedFile(file)
    )),
    [],
  );
  assert.deepEqual(changed.filter((file) => file.startsWith("examples/") && !isSharedApprovedFile(file)), []);
});

test("PR101 replay exact-set guard rejects unrelated MCP package and CI changes", () => {
  for (const unexpectedFile of [
    "src/mcp/unrelated.ts",
    "src/runtime.ts",
    "tests/unrelated.test.mjs",
    "package.json",
    ".github/workflows/ci.yml",
    "docs/unrelated.md",
    "bin/unrelated.mjs",
  ]) {
    assert.equal(isExactChangedFileSet([...pr101ReplayChangedFiles, unexpectedFile].sort(), pr101ReplayChangedFiles), false);
    assert.equal(isExactChangedFileSet([...r2aOutputSchemaChangedFiles, unexpectedFile].sort(), r2aOutputSchemaChangedFiles), false);
    assert.equal(isExactChangedFileSet([...r2bOutputSchemaChangedFiles, unexpectedFile].sort(), r2bOutputSchemaChangedFiles), false);
    assert.equal(
      isExactChangedFileSet(
        [...r5PostMvpAdapterArchitectureChangedFiles, unexpectedFile].sort(),
        r5PostMvpAdapterArchitectureChangedFiles,
      ),
      false,
    );
    assert.equal(
      isExactChangedFileSet(
        [...r6aStructuredAnalyzeContractChangedFiles, unexpectedFile].sort(),
        r6aStructuredAnalyzeContractChangedFiles,
      ),
      false,
    );
    assert.equal(
      isExactChangedFileSet(
        [...r6a1StructuredAnalyzeExecutableContractChangedFiles, unexpectedFile].sort(),
        r6a1StructuredAnalyzeExecutableContractChangedFiles,
      ),
      false,
    );
    assert.equal(
      isExactChangedFileSet(
        [...r6bStructuredAnalyzeImplementationChangedFiles, unexpectedFile].sort(),
        r6bStructuredAnalyzeImplementationChangedFiles,
      ),
      false,
    );
    assert.equal(
      isExactChangedFileSet(
        [...r6bStructuredAnalyzeGuardMaintenanceChangedFiles, unexpectedFile].sort(),
        r6bStructuredAnalyzeGuardMaintenanceChangedFiles,
      ),
      false,
    );
  }
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

function isExactPr71ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr71ApprovedChangedFiles);
}

function isExactPr72ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr72ApprovedChangedFiles);
}

function isExactPr75ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr75ApprovedChangedFiles);
}

function isExactPr76ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr76ApprovedChangedFiles);
}

function isExactPr77ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr77ApprovedChangedFiles);
}

function isExactPr78ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr78ApprovedChangedFiles);
}

function isExactPr80ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr80ApprovedChangedFiles);
}

function isExactPr101ReplayChangeSet(changed) {
  return isExactChangedFileSet(changed, pr101ReplayChangedFiles);
}

function isExactR2AOutputSchemaChangeSet(changed) {
  return isExactChangedFileSet(changed, r2aOutputSchemaChangedFiles);
}

function isExactR2BOutputSchemaChangeSet(changed) {
  return isExactChangedFileSet(changed, r2bOutputSchemaChangedFiles);
}

function isUnapprovedPr72PrefixChange(file, prefix, isPr72ApprovedChangeSet) {
  return file.startsWith(prefix) && !(isPr72ApprovedChangeSet && pr72ApprovedChangedFiles.includes(file));
}

function isUnapprovedMcpChange(
  file,
  isPr72ApprovedChangeSet,
  isPr101ReplayChangeSet,
  isR2AOutputSchemaChangeSet,
  isR2BOutputSchemaChangeSet,
  isR6CStructuredAnalyzeMcpChangeSet,
) {
  return (
    file.startsWith("src/mcp/") &&
    !(
      (isPr72ApprovedChangeSet && pr72ApprovedChangedFiles.includes(file)) ||
      (isPr101ReplayChangeSet && pr101ReplayChangedFiles.includes(file)) ||
      (isR2AOutputSchemaChangeSet && r2aOutputSchemaChangedFiles.includes(file)) ||
      (isR2BOutputSchemaChangeSet && r2bOutputSchemaChangedFiles.includes(file)) ||
      (isR6CStructuredAnalyzeMcpChangeSet && r6cStructuredAnalyzeMcpChangedFiles.includes(file))
    )
  );
}

function isUnapprovedDocsChange(file, approvedDocChangeSets) {
  if (!file.startsWith("docs/")) {
    return false;
  }

  return !approvedDocChangeSets.some((approvedFiles) => approvedFiles.includes(file));
}

function assertNoRemoteUrl(source) {
  assert.doesNotMatch(source, /\bhttps?:\/\//i);
  assert.doesNotMatch(source, /(^|[^.])\/\//);
}
