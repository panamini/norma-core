import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
  validateAcceptedGeometryV1,
} from "../dist/src/geometry-observation.js";
import {
  computeControlledProviderObservationContractContentIdentityV1,
  createControlledProviderObservationAcceptanceProofV1,
} from "../dist/src/local-report/controlled-provider-observation-acceptance-proof.js";
import { createControlledProviderObservationContractV1 } from "../dist/src/local-report/controlled-provider-observation-contract.js";
import { createControlledProviderObservationToCoreHandoffV1 } from "../dist/src/local-report/controlled-provider-observation-to-core-handoff.js";
import { createControlledLiveProviderSmokeArtifactProofV1 } from "../dist/src/local-report/controlled-live-provider-smoke-artifact-proof.js";
import {
  branchChangedFiles,
  controlledProviderObservationToCoreHandoffChangedFiles,
  isExactChangedFileSet,
  localVisualObservationToCorePilotContractChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.dirname(__dirname);
const helperSourcePath = path.join(
  repoRoot,
  "src",
  "local-report",
  "controlled-provider-observation-to-core-handoff.ts",
);
const indexSourcePath = path.join(repoRoot, "src", "index.ts");
const packageJsonPath = path.join(repoRoot, "package.json");

test("PR126 validates PR123 PR124 and PR125 facts but blocks the unapproved Core mapping boundary", () => {
  const artifacts = createRedactedSuccessArtifacts();
  const artifactProof = createControlledLiveProviderSmokeArtifactProofV1(artifacts);
  const providerObservationContract = createControlledProviderObservationContractV1(artifacts);
  const input = createValidHandoffInput({ providerObservationContract });
  const handoff = createControlledProviderObservationToCoreHandoffV1(input);

  assert.equal(artifactProof.status, "ok");
  assert.equal(providerObservationContract.providerEvidenceOnly, true);
  assert.equal(validateAcceptedGeometryV1(input.acceptedStructuredGeometry).ok, true);
  assert.deepEqual(handoff, {
    kind: "norma.controlled-provider-observation-to-core-handoff.v1",
    version: 1,
    status: "blocked_unapproved_mapping_boundary",
    ok: false,
    providerObservationAuthority: "candidateEvidenceOnly",
    boundarySourceTruth: "acceptedStructuredGeometry",
    coreInputAuthority: "acceptedStructuredGeometry",
    acceptedGeometryIsOnlyCoreInput: true,
    acceptedStructuredGeometryValidated: true,
    acceptanceBoundaryExplicit: true,
    providerSelfAcceptance: false,
    providerGeometryCreated: false,
    mappingBoundaryApproved: false,
    mappingAttempted: false,
    coreInputProduced: false,
    structuredAnalyzeInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    providerObservationId: providerObservationContract.observationId,
    providerObservationContentIdentity:
      input.acceptanceBoundary.providerObservationContentIdentity,
    acceptedGeometryId: input.acceptedStructuredGeometry.acceptedGeometryId,
    acceptedGeometryContentIdentity: input.acceptedStructuredGeometry.contentIdentity,
    acceptedGeometryRevisionContentIdentity:
      input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity,
    blockedReason: "provider_observation_mapping_boundary_unapproved",
    nextAllowedStep: "approve_provider_observation_mapping_boundary",
  });
  assert.equal("mappingResult" in handoff, false);
  assert.equal("mappedComposition2D" in handoff, false);
});

test("PR126 never relabels a provider observation handoff as synthetic-only", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const handoff = createControlledProviderObservationToCoreHandoffV1(createValidHandoffInput());

  assert.equal(handoff.mappingBoundaryApproved, false);
  assert.equal(handoff.mappingAttempted, false);
  assert.equal(handoff.coreInputProduced, false);
  assert.equal(handoff.nextAllowedStep, "approve_provider_observation_mapping_boundary");
  assert.doesNotMatch(helperSource, /accepted-geometry-to-core-mapping|mapAcceptedGeometryToCoreV1/u);
  assert.doesNotMatch(helperSource, /synthetic-only|createMappingRequest/u);
});

