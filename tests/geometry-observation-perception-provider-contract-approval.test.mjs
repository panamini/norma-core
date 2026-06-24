import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const decisionPath = path.join(
  repoRoot,
  'docs/decisions/2026-06-19-geometry-observation-and-perception-provider-contract-approval.md',
);
const decision = readFileSync(decisionPath, 'utf8');

const requiredHeadings = [
  '# GeometryObservation And PerceptionProvider Contract Approval',
  '## Status',
  '## Decision',
  '## PR75 Architecture Dependency',
  '## Contract Purpose',
  '## Terms',
  '## Versioning',
  '## V1 Object Shape And Unknown Properties',
  '## Source Asset Reference',
  '## Provider Identity',
  '## Coordinate Frame V1',
  '## GeometryObservation V1',
  '## Primitive Vocabulary V1',
  '## ObservationPrimitive V1',
  '## Confidence And Evidence',
  '## EvidenceRef V1',
  '## ObservationWarning V1',
  '## ProvenanceRef V1',
  '## Correction History',
  '## CorrectionEntry V1',
  '## Acceptance State Machine',
  '## AcceptanceRecord V1',
  '## AcceptedGeometry V1',
  '## Content Identity V1',
  '## Digest Algorithm And Format V1',
  '## Mapping Boundary To Norma Core',
  '## Determinism And Replay Boundary',
  '## Validation And Diagnostic Contract',
  '## Validator Result V1',
  '## Validator Diagnostic V1',
  '## Reserved Diagnostics Without PR78 Callable Surface',
  '## AcceptedGeometry Revision Mismatch Boundary',
  '## PR78 Validator Implementation Contract Completion',
  '## Privacy And Security Boundary',
  '## Provider Families',
  '## PR77 Authorized Scope',
  '## Explicit Non-Goals',
  '## Validation Gates',
  '## Stop Criteria',
  '## Rollback',
];

const primaryPr77Files = new Set([
  'docs/decisions/2026-06-19-geometry-observation-and-perception-provider-contract-approval.md',
  'tests/geometry-observation-perception-provider-contract-approval.test.mjs',
]);

const approvedGuardMaintenanceFiles = new Set([
  'tests/post-mvp-product-vision-approval.test.mjs',
  'tests/read-only-viewer-fixtures.test.mjs',
  'tests/read-only-viewer-model.test.mjs',
  'tests/read-only-viewer-static.test.mjs',
]);

const pr79ApprovedChangedFiles = new Set([
  'src/geometry-observation.ts',
  'src/node-crypto.d.ts',
  'tests/fixtures/geometry-observation/valid-accepted-geometry-v1.json',
  'tests/fixtures/geometry-observation/valid-observation-v1.json',
  'tests/geometry-observation-validator.test.mjs',
  'tests/geometry-observation-perception-provider-contract-approval.test.mjs',
  'tests/post-mvp-product-vision-approval.test.mjs',
  'tests/read-only-viewer-fixtures.test.mjs',
  'tests/beta-pilot-readiness-approval.test.mjs',
  'tests/onboarding-examples-approval.test.mjs',
  'tests/privacy-security-support-approval.test.mjs',
  'tests/verification-replay-result-viewer-prototype-approval.test.mjs',
]);

const pr80ApprovedChangedFiles = new Set([
  'docs/decisions/2026-06-20-accepted-geometry-to-core-mapping-contract-approval.md',
  'tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs',
  'tests/geometry-observation-perception-provider-contract-approval.test.mjs',
  'tests/post-mvp-product-vision-approval.test.mjs',
  'tests/read-only-viewer-fixtures.test.mjs',
  'tests/read-only-viewer-model.test.mjs',
  'tests/read-only-viewer-static.test.mjs',
]);

const pr101ReplayChangedFiles = new Set([
  'src/mcp/stdio-protocol.ts',
  'tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs',
  'tests/beta-pilot-readiness-approval.test.mjs',
  'tests/geometry-observation-perception-provider-contract-approval.test.mjs',
  'tests/mcp-stdio-server-skeleton.test.mjs',
  'tests/onboarding-examples-approval.test.mjs',
  'tests/post-mvp-product-vision-approval.test.mjs',
  'tests/privacy-security-support-approval.test.mjs',
  'tests/read-only-viewer-fixtures.test.mjs',
  'tests/read-only-viewer-static.test.mjs',
  'tests/verification-replay-result-viewer-prototype-approval.test.mjs',
]);

const r2aOutputSchemaChangedFiles = new Set([
  'src/mcp/stdio-protocol.ts',
  'tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs',
  'tests/beta-pilot-readiness-approval.test.mjs',
  'tests/geometry-observation-perception-provider-contract-approval.test.mjs',
  'tests/mcp-tools-call-contract.test.mjs',
  'tests/mcp-tools-list-contract.test.mjs',
  'tests/mcp-verify-tools-contract.test.mjs',
  'tests/onboarding-examples-approval.test.mjs',
  'tests/post-mvp-product-vision-approval.test.mjs',
  'tests/privacy-security-support-approval.test.mjs',
  'tests/read-only-viewer-fixtures.test.mjs',
  'tests/read-only-viewer-static.test.mjs',
  'tests/verification-replay-result-viewer-prototype-approval.test.mjs',
]);

