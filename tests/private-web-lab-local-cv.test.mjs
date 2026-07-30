import assert from "node:assert/strict";
import test from "node:test";

import {
  PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
  PRIVATE_WEB_LAB_LOCAL_CV_MAX_CANDIDATES,
  PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_PIXELS,
  PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_SIDE,
  detectPrivateWebLabLocalCvCandidatesV1,
  requestPrivateWebLabLocalCvWorkerV1,
} from "../web-lab/private-web-lab-local-cv.js";

test("local CV deterministically ranks bounded rectangle and straight-segment proposals", () => {
  const fixture = createSyntheticRaster(128, 96);
  drawRectangle(fixture, 18, 14, 76, 58, 2);
  drawSegment(fixture, 98, 12, 121, 43, 2);

  const serializedRuns = Array.from(
    { length: 20 },
    () => JSON.stringify(detectPrivateWebLabLocalCvCandidatesV1(fixture)),
  );
  const first = JSON.parse(serializedRuns[0]);

  assert.equal(new Set(serializedRuns).size, 1);
  assert.equal(first.contractId, PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID);
  assert.equal(first.status, "detected");
  assert.ok(first.candidates.length > 0);
  assert.ok(first.candidates.length <= PRIVATE_WEB_LAB_LOCAL_CV_MAX_CANDIDATES);
  assert.deepEqual(
    first.candidates.map(({ rank }) => rank),
    first.candidates.map((_candidate, index) => index + 1),
  );
  assert.equal(first.candidates.every(({ rankScore }) => (
    Number.isFinite(rankScore) && rankScore >= 0 && rankScore <= 1
  )), true);
  assert.equal(first.candidates.some(({ confidence }) => confidence !== undefined), false);

  const rectangle = first.candidates.find(({ kind }) => kind === "rectangle");
  assert.notEqual(rectangle, undefined);
  assertClose(rectangle.geometry.x, 18 / 127, 0.05);
  assertClose(rectangle.geometry.y, 14 / 95, 0.05);
  assertClose(rectangle.geometry.width, 76 / 127, 0.07);
  assertClose(rectangle.geometry.height, 58 / 95, 0.07);

  const diagonal = first.candidates.find(({ kind, geometry }) => (
    kind === "segment"
    && Math.abs(geometry.end.x - geometry.start.x) > 0.1
    && Math.abs(geometry.end.y - geometry.start.y) > 0.1
  ));
  assert.notEqual(diagonal, undefined);
});

test("local CV abstains fail-closed when edge evidence is absent", () => {
  const result = detectPrivateWebLabLocalCvCandidatesV1(createSyntheticRaster(80, 60));

  assert.deepEqual(result.candidates, []);
  assert.equal(result.status, "abstained");
  assert.equal(result.abstentionReason, "insufficient-edge-evidence");
});

test("local CV abstains fail-closed on an over-dense synthetic raster", () => {
  const fixture = createSyntheticRaster(96, 96);
  let seed = 0x1234_5678;
  for (let y = 0; y < fixture.height; y += 1) {
    for (let x = 0; x < fixture.width; x += 1) {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      setPixel(fixture, x, y, (seed >>> 31) === 0 ? 0 : 255);
    }
  }

  const result = detectPrivateWebLabLocalCvCandidatesV1(fixture);

  assert.deepEqual(result.candidates, []);
  assert.equal(result.status, "abstained");
  assert.equal(result.abstentionReason, "scene-too-dense");
});

test("local CV rejects malformed or oversized working rasters without partial candidates", () => {
  const malformed = detectPrivateWebLabLocalCvCandidatesV1({
    width: 24,
    height: 24,
    data: new Uint8ClampedArray(3),
  });
  assert.deepEqual(malformed.candidates, []);
  assert.equal(malformed.status, "abstained");
  assert.equal(malformed.abstentionReason, "invalid-image-data");

  const oversized = detectPrivateWebLabLocalCvCandidatesV1(
    createSyntheticRaster(1_025, 1_025),
  );
  assert.deepEqual(oversized.candidates, []);
  assert.equal(oversized.status, "abstained");
  assert.equal(oversized.abstentionReason, "working-image-too-large");
});

test("local CV uses one exact 640 by 640 working-raster boundary", () => {
  assert.equal(PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_SIDE, 640);
  assert.equal(PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_PIXELS, 409_600);

  const atLimit = createSyntheticRaster(640, 640);
  drawRectangle(atLimit, 80, 72, 460, 472, 3);
  assert.equal(
    detectPrivateWebLabLocalCvCandidatesV1(atLimit).abstentionReason,
    null,
  );

  for (const raster of [
    createSyntheticRaster(641, 3),
    createSyntheticRaster(641, 640),
  ]) {
    const result = detectPrivateWebLabLocalCvCandidatesV1(raster);
    assert.equal(result.status, "abstained");
    assert.equal(result.abstentionReason, "working-image-too-large");
    assert.deepEqual(result.candidates, []);
  }
});

