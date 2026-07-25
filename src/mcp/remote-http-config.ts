export const REMOTE_MCP_SERVER_NAME = "norma-core-remote-mcp";
export const REMOTE_MCP_SERVER_VERSION = "0.1.0-pr137";
export const REMOTE_MCP_REQUIRED_SCOPE = "norma:structured-analyze";
export const REMOTE_MCP_SUPPORTED_PROTOCOL_VERSIONS = Object.freeze([
  "2025-11-25",
  "2025-06-18",
] as const);

export const REMOTE_MCP_MAX_REQUEST_BYTES = 524_288;
export const REMOTE_MCP_MAX_JSON_DEPTH = 64;
export const REMOTE_MCP_MAX_STRING_LENGTH = 65_536;
export const REMOTE_MCP_MAX_ARRAY_ELEMENTS = 4_096;
export const REMOTE_MCP_MAX_SUBJECT_CONCURRENCY = 2;
export const REMOTE_MCP_MAX_SUBJECT_ATTEMPTS_PER_HOUR = 30;
export const REMOTE_MCP_MAX_AUTHENTICATED_ATTEMPTS_PER_MINUTE = 120;
export const REMOTE_MCP_MAX_UNAUTHORIZED_ATTEMPTS_PER_MINUTE = 600;
export const REMOTE_MCP_REQUEST_TIMEOUT_MS = 10_000;
export const REMOTE_MCP_JWKS_TIMEOUT_MS = 5_000;

export type RemoteMcpAuthorizationDataMode = "disabled" | "postgresql";

export interface RemoteMcpRuntimeConfig {
  readonly port: number;
  readonly nodeEnv: string;
  readonly publicUrl: URL;
  readonly resourceUrl: URL;
  readonly issuer: URL;
  readonly issuerClaim: string;
  readonly authorizationServerUrl: URL;
  readonly jwksUrl: URL | undefined;
  readonly authorizationScope: string;
  readonly tenantClaim: string | undefined;
  readonly authorizationDataMode: RemoteMcpAuthorizationDataMode;
  readonly audience: string;
  readonly auditHashKey: string;
  readonly allowedOrigins: ReadonlySet<string>;
}

export function loadRemoteMcpRuntimeConfig(
  environment: Readonly<Record<string, string | undefined>>,
): RemoteMcpRuntimeConfig {
  const nodeEnv = environment.NODE_ENV ?? "production";
  const publicUrl = parseConfiguredUrl(
    required(environment.NORMA_MCP_PUBLIC_URL, "NORMA_MCP_PUBLIC_URL"),
    "NORMA_MCP_PUBLIC_URL",
    nodeEnv,
  );
  if (publicUrl.pathname !== "/" || publicUrl.search !== "" || publicUrl.hash !== "") {
    throw new Error("NORMA_MCP_PUBLIC_URL must be an origin URL");
  }
  const resourceUrl = new URL("/mcp", publicUrl);

  const issuerInput = required(
    environment.NORMA_MCP_AUTH_ISSUER ?? environment.NORMA_MCP_AUTH0_ISSUER,
    "NORMA_MCP_AUTH_ISSUER",
  );
  const issuer = parseConfiguredUrl(
    issuerInput,
    "NORMA_MCP_AUTH_ISSUER",
    nodeEnv,
  );
  if (issuer.search !== "" || issuer.hash !== "") {
    throw new Error("NORMA_MCP_AUTH_ISSUER must not contain query or fragment data");
  }
  const authorizationServerUrl = parseConfiguredUrl(
    environment.NORMA_MCP_AUTHORIZATION_SERVER_URL ?? issuer.href,
    "NORMA_MCP_AUTHORIZATION_SERVER_URL",
    nodeEnv,
  );
  if (authorizationServerUrl.search !== "" || authorizationServerUrl.hash !== "") {
    throw new Error("NORMA_MCP_AUTHORIZATION_SERVER_URL must not contain query or fragment data");
  }

  const jwksUrl = environment.NORMA_MCP_AUTH_JWKS_URL === undefined
    ? undefined
    : parseConfiguredUrl(environment.NORMA_MCP_AUTH_JWKS_URL, "NORMA_MCP_AUTH_JWKS_URL", nodeEnv);
  const authorizationScope = parseOAuthScope(
    environment.NORMA_MCP_AUTH_SCOPE ?? REMOTE_MCP_REQUIRED_SCOPE,
    "NORMA_MCP_AUTH_SCOPE",
  );
  const tenantClaim = environment.NORMA_MCP_AUTH_TENANT_CLAIM === undefined
    ? undefined
    : parseJwtClaimName(environment.NORMA_MCP_AUTH_TENANT_CLAIM, "NORMA_MCP_AUTH_TENANT_CLAIM");
  const authorizationDataMode = parseAuthorizationDataMode(environment.NORMA_MCP_AUTHZ_DATA_MODE);
  if (authorizationDataMode === "postgresql" && tenantClaim === undefined) {
    throw new Error("NORMA_MCP_AUTHZ_DATA_MODE=postgresql requires NORMA_MCP_AUTH_TENANT_CLAIM");
  }
  const audience = required(
    environment.NORMA_MCP_AUTH_AUDIENCE ?? environment.NORMA_MCP_AUTH0_AUDIENCE,
    "NORMA_MCP_AUTH_AUDIENCE",
  );
  if (audience !== resourceUrl.href) {
    throw new Error("NORMA_MCP_AUTH_AUDIENCE must exactly match the MCP resource URL");
  }
  const auditHashKey = required(environment.NORMA_MCP_AUDIT_HASH_KEY, "NORMA_MCP_AUDIT_HASH_KEY");
  if (auditHashKey.length < 32) {
    throw new Error("NORMA_MCP_AUDIT_HASH_KEY must contain at least 32 characters");
  }

  const allowedOrigins = parseAllowedOrigins(environment.NORMA_MCP_ALLOWED_ORIGINS, nodeEnv);

  return {
    port: parsePort(environment.PORT),
    nodeEnv,
    publicUrl,
    resourceUrl,
    issuer,
    issuerClaim: issuerInput.endsWith("/") || !issuer.href.endsWith("/")
      ? issuer.href
      : issuer.href.slice(0, -1),
    authorizationServerUrl,
    jwksUrl,
    authorizationScope,
    tenantClaim,
    authorizationDataMode,
    audience,
    auditHashKey,
    allowedOrigins,
  };
}