test("PR126 recursively rejects accessors hidden fields symbols classes and sparse arrays before cloning", () => {
  {
    const input = createValidHandoffInput();
    let getterCalls = 0;
    Object.defineProperty(input.acceptedStructuredGeometry, "primitives", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return [rectanglePrimitive()];
      },
    });
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(input),
      /acceptedStructuredGeometry\.primitives.*requires enumerable own data field/u,
    );
    assert.equal(getterCalls, 0);
  }

  {
    const input = createValidHandoffInput();
    Object.defineProperty(input.providerObservationContract, "hiddenCredential", {
      enumerable: false,
      value: "redacted",
    });
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(input),
      /providerObservationContract\.hiddenCredential.*requires enumerable own data field/u,
    );
  }

  {
    const input = createValidHandoffInput();
    Object.defineProperty(input.acceptedStructuredGeometry, "toJSON", {
      enumerable: false,
      value: () => ({ substituted: true }),
    });
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(input),
      /acceptedStructuredGeometry\.toJSON.*requires enumerable own data field/u,
    );
  }

  {
    const input = createValidHandoffInput();
    input.acceptanceBoundary.decisionProvenance[Symbol("authority")] = true;
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(input),
      /decisionProvenance\.\[symbol\].*requires string-keyed plain data/u,
    );
  }

  {
    const input = createValidHandoffInput();
    class Bounds {
      constructor() {
        this.x = [0, 1];
        this.y = [0, 1];
      }
    }
    input.acceptedStructuredGeometry.coordinateFrame.bounds = new Bounds();
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(input),
      /coordinateFrame\.bounds.*requires plain object/u,
    );
  }

  {
    const input = createValidHandoffInput();
    delete input.acceptedStructuredGeometry.primitives[0];
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(input),
      /acceptedStructuredGeometry\.primitives.*requires dense array data/u,
    );
  }
});

test("PR126 rejects nested proxies before any reflective validation trap can run", () => {
  const input = createValidHandoffInput();
  let trapCalls = 0;
  input.acceptedStructuredGeometry.coordinateFrame = new Proxy(
    input.acceptedStructuredGeometry.coordinateFrame,
    {
      getPrototypeOf: () => {
        trapCalls += 1;
        return Object.prototype;
      },
      ownKeys: () => {
        trapCalls += 1;
        return [];
      },
      getOwnPropertyDescriptor: () => {
        trapCalls += 1;
        return undefined;
      },
    },
  );

  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(input),
    /acceptedStructuredGeometry\.coordinateFrame.*must not be a Proxy/u,
  );
  assert.equal(trapCalls, 0);
});

test("PR126 rejects cycles and non-JSON scalar values before snapshot", () => {
  {
    const input = createValidHandoffInput();
    input.providerObservationContract.cycle = input.providerObservationContract;
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(input),
      /providerObservationContract\.cycle.*must not contain cycles/u,
    );
  }

  for (const value of [undefined, 1n, Symbol("unsafe"), () => true, Number.NaN, Infinity]) {
    const input = createValidHandoffInput();
    input.providerObservationContract.providerClass = value;
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(input),
      /providerObservationContract\.providerClass.*plain data|finite JSON number/u,
    );
  }
});

test("PR126 requires PR125 validation and rejects provider observation as accepted geometry", () => {
  const input = createValidHandoffInput();

  assert.throws(
    () =>
      createControlledProviderObservationToCoreHandoffV1({
        ...input,
        acceptanceBoundary: {
          ...input.acceptanceBoundary,
          providerObservationContentIdentity:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      }),
    /acceptanceBoundary\.providerObservationContentIdentity/u,
  );
  assert.throws(
    () =>
      createControlledProviderObservationToCoreHandoffV1({
        ...input,
        acceptedStructuredGeometry: input.providerObservationContract,
      }),
    /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
  );
});

test("PR126 rejects detached proofs caller mapping authority and caller Core compositions", () => {
  const input = createValidHandoffInput();
  const detachedProof = createControlledProviderObservationAcceptanceProofV1(input);

  for (const [field, value] of [
    ["acceptanceProof", detachedProof],
    ["mappingResult", { ok: true }],
    ["mappedGeometry", { kind: "composition-2d" }],
    ["mappedComposition2D", { kind: "composition-2d" }],
    ["coreComposition", { kind: "composition-2d" }],
    ["coreInput", { kind: "composition-2d" }],
  ]) {
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1({ ...input, [field]: value }),
      new RegExp(`input\\.${field}.*unknown field`, "u"),
      field,
    );
  }
});

