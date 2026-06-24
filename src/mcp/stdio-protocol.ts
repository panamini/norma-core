import { CORE_VERSION } from "../core-constants.js";
import { verifyArtifactFreshness } from "../artifact-freshness.js";
import { createMvpDemoInput, runMvpDemo } from "../mvp-demo.js";
import { replayRun } from "../run-replay.js";
import { verifyRun } from "../run-verification.js";
import { serializeCanonicalJson, STABLE_SERIALIZATION_VERSION } from "../serialization.js";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_SERVER_NAME = "norma-core-mcp-stdio-skeleton";
export const MCP_SERVER_VERSION = "0.1.0-pr12";
export const MCP_STDIO_MAX_REQUEST_BYTES = 524_288;
export const MCP_STDIO_MAX_JSON_DEPTH = 64;
export const MCP_STDIO_MAX_STRING_LENGTH = 65_536;

type JsonRpcId = string | number;

type JsonRpcErrorCode = -32700 | -32600 | -32601 | -32602 | -32603;

const requestEncoder = new TextEncoder();
const mcpProtocolDateStringPattern = /^\d{4}-\d{2}-\d{2}$/u;
const minimumCompatibleMcpProtocolDate = "2025-03-26";

interface McpToolDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema?: Readonly<Record<string, unknown>>;
}

const GET_VERSION_OUTPUT_SCHEMA = {
  type: "object",
  required: [
    "kind",
    "tool",
    "status",
    "coreVersion",
    "protocolVersion",
    "serverName",
    "serverVersion",
    "capabilities",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "norma-mcp-tool-result" },
    tool: { const: "norma.getVersion" },
    status: { const: "ok" },
    coreVersion: { type: "string" },
    protocolVersion: { type: "string" },
    serverName: { type: "string" },
    serverVersion: { type: "string" },
    capabilities: {
      type: "object",
      required: [
        "toolsList",
        "getVersion",
        "serializeCanonicalJson",
        "verifyRun",
        "verifyArtifactFreshness",
        "replayMvpDemo",
        "resources",
        "prompts",
        "remoteMcp",
      ],
      additionalProperties: false,
      properties: {
        toolsList: { const: true },
        getVersion: { const: true },
        serializeCanonicalJson: { const: true },
        verifyRun: { const: true },
        verifyArtifactFreshness: { const: true },
        replayMvpDemo: { const: true },
        resources: { const: false },
        prompts: { const: false },
        remoteMcp: { const: false },
      },
    },
  },
} as const;

const SERIALIZE_CANONICAL_JSON_OUTPUT_SCHEMA = {
  type: "object",
  required: [
    "kind",
    "tool",
    "status",
    "serializationVersion",
    "canonicalJson",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "norma-mcp-tool-result" },
    tool: { const: "norma.serializeCanonicalJson" },
    status: { const: "ok" },
    serializationVersion: { type: "string" },
    canonicalJson: { type: "string" },
  },
} as const;

function createComplexToolOutputSchema(tool: string, resultKind: string): Readonly<Record<string, unknown>> {
  return {
    type: "object",
    required: ["kind", "tool", "status", "result"],
    additionalProperties: false,
    properties: {
      kind: { const: "norma-mcp-tool-result" },
      tool: { const: tool },
      status: { type: "string" },
      result: {
        type: "object",
        required: ["kind", "status"],
        additionalProperties: true,
        properties: {
          kind: { const: resultKind },
          status: { type: "string" },
        },
      },
    },
  };
}

const VERIFY_RUN_OUTPUT_SCHEMA = createComplexToolOutputSchema("norma.verifyRun", "run-verification");
const VERIFY_ARTIFACT_FRESHNESS_OUTPUT_SCHEMA = createComplexToolOutputSchema(
  "norma.verifyArtifactFreshness",
  "artifact-freshness-verification",
);
const REPLAY_MVP_DEMO_OUTPUT_SCHEMA = createComplexToolOutputSchema("norma.replayMvpDemo", "run-replay");

