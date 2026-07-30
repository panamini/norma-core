import { cpus } from "node:os";
import { performance } from "node:perf_hooks";

import {
  detectPrivateWebLabLocalCvCandidatesV1,
} from "../web-lab/private-web-lab-local-cv.js";

const WARMUP_RUNS = 5;
const MEASURED_RUNS = 30;
const SIZES = [256, 512, 640];

const results = SIZES.map((size) => {
  const raster = benchmarkRaster(size);
  for (let index = 0; index < WARMUP_RUNS; index += 1) {
    detectPrivateWebLabLocalCvCandidatesV1(raster);
  }
  const durations = [];
  for (let index = 0; index < MEASURED_RUNS; index += 1) {
    const startedAt = performance.now();
    detectPrivateWebLabLocalCvCandidatesV1(raster);
    durations.push(performance.now() - startedAt);
  }
  durations.sort((left, right) => left - right);
  return {
    size: `${String(size)}x${String(size)}`,
    pixels: size * size,
    p50Milliseconds: rounded(percentile(durations, 0.5)),
    p95Milliseconds: rounded(percentile(durations, 0.95)),
    maxMilliseconds: rounded(durations.at(-1)),
  };
});

process.stdout.write(`${JSON.stringify({
  contractId: "norma.private-web-lab.local-cv-benchmark@1",
  fixture: "synthetic-frame-plus-oblique-segment",
  precisionClaim: false,
  warmupRuns: WARMUP_RUNS,
  measuredRuns: MEASURED_RUNS,
  machine: {
    platform: process.platform,
    architecture: process.arch,
    cpu: cpus()[0]?.model ?? "unknown",
  },
  runtime: { kind: "node", version: process.version },
  results,
})}\n`);

function benchmarkRaster(size) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = 255;
  }
  const raster = { width: size, height: size, data };
  const inset = Math.max(12, Math.round(size * 0.12));
  const far = size - inset;
  drawLine(raster, inset, inset, far, inset, 2);
  drawLine(raster, far, inset, far, far, 2);
  drawLine(raster, far, far, inset, far, 2);
  drawLine(raster, inset, far, inset, inset, 2);
  drawLine(raster, inset * 2, far - inset, far - inset, inset * 2, 2);
  return raster;
}

function drawLine(raster, x0, y0, x1, y1, thickness) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(x0 + ((x1 - x0) * step / Math.max(1, steps)));
    const y = Math.round(y0 + ((y1 - y0) * step / Math.max(1, steps)));
    for (let offsetY = -thickness; offsetY <= thickness; offsetY += 1) {
      for (let offsetX = -thickness; offsetX <= thickness; offsetX += 1) {
        const sampleX = x + offsetX;
        const sampleY = y + offsetY;
        if (
          sampleX < 0
          || sampleY < 0
          || sampleX >= raster.width
          || sampleY >= raster.height
        ) continue;
        const offset = ((sampleY * raster.width) + sampleX) * 4;
        raster.data[offset] = 0;
        raster.data[offset + 1] = 0;
        raster.data[offset + 2] = 0;
      }
    }
  }
}

function percentile(values, fraction) {
  return values[Math.max(0, Math.ceil(values.length * fraction) - 1)];
}

function rounded(value) {
  return Number(value.toFixed(2));
}
