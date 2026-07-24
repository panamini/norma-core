import { createHmac } from "node:crypto";

import {
  createRemoteJWKSet,
  customFetch,
  jwtVerify,
} from "jose";
import type { JWTPayload } from "jose";

import {
  REMOTE_MCP_JWKS_TIMEOUT_MS,
  REMOTE_MCP_REQUIRED_SCOPE,
} from "./remote-http-config.js";
import type { RemoteMcpRuntimeConfig } from "./remote-http-config.js";

export interface VerifiedRemoteMcpAccess {
  readonly rawToken: string;
  readonly subjectId: string;
  readonly scopes: readonly string[];
  readonly clientId: string;
  readonly expiresAt: number;
}

export type RemoteMcpAccessTokenVerifier = (token: string) => Promise<VerifiedRemoteMcpAccess>;

export interface RemoteMcpAuthDependencies {
  readonly fetch?: typeof fetch;
}

export class RemoteMcpAuthenticationError extends Error {
  constructor() {
    super("Authentication failed");
    this.name = "RemoteMcpAuthenticationError";
  }
}

export function createRemoteMcpAccessTokenVerifier(
  config: RemoteMcpRuntimeConfig,
  dependencies: RemoteMcpAuthDependencies = {},
): RemoteMcpAccessTokenVerifier {
  const fetchImplementation = dependencies.fetch ?? fetch;
  let keyResolverPromise: Promise<ReturnType<typeof createRemoteJWKSet>> | undefined;

  return async (token: string): Promise<VerifiedRemoteMcpAccess> => {
    try {
      if (keyResolverPromise === undefined) {
        const pendingResolver = createKeyResolver(config, fetchImplementation);
        keyResolverPromise = pendingResolver;
        pendingResolver.catch(() => {
          if (keyResolverPromise === pendingResolver) {
            keyResolverPromise = undefined;
          }
        });
      }
      const keyResolver = await keyResolverPromise;
      const verified = await jwtVerify(token, keyResolver, {
        algorithms: ["RS256"],
        issuer: config.issuer.href,
        audience: config.audience,
        clockTolerance: 0,
      });
      return verifiedAccess(config, token, verified.payload);
    } catch {
      throw new RemoteMcpAuthenticationError();
    }
  };
}

async function createKeyResolver(
  config: RemoteMcpRuntimeConfig,
  fetchImplementation: typeof fetch,
): Promise<ReturnType<typeof createRemoteJWKSet>> {
  const jwksUrl = config.jwksUrl ?? await discoverJwksUrl(config, fetchImplementation);
  assertIssuerOrigin(config, jwksUrl);
  return createRemoteJWKSet(jwksUrl, {
    timeoutDuration: REMOTE_MCP_JWKS_TIMEOUT_MS,
    cooldownDuration: 30_000,
    cacheMaxAge: 600_000,
    [customFetch]: async (url, options) => {
      if (url !== jwksUrl.href) {
        throw new RemoteMcpAuthenticationError();
      }
      const jwksResponse = await fetchImplementation(url, {
        ...options,
        redirect: "manual",
      });
      rejectRedirect(jwksResponse);
      return jwksResponse;
    },
  });
}

async function discoverJwksUrl(
  config: RemoteMcpRuntimeConfig,
  fetchImplementation: typeof fetch,
): Promise<URL> {
  const discoveryUrl = new URL(".well-known/openid-configuration", config.issuer);
  const response = await sameOriginFetch(config, discoveryUrl, fetchImplementation);
  if (!response.ok) {
    throw new RemoteMcpAuthenticationError();
  }

  const metadata = await response.json() as unknown;
  if (!isRecord(metadata) || metadata.issuer !== config.issuer.href || typeof metadata.jwks_uri !== "string") {
    throw new RemoteMcpAuthenticationError();
  }
  return new URL(metadata.jwks_uri);
}

async function sameOriginFetch(
  config: RemoteMcpRuntimeConfig,
  url: URL,
  fetchImplementation: typeof fetch,
): Promise<Response> {
  assertIssuerOrigin(config, url);
  const response = await fetchImplementation(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(REMOTE_MCP_JWKS_TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  rejectRedirect(response);
  return response;
}

function rejectRedirect(response: Response): void {
  if (response.status >= 300 && response.status < 400) {
    throw new RemoteMcpAuthenticationError();
  }
}

function assertIssuerOrigin(config: RemoteMcpRuntimeConfig, url: URL): void {
  if (url.origin !== config.issuer.origin) {
    throw new RemoteMcpAuthenticationError();
  }
  const insecureTestUrl =
    config.nodeEnv === "test" &&
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]");
  if (url.protocol !== "https:" && !insecureTestUrl) {
    throw new RemoteMcpAuthenticationError();
  }
}

function verifiedAccess(
  config: RemoteMcpRuntimeConfig,
  token: string,
  payload: JWTPayload,
): VerifiedRemoteMcpAccess {
  const subject = typeof payload.sub === "string" ? payload.sub.trim() : "";
  if (subject === "") {
    throw new RemoteMcpAuthenticationError();
  }
  if (payload.aud !== config.audience || typeof payload.exp !== "number") {
    throw new RemoteMcpAuthenticationError();
  }

  validateResourceClaim(config, payload.resource);
  const providerScopes = parseScopes(payload.scope);
  if (!providerScopes.includes(config.authorizationScope)) {
    throw new RemoteMcpAuthenticationError();
  }
  const scopes = normalizeScopes(providerScopes, config.authorizationScope);

  const clientId =
    typeof payload.client_id === "string" && payload.client_id.trim() !== ""
      ? payload.client_id
      : "oauth-client";
  const base = {
    rawToken: token,
    subjectId: createHmac("sha256", config.auditHashKey).update(subject).digest("hex"),
    scopes,
    clientId,
    expiresAt: payload.exp,
  };
  return base;
}

function validateResourceClaim(config: RemoteMcpRuntimeConfig, resource: unknown): void {
  if (resource === undefined) {
    return;
  }
  const resources = typeof resource === "string"
    ? [resource]
    : Array.isArray(resource) && resource.every((entry) => typeof entry === "string")
      ? resource
      : [];
  if (resources.length !== 1 || resources[0] !== config.resourceUrl.href) {
    throw new RemoteMcpAuthenticationError();
  }
}

function parseScopes(scope: unknown): readonly string[] {
  if (typeof scope !== "string") {
    return [];
  }
  return [...new Set(scope.split(/\s+/u).filter((entry) => entry !== ""))].sort();
}

function normalizeScopes(scopes: readonly string[], authorizationScope: string): readonly string[] {
  return [...new Set(scopes.map((scope) => (
    scope === authorizationScope ? REMOTE_MCP_REQUIRED_SCOPE : scope
  )))].sort();
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
