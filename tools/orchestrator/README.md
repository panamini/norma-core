# Norma Orchestrator

Minimal Codex-native orchestration support for Norma Core.

This v0 keeps `norma-core-wiki` read-only, indexes Markdown deterministically,
builds task-specific context packs, dispatches configured local validation
commands, and records run evidence under `.orchestrator/runs/`.

## Commands

```bash
npm run orchestrator:doctor
npm run orchestrator:context -- --task "Describe the task"
npm run orchestrator:validate -- --changed tools/orchestrator/src/context.ts --dry-run
npm run orchestrator:run -- --task "Describe the task" --dry-run
```

## Configuration

Tracked defaults live in `.orchestrator.example.json`.
Local machine-specific overrides belong in `.orchestrator/config.json`, which is
ignored.

Set `NORMA_CORE_WIKI_PATH` when the example config leaves `wikiPath` as `null`.

## Boundaries

- All executable code is TypeScript/Node.
- Markdown is context only and is never executed.
- Wiki indexing reads Markdown only and excludes Obsidian internals, caches,
  trash, and generated run output.
- Codex subprocess calls are represented by a no-shell adapter and are mocked by
  tests; deterministic local validation decides pass/fail.
- `proposed-wiki-writeback.md` is evidence only and is never applied to the wiki.
