import {
  PRIVATE_DEV_LOCAL_VISUAL_MCP_OUTPUT_ARTIFACTS,
  PrivateDevLocalVisualMcpError,
  type PrivateDevLocalVisualMcpInspectionV1,
  type PrivateDevLocalVisualMcpResumeRequestV1,
  type PrivateDevLocalVisualMcpResumeResultV1,
} from "../local-report/private-dev-local-visual-mcp-orchestration.js";

export const PRIVATE_DEV_LOCAL_VISUAL_MCP_PROTOCOL_VERSION = "2025-06-18";
export const PRIVATE_DEV_LOCAL_VISUAL_MCP_SERVER_NAME =
  "norma-core-private-dev-local-visual-mcp";
export const PRIVATE_DEV_LOCAL_VISUAL_MCP_SERVER_VERSION = "0.1.0-pr134";
export const PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_REQUEST_BYTES = 512 * 1024;
export const PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_JSON_DEPTH = 64;
export const PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_STRING_LENGTH = 64 * 1024;
export const PRIVATE_DEV_LOCAL_VISUAL_MCP_TOOL_TIMEOUT_MS = 30_000;

export const PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL =
  "norma.inspectLocalVisualCandidateReviewJobV1";
export const PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL =
  "norma.resumeFinalizedLocalVisualSelectionV1";

type JsonRpcId = string | number;
type JsonRpcErrorCode = -32700 | -32600 | -32601 | -32602 | -32603;

export type PrivateDevLocalVisualMcpToolErrorCode =
  | PrivateDevLocalVisualMcpError["code"]
  | "missing_required_artifact"
  | "unsafe_artifact"
  | "artifact_too_large"
  | "malformed_artifact"
  | "output_exists"
  | "artifact_write_failed"
  | "deadline_exceeded"
  | "job_busy"
  | "internal_error";

export interface PrivateDevLocalVisualMcpRuntimeV1 {
  readonly inspect: (
    signal: AbortSignal,
  ) => Promise<PrivateDevLocalVisualMcpInspectionV1>;
  readonly resume: (
    request: PrivateDevLocalVisualMcpResumeRequestV1,
    signal: AbortSignal,
    markCommitted: () => void,
  ) => Promise<PrivateDevLocalVisualMcpResumeResultV1>;
}

interface ActiveToolCall {
  readonly id: JsonRpcId;
  readonly tool: string;
  readonly mutating: boolean;
  readonly controller: AbortController;
  timedOut: boolean;
  committed: boolean;
}

