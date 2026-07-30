import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const RUN_RENDERED_BROWSER_TEST =
  process.env.NORMA_RUN_PRIVATE_WEB_LAB_BROWSER_TEST === "1";

const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/private-web-lab.css", ["private-web-lab.css", "text/css; charset=utf-8"]],
  ["/private-web-lab.js", ["private-web-lab.js", "text/javascript; charset=utf-8"]],
  [
    "/private-web-lab-browser-model.js",
    ["private-web-lab-browser-model.js", "text/javascript; charset=utf-8"],
  ],
  [
    "/private-web-lab-local-cv.js",
    ["private-web-lab-local-cv.js", "text/javascript; charset=utf-8"],
  ],
  [
    "/private-web-lab-local-cv-worker.js",
    ["private-web-lab-local-cv-worker.js", "text/javascript; charset=utf-8"],
  ],
]);

test("local CV browser assets preserve the no-provider and no-auto-accept boundary", async () => {
  const [
    runtime,
    detector,
    worker,
    server,
    document,
    packageMetadata,
    webLabBoundary,
    readme,
  ] = await Promise.all([
    readFile(new URL("../web-lab/private-web-lab.js", import.meta.url), "utf8"),
    readFile(new URL("../web-lab/private-web-lab-local-cv.js", import.meta.url), "utf8"),
    readFile(new URL("../web-lab/private-web-lab-local-cv-worker.js", import.meta.url), "utf8"),
    readFile(new URL("../web-lab/private-web-lab-http-server.mjs", import.meta.url), "utf8"),
    readFile(new URL("../web-lab/index.html", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../src/private-web-lab.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.equal(document.includes('id="local-cv-button"'), true);
  assert.equal(document.includes("aucune proposition acceptée automatiquement"), true);
  assert.equal(runtime.includes('new Worker("/private-web-lab-local-cv-worker.js"'), true);
  assert.equal(runtime.includes("included: false"), true);
  assert.equal(runtime.includes('source: "browser-local-cv"'), true);
  assert.equal(
    runtime.includes("candidates: includedCandidates.map(manualDraftCandidateInput)"),
    true,
  );
  assert.equal(runtime.includes("Ces temps ne mesurent pas la précision"), true);
  assert.equal(server.includes('["local-cv", new URL("./private-web-lab-local-cv.js"'), true);
  assert.equal(
    server.includes('["local-cv-worker", new URL("./private-web-lab-local-cv-worker.js"'),
    true,
  );
  assert.equal(server.includes('["/private-web-lab-local-cv.js"'), true);
  assert.equal(server.includes('["/private-web-lab-local-cv-worker.js"'), true);
  for (const source of [detector, worker]) {
    assert.equal(source.includes("fetch("), false);
    assert.equal(source.includes("XMLHttpRequest"), false);
    assert.equal(source.includes("WebSocket"), false);
    assert.equal(source.includes("/api/"), false);
  }
  assert.equal(detector.includes("confidence"), false);
  assert.equal(packageMetadata.toLowerCase().includes("opencv"), false);
  assert.equal(
    webLabBoundary.includes("PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_RECEIPT_CONTRACT_ID"),
    true,
  );
  assert.equal(webLabBoundary.includes("serverReceiptIdentity"), true);
  assert.match(readme, /browser-local, candidate-only CV proposals/u);
  assert.match(readme, /no image\s+bytes or provider call leaves the browser/u);
});

test(
  "rendered Chrome keeps local CV proposals unchecked until explicit inclusion and server projection",
  {
    skip: RUN_RENDERED_BROWSER_TEST ? false : "Set NORMA_RUN_PRIVATE_WEB_LAB_BROWSER_TEST=1.",
    timeout: 30_000,
  },
  async () => {
    const requests = [];
    const server = createServer(async (request, response) => {
      const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if (request.method === "POST" && pathname === "/api/manual-draft") {
        const body = JSON.parse(await readRequestBody(request));
        requests.push({ pathname, body });
        sendJson(response, manualDraftResponse(body));
        return;
      }
      const asset = STATIC_FILES.get(pathname);
      if (request.method !== "GET" || asset === undefined) {
        response.writeHead(404).end();
        return;
      }
      const [file, contentType] = asset;
      const body = await readFile(new URL(`../web-lab/${file}`, import.meta.url));
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": contentType,
      });
      response.end(body);
    });
    const port = await listen(server);
    const browser = await launchChrome(await findChromeExecutable());
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
      await connection.send("Page.enable", {}, sessionId);
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.readyState === 'complete'",
      );
      await evaluate(
        connection,
        sessionId,
        `new Promise((resolve) => {
          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = 240;
          const context = canvas.getContext("2d");
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.strokeStyle = "#000";
          context.lineWidth = 8;
          context.strokeRect(42, 34, 190, 142);
          context.beginPath();
          context.moveTo(250, 42);
          context.lineTo(298, 104);
          context.stroke();
          canvas.toBlob((blob) => {
            const transfer = new DataTransfer();
            transfer.items.add(new File([blob], "synthetic-local-cv.png", {
              type: "image/png",
            }));
            const input = document.querySelector("#image-input");
            input.files = transfer.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
            const goal = document.querySelector("#goal-input");
            goal.value = "general-geometry";
            goal.dispatchEvent(new Event("change", { bubbles: true }));
            resolve();
          }, "image/png");
        })`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "!document.querySelector('#review-section').hidden"
          + " && !document.querySelector('#local-cv-button').disabled",
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#local-cv-button').click()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#local-cv-status').textContent.includes('proposition(s) locale(s)')",
      );
      const initial = await evaluate(
        connection,
        sessionId,
        `(() => {
          const localCards = [
            ...document.querySelectorAll('[data-candidate-source="browser-local-cv"]')
          ];
          const rectangleCard = localCards.find((card) =>
            card.textContent.includes("Cadre proposé localement")
          );
          return {
            localCardCount: localCards.length,
            rectangleId: rectangleCard?.dataset.candidateId ?? null,
            proposalIdentity: rectangleCard?.dataset.proposalIdentity ?? null,
            included: rectangleCard?.querySelector('input[type="checkbox"]')?.checked ?? null,
            geometryPaths: [...(rectangleCard?.querySelectorAll("[data-geometry-path]") ?? [])]
              .map((input) => input.dataset.geometryPath),
            prepareDisabled: document.querySelector("#prepare-button").disabled,
            runDisabled: document.querySelector("#run-button").disabled,
            status: document.querySelector("#local-cv-status").textContent,
          };
        })()`,
      );
      assert.ok(initial.localCardCount > 0);
      assert.match(initial.rectangleId, /^manual-rectangle-[1-9][0-9]?$/u);
      assert.match(initial.proposalIdentity, /^sha256:[0-9a-f]{64}$/u);
      assert.equal(initial.included, false);
      assert.deepEqual(initial.geometryPaths, ["x", "y", "width", "height"]);
      assert.equal(initial.prepareDisabled, true);
      assert.equal(initial.runDisabled, true);
      assert.match(initial.status, /temps ne mesurent pas la précision/u);

      await evaluate(
        connection,
        sessionId,
        `(() => {
          document.querySelector("#add-rectangle-button").click();
          window.__normaNativeWorker = window.Worker;
          window.Worker = class SilentWorker {
            addEventListener() {}
            removeEventListener() {}
            postMessage() {}
            terminate() {}
          };
          document.querySelector("#local-cv-button").click();
        })()`,
      );
      const duringFailedRerun = await evaluate(
        connection,
        sessionId,
        `({
          localCount: document.querySelectorAll(
            '#candidate-list .candidate[data-candidate-source="browser-local-cv"]'
          ).length,
          manualCount: document.querySelectorAll(
            '#candidate-list .candidate[data-candidate-source="manual-browser"]'
          ).length,
        })`,
      );
      assert.deepEqual(duringFailedRerun, { localCount: 0, manualCount: 1 });
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#local-cv-status').textContent.includes('timed out')",
      );
      const afterFailedRerun = await evaluate(
        connection,
        sessionId,
        `(() => {
          const counts = {
            localCount: document.querySelectorAll(
              '#candidate-list .candidate[data-candidate-source="browser-local-cv"]'
            ).length,
            manualCount: document.querySelectorAll(
              '#candidate-list .candidate[data-candidate-source="manual-browser"]'
            ).length,
          };
          window.Worker = window.__normaNativeWorker;
          document.querySelector("#local-cv-button").click();
          return counts;
        })()`,
      );
      assert.deepEqual(afterFailedRerun, { localCount: 0, manualCount: 1 });
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#local-cv-status').textContent.includes('proposition(s) locale(s)')",
      );
      const regenerated = await evaluate(
        connection,
        sessionId,
        `(() => {
          const card = [...document.querySelectorAll(
            '[data-candidate-source="browser-local-cv"]'
          )].find((candidate) => candidate.textContent.includes("Cadre proposé localement"));
          return {
            rectangleId: card.dataset.candidateId,
            proposalIdentity: card.dataset.proposalIdentity,
          };
        })()`,
      );
      assert.equal(regenerated.proposalIdentity, initial.proposalIdentity);

      await evaluate(
        connection,
        sessionId,
        `(() => {
          const card = document.querySelector(
            '#candidate-list .candidate[data-candidate-source="browser-local-cv"]'
              + '[data-candidate-id="${regenerated.rectangleId}"]'
          );
          const x = card.querySelector('input[data-geometry-path="x"]');
          x.value = String(Math.max(0, Number(x.value) - 0.001));
          x.dispatchEvent(new Event("change", { bubbles: true }));
          const refreshed = document.querySelector(
            '#candidate-list .candidate[data-candidate-source="browser-local-cv"]'
              + '[data-candidate-id="${regenerated.rectangleId}"]'
          );
          const include = refreshed.querySelector('input[type="checkbox"]');
          include.checked = true;
          include.dispatchEvent(new Event("change", { bubbles: true }));
        })()`,
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "!document.querySelector('#prepare-button').disabled",
      );
      await evaluate(
        connection,
        sessionId,
        "document.querySelector('#prepare-button').click()",
      );
      await waitForBrowserCondition(
        connection,
        sessionId,
        "document.querySelector('#review-section').dataset.phase === 'review'",
      );

      assert.equal(requests.length, 1);
      const payload = requests[0].body;
      assert.deepEqual(Object.keys(payload).sort(), [
        "browserSessionId",
        "candidates",
        "goalId",
        "localCvProvenanceManifest",
        "previousLabSessionId",
        "sourceImageContentIdentity",
        "sourceImageMediaType",
        "sourcePixelHeight",
        "sourcePixelWidth",
      ]);
      assert.match(payload.sourceImageContentIdentity, /^sha256:[0-9a-f]{64}$/u);
      assert.equal(payload.sourceImageMediaType, "image/png");
      assert.equal(payload.candidates.length, 2);
      assert.equal(payload.candidates.every((candidate) => (
        Object.keys(candidate).sort().join(",") === "height,id,kind,width,x,y"
      )), true);
      assert.equal(
        payload.localCvProvenanceManifest.contractId,
        "norma.private-web-lab-local-cv-provenance@1",
      );
      assert.deepEqual(
        payload.localCvProvenanceManifest.candidateOrderIds,
        payload.candidates.map(({ id }) => id),
      );
      assert.equal(payload.localCvProvenanceManifest.proposals.length, 1);
      assert.equal(
        payload.localCvProvenanceManifest.proposals[0].candidateId,
        regenerated.rectangleId,
      );
      assert.equal(
        payload.localCvProvenanceManifest.proposals[0].originalProposalIdentity,
        initial.proposalIdentity,
      );
      assert.equal(payload.localCvProvenanceManifest.proposals[0].userEdited, true);
      assert.match(
        payload.localCvProvenanceManifest.raster.contentIdentity,
        /^sha256:[0-9a-f]{64}$/u,
      );
      assert.match(
        payload.localCvProvenanceManifest.run.contentIdentity,
        /^sha256:[0-9a-f]{64}$/u,
      );
      assert.equal(JSON.stringify(payload).includes("data:image"), false);
      assert.equal(JSON.stringify(payload).includes("base64"), false);

      const review = await evaluate(
        connection,
        sessionId,
        `({
          source: document.querySelector(
            '#candidate-list .candidate[data-candidate-source="browser-local-cv"]'
          ).dataset.candidateSource,
          proposalIdentity:
            document.querySelector(
              '#candidate-list .candidate[data-candidate-source="browser-local-cv"]'
            ).dataset.proposalIdentity,
          selected: document.querySelector(
            '#candidate-list .candidate[data-candidate-source="browser-local-cv"] '
              + "input[type='checkbox']"
          ).checked,
          provenance: document.querySelector(
            '#candidate-list .candidate[data-candidate-source="browser-local-cv"] '
              + ".candidate-provenance"
          ).textContent,
          runDisabled: document.querySelector("#run-button").disabled,
          coreGate: document.querySelector("#core-gate").textContent,
          localCvHidden: document.querySelector("#local-cv-button").hidden,
        })`,
      );
      assert.equal(review.source, "browser-local-cv");
      assert.equal(review.proposalIdentity, initial.proposalIdentity);
      assert.equal(review.selected, false);
      assert.match(review.provenance, /géométrie modifiée par l’utilisateur/u);
      assert.equal(review.runDisabled, true);
      assert.match(review.coreGate, /confirmation explicite requise/u);
      assert.equal(review.localCvHidden, true);

      const screenshot = await connection.send(
        "Page.captureScreenshot",
        { format: "png", fromSurface: true },
        sessionId,
      );
      assert.ok(screenshot.data.length > 1_000);
      const chromeBenchmark = await evaluate(
        connection,
        sessionId,
        `(async () => {
          const { detectPrivateWebLabLocalCvCandidatesV1 } =
            await import("/private-web-lab-local-cv.js");
          const results = [];
          for (const size of [256, 512, 640]) {
            const data = new Uint8ClampedArray(size * size * 4);
            for (let offset = 0; offset < data.length; offset += 4) {
              data[offset] = 255;
              data[offset + 1] = 255;
              data[offset + 2] = 255;
              data[offset + 3] = 255;
            }
            const setPixel = (x, y) => {
              if (x < 0 || y < 0 || x >= size || y >= size) return;
              const offset = ((y * size) + x) * 4;
              data[offset] = 0;
              data[offset + 1] = 0;
              data[offset + 2] = 0;
            };
            const line = (x0, y0, x1, y1) => {
              const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
              for (let step = 0; step <= steps; step += 1) {
                const x = Math.round(x0 + ((x1 - x0) * step / Math.max(1, steps)));
                const y = Math.round(y0 + ((y1 - y0) * step / Math.max(1, steps)));
                for (let dy = -2; dy <= 2; dy += 1) {
                  for (let dx = -2; dx <= 2; dx += 1) setPixel(x + dx, y + dy);
                }
              }
            };
            const inset = Math.round(size * 0.12);
            const far = size - inset;
            line(inset, inset, far, inset);
            line(far, inset, far, far);
            line(far, far, inset, far);
            line(inset, far, inset, inset);
            line(inset * 2, far - inset, far - inset, inset * 2);
            const raster = { width: size, height: size, data };
            for (let index = 0; index < 5; index += 1) {
              detectPrivateWebLabLocalCvCandidatesV1(raster);
            }
            const durations = [];
            for (let index = 0; index < 30; index += 1) {
              const startedAt = performance.now();
              detectPrivateWebLabLocalCvCandidatesV1(raster);
              durations.push(performance.now() - startedAt);
            }
            durations.sort((left, right) => left - right);
            const percentile = (fraction) =>
              durations[Math.max(0, Math.ceil(durations.length * fraction) - 1)];
            results.push({
              size: size + "x" + size,
              p50Milliseconds: Number(percentile(0.5).toFixed(2)),
              p95Milliseconds: Number(percentile(0.95).toFixed(2)),
              maxMilliseconds: Number(durations.at(-1).toFixed(2)),
            });
          }
          return {
            warmupRuns: 5,
            measuredRuns: 30,
            precisionClaim: false,
            machine: navigator.platform,
            browser: navigator.userAgent,
            results,
          };
        })()`,
      );
      assert.equal(chromeBenchmark.results.length, 3);
      assert.equal(chromeBenchmark.precisionClaim, false);
      console.log(`LOCAL_CV_CHROME_BENCHMARK ${JSON.stringify(chromeBenchmark)}`);
      assert.deepEqual(connection.runtimeExceptions, []);
    } finally {
      connection?.close();
      await browser.close();
      await close(server);
    }
  },
);

