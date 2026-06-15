# MCP Remote Package Dependency Decision

## Status

PR42 is docs/contract-tests only.

PR42 decides the remote MCP package/dependency boundary after PR41.

Remote MCP remains blocked after PR42.

Local STDIO remains the only approved MCP runtime.

PR42 does not install packages, add dependencies, modify package metadata, or implement runtime.

## Decision

No remote MCP package/dependency candidate is approved by PR42.

No package-only install PR is authorized by PR42.

No MCP SDK dependency is approved by PR42.

No package metadata, dependency, package `bin`, package export, lockfile, or publish metadata change is approved by PR42.

Future dependency-free remote implementation also remains blocked until later transport, auth, runtime, deployment, and security-test PRs explicitly approve it.

## Source Documents

- Reference PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- Reference PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- Reference PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- `docs/MCP_TOOL_CONTRACT.md`.
- `src/mcp/stdio-protocol.ts`.
- `bin/norma-core-mcp-stdio.mjs`.
- `package.json`.
- `package-lock.json`.

## Official References Checked

Access date: 2026-06-15.

| Source | Reason checked | Decision effect |
| --- | --- | --- |
| https://github.com/modelcontextprotocol/typescript-sdk | Confirm official TypeScript SDK package names, production guidance, split-package status, middleware packages, and runtime/framework package surface. | Does not justify approving a package candidate in PR42. |
| `npm view @modelcontextprotocol/sdk version dist-tags dependencies peerDependencies engines --json` | Check current v1 package metadata for the legacy recommended production package. | `@modelcontextprotocol/sdk@1.29.0` is not approved because it brings a broad dependency surface into a no-runtime decision. |
| `npm view @modelcontextprotocol/server version dist-tags dependencies peerDependencies engines --json` | Check current v2 server package metadata. | `@modelcontextprotocol/server@2.0.0-alpha.2` is not approved because it is alpha and requires Node `>=20`. |
| `npm view @modelcontextprotocol/node version dist-tags dependencies peerDependencies engines --json` | Check current Node Streamable HTTP middleware package metadata. | `@modelcontextprotocol/node@2.0.0-alpha.2` is not approved because it is alpha, depends on/peers with the v2 server package, and requires Node `>=20`. |
| `npm view @modelcontextprotocol/express version dist-tags dependencies peerDependencies engines --json` | Check current Express middleware package metadata. | `@modelcontextprotocol/express@2.0.0-alpha.2` is not approved because framework binding is not approved and the package is alpha. |
| `npm view @modelcontextprotocol/hono version dist-tags dependencies peerDependencies engines --json` | Check current Hono middleware package metadata. | `@modelcontextprotocol/hono@2.0.0-alpha.2` is not approved because framework binding is not approved and the package is alpha. |

## Recorded NPM Metadata Snapshot

The following snapshot was recorded on 2026-06-15 from the `npm view` commands listed above.

```json
{
  "@modelcontextprotocol/sdk": {
    "version": "1.29.0",
    "distTags": {
      "latest": "1.29.0"
    },
    "engines": {
      "node": ">=18"
    },
    "dependencies": [
      "@hono/node-server",
      "ajv",
      "ajv-formats",
      "content-type",
      "cors",
      "cross-spawn",
      "eventsource",
      "eventsource-parser",
      "express",
      "express-rate-limit",
      "hono",
      "jose",
      "json-schema-typed",
      "pkce-challenge",
      "raw-body",
      "zod",
      "zod-to-json-schema"
    ],
    "peerDependencies": [
      "@cfworker/json-schema",
      "zod"
    ]
  },
  "@modelcontextprotocol/server": {
    "version": "2.0.0-alpha.2",
    "distTags": {
      "latest": "2.0.0-alpha.2",
      "alpha": "2.0.0-alpha.2"
    },
    "engines": {
      "node": ">=20"
    },
    "dependencies": [
      "zod"
    ],
    "peerDependencies": [
      "@cfworker/json-schema"
    ]
  },
  "@modelcontextprotocol/node": {
    "version": "2.0.0-alpha.2",
    "distTags": {
      "latest": "2.0.0-alpha.2",
      "alpha": "2.0.0-alpha.2"
    },
    "engines": {
      "node": ">=20"
    },
    "dependencies": [
      "@hono/node-server"
    ],
    "peerDependencies": [
      "@modelcontextprotocol/server",
      "hono"
    ]
  },
  "@modelcontextprotocol/express": {
    "version": "2.0.0-alpha.2",
    "distTags": {
      "latest": "2.0.0-alpha.2",
      "alpha": "2.0.0-alpha.2"
    },
    "engines": {
      "node": ">=20"
    },
    "dependencies": [],
    "peerDependencies": [
      "@modelcontextprotocol/server",
      "express"
    ]
  },
  "@modelcontextprotocol/hono": {
    "version": "2.0.0-alpha.2",
    "distTags": {
      "latest": "2.0.0-alpha.2",
      "alpha": "2.0.0-alpha.2"
    },
    "engines": {
      "node": ">=20"
    },
    "dependencies": [],
    "peerDependencies": [
      "@modelcontextprotocol/server",
      "hono"
    ]
  }
}
```