interface ParsedToolCall {
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

const requestEncoder = new TextEncoder();
const compatibleMcpProtocolVersions = new Set([
  PRIVATE_DEV_LOCAL_VISUAL_MCP_PROTOCOL_VERSION,
  "2025-11-25",
]);
const TOOL_ERROR_CODE_VALUES = Object.freeze([
  "artifact_contract_invalid", "artifact_linkage_mismatch", "invalid_resume_confirmation",
  "invalid_accepted_at", "stale_provider_execution_receipt", "stale_candidate_observation",
  "stale_human_selection", "unsafe_canonical_result", "resume_failed",
  "missing_required_artifact", "unsafe_artifact", "artifact_too_large", "malformed_artifact",
  "output_exists", "artifact_write_failed", "deadline_exceeded", "job_busy", "internal_error",
] as const satisfies readonly PrivateDevLocalVisualMcpToolErrorCode[]);
const SHA256_SCHEMA = { type: "string", pattern: "^sha256:[0-9a-f]{64}$" } as const;
const RFC3339_UTC_SCHEMA = {
  type: "string",
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$",
} as const;

const INSPECT_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "kind", "version", "status", "providerExecutionReceiptContentIdentity",
    "candidateObservationContentIdentity", "humanSelectionContentIdentity",
    "candidateCount", "selectedCandidateCount", "resumeAllowed", "logicalArtifacts",
    "acceptedGeometryProduced", "coreInputProduced", "structuredAnalyzeRun",
    "resultJsonProduced", "networkTransportUsed", "redacted",
  ],
  properties: {
    kind: { const: "norma.private-dev-local-visual-mcp-job-inspection.v1" },
    version: { const: 1 },
    status: { const: "ready_to_resume" },
    providerExecutionReceiptContentIdentity: SHA256_SCHEMA,
    candidateObservationContentIdentity: SHA256_SCHEMA,
    humanSelectionContentIdentity: SHA256_SCHEMA,
    candidateCount: { type: "integer", minimum: 1, maximum: 64 },
    selectedCandidateCount: { type: "integer", minimum: 1, maximum: 64 },
    resumeAllowed: { const: true },
    logicalArtifacts: {
      type: "object",
      additionalProperties: false,
      required: [
        "providerExecutionReceipt", "candidateObservation", "humanSelection", "outputDirectory",
      ],
      properties: {
        providerExecutionReceipt: { const: "provider-execution-receipt.json" },
        candidateObservation: { const: "candidate-observation.json" },
        humanSelection: { const: "human-candidate-selection.json" },
        outputDirectory: { const: "norma-output" },
      },
    },
    acceptedGeometryProduced: { const: false },
    coreInputProduced: { const: false },
    structuredAnalyzeRun: { const: false },
    resultJsonProduced: { const: false },
    networkTransportUsed: { const: false },
    redacted: { const: true },
  },
} as const;

const RESUME_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "kind", "version", "status", "providerExecutionReceiptContentIdentity",
    "candidateObservationContentIdentity", "humanSelectionContentIdentity",
    "canonicalResultJsonContentIdentity", "canonicalResultJson", "artifacts",
    "canonicalTruth", "derivedArtifactsAuthoritative", "mcpEnvelopeAuthoritative",
    "explicitHumanSelectionValidated", "acceptedGeometryProduced", "coreInputProduced",
    "structuredAnalyzeRun", "resultJsonProduced", "providerMetadataInfluencedComputation",
    "networkTransportUsed", "redacted",
  ],
  properties: {
    kind: { const: "norma.private-dev-local-visual-mcp-resume.v1" },
    version: { const: 1 },
    status: { const: "completed" },
    providerExecutionReceiptContentIdentity: SHA256_SCHEMA,
    candidateObservationContentIdentity: SHA256_SCHEMA,
    humanSelectionContentIdentity: SHA256_SCHEMA,
    canonicalResultJsonContentIdentity: SHA256_SCHEMA,
    canonicalResultJson: { const: "result.json" },
    artifacts: { const: PRIVATE_DEV_LOCAL_VISUAL_MCP_OUTPUT_ARTIFACTS },
    canonicalTruth: { const: "result.json" },
    derivedArtifactsAuthoritative: { const: false },
    mcpEnvelopeAuthoritative: { const: false },
    explicitHumanSelectionValidated: { const: true },
    acceptedGeometryProduced: { const: true },
    coreInputProduced: { const: true },
    structuredAnalyzeRun: { const: true },
    resultJsonProduced: { const: true },
    providerMetadataInfluencedComputation: { const: false },
    networkTransportUsed: { const: false },
    redacted: { const: true },
  },
} as const;

