import { strict as assert } from "node:assert";
import { execFileSync as execGitSync } from "node:child_process";
import * as fs from "node:fs";
import * as nodePath from "node:path";
import test from "node:test";
import { fileURLToPath as modulePathFromUrl } from "node:url";

const modulePath = modulePathFromUrl(import.meta.url);
const testDirectory = nodePath.dirname(modulePath);
const repositoryRoot = nodePath.dirname(testDirectory);

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

const decisionPath =
  "docs/decisions/2026-06-20-accepted-geometry-to-core-mapping-contract-approval.md";
const decision = read(decisionPath);

const requiredHeadings = [
  "# AcceptedGeometry To Core Mapping Contract Approval",
  "## Status",
  "## PR79 Validator Dependency",
  "## Architecture Boundary",
  "## Exact Input Boundary",
  "## Target Core Geometry Profile",
  "## Primitive Mapping Matrix",
  "## Coordinate Transform",
  "## Mapping Request Contract",
  "## Mapping Result Contract",
  "## Identity And Provenance",
  "## Diagnostics",
  "## Mapper Content Identity Rules",
  "## Determinism And Replay",
  "## Synthetic-Only Boundary",
  "## PR81 Authorized Scope",
  "## Non-Goals",
  "## Guardrails",
  "## Validation Gates",
  "## Rollback",
];

const pr80ApprovedChangedFiles = [
  "docs/decisions/2026-06-20-accepted-geometry-to-core-mapping-contract-approval.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
].sort();

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
].sort();

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
].sort();

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
].sort();

