# Sandbox qualification and launch gates

## Purpose and boundary

This runbook records the nine blocking criteria for the disposable Railway to
PostgreSQL/RLS sandbox. The repository harness is provider-free by default: it
does not fetch provider metadata, create clients, exchange tokens, access a
database, or deploy anything. `productionReadiness` is `CLOSED` unless every
criterion has bounded live evidence supplied by a separately authorized
operator and the result receives human approval.

Run the safe default:

```bash
node bin/norma-core-sandbox-qualification.mjs
```

The output contains only criterion ids, statuses, evidence classes, provider
names, opaque evidence references, and the closed/open gate. It never prints
tokens, secrets, claims, emails, prompts, request bodies, or database contents.
Evidence input is a sanitized provider-bound allowlist; unknown fields are
rejected before evaluation.

For the disposable Railway PostgreSQL path, enable the mode only with
`NORMA_MCP_AUTHZ_DATA_MODE=postgresql` and
`NORMA_MCP_AUTH_TENANT_CLAIM=<tenant-claim-name>`. Store the connection URL as
the Railway secret `NORMA_MCP_AUTHZ_DATABASE_URL`; keep
`NORMA_MCP_POSTGRES_SSL=require` outside isolated tests. If the database
provider requires a private CA, store it as the Railway secret
`NORMA_MCP_POSTGRES_CA`; verification remains enabled. The runtime creates a
bounded pool, injects it into the provider-neutral adapter, resets authorization
settings before releasing pooled connections, and closes the pool on shutdown.
Never place the URL or CA in this repository or in qualification evidence.

## Provider order

1. Qualify Scalekit first using the exact provider permission
   `norma:structured_analyze`, mapped one-to-one to Norma's canonical
   `norma:structured-analyze` scope.
2. Run the identical matrix against Auth0 only after a blocking Scalekit
   failure is recorded; retain the failure reason and use the explicit
   `--fallback-from-scalekit` marker.
3. Do not select a production provider from a sandbox result. If onboarding,
   token shape, RLS, rollback, or evidence handling is ambiguous, stop with
   `productionReadiness: CLOSED` and request a decision.

## Blocking matrix

| Criterion | Required bounded evidence |
| --- | --- |
| `discovery` | Protected-resource challenge and authorization-server metadata resolve to the configured sandbox endpoints. |
| `client_onboarding` | DCR, CIMD, or the exact pre-registration path is recorded for the ChatGPT client. |
| `pkce_s256` | Authorization-code flow uses `S256`; absent or weaker PKCE fails. |
| `resource_audience` | The exact MCP resource is carried into authorization and the issued token has the exact same `aud`. |
| `scope_mapping` | Scalekit `norma:structured_analyze` maps exactly to canonical `norma:structured-analyze`; no substring or fallback mapping. |
| `token_verification` | JWKS, issuer, audience, expiry, subject, and tenant are verified; wrong values fail closed. |
| `consent_refresh_revocation` | Consent, refresh, expiry, and revocation behavior are exercised and recorded. |
| `railway_postgresql_rls` | Railway context reaches PostgreSQL/RLS; same tenant allows, cross tenant and missing context deny. |
| `isolation_rollback_cleanup` | Pooled connections reset; rollback is isolated; logs are token-free; fixture cleanup and rollback are reversible. |

All nine are blocking. A `PASS` without live evidence is `UNVERIFIED`, not a
production pass. A partial, historical, or missing record keeps the gate
closed.

## Evidence contract

The optional evidence file has exactly this shape. Its `provider` must match the
`--provider` selection; evidence cannot be reused under another provider.

```json
{
  "provider": "scalekit",
  "records": [
    {
      "criterion": "pkce_s256",
      "status": "PASS",
      "evidenceClass": "live",
      "evidenceRef": "sandbox-run-001",
      "observedAt": "2026-07-25T00:00:00Z"
    }
  ],
  "approval": {
    "approved": true,
    "approvalRef": "launch-review-001",
    "approvedAt": "2026-07-25T00:00:00Z"
  }
}
```

The reference is an opaque bounded identifier, not a token or raw artifact.
Keep raw provider output, claims, database rows, prompts, and credentials out
of the evidence file. Store them only in the separately authorized evidence
system, if any, under its own retention and access controls. The approval block
is required, with `approved: true`, before the harness can report `OPEN`; all
nine live `PASS` records without approval remain `CLOSED`.

Evaluate a sanitized evidence file with:

```bash
node bin/norma-core-sandbox-qualification.mjs --evidence ./sandbox-evidence.json
```

This command evaluates evidence; it does not create or verify live provider or
database state. The harness must not be used to manufacture live evidence.

## Stop, cleanup, and rollback

- Stop if any criterion is `FAIL`, `UNVERIFIED`, or `NOT_RUN`.
- Stop if a provider needs an unapproved client registration or secret.
- Stop if the raw MCP JWT would cross into PostgreSQL or appear in logs.
- Stop if a role is `SUPERUSER`, `BYPASSRLS`, service-role, or secret-key based.
- Tear down only the disposable sandbox fixture after evidence capture.
- Roll back by removing the adapter/config selection and disposable fixture;
  no production migration, provider mutation, or deployment is part of this
  runbook.