test("PR126 rejects non-plain missing inherited accessor hidden symbol and unknown envelope fields", () => {
  const input = createValidHandoffInput();
  const inherited = Object.create(input);
  const missing = { ...input };
  delete missing.acceptedStructuredGeometry;

  for (const value of [null, [], new Date(), inherited]) {
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(value),
      /field "input": requires plain object/u,
    );
  }
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(missing),
    /input\.acceptedStructuredGeometry.*requires own field/u,
  );
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1({ ...input, extra: true }),
    /input\.extra.*unknown field/u,
  );

  const hiddenExtraInput = { ...input };
  Object.defineProperty(hiddenExtraInput, "hiddenExtra", { enumerable: false, value: true });
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(hiddenExtraInput),
    /input\.hiddenExtra.*unknown field/u,
  );
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1({ ...input, [Symbol("extra")]: true }),
    /input\.\[symbol\].*unknown field/u,
  );

  for (const field of [
    "providerObservationContract",
    "acceptanceBoundary",
    "acceptedStructuredGeometry",
  ]) {
    class NestedInputRecord {}
    const classInstance = Object.assign(new NestedInputRecord(), input[field]);
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1({ ...input, [field]: classInstance }),
      new RegExp(`input\\.${field}.*requires plain object`, "u"),
      field,
    );
  }

  const accessorInput = { ...input };
  let accessorCalls = 0;
  Object.defineProperty(accessorInput, "acceptedStructuredGeometry", {
    enumerable: true,
    get: () => {
      accessorCalls += 1;
      return input.acceptedStructuredGeometry;
    },
  });
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(accessorInput),
    /input\.acceptedStructuredGeometry.*requires own data field/u,
  );
  assert.equal(accessorCalls, 0);
});

test("PR126 rejects a proxied envelope before snapshot traversal", () => {
  const input = createValidHandoffInput();
  let trapCalls = 0;
  const proxiedInput = new Proxy(input, {
    getPrototypeOf: () => {
      trapCalls += 1;
      return Object.prototype;
    },
    ownKeys: () => {
      trapCalls += 1;
      return [];
    },
  });

  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(proxiedInput),
    /field "input": must not be a Proxy/u,
  );
  assert.equal(trapCalls, 0);
});

test("PR126 identity and authority mismatches fail before the mapping gate result", () => {
  for (const [name, mutate, pattern] of [
    [
      "observation id",
      (input) => {
        input.acceptanceBoundary.providerObservationId = "controlled-provider-observation:v1:mismatch";
      },
      /acceptanceBoundary\.providerObservationId/u,
    ],
    [
      "actor id",
      (input) => {
        input.acceptedStructuredGeometry.acceptance.actorId = "stale-actor";
        refreshAcceptedGeometryIdentities(input);
      },
      /acceptedStructuredGeometry\.acceptance\.actorId/u,
    ],
    [
      "provider actor",
      (input) => {
        input.acceptedStructuredGeometry.provenance.actorType = "provider";
        refreshAcceptedGeometryIdentities(input);
      },
      /acceptedStructuredGeometry\.provenance\.actorType/u,
    ],
    [
      "stale identity",
      (input) => {
        input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity =
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      },
      /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
    ],
  ]) {
    const input = createValidHandoffInput();
    mutate(input);
    assert.throws(() => createControlledProviderObservationToCoreHandoffV1(input), pattern, name);
  }
});

test("PR126 provider metadata confidence diagnostics and self-acceptance cannot authorize Core mapping", () => {
  for (const mutate of [
    (input) => {
      input.acceptanceBoundary.providerSelfAcceptance = true;
    },
    (input) => {
      input.acceptanceBoundary.automaticAcceptance = true;
    },
    (input) => {
      input.acceptanceBoundary.confidenceScoreValueCanAuthorizeAcceptance = true;
    },
    (input) => {
      input.acceptanceBoundary.providerMetadataCanAuthorizeAcceptance = true;
    },
    (input) => {
      input.acceptanceBoundary.promptCanAuthorizeAcceptance = true;
    },
    (input) => {
      input.acceptanceBoundary.providerDiagnosticCanAuthorizeAcceptance = true;
    },
  ]) {
    const input = createValidHandoffInput();
    mutate(input);
    assert.throws(() => createControlledProviderObservationToCoreHandoffV1(input));
  }
});

test("PR126 invalid accepted geometry fails without exposing partial Core output", () => {
  const input = createValidHandoffInput();
  input.acceptedStructuredGeometry.primitives[0].width = 0;

  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(input),
    /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
  );
});

