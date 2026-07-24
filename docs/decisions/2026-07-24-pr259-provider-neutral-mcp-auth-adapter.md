# PR259 — Provider-neutral MCP resource-server authentication

- **Status:** `CODE_READY_SANDBOX_EXTERNAL_CONFIG_REQUIRED`
- **Scope:** runtime configuration, JWT/JWKS adapter boundary, focused tests, and
  deployment instructions only
- **First sandbox:** Scalekit
- **Fallback:** Auth0 through compatibility aliases

## Problem

The Railway service can build the remote MCP image, but its process currently
requires `NORMA_MCP_AUTH0_*` variables and assumes issuer-relative OIDC
discovery. That is an Auth0-specific baseline and is not sufficient for the
Scalekit MCP resource-server path. The missing `NORMA_MCP_PUBLIC_URL` also
prevents the current service from starting.

## Decision

Use a provider-neutral resource-server adapter with these generic inputs:

| Variable | Meaning |
|---|---|
| `NORMA_MCP_PUBLIC_URL` | HTTPS origin of the deployed service, with trailing `/`; the runtime derives `/mcp` as the resource URL |
| `NORMA_MCP_AUTH_ISSUER` | JWT `iss` expected from the selected provider |
| `NORMA_MCP_AUTH_JWKS_URL` | Optional explicit JWKS URL; use this for Scalekit (`<environment>/keys`) |
| `NORMA_MCP_AUTHORIZATION_SERVER_URL` | Authorization server advertised in Protected Resource Metadata; it may differ from the JWT issuer |
| `NORMA_MCP_AUTH_AUDIENCE` | Exact expected JWT audience; for the sandbox it must equal the MCP resource URL |
| `NORMA_MCP_AUDIT_HASH_KEY` | Secret-manager value of at least 32 characters; never committed or logged |
| `NORMA_MCP_ALLOWED_ORIGINS` | Optional exact HTTPS Origin allowlist; wildcard remains forbidden |

If `NORMA_MCP_AUTH_JWKS_URL` is omitted, the adapter retains issuer-relative
OIDC discovery for the Auth0 fallback. The old `NORMA_MCP_AUTH0_ISSUER` and
`NORMA_MCP_AUTH0_AUDIENCE` names remain read-only compatibility aliases for
rollback; new sandbox configuration must use the generic names.

The adapter continues to fail closed on signature, issuer, exact audience,
resource claim, expiration, not-before, subject, or
`norma:structured-analyze` scope failures. It does not add raw-token logging,
a Scalekit SDK dependency, or a client secret to the resource server.

## Scalekit sandbox mapping

The values to enter in the isolated Railway sandbox are structurally:

```text
NORMA_MCP_PUBLIC_URL=https://<railway-host>/
NORMA_MCP_AUTH_ISSUER=https://<scalekit-environment>/
NORMA_MCP_AUTH_JWKS_URL=https://<scalekit-environment>/keys
NORMA_MCP_AUTHORIZATION_SERVER_URL=https://<scalekit-resource-authorization-server>
NORMA_MCP_AUTH_AUDIENCE=https://<railway-host>/mcp
NORMA_MCP_AUDIT_HASH_KEY=<secret-manager-only>
```

`NORMA_MCP_AUTHORIZATION_SERVER_URL` must be copied from Scalekit Protected
Resource Metadata. `NORMA_MCP_AUTH_AUDIENCE` must match the Scalekit Server URL
exactly; no trailing-slash normalization is implicit for the resource URL.

## Boundary

This change does not create or modify Railway, Scalekit, Auth0, or Supabase
resources; it does not add migrations, provider lock-in, client credentials,
refresh-token handling, or production configuration. Live DCR/CIMD, PKCE,
consent, `resource → aud`, revocation, and Railway → Supabase/RLS remain sandbox
qualification criteria, not local-code proof.

## Rollback

Remove the generic variables and restore the legacy Auth0 aliases in the
deployment secret manager, or revert this adapter change. No database or
provider resource rollback is required.
