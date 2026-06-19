# GeometryObservation And PerceptionProvider Contract Approval

## Status

Approved for the next local, synthetic implementation track after PR75.

This decision is a documentation and contract-test approval only. It does not add runtime code, TypeScript exports, JSON Schema files, provider calls, image parsing, fixtures with image bytes, UI behavior, package changes, or deployment behavior.

## Decision

Norma Core approves the first versioned, provider-agnostic contract boundary for perception-derived geometry:

- `norma.geometry-observation@1`
- `norma.accepted-geometry@1`
- `norma.perception-provider@1`

The approved flow is:

`source asset -> provider execution -> GeometryObservation candidate -> validation -> review or correction -> explicit acceptance -> AcceptedGeometry -> later deterministic mapping -> Norma Core input`

The forbidden flow is:

`image -> provider -> automatic Norma evaluation`

`GeometryObservation` is candidate evidence. It is not a Norma Core source object and must not be evaluated by Norma Core directly.

`AcceptedGeometry` is the first contract that may later be mapped into explicit Norma Core geometry input. That future mapper is not approved by this PR.

## PR75 Architecture Dependency

This contract depends on PR75's product architecture boundary:

- perception providers and adapters sit outside Norma Core;
- provider output is candidate evidence only;
- user or validator acceptance is explicit and visible;
- only accepted structured geometry may later become Core input;
- Core stays deterministic and does not import provider SDKs, image decoders, camera APIs, remote services, UI code, or prompt logic.

PR75 remains the authority for the product-level dependency direction. PR76 only names the first contract surface for the candidate observation and acceptance boundary.

## Contract Purpose

The purpose of these contracts is to separate:

- the original asset being analyzed;
- the provider run that produced candidate observations;
- candidate geometry, confidence, evidence, warnings, and provenance;
- human or deterministic correction history;
- explicit acceptance of one exact candidate revision;
- later deterministic normalization into Norma Core geometry.

The contracts preserve traceability without treating visual perception, confidence, prompts, overlays, or artifacts as source truth.

## Terms

`SourceAssetRef` identifies the exact asset content analyzed by a provider.

`PerceptionProvider` is any external or local producer of candidate structured geometry from an asset. Examples include OpenAI Vision, a future Norma Vision model, a human-corrected provider, CAD import, or a scene reconstruction provider.

`GeometryObservation` is an immutable candidate observation emitted by a provider for one source asset and coordinate frame.

`CorrectionHistory` records ordered review or correction operations against a candidate observation revision.

`AcceptedGeometry` is the explicitly accepted structured geometry envelope that references the exact candidate observation, revision, content identity, correction history, and acceptance record.

`Norma Core input` remains the existing explicit Core geometry contract. It is not replaced by `GeometryObservation` or `AcceptedGeometry`.

## Versioning

The approved V1 contract identities are:

- `norma.geometry-observation@1`
- `norma.accepted-geometry@1`
- `norma.perception-provider@1`

The stable identity fields are:

- `contractId`;
- `contractVersion`;
- content identity for the exact envelope being validated or accepted;
- source asset identity;
- provider identity;
- observation identity;
- accepted geometry identity.

Future versions must use a new contract version rather than silently changing V1 shape, coordinate semantics, primitive semantics, confidence rules, acceptance rules, or diagnostic meaning.

Unsupported future contract versions must be rejected with explicit unsupported-contract behavior. A validator must not accept a higher major or unknown contract version by default.

Unversioned provider payloads are invalid and must be rejected. Provider output must be wrapped in a versioned contract envelope before validation.

No implicit migration is allowed. Any migration from one contract version to another requires a separately approved versioned migration or normalizer.

No hidden defaults are allowed. V1 approves no confidence default; an explicit `null` confidence is a recorded value, not a default.

## V1 Object Shape And Unknown Properties

V1 contract objects are closed at all contract-owned object levels.

Unknown properties are rejected.

This applies to:

- `SourceAssetRef`;
- `ProviderIdentity`;
- `CoordinateFrame`;
- `GeometryObservation`;
- primitive objects;
- `EvidenceRef`;
- `ObservationWarning`;
- `ProvenanceRef`;
- `CorrectionEntry`;
- `AcceptanceRecord`;
- `AcceptedGeometry`.

