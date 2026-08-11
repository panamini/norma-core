import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { StreamableHTTPServerTransportOptions } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import {
  handleMcpJsonRpcRequest,
  STRUCTURED_ANALYSIS_MCP_TOOL,
} from "./stdio-protocol.js";
import {
  createPersonalVisualHarmonyMcpServerV1,
  PERSONAL_VISUAL_HARMONY_CONFIRM_MEASUREMENT_PAIR_TOOL,
  PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
  PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
  PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
  PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
  PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
  PersonalVisualHarmonySessionServiceV1,
} from "./personal-visual-harmony-app.js";
import type {
  InMemoryPersonalVisualHarmonyPerceptionJobService,
} from "../personal-visual-harmony-perception-jobs.js";
import {
  createRemoteMcpAccessTokenVerifier,
} from "./remote-http-auth.js";
import type {
  RemoteMcpAccessTokenVerifier,
  VerifiedRemoteMcpAccess,
} from "./remote-http-auth.js";
import type { RemoteMcpRevocationRegistry } from "./remote-http-revocation.js";
import { AuthorizationDataAccessDeniedError } from "./remote-http-authorization-data.js";
import type {
  AuthorizationDataAdapter,
  PostgreSqlAuthorizationPool,
} from "./remote-http-authorization-data.js";
import {
  loadRemoteMcpRuntimeConfig,
  REMOTE_MCP_MAX_ARRAY_ELEMENTS,
  REMOTE_MCP_MAX_JSON_DEPTH,
  REMOTE_MCP_MAX_REQUEST_BYTES,
  REMOTE_MCP_MAX_STRING_LENGTH,
  REMOTE_MCP_REQUEST_TIMEOUT_MS,
  REMOTE_MCP_SERVER_NAME,
  REMOTE_MCP_SERVER_VERSION,
  REMOTE_MCP_SUPPORTED_PROTOCOL_VERSIONS,
} from "./remote-http-config.js";
import type { RemoteMcpRuntimeConfig } from "./remote-http-config.js";
import { RemoteMcpAdmissionController } from "./remote-http-limits.js";
import type { RemoteMcpAdmissionKind } from "./remote-http-limits.js";
import {
  createPostgreSqlSandboxAuthorizationDataAdapter,
  POSTGRESQL_SANDBOX_SETTING_NAMES,
} from "./remote-http-postgresql-sandbox.js";

const REMOTE_TOOL_NAME = "norma.analyzeStructuredCompositionV1";
const REMOTE_TOOL_SECURITY_SCHEMES = [{
  type: "oauth2",
  scopes: ["norma:structured_analyze"],
}] as const;
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const MCP_PATH = "/mcp";
const HEALTH_PATH = "/healthz";
const READY_PATH = "/readyz";
const ROOT_PROTECTED_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

type RemoteMcpStableErrorCode =
  | "authentication_required"
  | "unauthorized_rate_limited"
  | "host_rejected"
  | "origin_rejected"
  | "method_not_allowed"
  | "unsupported_media_type"
  | "payload_too_large"
  | "invalid_json"
  | "json_depth_exceeded"
  | "json_string_exceeded"
  | "json_array_elements_exceeded"
  | "protocol_rejected"
  | "authorization_context_required"
  | "authorization_context_denied"
  | "authenticated_capacity"
  | "subject_rate"
  | "subject_concurrency"
  | "request_timeout"
  | "internal_error";

export interface RemoteMcpLogEvent {
  readonly requestId: string;
  readonly timestamp: string;
  readonly route: "/mcp";
  readonly tool:
    | typeof REMOTE_TOOL_NAME
    | typeof PERSONAL_VISUAL_HARMONY_PREPARE_TOOL
    | typeof PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL
    | typeof PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL
    | typeof PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL
    | typeof PERSONAL_VISUAL_HARMONY_CONFIRM_MEASUREMENT_PAIR_TOOL
    | typeof PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL
    | "mcp";
  readonly outcome: "allow" | "deny";
  readonly status: number;
  readonly errorCode?: RemoteMcpStableErrorCode;
  readonly subjectId?: string;
  readonly scopes: readonly string[];
  readonly latencyBucket: "under_100ms" | "under_1s" | "under_10s" | "timeout";
  readonly payloadSizeBucket: "none" | "under_16k" | "under_128k" | "under_512k" | "over_limit";
  readonly protocolVersion?: string;
}

