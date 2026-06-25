import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const semgrepCiGuardMaintenanceFiles = new Set([
  ".github/workflows/ci.yml",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
]);

const decisionPath = "docs/decisions/2026-06-19-post-mvp-product-vision-and-adapter-architecture.md";
const roadmapPath = "docs/BUSINESS_READINESS_ROADMAP.md";
const contractTestPath = "tests/post-mvp-product-vision-approval.test.mjs";
const pr76DecisionPath =
  "docs/decisions/2026-06-19-geometry-observation-and-perception-provider-contract-approval.md";
const pr76ContractTestPath = "tests/geometry-observation-perception-provider-contract-approval.test.mjs";

const primaryPr75ChangedFiles = [
  decisionPath,
  roadmapPath,
  contractTestPath,
].sort();

const exactPr75ChangedFilesWithGuards = [
  ...primaryPr75ChangedFiles,
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
].sort();

const exactPr76ChangedFilesWithGuards = [
  pr76DecisionPath,
  pr76ContractTestPath,
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
].sort();

const exactPr77ChangedFilesWithGuards = exactPr76ChangedFilesWithGuards;

const exactPr78ChangedFilesWithGuards = [
  pr76DecisionPath,
  pr76ContractTestPath,
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
].sort();

const exactPr79ChangedFilesWithGuards = [
  "src/geometry-observation.ts",
  "src/node-crypto.d.ts",
  "tests/fixtures/geometry-observation/valid-accepted-geometry-v1.json",
  "tests/fixtures/geometry-observation/valid-observation-v1.json",
  "tests/geometry-observation-validator.test.mjs",
  pr76ContractTestPath,
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
].sort();

const exactPr80ChangedFilesWithGuards = [
  "docs/decisions/2026-06-20-accepted-geometry-to-core-mapping-contract-approval.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  pr76ContractTestPath,
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
].sort();

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
].sort();

const exactPr101ReplayChangedFilesWithGuards = [
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
].sort();

const exactR2AOutputSchemaChangedFilesWithGuards = [
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
].sort();

const exactR2BOutputSchemaChangedFilesWithGuards = [
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
].sort();

const exactR3NonCanonicalStructuredInputChangedFilesWithGuards = [
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mvp-demo-harness.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
].sort();

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
].sort();

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
].sort();

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
].sort();

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

const protectedExactPaths = [
  ".gitignore",
  "README.md",
  "package-lock.json",
  "package.json",
  "tsconfig.json",
];

const protectedPrefixes = [
  ".github/",
  "bin/",
  "examples/",
  "src/",
  "viewer/",
];

const forbiddenRuntimePatterns = [
  /^src\//,
  /^bin\//,
  /^viewer\//,
  /^examples\//,
  /^\.github\//,
  /^tests\/fixtures\/.*\.(?:png|jpe?g|webp|gif|svg)$/i,
  /(?:^|\/)(?:Dockerfile|docker-compose\.yml|vercel\.json|wrangler\.toml)$/,
  /(?:^|\/)(?:.*schema.*\.(?:ts|json))$/i,
];

const headings = [
  "# Post-MVP Product Vision And Adapter Architecture",
  "## Status",
  "## Decision",
  "## Current Verified Baseline",
  "## Product Thesis",
  "## Architecture Layers",
  "## Source Truth And Provenance",
  "## PerceptionProvider Architecture",
  "## OpenAI Vision Provider",
  "## Norma Vision Provider",
  "## CAD Adapter",
  "## Norma Camera",
  "## Scene And 3D",
  "## Music",
  "## Web, Print And Design",
  "## Quality, Packaging And Industry",
  "## Architecture, Engineering And Standards",
  "## Archaeology And Heritage",
  "## Norma Registry",
  "## Pack Governance",
  "## Evaluation Modes",
  "## Product Risk Tiers",
  "## First Approved Vertical Slice",
  "## ChatGPT Application Boundary",
  "## Candidate Follow-Up Sequence",
  "## Explicit Non-Goals",
  "## Validation Gates",
  "## Stop Criteria",
  "## Rollback",
];