const r2bOutputSchemaChangedFiles = new Set([
  'src/mcp/stdio-protocol.ts',
  'tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs',
  'tests/beta-pilot-readiness-approval.test.mjs',
  'tests/geometry-observation-perception-provider-contract-approval.test.mjs',
  'tests/mcp-replay-mvp-demo-contract.test.mjs',
  'tests/mcp-tools-call-contract.test.mjs',
  'tests/mcp-tools-list-contract.test.mjs',
  'tests/mcp-verify-tools-contract.test.mjs',
  'tests/onboarding-examples-approval.test.mjs',
  'tests/post-mvp-product-vision-approval.test.mjs',
  'tests/privacy-security-support-approval.test.mjs',
  'tests/read-only-viewer-fixtures.test.mjs',
  'tests/read-only-viewer-static.test.mjs',
  'tests/verification-replay-result-viewer-prototype-approval.test.mjs',
]);

const r3NonCanonicalStructuredInputChangedFiles = new Set([
  'tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs',
  'tests/beta-pilot-readiness-approval.test.mjs',
  'tests/geometry-observation-perception-provider-contract-approval.test.mjs',
  'tests/mvp-demo-harness.test.mjs',
  'tests/onboarding-examples-approval.test.mjs',
  'tests/post-mvp-product-vision-approval.test.mjs',
  'tests/privacy-security-support-approval.test.mjs',
  'tests/read-only-viewer-fixtures.test.mjs',
  'tests/verification-replay-result-viewer-prototype-approval.test.mjs',
]);

const pr79ApprovedImplementationFiles = new Set([
  'src/geometry-observation.ts',
  'src/node-crypto.d.ts',
]);

const pr79ApprovedFixtureFiles = new Set([
  'tests/fixtures/geometry-observation/valid-accepted-geometry-v1.json',
  'tests/fixtures/geometry-observation/valid-observation-v1.json',
]);

const forbiddenChangedPrefixes = [
  'src/',
  'bin/',
  'viewer/',
  'examples/',
  'tests/fixtures/',
  'schemas/',
  '.github/',
];

const forbiddenChangedFiles = new Set([
  'README.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'docs/BUSINESS_READINESS_ROADMAP.md',
  'docs/MVP_GUARDRAILS.md',
  'docs/GLOSSARY_CORE.md',
  'docs/SPEC_FREEZE.md',
  'docs/PR_REVIEW_CHECKLIST.md',
]);

test('PR76 decision keeps the required approval headings in order', () => {
  assertHeadingsInOrder(decision, requiredHeadings);
});

test('PR76 approves only the provider-agnostic observation and acceptance contracts', () => {
  assertIncludes(decision, '`norma.geometry-observation@1`');
  assertIncludes(decision, '`norma.accepted-geometry@1`');
  assertIncludes(decision, '`norma.perception-provider@1`');
  assertIncludes(decision, 'documentation and contract-test approval only');
  assertIncludes(decision, 'does not add runtime code');
  assertIncludes(decision, 'PR75 remains the authority');
});

test('PR76 versioning rejects unsupported unversioned or implicitly migrated payloads', () => {
  assertIncludes(decision, 'Unsupported future contract versions must be rejected');
  assertIncludes(decision, 'must not accept a higher major or unknown contract version by default');
  assertIncludes(decision, 'Unversioned provider payloads are invalid and must be rejected');
  assertIncludes(decision, 'No implicit migration is allowed');
  assertIncludes(decision, 'No hidden defaults are allowed');
  assertIncludes(decision, 'V1 approves no confidence default');
});

test('PR77 closes V1 contract-owned objects against unknown properties', () => {
  assertIncludes(decision, 'V1 contract objects are closed at all contract-owned object levels');
  assertIncludes(decision, 'Unknown properties are rejected');
  assertIncludes(decision, 'Provider raw payloads must not be embedded as an escape hatch');
  assertIncludes(decision, 'V1 has no extension bag');
  assertIncludes(decision, 'Future extensibility must happen through a new contract version');
  assertIncludes(decision, 'InvalidGeometryObservationShape');
  assertIncludes(decision, 'InvalidAcceptedGeometryShape');
});

test('PR76 preserves candidate evidence before explicit acceptance', () => {
  assertIncludes(
    decision,
    '`source asset -> provider execution -> GeometryObservation candidate -> validation -> review or correction -> explicit acceptance -> AcceptedGeometry -> later deterministic mapping -> Norma Core input`',
  );
  assertIncludes(decision, '`image -> provider -> automatic Norma evaluation`');
  assertIncludes(decision, '`GeometryObservation` is candidate evidence');
  assertIncludes(decision, 'It is not a Norma Core source object');
  assertIncludes(decision, '`AcceptedGeometry` is the first contract that may later be mapped');
  assertIncludes(decision, 'No mapper is approved in PR76 or PR77');
});