Unknown property rejection must use the relevant shape diagnostic:

- `InvalidGeometryObservationShape`;
- `InvalidAcceptedGeometryShape`;
- or a more specific approved diagnostic when the failing surface already has one.

Provider raw payloads must not be embedded as an escape hatch. V1 has no extension bag, generic metadata bag, provider payload bag, debug bag, or implementation-defined side channel.

Future extensibility must happen through a new contract version rather than open-ended unknown fields.

## Source Asset Reference

`SourceAssetRef` V1 must include:

- `assetId`: stable asset identifier;
- `mediaType`: source media type;
- `contentDigest`: digest for the exact analyzed asset content;
- `contentIdentity`: immutable content identity derived from or equivalent to the digest;
- `pixelWidth`: raster pixel width when the source is raster;
- `pixelHeight`: raster pixel height when the source is raster;
- `synthetic`: boolean synthetic-data marker;
- `localOnly`: boolean local-only marker;
- `provenance`: provenance reference.

`SourceAssetRef` V1 must not include:

- raw image bytes;
- base64 image content;
- local filesystem paths as source identity;
- remote URLs as source identity;
- credentials, bearer tokens, API keys, cookies, or signed URLs;
- personally identifiable data;
- hidden mutation of the asset after the digest is recorded.

The digest identifies the exact analyzed content. PR76 approves synthetic assets only for the next implementation track.

## Provider Identity

`ProviderIdentity` V1 must include:

- `providerFamily`: provider family;
- `providerImplementationId`: implementation identifier;
- `providerVersion`: provider version, or explicit `null` with a warning when unavailable;
- `operationId`: provider operation identifier;
- `operationVersion`: provider operation version;
- `configurationIdentity`: configuration identity or digest;
- `providerRunId`: provider run or execution reference;
- `provenance`: creation provenance;
- `warnings`: warnings when identity is partial or provider confidence is unavailable.

No model, provider, or SDK is frozen architecturally by PR76. Each actual execution record must capture the effective provider, model or implementation identity, and configuration identity used for that candidate.

Provider identity cannot be omitted. Provider configuration cannot silently change without changing the recorded identity. Provider output remains candidate evidence; it is never source truth.

## Coordinate Frame V1

`GeometryObservation` V1 uses an explicit two-dimensional normalized image coordinate frame:

- dimensions: `2`;
- coordinate scale: `normalized`;
- origin: `top-left`;
- x axis: `right`;
- y axis: `down`;
- valid bounds: inclusive `[0, 1]` for x and y;
- source pixel width and height preserved as metadata.

All coordinate values must be finite numbers. The contract must not rely on hidden coordinate conversion.

This observation frame is intentionally separate from Norma Core's canonical coordinate system, which uses origin `bottom-left`, x axis `right`, y axis `up`, and explicit normalized or metric policy. Any later conversion from observation coordinates into Core coordinates must be explicit, deterministic, traceable, and outside PR76.

PR76 does not approve metric reconstruction, physical units, perspective correction, camera calibration, depth estimation, or 3D reconstruction.

## GeometryObservation V1

`GeometryObservation` V1 is an immutable candidate envelope with:

- `contractId`;
- `contractVersion`;
- `observationId`;
- candidate `status`;
- `sourceAsset`;
- `provider`;
- `coordinateFrame`;
- ordered `primitives`;
- evidence references;
- warnings;
- provenance;
- content identity.

The only approved observation status in V1 is `candidate`.

Every item in `GeometryObservation.primitives[]` must include a non-empty string `id`.

Primitive IDs must be unique within one `GeometryObservation`.

Duplicate primitive IDs must be rejected with `DuplicateObservationPrimitiveId`.

The original provider observation must remain immutable. Corrections create a revised candidate or accepted geometry record; they do not rewrite the original observation.

## Primitive Vocabulary V1

The approved primitive kinds are:

- `point`;
- `segment`;
- `axis`;
- `rectangle`.

`point` uses finite normalized `x` and `y` values.

`segment` uses explicit finite normalized start and end points. The endpoints must be distinct.

`axis` uses an explicit bounded segment representation. Infinite lines, implicit angles, hidden extensions, or inferred unbounded axes are not approved.

