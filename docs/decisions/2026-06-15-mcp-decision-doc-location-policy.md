# MCP Decision Doc Location Policy

## Status

PR45 is docs/contract-tests only.

PR45 resolves the documentation-location policy for MCP decision documents after PR44.

Remote MCP remains blocked after PR45.

Local STDIO remains the only approved MCP runtime.

PR45 does not approve remote MCP runtime implementation, package changes, dependency changes, deployment, auth, logging, resources, prompts, sampling, elicitation, or new tool exposure.

## Decision

Future new MCP technical decision documents must use the repository decision-document convention:

```txt
docs/decisions/YYYY-MM-DD-topic.md
```

The existing PR39 through PR44 MCP remote documents remain in their current `docs/MCP_REMOTE_*.md` paths in PR45.

Those existing MCP remote documents are a documented legacy/canonical exception until a separate explicit migration PR is approved.

PR45 does not move, rename, rewrite, or replace the PR39 through PR44 MCP remote documents.

## Repository Rule

`AGENTS.md` states that technical decisions go in `docs/decisions/`.

`AGENTS.md` suggests the filename style:

```txt
docs/decisions/YYYY-MM-DD-topic.md
```

PR45 adopts that rule for future new MCP decision documents.

## Existing MCP Remote Docs

The existing MCP remote decision chain is:

- PR39: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- PR40: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- PR41: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- PR42: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- PR43: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- PR44: `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`.

These documents remain source documents for the current MCP remote approval chain.

## Legacy Exception Boundary

The PR39 through PR44 MCP remote documents remain in place because they are already referenced by existing contract tests and decision documents.

PR45 treats those paths as a documented exception, not as the preferred pattern for future new decision documents.

This exception is limited to the existing PR39 through PR44 MCP remote documents listed above.

No additional `docs/MCP_REMOTE_*.md` decision document should be added after PR45 unless a later PR explicitly updates this policy.

## Future Decision Doc Rule

Future new MCP decision documents must be created under `docs/decisions/` with a date-prefixed filename.

Examples:

```txt
docs/decisions/YYYY-MM-DD-mcp-transport-approval.md
docs/decisions/YYYY-MM-DD-mcp-auth-approval.md
docs/decisions/YYYY-MM-DD-mcp-runtime-approval.md
```

Future docs may reference existing `docs/MCP_REMOTE_*.md` files, but should not copy their path pattern for new decision documents.

## Migration Boundary

PR45 does not migrate existing MCP remote documents.

Any migration of PR39 through PR44 MCP remote documents requires a separate explicit migration PR.

A migration PR must:

- move or copy the affected documents in one reviewed change;
- update all document references atomically;
- update all contract tests atomically;
- prove the old and new paths are not ambiguous;
- preserve the decision chain and rollback path;
- include validation evidence for every affected test.

No future PR may treat PR45 as permission to silently move or rename the existing MCP remote documents.

## Non-Approval Boundary

PR45 does not approve:

- remote MCP runtime implementation;
- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- OAuth, auth, or token runtime;
- package metadata changes;
- dependency changes;
- package `bin` changes;
- package export changes;
- lockfile changes;
- deployment files;
- remote server files;
- resources;
- prompts;
- sampling;
- elicitation;
- logging;
- filesystem behavior;
- network behavior;
- shell behavior;
- environment-driven behavior;
- new MCP tools;
- arbitrary replay;
- `norma.replayRun` MCP exposure.

Current MCP tool exposure remains exactly:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

`norma.replayRun` and arbitrary replay remain blocked as MCP exposure.

Resources, prompts, sampling, elicitation, logging, telemetry, and retention remain blocked unless separately approved.

## Required Tests

PR45 requires tests that prove:

- this policy document exists under `docs/decisions/`;
- this policy filename is date-prefixed;
- `AGENTS.md` still states the decision-document convention;
- all PR39 through PR44 MCP remote documents still exist at their current paths;
- the existing MCP remote documents are documented as a limited legacy/canonical exception;
- future new MCP decision documents must use `docs/decisions/YYYY-MM-DD-topic.md`;
- migration requires a separate explicit migration PR;
- package, runtime, deployment, and MCP tool exposure boundaries remain unchanged.

## Final Decision

Future new MCP technical decision documents must use `docs/decisions/YYYY-MM-DD-topic.md`.

Existing PR39 through PR44 MCP remote documents remain in their current `docs/MCP_REMOTE_*.md` paths in PR45.

The existing PR39 through PR44 MCP remote documents are a documented legacy/canonical exception until a separate explicit migration PR exists.

PR45 does not move or rename existing MCP remote documents.

Remote MCP remains blocked after PR45.

Local STDIO remains the only approved MCP runtime.

PR45 does not approve runtime, package, dependency, deployment, auth, logging, resource, prompt, sampling, elicitation, or tool exposure changes.
