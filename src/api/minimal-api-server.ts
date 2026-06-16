import { verifyArtifactFreshness } from "../artifact-freshness.js";
import { CORE_VERSION } from "../core-constants.js";
import { createMvpDemoInput, runMvpDemo } from "../mvp-demo.js";
import { replayRun } from "../run-replay.js";
import { verifyRun } from "../run-verification.js";
import { serializeCanonicalJson, STABLE_SERIALIZATION_VERSION } from "../serialization.js";

export const NORMA_API_APPROVED_ROUTES = [
  "GET /version",
  "POST /canonical-json",
  "POST /verify-run",
  "POST /verify-artifact-freshness",
  "POST /replay-mvp-demo",
] as const;

export const NORMA_API_BLOCKED_ROUTES = [
  "POST /replay-run",
  "POST /create-pack",
  "POST /create-rule",
  "POST /create-ratio",
  "POST /create-geometry",
  "POST /infer-intent",
  "POST /recommend",
  "POST /rank-beauty",
  "POST /read-file",
  "POST /write-file",
  "POST /fetch-url",
  "POST /run-shell",
] as const;

export const NORMA_API_MAX_BODY_BYTES = 65_536;
export const NORMA_API_MAX_JSON_DEPTH = 32;
export const NORMA_API_MAX_ARRAY_LENGTH = 1_024;
export const NORMA_API_MAX_STRING_LENGTH = 16_384;

export interface NormaApiRequest {
  readonly method: string;
  readonly path: string;
  readonly bodyText?: string;
  readonly headers?: Readonly<Record<string, string | undefined>>;
}

export interface NormaApiResponse {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Readonly<Record<string, unknown>>;
}

type ApprovedRoute = (typeof NORMA_API_APPROVED_ROUTES)[number];
type BlockedRoute = (typeof NORMA_API_BLOCKED_ROUTES)[number];
type Route = ApprovedRoute | BlockedRoute | `${string} ${string}`;
type JsonObject = Record<string, unknown>;
type RouteHandler = (request: NormaApiRequest, parts: RequestParts) => NormaApiResponse;
type InputOperation = (input: never) => unknown;

interface RequestParts {
  readonly method: string;
  readonly path: string;
  readonly route: Route;
  readonly hasQuery: boolean;
}

type JsonBodyParseResult =
  | { readonly ok: true; readonly body: JsonObject }
  | { readonly ok: false; readonly response: NormaApiResponse };

interface JsonLimitIssue {
  readonly code: string;
  readonly message: string;
}

const invalidPayloadIssue = Object.freeze({
  code: "InvalidPayload",
  message: "Request payload is not supported.",
});

const responseHeaders = Object.freeze({
  "content-type": "application/json; charset=utf-8",
});

const bodyEncoder = new TextEncoder();

const approvedRouteHandlers = Object.freeze({
  "GET /version": handleVersion,
  "POST /canonical-json": handleCanonicalJson,
  "POST /verify-run": handleVerifyRun,
  "POST /verify-artifact-freshness": handleVerifyArtifactFreshness,
  "POST /replay-mvp-demo": handleReplayMvpDemo,
} satisfies Record<ApprovedRoute, RouteHandler>);

export function handleNormaApiRequest(request: NormaApiRequest): NormaApiResponse {
  const parts = requestParts(request);

  if (parts.hasQuery) {
    return rejected(parts, 400, "QueryStringUnsupported", "Query strings are not supported.");
  }

  if (isBlockedRoute(parts.route)) {
    return rejected(parts, 403, "RouteBlocked", "Route is blocked.");
  }

  const handler = isApprovedRoute(parts.route) ? approvedRouteHandlers[parts.route] : undefined;
  if (handler === undefined) {
    return routeFailure(parts);
  }

  return handler(request, parts);
}

function handleVersion(request: NormaApiRequest, parts: RequestParts): NormaApiResponse {
  if (request.bodyText !== undefined && request.bodyText.length > 0) {
    return rejected(parts, 400, "BodyNotAllowed", "This route does not accept a request body.");
  }

  return ok(parts, {
    coreVersion: CORE_VERSION,
    serializationVersion: STABLE_SERIALIZATION_VERSION,
    capabilities: {
      localOnly: true,
      remoteMcp: false,
      deployment: false,
      providerCompatibility: false,
      approvedRoutes: NORMA_API_APPROVED_ROUTES,
      blockedRoutes: NORMA_API_BLOCKED_ROUTES,
      limits: {
        maxBodyBytes: NORMA_API_MAX_BODY_BYTES,
        maxJsonDepth: NORMA_API_MAX_JSON_DEPTH,
        maxArrayLength: NORMA_API_MAX_ARRAY_LENGTH,
        maxStringLength: NORMA_API_MAX_STRING_LENGTH,
      },
    },
  });
}