`rectangle` is axis-aligned in the observation coordinate frame and uses finite normalized `x`, `y`, `width`, and `height` values. Width and height must be positive, and the rectangle must remain within inclusive normalized bounds.

V1 does not approve polygons, Bezier curves, freeform paths, masks, OCR text regions as geometry, 3D points, point clouds, native CAD layers, perspective transforms, or semantic regions as Core geometry.

## ObservationPrimitive V1

`ObservationPrimitive` V1 is a closed discriminated object.

The primitive discriminant property is `kind`.

`PrimitiveBase` fields are exactly:

- `id`;
- `kind`;
- `confidence`.

`id` is a non-empty string.

`kind` is one of the approved V1 primitive kind values.

`confidence` follows the explicit confidence rule in this decision: a finite number in `[0, 1]` or explicit `null`.

`point` primitives include exactly:

- `id`;
- `kind: "point"`;
- `x`;
- `y`;
- `confidence`.

Point `x` and `y` are finite normalized coordinates in inclusive `[0, 1]`.

`segment` primitives include exactly:

- `id`;
- `kind: "segment"`;
- `start`;
- `end`;
- `confidence`.

`start` and `end` are normalized point objects with exactly `x` and `y`.

Segment `start` and `end` coordinates are finite normalized coordinates in inclusive `[0, 1]`.

Segment `start` and `end` must be distinct.

`axis` primitives include exactly:

- `id`;
- `kind: "axis"`;
- `start`;
- `end`;
- `confidence`.

Axis primitives use the same `start` and `end` point object shape as segment primitives.

Axis `start` and `end` coordinates are finite normalized coordinates in inclusive `[0, 1]`.

Axis `start` and `end` must be distinct. Infinite axes, implicit angles, hidden extensions, and inferred unbounded axes are not approved.

`rectangle` primitives include exactly:

- `id`;
- `kind: "rectangle"`;
- `x`;
- `y`;
- `width`;
- `height`;
- `confidence`.

Rectangle `x`, `y`, `width`, and `height` are finite normalized numbers.

Rectangle `width` and `height` must be positive.

The rectangle must remain within inclusive normalized bounds.

No primitive may include alternate coordinate aliases such as `startPoint`, `endPoint`, `x1`, `y1`, `x2`, `y2`, `left`, `top`, `right`, `bottom`, `angle`, or `length`.

Future primitive fields require a new contract version.

## Confidence And Evidence

Every primitive and evidence item must carry an explicit confidence value:

- finite number in `[0, 1]`; or
- explicit `null`.

There is no default confidence.

`null` confidence requires a warning or evidence note explaining that confidence was unavailable or not meaningful.

Confidence is not a measurement, not a Core evaluation score, not source truth, and not a calibrated probability unless a later provider-specific evaluation explicitly proves and documents calibration.

Evidence may include provider-local references, text labels, regions, or warning codes, but it must not include raw provider traces, chain-of-thought, credentials, hidden prompts, or image bytes.

## EvidenceRef V1

`EvidenceRef` V1 must include:

- `evidenceId`;
- `kind`;
- `targetPrimitiveId`;
- `confidence`;
- `label`;
- `regionRef`;
- `warningCode`;
- `provenance`.

`evidenceId` is a non-empty string.

`kind` is exactly one of:

- `provider-local-reference`;
- `text-label`;
- `region-reference`;
- `warning-code`.

`targetPrimitiveId` is either a primitive ID or explicit `null`.

`confidence` follows the same explicit confidence rule as primitives: a finite number in `[0, 1]` or explicit `null`.

`label` is a string or explicit `null`.

`regionRef` is a string or explicit `null`.

`warningCode` is a string or explicit `null`.

`provenance` is a `ProvenanceRef`.

Evidence must not include raw traces, raw provider traces, hidden prompts, chain-of-thought, credentials, local paths, remote URLs, base64 payloads, or image bytes.

## ObservationWarning V1

`ObservationWarning` V1 must include:

- `code`;
- `severity`;
- `message`;
- `targetPath`;
- `targetPrimitiveId`;
- `provenance`.

`code` is a non-empty string.

`severity` is exactly one of:

- `info`;
- `warning`;
- `error`.

`message` is a concise human-readable string.