const PR38_MCP_TOOLS = [
  {
    name: "norma.getVersion",
    title: "Get Norma Core version",
    description: "Return Norma Core version and MCP capability metadata.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    outputSchema: GET_VERSION_OUTPUT_SCHEMA,
  },
  {
    name: "norma.serializeCanonicalJson",
    title: "Serialize canonical JSON",
    description: "Return deterministic canonical JSON for an explicit structured value.",
    inputSchema: {
      type: "object",
      required: ["value"],
      additionalProperties: false,
      properties: {
        value: {},
        policy: {
          type: "string",
        },
      },
    },
    outputSchema: SERIALIZE_CANONICAL_JSON_OUTPUT_SCHEMA,
  },
  {
    name: "norma.verifyRun",
    title: "Verify Norma run",
    description: "Verify an explicit Norma run envelope using existing Norma Core verification semantics.",
    inputSchema: {
      type: "object",
      required: ["input"],
      additionalProperties: false,
      properties: {
        input: {},
      },
    },
    outputSchema: VERIFY_RUN_OUTPUT_SCHEMA,
  },
  {
    name: "norma.verifyArtifactFreshness",
    title: "Verify artifact freshness",
    description: "Verify explicit artifact freshness using existing Norma Core artifact freshness semantics.",
    inputSchema: {
      type: "object",
      required: ["input"],
      additionalProperties: false,
      properties: {
        input: {},
      },
    },
    outputSchema: VERIFY_ARTIFACT_FRESHNESS_OUTPUT_SCHEMA,
  },
  {
    name: "norma.replayMvpDemo",
    title: "Replay Norma MVP demo",
    description: "Replay the fixed Norma Core MVP demo using existing in-memory demo data and existing replay semantics.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    outputSchema: REPLAY_MVP_DEMO_OUTPUT_SCHEMA,
  },
] as const satisfies readonly McpToolDefinition[];

type McpStructuredContent = Readonly<Record<string, unknown>>;

interface JsonRpcErrorResponse {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId | null;
  readonly error: {
    readonly code: JsonRpcErrorCode;
    readonly message: string;
    readonly data?: unknown;
  };
}

interface InitializeResponse {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly result: {
    readonly protocolVersion: string;
    readonly capabilities: {
      readonly tools: {
        readonly listChanged: false;
      };
    };
    readonly serverInfo: {
      readonly name: typeof MCP_SERVER_NAME;
      readonly version: typeof MCP_SERVER_VERSION;
    };
  };
}

interface ToolsListResponse {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly result: {
    readonly tools: typeof PR38_MCP_TOOLS;
  };
}

interface ToolsCallResponse {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly result: {
    readonly content: readonly [
      {
        readonly type: "text";
        readonly text: string;
      },
    ];
    readonly structuredContent: McpStructuredContent;
    readonly isError: false;
  };
}

type JsonTraversalStackItem = {
  readonly value: unknown;
  readonly depth: number;
  readonly ancestors: readonly object[];
};

export function handleMcpJsonRpcMessage(rawLine: string): string | null {
  const rawLineFailure = rawLineLimitFailure(rawLine);
  if (rawLineFailure !== null) {
    return stringifyJsonRpcResponse(rawLineFailure);
  }

  const parsed = parseJsonRpcLine(rawLine);
  return parsed.ok ? handleParsedJsonRpcMessage(parsed.message) : stringifyJsonRpcResponse(parsed.error);
}

export function handleMcpJsonRpcRequest(
  message: unknown,
): InitializeResponse | ToolsListResponse | ToolsCallResponse | JsonRpcErrorResponse | null {
  if (!isRecord(message) || Array.isArray(message)) {
    return createJsonRpcError(null, -32600, "Invalid Request");
  }

  const hasId = Object.hasOwn(message, "id");
  const id = hasId && isJsonRpcId(message.id) ? message.id : null;

  if (hasId && id === null) {
    return createJsonRpcError(null, -32600, "Invalid Request");
  }

  if (message.jsonrpc !== "2.0" || typeof message.method !== "string" || message.method.length === 0) {
    return createJsonRpcError(id, -32600, "Invalid Request");
  }

  if (!hasId) {
    return null;
  }

  if (id === null) {
    return createJsonRpcError(null, -32600, "Invalid Request");
  }

  if (message.method === "initialize") {
    return createInitializeResult(id, selectInitializeProtocolVersion(message.params));
  }

  if (message.method === "tools/list") {
    if (!isValidToolsListParams(message.params, Object.hasOwn(message, "params"))) {
      return createJsonRpcError(id, -32602, "Invalid params");
    }

    return createToolsListResult(id);
  }

  if (message.method === "tools/call") {
    return handleToolsCall(id, message.params);
  }

  return createJsonRpcError(id, -32601, "Method not found");
}

