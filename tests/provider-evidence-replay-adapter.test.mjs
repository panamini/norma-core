import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";
import { validateAcceptedGeometryV1 } from "../dist/src/geometry-observation.js";
import { createProviderNeutralEnvelopeFromReplayV1 } from "../dist/src/provider-evidence-replay-adapter.js";
import { createSyntheticExternalEvidenceAcceptanceProofV1 } from "../dist/src/local-report/synthetic-external-evidence-acceptance-proof.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "../dist/src/serialization.js";
import { createStructuredAnalyzeInputFromAcceptedStructuredGeometry } from "../bin/norma-core-synthetic-evidence-acceptance-demo.mjs";
import {
  providerEvidenceReplayAdapterChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(testDir);
const replayFixturePath = path.join(
  testDir,
  "fixtures",
  "provider-evidence-replay",
  "static-provider-evidence-replay-v1.json",
);
const acceptedEnvelopeFixturePath = path.join(
  testDir,
  "fixtures",
  "visual-adapter",
  "synthetic-external-evidence-envelope-v1.json",
);
const adapterSourcePath = path.join(repoRoot, "src", "provider-evidence-replay-adapter.ts");
const packageJsonPath = path.join(repoRoot, "package.json");
const indexSourcePath = path.join(repoRoot, "src", "index.ts");

test("PR114 synthetic replay fixture is local static and free of forbidden data classes", async () => {
  const replayText = await readFile(replayFixturePath, "utf8");
  const replay = JSON.parse(replayText);

  assert.equal(replay.localOnly, true);
  assert.equal(replay.fixtureOnly, true);
  assert.equal(replay.staticFixture, true);
  assert.equal(replay.syntheticOnly, true);
  assert.equal(replay.notProviderResponseJson, true);
  assert.equal(replay.notProviderSdkResponse, true);
  assert.equal(replay.notProductionPayload, true);
  assert.equal(replay.notFutureApiContract, true);
  assert.equal(hasKey(replay, "acceptedStructuredGeometry"), false);
  assert.equal(hasKey(replay, "acceptedGeometry"), false);
  assert.equal(hasKey(replay, "acceptanceBoundary"), false);
  assert.equal(hasKey(replay, "apiKey"), false);
  assert.equal(hasKey(replay, "token"), false);
  assert.equal(hasKey(replay, "cookie"), false);
  assert.doesNotMatch(replayText, /https?:\/\/|data:image|base64|Bearer\s+|sk-[A-Za-z0-9]|\/Users\/|\/Volumes\//u);
  assert.doesNotMatch(replayText, /OpenAIResponseV1|VisionProviderPayloadV1|raw image|signed URL/iu);
});

test("PR114 maps provider-style replay evidence to an untrusted provider-neutral envelope", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);
  const result = createAdapterResult(replay, acceptedEnvelope);
  const envelope = result.providerNeutralEnvelope;

  assert.equal(result.providerEvidenceAuthority, "candidateEvidenceOnly");
  assert.equal(result.acceptedGeometryRequired, true);
  assert.equal(result.acceptedGeometryFromProvider, false);
  assert.equal(result.coreInputAuthority, "acceptedStructuredGeometry");
  assert.equal(envelope.kind, "norma.external-evidence-envelope.synthetic");
  assert.equal(envelope.observationEnvelope.trust.untrusted, true);
  assert.equal(envelope.observationEnvelope.trust.nonAuthoritative, true);
  assert.equal(envelope.observationEnvelope.trust.candidateEvidenceOnly, true);
  assert.equal(envelope.observationEnvelope.trust.coreInput, false);
  assert.equal(envelope.observationEnvelope.trust.acceptedStructuredGeometry, false);
  assert.equal(validateAcceptedGeometryV1(envelope.observationEnvelope).ok, false);
});

test("PR114 observation-only or provider-only replay input cannot enter Core", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);
  const result = createAdapterResult(replay, acceptedEnvelope);

  assert.throws(
    () => createProviderNeutralEnvelopeFromReplayV1(replay, {
      acceptanceBoundary: acceptedEnvelope.acceptanceBoundary,
      acceptedStructuredGeometry: undefined,
    }),
    /explicitAcceptance\.acceptedStructuredGeometry/u,
  );
  assert.equal(core.analyzeStructuredCompositionV1(replay.providerEvidence).status, "invalid");
  assert.equal(core.analyzeStructuredCompositionV1(result.providerNeutralEnvelope.observationEnvelope).status, "invalid");
  for (const suggestion of replay.providerEvidence.candidateGeometrySuggestions) {
    assert.equal(core.analyzeStructuredCompositionV1(suggestion).status, "invalid");
    assert.equal(validateAcceptedGeometryV1(suggestion).ok, false);
  }
});

