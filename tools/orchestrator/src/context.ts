import { getGitMetadata } from "./git.js";
import type { ContextPack, ContextSelection, OrchestratorConfig, SelectedNote, WikiNote } from "./types.js";
import { indexWiki } from "./wiki.js";

interface BuildContextPackOptions {
  readonly codeRoot: string;
  readonly task: string;
  readonly config: OrchestratorConfig;
}

function taskTerms(task: string): readonly string[] {
  return Array.from(
    new Set(
      task
        .toLowerCase()
        .split(/[^a-z0-9]+/u)
        .filter((term) => term.length >= 4),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function lowerIncludes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function scoreNote(note: WikiNote, task: string, pinned: ReadonlySet<string>, terms: readonly string[]): SelectedNote {
  const reasons: string[] = [];
  let score = 0;

  if (pinned.has(note.relativePath)) {
    score += 1000;
    reasons.push("pinned");
  }
  if (lowerIncludes(task, note.relativePath) || lowerIncludes(task, note.title)) {
    score += 120;
    reasons.push("exact path/title match");
  }
  const headingMatches = note.headings.filter((heading) => lowerIncludes(task, heading.text)).length;
  if (headingMatches > 0) {
    score += headingMatches * 40;
    reasons.push("heading match");
  }
  const metadataMatches = [...note.tags, ...note.aliases].filter((value) => lowerIncludes(task, value)).length;
  if (metadataMatches > 0) {
    score += metadataMatches * 25;
    reasons.push("frontmatter tag/alias match");
  }
  const searchable = [
    note.title,
    note.relativePath,
    ...note.tags,
    ...note.aliases,
    ...note.headings.map((heading) => heading.text),
    note.body,
  ]
    .join("\n")
    .toLowerCase();
  const overlap = terms.filter((term) => searchable.includes(term)).length;
  if (overlap > 0) {
    score += overlap * 5;
    reasons.push(`task term overlap:${overlap}`);
  }
  if (note.wikilinks.length > 0) {
    score += Math.min(note.wikilinks.length, 3);
    reasons.push("direct wikilinks");
  }
  if (note.backlinks.length > 0) {
    score += Math.min(note.backlinks.length, 3);
    reasons.push("one-hop backlinks");
  }

  if (reasons.length === 0) {
    reasons.push("available wiki note");
  }

  return { note, score, reasons };
}

function compactBody(note: WikiNote, remainingCharacters: number): string {
  const source = note.body.trim();
  if (source.length <= remainingCharacters) {
    return source;
  }
  return `${source.slice(0, Math.max(0, remainingCharacters - 32)).trimEnd()}\n\n[omitted due to context limit]`;
}

function validationCommandsMarkdown(config: OrchestratorConfig): string {
  if (config.validationCommands.length === 0) {
    return "- No validation commands configured.";
  }
  return config.validationCommands
    .map((command) => `- ${command.name}: ${command.command} ${command.args.join(" ")}`.trimEnd())
    .join("\n");
}

export async function buildContextPack(options: BuildContextPackOptions): Promise<ContextPack> {
  if (options.config.wikiPath === null) {
    throw new Error("Cannot build context without a wikiPath.");
  }

  const wiki = await indexWiki({
    wikiPath: options.config.wikiPath,
    excludePaths: options.config.excludedPaths,
  });
  const codeGit = await getGitMetadata(options.codeRoot);
  const wikiGit = await getGitMetadata(wiki.wikiPath);
  const pinned = new Set(options.config.pinnedWikiNotes);
  const terms = taskTerms(options.task);
  const ranked = wiki.notes
    .map((note) => scoreNote(note, options.task, pinned, terms))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.note.relativePath.localeCompare(right.note.relativePath);
    });

  const selected = ranked.slice(0, options.config.contextLimits.maxNotes);
  const omitted = ranked.slice(options.config.contextLimits.maxNotes);
  const selection: ContextSelection = {
    selected: selected.map((entry) => ({
      relativePath: entry.note.relativePath,
      title: entry.note.title,
      score: entry.score,
      reasons: entry.reasons,
    })),
    omitted: omitted.map((entry) => ({
      relativePath: entry.note.relativePath,
      title: entry.note.title,
      reason: "omitted due to maxNotes limit",
    })),
  };

  let remainingCharacters = options.config.contextLimits.maxCharacters;
  const noteSections: string[] = [];
  for (const entry of selected) {
    const header = [
      `## ${entry.note.title}`,
      `Source: ${entry.note.relativePath}`,
      `Reason: ${entry.reasons.join(", ")}`,
      `Content hash: ${entry.note.contentHash}`,
      "",
    ].join("\n");
    remainingCharacters -= header.length;
    const body = compactBody(entry.note, remainingCharacters);
    remainingCharacters -= body.length;
    noteSections.push(`${header}${body}`);
    if (remainingCharacters <= 0) {
      break;
    }
  }

  const markdown = [
    "# Norma Orchestrator Context Pack",
    "",
    "## Repository SHAs",
    `- code: ${codeGit.sha ?? "unknown"}`,
    `- wiki: ${wikiGit.sha ?? "unknown"}`,
    "",
    "## Task",
    options.task,
    "",
    "## Validation Commands",
    validationCommandsMarkdown(options.config),
    "",
    "## Selected Notes",
    ...noteSections,
    "",
    "## Omitted Notes",
    selection.omitted.length === 0
      ? "- None."
      : selection.omitted
          .map((note) => `- ${note.relativePath}: ${note.reason}`)
          .join("\n"),
    "",
  ].join("\n");

  return { markdown, selection };
}