function parseAuthorizationDataMode(
  value: string | undefined,
): RemoteMcpAuthorizationDataMode {
  if (value === undefined || value === "disabled") {
    return "disabled";
  }
  if (value === "postgresql") {
    return value;
  }
  throw new Error("NORMA_MCP_AUTHZ_DATA_MODE must be disabled or postgresql");
}

function parseJwtClaimName(value: string, name: string): string {
  if (value.trim() === "" || /[\s\u0000-\u001F\u007F]/u.test(value)) {
    throw new Error(`${name} must contain one non-empty JWT claim name`);
  }
  return value;
}

function parseOAuthScope(value: string, name: string): string {
  // RFC 6749 scope-token grammar: reject whitespace, quotes, and control data
  // before the value is reflected in OAuth metadata or WWW-Authenticate.
  if (!/^[\x21\x23-\x5B\x5D-\x7E]+$/u.test(value)) {
    throw new Error(`${name} must contain exactly one valid OAuth scope token`);
  }
  return value;
}

function parseConfiguredUrl(value: string, name: string, nodeEnv: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }

  const insecureTestUrl =
    nodeEnv === "test" &&
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]");
  if (url.protocol !== "https:" && !insecureTestUrl) {
    throw new Error(`${name} must use HTTPS outside isolated tests`);
  }
  if (url.username !== "" || url.password !== "") {
    throw new Error(`${name} must not contain credentials`);
  }
  return url;
}

function parseAllowedOrigins(value: string | undefined, nodeEnv: string): ReadonlySet<string> {
  if (value === undefined || value.trim() === "") {
    return new Set();
  }

  const origins = new Set<string>();
  for (const entry of value.split(",")) {
    const candidate = entry.trim();
    if (candidate === "*") {
      throw new Error("Wildcard origins are forbidden");
    }
    const url = parseConfiguredUrl(candidate, "NORMA_MCP_ALLOWED_ORIGINS", nodeEnv);
    if (url.pathname !== "/" || url.search !== "" || url.hash !== "") {
      throw new Error("Allowed origins must be origin URLs");
    }
    origins.add(url.origin);
  }
  return origins;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return 3_000;
  }
  if (!/^\d+$/u.test(value)) {
    throw new Error("PORT must be an integer");
  }
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT is outside the valid range");
  }
  return port;
}

function required(value: string | undefined, name: string): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}
