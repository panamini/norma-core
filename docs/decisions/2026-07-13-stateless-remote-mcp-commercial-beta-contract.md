# Stateless Remote MCP Commercial Beta Contract

## Status

PR136 is a HIGH-risk docs-and-contract-tests-only approval changeset.

Current state token: REMOTE_RUNTIME_APPROVED_NOT_IMPLEMENTED.

PR136 approves the exact PR137 implementation boundary defined here. PR136 does
not add dependencies, runtime files, deployment files, secrets, external
resources, a ChatGPT connector, or a public submission.

Program authority:
CP-NORMA-PERMANENT-MCP-COMMERCIAL-V1 v1.

Leaf authority:
CC-PR136-STATELESS-REMOTE-MCP-COMMERCIAL-CONTRACT-V1.

## Authorization and Supersession

The user approved the complete program version on 2026-07-13, including
sequential edits, tests, commits, pushes, pull requests, reviews, and merges.
Creation of Auth0 or Render resources and public ChatGPT submission remain
outside that authorization and require later exact confirmations.

This decision is the only current implementation authority for the first
commercial remote MCP slice. It supersedes the future-work sequencing and
blocked-default conclusions in PR39 through PR51 where they conflict with this
contract. Those documents remain authoritative historical records for the
state and decisions that existed when they merged.

The former eight-PR remote sequence is compressed into:

1. PR136: current decisions plus all pre-runtime contract gates.
2. PR137: one authenticated stateless runtime implementation.
3. PR138: deployment configuration and a separately confirmed private beta.
4. PR139: public release preparation and a separately confirmed submission.

The compression does not weaken the central historical invariant: the first
remote runtime implementation must not define its own approval gates. PR136
must merge before PR137 starts.

## Atomic Product Outcome

The first permanent commercial Norma MCP is an authenticated, stateless,
tool-only service for deterministic structured composition analysis.

It exposes exactly one remote tool:

- norma.analyzeStructuredCompositionV1

It accepts only the existing closed structured input contract. It does not
accept prompts, images, files, URLs, inferred configuration, recommendations,
optimization requests, provider credentials, or arbitrary replay input.

This slice is a technical commercial beta. The PR135 visual pilot remains a
local trust-boundary rail and is not exposed remotely by this program.

## Program Sequence

PR136, PR137, PR138, and PR139 are fully serialized.

PR137 may start only after PR136 is merged and revalidated on origin/main.
PR138 may start only after PR137 is merged with all HIGH-risk review gates.
PR139 may start only after PR138 meets the beta observation threshold.

No implementation leaf may inherit authorization from a historical future
candidate statement. It must cite this decision and its own exact changeset.

## Tool Contract

Remote tools/list must expose exactly:

- norma.analyzeStructuredCompositionV1

The remote definition must reuse the active local Structured Analyze input
schema, output schema, deterministic implementation, and canonical JSON text.
For identical valid input, remote structuredContent and the parsed canonical
text content must be byte-for-byte equivalent to the local STDIO result.

Required annotations:

- readOnlyHint: true
- destructiveHint: false
- openWorldHint: false
- idempotentHint: true

Required OAuth scope:

- norma:structured-analyze

The following remain blocked:

- every other current local STDIO tool;
- norma.replayRun and arbitrary replay;
- PR134 and PR135 visual inspect/resume tools;
- resources and resource templates;
- prompts;
- sampling;
- elicitation;
- tasks;
- server-initiated model calls;
- file, URL, shell, mutation, recommendation, ranking, or intent-inference tools.

No local tool is inherited automatically. A missing or empty remote allowlist
means no remote tools are exposed.

## Transport and Lifecycle

The only approved remote transport is MCP Streamable HTTP on POST /mcp.

Supported protocol versions are exactly:

- 2025-11-25
- 2025-06-18

Every other version is rejected before tool dispatch, even if the selected SDK
supports it.

The runtime is stateless:

- sessionIdGenerator is undefined;
- no MCP session ID is issued or accepted;
- one low-level MCP server and one transport are created per HTTP request;
- both are closed when the response closes or the request fails;
- no resumability or event store exists;
- GET /mcp and DELETE /mcp return 405;
- legacy HTTP plus SSE and WebSocket are absent.

The runtime must use a native Node HTTP entry boundary. It may use the official
SDK transport internally but must not add an application-framework dependency
or broaden the public surface.

Host and Origin rules:

- the production public URL is one exact HTTPS URL;
- Host and trusted forwarded host must match its hostname;
- an absent Origin is accepted for authenticated server-to-server clients;
- a present Origin is rejected unless it is in an exact configured allowlist;
- the default Origin allowlist is empty;
- wildcard CORS is forbidden;
- localhost HTTP is allowed only in isolated tests.

