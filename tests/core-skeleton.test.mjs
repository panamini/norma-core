import assert from "node:assert/strict";
import test from "node:test";

import {
  CORE_DIAGNOSTIC_CODES,
  CORE_SKELETON_OPERATION_REGISTRY,
  createCoreWarning,
  executeCoreOperation,
  suppressCoreWarnings,
  validateCoreDependencyBoundary,
  validateCoreSkeleton,
  validateOutputProvenance,
} from "../dist/src/index.js";

const diagnosticFields = [
  "code",
  "severity",
  "message",
  "targetRef",
  "source",
  "blocking",
  "provenance",
];

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function assertStructuredResult(result) {
  assert.equal(typeof result, "object");
  assert.ok(result.status);
  assert.ok(Array.isArray(result.errors));
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.outputRefs));
  assert.ok("provenance" in result);
  assert.ok("runRef" in result);
  assert.ok("packLockRef" in result);
  assert.ok("operationContextRef" in result);

  for (const diagnostic of [...result.errors, ...result.warnings]) {
    for (const field of diagnosticFields) {
      assert.ok(field in diagnostic, `diagnostic missing ${field}`);
    }
  }
}

test("validateCoreSkeleton returns a structured result", () => {
  const result = validateCoreSkeleton();

  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.equal(result.errors.length, 0);
});

test("required and additional PR1 diagnostics are exported", () => {
  assert.deepEqual(
    new Set(CORE_DIAGNOSTIC_CODES),
    new Set([
      "MissingOperation",
      "UnsupportedOperation",
      "NotImplemented",
      "InvalidInputShape",
      "CriticalWarningNotSuppressible",
      "MissingProvenance",
      "OperationNotImplemented",
      "MissingOperationName",
      "MissingOperationVersion",
      "InternalInvariantViolation",
      "ForbiddenCoreDependency",
    ]),
  );
});

test("missing operation returns MissingOperation", () => {
  const result = executeCoreOperation({});

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("MissingOperation"));
});

test("unknown operation returns UnsupportedOperation", () => {
  const result = executeCoreOperation({
    operation: { name: "core.unknown", version: "0.1.0" },
    input: {},
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("UnsupportedOperation"));
});

test("known stub operation returns not implemented without fake output", () => {
  const result = executeCoreOperation({
    operation: { name: "core.skeleton.stub", version: "0.1.0" },
    input: {},
  });

  assertStructuredResult(result);
  assert.equal(result.status, "not_implemented");
  assert.equal(result.output, null);
  assert.deepEqual(result.outputRefs, []);
  assert.ok(diagnosticCodes(result).includes("NotImplemented"));
});

test("malformed input returns InvalidInputShape", () => {
  const result = executeCoreOperation({
    operation: { name: "core.skeleton.stub", version: "0.1.0" },
    input: "free-form prompt input",
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("InvalidInputShape"));
});

test("critical warnings cannot be suppressed", () => {
  const criticalWarning = createCoreWarning({
    code: "MissingProvenance",
    severity: "critical",
    message: "Critical provenance warning.",
    sourceRef: { kind: "provenance", ref: "test" },
  });

  const result = suppressCoreWarnings([criticalWarning], ["MissingProvenance"]);

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("CriticalWarningNotSuppressible"));
});

test("derived output without provenance returns MissingProvenance", () => {
  const result = validateOutputProvenance([{ kind: "core-output", ref: "derived:1" }], null);

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("MissingProvenance"));
});

test("forbidden core dependency returns ForbiddenCoreDependency", () => {
  const result = validateCoreDependencyBoundary(["react-ui-client"]);

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("ForbiddenCoreDependency"));
});

test("the skeleton registry exposes only the known stub operation", () => {
  assert.deepEqual(Object.keys(CORE_SKELETON_OPERATION_REGISTRY), ["core.skeleton.stub"]);
});
