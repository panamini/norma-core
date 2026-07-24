# PostgreSQL authorization transaction boundary

## Status

`LOCAL_POSTGRESQL_CONTRACT_PROVEN_LIVE_RLS_DEFERRED`.

This decision advances the provider-neutral authorization boundary after PR266.
It does not prove a live Supabase policy, select a production OAuth provider,
create database resources, add a schema or migration, deploy, or make a
provider call.

## Decision

The active `AuthorizationDataAdapter` can now be backed by an injected
PostgreSQL-compatible pool without adding a database driver or coupling the MCP
runtime to Supabase.

For each authenticated operation, the adapter:

1. validates the provider-neutral request context before acquiring a connection;
2. starts one transaction;
3. writes the configured subject, tenant, scopes, audience, and expiry settings
   with parameterized `set_config($1, $2, true)` calls;
4. runs the data operation on that same connection;
5. commits on success or rolls back on failure; and
6. closes the transaction and releases the connection, evicting it if rollback
   cannot restore a safe pooled state.

Setting names are explicit configuration, validated, and unique. Schema-specific
record reads remain injected. The adapter therefore does not invent a table,
policy, claim mapping, migration, or Supabase-specific behavior.

## Deterministic proof

Local contract tests prove:

- valid context reaches the injected PostgreSQL connection;
- setting names and values are query parameters rather than interpolated SQL;
- a simulated same-tenant read is allowed and a cross-tenant read is absent;
- missing, malformed, scope-less, expired, or token-bearing context fails before
  `pool.connect()`;
- success commits and failure rolls back;
- transaction-local state is cleared before pooled reuse;
- a rollback failure releases the connection with an eviction error;
- a closed transaction cannot be reused; and
- no bearer token or client secret is accepted by or emitted from this adapter.

These tests use an injected deterministic connection. They are not evidence that
a real Supabase RLS policy or pool configuration enforces the same behavior.

## Rollback and next gate

Rollback remains dependency/configuration selection or a focused code revert;
the current runtime is unchanged until this adapter is explicitly injected.

The single deferred live gate is one disposable Railway to Supabase qualification
using the real schema and policy: same-tenant allow, cross-tenant deny,
missing/invalid context deny, pooled-connection reset, rollback isolation, and
token-free logs. Production provider selection remains provisional until that
gate plus refresh/revocation and rollback evidence passes.
