export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_SERVER_NAME = "norma-core-mcp-stdio-skeleton";
export const MCP_SERVER_VERSION = "0.1.0-pr12";

type JsonRpcId = string | number;

type JsonRpcErrorCode = -32700 | -32600 | -32601 | -32602;

interface McpToolDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

const PR35_DISCOVERY_TOOLS = [
  {
    name: "norma.getVersion",
    title: "Get Norma Core version",
    description:
      "Return Norma Core version and capability metadata. PR35 exposes discovery only; tool calls are implemented in a later PR.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "norma.serializeCanonicalJson",
    title: "Serialize canonical JSON",
    description:
      "Return deterministic canonical JSON for an explicit structured value. PR35 exposes discovery only; tool calls are implemented in a later PR.",
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
] as const satisfies readonly McpToolDefinition[];

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
    readonly tools: typeof PR35_DISCOVERY_TOOLS;
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

export function handleMcpJsonRpcRequest(message: unknown): InitializeResponse | ToolsListResponse | JsonRpcErrorResponse | null {
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
      tools: PR35_DISCOVERY_TOOLS,
    },
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