`targetPath` is a deterministic contract path string or explicit `null`.

`targetPrimitiveId` is a primitive ID or explicit `null`.

`provenance` is a `ProvenanceRef`.

Warnings do not make invalid input valid.

Warnings are not Core measurements, evaluations, scores, source truth, or acceptance decisions.

## ProvenanceRef V1

`ProvenanceRef` V1 must include:

- `provenanceId`;
- `actorType`;
- `actorId`;
- `operationId`;
- `operationVersion`;
- `inputContentIdentity`;
- `createdAt`;
- `notes`.

`provenanceId` is a non-empty string.

`actorType` is exactly one of:

- `provider`;
- `human`;
- `deterministic-test`;
- `system`.

`actorId` is a string or explicit `null`.

`operationId` is a non-empty string.

`operationVersion` is a non-empty string.

`inputContentIdentity` is a string or explicit `null`.

`createdAt` may exist as metadata but must not participate in deterministic content identity.

`notes` is a string or explicit `null`.

Provenance must not include credentials, bearer tokens, API keys, cookies, signed URLs, local paths, raw prompts, hidden prompts, chain-of-thought, raw provider traces, or image bytes.

## Correction History

`CorrectionHistory` V1 records ordered correction entries with:

- revision or sequence number;
- actor category;
- operation;
- target primitive identifier when applicable;
- reason code or reason text;
- before and after content identity or structured content reference;
- provenance.

Approved correction operations are:

- `add`;
- `update`;
- `remove`.

Correction history is append-only for the accepted revision. Generic executable patches, arbitrary JSON Patch programs, scripts, hidden transforms, or provider self-mutation are not approved.

Timestamps may exist as metadata, but they must not be the deterministic identity for a corrected candidate or accepted geometry record.

## CorrectionEntry V1

`CorrectionEntry` V1 must include:

- `correctionId`;
- `sequence`;
- `actorType`;
- `operation`;
- `targetPrimitiveId`;
- `reason`;
- `beforeContentIdentity`;
- `afterContentIdentity`;
- `provenance`.

`correctionId` is a non-empty string.

`sequence` is a non-negative integer.

`actorType` uses the `ProvenanceRef` actor type vocabulary.

`operation` is exactly one of:

- `add`;
- `update`;
- `remove`.

`targetPrimitiveId` is required for `update` and `remove`.

`targetPrimitiveId` may be explicit `null` for `add` when the added primitive receives its own ID.

`reason` is a non-empty string.

`beforeContentIdentity` and `afterContentIdentity` are strings or explicit `null` according to the operation.

Correction entries are ordered by `sequence`.

duplicate sequence values are invalid.

Executable patch payloads are not allowed. Arbitrary JSON Patch programs, scripts, provider self-mutation payloads, and hidden transforms are not approved.

## Acceptance State Machine

The V1 acceptance state machine is intentionally small:

- `candidate -> accepted`;
- `candidate -> rejected`;
- corrected candidate revision -> `accepted`;
- corrected candidate revision -> `rejected`.

Acceptance must reference:

- exact source observation identifier;
- exact source observation content identity;
- accepted revision;
- accepted content identity;
- accepted primitive identifiers;
- actor category;
- acceptance provenance.

There is no implicit acceptance, no provider self-acceptance, no confidence-threshold acceptance, and no automatic acceptance from successful validation alone.

PR78 may use a deterministic test actor for synthetic fixtures only if PR78 approves fixtures, but it must still record explicit acceptance.

## AcceptanceRecord V1

`AcceptanceRecord` V1 must include:

- `acceptanceId`;
- `accepted`;
- `actorType`;
- `actorId`;
- `acceptedAt`;
- `sourceObservationId`;
- `sourceObservationContentIdentity`;
- `acceptedRevision`;
- `acceptedContentIdentity`;
- `acceptedPrimitiveIds`;
- `provenance`.

`acceptanceId` is a non-empty string.

`accepted` is exactly `true` for `AcceptedGeometry`.

Rejected candidates are not represented as `AcceptedGeometry`.

`actorType` must not be `provider` because provider self-acceptance is not approved.

Deterministic tests may use `deterministic-test`.

`actorId` is a string or explicit `null`.

`acceptedPrimitiveIds` is an ordered array of unique primitive IDs.

