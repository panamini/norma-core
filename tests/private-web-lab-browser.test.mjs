import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import {
  confirmPersonalVisualHarmonyCandidateSetV1,
} from "../dist/src/personal-visual-harmony.js";
import { PrivateWebLabApplicationV1 } from "../dist/src/private-web-lab.js";
import {
  boundedPrivateWebLabCoordinateV1,
  canRunPrivateWebLabCoreV1,
  createPrivateWebLabConfirmationPayloadV1,
  isPrivateWebLabCandidateGeometryValidV1,
  isValidPrivateWebLabMeasurementPairV1,
  presentPrivateWebLabMeasurementReportV1,
  updatePrivateWebLabCandidateGeometryV1,
  visiblePrivateWebLabCandidateIdsV1,
} from "../web-lab/private-web-lab-browser-model.js";
import { createPrivateWebLabHttpServerV1 } from "../web-lab/private-web-lab-http-server.mjs";

const RUN_RENDERED_BROWSER_TEST =
  process.env.NORMA_RUN_PRIVATE_WEB_LAB_BROWSER_TEST === "1";

test("launcher starts once and reuses the same verified loopback Web Lab", {
  timeout: 10_000,
}, async () => {
  const reservation = createPrivateWebLabHttpServerV1();
  const port = await listen(reservation);
  await close(reservation);
  const launcherPath = new URL(
    "../web-lab/start-private-web-lab.mjs",
    import.meta.url,
  ).pathname;
  const options = {
    cwd: new URL("..", import.meta.url).pathname,
    env: {
      ...process.env,
      NORMA_PRIVATE_WEB_LAB_PORT: String(port),
    },
    stdio: ["ignore", "ignore", "pipe"],
  };
  const first = spawn(process.execPath, [launcherPath, "--enable-private-web-lab"], options);
  const firstExit = once(first, "exit");
  try {
    const started = await waitForJsonLineEvent(first, "private_web_lab_started");
    assert.equal(started.url, `http://127.0.0.1:${String(port)}`);
    assert.equal(started.providerCalls, 0);

    const second = spawn(process.execPath, [launcherPath, "--enable-private-web-lab"], options);
    const secondExit = once(second, "exit");
    const reused = await waitForJsonLineEvent(second, "private_web_lab_already_running");
    const [secondCode] = await secondExit;
    assert.equal(secondCode, 0);
    assert.deepEqual(reused, {
      event: "private_web_lab_already_running",
      url: started.url,
      exposure: "private_loopback_only",
      providerCalls: 0,
    });
  } finally {
    if (first.exitCode === null) first.kill("SIGTERM");
    await Promise.race([firstExit, delay(2_000)]);
    if (first.exitCode === null) first.kill("SIGKILL");
  }
});

test("launcher refuses an unrelated service on the configured port", {
  timeout: 10_000,
}, async () => {
  const unrelated = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", contractId: "unrelated-service@1" }));
  });
  const port = await listen(unrelated);
  try {
    const launcher = spawn(
      process.execPath,
      [
        new URL("../web-lab/start-private-web-lab.mjs", import.meta.url).pathname,
        "--enable-private-web-lab",
      ],
      {
        cwd: new URL("..", import.meta.url).pathname,
        env: {
          ...process.env,
          NORMA_PRIVATE_WEB_LAB_PORT: String(port),
        },
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    const exit = once(launcher, "exit");
    const occupied = await waitForJsonLineEvent(
      launcher,
      "private_web_lab_port_in_use",
    );
    const [code] = await exit;
    assert.equal(code, 69);
    assert.equal(occupied.url, `http://127.0.0.1:${String(port)}`);
    assert.equal(occupied.providerCalls, 0);
  } finally {
    await close(unrelated);
  }
});

test("measurement result presentation explains no-match and matched outcomes", () => {
  const baseReport = {
    measurements: [
      { candidateLabel: "Segment manuel 2", lengthPixels: 389.607015581689 },
      { candidateLabel: "Segment manuel 1", lengthPixels: 433.491692491967 },
    ],
    observedDominantShare: 0.526658210297,
    matchTolerance: 0.025,
    match: null,
  };
  assert.deepEqual(presentPrivateWebLabMeasurementReportV1(baseReport), {
    ratioText: "1,113 : 1",
    firstMeasurementText: "Segment manuel 2 · 389,6 px",
    secondMeasurementText: "Segment manuel 1 · 433,5 px",
    toleranceText: "±2,5 pt",
    verdictKind: "no-match",
    verdictText: "Aucune correspondance dans les packs actifs à ±2,5 pt.",
  });
  assert.deepEqual(presentPrivateWebLabMeasurementReportV1({
    ...baseReport,
    observedDominantShare: 2 / 3,
    match: {
      quality: "strong",
      absoluteDelta: 0.00175,
      ratio: { displayLabel: "2/3" },
    },
  }), {
    ratioText: "2,000 : 1",
    firstMeasurementText: "Segment manuel 2 · 389,6 px",
    secondMeasurementText: "Segment manuel 1 · 433,5 px",
    toleranceText: "±2,5 pt",
    verdictKind: "match",
    verdictText:
      "Correspondance forte avec la proportion normalisée 2/3 · écart 0,18 pt.",
  });
  const canonicalReport = {
    ...baseReport,
    measurements: [
      {
        candidateLabel: "Segment manuel 2",
        lengthPixels: 389.607015581689,
        reference: { candidateId: "manual-segment-1" },
      },
      {
        candidateLabel: "Segment manuel 3",
        lengthPixels: 433.491692491967,
        reference: { candidateId: "manual-segment-2" },
      },
    ],
  };
  assert.deepEqual(
    presentPrivateWebLabMeasurementReportV1(canonicalReport, [
      "manual-segment-2",
      "manual-segment-1",
    ]),
    {
      ratioText: "1,113 : 1",
      firstMeasurementText: "Segment manuel 3 · 433,5 px",
      secondMeasurementText: "Segment manuel 2 · 389,6 px",
      toleranceText: "±2,5 pt",
      verdictKind: "no-match",
      verdictText: "Aucune correspondance dans les packs actifs à ±2,5 pt.",
    },
  );
  assert.deepEqual(presentPrivateWebLabMeasurementReportV1({
    ...baseReport,
    measurements: [
      { candidateLabel: "Segment infime 1", lengthPixels: 0.049 },
      { candidateLabel: "Segment infime 2", lengthPixels: 0.000000123 },
    ],
  }), {
    ratioText: "1,113 : 1",
    firstMeasurementText: "Segment infime 1 · 0,049 px",
    secondMeasurementText: "Segment infime 2 · 1,23e-7 px",
    toleranceText: "±2,5 pt",
    verdictKind: "no-match",
    verdictText: "Aucune correspondance dans les packs actifs à ±2,5 pt.",
  });
  assert.equal(
    presentPrivateWebLabMeasurementReportV1({
      ...baseReport,
      observedDominantShare: 2 / 3,
      match: {
        quality: "exact",
        absoluteDelta: 0.001,
        ratio: { displayLabel: "2/3" },
      },
    })?.verdictText,
    "Correspondance très forte avec la proportion normalisée 2/3 · écart 0,10 pt.",
  );
  assert.equal(
    presentPrivateWebLabMeasurementReportV1({
      ...baseReport,
      observedDominantShare: 2 / 3,
      match: {
        quality: "exact",
        absoluteDelta: 0,
        ratio: { displayLabel: "2/3" },
      },
    })?.verdictText,
    "Correspondance exacte avec la proportion normalisée 2/3 · écart 0,00 pt.",
  );
  assert.equal(
    presentPrivateWebLabMeasurementReportV1(canonicalReport, [
      "manual-segment-2",
      "unknown-segment",
    ]),
    null,
  );
  assert.equal(presentPrivateWebLabMeasurementReportV1({
    ...baseReport,
    observedDominantShare: Number.NaN,
  }), null);
});

test("browser flow keeps Core stopped before explicit confirmation and exposes strongest guides first", () => {
  const candidates = Array.from({ length: 6 }, (_, index) => ({
    id: `candidate-${index}`,
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
    primitive: { kind: index === 0 ? "rectangle" : "segment",
      ...(index === 0 ? {} : { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }) },
  }));
  const selectedCandidateIds = new Set(candidates.map(({ id }) => id));

  assert.deepEqual(
    visiblePrivateWebLabCandidateIdsV1(candidates, 4, false),
    ["candidate-0", "candidate-1", "candidate-2", "candidate-3"],
  );
  assert.deepEqual(
    visiblePrivateWebLabCandidateIdsV1(candidates, 4, true),
    candidates.map(({ id }) => id),
  );
  assert.equal(canRunPrivateWebLabCoreV1(false, selectedCandidateIds, candidates), false);
  assert.equal(canRunPrivateWebLabCoreV1(true, new Set(), candidates), false);
  assert.equal(canRunPrivateWebLabCoreV1(true, selectedCandidateIds, candidates), true);
  assert.equal(
    canRunPrivateWebLabCoreV1(
      true,
      new Set(candidates.slice(1).map(({ id }) => id)),
      candidates,
    ),
    false,
  );
});

