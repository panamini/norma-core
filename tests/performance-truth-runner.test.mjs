import assert from "node:assert/strict";
import test from "node:test";

import {
  main,
  MAX_CHARACTERIZATION_ROWS,
  parseScenarioRowPlan,
  runProviderFreeCharacterization,
} from "../bin/norma-core-performance-truth.mjs";

const commitSha = "93096299523d3ad376f7650b32fa4a5d3a98389b";

test("performance truth runner rejects a missing or oversized plan before characterization", async () => {
  let invoked = false;
  await assert.rejects(
    () => main([], { characterize: async () => { invoked = true; } }),
    /explicit --plan/u,
  );
  assert.equal(invoked, false);
  assert.throws(
    () => parseScenarioRowPlan(["--plan", Array.from({ length: MAX_CHARACTERIZATION_ROWS + 1 }, () => "core-direct-simple").join(",")]),
    /row cap/u,
  );
});

test("performance truth runner rejects unknown and empty scenario rows", () => {
  assert.throws(() => parseScenarioRowPlan(["--plan", "unknown"]), /Unknown performance truth scenario/u);
  assert.throws(() => parseScenarioRowPlan(["--plan", "core-direct-simple,"]), /empty scenario rows/u);
});

test("performance truth runner rejects programmatic plans that bypass the CLI parser", async () => {
  await assert.rejects(
    () => runProviderFreeCharacterization([], { commitSha }),
    /at least one row/u,
  );
  await assert.rejects(
    () => runProviderFreeCharacterization(Array.from({ length: MAX_CHARACTERIZATION_ROWS + 1 }, () => "core-direct-simple"), { commitSha }),
    /row cap/u,
  );
});

test("performance truth runner creates one deterministic provider-free row per explicit scenario", async () => {
  const plan = parseScenarioRowPlan([
    "--plan",
    "core-direct-simple,core-direct-boundary,mcp-stdio-simple",
  ]);
  assert.deepEqual(
    parseScenarioRowPlan(["--plan", "mcp-streamable-http-authenticated-simple"]),
    ["mcp-streamable-http-authenticated-simple"],
  );
  const summary = await runProviderFreeCharacterization(plan, {
    commitSha,
    clockFactory: () => deterministicClock(),
  });

  assert.equal(summary.requested_row_count, 3);
  assert.equal(summary.completed_row_count, 3);
  assert.equal(summary.evidence_kind, "bounded-descriptive-characterization");
  assert.match(summary.interpretation, /not a percentile or SLO evaluation/u);
  assert.equal(summary.scenarios.length, 3);
  assert.deepEqual(summary.scenarios.map((scenario) => scenario.row_count), [1, 1, 1]);
  assert.equal(summary.scenarios.every((scenario) => scenario.status_counts.pass === 1), true);
  assert.equal(JSON.stringify(summary).includes("local-characterization-access"), false);
  assert.equal(JSON.stringify(summary).includes("p50"), false);
  assert.equal(JSON.stringify(summary).includes("p95"), false);
  assert.equal(JSON.stringify(summary).includes("ledger_rows"), false);
});

test("performance truth runner delegates exactly once for every explicit row", async () => {
  const plan = parseScenarioRowPlan([
    "--plan",
    "core-direct-simple,core-direct-boundary,mcp-stdio-simple,mcp-streamable-http-authenticated-simple",
  ]);
  const calls = [];
  const summary = await runProviderFreeCharacterization(plan, {
    commitSha,
    executeScenario: async ({ scenario, runNumber }) => {
      calls.push({ scenario, runNumber });
      return deterministicRow({ scenario, runNumber });
    },
  });

  assert.deepEqual(calls.map((call) => call.runNumber), [1, 2, 3, 4]);
  assert.deepEqual(calls.map((call) => call.scenario), plan);
  assert.equal(summary.completed_row_count, 4);
});

test("performance truth runtime preserves the local authenticated scenario", async () => {
  const summary = await runProviderFreeCharacterization(
    ["mcp-streamable-http-authenticated-simple"],
    { commitSha, clockFactory: () => deterministicClock() },
  );

  assert.equal(summary.completed_row_count, 1);
  assert.deepEqual(summary.scenarios[0].status_counts, { pass: 1 });
  assert.equal(summary.scenarios[0].timing_ranges_ms.transport_ms.min >= 0, true);
  assert.equal(JSON.stringify(summary).includes("local-characterization-access"), false);
});

test("performance truth runner emits only the sanitized summary", async () => {
  const output = [];
  const summary = await main(["--plan", "core-direct-simple"], {
    characterize: async () => ({ summary: "sanitized" }),
    write: (value) => output.push(value),
  });
  assert.deepEqual(summary, { summary: "sanitized" });
  assert.deepEqual(output, ["{\"summary\":\"sanitized\"}\n"]);
});

function deterministicClock() {
  let next = 1_000;
  return {
    monotonicNow() {
      const value = next;
      next += 1;
      return value;
    },
    utcNow() {
      return "2026-07-26T00:00:00.000Z";
    },
  };
}

function deterministicRow({ scenario, runNumber }) {
  return {
    run_number: runNumber,
    scenario,
    phase: "provider-free-characterization",
    commit_sha: commitSha,
    started_at_utc: "2026-07-26T00:00:00.000Z",
    request_parse_ms: null,
    auth_verify_ms: null,
    auth_ms: null,
    admission_ms: null,
    mcp_dispatch_ms: null,
    core_ms: null,
    artifact_ms: null,
    serialization_ms: 1,
    request_total_ms: 1,
    transport_ms: null,
    widget_boot_ms: null,
    widget_first_useful_paint_ms: null,
    end_to_end_ms: 1,
    result_identity: "sha256:" + "0".repeat(64),
    status: "pass",
    notes: "provider-free deterministic fixture inspection",
  };
}
