import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type {
  BacklinkRef,
  Frontmatter,
  HeadingRef,
  MarkdownLinkRef,
  WikiIndex,
  WikiLinkRef,
  WikiNote,
} from "./types.js";

interface IndexWikiOptions {
  readonly wikiPath: string;
  readonly excludePaths?: readonly string[];
}

interface ResolveWikiPathOptions {
  readonly wikiPath?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

const DEFAULT_EXCLUDES = [".git", ".obsidian", "node_modules", "trash"];

export function resolveWikiPath(options: ResolveWikiPathOptions): string {
  const candidate = options.wikiPath ?? options.env?.NORMA_CORE_WIKI_PATH;
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new Error("Wiki path is required. Set NORMA_CORE_WIKI_PATH or configure wikiPath.");
  }
  return path.resolve(candidate);
}

export function assertInsideRoot(root: string, candidate: string): void {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }
  throw new Error(`Path ${candidate} is outside the wiki root ${root}.`);
}

function normalizeRelative(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function shouldExclude(relativePath: string, excludePaths: readonly string[]): boolean {
  const normalized = normalizeRelative(relativePath);
  return excludePaths.some((excluded) => {
    const clean = excluded.replace(/^\/+|\/+$/g, "");
    return normalized === clean || normalized.startsWith(`${clean}/`) || normalized.includes(`/${clean}/`);
  });
}

async function discoverMarkdownFiles(
  root: string,
  current: string,
  excludePaths: readonly string[],
): Promise<readonly string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolute = path.join(current, entry.name);
    assertInsideRoot(root, absolute);
    const relative = path.relative(root, absolute);
    if (shouldExclude(relative, excludePaths)) {
      continue;
    }
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...(await discoverMarkdownFiles(root, absolute, excludePaths)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(absolute);
    }
  }
  return files;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineArray(value: string): readonly string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((item) => stripQuotes(item.trim()))
    .filter((item) => item.length > 0);
}

function parseFrontmatter(text: string): { readonly frontmatter: Frontmatter; readonly body: string } {
  if (!text.startsWith("---\n")) {
    return {
      frontmatter: { title: null, tags: [], aliases: [], raw: {} },
      body: text,
    };
  }
  const closeIndex = text.indexOf("\n---", 4);
  if (closeIndex === -1) {
    return {
      frontmatter: { title: null, tags: [], aliases: [], raw: {} },
      body: text,
    };
  }

  const rawBlock = text.slice(4, closeIndex).trim();
  const body = text.slice(closeIndex + 4).replace(/^\n/, "");
  const raw: Record<string, string | readonly string[]> = {};
  let currentArrayKey: string | null = null;

  for (const line of rawBlock.split("\n")) {
    const arrayMatch = /^\s*-\s+(.+)$/.exec(line);
    if (arrayMatch && currentArrayKey !== null) {
      const existing = raw[currentArrayKey];
      const existingArray = Array.isArray(existing) ? existing : [];
      raw[currentArrayKey] = [...existingArray, stripQuotes(arrayMatch[1] ?? "")].filter(Boolean);
      continue;
    }

    const keyMatch = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!keyMatch) {
      currentArrayKey = null;
      continue;
    }
    const key = keyMatch[1] ?? "";
    const value = keyMatch[2] ?? "";
    if (value.trim().length === 0) {
      raw[key] = [];
      currentArrayKey = key;
    } else if (value.trim().startsWith("[")) {
      raw[key] = parseInlineArray(value);
      currentArrayKey = null;
    } else {
      raw[key] = stripQuotes(value);
      currentArrayKey = null;
    }
  }

  const title = typeof raw.title === "string" ? raw.title : null;
  const tags = Array.isArray(raw.tags) ? raw.tags : typeof raw.tags === "string" ? [raw.tags] : [];
  const aliases = Array.isArray(raw.aliases)
    ? raw.aliases
    : typeof raw.aliases === "string"
      ? [raw.aliases]
      : [];

  return {
    frontmatter: { title, tags, aliases, raw },
    body,
  };
}

function slugifyHeading(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function extractHeadings(body: string): readonly HeadingRef[] {
  const headings: HeadingRef[] = [];
  for (const line of body.split("\n")) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      const text = match[2] ?? "";
      headings.push({ level: (match[1] ?? "").length, text, slug: slugifyHeading(text) });
    }
  }
  return headings;
}