export const PRIVATE_DEV_LOCAL_VISUAL_MCP_TOOLS = Object.freeze([
  {
    name: PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL,
    title: "Inspect finalized local visual review job",
    description: "Validate one operator-configured local visual review job and return only redacted readiness facts. This tool cannot select candidates, create AcceptedGeometry, run Core, read arbitrary paths, or call a provider.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    outputSchema: {
      oneOf: [
        INSPECT_OUTPUT_SCHEMA,
        createToolErrorOutputSchema(PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL),
      ],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
  },
  {
    name: PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL,
    title: "Resume finalized local visual selection",
    description: "Continue an already-finalized human selection through the existing local no-network Norma path. Requires exact inspected identities, writes a new fixed output directory, and cannot select, edit, infer, or accept geometry.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: [
        "expectedProviderExecutionReceiptContentIdentity",
        "expectedCandidateObservationContentIdentity",
        "expectedHumanSelectionContentIdentity",
        "acceptedAt",
        "confirmResumeFinalizedSelection",
      ],
      properties: {
        expectedProviderExecutionReceiptContentIdentity: SHA256_SCHEMA,
        expectedCandidateObservationContentIdentity: SHA256_SCHEMA,
        expectedHumanSelectionContentIdentity: SHA256_SCHEMA,
        acceptedAt: RFC3339_UTC_SCHEMA,
        confirmResumeFinalizedSelection: { const: true },
      },
    },
    outputSchema: {
      oneOf: [
        RESUME_OUTPUT_SCHEMA,
        createToolErrorOutputSchema(PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL),
      ],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: false,
    },
  },
] as const);

export class PrivateDevLocalVisualMcpProtocolV1 {
  private lifecycle: "pre_initialize" | "await_initialized" | "ready" = "pre_initialize";
  private activeCall: ActiveToolCall | undefined;
  private readonly toolTimeoutMs: number;

  constructor(
    private readonly runtime: PrivateDevLocalVisualMcpRuntimeV1,
    options: { readonly toolTimeoutMs?: number } = {},
  ) {
    this.toolTimeoutMs = options.toolTimeoutMs ?? PRIVATE_DEV_LOCAL_VISUAL_MCP_TOOL_TIMEOUT_MS;
  }

  async handleLine(rawLine: string): Promise<string | null> {
    if (requestEncoder.encode(rawLine).length > PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_REQUEST_BYTES) {
      return stringify(createJsonRpcError(null, -32600, "Invalid Request"));
    }

    let message: unknown;
    try {
      message = JSON.parse(rawLine);
    } catch {
      return stringify(createJsonRpcError(null, -32700, "Parse error"));
    }

    if (jsonValueLimitExceeded(message)) {
      return isNotification(message)
        ? null
        : stringify(createJsonRpcError(safeId(message), -32600, "Invalid Request"));
    }

    const response = await this.handleMessage(message);
    return response === null ? null : stringify(response);
  }