export interface RemoteMcpRuntimeDependencies {
  readonly verifyAccessToken?: RemoteMcpAccessTokenVerifier;
  readonly admissionController?: RemoteMcpAdmissionController;
  readonly personalVisualHarmonyService?: PersonalVisualHarmonySessionServiceV1;
  readonly personalVisualHarmonyPerceptionJobs?: InMemoryPersonalVisualHarmonyPerceptionJobService;
  readonly authorizationDataAdapter?: AuthorizationDataAdapter;
  readonly postgresqlPool?: PostgreSqlAuthorizationPool;
  readonly revocationRegistry?: RemoteMcpRevocationRegistry;
  readonly log?: (event: RemoteMcpLogEvent) => void;
}

export function createRemoteMcpHttpServer(
  config: RemoteMcpRuntimeConfig,
  dependencies: RemoteMcpRuntimeDependencies = {},
): Server {
  if (config.revocationMode === "postgresql" && dependencies.revocationRegistry === undefined) {
    throw new Error(
      "NORMA_MCP_REVOCATION_MODE=postgresql requires an injected revocation registry",
    );
  }
  if (config.revocationMode === "postgresql" && dependencies.verifyAccessToken !== undefined) {
    throw new Error(
      "NORMA_MCP_REVOCATION_MODE=postgresql does not allow a custom access-token verifier",
    );
  }
  const verifyAccessToken = dependencies.verifyAccessToken
    ?? createRemoteMcpAccessTokenVerifier(
      config,
      dependencies.revocationRegistry === undefined
        ? {}
        : { revocationRegistry: dependencies.revocationRegistry },
    );
  const admissionController = dependencies.admissionController ?? new RemoteMcpAdmissionController();
  const personalVisualHarmonyService = dependencies.personalVisualHarmonyService
    ?? new PersonalVisualHarmonySessionServiceV1();
  const personalVisualHarmonyPerceptionJobs = dependencies.personalVisualHarmonyPerceptionJobs;
  const authorizationDataAdapter = config.authorizationDataMode === "postgresql"
    ? configuredAuthorizationDataAdapter(config, dependencies.postgresqlPool)
    : dependencies.authorizationDataAdapter;
  const log = dependencies.log ?? ((event: RemoteMcpLogEvent) => console.log(JSON.stringify(event)));

  return createServer(async (request, response) => {
    try {
      await routeRequest(
        config,
        verifyAccessToken,
        admissionController,
        personalVisualHarmonyService,
        personalVisualHarmonyPerceptionJobs,
        authorizationDataAdapter,
        log,
        request,
        response,
      );
    } catch {
      if (!response.headersSent && !response.writableEnded) {
        sendJson(response, 500, stableError("internal_error", randomUUID()));
      }
    }
  });
}

export function createRemoteMcpHttpServerFromEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: RemoteMcpRuntimeDependencies = {},
): { readonly config: RemoteMcpRuntimeConfig; readonly server: Server } {
  const config = loadRemoteMcpRuntimeConfig(environment);
  return { config, server: createRemoteMcpHttpServer(config, dependencies) };
}

function configuredAuthorizationDataAdapter(
  config: RemoteMcpRuntimeConfig,
  postgresqlPool: PostgreSqlAuthorizationPool | undefined,
): AuthorizationDataAdapter | undefined {
  if (config.authorizationDataMode !== "postgresql") {
    return undefined;
  }
  if (postgresqlPool === undefined) {
    throw new Error(
      "NORMA_MCP_AUTHZ_DATA_MODE=postgresql requires an injected PostgreSQL pool",
    );
  }
  return createPostgreSqlSandboxAuthorizationDataAdapter({
    pool: postgresqlPool,
    requiredScope: "norma:structured-analyze",
    settingNames: POSTGRESQL_SANDBOX_SETTING_NAMES,
  });
}

