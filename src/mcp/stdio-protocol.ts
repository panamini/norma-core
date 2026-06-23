import {
  createCanonicalMvpDemoInputV1,
  runMvpDemoV1,
} from "../index.js";
import type {
  CoreError,
  CoreWarning,
  MvpDemoEvaluationSummaryV1,
  MvpDemoResultV1,
} from "../index.js";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_SERVER_NAME = "norma-core-mcp-stdio";
export const MCP_SERVER_VERSION = "0.1.0-pr5";
export const MCP_RUN_MVP_DEMO_TOOL_NAME = "norma.runMvpDemoV1";

export const MCP_STDIO_MAX_REQUEST_BYTES = 524_288;
export const MCP_STDIO_MAX_JSON_DEPTH = 64;
export const MCP_STDIO_MAX_STRING_LENGTH = 65_536;

export type McpNormaErrorCode =
  | "MCP_INPUT_TOO_DEEP"
  | "MCP_INTERNAL_ERROR"
  | "MCP_INVALID_INPUT"
  | "MCP_METHOD_NOT_FOUND"
  | "MCP_STRING_TOO_LONG"
  | "MCP_TOO_LARGE";

type JsonRpcId = string | number;
type JsonRpcErrorCode = -32700 | -32600 | -32601 | -32602 | -32603 | -32000;
type JsonRpcErrorMessage =
  | "Internal error"
  | "Invalid params"
  | "Invalid Request"
  | "Method not found"
  | "Parse error"
  | "Request too large";

interface JsonRpcErrorResponse {
  readonly jsonrpc: "2.0";
  readonly error: {
    readonly code: JsonRpcErrorCode;
    readonly message: JsonRpcErrorMessage;
    readonly data: {
      readonly normaCode: McpNormaErrorCode;
    };
  };
  readonly id: JsonRpcId | null;
}

interface InitializeResponse {
  readonly jsonrpc: "2.0";
  readonly result: {
    readonly protocolVersion: typeof MCP_PROTOCOL_VERSION;
    readonly capabilities: {
      readonly tools: Record<string, never>;
    };
    readonly serverInfo: {
      readonly name: typeof MCP_SERVER_NAME;
      readonly version: typeof MCP_SERVER_VERSION;
    };
  };
  readonly id: JsonRpcId;
}

interface ToolsListResponse {
  readonly jsonrpc: "2.0";
  readonly result: {
    readonly tools: readonly McpToolDefinition[];
  };
  readonly id: JsonRpcId;
}

interface ToolsCallResponse {
  readonly jsonrpc: "2.0";
  readonly result: {
    readonly content: readonly [
      {
        readonly type: "text";
        readonly text: string;
      },
    ];
    readonly structuredContent: MvpDemoToolOutputV1 | MvpDemoToolFailureOutputV1;
    readonly isError: boolean;
  };
  readonly id: JsonRpcId;
}

interface McpToolDefinition {
  readonly name: typeof MCP_RUN_MVP_DEMO_TOOL_NAME;
  readonly description: string;
  readonly inputSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
      readonly input: {
        readonly type: "object";
        readonly description: string;
      };
    };
  };
}

interface MvpDemoToolOutputV1 {
  readonly status: "ok";
  readonly runRef: string;
  readonly measurementCounts: MvpDemoResultV1["summary"]["measurementCounts"];
  readonly evaluations: {
    readonly a: MvpDemoEvaluationSummaryV1;
    readonly b: MvpDemoEvaluationSummaryV1;
  };
  readonly comparison: {
    readonly comparisonRef: string;
    readonly status: MvpDemoResultV1["comparison"]["status"];
    readonly scoreA: number;
    readonly scoreB: number;
    readonly signedScoreDelta: number;
    readonly absoluteScoreDelta: number;
    readonly confidenceA: number;
    readonly confidenceB: number;
    readonly selectedCompositionRef: string | null;
  };
  readonly decision: {
    readonly decisionRef: string;
    readonly status: MvpDemoResultV1["decision"]["status"];
    readonly selectedEvaluationRef: string | null;
    readonly selectedCompositionRef: string | null;
  };
  readonly replayReadiness: {
    readonly reportRef: string;
    readonly status: MvpDemoResultV1["replayReadinessReport"]["status"];
    readonly mismatchCount: number;
    readonly missingSourceCount: number;
    readonly staleArtifactRefCount: number;
  };
}

interface MvpDemoToolFailureOutputV1 {
  readonly status: "failed";
  readonly diagnostics: readonly MvpDemoToolDiagnosticV1[];
}