test("PR75 decision file exists with required headings in order", () => {
  assert.equal(existsSync(join(repoRoot, decisionPath)), true);
  assertHeadingsInOrder(read(decisionPath), headings);
});

test("PR75 remains documentation and contract-test only", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "PR75 is documentation and contract-test only.",
    "PR75 gives no runtime authorization.",
    "PR75 implements no adapter.",
    "PR75 approves no production launch.",
    "PR75 approves no real-user-data workflow.",
    "PR75 does not approve remote MCP or deployment.",
  ]);
});

test("PR75 keeps Norma Core a deterministic geometry core", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "Norma Core remains a deterministic proportional geometry engine.",
    "Future products connect through explicit providers and adapters",
    "No provider or adapter becomes the source of Norma logic.",
    "The core must not import or depend on provider SDKs.",
  ]);
});

test("PR75 provider and adapter dependency direction is explicit", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "Product or host",
    "-> Provider / Adapter",
    "-> Candidate structured observation",
    "-> Validation / user acceptance",
    "-> Explicit Norma source input",
    "-> Norma Core",
    "Forbidden dependency direction:",
    "-> ChatGPT",
    "-> image decoder",
  ]);
});

test("PR75 blocks direct image-to-core and treats provider output as candidate", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "Provider output is candidate evidence.",
    "Accepted structured geometry becomes the effective operation input.",
    "no direct image-to-core path",
    "strict structured output",
    "schema validation",
    "user review or correction",
  ]);
});

test("PR75 separates confidence measurements evaluations prompts and artifacts", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "Confidence remains separate from measurement and evaluation.",
    "Artifacts never become source truth.",
    "Prompts never become source truth.",
    "Perception confidence",
    "Proportional deviation",
    "Compliance status",
    "There is no global beauty score.",
  ]);
});

test("PR75 documents OpenAI Vision boundaries and limitations", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "OpenAI vision is approved only as the first rapid perception experiment.",
    "synthetic images first",
    "no exact-vectorization claim",
    "no metric reconstruction claim",
    "no automatic acceptance",
    "no model name frozen in architecture",
    "precise spatial localization is imperfect",
    "dimensions can be affected by image preprocessing or resizing",
    "semantic descriptions can be wrong",
    "confidence requires evaluation and calibration",
  ]);
});

test("PR75 keeps local MCP STDIO separate from ChatGPT app integration", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "Apps SDK and MCP are a future ChatGPT product path.",
    "The current local MCP STDIO process is not the ChatGPT integration.",
    "A future ChatGPT app requires a separately approved app/MCP surface.",
    "Deployment, authentication, secrets, privacy, security, and submission are separate gates.",
  ]);
});

test("PR75 approves only the local synthetic ChatGPT Analyze direction", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "ChatGPT Analyze - local/synthetic architecture track",
    "simple synthetic image",
    "accepted geometry against an explicit pack",
    "exact vectorization",
    "metric reconstruction",
    "arbitrary real-world images",
    "production deployment",
    "real-user-data approval",
    "automatic acceptance",
    "beauty judgment",
    "intent inference",
  ]);
});

test("PR75 registry categories pack governance future domains and risk tiers are present", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "Norma Registry",
    "Codex Packs",
    "Standards Packs",
    "Enterprise Packs",
    "Calibration Packs",
    "arbitrary executable code in a pack",
    "silent LLM-generated rules",
    "Music is a future candidate domain, not geometry disguised as rectangles.",
    "3D must not be silently added to current core types.",
    "PR75 does not approve Tier 3 implementation.",
  ]);
});