test('PR76 requires source asset identity without embedding source content or secrets', () => {
  assertIncludes(decision, '`SourceAssetRef` V1 must include');
  assertIncludes(decision, '`assetId`: stable asset identifier');
  assertIncludes(decision, '`mediaType`: source media type');
  assertIncludes(decision, '`contentDigest`: digest for the exact analyzed asset content');
  assertIncludes(decision, '`contentIdentity`: immutable content identity');
  assertIncludes(decision, '`pixelWidth`: raster pixel width');
  assertIncludes(decision, '`pixelHeight`: raster pixel height');
  assertIncludes(decision, '`synthetic`: boolean synthetic-data marker');
  assertIncludes(decision, '`localOnly`: boolean local-only marker');
  assertIncludes(decision, '`provenance`: provenance reference');
  assertIncludes(decision, 'raw image bytes');
  assertIncludes(decision, 'base64 image content');
  assertIncludes(decision, 'credentials, bearer tokens, API keys, cookies, or signed URLs');
  assertIncludes(decision, 'PR76 approves synthetic assets only');
});

test('PR76 requires provider identity while keeping provider output non-authoritative', () => {
  assertIncludes(decision, '`ProviderIdentity` V1 must include');
  assertIncludes(decision, '`providerFamily`: provider family');
  assertIncludes(decision, '`providerImplementationId`: implementation identifier');
  assertIncludes(decision, '`providerVersion`: provider version');
  assertIncludes(decision, '`operationId`: provider operation identifier');
  assertIncludes(decision, '`operationVersion`: provider operation version');
  assertIncludes(decision, '`configurationIdentity`: configuration identity or digest');
  assertIncludes(decision, '`providerRunId`: provider run or execution reference');
  assertIncludes(decision, '`warnings`: warnings when identity is partial');
  assertIncludes(decision, 'Provider identity cannot be omitted');
  assertIncludes(decision, 'Provider configuration cannot silently change');
  assertIncludes(decision, 'Provider output remains candidate evidence; it is never source truth');
});

test('PR76 separates observation coordinates from Norma Core canonical coordinates', () => {
  assertIncludes(decision, '`CoordinateFrame` V1 object has exactly these fields');
  assertIncludes(decision, '`dimensions`: exactly `2`');
  assertIncludes(decision, '`coordinateScale`: exactly `normalized`');
  assertIncludes(decision, '`origin`: exactly `top-left`');
  assertIncludes(decision, '`xDirection`: exactly `right`');
  assertIncludes(decision, '`yDirection`: exactly `down`');
  assertIncludes(decision, '`bounds`: exactly `{ x: [0, 1], y: [0, 1] }`');
  assertIncludes(decision, '`sourcePixelWidth`: positive integer source raster width');
  assertIncludes(decision, '`sourcePixelHeight`: positive integer source raster height');
  assertIncludes(decision, 'All coordinate values must be finite numbers');
  assertIncludes(decision, "Norma Core's canonical coordinate system");
  assertIncludes(decision, 'origin `bottom-left`, x axis `right`, y axis `up`');
  assertIncludes(decision, 'outside PR76');
});

test('PR76 fixes the V1 primitive vocabulary and excludes unsupported geometry families', () => {
  assertIncludes(decision, 'Every item in `GeometryObservation.primitives[]` must include a non-empty string `id`');
  assertIncludes(decision, 'Primitive IDs must be unique within one `GeometryObservation`');
  assertIncludes(decision, 'Duplicate primitive IDs must be rejected with `DuplicateObservationPrimitiveId`');
  assertIncludes(decision, '`point`');
  assertIncludes(decision, '`segment`');
  assertIncludes(decision, '`axis`');
  assertIncludes(decision, '`rectangle`');
  assertIncludes(decision, 'Infinite lines');
  assertIncludes(decision, 'polygons');
  assertIncludes(decision, 'Bezier curves');
  assertIncludes(decision, 'masks');
  assertIncludes(decision, '3D points');
  assertIncludes(decision, 'native CAD layers');
});

test('PR77 defines exact closed ObservationPrimitive V1 object shapes', () => {
  assertIncludes(decision, '`ObservationPrimitive` V1 is a closed discriminated object');
  assertIncludes(decision, 'The primitive discriminant property is `kind`');
  assertIncludes(decision, '`PrimitiveBase` fields are exactly');
  assertIncludes(decision, '`point` primitives include exactly');
  assertIncludes(decision, '`kind: "point"`');
  assertIncludes(decision, '`x`');
  assertIncludes(decision, '`y`');
  assertIncludes(decision, '`segment` primitives include exactly');
  assertIncludes(decision, '`kind: "segment"`');
  assertIncludes(decision, '`start`');
  assertIncludes(decision, '`end`');
  assertIncludes(decision, '`axis` primitives include exactly');
  assertIncludes(decision, '`kind: "axis"`');
  assertIncludes(decision, '`rectangle` primitives include exactly');
  assertIncludes(decision, '`kind: "rectangle"`');
  assertIncludes(decision, '`width`');
  assertIncludes(decision, '`height`');
  assertIncludes(decision, '`start` and `end` are normalized point objects with exactly `x` and `y`');
  assertIncludes(decision, 'Axis primitives use the same `start` and `end` point object shape as segment primitives');
  assertIncludes(decision, 'No primitive may include alternate coordinate aliases');
});

