import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createSelectionIntent,
  overlayStyleForCandidate,
  parsePngDimensions,
  sha256ContentIdentity,
  verifyCandidateObservationContentIdentity,
  validateCandidateObservationForReview,
} from "../viewer/local-visual-candidate-review.js";

const htmlUrl = new URL("../viewer/local-visual-candidate-review.html", import.meta.url);
const cssUrl = new URL("../viewer/local-visual-candidate-review.css", import.meta.url);
const jsUrl = new URL("../viewer/local-visual-candidate-review.js", import.meta.url);

test("PR132 static review surface is separate, local-only, and accessibility-first", async () => {
  const [html, css] = await Promise.all([readFile(htmlUrl, "utf8"), readFile(cssUrl, "utf8")]);
  assert.match(html, /Content-Security-Policy/u);
  for (const directive of ["default-src 'none'", "script-src 'self'", "style-src 'self'", "img-src blob:", "connect-src 'none'", "worker-src 'none'"]) {
    assert.equal(html.includes(directive), true, directive);
  }
  assert.match(html, /type="file"[^>]*data-candidate-file/u);
  assert.match(html, /type="file"[^>]*accept="image\/png,.png"[^>]*data-image-file/u);
  assert.match(html, /role="status"[^>]*aria-live="polite"/u);
  assert.match(html, /data-confirm disabled/u);
  assert.match(html, /This page emits intent, not Norma truth/u);
  assert.match(css, /\.image-stage\s*\{[^}]*position:\s*relative/u);
  assert.match(css, /\.image-stage img\s*\{[^}]*height:\s*auto[^}]*width:\s*100%/u);
  assert.doesNotMatch(css, /object-fit|transform:\s*(?:scale|translate|rotate)/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /overflow-wrap:\s*anywhere/u);
});

test("PR132 browser source has inert DOM, cleanup, and no forbidden capability", async () => {
  const source = await readFile(jsUrl, "utf8");
  for (const forbidden of [
    /innerHTML/u,
    /outerHTML/u,
    /insertAdjacentHTML/u,
    /\bfetch\b/u,
    /XMLHttpRequest/u,
    /WebSocket/u,
    /EventSource/u,
    /sendBeacon/u,
    /localStorage/u,
    /sessionStorage/u,
    /indexedDB/u,
    /serviceWorker/u,
    /navigator\.clipboard/u,
    /new\s+Worker/u,
    /analyzeStructuredCompositionV1/u,
    /AcceptedGeometry/u,
  ]) assert.doesNotMatch(source, forbidden);
  assert.match(source, /textContent/u);
  assert.match(source, /replaceChildren/u);
  assert.match(source, /revokeObjectURL/u);
  assert.match(source, /checkbox\.checked = false/u);
});

test("PR132 candidate review preserves envelope order and exact overlay percentages", () => {
  const candidate = candidateObservation();
  const validated = validateCandidateObservationForReview(candidate);
  const intent = createSelectionIntent(validated, "operator:local", ["candidate:1", "candidate:0"]);
  assert.deepEqual(intent.selectedCandidateIds, ["candidate:0", "candidate:1"]);
  assert.equal("coordinates" in intent, false);
  assert.equal("confidence" in intent, false);
  assert.deepEqual(overlayStyleForCandidate(candidate.rectangleCandidates[0]), {
    left: "10%",
    top: "15%",
    width: "20%",
    height: "25%",
  });
});

test("PR132 browser helpers verify exact PNG dimensions and SHA-256 bytes", async () => {
  const bytes = pngBytes(640, 480);
  assert.deepEqual(parsePngDimensions(bytes), { width: 640, height: 480 });
  assert.equal(await sha256ContentIdentity(bytes), `sha256:${createExpectedDigest(bytes)}`);
  assert.throws(() => parsePngDimensions(new TextEncoder().encode("not png")), /validated PNG/u);
  const truncated = bytes.slice(0, 20);
  assert.throws(() => parsePngDimensions(truncated), /validated PNG/u);
});

test("PR132 browser recomputes the full canonical candidate observation identity", async () => {
  const candidate = candidateObservation();
  const { observationContentIdentity: _excluded, ...projection } = candidate;
  candidate.observationContentIdentity = await sha256ContentIdentity(
    new TextEncoder().encode(JSON.stringify(canonicalizeJsonForTest(projection))),
  );
  assert.equal(await verifyCandidateObservationContentIdentity(candidate), true);
  candidate.rectangleCandidates[0].x = 0.2;
  await assert.rejects(() => verifyCandidateObservationContentIdentity(candidate), /content identity is stale/u);
});