test("PR114 confidence labels prompts warnings artifacts and metadata cannot create accepted geometry", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);

  for (const variant of [
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        canAuthorizeAcceptance: true,
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        canCreateGeometry: true,
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        providerSelfAcceptance: true,
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        acceptedStructuredGeometry: acceptedEnvelope.acceptedStructuredGeometry,
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        apiKey: "sk-test-redacted",
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        sourceUrl: "https://example.invalid/source.png",
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        diagnosticMetadata: {
          ...structuredClone(replay.providerEvidence.diagnosticMetadata),
          canAuthorizeAcceptance: true,
        },
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        promptText: {
          ...structuredClone(replay.providerEvidence.promptText),
          sourceTruth: true,
        },
      },
    },
    {
      warnings: {
        ...structuredClone(replay.warnings),
        diagnosticOnly: false,
      },
    },
    {
      artifacts: [
        {
          ...structuredClone(replay.artifacts[0]),
          mayAuthorizeAcceptance: true,
        },
      ],
    },
  ]) {
    assert.throws(
      () => createAdapterResult({ ...replay, ...variant }, acceptedEnvelope),
      /Invalid provider evidence replay field/u,
    );
  }
});

test("PR114 rejects cased forbidden replay data values before envelope creation", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);

  for (const variant of [
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        promptText: {
          ...structuredClone(replay.providerEvidence.promptText),
          value: "HTTPS://example.invalid/source.png",
        },
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        promptText: {
          ...structuredClone(replay.providerEvidence.promptText),
          value: "File:/tmp/a",
        },
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        promptText: {
          ...structuredClone(replay.providerEvidence.promptText),
          value: "DATA:image/png;base64,AAAA",
        },
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        promptText: {
          ...structuredClone(replay.providerEvidence.promptText),
          value: "bearer redacted",
        },
      },
    },
  ]) {
    assert.throws(
      () => createAdapterResult({ ...replay, ...variant }, acceptedEnvelope),
      /forbidden replay data value/u,
    );
  }
});

test("PR114 rejects provider evidence drift when the generated observation envelope identity is stale", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);
  const changedReplay = structuredClone(replay);
  changedReplay.providerEvidence.candidateLabels[0].label = "changed synthetic label";

  assert.throws(
    () => createAdapterResult(changedReplay, acceptedEnvelope),
    /observationEnvelopeContentIdentity/u,
  );
});

test("PR114 rejects explicit acceptance extras before proof reuse", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);

  for (const extraField of [
    { sourceUrl: "https://example.invalid/source.png" },
    { apiKey: "sk-test-redacted" },
    { unexpectedSafeField: "still not part of the acceptance contract" },
  ]) {
    assert.throws(
      () => createProviderNeutralEnvelopeFromReplayV1(replay, {
        acceptanceBoundary: {
          ...structuredClone(acceptedEnvelope.acceptanceBoundary),
          ...extraField,
        },
        acceptedStructuredGeometry: acceptedEnvelope.acceptedStructuredGeometry,
      }),
      /explicitAcceptance\.acceptanceBoundary/u,
    );
  }
});

test("PR114 clones authority-bearing explicit acceptance inputs before returning", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);
  const result = createAdapterResult(replay, acceptedEnvelope);

  acceptedEnvelope.acceptanceBoundary.kind = "MutatedBoundary";
  acceptedEnvelope.acceptedStructuredGeometry.sourceObservationId = "mutated-observation";

  assert.equal(result.providerNeutralEnvelope.acceptanceBoundary.kind, "AcceptanceBoundary");
  assert.equal(
    result.providerNeutralEnvelope.acceptedStructuredGeometry.sourceObservationId,
    "observation:synthetic:parcel-proportion:v1",
  );
});