test("PR126 repeated calls are deterministic and detached from caller mutation", () => {
  const input = createValidHandoffInput();
  const before = structuredClone(input);
  const first = createControlledProviderObservationToCoreHandoffV1(input);
  const second = createControlledProviderObservationToCoreHandoffV1(input);
  const resultBeforeMutation = structuredClone(first);

  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  input.acceptedStructuredGeometry.primitives[0].x = 0.42;
  input.providerObservationContract.providerClass = "unknown_redacted_provider";
  input.acceptanceBoundary.acceptanceActor.actorId = "mutated-after-return";
  assert.deepEqual(first, resultBeforeMutation);
});

test("PR126 provider-only observation changes remain evidence-only and cannot produce Core input", () => {
  const first = createValidHandoffInput();
  const second = createValidHandoffInput();
  second.providerObservationContract.providerClass = "unknown_redacted_provider";
  second.providerObservationContract.responseStatusClass = "unknown_redacted_status";
  relinkAcceptedGeometry(second);

  for (const handoff of [
    createControlledProviderObservationToCoreHandoffV1(first),
    createControlledProviderObservationToCoreHandoffV1(second),
  ]) {
    assert.equal(handoff.providerObservationAuthority, "candidateEvidenceOnly");
    assert.equal(handoff.mappingBoundaryApproved, false);
    assert.equal(handoff.mappingAttempted, false);
    assert.equal(handoff.coreInputProduced, false);
    assert.equal("mappingResult" in handoff, false);
  }
});

test("PR126 helper is package-private and avoids mapper runtime and external integration imports", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const indexSource = await readFile(indexSourcePath, "utf8");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageRoot = await import("../dist/src/index.js");

  assert.match(helperSource, /createControlledProviderObservationAcceptanceProofV1/u);
  assert.match(helperSource, /blocked_unapproved_mapping_boundary/u);
  assert.match(helperSource, /approve_provider_observation_mapping_boundary/u);
  assert.equal((helperSource.match(/structuredClone\(/gu) ?? []).length, 1);
  assert.doesNotMatch(helperSource, /JSON\.(?:parse|stringify)/u);
  assert.doesNotMatch(
    helperSource,
    /accepted-geometry-to-core-mapping|mapAcceptedGeometryToCoreV1|synthetic-only|createMappingRequest|structured-composition-analysis|analyzeStructuredCompositionV1/iu,
  );
  assert.doesNotMatch(
    helperSource,
    /node:fs|node:child_process|node:https?|fetch|XMLHttpRequest|WebSocket|@openai|api\.openai|provider-sdk|mcp|chatgpt|cad|figma|upload|oauth|result\.json/iu,
  );
  assert.equal("createControlledProviderObservationToCoreHandoffV1" in packageRoot, false);
  assert.doesNotMatch(indexSource, /controlled-provider-observation-to-core-handoff/u);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.equal("bin" in packageJson, false);
  assert.equal("dependencies" in packageJson, false);
  assert.equal("publishConfig" in packageJson, false);
});

test("PR126 changed files stay exact and protected runtime surfaces do not drift", () => {
  const changedFiles = branchChangedFiles(repoRoot);
  const isPr126Set = isExactChangedFileSet(
    changedFiles,
    controlledProviderObservationToCoreHandoffChangedFiles,
  );
  const isPr127Set = isExactChangedFileSet(
    changedFiles,
    localVisualObservationToCorePilotContractChangedFiles,
  );
  const expectedChangedFiles = isPr127Set
    ? localVisualObservationToCorePilotContractChangedFiles
    : controlledProviderObservationToCoreHandoffChangedFiles;

  assert.equal(isPr126Set || isPr127Set, true);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledProviderObservationToCoreHandoffChangedFiles),
    controlledProviderObservationToCoreHandoffChangedFiles,
  );
  assert.deepEqual(sharedExactApprovedChangedFiles(changedFiles), expectedChangedFiles);

  for (const forbiddenPrefix of [
    "bin/",
    "tests/fixtures/",
    "examples/",
    "viewer/",
    "reports/",
    ".github/",
  ]) {
    assert.equal(changedFiles.some((file) => file.startsWith(forbiddenPrefix)), false, forbiddenPrefix);
  }
  if (isPr127Set) {
    assert.deepEqual(changedFiles.filter((file) => file.startsWith("docs/")), [
      "docs/BUSINESS_READINESS_ROADMAP.md",
      "docs/decisions/2026-07-10-local-visual-observation-to-core-pilot-contract.md",
    ]);
  } else {
    assert.equal(changedFiles.some((file) => file.startsWith("docs/")), false, "docs/");
  }
  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/geometry-observation.ts",
  ]) {
    assert.equal(changedFiles.includes(forbiddenFile), false, forbiddenFile);
  }
});

