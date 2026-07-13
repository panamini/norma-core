import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { StreamableHTTPServerTransportOptions } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import {
  createPersonalVisualHarmonyMcpServerV1,
  PERSONAL_VISUAL_HARMONY_MCP_SERVER_NAME,
  PERSONAL_VISUAL_HARMONY_MCP_SERVER_VERSION,
  PersonalVisualHarmonySessionServiceV1,
} from "./personal-visual-harmony-app.js";

export const PERSONAL_VISUAL_HARMONY_HTTP_MAX_REQUEST_BYTES = 256 * 1_024;

const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/u;
const CHATGPT_ORIGIN = "https://chatgpt.com";
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

export interface PersonalVisualHarmonyHttpServerOptionsV1 {
  readonly accessToken: string;
  readonly service?: PersonalVisualHarmonySessionServiceV1;
  readonly maxRequestBytes?: number;
}

export interface PersonalVisualHarmonyHttpServerV1 {
  readonly server: Server;
  readonly mcpPath: string;
}

/**
 * Creates a temporary, loopback-oriented personal demo server.
 *
 * The access token is a capability embedded in the unguessable MCP path because
 * a no-auth ChatGPT development connector cannot supply a custom bearer token.
 * The caller remains responsible for binding the returned server to loopback.
 */
export function createPersonalVisualHarmonyHttpServerV1(
  options: PersonalVisualHarmonyHttpServerOptionsV1,
): PersonalVisualHarmonyHttpServerV1 {
  const accessToken = validateAccessToken(options.accessToken);
  const maxRequestBytes = validateMaxRequestBytes(
    options.maxRequestBytes ?? PERSONAL_VISUAL_HARMONY_HTTP_MAX_REQUEST_BYTES,
  );
  const service = options.service ?? new PersonalVisualHarmonySessionServiceV1();
  const mcpPath = `/personal/${accessToken}/mcp`;

  const server = createServer(async (request, response) => {
    try {
      await routeRequest(request, response, mcpPath, service, maxRequestBytes);
    } catch {
      if (!response.headersSent && !response.writableEnded) {
        sendJson(response, 500, { error: "personal_demo_internal_error" });
      }
    }
  });

  return { server, mcpPath };
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  mcpPath: string,
  service: PersonalVisualHarmonySessionServiceV1,
  maxRequestBytes: number,
): Promise<void> {
  const method = request.method ?? "GET";
  const pathname = requestPathname(request.url);

  if (method === "GET" && pathname === "/healthz") {
    sendJson(response, 200, {
      status: "ok",
      service: PERSONAL_VISUAL_HARMONY_MCP_SERVER_NAME,
      version: PERSONAL_VISUAL_HARMONY_MCP_SERVER_VERSION,
      exposure: "temporary_loopback_personal_demo",
    });
    return;
  }

  if (pathname !== mcpPath) {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  const origin = singleHeader(request.headers.origin);
  if (origin !== null && origin !== CHATGPT_ORIGIN) {
    sendJson(response, 403, { error: "origin_rejected" });
    return;
  }
  if (origin === CHATGPT_ORIGIN) setChatGptCorsHeaders(response);

  if (method === "OPTIONS") {
    if (origin !== CHATGPT_ORIGIN) {
      sendJson(response, 403, { error: "origin_rejected" });
      return;
    }
    response.statusCode = 204;
    response.setHeader("allow", "POST, OPTIONS");
    response.setHeader("cache-control", "no-store");
    response.end();
    return;
  }

  if (method !== "POST") {
    response.setHeader("allow", "POST, OPTIONS");
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  if (!isJsonContentType(request.headers["content-type"])) {
    sendJson(response, 415, { error: "unsupported_media_type" });
    return;
  }

  const contentLength = parseContentLength(request.headers["content-length"]);
  if (contentLength !== null && contentLength > maxRequestBytes) {
    sendJson(response, 413, { error: "payload_too_large" });
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

  const mcpServer = createPersonalVisualHarmonyMcpServerV1({ service });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  } as unknown as StreamableHTTPServerTransportOptions);

  try {
    await mcpServer.connect(transport as never);
    await transport.handleRequest(request, response, body.value);
    if (!response.headersSent && !response.writableEnded) {
      sendJson(response, 500, { error: "personal_demo_internal_error" });
    }
  } finally {
    await Promise.all([
      transport.close().catch(() => undefined),
      mcpServer.close().catch(() => undefined),
    ]);
  }
}

function validateAccessToken(value: string): string {
  if (!ACCESS_TOKEN_PATTERN.test(value)) {
    throw new Error("Personal demo access token must be 43-128 URL-safe characters.");
  }
  return value;
}

function validateMaxRequestBytes(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_048_576) {
    throw new Error("Personal demo request limit must be a positive integer no larger than 1 MiB.");
  }
  return value;
}

function requestPathname(rawUrl: string | undefined): string {
  try {
    return new URL(rawUrl ?? "/", "http://127.0.0.1").pathname;
  } catch {
    return "/";
  }
}

function isJsonContentType(header: string | readonly string[] | undefined): boolean {
  const value = singleHeader(header);
  return value !== null && value.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function parseContentLength(header: string | readonly string[] | undefined): number | null {
  const value = singleHeader(header);
  if (value === null) return null;
  if (!/^[0-9]+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function singleHeader(header: string | readonly string[] | undefined): string | null {
  return typeof header === "string" ? header : null;
}

async function readBoundedJsonBody(
  request: IncomingMessage,
  maxRequestBytes: number,
): Promise<
  | { readonly status: "ok"; readonly value: unknown }
  | { readonly status: "too_large" }
  | { readonly status: "invalid_json" }
> {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let tooLarge = false;
  for await (const chunkValue of request) {
    const chunk = chunkValue as Uint8Array;
    totalBytes += chunk.byteLength;
    if (totalBytes > maxRequestBytes) {
      tooLarge = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (tooLarge) return { status: "too_large" };
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return {
      status: "ok",
      value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown,
    };
  } catch {
    return { status: "invalid_json" };
  }
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  if (response.writableEnded) return;
  response.statusCode = status;
  response.setHeader("content-type", JSON_CONTENT_TYPE);
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.end(JSON.stringify(value));
}

function setChatGptCorsHeaders(response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", CHATGPT_ORIGIN);
  response.setHeader("access-control-allow-methods", "POST, OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "Accept, Content-Type, MCP-Protocol-Version, Last-Event-ID",
  );
  response.setHeader("access-control-expose-headers", "MCP-Session-Id");
  response.setHeader("access-control-max-age", "600");
  response.setHeader("vary", "Origin");
}