Unauthenticated operational endpoints are limited to GET /healthz and
GET /readyz. They return fixed status/version metadata only and never expose
configuration, dependency, identity, traffic, or user data.

## Authentication and Authorization

All /mcp requests require OAuth 2.1 authentication. Anonymous tool discovery
and tool execution are forbidden.

The selected authorization server is Auth0. Required client behavior:

- manual Client ID Metadata Document registration;
- private_key_jwt token endpoint authentication;
- PKCE S256;
- exact resource indicator propagation;
- no Dynamic Client Registration in the commercial beta.

The MCP resource server must expose RFC 9728 protected-resource metadata and
must return a Bearer WWW-Authenticate challenge for missing, invalid, expired,
not-yet-valid, wrong-resource, wrong-audience, or insufficient-scope tokens.

Every request validates:

- signature against the configured issuer JWKS;
- issuer;
- token audience exactly equal to the configured NORMA_MCP_AUTH0_AUDIENCE;
- any issuer-provided token resource claim exactly equal to the canonical /mcp
  resource; a resource claim never substitutes for audience validation;
- expiration and not-before time;
- required scope norma:structured-analyze;
- a non-empty subject identity.

A token with a missing or wrong audience is rejected even when its resource
claim is correct. A token with a wrong resource claim is rejected even when its
audience is correct.

The raw access token may exist only in request memory for verification. It is
never persisted, forwarded to the Norma core, placed in tool output, or logged.

The verified subject is converted to a service-local pseudonymous identifier
using HMAC-SHA-256 and a secret supplied by the deployment secret manager.
Raw subject, email, username, organization claims, and IP address are not
application log fields.

## Data and Truth Boundaries

The service processes the explicit structured request in memory and returns the
existing deterministic Norma result.

It must not:

- persist request bodies or responses;
- read or write user files;
- accept uploads;
- fetch caller-provided URLs;
- call OpenAI, Auth0 APIs other than discovery/JWKS, or any model/provider;
- create or change packs, rules, ratios, tolerances, geometry, selections, or
  accepted evidence;
- treat prompt text, tool metadata, artifacts, or model narration as source
  truth;
- expose a filesystem path, job root, receipt, image, candidate, or selection.

Norma source truth, artifact derivation, explicit acceptance, canonical
serialization, and exact-set semantics remain unchanged.

Multi-user isolation is obtained by having no shared user data or session state.
Exactly two classes of bounded in-memory cross-request state are allowed:

- per-subject rate and concurrency accounting keyed only by the pseudonymous
  subject;
- one global abuse-accounting object containing two independent count/time
  buckets: authenticated admission capacity and unauthenticated or
  unauthorized rejection pressure.

Neither class may contain tokens, claims, request or response bodies, geometry,
diagnostics, IP addresses, or other user data. Each POST /mcp attempt increments
exactly one global bucket, never both. Missing, invalid, or insufficiently scoped
credentials increment only the unauthorized-rejection bucket. Successful
authentication and authorization increment only the authenticated-admission
bucket and then the applicable per-subject counters; later body, schema, or tool
rejection remains an authenticated attempt. A request rejected before successful
authorization creates no per-subject entry.

Saturating the unauthorized-rejection bucket must never consume authenticated
capacity or cause a request with valid credentials to be rejected. Further
unauthorized requests receive the same redacted bounded rejection,
while credentials must still be checked sufficiently to allow valid requests to
proceed. PR138 must separately prove that platform edge protections do not map
anonymous pressure onto the authenticated application quota.

One subject cannot read or alter another subject's request, response,
per-subject quota key, or diagnostics. The authenticated capacity limit may
cause a service-wide availability rejection by design, but anonymous rejection
pressure cannot trigger that limit and neither bucket reveals subject data.

## Network and Runtime Side Effects

The only approved outbound network traffic is HTTPS discovery/JWKS retrieval
from the exact configured Auth0 issuer origin.

Requirements:

- issuer must be HTTPS outside isolated tests;
- redirects to another origin are rejected;
- JWKS fetch timeout is at most five seconds;
- successful keys are cached in memory with bounded refresh behavior;
- no caller-controlled hostname, path, proxy, or redirect target is used;
- discovery/JWKS responses are never logged verbatim.

All other outbound network traffic, filesystem access, shell execution, child
process creation, background jobs, durable queues, databases, and caches are
blocked.

Allowed runtime configuration names are limited to:

- PORT
- NODE_ENV
- NORMA_MCP_PUBLIC_URL
- NORMA_MCP_AUTH0_ISSUER
- NORMA_MCP_AUTH0_AUDIENCE
- NORMA_MCP_AUDIT_HASH_KEY
- NORMA_MCP_ALLOWED_ORIGINS