function manualDraftResponse(body) {
  return {
    labSessionId: "web-lab-session:11111111-1111-4111-8111-111111111111",
    sourceImageContentIdentity: body.sourceImageContentIdentity,
    candidateSetIdentity: `sha256:${"1".repeat(64)}`,
    sourcePixelWidth: body.sourcePixelWidth,
    sourcePixelHeight: body.sourcePixelHeight,
    goal: { id: body.goalId },
    ...(body.localCvProvenanceManifest === undefined
      ? {}
      : { localCvProvenanceDraftIdentity: `sha256:${"2".repeat(64)}` }),
    candidates: body.candidates.map((candidate, index) => candidate.kind === "rectangle"
      ? {
        id: candidate.id,
        label: `Cadre lié ${String(index + 1)}`,
        x: candidate.x,
        y: candidate.y,
        width: candidate.width,
        height: candidate.height,
        primitive: { kind: "rectangle" },
      }
      : {
        id: candidate.id,
        label: `Segment lié ${String(index + 1)}`,
        x: Math.min(candidate.start.x, candidate.end.x),
        y: Math.min(candidate.start.y, candidate.end.y),
        width: Math.abs(candidate.end.x - candidate.start.x),
        height: Math.abs(candidate.end.y - candidate.start.y),
        primitive: {
          kind: "segment",
          start: candidate.start,
          end: candidate.end,
        },
      }),
  };
}

async function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter((value) => typeof value === "string" && value.length > 0);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue through the bounded local executable list.
    }
  }
  throw new Error("Chrome is required for the rendered local CV test.");
}

async function launchChrome(chromePath) {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "norma-local-cv-chrome-"));
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
    throw new Error(
      result.exceptionDetails.exception?.description
      ?? result.exceptionDetails.text,
    );
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

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Local CV test server did not expose a numeric port."));
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

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 256_000) reject(new Error("Request body exceeded the test bound."));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, value) {
  const body = JSON.stringify(value);
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json; charset=utf-8",
  });
  response.end(body);
}