async function routeRequest(
  config: RemoteMcpRuntimeConfig,
  verifyAccessToken: RemoteMcpAccessTokenVerifier,
  admissionController: RemoteMcpAdmissionController,
  personalVisualHarmonyService: PersonalVisualHarmonySessionServiceV1,
  personalVisualHarmonyPerceptionJobs: InMemoryPersonalVisualHarmonyPerceptionJobService | undefined,
  authorizationDataAdapter: AuthorizationDataAdapter | undefined,
  log: (event: RemoteMcpLogEvent) => void,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const method = request.method ?? "GET";
  const pathname = requestPathname(request.url);

  if (method === "GET" && (pathname === HEALTH_PATH || pathname === READY_PATH)) {
    sendJson(response, 200, {
      status: "ok",
      service: REMOTE_MCP_SERVER_NAME,
      version: REMOTE_MCP_SERVER_VERSION,
    });
    return;
  }

  if (
    method === "GET" &&
    (pathname === ROOT_PROTECTED_RESOURCE_METADATA_PATH || pathname === protectedResourceMetadataPath(config))
  ) {
    sendJson(response, 200, {
      resource: config.resourceUrl.href,
      authorization_servers: [config.authorizationServerUrl.href],
      scopes_supported: [config.authorizationScope],
      bearer_methods_supported: ["header"],
    });
    return;
  }

  if (pathname !== MCP_PATH) {
    sendJson(response, 404, stableError("method_not_allowed", randomUUID()));
    return;
  }

  if (method !== "POST") {
    response.setHeader("allow", "POST");
    sendJson(response, 405, stableError("method_not_allowed", randomUUID()));
    return;
  }

  const requestId = randomUUID();
  const startedAt = Date.now();
  if (!hasTrustedHost(config, request.headers.host, request.headers["x-forwarded-host"])) {
    rejectBeforeAuthentication(config, admissionController, log, response, requestId, startedAt, "host_rejected", 400);
    return;
  }
  if (!hasAllowedOrigin(config, request.headers.origin)) {
    rejectBeforeAuthentication(config, admissionController, log, response, requestId, startedAt, "origin_rejected", 403);
    return;
  }

  const token = bearerToken(request.headers.authorization);
  const authenticationAdmission = admissionController.enterAuthenticationAttempt();
  if (!authenticationAdmission.allowed) {
    response.setHeader("www-authenticate", bearerChallenge(config));
    sendJson(response, 429, stableError("unauthorized_rate_limited", requestId));
    logEvent(log, requestId, startedAt, 429, "unauthorized_rate_limited", undefined, [], 0, undefined);
    return;
  }
  let access: VerifiedRemoteMcpAccess;
  try {
    const authenticationTask = token === null
      ? Promise.reject(new Error("missing token"))
      : verifyAccessToken(token);
    access = await withRemoteMcpAdmissionDeadline(
      authenticationTask,
      remainingRequestTime(startedAt),
      authenticationAdmission.release,
      () => {},
    );
  } catch (error) {
    if (error instanceof RemoteMcpRequestTimeoutError) {
      sendJson(response, 504, stableError("request_timeout", requestId));
      logEvent(log, requestId, startedAt, 504, "request_timeout", undefined, [], 0, undefined);
      return;
    }
    const retained = admissionController.recordUnauthorizedAttempt();
    const code = retained ? "authentication_required" : "unauthorized_rate_limited";
    response.setHeader("www-authenticate", bearerChallenge(config));
    sendJson(response, retained ? 401 : 429, stableError(code, requestId));
    logEvent(log, requestId, startedAt, retained ? 401 : 429, code, undefined, [], 0, undefined);
    return;
  }

  const abortController = new AbortController();
  let releaseAdmission = (): void => {};
  const requestTask = handleAuthenticatedPost(
    config,
    request,
    response,
    requestId,
    access,
    personalVisualHarmonyService,
    personalVisualHarmonyPerceptionJobs,
    admissionController,
    authorizationDataAdapter,
    log,
    startedAt,
    (release) => {
      releaseAdmission = release;
    },
    abortController.signal,
  );
  try {
    await withRemoteMcpAdmissionDeadline(
      requestTask,
      remainingRequestTime(startedAt),
      () => releaseAdmission(),
      () => {
        abortController.abort();
        if (!request.destroyed) {
          request.destroy();
        }
      },
    );
  } catch (error) {
    if (error instanceof RemoteMcpRequestTimeoutError) {
      if (!response.headersSent && !response.writableEnded) {
        sendJson(response, 504, stableError("request_timeout", requestId));
      }
      logEvent(log, requestId, startedAt, 504, "request_timeout", access, access.scopes, 0, undefined);
      return;
    }
    if (!response.headersSent && !response.writableEnded) {
      sendJson(response, 500, stableError("internal_error", requestId));
    }
    logEvent(log, requestId, startedAt, 500, "internal_error", access, access.scopes, 0, undefined);
  }
}