interface MvpDemoToolDiagnosticV1 {
  readonly code: string;
  readonly message: string;
  readonly targetRef: string | null;
}

interface JsonTraversalStackItem {
  readonly value: unknown;
  readonly depth: number;
  readonly ancestors: readonly object[];
}

const RUN_MVP_DEMO_TOOL_DEFINITION = {
  name: MCP_RUN_MVP_DEMO_TOOL_NAME,
  description: "Run the existing deterministic Norma Core MVP demo and return a compact structured result.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      input: {
        type: "object",
        description: "Optional MvpDemoInputV1. Omit to use the canonical MVP demo input.",
      },
    },
  },
} as const satisfies McpToolDefinition;

const requestEncoder = new TextEncoder();

export function handleMcpJsonRpcMessage(rawLine: string): string | null {
  try {
    const response = handleRawJsonRpcLine(rawLine);
    return response === null ? null : JSON.stringify(response);
  } catch {
    return JSON.stringify(createMcpInputError(null, -32603, "Internal error", "MCP_INTERNAL_ERROR"));
  }
}

export function handleMcpJsonRpcRequest(
  message: unknown,
): InitializeResponse | ToolsListResponse | ToolsCallResponse | JsonRpcErrorResponse | null {
  const id = safeJsonRpcId(message);

  try {
    return handleValidatedJsonRpcRequest(message, id);
  } catch {
    return createMcpInputError(id, -32603, "Internal error", "MCP_INTERNAL_ERROR");
  }
}

export function createMcpInputError(
  id: JsonRpcId | null,
  code: JsonRpcErrorCode,
  message: JsonRpcErrorMessage,
  normaCode: McpNormaErrorCode,
): JsonRpcErrorResponse {
  return {
    jsonrpc: "2.0",
    error: {
      code,
      message,
      data: {
        normaCode,
      },
    },
    id,
  };
}

function handleRawJsonRpcLine(
  rawLine: string,
): InitializeResponse | ToolsListResponse | ToolsCallResponse | JsonRpcErrorResponse | null {
  const normalizedLine = rawLine.replace(/\r$/, "");
  if (requestEncoder.encode(normalizedLine).length > MCP_STDIO_MAX_REQUEST_BYTES) {
    return createMcpInputError(null, -32000, "Request too large", "MCP_TOO_LARGE");
  }

  let message: unknown;
  try {
    message = JSON.parse(normalizedLine);
  } catch {
    return createMcpInputError(null, -32700, "Parse error", "MCP_INVALID_INPUT");
  }

  return handleMcpJsonRpcRequest(message);
}

function handleValidatedJsonRpcRequest(
  message: unknown,
  id: JsonRpcId | null,
): InitializeResponse | ToolsListResponse | ToolsCallResponse | JsonRpcErrorResponse | null {
  if (!isJsonRpcRecord(message)) {
    return createMcpInputError(null, -32600, "Invalid Request", "MCP_INVALID_INPUT");
  }

  if (!Object.hasOwn(message, "id")) {
    if (message.jsonrpc !== "2.0" || typeof message.method !== "string" || message.method.length === 0) {
      return createMcpInputError(null, -32600, "Invalid Request", "MCP_INVALID_INPUT");
    }

    const limitFailure = jsonValueLimitFailure(message, null);
    return limitFailure;
  }

  if (!Object.hasOwn(message, "id") || !isJsonRpcId(message.id)) {
    return createMcpInputError(null, -32600, "Invalid Request", "MCP_INVALID_INPUT");
  }

  const requestId = message.id;

  if (message.jsonrpc !== "2.0" || typeof message.method !== "string" || message.method.length === 0) {
    return createMcpInputError(requestId, -32600, "Invalid Request", "MCP_INVALID_INPUT");
  }

  const limitFailure = jsonValueLimitFailure(message, requestId);
  if (limitFailure !== null) {
    return limitFailure;
  }

  if (message.method === "initialize") {
    return isValidInitializeParams(message.params)
      ? createInitializeResult(requestId)
      : createMcpInputError(requestId, -32602, "Invalid params", "MCP_INVALID_INPUT");
  }

  if (message.method === "tools/list") {
    return isValidToolsListParams(message.params)
      ? createToolsListResult(requestId)
      : createMcpInputError(requestId, -32602, "Invalid params", "MCP_INVALID_INPUT");
  }

  if (message.method === "tools/call") {
    return createToolsCallResult(message.params, requestId);
  }

  return createMcpInputError(requestId, -32601, "Method not found", "MCP_METHOD_NOT_FOUND");
}