test("PR114 rejects nested authority-looking candidate and warning payloads", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);

  for (const variant of [
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        candidateLabels: [
          {
            ...structuredClone(replay.providerEvidence.candidateLabels[0]),
            label: { coreInput: true, sourceTruth: true },
          },
        ],
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        candidateMeasurements: [
          {
            ...structuredClone(replay.providerEvidence.candidateMeasurements[0]),
            value: { coreInput: true, sourceTruth: true },
          },
        ],
      },
    },
    {
      providerEvidence: {
        ...structuredClone(replay.providerEvidence),
        promptText: {
          ...structuredClone(replay.providerEvidence.promptText),
          value: { coreInput: true, sourceTruth: true },
        },
      },
    },
    {
      warnings: {
        ...structuredClone(replay.warnings),
        coreInput: true,
      },
    },
    {
      warnings: {
        ...structuredClone(replay.warnings),
        sourceTruth: true,
      },
    },
  ]) {
    assert.throws(
      () => createAdapterResult({ ...replay, ...variant }, acceptedEnvelope),
      /Invalid provider evidence replay field/u,
    );
  }
});

test("PR114 reuses the PR111 proof boundary before returning an envelope", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);

  assert.throws(
    () => createProviderNeutralEnvelopeFromReplayV1(replay, {
      acceptanceBoundary: {
        ...structuredClone(acceptedEnvelope.acceptanceBoundary),
        kind: "BadBoundary",
      },
      acceptedStructuredGeometry: acceptedEnvelope.acceptedStructuredGeometry,
    }),
    /acceptanceBoundary\.kind/u,
  );
  assert.throws(
    () => createProviderNeutralEnvelopeFromReplayV1(replay, {
      acceptanceBoundary: {
        ...structuredClone(acceptedEnvelope.acceptanceBoundary),
        acceptanceStatus: "rejected",
      },
      acceptedStructuredGeometry: acceptedEnvelope.acceptedStructuredGeometry,
    }),
    /acceptanceBoundary\.acceptanceStatus/u,
  );
});

test("PR114 explicit accepted structured geometry passes through existing proof and Structured Analyze path", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);
  const result = createAdapterResult(replay, acceptedEnvelope);
  const proof = createSyntheticExternalEvidenceAcceptanceProofV1(result.providerNeutralEnvelope);
  const input = createStructuredAnalyzeInputFromAcceptedStructuredGeometry(
    result.providerNeutralEnvelope.acceptedStructuredGeometry,
    { envelopeId: proof.envelopeId },
  );
  const first = core.analyzeStructuredCompositionV1(structuredClone(input));
  const second = core.analyzeStructuredCompositionV1(structuredClone(input));

  assert.equal(proof.boundarySourceTruth, "acceptedStructuredGeometry");
  assert.equal(proof.coreInputAuthority, "acceptedStructuredGeometry");
  assert.equal(proof.providerEvidenceOnly, true);
  assert.equal(proof.confidenceAuthority, false);
  assert.equal(first.status, "valid");
  assert.equal(second.status, "valid");
  assert.equal(core.serializeCanonicalJson(first), core.serializeCanonicalJson(second));
  assert.equal(first.provenance.adapter, null);
  assert.equal(first.provenance.sourceKind, "user_supplied_structured_data");
});

test("PR114 removing provider metadata does not change Core result for the same accepted geometry", async () => {
  const replay = await readJson(replayFixturePath);
  const acceptedEnvelope = await readJson(acceptedEnvelopeFixturePath);
  const strippedReplay = structuredClone(replay);
  strippedReplay.providerEvidence.diagnosticMetadata = {
    providerCertainty: "synthetic-stripped",
    confidence: 0,
    score: 0,
    valueMetadata: "diagnostic-stripped",
    untrusted: true,
    nonAuthoritative: true,
    candidateEvidenceOnly: true,
    canAuthorizeAcceptance: false,
    canCreateGeometry: false,
    canModifyEvaluation: false,
  };
  strippedReplay.providerEvidence.candidateLabels = [];
  strippedReplay.providerEvidence.candidateMeasurements = [];
  strippedReplay.providerEvidence.candidateGeometrySuggestions = [];
  strippedReplay.providerEvidence.promptText = {
    value: "Synthetic prompt text stripped for metadata invariance.",
    untrusted: true,
    nonAuthoritative: true,
    candidateEvidenceOnly: true,
    sourceTruth: false,
  };
  strippedReplay.evidenceIdentity.observationEnvelopeContentIdentity =
    computeObservationEnvelopeContentIdentity(strippedReplay.providerEvidence);
  strippedReplay.warnings.lossyConversionWarnings = [];
  strippedReplay.warnings.evidenceLimitations = [];
  strippedReplay.artifacts = [];

  const originalEnvelope = createAdapterResult(replay, acceptedEnvelope).providerNeutralEnvelope;
  const strippedEnvelope = createAdapterResult(strippedReplay, acceptedEnvelope).providerNeutralEnvelope;
  const originalResult = core.analyzeStructuredCompositionV1(
    createStructuredAnalyzeInputFromAcceptedStructuredGeometry(originalEnvelope.acceptedStructuredGeometry, {
      envelopeId: originalEnvelope.envelopeId,
    }),
  );
  const strippedResult = core.analyzeStructuredCompositionV1(
    createStructuredAnalyzeInputFromAcceptedStructuredGeometry(strippedEnvelope.acceptedStructuredGeometry, {
      envelopeId: strippedEnvelope.envelopeId,
    }),
  );

  assert.equal(core.serializeCanonicalJson(originalEnvelope.acceptedStructuredGeometry), core.serializeCanonicalJson(strippedEnvelope.acceptedStructuredGeometry));
  assert.equal(core.serializeCanonicalJson(originalResult), core.serializeCanonicalJson(strippedResult));
});