function remainingRequestTime(startedAt: number): number {
  return Math.max(1, REMOTE_MCP_REQUEST_TIMEOUT_MS - (Date.now() - startedAt));
}

async function handleAuthenticatedPost(
  config: RemoteMcpRuntimeConfig,
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  access: VerifiedRemoteMcpAccess,
  personalVisualHarmonyService: PersonalVisualHarmonySessionServiceV1,
  personalVisualHarmonyPerceptionJobs: InMemoryPersonalVisualHarmonyPerceptionJobService | undefined,
  admissionController: RemoteMcpAdmissionController,
  authorizationDataAdapter: AuthorizationDataAdapter | undefined,
  log: (event: RemoteMcpLogEvent) => void,
  startedAt: number,
  setAdmissionRelease: (release: () => void) => void,
  abortSignal: AbortSignal,
): Promise<void> {
  assertRemoteMcpNotAborted(abortSignal);
  const admission = admissionController.enterAuthenticatedAttempt(access.subjectId, "non_action");
  if (!admission.allowed) {
    sendJson(response, 429, stableError(admission.code, requestId));
    logEvent(log, requestId, startedAt, 429, admission.code, access, access.scopes, 0, undefined);
    return;
  }
  setAdmissionRelease(admission.release);

  if (!isJsonContentType(request.headers["content-type"])) {
    sendJson(response, 415, stableError("unsupported_media_type", requestId));
    logEvent(log, requestId, startedAt, 415, "unsupported_media_type", access, access.scopes, 0, undefined);
    return;
  }

  const contentLength = parseContentLength(request.headers["content-length"]);
  if (contentLength !== null && contentLength > REMOTE_MCP_MAX_REQUEST_BYTES) {
    sendJson(response, 413, stableError("payload_too_large", requestId));
    logEvent(log, requestId, startedAt, 413, "payload_too_large", access, access.scopes, contentLength, undefined);
    return;
  }

  const body = await readRequestBody(request, abortSignal);
  assertRemoteMcpNotAborted(abortSignal);
  if (body.byteLength > REMOTE_MCP_MAX_REQUEST_BYTES) {
    sendJson(response, 413, stableError("payload_too_large", requestId));
    logEvent(log, requestId, startedAt, 413, "payload_too_large", access, access.scopes, body.byteLength, undefined);
    return;
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    sendJson(response, 400, stableError("invalid_json", requestId));
    logEvent(log, requestId, startedAt, 400, "invalid_json", access, access.scopes, body.byteLength, undefined);
    return;
  }

  const limitFailure = validateRemoteMcpJsonLimits(parsedBody);
  if (limitFailure !== null) {
    sendJson(response, 400, stableError(limitFailure, requestId));
    logEvent(log, requestId, startedAt, 400, limitFailure, access, access.scopes, body.byteLength, undefined);
    return;
  }

  const protocolVersion = remoteMcpProtocolVersion(parsedBody, request.headers["mcp-protocol-version"]);
  if (protocolVersion === null) {
    sendJson(response, 400, stableError("protocol_rejected", requestId));
    logEvent(log, requestId, startedAt, 400, "protocol_rejected", access, access.scopes, body.byteLength, undefined);
    return;
  }

  if (authorizationDataAdapter !== undefined && access.authorizationContext === undefined) {
    sendJson(response, 403, stableError("authorization_context_required", requestId));
    logEvent(log, requestId, startedAt, 403, "authorization_context_required", access, access.scopes, body.byteLength, protocolVersion);
    return;
  }

  const tool = remoteMcpLogTool(parsedBody);
  if (remoteMcpAdmissionKind(parsedBody) === "action") {
    const actionPromotion = admission.promoteToAction();
    if (!actionPromotion.allowed) {
      sendJson(response, 429, stableError(actionPromotion.code, requestId));
      logEvent(log, requestId, startedAt, 429, actionPromotion.code, access, access.scopes, body.byteLength, protocolVersion, tool);
      return;
    }
  }

  const mcpServer = createRequestMcpServer(
    personalVisualHarmonyService,
    access.subjectId,
    personalVisualHarmonyPerceptionJobs,
  );
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  } as unknown as StreamableHTTPServerTransportOptions);
  let closePromise: Promise<void> | undefined;
  const closeResources = (): Promise<void> => {
    closePromise ??= Promise.all([
      transport.close().catch(() => undefined),
      mcpServer.close().catch(() => undefined),
    ]).then(() => undefined);
    return closePromise;
  };
  const abortListener = (): void => {
    void closeResources();
  };
  abortSignal.addEventListener("abort", abortListener, { once: true });
  if (abortSignal.aborted) {
    abortListener();
  }
  const authenticatedRequest = request as IncomingMessage & {
    auth?: {
      token: string;
      clientId: string;
      scopes: string[];
      expiresAt: number;
      resource: URL;
      extra: Readonly<Record<string, unknown>>;
    };
  };
  const authBase = {
    token: access.rawToken,
    clientId: access.clientId,
    scopes: [...access.scopes],
    expiresAt: access.expiresAt,
    resource: config.resourceUrl,
    extra: { subjectId: access.subjectId },
  };
  authenticatedRequest.auth = authBase;

  try {
    const handleTransportRequest = async (): Promise<void> => {
      assertRemoteMcpNotAborted(abortSignal);
      // SDK 1.29.0's optional callback types are not exactOptionalPropertyTypes-clean.
      await mcpServer.connect(transport as never);
      assertRemoteMcpNotAborted(abortSignal);
      await transport.handleRequest(authenticatedRequest, response, parsedBody);
      assertRemoteMcpNotAborted(abortSignal);
    };
    if (authorizationDataAdapter === undefined) {
      await handleTransportRequest();
    } else {
      await authorizationDataAdapter.withTransaction(access.authorizationContext, handleTransportRequest);
    }
    if (!response.headersSent && !response.writableEnded) {
      sendJson(response, 500, stableError("internal_error", requestId));
      logEvent(log, requestId, startedAt, 500, "internal_error", access, access.scopes, body.byteLength, protocolVersion, tool);
      return;
    }
    logEvent(log, requestId, startedAt, response.statusCode, undefined, access, access.scopes, body.byteLength, protocolVersion, tool);
  } catch (error) {
    if (error instanceof AuthorizationDataAccessDeniedError) {
      if (!response.headersSent && !response.writableEnded) {
        sendJson(response, 403, stableError("authorization_context_denied", requestId));
      }
      logEvent(log, requestId, startedAt, 403, "authorization_context_denied", access, access.scopes, body.byteLength, protocolVersion, tool);
      return;
    }
    throw error;
  } finally {
    abortSignal.removeEventListener("abort", abortListener);
    await closeResources();
  }
}

