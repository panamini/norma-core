import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import {
  branchChangedFiles,
  cleanMainValidationAndPr129OperatorProofChangedFiles,
  controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  explicitAcceptedObservationToCoreHandoffChangedFiles,
  isExactChangedFileSet,
  isCleanBaseValidationContext,
  localVisualCandidateReviewChangedFiles,
  privateDevChatGptMcpCompleteLiveProofChangedFiles,
  privateDevChatGptMcpVisualPilotGateChangedFiles,
  privateDevLocalVisualMcpOrchestrationChangedFiles,
  pr132ValidationHardeningCheckpointChangedFiles,
  localVisualCandidateReviewProductSurfaceChangedFiles,
  localVisualObservationToCorePilotContractChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const decisionPath = join(
  repoRoot,
  "docs/decisions/2026-07-10-local-visual-observation-to-core-pilot-contract.md",
);
const roadmapPath = join(repoRoot, "docs/BUSINESS_READINESS_ROADMAP.md");

test("PR127 decision exists with the complete approval-contract structure", async () => {
  const doc = await readDecision();

  assertHeadings(doc, [
    "# Local Visual Observation-to-Core Pilot Contract",
    "## Status",
    "## Approved Pipeline",
    "## Provider Execution Receipt Identity",
    "## Trust And Acceptance Authority",
    "## Human Candidate Selection Record",
    "## Approved Mapper Boundary",
    "## Candidate Visual Observation Envelope",
    "## Candidate Validation And Persistence",
    "## Provider Schema Termination",
    "## Identity And Provenance Chain",
    "## Fail-Closed Boundary",
    "## PR128 Exact Implementation Scope",
    "## PR129 Exact Implementation Scope",
    "## Explicit Non-Goals",
    "## Conditional Exact-Set Guard Trigger",
    "## Validation Gates",
  ]);
  assertIncludes(doc, [
    "Approved as the PR127 docs/tests-only contract",
    "It does not implement either runtime",
    "CC-20260710-PR127-LOCAL-VISUAL-OBSERVATION-TO-CORE v2",
    "The approved sequence is strictly PR127 -> PR128 -> PR129",
    "PR129 must not begin before PR128 merges",
  ]);
});

test("PR127 freezes the complete provider-to-canonical-truth pipeline", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Approved Pipeline",
    "## Trust And Acceptance Authority",
  );

  assertIncludes(section, [
    "live provider-specific response, processed in memory",
    "-> provider-specific adapter validation, processed in memory",
    "-> redacted content-addressed provider execution receipt",
    "-> exact provider-neutral candidate visual observation envelope",
    "-> exact human candidate selection record outside the provider boundary",
    "-> existing AcceptedGeometry@1",
    "-> existing PR125 controlled provider observation acceptance proof",
    "-> approved provider-neutral mapping-context boundary",
    "-> existing deterministic AcceptedGeometry mapper",
    "-> existing normalization / Structured Analyze",
    "-> canonical result.json",
    "-> derived guide/report artifacts",
    "The provider-specific response and schema terminate inside the adapter",
    "`result.json` remains canonical computational truth",
    "Guide, report, proof, viewer, and demo artifacts remain derived",
  ]);
});

test("PR127 freezes one closed typed content-addressed provider execution receipt", async () => {
  const schema = await readExecutionReceiptSchema();

  assertClosedObject(schema, [
    "contractId",
    "contractVersion",
    "executionReceiptContentIdentity",
    "sourceImageContentIdentity",
    "providerClass",
    "endpointClass",
    "responseStatusClass",
    "providerResponseContentIdentity",
    "structuredOutputSchemaVersion",
    "adapterOperationId",
    "adapterOperationVersion",
    "persistence",
  ]);
  assertContractIdSchema(schema.properties.contractId);
  assert.equal(
    schema.properties.contractId.const,
    "norma.local-visual-provider-execution-receipt@1",
  );
  assert.equal(schema.properties.contractVersion.type, "integer");
  assert.equal(schema.properties.contractVersion.const, 1);
  for (const field of [
    "executionReceiptContentIdentity",
    "sourceImageContentIdentity",
    "providerResponseContentIdentity",
  ]) {
    assertDigestSchema(schema.properties[field]);
  }
  assert.deepEqual(
    ["providerClass", "endpointClass", "responseStatusClass"].map(
      (field) => schema.properties[field].type,
    ),
    ["string", "string", "string"],
  );
  assert.equal(schema.properties.providerClass.const, "controlled_live_provider");
  assert.equal(schema.properties.endpointClass.const, "responses_api");
  assert.equal(schema.properties.responseStatusClass.const, "2xx_success");
  assert.equal(
    schema.properties.structuredOutputSchemaVersion.const,
    "controlled-rectangle-candidates@1",
  );
  assert.equal(
    schema.properties.structuredOutputSchemaVersion.format,
    "norma-versioned-schema-identifier",
  );
  assertIdentifierSchema(schema.properties.adapterOperationId);
  assert.equal(schema.properties.adapterOperationVersion.type, "integer");
  assert.equal(schema.properties.adapterOperationVersion.const, 1);
  assertClosedObject(schema.properties.persistence, [
    "rawProviderResponsePersisted",
    "requestBodyPersisted",
    "rawImagePersisted",
    "localPathPersisted",
    "urlPersisted",
    "providerRequestIdPersisted",
    "exactModelValuePersisted",
    "secretOrCredentialPersisted",
  ]);
  for (const field of schema.properties.persistence.required) {
    assert.equal(schema.properties.persistence.properties[field].type, "boolean", field);
    assert.equal(schema.properties.persistence.properties[field].const, false, field);
  }
});

test("PR127 makes same-image executions distinct and rejects every receipt/candidate cross-pair", () => {
  const receiptA = createExecutionReceipt("response body A");
  const receiptB = createExecutionReceipt("response body B");
  const receiptObservationA = createCandidateCapablePr124Observation(receiptA);
  const receiptObservationB = createCandidateCapablePr124Observation(receiptB);
  const candidateA = createCandidateEnvelope(receiptA, "execution-a", receiptObservationA);
  const candidateB = createCandidateEnvelope(receiptB, "execution-b", receiptObservationB);

  assert.notEqual(
    receiptA.providerResponseContentIdentity,
    receiptB.providerResponseContentIdentity,
  );
  assert.notEqual(
    receiptA.executionReceiptContentIdentity,
    receiptB.executionReceiptContentIdentity,
  );
  assert.equal(validateReceiptCandidatePair(receiptA, receiptObservationA, candidateA), true);
  assert.equal(validateReceiptCandidatePair(receiptB, receiptObservationB, candidateB), true);
  assert.throws(
    () => validateReceiptCandidatePair(receiptA, receiptObservationA, candidateB),
    /execution receipt identity mismatch/u,
  );
  assert.throws(
    () => validateReceiptCandidatePair(receiptB, receiptObservationB, candidateA),
    /execution receipt identity mismatch/u,
  );
  assert.throws(
    () => validateReceiptCandidatePair(receiptA, receiptObservationB, candidateB),
    /PR124 execution receipt identity mismatch/u,
  );
  assert.throws(
    () => validateReceiptCandidatePair(receiptB, receiptObservationA, candidateA),
    /PR124 execution receipt identity mismatch/u,
  );
});

test("PR127 binds candidate provenance to the canonical PR124 v2 observation object", () => {
  const receipt = createExecutionReceipt("canonical PR124 observation response");
  const receiptObservation = createCandidateCapablePr124Observation(receipt);
  const candidateEnvelope = createCandidateEnvelope(
    receipt,
    "canonical-pr124-observation",
    receiptObservation,
  );
  const expectedObservationContentIdentity = sha256Identity(canonicalJson(receiptObservation));

  assert.equal(
    candidateEnvelope.provenance.sourceReceiptObservationContentIdentity,
    expectedObservationContentIdentity,
  );

  const fabricatedEnvelope = structuredClone(candidateEnvelope);
  fabricatedEnvelope.provenance.sourceReceiptObservationContentIdentity = sha256Identity(
    receiptObservation.observationId,
  );
  fabricatedEnvelope.observationContentIdentity = contentIdentityExcluding(
    fabricatedEnvelope,
    "observationContentIdentity",
  );

  assert.throws(
    () => validateReceiptCandidatePair(receipt, receiptObservation, fabricatedEnvelope),
    /PR124 observation content identity mismatch/u,
  );

  for (const mutateObservation of [
    (observation) => {
      observation.sourceTruth = true;
    },
    (observation) => {
      observation.unapprovedField = "forbidden";
    },
  ]) {
    const malformedObservation = structuredClone(receiptObservation);
    mutateObservation(malformedObservation);
    assert.throws(
      () => createCandidateEnvelope(
        receipt,
        "malformed-pr124-observation",
        malformedObservation,
      ),
      /PR124 observation is not the exact closed v2 contract|PR124 observation field mismatch/u,
    );

    const malformedPairEnvelope = structuredClone(candidateEnvelope);
    malformedPairEnvelope.provenance.sourceReceiptObservationContentIdentity = sha256Identity(
      canonicalJson(malformedObservation),
    );
    malformedPairEnvelope.observationContentIdentity = contentIdentityExcluding(
      malformedPairEnvelope,
      "observationContentIdentity",
    );
    assert.throws(
      () => validateReceiptCandidatePair(
        receipt,
        malformedObservation,
        malformedPairEnvelope,
      ),
      /PR124 observation is not the exact closed v2 contract|PR124 observation field mismatch/u,
    );
  }
});

