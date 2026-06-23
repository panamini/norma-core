export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_SERVER_NAME = "norma-core-mcp-stdio";
export const MCP_SERVER_VERSION = "0.1.0-pr4";

export const MCP_STDIO_MAX_REQUEST_BYTES = 524_288;
export const MCP_STDIO_MAX_JSON_DEPTH = 64;
export const MCP_STDIO_MAX_STRING_LENGTH = 65_536;

export type McpInputErrorCode = "MCP_INPUT_TOO_DEEP" | "MCP_INVALID_INPUT" | "MCP_TOO_LARGE";

type JsonRpcId = string | number;

interface McpInputErrorResponse {
  readonly jsonrpc: "2.0";
  readonly error: {
    readonly code: McpInputErrorCode;
    readonly message: string;
  };
  readonly id: null;
}

interface InitializeResponse {
  readonly jsonrpc: "2.0";
  readonly result: {
    readonly protocolVersion: typeof MCP_PROTOCOL_VERSION;
    readonly capabilities: Record<string, never>;
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
    readonly tools: readonly [];
  };
  readonly id: JsonRpcId;
}

interface JsonTraversalStackItem {
  readonly value: unknown;
  readonly depth: number;
  readonly ancestors: readonly object[];
}

const requestEncoder = new TextEncoder();

export function handleMcpJsonRpcMessage(rawLine: string): string | null {
  try {
    const response = handleRawJsonRpcLine(rawLine);
    return response === null ? null : JSON.stringify(response);
  } catch {
    return JSON.stringify(createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid."));
  }
}

export function handleMcpJsonRpcRequest(
  message: unknown,
): InitializeResponse | ToolsListResponse | McpInputErrorResponse | null {
  const limitFailure = jsonValueLimitFailure(message);
  if (limitFailure !== null) {
    return limitFailure;
  }

  try {
    return handleValidatedJsonRpcRequest(message);
  } catch {
    return createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }
}

export function createMcpInputError(code: McpInputErrorCode, message: string): McpInputErrorResponse {
  return {
    jsonrpc: "2.0",
    error: {
      code,
      message,
    },
    id: null,
  };
}

function handleRawJsonRpcLine(rawLine: string): InitializeResponse | ToolsListResponse | McpInputErrorResponse | null {
  const normalizedLine = rawLine.replace(/\r$/, "");
  if (requestEncoder.encode(normalizedLine).length > MCP_STDIO_MAX_REQUEST_BYTES) {
    return createMcpInputError("MCP_TOO_LARGE", "MCP request payload exceeds maximum size.");
  }

  let message: unknown;
  try {
    message = JSON.parse(normalizedLine);
  } catch {
    return createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }

  return handleMcpJsonRpcRequest(message);
}

function handleValidatedJsonRpcRequest(
  message: unknown,
): InitializeResponse | ToolsListResponse | McpInputErrorResponse | null {
  if (!isJsonRpcRecord(message)) {
    return createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }

  const hasId = Object.hasOwn(message, "id");
  if (!hasId) {
    return isJsonRpcNotification(message) ? null : createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }

  if (!isJsonRpcId(message.id)) {
    return createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }

  if (message.jsonrpc !== "2.0" || typeof message.method !== "string" || message.method.length === 0) {
    return createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }

  if (message.method === "initialize") {
    return createInitializeResult(message.id);
  }

  if (message.method === "tools/list") {
    return isValidToolsListParams(message.params, Object.hasOwn(message, "params"))
      ? createToolsListResult(message.id)
      : createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }

  return createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
}

function createInitializeResult(id: JsonRpcId): InitializeResponse {
  return {
    jsonrpc: "2.0",
    result: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
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
      tools: [],
    },
    id,
  };
}

function isJsonRpcNotification(message: Record<string, unknown>): boolean {
  return message.jsonrpc === "2.0" && typeof message.method === "string" && message.method.length > 0;
}

function isValidToolsListParams(params: unknown, hasParams: boolean): boolean {
  if (!hasParams) {
    return true;
  }

  if (!isJsonRpcRecord(params)) {
    return false;
  }

  const keys = Object.keys(params);
  return keys.length === 0 || (keys.length === 1 && keys[0] === "cursor" && typeof params.cursor === "string");
}

function jsonValueLimitFailure(value: unknown): McpInputErrorResponse | null {
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

    const failure = validateJsonStackItem(item, stack);
    if (failure !== null) {
      return failure;
    }
  }

  return null;
}

function validateJsonStackItem(
  item: JsonTraversalStackItem,
  stack: JsonTraversalStackItem[],
): McpInputErrorResponse | null {
  if (item.depth > MCP_STDIO_MAX_JSON_DEPTH) {
    return createMcpInputError("MCP_INPUT_TOO_DEEP", "MCP request JSON exceeds maximum depth.");
  }

  if (isJsonScalar(item.value)) {
    return isBoundedJsonScalar(item.value) ? null : createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }

  return pushJsonCompositeChildren(item, stack);
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

function pushJsonCompositeChildren(
  item: JsonTraversalStackItem,
  stack: JsonTraversalStackItem[],
): McpInputErrorResponse | null {
  const value = item.value as object;
  if (item.ancestors.includes(value)) {
    return createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }

  const ancestors = [...item.ancestors, value];
  if (Array.isArray(value)) {
    pushJsonArrayItems(value, item.depth + 1, ancestors, stack);
    return null;
  }

  if (!isPlainJsonRecord(value)) {
    return createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }

  return pushJsonRecordEntries(value, item.depth + 1, ancestors, stack);
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
  stack: JsonTraversalStackItem[],
): McpInputErrorResponse | null {
  const entries = Object.entries(value);
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const [key, nestedValue] = entries[index] as [string, unknown];
    if (key.length > MCP_STDIO_MAX_STRING_LENGTH) {
      return createMcpInputError("MCP_INVALID_INPUT", "MCP request is invalid.");
    }

    stack.push({
      value: nestedValue,
      depth,
      ancestors,
    });
  }

  return null;
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return (
    (typeof value === "string" && value.length <= MCP_STDIO_MAX_STRING_LENGTH) ||
    (typeof value === "number" && Number.isFinite(value))
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