const r3NonCanonicalStructuredInputChangedFiles = [
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

test("PR80 decision file exists with required headings in order", () => {
  assert.equal(fs.existsSync(nodePath.join(repositoryRoot, decisionPath)), true);
  assertHeadingSequence(decision, requiredHeadings);
});

test("PR80 identifies PR79 as the validator dependency and keeps mapping package-private", () => {
  assertIncludes(decision, [
    "PR80 depends on merged PR79",
    "local package-private `AcceptedGeometry@1` validator",
    "The future mapper must call the PR79 validator internally before mapping.",
    "PR80 does not approve a branded validated value",
    "PR80 does not implement the mapper.",
    "package-private contract",
  ]);
});

test("PR80 approves only validated AcceptedGeometry input and forbids raw provider paths", () => {
  assertIncludes(decision, [
    "`acceptedGeometry.contractId` is exactly `norma.accepted-geometry@1`",
    "`acceptedGeometry.contractVersion` is exactly `1`",
    "`acceptedGeometry` passes `validateAcceptedGeometryV1`",
    "The mapper must reject raw `GeometryObservation`",
    "provider payloads",
    "unvalidated objects",
    "automatically accepted candidates",
    "No hidden default may supply the mapping profile",
  ]);
});

test("PR80 fixes exact request and result identities", () => {
  assertIncludes(decision, [
    "The package-private request contract identity is `norma.accepted-geometry-to-core-mapping@1`.",
    'readonly contractId: "norma.accepted-geometry-to-core-mapping@1";',
    "readonly contractVersion: 1;",
    'readonly mapperOperationId: "core.accepted-geometry-to-core-mapping.map";',
    'readonly mapperOperationVersion: "0.1.0-pr81";',
    'readonly mappingProfileId: "norma.accepted-geometry-to-core-mapping.rectangles-to-composition-2d@1";',
    "readonly mappingProfileVersion: 1;",
    'readonly targetCoreProfileId: "core.geometry-v1.composition-2d.normalized-rectangles@1";',
    'readonly targetCoreGeometryKind: "composition-2d";',
    'readonly status: "mapped" | "invalid" | "unsupported";',
  ]);
});

test("PR80 target coordinate system matches the current Core canonical constant shape", () => {
  assertIncludes(decision, [
    'readonly kind: "coordinate-system";',
    'readonly id: "norma-canonical-2d-normalized";',
    'readonly origin: "bottom-left";',
    'readonly xAxis: "right";',
    'readonly yAxis: "up";',
    "readonly dimensions: 2;",
    'readonly coordinateScale: "normalized";',
    "No `name`, `xDirection`, `yDirection`, `scale`, metric-unit, pixel-unit, or 3D coordinate-system fields are approved.",
  ]);

  assert.equal(decision.includes("targetCoordinateSystem: CoordinateSystem"), false);
});

test("PR80 primitive mapping matrix is complete and rectangle-only", () => {
  assertIncludes(decision, [
    "| `point` | No | None | Reject; Core V1 has no standalone source-geometry point target for this profile. | `UnsupportedAcceptedGeometryPrimitiveKind` |",
    "| `segment` | No | None | Reject; current Core `SegmentSpace` is one-dimensional and does not exactly represent an observation 2D segment source object. | `UnsupportedAcceptedGeometryPrimitiveKind` |",
    "| `axis` | No | None | Reject; Core V1 has no exact bounded-axis source-geometry target with matching semantics. | `UnsupportedAcceptedGeometryPrimitiveKind` |",
    "| `rectangle` | Yes | `Composition2D.elements[].geometry` as Core `Rect` | Transform normalized top-left/y-down rectangle to normalized bottom-left/y-up Core `Rect` with the formulas in this decision. | None |",
    "The mapper must fail the whole request when any primitive is unsupported.",
    "Partial mapped output is not approved.",
  ]);
});

test("PR80 coordinate transform is explicit and forbids repair", () => {
  assertIncludes(decision, [
    "`coreX = observationX`",
    "`coreY = 1 - observationY`",
    "`coreY = 1 - observationY - observationHeight`",
    "`coreWidth = observationWidth`",
    "`coreHeight = observationHeight`",
    "All mapped values must be finite numbers within inclusive normalized bounds.",
    "must not round, clamp, repair, rescale, apply perspective correction",
    "If an exact transform output is negative zero, the output must canonicalize that value to `0`.",
  ]);
});

test("PR80 preserves primitive IDs source refs and content identity", () => {
  assertIncludes(decision, [
    "`acceptedGeometryContentIdentity` must equal `acceptedGeometry.contentIdentity`.",
    "`sourceObservationId` must equal `acceptedGeometry.sourceObservationId`.",
    "`sourceObservationContentIdentity` must equal `acceptedGeometry.sourceObservationContentIdentity`.",
    "`composition:accepted-geometry:<acceptedGeometryId>:rectangles`",
    "`surface:accepted-geometry:<acceptedGeometryId>:unit`",
    "`element:accepted-geometry:<acceptedGeometryId>:primitive:<primitive.id>`",
    "The mapper must not generate random IDs",
    "use array indexes as the only identity",
    "drop primitive IDs",
  ]);
});

test("PR80 mapper content identity rules are exact", () => {
  assertIncludes(decision, [
    "`mappedGeometryContentIdentity` is `sha256:<64 lowercase hex>` over the deterministic canonical JSON serialization of `mappedGeometry` only.",
    "`resultContentIdentity` is `sha256:<64 lowercase hex>` over the deterministic canonical JSON serialization of the mapping result projection excluding `resultContentIdentity` itself.",
    "The result identity projection includes `requestId`, `status`, `mapperOperationId`, `mapperOperationVersion`, `mappingProfileId`, `targetCoreProfileId`, `targetCoreGeometryKind`, `mappedGeometryContentIdentity`, `primitiveMappings`, `coordinateTransform`, `sourceRefs`, and `diagnostics`.",
    "Diagnostics are included in failed or unsupported result identity.",
    "Object key order is insignificant.",
    "Array order is significant.",
    "No timestamps, random values, local paths, provider payloads, hidden prompts, credentials, image bytes, or environment values participate.",
  ]);
});

test("PR80 diagnostics are exact deterministic and safe", () => {
  assertIncludes(decision, [
    "`InvalidAcceptedGeometryMappingRequest`",
    "`UnsupportedAcceptedGeometryMappingRequest`",
    "`UnsupportedAcceptedGeometryPrimitiveKind`",
    "`AcceptedGeometryCoordinateTransformFailed`",
    "`AcceptedGeometryMappingContentIdentityMismatch`",
    "`AcceptedGeometrySourceIdentityCollision`",
    "All mapping diagnostics have `severity: \"error\"`.",
    "`AcceptedGeometryToCoreMappingRequest`",
    "`TargetCoreGeometry`",
    "Diagnostics must be ordered by request field order, then primitive order, then code, then message.",
    "Diagnostics must not include stack traces, local paths, raw provider payloads, raw images, image bytes, credentials, hidden prompts, chain-of-thought, environment values, or full payload echoes.",
  ]);
});

test("PR80 forbids pack rule tolerance inference and Core evaluation", () => {
  assertIncludes(decision, [
    "The mapper result is not a measurement, evaluation, score, decision, explanation, artifact, visual overlay, construction result, pack selection, rule selection, tolerance selection, or Norma result.",
    "no construction result",
    "no measurement result",
    "no evaluation result",
    "no pack",
    "no rules",
    "no tolerances",
    "PR81 must not implement provider execution, OpenAI calls, image parsing, image files, camera input, CAD import, UI, remote MCP, deployment, real data, pack inference, rule inference, tolerance inference, construction, measurement, evaluation, comparison, explanation, artifact generation, package-root exports, or PR82 integration proof.",
  ]);
});

test("PR80 keeps synthetic-only boundary and PR81 scope narrow", () => {
  assertIncludes(decision, [
    "PR80 and PR81 remain synthetic-data-only.",
    "already validated synthetic `AcceptedGeometry` objects only",
    "package-private mapping request and result types",
    "package-private deterministic mapper",
    "the rectangle-to-`Composition2D` profile approved by PR80",
    "deterministic content identity helpers for the mapper result",
    "PR80 does not approve real user images",
    "OpenAI API calls",
    "deployment",
  ]);
});

test("PR80 branch changes stay limited to the approved doc test and exact guards", () => {
  const changed = branchChangedFiles();

  assert.equal(
    isExactChangedFileSet(changed, pr80ApprovedChangedFiles) ||
      isExactChangedFileSet(changed, r4CurrentOperationsRunbookChangedFiles) ||
      isExactChangedFileSet(changed, pr101ReplayChangedFiles) ||
      isExactChangedFileSet(changed, r2aOutputSchemaChangedFiles) ||
      isExactChangedFileSet(changed, r2bOutputSchemaChangedFiles) ||
      isExactChangedFileSet(changed, r3NonCanonicalStructuredInputChangedFiles),
    true,
    `Unexpected PR80/PR101/R2A/R2B/R3 changed files:\n${changed.join("\n")}`,
  );
});

test("PR80 keeps protected runtime package fixture README and CI surfaces unchanged", () => {
  const changed = branchChangedFiles();
  const protectedAllowlist = isExactChangedFileSet(changed, pr101ReplayChangedFiles)
    ? pr101ReplayChangedFiles
    : isExactChangedFileSet(changed, r4CurrentOperationsRunbookChangedFiles)
      ? r4CurrentOperationsRunbookChangedFiles
      : isExactChangedFileSet(changed, r2aOutputSchemaChangedFiles)
      ? r2aOutputSchemaChangedFiles
      : isExactChangedFileSet(changed, r2bOutputSchemaChangedFiles)
        ? r2bOutputSchemaChangedFiles
        : isExactChangedFileSet(changed, r3NonCanonicalStructuredInputChangedFiles)
          ? r3NonCanonicalStructuredInputChangedFiles
          : [];
  const protectedPatterns = [
    /^src\//,
    /^bin\//,
    /^viewer\//,
    /^examples\//,
    /^tests\/fixtures\//,
    /^\.github\//,
    /^package\.json$/,
    /^package-lock\.json$/,
    /^tsconfig\.json$/,
    /^README\.md$/,
  ];

  assert.deepEqual(
    changed.filter((file) => protectedPatterns.some((pattern) => pattern.test(file)) && !protectedAllowlist.includes(file)),
    [],
  );
});

test("PR101 replay guard rejects unrelated MCP package and CI changes", () => {
  for (const unexpectedFile of [
    "src/mcp/unrelated.ts",
    "src/runtime.ts",
    "package.json",
    ".github/workflows/ci.yml",
    "docs/unrelated.md",
  ]) {
    assert.equal(isExactChangedFileSet([...pr101ReplayChangedFiles, unexpectedFile].sort(), pr101ReplayChangedFiles), false);
    assert.equal(isExactChangedFileSet([...r2aOutputSchemaChangedFiles, unexpectedFile].sort(), r2aOutputSchemaChangedFiles), false);
    assert.equal(isExactChangedFileSet([...r2bOutputSchemaChangedFiles, unexpectedFile].sort(), r2bOutputSchemaChangedFiles), false);
    assert.equal(
      isExactChangedFileSet(
        [...r3NonCanonicalStructuredInputChangedFiles, unexpectedFile].sort(),
        r3NonCanonicalStructuredInputChangedFiles,
      ),
      false,
    );
  }
});

function read(relativePath) {
  return fs.readFileSync(nodePath.join(repositoryRoot, relativePath), "utf8");
}

function assertIncludes(source, snippets) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `expected decision to include: ${snippet}`);
  }
}

