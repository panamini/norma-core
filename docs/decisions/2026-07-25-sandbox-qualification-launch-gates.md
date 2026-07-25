# Sandbox qualification launch gates

## Status

`QUALIFICATION_HARNESS_READY_PRODUCTION_GATE_CLOSED`.

This decision adds a provider-free evaluation harness, a sanitized evidence
contract, and a runbook for the nine-criterion sandbox matrix. It does not make
provider calls, create OAuth clients, mutate Scalekit/Auth0/Railway/Supabase,
run external migrations, deploy, or select a production provider.

## Contract

The harness defaults to dry-run and reports every criterion as `NOT_RUN` with
production readiness `CLOSED`. It accepts only an exact provider-bound evidence
allowlist and rejects unknown fields, mismatched providers, invalid timestamps,
or sensitive-key names. `PASS` is produced only for an evidence record
explicitly classified as live; offline or historical records remain
`UNVERIFIED`. This is an evaluation rule, not live proof: the current
repository contains no live provider evidence.

Scalekit is always first. Auth0 is accepted only when the caller explicitly
marks it as a fallback from a blocking Scalekit failure, and it uses the same
criteria with its provider scope mapped to the canonical Norma scope. The
production gate opens only when all nine criteria are live `PASS` results and a
separately recorded human approval is present; otherwise it remains `CLOSED`.

## Criteria

The fixed matrix covers discovery, DCR/CIMD/pre-registration, PKCE S256,
exact resource-to-audience, `norma:structured_analyze` to
`norma:structured-analyze`, JWKS/issuer/audience/expiry/subject/tenant,
consent/refresh/revocation, Railway to PostgreSQL/RLS isolation, pool reset,
rollback, token-free logs, cleanup, and reversible rollback.

## Limits

The CLI reads only sanitized evidence summaries and emits only safe statuses and
opaque references. It never prints raw tokens, secrets, claims, emails,
prompts, request bodies, or database contents. A cloud or live database proof
remains an external approval boundary and is not inferred from this harness.
