export const SCALEKIT_PROVIDER = "scalekit";
export const AUTH0_PROVIDER = "auth0";
export const SCALEKIT_SCOPE = "norma:structured_analyze";
export const AUTH0_SCOPE = "norma:structured-analyze";
export const NORMA_CANONICAL_SCOPE = "norma:structured-analyze";

export const SANDBOX_QUALIFICATION_CRITERIA = Object.freeze([
  { id: "discovery", title: "Protected-resource and authorization-server discovery" },
  { id: "client_onboarding", title: "DCR, CIMD, or pre-registration recording" },
  { id: "pkce_s256", title: "PKCE S256" },
  { id: "resource_audience", title: "Exact resource to audience" },
  { id: "scope_mapping", title: "Scalekit scope to canonical Norma scope mapping" },
  { id: "token_verification", title: "JWKS, issuer, audience, expiry, subject, and tenant verification" },
  { id: "consent_refresh_revocation", title: "Consent, refresh, and revocation" },
  { id: "railway_postgresql_rls", title: "Railway to PostgreSQL/RLS tenant boundary" },
  { id: "isolation_rollback_cleanup", title: "Pool reset, rollback isolation, token-free logs, and cleanup" },
]);

export class SandboxQualificationInputError extends Error {
  constructor() {
    super("Sandbox qualification input rejected");
    this.name = "SandboxQualificationInputError";
  }
}

export function parseSandboxQualificationEvidence(value) {
  if (!isRecord(value) || !isProvider(value.provider) || !Array.isArray(value.records)) {
    throw new SandboxQualificationInputError();
  }
  const keys = Object.keys(value).sort();
  if (keys.some((key) => key !== "approval" && key !== "provider" && key !== "records")) {
    throw new SandboxQualificationInputError();
  }
  const records = parseEvidenceRecords(value.records);
  const approval = Object.hasOwn(value, "approval") ? parseApproval(value.approval) : undefined;
  return Object.freeze({
    provider: value.provider,
    records: Object.freeze(records),
    ...(approval === undefined ? {} : { approval }),
  });
}

export function runSandboxQualification(options = {}) {
  const provider = options.provider ?? SCALEKIT_PROVIDER;
  const mode = options.mode ?? "dry-run";
  if (!isProvider(provider)) {
    throw new SandboxQualificationInputError();
  }
  if (mode !== "dry-run" && mode !== "evidence") {
    throw new SandboxQualificationInputError();
  }
  if (provider === AUTH0_PROVIDER && options.fallbackFromScalekit !== true) {
    throw new SandboxQualificationInputError();
  }
  if (mode === "dry-run") {
    if (options.evidence !== undefined
      && (!Array.isArray(options.evidence) || options.evidence.length > 0)) {
      throw new SandboxQualificationInputError();
    }
    if (options.evidenceProvider !== undefined || options.approval !== undefined) {
      throw new SandboxQualificationInputError();
    }
  }
  if (mode === "evidence" && (!Array.isArray(options.evidence)
    || !isProvider(options.evidenceProvider)
    || options.evidenceProvider !== provider)) {
    throw new SandboxQualificationInputError();
  }
  const evidence = options.evidence === undefined
    ? []
    : parseEvidenceRecords(options.evidence);
  const approval = options.approval === undefined ? undefined : parseApproval(options.approval);
  const evidenceByCriterion = new Map(evidence.map((record) => [record.criterion, record]));
  const criteria = SANDBOX_QUALIFICATION_CRITERIA.map(({ id, title }) => {
    const record = evidenceByCriterion.get(id);
    return Object.freeze({
      id,
      title,
      status: record === undefined
        ? "NOT_RUN"
        : record.status === "FAIL"
          ? "FAIL"
          : record.evidenceClass === "live"
            ? "PASS"
            : "UNVERIFIED",
      evidenceClass: record?.evidenceClass ?? "none",
      evidenceRef: record?.evidenceRef ?? null,
    });
  });
  const productionReadiness = criteria.every(({ status }) => status === "PASS")
    && approval?.approved === true
    ? "OPEN"
    : "CLOSED";
  return Object.freeze({
    provider,
    mode,
    providerOrder: Object.freeze([SCALEKIT_PROVIDER, ...(provider === AUTH0_PROVIDER ? [AUTH0_PROVIDER] : [])]),
    scopeMapping: Object.freeze({
      providerScope: provider === AUTH0_PROVIDER ? AUTH0_SCOPE : SCALEKIT_SCOPE,
      normaScope: NORMA_CANONICAL_SCOPE,
    }),
    approvalRecorded: approval?.approved === true,
    criteria: Object.freeze(criteria),
    productionReadiness,
    nextAction: productionReadiness === "OPEN"
      ? "REVIEW_ALL_CRITERIA_AND_APPROVE"
      : "COLLECT_BOUNDED_LIVE_EVIDENCE",
  });
}

function parseEvidenceRecords(records) {
  const parsed = records.map(parseEvidenceRecord);
  const ids = parsed.map((record) => record.criterion);
  if (new Set(ids).size !== ids.length) {
    throw new SandboxQualificationInputError();
  }
  return parsed;
}

function parseEvidenceRecord(value) {
  if (!isRecord(value) || hasSensitiveKey(value)) {
    throw new SandboxQualificationInputError();
  }
  const keys = Object.keys(value).sort();
  const expectedKeys = ["criterion", "evidenceClass", "evidenceRef", "observedAt", "status"];
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new SandboxQualificationInputError();
  }
  if (!isCriterionId(value.criterion)
    || (value.status !== "PASS" && value.status !== "FAIL")
    || (value.evidenceClass !== "live" && value.evidenceClass !== "offline" && value.evidenceClass !== "historical")
    || !isSafeEvidenceRef(value.evidenceRef)
    || !isIsoTimestamp(value.observedAt)) {
    throw new SandboxQualificationInputError();
  }
  return Object.freeze({
    criterion: value.criterion,
    status: value.status,
    evidenceClass: value.evidenceClass,
    evidenceRef: value.evidenceRef,
    observedAt: value.observedAt,
  });
}

function parseApproval(value) {
  if (!isRecord(value) || hasSensitiveKey(value)) {
    throw new SandboxQualificationInputError();
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== 3
    || !keys.includes("approved")
    || !keys.includes("approvalRef")
    || !keys.includes("approvedAt")
    || typeof value.approved !== "boolean"
    || !isSafeEvidenceRef(value.approvalRef)
    || !isIsoTimestamp(value.approvedAt)) {
    throw new SandboxQualificationInputError();
  }
  return Object.freeze({
    approved: value.approved,
    approvalRef: value.approvalRef,
    approvedAt: value.approvedAt,
  });
}

function hasSensitiveKey(value) {
  return Object.keys(value).some((key) => /token|secret|claim|email|prompt|database|password|authorization|cookie|jwt|access|refresh|id_token|raw|body|payload/iu.test(key));
}

function isCriterionId(value) {
  return typeof value === "string"
    && SANDBOX_QUALIFICATION_CRITERIA.some(({ id }) => id === value);
}

function isProvider(value) {
  return value === SCALEKIT_PROVIDER || value === AUTH0_PROVIDER;
}

function isSafeEvidenceRef(value) {
  return typeof value === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,95}$/u.test(value)
    && !/bearer|token|secret|jwt|password|prompt|claim/iu.test(value);
}

function isIsoTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)) {
    return false;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().replace(".000Z", "Z") === value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
