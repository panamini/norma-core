# PR258 RLS Boundary and MCP Sandbox Qualification Contract

## Status

`SHORTLISTED_PENDING_SANDBOX` / preparation-only.

Latest qualification result: the existing Scalekit sandbox needs an explicit
provider-scope alias; the canonical Norma scope remains unchanged.

This document is the narrow PR258 contract for the RLS boundary and the first
Scalekit sandbox qualification. It does not select a production authorization
provider, create a cloud or OAuth resource, add a migration, deploy a service,
or authorize a live provider call.

An existing Scalekit sandbox was configured and checked separately on
2026-07-24. Its bounded result is recorded below. This does not authorize a
production resource, migration, deployment, or provider lock.

The current shortlist remains:

- Scalekit is the first sandbox candidate because the priority is the simplest
  ChatGPT-to-MCP connection path; its provider-scope alias path is now defined.
- Auth0 is the fallback candidate only if the explicit Scalekit adapter
  mapping fails end-to-end qualification.
- WorkOS remains conditional on written confirmation of the custom scope, its
  presence in the MCP JWT, and Supabase RLS compatibility.
- No provider is locked for production before sandbox proof and a separate
  decision.

## Decision: the Railway API is the authorization boundary

The current MCP credential cannot be treated as a directly accepted Supabase
RLS credential. The existing remote MCP contract requires an OAuth access token
for the MCP API audience with the `norma:structured-analyze` scope. Supabase's
Auth0 integration requires a literal `role: authenticated` claim for the
authenticated Postgres role and documents sending an Auth0 ID token. Auth0's
custom API access-token rules do not provide that literal non-namespaced claim
reliably; an ID token cannot replace the MCP access token without changing the
current MCP contract.

The authorized sandbox boundary is therefore:

```text
MCP client
  -> provider-neutral MCP verifier in the Railway API/runtime
  -> provider-neutral authenticated request context
  -> one server-side PostgreSQL transaction with RLS context
  -> probable Supabase PostgreSQL target
```

The Railway service, not Supabase and not the database connection, owns the
MCP authorization decision. Supabase remains a probable PostgreSQL/RLS target,
but it receives only the server-side transaction context needed by the RLS
contract. The raw MCP JWT must never be forwarded to Supabase, stored, logged,
or used as a database credential.

This is a sandbox architecture decision, not a production-provider lock. A
future direct Supabase Data API path would require a new decision and a
positive qualification using the exact issued token shape; it is not an
implicit fallback.

## Provider-neutral adapter contract

The adapter boundary must expose a provider-neutral result rather than Auth0,
Scalekit, or WorkOS fields:

```text
AuthenticatedRequestContext {
  subject: opaque stable provider subject
  tenant: opaque authorized tenant or account identity
  scopes: normalized granted scopes
  audience: validated resource audience
  expiresAt: validated expiry
}
```

Required invariants:

1. The provider adapter validates issuer, signature, audience, expiry, subject,
   and the required MCP scope before producing the context.
2. Tenant/account identity is explicit. Missing or ambiguous tenant context
   fails closed; it is never inferred from prompt text, URL, email, or a row
   supplied by the caller.
3. The database layer accepts only the context, not a provider token or
   provider-specific claim object.
4. Every user-data query runs inside a transaction-local RLS context. The
   context is reset by rollback/commit before a pooled connection is reused.
5. RLS defaults to deny. A missing subject, tenant, scope, or transaction
   context cannot read or write user data.
6. Service-role, superuser, bypass-RLS, and Supabase service/secret-key
   credentials are forbidden for user-scoped requests. Migrations and
   administrative operations are separate non-user paths.
7. Subject and tenant identifiers may be pseudonymized for bounded logs, but
   raw tokens, claims, emails, prompts, request bodies, and database contents
   are not application log fields.

The contract does not prescribe a provider SDK, JWT library, database client,
schema, table name, or migration. Those require the sandbox qualification and
their own scoped decision.

## Scalekit-first sandbox qualification and Auth0 fallback

No external action is authorized by this PR. After a separate exact
confirmation authorizes an isolated sandbox, run one frozen qualification
matrix against Scalekit first. If Scalekit fails any blocking criterion, run
the same matrix against Auth0 without relaxing the contract or changing the
Railway-to-Supabase boundary.

The exact matrix is:

1. **MCP/OAuth discovery** — the MCP protected-resource challenge and OAuth
   authorization-server metadata resolve to the configured sandbox endpoints.
2. **Client onboarding** — DCR or CIMD completes for the ChatGPT client; if the
   ChatGPT surface requires a predefined client instead, qualify that exact
   pre-registration and record the additional configuration.
3. **PKCE** — authorization-code flow uses `S256`; weaker or absent PKCE fails.
4. **Resource to audience** — the canonical MCP resource is propagated into
   the authorization request and the issued token has the exact expected
   `aud`; a wrong or missing resource/audience fails.
5. **Scope** — the issued token contains exactly the configured provider scope,
   and the provider-neutral adapter maps that one value to Norma's canonical
   `norma:structured-analyze` context. The mapping is explicit, one-to-one, and
   fail-closed; it is not substring matching or a contract relaxation.
6. **Token verification** — JWKS, issuer, audience, expiration, subject, and
   scopes are verified; wrong signature, issuer, audience, expiry, subject,
   resource, or scope fails closed.
7. **Lifecycle** — user consent, refresh, and revocation are each exercised;
   revoked or expired access cannot call the MCP.
8. **Data boundary** — the request crosses Railway API/runtime to Supabase
   PostgreSQL/RLS through the server-side transaction context; the raw MCP JWT
   is not forwarded as a database credential.