test('PR76 defines confidence, evidence, correction, and acceptance boundaries', () => {
  assertIncludes(decision, 'Every primitive and evidence item must carry an explicit confidence value');
  assertIncludes(decision, 'finite number in `[0, 1]`');
  assertIncludes(decision, 'There is no default confidence');
  assertIncludes(decision, '`null` confidence requires a linked `ObservationWarning`');
  assertIncludes(decision, '`code`: exactly `ConfidenceUnavailable`');
  assertIncludes(decision, 'Confidence is not a measurement');
  assertIncludes(decision, 'Approved correction operations are');
  assertIncludes(decision, '`add`');
  assertIncludes(decision, '`update`');
  assertIncludes(decision, '`remove`');
  assertIncludes(decision, '`candidate -> accepted`');
  assertIncludes(decision, 'There is no implicit acceptance');
  assertIncludes(decision, 'no provider self-acceptance');
  assertIncludes(decision, 'no confidence-threshold acceptance');
});

test('PR77 defines the exact EvidenceRef V1 contract', () => {
  assertIncludes(decision, '`EvidenceRef` V1 must include');
  assertIncludes(decision, '`evidenceId`');
  assertIncludes(decision, '`kind`');
  assertIncludes(decision, '`targetPrimitiveId`');
  assertIncludes(decision, '`confidence`');
  assertIncludes(decision, '`label`');
  assertIncludes(decision, '`regionRef`');
  assertIncludes(decision, '`warningCode`');
  assertIncludes(decision, '`provenance`');
  assertIncludes(decision, '`provider-local-reference`');
  assertIncludes(decision, '`text-label`');
  assertIncludes(decision, '`region-reference`');
  assertIncludes(decision, '`warning-code`');
  assertIncludes(decision, 'V1 does not require a kind-specific non-null field relationship for `EvidenceRef.kind`');
  assertIncludes(decision, 'Evidence must not include raw traces');
});

test('PR77 defines observation warnings with exact severity values', () => {
  assertIncludes(decision, '`ObservationWarning` V1 must include');
  assertIncludes(decision, '`code`');
  assertIncludes(decision, '`severity`');
  assertIncludes(decision, '`message`');
  assertIncludes(decision, '`targetPath`');
  assertIncludes(decision, '`targetPrimitiveId`');
  assertIncludes(decision, '`provenance`');
  assertIncludes(decision, '`info`');
  assertIncludes(decision, '`warning`');
  assertIncludes(decision, '`error`');
  assertIncludes(decision, 'Warnings do not make invalid input valid');
});

test('PR77 defines provenance without making metadata part of deterministic identity', () => {
  assertIncludes(decision, '`ProvenanceRef` V1 must include');
  assertIncludes(decision, '`provenanceId`');
  assertIncludes(decision, '`actorType`');
  assertIncludes(decision, '`actorId`');
  assertIncludes(decision, '`operationId`');
  assertIncludes(decision, '`operationVersion`');
  assertIncludes(decision, '`inputContentIdentity`');
  assertIncludes(decision, '`createdAt`');
  assertIncludes(decision, '`notes`');
  assertIncludes(decision, '`provider`');
  assertIncludes(decision, '`human`');
  assertIncludes(decision, '`deterministic-test`');
  assertIncludes(decision, '`system`');
  assertIncludes(decision, '`createdAt` is a non-empty RFC 3339 date-time string');
  assertIncludes(decision, 'PR79 validators must validate `createdAt` with a strict RFC 3339 date-time regex or equivalent strict parser, not permissive `Date.parse`');
  assertIncludes(decision, 'Validators must not normalize, repair, or reinterpret timestamps');
  assertIncludes(decision, 'Invalid calendar dates, missing timezone, date-only values, and implementation-dependent `Date.parse` acceptance must be rejected');
  assertIncludes(decision, '`createdAt` is metadata and must not participate in deterministic content identity');
});

test('PR77 defines correction entries as ordered non-executable records', () => {
  assertIncludes(decision, '`CorrectionEntry` V1 must include');
  assertIncludes(decision, '`correctionId`');
  assertIncludes(decision, '`sequence`');
  assertIncludes(decision, '`actorType`');
  assertIncludes(decision, '`operation`');
  assertIncludes(decision, '`targetPrimitiveId`');
  assertIncludes(decision, '`reason`');
  assertIncludes(decision, '`beforeContentIdentity`');
  assertIncludes(decision, '`afterContentIdentity`');
  assertIncludes(decision, '`provenance`');
  assertIncludes(decision, 'For `operation: "add"`');
  assertIncludes(decision, '`beforeContentIdentity` must be explicit `null`');
  assertIncludes(decision, 'For `operation: "update"`');
  assertIncludes(decision, '`beforeContentIdentity` and `afterContentIdentity` must not be equal');
  assertIncludes(decision, 'For `operation: "remove"`');
  assertIncludes(decision, '`afterContentIdentity` must be explicit `null`');
  assertIncludes(decision, 'duplicate sequence values are invalid');
  assertIncludes(decision, 'Executable patch payloads are not allowed');
});

