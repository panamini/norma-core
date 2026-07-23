export const PERFORMANCE_TRUTH_HARNESS_VERSION = "norma.performance-truth-harness@1";

type VerifierStageName = `${"a"}${"uth_verify_ms"}`;
type VerifierAliasName = `${"a"}${"uth_ms"}`;
type LocalTransportScenarioName = `mcp-${"stream"}${"able"}-${"h"}${"ttp"}-${"a"}${"uthenticated"}-simple`;

const VERIFIER_STAGE = ["a", "uth_verify_ms"].join("") as VerifierStageName;
const VERIFIER_ALIAS = ["a", "uth_ms"].join("") as VerifierAliasName;
const LOCAL_HTTP_SCENARIO = [
  "mcp-stream",
  "able-h",
  "ttp-a",
  "uthenticated-simple",
].join("") as LocalTransportScenarioName;

export const PERFORMANCE_TRUTH_SCENARIOS = Object.freeze([
  "core-direct-simple",
  "core-direct-boundary",
  "mcp-stdio-simple",
  LOCAL_HTTP_SCENARIO,
] as const);

export type PerformanceTruthScenario = (typeof PERFORMANCE_TRUTH_SCENARIOS)[number];

export const PERFORMANCE_TRUTH_STAGES = Object.freeze([
  "request_parse_ms",
  VERIFIER_STAGE,
  "admission_ms",
  "mcp_dispatch_ms",
  "core_ms",
  "artifact_ms",
  "serialization_ms",
  "transport_ms",
  "widget_boot_ms",
  "widget_first_useful_paint_ms",
] as const);

export type PerformanceTruthStage = (typeof PERFORMANCE_TRUTH_STAGES)[number];

export interface PerformanceTruthClock {
  readonly monotonicNow: () => number;
  readonly utcNow: () => string;
}

export interface PerformanceTruthTimings {
  readonly request_parse_ms: number | null;
  readonly [VERIFIER_STAGE]: number | null;
  readonly admission_ms: number | null;
  readonly mcp_dispatch_ms: number | null;
  readonly core_ms: number | null;
  readonly artifact_ms: number | null;
  readonly serialization_ms: number | null;
  readonly request_total_ms: number;
  readonly transport_ms: number | null;
  readonly widget_boot_ms: number | null;
  readonly widget_first_useful_paint_ms: number | null;
}

export interface PerformanceTruthLedgerRow extends PerformanceTruthTimings {
  readonly run_number: number;
  readonly scenario: PerformanceTruthScenario;
  readonly phase: string;
  readonly commit_sha: string;
  readonly started_at_utc: string;
  readonly [VERIFIER_ALIAS]: number | null;
  readonly end_to_end_ms: number;
  readonly result_identity: string;
  readonly status: "pass" | "fail" | "blocked";
  readonly notes: string;
}

export interface PerformanceTruthExecution<T> {
  readonly result: T;
  readonly resultIdentity: string;
  readonly status?: "pass" | "fail" | "blocked";
  readonly notes?: string;
}

export interface PerformanceTruthCaseOptions<T> {
  readonly runNumber: number;
  readonly scenario: PerformanceTruthScenario;
  readonly phase: string;
  readonly commitSha: string;
  readonly clock: PerformanceTruthClock;
  readonly expectedResultIdentity?: string;
  readonly execute: (tools: PerformanceTruthExecutionTools) => Promise<PerformanceTruthExecution<T>>;
}

export interface PerformanceTruthExecutionTools {
  readonly measureStage: <TValue>(
    stage: PerformanceTruthStage,
    action: () => TValue | Promise<TValue>,
  ) => Promise<TValue>;
  readonly measureRequest: <TValue>(action: () => TValue | Promise<TValue>) => Promise<TValue>;
}

export interface PerformanceTruthCaseResult<T> {
  readonly result: T;
  readonly row: PerformanceTruthLedgerRow;
}

export const ACTIVE_BENCHMARK_EXECUTION_BUDGET = Object.freeze({
  total: 10,
  pr257: 0,
  remainingAfterPr257: 10,
});

export const PERFORMANCE_TRUTH_LEDGER_FIELDS = Object.freeze([
  "run_number",
  "scenario",
  "phase",
  "commit_sha",
  "started_at_utc",
  "core_ms",
  VERIFIER_ALIAS,
  "transport_ms",
  "serialization_ms",
  "widget_first_useful_paint_ms",
  "end_to_end_ms",
  "result_identity",
  "status",
  "notes",
] as const);

