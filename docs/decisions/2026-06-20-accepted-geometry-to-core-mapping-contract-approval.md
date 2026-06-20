# AcceptedGeometry To Core Mapping Contract Approval

## Status

Accepted for PR80.

PR80 is documentation and contract-test only.

PR80 approves the package-private contract for a future deterministic mapper from validated `AcceptedGeometry@1` into an existing supported Norma Core geometry input.

PR80 does not implement the mapper.

## PR79 Validator Dependency

PR80 depends on merged PR79 and the local package-private `AcceptedGeometry@1` validator.

The future mapper must call the PR79 validator internally before mapping. PR80 does not approve a branded validated value because no such public or package-private branded type exists today.

The mapper must reject ordinary invalid input with diagnostics and must not throw for ordinary invalid contract input.

The mapper must consume only `AcceptedGeometry@1` whose envelope, primitives, acceptance record, coordinate frame, provenance, and content identities have passed PR79 validation.

## Architecture Boundary

The only approved mapping direction is:

`AcceptedGeometry -> explicit deterministic mapper -> supported Norma Core geometry input`

The mapper must not consume raw `GeometryObservation`, provider payloads, image bytes, prompts, artifacts, or viewer data.

The mapper result is not a measurement, evaluation, score, decision, explanation, artifact, visual overlay, construction result, pack selection, rule selection, tolerance selection, or Norma result.

## Exact Input Boundary

The request input may be mapped only when all of these are true:

- `acceptedGeometry.contractId` is exactly `norma.accepted-geometry@1`;
- `acceptedGeometry.contractVersion` is exactly `1`;
- `acceptedGeometry` passes `validateAcceptedGeometryV1`;
- `acceptedGeometry.primitives` is non-empty;
- every accepted primitive is `rectangle`;
- `acceptedGeometryContentIdentity` equals `acceptedGeometry.contentIdentity`;
- `sourceObservationId` equals `acceptedGeometry.sourceObservationId`;
- `sourceObservationContentIdentity` equals `acceptedGeometry.sourceObservationContentIdentity`;
- `mappingContext.boundary` is exactly `synthetic-only`;
- `mappingContext.primitiveLossPolicy` is exactly `reject`;
- `mappingContext.coordinateTransform` is exactly `normalized-top-left-y-down-to-bottom-left-y-up@1`;
- `mappingProfileId` is exactly `norma.accepted-geometry-to-core-mapping.rectangles-to-composition-2d@1`;
- `mappingProfileVersion` is exactly `1`;
- `targetCoreProfileId` is exactly `core.geometry-v1.composition-2d.normalized-rectangles@1`;
- `targetCoreGeometryKind` is exactly `composition-2d`;
- `targetCoordinateSystem` is exactly the current Core canonical coordinate system shape approved below.

The mapper must reject raw `GeometryObservation`, provider payloads, unvalidated objects, unsupported contract versions, rejected candidates, automatically accepted candidates, content-identity mismatches, invalid acceptance records, unsupported primitive sets, unknown mapping profiles, unknown target Core profiles, and missing mapping policy.

No hidden default may supply the mapping profile, target Core kind, target coordinate system, primitive loss policy, pack, ratio, rule, tolerance, unit, or coordinate transform.

## Target Core Geometry Profile

The first approved target profile is existing normalized 2D Core `Composition2D`.

The target Core profile identity is `core.geometry-v1.composition-2d.normalized-rectangles@1`.

The target Core geometry kind is `composition-2d`.

The mapper produces one `Composition2D` with:

- a full-unit `SurfaceSpace` composition surface;
- one Core rectangular element per accepted rectangle primitive;
- no construction result;
- no measurement result;
- no evaluation result;
- no pack;
- no rules;
- no tolerances;
- no artifacts.

The target coordinate system is exactly:

```ts
readonly targetCoordinateSystem: {
  readonly kind: "coordinate-system";
  readonly id: "norma-canonical-2d-normalized";
  readonly origin: "bottom-left";
  readonly xAxis: "right";
  readonly yAxis: "up";
  readonly dimensions: 2;
  readonly coordinateScale: "normalized";
};
```

No `name`, `xDirection`, `yDirection`, `scale`, metric-unit, pixel-unit, or 3D coordinate-system fields are approved.

## Primitive Mapping Matrix