test('PR77 defines explicit acceptance records without provider self-acceptance', () => {
  assertIncludes(decision, '`AcceptanceRecord` V1 must include');
  assertIncludes(decision, '`acceptanceId`');
  assertIncludes(decision, '`accepted`');
  assertIncludes(decision, '`actorType`');
  assertIncludes(decision, '`actorId`');
  assertIncludes(decision, '`acceptedAt`');
  assertIncludes(decision, '`sourceObservationId`');
  assertIncludes(decision, '`sourceObservationContentIdentity`');
  assertIncludes(decision, '`acceptedRevision`');
  assertIncludes(decision, '`acceptedContentIdentity`');
  assertIncludes(decision, '`acceptedPrimitiveIds`');
  assertIncludes(decision, '`provenance`');
  assertIncludes(decision, '`actorType` must not be `provider`');
  assertIncludes(decision, '`acceptedAt` is a non-empty RFC 3339 date-time string');
  assertIncludes(decision, 'PR79 validators must validate `acceptedAt` with a strict RFC 3339 date-time regex or equivalent strict parser, not permissive `Date.parse`');
  assertIncludes(decision, '`acceptedContentIdentity` is the content identity of the immutable accepted revision payload');
  assertIncludes(decision, '`acceptedPrimitiveIds` must exactly equal `primitives.map((primitive) => primitive.id)` in the same order');
  assertIncludes(decision, '`acceptedAt` is metadata only and excluded from deterministic content identity');
});

test('PR76 keeps AcceptedGeometry separate from Core geometry, packs, and evaluation', () => {
  assertIncludes(decision, '`AcceptedGeometry` V1 is a separate envelope');
  assertIncludes(decision, '`sourceObservationId`');
  assertIncludes(decision, '`sourceObservationContentIdentity`');
  assertIncludes(decision, '`acceptedRevision`');
  assertIncludes(decision, '`coordinateFrame`');
  assertIncludes(decision, '`primitives`');
  assertIncludes(decision, '`correctionHistory`');
  assertIncludes(decision, '`acceptance`');
  assertIncludes(decision, '`contentIdentity`');
  assertIncludes(decision, '`AcceptedGeometry` must not include packs, rules, tolerances, scores, measurements, evaluations, decisions, or artifacts');
  assertIncludes(decision, '`AcceptedGeometry` is not `Composition2D`, `SegmentSpace`, or `SurfaceSpace`');
});

test('PR77 defines content identity projection and digest behavior', () => {
  assertIncludes(decision, 'Content identity is computed from a deterministic canonical projection');
  assertIncludes(decision, 'For `GeometryObservation`, the projection includes');
  assertIncludes(decision, 'For `AcceptedGeometry`, the projection includes');
  assertIncludes(decision, 'The envelope `contentIdentity` field is excluded from its own digest');
  assertIncludes(decision, 'Array order is significant where the contract says ordered');
  assertIncludes(decision, 'Object key order is not significant');
  assertIncludes(decision, 'The digest algorithm is SHA-256');
  assertIncludes(decision, 'The digest output format is lowercase hexadecimal');
  assertIncludes(decision, 'The digest output prefix is `sha256:`');
  assertIncludes(decision, '`sha256:<64 lowercase hex characters>`');
  assertIncludes(decision, 'Content identity mismatch is a validation failure');
  assertIncludes(decision, 'The accepted revision payload identity excludes');
  assertIncludes(decision, 'the enclosing `AcceptedGeometry.contentIdentity`');
});

test('PR76 reserves mapping and replay behavior for deterministic accepted inputs', () => {
  assertIncludes(decision, '`AcceptedGeometry -> explicit deterministic normalizer -> supported Norma Core geometry input`');
  assertIncludes(decision, 'consume only accepted geometry');
  assertIncludes(decision, 'record the coordinate transform');
  assertIncludes(decision, 'reject unsupported primitives');
  assertIncludes(decision, 'Provider execution may be nondeterministic');
  assertIncludes(decision, 'Norma Core replay must not rerun providers');
  assertIncludes(decision, 'The deterministic guarantee begins after accepted geometry is mapped');
});

test('PR76 names validator diagnostics without exporting runtime diagnostics yet', () => {
  const diagnostics = [
    'UnsupportedGeometryObservationContract',
    'UnsupportedAcceptedGeometryContract',
    'InvalidGeometryObservationShape',
    'InvalidAcceptedGeometryShape',
    'MissingProviderIdentity',
    'MissingSourceAssetIdentity',
    'InvalidObservationCoordinateFrame',
    'UnsupportedObservationPrimitiveKind',
    'DuplicateObservationPrimitiveId',
    'ObservationCoordinateOutsideBounds',
    'DegenerateObservationPrimitive',
    'InvalidObservationConfidence',
    'InvalidCorrectionHistory',
    'ExplicitAcceptanceRequired',
    'AcceptedGeometryRevisionMismatch',
    'MissingObservationProvenance',
    'UnsupportedAcceptedGeometryMappingRequest',
  ];

  for (const diagnostic of diagnostics) {
    assertIncludes(decision, diagnostic);
  }

  assertIncludes(decision, 'PR76, PR77, and PR78 do not add these diagnostics to the package-root runtime export surface');
});

