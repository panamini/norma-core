# MCP Remote Decision Document Location Policy

## Status

PR45 is docs/contract-tests only.

PR45 decides only the document-location policy for MCP remote technical decision documents.

Remote MCP remains blocked after PR45.

Local STDIO remains the only approved MCP runtime.

PR45 does not approve remote MCP runtime implementation.

PR45 does not approve deployment.

PR45 does not approve package, dependency, package metadata, lockfile, runtime, deployment, auth, logging, telemetry, retention, resource, prompt, sampling, elicitation, or tool exposure changes.

PR45 does not re-check current official docs because it makes no new transport, auth, package, runtime, provider-compatibility, deployment-target, or tool-exposure decision.

Current official documentation state in PR45: Unknown.

## Source Documents

- Repository instruction: Technical decisions go in `docs/decisions/`.
- Repository instruction: decision filenames should use `docs/decisions/YYYY-MM-DD-topic.md`.
- PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- PR42 package dependency decision: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- PR43 security test matrix: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- PR44 deployment policy decision: `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`.

## Decision

Future new technical decision docs must use `docs/decisions/YYYY-MM-DD-topic.md`.

Future new MCP remote decision docs must be created under `docs/decisions/` with date-prefixed kebab-case filenames.

Future new MCP remote decision docs must not be added as root-level `docs/MCP_REMOTE_*.md` files.

Root-level `docs/MCP_REMOTE_*.md` paths are a legacy/canonical exception only for PR39 through PR44.

Existing PR39 through PR44 MCP remote docs remain canonical at their current root-level paths for continuity and existing contract-test stability.

## Legacy / Canonical Exception

The PR39 through PR44 MCP remote documents predate PR45's explicit location policy.

The canonical legacy exception set is:

```txt
docs/MCP_REMOTE_THREAT_MODEL.md
docs/MCP_REMOTE_APPROVAL_DECISION.md
docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md
docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md
docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md
docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md
```

PR45 does not move, rename, duplicate, or rewrite these documents.

Existing contract tests may continue to reference the PR39-PR44 root-level paths until a separate migration PR changes them.

No future PR may treat the legacy/canonical exception as approval to add new root-level MCP remote decision docs.

## Future Decision Document Rule

New MCP remote policy, approval, gate, review, security, runtime, package, deployment, or tool-exposure decision documents must use `docs/decisions/YYYY-MM-DD-topic.md`.

The topic slug must be lowercase kebab-case.

The filename date must be the decision date.

Future decision docs may reference the PR39 through PR44 root-level documents as source documents, but must not copy their root-level naming pattern.

## Migration Boundary

Any migration of the PR39 through PR44 MCP remote docs must be a separate explicit migration PR.

That migration PR must state the exact migration scope before moving files.

That migration PR must update every current path reference.

That migration PR must include full test updates.

That migration PR must preserve the decision meaning of the migrated documents or explicitly document any changed meaning.

PR45 is not that migration PR.

## Remote MCP Non-Approval Boundary

PR45 does not approve:

- remote MCP runtime implementation;
- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- OAuth, auth, or token runtime;
- remote server files;
- deployment files;
- package metadata changes;
- dependency changes;
- package `bin` changes;
- package export changes;
- lockfile changes;
- publish metadata changes;
- logging behavior;
- telemetry behavior;
- retention behavior;
- resources;
- prompts;
- sampling;
- elicitation;
- new MCP tools;
- arbitrary replay;
- `norma.replayRun` MCP exposure.

Current MCP tool exposure remains exactly the local STDIO allowlist:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

Unknown remote MCP decisions remain blocked.

## Final Decision

Keep existing PR39-PR44 MCP remote docs in their current `docs/MCP_REMOTE_*.md` paths for continuity and existing contract-test stability.

Treat those existing files as a documented legacy/canonical exception.

Require future new technical decision docs to use `docs/decisions/YYYY-MM-DD-topic.md`.

Do not migrate PR39-PR44 docs in PR45.

Any migration of existing MCP remote docs must be a separate explicit migration PR with full test updates.

Remote MCP remains blocked after PR45.

Local STDIO remains the only approved MCP runtime.
