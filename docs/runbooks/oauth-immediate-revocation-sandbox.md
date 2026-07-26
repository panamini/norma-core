# OAuth immediate revocation sandbox runbook

This runbook qualifies immediate replay denial for a public OAuth DCR client
without storing tokens, claims, prompts, emails, credentials, or database
contents. It is a sandbox procedure, not a production migration.

## Fixed contract

- Validate Scalekit access tokens locally with RS256, exact issuer, exact MCP
  resource audience, expiry, subject, tenant claim, and scope.
- Set `NORMA_MCP_AUTH_INTROSPECTION_MODE=disabled` when the provider does not
  document or pass confidential-client introspection for public-DCR tokens.
- Set `NORMA_MCP_REVOCATION_MODE=postgresql`.
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

## Evidence recorded on 2026-07-26

Candidate `7a27cb1` passed the sandbox sequence:

- JWT/JWKS request accepted: `200`
- wildcard durable cutoff recorded: `true`
- exact same-token replay denied: `401`
- proof row removed: `true`
- cleanup verified: `true`
- exact same-token replay after cleanup accepted: `200`

No raw token, authorization code, claim value, credential, prompt, email, or
database row content was persisted in repository artifacts.