test("browser flow validates complete primitive geometry and emits confirmation only after the explicit gate", () => {
  assert.equal(boundedPrivateWebLabCoordinateV1("0.55555555", 0.4), 0.555556);
  assert.equal(boundedPrivateWebLabCoordinateV1("1.2", 0.4), 0.4);

  const rectangle = {
    id: "fixture-frame",
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
    primitive: { kind: "rectangle" },
  };
  assert.deepEqual(
    updatePrivateWebLabCandidateGeometryV1(rectangle, "x", "0.2"),
    rectangle,
  );
  const resizedRectangle = updatePrivateWebLabCandidateGeometryV1(
    rectangle,
    "width",
    "0.8",
  );
  assert.equal(resizedRectangle.width, 0.8);
  assert.equal(isPrivateWebLabCandidateGeometryValidV1(resizedRectangle), true);

  const segment = {
    id: "fixture-segment",
    x: 0.1,
    y: 0.2,
    width: 0.7,
    height: 0.6,
    primitive: {
      kind: "segment",
      start: { x: 0.1, y: 0.2 },
      end: { x: 0.8, y: 0.8 },
    },
  };
  const editedSegment = updatePrivateWebLabCandidateGeometryV1(
    segment,
    "primitive.start.x",
    "0.2",
  );
  assert.equal(editedSegment.primitive.start.x, 0.2);
  assert.equal(editedSegment.x, 0.2);

  const ellipse = {
    id: "fixture-ellipse",
    x: 0.6,
    y: 0.15,
    width: 0.24,
    height: 0.36,
    primitive: {
      kind: "ellipse",
      center: { x: 0.72, y: 0.33 },
      radiusX: 0.12,
      radiusY: 0.18,
    },
  };
  const clippedEllipse = updatePrivateWebLabCandidateGeometryV1(
    ellipse,
    "primitive.radiusX",
    "0.8",
  );
  assert.equal(clippedEllipse.primitive.radiusX, 0.8);
  assert.equal(clippedEllipse.x, 0);
  assert.equal(clippedEllipse.width, 1);
  assert.equal(isPrivateWebLabCandidateGeometryValidV1(clippedEllipse), true);
  assert.equal(
    isPrivateWebLabCandidateGeometryValidV1({
      ...ellipse,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      primitive: {
        kind: "ellipse",
        center: { x: 0.5, y: 0.5 },
        radiusX: 1,
        radiusY: 1,
      },
    }),
    false,
  );
  assert.equal(
    updatePrivateWebLabCandidateGeometryV1(
      ellipse,
      "primitive.center.x",
      "0.7",
    ).primitive.center.x,
    0.7,
  );

  const draft = {
    labSessionId: "web-lab-session:11111111-1111-4111-8111-111111111111",
    sourceImageContentIdentity: `sha256:${"a".repeat(64)}`,
    candidateSetIdentity: `sha256:${"b".repeat(64)}`,
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    goal: { id: "general-geometry" },
  };
  const options = {
    explicitConfirmation: false,
    browserSessionId: "browser:test-session",
    draft,
    selectedCandidateIds: new Set(["fixture-frame"]),
    reviewedCandidates: [rectangle],
    measurementCandidateIds: null,
  };
  assert.throws(
    () => createPrivateWebLabConfirmationPayloadV1(options),
    /explicit browser confirmation/u,
  );
  assert.deepEqual(
    createPrivateWebLabConfirmationPayloadV1({
      ...options,
      explicitConfirmation: true,
    }),
    {
      explicitConfirmation: true,
      browserSessionId: options.browserSessionId,
      labSessionId: draft.labSessionId,
      sourceImageContentIdentity: draft.sourceImageContentIdentity,
      candidateSetIdentity: draft.candidateSetIdentity,
      sourcePixelWidth: draft.sourcePixelWidth,
      sourcePixelHeight: draft.sourcePixelHeight,
      selectedCandidateIds: ["fixture-frame"],
      reviewedCandidates: options.reviewedCandidates,
      measurementCandidateIds: null,
    },
  );

  const comparisonCandidates = [rectangle, segment, {
    ...segment,
    id: "fixture-axis",
    primitive: { ...segment.primitive, kind: "axis" },
  }];
  const comparisonSelection = new Set(comparisonCandidates.map(({ id }) => id));
  assert.equal(
    isValidPrivateWebLabMeasurementPairV1(
      "compare-two-lengths",
      ["fixture-segment", "fixture-axis"],
      comparisonSelection,
      comparisonCandidates,
    ),
    true,
  );
  assert.equal(
    isValidPrivateWebLabMeasurementPairV1(
      "compare-two-lengths",
      ["fixture-segment", "fixture-frame"],
      comparisonSelection,
      comparisonCandidates,
    ),
    false,
  );
});