`acceptedPrimitiveIds` must match the accepted primitive IDs.

`acceptedAt` is metadata only and excluded from deterministic content identity.

There is no implicit acceptance, no provider self-acceptance, no confidence-threshold acceptance, and no acceptance from successful validation alone.

## AcceptedGeometry V1

`AcceptedGeometry` V1 is a separate envelope with:

- `contractId`;
- `contractVersion`;
- `acceptedGeometryId`;
- `sourceObservationId`;
- `sourceObservationContentIdentity`;
- `acceptedRevision`;
- `coordinateFrame`;
- `primitives`;
- `correctionHistory`;
- `acceptance`;
- `provenance`;
- `contentIdentity`.

`AcceptedGeometry` must not include packs, rules, tolerances, scores, measurements, evaluations, decisions, or artifacts.

`AcceptedGeometry` is not `Composition2D`, `SegmentSpace`, or `SurfaceSpace`. It may later be mapped into supported Norma Core geometry by an explicit deterministic mapper, but that mapper is outside PR76.

## Content Identity V1

Content identity is computed from a deterministic canonical projection of the contract envelope.

For `GeometryObservation`, the projection includes:

- `contractId`;
- `contractVersion`;
- `observationId`;
- `status`;
- `sourceAsset`;
- `provider`;
- `coordinateFrame`;
- ordered `primitives`;
- ordered evidence references;
- warnings;
- provenance, excluding metadata-only timestamp fields according to this decision.

For `AcceptedGeometry`, the projection includes:

- `contractId`;
- `contractVersion`;
- `acceptedGeometryId`;
- `sourceObservationId`;
- `sourceObservationContentIdentity`;
- `acceptedRevision`;
- `coordinateFrame`;
- ordered `primitives`;
- `correctionHistory`;
- `acceptance`;
- provenance, excluding metadata-only timestamp fields according to this decision.

The envelope `contentIdentity` field is excluded from its own digest.

Metadata-only `createdAt` and `acceptedAt` fields are excluded from deterministic content identity.

Forbidden fields are rejected and therefore cannot participate in content identity.

Local paths, raw provider traces, hidden prompts, credentials, remote URLs, base64 payloads, and image bytes are excluded because they are not allowed in the contract.

Array order is significant where the contract says ordered.

Object key order is not significant.

## Digest Algorithm And Format V1

The canonicalization input is the deterministic canonical JSON serialization of the approved content identity projection.

The digest algorithm is SHA-256.

The digest output format is lowercase hexadecimal.

The digest output prefix is `sha256:`.

The digest shape is `sha256:<64 lowercase hex characters>`.

Content identity mismatch is a validation failure.

`GeometryObservation` content identity mismatch uses `InvalidGeometryObservationShape` unless a more specific approved diagnostic exists.

`AcceptedGeometry` content identity mismatch uses `InvalidAcceptedGeometryShape` unless a more specific approved diagnostic exists.

Validators may compute and return the expected identity in diagnostic metadata only if doing so does not leak full payloads, forbidden data, hidden prompts, credentials, local paths, raw traces, or image bytes.

Validators may report the mismatch generically when returning the expected digest would expose information outside the safe diagnostic boundary.

## Mapping Boundary To Norma Core

The only approved future mapping direction is:

`AcceptedGeometry -> explicit deterministic normalizer -> supported Norma Core geometry input`

The mapper must:

- consume only accepted geometry;
- record source observation and accepted geometry references;
- record provenance;
- record the coordinate transform;
- preserve traceable primitive identifiers;
- reject unsupported primitives;
- emit supported Core geometry only.

The mapper must not:

- consume raw provider observations directly;
- consume images directly;
- infer packs, ratios, tolerances, or rules;
- evaluate geometry;
- score geometry;
- hide coordinate conversion;
- hide unsupported primitive loss.

No mapper is approved in PR76 or PR77.

## Determinism And Replay Boundary

Provider execution may be nondeterministic. Norma Core replay must not rerun providers.

Replay depends on stored candidate observations, accepted geometry content identities, explicit Core inputs, explicit packs, explicit rules, explicit tolerances, operation versions, and visible provenance.

