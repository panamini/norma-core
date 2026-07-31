export const PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID =
  "norma.private-web-lab.local-cv-candidates@1";
export const PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION =
  "sobel-axis-runs-hough-v1";
export const PRIVATE_WEB_LAB_LOCAL_CV_MAX_CANDIDATES = 8;
export const PRIVATE_WEB_LAB_LOCAL_CV_MAX_SOURCE_PIXELS = 40_000_000;
export const PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_SIDE = 640;
export const PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_PIXELS = 409_600;
export const PRIVATE_WEB_LAB_LOCAL_CV_WORKER_TIMEOUT_MILLISECONDS = 1_800;

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export async function hasPrivateWebLabLocalCvAnimatedPngV1(source) {
  const bytes = new Uint8Array(await source.arrayBuffer());
  if (
    bytes.length < PNG_SIGNATURE.length
    || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)
  ) return false;

  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const dataLength = new DataView(
      bytes.buffer,
      bytes.byteOffset + offset,
      4,
    ).getUint32(0);
    const chunkEnd = offset + 12 + dataLength;
    if (chunkEnd > bytes.length) {
      throw new Error("PNG invalide pour la détection locale.");
    }
    const chunkType = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (chunkType === "acTL") return true;
    if (chunkType === "IEND") return false;
    offset = chunkEnd;
  }
  throw new Error("PNG invalide pour la détection locale.");
}

export function normalizePrivateWebLabLocalCvOrientationDegrees(directionDegrees) {
  return rounded(directionDegrees) % 180;
}

const MAX_EDGE_POINTS = 24_000;
const MAX_RECTANGLES = 3;
const MAX_SEGMENTS = 5;
const EDGE_THRESHOLD = 72;
const MAX_EDGE_DENSITY = 0.34;
const HOUGH_ANGLE_STEP_DEGREES = 3;
const HOUGH_ANGLE_COUNT = 180 / HOUGH_ANGLE_STEP_DEGREES;

export function detectPrivateWebLabLocalCvCandidatesV1(imageData, options = {}) {
  const raster = validateRaster(imageData);
  if (raster === null) return abstained("invalid-image-data");
  if (
    raster.width > PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_SIDE
    || raster.height > PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_SIDE
    || raster.width * raster.height > PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_PIXELS
  ) {
    return abstained("working-image-too-large", raster);
  }
  const maxCandidates = boundedInteger(
    options.maxCandidates,
    1,
    PRIVATE_WEB_LAB_LOCAL_CV_MAX_CANDIDATES,
    PRIVATE_WEB_LAB_LOCAL_CV_MAX_CANDIDATES,
  );
  const grayscale = grayscaleRaster(raster);
  const edges = sobelEdges(grayscale, raster.width, raster.height);
  const edgePixelCount = countEdges(edges);
  const pixelCount = raster.width * raster.height;
  const edgeDensity = edgePixelCount / pixelCount;
  const evidence = {
    edgePixelCount,
    edgeDensity: rounded(edgeDensity),
    sampledEdgePointCount: 0,
  };
  if (edgePixelCount < Math.max(12, Math.ceil(Math.sqrt(pixelCount) * 0.5))) {
    return abstained("insufficient-edge-evidence", raster, evidence);
  }
  if (edgeDensity > MAX_EDGE_DENSITY) {
    return abstained("scene-too-dense", raster, evidence);
  }

  const edgePoints = sampledEdgePoints(edges, raster.width, raster.height);
  evidence.sampledEdgePointCount = edgePoints.length;
  const axisSegments = [
    ...extractAxisSegments(edges, raster.width, raster.height, "horizontal"),
    ...extractAxisSegments(edges, raster.width, raster.height, "vertical"),
  ];
  const rectangles = rectangleProposals(
    axisSegments,
    edges,
    raster.width,
    raster.height,
  );
  const houghSegments = houghSegmentProposals(
    edgePoints,
    raster.width,
    raster.height,
  );
  const segments = deduplicateSegments(
    [...axisSegments, ...houghSegments],
    raster.width,
    raster.height,
  )
    .filter((segment) => !isRectangleBoundarySegment(
      segment,
      rectangles,
      raster.width,
      raster.height,
    ))
    .slice(0, MAX_SEGMENTS);
  const ranked = [
    ...rectangles.slice(0, MAX_RECTANGLES).map(
      (rectangle) => rectangleCandidate(rectangle, raster.width, raster.height),
    ),
    ...segments.map((segment) => segmentCandidate(segment, raster.width, raster.height)),
  ]
    .sort(compareRankedCandidates)
    .slice(0, maxCandidates)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

  if (ranked.length === 0) {
    return abstained("no-bounded-candidate", raster, evidence);
  }
  return {
    contractId: PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
    algorithmVersion: PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
    status: "detected",
    abstentionReason: null,
    workingImage: { width: raster.width, height: raster.height },
    evidence,
    candidates: ranked,
  };
}