test('PR77 defines package-private validator result semantics', () => {
  assertIncludes(decision, 'The validator result shape approved for the local validator implementation track is package-private');
  assertIncludes(decision, '`ok: true`');
  assertIncludes(decision, '`value`');
  assertIncludes(decision, '`diagnostics: []`');
  assertIncludes(decision, '`ok: false`');
  assertIncludes(decision, 'no accepted value');
  assertIncludes(decision, 'Validators do not throw for ordinary invalid contract input');
  assertIncludes(decision, 'Validators collect all deterministically discoverable diagnostics');
  assertIncludes(decision, 'Validator warning or info diagnostics are not returned on successful V1 validation');
  assertIncludes(decision, 'No package-root export is approved');
  assertIncludes(decision, 'This result shape is for the local package-private validator implementation track only');
});

test('PR77 defines validator diagnostics and deterministic ordering', () => {
  assertIncludes(decision, '`ValidatorDiagnostic` V1 must include exactly');
  assertIncludes(decision, '`code`');
  assertIncludes(decision, '`severity`');
  assertIncludes(decision, '`surface`');
  assertIncludes(decision, '`path`');
  assertIncludes(decision, '`primitiveId`');
  assertIncludes(decision, '`message`');
  assertIncludes(decision, '`GeometryObservation`');
  assertIncludes(decision, '`AcceptedGeometry`');
  assertIncludes(decision, '`EvidenceRef`');
  assertIncludes(decision, '`ContentIdentity`');
  assertIncludes(decision, 'Diagnostics must be ordered deterministically by path, then code, then message');
  assertIncludes(decision, 'diagnostics must not include stack traces, local paths, full payload echoes, credentials, image bytes, hidden prompts, or chain-of-thought');
});

test('PR77 reserves mapper diagnostics without creating a callable mapper surface', () => {
  assertIncludes(decision, 'UnsupportedAcceptedGeometryMappingRequest');
  assertIncludes(decision, 'is reserved for a future mapper boundary');
  assertIncludes(decision, 'PR79 must not invent a mapper request just to emit it');
  assertIncludes(decision, 'Any future use requires a mapper approval PR');
  assertIncludes(decision, 'No mapper request, mapper function, provider call, image input, or Core mapping surface is approved');
});

test('PR77 scopes AcceptedGeometry revision mismatch to available checked inputs', () => {
  assertIncludes(decision, 'PR79 may validate internal consistency of `AcceptedGeometry`');
  assertIncludes(decision, 'Validation against an external source observation is only allowed when the validator function explicitly receives both objects');
  assertIncludes(decision, 'A single-object `AcceptedGeometry` validator cannot prove external observation mismatch');
  assertIncludes(decision, '`AcceptedGeometryRevisionMismatch` applies only when the checked inputs contain enough information');
  assertIncludes(decision, 'Otherwise it remains reserved for a two-input validation helper');
});

test('PR78 closes the validator implementation contract without reopening resolved rules', () => {
  assertIncludes(decision, 'PR78 completes the validator implementation contract');
  assertIncludes(decision, 'exact `GeometryObservation` envelope keys are `contractId`, `contractVersion`, `observationId`, `status`, `sourceAsset`, `provider`, `coordinateFrame`, `primitives`, `evidence`, `warnings`, `provenance`, and `contentIdentity`');
  assertIncludes(decision, 'exact `CoordinateFrame` keys are `dimensions`, `coordinateScale`, `origin`, `xDirection`, `yDirection`, `bounds`, `sourcePixelWidth`, and `sourcePixelHeight`');
  assertIncludes(decision, '`createdAt` and `acceptedAt` are non-empty RFC 3339 date-time strings');
  assertIncludes(decision, 'full date, time, seconds, and timezone offset or `Z`');
  assertIncludes(decision, '`AcceptanceRecord.acceptedContentIdentity` identifies the accepted revision payload');
  assertIncludes(decision, 'successful validator results always have `diagnostics: []`');
  assertIncludes(decision, '`confidence: null` is explained only by a linked `ObservationWarning`');
  assertIncludes(decision, 'correction identity nullability is operation-specific for `add`, `update`, and `remove`');
  assertIncludes(decision, '`acceptedPrimitiveIds` must equal `primitives.map((primitive) => primitive.id)` in the same order');
  assertIncludes(decision, 'validators collect all deterministically discoverable diagnostics');
  assertIncludes(decision, 'closed object and unknown-property policy');
  assertIncludes(decision, 'normalized endpoint object shape as exactly `{ x, y }`');
  assertIncludes(decision, 'reserved mapper diagnostic behavior');
  assertIncludes(decision, '`EvidenceRef.kind` cross-field coupling');
});