function createRequestMcpServer(
  service: PersonalVisualHarmonySessionServiceV1,
  subjectId: string,
  perceptionJobs: InMemoryPersonalVisualHarmonyPerceptionJobService | undefined,
): McpServer {
  const server = createPersonalVisualHarmonyMcpServerV1({
    service,
    subjectId,
    ...(perceptionJobs === undefined ? {} : { perceptionJobs }),
    serverInfo: {
      name: REMOTE_MCP_SERVER_NAME,
      version: REMOTE_MCP_SERVER_VERSION,
    },
  });
  const requestHandlers = (server.server as unknown as {
    readonly _requestHandlers: Map<string, (request: unknown, extra: unknown) => Promise<Record<string, unknown>>>;
  })._requestHandlers;
  const personalListHandler = requestHandlers.get("tools/list");
  const personalCallHandler = requestHandlers.get("tools/call");
  if (personalListHandler === undefined || personalCallHandler === undefined) {
    throw new Error("Personal visual harmony MCP handlers are unavailable.");
  }

  server.server.removeRequestHandler("tools/list");
  server.server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const personalResult = await personalListHandler(request, extra) as {
      readonly tools: readonly Record<string, unknown>[];
    };
    return {
      tools: [
        ...personalResult.tools.map((tool) => ({
          ...tool,
          securitySchemes: REMOTE_TOOL_SECURITY_SCHEMES,
          _meta: {
            ...(typeof tool._meta === "object" && tool._meta !== null ? tool._meta : {}),
            securitySchemes: REMOTE_TOOL_SECURITY_SCHEMES,
          },
        })),
        {
          ...STRUCTURED_ANALYSIS_MCP_TOOL,
          securitySchemes: REMOTE_TOOL_SECURITY_SCHEMES,
          _meta: { securitySchemes: REMOTE_TOOL_SECURITY_SCHEMES },
        },
      ],
    };
  });

  server.server.removeRequestHandler("tools/call");
  server.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (request.params.name !== REMOTE_TOOL_NAME) {
      return await personalCallHandler(request, extra);
    }
    const localResponse = handleMcpJsonRpcRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: REMOTE_TOOL_NAME,
        ...(request.params.arguments === undefined ? {} : { arguments: request.params.arguments }),
      },
    });
    if (localResponse === null || !("result" in localResponse)) {
      throw new McpError(ErrorCode.InvalidParams, "Invalid params");
    }
    return localResponse.result;
  });
  return server;
}