## Current Package State

Current package state remains:

- package name: `@norma/core`;
- package version: `0.1.0`;
- package type: `module`;
- package private: `true`;
- root export only: `types` and `default` for `./dist/src/index`;
- no package `bin`;
- no production dependencies;
- no optional dependencies;
- no peer dependencies;
- dev dependency only: `typescript`;
- lockfile packages only: root package and `node_modules/typescript`;
- no MCP SDK dependency.

## Candidate Review

`@modelcontextprotocol/sdk@1.29.0` is not approved.

Reason: it is the current v1 package, but its dependency surface includes HTTP, auth, framework, spawn, schema, rate-limit, and event-source packages. That is too broad for a package/dependency decision PR that still does not approve remote runtime.

`@modelcontextprotocol/server@2.0.0-alpha.2` is not approved.

Reason: the official TypeScript SDK repository describes the current v2 branch as pre-alpha, and npm metadata shows Node `>=20`.

`@modelcontextprotocol/node@2.0.0-alpha.2` is not approved.

Reason: it is a Node.js Streamable HTTP middleware package tied to the v2 alpha server package and Node `>=20`.

`@modelcontextprotocol/express@2.0.0-alpha.2` is not approved.

Reason: framework binding is outside PR42, and the package is tied to v2 alpha.

`@modelcontextprotocol/hono@2.0.0-alpha.2` is not approved.

Reason: framework binding is outside PR42, and the package is tied to v2 alpha.

Dependency-free remote MCP implementation is not approved by PR42.

Reason: dependency choice is separate from runtime approval. PR42 does not authorize remote implementation by rejecting packages.

## Package / Dependency Decision

PR42 keeps all package/dependency work blocked.

PR42 does not approve:

- `@modelcontextprotocol/sdk`;
- `@modelcontextprotocol/server`;
- `@modelcontextprotocol/node`;
- `@modelcontextprotocol/express`;
- `@modelcontextprotocol/hono`;
- Express;
- Hono;
- CORS packages;
- OAuth/auth packages;
- token/JWT packages;
- rate-limit packages;
- event-source packages;
- MCP SDK packages;
- package metadata changes;
- lockfile changes.

No package/dependency candidate may be installed based on PR42.

## Package Metadata Boundary

PR42 must not change:

- `package.json`;
- `package-lock.json`;
- package `private`;
- package `exports`;
- package `bin`;
- package `files`;
- package `publishConfig`;
- dependencies;
- dev dependencies;
- optional dependencies;
- peer dependencies.

The package remains private.

## Runtime Non-Approval Boundary

PR42 does not implement remote MCP.

PR42 does not approve:

- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- OAuth/auth/token runtime;
- remote server files;
- deployment files;
- logging;
- filesystem behavior;
- network behavior;
- shell behavior;
- environment-driven behavior.

Current runtime remains local STDIO only.

## Tool Exposure Boundary

Current MCP tool exposure remains exactly:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

`norma.replayRun` and arbitrary replay remain blocked as MCP exposure.

Resources, prompts, sampling, elicitation, and logging remain blocked.

## Required Future Reconsideration PR

A future package/dependency reconsideration PR is required before any package-only install PR.

That reconsideration PR must re-check current official SDK docs and npm metadata, then explicitly decide:

- exact package names and versions;
- stable-vs-alpha status;
- Node engine compatibility;
- dependency tree and transitive risk;
- license compatibility;
- lockfile impact;
- package export/bin/publish metadata impact;
- runtime surface enabled by each dependency;
- removal and rollback plan;
- security test matrix impact.

## Required Future Install PR

If a future reconsideration PR approves a package candidate, a separate package-only install PR is still required.

That install PR must:

- modify only package metadata and lockfiles unless explicitly scoped otherwise;
- add no runtime implementation;
- add no remote server files;
- add no tool exposure;
- prove the installed dependency tree matches the approved candidate;
- keep remote MCP blocked until a later runtime PR.

## Required Tests Before Any Install

Before any MCP package or dependency is installed, future PRs must add or update tests for:

- approved package name and version;
- rejected package names;
- dependency and peer-dependency tree;
- lockfile drift;
- package `bin` drift;
- package export drift;
- package publication metadata drift;
- MCP SDK dependency presence only when explicitly approved;
- no runtime files introduced by install;
- no HTTP/SSE/Streamable HTTP/WebSocket runtime introduced by install;
- no OAuth/auth/token runtime introduced by install;
- no tool exposure change introduced by install.

## Final Decision

Remote MCP remains blocked after PR42.

Local STDIO remains the only approved MCP runtime.

No remote MCP package/dependency candidate is approved by PR42.

No MCP SDK dependency is approved by PR42.

No package-only install PR is authorized by PR42.

No package/dependency/bin/export/lockfile change is approved by PR42.

No runtime implementation is approved by PR42.