The deterministic guarantee begins after accepted geometry is mapped into explicit Core input. The same accepted geometry, same explicit mapping version, same Core input, same pack, same rules, same tolerances, and same operation context must produce the same Core result.

## Validation And Diagnostic Contract

PR76 approves these diagnostic concepts for PR77's local validator:

- `UnsupportedGeometryObservationContract`;
- `UnsupportedAcceptedGeometryContract`;
- `InvalidGeometryObservationShape`;
- `InvalidAcceptedGeometryShape`;
- `MissingProviderIdentity`;
- `MissingSourceAssetIdentity`;
- `InvalidObservationCoordinateFrame`;
- `UnsupportedObservationPrimitiveKind`;
- `DuplicateObservationPrimitiveId`;
- `ObservationCoordinateOutsideBounds`;
- `DegenerateObservationPrimitive`;
- `InvalidObservationConfidence`;
- `InvalidCorrectionHistory`;
- `ExplicitAcceptanceRequired`;
- `AcceptedGeometryRevisionMismatch`;
- `MissingObservationProvenance`;
- `UnsupportedAcceptedGeometryMappingRequest`.

The names are contract-level concepts for PR77. PR76 does not add these diagnostics to the runtime export surface.

Diagnostics must identify the failing contract surface, target path or primitive identifier when available, stable code, severity, and human-readable message.

## Validator Result V1

The validator result shape approved for PR78 is package-private.

Successful validation returns:

- `ok: true`;
- `value`;
- `diagnostics: []`.

Failed validation returns:

- `ok: false`;
- `diagnostics`;
- no accepted value.

Validators do not throw for ordinary invalid contract input.

Diagnostics are deterministic.

Diagnostics are sorted by first path occurrence, then code, then message.

Warnings may be returned with a successful result only when the contract explicitly allows a warning condition.

Errors make the result invalid.

No package-root export is approved.

This result shape is for the local package-private PR78 validator only.

## Validator Diagnostic V1

`ValidatorDiagnostic` V1 must include exactly:

- `code`;
- `severity`;
- `surface`;
- `path`;
- `primitiveId`;
- `message`.

`code` is one of the approved contract diagnostic concepts.

`severity` is exactly one of:

- `error`;
- `warning`;
- `info`.

`surface` is exactly one of:

- `GeometryObservation`;
- `AcceptedGeometry`;
- `SourceAssetRef`;
- `ProviderIdentity`;
- `CoordinateFrame`;
- `Primitive`;
- `EvidenceRef`;
- `ObservationWarning`;
- `ProvenanceRef`;
- `CorrectionHistory`;
- `CorrectionEntry`;
- `AcceptanceRecord`;
- `ContentIdentity`.

`path` is a deterministic contract path string.

`primitiveId` is a string or explicit `null`.

`message` is concise and deterministic.

Diagnostics must be ordered deterministically by path, then code, then message.

diagnostics must not include stack traces, local paths, full payload echoes, credentials, image bytes, hidden prompts, or chain-of-thought.

## Reserved Diagnostics Without PR78 Callable Surface

`UnsupportedAcceptedGeometryMappingRequest` is reserved for a future mapper boundary.

PR78 must not invent a mapper request just to emit it.

PR78 may keep the diagnostic concept listed but unexercised when there is no approved input surface.

Any future use requires a mapper approval PR.

No mapper request, mapper function, provider call, image input, or Core mapping surface is approved by PR77.

## AcceptedGeometry Revision Mismatch Boundary

PR78 may validate internal consistency of `AcceptedGeometry`.

Validation against an external source observation is only allowed when the validator function explicitly receives both objects.

A single-object `AcceptedGeometry` validator cannot prove external observation mismatch unless all required source identities are embedded in the accepted geometry envelope.

`AcceptedGeometryRevisionMismatch` applies only when the checked inputs contain enough information to compare revision or content identity deterministically.

Otherwise it remains reserved for a two-input validation helper if approved by PR78's fiche.

## Privacy And Security Boundary

PR77 and PR78 remain synthetic-data-only unless a later PR explicitly changes that boundary.

PR76 does not approve:

- real user images;
- private production assets;
- API credentials;
- remote provider calls;
- network access;
- remote MCP calls;
- deployment;
- public endpoints;
- browser upload flows;
- camera access;
- raw provider traces;
- chain-of-thought;
- hidden prompts;
- arbitrary executable payloads;
- access to the Core filesystem or network from provider output.