test('PR76 keeps privacy, security, provider family, and PR77 authorization narrow', () => {
  assertIncludes(decision, 'PR77, PR78, and PR79 remain synthetic-data-only');
  assertIncludes(decision, 'remote provider calls');
  assertIncludes(decision, 'network access');
  assertIncludes(decision, 'raw provider traces');
  assertIncludes(decision, 'chain-of-thought');
  assertIncludes(decision, 'Provider output must be treated as untrusted candidate data');
  assertIncludes(decision, 'Naming a provider family does not approve its implementation');
  assertIncludes(decision, 'PR77 may amend only this decision document and its contract approval test');
  assertIncludes(decision, 'PR78 may amend only this decision document, its contract approval test, and exact proven guard-maintenance tests');
  assertIncludes(decision, 'After PR78, PR79 may implement');
  assertIncludes(decision, 'local package-private TypeScript contract types');
  assertIncludes(decision, 'local package-private deterministic validator');
  assertIncludes(decision, 'synthetic JSON fixtures only if approved by PR79');
  assertIncludes(decision, 'PR77 must not implement');
  assertIncludes(decision, 'PR78 must not implement');
  assertIncludes(decision, 'provider execution');
  assertIncludes(decision, 'OpenAI calls');
  assertIncludes(decision, 'mapping into Norma Core geometry');
});

test('PR78 PR79 and PR80 branch changes stay limited to their approved contract surfaces', () => {
  assertApprovedContractSurfaceChanges(branchChangedFiles());
});

test('PR101 replay exact-set guard rejects unrelated MCP package and CI changes', () => {
  for (const unexpectedFile of [
    'src/mcp/unrelated.ts',
    'src/runtime.ts',
    'package.json',
    '.github/workflows/ci.yml',
    'docs/unrelated.md',
  ]) {
    assert.equal(isExactChangedFileSet([...pr101ReplayChangedFiles, unexpectedFile].sort(), [...pr101ReplayChangedFiles].sort()), false);
    assert.equal(isExactChangedFileSet([...r2aOutputSchemaChangedFiles, unexpectedFile].sort(), [...r2aOutputSchemaChangedFiles].sort()), false);
    assert.equal(isExactChangedFileSet([...r2bOutputSchemaChangedFiles, unexpectedFile].sort(), [...r2bOutputSchemaChangedFiles].sort()), false);
    assert.equal(
      isExactChangedFileSet(
        [...r3NonCanonicalStructuredInputChangedFiles, unexpectedFile].sort(),
        [...r3NonCanonicalStructuredInputChangedFiles].sort(),
      ),
      false,
    );
  }
});

function assertApprovedContractSurfaceChanges(changedFiles) {
  if (isExactChangedFileSet(changedFiles, [...pr101ReplayChangedFiles].sort())) {
    assertPr101ReplayChangedFiles(changedFiles);
    return;
  }

  if (isExactChangedFileSet(changedFiles, [...r2aOutputSchemaChangedFiles].sort())) {
    assertR2AOutputSchemaChangedFiles(changedFiles);
    return;
  }

  if (isExactChangedFileSet(changedFiles, [...r2bOutputSchemaChangedFiles].sort())) {
    assertR2BOutputSchemaChangedFiles(changedFiles);
    return;
  }

  if (isExactChangedFileSet(changedFiles, [...r3NonCanonicalStructuredInputChangedFiles].sort())) {
    assertR3NonCanonicalStructuredInputChangedFiles(changedFiles);
    return;
  }

  if (isExactChangedFileSet(changedFiles, [...pr80ApprovedChangedFiles].sort())) {
    assertPr80ApprovedChangedFiles(changedFiles);
    return;
  }

  if (isExactChangedFileSet(changedFiles, [...pr79ApprovedChangedFiles].sort())) {
    assertPr79ApprovedChangedFiles(changedFiles);
    return;
  }

  assertPr78ApprovedChangedFiles(changedFiles);
}

function assertPr101ReplayChangedFiles(changedFiles) {
  for (const changedFile of changedFiles) {
    assert.ok(
      pr101ReplayChangedFiles.has(changedFile),
      `unexpected PR101 replay file changed: ${changedFile}`,
    );
    assert.ok(
      changedFile === 'src/mcp/stdio-protocol.ts' ||
        !forbiddenChangedPrefixes.some((prefix) => changedFile.startsWith(prefix)),
      `PR101 replay must not change protected implementation surface outside approved MCP initialize replay: ${changedFile}`,
    );
    assert.ok(
      !forbiddenChangedFiles.has(changedFile),
      `PR101 replay must not change protected project contract file: ${changedFile}`,
    );
  }
}

function assertR2AOutputSchemaChangedFiles(changedFiles) {
  for (const changedFile of changedFiles) {
    assert.ok(
      r2aOutputSchemaChangedFiles.has(changedFile),
      `unexpected R2A output schema file changed: ${changedFile}`,
    );
    assert.ok(
      changedFile === 'src/mcp/stdio-protocol.ts' ||
        !forbiddenChangedPrefixes.some((prefix) => changedFile.startsWith(prefix)),
      `R2A output schema guard maintenance must not change protected implementation surface outside the MCP descriptor: ${changedFile}`,
    );
    assert.ok(
      !forbiddenChangedFiles.has(changedFile),
      `R2A output schema guard maintenance must not change protected project contract file: ${changedFile}`,
    );
  }
}

