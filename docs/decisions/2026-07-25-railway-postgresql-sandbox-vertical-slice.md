# Railway to PostgreSQL sandbox vertical slice

## Status

`LOCAL_CONTRACT_PROVEN_SANDBOX_RUNTIME_REQUIRED`.

This decision adds the smallest repository-side slice after the provider-neutral
authorization boundary. It does not create a Railway or Supabase resource,
deploy a service, run a migration against an external database, select a
provider for production, or authorize a live provider call.

## Boundary

The Railway-hosted MCP runtime remains the authorization boundary. When
`NORMA_MCP_AUTHZ_DATA_MODE=postgresql` is explicitly configured, the runtime
requires `NORMA_MCP_AUTH_TENANT_CLAIM` and an injected PostgreSQL-compatible
pool, then composes the existing provider-neutral transaction adapter. The
disabled default does not create or acquire a database adapter.

When the mode is explicitly `postgresql`, the Railway entrypoint creates a
bounded `pg` pool from the secret `NORMA_MCP_AUTHZ_DATABASE_URL`, requires TLS
outside isolated tests, and injects that pool into the existing adapter. If the
database provider requires a private CA, `NORMA_MCP_POSTGRES_CA` supplies that
CA while certificate verification remains enabled. The adapter resets every
authorization GUC before releasing a pooled connection; a reset failure evicts
the connection. Embedded connection-string TLS overrides are rejected, and
connection plus statement/query timeouts bound the disposable pool. Startup
performs a bounded database connection check before advertising readiness; the
pool is closed during SIGINT/SIGTERM shutdown with non-zero failure reporting.
The URL is never logged or copied into PostgreSQL request context.

The adapter receives only `AuthenticatedRequestContext`; raw JWTs, provider
claim objects, emails, prompts, and request bodies are not passed to the
database layer. The record read is parameterized and schema-specific, and the
transaction-local settings carry subject, tenant, normalized scopes, audience,
and expiry.

## Disposable fixture

`norma_sandbox.authorized_records` is a reversible qualification fixture, not a
production migration. It enables and forces RLS, denies public access, grants
only schema usage and `SELECT` to a named sandbox role, and requires a role that
is neither `SUPERUSER` nor `BYPASSRLS`. The policy binds subject and tenant to
transaction-local settings and fails closed when authorization context is
missing or expired. `POSTGRESQL_SANDBOX_TEARDOWN_SQL` removes the fixture.

No service-role, superuser, BYPASSRLS, Supabase service-key, or secret-key path
is available for user-scoped requests.

## Proof and limitation

Provider-free tests prove exact context-setting order, same-tenant allow,
cross-tenant deny, missing-context deny, schema-specific parameterized reads,
redaction boundaries, startup fail-closed behavior, and teardown/role
constraints. The fake pool is PostgreSQL-compatible contract evidence only; no
live PostgreSQL, Railway, Supabase, cloud resource, production data, or
external migration was used in this changeset.

The next qualification PR supplies the dry-run qualification matrix and its
evidence contract. Production readiness remains closed until all nine sandbox
criteria have actual bounded evidence.