  private async handleMessage(message: unknown): Promise<Record<string, unknown> | null> {
    if (!isRecord(message)
      || message.jsonrpc !== "2.0"
      || typeof message.method !== "string"
      || message.method.length === 0) {
      return createJsonRpcError(safeId(message), -32600, "Invalid Request");
    }

    if (!Object.hasOwn(message, "id")) {
      this.handleNotification(message);
      return null;
    }

    if (!isJsonRpcId(message.id)) {
      return createJsonRpcError(null, -32600, "Invalid Request");
    }
    const id = message.id;

    if (message.method === "initialize") {
      if (this.activeCall !== undefined || !isValidInitializeParams(message.params)) {
        return createJsonRpcError(id, -32602, "Invalid params");
      }
      this.lifecycle = "await_initialized";
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: selectInitializeProtocolVersion(message.params),
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: PRIVATE_DEV_LOCAL_VISUAL_MCP_SERVER_NAME,
            version: PRIVATE_DEV_LOCAL_VISUAL_MCP_SERVER_VERSION,
          },
        },
      };
    }

    if (message.method === "ping" && this.lifecycle !== "pre_initialize") {
      return { jsonrpc: "2.0", id, result: {} };
    }

    if (this.lifecycle !== "ready") {
      return createJsonRpcError(id, -32600, "Server not initialized");
    }

    if (message.method === "tools/list") {
      if (!isValidToolsListParams(message.params, Object.hasOwn(message, "params"))) {
        return createJsonRpcError(id, -32602, "Invalid params");
      }
      return { jsonrpc: "2.0", id, result: { tools: PRIVATE_DEV_LOCAL_VISUAL_MCP_TOOLS } };
    }

    if (message.method === "tools/call") {
      const call = parseToolCall(message.params);
      if (call === null || !isKnownTool(call.name)) {
        return createJsonRpcError(id, -32602, "Invalid params");
      }
      const parsedInput = call.name === PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL
        ? parseInspectInput(call.arguments)
        : parseResumeInput(call.arguments);
      if (parsedInput === null) {
        return createJsonRpcError(id, -32602, "Invalid params");
      }
      if (this.activeCall !== undefined) {
        return createToolResponse(id, call.name, createToolError(call.name, "job_busy"), true);
      }
      return this.runToolCall(id, call, parsedInput);
    }

    return createJsonRpcError(id, -32601, "Method not found");
  }

  private handleNotification(message: Record<string, unknown>): void {
    if (message.method === "notifications/initialized"
      && this.lifecycle === "await_initialized"
      && isInitializedNotificationParams(message.params, Object.hasOwn(message, "params"))) {
      this.lifecycle = "ready";
      return;
    }

    if (message.method !== "notifications/cancelled"
      || this.activeCall?.mutating !== true
      || this.activeCall.committed) {
      return;
    }
    const params = message.params;
    if (!isRecord(params) || !Object.hasOwn(params, "requestId")
      || !isJsonRpcId(params.requestId) || params.requestId !== this.activeCall.id) {
      return;
    }
    if (Object.keys(params).some((key) => !["requestId", "reason"].includes(key))
      || (Object.hasOwn(params, "reason") && typeof params.reason !== "string")) {
      return;
    }
    this.activeCall.controller.abort("cancelled");
  }

  private async runToolCall(
    id: JsonRpcId,
    call: ParsedToolCall,
    parsedInput: Record<string, never> | PrivateDevLocalVisualMcpResumeRequestV1,
  ): Promise<Record<string, unknown> | null> {
    const controller = new AbortController();
    const active: ActiveToolCall = {
      id,
      tool: call.name,
      mutating: call.name === PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL,
      controller,
      timedOut: false,
      committed: false,
    };
    this.activeCall = active;
    const deadlineAt = Date.now() + this.toolTimeoutMs;
    const timeout = setTimeout(() => {
      active.timedOut = true;
      controller.abort("deadline_exceeded");
    }, this.toolTimeoutMs);

    const runtimeWork = (async (): Promise<
      PrivateDevLocalVisualMcpInspectionV1 | PrivateDevLocalVisualMcpResumeResultV1
    > => (
      call.name === PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL
        ? this.runtime.inspect(controller.signal)
        : this.runtime.resume(
            parsedInput as PrivateDevLocalVisualMcpResumeRequestV1,
            controller.signal,
            () => { active.committed = true; },
          )
    ))();
    const workOutcome = runtimeWork.then(
      (result) => ({ kind: "fulfilled" as const, result }),
      (error: unknown) => ({ kind: "rejected" as const, error }),
    );
    let onAbort: (() => void) | undefined;
    const abortOutcome = new Promise<{ readonly kind: "aborted" }>((resolve) => {
      onAbort = () => resolve({ kind: "aborted" });
      controller.signal.addEventListener("abort", onAbort, { once: true });
    });
    const outcome = await Promise.race([workOutcome, abortOutcome]);
    if (outcome.kind !== "aborted" && Date.now() >= deadlineAt && !active.committed) {
      active.timedOut = true;
      controller.abort("deadline_exceeded");
    }
    clearTimeout(timeout);
    if (onAbort !== undefined) controller.signal.removeEventListener("abort", onAbort);

    if (outcome.kind === "aborted") {
      void workOutcome.then(() => {
        if (this.activeCall === active) this.activeCall = undefined;
      });
      return active.timedOut
        ? createToolResponse(id, call.name, createToolError(call.name, "deadline_exceeded"), true)
        : null;
    }

    if (this.activeCall === active) this.activeCall = undefined;
    if (outcome.kind === "fulfilled") {
      if (controller.signal.aborted && !active.committed) {
        return active.timedOut
          ? createToolResponse(id, call.name, createToolError(call.name, "deadline_exceeded"), true)
          : null;
      }
      return createToolResponse(id, call.name, outcome.result, false);
    }
    if (controller.signal.aborted && !active.timedOut && !active.committed) return null;
    const code = active.timedOut ? "deadline_exceeded" : safeToolErrorCode(outcome.error);
    return createToolResponse(id, call.name, createToolError(call.name, code), true);
  }
}