test("local CV positive synthetic corpus covers nested, thick, axial, oblique, and inverted geometry", () => {
  const cases = [
    ["nested-frames", () => {
      const raster = createSyntheticRaster(192, 160);
      drawRectangle(raster, 12, 12, 166, 134, 2);
      drawRectangle(raster, 48, 42, 86, 72, 2);
      return raster;
    }, (result) => result.candidates.filter(({ kind }) => kind === "rectangle").length >= 2],
    ["thick-frame", () => {
      const raster = createSyntheticRaster(160, 128);
      drawRectangle(raster, 18, 16, 118, 92, 5);
      return raster;
    }, (result) => result.candidates.some(({ kind }) => kind === "rectangle")],
    ["horizontal-segment", () => {
      const raster = createSyntheticRaster(160, 120);
      drawSegment(raster, 24, 62, 136, 62, 2);
      return raster;
    }, (result) => hasSegmentOrientation(result, "horizontal")],
    ["vertical-segment", () => {
      const raster = createSyntheticRaster(160, 120);
      drawSegment(raster, 80, 16, 80, 104, 2);
      return raster;
    }, (result) => hasSegmentOrientation(result, "vertical")],
    ["oblique-segment", () => {
      const raster = createSyntheticRaster(160, 120);
      drawSegment(raster, 20, 18, 138, 101, 2);
      return raster;
    }, (result) => hasSegmentOrientation(result, "oblique")],
    ["frame-and-segment", () => {
      const raster = createSyntheticRaster(192, 144);
      drawRectangle(raster, 14, 12, 112, 102, 2);
      drawSegment(raster, 140, 20, 178, 124, 2);
      return raster;
    }, (result) => (
      result.candidates.some(({ kind }) => kind === "rectangle")
      && result.candidates.some(({ kind }) => kind === "segment")
    )],
    ["inverted-contrast", () => {
      const raster = createSyntheticRaster(160, 128, 0);
      drawRectangle(raster, 18, 16, 118, 92, 3, 255);
      return raster;
    }, (result) => result.candidates.some(({ kind }) => kind === "rectangle")],
  ];

  for (const [name, createFixture, expectation] of cases) {
    const result = detectPrivateWebLabLocalCvCandidatesV1(createFixture());
    assert.equal(result.status, "detected", name);
    assert.equal(expectation(result), true, name);
  }
});

test("local CV negative synthetic corpus abstains or withholds unsupported geometry", () => {
  const uniform = createSyntheticRaster(128, 96);
  const alphaOnly = createSyntheticRaster(128, 96, 0, 0);
  drawRectangle(alphaOnly, 12, 12, 92, 68, 2, 255, 0);
  const tiny = createSyntheticRaster(7, 7);
  setPixel(tiny, 3, 3, 0);
  const noise = createSyntheticRaster(128, 96);
  deterministicNoise(noise);
  const ambiguous = createSyntheticRaster(128, 96);
  checkerboard(ambiguous, 2);
  for (const [name, fixture] of [
    ["uniform", uniform],
    ["alpha", alphaOnly],
    ["tiny", tiny],
    ["noise", noise],
    ["ambiguous", ambiguous],
  ]) {
    const result = detectPrivateWebLabLocalCvCandidatesV1(fixture);
    assert.equal(result.status, "abstained", name);
    assert.deepEqual(result.candidates, [], name);
  }

  const incomplete = createSyntheticRaster(160, 128);
  drawSegment(incomplete, 18, 16, 136, 16, 2);
  drawSegment(incomplete, 18, 16, 18, 108, 2);
  drawSegment(incomplete, 18, 108, 92, 108, 2);
  assert.equal(
    detectPrivateWebLabLocalCvCandidatesV1(incomplete)
      .candidates.some(({ kind }) => kind === "rectangle"),
    false,
  );

  const curve = createSyntheticRaster(160, 160);
  drawCircle(curve, 80, 80, 52, 2);
  assert.equal(
    detectPrivateWebLabLocalCvCandidatesV1(curve)
      .candidates.some(({ kind }) => kind === "rectangle"),
    false,
  );
});

