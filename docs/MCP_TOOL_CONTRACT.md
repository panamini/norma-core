# Norma Core MCP Tool Contract

## Status

PR33 is contract docs/tests only.

PR33 does not implement an MCP server.

PR33 does not add MCP dependencies.

PR33 does not choose final transport implementation.

PR33 does not expose Norma tools to ChatGPT, Claude, or any agent.

PR33 does not create API/SDK/UI/cloud behavior.

PR33 defines the contract a later MCP implementation must follow.

PR34 adds only a local STDIO skeleton.

PR34 implementation decision: local_stdio_json_rpc_skeleton_only.

PR34 does not implement tool calls.

PR34 does not expose tools yet.

PR34 does not add MCP SDK/dependencies.

PR34 does not add package metadata, publication, exports, API, SDK, UI, cloud, camera, image, vision, CAD, plugin, or marketplace behavior.

## MCP Scope Decision

Decision: contract_only_no_mcp_runtime

PR34 decision: local_stdio_json_rpc_skeleton_only

MCP work may proceed only as contract-first. Future implementation must start local-only unless a later threat model explicitly approves remote MCP.

Remote MCP is not approved by PR33. MCP must not define Norma truth. MCP must only wrap approved package-root operations.

`future explicit publication PR/action` is not a current MCP permission.

## Current Norma Core Readiness

Current readiness:

- package-root consumption is guarded by PR25;
- business/product roadmap exists from PR26;
- local CLI exists from PR27;
- CLI output contract exists from PR28;
- V1.5 checkpoint exists from PR29;
- public npm readiness audit exists from PR30;
- consumer compatibility policy and typed example exist from PR31;
- public package publishing gate exists from PR32;
- package remains private;
- no public npm publication exists;
- PR34 adds only a local STDIO JSON-RPC process skeleton if merged;
- no MCP tool exposure or tool-call implementation exists yet.

## Official MCP Concepts Used

The MCP contract uses these official concepts:

- MCP uses client-server architecture.
- A host creates one client per server.
- The MCP data layer uses JSON-RPC.
- Server primitives include tools, resources, and prompts.
- Tools are executable functions invoked by AI applications.
- `tools/list` discovers tool definitions.
- `tools/call` executes a named tool with arguments matching `inputSchema`.
- Resources are contextual data, not actions.
- Prompts are reusable templates.
- STDIO is local process transport.
- STDIO messages are JSON-RPC messages delimited by newlines.
- STDIO stdout must contain only valid MCP/JSON-RPC messages.
- Streamable HTTP is remote/server transport.
- Remote MCP requires stronger auth, approval, logging, and threat modeling.

References:

- https://modelcontextprotocol.io/docs/learn/architecture
- https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- https://modelcontextprotocol.io/specification/draft/server/tools
- https://modelcontextprotocol.io/specification/2025-06-18/server/resources
- https://modelcontextprotocol.io/specification/2025-06-18/server/prompts
- https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/mcp-quickstart

## Future Transport Boundary

PR33 does not implement transport.

PR34 adds local STDIO transport skeleton only.

PR34 does not add tools/list exposure, tools/call behavior, resources, prompts, sampling, elicitation, logging, package metadata, package exports, package bin metadata, dependencies, or MCP SDK usage.

PR35 enables `tools/list` discovery only for the local STDIO skeleton.

PR35 adds no `tools/call` behavior, tool execution, resources, prompts, remote transport, package metadata, dependencies, package exports, or package bin metadata.

Remote HTTP, SSE, and Streamable HTTP are not approved yet.

Remote MCP requires a separate threat model, auth, logging, allowlist, and data-retention policy.

Anthropic Messages API MCP connector expects publicly exposed HTTP servers and does not directly connect local STDIO servers.

Claude Code/local developer workflows may be compatible with local STDIO, but PR33 does not implement that.

OpenAI remote MCP requires explicit care around approvals, allowed tools, data sharing, prompt injection, and trusted servers.

## Allowed Future MCP Tools

Only these future tools are allowed by the PR33 contract:

```txt
norma.getVersion
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
norma.serializeCanonicalJson
```

No other tool may be added without a new contract PR.

