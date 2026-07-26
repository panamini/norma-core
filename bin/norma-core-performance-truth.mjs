import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ACTIVE_BENCHMARK_EXECUTION_BUDGET,
  PERFORMANCE_TRUTH_HARNESS_VERSION,
  PERFORMANCE_TRUTH_SCENARIOS,
} from "../dist/src/performance-truth-harness.js";
import { executePerformanceTruthScenario } from "../dist/src/performance-truth-runtime.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const modulePath = fileURLToPath(import.meta.url);

export const MAX_CHARACTERIZATION_ROWS = ACTIVE_BENCHMARK_EXECUTION_BUDGET.remainingAfterPr257;

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

function validateScenarioRows(plan) {
  if (!Array.isArray(plan) || plan.length === 0) {
    throw new Error("The explicit scenario-row plan must contain at least one row");
  }
  if (plan.some((scenario) => typeof scenario !== "string" || scenario === "")) {
    throw new Error("The --plan value must not contain empty scenario rows");
  }
  if (plan.length > MAX_CHARACTERIZATION_ROWS) {
    throw new Error(`The explicit scenario-row plan exceeds the ${MAX_CHARACTERIZATION_ROWS}-row cap`);
  }
  for (const scenario of plan) {
    if (!PERFORMANCE_TRUTH_SCENARIOS.includes(scenario)) {
      throw new Error(`Unknown performance truth scenario: ${scenario}`);
    }
  }
  return Object.freeze(plan);
}

export async function runProviderFreeCharacterization(plan, options = {}) {
  const explicitPlan = validateScenarioRows(plan);
  const rows = [];
  const commitSha = options.commitSha ?? currentCommitSha(options.repoRoot ?? repoRoot);
  const root = options.repoRoot ?? repoRoot;
  const clockFactory = options.clockFactory ?? (() => realClock());
  const executeScenario = options.executeScenario ?? executePerformanceTruthScenario;

  for (const [index, scenario] of explicitPlan.entries()) {
    rows.push(await executeScenario({
      scenario,
      runNumber: index + 1,
      commitSha,
      repoRoot: root,
      clock: clockFactory(index + 1),
    }));
  }

  return summarizeCharacterization({ plan: explicitPlan, rows, commitSha });
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const plan = parseScenarioRowPlan(argv);
  const characterize = dependencies.characterize ?? runProviderFreeCharacterization;
  const write = dependencies.write ?? ((value) => process.stdout.write(value));
  const summary = await characterize(plan, dependencies.options);
  write(`${JSON.stringify(summary)}\n`);
  return summary;
}

function summarizeCharacterization({ plan, rows, commitSha }) {
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
    commit_sha: commitSha,
    harness_version: PERFORMANCE_TRUTH_HARNESS_VERSION,
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