function handleCanonicalJson(request: NormaApiRequest, parts: RequestParts): NormaApiResponse {
  const parsed = parseJsonObjectBody(request, parts);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payloadIssue = canonicalJsonPayloadIssue(parsed.body);
  if (payloadIssue !== null) {
    return rejected(parts, 400, payloadIssue.code, payloadIssue.message);
  }

  try {
    return ok(parts, {
      serializationVersion: STABLE_SERIALIZATION_VERSION,
      canonicalJson: serializeCanonicalJson(parsed.body.value),
    });
  } catch {
    return failed(parts, "InternalError", "Internal error.");
  }
}

function handleVerifyRun(request: NormaApiRequest, parts: RequestParts): NormaApiResponse {
  return handleInputRoute(request, parts, verifyRun as InputOperation);
}

function handleVerifyArtifactFreshness(request: NormaApiRequest, parts: RequestParts): NormaApiResponse {
  return handleInputRoute(request, parts, verifyArtifactFreshness as InputOperation);
}

function handleInputRoute(
  request: NormaApiRequest,
  parts: RequestParts,
  operation: InputOperation,
): NormaApiResponse {
  const parsed = parseJsonObjectBody(request, parts);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payloadIssue = inputPayloadIssue(parsed.body);
  if (payloadIssue !== null) {
    return rejected(parts, 400, payloadIssue.code, payloadIssue.message);
  }

  try {
    return ok(parts, {
      result: operation(parsed.body.input as never),
    });
  } catch {
    return failed(parts, "InternalError", "Internal error.");
  }
}

function handleReplayMvpDemo(request: NormaApiRequest, parts: RequestParts): NormaApiResponse {
  const parsed = parseJsonObjectBody(request, parts);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payloadIssue = emptyPayloadIssue(parsed.body);
  if (payloadIssue !== null) {
    return rejected(parts, 400, payloadIssue.code, payloadIssue.message);
  }

  try {
    return ok(parts, {
      result: replayFixedMvpDemo(),
    });
  } catch {
    return failed(parts, "InternalError", "Internal error.");
  }
}

function replayFixedMvpDemo(): unknown {
  const mvpDemoInput = createMvpDemoInput();
  const mvpDemoOutput = requireMvpDemoOutput(runMvpDemo(mvpDemoInput));

  return replayRun({
    run: mvpDemoOutput.runEnvelope,
    mvpDemoInput,
    recordedMvpResult: mvpDemoOutput,
    packLock: mvpDemoOutput.packLock,
    operationContext: mvpDemoOutput.operationContext,
  });
}

function requireMvpDemoOutput(demoResult: ReturnType<typeof runMvpDemo>): NonNullable<typeof demoResult.output> {
  if (demoResult.status !== "ok" || demoResult.output === null) {
    throw new Error("Fixed demo unavailable.");
  }

  return demoResult.output;
}

function parseJsonObjectBody(request: NormaApiRequest, parts: RequestParts): JsonBodyParseResult {
  const bodyTextResult = requestBodyText(request, parts);
  if (!bodyTextResult.ok) {
    return bodyTextResult;
  }

  const parsedResult = parseJsonText(bodyTextResult.bodyText, parts);
  if (!parsedResult.ok) {
    return parsedResult;
  }

  const limitIssue = jsonLimitIssue(parsedResult.value);
  if (limitIssue !== null) {
    return {
      ok: false,
      response: rejected(parts, 400, limitIssue.code, limitIssue.message),
    };
  }

  if (!isJsonBodyObject(parsedResult.value)) {
    return {
      ok: false,
      response: rejected(parts, 400, "InvalidJsonObject", "Request body must be a JSON object."),
    };
  }

  return {
    ok: true,
    body: parsedResult.value,
  };
}

function canonicalJsonPayloadIssue(body: JsonObject): JsonLimitIssue | null {
  return isCanonicalJsonPayload(body) ? null : invalidPayloadIssue;
}

function inputPayloadIssue(body: JsonObject): JsonLimitIssue | null {
  return hasOnlyKeys(body, ["input"]) && Object.hasOwn(body, "input") ? null : invalidPayloadIssue;
}

function emptyPayloadIssue(body: JsonObject): JsonLimitIssue | null {
  return Object.keys(body).length === 0 ? null : invalidPayloadIssue;
}

function isCanonicalJsonPayload(body: JsonObject): boolean {
  const policyIsSupported = !Object.hasOwn(body, "policy") || body.policy === STABLE_SERIALIZATION_VERSION;
  return hasOnlyKeys(body, ["value", "policy"]) && Object.hasOwn(body, "value") && policyIsSupported;
}

function requestBodyText(
  request: NormaApiRequest,
  parts: RequestParts,
):
  | { readonly ok: true; readonly bodyText: string }
  | { readonly ok: false; readonly response: NormaApiResponse } {
  if (request.bodyText === undefined || request.bodyText.length === 0) {
    return {
      ok: false,
      response: rejected(parts, 400, "BodyRequired", "JSON request body is required."),
    };
  }

  if (bodyEncoder.encode(request.bodyText).length > NORMA_API_MAX_BODY_BYTES) {
    return {
      ok: false,
      response: rejected(parts, 413, "BodyTooLarge", "Request body is too large."),
    };
  }

  return {
    ok: true,
    bodyText: request.bodyText,
  };
}

