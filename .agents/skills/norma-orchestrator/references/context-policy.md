# Context Policy

- Use `norma-core-wiki` as the canonical project-memory source.
- Read Markdown only.
- Exclude `.obsidian/`, `.git/`, `node_modules/`, caches, trash, and generated
  orchestrator output. Binary assets are skipped by the Markdown-only reader.
- Prefer pinned canonical notes, exact path/title matches, heading matches,
  frontmatter tags/aliases, task-term overlap, direct wikilinks, and one-hop
  backlinks.
- Generated context packs are disposable derived data, not a second source of
  truth.
- Keep timestamps out of context output so repeated builds stay deterministic.
