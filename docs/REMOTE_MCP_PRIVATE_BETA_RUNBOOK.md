# Remote MCP Private Beta Runbook

Status: `CONFIGURATION_READY_EXTERNAL_MUTATION_BLOCKED`

Authority: `CP-NORMA-PERMANENT-MCP-COMMERCIAL-V1 v1` and
`docs/decisions/2026-07-13-stateless-remote-mcp-commercial-beta-contract.md`.

This runbook operates the one-tool stateless private beta prepared by PR138.
Merging the repository files does not create Auth0 or Render resources, spend
money, start a permanent process, create a ChatGPT connector, or submit an app.

## Exact External Gate

Before any external mutation, obtain this separate confirmation verbatim:

`J’APPROUVE CC-PR138-RENDER-AUTH0-PRIVATE-BETA-LIVE-V1 v1 POUR CRÉATION D’UN SERVICE RENDER STARTER, DES RESSOURCES AUTH0 NÉCESSAIRES, DÉMARRAGE DU SERVICE PERMANENT ET CONNEXION PRIVÉE CHATGPT, DANS LA LIMITE DE 100 EUR/MOIS.`

Without that sentence, stop after repository validation. Public discovery,
public ChatGPT submission, a second service, a database, a persistent disk,
horizontal scaling, a provider/model call, and any spend above the cap remain
blocked.

## Fixed Inventory

- one Render Web Service from the root `render.yaml`;
- Render `starter` compute, Frankfurt, exactly one always-on instance, inside a
  separately verified Hobby workspace;
- Node.js `22.23.1`, `NODE_ENV=production`;
- one unavoidable creation-triggered first deploy from an exact reviewed `main`
  head, then manual deploys only (`autoDeployTrigger: off`) from reviewed
  commits, with Blueprint Auto Sync set to `No` immediately after creation;
- one public HTTPS resource at `/mcp`, plus `/healthz` and `/readyz`;
- no disk, database, cache, worker, cron, preview environment, or deploy hook;
- one Auth0 authorization server and the minimum client/API configuration;
- at most ten named invited users, with public signup disabled;
- exactly `norma.analyzeStructuredCompositionV1` exposed remotely.

The service remains stateless. It accepts explicit structured JSON in memory
and performs no upload, image, URL fetch, filesystem write, provider/model
call, arbitrary replay, visual inspect/resume, or persistent storage.

## Mandatory Read-Only Preflight

Before importing a Blueprint, creating an Auth0 resource, entering a secret, or
incurring spend, verify and record only these non-secret facts:

1. the target Render **workspace** is Hobby and its application-log and metric
   retention is seven days; `plan: starter` in `render.yaml` is only the service
   compute type and does not prove the workspace plan;
2. the target Auth0 subscription is Essentials and its log retention is five
   days;
3. Render supports the exact pinned Node.js `22.23.1` runtime; and
4. the approved account can provide the dedicated Auth0 tenant, database
   connection, RBAC, role, and user client grant required below.

This preflight is fail-closed. Any different or unverifiable plan, retention,
runtime version, or access-control capability is `NEEDS_DECISION` before the
first external mutation. Evidence may contain the plan names, retention days,
capability booleans, UTC time, and operator confirmation only; it must not
contain account, workspace, tenant, client, connection, or user identifiers.

## Configuration Inputs

Provide these values only through the Render/Auth0 dashboards or their secret
managers. Never put values in Git, `.env` files, screenshots, task messages,
tool output, issue comments, or beta evidence.

| Variable | Rule |
| --- | --- |
| `NORMA_MCP_PUBLIC_URL` | Exact stable HTTPS origin with trailing slash; no path, query, credentials, or fragment. |
| `NORMA_MCP_AUTH0_ISSUER` | Exact Auth0 HTTPS issuer with trailing slash. |
| `NORMA_MCP_AUTH0_AUDIENCE` | Exact API audience; it must not be inferred from the public URL. |
| `NORMA_MCP_AUDIT_HASH_KEY` | Render-generated 256-bit value; never copied out of the secret manager. |
| `NORMA_MCP_ALLOWED_ORIGINS` | Omit by default. Add only an exactly observed and approved HTTPS origin; wildcard is forbidden. |