test("worker request fails closed on silence, error, messageerror, and late responses", async () => {
  for (const mode of ["silent", "error", "messageerror", "late"]) {
    const worker = new FakeWorker(mode);
    await assert.rejects(
      requestPrivateWebLabLocalCvWorkerV1({
        worker,
        request: { requestId: `local-cv:test-${mode}` },
        transfer: [],
        timeoutMilliseconds: 15,
      }),
      mode === "silent" || mode === "late"
        ? /timed out/u
        : /worker/u,
      mode,
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(worker.terminated, true, mode);
    assert.equal(worker.listenerCount(), 0, mode);
    assert.equal(worker.acceptedLateResponse, false, mode);
  }
});

test("worker request rejects image and run stale responses before accepting candidates", async () => {
  for (const staleBoundary of ["image", "run"]) {
    let current = true;
    const worker = new FakeWorker("success", () => {
      current = false;
    });
    await assert.rejects(
      requestPrivateWebLabLocalCvWorkerV1({
        worker,
        request: { requestId: `local-cv:stale-${staleBoundary}` },
        transfer: [],
        timeoutMilliseconds: 50,
        isCurrent: () => current,
      }),
      /stale/u,
      staleBoundary,
    );
    assert.equal(worker.terminated, true);
    assert.equal(worker.listenerCount(), 0);
  }
});

function createSyntheticRaster(width, height, fill = 255, alpha = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = fill;
    data[index + 1] = fill;
    data[index + 2] = fill;
    data[index + 3] = alpha;
  }
  return { width, height, data };
}

function drawRectangle(raster, x, y, width, height, thickness, value = 0, alpha = 255) {
  drawSegment(raster, x, y, x + width, y, thickness, value, alpha);
  drawSegment(raster, x + width, y, x + width, y + height, thickness, value, alpha);
  drawSegment(raster, x + width, y + height, x, y + height, thickness, value, alpha);
  drawSegment(raster, x, y + height, x, y, thickness, value, alpha);
}

function drawSegment(raster, x0, y0, x1, y1, thickness, value = 0, alpha = 255) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(x0 + ((x1 - x0) * step / Math.max(1, steps)));
    const y = Math.round(y0 + ((y1 - y0) * step / Math.max(1, steps)));
    for (let offsetY = -thickness; offsetY <= thickness; offsetY += 1) {
      for (let offsetX = -thickness; offsetX <= thickness; offsetX += 1) {
        setPixel(raster, x + offsetX, y + offsetY, value, alpha);
      }
    }
  }
}

function setPixel(raster, x, y, value, alpha = 255) {
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return;
  const offset = ((y * raster.width) + x) * 4;
  raster.data[offset] = value;
  raster.data[offset + 1] = value;
  raster.data[offset + 2] = value;
  raster.data[offset + 3] = alpha;
}

function assertClose(actual, expected, tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${String(actual)} differs from ${String(expected)} by more than ${String(tolerance)}`,
  );
}

function hasSegmentOrientation(result, expected) {
  return result.candidates.some(({ kind, geometry }) => {
    if (kind !== "segment") return false;
    const deltaX = Math.abs(geometry.end.x - geometry.start.x);
    const deltaY = Math.abs(geometry.end.y - geometry.start.y);
    if (expected === "horizontal") return deltaX > 0.35 && deltaY < 0.08;
    if (expected === "vertical") return deltaY > 0.35 && deltaX < 0.08;
    return deltaX > 0.2 && deltaY > 0.2;
  });
}

function deterministicNoise(raster) {
  let seed = 0x9e37_79b9;
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      setPixel(raster, x, y, (seed >>> 31) === 0 ? 0 : 255);
    }
  }
}

function checkerboard(raster, cellSize) {
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      setPixel(raster, x, y, (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2
        ? 0
        : 255);
    }
  }
}

function drawCircle(raster, centerX, centerY, radius, thickness) {
  for (let degrees = 0; degrees < 360; degrees += 1) {
    const radians = degrees * Math.PI / 180;
    const x = Math.round(centerX + (Math.cos(radians) * radius));
    const y = Math.round(centerY + (Math.sin(radians) * radius));
    for (let offsetY = -thickness; offsetY <= thickness; offsetY += 1) {
      for (let offsetX = -thickness; offsetX <= thickness; offsetX += 1) {
        setPixel(raster, x + offsetX, y + offsetY, 0);
      }
    }
  }
}

class FakeWorker {
  constructor(mode, beforeDispatch = () => {}) {
    this.mode = mode;
    this.beforeDispatch = beforeDispatch;
    this.listeners = new Map();
    this.terminated = false;
    this.acceptedLateResponse = false;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  postMessage(request) {
    if (this.mode === "silent") return;
    if (this.mode === "error" || this.mode === "messageerror") {
      queueMicrotask(() => this.dispatch(this.mode, {}));
      return;
    }
    const delay = this.mode === "late" ? 30 : 0;
    setTimeout(() => {
      this.beforeDispatch();
      const accepted = this.dispatch("message", {
        data: { requestId: request.requestId, status: "detected", candidates: [] },
      });
      if (this.mode === "late") this.acceptedLateResponse = accepted;
    }, delay);
  }

  terminate() {
    this.terminated = true;
  }

  listenerCount() {
    return [...this.listeners.values()]
      .reduce((count, listeners) => count + listeners.size, 0);
  }

  dispatch(type, event) {
    const listeners = [...(this.listeners.get(type) ?? [])];
    for (const listener of listeners) listener(event);
    return listeners.length > 0;
  }
}
