export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_SERVER_NAME = "norma-core-mcp-stdio";
export const MCP_SERVER_VERSION = "0.1.0-pr4";

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
    readonly capabilities: Record<string, never>;
    readonly serverInfo: {
      readonly name: typeof MCP_SERVER_NAME;
      readonly version: typeof MCP_SERVER_VERSION;
    };
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
    return JSON.stringify(createMcpInputError(null, -32603, "Internal error", "MCP_INTERNAL_ERROR"));
  }
}

export function handleMcpJsonRpcRequest(message: unknown): InitializeResponse | JsonRpcErrorResponse | null {
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

function handleRawJsonRpcLine(rawLine: string): InitializeResponse | JsonRpcErrorResponse | null {
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
): InitializeResponse | JsonRpcErrorResponse | null {
  if (!isJsonRpcRecord(message)) {
    return createMcpInputError(null, -32600, "Invalid Request", "MCP_INVALID_INPUT");
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

  return createMcpInputError(requestId, -32601, "Method not found", "MCP_METHOD_NOT_FOUND");
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

function jsonValueLimitFailure(value: unknown, id: JsonRpcId): JsonRpcErrorResponse | null {
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
  id: JsonRpcId,
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

function scalarLimitFailure(value: unknown, id: JsonRpcId): JsonRpcErrorResponse | null {
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
  id: JsonRpcId,
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
  id: JsonRpcId,
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