test("PR127 freezes strict PR123 and PR124 execution identity propagation with v1 compatibility", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Provider Execution Receipt Identity",
    "## Trust And Acceptance Authority",
  );

  assertIncludes(section, [
    "SHA-256 identity of the exact raw provider response bytes/body computed before parsing and only in memory",
    "complete receipt excluding only `executionReceiptContentIdentity` itself",
    "The current PR123 proof and `norma.controlled-provider-observation-contract.v1` receipt-only path remain unchanged and compatible",
    "may not fall back to those v1 receipt-only semantics",
    "carry `providerExecutionReceiptContentIdentity`",
    "`norma.controlled-provider-observation-contract.v2`, version `2`",
    "`controlled-provider-observation:v2:<execution-receipt-hex>`",
    "All other PR124 v1 authority flags remain unchanged",
    "Two executions over the same image remain distinct when their response bytes differ",
    "must fail closed even when every redacted class and source image identity matches",
  ]);
});

test("PR127 execution and selection schemas persist no raw or provider-specific values", async () => {
  for (const schema of [await readExecutionReceiptSchema(), await readSelectionSchema()]) {
    const fields = collectPropertyNames(schema);
    for (const forbiddenField of [
      "providerPayload",
      "providerResponse",
      "rawResponse",
      "rawImage",
      "base64",
      "localPath",
      "url",
      "secret",
      "credential",
      "providerRequestId",
      "model",
      "modelEnvironmentValue",
      "hiddenPrompt",
      "chainOfThought",
      "realUserData",
    ]) {
      assert.equal(fields.has(forbiddenField), false, forbiddenField);
    }
  }
});

test("PR127 freezes one versioned mapper literal without weakening synthetic compatibility", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Approved Mapper Boundary",
    "## Candidate Visual Observation Envelope",
  );

  assertIncludes(section, [
    "explicit-external-evidence-acceptance@1",
    "The existing `synthetic-only` literal remains supported without semantic drift",
    "It is not an authorization token",
    "must first run and validate the PR125 acceptance proof",
    "Only after that proof succeeds",
    "construct a mapper request containing",
    "The existing mapper must still validate `AcceptedGeometry@1` internally",
    "No caller-supplied mapping result, mapped geometry, Core input, or detached proof",
  ]);

  assert.ok(
    section.indexOf("must first run and validate the PR125 acceptance proof")
      < section.indexOf("construct a mapper request containing"),
    "PR125 proof validation must precede mapper request construction",
  );
  assert.equal(
    (section.match(/explicit-external-evidence-acceptance@1/gu) ?? []).length,
    2,
  );
});

test("PR127 candidate envelope has an exact closed versioned top-level shape", async () => {
  const schema = await readCandidateSchema();
  const topLevelFields = [
    "contractId",
    "contractVersion",
    "observationId",
    "observationContentIdentity",
    "sourceImage",
    "provenance",
    "coordinateFrame",
    "rectangleCandidates",
    "lossyWarnings",
    "authority",
    "persistence",
    "outcomes",
  ];

  assert.equal(schema.type, "object");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, topLevelFields);
  assert.deepEqual(Object.keys(schema.properties), topLevelFields);
  assertContractIdSchema(schema.properties.contractId);
  assert.equal(schema.properties.contractId.const, "norma.local-visual-candidate-observation@1");
  assert.equal(schema.properties.contractVersion.type, "integer");
  assert.equal(schema.properties.contractVersion.const, 1);
  assertIdentifierSchema(schema.properties.observationId);
  assertDigestSchema(schema.properties.observationContentIdentity);
});

test("PR127 candidate envelope closes source provenance coordinate and authority objects", async () => {
  const { properties } = await readCandidateSchema();

  assertClosedObject(properties.sourceImage, [
    "contentIdentity",
    "rawImagePersisted",
    "base64Persisted",
    "localPathPersisted",
    "urlPersisted",
  ]);
  assertDigestSchema(properties.sourceImage.properties.contentIdentity);
  for (const field of ["rawImagePersisted", "base64Persisted", "localPathPersisted", "urlPersisted"]) {
    assert.equal(properties.sourceImage.properties[field].const, false, field);
  }

  assertClosedObject(properties.provenance, [
    "provenanceClass",
    "adapterBoundary",
    "sourceReceiptObservationId",
    "sourceReceiptObservationContentIdentity",
    "providerExecutionReceiptContentIdentity",
    "providerSpecificSchemaTerminated",
    "manualOnly",
    "localOnly",
    "realUserData",
  ]);
  assert.equal(
    properties.provenance.properties.provenanceClass.const,
    "controlled-local-live-visual-observation",
  );
  assert.equal(
    properties.provenance.properties.adapterBoundary.const,
    "provider-specific-response-to-provider-neutral-candidate-observation@1",
  );
  assert.equal(
    properties.provenance.properties.adapterBoundary.format,
    "norma-versioned-boundary-identifier",
  );
  assertIdentifierSchema(properties.provenance.properties.sourceReceiptObservationId);
  assertDigestSchema(properties.provenance.properties.sourceReceiptObservationContentIdentity);
  assertDigestSchema(properties.provenance.properties.providerExecutionReceiptContentIdentity);
  assert.equal(properties.provenance.properties.providerSpecificSchemaTerminated.const, true);
  assert.equal(properties.provenance.properties.manualOnly.const, true);
  assert.equal(properties.provenance.properties.localOnly.const, true);
  assert.equal(properties.provenance.properties.realUserData.const, false);

  assertClosedObject(properties.coordinateFrame, [
    "dimensions",
    "coordinateScale",
    "origin",
    "xDirection",
    "yDirection",
    "bounds",
    "sourcePixelWidth",
    "sourcePixelHeight",
  ]);
  assert.equal(properties.coordinateFrame.properties.dimensions.const, 2);
  assert.equal(properties.coordinateFrame.properties.coordinateScale.const, "normalized");
  assert.equal(properties.coordinateFrame.properties.origin.const, "top-left");
  assert.equal(properties.coordinateFrame.properties.xDirection.const, "right");
  assert.equal(properties.coordinateFrame.properties.yDirection.const, "down");
  assertClosedObject(properties.coordinateFrame.properties.bounds, ["x", "y"]);
  assert.deepEqual(properties.coordinateFrame.properties.bounds.properties.x.const, [0, 1]);
  assert.deepEqual(properties.coordinateFrame.properties.bounds.properties.y.const, [0, 1]);
  for (const field of ["sourcePixelWidth", "sourcePixelHeight"]) {
    assert.equal(properties.coordinateFrame.properties[field].type, "integer", field);
    assert.equal(properties.coordinateFrame.properties[field].format, "positive-source-pixel-dimension", field);
    assert.equal(properties.coordinateFrame.properties[field].minimum, 1, field);
  }

  assertClosedObject(properties.authority, [
    "providerEvidenceOnly",
    "sourceTruth",
    "acceptedGeometry",
    "coreInput",
    "maySelfAccept",
    "requiresExplicitHumanAcceptance",
    "mayAuthorizeMapping",
    "mayAuthorizeResultJson",
    "ratioAuthority",
    "packAuthority",
    "ruleAuthority",
    "toleranceAuthority",
    "evaluationAuthority",
  ]);
  assert.equal(properties.authority.properties.providerEvidenceOnly.const, true);
  assert.equal(properties.authority.properties.requiresExplicitHumanAcceptance.const, true);
  for (const field of [
    "sourceTruth",
    "acceptedGeometry",
    "coreInput",
    "maySelfAccept",
    "mayAuthorizeMapping",
    "mayAuthorizeResultJson",
    "ratioAuthority",
    "packAuthority",
    "ruleAuthority",
    "toleranceAuthority",
    "evaluationAuthority",
  ]) {
    assert.equal(properties.authority.properties[field].const, false, field);
  }
});

