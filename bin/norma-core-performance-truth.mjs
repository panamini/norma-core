import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const modulePath = fileURLToPath(import.meta.url);

export const MAX_CHARACTERIZATION_ROWS = 10;

export function parseScenarioRowPlan(argv) {
  if (!Array.isArray(argv) || argv.length !== 2 || argv[0] !== "--plan") {
    throw new Error("An explicit --plan scenario,row list is required");
  }

  const rawPlan = argv[1];
  if (typeof rawPlan !== "string" || rawPlan.trim() === "") {
    throw new Error("The --plan value must contain at least one scenario row");
  }

  return validateScenarioRows(rawPlan.split(",").map((scenario) => scenario.trim()));
}

function validateScenarioRows(plan, scenarios) {
  if (!Array.isArray(plan) || plan.length === 0) {
    throw new Error("The explicit scenario-row plan must contain at least one row");
  }
  if (plan.some((scenario) => typeof scenario !== "string" || scenario === "")) {
    throw new Error("The --plan value must not contain empty scenario rows");
  }
  if (plan.length > MAX_CHARACTERIZATION_ROWS) {
    throw new Error(
      `The explicit scenario-row plan exceeds the ${MAX_CHARACTERIZATION_ROWS}-row cap per invocation`,
    );
  }
  if (scenarios !== undefined) {
    for (const scenario of plan) {
      if (!scenarios.includes(scenario)) {
        throw new Error(`Unknown performance truth scenario: ${scenario}`);
      }
    }
  }
  return Object.freeze([...plan]);
}

export async function runProviderFreeCharacterization(plan, options = {}) {
  const parsedPlan = validateScenarioRows(plan);
  const prepareRuntime = options.prepareRuntime ?? preparePerformanceTruthRuntime;
  const prepared = await prepareRuntime(repoRoot);
  const explicitPlan = validateScenarioRows(parsedPlan, prepared.scenarios);
  const rows = [];
  const clockFactory = options.clockFactory ?? (() => realClock());

  for (const [index, scenario] of explicitPlan.entries()) {
    rows.push(await prepared.executeScenario({
      scenario,
      runNumber: index + 1,
      commitSha: prepared.commitSha,
      repoRoot,
      clock: clockFactory(index + 1),
    }));
  }

  return summarizeCharacterization({
    plan: explicitPlan,
    rows,
    commitSha: prepared.commitSha,
    harnessVersion: prepared.harnessVersion,
  });
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const plan = parseScenarioRowPlan(argv);
  const characterize = dependencies.characterize ?? runProviderFreeCharacterization;
  const write = dependencies.write ?? ((value) => process.stdout.write(value));
  const summary = await characterize(plan, dependencies.options);
  write(`${JSON.stringify(summary)}\n`);
  return summary;
}

function summarizeCharacterization({ plan, rows, commitSha, harnessVersion }) {
  const summaries = new Map();
  for (const scenario of plan) {
    if (!summaries.has(scenario)) summaries.set(scenario, []);
  }
  for (const row of rows) summaries.get(row.scenario).push(row);

  return Object.freeze({
    schema_version: "norma.performance-truth-characterization@1",
    evidence_kind: "bounded-descriptive-characterization",
    interpretation: "Descriptive only; not a percentile or SLO evaluation.",
    provider_free: true,
    row_budget: Object.freeze({
      scope: "single-invocation-plan",
      limit: MAX_CHARACTERIZATION_ROWS,
      additional_invocations_require_external_authorization: true,
    }),
    commit_sha: commitSha,
    harness_version: harnessVersion,
    requested_row_count: plan.length,
    completed_row_count: rows.length,
    scenarios: Object.freeze([...summaries.entries()].map(([scenario, scenarioRows]) => Object.freeze({
      scenario,
      row_count: scenarioRows.length,
      status_counts: countValues(scenarioRows.map((row) => row.status)),
      result_identity_count: new Set(scenarioRows.map((row) => row.result_identity)).size,
      timing_ranges_ms: timingRanges(scenarioRows),
      unmeasured_stages: unmeasuredStages(scenarioRows),
    }))),
  });
}

function timingRanges(rows) {
  const ranges = {};
  for (const key of [
    "request_parse_ms",
    "auth_verify_ms",
    "admission_ms",
    "mcp_dispatch_ms",
    "core_ms",
    "artifact_ms",
    "serialization_ms",
    "request_total_ms",
    "transport_ms",
    "widget_boot_ms",
    "widget_first_useful_paint_ms",
  ]) {
    const values = rows.map((row) => row[key]).filter((value) => value !== null);
    if (values.length > 0) ranges[key] = Object.freeze({ min: Math.min(...values), max: Math.max(...values) });
  }
  return Object.freeze(ranges);
}

function unmeasuredStages(rows) {
  return Object.freeze([
    "request_parse_ms",
    "auth_verify_ms",
    "admission_ms",
    "mcp_dispatch_ms",
    "core_ms",
    "artifact_ms",
    "serialization_ms",
    "transport_ms",
    "widget_boot_ms",
    "widget_first_useful_paint_ms",
  ].filter((key) => rows.every((row) => row[key] === null)));
}

function countValues(values) {
  return Object.freeze(values.reduce((counts, value) => ({
    ...counts,
    [value]: (counts[value] ?? 0) + 1,
  }), {}));
}

function currentCommitSha(root) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

async function preparePerformanceTruthRuntime(root) {
  assertCleanWorktree(root);
  const commitSha = currentCommitSha(root);
  execFileSync("npm", ["run", "build"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assertCleanWorktree(root);
  if (currentCommitSha(root) !== commitSha) {
    throw new Error("Repository HEAD changed while preparing the performance truth runtime");
  }

  const cacheKey = encodeURIComponent(commitSha);
  const [harness, runtime] = await Promise.all([
    import(`../dist/src/performance-truth-harness.js?commit=${cacheKey}`),
    import(`../dist/src/performance-truth-runtime.js?commit=${cacheKey}`),
  ]);
  if (harness.ACTIVE_BENCHMARK_EXECUTION_BUDGET.remainingAfterPr257 !== MAX_CHARACTERIZATION_ROWS) {
    throw new Error("The performance truth runner row cap does not match the active harness contract");
  }

  return Object.freeze({
    commitSha,
    harnessVersion: harness.PERFORMANCE_TRUTH_HARNESS_VERSION,
    scenarios: harness.PERFORMANCE_TRUTH_SCENARIOS,
    executeScenario: runtime.executePerformanceTruthScenario,
  });
}

function assertCleanWorktree(root) {
  const status = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  if (status !== "") {
    throw new Error("Performance truth characterization requires a clean exact-HEAD worktree");
  }
}

function realClock() {
  return {
    monotonicNow: () => performance.now(),
    utcNow: () => new Date().toISOString(),
  };
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === modulePath) {
  main().catch((error) => {
    process.stderr.write(`Performance truth characterization failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
