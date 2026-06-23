export type OrchestratorStatus = "passed" | "blocked";

export type ValidationCategory = "orchestrator" | "shared" | "application" | "schema" | "documentation";

export interface ValidationCommand {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly required: boolean;
  readonly timeoutMs: number;
  readonly categories: readonly ValidationCategory[];
}

export interface ContextLimits {
  readonly maxNotes: number;
  readonly maxCharacters: number;
  readonly maxDepth: number;
}

export interface AutoPrConfig {
  readonly enabled: boolean;
}

export interface OrchestratorConfig {
  readonly wikiPath: string | null;
  readonly pinnedWikiNotes: readonly string[];
  readonly excludedPaths: readonly string[];
  readonly contextLimits: ContextLimits;
  readonly validationCommands: readonly ValidationCommand[];
  readonly worktreeAdapter: string | null;
  readonly roleModels: Readonly<Record<string, string>>;
  readonly maxRepairAttempts: number;
  readonly autoPr: AutoPrConfig;
}

export interface Frontmatter {
  readonly title: string | null;
  readonly tags: readonly string[];
  readonly aliases: readonly string[];
  readonly raw: Readonly<Record<string, string | readonly string[]>>;
}

export interface HeadingRef {
  readonly level: number;
  readonly text: string;
  readonly slug: string;
}

export interface WikiLinkRef {
  readonly raw: string;
  readonly target: string;
  readonly heading: string | null;
  readonly alias: string | null;
}

export interface MarkdownLinkRef {
  readonly raw: string;
  readonly target: string;
}

export interface BacklinkRef {
  readonly fromPath: string;
  readonly fromTitle: string;
  readonly heading: string | null;
}

export interface WikiNote {
  readonly relativePath: string;
  readonly title: string;
  readonly frontmatter: Frontmatter;
  readonly headings: readonly HeadingRef[];
  readonly tags: readonly string[];
  readonly aliases: readonly string[];
  readonly wikilinks: readonly WikiLinkRef[];
  readonly markdownLinks: readonly MarkdownLinkRef[];
  readonly outgoingLinks: readonly string[];
  readonly backlinks: readonly BacklinkRef[];
  readonly contentHash: string;
  readonly body: string;
}

export interface WikiIndex {
  readonly wikiPath: string;
  readonly notes: readonly WikiNote[];
}

export interface SelectedNote {
  readonly note: WikiNote;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface ContextSelection {
  readonly selected: readonly {
    readonly relativePath: string;
    readonly title: string;
    readonly score: number;
    readonly reasons: readonly string[];
  }[];
  readonly omitted: readonly {
    readonly relativePath: string;
    readonly title: string;
    readonly reason: string;
  }[];
}

export interface ContextPack {
  readonly markdown: string;
  readonly selection: ContextSelection;
}

export interface ValidationPlan {
  readonly categories: readonly ValidationCategory[];
  readonly commands: readonly ValidationCommand[];
}

export interface ValidationResult {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly required: boolean;
  readonly skipped: boolean;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
}

export interface ValidationSummary {
  readonly status: OrchestratorStatus;
  readonly results: readonly ValidationResult[];
}

export interface GitMetadata {
  readonly root: string;
  readonly origin: string | null;
  readonly branch: string | null;
  readonly sha: string | null;
  readonly status: readonly string[];
}
