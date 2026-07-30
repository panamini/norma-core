import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

import {
  PRIVATE_WEB_LAB_CONTRACT_ID,
  PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID,
  PrivateWebLabApplicationV1,
} from "../dist/src/private-web-lab.js";

export const PRIVATE_WEB_LAB_DEFAULT_PORT = 4177;
export const PRIVATE_WEB_LAB_MAX_REQUEST_BYTES = 256 * 1_024;

const RUNTIME_IDENTITY_FILES = Object.freeze([
  ...collectRuntimeIdentityFiles(
    new URL("../dist/src/", import.meta.url),
    "core-runtime",
  ),
  ["http-server", new URL("./private-web-lab-http-server.mjs", import.meta.url)],
  ["browser-runtime", new URL("./private-web-lab.js", import.meta.url)],
  ["browser-model", new URL("./private-web-lab-browser-model.js", import.meta.url)],
  ["local-cv", new URL("./private-web-lab-local-cv.js", import.meta.url)],
  ["local-cv-worker", new URL("./private-web-lab-local-cv-worker.js", import.meta.url)],
  ["document", new URL("./index.html", import.meta.url)],
  ["styles", new URL("./private-web-lab.css", import.meta.url)],
]);
export const PRIVATE_WEB_LAB_RUNTIME_IDENTITY = createPrivateWebLabRuntimeIdentity();

const STATIC_ASSETS = new Map([
  ["/", { file: "index.html", contentType: "text/html; charset=utf-8" }],
  ["/private-web-lab.css", { file: "private-web-lab.css", contentType: "text/css; charset=utf-8" }],
  ["/private-web-lab.js", { file: "private-web-lab.js", contentType: "text/javascript; charset=utf-8" }],
  ["/private-web-lab-browser-model.js", {
    file: "private-web-lab-browser-model.js",
    contentType: "text/javascript; charset=utf-8",
  }],
  ["/private-web-lab-local-cv.js", {
    file: "private-web-lab-local-cv.js",
    contentType: "text/javascript; charset=utf-8",
  }],
  ["/private-web-lab-local-cv-worker.js", {
    file: "private-web-lab-local-cv-worker.js",
    contentType: "text/javascript; charset=utf-8",
  }],
]);

export function createPrivateWebLabHttpServerV1(options = {}) {
  const application = options.application ?? new PrivateWebLabApplicationV1();
  const maxRequestBytes = boundedPositiveInteger(
    options.maxRequestBytes ?? PRIVATE_WEB_LAB_MAX_REQUEST_BYTES,
    "maxRequestBytes",
    1_048_576,
  );
  return createServer(async (request, response) => {
    try {
      await routeRequest(request, response, application, maxRequestBytes);
    } catch {
      sendJson(response, 500, { error: "private_web_lab_internal_error" });
    }
  });
}

async function routeRequest(request, response, application, maxRequestBytes) {
  if (!isTrustedLoopbackRequestV1(request)) {
    sendJson(response, 403, { error: "loopback_request_required" });
    return;
  }
  const method = request.method ?? "GET";
  const pathname = requestPathname(request.url);
  if (method === "GET" && pathname === "/healthz") {
    sendJson(response, 200, {
      status: "ok",
      contractId: PRIVATE_WEB_LAB_CONTRACT_ID,
      manualDraftContractId: PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID,
      runtimeIdentity: PRIVATE_WEB_LAB_RUNTIME_IDENTITY,
      exposure: "private_loopback_only",
      providerCalls: 0,
    });
    return;
  }
  if (method === "GET") {
    const asset = STATIC_ASSETS.get(pathname);
    if (asset === undefined) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    const body = await readFile(new URL(`./${asset.file}`, import.meta.url), "utf8");
    sendStatic(response, asset.contentType, body);
    return;
  }
  const apiPaths = new Set([
    "/api/draft",
    "/api/confirm",
    "/api/manual-draft",
    "/api/manual-confirm",
    "/api/new-measurement",
  ]);
  if (method !== "POST" || !apiPaths.has(pathname)) {
    response.setHeader("allow", "GET, POST");
    sendJson(response, method === "POST" ? 404 : 405, {
      error: method === "POST" ? "not_found" : "method_not_allowed",
    });
    return;
  }
  if (!isJsonContentType(request.headers["content-type"])) {
    sendJson(response, 415, { error: "unsupported_media_type" });
    return;
  }
  const body = await readBoundedJsonBody(request, maxRequestBytes);
  if (body.status === "too_large") {
    sendJson(response, 413, { error: "payload_too_large" });
    return;
  }
  if (body.status === "invalid_json") {
    sendJson(response, 400, { error: "invalid_json" });
    return;
  }
  try {
    const result = pathname === "/api/draft"
      ? application.prepareDraft(body.value)
      : pathname === "/api/confirm"
        ? application.confirm(body.value)
        : pathname === "/api/manual-draft"
          ? application.prepareManualDraft(body.value)
          : pathname === "/api/manual-confirm"
            ? application.confirmManual(body.value)
            : application.startNewMeasurement(body.value);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 400, {
      error: "private_web_lab_request_rejected",
      message: error instanceof Error
        ? error.message
        : "Private Web Lab request was rejected.",
    });
  }
}

