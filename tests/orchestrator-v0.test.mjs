import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  DEFAULT_ORCHESTRATOR_CONFIG,
  loadOrchestratorConfig,
} from "../dist/tools/orchestrator/src/config.js";
import { buildContextPack } from "../dist/tools/orchestrator/src/context.js";
import {
  buildCodexRoleInvocation,
  inspectCodexExecHelpText,
  runCodexInvocation,
} from "../dist/tools/orchestrator/src/codex.js";
import {
  acquireRunLock,
  createRunId,
  releaseRunLock,
  snapshotGitStatus,
  writeJsonAtomic,
  writeRunEvent,
} from "../dist/tools/orchestrator/src/run.js";
import {
  planValidationCommands,
  redactSecrets,
  runValidationCommands,
} from "../dist/tools/orchestrator/src/validation.js";
import {
  assertInsideRoot,
  indexWiki,
  resolveWikiPath,
} from "../dist/tools/orchestrator/src/wiki.js";

const execFileAsync = promisify(execFile);

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "norma-orchestrator-"));
  const codeRoot = path.join(root, "code");
  const wikiRoot = path.join(root, "wiki");
  await mkdir(codeRoot, { recursive: true });
  await mkdir(path.join(codeRoot, ".git"), { recursive: true });
  await mkdir(path.join(wikiRoot, "wiki", "tech"), { recursive: true });
  await mkdir(path.join(wikiRoot, "wiki", "strategy"), { recursive: true });
  await mkdir(path.join(wikiRoot, "wiki", "assets"), { recursive: true });
  await mkdir(path.join(wikiRoot, ".obsidian"), { recursive: true });

  await writeFile(
    path.join(codeRoot, "package.json"),
    JSON.stringify(
      {
        name: "@norma/fixture",
        type: "module",
        scripts: {
          build: "node -e \"process.exit(0)\"",
          test: "node -e \"process.exit(0)\"",
          check: "node -e \"process.exit(0)\"",
        },
      },
      null,
      2,
    ),
  );

  await writeFile(path.join(wikiRoot, ".obsidian", "workspace.json"), "{}");
  await writeFile(path.join(wikiRoot, "wiki", "assets", "diagram.png"), "\u0000png");
  await writeFile(
    path.join(wikiRoot, "wiki", "tech", "core-interface-boundary.md"),
    [
      "---",
      'title: "Core Interface Boundary"',
      "tags:",
      "  - architecture",
      "  - adapters",
      "aliases:",
      "  - Interface Boundary",
      "---",
      "",
      "# Core Interface Boundary",
      "",
      "Core owns deterministic geometry. See [[MVP PR Roadmap|roadmap]] and [[Validation Rules#Required Commands]].",
      "",
      "## Adapter Contract",
      "",
      "Adapters must not define core truth.",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(wikiRoot, "wiki", "strategy", "mvp-pr-roadmap.md"),
    [
      "---",
      'title: "MVP PR Roadmap"',
      "tags: [roadmap, validation]",
      "---",
      "",
      "# MVP PR Roadmap",
      "",
      "The roadmap links back to [[Core Interface Boundary#Adapter Contract]].",
      "",
      "## Required Commands",
      "",
      "Run the narrowest validation command first.",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(wikiRoot, "wiki", "strategy", "validation-rules.md"),
    [
      "# Validation Rules",
      "",
      "## Required Commands",
      "",
      "Use dry-run mode before orchestration.",
      "",
      "[Roadmap](./mvp-pr-roadmap.md)",
      "",
    ].join("\n"),
  );

  await execFileAsync("git", ["init"], { cwd: wikiRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: wikiRoot });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: wikiRoot });
  await execFileAsync("git", ["add", "."], { cwd: wikiRoot });
  await execFileAsync("git", ["commit", "-m", "fixture wiki"], { cwd: wikiRoot });

  return { root, codeRoot, wikiRoot };
}