export function createJsonRpcError(
  id: JsonRpcId | null,
  code: JsonRpcErrorCode,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse {
  const error =
    data === undefined
      ? {
          code,
          message,
        }
      : {
          code,
          message,
          data,
        };

  return {
    jsonrpc: "2.0",
    id,
    error,
  };
}

export function createInitializeResult(
  id: JsonRpcId,
  protocolVersion = MCP_PROTOCOL_VERSION,
): InitializeResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion,
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      },
    },
  };
}

function selectInitializeProtocolVersion(params: unknown): string {
  if (!isRecord(params) || Array.isArray(params)) {
    return MCP_PROTOCOL_VERSION;
  }

  return typeof params.protocolVersion === "string" && isCompatibleMcpProtocolDateString(params.protocolVersion)
    ? params.protocolVersion
    : MCP_PROTOCOL_VERSION;
}

function isCompatibleMcpProtocolDateString(protocolVersion: string): boolean {
  if (!mcpProtocolDateStringPattern.test(protocolVersion)) {
    return false;
  }

  const year = Number(protocolVersion.slice(0, 4));
  const month = Number(protocolVersion.slice(5, 7));
  const day = Number(protocolVersion.slice(8, 10));

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    protocolVersion >= minimumCompatibleMcpProtocolDate
  );
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function createToolsListResult(id: JsonRpcId): ToolsListResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      tools: PR38_MCP_TOOLS,
    },
  };
}

function handleToolsCall(id: JsonRpcId, params: unknown): ToolsCallResponse | JsonRpcErrorResponse {
  const call = parseToolsCallParams(params);
  if (call === null) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  if (call.name === "norma.getVersion") {
    return callGetVersion(id, call.arguments);
  }

  if (call.name === "norma.serializeCanonicalJson") {
    return callSerializeCanonicalJson(id, call.arguments);
  }

  if (call.name === "norma.verifyRun") {
    return callVerifyRun(id, call.arguments);
  }

  if (call.name === "norma.verifyArtifactFreshness") {
    return callVerifyArtifactFreshness(id, call.arguments);
  }

  if (call.name === "norma.replayMvpDemo") {
    return callReplayMvpDemo(id, call.arguments);
  }

  return createJsonRpcError(id, -32602, `Unknown tool: ${call.name}`);
}

function callGetVersion(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  if (toolArguments !== undefined && Object.keys(toolArguments).length !== 0) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  return createToolResult(id, {
    kind: "norma-mcp-tool-result",
    tool: "norma.getVersion",
    status: "ok",
    coreVersion: CORE_VERSION,
    protocolVersion: MCP_PROTOCOL_VERSION,
    serverName: MCP_SERVER_NAME,
    serverVersion: MCP_SERVER_VERSION,
    capabilities: {
      toolsList: true,
      getVersion: true,
      serializeCanonicalJson: true,
      verifyRun: true,
      verifyArtifactFreshness: true,
      replayMvpDemo: true,
      resources: false,
      prompts: false,
      remoteMcp: false,
    },
  });
}

function callSerializeCanonicalJson(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  if (toolArguments === undefined) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  const argumentKeys = Object.keys(toolArguments);
  if (
    !Object.hasOwn(toolArguments, "value") ||
    argumentKeys.some((key) => key !== "value" && key !== "policy")
  ) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  if (
    Object.hasOwn(toolArguments, "policy") &&
    (typeof toolArguments.policy !== "string" || toolArguments.policy !== STABLE_SERIALIZATION_VERSION)
  ) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  if (!isJsonCompatibleValue(toolArguments.value)) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  try {
    return createToolResult(id, {
      kind: "norma-mcp-tool-result",
      tool: "norma.serializeCanonicalJson",
      status: "ok",
      serializationVersion: STABLE_SERIALIZATION_VERSION,
      canonicalJson: serializeCanonicalJson(toolArguments.value),
    });
  } catch {
    return createJsonRpcError(id, -32603, "Internal error");
  }
}

function callVerifyRun(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  const input = parseVerifyToolInput(toolArguments);
  if (input === invalidVerifyToolInput) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  try {
    const result = verifyRun(input as Parameters<typeof verifyRun>[0]);
    return createToolResult(id, {
      kind: "norma-mcp-tool-result",
      tool: "norma.verifyRun",
      status: result.status,
      result,
    });
  } catch {
    return createJsonRpcError(id, -32603, "Internal error");
  }
}