function createToolResponse(
  id: JsonRpcId,
  tool: string,
  structuredContent: object,
  isError: boolean,
): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: JSON.stringify(structuredContent) }],
      structuredContent,
      isError,
    },
  };
}

function createToolError(
  tool: string,
  code: PrivateDevLocalVisualMcpToolErrorCode,
): Readonly<Record<string, unknown>> {
  return {
    kind: "norma.private-dev-local-visual-mcp-error.v1",
    version: 1,
    status: "blocked",
    tool,
    code,
    acceptedGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    artifactsPersisted: false,
    networkTransportUsed: false,
    redacted: true,
  };
}

function safeToolErrorCode(error: unknown): PrivateDevLocalVisualMcpToolErrorCode {
  if (error instanceof PrivateDevLocalVisualMcpError) return error.code;
  if (isRecord(error) && typeof error.code === "string" && TOOL_ERROR_CODES.has(error.code)) {
    return error.code as PrivateDevLocalVisualMcpToolErrorCode;
  }
  return "internal_error";
}

const TOOL_ERROR_CODES = new Set<string>(TOOL_ERROR_CODE_VALUES);

function createToolErrorOutputSchema(tool: string): Readonly<Record<string, unknown>> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "kind", "version", "status", "tool", "code", "acceptedGeometryProduced",
      "coreInputProduced", "structuredAnalyzeRun", "resultJsonProduced",
      "artifactsPersisted", "networkTransportUsed", "redacted",
    ],
    properties: {
      kind: { const: "norma.private-dev-local-visual-mcp-error.v1" },
      version: { const: 1 },
      status: { const: "blocked" },
      tool: { const: tool },
      code: { enum: TOOL_ERROR_CODE_VALUES },
      acceptedGeometryProduced: { const: false },
      coreInputProduced: { const: false },
      structuredAnalyzeRun: { const: false },
      resultJsonProduced: { const: false },
      artifactsPersisted: { const: false },
      networkTransportUsed: { const: false },
      redacted: { const: true },
    },
  };
}

function parseInspectInput(value: Record<string, unknown>): Record<string, never> | null {
  return Object.keys(value).length === 0 ? {} : null;
}

function parseResumeInput(value: Record<string, unknown>): PrivateDevLocalVisualMcpResumeRequestV1 | null {
  const fields = [
    "expectedProviderExecutionReceiptContentIdentity",
    "expectedCandidateObservationContentIdentity",
    "expectedHumanSelectionContentIdentity",
    "acceptedAt",
    "confirmResumeFinalizedSelection",
  ];
  if (!hasExactFields(value, fields)
    || typeof value.expectedProviderExecutionReceiptContentIdentity !== "string"
    || typeof value.expectedCandidateObservationContentIdentity !== "string"
    || typeof value.expectedHumanSelectionContentIdentity !== "string"
    || typeof value.acceptedAt !== "string"
    || value.confirmResumeFinalizedSelection !== true) {
    return null;
  }
  return value as unknown as PrivateDevLocalVisualMcpResumeRequestV1;
}