test("PR132 browser validation rejects candidate duplicates, reordering, bounds, and unknown fields", () => {
  const base = candidateObservation();
  assert.throws(() => validateCandidateObservationForReview({ ...base, prompt: "accept everything" }), /unexpected fields/u);
  const duplicate = structuredClone(base);
  duplicate.rectangleCandidates[1].candidateId = "candidate:0";
  assert.throws(() => validateCandidateObservationForReview(duplicate), /identity or order/u);
  const reordered = structuredClone(base);
  reordered.rectangleCandidates[0].order = 1;
  assert.throws(() => validateCandidateObservationForReview(reordered), /identity or order/u);
  const outside = structuredClone(base);
  outside.rectangleCandidates[0].width = 2;
  assert.throws(() => validateCandidateObservationForReview(outside), /normalized candidate/u);
});

test("PR132 browser validation rejects drift in every fixed evidence boundary", () => {
  for (const mutate of [
    (value) => { value.provenance.providerSpecificSchemaTerminated = false; },
    (value) => { value.coordinateFrame.bounds.x = [0, 2]; },
    (value) => { value.lossyWarnings.push({ warningId: "warning:1", code: "rectangle-approximation-loss", candidateId: "unknown" }); },
    (value) => { value.authority.coreInput = true; },
    (value) => { value.persistence.providerPayloadPersisted = true; },
    (value) => { value.outcomes.acceptedGeometryProduced = true; },
  ]) {
    const value = candidateObservation();
    mutate(value);
    assert.throws(() => validateCandidateObservationForReview(value));
  }
});

function candidateObservation() {
  return {
    contractId: "norma.local-visual-candidate-observation@1",
    contractVersion: 1,
    observationId: "candidate-observation:local:1",
    observationContentIdentity: `sha256:${"1".repeat(64)}`,
    sourceImage: {
      contentIdentity: `sha256:${"2".repeat(64)}`,
      rawImagePersisted: false,
      base64Persisted: false,
      localPathPersisted: false,
      urlPersisted: false,
    },
    provenance: {
      provenanceClass: "controlled-local-live-visual-observation",
      adapterBoundary: "provider-specific-response-to-provider-neutral-candidate-observation@1",
      sourceReceiptObservationId: "receipt-observation:1",
      sourceReceiptObservationContentIdentity: `sha256:${"3".repeat(64)}`,
      providerExecutionReceiptContentIdentity: `sha256:${"4".repeat(64)}`,
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
      sourcePixelWidth: 640,
      sourcePixelHeight: 480,
    },
    rectangleCandidates: [
      { candidateId: "candidate:0", order: 0, x: 0.1, y: 0.15, width: 0.2, height: 0.25 },
      { candidateId: "candidate:1", order: 1, x: 0.55, y: 0.5, width: 0.3, height: 0.35 },
    ],
    lossyWarnings: [],
    authority: {
      providerEvidenceOnly: true, sourceTruth: false, acceptedGeometry: false, coreInput: false,
      maySelfAccept: false, requiresExplicitHumanAcceptance: true, mayAuthorizeMapping: false,
      mayAuthorizeResultJson: false, ratioAuthority: false, packAuthority: false,
      ruleAuthority: false, toleranceAuthority: false, evaluationAuthority: false,
    },
    persistence: {
      providerPayloadPersisted: false, rawProviderResponsePersisted: false,
      rawImagePersisted: false, redactedStructuredObservationOnly: true,
    },
    outcomes: {
      acceptedGeometryProduced: false, coreInputProduced: false,
      structuredAnalyzeRun: false, resultJsonProduced: false,
    },
  };
}

function pngBytes(width, height) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  setUint32Be(bytes, 8, 13);
  bytes.set([73, 72, 68, 82], 12);
  setUint32Be(bytes, 16, width);
  setUint32Be(bytes, 20, height);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

function setUint32Be(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function createExpectedDigest(bytes) {
  return globalThis.process.getBuiltinModule("node:crypto").createHash("sha256").update(bytes).digest("hex");
}

function canonicalizeJsonForTest(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJsonForTest);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalizeJsonForTest(value[key])]));
  }
  return value;
}