function createValidHandoffInput({
  providerObservationContract = createControlledProviderObservationContractV1(createRedactedSuccessArtifacts()),
  primitives = [rectanglePrimitive()],
} = {}) {
  const providerObservationContentIdentity =
    computeControlledProviderObservationContractContentIdentityV1(providerObservationContract);
  const acceptedStructuredGeometry = createAcceptedGeometry({
    providerObservationContract,
    providerObservationContentIdentity,
    primitives,
  });
  const acceptanceBoundary = createAcceptanceBoundary({
    providerObservationContract,
    providerObservationContentIdentity,
    acceptedStructuredGeometry,
  });
  return { providerObservationContract, acceptanceBoundary, acceptedStructuredGeometry };
}

function createAcceptanceBoundary({
  providerObservationContract,
  providerObservationContentIdentity,
  acceptedStructuredGeometry,
}) {
  return {
    kind: "norma.controlled-provider-observation-acceptance-boundary.v1",
    version: 1,
    acceptanceActor: { actorClass: "deterministic_test", actorId: "pr126-test" },
    acceptanceMode: "explicit_acceptance",
    providerObservationId: providerObservationContract.observationId,
    providerObservationContentIdentity,
    acceptedGeometryId: acceptedStructuredGeometry.acceptedGeometryId,
    acceptedGeometryContentIdentity: acceptedStructuredGeometry.contentIdentity,
    acceptedGeometryRevisionContentIdentity:
      acceptedStructuredGeometry.acceptance.acceptedContentIdentity,
    decisionProvenance: {
      source: "non_provider_explicit_acceptance",
      localOnly: true,
      providerGenerated: false,
      promptDerived: false,
      artifactDerived: false,
      confidenceDerived: false,
      diagnosticDerived: false,
      metadataDerived: false,
    },
    localOnly: true,
    outsideProviderBoundary: true,
    nonProviderAuthority: true,
    providerEvidenceOnly: true,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    providerStatusCanAuthorizeAcceptance: false,
    providerDiagnosticCanAuthorizeAcceptance: false,
    providerMetadataCanAuthorizeAcceptance: false,
    artifactCanAuthorizeAcceptance: false,
    promptCanAuthorizeAcceptance: false,
    automaticAcceptance: false,
    providerGeometryCreated: false,
  };
}

function createAcceptedGeometry({
  providerObservationContract,
  providerObservationContentIdentity,
  primitives,
}) {
  const actorType = "deterministic-test";
  const actorId = "pr126-test";
  const createdAt = "2026-07-10T00:00:00Z";
  const provenance = {
    provenanceId: "prov:pr126:test",
    actorType,
    actorId,
    operationId: "controlled-provider-observation.to-core-handoff",
    operationVersion: "1",
    inputContentIdentity: providerObservationContentIdentity,
    createdAt,
    notes: null,
  };
  const accepted = {
    contractId: "norma.accepted-geometry@1",
    contractVersion: 1,
    acceptedGeometryId: "accepted:controlled-provider-observation:pr126:v1",
    sourceObservationId: providerObservationContract.observationId,
    sourceObservationContentIdentity: providerObservationContentIdentity,
    acceptedRevision: 1,
    coordinateFrame: {
      dimensions: 2,
      coordinateScale: "normalized",
      origin: "top-left",
      xDirection: "right",
      yDirection: "down",
      bounds: { x: [0, 1], y: [0, 1] },
      sourcePixelWidth: 100,
      sourcePixelHeight: 100,
    },
    primitives: structuredClone(primitives),
    correctionHistory: [],
    acceptance: {
      acceptanceId: "acceptance:controlled-provider-observation:pr126:v1",
      accepted: true,
      actorType,
      actorId,
      acceptedAt: createdAt,
      sourceObservationId: providerObservationContract.observationId,
      sourceObservationContentIdentity: providerObservationContentIdentity,
      acceptedRevision: 1,
      acceptedContentIdentity: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      acceptedPrimitiveIds: primitives.map((primitive) => primitive.id),
      provenance,
    },
    provenance,
    contentIdentity: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
  };
  accepted.acceptance.acceptedContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  accepted.contentIdentity = computeAcceptedGeometryContentIdentity(accepted);
  assert.equal(validateAcceptedGeometryV1(accepted).ok, true);
  return accepted;
}