test("PR127 rectangle candidates are ordered normalized rectangles with diagnostic-only confidence", async () => {
  const doc = await readDecision();
  const schema = await readCandidateSchema();
  const candidates = schema.properties.rectangleCandidates;
  const candidate = candidates.items;

  assert.equal(candidates.type, "array");
  assert.equal(candidates.minItems, 1);
  assertClosedObject(candidate, ["candidateId", "order", "x", "y", "width", "height"], [
    "diagnosticMetadata",
  ]);
  assertIdentifierSchema(candidate.properties.candidateId);
  assert.equal(candidate.properties.order.type, "integer");
  assert.equal(candidate.properties.order.minimum, 0);
  for (const field of ["x", "y"]) {
    assert.equal(candidate.properties[field].minimum, 0, field);
    assert.equal(candidate.properties[field].maximum, 1, field);
    assert.equal(candidate.properties[field].format, "finite-normalized-unit-interval", field);
  }
  for (const field of ["width", "height"]) {
    assert.equal(candidate.properties[field].exclusiveMinimum, 0, field);
    assert.equal(candidate.properties[field].maximum, 1, field);
    assert.equal(candidate.properties[field].format, "finite-normalized-positive-unit-interval", field);
  }
  assertClosedObject(candidate.properties.diagnosticMetadata, ["providerConfidence"]);
  assert.equal(candidate.properties.diagnosticMetadata.properties.providerConfidence.type, "number");
  assert.equal(
    candidate.properties.diagnosticMetadata.properties.providerConfidence.format,
    "finite-normalized-unit-interval",
  );
  assert.equal(candidate.properties.diagnosticMetadata.properties.providerConfidence.minimum, 0);
  assert.equal(candidate.properties.diagnosticMetadata.properties.providerConfidence.maximum, 1);

  assertIncludes(doc, [
    "`order` is exactly the zero-based array position",
    "All rectangle numbers are finite",
    "`x + width <= 1`",
    "`y + height <= 1`",
    "sourcePixelWidth",
    "must match the validated candidate-capable PR124 v2 observation",
    "`provenance.providerExecutionReceiptContentIdentity` must match",
    "`sourceImage.contentIdentity` must also match the receipt and PR124 non-null",
    "Any cross-execution pairing fails closed",
    "carry no acceptance authority",
    "`diagnosticMetadata` is optional as a whole",
    "Confidence is diagnostic only",
  ]);
});

test("PR127 freezes allowlisted lossy warnings and redacted-only persistence", async () => {
  const { properties } = await readCandidateSchema();

  assertClosedObject(properties.lossyWarnings.items, ["warningId", "code", "candidateId"]);
  assertIdentifierSchema(properties.lossyWarnings.items.properties.warningId);
  assert.deepEqual(properties.lossyWarnings.items.properties.code.enum, [
    "coordinate-normalization-loss",
    "rectangle-approximation-loss",
    "provider-confidence-diagnostic-only",
  ]);
  assert.deepEqual(properties.lossyWarnings.items.properties.candidateId.type, ["string", "null"]);
  assert.equal(
    properties.lossyWarnings.items.properties.candidateId.format,
    "norma-local-identifier",
  );

  assertClosedObject(properties.persistence, [
    "providerPayloadPersisted",
    "rawProviderResponsePersisted",
    "rawImagePersisted",
    "redactedStructuredObservationOnly",
  ]);
  assert.equal(properties.persistence.properties.providerPayloadPersisted.const, false);
  assert.equal(properties.persistence.properties.rawProviderResponsePersisted.const, false);
  assert.equal(properties.persistence.properties.rawImagePersisted.const, false);
  assert.equal(properties.persistence.properties.redactedStructuredObservationOnly.const, true);

  assertClosedObject(properties.outcomes, [
    "acceptedGeometryProduced",
    "coreInputProduced",
    "structuredAnalyzeRun",
    "resultJsonProduced",
  ]);
  for (const field of properties.outcomes.required) {
    assert.equal(properties.outcomes.properties[field].const, false, field);
  }
});

test("PR127 envelope schema contains no forbidden authority or raw payload fields", async () => {
  const schemaFields = collectPropertyNames(await readCandidateSchema());

  for (const forbiddenField of [
    "acceptedGeometryPayload",
    "acceptedStructuredGeometry",
    "coreInputPayload",
    "resultJson",
    "ratio",
    "pack",
    "rule",
    "tolerance",
    "measurement",
    "evaluation",
    "decision",
    "artifact",
    "providerPayload",
    "providerResponse",
    "rawResponse",
    "rawImage",
    "base64",
    "localPath",
    "url",
    "secret",
    "credential",
    "hiddenPrompt",
    "chainOfThought",
    "modelEnvironmentValue",
    "realUserDataPayload",
    "label",
  ]) {
    assert.equal(schemaFields.has(forbiddenField), false, forbiddenField);
  }
});

test("PR127 terminates provider-specific schemas before Core and package contracts", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Provider Schema Termination",
    "## Identity And Provenance Chain",
  );

  assertIncludes(section, [
    "exists only inside the PR129 adapter and only in memory",
    "converts it to the exact provider-neutral candidate envelope, then discards it",
    "must not appear in the candidate contract, AcceptedGeometry, mapper request",
    "Core must never import provider-specific types",
  ]);
});

test("PR127 reuses PR125 human acceptance authority and rejects every automatic substitute", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Trust And Acceptance Authority",
    "## Approved Mapper Boundary",
  );

  assertIncludes(section, [
    "Provider output, prompts, confidence, labels, measurements, artifacts, and candidate rectangles are untrusted evidence",
    "The first pilot requires a separate, affirmative human selection outside the provider boundary",
    "Absence of rejection is not acceptance",
    "cannot create `AcceptedGeometry`",
    "the existing PR125 acceptance boundary",
    "createControlledProviderObservationAcceptanceProofV1",
    "must not introduce a second acceptance authority",
    "must minimally extend the same package-private PR125 proof path",
    "validate the candidate-capable PR124 contract first",
    "validate the exact candidate envelope second",
    "validate the exact human selection third",
    "validate the candidate envelope, selection record, and `AcceptedGeometry@1` together",
    "must require `acceptanceActor.actorClass: \"human\"`",
    "must identify the candidate envelope, never the PR124 receipt-metadata observation",
    "The existing PR124 proof input remains compatible",
    "no parallel acceptance authority is approved",
    "On the candidate path, the PR125 proof result adds exactly",
    "`providerExecutionReceiptContentIdentity`, `candidateObservationId`",
    "`candidateObservationContentIdentity`, `humanSelectionId`",
    "`humanSelectionContentIdentity` alongside its existing AcceptedGeometry identity fields",
    "handoff result, local result evidence, canonical-result proof, and derived guide/report artifacts must repeat those exact five fields",
  ]);
});

test("PR127 freezes one closed typed exact-human-selection record", async () => {
  const schema = await readSelectionSchema();

  assertClosedObject(schema, [
    "contractId",
    "contractVersion",
    "selectionId",
    "selectionContentIdentity",
    "candidateObservationId",
    "candidateObservationContentIdentity",
    "providerExecutionReceiptContentIdentity",
    "acceptanceActor",
    "geometryAction",
    "selections",
    "authority",
  ]);
  assertContractIdSchema(schema.properties.contractId);
  assert.equal(
    schema.properties.contractId.const,
    "norma.local-visual-human-candidate-selection@1",
  );
  assert.equal(schema.properties.contractVersion.type, "integer");
  assert.equal(schema.properties.contractVersion.const, 1);
  for (const field of ["selectionId", "candidateObservationId"]) {
    assertIdentifierSchema(schema.properties[field]);
  }
  for (const field of [
    "selectionContentIdentity",
    "candidateObservationContentIdentity",
    "providerExecutionReceiptContentIdentity",
  ]) {
    assertDigestSchema(schema.properties[field]);
  }
  assertClosedObject(schema.properties.acceptanceActor, ["actorClass", "actorId"]);
  assert.equal(schema.properties.acceptanceActor.properties.actorClass.type, "string");
  assert.equal(schema.properties.acceptanceActor.properties.actorClass.const, "human");
  assertIdentifierSchema(schema.properties.acceptanceActor.properties.actorId);
  assert.equal(schema.properties.geometryAction.type, "string");
  assert.equal(schema.properties.geometryAction.const, "accept_exact");

  const item = schema.properties.selections.items;
  assert.equal(schema.properties.selections.type, "array");
  assert.equal(schema.properties.selections.minItems, 1);
  assertClosedObject(item, ["order", "candidateId", "acceptedPrimitiveId"]);
  assert.equal(item.properties.order.type, "integer");
  assert.equal(item.properties.order.minimum, 0);
  assertIdentifierSchema(item.properties.candidateId);
  assertIdentifierSchema(item.properties.acceptedPrimitiveId);

  assertClosedObject(schema.properties.authority, [
    "explicitHumanSelection",
    "providerAuthority",
    "confidenceAuthority",
    "automaticAcceptance",
    "coordinateCorrectionAllowed",
    "coordinateRepairAllowed",
  ]);
  assert.equal(schema.properties.authority.properties.explicitHumanSelection.const, true);
  for (const field of [
    "providerAuthority",
    "confidenceAuthority",
    "automaticAcceptance",
    "coordinateCorrectionAllowed",
    "coordinateRepairAllowed",
  ]) {
    assert.equal(schema.properties.authority.properties[field].type, "boolean", field);
    assert.equal(schema.properties.authority.properties[field].const, false, field);
  }
});