function createPrivateWebLabRuntimeIdentity() {
  const hash = createHash("sha256");
  hash.update("norma.private-web-lab-runtime@2\0");
  for (const [label, file] of RUNTIME_IDENTITY_FILES) {
    hash.update(label);
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function collectRuntimeIdentityFiles(directory, labelPrefix) {
  const files = [];
  const entries = readdirSync(directory, { withFileTypes: true })
    .sort(({ name: left }, { name: right }) => left < right ? -1 : left > right ? 1 : 0);
  for (const entry of entries) {
    const label = `${labelPrefix}/${entry.name}`;
    const file = new URL(entry.name, directory);
    if (entry.isDirectory()) {
      files.push(...collectRuntimeIdentityFiles(new URL(`${entry.name}/`, directory), label));
    } else if (entry.isFile()) {
      files.push([label, file]);
    } else {
      throw new Error(`Unsupported Private Web Lab runtime entry: ${label}`);
    }
  }
  return files;
}

export function isTrustedLoopbackRequestV1(request) {
  const remoteAddress = request.socket.remoteAddress;
  if (
    remoteAddress !== "127.0.0.1"
    && remoteAddress !== "::1"
    && remoteAddress !== "::ffff:127.0.0.1"
  ) {
    return false;
  }
  const localPort = request.socket.localPort;
  const host = request.headers.host;
  if (!Number.isSafeInteger(localPort) || typeof host !== "string") return false;
  const allowedHosts = new Set([
    `127.0.0.1:${String(localPort)}`,
    `localhost:${String(localPort)}`,
    `[::1]:${String(localPort)}`,
  ]);
  if (localPort === 80) {
    allowedHosts.add("127.0.0.1");
    allowedHosts.add("localhost");
    allowedHosts.add("[::1]");
  }
  const normalizedHost = host.toLowerCase();
  if (!allowedHosts.has(normalizedHost)) return false;
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  try {
    const expectedOrigin = new URL(`http://${normalizedHost}`).origin;
    const parsedOrigin = new URL(origin);
    return (
      parsedOrigin.origin === expectedOrigin
      && parsedOrigin.pathname === "/"
      && parsedOrigin.search === ""
      && parsedOrigin.hash === ""
    );
  } catch {
    return false;
  }
}

function requestPathname(rawUrl) {
  try {
    return new URL(rawUrl ?? "/", "http://127.0.0.1").pathname;
  } catch {
    return "/";
  }
}

function isJsonContentType(value) {
  return (
    typeof value === "string" &&
    value.split(";", 1)[0]?.trim().toLowerCase() === "application/json"
  );
}

async function readBoundedJsonBody(request, maxRequestBytes) {
  const chunks = [];
  let totalBytes = 0;
  let tooLarge = false;
  for await (const chunk of request) {
    totalBytes += chunk.byteLength;
    if (totalBytes > maxRequestBytes) {
      tooLarge = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (tooLarge) return { status: "too_large" };
  const bytes = Buffer.concat(chunks);
  try {
    return {
      status: "ok",
      value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    };
  } catch {
    return { status: "invalid_json" };
  }
}

function boundedPositiveInteger(value, field, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${field} must be a positive bounded integer.`);
  }
  return value;
}

function setCommonHeaders(response) {
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("cross-origin-resource-policy", "same-origin");
  response.setHeader(
    "content-security-policy",
    "default-src 'self'; img-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
}

function sendJson(response, status, value) {
  if (response.writableEnded) return;
  response.statusCode = status;
  setCommonHeaders(response);
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

function sendStatic(response, contentType, value) {
  if (response.writableEnded) return;
  response.statusCode = 200;
  setCommonHeaders(response);
  response.setHeader("content-type", contentType);
  response.end(value);
}