test("indexes Markdown deterministically while excluding Obsidian internals and binary assets", async () => {
  const fixture = await createFixture();
  try {
    const first = await indexWiki({
      wikiPath: fixture.wikiRoot,
      excludePaths: [".obsidian", "node_modules", ".git", "trash", ".orchestrator"],
    });
    const second = await indexWiki({
      wikiPath: fixture.wikiRoot,
      excludePaths: [".obsidian", "node_modules", ".git", "trash", ".orchestrator"],
    });

    assert.deepEqual(second.notes, first.notes);
    assert.equal(first.notes.length, 3);
    assert.deepEqual(
      first.notes.map((note) => note.relativePath),
      [
        "wiki/strategy/mvp-pr-roadmap.md",
        "wiki/strategy/validation-rules.md",
        "wiki/tech/core-interface-boundary.md",
      ],
    );
    assert.equal(first.notes.some((note) => note.relativePath.includes(".obsidian")), false);
    assert.equal(first.notes.some((note) => note.relativePath.endsWith(".png")), false);

    const boundary = first.notes.find((note) => note.title === "Core Interface Boundary");
    assert.ok(boundary);
    assert.deepEqual(boundary.tags, ["architecture", "adapters"]);
    assert.deepEqual(boundary.aliases, ["Interface Boundary"]);
    assert.ok(boundary.headings.some((heading) => heading.text === "Adapter Contract"));
    assert.ok(
      boundary.wikilinks.some(
        (link) =>
          link.target === "Validation Rules" &&
          link.heading === "Required Commands" &&
          link.alias === null,
      ),
    );
    assert.ok(boundary.contentHash.startsWith("sha256:"));

    const roadmap = first.notes.find((note) => note.title === "MVP PR Roadmap");
    assert.ok(roadmap);
    assert.ok(roadmap.backlinks.some((link) => link.fromPath === boundary.relativePath));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("builds deterministic context packs with source reasons, size limits, and no timestamps", async () => {
  const fixture = await createFixture();
  try {
    const config = {
      ...DEFAULT_ORCHESTRATOR_CONFIG,
      wikiPath: fixture.wikiRoot,
      pinnedWikiNotes: ["wiki/tech/core-interface-boundary.md"],
      contextLimits: { maxNotes: 2, maxCharacters: 1200, maxDepth: 1 },
      validationCommands: [{ name: "check", command: "npm", args: ["run", "check"], required: true }],
    };

    const first = await buildContextPack({
      codeRoot: fixture.codeRoot,
      task: "Implement adapter validation without broadening core truth.",
      config,
    });
    const second = await buildContextPack({
      codeRoot: fixture.codeRoot,
      task: "Implement adapter validation without broadening core truth.",
      config,
    });

    assert.equal(second.markdown, first.markdown);
    assert.deepEqual(second.selection, first.selection);
    assert.match(first.markdown, /# Norma Orchestrator Context Pack/);
    assert.match(first.markdown, /wiki\/tech\/core-interface-boundary\.md/);
    assert.match(first.markdown, /Reason: pinned/);
    assert.match(first.markdown, /Validation Commands/);
    assert.equal(first.markdown.includes(new Date().getFullYear().toString()), false);
    assert.equal(first.selection.selected.length, 2);
    assert.equal(first.selection.omitted.length, 1);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("protects wiki paths from traversal and reports missing wiki paths", async () => {
  const fixture = await createFixture();
  try {
    assert.equal(resolveWikiPath({ wikiPath: fixture.wikiRoot, env: {} }), fixture.wikiRoot);
    assert.equal(resolveWikiPath({ env: { NORMA_CORE_WIKI_PATH: fixture.wikiRoot } }), fixture.wikiRoot);
    assert.throws(
      () => assertInsideRoot(fixture.wikiRoot, path.join(fixture.root, "outside.md")),
      /outside the wiki root/,
    );
    await assert.rejects(
      indexWiki({ wikiPath: path.join(fixture.root, "missing") }),
      /Wiki path does not exist/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("loads tracked example config while keeping local config optional", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      path.join(fixture.codeRoot, ".orchestrator.example.json"),
      JSON.stringify(
        {
          wikiPath: fixture.wikiRoot,
          pinnedWikiNotes: ["wiki/tech/core-interface-boundary.md"],
          validationCommands: [{ name: "check", command: "npm", args: ["run", "check"] }],
        },
        null,
        2,
      ),
    );

    const loaded = await loadOrchestratorConfig({
      codeRoot: fixture.codeRoot,
      env: {},
    });

    assert.equal(loaded.wikiPath, fixture.wikiRoot);
    assert.deepEqual(loaded.pinnedWikiNotes, ["wiki/tech/core-interface-boundary.md"]);
    assert.equal(loaded.validationCommands[0].required, true);
    assert.equal(loaded.maxRepairAttempts, 1);
    assert.equal(loaded.autoPr.enabled, false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("plans path-aware validation commands, supports dry-run, and propagates failures", async () => {
  const fixture = await createFixture();
  try {
    const plan = planValidationCommands({
      changedFiles: ["tools/orchestrator/src/context.ts"],
      config: {
        ...DEFAULT_ORCHESTRATOR_CONFIG,
        validationCommands: [
          {
            name: "orchestrator-unit",
            command: "node",
            args: ["--test", "tests/orchestrator-v0.test.mjs"],
            required: true,
            categories: ["orchestrator"],
          },
          {
            name: "core-check",
            command: "npm",
            args: ["run", "check"],
            required: true,
            categories: ["shared"],
          },
        ],
      },
    });

    assert.deepEqual(
      plan.commands.map((command) => command.name),
      ["orchestrator-unit"],
    );

    const dryRun = await runValidationCommands({
      cwd: fixture.codeRoot,
      commands: plan.commands,
      dryRun: true,
    });
    assert.equal(dryRun.status, "passed");
    assert.equal(dryRun.results[0].skipped, true);

    const failed = await runValidationCommands({
      cwd: fixture.codeRoot,
      commands: [
        {
          name: "fails",
          command: process.execPath,
          args: ["-e", "process.stderr.write('TOKEN=secret-value\\n'); process.exit(7)"],
          required: true,
          timeoutMs: 5000,
          categories: ["orchestrator"],
        },
      ],
      dryRun: false,
      redactedEnv: { TOKEN: "secret-value" },
    });

    assert.equal(failed.status, "blocked");
    assert.equal(failed.results[0].exitCode, 7);
    assert.equal(failed.results[0].stderr.includes("secret-value"), false);
    assert.equal(failed.results[0].stderr.includes("[REDACTED]"), true);
    assert.equal(redactSecrets("abc secret-value", { TOKEN: "secret-value" }), "abc [REDACTED]");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("constructs and executes safe Codex subprocess invocations without a shell", async () => {
  const support = inspectCodexExecHelpText(
    "Usage: codex exec [OPTIONS]\n  --json\n  --output-last-message <FILE>\n  --output-schema <FILE>\n  --sandbox <MODE>\n",
  );
  const planner = buildCodexRoleInvocation({
    codexBin: "codex",
    role: "planner",
    promptFile: "/tmp/prompt.md",
    sandbox: "read-only",
    outputLastMessageFile: "/tmp/last.txt",
    outputSchemaFile: "/tmp/schema.json",
    help: support,
  });
  const implementer = buildCodexRoleInvocation({
    codexBin: "codex",
    role: "implementer",
    promptFile: "/tmp/prompt.md",
    sandbox: "workspace-write",
    model: "gpt-test",
    help: support,
  });

  assert.equal(planner.command, "codex");
  assert.deepEqual(planner.args.slice(0, 2), ["exec", "--json"]);
  assert.ok(planner.args.includes("--sandbox"));
  assert.ok(planner.args.includes("read-only"));
  assert.ok(planner.args.includes("--output-last-message"));
  assert.ok(planner.args.includes("--output-schema"));
  assert.equal(planner.shell, false);
  assert.equal(planner.args.some((arg) => arg.includes("dangerously") || arg === "--yolo"), false);

  assert.ok(implementer.args.includes("--model"));
  assert.ok(implementer.args.includes("gpt-test"));
  assert.ok(implementer.args.includes("workspace-write"));

  const executed = await runCodexInvocation(
    {
      command: process.execPath,
      args: ["-e", "process.stdout.write('ok')"],
      shell: false,
      role: "planner",
    },
    { cwd: process.cwd(), timeoutMs: 5000 },
  );

  assert.equal(executed.exitCode, 0);
  assert.equal(executed.stdout, "ok");
  assert.equal(executed.stderr, "");
});

test("creates run evidence with atomic writes, JSONL events, and single-run locking", async () => {
  const fixture = await createFixture();
  try {
    const runRoot = path.join(fixture.codeRoot, ".orchestrator", "runs");
    const runId = createRunId("dry-run", new Date("2026-06-23T12:00:00.000Z"));
    const lock = await acquireRunLock(path.join(fixture.codeRoot, ".orchestrator"));

    await assert.rejects(
      acquireRunLock(path.join(fixture.codeRoot, ".orchestrator")),
      /Another orchestrator run is active/,
    );

    const runDir = path.join(runRoot, runId);
    await mkdir(runDir, { recursive: true });
    await writeJsonAtomic(path.join(runDir, "metadata.json"), { runId, complete: false });
    await writeRunEvent(runDir, { type: "doctor", status: "ok" });
    await releaseRunLock(lock);

    const metadata = JSON.parse(await readFile(path.join(runDir, "metadata.json"), "utf8"));
    const events = await readFile(path.join(runDir, "events.jsonl"), "utf8");
    assert.equal(metadata.runId, "dry-run-20260623T120000000Z");
    assert.match(events, /"type":"doctor"/);
    await stat(lock.lockPath).then(
      () => assert.fail("lock should be released"),
      (error) => assert.equal(error.code, "ENOENT"),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("context generation and validation leave the wiki repository unchanged", async () => {
  const fixture = await createFixture();
  try {
    const before = await snapshotGitStatus(fixture.wikiRoot);
    await buildContextPack({
      codeRoot: fixture.codeRoot,
      task: "Check validation rules",
      config: {
        ...DEFAULT_ORCHESTRATOR_CONFIG,
        wikiPath: fixture.wikiRoot,
        pinnedWikiNotes: ["wiki/strategy/validation-rules.md"],
      },
    });
    await runValidationCommands({
      cwd: fixture.codeRoot,
      commands: [],
      dryRun: true,
    });
    const after = await snapshotGitStatus(fixture.wikiRoot);

    assert.deepEqual(after, before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