test("PR127 rejects candidate A paired with geometry B and accepts exact candidate A", () => {
  const receipt = createExecutionReceipt("selection response body");
  const candidateEnvelope = createCandidateEnvelope(receipt, "selection-execution");
  const selection = createHumanSelection(candidateEnvelope, ["candidate:a"]);
  const exactAcceptedGeometry = createAcceptedGeometry(candidateEnvelope, selection);
  const substitutedGeometry = structuredClone(exactAcceptedGeometry);
  const candidateB = candidateEnvelope.rectangleCandidates[1];

  Object.assign(substitutedGeometry.primitives[0], {
    x: candidateB.x,
    y: candidateB.y,
    width: candidateB.width,
    height: candidateB.height,
  });
  finalizeAcceptedGeometryIdentities(substitutedGeometry);

  assert.equal(
    substitutedGeometry.sourceObservationId,
    candidateEnvelope.observationId,
  );
  assert.equal(
    substitutedGeometry.sourceObservationContentIdentity,
    candidateEnvelope.observationContentIdentity,
  );
  assert.throws(
    () => validateExactCandidateAcceptance(candidateEnvelope, selection, substitutedGeometry),
    /accepted rectangle differs from selected candidate/u,
  );
  assert.equal(
    validateExactCandidateAcceptance(candidateEnvelope, selection, exactAcceptedGeometry),
    true,
  );
});

test("PR127 rejects empty human selection and empty AcceptedGeometry", () => {
  const receipt = createExecutionReceipt("empty selection response");
  const candidateEnvelope = createCandidateEnvelope(receipt, "empty-selection");
  assert.throws(
    () => createHumanSelection(candidateEnvelope, []),
    /selection must contain at least one candidate/u,
  );

  const validSelection = createHumanSelection(candidateEnvelope, ["candidate:a"]);
  const validAcceptedGeometry = createAcceptedGeometry(candidateEnvelope, validSelection);
  const selection = structuredClone(validSelection);
  selection.selections = [];
  selection.selectionContentIdentity = contentIdentityExcluding(
    selection,
    "selectionContentIdentity",
  );
  assert.throws(
    () => createAcceptedGeometry(candidateEnvelope, selection),
    /selection must contain at least one candidate/u,
  );

  const acceptedGeometry = structuredClone(validAcceptedGeometry);
  acceptedGeometry.primitives = [];
  acceptedGeometry.acceptance.acceptedPrimitiveIds = [];
  acceptedGeometry.acceptance.provenance.inputContentIdentity = selection.selectionContentIdentity;
  finalizeAcceptedGeometryIdentities(acceptedGeometry);

  assert.throws(
    () => validateExactCandidateAcceptance(candidateEnvelope, selection, acceptedGeometry),
    /selection must contain at least one candidate/u,
  );
});

test("PR127 rejects duplicate candidate IDs and non-positional candidate order", () => {
  const receipt = createExecutionReceipt("malformed candidate ordering response");
  const candidateEnvelope = createCandidateEnvelope(receipt, "malformed-candidate-ordering");
  const validSelection = createHumanSelection(candidateEnvelope, ["candidate:a"]);
  const validAcceptedGeometry = createAcceptedGeometry(candidateEnvelope, validSelection);

  const duplicateIds = structuredClone(candidateEnvelope);
  duplicateIds.rectangleCandidates[1].candidateId =
    duplicateIds.rectangleCandidates[0].candidateId;
  duplicateIds.observationContentIdentity = contentIdentityExcluding(
    duplicateIds,
    "observationContentIdentity",
  );
  assert.throws(
    () => createHumanSelection(duplicateIds, ["candidate:a"]),
    /candidate IDs must be unique/u,
  );
  assert.throws(
    () => createAcceptedGeometry(duplicateIds, validSelection),
    /candidate IDs must be unique/u,
  );
  assert.throws(
    () => validateExactCandidateAcceptance(duplicateIds, validSelection, validAcceptedGeometry),
    /candidate IDs must be unique/u,
  );

  const nonPositionalOrder = structuredClone(candidateEnvelope);
  nonPositionalOrder.rectangleCandidates[1].order = 7;
  nonPositionalOrder.observationContentIdentity = contentIdentityExcluding(
    nonPositionalOrder,
    "observationContentIdentity",
  );
  assert.throws(
    () => createHumanSelection(nonPositionalOrder, ["candidate:b"]),
    /candidate order is not the zero-based array position/u,
  );
  assert.throws(
    () => createAcceptedGeometry(nonPositionalOrder, validSelection),
    /candidate order is not the zero-based array position/u,
  );
  assert.throws(
    () => validateExactCandidateAcceptance(
      nonPositionalOrder,
      validSelection,
      validAcceptedGeometry,
    ),
    /candidate order is not the zero-based array position/u,
  );
});

test("PR127 rejects out-of-bounds candidates before selection or AcceptedGeometry construction", () => {
  const receipt = createExecutionReceipt("out-of-bounds candidate response");
  const candidateEnvelope = createCandidateEnvelope(receipt, "out-of-bounds-candidate");
  const validSelection = createHumanSelection(candidateEnvelope, ["candidate:a"]);
  const validAcceptedGeometry = createAcceptedGeometry(candidateEnvelope, validSelection);
  candidateEnvelope.rectangleCandidates[0].x = 0.9;
  candidateEnvelope.rectangleCandidates[0].width = 0.2;
  candidateEnvelope.observationContentIdentity = contentIdentityExcluding(
    candidateEnvelope,
    "observationContentIdentity",
  );
  assert.throws(
    () => createHumanSelection(candidateEnvelope, ["candidate:a"]),
    /candidate rectangle exceeds normalized bounds/u,
  );
  assert.throws(
    () => createAcceptedGeometry(candidateEnvelope, validSelection),
    /candidate rectangle exceeds normalized bounds/u,
  );
  assert.throws(
    () => validateExactCandidateAcceptance(
      candidateEnvelope,
      validSelection,
      validAcceptedGeometry,
    ),
    /candidate rectangle exceeds normalized bounds/u,
  );

  const yOverflowEnvelope = createCandidateEnvelope(receipt, "y-overflow-candidate");
  yOverflowEnvelope.rectangleCandidates[0].y = 0.9;
  yOverflowEnvelope.rectangleCandidates[0].height = 0.2;
  yOverflowEnvelope.observationContentIdentity = contentIdentityExcluding(
    yOverflowEnvelope,
    "observationContentIdentity",
  );
  assert.throws(
    () => createHumanSelection(yOverflowEnvelope, ["candidate:a"]),
    /candidate rectangle exceeds normalized bounds/u,
  );
  assert.throws(
    () => createAcceptedGeometry(yOverflowEnvelope, validSelection),
    /candidate rectangle exceeds normalized bounds/u,
  );
  assert.throws(
    () => validateExactCandidateAcceptance(
      yOverflowEnvelope,
      validSelection,
      validAcceptedGeometry,
    ),
    /candidate rectangle exceeds normalized bounds/u,
  );
});

test("PR127 forbids correction repair reordering confidence and automatic selection", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Human Candidate Selection Record",
    "## Approved Mapper Boundary",
  );

  assertIncludes(section, [
    "only explicit human selection of exact rectangle candidates",
    "Every selected candidate ID must be unique",
    "must exist in the validated candidate envelope",
    "same relative order as the candidate envelope",
    "Every `acceptedPrimitiveId` is unique",
    "must contain exactly one rectangle for each selection, in selection order",
    "`confidence` equal to `null`",
    "must be numerically identical to the selected candidate",
    "`correctionHistory` must be empty",
    "There is no rounding, clamping, repair, inference, confidence threshold",
    "Coordinate corrections remain unapproved",
    "provider-observation fields must repeat the candidate observation ID/content identity",
    "`AcceptedGeometry@1.acceptance.acceptanceId` must equal `selectionId`",
    "ordered `acceptedPrimitiveIds` must equal the selection record's ordered `acceptedPrimitiveId` values",
    "`acceptance.provenance.inputContentIdentity` must equal `selectionContentIdentity`",
    "Both acceptance actor records must use the same human actor ID",
    "Rejected or unselected candidates are omitted only",
    "Candidate A paired with geometry B fails even when the envelope observation ID and content identity match",
    "produces no partial `AcceptedGeometry`, Core input, mapped geometry, Structured Analyze result, or `result.json`",
  ]);
});