function callVerifyArtifactFreshness(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  const input = parseVerifyToolInput(toolArguments);
  if (input === invalidVerifyToolInput) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  try {
    const result = verifyArtifactFreshness(input as Parameters<typeof verifyArtifactFreshness>[0]);
    return createToolResult(id, {
      kind: "norma-mcp-tool-result",
      tool: "norma.verifyArtifactFreshness",
      status: result.status,
      result,
    });
  } catch {
    return createJsonRpcError(id, -32603, "Internal error");
  }
}

function callReplayMvpDemo(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  if (toolArguments !== undefined && Object.keys(toolArguments).length !== 0) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  try {
    const mvpDemoInput = createMvpDemoInput();
    const demoResult = runMvpDemo(mvpDemoInput);
    if (demoResult.status !== "ok" || demoResult.output === null) {
      return createJsonRpcError(id, -32603, "Internal error");
    }

    const result = replayRun({
      run: demoResult.output.runEnvelope,
      mvpDemoInput,
      recordedMvpResult: demoResult.output,
      packLock: demoResult.output.packLock,
      operationContext: demoResult.output.operationContext,
    });

    return createToolResult(id, {
      kind: "norma-mcp-tool-result",
      tool: "norma.replayMvpDemo",
      status: result.status,
      result,
    });
  } catch {
    return createJsonRpcError(id, -32603, "Internal error");
  }
}

function createToolResult(id: JsonRpcId, structuredContent: McpStructuredContent): ToolsCallResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [
        {
          type: "text",
          text: serializeCanonicalJson(structuredContent),
        },
      ],
      structuredContent,
      isError: false,
    },
  };
}

const invalidVerifyToolInput = Symbol("invalidVerifyToolInput");

function parseVerifyToolInput(toolArguments: Readonly<Record<string, unknown>> | undefined): unknown {
  if (toolArguments === undefined) {
    return invalidVerifyToolInput;
  }

  const argumentKeys = Object.keys(toolArguments);
  if (argumentKeys.length !== 1 || !Object.hasOwn(toolArguments, "input")) {
    return invalidVerifyToolInput;
  }

  return isJsonCompatibleValue(toolArguments.input) ? toolArguments.input : invalidVerifyToolInput;
}

function parseToolsCallParams(
  params: unknown,
): { readonly name: string; readonly arguments?: Readonly<Record<string, unknown>> } | null {
  if (!isRecord(params) || Array.isArray(params)) {
    return null;
  }

  const keys = Object.keys(params);
  if (keys.some((key) => key !== "name" && key !== "arguments")) {
    return null;
  }

  if (typeof params.name !== "string") {
    return null;
  }

  if (!Object.hasOwn(params, "arguments")) {
    return {
      name: params.name,
    };
  }

  if (!isRecord(params.arguments) || Array.isArray(params.arguments)) {
    return null;
  }

  return {
    name: params.name,
    arguments: params.arguments,
  };
}

