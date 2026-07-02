# Norma Core

Norma Core is a deterministic proportional geometry engine. It applies explicit, versioned proportional systems to structured geometric inputs and returns traceable structured outputs.

The current repository proves the MVP core and local trust-layer surfaces. It is not a production product, public package, hosted service, or image/CAD adapter stack.

## Current State

The MVP core works for explicit structured inputs:

- structured input;
- proportional system;
- rule resolution;
- construction;
- measurement;
- evaluation;
- comparison and decision;
- explanation;
- derived artifacts;
- run and replay metadata.

The local trust-layer surfaces now exist:

- local CLI for approved operations;
- run verification;
- artifact freshness verification;
- MVP replay;
- local read-only viewer and prototype documentation;
- local MCP STDIO.

These surfaces preserve the core rule that source truth comes from explicit structured data. Artifacts, displays, prompts, files, MCP calls, and CLI envelopes are derived or transport surfaces; they do not become the core model.

## Local Boundaries

The package remains private and local. `package.json` has `private: true`, no package-level `bin`, no `publishConfig`, and no license field because this repository has no authoritative root license file. Public npm publication is not ready.

Local MCP STDIO is the only approved MCP runtime. It is local-only and hardened, not remote, hosted, or production. It does not approve remote MCP, ChatGPT integration, deployment, provider auth, resources, prompts, sampling, elicitation, filesystem access, network access, shell execution, package metadata drift, or new dependencies.

The local CLI is also local-only. It calls approved package-root operations and writes structured JSON envelopes; it does not publish a package, create a production API, or add product/adaptation behavior.

## Audit Checkpoint

The current checkpoint after PR73 is:

- MVP core works for explicit structured inputs.
- PR71 fixed duplicate sibling source IDs.
- PR72 hardened MCP STDIO input bounds and process survival.
- PR73 added minimal CI for clean install, build, tests, repository checks, and diff whitespace checks.

## What Is Not Implemented

The following are not implemented:

- image pipeline;
- vision pipeline;
- camera integration;
- CAD integration;
- adapters;
- ChatGPT integration;
- remote MCP;
- production API or cloud service;
- deployment;
- public package publication.

Norma Core evaluates closeness to a declared proportional system. It does not judge beauty, infer author intent, or derive source truth from prompts, images, renders, exports, UI state, native CAD objects, or hidden defaults.

## Verification

Use the repository scripts for local verification:

```bash
npm run build
npm test
npm run check
```

Available scripts are defined in `package.json`.

## Related Documentation

- `docs/CLI.md` documents the local CLI boundary.
- `docs/MCP_TOOL_CONTRACT.md` documents the local MCP tool contract.
- `docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md` documents why public package publication remains blocked.
- `docs/examples/` and `docs/onboarding/` document local viewer and onboarding examples.