function rectanglePrimitive(overrides = {}) {
  return {
    id: "rectangle:frame",
    kind: "rectangle",
    x: 0.1,
    y: 0.2,
    width: 0.7,
    height: 0.6,
    confidence: 0.85,
    ...overrides,
  };
}

function relinkAcceptedGeometry(input) {
  const providerObservationContentIdentity =
    computeControlledProviderObservationContractContentIdentityV1(input.providerObservationContract);
  input.acceptanceBoundary.providerObservationContentIdentity = providerObservationContentIdentity;
  input.acceptedStructuredGeometry.sourceObservationContentIdentity = providerObservationContentIdentity;
  input.acceptedStructuredGeometry.acceptance.sourceObservationContentIdentity = providerObservationContentIdentity;
  input.acceptedStructuredGeometry.provenance.inputContentIdentity = providerObservationContentIdentity;
  input.acceptedStructuredGeometry.acceptance.provenance.inputContentIdentity =
    providerObservationContentIdentity;
  refreshAcceptedGeometryIdentities(input);
}

function refreshAcceptedGeometryIdentities(input) {
  input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity =
    computeAcceptedGeometryRevisionContentIdentity(input.acceptedStructuredGeometry);
  input.acceptedStructuredGeometry.contentIdentity =
    computeAcceptedGeometryContentIdentity(input.acceptedStructuredGeometry);
  input.acceptanceBoundary.acceptedGeometryContentIdentity = input.acceptedStructuredGeometry.contentIdentity;
  input.acceptanceBoundary.acceptedGeometryRevisionContentIdentity =
    input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity;
}

function createRedactedSuccessArtifacts() {
  const providerEvidenceEnvelope = {
    kind: "norma.controlled-live-provider-smoke.provider-evidence-envelope.v1",
    version: 1,
    liveProviderExecution: true,
    manualOnly: true,
    localOnly: true,
    providerEvidenceOnly: true,
    requiresExplicitAcceptance: true,
    providerOutputIsCoreTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    acceptedStructuredGeometryProduced: false,
    coreInputProduced: false,
    resultJsonProduced: false,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    promptArtifactOrMetricPolicyCanAuthorizeAcceptance: false,
    rawProviderOutputPersisted: false,
    rawImagePersisted: false,
    redacted: true,
    ciLiveNetworkDependency: false,
    image: {
      contentIdentity: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      mediaType: "image/png",
      sizeBytes: 128,
      sourcePathPersisted: false,
      rawImagePersisted: false,
      base64Persisted: false,
    },
    providerCall: {
      provider: "openai-responses-vision",
      modelConfigured: true,
      endpointKind: "openai_responses_api",
      timeoutMs: 30_000,
      credentialHeaderPersisted: false,
      requestBodyPersisted: false,
      rawProviderOutputPersisted: false,
      responseStatusCode: 200,
      responseClass: "success",
      providerOutputObserved: true,
      providerOutputTextPersisted: false,
    },
    evidenceSummary: {
      providerOutputObserved: true,
      persistedObservationClass: "redacted_provider_response_observed",
      providerNeutralObservationTextPersisted: false,
      lowCardinalityOnly: true,
    },
  };
  const summary = {
    kind: "norma.controlled-live-provider-smoke.summary.v1",
    liveProviderExecution: true,
    providerEvidenceOnly: true,
    requiresExplicitAcceptance: true,
    providerOutputIsCoreTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    rawProviderOutputPersisted: false,
    redacted: true,
    ciLiveNetworkDependency: false,
    artifacts: ["provider-evidence-envelope.json", "summary.json", "summary.md"],
    nonGoals: [
      "not production OpenAI integration",
      "not provider output truth",
      "not accepted structured geometry",
      "not Core input",
      "not result.json production",
      "not CI live-network behavior",
      "not package API or export expansion",
    ],
  };
  return { providerEvidenceEnvelope, summary };
}