function parseJsonText(
  bodyText: string,
  parts: RequestParts,
):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly response: NormaApiResponse } {
  try {
    return {
      ok: true,
      value: JSON.parse(bodyText),
    };
  } catch {
    return {
      ok: false,
      response: rejected(parts, 400, "MalformedJson", "Request body must be valid JSON."),
    };
  }
}

function jsonLimitIssue(value: unknown, depth = 1): JsonLimitIssue | null {
  return scalarJsonLimitIssue(value, depth) ?? compositeJsonLimitIssue(value, depth);
}

function scalarJsonLimitIssue(value: unknown, depth: number): JsonLimitIssue | null {
  return depthJsonLimitIssue(depth) ?? stringJsonLimitIssue(value);
}

function compositeJsonLimitIssue(value: unknown, depth: number): JsonLimitIssue | null {
  if (Array.isArray(value)) {
    return arrayJsonLimitIssue(value, depth);
  }

  return isJsonObject(value) ? firstIssue(Object.values(value), depth + 1) : null;
}

function depthJsonLimitIssue(depth: number): JsonLimitIssue | null {
  return depth > NORMA_API_MAX_JSON_DEPTH
    ? {
        code: "JsonDepthLimitExceeded",
        message: "JSON depth limit exceeded.",
      }
    : null;
}

function stringJsonLimitIssue(value: unknown): JsonLimitIssue | null {
  return typeof value === "string" && value.length > NORMA_API_MAX_STRING_LENGTH
    ? {
        code: "JsonStringLimitExceeded",
        message: "JSON string length limit exceeded.",
      }
    : null;
}

function arrayJsonLimitIssue(value: readonly unknown[], depth: number): JsonLimitIssue | null {
  return arrayLengthLimitIssue(value) ?? firstIssue(value, depth + 1);
}

function arrayLengthLimitIssue(value: readonly unknown[]): JsonLimitIssue | null {
  return value.length > NORMA_API_MAX_ARRAY_LENGTH
    ? {
        code: "JsonArrayLimitExceeded",
        message: "JSON array length limit exceeded.",
      }
    : null;
}

function firstIssue(values: readonly unknown[], depth: number): JsonLimitIssue | null {
  for (const value of values) {
    const issue = jsonLimitIssue(value, depth);
    if (issue !== null) {
      return issue;
    }
  }

  return null;
}

function routeFailure(parts: RequestParts): NormaApiResponse {
  if (approvedPath(parts.path) || blockedPath(parts.path)) {
    return rejected(parts, 405, "MethodNotAllowed", "Method is not allowed for this route.");
  }

  return rejected(parts, 404, "RouteNotFound", "Route is not supported.");
}

function ok(parts: RequestParts, body: Readonly<Record<string, unknown>>): NormaApiResponse {
  return response(200, {
    kind: "norma-api-response",
    status: "ok",
    request: requestSummary(parts),
    ...body,
  });
}

function rejected(parts: RequestParts, statusCode: number, code: string, message: string): NormaApiResponse {
  return response(statusCode, {
    kind: "norma-api-error",
    status: "rejected",
    request: requestSummary(parts),
    error: {
      code,
      message,
    },
  });
}

function failed(parts: RequestParts, code: string, message: string): NormaApiResponse {
  return response(500, {
    kind: "norma-api-error",
    status: "failed",
    request: requestSummary(parts),
    error: {
      code,
      message,
    },
  });
}

function response(statusCode: number, body: Readonly<Record<string, unknown>>): NormaApiResponse {
  return {
    statusCode,
    headers: responseHeaders,
    body,
  };
}

function requestSummary(parts: RequestParts): Readonly<Record<string, unknown>> {
  return {
    method: parts.method,
    path: parts.path,
    route: parts.route,
    localOnly: true,
  };
}

function requestParts(request: NormaApiRequest): RequestParts {
  const method = request.method.toUpperCase();
  const queryStart = request.path.indexOf("?");
  const path = queryStart === -1 ? request.path : request.path.slice(0, queryStart);

  return {
    method,
    path,
    route: `${method} ${path}`,
    hasQuery: queryStart !== -1,
  };
}

function isApprovedRoute(route: string): route is ApprovedRoute {
  return (NORMA_API_APPROVED_ROUTES as readonly string[]).includes(route);
}

function isBlockedRoute(route: string): route is BlockedRoute {
  return (NORMA_API_BLOCKED_ROUTES as readonly string[]).includes(route);
}

function approvedPath(path: string): boolean {
  return NORMA_API_APPROVED_ROUTES.some((route) => route.endsWith(` ${path}`));
}

function blockedPath(path: string): boolean {
  return NORMA_API_BLOCKED_ROUTES.some((route) => route.endsWith(` ${path}`));
}

function hasOnlyKeys(record: Readonly<Record<string, unknown>>, allowedKeys: readonly string[]): boolean {
  return Object.keys(record).every((key) => allowedKeys.includes(key));
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function isJsonBodyObject(value: unknown): value is JsonObject {
  return isJsonObject(value) && !Array.isArray(value);
}