Provider output must be treated as untrusted candidate data until validated and explicitly accepted.

## Provider Families

The contract may describe these provider families as conceptual producers of candidate observations:

- OpenAI Vision;
- future Norma Vision;
- human-corrected provider;
- CAD or vector import;
- scene or 3D reconstruction provider.

Naming a provider family does not approve its implementation, package dependency, API call, credential handling, network access, or production use.

## PR77 Authorized Scope

PR77 may amend only this decision document and its contract approval test.

PR77 must not implement:

- runtime contract implementation;
- TypeScript contract files;
- JSON Schema files;
- generated schemas;
- validator code;
- content identity helper code;
- diagnostics code;
- provider execution;
- OpenAI calls;
- image parsing;
- image files;
- camera input;
- CAD import;
- remote MCP;
- UI overlays;
- deployment;
- fixtures;
- real data handling;
- automatic acceptance;
- mapping into Norma Core geometry;
- package exports.

After PR77, PR78 may implement:

- local package-private TypeScript contract types;
- local package-private deterministic validator;
- stable diagnostics aligned with this decision;
- canonical/content identity helpers consistent with existing Core identity patterns;
- synthetic JSON fixtures only if approved by PR78;
- unit tests.

PR78 must not implement:

- provider execution;
- OpenAI calls;
- image parsing;
- image files;
- camera input;
- CAD import;
- remote MCP;
- UI overlays;
- deployment;
- real data handling;
- automatic acceptance;
- mapping into Norma Core geometry.

## Explicit Non-Goals

PR76 does not approve:

- runtime contract implementation;
- TypeScript exports;
- JSON Schema files;
- generated schema packages;
- provider SDK dependencies;
- prompt contracts;
- image ingestion;
- OCR;
- real image analysis;
- OpenAI API usage;
- vectorization;
- metric reconstruction;
- physical measurements from pixels;
- camera calibration;
- user interface behavior;
- overlay rendering;
- direct Core evaluation;
- packs, rules, tolerances, or score logic;
- production storage;
- public API behavior;
- validator implementation work in PR77.

## Validation Gates

PR76 implementation must prove:

- the decision file exists with the required headings in order;
- the approved contract identities are present;
- the candidate-to-accepted flow is explicit;
- direct image-to-Core evaluation is forbidden;
- source asset identity excludes raw bytes, paths, URLs, credentials, and hidden mutation;
- provider identity is required and cannot make output source truth;
- coordinate frame V1 is explicit and distinct from Norma Core coordinates;
- primitive vocabulary V1 is exact;
- confidence, evidence, correction history, and acceptance rules are explicit;
- exact `EvidenceRef`, `ObservationWarning`, `ProvenanceRef`, `CorrectionEntry`, and `AcceptanceRecord` shapes are explicit;
- exact `ObservationPrimitive` shapes are explicit for every approved primitive kind;
- V1 object shapes are closed to unknown properties;
- content identity projection, exclusions, digest algorithm, digest format, and mismatch behavior are explicit;
- validator result and diagnostic shapes are package-private, exact, and deterministic;
- reserved diagnostics do not create mapper, provider, image, or Core mapping surfaces;
- `AcceptedGeometry` is separate from existing Core geometry;
- PR77 scope remains docs and contract tests only, and any PR78 validator scope remains local, synthetic, deterministic, and package-private;
- protected runtime and package surfaces remain unchanged.

## Stop Criteria

Stop implementation if any change requires:

- provider execution;
- OpenAI credentials;
- network access;
- image files;
- runtime Core changes;
- package export changes;
- generated schema artifacts;
- mapper implementation;
- automatic acceptance;
- real data;
- production storage;
- deployment;
- broad guardrail exemptions.

Stop implementation if validation shows that more than the approved decision, approval test, and exact proven guard-maintenance files are needed.

## Rollback

Rollback is reverting the PR77 commit.

If guard maintenance is proven necessary, rollback also removes only the exact PR77 allow-list entries added to the affected historical guard tests.

No runtime, package, provider, schema, fixture, deployment, or persisted data migration rollback should be needed because PR77 does not approve those changes.