| Primitive | Supported | Core target | Exact rule | Rejection diagnostic |
| --- | --- | --- | --- | --- |
| `point` | No | None | Reject; Core V1 has no standalone source-geometry point target for this profile. | `UnsupportedAcceptedGeometryPrimitiveKind` |
| `segment` | No | None | Reject; current Core `SegmentSpace` is one-dimensional and does not exactly represent an observation 2D segment source object. | `UnsupportedAcceptedGeometryPrimitiveKind` |
| `axis` | No | None | Reject; Core V1 has no exact bounded-axis source-geometry target with matching semantics. | `UnsupportedAcceptedGeometryPrimitiveKind` |
| `rectangle` | Yes | `Composition2D.elements[].geometry` as Core `Rect` | Transform normalized top-left/y-down rectangle to normalized bottom-left/y-up Core `Rect` with the formulas in this decision. | None |

Unsupported primitive kinds must not be silently dropped, approximated, promoted into anchors, promoted into segments, converted by hidden heuristics, or used to infer packs, ratios, rules, tolerances, evaluations, scores, or artifacts.

The mapper must fail the whole request when any primitive is unsupported. Partial mapped output is not approved.

## Coordinate Transform

The source coordinate frame is normalized 2D observation space:

- `dimensions`: exactly `2`;
- `coordinateScale`: exactly `normalized`;
- `origin`: exactly `top-left`;
- `xDirection`: exactly `right`;
- `yDirection`: exactly `down`;
- inclusive bounds: `x` in `[0, 1]` and `y` in `[0, 1]`.

The target coordinate frame is normalized 2D Core space:

- `kind`: exactly `coordinate-system`;
- `id`: exactly `norma-canonical-2d-normalized`;
- `origin`: exactly `bottom-left`;
- `xAxis`: exactly `right`;
- `yAxis`: exactly `up`;
- `dimensions`: exactly `2`;
- `coordinateScale`: exactly `normalized`;
- inclusive bounds: `x` in `[0, 1]` and `y` in `[0, 1]`.

Point transform, reserved for future profiles but not mapped by this first profile:

- `coreX = observationX`;
- `coreY = 1 - observationY`.

Segment or axis endpoint transform, reserved for future profiles but not mapped by this first profile:

- transform each endpoint independently with the point transform.

Rectangle transform:

- `coreX = observationX`;
- `coreY = 1 - observationY - observationHeight`;
- `coreWidth = observationWidth`;
- `coreHeight = observationHeight`.

All mapped values must be finite numbers within inclusive normalized bounds.

The mapper must not round, clamp, repair, rescale, apply perspective correction, infer physical units, or convert pixels to metric values.

Invalid or unmappable coordinates must be rejected with `AcceptedGeometryCoordinateTransformFailed`.

If an exact transform output is negative zero, the output must canonicalize that value to `0`. No other numeric repair is approved.

Primitive output order must preserve `acceptedGeometry.primitives` order.

## Mapping Request Contract

The package-private request contract identity is `norma.accepted-geometry-to-core-mapping@1`.

The package-private request shape is closed and versioned:

```ts
interface AcceptedGeometryToCoreMappingRequestV1 {
  readonly contractId: "norma.accepted-geometry-to-core-mapping@1";
  readonly contractVersion: 1;
  readonly requestId: string;
  readonly mapperOperationId: "core.accepted-geometry-to-core-mapping.map";
  readonly mapperOperationVersion: "0.1.0-pr81";
  readonly mappingProfileId: "norma.accepted-geometry-to-core-mapping.rectangles-to-composition-2d@1";
  readonly mappingProfileVersion: 1;
  readonly targetCoreProfileId: "core.geometry-v1.composition-2d.normalized-rectangles@1";
  readonly targetCoreGeometryKind: "composition-2d";
  readonly targetCoordinateSystem: {
    readonly kind: "coordinate-system";
    readonly id: "norma-canonical-2d-normalized";
    readonly origin: "bottom-left";
    readonly xAxis: "right";
    readonly yAxis: "up";
    readonly dimensions: 2;
    readonly coordinateScale: "normalized";
  };
  readonly acceptedGeometry: AcceptedGeometry;
  readonly acceptedGeometryContentIdentity: string;
  readonly sourceObservationId: string;
  readonly sourceObservationContentIdentity: string;
  readonly mappingContext: {
    readonly boundary: "synthetic-only";
    readonly primitiveLossPolicy: "reject";
    readonly coordinateTransform: "normalized-top-left-y-down-to-bottom-left-y-up@1";
  };
}
```

The request must contain no provider payload, raw image bytes, prompt text, hidden prompt, credentials, local path, remote URL, pack, ratio, rule, tolerance, measurement configuration, evaluation configuration, artifact, timestamp, random seed, or environment value.

## Mapping Result Contract

The package-private result contract identity is `norma.accepted-geometry-to-core-mapping@1`.

The package-private result shape is closed and versioned:

