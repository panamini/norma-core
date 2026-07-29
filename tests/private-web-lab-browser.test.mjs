import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
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
  updatePrivateWebLabCandidateGeometryV1,
  visiblePrivateWebLabCandidateIdsV1,
} from "../web-lab/private-web-lab-browser-model.js";
import { createPrivateWebLabHttpServerV1 } from "../web-lab/private-web-lab-http-server.mjs";

const RUN_RENDERED_BROWSER_TEST =
  process.env.NORMA_RUN_PRIVATE_WEB_LAB_BROWSER_TEST === "1";

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
          document.querySelector("#prepare-button").click();
        })()`,
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
          first.value = "manual-segment-1";
          first.dispatchEvent(new Event("change", { bubbles: true }));
          second.value = "manual-segment-2";
          second.dispatchEvent(new Event("change", { bubbles: true }));
          document.querySelector("#confirmation-input").click();
        })()`,
      );
      assert.equal(coreExecutions, 0);
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
        })`,
      );
      assert.deepEqual(restarted, {
        receiptHidden: true,
        addDisabled: false,
        imageRetained: true,
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
          })`,
        ),
        {
          checkboxCount: 0,
          imageDisabled: false,
          goalDisabled: false,
          prepareHidden: false,
          receiptHidden: true,
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
              document.querySelector("#receipt-section dl div:last-child dd").textContent,
            download: link.download,
            exportContractId: exported.contractId,
            measurementReportIdentity:
              exported.declaredMeasurementRatioReport?.contentIdentity ?? "",
            measurementReportVisible:
              !document.querySelector("#measurement-report-row").hidden,
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
