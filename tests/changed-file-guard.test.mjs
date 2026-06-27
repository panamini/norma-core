import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import {
  branchChangedFiles,
  geometryHarmonyPackReportExamplesChangedFiles,
  guardExactSetConsolidationChangedFiles,
  guardExactSetConsolidationNonSemgrepMaintenanceChangedFiles,
  isExactChangedFileSet,
  isExactR1GeometrySourceIdentityChangeSet,
  isExactR6CStructuredAnalyzeMcpChangeSet,
  localStructuredAnalyzeReportKitChangedFiles,
  localStructuredAnalyzeReportKitScopeSummaryChangedFiles,
  mcpProtocolContractLockV2ChangedFiles,
  publicApiContractFreezeChangedFiles,
  ratioPackAuthoringContractChangedFiles,
  r1GeometrySourceIdentityChangedFiles,
  r7StructuredAnalyzeHardeningChangedFiles,
  sharedExactApprovedChangedFiles,
  structuredAnalyzeCliUxLayerChangedFiles,
  structuredAnalyzeDeterminismRegressionChangedFiles,
  structuredAnalyzeScenarioConsistencyHardeningChangedFiles,
  structuredAnalyzeScenarioPackChangedFiles,
  structuredAnalyzeScenarioPackNonSemgrepMaintenanceChangedFiles,
  structuredAnalyzeStdioTimeoutStabilityChangedFiles,
  structuredAnalyzeVisualViewerChangedFiles,
} from "./changed-file-guard.mjs";

test("shared exact changed-file guard accepts the exact approved set", () => {
  assert.deepEqual(sharedExactApprovedChangedFiles(r7StructuredAnalyzeHardeningChangedFiles), r7StructuredAnalyzeHardeningChangedFiles);
});

test("shared exact changed-file guard accepts the guard consolidation set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guardExactSetConsolidationChangedFiles),
    guardExactSetConsolidationChangedFiles,
  );
});

test("shared exact changed-file guard accepts the semgrep-filtered guard consolidation set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guardExactSetConsolidationNonSemgrepMaintenanceChangedFiles),
    guardExactSetConsolidationNonSemgrepMaintenanceChangedFiles,
  );
});

test("shared exact changed-file guard accepts the local structured analyze report kit set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localStructuredAnalyzeReportKitChangedFiles),
    localStructuredAnalyzeReportKitChangedFiles,
  );
});

test("shared exact changed-file guard accepts the local report-kit scope summary set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localStructuredAnalyzeReportKitScopeSummaryChangedFiles),
    localStructuredAnalyzeReportKitScopeSummaryChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Geometry Harmony pack/report example set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(geometryHarmonyPackReportExamplesChangedFiles),
    geometryHarmonyPackReportExamplesChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Structured Analyze scenario pack set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeScenarioPackChangedFiles),
    structuredAnalyzeScenarioPackChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Structured Analyze CLI UX layer set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeCliUxLayerChangedFiles),
    structuredAnalyzeCliUxLayerChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R9 scenario consistency hardening set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeScenarioConsistencyHardeningChangedFiles),
    structuredAnalyzeScenarioConsistencyHardeningChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R10 determinism regression set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeDeterminismRegressionChangedFiles),
    structuredAnalyzeDeterminismRegressionChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R11 public API contract freeze set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(publicApiContractFreezeChangedFiles),
    publicApiContractFreezeChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R12 MCP protocol contract lock set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(mcpProtocolContractLockV2ChangedFiles),
    mcpProtocolContractLockV2ChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Structured Analyze visual viewer set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeVisualViewerChangedFiles),
    structuredAnalyzeVisualViewerChangedFiles,
  );
});

test("shared exact changed-file guard accepts the semgrep-filtered Structured Analyze scenario pack set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeScenarioPackNonSemgrepMaintenanceChangedFiles),
    structuredAnalyzeScenarioPackNonSemgrepMaintenanceChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Structured Analyze STDIO timeout stability set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeStdioTimeoutStabilityChangedFiles),
    structuredAnalyzeStdioTimeoutStabilityChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R13 ratio pack authoring contract set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(ratioPackAuthoringContractChangedFiles),
    ratioPackAuthoringContractChangedFiles,
  );
});

test("shared exact changed-file guard treats approved files as a set, not an ordered list", () => {
  const reordered = [...guardExactSetConsolidationChangedFiles].reverse();

  assert.equal(isExactChangedFileSet(reordered, guardExactSetConsolidationChangedFiles), true);
  assert.deepEqual(sharedExactApprovedChangedFiles(reordered), guardExactSetConsolidationChangedFiles);
});

test("shared exact changed-file guard normalizes equivalent path spellings", () => {
  const variants = guardExactSetConsolidationChangedFiles.map((file) =>
    file === "tests/changed-file-guard.test.mjs" ? ".\\tests\\changed-file-guard.test.mjs" : `././${file}`,
  );

  assert.equal(isExactChangedFileSet(variants, guardExactSetConsolidationChangedFiles), true);
  assert.deepEqual(sharedExactApprovedChangedFiles(variants), guardExactSetConsolidationChangedFiles);
});