```ts
interface AcceptedGeometryToCoreMappingResultV1 {
  readonly contractId: "norma.accepted-geometry-to-core-mapping@1";
  readonly contractVersion: 1;
  readonly requestId: string;
  readonly ok: boolean;
  readonly status: "mapped" | "invalid" | "unsupported";
  readonly mapperOperationId: "core.accepted-geometry-to-core-mapping.map";
  readonly mapperOperationVersion: "0.1.0-pr81";
  readonly mappingProfileId: "norma.accepted-geometry-to-core-mapping.rectangles-to-composition-2d@1";
  readonly targetCoreProfileId: "core.geometry-v1.composition-2d.normalized-rectangles@1";
  readonly targetCoreGeometryKind: "composition-2d";
  readonly mappedGeometry: Composition2D | null;
  readonly mappedGeometryContentIdentity: string | null;
  readonly resultContentIdentity: string;
  readonly primitiveMappings: readonly AcceptedPrimitiveCoreMapping[];
  readonly coordinateTransform: CoordinateTransformRecordV1;
  readonly sourceRefs: readonly SourceReference[];
  readonly diagnostics: readonly AcceptedGeometryToCoreMappingDiagnostic[];
}
```

A successful result must have:

- `ok: true`;
- `status: "mapped"`;
- a non-null `mappedGeometry`;
- a non-null `mappedGeometryContentIdentity`;
- one primitive mapping for every accepted rectangle primitive;
- `diagnostics: []`.

An invalid or unsupported result must have:

- `ok: false`;
- `status: "invalid"` or `status: "unsupported"`;
- `mappedGeometry: null`;
- `mappedGeometryContentIdentity: null`;
- `primitiveMappings: []`;
- deterministic diagnostics;
- no partial Core geometry output.

## Identity And Provenance

The mapper must preserve visible identity and provenance.

The request `acceptedGeometryContentIdentity` must equal `acceptedGeometry.contentIdentity`.

The request `sourceObservationId` must equal `acceptedGeometry.sourceObservationId`.

The request `sourceObservationContentIdentity` must equal `acceptedGeometry.sourceObservationContentIdentity`.

The Core composition ID must be deterministic:

`composition:accepted-geometry:<acceptedGeometryId>:rectangles`

The Core surface ID must be deterministic:

`surface:accepted-geometry:<acceptedGeometryId>:unit`

Each Core element ID must be deterministic:

`element:accepted-geometry:<acceptedGeometryId>:primitive:<primitive.id>`

The mapper must not generate random IDs, use array indexes as the only identity, sanitize primitive IDs into colliding values, drop primitive IDs, or hide primitive loss.

Each primitive mapping record must include:

- accepted geometry ID;
- accepted geometry content identity;
- source observation ID;
- source observation content identity;
- accepted primitive ID;
- accepted primitive kind;
- Core object kind;
- Core object ID;
- Core object reference;
- mapping profile ID.

The mapper must reject any identity collision with `AcceptedGeometrySourceIdentityCollision`.

## Diagnostics

Mapping diagnostics are package-private and deterministic.

Approved diagnostic codes are:

- `InvalidAcceptedGeometryMappingRequest`;
- `UnsupportedAcceptedGeometryMappingRequest`;
- `UnsupportedAcceptedGeometryPrimitiveKind`;
- `AcceptedGeometryCoordinateTransformFailed`;
- `AcceptedGeometryMappingContentIdentityMismatch`;
- `AcceptedGeometrySourceIdentityCollision`.

All mapping diagnostics have `severity: "error"`.

Approved diagnostic surfaces are:

- `AcceptedGeometryToCoreMappingRequest`;
- `AcceptedGeometry`;
- `Primitive`;
- `CoordinateTransform`;
- `ContentIdentity`;
- `TargetCoreGeometry`.

Each diagnostic must include exactly:

- `code`;
- `severity`;
- `surface`;
- `path`;
- `primitiveId`;
- `message`.

`primitiveId` must be the exact accepted primitive ID for primitive-scoped diagnostics and explicit `null` otherwise.

Diagnostics must be ordered by request field order, then primitive order, then code, then message.

Diagnostics must not include stack traces, local paths, raw provider payloads, raw images, image bytes, credentials, hidden prompts, chain-of-thought, environment values, or full payload echoes.

## Mapper Content Identity Rules

`mappedGeometryContentIdentity` is `sha256:<64 lowercase hex>` over the deterministic canonical JSON serialization of `mappedGeometry` only.

`resultContentIdentity` is `sha256:<64 lowercase hex>` over the deterministic canonical JSON serialization of the mapping result projection excluding `resultContentIdentity` itself.