export function validateRemoteMcpJsonLimits(value: unknown): RemoteMcpStableErrorCode | null {
  const stack: Array<{ readonly value: unknown; readonly depth: number }> = [{ value, depth: 1 }];
  let aggregateArrayElements = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      break;
    }
    if (current.depth > REMOTE_MCP_MAX_JSON_DEPTH) {
      return "json_depth_exceeded";
    }
    if (typeof current.value === "string" && current.value.length > REMOTE_MCP_MAX_STRING_LENGTH) {
      return "json_string_exceeded";
    }
    if (Array.isArray(current.value)) {
      aggregateArrayElements += current.value.length;
      if (aggregateArrayElements > REMOTE_MCP_MAX_ARRAY_ELEMENTS) {
        return "json_array_elements_exceeded";
      }
      for (const item of current.value) {
        stack.push({ value: item, depth: current.depth + 1 });
      }
      continue;
    }
    if (isRecord(current.value)) {
      for (const [key, entry] of Object.entries(current.value)) {
        if (key.length > REMOTE_MCP_MAX_STRING_LENGTH) {
          return "json_string_exceeded";
        }
        stack.push({ value: entry, depth: current.depth + 1 });
      }
    }
  }
  return null;
}

export class RemoteMcpRequestTimeoutError extends Error {
  constructor() {
    super("Remote MCP request timeout");
    this.name = "RemoteMcpRequestTimeoutError";
  }
}

