import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import {
  branchChangedFiles,
  isExactChangedFileSet,
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
    "## Trust And Acceptance Authority",
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
    "CC-20260710-PR127-LOCAL-VISUAL-OBSERVATION-TO-CORE v1",
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
    "-> exact provider-neutral candidate visual observation envelope",
    "-> explicit human acceptance outside the provider boundary",
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
  assert.equal(schema.properties.contractId.const, "norma.local-visual-candidate-observation@1");
  assert.equal(schema.properties.contractVersion.const, 1);
  assert.equal(schema.properties.observationId.minLength, 1);
  assert.equal(schema.properties.observationContentIdentity.pattern, "^sha256:[0-9a-f]{64}$");
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
  assert.equal(properties.sourceImage.properties.contentIdentity.pattern, "^sha256:[0-9a-f]{64}$");
  for (const field of ["rawImagePersisted", "base64Persisted", "localPathPersisted", "urlPersisted"]) {
    assert.equal(properties.sourceImage.properties[field].const, false, field);
  }

  assertClosedObject(properties.provenance, [
    "provenanceClass",
    "adapterBoundary",
    "sourceReceiptObservationId",
    "sourceReceiptObservationContentIdentity",
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
  assert.equal(properties.provenance.properties.sourceReceiptObservationId.minLength, 1);
  assert.equal(
    properties.provenance.properties.sourceReceiptObservationContentIdentity.pattern,
    "^sha256:[0-9a-f]{64}$",
  );
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
  ]);
  assert.equal(properties.coordinateFrame.properties.dimensions.const, 2);
  assert.equal(properties.coordinateFrame.properties.coordinateScale.const, "normalized");
  assert.equal(properties.coordinateFrame.properties.origin.const, "top-left");
  assert.equal(properties.coordinateFrame.properties.xDirection.const, "right");
  assert.equal(properties.coordinateFrame.properties.yDirection.const, "down");
  assertClosedObject(properties.coordinateFrame.properties.bounds, ["x", "y"]);
  assert.deepEqual(properties.coordinateFrame.properties.bounds.properties.x.const, [0, 1]);
  assert.deepEqual(properties.coordinateFrame.properties.bounds.properties.y.const, [0, 1]);

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
  assert.equal(candidate.properties.order.type, "integer");
  assert.equal(candidate.properties.order.minimum, 0);
  for (const field of ["x", "y"]) {
    assert.equal(candidate.properties[field].minimum, 0, field);
    assert.equal(candidate.properties[field].maximum, 1, field);
  }
  for (const field of ["width", "height"]) {
    assert.equal(candidate.properties[field].exclusiveMinimum, 0, field);
    assert.equal(candidate.properties[field].maximum, 1, field);
  }
  assertClosedObject(candidate.properties.diagnosticMetadata, ["providerConfidence"]);
  assert.equal(candidate.properties.diagnosticMetadata.properties.providerConfidence.minimum, 0);
  assert.equal(candidate.properties.diagnosticMetadata.properties.providerConfidence.maximum, 1);

  assertIncludes(doc, [
    "`order` is exactly the zero-based array position",
    "All rectangle numbers are finite",
    "`x + width <= 1`",
    "`y + height <= 1`",
    "must match the validated PR124 receipt-metadata contract",
    "`sourceImage.contentIdentity` must also match the PR124 non-null",
    "carry no acceptance authority",
    "`diagnosticMetadata` is optional as a whole",
    "Confidence is diagnostic only",
  ]);
});

test("PR127 freezes allowlisted lossy warnings and redacted-only persistence", async () => {
  const { properties } = await readCandidateSchema();

  assertClosedObject(properties.lossyWarnings.items, ["warningId", "code", "candidateId"]);
  assert.deepEqual(properties.lossyWarnings.items.properties.code.enum, [
    "coordinate-normalization-loss",
    "rectangle-approximation-loss",
    "provider-confidence-diagnostic-only",
  ]);
  assert.deepEqual(properties.lossyWarnings.items.properties.candidateId.type, ["string", "null"]);

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
    "must construct the existing PR125 acceptance boundary",
    "createControlledProviderObservationAcceptanceProofV1",
    "must not introduce a second acceptance authority",
    "must minimally extend the same package-private PR125 proof path",
    "validate the existing PR124 contract first",
    "validate the exact candidate envelope second",
    "source image content identity against PR124",
    "bind the existing acceptance boundary and `AcceptedGeometry@1` to the candidate envelope's",
    "must require `acceptanceActor.actorClass: \"human\"`",
    "The existing PR124 proof input remains compatible",
    "no parallel proof type or acceptance mode is approved",
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
    "validated PR124 receipt metadata",
    "`observationId`",
    "`observationContentIdentity`",
    "the PR125 proof links that exact candidate observation identity",
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
    "Provider parsing, candidate validation, explicit acceptance, PR125 proof validation, identity linkage, mapping, normalization, Structured Analyze input validation, and result validation are sequential hard gates",
    "If any gate fails, execution stops with a deterministic diagnostic",
    "No partial Core input, mapped geometry, Structured Analyze result, or `result.json` may be returned or persisted",
    "cannot be relabeled as accepted, mapped, or canonical",
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
    "validate provider-specific structured output in memory",
    "map it to the exact provider-neutral candidate envelope",
    "persist only the allowlisted redacted structured candidate observation",
    "require a separate explicit human acceptance action",
    "minimally extend the existing package-private PR125 proof and PR128 handoff",
    "`candidateObservationEnvelope`",
    "acceptance actor class to be exactly `human`",
    "bind `AcceptedGeometry@1` to the candidate observation identity rather than the receipt-metadata identity",
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
    "link it to the PR124 receipt identity",
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
  assert.equal(isExactChangedFileSet(changedFiles, localVisualObservationToCorePilotContractChangedFiles), true);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(changedFiles),
    localVisualObservationToCorePilotContractChangedFiles,
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