Each tool must be read/verify/serialize only, except `norma.replayMvpDemo`, which may replay only the approved MVP operation and must not mutate source.

## Forbidden MCP Tools

These tools are forbidden and cannot be added as placeholders:

```txt
norma.createRule
norma.createPack
norma.createRatio
norma.createTolerancePolicy
norma.createGeometry
norma.modifyGeometry
norma.optimizeComposition
norma.recommendComposition
norma.scoreBeauty
norma.inferIntent
norma.generateDesign
norma.importImage
norma.importCamera
norma.importCAD
norma.exportCAD
norma.readFile
norma.writeFile
norma.deleteFile
norma.networkFetch
norma.shell
norma.exec
norma.publishPackage
norma.npmPublish
norma.gitTag
norma.createSdk
norma.createApi
norma.createMcpServer
```

## Tool Naming Rules

Every tool name must be prefixed with `norma.`.

Tool names must be explicit and operation-specific.

No generic `run`, `call`, `execute`, `eval`, `apply`, or `mutate`.

No overloaded tools.

No hidden mode switching.

Tool names must match the documented contract exactly.

## Common Tool Envelope Rules

All future MCP tools must:

- accept explicit structured JSON input;
- avoid hidden defaults;
- not infer source truth;
- not treat prompt text as source truth;
- not treat artifacts as source truth;
- preserve operation status;
- preserve warnings;
- preserve errors;
- preserve provenance;
- preserve mismatches;
- preserve artifact freshness;
- preserve artifactFreshness;
- preserve `artifactFreshness`;
- preserve source refs and output refs;
- preserve unknown fields unless explicitly unsupported;
- return structured JSON-compatible output;
- never reduce results to `valid`;
- never reduce results to `valid: true/false`.

## Tool Contracts

### `norma.getVersion`

Purpose: return version and capability metadata.

Allowed core data:

- `CORE_VERSION`;
- `STABLE_SERIALIZATION_VERSION`;
- deterministic serialization policy name if exported;
- package name/version if available without package metadata mutation.