No environment value may be returned to a client or emitted to logs. No .env
or credential file may be added or read.

## Abuse and Resource Limits

The runtime must enforce all limits before deterministic analysis:

- maximum request body: 524288 bytes;
- maximum JSON depth: 64;
- maximum string length: 65536 code units;
- maximum aggregate array elements: 4096;
- maximum two concurrent analysis calls per authenticated subject;
- maximum 30 analysis calls per authenticated subject per rolling hour;
- maximum 120 authenticated /mcp admission attempts globally per rolling minute;
- maximum 600 unauthenticated or unauthorized rejection attempts globally
  per rolling minute, in the independent rejection bucket;
- maximum ten seconds end-to-end per request;
- maximum five seconds for a JWKS refresh;
- authenticated malformed, oversized, excessive-depth, excessive-string,
  excessive-array, invalid, blocked, and rate-limited requests count against the
  authenticated bucket and their per-subject limit;
- missing, invalid, or insufficiently scoped credentials count only against the independent rejection
  bucket and never against authenticated capacity.

The beta runs one service instance so in-memory subject limits have one owner.
Horizontal scaling or a durable rate-limit store requires a new decision.

Errors are closed and structured. Client-visible errors must not contain stack
traces, filesystem paths, environment values, tokens, raw claims, raw request
bodies, internal exception strings, or dependency details.

## Observability Retention and Privacy

Application logs may contain only:

- request identifier;
- UTC timestamp;
- fixed route or tool name;
- allow/deny outcome;
- HTTP status and stable error code;
- pseudonymous subject identifier;
- granted scope names;
- latency bucket;
- payload-size bucket;
- MCP protocol version;
- Norma operation and serialization versions when already public in output.

Logs must not contain raw request or response bodies, structured geometry,
tokens, Authorization or Cookie headers, Auth0 claims, prompt text, URLs,
filesystem paths, images, artifacts, stack traces, or secrets.

Application log retention is seven days. Render/Auth0 platform retention and
deletion behavior must be recorded before PR138 creates resources. If those
platform settings cannot satisfy the beta policy within the approved budget,
execution stops with NEEDS_DECISION.

## Package and Supply Chain Decision

PR137 may add exactly these direct runtime dependencies:

- @modelcontextprotocol/sdk at 1.29.0
- zod at 4.4.3
- jose at 6.2.3

No semver ranges are allowed for these direct dependencies. package.json stays
private and gains no package export, package bin, publishConfig, optional
dependency, peer dependency, or npm publication metadata.

The official SDK is selected despite its broad transitive dependency tree
because it provides the maintained Streamable HTTP protocol boundary. PR137
must use only its low-level server, Streamable HTTP transport, schemas, and
auth context plumbing.

Before merge PR137 must prove:

- exact lockfile identity;
- production dependency tree inspection;
- npm audit --omit=dev has zero high or critical findings;
- every production dependency has an accepted permissive license;
- no install script, native binary, or unexpected runtime download;
- no additional direct dependency;
- package export and private metadata remain unchanged.

Any version change, additional direct dependency, copyleft/unknown license,
high/critical advisory, install script, or native binary requires
NEEDS_DECISION before merge.

## Deployment Policy

The selected beta target is one paid Render Web Service, Starter class or
higher only within the approved total cap of 100 EUR per month.

PR136 and PR137 create no Render or Auth0 resources. PR138 may add deployment
configuration but may create external resources only after a separate exact
confirmation.

Deployment requirements:

- Node.js 22;
- one always-on instance;
- managed TLS;
- one stable public HTTPS /mcp resource;
- secrets stored only in platform secret managers;
- no persistent disk or database;
- health and readiness probes;
- structured logs and basic request/error/latency metrics;
- alerting, kill switch, rollback, and removal runbook;
- no automatic production deployment from an unreviewed branch.

## Security Gate Matrix