export async function withRemoteMcpDeadline<T>(
  task: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void = () => undefined,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      try {
        onTimeout();
      } catch {
        // Timeout rejection remains authoritative even if cooperative cleanup fails.
      } finally {
        reject(new RemoteMcpRequestTimeoutError());
      }
    }, timeoutMs);
  });
  try {
    return await Promise.race([task, deadline]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

export async function withRemoteMcpAdmissionDeadline<T>(
  task: Promise<T>,
  timeoutMs: number,
  release: () => void,
  cancel: () => void,
): Promise<T> {
  let releaseAfterSettlement = false;
  try {
    return await withRemoteMcpDeadline(task, timeoutMs, cancel);
  } catch (error) {
    if (error instanceof RemoteMcpRequestTimeoutError) {
      releaseAfterSettlement = true;
      void task.then(release, release);
    }
    throw error;
  } finally {
    if (!releaseAfterSettlement) {
      release();
    }
  }
}

function remoteMcpProtocolVersion(body: unknown, header: string | readonly string[] | undefined): string | null {
  if (!isRecord(body) || Array.isArray(body)) {
    return null;
  }
  const headerValue = singleHeader(header);
  if (body.method === "initialize") {
    const params = isRecord(body.params) ? body.params : null;
    const requested = params?.protocolVersion;
    if (!isSupportedProtocolVersion(requested)) {
      return null;
    }
    if (headerValue !== null && headerValue !== requested) {
      return null;
    }
    return requested;
  }
  return isSupportedProtocolVersion(headerValue) ? headerValue : null;
}

function isSupportedProtocolVersion(value: unknown): value is typeof REMOTE_MCP_SUPPORTED_PROTOCOL_VERSIONS[number] {
  return typeof value === "string" && REMOTE_MCP_SUPPORTED_PROTOCOL_VERSIONS.some((version) => version === value);
}

function hasTrustedHost(
  config: RemoteMcpRuntimeConfig,
  hostHeader: string | readonly string[] | undefined,
  forwardedHostHeader: string | readonly string[] | undefined,
): boolean {
  const host = singleHeader(hostHeader);
  const forwardedHost = forwardedHostHeader === undefined ? config.publicUrl.host : singleHeader(forwardedHostHeader);
  return host === config.publicUrl.host && forwardedHost === config.publicUrl.host;
}

function hasAllowedOrigin(config: RemoteMcpRuntimeConfig, header: string | readonly string[] | undefined): boolean {
  if (header === undefined) {
    return true;
  }
  const origin = singleHeader(header);
  return origin !== null && config.allowedOrigins.has(origin);
}

function bearerToken(header: string | readonly string[] | undefined): string | null {
  const value = singleHeader(header);
  if (value === null) {
    return null;
  }
  const match = /^Bearer ([A-Za-z0-9._~+/=-]+)$/u.exec(value);
  return match?.[1] ?? null;
}

function bearerChallenge(config: RemoteMcpRuntimeConfig): string {
  const metadataUrl = new URL(protectedResourceMetadataPath(config), config.publicUrl);
  return `Bearer resource_metadata="${metadataUrl.href}", scope="${config.authorizationScope}"`;
}

function protectedResourceMetadataPath(config: RemoteMcpRuntimeConfig): string {
  return `/.well-known/oauth-protected-resource${config.resourceUrl.pathname}`;
}

function rejectBeforeAuthentication(
  config: RemoteMcpRuntimeConfig,
  controller: RemoteMcpAdmissionController,
  log: (event: RemoteMcpLogEvent) => void,
  response: ServerResponse,
  requestId: string,
  startedAt: number,
  code: "host_rejected" | "origin_rejected",
  status: number,
): void {
  const retained = controller.recordUnauthorizedAttempt();
  const effectiveCode = retained ? code : "unauthorized_rate_limited";
  response.setHeader("www-authenticate", bearerChallenge(config));
  sendJson(response, retained ? status : 429, stableError(effectiveCode, requestId));
  logEvent(log, requestId, startedAt, retained ? status : 429, effectiveCode, undefined, [], 0, undefined);
}

function stableError(code: RemoteMcpStableErrorCode, requestId: string): Readonly<Record<string, unknown>> {
  return {
    error: {
      code,
      message: "Request rejected",
      requestId,
    },
  };
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", JSON_CONTENT_TYPE);
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.end(JSON.stringify(body));
}

function logEvent(
  log: (event: RemoteMcpLogEvent) => void,
  requestId: string,
  startedAt: number,
  status: number,
  errorCode: RemoteMcpStableErrorCode | undefined,
  access: VerifiedRemoteMcpAccess | undefined,
  scopes: readonly string[],
  payloadBytes: number,
  protocolVersion: string | undefined,
  tool: RemoteMcpLogEvent["tool"] = "mcp",
): void {
  const duration = Date.now() - startedAt;
  const base = {
    requestId,
    timestamp: new Date().toISOString(),
    route: "/mcp" as const,
    tool,
    outcome: errorCode === undefined && status < 400 ? "allow" as const : "deny" as const,
    status,
    scopes,
    latencyBucket: latencyBucket(duration),
    payloadSizeBucket: payloadSizeBucket(payloadBytes),
  };
  log({
    ...base,
    ...(errorCode === undefined ? {} : { errorCode }),
    ...(access === undefined ? {} : { subjectId: access.subjectId }),
    ...(protocolVersion === undefined ? {} : { protocolVersion }),
  });
}

function remoteMcpLogTool(body: unknown): RemoteMcpLogEvent["tool"] {
  if (!isRecord(body) || body.method !== "tools/call" || !isRecord(body.params)) {
    return "mcp";
  }
  const name = body.params.name;
  if (name === REMOTE_TOOL_NAME
    || name === PERSONAL_VISUAL_HARMONY_PREPARE_TOOL
    || name === PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL
    || name === PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL
    || name === PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL
    || name === PERSONAL_VISUAL_HARMONY_CONFIRM_MEASUREMENT_PAIR_TOOL
    || name === PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL) {
    return name;
  }
  return "mcp";
}

function remoteMcpAdmissionKind(body: unknown): RemoteMcpAdmissionKind {
  if (!isRecord(body) || body.method !== "tools/call") {
    return "non_action";
  }
  if (!isRecord(body.params)) {
    return "action";
  }
  return body.params.name === PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL
    ? "non_action"
    : "action";
}

function latencyBucket(duration: number): RemoteMcpLogEvent["latencyBucket"] {
  if (duration < 100) return "under_100ms";
  if (duration < 1_000) return "under_1s";
  if (duration < REMOTE_MCP_REQUEST_TIMEOUT_MS) return "under_10s";
  return "timeout";
}

function payloadSizeBucket(bytes: number): RemoteMcpLogEvent["payloadSizeBucket"] {
  if (bytes === 0) return "none";
  if (bytes < 16_384) return "under_16k";
  if (bytes < 131_072) return "under_128k";
  if (bytes <= REMOTE_MCP_MAX_REQUEST_BYTES) return "under_512k";
  return "over_limit";
}

async function readRequestBody(request: IncomingMessage, abortSignal: AbortSignal): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of request) {
    assertRemoteMcpNotAborted(abortSignal);
    total += chunk.byteLength;
    if (total > REMOTE_MCP_MAX_REQUEST_BYTES) {
      return new Uint8Array(total);
    }
    chunks.push(chunk);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function assertRemoteMcpNotAborted(abortSignal: AbortSignal): void {
  if (abortSignal.aborted) {
    throw new RemoteMcpRequestTimeoutError();
  }
}

function isJsonContentType(header: string | readonly string[] | undefined): boolean {
  const value = singleHeader(header);
  return value !== null && value.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function parseContentLength(header: string | readonly string[] | undefined): number | null {
  const value = singleHeader(header);
  if (value === null || !/^\d+$/u.test(value)) {
    return null;
  }
  return Number(value);
}

function singleHeader(header: string | readonly string[] | undefined): string | null {
  return typeof header === "string" ? header : null;
}

function requestPathname(value: string | undefined): string {
  if (value === undefined) {
    return "/";
  }
  try {
    return new URL(value, "http://request.invalid").pathname;
  } catch {
    return "/";
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