Input schema sketch:

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {}
}
```

Output shape sketch:

```json
{
  "kind": "norma-mcp-tool-result",
  "tool": "norma.getVersion",
  "status": "ok",
  "coreVersion": "0.1.0-pr12",
  "serializationVersion": "stable-serialization-v1",
  "capabilities": {
    "verifyRun": true,
    "verifyArtifactFreshness": true,
    "replayMvpDemo": true,
    "serializeCanonicalJson": true
  }
}
```

### `norma.verifyRun`

Purpose: expose `verifyRun` through MCP without changing semantics.

Input: equivalent to existing `VerifyRunInput`.

Rules:

- pass input directly to `verifyRun`;
- do not infer pack lock;
- do not infer operation context;
- do not infer expected refs;
- do not execute replay unless existing `verifyRun` mode requires and supports it;
- preserve artifact freshness if supplied.

Output: equivalent to existing `RunVerification`, wrapped only if the future MCP implementation needs a standard tool result envelope.

### `norma.verifyArtifactFreshness`

Purpose: expose `verifyArtifactFreshness` through MCP without changing semantics.

Input: equivalent to existing `VerifyArtifactFreshnessInput`.

Rules:

- pass input directly to `verifyArtifactFreshness`;
- do not fetch sources;
- do not read files;
- do not infer source objects;
- do not treat artifact as source truth.

Output: equivalent to existing `ArtifactFreshnessVerification`.

### `norma.replayMvpDemo`

Purpose: expose MVP-only replay, not arbitrary replay.

Input: equivalent to the safe MVP-only subset currently accepted by `replayRun`.

Rules:

- supported operation remains `core.mvp-demo.run`;
- require explicit `mvpDemoInput`;
- require explicit run envelope;
- require explicit pack lock and operation context;
- optional recorded MVP result may be used for stronger deterministic comparison;
- no arbitrary operation replay;
- no adapter data;
- no prompt-as-source;
- preserve mismatches.

Output: equivalent to `ReplayRunResult`.

### `norma.serializeCanonicalJson`

Purpose: expose deterministic canonical serialization for already-structured values.

Input schema sketch:

```json
{
  "type": "object",
  "required": ["value"],
  "additionalProperties": false,
  "properties": {
    "value": {},
    "policy": {
      "type": "string"
    }
  }
}
```

Rules:

- serialize only explicit input value;
- do not fetch data;
- do not mutate data;
- use approved deterministic serialization policy;
- return canonical JSON string.

Output shape sketch:

```json
{
  "kind": "norma-mcp-tool-result",
  "tool": "norma.serializeCanonicalJson",
  "status": "ok",
  "canonicalJson": "{}"
}
```

## PR35 Discovery Contract

PR35 enables `tools/list` discovery only.

PR35 exposes exactly:

```txt
norma.getVersion
norma.serializeCanonicalJson
```

PR35 does not implement `tools/call`.

PR35 does not implement tool execution.

PR35 does not call Norma Core runtime functions.

PR35 does not expose verify/replay tools yet.

PR35 keeps resources/prompts blocked.

PR35 keeps remote MCP blocked.

PR35 keeps package metadata/dependency drift blocked.

PR35 keeps source-truth rules unchanged.

PR35 accepts no `tools/list` params, empty params, or a string cursor param, but returns the same complete static tools list without `nextCursor`.

PR36 is the first candidate for actual tool-call implementation, and only for the two PR35 discovery tools listed above.

## Resources and Prompts Policy

PR33 approves no MCP resources.

PR33 approves no MCP prompts.

PR34 exposes no MCP resources.

PR34 exposes no MCP prompts.

PR34 exposes no MCP tools.

A future tool-exposure implementation must be tools-only unless a later contract PR approves resources/prompts.

Resources must not expose source truth unless explicitly structured and approved.

Prompts must not become source truth.

Prompt templates must not create rules, ratios, packs, tolerances, or geometry.

Sampling is not approved for initial implementation.

Elicitation is not approved for initial implementation.

Logging is not approved for initial implementation.

## Source Truth Rules

Structured source objects are source truth.

Refs are traceability, not source truth.

Artifacts are derived projections, not source truth; artifacts are derived.

Prompt text is never source truth.

MCP client/host/server must not create Norma truth.

Agent-generated text cannot define pack locks, operation context, geometry, rules, or tolerances.

## Result Handling Rules

Consumers and future MCP wrappers must:

- inspect `status`;
- preserve warnings;
- preserve errors;
- preserve provenance;
- preserve mismatches;
- preserve artifact freshness;
- preserve artifactFreshness;
- preserve `artifactFreshness`;
- preserve source refs;
- preserve output refs;
- preserve unknown fields unless explicitly unsupported.

Unknown statuses are non-success.

Critical warnings must remain visible.

Blocking errors must remain visible.

## Approval, Allowlists, and Sensitive Actions

Future remote MCP must use explicit allowed-tools configuration where supported.

Sensitive actions are not approved.

State-changing actions are not approved.

If future sensitive actions are ever proposed, they require approval flow and a separate contract PR.

Current allowed tools should be safe read/verify/serialize operations.

`norma.replayMvpDemo` is computational replay, not source mutation.

Never expose broad tools and then denylist later.

Prefer allowlist-first tool exposure.

## Prompt Injection and Tool Poisoning Boundary

MCP outputs may enter model context and can influence agent behavior.

Prompt injection is a first-class risk.

Tool poisoning is a first-class risk.

Tool descriptions must be narrow and non-ambiguous.

Tool outputs must be structured and must not include hidden instructions.

Tool outputs must never ask the agent to ignore system/user/developer instructions.

No URL fetching.

No file reading.

No shell execution.

No network access.

No arbitrary resource loading.

No untrusted remote MCP server use without threat model.

Log/review data shared with remote MCP servers must be reviewed if remote MCP is ever approved.

Use only trusted servers if remote MCP is ever approved.

## Security and Data Policy

No real user data in initial MCP tests.

No secrets in tool input/output examples.

No tokens.

No OAuth in PR33.

No auth implementation in PR33.

No remote server in PR33.

No filesystem access in PR33.

No network access in PR33.

No filesystem access, network access, shell execution, package metadata mutation, or environment-driven behavior in PR34.

Future remote MCP requires auth, logging, rate limits, data retention policy, and incident response.

## Compatibility and Versioning

Tool contract changes require compatibility review.

Changing tool names is breaking.

Changing input schema required fields is breaking.

Changing output result kind/status semantics is breaking.

Removing warnings/errors/provenance/mismatches/artifactFreshness is breaking.

Changing `CORE_VERSION`, operation version, or serialization version needs a compatibility note.

Adding optional fields may be non-breaking but needs review.

Adding a new tool requires a new contract PR.

## Implementation Gate For Future PRs

Future MCP tool implementation PR must not start until:

- PR33 is merged;
- PR34 local STDIO skeleton is merged if the tool implementation uses MCP;
- package-root exports are stable;
- local CLI contract remains green;
- consumer compatibility tests remain green;
- publication gate remains unchanged;
- allowed tool list is unchanged or updated by contract PR;
- transport choice is approved;
- no runtime source truth rule is violated.

PR34 approved candidate:

```txt
PR34 - local STDIO MCP server skeleton
```

PR34 creates only the local STDIO JSON-RPC skeleton. PR34 does not implement tool calls.

## Testing Gate For MCP Implementation

PR34 skeleton tests must cover:

- initialize response shape;
- notification handling with no stdout response;
- invalid JSON and invalid request errors;
- method-not-found for tools/resources/prompts/sampling/elicitation/logging requests;
- stdout containing only JSON-RPC response lines;
- no package metadata drift;
- no dependency drift;
- no MCP SDK dependency;
- no filesystem/network/shell behavior;
- no environment-driven behavior.

Future tool implementation must include tests for:

- `tools/list` exposes only approved tools;
- tool schemas match PR33 contract;
- each tool calls existing core function without semantic changes;
- no forbidden tool is exposed;
- no resources/prompts are exposed unless later approved;
- invalid input returns structured error;
- tool outputs preserve warnings/errors/provenance/mismatches/artifactFreshness;
- no filesystem/network/shell behavior;
- no package metadata drift;
- no dependency drift unless explicitly approved.

## Strict Non-Goals

- no MCP tool-call implementation in PR34;
- no MCP dependency;
- no transport implementation beyond the PR34 local STDIO skeleton;
- no HTTP server;
- no STDIO behavior beyond the PR34 JSON-RPC skeleton;
- no SSE/Streamable HTTP server;
- no OAuth/auth;
- no API;
- no SDK runtime;
- no adapter;
- no UI;
- no cloud;
- no package publish;
- no package metadata change;
- no source truth creation;
- no artifact-as-source;
- no prompt-as-source;
- no agent-created rules, packs, ratios, tolerances, or geometry.

## Future PR Sequence

Recommended sequence:

```txt
PR34 - local STDIO MCP server skeleton
PR35 - MCP inspector / tools-list contract tests
PR36 - MCP tool-call implementation for getVersion and serializeCanonicalJson only
PR37 - MCP verifyRun / verifyArtifactFreshness tools
PR38 - MCP replayMvpDemo tool
PR39 - remote MCP/API threat model before any remote exposure
```

This sequence is a recommendation, not authorization.

## Exit Criteria

PR34 can merge when:

- only expected skeleton doc/test/runtime wrapper files changed;
- package metadata remains unchanged;
- no dependencies are added;
- no MCP SDK is added;
- no remote transport is added;
- no HTTP/SSE/Streamable HTTP/WebSocket behavior is added;
- no resources/prompts are exposed;
- no tools are exposed;
- no tool calls are implemented;
- stdout contains only JSON-RPC response lines;
- allowed and forbidden future tool lists are unchanged;
- source-truth rules are unchanged;
- build/test/check pass;
- guardrails pass.

PR33 can merge when:

- only expected doc/test files changed;
- no package metadata changed;
- no MCP implementation exists;
- no dependency added;
- no runtime source changed;
- contract doc includes allowed tools, forbidden tools, input/output rules, source-truth rules, approval/allowlist policy, prompt-injection policy, resources/prompts policy, and future implementation gate;
- test validates the contract document and no-implementation state;
- build/test/check pass;
- guardrails pass;
- automated review has no P0/P1 blockers.