test("shared exact changed-file guard returns defensive copies", () => {
  const approved = sharedExactApprovedChangedFiles(guardExactSetConsolidationChangedFiles);

  assert.notStrictEqual(approved, guardExactSetConsolidationChangedFiles);
  approved.pop();
  assert.deepEqual(sharedExactApprovedChangedFiles(guardExactSetConsolidationChangedFiles), guardExactSetConsolidationChangedFiles);
});

test("shared exact changed-file guard rejects a missing required file", () => {
  const missingRequiredFile = localStructuredAnalyzeReportKitScopeSummaryChangedFiles.filter(
    (file) => file !== "tests/changed-file-guard.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);
});

test("shared exact changed-file guard rejects an incomplete Geometry Harmony pack/report example set", () => {
  const missingRequiredFile = geometryHarmonyPackReportExamplesChangedFiles.filter(
    (file) => file !== "tests/ratio-pack-model.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);
});

test("shared exact changed-file guard rejects an extra unrelated file", () => {
  assert.equal(
    sharedExactApprovedChangedFiles([...localStructuredAnalyzeReportKitScopeSummaryChangedFiles, "tests/unrelated.test.mjs"]),
    null,
  );
});

test("shared exact changed-file guard rejects extra files in the Geometry Harmony pack/report example set", () => {
  assert.equal(
    sharedExactApprovedChangedFiles([...geometryHarmonyPackReportExamplesChangedFiles, "src/mcp/stdio-protocol.ts"]),
    null,
  );
});

test("shared exact changed-file guard rejects extra files in the Structured Analyze visual viewer set", () => {
  assert.equal(
    sharedExactApprovedChangedFiles([...structuredAnalyzeVisualViewerChangedFiles, "src/cli/analyze.ts"]),
    null,
  );
});

test("shared exact changed-file guard does not treat broad path globs as approvals", () => {
  for (const broadPath of ["src/**", "docs/**", "bin/**", "tests/**"]) {
    assert.equal(sharedExactApprovedChangedFiles([broadPath]), null);
    assert.equal(isExactChangedFileSet([broadPath], r7StructuredAnalyzeHardeningChangedFiles), false);
  }
});

test("shared exact changed-file guard does not approve future report-kit-like files implicitly", () => {
  const futureReportKitLikeFiles = [
    "docs/local-structured-analyze-report-kit.md",
    "src/local-report/structured-analyze-report.ts",
    "tests/local-structured-analyze-report-kit.test.mjs",
  ];

  assert.equal(sharedExactApprovedChangedFiles(futureReportKitLikeFiles), null);
});

test("shared R6C exact guard preserves legacy R6D metadata approval", () => {
  const r6dChatgptMcpMetadataCompatibilityChangedFiles = [
    "src/mcp/stdio-protocol.ts",
    "tests/mcp-structured-composition-analysis-contract.test.mjs",
    "tests/mcp-tools-call-contract.test.mjs",
    "tests/mcp-tools-list-contract.test.mjs",
    "tests/r6c-structured-analyze-mcp-change-set.mjs",
  ];

  assert.equal(isExactR6CStructuredAnalyzeMcpChangeSet(r6dChatgptMcpMetadataCompatibilityChangedFiles), true);
  assert.equal(
    isExactR6CStructuredAnalyzeMcpChangeSet([...r6dChatgptMcpMetadataCompatibilityChangedFiles, "tests/unrelated.test.mjs"]),
    false,
  );
});

test("shared R1 exact guard preserves filtered geometry source identity approval", () => {
  const r1GeometrySourceIdentitySemgrepGuardMaintenanceFiles = new Set([
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
  const filteredR1GeometrySourceIdentityChangedFiles = r1GeometrySourceIdentityChangedFiles.filter(
    (file) => !r1GeometrySourceIdentitySemgrepGuardMaintenanceFiles.has(file),
  );

  assert.equal(isExactR1GeometrySourceIdentityChangeSet(filteredR1GeometrySourceIdentityChangedFiles), true);
  assert.equal(
    isExactR1GeometrySourceIdentityChangeSet([
      ...filteredR1GeometrySourceIdentityChangedFiles,
      "tests/unrelated.test.mjs",
    ]),
    false,
  );
});

test("branch changed-file detection fails closed when git probes cannot run", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "changed-file-guard-"));

  try {
    assert.throws(
      () => branchChangedFiles(repoRoot),
      (error) => {
        assert.doesNotMatch(error.message, /known base refs/);
        assert.equal(error instanceof Error, true);
        assert.match(error.message, /Command failed: git diff --name-only/);
        return true;
      },
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("branch changed-file detection fails closed when known base refs are absent", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "changed-file-guard-"));

  try {
    execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["checkout", "-B", "topic"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["commit", "--allow-empty", "-m", "initial"], { cwd: repoRoot, stdio: "ignore" });

    assert.throws(
      () => branchChangedFiles(repoRoot),
      /known base refs/,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("branch changed-file detection includes working tree files when a base ref exists", async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "changed-file-guard-"));

  try {
    execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["checkout", "-B", "main"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["commit", "--allow-empty", "-m", "initial"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["checkout", "-B", "topic"], { cwd: repoRoot, stdio: "ignore" });
    await writeFile(join(repoRoot, "local.test.mjs"), "");

    assert.deepEqual(branchChangedFiles(repoRoot), ["local.test.mjs"]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