test(
  "rendered browser changes a linked goal without reload and rejects the stale session",
  {
    skip: RUN_RENDERED_BROWSER_TEST
      ? false
      : "Set NORMA_RUN_PRIVATE_WEB_LAB_BROWSER_TEST=1 for the local Chrome acceptance run.",
    timeout: 30_000,
  },
  async () => {
    const chromePath = await findChromeExecutable();
    let coreExecutions = 0;
    const application = new PrivateWebLabApplicationV1({
      executeConfirmation(input) {
        coreExecutions += 1;
        return confirmPersonalVisualHarmonyCandidateSetV1(input);
      },
    });
    const server = createPrivateWebLabHttpServerV1({ application });
    const port = await listen(server);
    const fixturePath = new URL(
      "../examples/personal-visual-harmony/golden-split-poster.png",
      import.meta.url,
    ).pathname;
    const browser = await launchChrome(chromePath);
    let connection;
    try {
      connection = await CdpConnection.connect(browser.devtoolsUrl);
      const { targetId } = await connection.send("Target.createTarget", {
        url: `http://127.0.0.1:${String(port)}/`,
      });
      const { sessionId } = await connection.send("Target.attachToTarget", {
        targetId,
        flatten: true,
      });
      await connection.send("Runtime.enable", {}, sessionId);
      await connection.send("DOM.enable", {}, sessionId);
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.readyState === 'complete'",
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          const fetchNormally = window.fetch.bind(window);
          window.__manualDrafts = [];
          window.__manualDraftRequests = [];
          window.fetch = async (input, init) => {
            const response = await fetchNormally(input, init);
            if (input === "/api/manual-draft" && response.ok) {
              window.__manualDraftRequests.push(JSON.parse(init.body));
              window.__manualDrafts.push(await response.clone().json());
            }
            return response;
          };
        })()`,
      );
      const { root } = await connection.send("DOM.getDocument", {}, sessionId);
      const { nodeId } = await connection.send(
        "DOM.querySelector",
        { nodeId: root.nodeId, selector: "#image-input" },
        sessionId,
      );
      await connection.send(
        "DOM.setFileInputFiles",
        { nodeId, files: [fixturePath] },
        sessionId,
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#image-input")
            .dispatchEvent(new Event("change", { bubbles: true }));
          const goal = document.querySelector("#goal-input");
          goal.value = "general-geometry";
          goal.dispatchEvent(new Event("change", { bubbles: true }));
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "!document.querySelector('#review-section').hidden",
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#add-rectangle-button").click();
          document.querySelector("#prepare-button").click();
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "window.__manualDrafts.length === 1 && !document.querySelector('#change-goal-button').hidden",
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          const rectangleX = document.querySelector(
            ".candidate input[type=number]",
          );
          rectangleX.value = "0.2";
          rectangleX.dispatchEvent(new Event("change", { bubbles: true }));
        })()`,
      );
      const beforeReset = await evaluate(
        connection,
        sessionId,
        `({
          source: document.querySelector("#source-image").src,
          oldSessionId: window.__manualDrafts[0].labSessionId,
          goalDisabled: document.querySelector("#goal-input").disabled,
          candidateCount: document.querySelectorAll(".candidate").length,
          rectangleX: document.querySelector(
            ".candidate input[type=number]",
          ).value,
        })`,
      );
      assert.equal(beforeReset.goalDisabled, true);
      assert.equal(beforeReset.candidateCount, 1);
      assert.equal(beforeReset.rectangleX, "0.2");
      assert.equal(coreExecutions, 0);

      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#change-goal-button').click()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#phase-description').textContent.includes('Dessinez')",
      );
      const staleAttempt = await evaluate(
        connection,
        sessionId,
        `(async () => {
          const draft = window.__manualDrafts[0];
          const request = window.__manualDraftRequests[0];
          const response = await fetch("/api/manual-confirm", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              explicitConfirmation: true,
              browserSessionId: request.browserSessionId,
              labSessionId: draft.labSessionId,
              sourceImageContentIdentity: draft.sourceImageContentIdentity,
              candidateSetIdentity: draft.candidateSetIdentity,
              perceptionReceiptIdentity: draft.perceptionReceiptIdentity,
              sourcePixelWidth: draft.sourcePixelWidth,
              sourcePixelHeight: draft.sourcePixelHeight,
              selectedCandidateIds: [draft.candidates[0].id],
              reviewedCandidates: draft.candidates,
              measurementCandidateIds: null,
            }),
          });
          return { status: response.status, body: await response.json() };
        })()`,
      );
      assert.equal(staleAttempt.status, 400);
      assert.match(staleAttempt.body.message, /missing or expired/u);
      assert.equal(coreExecutions, 0);

      const authoring = await evaluate(
        connection,
        sessionId,
        `({
          imageRetained: document.querySelector("#source-image").src,
          goalDisabled: document.querySelector("#goal-input").disabled,
          candidateCount: document.querySelectorAll(".candidate").length,
          resetHidden: document.querySelector("#change-goal-button").hidden,
          rectangleX: document.querySelector(
            ".candidate input[type=number]",
          ).value,
        })`,
      );
      assert.equal(authoring.imageRetained, beforeReset.source);
      assert.equal(authoring.goalDisabled, false);
      assert.equal(authoring.candidateCount, 1);
      assert.equal(authoring.resetHidden, true);
      assert.equal(authoring.rectangleX, "0.2");

      await evaluate(
        connection,
        sessionId,
        `(() => {
          const goal = document.querySelector("#goal-input");
          goal.value = "compare-two-lengths";
          goal.dispatchEvent(new Event("change", { bubbles: true }));
          document.querySelector("#add-segment-button").click();
          document.querySelector("#add-segment-button").click();
          document.querySelector("#prepare-button").click();
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "window.__manualDrafts.length === 2",
      );
      assert.notEqual(
        await evaluate(connection, sessionId, "window.__manualDrafts[1].labSessionId"),
        beforeReset.oldSessionId,
      );
      const confirmationReady = await evaluate(
        connection,
        sessionId,
        `(() => {
          const candidateIds = [...document.querySelectorAll(".candidate")]
            .map((candidate) => candidate.dataset.candidateId);
          for (const candidateId of candidateIds) {
            const candidate = [...document.querySelectorAll(".candidate")]
              .find((item) => item.dataset.candidateId === candidateId);
            const checkbox = candidate.querySelector("input[type=checkbox]");
            if (!checkbox.checked) checkbox.click();
          }
          const segments = [...document.querySelectorAll(
            ".candidate input[type=checkbox]:checked",
          )].map((checkbox) => checkbox.closest(".candidate").dataset.candidateId)
            .filter((id) => id.includes("segment"));
          const first = document.querySelector("#measurement-first");
          const second = document.querySelector("#measurement-second");
          first.value = segments[0];
          first.dispatchEvent(new Event("change", { bubbles: true }));
          second.value = segments[1];
          second.dispatchEvent(new Event("change", { bubbles: true }));
          document.querySelector("#confirmation-input").click();
          return {
            selectedCount: document.querySelectorAll(
              ".candidate input[type=checkbox]:checked",
            ).length,
            first: first.value,
            second: second.value,
            runDisabled: document.querySelector("#run-button").disabled,
          };
        })()`,
      );
      assert.deepEqual(confirmationReady, {
        selectedCount: 3,
        first: "manual-segment-1",
        second: "manual-segment-2",
        runDisabled: false,
      });
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#run-button').click()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "!document.querySelector('#receipt-section').hidden",
      );
      assert.equal(coreExecutions, 1);
      assert.deepEqual(connection.runtimeExceptions, []);
    } finally {
      connection?.close();
      await browser.close();
      await close(server);
    }
  },
);

test(
  "rendered browser authors a rectangle and two segments, confirms once, exports, and starts over",
  {
    skip: RUN_RENDERED_BROWSER_TEST
      ? false
      : "Set NORMA_RUN_PRIVATE_WEB_LAB_BROWSER_TEST=1 for the local Chrome acceptance run.",
    timeout: 30_000,
  },
  async () => {
    const chromePath = await findChromeExecutable();
    let coreExecutions = 0;
    const application = new PrivateWebLabApplicationV1({
      executeConfirmation(input) {
        coreExecutions += 1;
        return confirmPersonalVisualHarmonyCandidateSetV1(input);
      },
    });
    const server = createPrivateWebLabHttpServerV1({ application });
    const port = await listen(server);
    const fixturePath = new URL(
      "../examples/personal-visual-harmony/golden-split-poster.png",
      import.meta.url,
    ).pathname;
    const browser = await launchChrome(chromePath);
    let connection;
    try {
      connection = await CdpConnection.connect(browser.devtoolsUrl);
      const { targetId } = await connection.send("Target.createTarget", {
        url: `http://127.0.0.1:${String(port)}/`,
      });
      const { sessionId } = await connection.send("Target.attachToTarget", {
        targetId,
        flatten: true,
      });
      await connection.send("Runtime.enable", {}, sessionId);
      await connection.send("DOM.enable", {}, sessionId);
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.readyState === 'complete'",
      );
      const { root } = await connection.send("DOM.getDocument", {}, sessionId);
      const { nodeId } = await connection.send(
        "DOM.querySelector",
        { nodeId: root.nodeId, selector: "#image-input" },
        sessionId,
      );
      await connection.send(
        "DOM.setFileInputFiles",
        { nodeId, files: [fixturePath] },
        sessionId,
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#image-input")
            .dispatchEvent(new Event("change", { bubbles: true }));
          const goal = document.querySelector("#goal-input");
          goal.value = "compare-two-lengths";
          goal.dispatchEvent(new Event("change", { bubbles: true }));
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "!document.querySelector('#review-section').hidden",
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#add-rectangle-button").click();
          document.querySelector("#add-segment-button").click();
          document.querySelector("#add-segment-button").click();
        })()`,
      );
      const precisionState = await evaluate(
        connection,
        sessionId,
        `({
          activeCandidateId:
            document.querySelector(".candidate[data-active=true]")?.dataset.candidateId,
          handleCount: document.querySelectorAll(".candidate-handle").length,
          zoom: document.querySelector("#image-plane").style.getPropertyValue("--view-zoom"),
        })`,
      );
      assert.deepEqual(precisionState, {
        activeCandidateId: "manual-segment-2",
        handleCount: 2,
        zoom: "1",
      });
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `(() => {
            const plane = document.querySelector("#image-plane");
            const pan = document.querySelector("#pan-tool");
            const drawingTouchAction = getComputedStyle(plane).touchAction;
            pan.click();
            const idleTouchAction = getComputedStyle(plane).touchAction;
            pan.click();
            return {
              drawingTouchAction,
              idleTouchAction,
              panPressed: pan.getAttribute("aria-pressed"),
            };
          })()`,
        ),
        {
          drawingTouchAction: "none",
          idleTouchAction: "pan-y",
          panPressed: "false",
        },
      );
      const endHandle = await evaluate(
        connection,
        sessionId,
        `(() => {
          const handle = document.querySelector('.candidate-handle[data-handle="end"]');
          handle.scrollIntoView({ block: "center", inline: "center" });
          const bounds = handle.getBoundingClientRect();
          const x = bounds.x + bounds.width / 2;
          const y = bounds.y + bounds.height / 2;
          return {
            x,
            y,
            hitClass: document.elementFromPoint(x, y)?.getAttribute("class"),
          };
        })()`,
      );
      assert.equal(endHandle.hitClass, "candidate-handle");
      await connection.send(
        "Input.dispatchMouseEvent",
        { type: "mousePressed", x: endHandle.x, y: endHandle.y, button: "left", clickCount: 1 },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        { type: "mouseMoved", x: endHandle.x - 30, y: endHandle.y + 20, button: "left" },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        { type: "mouseReleased", x: endHandle.x - 30, y: endHandle.y + 20, button: "left" },
        sessionId,
      );
      assert.notEqual(
        await evaluate(
          connection,
          sessionId,
          `document.querySelector('.candidate-handle[data-handle="end"]').getAttribute("cx")`,
        ),
        "900",
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#zoom-in-button').click()",
      );
      assert.equal(
        await evaluate(
          connection,
          sessionId,
          `document.querySelector("#image-plane").style.getPropertyValue("--view-zoom")`,
        ),
        "1.5",
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          for (let index = 0; index < 5; index += 1) {
            document.querySelector("#zoom-in-button").click();
          }
        })()`,
      );
      const zoomedToolbarState = await evaluate(
        connection,
        sessionId,
        `(() => {
          const reset = document.querySelector("#zoom-reset-button");
          reset.scrollIntoView({ block: "center", inline: "center" });
          const bounds = reset.getBoundingClientRect();
          const x = bounds.x + bounds.width / 2;
          const y = bounds.y + bounds.height / 2;
          return {
            zoom: document.querySelector("#image-plane").style.getPropertyValue("--view-zoom"),
            hitId: document.elementFromPoint(x, y)?.id,
            handleScreenSized:
              document.querySelector(".candidate-handle").getBoundingClientRect().width >= 11,
          };
        })()`,
      );
      assert.deepEqual(zoomedToolbarState, {
        zoom: "4",
        hitId: "zoom-reset-button",
        handleScreenSized: true,
      });
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#zoom-reset-button').click()",
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `({
            zoom: document.querySelector("#image-plane").style.getPropertyValue("--view-zoom"),
            handleScreenSized:
              document.querySelector(".candidate-handle").getBoundingClientRect().width >= 11,
          })`,
        ),
        { zoom: "1", handleScreenSized: true },
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#zoom-in-button').click()",
      );
      const planeCenter = await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#pan-tool").click();
          const plane = document.querySelector("#image-plane");
          plane.scrollIntoView({ block: "center", inline: "center" });
          const bounds = plane.getBoundingClientRect();
          return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        })()`,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        { type: "mousePressed", x: planeCenter.x, y: planeCenter.y, button: "left", clickCount: 1 },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        { type: "mouseMoved", x: planeCenter.x + 20, y: planeCenter.y + 10, button: "left" },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        { type: "mouseReleased", x: planeCenter.x + 20, y: planeCenter.y + 10, button: "left" },
        sessionId,
      );
      assert.notEqual(
        await evaluate(
          connection,
          sessionId,
          `document.querySelector("#image-plane").style.getPropertyValue("--view-pan-x")`,
        ),
        "0px",
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          for (let index = 0; index < 5; index += 1) {
            document.querySelector("#zoom-in-button").click();
          }
        })()`,
      );
      const zoomedPlaneCenter = await evaluate(
        connection,
        sessionId,
        `(() => {
          const plane = document.querySelector("#image-plane");
          const bounds = plane.getBoundingClientRect();
          return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        })()`,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mousePressed",
          x: zoomedPlaneCenter.x,
          y: zoomedPlaneCenter.y,
          button: "left",
          clickCount: 1,
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseMoved",
          x: zoomedPlaneCenter.x + 10_000,
          y: zoomedPlaneCenter.y,
          button: "left",
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseReleased",
          x: zoomedPlaneCenter.x + 10_000,
          y: zoomedPlaneCenter.y,
          button: "left",
        },
        sessionId,
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#image-plane').style.width = '320px'",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        `(() => {
          const plane = document.querySelector("#image-plane");
          const panX = Number.parseFloat(plane.style.getPropertyValue("--view-pan-x"));
          return Math.abs(panX) <= plane.offsetWidth * 1.5;
        })()`,
      );
      assert.equal(
        await evaluate(
          connection,
          sessionId,
          `(() => {
            const bounds = document.querySelector(".candidate-handle-hit").getBoundingClientRect();
            return bounds.width >= 24 && bounds.height >= 24;
          })()`,
        ),
        true,
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          for (let index = 0; index < 5; index += 1) {
            document.querySelector("#zoom-out-button").click();
          }
        })()`,
      );
      assert.equal(
        await evaluate(
          connection,
          sessionId,
          `(() => {
            const plane = document.querySelector("#image-plane");
            const panX = Number.parseFloat(
              plane.style.getPropertyValue("--view-pan-x"),
            );
            return Math.abs(panX) <= plane.offsetWidth * 0.25;
          })()`,
        ),
        true,
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `(() => {
            document.querySelector("#add-segment-button").click();
            const edited = document.querySelector(
              '.candidate[data-candidate-id="manual-segment-2"]',
            );
            const endX = edited.querySelectorAll('input[type="number"]')[2];
            endX.value = "0.42";
            endX.dispatchEvent(new Event("change", { bubbles: true }));
            document.querySelector(
              '.candidate[data-candidate-id="manual-segment-2"]',
            ).click();
            document.querySelector(
              '.candidate[data-candidate-id="manual-segment-1"] button',
            ).click();
            const active = document.querySelector(".candidate[data-active=true]");
            return {
              candidateCount: document.querySelectorAll(".candidate").length,
              activeId: active?.dataset.candidateId,
              activeEndX: active?.querySelectorAll('input[type="number"]')[2].value,
            };
          })()`,
        ),
        {
          candidateCount: 3,
          activeId: "manual-segment-1",
          activeEndX: "0.42",
        },
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          const originalFetch = window.fetch.bind(window);
          window.fetch = (...arguments_) => {
            if (!String(arguments_[0]).includes("/api/manual-draft")) {
              return originalFetch(...arguments_);
            }
            return new Promise((resolve, reject) => {
              window.__releaseManualDraft = () => {
                window.fetch = originalFetch;
                originalFetch(...arguments_).then(resolve, reject);
              };
            });
          };
          document.querySelector("#prepare-button").click();
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "typeof window.__releaseManualDraft === 'function'",
      );
      const pendingHandle = await evaluate(
        connection,
        sessionId,
        `(() => {
          const handle = document.querySelector('.candidate-handle[data-handle="end"]');
          const bounds = handle.getBoundingClientRect();
          return {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
            cx: handle.getAttribute("cx"),
          };
        })()`,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mousePressed",
          x: pendingHandle.x,
          y: pendingHandle.y,
          button: "left",
          clickCount: 1,
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseMoved",
          x: pendingHandle.x - 25,
          y: pendingHandle.y,
          button: "left",
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseReleased",
          x: pendingHandle.x - 25,
          y: pendingHandle.y,
          button: "left",
        },
        sessionId,
      );
      assert.equal(
        await evaluate(
          connection,
          sessionId,
          `document.querySelector('.candidate-handle[data-handle="end"]').getAttribute("cx")`,
        ),
        pendingHandle.cx,
      );
      await evaluate(
        connection,
        sessionId,
        "window.__releaseManualDraft()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#phase-description').textContent.includes('Liste liée')",
      );
      assert.equal(coreExecutions, 0);
      const reviewState = await evaluate(
        connection,
        sessionId,
        `({
          candidateCount: document.querySelectorAll(".candidate").length,
          checkboxCount: document.querySelectorAll(".candidate input[type=checkbox]").length,
          disabledCheckboxCount:
            document.querySelectorAll(".candidate input[type=checkbox]:disabled").length,
          receiptHidden: document.querySelector("#receipt-section").hidden,
        })`,
      );
      assert.deepEqual(reviewState, {
        candidateCount: 3,
        checkboxCount: 3,
        disabledCheckboxCount: 0,
        receiptHidden: true,
      });
      await evaluate(
        connection,
        sessionId,
        `(() => {
          let checkbox;
          while ((checkbox = document.querySelector(".candidate input[type=checkbox]:not(:checked)"))) {
            checkbox.click();
          }
          const first = document.querySelector("#measurement-first");
          const second = document.querySelector("#measurement-second");
          first.value = "manual-segment-2";
          first.dispatchEvent(new Event("change", { bubbles: true }));
          second.value = "manual-segment-1";
          second.dispatchEvent(new Event("change", { bubbles: true }));
          document.querySelector("#confirmation-input").click();
        })()`,
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `({
            panPressed: document.querySelector("#pan-tool").getAttribute("aria-pressed"),
            planeTouchAction: getComputedStyle(
              document.querySelector("#image-plane"),
            ).touchAction,
            handleTouchAction: getComputedStyle(
              document.querySelector(".candidate-handle"),
            ).touchAction,
          })`,
        ),
        {
          panPressed: "false",
          planeTouchAction: "pan-y",
          handleTouchAction: "none",
        },
      );
      const reviewEditingState = await evaluate(
        connection,
        sessionId,
        `(() => {
          const plane = document.querySelector("#image-plane");
          plane.scrollIntoView({ block: "center", inline: "center" });
          const bounds = plane.getBoundingClientRect();
          return {
            toolbarHidden: document.querySelector("#authoring-toolbar").hidden,
            rectangleToolHidden: document.querySelector("#rectangle-tool").hidden,
            panToolHidden: document.querySelector("#pan-tool").hidden,
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          };
        })()`,
      );
      assert.deepEqual(
        {
          toolbarHidden: reviewEditingState.toolbarHidden,
          rectangleToolHidden: reviewEditingState.rectangleToolHidden,
          panToolHidden: reviewEditingState.panToolHidden,
        },
        {
          toolbarHidden: false,
          rectangleToolHidden: true,
          panToolHidden: false,
        },
      );
      const reviewHandle = await evaluate(
        connection,
        sessionId,
        `(() => {
          const handle = document.querySelector('.candidate-handle[data-handle="end"]');
          const bounds = handle.getBoundingClientRect();
          return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        })()`,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mousePressed",
          x: reviewHandle.x,
          y: reviewHandle.y,
          button: "left",
          clickCount: 1,
        },
        sessionId,
      );
      const handleBeforeForeignPointer = await evaluate(
        connection,
        sessionId,
        `document.querySelector('.candidate-handle[data-handle="end"]').getAttribute("cx")`,
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          const plane = document.querySelector("#image-plane");
          plane.dispatchEvent(new PointerEvent("pointermove", {
            bubbles: true,
            pointerId: 999,
            clientX: ${String(reviewHandle.x - 80)},
            clientY: ${String(reviewHandle.y)},
          }));
          plane.dispatchEvent(new PointerEvent("pointerup", {
            bubbles: true,
            pointerId: 999,
            clientX: ${String(reviewHandle.x - 80)},
            clientY: ${String(reviewHandle.y)},
          }));
        })()`,
      );
      assert.equal(
        await evaluate(
          connection,
          sessionId,
          `document.querySelector('.candidate-handle[data-handle="end"]').getAttribute("cx")`,
        ),
        handleBeforeForeignPointer,
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `({
            confirmed: document.querySelector("#confirmation-input").checked,
            runDisabled: document.querySelector("#run-button").disabled,
          })`,
        ),
        { confirmed: false, runDisabled: true },
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseMoved",
          x: reviewHandle.x - 10,
          y: reviewHandle.y,
          button: "left",
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseReleased",
          x: reviewHandle.x - 10,
          y: reviewHandle.y,
          button: "left",
        },
        sessionId,
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#confirmation-input').click()",
      );
      const panFromHandle = await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#pan-tool").click();
          const handle = document.querySelector('.candidate-handle[data-handle="end"]');
          const bounds = handle.getBoundingClientRect();
          const plane = document.querySelector("#image-plane");
          return {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
            candidateX: handle.getAttribute("cx"),
            panX: plane.style.getPropertyValue("--view-pan-x"),
          };
        })()`,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mousePressed",
          x: panFromHandle.x,
          y: panFromHandle.y,
          button: "left",
          clickCount: 1,
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseMoved",
          x: panFromHandle.x - 10,
          y: panFromHandle.y - 10,
          button: "left",
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseReleased",
          x: panFromHandle.x - 10,
          y: panFromHandle.y - 10,
          button: "left",
        },
        sessionId,
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `({
            candidateX:
              document.querySelector('.candidate-handle[data-handle="end"]').getAttribute("cx"),
            panChanged:
              document.querySelector("#image-plane").style.getPropertyValue("--view-pan-x")
                !== ${JSON.stringify(panFromHandle.panX)},
            confirmed: document.querySelector("#confirmation-input").checked,
          })`,
        ),
        {
          candidateX: panFromHandle.candidateX,
          panChanged: true,
          confirmed: true,
        },
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mousePressed",
          x: reviewEditingState.x,
          y: reviewEditingState.y,
          button: "left",
          clickCount: 1,
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseMoved",
          x: reviewEditingState.x - 10,
          y: reviewEditingState.y - 10,
          button: "left",
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseReleased",
          x: reviewEditingState.x - 10,
          y: reviewEditingState.y - 10,
          button: "left",
        },
        sessionId,
      );
      assert.equal(coreExecutions, 0);
      assert.equal(
        await evaluate(connection, sessionId, "document.querySelector('#confirmation-input').checked"),
        true,
      );
      assert.equal(
        await evaluate(connection, sessionId, "!document.querySelector('#run-button').disabled"),
        true,
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#run-button').click()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "!document.querySelector('#receipt-section').hidden",
      );
      assert.equal(coreExecutions, 1);
      const completed = await evaluate(
        connection,
        sessionId,
        `({
          exportReady: document.querySelector("#export-link").href.startsWith("blob:"),
          lockedCheckboxes:
            document.querySelectorAll(".candidate input[type=checkbox]:disabled").length,
          source: document.querySelector("#source-image").src,
        })`,
      );
      assert.equal(completed.exportReady, true);
      assert.equal(completed.lockedCheckboxes, 3);
      const completedPan = await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#zoom-reset-button").click();
          document.querySelector("#zoom-in-button").click();
          document.querySelector("#pan-tool").click();
          const plane = document.querySelector("#image-plane");
          plane.scrollIntoView({ block: "center", inline: "center" });
          const bounds = plane.getBoundingClientRect();
          return {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
            before: plane.style.getPropertyValue("--view-pan-x"),
          };
        })()`,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mousePressed",
          x: completedPan.x,
          y: completedPan.y,
          button: "left",
          clickCount: 1,
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseMoved",
          x: completedPan.x + 20,
          y: completedPan.y,
          button: "left",
        },
        sessionId,
      );
      await connection.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseReleased",
          x: completedPan.x + 20,
          y: completedPan.y,
          button: "left",
        },
        sessionId,
      );
      assert.notEqual(
        await evaluate(
          connection,
          sessionId,
          `document.querySelector("#image-plane").style.getPropertyValue("--view-pan-x")`,
        ),
        completedPan.before,
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#new-measurement-button').click()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#phase-description').textContent.includes('Dessinez')",
      );
      const restarted = await evaluate(
        connection,
        sessionId,
        `({
          receiptHidden: document.querySelector("#receipt-section").hidden,
          addDisabled: document.querySelector("#add-rectangle-button").disabled,
          imageRetained: document.querySelector("#source-image").src.length > 0,
          measurementHidden: document.querySelector("#measurement-section").hidden,
          firstLengthOptionCount: document.querySelector("#measurement-first").options.length,
          secondLengthOptionCount: document.querySelector("#measurement-second").options.length,
          firstLength: document.querySelector("#measurement-first").value,
          secondLength: document.querySelector("#measurement-second").value,
          zoom: document.querySelector("#image-plane").style.getPropertyValue("--view-zoom"),
          rectangleToolPressed:
            document.querySelector("#rectangle-tool").getAttribute("aria-pressed"),
        })`,
      );
      assert.deepEqual(restarted, {
        receiptHidden: true,
        addDisabled: false,
        imageRetained: true,
        measurementHidden: true,
        firstLengthOptionCount: 1,
        secondLengthOptionCount: 1,
        firstLength: "",
        secondLength: "",
        zoom: "1",
        rectangleToolPressed: "true",
      });
      assert.equal(coreExecutions, 1);
    } finally {
      await connection?.close();
      await browser.close();
      await close(server);
    }
  },
);

test(
  "rendered browser discards stale image metadata when a newer file wins",
  {
    skip: RUN_RENDERED_BROWSER_TEST
      ? false
      : "Set NORMA_RUN_PRIVATE_WEB_LAB_BROWSER_TEST=1 for the local Chrome acceptance run.",
    timeout: 30_000,
  },
  async () => {
    const chromePath = await findChromeExecutable();
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "norma-web-lab-race-"));
    const latestImageBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const latestImagePath = join(temporaryDirectory, "latest.png");
    await writeFile(latestImagePath, latestImageBytes);
    const expectedLatestIdentity =
      `sha256:${createHash("sha256").update(latestImageBytes).digest("hex")}`;
    const firstImagePath = new URL(
      "../examples/personal-visual-harmony/golden-split-poster.png",
      import.meta.url,
    ).pathname;
    const server = createPrivateWebLabHttpServerV1();
    const port = await listen(server);
    const browser = await launchChrome(chromePath);
    let connection;
    try {
      connection = await CdpConnection.connect(browser.devtoolsUrl);
      const { targetId } = await connection.send("Target.createTarget", {
        url: `http://127.0.0.1:${String(port)}/`,
      });
      const { sessionId } = await connection.send("Target.attachToTarget", {
        targetId,
        flatten: true,
      });
      await connection.send("Runtime.enable", {}, sessionId);
      await connection.send("DOM.enable", {}, sessionId);
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.readyState === 'complete'",
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          const digest = crypto.subtle.digest.bind(crypto.subtle);
          let digestCalls = 0;
          Object.defineProperty(crypto.subtle, "digest", {
            configurable: true,
            value: async (...args) => {
              digestCalls += 1;
              if (digestCalls === 1) {
                await new Promise((resolve) => {
                  window.__releaseFirstImageDigest = resolve;
                });
              }
              return digest(...args);
            },
          });
          const fetchNormally = window.fetch.bind(window);
          window.fetch = (input, init) => {
            if (input === "/api/manual-draft") {
              window.__manualDraftBody = JSON.parse(init.body);
            }
            return fetchNormally(input, init);
          };
        })()`,
      );
      const { root } = await connection.send("DOM.getDocument", {}, sessionId);
      const { nodeId } = await connection.send(
        "DOM.querySelector",
        { nodeId: root.nodeId, selector: "#image-input" },
        sessionId,
      );
      await connection.send(
        "DOM.setFileInputFiles",
        { nodeId, files: [firstImagePath] },
        sessionId,
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#image-input').dispatchEvent(new Event('change', { bubbles: true }))",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "typeof window.__releaseFirstImageDigest === 'function'",
      );
      await connection.send(
        "DOM.setFileInputFiles",
        { nodeId, files: [latestImagePath] },
        sessionId,
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#image-input")
            .dispatchEvent(new Event("change", { bubbles: true }));
          const goal = document.querySelector("#goal-input");
          goal.value = "general-geometry";
          goal.dispatchEvent(new Event("change", { bubbles: true }));
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#source-image').naturalWidth === 1",
      );
      await evaluate(
        connection,
        sessionId,
        "window.__releaseFirstImageDigest()",
      );
      await evaluate(
        connection,
        sessionId,
        `new Promise((resolve) => setTimeout(resolve, 50))`,
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#add-rectangle-button").click();
          document.querySelector("#prepare-button").click();
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "window.__manualDraftBody !== undefined",
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `({
            identity: window.__manualDraftBody.sourceImageContentIdentity,
            width: window.__manualDraftBody.sourcePixelWidth,
            height: window.__manualDraftBody.sourcePixelHeight,
            displayedWidth: document.querySelector("#source-image").naturalWidth,
          })`,
        ),
        {
          identity: expectedLatestIdentity,
          width: 1,
          height: 1,
          displayedWidth: 1,
        },
      );
    } finally {
      await connection?.close();
      await browser.close();
      await close(server);
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  },
);

test(
  "rendered browser gates authoring, locks preparation, discards stale drafts, and recovers expired review",
  {
    skip: RUN_RENDERED_BROWSER_TEST
      ? false
      : "Set NORMA_RUN_PRIVATE_WEB_LAB_BROWSER_TEST=1 for the local Chrome acceptance run.",
    timeout: 30_000,
  },
  async () => {
    const chromePath = await findChromeExecutable();
    let coreExecutions = 0;
    const application = new PrivateWebLabApplicationV1({
      executeConfirmation(input) {
        coreExecutions += 1;
        return confirmPersonalVisualHarmonyCandidateSetV1(input);
      },
    });
    const server = createPrivateWebLabHttpServerV1({ application });
    const port = await listen(server);
    const fixturePath = new URL(
      "../examples/personal-visual-harmony/golden-split-poster.png",
      import.meta.url,
    ).pathname;
    const browser = await launchChrome(chromePath);
    let connection;
    try {
      connection = await CdpConnection.connect(browser.devtoolsUrl);
      const { targetId } = await connection.send("Target.createTarget", {
        url: `http://127.0.0.1:${String(port)}/`,
      });
      const { sessionId } = await connection.send("Target.attachToTarget", {
        targetId,
        flatten: true,
      });
      await connection.send("Runtime.enable", {}, sessionId);
      await connection.send("DOM.enable", {}, sessionId);
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.readyState === 'complete'",
      );
      const { root } = await connection.send("DOM.getDocument", {}, sessionId);
      const { nodeId } = await connection.send(
        "DOM.querySelector",
        { nodeId: root.nodeId, selector: "#image-input" },
        sessionId,
      );
      const loadFixture = async () => {
        await connection.send(
          "DOM.setFileInputFiles",
          { nodeId, files: [fixturePath] },
          sessionId,
        );
        await evaluate(
          connection,
          sessionId,
          `(() => {
            document.querySelector("#image-input")
              .dispatchEvent(new Event("change", { bubbles: true }));
            const goal = document.querySelector("#goal-input");
            goal.value = "compare-two-lengths";
            goal.dispatchEvent(new Event("change", { bubbles: true }));
          })()`,
        );
        await waitForBrowserCondition(
          connection,
          sessionId,
          "!document.querySelector('#review-section').hidden",
        );
      };
      await loadFixture();
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#add-rectangle-button').click()",
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `({
            disabled: document.querySelector("#prepare-button").disabled,
            status: document.querySelector("#setup-status").textContent,
          })`,
        ),
        {
          disabled: true,
          status: "Tracez au moins un cadre et deux segments avant de préparer la revue.",
        },
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#add-segment-button").click();
          document.querySelector("#add-segment-button").click();
          const fetchNormally = window.fetch.bind(window);
          let delayed = false;
          window.fetch = (input, init) => {
            if (input === "/api/manual-draft" && !delayed) {
              delayed = true;
              return new Promise((resolve) => {
                window.__releaseManualDraft = () => resolve(fetchNormally(input, init));
              });
            }
            return fetchNormally(input, init);
          };
          document.querySelector("#prepare-button").click();
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "typeof window.__releaseManualDraft === 'function'",
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `({
            imageDisabled: document.querySelector("#image-input").disabled,
            goalDisabled: document.querySelector("#goal-input").disabled,
            prepareDisabled: document.querySelector("#prepare-button").disabled,
            disabledGeometry:
              document.querySelectorAll(".candidate input[type=number]:disabled").length,
            candidateCount: document.querySelectorAll(".candidate").length,
          })`,
        ),
        {
          imageDisabled: true,
          goalDisabled: true,
          prepareDisabled: true,
          disabledGeometry: 12,
          candidateCount: 3,
        },
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#add-rectangle-button').click()",
      );
      assert.equal(
        await evaluate(connection, sessionId, "document.querySelectorAll('.candidate').length"),
        3,
      );

      await loadFixture();
      await evaluate(connection, sessionId, "window.__releaseManualDraft()");
      await evaluate(
        connection,
        sessionId,
        "new Promise((resolve) => setTimeout(resolve, 50))",
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `({
            checkboxCount: document.querySelectorAll(".candidate input[type=checkbox]").length,
            prepareHidden: document.querySelector("#prepare-button").hidden,
          })`,
        ),
        { checkboxCount: 0, prepareHidden: false },
      );

      await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#add-rectangle-button").click();
          document.querySelector("#add-segment-button").click();
          document.querySelector("#add-segment-button").click();
          document.querySelector("#prepare-button").click();
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelectorAll('.candidate input[type=checkbox]').length === 3",
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          const fetchNormally = window.fetch.bind(window);
          let expired = false;
          window.fetch = (input, init) => {
            if (input === "/api/manual-confirm" && !expired) {
              expired = true;
              return Promise.resolve(new Response(
                JSON.stringify({ error: "Private Web Lab session is missing or expired." }),
                { status: 404, headers: { "content-type": "application/json" } },
              ));
            }
            return fetchNormally(input, init);
          };
          let checkbox;
          while ((checkbox = document.querySelector(
            ".candidate input[type=checkbox]:not(:checked)",
          ))) checkbox.click();
          const first = document.querySelector("#measurement-first");
          const second = document.querySelector("#measurement-second");
          first.value = "manual-segment-1";
          first.dispatchEvent(new Event("change", { bubbles: true }));
          second.value = "manual-segment-2";
          second.dispatchEvent(new Event("change", { bubbles: true }));
          document.querySelector("#confirmation-input").click();
        })()`,
      );
      assert.equal(
        await evaluate(connection, sessionId, "!document.querySelector('#run-button').disabled"),
        true,
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#run-button').click()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#setup-status').textContent.includes('expiré')",
      );
      assert.deepEqual(
        await evaluate(
          connection,
          sessionId,
          `({
            checkboxCount: document.querySelectorAll(".candidate input[type=checkbox]").length,
            imageDisabled: document.querySelector("#image-input").disabled,
            goalDisabled: document.querySelector("#goal-input").disabled,
            prepareHidden: document.querySelector("#prepare-button").hidden,
            receiptHidden: document.querySelector("#receipt-section").hidden,
            rectangleToolPressed:
              document.querySelector("#rectangle-tool").getAttribute("aria-pressed"),
          })`,
        ),
        {
          checkboxCount: 0,
          imageDisabled: false,
          goalDisabled: false,
          prepareHidden: false,
          receiptHidden: true,
          rectangleToolPressed: "true",
        },
      );
      assert.equal(coreExecutions, 0);
    } finally {
      await connection?.close();
      await browser.close();
      await close(server);
    }
  },
);

test(
  "rendered browser uploads a non-square image, aligns guides, gates one Core run, and exports",
  {
    skip: "Legacy deterministic-fixture browser path remains covered by contract tests only.",
    timeout: 30_000,
  },
  async () => {
    const chromePath = await findChromeExecutable();
    let coreExecutions = 0;
    const application = new PrivateWebLabApplicationV1({
      executeConfirmation(input) {
        coreExecutions += 1;
        return confirmPersonalVisualHarmonyCandidateSetV1(input);
      },
    });
    const server = createPrivateWebLabHttpServerV1({ application });
    const port = await listen(server);
    const fixturePath = new URL(
      "../examples/personal-visual-harmony/golden-split-poster.png",
      import.meta.url,
    ).pathname;
    const browser = await launchChrome(chromePath);
    let connection;
    try {
      connection = await CdpConnection.connect(browser.devtoolsUrl);
      const { targetId } = await connection.send("Target.createTarget", {
        url: `http://127.0.0.1:${String(port)}/`,
      });
      const { sessionId } = await connection.send("Target.attachToTarget", {
        targetId,
        flatten: true,
      });
      await connection.send("Runtime.enable", {}, sessionId);
      await connection.send("DOM.enable", {}, sessionId);
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.readyState === 'complete'",
      );

      const { root } = await connection.send("DOM.getDocument", {}, sessionId);
      const { nodeId } = await connection.send(
        "DOM.querySelector",
        { nodeId: root.nodeId, selector: "#image-input" },
        sessionId,
      );
      await connection.send(
        "DOM.setFileInputFiles",
        { nodeId, files: [fixturePath] },
        sessionId,
      );
      await evaluate(
        connection,
        sessionId,
        `(() => {
          const displayedImage = document.querySelector("#source-image");
          const decodeDisplayedImage = displayedImage.decode.bind(displayedImage);
          const fetchNormally = window.fetch.bind(window);
          window.__draftCalls = 0;
          window.fetch = (...args) => {
            if (args[0] === "/api/draft") window.__draftCalls += 1;
            return fetchNormally(...args);
          };
          displayedImage.decode = async () => {
            await decodeDisplayedImage();
            await new Promise((resolve) => {
              window.__releaseDisplayedImageDecode = resolve;
            });
            displayedImage.decode = decodeDisplayedImage;
            throw new Error("Échec de décodage affiché simulé.");
          };
          const imageInput = document.querySelector("#image-input");
          imageInput.dispatchEvent(new Event("change", { bubbles: true }));
          const goal = document.querySelector("#goal-input");
          goal.value = "compare-two-lengths";
          goal.dispatchEvent(new Event("change", { bubbles: true }));
          document.querySelector("#prepare-button").click();
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "typeof window.__releaseDisplayedImageDecode === 'function'",
      );
      const beforeDisplayedImageDecode = await evaluate(
        connection,
        sessionId,
        `({
          reviewHidden: document.querySelector("#review-section").hidden,
          imageDisabled: document.querySelector("#image-input").disabled,
          goalDisabled: document.querySelector("#goal-input").disabled,
          prepareDisabled: document.querySelector("#prepare-button").disabled,
          draftCalls: window.__draftCalls,
        })`,
      );
      assert.deepEqual(beforeDisplayedImageDecode, {
        reviewHidden: true,
        imageDisabled: true,
        goalDisabled: true,
        prepareDisabled: true,
        draftCalls: 0,
      });
      await evaluate(
        connection,
        sessionId,
        "window.__releaseDisplayedImageDecode()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#setup-status').textContent.includes('simulé')",
      );
      const failedDisplayedImageDecode = await evaluate(
        connection,
        sessionId,
        `({
          reviewHidden: document.querySelector("#review-section").hidden,
          imageDisabled: document.querySelector("#image-input").disabled,
          goalDisabled: document.querySelector("#goal-input").disabled,
          prepareDisabled: document.querySelector("#prepare-button").disabled,
          draftCalls: window.__draftCalls,
        })`,
      );
      assert.deepEqual(failedDisplayedImageDecode, {
        reviewHidden: true,
        imageDisabled: false,
        goalDisabled: false,
        prepareDisabled: false,
        draftCalls: 0,
      });
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#prepare-button').click()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "!document.querySelector('#review-section').hidden",
      );
      assert.equal(
        await evaluate(connection, sessionId, "window.__draftCalls"),
        1,
      );

      assert.equal(coreExecutions, 0);
      const initial = await evaluate(
        connection,
        sessionId,
        `(() => {
          const image = document.querySelector("#source-image");
          const plane = document.querySelector("#image-plane");
          const overlay = document.querySelector("#guide-overlay");
          const rect = (element) => {
            const value = element.getBoundingClientRect();
            return { left: value.left, top: value.top, width: value.width, height: value.height };
          };
          return {
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            image: rect(image),
            plane: rect(plane),
            overlay: rect(overlay),
            visibleCandidates:
              document.querySelectorAll(".candidate:not([hidden])").length,
            visibleGuides: overlay.children.length,
            selectedCandidates:
              document.querySelectorAll(".candidate input[type=checkbox]:checked").length,
            coreGate: document.querySelector("#core-gate").textContent,
            runDisabled: document.querySelector("#run-button").disabled,
            prepareDisabled: document.querySelector("#prepare-button").disabled,
          };
        })()`,
      );
      assert.notEqual(initial.naturalWidth, initial.naturalHeight);
      assertRectsEqual(initial.image, initial.plane);
      assertRectsEqual(initial.overlay, initial.plane);
      assert.equal(initial.visibleCandidates, 4);
      assert.equal(initial.visibleGuides, 4);
      assert.equal(initial.selectedCandidates, 4);
      assert.match(initial.coreGate, /Core arrêté/u);
      assert.equal(initial.runDisabled, true);
      assert.equal(initial.prepareDisabled, false);

      const toggles = await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#original-button").click();
          const hiddenOnOriginal = document.querySelector("#guide-overlay").hasAttribute("hidden");
          document.querySelector("#guides-button").click();
          return {
            hiddenOnOriginal,
            hiddenOnGuides:
              document.querySelector("#guide-overlay").hasAttribute("hidden"),
          };
        })()`,
      );
      assert.deepEqual(toggles, {
        hiddenOnOriginal: true,
        hiddenOnGuides: false,
      });

      const reviewed = await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#reveal-button").click();
          const hiddenSelections = [
            ...document.querySelectorAll(".candidate input[type=checkbox]")
          ].slice(4);
          const hiddenWereUnselected = hiddenSelections.every((input) => !input.checked);
          for (const input of hiddenSelections) {
            input.checked = true;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const widthInput = document.querySelectorAll(
            '[data-candidate-id="fixture-major-region"] .candidate-controls input'
          )[2];
          widthInput.value = "0.55";
          widthInput.dispatchEvent(new Event("change", { bubbles: true }));
          const diagonalStartX = document.querySelector(
            '[data-candidate-id="fixture-diagonal"] .candidate-controls input'
          );
          diagonalStartX.value = "0.1";
          diagonalStartX.dispatchEvent(new Event("change", { bubbles: true }));
          const firstMeasurement = document.querySelector("#measurement-first");
          const secondMeasurement = document.querySelector("#measurement-second");
          firstMeasurement.value = "fixture-horizontal-guide";
          firstMeasurement.dispatchEvent(new Event("change", { bubbles: true }));
          secondMeasurement.value = "fixture-diagonal";
          secondMeasurement.dispatchEvent(new Event("change", { bubbles: true }));
          const confirmation = document.querySelector("#confirmation-input");
          confirmation.checked = true;
          confirmation.dispatchEvent(new Event("change", { bubbles: true }));
          return {
            visibleCandidates:
              document.querySelectorAll(".candidate:not([hidden])").length,
            visibleGuides: document.querySelector("#guide-overlay").children.length,
            hiddenWereUnselected,
            reviewedWidth: widthInput.value,
            reviewedDiagonalStartX: diagonalStartX.value,
            measurementSectionHidden:
              document.querySelector("#measurement-section").hidden,
            firstMeasurement: firstMeasurement.value,
            secondMeasurement: secondMeasurement.value,
            runDisabled: document.querySelector("#run-button").disabled,
          };
        })()`,
      );
      assert.deepEqual(reviewed, {
        visibleCandidates: 6,
        visibleGuides: 6,
        hiddenWereUnselected: true,
        reviewedWidth: "0.55",
        reviewedDiagonalStartX: "0.1",
        measurementSectionHidden: false,
        firstMeasurement: "fixture-horizontal-guide",
        secondMeasurement: "fixture-diagonal",
        runDisabled: false,
      });
      assert.equal(coreExecutions, 0);

      await evaluate(
        connection,
        sessionId,
        `(() => {
          const originalFetch = window.fetch.bind(window);
          window.fetch = (...args) => {
            if (args[0] !== "/api/confirm") return originalFetch(...args);
            return originalFetch(...args).then(async (response) => {
              await new Promise((resolve) => setTimeout(resolve, 100));
              return response;
            });
          };
          document.querySelector("#run-button").click();
        })()`,
      );
      const confirmationLock = await evaluate(
        connection,
        sessionId,
        `({
          candidateInputsDisabled: [
            ...document.querySelectorAll("#candidate-list input")
          ].every((input) => input.disabled),
          confirmationDisabled: document.querySelector("#confirmation-input").disabled,
          measurementInputsDisabled: [
            ...document.querySelectorAll("#measurement-section select")
          ].every((input) => input.disabled),
          imageDisabled: document.querySelector("#image-input").disabled,
          goalDisabled: document.querySelector("#goal-input").disabled,
          prepareDisabled: document.querySelector("#prepare-button").disabled,
        })`,
      );
      assert.deepEqual(confirmationLock, {
        candidateInputsDisabled: true,
        confirmationDisabled: true,
        measurementInputsDisabled: true,
        imageDisabled: true,
        goalDisabled: true,
        prepareDisabled: true,
      });
      await waitForBrowserCondition(
        connection,
        sessionId,
        "!document.querySelector('#receipt-section').hidden",
      );
      assert.equal(coreExecutions, 1);
      const receipt = await evaluate(
        connection,
        sessionId,
        `(async () => {
          const link = document.querySelector("#export-link");
          const exported = await fetch(link.href).then((response) => response.json());
          document.querySelector("#run-button").click();
          return {
            coreGate: document.querySelector("#core-gate").textContent,
            receiptIdentity: document.querySelector("#receipt-identity").textContent,
            resultIdentity: document.querySelector("#result-identity").textContent,
            packRefs: document.querySelector("#pack-refs").textContent,
            providerCalls:
              document.querySelector(".receipt-details dl div:last-child dd").textContent,
            download: link.download,
            exportContractId: exported.contractId,
            measurementReportIdentity:
              exported.declaredMeasurementRatioReport?.contentIdentity ?? "",
            measurementReportVisible:
              !document.querySelector("#measurement-report-row").hidden,
            receiptTitle: document.querySelector("#receipt-title").textContent,
            measurementRatio: document.querySelector("#measurement-ratio").textContent,
            measurementVerdict: document.querySelector("#measurement-verdict").textContent,
            measurementTolerance:
              document.querySelector("#measurement-tolerance").textContent,
            firstMeasurementResult:
              document.querySelector("#measurement-first-result").textContent,
            secondMeasurementResult:
              document.querySelector("#measurement-second-result").textContent,
            receiptDetailsOpen: document.querySelector(".receipt-details").open,
            focusedSection: document.activeElement?.id ?? "",
            ratioOverflowWrap:
              getComputedStyle(document.querySelector("#measurement-ratio")).overflowWrap,
            longRatioContained: (() => {
              const ratio = document.querySelector("#measurement-ratio");
              const originalText = ratio.textContent;
              ratio.textContent = "999999999999,999 : 1";
              const contained = ratio.scrollWidth <= ratio.clientWidth + 1;
              ratio.textContent = originalText;
              return contained;
            })(),
            candidateInputsDisabled: [
              ...document.querySelectorAll("#candidate-list input")
            ].every((input) => input.disabled),
            confirmationDisabled: document.querySelector("#confirmation-input").disabled,
            imageDisabled: document.querySelector("#image-input").disabled,
            goalDisabled: document.querySelector("#goal-input").disabled,
            prepareDisabled: document.querySelector("#prepare-button").disabled,
          };
        })()`,
      );
      assert.equal(coreExecutions, 1);
      assert.match(receipt.coreGate, /Core exécuté une fois/u);
      assert.match(receipt.receiptIdentity, /^sha256:[0-9a-f]{64}$/u);
      assert.match(receipt.resultIdentity, /^sha256:[0-9a-f]{64}$/u);
      assert.ok(receipt.packRefs.length > 0);
      assert.equal(receipt.download, "norma-private-web-lab-result.json");
      assert.equal(receipt.providerCalls, "0");
      assert.equal(receipt.exportContractId, "norma.private-web-lab-canonical-result@1");
      assert.match(receipt.measurementReportIdentity, /^sha256:[0-9a-f]{64}$/u);
      assert.equal(receipt.measurementReportVisible, true);
      assert.equal(receipt.receiptTitle, "3. Résultat confirmé");
      assert.match(receipt.measurementRatio, /^\d+,\d{3} : 1$/u);
      assert.match(receipt.measurementVerdict, /Correspondance|Aucune correspondance/u);
      assert.equal(receipt.measurementTolerance, "±2,5 pt");
      assert.match(receipt.firstMeasurementResult, /^Segment manuel 3 · \d+,\d px$/u);
      assert.match(receipt.secondMeasurementResult, /^Segment manuel 2 · \d+,\d px$/u);
      assert.equal(receipt.receiptDetailsOpen, false);
      assert.equal(receipt.focusedSection, "receipt-section");
      assert.equal(receipt.ratioOverflowWrap, "anywhere");
      assert.equal(receipt.longRatioContained, true);
      assert.equal(receipt.candidateInputsDisabled, true);
      assert.equal(receipt.confirmationDisabled, true);
      assert.equal(receipt.imageDisabled, false);
      assert.equal(receipt.goalDisabled, false);
      assert.equal(receipt.prepareDisabled, false);

      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#prepare-button').click()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "!document.querySelector('#prepare-button').disabled",
      );
      const replacementDraft = await evaluate(
        connection,
        sessionId,
        `({
          confirmationChecked: document.querySelector("#confirmation-input").checked,
          receiptHidden: document.querySelector("#receipt-section").hidden,
          runDisabled: document.querySelector("#run-button").disabled,
          candidateInputsEnabled: [
            ...document.querySelectorAll("#candidate-list input")
          ].every((input) => !input.disabled),
        })`,
      );
      assert.deepEqual(replacementDraft, {
        confirmationChecked: false,
        receiptHidden: true,
        runDisabled: true,
        candidateInputsEnabled: true,
      });
      assert.equal(coreExecutions, 1);
      assert.deepEqual(connection.runtimeExceptions, []);
    } finally {
      connection?.close();
      await browser.close();
      await close(server);
    }
  },
);

async function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((value) => typeof value === "string" && value.length > 0);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue through the bounded local executable list.
    }
  }
  throw new Error("Chrome is required for the rendered Private Web Lab acceptance test.");
}

async function launchChrome(chromePath) {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "norma-private-web-lab-chrome-"));
  const child = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-sync",
      "--metrics-recording-only",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDirectory}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const devtoolsUrl = await waitForDevtoolsUrl(child);
  return {
    devtoolsUrl,
    async close() {
      child.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        delay(2_000),
      ]);
      if (child.exitCode === null) child.kill("SIGKILL");
      await rm(userDataDirectory, { recursive: true, force: true });
    },
  };
}

function waitForDevtoolsUrl(child) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Chrome did not expose a DevTools endpoint."));
    }, 10_000);
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/u);
      if (match === null) return;
      cleanup();
      resolve(match[1]);
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`Chrome exited before DevTools was ready (${String(code)}).`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.stderr.off("data", onData);
      child.off("exit", onExit);
    };
    child.stderr.on("data", onData);
    child.once("exit", onExit);
  });
}

function waitForJsonLineEvent(child, expectedEvent) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Launcher did not emit ${expectedEvent}.`));
    }, 5_000);
    const onData = (chunk) => {
      output += chunk.toString();
      const lines = output.split("\n");
      output = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.event !== expectedEvent) continue;
          cleanup();
          resolve(event);
          return;
        } catch {
          // Ignore non-JSON diagnostics until the bounded event arrives.
        }
      }
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(
        `Launcher exited before ${expectedEvent} (${String(code)}).`,
      ));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.stderr.off("data", onData);
      child.off("exit", onExit);
    };
    child.stderr.on("data", onData);
    child.once("exit", onExit);
  });
}