The result identity projection includes `requestId`, `status`, `mapperOperationId`, `mapperOperationVersion`, `mappingProfileId`, `targetCoreProfileId`, `targetCoreGeometryKind`, `mappedGeometryContentIdentity`, `primitiveMappings`, `coordinateTransform`, `sourceRefs`, and `diagnostics`.

Diagnostics are included in failed or unsupported result identity.

Object key order is insignificant.

Array order is significant.

No timestamps, random values, local paths, provider payloads, hidden prompts, credentials, image bytes, or environment values participate.

## Determinism And Replay

The same validated `AcceptedGeometry`, same request fields, same mapping contract version, same mapping profile version, same mapper operation version, same coordinate transform, and same target Core profile must produce the same mapped Core geometry, primitive mappings, coordinate transform record, source references, diagnostics, and content identities.

The mapper must not use current time, randomness, network, provider calls, mutable global state, hidden defaults, local paths, environment variables, or object key insertion order.

Object key order must not affect mapping.

Array order is significant and must preserve accepted primitive order.

Replay must be able to inspect the accepted geometry identity, source observation identity, mapping profile, mapper operation version, coordinate transform, primitive mappings, and diagnostics without rerunning a provider.

## Synthetic-Only Boundary

PR80 and PR81 remain synthetic-data-only.

PR80 does not approve real user images, private production assets, remote URLs, image bytes, file uploads, OpenAI API calls, provider execution, camera input, CAD import, UI, remote MCP, production storage, deployment, public endpoints, or real data handling.

The future mapper operates on already validated synthetic `AcceptedGeometry` objects only.

## PR81 Authorized Scope

PR81 may implement only:

- package-private mapping request and result types;
- package-private deterministic mapper;
- the rectangle-to-`Composition2D` profile approved by PR80;
- the coordinate transform approved by PR80;
- stable diagnostics approved by PR80;
- deterministic content identity helpers for the mapper result;
- synthetic fixtures;
- focused unit or integration tests.

PR81 must not implement provider execution, OpenAI calls, image parsing, image files, camera input, CAD import, UI, remote MCP, deployment, real data, pack inference, rule inference, tolerance inference, construction, measurement, evaluation, comparison, explanation, artifact generation, package-root exports, or PR82 integration proof.

## Non-Goals

PR80 does not approve:

- runtime mapper implementation;
- TypeScript mapper files;
- package exports;
- JSON Schema files;
- generated schemas;
- fixtures;
- provider SDK dependencies;
- provider execution;
- OpenAI API usage;
- image ingestion;
- OCR;
- vectorization;
- metric reconstruction;
- physical measurements from pixels;
- camera calibration;
- CAD import;
- 3D mapping;
- music-domain mapping;
- browser behavior;
- CLI behavior;
- MCP behavior;
- public API behavior;
- construction;
- measurement;
- evaluation;
- scoring;
- artifacts;
- deployment.

## Guardrails

PR80 may modify only:

- `docs/decisions/2026-06-20-accepted-geometry-to-core-mapping-contract-approval.md`;
- `tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs`;
- `tests/geometry-observation-perception-provider-contract-approval.test.mjs`;
- `tests/post-mvp-product-vision-approval.test.mjs`;
- `tests/read-only-viewer-fixtures.test.mjs`;
- `tests/read-only-viewer-model.test.mjs`;
- `tests/read-only-viewer-static.test.mjs`.

Guard maintenance must be exact changed-file allowlists only.

PR80 must not broaden protected prefixes, exempt all `docs/**`, weaken package/runtime guards, add suppressions, or modify implementation surfaces.

PR80 must not modify `src/**`, `bin/**`, `viewer/**`, `examples/**`, `tests/fixtures/**`, `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, or `.github/**`.

## Validation Gates

PR80 is acceptable only when:

- PR79 is merged into `main`;
- local `main`, `origin/main`, and GitHub `main` agree before branching;
- every primitive kind has a supported or rejected outcome;
- coordinate conversion is exact;
- mapper content identity rules are exact;
- no runtime implementation is added;
- guard maintenance remains narrow;
- the new approval test passes;
- PR79 validator tests remain green;
- full repository tests and checks pass;
- protected runtime, fixture, package, README, and CI surfaces remain unchanged.

The protected diff proof command is:

```bash
rtk git diff --exit-code main...HEAD -- \
  src \
  bin \
  viewer \
  examples \
  tests/fixtures \
  package.json \
  package-lock.json \
  tsconfig.json \
  README.md \
  .github
```

## Rollback

Rollback is to revert only the PR80 documentation, approval test, and exact guard-maintenance changes.

Do not revert PR79.