export function requestPrivateWebLabLocalCvWorkerV1({
  worker,
  request,
  transfer,
  timeoutMilliseconds = PRIVATE_WEB_LAB_LOCAL_CV_WORKER_TIMEOUT_MILLISECONDS,
  isCurrent = () => true,
  onPosted = () => {},
}) {
  const boundedTimeout = Number.isSafeInteger(timeoutMilliseconds)
    ? Math.max(1, Math.min(2_000, timeoutMilliseconds))
    : PRIVATE_WEB_LAB_LOCAL_CV_WORKER_TIMEOUT_MILLISECONDS;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.removeEventListener("messageerror", handleMessageError);
      worker.terminate();
      callback(value);
    };
    const handleMessage = (event) => {
      if (event.data?.requestId !== request.requestId) return;
      if (!isCurrent()) {
        finish(reject, new Error("Local CV worker result is stale."));
        return;
      }
      finish(resolve, event.data);
    };
    const handleError = () => {
      finish(reject, new Error("Local CV worker failed."));
    };
    const handleMessageError = () => {
      finish(reject, new Error("Local CV worker returned an unreadable message."));
    };
    const timeout = setTimeout(() => {
      finish(reject, new Error("Local CV worker timed out."));
    }, boundedTimeout);
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.addEventListener("messageerror", handleMessageError);
    try {
      worker.postMessage(request, transfer);
      onPosted();
    } catch (error) {
      finish(reject, error instanceof Error ? error : new Error("Local CV worker failed."));
    }
  });
}

function validateRaster(value) {
  if (
    value === null
    || typeof value !== "object"
    || !Number.isSafeInteger(value.width)
    || value.width < 3
    || !Number.isSafeInteger(value.height)
    || value.height < 3
    || !(value.data instanceof Uint8ClampedArray)
    || value.data.length !== value.width * value.height * 4
  ) {
    return null;
  }
  return { width: value.width, height: value.height, data: value.data };
}

function abstained(reason, raster = null, evidence = null) {
  return {
    contractId: PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
    algorithmVersion: PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
    status: "abstained",
    abstentionReason: reason,
    workingImage: raster === null
      ? null
      : { width: raster.width, height: raster.height },
    evidence,
    candidates: [],
  };
}

function grayscaleRaster({ data, width, height }) {
  const grayscale = new Uint8Array(width * height);
  for (let pixel = 0, offset = 0; pixel < grayscale.length; pixel += 1, offset += 4) {
    const alpha = data[offset + 3] / 255;
    const luma = (
      (data[offset] * 77)
      + (data[offset + 1] * 150)
      + (data[offset + 2] * 29)
    ) / 256;
    grayscale[pixel] = Math.round((luma * alpha) + (255 * (1 - alpha)));
  }
  return grayscale;
}

function sobelEdges(grayscale, width, height) {
  const edges = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const northWest = grayscale[((y - 1) * width) + x - 1];
      const north = grayscale[((y - 1) * width) + x];
      const northEast = grayscale[((y - 1) * width) + x + 1];
      const west = grayscale[(y * width) + x - 1];
      const east = grayscale[(y * width) + x + 1];
      const southWest = grayscale[((y + 1) * width) + x - 1];
      const south = grayscale[((y + 1) * width) + x];
      const southEast = grayscale[((y + 1) * width) + x + 1];
      const gradientX = -northWest - (2 * west) - southWest
        + northEast + (2 * east) + southEast;
      const gradientY = -northWest - (2 * north) - northEast
        + southWest + (2 * south) + southEast;
      if ((Math.abs(gradientX) + Math.abs(gradientY)) / 4 >= EDGE_THRESHOLD) {
        edges[(y * width) + x] = 1;
      }
    }
  }
  return edges;
}

