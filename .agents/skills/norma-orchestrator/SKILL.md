---
name: norma-orchestrator
description: Use when planning, implementing, validating, or reviewing non-trivial Norma Core work that needs wiki context, deterministic validation, or Codex role orchestration.
---

# Norma Orchestrator

Use this Skill for non-trivial Norma Core work involving product, architecture,
detection, runtime contracts, APIs, release readiness, or local workflow changes.

## Workflow

1. Inspect the task and confirm the allowed scope.
2. Build task-specific context with the TypeScript orchestrator.
3. Produce a concise implementation plan tied to active code paths.
4. Implement inside the allowed scope only.
5. Run deterministic validation through the orchestrator.
6. Perform independent review against task, context, diff, and validation.
7. Allow at most one bounded repair pass by default.
8. Report `READY_TO_REVIEW` or `BLOCKED` with exact evidence.

## Commands

```bash
npm run orchestrator:doctor
npm run orchestrator:context -- --task "<task>"
npm run orchestrator:validate -- --changed "<path[,path]>" --dry-run
npm run orchestrator:run -- --task "<task>" --changed "<path[,path]>" --dry-run
```

## Boundaries

- Treat `norma-core-wiki` as read-only unless the user explicitly asks for wiki
  mutation, ingest, lint, or save-output work.
- Do not copy large wiki sections into `AGENTS.md` or other tracked memory files.
- Do not broaden PR scope.
- Do not claim validation success without local command evidence.
- Do not run dependency installation, migrations, publishing, or broad code
  generation automatically.
- Do not use dangerous Codex flags.

See `references/context-policy.md`, `references/validation-policy.md`, and
`references/role-contracts.md` for details.