class CdpConnection {
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new CdpConnection(socket);
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.runtimeExceptions = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.method === "Runtime.exceptionThrown") {
        this.runtimeExceptions.push(message.params.exceptionDetails.text);
      }
      if (message.id === undefined) return;
      const pending = this.pending.get(message.id);
      if (pending === undefined) return;
      this.pending.delete(message.id);
      if (message.error === undefined) pending.resolve(message.result);
      else pending.reject(new Error(message.error.message));
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(connection, sessionId, expression) {
  const result = await connection.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
    },
    sessionId,
  );
  if (result.exceptionDetails !== undefined) {
    throw new Error(result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitForBrowserCondition(connection, sessionId, expression) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(connection, sessionId, expression)) return;
    } catch {
      // The target may still be creating its first execution context.
    }
    await delay(50);
  }
  throw new Error(`Browser condition timed out: ${expression}`);
}

function assertRectsEqual(actual, expected) {
  for (const field of ["left", "top", "width", "height"]) {
    assert.ok(
      Math.abs(actual[field] - expected[field]) < 0.75,
      `${field} differs: ${String(actual[field])} versus ${String(expected[field])}`,
    );
  }
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Private Web Lab did not expose a numeric local port."));
        return;
      }
      resolve(address.port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) resolve();
      else reject(error);
    });
  });
}