function assertHeadingSequence(source, expectedHeadings) {
  const positions = expectedHeadings.map((heading) => {
    const pattern = new RegExp(`^${literalRegExp(heading)}\\s*$`, "m");
    const match = pattern.exec(source);
    assert.notEqual(match, null, `${heading} should exist as a heading`);
    return match.index;
  });

  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
}

function branchChangedFiles() {
  const files = new Set();
  let successfulGitProbes = 0;
  const baseArgs =
    gitOutputLines(["diff", "--name-only", "origin/main...HEAD"]) !== null
      ? ["diff", "--name-only", "origin/main...HEAD"]
      : ["diff", "--name-only", "main...HEAD"];
  for (const args of [
    baseArgs,
    ["diff", "--name-only"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"],
  ]) {
    const outputLines = gitOutputLines(args);
    if (outputLines === null) {
      continue;
    }
    successfulGitProbes += 1;
    for (const file of outputLines) {
      files.add(file);
    }
  }
  assert.notEqual(successfulGitProbes, 0, "Unable to inspect changed files with git");
  return [...files].sort();
}

function isExactChangedFileSet(changed, approvedFiles) {
  return changed.length === approvedFiles.length && approvedFiles.every((file) => changed.includes(file));
}

function gitOutputLines(args) {
  try {
    const output = execGitSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return output === "" ? [] : output.split("\n");
  } catch {
    return null;
  }
}

function literalRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