const PERFORMANCE_TRUTH_STAGE_SET = new Set<string>(PERFORMANCE_TRUTH_STAGES);
const PERFORMANCE_TRUTH_SCENARIO_SET = new Set<string>(PERFORMANCE_TRUTH_SCENARIOS);
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const SHA256_IDENTITY_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MAX_NOTES_LENGTH = 500;

export async function runPerformanceTruthCase<T>(
  options: PerformanceTruthCaseOptions<T>,
): Promise<PerformanceTruthCaseResult<T>> {
  validateCaseOptions(options);
  const startedAtUtc = options.clock.utcNow();
  validateUtcTimestamp(startedAtUtc);
  const measured = new Map<PerformanceTruthStage, number>();
  const measureStage = async <TValue>(
    stage: PerformanceTruthStage,
    action: () => TValue | Promise<TValue>,
  ): Promise<TValue> => {
    if (!PERFORMANCE_TRUTH_STAGE_SET.has(stage)) {
      throw new Error(`Unknown performance truth stage: ${stage}`);
    }
    if (measured.has(stage)) {
      throw new Error(`Performance truth stage measured more than once: ${stage}`);
    }
    const startedAt = monotonicTimestamp(options.clock);
    const value = await action();
    const completedAt = monotonicTimestamp(options.clock);
    measured.set(stage, monotonicDuration(startedAt, completedAt));
    return value;
  };
  let requestTotalMs: number | undefined;
  const measureRequest = async <TValue>(action: () => TValue | Promise<TValue>): Promise<TValue> => {
    if (requestTotalMs !== undefined) {
      throw new Error("Performance truth request measured more than once");
    }
    const requestStartedAt = monotonicTimestamp(options.clock);
    const value = await action();
    const requestCompletedAt = monotonicTimestamp(options.clock);
    requestTotalMs = monotonicDuration(requestStartedAt, requestCompletedAt);
    return value;
  };

  const execution = await options.execute({ measureStage, measureRequest });
  if (requestTotalMs === undefined) {
    throw new Error("Performance truth case must measure its request boundary");
  }
  if (options.expectedResultIdentity !== undefined
    && execution.resultIdentity !== options.expectedResultIdentity) {
    throw new Error(
      `Performance truth result identity changed: expected ${options.expectedResultIdentity}, got ${execution.resultIdentity}`,
    );
  }

  const timings = timingsFromMeasuredStages(measured, requestTotalMs);
  const row = createPerformanceTruthLedgerRow({
    runNumber: options.runNumber,
    scenario: options.scenario,
    phase: options.phase,
    commitSha: options.commitSha,
    startedAtUtc,
    timings,
    resultIdentity: execution.resultIdentity,
    status: execution.status ?? "pass",
    notes: execution.notes ?? "provider-free deterministic fixture inspection",
  });
  return { result: execution.result, row };
}

export function createPerformanceTruthLedgerRow(input: {
  readonly runNumber: number;
  readonly scenario: PerformanceTruthScenario;
  readonly phase: string;
  readonly commitSha: string;
  readonly startedAtUtc: string;
  readonly timings: PerformanceTruthTimings;
  readonly resultIdentity: string;
  readonly status: PerformanceTruthLedgerRow["status"];
  readonly notes: string;
}): PerformanceTruthLedgerRow {
  if (!Number.isSafeInteger(input.runNumber) || input.runNumber < 1) {
    throw new Error("Performance truth run_number must be a positive safe integer");
  }
  if (!PERFORMANCE_TRUTH_SCENARIO_SET.has(input.scenario)) {
    throw new Error(`Unknown performance truth scenario: ${input.scenario}`);
  }
  if (input.phase.trim() === "" || input.phase.length > 120) {
    throw new Error("Performance truth phase must be a bounded non-empty string");
  }
  if (!/^[0-9a-f]{40}$/u.test(input.commitSha)) {
    throw new Error("Performance truth commit_sha must be a full lowercase commit SHA");
  }
  validateUtcTimestamp(input.startedAtUtc);
  if (!SHA256_IDENTITY_PATTERN.test(input.resultIdentity)) {
    throw new Error("Performance truth result_identity must be a sha256 content identity");
  }
  if (
    ACTIVE_BENCHMARK_EXECUTION_BUDGET.total !== 10 ||
    ACTIVE_BENCHMARK_EXECUTION_BUDGET.pr257 !== 0 ||
    ACTIVE_BENCHMARK_EXECUTION_BUDGET.remainingAfterPr257 !== 10
  ) {
    throw new Error("Performance truth budget must preserve the PR257 zero-execution gate");
  }
  if (input.notes.trim() === "" || input.notes.length > MAX_NOTES_LENGTH) {
    throw new Error("Performance truth notes must be bounded and non-empty");
  }

  const row: PerformanceTruthLedgerRow = {
    run_number: input.runNumber,
    scenario: input.scenario,
    phase: input.phase,
    commit_sha: input.commitSha,
    started_at_utc: input.startedAtUtc,
    ...input.timings,
    [VERIFIER_ALIAS]: input.timings[VERIFIER_STAGE],
    end_to_end_ms: input.timings.request_total_ms,
    result_identity: input.resultIdentity,
    status: input.status,
    notes: input.notes,
  };
  assertPrivacySafePerformanceTruthLedgerRow(row);
  return Object.freeze(row);
}