Render prompts for the three non-secret deployment-specific values marked
`sync: false`; the audit key uses `generateValue: true`. The Blueprint contains
no credential or private identifier.

## Auth0 Setup After Approval

1. Create or select the dedicated beta tenant inside the approved Essentials
   account. Do not share a production tenant with unrelated applications.
2. Create one dedicated database connection with public signup disabled. Enable
   it only for the approved ChatGPT beta application, disable every other
   connection for that application, and keep tenant-wide automatic application
   connections disabled. Do not enable Auth0 Organizations or organization
   signup for this beta.
3. Configure one API with the exact audience, RS256 tokens, **Enable RBAC**,
   and only the `norma:structured-analyze` permission. Set its application
   access policy to `require_client_grant`.
4. Create exactly one beta role containing only
   `norma:structured-analyze`. Assign it only to the at-most-ten named invited
   users. An unassigned or eleventh tenant user must not receive the scope.
5. Configure the approved ChatGPT OAuth client using the contract’s manual
   Client ID Metadata Document registration, `private_key_jwt`, and PKCE S256.
6. Create exactly one user-subject client grant (`subject_type=user`) for that
   client and API with only `norma:structured-analyze`. A client without this
   grant must not obtain API access.
7. Register only the exact callback URLs shown by the private ChatGPT connector.
8. Confirm an assigned invited user receives the required scope only through
   the intersection of the role permission, requested scope, and client grant.
   Confirm an unassigned invited user, an eleventh tenant user, and a client
   without the grant are rejected. Access tokens must also have the exact
   issuer, audience, resource when present, non-empty subject, and expiration.
   Never paste a token into evidence.
9. Record tenant/client/API/connection/role/grant existence as sanitized
   booleans only. Do not commit
   Auth0 IDs, domains beyond the public issuer, emails, claims, or user IDs.

If Auth0 requires Dynamic Client Registration, lacks RBAC or
`require_client_grant`, cannot isolate the database connection, permits a
broader scope, exposes a public or organization signup path, or returns a
resource claim that conflicts with the exact audience checks, stop with
`NEEDS_DECISION`.

## Render Creation And First Deploy After Approval

1. Complete the Auth0 fail-closed setup and its positive and negative access
   checks before opening the Render creation form.
2. Fetch the live GitHub `main` head immediately before the creation action and
   require byte equality with the recorded approved commit SHA. If it differs,
   changes while the form is open, or cannot be rechecked, abort before clicking
   **Deploy Blueprint**.
3. Import the root Blueprint, bind it to `main`, and confirm the proposed plan
   shows exactly one Web Service and zero databases or auxiliary resources.
4. Enter all three `sync: false` values in the creation form and confirm the
   generated audit key is present without revealing it.
5. Click **Deploy Blueprint** once. This action both creates/provisions the
   Blueprint resources and triggers the unavoidable first deploy; there is no
   separate manual-first-deploy boundary. Immediately verify the deployed commit
   equals the recorded approved SHA. Any mismatch triggers the kill switch
   before connector creation.
6. As soon as Blueprint creation exposes its Settings page, set **Blueprint
   Settings > Auto Sync = No** before enabling the connector or allowing any
   subsequent repository change. Confirm independently that service
   `autoDeployTrigger: off` is also effective; `autoDeployTrigger: off` does not
   disable Blueprint Auto Sync.
7. All subsequent Blueprint syncs and service deploys are manual and require a
   freshly rechecked reviewed commit SHA.
8. Confirm the build installs development dependencies explicitly despite
   `NODE_ENV=production`, runs the build, then prunes development dependencies;
   confirm the process runs `node bin/norma-core-remote-mcp-http.mjs` on
   Render’s `PORT`.
9. Confirm managed TLS and exact public host before enabling the connector.
10. Require `GET /healthz` and `GET /readyz` to return 2xx with the expected
   service name/version. Do not send synthetic traffic to `/mcp` before Auth0
   is fail-closed and the audience/scope checks are configured.
11. Configure platform notifications for failed deploys and unhealthy service.

Any unreviewed auto-deploy, extra instance/resource, persistent disk, unexpected
egress, missing secret, non-HTTPS URL, or health failure stops the rollout.

## Private Connector Proof