function parseToolCall(value: unknown): ParsedToolCall | null {
  if (!isRecord(value) || typeof value.name !== "string") {
    return null;
  }
  if (Object.keys(value).some((key) => !["name", "arguments", "_meta"].includes(key))
    || (Object.hasOwn(value, "_meta") && !isRecord(value._meta))) {
    return null;
  }
  const hasArguments = Object.hasOwn(value, "arguments");
  if (hasArguments && !isRecord(value.arguments)) {
    return null;
  }
  const argumentsValue = hasArguments ? value.arguments : {};
  if (!isRecord(argumentsValue)) return null;
  return { name: value.name, arguments: argumentsValue };
}

function isKnownTool(name: string): boolean {
  return name === PRIVATE_DEV_LOCAL_VISUAL_MCP_INSPECT_TOOL
    || name === PRIVATE_DEV_LOCAL_VISUAL_MCP_RESUME_TOOL;
}

function isValidInitializeParams(value: unknown): boolean {
  return isRecord(value)
    && typeof value.protocolVersion === "string"
    && /^\d{4}-\d{2}-\d{2}$/u.test(value.protocolVersion)
    && isRecord(value.capabilities)
    && isRecord(value.clientInfo)
    && typeof value.clientInfo.name === "string"
    && typeof value.clientInfo.version === "string";
}

function selectInitializeProtocolVersion(params: unknown): string {
  if (!isRecord(params) || typeof params.protocolVersion !== "string") {
    return PRIVATE_DEV_LOCAL_VISUAL_MCP_PROTOCOL_VERSION;
  }

  return compatibleMcpProtocolVersions.has(params.protocolVersion)
    ? params.protocolVersion
    : PRIVATE_DEV_LOCAL_VISUAL_MCP_PROTOCOL_VERSION;
}

function isValidToolsListParams(value: unknown, hasParams: boolean): boolean {
  if (!hasParams) return true;
  if (!isRecord(value)) return false;
  return Object.keys(value).length === 0
    || (hasExactFields(value, ["cursor"]) && typeof value.cursor === "string");
}

function isInitializedNotificationParams(value: unknown, hasParams: boolean): boolean {
  if (!hasParams) return true;
  if (!isRecord(value)) return false;
  if (Object.keys(value).length === 0) return true;
  return hasExactFields(value, ["_meta"]) && isRecord(value._meta);
}

function hasExactFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...fields].sort().join("\0");
}

function createJsonRpcError(
  id: JsonRpcId | null,
  code: JsonRpcErrorCode,
  message: string,
): Record<string, unknown> {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function stringify(value: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(value);
}

function safeId(value: unknown): JsonRpcId | null {
  return isRecord(value) && Object.hasOwn(value, "id") && isJsonRpcId(value.id)
    ? value.id
    : null;
}

function isNotification(value: unknown): boolean {
  return isRecord(value) && value.jsonrpc === "2.0"
    && typeof value.method === "string" && !Object.hasOwn(value, "id");
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return typeof value === "string"
    || (typeof value === "number" && Number.isFinite(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonValueLimitExceeded(value: unknown): boolean {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 1 }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || current.depth > PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_JSON_DEPTH) {
      return true;
    }
    if (typeof current.value === "string") {
      if (requestEncoder.encode(current.value).length
        > PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_STRING_LENGTH) return true;
      continue;
    }
    if (current.value === null || typeof current.value === "boolean") continue;
    if (typeof current.value === "number") {
      if (!Number.isFinite(current.value)) return true;
      continue;
    }
    if (Array.isArray(current.value)) {
      for (const item of current.value) stack.push({ value: item, depth: current.depth + 1 });
      continue;
    }
    if (isRecord(current.value)) {
      for (const [key, item] of Object.entries(current.value)) {
        if (requestEncoder.encode(key).length
          > PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_STRING_LENGTH) return true;
        stack.push({ value: item, depth: current.depth + 1 });
      }
      continue;
    }
    return true;
  }
  return false;
}
