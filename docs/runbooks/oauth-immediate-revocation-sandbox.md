# OAuth immediate revocation sandbox runbook

This runbook qualifies immediate replay denial for a public OAuth DCR client
without storing tokens, claims, prompts, emails, credentials, or database
contents. It is a sandbox procedure, not a production migration.

## Fixed contract

- Validate Scalekit access tokens locally with RS256, exact issuer, exact MCP
  resource audience, expiry, subject, tenant claim, and scope.
- Keep provider token introspection outside the runtime: the sandbox provider
  did not document or pass confidential-client introspection for public-DCR
  tokens, and the approved MCP egress boundary remains discovery/JWKS only.
- Set `NORMA_MCP_REVOCATION_MODE=postgresql`.
- Set a dedicated `NORMA_MCP_REVOCATION_HASH_KEY` that is independent from
  `NORMA_MCP_AUDIT_HASH_KEY`; rotate it only after all unexpired cutoff rows
  have expired or been migrated.
- Use the same least-privileged PostgreSQL role as the Railway authorization
  pool. It must be `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT`.
- Grant that exact runtime role schema `USAGE`, table `SELECT`, and the RLS
  read policy. Do not assume the fixture's default role name matches the
  deployed database URL.
- Only an operator/admin connection may insert or delete cutoff rows.
- Store only HMAC-SHA256 identifiers and Unix-second cutoffs. Never store a
  raw JWT or raw claim.

## One-pass qualification

1. Confirm Railway is healthy and serves the exact candidate Git SHA.
2. Confirm the revocation table exists, RLS is forced, the runtime role is
   least-privileged, and the registry is empty.
3. Obtain a public-DCR token with authorization code + PKCE S256. Keep the
   verifier, code, and token in memory only.
4. Send an authenticated MCP `initialize` request and require HTTP `200`.
5. Read the request's HMAC subject identifier from the token-free Railway
   audit log.
6. With the operator connection, upsert a wildcard cutoff for that HMAC
   subject at the current Unix second. Return only a boolean success marker.
7. Replay the exact same in-memory token and require HTTP `401` or `403`.
8. Delete exactly the proof row and verify its absence with a boolean query.
9. Replay the same token once more and require HTTP `200`, proving rollback
   isolation.
10. Clear the SQL editor, stop the helper process, delete temporary files, and
    discard all in-memory token material.

Stop and fail closed if any database lookup errors, if the runtime role is
privileged, if the token lacks `iat`, or if the exact replay remains accepted.

### MCP Inspector compatibility note

MCP Inspector v1.0.0 can complete discovery, DCR, login, and consent but still
fail its browser-side authorization-code exchange with `TypeError: Failed to
fetch` when the provider token endpoint does not allow browser CORS. This is a
client-tool boundary, not a Norma authentication failure. Do not weaken the MCP
server or add token endpoints to work around it.

Use an OAuth client that performs the PKCE token exchange server-side, or a
localhost-only helper that reuses an existing public client and keeps the code,
verifier, and token in memory. The helper may expose only sanitized status
markers, must be stopped after the exact-token replay, and must not create a
new provider resource.

## Evidence recorded on 2026-07-26

Candidate `5460e38` passed the sandbox sequence after the exact-head security
repair: provider introspection was removed, a dedicated revocation HMAC key was
configured, and the runtime role's effective table privileges were verified.

- JWT/JWKS request accepted: `200`
- wildcard durable cutoff recorded: `true`
- exact same-token replay denied: `401`
- proof row removed: `true`
- cleanup verified: `true`
- exact same-token replay after cleanup accepted: `200`

No raw token, authorization code, claim value, credential, prompt, email, or
database row content was persisted in repository artifacts.

The merged runtime was revalidated on 2026-07-26 without a code change:

- merged `main` SHA: `f84a71cb9e1d592eeadbc749cdb1f48e796d556b`
- Railway deployment: `8fa03f94-595c-49fb-82e3-121aa2808ab0`
- initial authenticated `initialize`: `200`
- wildcard durable cutoff recorded: `true`
- exact same-token replay denied: `401`
- exact proof row removed and absence verified: `true`
- exact same-token replay after cleanup: `200`

The hardened fixture was operator-applied in the disposable Supabase sandbox.
An existing public MCP Inspector client was reused, and the authorization code
was exchanged by an ephemeral localhost helper because of the Inspector CORS
boundary above. The SQL editor was cleared, and the helper and in-memory token
were destroyed. The successful helper path created no provider resource. A
preliminary fresh Inspector attempt performed DCR before failing its token
exchange; exact cleanup of that disposable client remains unverified because
the Porphyre OAuth session does not have access to the Scalekit admin workspace.