function createInitializeResult(id: JsonRpcId): InitializeResponse {
  return {
    jsonrpc: "2.0",
    result: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      },
    },
    id,
  };
}

function createToolsListResult(id: JsonRpcId): ToolsListResponse {
  return {
    jsonrpc: "2.0",
    result: {
      tools: [RUN_MVP_DEMO_TOOL_DEFINITION],
    },
    id,
  };
}

function createToolsCallResult(params: unknown, id: JsonRpcId): ToolsCallResponse | JsonRpcErrorResponse {
  if (!isValidToolsCallParams(params)) {
    return createMcpInputError(id, -32602, "Invalid params", "MCP_INVALID_INPUT");
  }

  if (params.name !== MCP_RUN_MVP_DEMO_TOOL_NAME) {
    return createMcpInputError(id, -32602, "Invalid params", "MCP_INVALID_INPUT");
  }

  const args = params.arguments;
  if (args !== undefined && !isJsonRpcRecord(args)) {
    return createMcpInputError(id, -32602, "Invalid params", "MCP_INVALID_INPUT");
  }

  const inputArgs = args ?? {};
  if (Object.keys(inputArgs).some((key) => key !== "input")) {
    return createMcpInputError(id, -32602, "Invalid params", "MCP_INVALID_INPUT");
  }

  const input = Object.hasOwn(inputArgs, "input") ? inputArgs.input : createCanonicalMvpDemoInputV1();
  const demoResult = runMvpDemoV1(input);
  const structuredContent = demoResult.status === "ok" && demoResult.output !== null
    ? compactMvpDemoToolOutput(demoResult.output)
    : compactMvpDemoToolFailureOutput(demoResult.errors, demoResult.warnings);

  return {
    jsonrpc: "2.0",
    result: {
      content: [
        {
          type: "text",
          text: JSON.stringify(structuredContent),
        },
      ],
      structuredContent,
      isError: structuredContent.status !== "ok",
    },
    id,
  };
}

function isValidToolsListParams(params: unknown): boolean {
  if (params === undefined) {
    return true;
  }

  return isJsonRpcRecord(params)
    && Object.keys(params).every((key) => key === "_meta")
    && (!Object.hasOwn(params, "_meta") || isJsonRpcRecord(params._meta));
}

function isValidToolsCallParams(params: unknown): params is {
  readonly name: string;
  readonly arguments?: unknown;
} {
  return isJsonRpcRecord(params) && typeof params.name === "string";
}

function compactMvpDemoToolOutput(result: MvpDemoResultV1): MvpDemoToolOutputV1 {
  return {
    status: "ok",
    runRef: result.run.runRef.id,
    measurementCounts: result.summary.measurementCounts,
    evaluations: result.summary.evaluationSummaries,
    comparison: {
      comparisonRef: result.comparison.comparisonRef,
      status: result.comparison.status,
      scoreA: result.comparison.scoreA,
      scoreB: result.comparison.scoreB,
      signedScoreDelta: result.comparison.signedScoreDelta,
      absoluteScoreDelta: result.comparison.absoluteScoreDelta,
      confidenceA: result.comparison.confidenceA,
      confidenceB: result.comparison.confidenceB,
      selectedCompositionRef: result.comparison.selectedCompositionRef,
    },
    decision: {
      decisionRef: result.decision.decisionRef,
      status: result.decision.status,
      selectedEvaluationRef: result.decision.selectedEvaluationRef,
      selectedCompositionRef: result.decision.selectedCompositionRef,
    },
    replayReadiness: {
      reportRef: result.replayReadinessReport.reportRef,
      status: result.replayReadinessReport.status,
      mismatchCount: result.replayReadinessReport.mismatches.length,
      missingSourceCount: result.replayReadinessReport.missingSources.length,
      staleArtifactRefCount: result.replayReadinessReport.staleArtifactRefs.length,
    },
  };
}

function compactMvpDemoToolFailureOutput(
  errors: readonly CoreError[],
  warnings: readonly CoreWarning[],
): MvpDemoToolFailureOutputV1 {
  return {
    status: "failed",
    diagnostics: [...errors, ...warnings].map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      targetRef: diagnostic.targetRef,
    })),
  };
}