test("PR127 makes every post-provider stage independently traceable", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Identity And Provenance Chain",
    "## Fail-Closed Boundary",
  );

  assertIncludes(section, [
    "`sourceImage.contentIdentity`",
    "`providerResponseContentIdentity`",
    "`executionReceiptContentIdentity`",
    "candidate-capable PR123 proof and PR124 v2 observation",
    "`observationId`",
    "`observationContentIdentity`",
    "`selectionId` and `selectionContentIdentity`",
    "the PR125 proof validates the receipt, PR124 observation, candidate envelope, selection record, acceptance boundary, and `AcceptedGeometry` together",
    "preserves the exact selected rectangles and order",
    "accepted revision and envelope content identities",
    "the mapper request has its own `requestId`",
    "the mapper result repeats `requestId` and has `resultContentIdentity`",
    "normalization has its own request ID and result content identity",
    "Structured Analyze has `analysisId`",
    "`serializationSummary.meaningfulIdentity`",
    "SHA-256 content identity for the canonical bytes of `result.json`",
    "without widening the result schema",
    "derived guide/report artifacts repeat only the non-secret trace identities",
    "Each identity is recomputed and checked before constructing the next stage",
    "Identity equality is necessary but never sufficient for acceptance authority",
  ]);
});

test("PR127 fails closed without partial Core or result output", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Fail-Closed Boundary",
    "## PR128 Exact Implementation Scope",
  );

  assertIncludes(section, [
    "Provider response identity, provider parsing, execution receipt validation, PR123/PR124 propagation, candidate validation, exact human selection, AcceptedGeometry equivalence, PR125 proof validation, identity linkage, mapping, normalization, Structured Analyze input validation, and result validation are sequential hard gates",
    "If any gate fails, execution stops with a deterministic diagnostic",
    "No partial `AcceptedGeometry`, Core input, mapped geometry, Structured Analyze result, or `result.json` may be returned or persisted",
    "neither can be relabeled as accepted, mapped, or canonical",
  ]);
});

test("PR127 fixes the exact PR128 implementation scope", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## PR128 Exact Implementation Scope",
    "## PR129 Exact Implementation Scope",
  );

  assertIncludes(section, [
    "extend the existing package-private mapper contract",
    "preserving `synthetic-only`",
    "update or replace PR126's `blocked_unapproved_mapping_boundary` result only",
    "after the existing PR125 proof succeeds",
    "construct the mapper request inside that validated handoff",
    "reuse the existing deterministic AcceptedGeometry mapper, normalization, and Structured Analyze implementation",
    "existing deterministic local comparison/default behavior",
    "provider metadata to influence it",
    "produce deterministic local `result.json` evidence from already accepted geometry",
    "must not change provider requests, request bodies, response schemas, parsers, adapters, network behavior",
    "must not add public exports",
  ]);
});

test("PR127 fixes the exact manual local PR129 implementation scope", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## PR129 Exact Implementation Scope",
    "## Explicit Non-Goals",
  );

  assertIncludes(section, [
    "from receipt-only evidence to structured rectangle candidate observations",
    "compute the raw response content identity in memory",
    "strict candidate-capable execution-receipt identity path",
    "preserving existing receipt-only PR123/PR124 behavior",
    "validate provider-specific structured output in memory",
    "map it to the exact provider-neutral candidate envelope",
    "persist only the allowlisted redacted execution receipt and structured candidate observation",
    "require the exact separate human selection record",
    "minimally extend the existing package-private PR125 proof and PR128 handoff",
    "`candidateObservationEnvelope`",
    "`humanCandidateSelection`",
    "acceptance actor class to be exactly `human`",
    "validate exact selected-candidate rectangle equality and order",
    "link the execution receipt identity through every stage",
    "bind `AcceptedGeometry@1` to the candidate observation identity rather than the PR124 receipt-metadata identity",
    "pass the accepted result through the PR125 proof and PR128 handoff",
    "reuse existing guided inspection/report surfaces",
    "canonical `result.json` plus derived inspection artifacts",
    "manual, local, disabled by default, and CI-network-free",
    "must not add an automatic acceptance mode",
  ]);
});

test("PR127 explicitly keeps hosted public autonomous and production surfaces unapproved", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Explicit Non-Goals",
    "## Validation Gates",
  );

  for (const nonGoal of [
    "PR128 or PR129 runtime",
    "hosted or remote MCP",
    "ChatGPT connector runtime",
    "CAD or Figma integration",
    "uploads or image hosting",
    "servers or deployment",
    "OAuth, auth, or secret-management runtime",
    "package publication",
    "public exports or public API widening",
    "provider SDK or dependency changes",
    "provider/OpenAI runtime, request, response, parser, or network changes in this PR",
    "autonomous or confidence-threshold acceptance",
    "provider output as source truth",
    "production or real-user data",
    "public product launch",
    "schema or runtime changes in this PR",
    "wiki mutation",
  ]) {
    assert.match(section, new RegExp(`- ${escapeRegExp(nonGoal)}[.;]`, "u"), nonGoal);
  }
});

test("PR127 records the exact conditional guard trigger without widening runtime scope", async () => {
  const section = sectionBetween(
    await readDecision(),
    "## Conditional Exact-Set Guard Trigger",
    "## Validation Gates",
  );

  assertIncludes(section, [
    "The initial five-file PR127 contract and changed-file guard tests passed",
    "The first full `npm test` run then failed only in six inherited branch-family exact-set tests",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/controlled-provider-observation-acceptance-proof.test.mjs",
    "tests/controlled-provider-observation-contract.test.mjs",
    "tests/controlled-provider-observation-to-core-handoff.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
    "Each failure compared the active branch only with approved sets through PR126",
    "No implementation assertion, provider behavior, runtime contract, or protected prefix is weakened",
  ]);
});

test("roadmap records PR121 through PR126 and the compressed PR127 to PR129 finish line", async () => {
  const roadmap = await readFile(roadmapPath, "utf8");
  const section = sectionBetween(
    roadmap,
    "PR121 records the first redacted controlled live provider smoke success",
    "## Definitions of Ready",
  );

  assertIncludes(section, [
    "PR121: controlled live provider smoke outcome checkpoint",
    "PR122: fail closed on incomplete controlled live provider responses",
    "PR123: add controlled live smoke artifact consumer proof",
    "`Confirm that an image was received.`",
    "PR124: add controlled provider observation contract",
    "PR125: add controlled provider observation acceptance proof",
    "PR126: add controlled provider observation-to-Core handoff proof",
    "`status: blocked_unapproved_mapping_boundary`",
    "`nextAllowedStep: approve_provider_observation_mapping_boundary`",
    "PR127: approve local visual observation-to-Core pilot contract",
    "-> PR128: implement explicit-acceptance AcceptedGeometry-to-Core handoff",
    "-> PR129: implement controlled local live visual candidate observation demo",
    "PR128 may start only after PR127 merges",
    "PR129 may start only after PR128 merges",
    "content-addressed provider execution receipt",
    "exact human candidate selection record",
    "compute and propagate the redacted execution receipt identity",
    "reject cross-execution and candidate/geometry substitution",
    "minimally extend the same package-private PR125 proof/PR128 handoff path",
    "Hosted MCP, ChatGPT connector runtime, CAD/Figma, uploads, servers, deployment",
  ]);

  const ordered = ["PR121", "PR122", "PR123", "PR124", "PR125", "PR126", "PR127", "PR128", "PR129"];
  let previous = -1;
  for (const label of ordered) {
    const index = section.indexOf(label, previous + 1);
    assert.ok(index > previous, `${label} must appear after the prior PR`);
    previous = index;
  }
});

test("PR127 changed-file guard accepts only the triggered docs tests and legacy exact-set maintenance set", () => {
  const activeChangedFiles = branchChangedFiles(repoRoot);
  if (isExactChangedFileSet(activeChangedFiles, privateDevChatGptMcpCompleteLiveProofChangedFiles)) return;
  if (isExactChangedFileSet(activeChangedFiles, privateDevLocalVisualMcpOrchestrationChangedFiles)) return;
  if (isExactChangedFileSet(activeChangedFiles, privateDevChatGptMcpVisualPilotGateChangedFiles)) return;
  if (isExactChangedFileSet(activeChangedFiles, pr132ValidationHardeningCheckpointChangedFiles)) return;
  if (isExactChangedFileSet(activeChangedFiles, localVisualCandidateReviewChangedFiles)) return;
  assert.deepEqual(localVisualObservationToCorePilotContractChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-10-local-visual-observation-to-core-pilot-contract.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/controlled-provider-observation-acceptance-proof.test.mjs",
    "tests/controlled-provider-observation-contract.test.mjs",
    "tests/controlled-provider-observation-to-core-handoff.test.mjs",
    "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualObservationToCorePilotContractChangedFiles),
    localVisualObservationToCorePilotContractChangedFiles,
  );

  const changedFiles = branchChangedFiles(repoRoot);
  const isCleanBase = isCleanBaseValidationContext(repoRoot);
  const isPr131Set = isExactChangedFileSet(changedFiles, localVisualCandidateReviewProductSurfaceChangedFiles);
  const isPr129Set = isExactChangedFileSet(changedFiles, controlledLocalLiveVisualCandidateObservationDemoChangedFiles);
  const isPr130Set = isExactChangedFileSet(changedFiles, cleanMainValidationAndPr129OperatorProofChangedFiles);
  assert.equal(isCleanBase || isPr129Set || isPr130Set || isPr131Set, true);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(changedFiles),
    isCleanBase
      ? null
      : isPr131Set
      ? localVisualCandidateReviewProductSurfaceChangedFiles
      : isPr130Set
      ? cleanMainValidationAndPr129OperatorProofChangedFiles
      : controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  );
});

