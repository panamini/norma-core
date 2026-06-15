import { CORE_VERSION } from "../core-constants.js";
import { verifyArtifactFreshness } from "../artifact-freshness.js";
import { createMvpDemoInput, runMvpDemo } from "../mvp-demo.js";
import { replayRun } from "../run-replay.js";
import { verifyRun } from "../run-verification.js";
import { serializeCanonicalJson, STABLE_SERIALIZATION_VERSION } from "../serialization.js";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_SERVER_NAME = "norma-core-mcp-stdio-skeleton";
export const MCP_SERVER_VERSION = "0.1.0-pr12";

type JsonRpcId = string | number;

type JsonRpcErrorCode = -32700 | -32600 | -32601 | -32602 | -32603;

interface McpToolDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

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
    readonly protocolVersion: typeof MCP_PROTOCOL_VERSION;
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

export function handleMcpJsonRpcMessage(rawLine: string): string | null {
  let message: unknown;

  try {
    message = JSON.parse(rawLine);
  } catch {
    return JSON.stringify(createJsonRpcError(null, -32700, "Parse error"));
  }

  const response = handleMcpJsonRpcRequest(message);
  return response === null ? null : JSON.stringify(response);
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
    return createInitializeResult(id);
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

export function createInitializeResult(id: JsonRpcId): InitializeResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: MCP_PROTOCOL_VERSION,
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
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

function isJsonCompatibleValue(value: unknown, seen: WeakSet<object> = new WeakSet()): boolean {
  if (value === null) {
    return true;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value !== "object") {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }

  seen.add(value);

  const result = Array.isArray(value) ? isJsonCompatibleArray(value, seen) : isJsonCompatibleRecord(value, seen);

  seen.delete(value);
  return result;
}

function isJsonCompatibleArray(value: readonly unknown[], seen: WeakSet<object>): boolean {
  return value.every((item) => isJsonCompatibleValue(item, seen));
}

function isJsonCompatibleRecord(value: object, seen: WeakSet<object>): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  return Object.values(value).every((item) => isJsonCompatibleValue(item, seen));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