function extractWikiLinks(body: string): readonly WikiLinkRef[] {
  const links: WikiLinkRef[] = [];
  const pattern = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
  for (const match of body.matchAll(pattern)) {
    const raw = match[0] ?? "";
    const target = (match[1] ?? "").trim();
    const heading = match[2]?.trim() ?? null;
    const alias = match[3]?.trim() ?? null;
    if (target.length > 0) {
      links.push({ raw, target, heading, alias });
    }
  }
  return links;
}

function extractMarkdownLinks(body: string): readonly MarkdownLinkRef[] {
  const links: MarkdownLinkRef[] = [];
  const pattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of body.matchAll(pattern)) {
    const raw = match[0] ?? "";
    const target = (match[1] ?? "").trim();
    if (
      target.length > 0 &&
      !target.startsWith("#") &&
      !target.startsWith("http://") &&
      !target.startsWith("https://")
    ) {
      links.push({ raw, target });
    }
  }
  return links;
}

function titleFromBody(body: string, fallback: string): string {
  const heading = extractHeadings(body).find((candidate) => candidate.level === 1);
  return heading?.text ?? fallback;
}

function noteLookupKeys(note: WikiNote): readonly string[] {
  const withoutExtension = note.relativePath.replace(/\.md$/u, "");
  const basename = path.posix.basename(withoutExtension);
  return [
    note.title.toLowerCase(),
    withoutExtension.toLowerCase(),
    basename.toLowerCase(),
    ...note.aliases.map((alias) => alias.toLowerCase()),
  ];
}

function withBacklinks(notes: readonly WikiNote[]): readonly WikiNote[] {
  const backlinks = new Map<string, BacklinkRef[]>();
  const lookup = new Map<string, WikiNote>();
  for (const note of notes) {
    for (const key of noteLookupKeys(note)) {
      lookup.set(key, note);
    }
  }

  for (const note of notes) {
    for (const link of note.wikilinks) {
      const target = lookup.get(link.target.toLowerCase());
      if (!target) {
        continue;
      }
      const current = backlinks.get(target.relativePath) ?? [];
      current.push({ fromPath: note.relativePath, fromTitle: note.title, heading: link.heading });
      backlinks.set(target.relativePath, current);
    }
  }

  return notes.map((note) => ({
    ...note,
    backlinks: (backlinks.get(note.relativePath) ?? []).sort((left, right) =>
      left.fromPath.localeCompare(right.fromPath),
    ),
  }));
}

export async function indexWiki(options: IndexWikiOptions): Promise<WikiIndex> {
  const wikiPath = resolveWikiPath({ wikiPath: options.wikiPath });
  const stats = await stat(wikiPath).catch(() => null);
  if (!stats?.isDirectory()) {
    throw new Error(`Wiki path does not exist or is not a directory: ${wikiPath}`);
  }

  const excludePaths = [...DEFAULT_EXCLUDES, ...(options.excludePaths ?? [])];
  const files = await discoverMarkdownFiles(wikiPath, wikiPath, excludePaths);
  const notes: WikiNote[] = [];

  for (const absolute of files) {
    const relativePath = normalizeRelative(path.relative(wikiPath, absolute));
    const text = await readFile(absolute, "utf8");
    const parsed = parseFrontmatter(text);
    const headings = extractHeadings(parsed.body);
    const title = parsed.frontmatter.title ?? titleFromBody(parsed.body, path.basename(relativePath, ".md"));
    const wikilinks = extractWikiLinks(parsed.body);
    const markdownLinks = extractMarkdownLinks(parsed.body);
    const outgoingLinks = [
      ...wikilinks.map((link) => link.heading ? `${link.target}#${link.heading}` : link.target),
      ...markdownLinks.map((link) => link.target),
    ].sort((left, right) => left.localeCompare(right));
    const contentHash = `sha256:${createHash("sha256").update(text).digest("hex")}`;

    notes.push({
      relativePath,
      title,
      frontmatter: parsed.frontmatter,
      headings,
      tags: parsed.frontmatter.tags,
      aliases: parsed.frontmatter.aliases,
      wikilinks,
      markdownLinks,
      outgoingLinks,
      backlinks: [],
      contentHash,
      body: parsed.body,
    });
  }

  return {
    wikiPath,
    notes: [...withBacklinks(notes)].sort((left: WikiNote, right: WikiNote) =>
      left.relativePath.localeCompare(right.relativePath),
    ),
  };
}