test("PR127 changed-file guard rejects runtime package fixture provider wiki and broad-pattern extras", () => {
  for (const forbiddenFile of [
    "src/local-report/controlled-provider-observation-to-core-handoff.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/geometry-observation.ts",
    "src/index.ts",
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "tests/fixtures/provider-response.json",
    "examples/local-live-visual-pilot.json",
    "viewer/read-only-result-viewer.html",
    "reports/local-live-visual/result.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "src/providers/openai.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "src/**",
    "bin/**",
    "tests/**",
    "docs/**",
    ".github/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localVisualObservationToCorePilotContractChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

async function readDecision() {
  return readFile(decisionPath, "utf8");
}

async function readCandidateSchema() {
  const doc = await readDecision();
  const block = sectionBetween(
    doc,
    "<!-- BEGIN LOCAL_VISUAL_CANDIDATE_OBSERVATION_ENVELOPE_V1 -->",
    "<!-- END LOCAL_VISUAL_CANDIDATE_OBSERVATION_ENVELOPE_V1 -->",
  );
  const match = block.match(/```json\n(?<json>[\s\S]+?)\n```/u);
  assert.ok(match?.groups?.json, "candidate observation schema JSON block must exist");
  return JSON.parse(match.groups.json);
}

async function readExecutionReceiptSchema() {
  return readSchemaBlock(
    "<!-- BEGIN LOCAL_VISUAL_PROVIDER_EXECUTION_RECEIPT_V1 -->",
    "<!-- END LOCAL_VISUAL_PROVIDER_EXECUTION_RECEIPT_V1 -->",
    "provider execution receipt schema JSON block must exist",
  );
}

async function readSelectionSchema() {
  return readSchemaBlock(
    "<!-- BEGIN LOCAL_VISUAL_HUMAN_CANDIDATE_SELECTION_V1 -->",
    "<!-- END LOCAL_VISUAL_HUMAN_CANDIDATE_SELECTION_V1 -->",
    "human candidate selection schema JSON block must exist",
  );
}

async function readSchemaBlock(start, end, message) {
  const block = sectionBetween(await readDecision(), start, end);
  const match = block.match(/```json\n(?<json>[\s\S]+?)\n```/u);
  assert.ok(match?.groups?.json, message);
  return JSON.parse(match.groups.json);
}

function assertHeadings(text, headings) {
  for (const heading of headings) {
    assert.match(text, new RegExp(`^${escapeRegExp(heading)}$`, "mu"), heading);
  }
}

function assertIncludes(text, values) {
  const normalizedText = normalizeWhitespace(text);
  for (const value of values) {
    assert.equal(normalizedText.includes(normalizeWhitespace(value)), true, value);
  }
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function assertClosedObject(schema, required, optional = []) {
  assert.equal(schema.type, "object");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, required);
  assert.deepEqual(Object.keys(schema.properties), [...required, ...optional]);
}

function assertIdentifierSchema(schema) {
  assert.equal(schema.type, "string");
  assert.equal(schema.format, "norma-local-identifier");
  assert.equal(schema.minLength, 1);
  assert.equal(schema.maxLength, 128);
  assert.equal(schema.pattern, "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$");
}

function assertContractIdSchema(schema) {
  assert.equal(schema.type, "string");
  assert.equal(schema.format, "norma-contract-identifier");
  assert.equal(schema.minLength, 1);
  assert.equal(schema.maxLength, 128);
  assert.equal(schema.pattern, "^norma\\.[a-z0-9.-]+@[1-9][0-9]*$");
}

function assertDigestSchema(schema) {
  assert.equal(schema.type, "string");
  assert.equal(schema.format, "sha256-content-identity");
  assert.equal(schema.minLength, 71);
  assert.equal(schema.maxLength, 71);
  assert.equal(schema.pattern, "^sha256:[0-9a-f]{64}$");
}

function collectPropertyNames(schema, names = new Set()) {
  if (schema === null || typeof schema !== "object") {
    return names;
  }
  if (schema.properties && typeof schema.properties === "object") {
    for (const [name, child] of Object.entries(schema.properties)) {
      names.add(name);
      collectPropertyNames(child, names);
    }
  }
  if (schema.items) {
    collectPropertyNames(schema.items, names);
  }
  return names;
}

function createExecutionReceipt(responseBody) {
  const receipt = {
    contractId: "norma.local-visual-provider-execution-receipt@1",
    contractVersion: 1,
    executionReceiptContentIdentity: "",
    sourceImageContentIdentity: sha256Identity("shared source image bytes"),
    providerClass: "controlled_live_provider",
    endpointClass: "responses_api",
    responseStatusClass: "2xx_success",
    providerResponseContentIdentity: sha256Identity(responseBody),
    structuredOutputSchemaVersion: "controlled-rectangle-candidates@1",
    adapterOperationId: "local-visual-provider-response-to-candidate-observation",
    adapterOperationVersion: 1,
    persistence: {
      rawProviderResponsePersisted: false,
      requestBodyPersisted: false,
      rawImagePersisted: false,
      localPathPersisted: false,
      urlPersisted: false,
      providerRequestIdPersisted: false,
      exactModelValuePersisted: false,
      secretOrCredentialPersisted: false,
    },
  };
  receipt.executionReceiptContentIdentity = contentIdentityExcluding(
    receipt,
    "executionReceiptContentIdentity",
  );
  return receipt;
}

function createCandidateCapablePr124Observation(receipt) {
  const receiptHex = receipt.executionReceiptContentIdentity.slice("sha256:".length);
  return {
    kind: "norma.controlled-provider-observation-contract.v2",
    version: 2,
    observationId: `controlled-provider-observation:v2:${receiptHex}`,
    providerExecutionReceiptContentIdentity: receipt.executionReceiptContentIdentity,
    providerEvidenceOnly: true,
    untrusted: true,
    nonAuthoritative: true,
    sourceArtifactsRedacted: true,
    sourceArtifactKinds: ["provider-evidence-envelope.json", "summary.json"],
    providerOutputObserved: true,
    redactedDiagnosticClass: null,
    redactedDiagnosticNextAction: null,
    imageContentIdentity: receipt.sourceImageContentIdentity,
    mediaTypeClass: "raster_png",
    imageSizeClass: "medium",
    providerClass: receipt.providerClass,
    endpointClass: receipt.endpointClass,
    responseStatusClass: receipt.responseStatusClass,
    acceptedGeometry: false,
    acceptedStructuredGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    resultJsonCanonicalTruth: false,
    sourceTruth: false,
    packageApiTruth: false,
    connectorTruth: false,
    hostedTruth: false,
    metricPolicyAuthority: false,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    providerStatusCanAuthorizeAcceptance: false,
    providerDiagnosticCanAuthorizeAcceptance: false,
    providerMetadataCanAuthorizeAcceptance: false,
    artifactCanAuthorizeAcceptance: false,
    cannotSelfAccept: true,
    requiresExplicitFutureAcceptance: true,
    nextAllowedStep: "explicit_acceptance_contract_required",
  };
}

function createCandidateEnvelope(
  receipt,
  suffix,
  receiptObservation = createCandidateCapablePr124Observation(receipt),
) {
  validateCandidateCapablePr124Observation(receipt, receiptObservation);
  const candidate = {
    contractId: "norma.local-visual-candidate-observation@1",
    contractVersion: 1,
    observationId: `local-visual-candidate:${suffix}`,
    observationContentIdentity: "",
    sourceImage: {
      contentIdentity: receipt.sourceImageContentIdentity,
      rawImagePersisted: false,
      base64Persisted: false,
      localPathPersisted: false,
      urlPersisted: false,
    },
    provenance: {
      provenanceClass: "controlled-local-live-visual-observation",
      adapterBoundary: "provider-specific-response-to-provider-neutral-candidate-observation@1",
      sourceReceiptObservationId: receiptObservation.observationId,
      sourceReceiptObservationContentIdentity: sha256Identity(canonicalJson(receiptObservation)),
      providerExecutionReceiptContentIdentity: receipt.executionReceiptContentIdentity,
      providerSpecificSchemaTerminated: true,
      manualOnly: true,
      localOnly: true,
      realUserData: false,
    },
    coordinateFrame: {
      dimensions: 2,
      coordinateScale: "normalized",
      origin: "top-left",
      xDirection: "right",
      yDirection: "down",
      bounds: { x: [0, 1], y: [0, 1] },
      sourcePixelWidth: 1000,
      sourcePixelHeight: 800,
    },
    rectangleCandidates: [
      { candidateId: "candidate:a", order: 0, x: 0.1, y: 0.15, width: 0.2, height: 0.25 },
      { candidateId: "candidate:b", order: 1, x: 0.55, y: 0.5, width: 0.3, height: 0.35 },
    ],
    lossyWarnings: [],
    authority: {
      providerEvidenceOnly: true,
      sourceTruth: false,
      acceptedGeometry: false,
      coreInput: false,
      maySelfAccept: false,
      requiresExplicitHumanAcceptance: true,
      mayAuthorizeMapping: false,
      mayAuthorizeResultJson: false,
      ratioAuthority: false,
      packAuthority: false,
      ruleAuthority: false,
      toleranceAuthority: false,
      evaluationAuthority: false,
    },
    persistence: {
      providerPayloadPersisted: false,
      rawProviderResponsePersisted: false,
      rawImagePersisted: false,
      redactedStructuredObservationOnly: true,
    },
    outcomes: {
      acceptedGeometryProduced: false,
      coreInputProduced: false,
      structuredAnalyzeRun: false,
      resultJsonProduced: false,
    },
  };
  candidate.observationContentIdentity = contentIdentityExcluding(
    candidate,
    "observationContentIdentity",
  );
  return candidate;
}

function createHumanSelection(candidateEnvelope, candidateIds) {
  validateCandidateEnvelope(candidateEnvelope);
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    throw new Error("selection must contain at least one candidate");
  }
  const selection = {
    contractId: "norma.local-visual-human-candidate-selection@1",
    contractVersion: 1,
    selectionId: "human-selection:1",
    selectionContentIdentity: "",
    candidateObservationId: candidateEnvelope.observationId,
    candidateObservationContentIdentity: candidateEnvelope.observationContentIdentity,
    providerExecutionReceiptContentIdentity:
      candidateEnvelope.provenance.providerExecutionReceiptContentIdentity,
    acceptanceActor: { actorClass: "human", actorId: "local-human:1" },
    geometryAction: "accept_exact",
    selections: candidateIds.map((candidateId, order) => ({
      order,
      candidateId,
      acceptedPrimitiveId: `accepted:${candidateId}`,
    })),
    authority: {
      explicitHumanSelection: true,
      providerAuthority: false,
      confidenceAuthority: false,
      automaticAcceptance: false,
      coordinateCorrectionAllowed: false,
      coordinateRepairAllowed: false,
    },
  };
  selection.selectionContentIdentity = contentIdentityExcluding(
    selection,
    "selectionContentIdentity",
  );
  validateHumanCandidateSelection(candidateEnvelope, selection);
  return selection;
}

function createAcceptedGeometry(candidateEnvelope, selection) {
  const selectedCandidates = validateHumanCandidateSelection(candidateEnvelope, selection);
  const acceptedGeometry = {
    contractId: "norma.accepted-geometry@1",
    contractVersion: 1,
    acceptedGeometryId: "accepted-geometry:selection-1",
    sourceObservationId: candidateEnvelope.observationId,
    sourceObservationContentIdentity: candidateEnvelope.observationContentIdentity,
    acceptedRevision: 1,
    coordinateFrame: structuredClone(candidateEnvelope.coordinateFrame),
    correctionHistory: [],
    primitives: selectedCandidates.map(({ selected, candidate }) => {
      return {
        id: selected.acceptedPrimitiveId,
        kind: "rectangle",
        confidence: null,
        x: candidate.x,
        y: candidate.y,
        width: candidate.width,
        height: candidate.height,
      };
    }),
    acceptance: {
      acceptanceId: selection.selectionId,
      accepted: true,
      actorType: "human",
      actorId: selection.acceptanceActor.actorId,
      acceptedAt: "2026-07-10T00:00:00.000Z",
      sourceObservationId: candidateEnvelope.observationId,
      sourceObservationContentIdentity: candidateEnvelope.observationContentIdentity,
      acceptedRevision: 1,
      acceptedContentIdentity: "",
      acceptedPrimitiveIds: selection.selections.map(({ acceptedPrimitiveId }) => acceptedPrimitiveId),
      provenance: createProvenance(
        "accepted-geometry-acceptance:selection-1",
        selection.selectionContentIdentity,
      ),
    },
    provenance: createProvenance(
      "accepted-geometry:selection-1",
      candidateEnvelope.observationContentIdentity,
    ),
    contentIdentity: "",
  };
  finalizeAcceptedGeometryIdentities(acceptedGeometry);
  return acceptedGeometry;
}

function validateReceiptCandidatePair(receipt, receiptObservation, candidateEnvelope) {
  if (
    receipt.executionReceiptContentIdentity
    !== contentIdentityExcluding(receipt, "executionReceiptContentIdentity")
  ) {
    throw new Error("execution receipt content identity is invalid");
  }
  validateCandidateCapablePr124Observation(receipt, receiptObservation);
  validateCandidateEnvelope(candidateEnvelope);
  if (
    candidateEnvelope.provenance.providerExecutionReceiptContentIdentity
    !== receipt.executionReceiptContentIdentity
  ) {
    throw new Error("execution receipt identity mismatch");
  }
  if (candidateEnvelope.sourceImage.contentIdentity !== receipt.sourceImageContentIdentity) {
    throw new Error("source image content identity mismatch");
  }
  if (candidateEnvelope.provenance.sourceReceiptObservationId !== receiptObservation.observationId) {
    throw new Error("PR124 observation ID linkage mismatch");
  }
  if (
    candidateEnvelope.provenance.sourceReceiptObservationContentIdentity
    !== sha256Identity(canonicalJson(receiptObservation))
  ) {
    throw new Error("PR124 observation content identity mismatch");
  }
  return true;
}

function validateExactCandidateAcceptance(candidateEnvelope, selection, acceptedGeometry) {
  const selectedCandidates = validateHumanCandidateSelection(candidateEnvelope, selection);
  if (
    acceptedGeometry.sourceObservationId !== candidateEnvelope.observationId
    || acceptedGeometry.sourceObservationContentIdentity
      !== candidateEnvelope.observationContentIdentity
  ) {
    throw new Error("AcceptedGeometry source must identify the candidate envelope");
  }
  if (
    acceptedGeometry.acceptance.acceptanceId !== selection.selectionId
    || acceptedGeometry.acceptance.actorType !== "human"
    || acceptedGeometry.acceptance.actorId !== selection.acceptanceActor.actorId
    || acceptedGeometry.acceptance.sourceObservationId !== candidateEnvelope.observationId
    || acceptedGeometry.acceptance.sourceObservationContentIdentity
      !== candidateEnvelope.observationContentIdentity
    || acceptedGeometry.acceptance.provenance.inputContentIdentity
      !== selection.selectionContentIdentity
    || acceptedGeometry.provenance.inputContentIdentity
      !== candidateEnvelope.observationContentIdentity
  ) {
    throw new Error("AcceptedGeometry selection or acceptance linkage mismatch");
  }
  if (
    acceptedGeometry.acceptance.acceptedContentIdentity
      !== computeAcceptedGeometryRevisionIdentity(acceptedGeometry)
    || acceptedGeometry.contentIdentity !== computeAcceptedGeometryIdentity(acceptedGeometry)
  ) {
    throw new Error("AcceptedGeometry content identity mismatch");
  }
  if (canonicalJson(acceptedGeometry.coordinateFrame) !== canonicalJson(candidateEnvelope.coordinateFrame)) {
    throw new Error("AcceptedGeometry coordinate frame mismatch");
  }
  if (!Array.isArray(acceptedGeometry.correctionHistory) || acceptedGeometry.correctionHistory.length !== 0) {
    throw new Error("AcceptedGeometry corrections are unapproved");
  }
  if (acceptedGeometry.primitives.length !== selection.selections.length) {
    throw new Error("AcceptedGeometry primitive count mismatch");
  }
  if (
    canonicalJson(acceptedGeometry.acceptance.acceptedPrimitiveIds)
    !== canonicalJson(selection.selections.map(({ acceptedPrimitiveId }) => acceptedPrimitiveId))
  ) {
    throw new Error("AcceptedGeometry accepted primitive order mismatch");
  }

  selectedCandidates.forEach(({ selected, candidate }, index) => {
    const primitive = acceptedGeometry.primitives[index];
    if (
      primitive.id !== selected.acceptedPrimitiveId
      || primitive.kind !== "rectangle"
      || primitive.confidence !== null
    ) {
      throw new Error("accepted primitive representation mismatch");
    }
    for (const field of ["x", "y", "width", "height"]) {
      if (primitive[field] !== candidate[field]) {
        throw new Error("accepted rectangle differs from selected candidate");
      }
    }
  });

  return true;
}

function validateCandidateCapablePr124Observation(receipt, receiptObservation) {
  if (
    receiptObservation === null
    || typeof receiptObservation !== "object"
    || Array.isArray(receiptObservation)
    || Object.getPrototypeOf(receiptObservation) !== Object.prototype
  ) {
    throw new Error("PR124 observation is not the exact closed v2 contract");
  }

  const expectedObservation = createCandidateCapablePr124Observation(receipt);
  const expectedFields = Object.keys(expectedObservation).sort();
  const actualFields = Reflect.ownKeys(receiptObservation);
  if (
    actualFields.some((field) => typeof field !== "string")
    || canonicalJson(actualFields.sort()) !== canonicalJson(expectedFields)
  ) {
    throw new Error("PR124 observation is not the exact closed v2 contract");
  }
  if (
    receiptObservation.providerExecutionReceiptContentIdentity
    !== receipt.executionReceiptContentIdentity
  ) {
    throw new Error("PR124 execution receipt identity mismatch");
  }

  const allowedMediaTypes = new Set([
    "raster_png",
    "raster_jpeg",
    "raster_webp",
    "unknown_redacted_media_type",
  ]);
  const allowedImageSizes = new Set([
    "small",
    "medium",
    "large",
    "unknown_redacted_size",
  ]);
  for (const field of expectedFields) {
    if (field === "mediaTypeClass") {
      if (!allowedMediaTypes.has(receiptObservation[field])) {
        throw new Error(`PR124 observation field mismatch: ${field}`);
      }
      continue;
    }
    if (field === "imageSizeClass") {
      if (!allowedImageSizes.has(receiptObservation[field])) {
        throw new Error(`PR124 observation field mismatch: ${field}`);
      }
      continue;
    }
    if (field === "sourceArtifactKinds") {
      if (
        canonicalJson(receiptObservation[field])
        !== canonicalJson(expectedObservation[field])
      ) {
        throw new Error(`PR124 observation field mismatch: ${field}`);
      }
      continue;
    }
    if (receiptObservation[field] !== expectedObservation[field]) {
      throw new Error(`PR124 observation field mismatch: ${field}`);
    }
  }
  return true;
}

function validateHumanCandidateSelection(candidateEnvelope, selection) {
  validateCandidateEnvelope(candidateEnvelope);
  if (
    selection.selectionContentIdentity
    !== contentIdentityExcluding(selection, "selectionContentIdentity")
  ) {
    throw new Error("selection content identity is invalid");
  }
  if (
    selection.candidateObservationId !== candidateEnvelope.observationId
    || selection.candidateObservationContentIdentity
      !== candidateEnvelope.observationContentIdentity
  ) {
    throw new Error("selection candidate identity mismatch");
  }
  if (
    selection.providerExecutionReceiptContentIdentity
    !== candidateEnvelope.provenance.providerExecutionReceiptContentIdentity
  ) {
    throw new Error("selection execution receipt identity mismatch");
  }
  if (selection.acceptanceActor.actorClass !== "human" || selection.geometryAction !== "accept_exact") {
    throw new Error("selection is not exact human acceptance");
  }
  if (!Array.isArray(selection.selections) || selection.selections.length === 0) {
    throw new Error("selection must contain at least one candidate");
  }

  const candidateIndexes = new Map(
    candidateEnvelope.rectangleCandidates.map((candidate, index) => [candidate.candidateId, index]),
  );
  const selectedCandidateIds = new Set();
  const acceptedPrimitiveIds = new Set();
  let priorCandidateIndex = -1;
  return selection.selections.map((selected, index) => {
    if (selected.order !== index) {
      throw new Error("selection order is not the zero-based array position");
    }
    if (selectedCandidateIds.has(selected.candidateId)) {
      throw new Error("selected candidate IDs must be unique");
    }
    if (acceptedPrimitiveIds.has(selected.acceptedPrimitiveId)) {
      throw new Error("accepted primitive IDs must be unique");
    }
    const candidateIndex = candidateIndexes.get(selected.candidateId);
    if (candidateIndex === undefined) {
      throw new Error("selected candidate does not exist");
    }
    if (candidateIndex <= priorCandidateIndex) {
      throw new Error("selections do not follow candidate-envelope order");
    }
    priorCandidateIndex = candidateIndex;
    selectedCandidateIds.add(selected.candidateId);
    acceptedPrimitiveIds.add(selected.acceptedPrimitiveId);
    return {
      selected,
      candidate: candidateEnvelope.rectangleCandidates[candidateIndex],
    };
  });
}

function validateCandidateEnvelope(candidateEnvelope) {
  if (
    candidateEnvelope.observationContentIdentity
    !== contentIdentityExcluding(candidateEnvelope, "observationContentIdentity")
  ) {
    throw new Error("candidate observation content identity is invalid");
  }
  if (
    !Array.isArray(candidateEnvelope.rectangleCandidates)
    || candidateEnvelope.rectangleCandidates.length === 0
  ) {
    throw new Error("candidate envelope must contain at least one rectangle");
  }

  const candidateIds = new Set();
  candidateEnvelope.rectangleCandidates.forEach((candidate, index) => {
    if (candidate.order !== index) {
      throw new Error("candidate order is not the zero-based array position");
    }
    if (candidateIds.has(candidate.candidateId)) {
      throw new Error("candidate IDs must be unique");
    }
    candidateIds.add(candidate.candidateId);

    const { x, y, width, height } = candidate;
    if (![x, y, width, height].every(Number.isFinite)) {
      throw new Error("candidate rectangle coordinates must be finite");
    }
    if (
      x < 0
      || x > 1
      || y < 0
      || y > 1
      || width <= 0
      || width > 1
      || height <= 0
      || height > 1
    ) {
      throw new Error("candidate rectangle coordinates are outside normalized bounds");
    }
    if (x + width > 1 || y + height > 1) {
      throw new Error("candidate rectangle exceeds normalized bounds");
    }
  });
}

function createProvenance(provenanceId, inputContentIdentity) {
  return {
    provenanceId,
    actorType: "human",
    actorId: "local-human:1",
    operationId: "local-visual-human-candidate-selection",
    operationVersion: "1",
    inputContentIdentity,
    createdAt: "2026-07-10T00:00:00.000Z",
    notes: null,
  };
}

function finalizeAcceptedGeometryIdentities(acceptedGeometry) {
  acceptedGeometry.acceptance.acceptedContentIdentity =
    computeAcceptedGeometryRevisionIdentity(acceptedGeometry);
  acceptedGeometry.contentIdentity = computeAcceptedGeometryIdentity(acceptedGeometry);
}

function computeAcceptedGeometryRevisionIdentity(acceptedGeometry) {
  return sha256Identity(canonicalJson({
    contractId: acceptedGeometry.contractId,
    contractVersion: acceptedGeometry.contractVersion,
    acceptedGeometryId: acceptedGeometry.acceptedGeometryId,
    sourceObservationId: acceptedGeometry.sourceObservationId,
    sourceObservationContentIdentity: acceptedGeometry.sourceObservationContentIdentity,
    acceptedRevision: acceptedGeometry.acceptedRevision,
    coordinateFrame: acceptedGeometry.coordinateFrame,
    primitives: acceptedGeometry.primitives,
    correctionHistory: acceptedGeometry.correctionHistory,
  }));
}

function computeAcceptedGeometryIdentity(acceptedGeometry) {
  return sha256Identity(canonicalJson({
    contractId: acceptedGeometry.contractId,
    contractVersion: acceptedGeometry.contractVersion,
    acceptedGeometryId: acceptedGeometry.acceptedGeometryId,
    sourceObservationId: acceptedGeometry.sourceObservationId,
    sourceObservationContentIdentity: acceptedGeometry.sourceObservationContentIdentity,
    acceptedRevision: acceptedGeometry.acceptedRevision,
    coordinateFrame: acceptedGeometry.coordinateFrame,
    primitives: acceptedGeometry.primitives,
    correctionHistory: acceptedGeometry.correctionHistory,
    acceptance: acceptedGeometry.acceptance,
    provenance: acceptedGeometry.provenance,
  }));
}

function contentIdentityExcluding(value, excludedField) {
  const projection = structuredClone(value);
  delete projection[excludedField];
  return sha256Identity(canonicalJson(projection));
}

function sha256Identity(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sectionBetween(text, start, end) {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, start);
  assert.notEqual(endIndex, -1, end);
  return text.slice(startIndex, endIndex);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
