# PR266 — Provider-neutral authorization data boundary

## Status

`LOCAL_CONTRACT_PROVEN_SANDBOX_REQUIRED`.

This decision records the strongest provider-free proof available in the
repository. It does not select Scalekit, Auth0, or another production provider,
create a Supabase project, add a PostgreSQL schema or migration, or authorize a
live Railway call.

## Decision

Keep the Railway resource-server verifier responsible for turning a validated
provider token into an optional provider-neutral context:

```text
AuthenticatedRequestContext {
  subject: opaque stable provider subject
  tenant: opaque authorized tenant or account identity
  scopes: normalized granted scopes
  audience: validated MCP resource audience
  expiresAt: validated expiry
}
```

When `NORMA_MCP_AUTH_TENANT_CLAIM` is configured, the verifier requires that
claim to be one non-empty string and fails closed when it is missing or
ambiguous. The context contains no raw token, client secret, provider claim
object, email, prompt, or request body.

The remote server accepts an injected `AuthorizationDataAdapter` and keeps its
transaction callback provider-neutral. The adapter receives only the context;
provider selection and rollback remain dependency/configuration choices. The
existing MCP path is unchanged when no data adapter is configured, preserving
the current sandbox runtime until a qualified data adapter is supplied.

## Local proof

The deterministic in-memory RLS adapter proves:

- a same-tenant record is readable;
- a cross-tenant record is returned as absent;
- missing, expired, malformed, scope-less, or token-bearing contexts fail
  closed;
- transaction state closes after commit/rollback and does not leak into the
  next transaction;
- the authenticated context reaches the injected adapter while logs remain
  pseudonymous and token-free.

This is contract evidence, not Supabase PostgreSQL/RLS runtime evidence.

## Sandbox boundary and limitations

Still required in the already-authorized isolated sandbox are the exact tenant
claim mapping, disposable two-tenant identities, one server-side Railway to
Supabase PostgreSQL transaction with transaction-local RLS, pooled-connection
reset, and rollback verification. No credentials, production resources,
migrations, or provider calls are used by this changeset.

If the sandbox adapter fails, rollback is a reversible dependency/configuration
selection or a code revert; no database or OAuth migration is required.