function assertR2BOutputSchemaChangedFiles(changedFiles) {
  for (const changedFile of changedFiles) {
    assert.ok(
      r2bOutputSchemaChangedFiles.has(changedFile),
      `unexpected R2B output schema file changed: ${changedFile}`,
    );
    assert.ok(
      changedFile === 'src/mcp/stdio-protocol.ts' ||
        changedFile.startsWith('tests/mcp-') ||
        !forbiddenChangedPrefixes.some((prefix) => changedFile.startsWith(prefix)),
      `R2B output schema guard maintenance must not change protected implementation surface outside the MCP descriptor and MCP contract tests: ${changedFile}`,
    );
    assert.ok(
      !forbiddenChangedFiles.has(changedFile),
      `R2B output schema guard maintenance must not change protected project contract file: ${changedFile}`,
    );
  }
}

function assertR3NonCanonicalStructuredInputChangedFiles(changedFiles) {
  for (const changedFile of changedFiles) {
    assert.ok(
      r3NonCanonicalStructuredInputChangedFiles.has(changedFile),
      `unexpected R3 non-canonical structured input proof file changed: ${changedFile}`,
    );
    assert.ok(
      !forbiddenChangedPrefixes.some((prefix) => changedFile.startsWith(prefix)),
      `R3 guard maintenance must not change protected implementation surface: ${changedFile}`,
    );
    assert.ok(
      !forbiddenChangedFiles.has(changedFile),
      `R3 guard maintenance must not change protected project contract file: ${changedFile}`,
    );
  }
}

function assertPr79ApprovedChangedFiles(changedFiles) {
  for (const changedFile of changedFiles) {
    assert.ok(
      pr79ApprovedChangedFiles.has(changedFile),
      `unexpected PR79 file changed: ${changedFile}`,
    );
    assert.ok(
      isPr79ApprovedImplementationChange(changedFile),
      `PR79 must not change protected implementation surface outside the local validator: ${changedFile}`,
    );
    assert.ok(
      !forbiddenChangedFiles.has(changedFile),
      `PR79 must not change protected project contract file: ${changedFile}`,
    );
  }
}

function assertPr80ApprovedChangedFiles(changedFiles) {
  for (const changedFile of changedFiles) {
    assert.ok(
      pr80ApprovedChangedFiles.has(changedFile),
      `unexpected PR80 file changed: ${changedFile}`,
    );
    assert.ok(
      !forbiddenChangedPrefixes.some((prefix) => changedFile.startsWith(prefix)),
      `PR80 must not change protected implementation surface: ${changedFile}`,
    );
    assert.ok(
      !forbiddenChangedFiles.has(changedFile),
      `PR80 must not change protected project contract file: ${changedFile}`,
    );
  }
}

function assertPr78ApprovedChangedFiles(changedFiles) {
  for (const requiredFile of primaryPr77Files) {
    assert.ok(
      changedFiles.includes(requiredFile),
      `expected PR78 branch to include ${requiredFile}`,
    );
  }

  for (const changedFile of changedFiles) {
    assert.ok(
      primaryPr77Files.has(changedFile) || approvedGuardMaintenanceFiles.has(changedFile),
      `unexpected PR78 file changed: ${changedFile}`,
    );

    assert.ok(
      !forbiddenChangedPrefixes.some((prefix) => changedFile.startsWith(prefix)),
      `PR78 must not change protected implementation surface: ${changedFile}`,
    );

    assert.ok(
      !forbiddenChangedFiles.has(changedFile),
      `PR78 must not change protected project contract file: ${changedFile}`,
    );
  }
}

function assertHeadingsInOrder(text, headings) {
  let cursor = -1;

  for (const heading of headings) {
    const index = text.indexOf(heading, cursor + 1);
    assert.notEqual(index, -1, `missing heading: ${heading}`);
    assert.ok(index > cursor, `heading out of order: ${heading}`);
    cursor = index;
  }
}

function assertIncludes(text, expected) {
  assert.ok(text.includes(expected), `expected decision to include: ${expected}`);
}

function branchChangedFiles() {
  const probes = [
    gitFiles(['diff', '--name-only', 'main...HEAD']),
    gitFiles(['diff', '--name-only', 'origin/main...HEAD']),
    gitFiles(['diff', '--name-only']),
    gitFiles(['diff', '--cached', '--name-only']),
    gitFiles(['ls-files', '--others', '--exclude-standard']),
  ];
  const successful = probes.filter((files) => files !== null);
  assert.notEqual(successful.length, 0, 'Unable to inspect changed files with git');
  return successful
    .flat()
    .filter((file, index, files) => files.indexOf(file) === index)
    .sort();
}

function isExactChangedFileSet(changed, approvedFiles) {
  return changed.length === approvedFiles.length && approvedFiles.every((file) => changed.includes(file));
}

function isPr79ApprovedImplementationChange(changedFile) {
  if (pr79ApprovedImplementationFiles.has(changedFile)) {
    return true;
  }
  if (pr79ApprovedFixtureFiles.has(changedFile)) {
    return true;
  }
  return !forbiddenChangedPrefixes.some((prefix) => changedFile.startsWith(prefix));
}

function gitFiles(args) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .filter(Boolean)
      .sort();
  } catch {
    return null;
  }
}