After Auth0 and Render are green, create one private/draft ChatGPT connector.
Keep every tool permission at `Always ask`; use `Allow once` per call. Verify:

1. protected-resource metadata and bearer challenge;
2. exact one-tool inventory;
3. one deterministic Structured Analyze fixture with byte parity to local;
4. a second invited user receiving an isolated authenticated context;
5. wrong issuer, audience, resource, scope, Host, and Origin remain rejected;
6. no local STDIO, visual, upload, provider, resource, prompt, or task surface
   appears.

Do not submit publicly and do not widen the tool inventory.

## Retention And Daily Evidence

As rechecked on 2026-07-13, Render Hobby workspace application logs and service
metrics retain seven days. Auth0 Essentials retains identity-provider logs for
five days. These are different planes: the application’s metadata-only logs
must retain exactly the seven-day beta window, while Auth0 logs stay under the
platform’s five-day deletion policy.

Once per UTC day, record only sanitized aggregates:

- deployed commit SHA and UTC observation window;
- distinct invited-subject count as a number, never an identifier;
- successful analysis count;
- intentional auth-rejection count;
- runtime error count and calculated error rate;
- p50/p95 latency buckets available from Render;
- P0/P1 incident count;
- health/readiness status and resource-inventory exactness;
- whether any secret/credential appeared in evidence (`false` required).

Do not export raw Auth0 events, Render request bodies, claims, subject hashes,
tokens, geometry, URLs, prompts, or artifacts. If the seven-day application-log
window or five-day Auth0 deletion behavior differs from the current documented
plans, stop with `NEEDS_DECISION` before creating or continuing the beta.

Current official references:

- <https://render.com/docs/blueprint-spec>
- <https://render.com/docs/infrastructure-as-code>
- <https://render.com/docs/logging>
- <https://render.com/docs/service-metrics>
- <https://auth0.com/docs/deploy-monitor/logs/log-data-retention>
- <https://auth0.com/docs/manage-users/access-control/configure-core-rbac/enable-role-based-access-control-for-apis>
- <https://auth0.com/docs/manage-users/user-accounts/manage-user-access-to-applications>
- <https://auth0.com/docs/get-started/applications/application-access-to-apis-client-grants>
- <https://nodejs.org/en/blog/release/v22.23.1>

## Threshold And Incident Rules

PR138 live completion requires all of:

- at least two distinct invited users;
- at least 25 successful analysis calls;
- seven calendar days of observation;
- no P0/P1 incident;
- runtime error rate below one percent, excluding intentional auth rejection;
- one successful kill-switch and rollback exercise;
- final exact inventory with no unauthorized resource or secret.

Immediately run the kill switch for any P0/P1, suspected credential exposure,
unexpected tool/resource, cross-user influence, unauthorized external call,
error-rate breach, or inability to preserve the retention boundary.

## Kill Switch, Rollback, And Removal

Kill switch, in order:

1. set **Blueprint Settings > Auto Sync = No** and confirm it remains off;
2. disable the private ChatGPT connector;
3. enable Render maintenance mode or suspend the service;
4. revoke/disable the Auth0 client grant, client, and affected credentials;
5. verify `/mcp` is unavailable while retaining only sanitized incident facts.

Rollback:

1. keep auto-deploy off;
2. manually redeploy the last reviewed known-good commit;
3. verify health/readiness, exact one-tool inventory, auth rejection, and local
   parity before re-enabling the connector;
4. count the exercise in the beta evidence without exposing IDs or secrets.

Removal after approval to end the beta:

1. set Blueprint Auto Sync to `No`, then disconnect or delete the Blueprint from
   Render before deleting the service; never reconnect it while `render.yaml`
   still defines the beta service without a new exact approval;
2. delete the private connector;
3. suspend and delete the Render service;
4. revoke/delete the Auth0 user client grant, role assignments, role, dedicated
   connection, client, API configuration, and beta users;
5. delete platform secrets;
6. verify zero remaining Blueprint, service, connector, disk, database, key,
   role, grant, connection, client, job,
   or child process;
7. record only the final zero-resource booleans and UTC completion time.

Public submission remains a separate PR139 gate after all PR138 thresholds are
met and bound to the exact deployed artifact.
