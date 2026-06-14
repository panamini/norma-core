import {
  CORE_VERSION,
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  STABLE_SERIALIZATION_VERSION,
  canonicalizeOutputRefs,
  createMvpDemoInput,
  replayRun,
  runMvpDemo,
  serializeCanonicalJson,
  verifyArtifactFreshness,
  verifyRun,
  type ArtifactFreshnessVerification,
  type ReplayRunResult,
  type RunVerification,
} from "@norma/core";

type ConsumerSummary = {
  readonly coreVersion: typeof CORE_VERSION;
  readonly serializationVersion: typeof STABLE_SERIALIZATION_VERSION;
  readonly serializationPolicy: typeof DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY;
  readonly verificationStatus: RunVerification["status"];
  readonly verificationWarnings: RunVerification["warnings"];
  readonly verificationErrors: RunVerification["errors"];
  readonly verificationProvenance: RunVerification["provenance"];
  readonly replayStatus: ReplayRunResult["status"];
  readonly replayMismatches: ReplayRunResult["mismatches"];
  readonly replayWarnings: ReplayRunResult["warnings"];
  readonly replayErrors: ReplayRunResult["errors"];
  readonly artifactFreshnessStatus: ArtifactFreshnessVerification["status"];
  readonly artifactFreshnessWarnings: ArtifactFreshnessVerification["warnings"];
  readonly artifactFreshnessErrors: ArtifactFreshnessVerification["errors"];
  readonly artifactFreshnessProvenance: ArtifactFreshnessVerification["provenance"];
  readonly canonicalVerification: string;
};

const input = createMvpDemoInput();
const demoResult = runMvpDemo(input);

if (demoResult.status !== "ok" || demoResult.output === null) {
  throw new Error(`Unexpected MVP demo status: ${demoResult.status}`);
}

const demo = demoResult.output;
const construction = demo.constructionResult.output;
const structuredArtifact = demo.artifactResults.structuredResults[0]?.output;

if (construction === null || structuredArtifact === null || structuredArtifact === undefined) {
  throw new Error("Expected MVP demo construction and structured artifact outputs.");
}

const verification: RunVerification = verifyRun({
  run: demo.runEnvelope,
  mode: "audit_only",
  packLock: demo.packLock,
  operationContext: demo.operationContext,
  expectedOutputRefs: canonicalizeOutputRefs(demo.runEnvelope.outputRefs),
  expectedOperationName: demo.runEnvelope.operationName,
  expectedOperationVersion: demo.runEnvelope.operationVersion,
});

const artifactFreshness: ArtifactFreshnessVerification = verifyArtifactFreshness({
  artifact: structuredArtifact,
  sourceObjects: [
    {
      sourceRef: { kind: "core-result", ref: "mvp-demo:construction" },
      result: demo.constructionResult,
    },
    construction,
  ],
  expectedSourceRefs: structuredArtifact.sourceRefs,
  expectedOutputRefs: structuredArtifact.outputRefs,
  expectedRunRef: structuredArtifact.runRef,
  expectedOptions: structuredArtifact.options,
  expectedOperationContextRef: demo.operationContext.ref,
});

const replay: ReplayRunResult = replayRun({
  run: demo.runEnvelope,
  mvpDemoInput: input,
  recordedMvpResult: demo,
  packLock: demo.packLock,
  operationContext: demo.operationContext,
});

export const consumerSummary: ConsumerSummary = {
  coreVersion: CORE_VERSION,
  serializationVersion: STABLE_SERIALIZATION_VERSION,
  serializationPolicy: DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  verificationStatus: verification.status,
  verificationWarnings: verification.warnings,
  verificationErrors: verification.errors,
  verificationProvenance: verification.provenance,
  replayStatus: replay.status,
  replayMismatches: replay.mismatches,
  replayWarnings: replay.warnings,
  replayErrors: replay.errors,
  artifactFreshnessStatus: artifactFreshness.status,
  artifactFreshnessWarnings: artifactFreshness.warnings,
  artifactFreshnessErrors: artifactFreshness.errors,
  artifactFreshnessProvenance: artifactFreshness.provenance,
  canonicalVerification: serializeCanonicalJson(verification, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY),
};