function countEdges(edges) {
  let count = 0;
  for (const edge of edges) count += edge;
  return count;
}

function sampledEdgePoints(edges, width, height) {
  const points = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (edges[(y * width) + x] === 1) points.push({ x, y });
    }
  }
  if (points.length <= MAX_EDGE_POINTS) return points;
  const stride = points.length / MAX_EDGE_POINTS;
  return Array.from(
    { length: MAX_EDGE_POINTS },
    (_value, index) => points[Math.floor(index * stride)],
  );
}

function extractAxisSegments(edges, width, height, axis) {
  const scanCount = axis === "horizontal" ? height : width;
  const lineLength = axis === "horizontal" ? width : height;
  const diagonal = Math.hypot(width, height);
  const minimumLength = Math.max(8, Math.round(diagonal * 0.08));
  const runs = [];
  for (let scan = 1; scan < scanCount - 1; scan += 1) {
    let start = -1;
    let lastSupport = -1;
    let supportCount = 0;
    for (let along = 1; along < lineLength - 1; along += 1) {
      const x = axis === "horizontal" ? along : scan;
      const y = axis === "horizontal" ? scan : along;
      const supported = edges[(y * width) + x] === 1;
      if (supported) {
        if (start < 0) start = along;
        lastSupport = along;
        supportCount += 1;
      }
      const atEnd = along === lineLength - 2;
      const gap = start < 0 ? 0 : along - lastSupport;
      if (start >= 0 && (gap > 2 || atEnd)) {
        const end = lastSupport;
        const length = end - start;
        const coverage = supportCount / Math.max(1, length + 1);
        if (length >= minimumLength && coverage >= 0.55) {
          const startPoint = axis === "horizontal"
            ? { x: start, y: scan }
            : { x: scan, y: start };
          const endPoint = axis === "horizontal"
            ? { x: end, y: scan }
            : { x: scan, y: end };
          runs.push({
            axis,
            start: startPoint,
            end: endPoint,
            length,
            supportCoverage: Math.min(1, coverage),
            rankScore: segmentRankScore(length, diagonal, coverage),
          });
        }
        start = -1;
        lastSupport = -1;
        supportCount = 0;
      }
    }
  }
  return deduplicateAxisRuns(runs, width, height).slice(0, 12);
}

function deduplicateAxisRuns(runs, width, height) {
  const coordinateTolerance = Math.max(3, Math.round(Math.min(width, height) * 0.025));
  const accepted = [];
  for (const run of [...runs].sort(compareSegments)) {
    if (accepted.some((candidate) => (
      candidate.axis === run.axis
      && Math.abs(axisCoordinate(candidate) - axisCoordinate(run)) <= coordinateTolerance
      && intervalOverlapRatio(candidate, run) >= 0.7
    ))) continue;
    accepted.push(run);
  }
  return accepted;
}