9. **Isolation and rollback** — tenant isolation, transaction-local RLS,
   pooled-connection reset, missing-context deny, and adapter-neutral rollback
   all pass. Rollback must be reversible configuration/adapter selection only;
   no irreversible migration is permitted.

All nine criteria are blocking. A provider passes only when every criterion is
proven with disposable identities, bounded evidence, and no production data.
If both providers pass, select the one requiring less configuration and
showing lower residual security and operational risk. This is a sandbox
qualification choice only; it does not lock a production provider.

The sandbox must stop with `NEEDS_DECISION` if client onboarding needs an
unapproved ChatGPT registration, a token cannot carry the exact authorization
context, RLS cannot bind to one transaction, any cross-tenant or bypass-RLS
path is observed, or rollback would require an irreversible migration.

No provider implementation, production resource, migration, deployment, or
runtime provider lock is part of PR258. The result below records a bounded
configuration check of an already-existing Scalekit sandbox performed outside
the PR; it is not a full OAuth or RLS qualification. WorkOS remains
comparison/qualification work only and is not implemented.

## Observed Scalekit sandbox result (2026-07-24)

The existing sandbox resource was configured for the Railway MCP URL with DCR
and CIMD enabled. Its authorization-server metadata returned the expected
issuer, JWKS URI, registration endpoint, revocation endpoint, and
`code_challenge_methods_supported: ["S256"]`. The metadata also exposed the
configured permission `norma:structured_analyze`.

The exact Norma scope `norma:structured-analyze` could not be added: the
Scalekit permission form rejected it and stated that permission names allow
letters, numbers, underscores, and colons, but not special characters. The
official Scalekit API documentation describes the same alphanumeric,
colon-and-underscore naming convention, and says permission names are
immutable.

The provider naming mismatch is resolved by the adapter boundary: Scalekit
advertises and issues `norma:structured_analyze`, while Norma's internal
authenticated context remains `norma:structured-analyze`. This is not a change
to the core contract and does not prove the issued token, resource-to-audience
mapping, consent lifecycle, Railway-to-Supabase RLS, or tenant isolation. The
full Scalekit matrix continues; Auth0 remains fallback only if this mapping
fails in the end-to-end sandbox.

## Proof classification

### Confirmed for this offline contract

- The merged PR257 baseline is `6783cb371b3ed29779e75e50018005cd17d0ebc5`.
- The current MCP contract requires an OAuth access token and the
  `norma:structured-analyze` scope; this PR does not lock its issuer for
  production.
- Supabase documents third-party Auth0 support, asymmetric JWTs, a literal
  `role` claim for the authenticated Postgres role, and an ID-token example.
- An existing Scalekit sandbox exposed the Railway MCP resource, DCR/CIMD
  configuration, PKCE S256 metadata, JWKS/issuer metadata, registration and
  revocation endpoints, and the underscore-form permission. This is bounded
  sandbox evidence, not proof of an issued token or end-to-end authorization.
- Scalekit rejects the hyphenated external permission name in the configured
  sandbox; official API documentation confirms the provider naming restriction.
  The adapter now has an explicit `norma:structured_analyze` to
  `norma:structured-analyze` normalization boundary.
- Railway's PostgreSQL documentation describes a database service and
  connection variables, not JWT/RLS authorization; the conclusion that the
  Railway API must own this boundary is therefore an architectural inference,
  not a claim that Railway PostgreSQL natively accepts MCP JWTs.
- No direct Supabase acceptance of the current MCP access-token shape has been
  proven in a configured sandbox.

### Still unproven and intentionally deferred

- any Auth0 tenant, application, API, custom action, or OAuth resource;
- any Supabase project/integration, PostgreSQL schema, RLS policy, or migration;
- any Railway service, database, deployment, secret, or network configuration;
- exact tenant/account claim mapping for the first sandbox;
- any ChatGPT DCR, CIMD, or predefined-client path;
- any issued-token proof for resource/audience, scope, JWKS, lifecycle, or
  revocation for either candidate;
- live two-tenant RLS isolation and pooled-connection reset behavior;
- production provider selection or public/commercial readiness.

## Sources and related contracts

- [Stateless Remote MCP Commercial Beta Contract](2026-07-13-stateless-remote-mcp-commercial-beta-contract.md)
- [Remote MCP private-beta runbook](../REMOTE_MCP_PRIVATE_BETA_RUNBOOK.md)
- [Supabase Auth0 third-party authentication](https://supabase.com/docs/guides/auth/third-party/auth0)
- [Supabase JWT and third-party JWT handling](https://supabase.com/docs/guides/auth/jwts)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Railway PostgreSQL](https://docs.railway.com/databases/postgresql)
- [Auth0 scopes and custom API access](https://auth0.com/docs/get-started/apis/scopes/sample-use-cases-scopes)
- [Auth0 custom claims restrictions](https://auth0.com/docs/secure/tokens/json-web-tokens/create-custom-claims)
- [Scalekit MCP authentication overview](https://docs.scalekit.com/authenticate/mcp/overview/)
- [Scalekit MCP OAuth quickstart](https://docs.scalekit.com/authenticate/mcp/quickstart/)
- [Scalekit MCP client management](https://docs.scalekit.com/authenticate/mcp/managing-mcp-clients/)
- [Scalekit API permissions and naming](https://docs.scalekit.com/apis/?product=agentkit)
- [Observed Scalekit authorization-server metadata](https://twoweeks.scalekit.dev/resources/res_135600270506722306/.well-known/oauth-authorization-server)

The compute topology remains provider-neutral: Core stays local/offline,
Railway is the prospective CPU/control plane, and no GPU or external resource
is introduced by this contract.