function isValidInitializeParams(params: unknown): boolean {
  if (!isJsonRpcRecord(params)) {
    return false;
  }

  if (params.protocolVersion !== MCP_PROTOCOL_VERSION || !isJsonRpcRecord(params.capabilities)) {
    return false;
  }

  if (!isJsonRpcRecord(params.clientInfo)) {
    return false;
  }

  return typeof params.clientInfo.name === "string" && typeof params.clientInfo.version === "string";
}

function jsonValueLimitFailure(value: unknown, id: JsonRpcId | null): JsonRpcErrorResponse | null {
  const stack: JsonTraversalStackItem[] = [
    {
      value,
      depth: 1,
      ancestors: [],
    },
  ];

  while (stack.length > 0) {
    const item = stack.pop();
    if (item === undefined) {
      break;
    }

    const failure = validateJsonStackItem(item, id, stack);
    if (failure !== null) {
      return failure;
    }
  }

  return null;
}

function validateJsonStackItem(
  item: JsonTraversalStackItem,
  id: JsonRpcId | null,
  stack: JsonTraversalStackItem[],
): JsonRpcErrorResponse | null {
  if (item.depth > MCP_STDIO_MAX_JSON_DEPTH) {
    return createMcpInputError(id, -32602, "Invalid params", "MCP_INPUT_TOO_DEEP");
  }

  if (isJsonScalar(item.value)) {
    return scalarLimitFailure(item.value, id);
  }

  return pushJsonCompositeChildren(item, id, stack);
}

function scalarLimitFailure(value: unknown, id: JsonRpcId | null): JsonRpcErrorResponse | null {
  if (typeof value === "string" && value.length > MCP_STDIO_MAX_STRING_LENGTH) {
    return createMcpInputError(id, -32602, "Invalid params", "MCP_STRING_TOO_LONG");
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return createMcpInputError(id, -32602, "Invalid params", "MCP_INVALID_INPUT");
  }

  return isJsonScalarValue(value) ? null : createMcpInputError(id, -32602, "Invalid params", "MCP_INVALID_INPUT");
}

function isJsonScalar(value: unknown): boolean {
  return value === null || typeof value !== "object";
}

function isJsonScalarValue(value: unknown): boolean {
  return value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string";
}

function pushJsonCompositeChildren(
  item: JsonTraversalStackItem,
  id: JsonRpcId | null,
  stack: JsonTraversalStackItem[],
): JsonRpcErrorResponse | null {
  const value = item.value as object;
  if (item.ancestors.includes(value)) {
    return createMcpInputError(id, -32602, "Invalid params", "MCP_INVALID_INPUT");
  }

  const ancestors = [...item.ancestors, value];
  if (Array.isArray(value)) {
    pushJsonArrayItems(value, item.depth + 1, ancestors, stack);
    return null;
  }

  if (!isPlainJsonRecord(value)) {
    return createMcpInputError(id, -32602, "Invalid params", "MCP_INVALID_INPUT");
  }

  return pushJsonRecordEntries(value, item.depth + 1, ancestors, id, stack);
}

function pushJsonArrayItems(
  value: readonly unknown[],
  depth: number,
  ancestors: readonly object[],
  stack: JsonTraversalStackItem[],
): void {
  for (let index = value.length - 1; index >= 0; index -= 1) {
    stack.push({
      value: value[index],
      depth,
      ancestors,
    });
  }
}

function pushJsonRecordEntries(
  value: object,
  depth: number,
  ancestors: readonly object[],
  id: JsonRpcId | null,
  stack: JsonTraversalStackItem[],
): JsonRpcErrorResponse | null {
  const entries = Object.entries(value);
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const [key, nestedValue] = entries[index] as [string, unknown];
    if (key.length > MCP_STDIO_MAX_STRING_LENGTH) {
      return createMcpInputError(id, -32602, "Invalid params", "MCP_STRING_TOO_LONG");
    }

    stack.push({
      value: nestedValue,
      depth,
      ancestors,
    });
  }

  return null;
}

function safeJsonRpcId(message: unknown): JsonRpcId | null {
  if (!isJsonRpcRecord(message) || !Object.hasOwn(message, "id")) {
    return null;
  }

  return isJsonRpcId(message.id) ? message.id : null;
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return (
    (typeof value === "string" && value.length <= MCP_STDIO_MAX_STRING_LENGTH) ||
    (typeof value === "number" && Number.isSafeInteger(value))
  );
}

function isJsonRpcRecord(value: unknown): value is Record<string, unknown> {
  return isPlainJsonRecord(value) && !Array.isArray(value);
}

function isPlainJsonRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