function rectangleProposals(axisSegments, edges, width, height) {
  const horizontal = axisSegments.filter(({ axis }) => axis === "horizontal").slice(0, 12);
  const vertical = axisSegments.filter(({ axis }) => axis === "vertical").slice(0, 12);
  const minimumWidth = Math.max(8, width * 0.08);
  const minimumHeight = Math.max(8, height * 0.08);
  const spanTolerance = Math.max(4, Math.min(width, height) * 0.04);
  const rectangles = [];
  for (let firstHorizontal = 0; firstHorizontal < horizontal.length; firstHorizontal += 1) {
    for (
      let secondHorizontal = firstHorizontal + 1;
      secondHorizontal < horizontal.length;
      secondHorizontal += 1
    ) {
      const top = Math.min(
        axisCoordinate(horizontal[firstHorizontal]),
        axisCoordinate(horizontal[secondHorizontal]),
      );
      const bottom = Math.max(
        axisCoordinate(horizontal[firstHorizontal]),
        axisCoordinate(horizontal[secondHorizontal]),
      );
      if (bottom - top < minimumHeight) continue;
      for (let firstVertical = 0; firstVertical < vertical.length; firstVertical += 1) {
        for (
          let secondVertical = firstVertical + 1;
          secondVertical < vertical.length;
          secondVertical += 1
        ) {
          const left = Math.min(
            axisCoordinate(vertical[firstVertical]),
            axisCoordinate(vertical[secondVertical]),
          );
          const right = Math.max(
            axisCoordinate(vertical[firstVertical]),
            axisCoordinate(vertical[secondVertical]),
          );
          if (right - left < minimumWidth) continue;
          const sides = [
            horizontal[firstHorizontal],
            horizontal[secondHorizontal],
            vertical[firstVertical],
            vertical[secondVertical],
          ];
          if (!sidesSpanRectangle(sides, left, top, right, bottom, spanTolerance)) continue;
          const sideCoverages = [
            edgeCoverage(edges, width, height, { x: left, y: top }, { x: right, y: top }),
            edgeCoverage(edges, width, height, { x: left, y: bottom }, { x: right, y: bottom }),
            edgeCoverage(edges, width, height, { x: left, y: top }, { x: left, y: bottom }),
            edgeCoverage(edges, width, height, { x: right, y: top }, { x: right, y: bottom }),
          ];
          const minimumCoverage = Math.min(...sideCoverages);
          const meanCoverage = sideCoverages.reduce((sum, value) => sum + value, 0) / 4;
          if (minimumCoverage < 0.42 || meanCoverage < 0.62) continue;
          const sizeFraction = ((right - left) * (bottom - top)) / (width * height);
          rectangles.push({
            left,
            top,
            right,
            bottom,
            sideCoverages: sideCoverages.map(rounded),
            meanCoverage: rounded(meanCoverage),
            rankScore: rounded(Math.min(1, (meanCoverage * 0.82) + (sizeFraction * 0.18))),
          });
        }
      }
    }
  }
  const accepted = [];
  for (const rectangle of rectangles.sort(compareRectangles)) {
    if (accepted.some((candidate) => rectangleIou(candidate, rectangle) >= 0.82)) continue;
    accepted.push(rectangle);
  }
  return accepted;
}

function houghSegmentProposals(points, width, height) {
  const diagonal = Math.ceil(Math.hypot(width, height));
  const rhoCount = (2 * diagonal) + 1;
  const accumulator = new Uint16Array(HOUGH_ANGLE_COUNT * rhoCount);
  const trig = Array.from({ length: HOUGH_ANGLE_COUNT }, (_value, index) => {
    const radians = index * HOUGH_ANGLE_STEP_DEGREES * Math.PI / 180;
    return { cosine: Math.cos(radians), sine: Math.sin(radians) };
  });
  for (const { x, y } of points) {
    for (let angle = 0; angle < HOUGH_ANGLE_COUNT; angle += 1) {
      const { cosine, sine } = trig[angle];
      const rho = Math.round((x * cosine) + (y * sine)) + diagonal;
      const index = (angle * rhoCount) + rho;
      if (accumulator[index] < 65_535) accumulator[index] += 1;
    }
  }
  const minimumVotes = Math.max(8, Math.round(diagonal * 0.055));
  const peaks = [];
  for (let angle = 0; angle < HOUGH_ANGLE_COUNT; angle += 1) {
    for (let rho = 0; rho < rhoCount; rho += 1) {
      const votes = accumulator[(angle * rhoCount) + rho];
      if (votes >= minimumVotes) peaks.push({ angle, rho: rho - diagonal, votes });
    }
  }
  const acceptedPeaks = [];
  for (const peak of peaks.sort(compareHoughPeaks)) {
    if (acceptedPeaks.some((candidate) => (
      Math.abs(candidate.angle - peak.angle) <= 1
      && Math.abs(candidate.rho - peak.rho) <= 3
    ))) continue;
    acceptedPeaks.push(peak);
    if (acceptedPeaks.length >= 32) break;
  }
  return acceptedPeaks.flatMap((peak) => {
    const refined = refineHoughSegment(peak, trig[peak.angle], points, width, height);
    return refined === null ? [] : [refined];
  });
}