| Gate | Approved decision | Required accept evidence | Required reject evidence |
| --- | --- | --- | --- |
| G0 authority | This contract is the only current remote authority | exact contract/version and merged predecessor | missing or stale authority blocks runtime |
| G1 inventory | one Structured Analyze tool | exact tools/list and valid tools/call | every other tool, resources, prompts, tasks blocked |
| G2 transport | stateless Streamable HTTP POST /mcp | both approved protocol versions | old versions, sessions, GET/DELETE, SSE, WebSocket blocked |
| G3 host/origin | exact host and bounded Origin policy | absent Origin server-to-server and exact allowlist | wrong host, wildcard, and unknown Origin blocked |
| G4 auth | Auth0 OAuth 2.1 and one scope | valid signed token with exact claims | missing, invalid, stale, wrong issuer/audience/resource/scope blocked |
| G5 identity | per-request auth and pseudonymous subject | two subjects receive isolated contexts | raw claim/token leakage and cross-subject influence blocked |
| G6 truth | existing deterministic analyzer only | local/remote parity fixture | prompt/image/file/URL/replay/hidden defaults blocked |
| G7 side effects | JWKS is the sole egress | exact issuer discovery/key rotation | alternate host, redirect, filesystem, shell, provider blocked |
| G8 limits | fixed body/depth/string/array/time/rate/concurrency limits with separate authenticated and anonymous buckets | boundary values accepted and anonymous rejection leaves authenticated capacity unchanged | over-boundary and concurrent abuse rejected without cross-bucket consumption |
| G9 errors | stable redacted envelopes | expected code/status/request ID | stack, path, secret, raw payload, exception leakage blocked |
| G10 observability | metadata-only seven-day logs | allow/deny metadata and buckets | token, claim, payload, prompt, URL, artifact logging blocked |
| G11 supply chain | three pinned direct dependencies | exact lock, permissive licenses, clean audit | drift, advisory, install script, native binary blocked |
| G12 deployment | one reversible private beta | health, metrics, rollback, bounded live proof | unreviewed deploy, extra resource, public submission blocked |

Every PR137 gate requires accept-path and reject-path tests. A failing required
gate blocks PR137 merge.

## Required PR137 Evidence

PR137 must include and pass:

- build and type checking;
- existing local STDIO compatibility tests;
- local/remote Structured Analyze parity tests;
- exact remote tool inventory tests;
- protocol and method rejection tests;
- Host, Origin, content-type, and body parser tests;
- protected-resource metadata and WWW-Authenticate tests;
- JWT signature, issuer, audience, resource, time, subject, and scope tests,
  including wrong audience with a correct resource and wrong resource with a
  correct audience;
- JWKS rotation, timeout, wrong-origin redirect, and fail-closed tests;
- no token passthrough or logging tests;
- two-subject isolation and concurrent-call tests;
- body, depth, string, array, timeout, per-subject, and global limit tests;
- proof that anonymous or unauthorized pressure never consumes or blocks
  authenticated admission capacity;
- absence tests for resources, prompts, sampling, elicitation, tasks, legacy
  transports, filesystem, shell, upload, URL fetch, and provider calls;
- structured error redaction tests;
- dependency tree, license, lockfile, and advisory evidence;
- full repository test suite;
- changed-file guard and diff check;
- HIGH-risk context-separated review with no P0/P1 findings.

No live provider, Auth0 tenant, Render service, or ChatGPT connector is needed
to merge PR137. Auth behavior must use local deterministic keys and fixtures.

## PR138 External Mutation Gate

PR138 may prepare configuration and tests under the approved program. Before
creating Auth0/Render resources, spending money, starting a permanent service,
or connecting ChatGPT, execution must obtain a separate exact confirmation
that names those external actions.

The private beta is limited to ten invited users. Public discovery and public
submission remain blocked.

PR138 beta completion requires:

- at least two distinct invited users;
- at least 25 successful analysis calls;
- seven calendar days of observation;
- no P0/P1 incident;
- runtime error rate below one percent excluding intentional auth rejection;
- successful rollback/kill-switch exercise;
- current evidence that no unauthorized resource or secret remains.

## PR139 Public Release Gate

PR139 may begin only after PR138 completion evidence is bound to the deployed
artifact.

Public release requires verified publisher identity, privacy policy, terms,
support and security contacts, accurate data disclosures, exact tool scan,
review fixtures, and a separate exact confirmation before ChatGPT submission.

PR139 must not widen runtime behavior. Any visual, upload, provider, storage,
billing, second-tool, horizontal-scaling, or durable-tenant requirement becomes
a new program.

## Recovery

PR136 recovery is an inverse docs/tests patch.

PR137 recovery is a revert commit limited to the runtime/dependency changes;
local STDIO remains available.

PR138 recovery disables the ChatGPT connector, suspends the Render service,
revokes Auth0 configuration and secrets, and verifies the removal inventory.
Those external actions require the matching operational authorization.

A PR139 review refusal leaves the private beta unchanged.

## Final Decision

PR136 approves one authenticated stateless remote Structured Analyze runtime
for implementation in PR137, subject to every gate in this document.

No remote runtime exists after PR136. No external resource, deployment,
connector, public submission, visual workflow, provider call, upload, storage,
billing system, npm publication, or second tool is approved by PR136.

Status: APPROVED_CONTRACT_READY_FOR_PR137_AFTER_MERGE.