test("PR75 candidate follow-up sequence is present without implementation", () => {
  const doc = read(decisionPath);

  assertIncludes(doc, [
    "PR76 - GeometryObservation and PerceptionProvider contract approval.",
    "PR77 - GeometryObservation validator and synthetic fixtures.",
    "PR78 - Perception evaluation harness.",
    "PR79 - OpenAI Vision Provider local experiment.",
    "PR80 - ChatGPT app integration approval.",
    "PR81 - Local ChatGPT Analyze vertical slice.",
    "Do not implement any of these in PR75.",
  ]);
});

test("PR75 roadmap update is minimal and links to the decision", () => {
  const roadmap = read(roadmapPath);

  assertIncludes(roadmap, [
    "## Current State After PR74",
    "PR70 through PR74 completed",
    "## PR75 Post-MVP Architecture Freeze",
    decisionPath,
    "ChatGPT Analyze as a local/synthetic architecture track only",
    "PR76 - GeometryObservation and PerceptionProvider contract approval.",
    "PR81 - Local ChatGPT Analyze vertical slice.",
    "PR75 does not approve image analysis",
    "real-user-data processing",
  ]);
});

// fallow-ignore-next-line complexity
test("PR75 changed-file scope is exact and protected files remain unchanged", () => {
  const changed = branchChangedFiles();
  if (changed.length === 0) {
    return;
  }

  assert.ok(
    isExactChangedFileSet(changed, primaryPr75ChangedFiles) ||
      isExactChangedFileSet(changed, exactPr75ChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, exactPr76ChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, exactPr77ChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, exactPr78ChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, exactPr79ChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, exactPr80ChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, r4CurrentOperationsRunbookChangedFiles) ||
      isExactChangedFileSet(changed, exactPr101ReplayChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, exactR2AOutputSchemaChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, exactR2BOutputSchemaChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, exactR3NonCanonicalStructuredInputChangedFilesWithGuards) ||
      isExactChangedFileSet(changed, r5PostMvpAdapterArchitectureChangedFiles) ||
      isExactChangedFileSet(changed, r6aStructuredAnalyzeContractChangedFiles) ||
      isExactChangedFileSet(changed, r6a1StructuredAnalyzeExecutableContractChangedFiles) ||
      isExactChangedFileSet(changed, r6bStructuredAnalyzeImplementationChangedFiles) ||
      isExactChangedFileSet(changed, r6bStructuredAnalyzeGuardMaintenanceChangedFiles),
    `Unexpected PR75 changed files:\n${changed.join("\n")}`,
  );

  const protectedAllowlist = exactProtectedAllowlist(changed);

  assert.deepEqual(
    changed.filter((file) => isProtectedChange(file) && !protectedAllowlist.includes(file)),
    [],
  );
});

