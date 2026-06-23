import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { OrchestratorConfig, ValidationCategory, ValidationCommand } from "./types.js";

type OrchestratorConfigPatch = {
  -readonly [Key in keyof OrchestratorConfig]?: OrchestratorConfig[Key];
};

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  wikiPath: null,
  pinnedWikiNotes: [],
  excludedPaths: [
    ".git",
    ".obsidian",
    "node_modules",
    "trash",
    ".orchestrator",
    "generated",
    "cache",
  ],
  contextLimits: {
    maxNotes: 8,
    maxCharacters: 24000,
    maxDepth: 1,
  },
  validationCommands: [],
  worktreeAdapter: null,
  roleModels: {},
  maxRepairAttempts: 1,
  autoPr: { enabled: false },
};

interface LoadConfigOptions {
  readonly codeRoot: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function validationCategories(value: unknown): readonly ValidationCategory[] {
  const allowed = new Set<ValidationCategory>([
    "orchestrator",
    "shared",
    "application",
    "schema",
    "documentation",
  ]);
  return stringArray(value).filter((item): item is ValidationCategory =>
    allowed.has(item as ValidationCategory),
  );
}

function normalizeValidationCommand(value: unknown): ValidationCommand | null {
  if (!isRecord(value)) {
    return null;
  }
  const name = value.name;
  const command = value.command;
  if (typeof name !== "string" || typeof command !== "string") {
    return null;
  }

  const args = stringArray(value.args);
  const required = typeof value.required === "boolean" ? value.required : true;
  const timeoutMs =
    typeof value.timeoutMs === "number" && Number.isFinite(value.timeoutMs) && value.timeoutMs > 0
      ? Math.trunc(value.timeoutMs)
      : 120000;
  const categories = validationCategories(value.categories);

  return {
    name,
    command,
    args,
    required,
    timeoutMs,
    categories: categories.length > 0 ? categories : ["shared"],
  };
}

function normalizeConfig(value: unknown): OrchestratorConfigPatch {
  if (!isRecord(value)) {
    return {};
  }

  const contextLimitsValue = isRecord(value.contextLimits) ? value.contextLimits : {};
  const autoPrValue = isRecord(value.autoPr) ? value.autoPr : {};
  const roleModelsValue = isRecord(value.roleModels) ? value.roleModels : {};
  const roleModelsEntries = Object.entries(roleModelsValue).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  const validationCommands = Array.isArray(value.validationCommands)
    ? value.validationCommands
        .map((commandValue) => normalizeValidationCommand(commandValue))
        .filter((command): command is ValidationCommand => command !== null)
    : undefined;

  const normalized: OrchestratorConfigPatch = {};
  if (typeof value.wikiPath === "string") {
    normalized.wikiPath = value.wikiPath;
  }
  if (Array.isArray(value.pinnedWikiNotes)) {
    normalized.pinnedWikiNotes = stringArray(value.pinnedWikiNotes);
  }
  if (Array.isArray(value.excludedPaths)) {
    normalized.excludedPaths = stringArray(value.excludedPaths);
  }
  if (
    typeof contextLimitsValue.maxNotes === "number" ||
    typeof contextLimitsValue.maxCharacters === "number" ||
    typeof contextLimitsValue.maxDepth === "number"
  ) {
    normalized.contextLimits = {
      maxNotes:
        typeof contextLimitsValue.maxNotes === "number"
          ? Math.max(1, Math.trunc(contextLimitsValue.maxNotes))
          : DEFAULT_ORCHESTRATOR_CONFIG.contextLimits.maxNotes,
      maxCharacters:
        typeof contextLimitsValue.maxCharacters === "number"
          ? Math.max(1, Math.trunc(contextLimitsValue.maxCharacters))
          : DEFAULT_ORCHESTRATOR_CONFIG.contextLimits.maxCharacters,
      maxDepth:
        typeof contextLimitsValue.maxDepth === "number"
          ? Math.max(0, Math.trunc(contextLimitsValue.maxDepth))
          : DEFAULT_ORCHESTRATOR_CONFIG.contextLimits.maxDepth,
    };
  }
  if (validationCommands !== undefined) {
    normalized.validationCommands = validationCommands;
  }
  if (typeof value.worktreeAdapter === "string") {
    normalized.worktreeAdapter = value.worktreeAdapter;
  }
  if (roleModelsEntries.length > 0) {
    normalized.roleModels = Object.fromEntries(roleModelsEntries);
  }
  if (typeof value.maxRepairAttempts === "number") {
    normalized.maxRepairAttempts = Math.max(0, Math.trunc(value.maxRepairAttempts));
  }
  if (typeof autoPrValue.enabled === "boolean") {
    normalized.autoPr = { enabled: autoPrValue.enabled };
  }
  return normalized;
}

function mergeConfig(base: OrchestratorConfig, override: OrchestratorConfigPatch): OrchestratorConfig {
  return {
    wikiPath: override.wikiPath ?? base.wikiPath,
    pinnedWikiNotes: override.pinnedWikiNotes ?? base.pinnedWikiNotes,
    excludedPaths: override.excludedPaths ?? base.excludedPaths,
    contextLimits: override.contextLimits ?? base.contextLimits,
    validationCommands: override.validationCommands ?? base.validationCommands,
    worktreeAdapter: override.worktreeAdapter ?? base.worktreeAdapter,
    roleModels: override.roleModels ?? base.roleModels,
    maxRepairAttempts: override.maxRepairAttempts ?? base.maxRepairAttempts,
    autoPr: override.autoPr ?? base.autoPr,
  };
}

async function readJsonConfig(filePath: string): Promise<OrchestratorConfigPatch> {
  const text = await readFile(filePath, "utf8");
  return normalizeConfig(JSON.parse(text) as unknown);
}

export async function loadOrchestratorConfig(options: LoadConfigOptions): Promise<OrchestratorConfig> {
  const env = options.env ?? process.env;
  const examplePath = path.join(options.codeRoot, ".orchestrator.example.json");
  const localPath = path.join(options.codeRoot, ".orchestrator", "config.json");

  let config = DEFAULT_ORCHESTRATOR_CONFIG;
  if (await fileExists(examplePath)) {
    config = mergeConfig(config, await readJsonConfig(examplePath));
  }
  if (await fileExists(localPath)) {
    config = mergeConfig(config, await readJsonConfig(localPath));
  }
  if (config.wikiPath === null && typeof env.NORMA_CORE_WIKI_PATH === "string") {
    config = mergeConfig(config, { wikiPath: env.NORMA_CORE_WIKI_PATH });
  }

  return config;
}
