import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AUTH0_PROVIDER,
  NORMA_CANONICAL_SCOPE,
  parseSandboxQualificationEvidence,
  runSandboxQualification,
  SANDBOX_QUALIFICATION_CRITERIA,
  SCALEKIT_PROVIDER,
  SCALEKIT_SCOPE,
  SandboxQualificationInputError,
} from "../qualification/sandbox-qualification.mjs";

const cliPath = fileURLToPath(new URL("../bin/norma-core-sandbox-qualification.mjs", import.meta.url));

test("qualification matrix is exactly nine criteria with the canonical scope mapping", () => {
  assert.deepEqual(
    SANDBOX_QUALIFICATION_CRITERIA.map(({ id }) => id),
    [
      "discovery",
      "client_onboarding",
      "pkce_s256",
      "resource_audience",
      "scope_mapping",
      "token_verification",
      "consent_refresh_revocation",
      "railway_postgresql_rls",
      "isolation_rollback_cleanup",
    ],
  );
  const report = runSandboxQualification();
  assert.equal(report.provider, SCALEKIT_PROVIDER);
  assert.deepEqual(report.providerOrder, [SCALEKIT_PROVIDER]);
  assert.deepEqual(report.scopeMapping, {
    providerScope: SCALEKIT_SCOPE,
    normaScope: NORMA_CANONICAL_SCOPE,
  });
  assert.equal(report.productionReadiness, "CLOSED");
  assert.ok(report.criteria.every(({ status }) => status === "NOT_RUN"));
});

test("offline or historical evidence never opens the production gate", () => {
  const records = SANDBOX_QUALIFICATION_CRITERIA.map(({ id }, index) => ({
    criterion: id,
    status: "PASS",
    evidenceClass: "offline",
    evidenceRef: `offline-${index + 1}`,
    observedAt: "2026-07-25T00:00:00Z",
  }));
  const report = runSandboxQualification({ mode: "evidence", evidence: records });
  assert.equal(report.productionReadiness, "CLOSED");
  assert.ok(report.criteria.every(({ status }) => status === "UNVERIFIED"));
});

test("only complete live evidence can produce an open evaluation result", () => {
  const records = SANDBOX_QUALIFICATION_CRITERIA.map(({ id }, index) => ({
    criterion: id,
    status: "PASS",
    evidenceClass: "live",
    evidenceRef: `live-${index + 1}`,
    observedAt: "2026-07-25T00:00:00Z",
  }));
  const report = runSandboxQualification({ mode: "evidence", evidence: records });
  assert.equal(report.productionReadiness, "OPEN");
  assert.ok(report.criteria.every(({ status }) => status === "PASS"));
  assert.equal(report.nextAction, "REVIEW_ALL_CRITERIA_AND_APPROVE");
});

test("scope, raw-token, claims, email, prompt, and database fields are rejected", () => {
  for (const forbiddenField of ["rawToken", "claims", "email", "prompt", "database"]) {
    assert.throws(
      () => parseSandboxQualificationEvidence({
        records: [{
          criterion: "pkce_s256",
          status: "PASS",
          evidenceClass: "live",
          evidenceRef: "safe-ref",
          observedAt: "2026-07-25T00:00:00Z",
          [forbiddenField]: "must-not-be-read-or-printed",
        }],
      }),
      SandboxQualificationInputError,
    );
  }
  assert.throws(
    () => parseSandboxQualificationEvidence({
      records: [{
        criterion: "pkce_s256",
        status: "PASS",
        evidenceClass: "live",
        evidenceRef: "Bearer-token-value",
        observedAt: "2026-07-25T00:00:00Z",
      }],
    }),
    SandboxQualificationInputError,
  );
});

test("Auth0 requires an explicit Scalekit fallback marker and keeps provider order", () => {
  assert.throws(
    () => runSandboxQualification({ provider: AUTH0_PROVIDER }),
    SandboxQualificationInputError,
  );
  const report = runSandboxQualification({
    provider: AUTH0_PROVIDER,
    fallbackFromScalekit: true,
  });
  assert.deepEqual(report.providerOrder, [SCALEKIT_PROVIDER, AUTH0_PROVIDER]);
  assert.equal(report.productionReadiness, "CLOSED");
});

test("CLI defaults to a safe dry-run and emits no supplied sensitive value", () => {
  const output = execFileSync(process.execPath, [cliPath], { encoding: "utf8" });
  const report = JSON.parse(output);
  assert.equal(report.mode, "dry-run");
  assert.equal(report.productionReadiness, "CLOSED");
  assert.doesNotMatch(output, /must-not-be-read-or-printed|Bearer-token-value/iu);
});

test("CLI rejects unsafe evidence with a safe closed result", () => {
  const directory = mkdtempSync(join(tmpdir(), "norma-sandbox-qualification-"));
  const evidencePath = join(directory, "evidence.json");
  writeFileSync(evidencePath, JSON.stringify({
    records: [{
      criterion: "pkce_s256",
      status: "PASS",
      evidenceClass: "live",
      evidenceRef: "safe-ref",
      observedAt: "2026-07-25T00:00:00Z",
      rawToken: "must-not-be-read-or-printed",
    }],
  }));
  try {
    assert.throws(
      () => execFileSync(process.execPath, [cliPath, "--evidence", evidencePath], { encoding: "utf8" }),
      (error) => error.status === 2
        && error.stdout.includes('"productionReadiness":"CLOSED"')
        && !error.stdout.includes("must-not-be-read-or-printed"),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
