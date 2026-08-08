# Codex Project Instructions

## Project Focus

Treat this repository as `norma-core`, the core Norma codebase.

Prefer work that directly improves or protects the current core runtime, package contracts, detection logic, shared APIs, and durable project documentation.

## Shared Project Memory

The canonical shared memory/wiki vault for Norma Core context is:

`/Volumes/video/git/norma-core-wiki` (configured for this environment; configurable if needed, e.g. `../norma-core-wiki`)

Set `NORMA_CORE_WIKI_PATH` to your local Norma Core wiki path for portability.

Before non-trivial product, architecture, detection, runtime, package, API, data model, release, or local workflow work, read the vault in this order:

1. `NORMA_CORE_WIKI_PATH/WIKI_SCHEMA.md`
2. `NORMA_CORE_WIKI_PATH/AGENTS.md` and/or `NORMA_CORE_WIKI_PATH/CLAUDE.md`
3. `NORMA_CORE_WIKI_PATH/wiki/hot.md` if present
4. `NORMA_CORE_WIKI_PATH/wiki/index.md`
5. 1-3 targeted current durable pages found through `hot.md` / `index.md`
6. recent `NORMA_CORE_WIKI_PATH/wiki/log.md` entries only when history matters

If `wiki/hot.md` is missing in a worktree, fall back to `NORMA_CORE_WIKI_PATH/WIKI_SCHEMA.md`, then `NORMA_CORE_WIKI_PATH/CLAUDE.md`, then `NORMA_CORE_WIKI_PATH/wiki/overview.md` and `NORMA_CORE_WIKI_PATH/wiki/index.md`.

Do not read the whole wiki blindly. Treat `wiki/hot.md` as a routing cache, not truth. If `hot.md` conflicts with current durable pages, trust the durable page.

Do not mutate `norma-core-wiki` unless the task is explicitly memory/wiki update, ingest, lint, or save-output. If mutating it, follow its `AGENTS.md` / `CLAUDE.md` / `SKILL.md` write-time contract and update `wiki/index.md`, `wiki/log.md`, and `wiki/hot.md` when the contract requires it.

## Operating Rules

- Prefer small, testable, reversible changes.
- Do not perform large architectural rewrites unless explicitly requested.
- Do not present assumptions as facts. Mark uncertainty clearly.
- Inspect the active code path before proposing or making changes.
- Prefer the smallest change that solves the actual issue.
- Preserve existing patterns unless they directly block the task.
- Do not remove or repurpose the `docs/` or `tests/` directories without explicit approval.
- Treat generated files, caches, and build artifacts as non-authoritative unless current scripts prove otherwise.

## Shell And Tooling

- Prefer existing project scripts over ad hoc commands when both are available.
- Use the narrowest command that can prove or disprove the current hypothesis.
- Do not run broad or destructive commands unless the task explicitly requires them.

## Codebase Authority

Assume the following are non-authoritative by default unless current call sites prove otherwise:

- archive or backup folders
- `*.bak` files
- generated build output
- temporary diagnostic files
- disconnected experiments

When reporting findings, classify each relevant area as one of:

- active code
- legacy but informative code
- obsolete/dead code

Use current imports, package exports, runtime behavior, scripts, and active tests to determine what is authoritative.

## Change Strategy

- Start by identifying the live code path before changing anything.
- Prefer the smallest change that solves the actual issue.
- Keep changes local unless the task clearly requires a broader edit.
- Add short, clear technical comments only where they materially help a future developer or agent understand the purpose of the change, the files involved, why they matter, risks or edge cases, and how to verify the result. Keep comments precise, professional, actionable, and in scope; do not invent context or suggest unrelated refactors.
- Do not broaden scope during debugging without a concrete reason.
- If a temporary diagnostic is added, remove it before finishing unless the user asks to keep it.
- Do not make blind patches when runtime verification is realistically available.

## Documentation Outputs

- Audits go in `docs/audits/`.
- Technical decisions go in `docs/decisions/`.
- Implementation plans go in `docs/plans/`.
- Keep documents short, concrete, and tied to the active code path.

Suggested filename style:

- `docs/audits/YYYY-MM-DD-topic.md`
- `docs/decisions/YYYY-MM-DD-topic.md`
- `docs/plans/YYYY-MM-DD-topic.md`

## Testing Guidelines

- Prefer the repository's existing test framework and scripts.
- Run the narrowest relevant test scope first, then broaden only when needed.
- When changing shared contracts, package exports, or runtime behavior, include a contract-level verification when the repo supports it.
- When fixing browser-facing behavior, verify with rendered-page evidence when possible.
- Do not claim runtime verification without runtime evidence.

## Reporting Rules

When reporting findings:

- Separate confirmed facts from inference.
- Name the exact file, package, module, script, route, or test path involved.
- State what was verified and what remains uncertain.
- Do not describe legacy behavior as current behavior without proof.
- If blocked, state the exact boundary:
  - missing tool capability
  - environment access failure
  - unavailable runtime path
  - missing project dependency

Preferred wording examples:

- `This is active code.`
- `This appears to be legacy but informative.`
- `This looks obsolete/dead unless a current call site proves otherwise.`
- `I could not verify this from the current execution boundary.`

## Execution Discipline

- Do not simulate certainty.
- Do not claim runtime verification without runtime evidence.
- Do not switch tools or execution boundaries mid-investigation unless the current path is proven unavailable.
- Do not ask unnecessary follow-up questions when the repository, wiki, or runtime can answer them directly.
- Stop once the task is solved and verified at the correct boundary.

## Default Workflow

For most tasks, follow this order:

1. consult `norma-core-wiki` for durable context when the task is non-trivial
2. identify the active code path
3. inspect the current implementation
4. confirm the real boundary where the issue exists
5. make the smallest viable change
6. run the narrowest relevant verification
7. broaden verification only if needed
8. report what changed, what was verified, and any remaining uncertainty

Before pushing a branch, opening a PR, or merging after substantial implementation work, run Fallow in read-only review mode on the changed code when available. Treat Fallow as an advisory report only. Do not apply its fixes unless explicitly requested. Skip this for tiny localized edits unless they touch shared, public, or dependency-facing code.

## Non-Goals Unless Explicitly Requested

- large architectural rewrites
- reviving archived or backup implementations
- speculative cleanup outside the task scope
- replacing active flows with unproven alternatives
- mutating `norma-core-wiki` during ordinary code work

## Skills

- `@everything-claude-code/skills`

Use them in ways that support the active Norma Core path and the scope limits above.