function isValidToolsListParams(params: unknown, hasParams: boolean): boolean {
  if (!hasParams) {
    return true;
  }

  if (!isRecord(params) || Array.isArray(params)) {
    return false;
  }

  const keys = Object.keys(params);
  if (keys.length === 0) {
    return true;
  }

  return keys.length === 1 && keys[0] === "cursor" && typeof params.cursor === "string";
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return (
    (typeof value === "string" && value.length <= MCP_STDIO_MAX_STRING_LENGTH) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function stringifyJsonRpcResponse(
  response: InitializeResponse | ToolsListResponse | ToolsCallResponse | JsonRpcErrorResponse,
): string {
  return JSON.stringify(response);
}

function rawLineLimitFailure(rawLine: string): JsonRpcErrorResponse | null {
  return requestEncoder.encode(rawLine).length > MCP_STDIO_MAX_REQUEST_BYTES
    ? createJsonRpcError(null, -32600, "Invalid Request")
    : null;
}

function parseJsonRpcLine(rawLine: string): { readonly ok: true; readonly message: unknown } | {
  readonly ok: false;
  readonly error: JsonRpcErrorResponse;
} {
  try {
    return { ok: true, message: JSON.parse(rawLine) };
  } catch {
    return { ok: false, error: createJsonRpcError(null, -32700, "Parse error") };
  }
}

function handleParsedJsonRpcMessage(message: unknown): string | null {
  const preDispatchResponse = parsedMessagePreDispatchResponse(message);
  if (preDispatchResponse !== undefined) {
    return preDispatchResponse;
  }

  try {
    const response = handleMcpJsonRpcRequest(message);
    return response === null ? null : stringifyJsonRpcResponse(response);
  } catch {
    return stringifyJsonRpcResponse(createJsonRpcError(safeJsonRpcId(message), -32603, "Internal error"));
  }
}

function parsedMessagePreDispatchResponse(message: unknown): string | null | undefined {
  if (isJsonRpcNotification(message)) {
    return null;
  }

  const limitFailure = parsedMessageLimitFailure(message);
  return limitFailure === null ? undefined : stringifyJsonRpcResponse(limitFailure);
}

function parsedMessageLimitFailure(message: unknown): JsonRpcErrorResponse | null {
  if (jsonValueLimitExceeded(message)) {
    const id = safeJsonRpcId(message);
    return createJsonRpcError(id, limitFailureCode(message), limitFailureMessage(message));
  }

  return null;
}

function safeJsonRpcId(message: unknown): JsonRpcId | null {
  const id = rawJsonRpcId(message);
  return isJsonRpcId(id) ? id : null;
}

function isToolOrListRequest(message: unknown): boolean {
  return isJsonRpcRequestRecord(message) && message.jsonrpc === "2.0" && isToolRequestMethod(message.method);
}

function rawJsonRpcId(message: unknown): unknown {
  return isJsonRpcRequestRecord(message) && Object.hasOwn(message, "id") ? message.id : undefined;
}

function isJsonRpcNotification(message: unknown): boolean {
  if (!isJsonRpcRequestRecord(message) || Object.hasOwn(message, "id")) {
    return false;
  }

  if (message.jsonrpc !== "2.0") {
    return false;
  }

  return isNonEmptyString(message.method);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function limitFailureCode(message: unknown): -32600 | -32602 {
  return isToolOrListRequest(message) ? -32602 : -32600;
}

function limitFailureMessage(message: unknown): "Invalid Request" | "Invalid params" {
  return isToolOrListRequest(message) ? "Invalid params" : "Invalid Request";
}

function isToolRequestMethod(method: unknown): boolean {
  return method === "tools/call" || method === "tools/list";
}

function isJsonRpcRequestRecord(message: unknown): message is Record<string, unknown> {
  return isRecord(message) && !Array.isArray(message);
}

function isJsonCompatibleValue(value: unknown): boolean {
  return !jsonValueLimitExceeded(value);
}

function jsonValueLimitExceeded(value: unknown): boolean {
  const stack: JsonTraversalStackItem[] = [
    { value, depth: 1, ancestors: [] },
  ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      break;
    }

    if (!validateJsonStackItem(current, stack)) {
      return true;
    }
  }

  return false;
}

function validateJsonStackItem(
  item: JsonTraversalStackItem,
  stack: JsonTraversalStackItem[],
): boolean {
  if (item.depth > MCP_STDIO_MAX_JSON_DEPTH) {
    return false;
  }

  const value = item.value;
  return isJsonScalar(value) ? isBoundedJsonScalar(value) : pushJsonCompositeChildren(item, stack);
}

function isJsonScalar(value: unknown): boolean {
  return value === null || typeof value !== "object";
}

function isBoundedJsonScalar(value: unknown): boolean {
  if (typeof value === "string") {
    return value.length <= MCP_STDIO_MAX_STRING_LENGTH;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return value === null || typeof value === "boolean";
}

function pushJsonCompositeChildren(item: JsonTraversalStackItem, stack: JsonTraversalStackItem[]): boolean {
  const value = item.value as object;
  if (item.ancestors.includes(value)) {
    return false;
  }

  const ancestors = [...item.ancestors, value];
  if (Array.isArray(value)) {
    pushJsonArrayItems(value, item.depth + 1, ancestors, stack);
    return true;
  }

  return isPlainJsonRecord(value) && pushJsonRecordEntries(value, item.depth + 1, ancestors, stack);
}

function pushJsonArrayItems(
  value: readonly unknown[],
  depth: number,
  ancestors: readonly object[],
  stack: JsonTraversalStackItem[],
): void {
  for (let index = value.length - 1; index >= 0; index -= 1) {
    stack.push({ value: value[index], depth, ancestors });
  }
}

function pushJsonRecordEntries(
  value: object,
  depth: number,
  ancestors: readonly object[],
  stack: JsonTraversalStackItem[],
): boolean {
  const entries = Object.entries(value);
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const [key, nestedValue] = entries[index] as [string, unknown];
    if (key.length > MCP_STDIO_MAX_STRING_LENGTH) {
      return false;
    }
    stack.push({ value: nestedValue, depth, ancestors });
  }

  return true;
}

function isPlainJsonRecord(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