function refineHoughSegment(peak, trig, points, width, height) {
  const direction = { x: -trig.sine, y: trig.cosine };
  const projections = [];
  for (const point of points) {
    const distance = Math.abs(
      (point.x * trig.cosine) + (point.y * trig.sine) - peak.rho
    );
    if (distance <= 1.6) {
      projections.push((point.x * direction.x) + (point.y * direction.y));
    }
  }
  if (projections.length < 8) return null;
  projections.sort((left, right) => left - right);
  const maximumGap = Math.max(3, Math.hypot(width, height) * 0.018);
  let best = null;
  let groupStart = 0;
  for (let index = 1; index <= projections.length; index += 1) {
    if (
      index < projections.length
      && projections[index] - projections[index - 1] <= maximumGap
    ) continue;
    const groupEnd = index - 1;
    const length = projections[groupEnd] - projections[groupStart];
    const supportCount = groupEnd - groupStart + 1;
    if (best === null || length > best.length || (
      length === best.length && supportCount > best.supportCount
    )) {
      best = {
        minimum: projections[groupStart],
        maximum: projections[groupEnd],
        length,
        supportCount,
      };
    }
    groupStart = index;
  }
  const diagonal = Math.hypot(width, height);
  if (best === null || best.length < Math.max(8, diagonal * 0.08)) return null;
  const normal = { x: trig.cosine * peak.rho, y: trig.sine * peak.rho };
  const start = clampPoint({
    x: normal.x + (direction.x * best.minimum),
    y: normal.y + (direction.y * best.minimum),
  }, width, height);
  const end = clampPoint({
    x: normal.x + (direction.x * best.maximum),
    y: normal.y + (direction.y * best.maximum),
  }, width, height);
  const ordered = orderedSegment(start, end);
  const supportCoverage = Math.min(1, best.supportCount / Math.max(1, best.length + 1));
  return {
    axis: null,
    ...ordered,
    length: Math.hypot(ordered.end.x - ordered.start.x, ordered.end.y - ordered.start.y),
    supportCoverage,
    rankScore: segmentRankScore(best.length, diagonal, supportCoverage),
  };
}

function deduplicateSegments(segments, width, height) {
  const accepted = [];
  for (const segment of [...segments].sort(compareSegments)) {
    if (accepted.some((candidate) => segmentsAreEquivalent(candidate, segment, width, height))) {
      continue;
    }
    accepted.push(segment);
  }
  return accepted;
}

function rectangleCandidate(rectangle, width, height) {
  return {
    kind: "rectangle",
    rankScore: rectangle.rankScore,
    geometry: {
      x: normalized(rectangle.left, width - 1),
      y: normalized(rectangle.top, height - 1),
      width: normalized(rectangle.right - rectangle.left, width - 1),
      height: normalized(rectangle.bottom - rectangle.top, height - 1),
    },
    evidence: {
      kind: "axis-aligned-edge-coverage",
      sideCoverages: rectangle.sideCoverages,
      meanCoverage: rectangle.meanCoverage,
    },
  };
}

function segmentCandidate(segment, width, height) {
  const directionDegrees = (
    Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x)
    * 180
    / Math.PI
    + 180
  ) % 180;
  return {
    kind: "segment",
    rankScore: segment.rankScore,
    geometry: {
      start: {
        x: normalized(segment.start.x, width - 1),
        y: normalized(segment.start.y, height - 1),
      },
      end: {
        x: normalized(segment.end.x, width - 1),
        y: normalized(segment.end.y, height - 1),
      },
    },
    evidence: {
      kind: "straight-edge-support",
      supportCoverage: rounded(segment.supportCoverage),
      orientationDegrees: normalizePrivateWebLabLocalCvOrientationDegrees(directionDegrees),
    },
  };
}