test("PR75 does not add runtime package deployment provider or schema files", () => {
  const changed = branchChangedFiles();
  const runtimeAllowlist = exactProtectedAllowlist(changed);
  const unexpected = changed.filter(
    (file) => !runtimeAllowlist.includes(file) && forbiddenRuntimePatterns.some((pattern) => pattern.test(file)),
  );

  assert.deepEqual(unexpected, []);
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
    assert.equal(
      isExactChangedFileSet(
        [...exactPr101ReplayChangedFilesWithGuards, unexpectedFile].sort(),
        exactPr101ReplayChangedFilesWithGuards,
      ),
      false,
    );
    assert.equal(
      isExactChangedFileSet(
        [...exactR2AOutputSchemaChangedFilesWithGuards, unexpectedFile].sort(),
        exactR2AOutputSchemaChangedFilesWithGuards,
      ),
      false,
    );
    assert.equal(
      isExactChangedFileSet(
        [...exactR2BOutputSchemaChangedFilesWithGuards, unexpectedFile].sort(),
        exactR2BOutputSchemaChangedFilesWithGuards,
      ),
      false,
    );
    assert.equal(
      isExactChangedFileSet(
        [...exactR3NonCanonicalStructuredInputChangedFilesWithGuards, unexpectedFile].sort(),
        exactR3NonCanonicalStructuredInputChangedFilesWithGuards,
      ),
      false,
    );
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

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function assertIncludes(source, snippets) {
  for (const snippet of snippets) {
    assert.match(source, new RegExp(escapeRegExp(snippet), "i"), `${snippet} should be documented`);
  }
}

function assertHeadingsInOrder(source, expectedHeadings) {
  let previousIndex = -1;
  for (const heading of expectedHeadings) {
    const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m");
    const match = pattern.exec(source);
    assert.notEqual(match, null, `${heading} should exist as a heading`);
    assert.ok(match.index > previousIndex, `${heading} should appear after the previous heading`);
    previousIndex = match.index;
  }
}

function branchChangedFiles() {
  const baseFiles =
    gitFiles(["diff", "--name-only", "origin/main...HEAD"]) ??
    gitFiles(["diff", "--name-only", "main...HEAD"]);
  const probes = [
    baseFiles,
    gitFiles(["diff", "--name-only"]),
    gitFiles(["diff", "--cached", "--name-only"]),
    gitFiles(["ls-files", "--others", "--exclude-standard"]),
  ];
  const successful = probes.filter((files) => files !== null);
  assert.notEqual(successful.length, 0, "Unable to inspect changed files with git");
  return successful
    .flat()
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
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

function isProtectedChange(file) {
  return protectedExactPaths.includes(file) || protectedPrefixes.some((prefix) => file.startsWith(prefix));
}

function exactProtectedAllowlist(changed) {
  if (isExactChangedFileSet(changed, exactPr79ChangedFilesWithGuards)) {
    return exactPr79ChangedFilesWithGuards;
  }
  if (isExactChangedFileSet(changed, exactPr80ChangedFilesWithGuards)) {
    return exactPr80ChangedFilesWithGuards;
  }
  if (isExactChangedFileSet(changed, r4CurrentOperationsRunbookChangedFiles)) {
    return r4CurrentOperationsRunbookChangedFiles;
  }
  if (isExactChangedFileSet(changed, exactPr101ReplayChangedFilesWithGuards)) {
    return exactPr101ReplayChangedFilesWithGuards;
  }
  if (isExactChangedFileSet(changed, exactR2AOutputSchemaChangedFilesWithGuards)) {
    return exactR2AOutputSchemaChangedFilesWithGuards;
  }
  if (isExactChangedFileSet(changed, exactR2BOutputSchemaChangedFilesWithGuards)) {
    return exactR2BOutputSchemaChangedFilesWithGuards;
  }
  if (isExactChangedFileSet(changed, exactR3NonCanonicalStructuredInputChangedFilesWithGuards)) {
    return exactR3NonCanonicalStructuredInputChangedFilesWithGuards;
  }
  if (isExactChangedFileSet(changed, r5PostMvpAdapterArchitectureChangedFiles)) {
    return r5PostMvpAdapterArchitectureChangedFiles;
  }
  if (isExactChangedFileSet(changed, r6aStructuredAnalyzeContractChangedFiles)) {
    return r6aStructuredAnalyzeContractChangedFiles;
  }
  if (isExactChangedFileSet(changed, r6a1StructuredAnalyzeExecutableContractChangedFiles)) {
    return r6a1StructuredAnalyzeExecutableContractChangedFiles;
  }
  if (isExactChangedFileSet(changed, r6bStructuredAnalyzeImplementationChangedFiles)) {
    return r6bStructuredAnalyzeImplementationChangedFiles;
  }
  if (isExactChangedFileSet(changed, r6bStructuredAnalyzeGuardMaintenanceChangedFiles)) {
    return r6bStructuredAnalyzeGuardMaintenanceChangedFiles;
  }
  return [];
}

function isExactChangedFileSet(changed, approvedFiles) {
  return changed.length === approvedFiles.length && approvedFiles.every((file) => changed.includes(file));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