test("PR114 adapter stays package-private and avoids provider network runtime and public surfaces", async () => {
  const source = await readFile(adapterSourcePath, "utf8");
  const importStatements = source
    .split("\n")
    .filter((line) => line.trim().startsWith("import "))
    .join("\n");
  const indexSource = await readFile(indexSourcePath, "utf8");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageRoot = await import("../dist/src/index.js");

  assert.doesNotMatch(
    importStatements,
    /node:fs|node:child_process|node:https?|providers|openai|sdk|image|vision|cad|figma|mcp|chatgpt|server|upload|oauth|from "\.\/index|from "@norma\/core"/iu,
  );
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|process\.env)\b/u);
  assert.equal("createProviderNeutralEnvelopeFromReplayV1" in packageRoot, false);
  assert.doesNotMatch(indexSource, /provider-evidence-replay-adapter/u);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.equal("dependencies" in packageJson, false);
  assert.equal("publishConfig" in packageJson, false);
});

test("PR114 exact changed-file guard accepts only the local provider evidence replay adapter set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(providerEvidenceReplayAdapterChangedFiles),
    providerEvidenceReplayAdapterChangedFiles,
  );
  assert.deepEqual(providerEvidenceReplayAdapterChangedFiles, [
    "src/provider-evidence-replay-adapter.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/fixtures/provider-evidence-replay/static-provider-evidence-replay-v1.json",
    "tests/provider-evidence-replay-adapter.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "src/provider-evidence-replay-adapter.ts",
    "tests/fixtures/provider-evidence-replay/static-provider-evidence-replay-v1.json",
    "tests/provider-evidence-replay-adapter.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(providerEvidenceReplayAdapterChangedFiles.filter((file) => file !== missingFile)),
      null,
      missingFile,
    );
  }

  for (const forbiddenFile of [
    "src/index.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "src/**",
    "docs/**",
    "bin/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([...providerEvidenceReplayAdapterChangedFiles, forbiddenFile]),
      null,
      forbiddenFile,
    );
  }
});

function createAdapterResult(replay, acceptedEnvelope) {
  return createProviderNeutralEnvelopeFromReplayV1(replay, {
    acceptanceBoundary: acceptedEnvelope.acceptanceBoundary,
    acceptedStructuredGeometry: acceptedEnvelope.acceptedStructuredGeometry,
  });
}

function computeObservationEnvelopeContentIdentity(providerEvidence) {
  return contentIdentityFor({
    kind: "ObservationEnvelope",
    trust: {
      untrusted: true,
      nonAuthoritative: true,
      candidateEvidenceOnly: true,
      sourceTruth: false,
      coreInput: false,
      packageApiTruth: false,
      connectorTruth: false,
      acceptedStructuredGeometry: false,
    },
    candidateLabels: structuredClone(providerEvidence.candidateLabels),
    candidateMeasurements: structuredClone(providerEvidence.candidateMeasurements),
    candidateGeometrySuggestions: structuredClone(providerEvidence.candidateGeometrySuggestions),
    diagnosticMetadata: structuredClone(providerEvidence.diagnosticMetadata),
    promptText: structuredClone(providerEvidence.promptText),
  });
}

function contentIdentityFor(value) {
  return `sha256:${createHash("sha256")
    .update(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY))
    .digest("hex")}`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function hasKey(value, keyName) {
  if (Array.isArray(value)) {
    return value.some((item) => hasKey(item, keyName));
  }

  if (value === null || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(([key, child]) => key === keyName || hasKey(child, keyName));
}