function sidesSpanRectangle(sides, left, top, right, bottom, tolerance) {
  return (
    intervalStart(sides[0]) <= left + tolerance
    && intervalEnd(sides[0]) >= right - tolerance
    && intervalStart(sides[1]) <= left + tolerance
    && intervalEnd(sides[1]) >= right - tolerance
    && intervalStart(sides[2]) <= top + tolerance
    && intervalEnd(sides[2]) >= bottom - tolerance
    && intervalStart(sides[3]) <= top + tolerance
    && intervalEnd(sides[3]) >= bottom - tolerance
  );
}

function edgeCoverage(edges, width, height, start, end) {
  const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
  let supported = 0;
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(start.x + ((end.x - start.x) * step / Math.max(1, steps)));
    const y = Math.round(start.y + ((end.y - start.y) * step / Math.max(1, steps)));
    let found = false;
    for (let offsetY = -2; offsetY <= 2 && !found; offsetY += 1) {
      for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
        const sampleX = x + offsetX;
        const sampleY = y + offsetY;
        if (
          sampleX >= 0
          && sampleY >= 0
          && sampleX < width
          && sampleY < height
          && edges[(sampleY * width) + sampleX] === 1
        ) {
          found = true;
          break;
        }
      }
    }
    if (found) supported += 1;
  }
  return supported / Math.max(1, steps + 1);
}

function segmentsAreEquivalent(first, second, width, height) {
  const diagonal = Math.hypot(width, height);
  const firstAngle = segmentAngle(first);
  const secondAngle = segmentAngle(second);
  const angleDelta = Math.min(
    Math.abs(firstAngle - secondAngle),
    Math.PI - Math.abs(firstAngle - secondAngle),
  );
  if (angleDelta > 5 * Math.PI / 180) return false;
  const firstMidpoint = segmentMidpoint(first);
  const secondMidpoint = segmentMidpoint(second);
  const normal = { x: -Math.sin(firstAngle), y: Math.cos(firstAngle) };
  const perpendicularDistance = Math.abs(
    ((secondMidpoint.x - firstMidpoint.x) * normal.x)
    + ((secondMidpoint.y - firstMidpoint.y) * normal.y)
  );
  return (
    perpendicularDistance <= Math.max(3, diagonal * 0.015)
    && projectedSegmentOverlap(first, second, firstAngle) >= 0.65
  );
}

function isRectangleBoundarySegment(segment, rectangles, width, height) {
  const angle = segmentAngle(segment);
  const horizontal = Math.min(angle, Math.PI - angle) <= 6 * Math.PI / 180;
  const vertical = Math.abs(angle - (Math.PI / 2)) <= 6 * Math.PI / 180;
  if (!horizontal && !vertical) return false;
  const tolerance = Math.max(8, Math.min(width, height) * 0.035);
  const coordinate = horizontal
    ? (segment.start.y + segment.end.y) / 2
    : (segment.start.x + segment.end.x) / 2;
  const interval = horizontal
    ? [segment.start.x, segment.end.x].sort((left, right) => left - right)
    : [segment.start.y, segment.end.y].sort((left, right) => left - right);
  return rectangles.some((rectangle) => {
    const sides = horizontal
      ? [
        { coordinate: rectangle.top, interval: [rectangle.left, rectangle.right] },
        { coordinate: rectangle.bottom, interval: [rectangle.left, rectangle.right] },
      ]
      : [
        { coordinate: rectangle.left, interval: [rectangle.top, rectangle.bottom] },
        { coordinate: rectangle.right, interval: [rectangle.top, rectangle.bottom] },
      ];
    return sides.some((side) => (
      Math.abs(coordinate - side.coordinate) <= tolerance
      && numericIntervalOverlapRatio(interval, side.interval) >= 0.65
    ));
  });
}

function projectedSegmentOverlap(first, second, angle) {
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const project = (point) => (point.x * direction.x) + (point.y * direction.y);
  const firstInterval = [project(first.start), project(first.end)].sort((a, b) => a - b);
  const secondInterval = [project(second.start), project(second.end)].sort((a, b) => a - b);
  const overlap = Math.max(
    0,
    Math.min(firstInterval[1], secondInterval[1])
      - Math.max(firstInterval[0], secondInterval[0]),
  );
  return overlap / Math.max(
    1,
    Math.min(firstInterval[1] - firstInterval[0], secondInterval[1] - secondInterval[0]),
  );
}