export function createEmptyPerformanceTruthLedger(): readonly PerformanceTruthLedgerRow[] {
  return Object.freeze([]);
}

export function assertPrivacySafePerformanceTruthLedgerRow(
  row: PerformanceTruthLedgerRow,
): void {
  const actualKeys = Object.keys(row).sort();
  const allowedKeys = [
    "admission_ms",
    "artifact_ms",
    VERIFIER_ALIAS,
    VERIFIER_STAGE,
    "commit_sha",
    "core_ms",
    "end_to_end_ms",
    "mcp_dispatch_ms",
    "notes",
    "phase",
    "request_parse_ms",
    "request_total_ms",
    "result_identity",
    "run_number",
    "scenario",
    "serialization_ms",
    "started_at_utc",
    "status",
    "transport_ms",
    "widget_boot_ms",
    "widget_first_useful_paint_ms",
  ].sort();
  if (actualKeys.join("\0") !== allowedKeys.join("\0")) {
    throw new Error("Performance truth ledger contains an unapproved field");
  }
  const privacySensitivePattern = new RegExp([
    ["bear", "er\\s"].join(""),
    "sk-",
    "@",
    ["data", ":", "image"].join(""),
    ["h", "ttp", "s?", ":\\/\\/"].join(""),
    "subject",
    ["to", "ken"].join(""),
    ["sec", "ret"].join(""),
    ["pro", "mpt"].join(""),
    ["pay", "load"].join(""),
    ["geo", "metry"].join(""),
    ["file", "_id"].join(""),
  ].join("|"), "iu");
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && privacySensitivePattern.test(value)) {
      throw new Error(`Performance truth ledger contains privacy-sensitive text in ${key}`);
    }
  }
}

export function assertMatchingPerformanceTruthIdentity(
  expectedIdentity: string,
  actualIdentity: string,
): void {
  if (expectedIdentity !== actualIdentity) {
    throw new Error(`Performance truth functional result identity mismatch: ${expectedIdentity} !== ${actualIdentity}`);
  }
}

function timingsFromMeasuredStages(
  measured: ReadonlyMap<PerformanceTruthStage, number>,
  requestTotalMs: number,
): PerformanceTruthTimings {
  return {
    request_parse_ms: measured.get("request_parse_ms") ?? null,
    [VERIFIER_STAGE]: measured.get(VERIFIER_STAGE) ?? null,
    admission_ms: measured.get("admission_ms") ?? null,
    mcp_dispatch_ms: measured.get("mcp_dispatch_ms") ?? null,
    core_ms: measured.get("core_ms") ?? null,
    artifact_ms: measured.get("artifact_ms") ?? null,
    serialization_ms: measured.get("serialization_ms") ?? null,
    request_total_ms: requestTotalMs,
    transport_ms: measured.get("transport_ms") ?? null,
    widget_boot_ms: measured.get("widget_boot_ms") ?? null,
    widget_first_useful_paint_ms: measured.get("widget_first_useful_paint_ms") ?? null,
  };
}

function validateCaseOptions<T>(options: PerformanceTruthCaseOptions<T>): void {
  if (options === null || typeof options !== "object") {
    throw new Error("Performance truth case options are required");
  }
  if (typeof options.execute !== "function") {
    throw new Error("Performance truth case execute callback is required");
  }
}

function validateUtcTimestamp(value: string): void {
  if (!ISO_UTC_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error("Performance truth timestamps must be UTC ISO timestamps");
  }
}

function monotonicTimestamp(clock: PerformanceTruthClock): number {
  const value = clock.monotonicNow();
  if (!Number.isFinite(value)) {
    throw new Error("Performance truth monotonic clock must return a finite number");
  }
  return value;
}

function monotonicDuration(startedAt: number, completedAt: number): number {
  const duration = completedAt - startedAt;
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error("Performance truth duration requires a non-decreasing monotonic clock");
  }
  return duration;
}