function numericIntervalOverlapRatio(first, second) {
  const overlap = Math.max(0, Math.min(first[1], second[1]) - Math.max(first[0], second[0]));
  return overlap / Math.max(1, Math.min(first[1] - first[0], second[1] - second[0]));
}

function rectangleIou(first, second) {
  const overlapWidth = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  );
  const intersection = overlapWidth * overlapHeight;
  const firstArea = (first.right - first.left) * (first.bottom - first.top);
  const secondArea = (second.right - second.left) * (second.bottom - second.top);
  return intersection / Math.max(1, firstArea + secondArea - intersection);
}

function compareRankedCandidates(first, second) {
  return second.rankScore - first.rankScore
    || (first.kind === second.kind ? 0 : first.kind === "rectangle" ? -1 : 1)
    || compareCodeUnits(canonicalGeometry(first), canonicalGeometry(second));
}

function compareSegments(first, second) {
  return second.rankScore - first.rankScore
    || second.length - first.length
    || compareCodeUnits(segmentKey(first), segmentKey(second));
}

function compareRectangles(first, second) {
  return second.rankScore - first.rankScore
    || compareCodeUnits(rectangleKey(first), rectangleKey(second));
}

function compareCodeUnits(first, second) {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

function compareHoughPeaks(first, second) {
  return second.votes - first.votes
    || first.angle - second.angle
    || first.rho - second.rho;
}

function segmentRankScore(length, diagonal, coverage) {
  return rounded(Math.min(1, (Math.min(1, coverage) * 0.68) + ((length / diagonal) * 0.32)));
}

function axisCoordinate(segment) {
  return segment.axis === "horizontal" ? segment.start.y : segment.start.x;
}

function intervalStart(segment) {
  return segment.axis === "horizontal"
    ? Math.min(segment.start.x, segment.end.x)
    : Math.min(segment.start.y, segment.end.y);
}

function intervalEnd(segment) {
  return segment.axis === "horizontal"
    ? Math.max(segment.start.x, segment.end.x)
    : Math.max(segment.start.y, segment.end.y);
}

function intervalOverlapRatio(first, second) {
  const overlap = Math.max(
    0,
    Math.min(intervalEnd(first), intervalEnd(second))
      - Math.max(intervalStart(first), intervalStart(second)),
  );
  return overlap / Math.max(
    1,
    Math.min(intervalEnd(first) - intervalStart(first), intervalEnd(second) - intervalStart(second)),
  );
}

function segmentAngle(segment) {
  let angle = Math.atan2(
    segment.end.y - segment.start.y,
    segment.end.x - segment.start.x,
  );
  if (angle < 0) angle += Math.PI;
  return angle;
}

function segmentMidpoint(segment) {
  return {
    x: (segment.start.x + segment.end.x) / 2,
    y: (segment.start.y + segment.end.y) / 2,
  };
}

function orderedSegment(start, end) {
  return start.x < end.x || (start.x === end.x && start.y <= end.y)
    ? { start, end }
    : { start: end, end: start };
}

function clampPoint(point, width, height) {
  return {
    x: Math.max(0, Math.min(width - 1, point.x)),
    y: Math.max(0, Math.min(height - 1, point.y)),
  };
}

function rectangleKey(rectangle) {
  return [
    rectangle.left,
    rectangle.top,
    rectangle.right,
    rectangle.bottom,
  ].map(rounded).join(":");
}

function segmentKey(segment) {
  return [
    segment.start.x,
    segment.start.y,
    segment.end.x,
    segment.end.y,
  ].map(rounded).join(":");
}

function canonicalGeometry(candidate) {
  return JSON.stringify(candidate.geometry);
}

function normalized(value, maximum) {
  return rounded(Math.max(0, Math.min(1, value / maximum)));
}

function rounded(value) {
  return Number(value.toFixed(6));
}

function boundedInteger(value, minimum, maximum, fallback) {
  return Number.isSafeInteger(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback;
}
