import { CORE_VERSION } from "../core-constants.js";
import { verifyArtifactFreshness } from "../artifact-freshness.js";
import { createMvpDemoInput, runMvpDemo } from "../mvp-demo.js";
import { replayRun } from "../run-replay.js";
import { verifyRun } from "../run-verification.js";
import { serializeCanonicalJson, STABLE_SERIALIZATION_VERSION } from "../serialization.js";
import {
  analyzeStructuredCompositionV1,
  STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
  STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
  STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
  STRUCTURED_COMPOSITION_ANALYSIS_RESULT_CONTRACT_VERSION,
} from "../structured-composition-analysis.js";
import type { StructuredCompositionAnalysisInputV1 } from "../structured-composition-analysis.js";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
export const MCP_SERVER_NAME = "norma-core-mcp-stdio-skeleton";
export const MCP_SERVER_VERSION = "0.1.0-pr12";
export const MCP_STDIO_MAX_REQUEST_BYTES = 524_288;
export const MCP_STDIO_MAX_JSON_DEPTH = 64;
export const MCP_STDIO_MAX_STRING_LENGTH = 65_536;

type JsonRpcId = string | number;

type JsonRpcErrorCode = -32700 | -32600 | -32601 | -32602 | -32603;

const requestEncoder = new TextEncoder();
const mcpProtocolDateStringPattern = /^\d{4}-\d{2}-\d{2}$/u;
const minimumCompatibleMcpProtocolDate = "2025-03-26";

interface McpToolDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema?: Readonly<Record<string, unknown>>;
  readonly annotations?: Readonly<Record<string, boolean>>;
}

const GET_VERSION_OUTPUT_SCHEMA = {
  type: "object",
  required: [
    "kind",
    "tool",
    "status",
    "coreVersion",
    "protocolVersion",
    "serverName",
    "serverVersion",
    "capabilities",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "norma-mcp-tool-result" },
    tool: { const: "norma.getVersion" },
    status: { const: "ok" },
    coreVersion: { type: "string" },
    protocolVersion: { type: "string" },
    serverName: { type: "string" },
    serverVersion: { type: "string" },
    capabilities: {
      type: "object",
      required: [
        "toolsList",
        "getVersion",
        "serializeCanonicalJson",
        "verifyRun",
        "verifyArtifactFreshness",
        "replayMvpDemo",
        "resources",
        "prompts",
        "remoteMcp",
      ],
      additionalProperties: false,
      properties: {
        toolsList: { const: true },
        getVersion: { const: true },
        serializeCanonicalJson: { const: true },
        verifyRun: { const: true },
        verifyArtifactFreshness: { const: true },
        replayMvpDemo: { const: true },
        resources: { const: false },
        prompts: { const: false },
        remoteMcp: { const: false },
      },
    },
  },
} as const;

const SERIALIZE_CANONICAL_JSON_OUTPUT_SCHEMA = {
  type: "object",
  required: [
    "kind",
    "tool",
    "status",
    "serializationVersion",
    "canonicalJson",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "norma-mcp-tool-result" },
    tool: { const: "norma.serializeCanonicalJson" },
    status: { const: "ok" },
    serializationVersion: { type: "string" },
    canonicalJson: { type: "string" },
  },
} as const;

function createComplexToolOutputSchema(tool: string, resultKind: string): Readonly<Record<string, unknown>> {
  return {
    type: "object",
    required: ["kind", "tool", "status", "result"],
    additionalProperties: false,
    properties: {
      kind: { const: "norma-mcp-tool-result" },
      tool: { const: tool },
      status: { type: "string" },
      result: {
        type: "object",
        required: ["kind", "status"],
        additionalProperties: true,
        properties: {
          kind: { const: resultKind },
          status: { type: "string" },
        },
      },
    },
  };
}

const VERIFY_RUN_OUTPUT_SCHEMA = createComplexToolOutputSchema("norma.verifyRun", "run-verification");
const VERIFY_ARTIFACT_FRESHNESS_OUTPUT_SCHEMA = createComplexToolOutputSchema(
  "norma.verifyArtifactFreshness",
  "artifact-freshness-verification",
);
const REPLAY_MVP_DEMO_OUTPUT_SCHEMA = createComplexToolOutputSchema("norma.replayMvpDemo", "run-replay");

const JSON_STRING_SCHEMA = { type: "string" } as const;
const JSON_NUMBER_SCHEMA = { type: "number" } as const;
const JSON_BOOLEAN_SCHEMA = { type: "boolean" } as const;
const JSON_NULL_SCHEMA = { type: "null" } as const;
const JSON_STRING_ARRAY_SCHEMA = { type: "array", items: JSON_STRING_SCHEMA } as const;
const SOURCE_REFERENCE_SCHEMA = {
  type: "object",
  required: ["kind", "ref"],
  additionalProperties: false,
  properties: {
    kind: JSON_STRING_SCHEMA,
    ref: JSON_STRING_SCHEMA,
  },
} as const;
const SOURCE_REFERENCES_SCHEMA = { type: "array", items: SOURCE_REFERENCE_SCHEMA } as const;
const RUNTIME_REF_SCHEMA = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: JSON_STRING_SCHEMA,
  },
} as const;
const PROVENANCE_SCHEMA = {
  type: "object",
  required: ["operationName", "operationVersion", "inputRefs", "source"],
  additionalProperties: false,
  properties: {
    operationName: JSON_STRING_SCHEMA,
    operationVersion: JSON_STRING_SCHEMA,
    inputRefs: SOURCE_REFERENCES_SCHEMA,
    source: SOURCE_REFERENCE_SCHEMA,
  },
} as const;
const DIAGNOSTIC_SCHEMA = {
  type: "object",
  required: ["code", "severity", "message", "targetRef", "source", "blocking", "provenance"],
  additionalProperties: false,
  properties: {
    code: JSON_STRING_SCHEMA,
    severity: JSON_STRING_SCHEMA,
    message: JSON_STRING_SCHEMA,
    targetRef: { oneOf: [JSON_STRING_SCHEMA, JSON_NULL_SCHEMA] },
    source: SOURCE_REFERENCE_SCHEMA,
    blocking: JSON_BOOLEAN_SCHEMA,
    provenance: { oneOf: [PROVENANCE_SCHEMA, JSON_NULL_SCHEMA] },
  },
} as const;
const DIAGNOSTICS_SCHEMA = { type: "array", items: DIAGNOSTIC_SCHEMA } as const;
const COORDINATE_SYSTEM_SCHEMA = {
  type: "object",
  required: ["kind", "id", "origin", "xAxis", "yAxis", "dimensions", "coordinateScale"],
  additionalProperties: false,
  properties: {
    kind: { const: "coordinate-system" },
    id: JSON_STRING_SCHEMA,
    origin: { const: "bottom-left" },
    xAxis: { const: "right" },
    yAxis: { const: "up" },
    dimensions: { enum: [1, 2] },
    coordinateScale: { enum: ["normalized", "metric"] },
  },
} as const;
const METRIC_POLICY_SCHEMA = {
  type: "object",
  required: ["kind", "id", "quantity", "unit"],
  additionalProperties: false,
  properties: {
    kind: { const: "metric-policy" },
    id: JSON_STRING_SCHEMA,
    quantity: { const: "length" },
    unit: JSON_STRING_SCHEMA,
  },
} as const;
const TOLERANCE_POLICY_SCHEMA = {
  type: "object",
  required: ["kind", "id", "coordinateTolerance"],
  additionalProperties: false,
  properties: {
    kind: { const: "tolerance-policy" },
    id: JSON_STRING_SCHEMA,
    coordinateTolerance: JSON_NUMBER_SCHEMA,
    metricTolerance: JSON_NUMBER_SCHEMA,
  },
} as const;
const RECT_SCHEMA = {
  type: "object",
  required: ["kind", "x", "y", "width", "height"],
  additionalProperties: false,
  properties: {
    kind: { const: "rect" },
    x: JSON_NUMBER_SCHEMA,
    y: JSON_NUMBER_SCHEMA,
    width: JSON_NUMBER_SCHEMA,
    height: JSON_NUMBER_SCHEMA,
  },
} as const;
const POINT_SCHEMA = {
  type: "object",
  required: ["kind", "x"],
  additionalProperties: false,
  properties: {
    kind: { const: "point" },
    x: JSON_NUMBER_SCHEMA,
    y: JSON_NUMBER_SCHEMA,
  },
} as const;
const ANCHOR_SCHEMA = {
  type: "object",
  required: ["kind", "id", "point"],
  additionalProperties: false,
  properties: {
    kind: { const: "anchor" },
    id: JSON_STRING_SCHEMA,
    point: POINT_SCHEMA,
    targetElementId: JSON_STRING_SCHEMA,
  },
} as const;
const ANCHORS_SCHEMA = { type: "array", items: ANCHOR_SCHEMA } as const;
const ELEMENT_SCHEMA = {
  type: "object",
  required: ["kind", "id", "geometry"],
  additionalProperties: false,
  properties: {
    kind: { const: "element" },
    id: JSON_STRING_SCHEMA,
    geometry: RECT_SCHEMA,
    anchors: ANCHORS_SCHEMA,
  },
} as const;
const SURFACE_SCHEMA = {
  type: "object",
  required: ["kind", "id", "coordinateSystem", "bounds"],
  additionalProperties: false,
  properties: {
    kind: { const: "surface-space" },
    id: JSON_STRING_SCHEMA,
    coordinateSystem: COORDINATE_SYSTEM_SCHEMA,
    metricPolicy: { oneOf: [METRIC_POLICY_SCHEMA, JSON_NULL_SCHEMA] },
    tolerancePolicy: { oneOf: [TOLERANCE_POLICY_SCHEMA, JSON_NULL_SCHEMA] },
    bounds: RECT_SCHEMA,
  },
} as const;
const COMPOSITION_SCHEMA = {
  type: "object",
  required: ["kind", "id", "coordinateSystem", "surface", "elements"],
  additionalProperties: false,
  properties: {
    kind: { const: "composition-2d" },
    id: JSON_STRING_SCHEMA,
    coordinateSystem: COORDINATE_SYSTEM_SCHEMA,
    metricPolicy: { oneOf: [METRIC_POLICY_SCHEMA, JSON_NULL_SCHEMA] },
    tolerancePolicy: { oneOf: [TOLERANCE_POLICY_SCHEMA, JSON_NULL_SCHEMA] },
    surface: SURFACE_SCHEMA,
    elements: { type: "array", items: ELEMENT_SCHEMA },
    anchors: ANCHORS_SCHEMA,
  },
} as const;
const RATIO_PACK_SCHEMA = {
  type: "object",
  required: [
    "kind",
    "id",
    "version",
    "schemaVersion",
    "identity",
    "contentIdentity",
    "metadata",
    "provenance",
    "compatibility",
    "limits",
    "conventions",
    "ratios",
    "ratioFamilies",
    "ratioSequences",
    "partitionPatterns",
    "ruleDeclarations",
    "ruleSets",
    "preLock",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "ratio-pack" },
    id: JSON_STRING_SCHEMA,
    version: JSON_STRING_SCHEMA,
    schemaVersion: { const: "ratio-pack-v1" },
    identity: {
      type: "object",
      required: ["kind", "id", "concept"],
      additionalProperties: false,
      properties: {
        kind: { const: "ratio-pack-identity" },
        id: JSON_STRING_SCHEMA,
        concept: JSON_STRING_SCHEMA,
      },
    },
    contentIdentity: JSON_STRING_SCHEMA,
    metadata: {
      type: "object",
      required: ["name", "description", "owner"],
      additionalProperties: false,
      properties: {
        name: JSON_STRING_SCHEMA,
        description: JSON_STRING_SCHEMA,
        owner: JSON_STRING_SCHEMA,
      },
    },
    provenance: {
      type: "object",
      required: ["kind", "source", "sourceRefs"],
      additionalProperties: false,
      properties: {
        kind: { const: "ratio-pack-provenance" },
        source: JSON_STRING_SCHEMA,
        sourceRefs: SOURCE_REFERENCES_SCHEMA,
      },
    },
    compatibility: {
      type: "object",
      required: ["schemaVersion", "coreVersionRange"],
      additionalProperties: false,
      properties: {
        schemaVersion: { const: "ratio-pack-v1" },
        coreVersionRange: JSON_STRING_SCHEMA,
      },
    },
    limits: {
      type: "object",
      required: ["noBeautyClaims", "noIntentInference", "noUiPreset"],
      additionalProperties: false,
      properties: {
        noBeautyClaims: { const: true },
        noIntentInference: { const: true },
        noUiPreset: { const: true },
      },
    },
    conventions: JSON_STRING_ARRAY_SCHEMA,
    ratios: { type: "array", items: { type: "object", additionalProperties: {} } },
    ratioFamilies: { type: "array", items: { type: "object", additionalProperties: {} } },
    ratioSequences: { type: "array", items: { type: "object", additionalProperties: {} } },
    partitionPatterns: { type: "array", items: { type: "object", additionalProperties: {} } },
    ruleDeclarations: { type: "array", items: { type: "object", additionalProperties: {} } },
    ruleSets: { type: "array", items: { type: "object", additionalProperties: {} } },
    preLock: {
      type: "object",
      required: ["kind", "ref", "packId", "packVersion", "schemaVersion", "contentIdentity", "final"],
      additionalProperties: false,
      properties: {
        kind: { const: "pack-lock-prelock" },
        ref: JSON_STRING_SCHEMA,
        packId: JSON_STRING_SCHEMA,
        packVersion: JSON_STRING_SCHEMA,
        schemaVersion: { const: "ratio-pack-v1" },
        contentIdentity: JSON_STRING_SCHEMA,
        final: { const: false },
      },
    },
  },
} as const;
const PACK_LOCK_SCHEMA = {
  type: "object",
  required: [
    "kind",
    "id",
    "ref",
    "coreVersion",
    "packId",
    "packVersion",
    "packSchemaVersion",
    "contentIdentity",
    "sourceRefs",
    "provenance",
    "status",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "pack-lock" },
    id: JSON_STRING_SCHEMA,
    ref: RUNTIME_REF_SCHEMA,
    coreVersion: JSON_STRING_SCHEMA,
    packId: JSON_STRING_SCHEMA,
    packVersion: JSON_STRING_SCHEMA,
    packSchemaVersion: JSON_STRING_SCHEMA,
    contentIdentity: JSON_STRING_SCHEMA,
    sourceRefs: SOURCE_REFERENCES_SCHEMA,
    provenance: PROVENANCE_SCHEMA,
    status: { const: "effective_pr11" },
  },
} as const;
const RUNTIME_POLICY_SCHEMA = {
  type: "object",
  required: ["value", "explicit", "sourceRefs"],
  additionalProperties: false,
  properties: {
    value: { type: "object", additionalProperties: {} },
    explicit: JSON_BOOLEAN_SCHEMA,
    sourceRefs: SOURCE_REFERENCES_SCHEMA,
  },
} as const;
const OPERATION_CONTEXT_SCHEMA = {
  type: "object",
  required: [
    "kind",
    "id",
    "ref",
    "coreVersion",
    "operationName",
    "operationVersion",
    "geometryModelVersion",
    "coordinatePolicy",
    "metricPolicy",
    "tolerancePolicy",
    "roundingPolicy",
    "numericPolicy",
    "orderingPolicy",
    "featureFlags",
    "sourceRefs",
    "provenance",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "operation-context" },
    id: JSON_STRING_SCHEMA,
    ref: RUNTIME_REF_SCHEMA,
    coreVersion: JSON_STRING_SCHEMA,
    operationName: { const: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME },
    operationVersion: { const: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION },
    geometryModelVersion: JSON_STRING_SCHEMA,
    coordinatePolicy: RUNTIME_POLICY_SCHEMA,
    metricPolicy: RUNTIME_POLICY_SCHEMA,
    tolerancePolicy: RUNTIME_POLICY_SCHEMA,
    roundingPolicy: RUNTIME_POLICY_SCHEMA,
    numericPolicy: RUNTIME_POLICY_SCHEMA,
    orderingPolicy: RUNTIME_POLICY_SCHEMA,
    featureFlags: { type: "object", additionalProperties: { type: "boolean" } },
    sourceRefs: SOURCE_REFERENCES_SCHEMA,
    provenance: PROVENANCE_SCHEMA,
  },
} as const;
const EVALUATION_PROFILE_SCHEMA = {
  type: "object",
  required: ["kind", "id", "ref", "version", "allowMinimalScore", "components", "limits", "provenance"],
  additionalProperties: false,
  properties: {
    kind: { const: "evaluation-profile" },
    id: JSON_STRING_SCHEMA,
    ref: JSON_STRING_SCHEMA,
    version: JSON_STRING_SCHEMA,
    allowMinimalScore: JSON_BOOLEAN_SCHEMA,
    components: { type: "array", items: { type: "object", additionalProperties: {} } },
    limits: {
      type: "object",
      required: [
        "noBeautyScore",
        "noIntentInference",
        "noComparison",
        "noDecision",
        "noRecommendation",
        "noRatioDefinitions",
        "noRuleDefinitions",
        "noMeasurementDefinitions",
        "requiresExplicitTolerances",
      ],
      additionalProperties: false,
      properties: {
        noBeautyScore: { const: true },
        noIntentInference: { const: true },
        noComparison: { const: true },
        noDecision: { const: true },
        noRecommendation: { const: true },
        noRatioDefinitions: { const: true },
        noRuleDefinitions: { const: true },
        noMeasurementDefinitions: { const: true },
        requiresExplicitTolerances: { const: true },
      },
    },
    provenance: { type: "object", additionalProperties: {} },
  },
} as const;
const EVALUATION_TOLERANCES_SCHEMA = {
  type: "object",
  required: ["kind", "id", "guideProximity", "alignment", "containment", "overlap", "coverage", "areaRatio"],
  additionalProperties: false,
  properties: {
    kind: { const: "evaluation-tolerances" },
    id: JSON_STRING_SCHEMA,
    guideProximity: JSON_NUMBER_SCHEMA,
    alignment: JSON_NUMBER_SCHEMA,
    containment: JSON_NUMBER_SCHEMA,
    overlap: JSON_NUMBER_SCHEMA,
    coverage: JSON_NUMBER_SCHEMA,
    areaRatio: JSON_NUMBER_SCHEMA,
  },
} as const;
const COMPARISON_TOLERANCES_SCHEMA = {
  type: "object",
  required: ["kind", "id", "scoreTolerance"],
  additionalProperties: false,
  properties: {
    kind: { const: "tie-policy" },
    id: JSON_STRING_SCHEMA,
    scoreTolerance: JSON_NUMBER_SCHEMA,
  },
} as const;
const ACCEPTANCE_SCHEMA = {
  type: "object",
  required: ["accepted", "mode", "acceptedBy", "acceptedAt", "acceptedSourceIds", "acceptanceRecordId"],
  additionalProperties: false,
  properties: {
    accepted: JSON_BOOLEAN_SCHEMA,
    mode: { const: "user_supplied_structured_data" },
    acceptedBy: JSON_STRING_SCHEMA,
    acceptedAt: JSON_STRING_SCHEMA,
    acceptedSourceIds: JSON_STRING_ARRAY_SCHEMA,
    acceptanceRecordId: JSON_STRING_SCHEMA,
  },
} as const;
const ANALYSIS_PROVENANCE_SCHEMA = {
  type: "object",
  required: [
    "kind",
    "sourceKind",
    "externalSourceRef",
    "callerSourceIds",
    "adapter",
    "mappingVersion",
    "normalizationVersion",
    "transformationSteps",
    "acceptanceRecord",
    "operationContextRef",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "structured-composition-analysis-provenance" },
    sourceKind: { const: "user_supplied_structured_data" },
    externalSourceRef: { oneOf: [SOURCE_REFERENCE_SCHEMA, JSON_NULL_SCHEMA] },
    callerSourceIds: JSON_STRING_ARRAY_SCHEMA,
    adapter: {
      oneOf: [
        {
          type: "object",
          required: ["id", "version"],
          additionalProperties: false,
          properties: {
            id: JSON_STRING_SCHEMA,
            version: JSON_STRING_SCHEMA,
          },
        },
        JSON_NULL_SCHEMA,
      ],
    },
    mappingVersion: JSON_STRING_SCHEMA,
    normalizationVersion: { oneOf: [JSON_STRING_SCHEMA, JSON_NULL_SCHEMA] },
    transformationSteps: {
      type: "array",
      items: {
        type: "object",
        required: ["kind", "id", "description", "inputRefs", "outputRefs"],
        additionalProperties: false,
        properties: {
          kind: { const: "structured-composition-transformation-step" },
          id: JSON_STRING_SCHEMA,
          description: JSON_STRING_SCHEMA,
          inputRefs: SOURCE_REFERENCES_SCHEMA,
          outputRefs: SOURCE_REFERENCES_SCHEMA,
        },
      },
    },
    acceptanceRecord: ACCEPTANCE_SCHEMA,
    operationContextRef: RUNTIME_REF_SCHEMA,
  },
} as const;
const STRUCTURED_ANALYSIS_INPUT_SCHEMA = {
  type: "object",
  required: [
    "contractVersion",
    "analysisId",
    "compositionA",
    "compositionB",
    "acceptance",
    "ratioPack",
    "packLock",
    "ruleSetRef",
    "evaluationProfile",
    "evaluationTolerances",
    "comparisonTolerances",
    "tolerancePolicy",
    "operationContext",
    "provenance",
  ],
  additionalProperties: false,
  properties: {
    contractVersion: { const: STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION },
    analysisId: JSON_STRING_SCHEMA,
    compositionA: COMPOSITION_SCHEMA,
    compositionB: COMPOSITION_SCHEMA,
    acceptance: ACCEPTANCE_SCHEMA,
    ratioPack: RATIO_PACK_SCHEMA,
    packLock: PACK_LOCK_SCHEMA,
    ruleSetRef: JSON_STRING_SCHEMA,
    evaluationProfile: EVALUATION_PROFILE_SCHEMA,
    evaluationTolerances: EVALUATION_TOLERANCES_SCHEMA,
    comparisonTolerances: COMPARISON_TOLERANCES_SCHEMA,
    tolerancePolicy: TOLERANCE_POLICY_SCHEMA,
    operationContext: OPERATION_CONTEXT_SCHEMA,
    provenance: ANALYSIS_PROVENANCE_SCHEMA,
  },
} as const;
const STRUCTURED_ANALYSIS_TOOL_INPUT_SCHEMA = {
  type: "object",
  required: ["input"],
  additionalProperties: false,
  properties: {
    input: STRUCTURED_ANALYSIS_INPUT_SCHEMA,
  },
} as const;
const STRUCTURED_ANALYSIS_RESULT_SCHEMA = {
  type: "object",
  required: [
    "kind",
    "contractVersion",
    "operationName",
    "operationVersion",
    "status",
    "analysisId",
    "inputRefs",
    "outputRefs",
    "validation",
    "diagnostics",
    "warnings",
    "errors",
    "provenance",
    "measurements",
    "evaluations",
    "comparison",
    "decision",
    "packLockRef",
    "operationContextRef",
    "replayReadiness",
    "serializationSummary",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "structured-composition-analysis-result" },
    contractVersion: { const: STRUCTURED_COMPOSITION_ANALYSIS_RESULT_CONTRACT_VERSION },
    operationName: { const: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME },
    operationVersion: { const: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION },
    status: { enum: ["valid", "invalid"] },
    analysisId: JSON_STRING_SCHEMA,
    inputRefs: SOURCE_REFERENCES_SCHEMA,
    outputRefs: SOURCE_REFERENCES_SCHEMA,
    validation: {
      type: "object",
      required: ["kind", "status", "diagnostics", "acceptedSourceIds", "effectiveSourceIds"],
      additionalProperties: false,
      properties: {
        kind: { const: "structured-composition-analysis-validation" },
        status: { enum: ["valid", "invalid"] },
        diagnostics: DIAGNOSTICS_SCHEMA,
        acceptedSourceIds: JSON_STRING_ARRAY_SCHEMA,
        effectiveSourceIds: JSON_STRING_ARRAY_SCHEMA,
      },
    },
    diagnostics: DIAGNOSTICS_SCHEMA,
    warnings: DIAGNOSTICS_SCHEMA,
    errors: DIAGNOSTICS_SCHEMA,
    provenance: { oneOf: [ANALYSIS_PROVENANCE_SCHEMA, JSON_NULL_SCHEMA] },
    measurements: { oneOf: [{ type: "object", additionalProperties: {} }, JSON_NULL_SCHEMA] },
    evaluations: { oneOf: [{ type: "object", additionalProperties: {} }, JSON_NULL_SCHEMA] },
    comparison: { oneOf: [{ type: "object", additionalProperties: {} }, JSON_NULL_SCHEMA] },
    decision: { oneOf: [{ type: "object", additionalProperties: {} }, JSON_NULL_SCHEMA] },
    packLockRef: { oneOf: [RUNTIME_REF_SCHEMA, JSON_NULL_SCHEMA] },
    operationContextRef: { oneOf: [RUNTIME_REF_SCHEMA, JSON_NULL_SCHEMA] },
    replayReadiness: {
      oneOf: [
        {
          type: "object",
          required: ["status", "run"],
          additionalProperties: false,
          properties: {
            status: JSON_STRING_SCHEMA,
            run: { type: "object", additionalProperties: {} },
          },
        },
        JSON_NULL_SCHEMA,
      ],
    },
    serializationSummary: {
      oneOf: [
        {
          type: "object",
          required: ["serializationVersion", "meaningfulIdentity"],
          additionalProperties: false,
          properties: {
            serializationVersion: { const: STABLE_SERIALIZATION_VERSION },
            meaningfulIdentity: JSON_STRING_SCHEMA,
          },
        },
        JSON_NULL_SCHEMA,
      ],
    },
  },
} as const;
const STRUCTURED_ANALYSIS_TOOL_OUTPUT_SCHEMA = {
  type: "object",
  required: ["kind", "tool", "status", "result"],
  additionalProperties: false,
  properties: {
    kind: { const: "norma-mcp-tool-result" },
    tool: { const: "norma.analyzeStructuredCompositionV1" },
    status: { enum: ["valid", "invalid"] },
    result: STRUCTURED_ANALYSIS_RESULT_SCHEMA,
  },
} as const;
const STRUCTURED_ANALYSIS_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;

export const STRUCTURED_ANALYSIS_MCP_TOOL = {
  name: "norma.analyzeStructuredCompositionV1",
  title: "Analyze structured composition",
  description: "Analyze explicitly accepted user-supplied structured composition data with deterministic Norma Core analysis. Requires explicit ratio pack, rule set, tolerances, and operation context; does not accept prompts, images, files, URLs, inferred configuration, recommendations, or optimization, and reports whether composition A or B is closer to the declared proportional system.",
  inputSchema: STRUCTURED_ANALYSIS_TOOL_INPUT_SCHEMA,
  outputSchema: STRUCTURED_ANALYSIS_TOOL_OUTPUT_SCHEMA,
  annotations: STRUCTURED_ANALYSIS_TOOL_ANNOTATIONS,
} as const satisfies McpToolDefinition;

const PR38_MCP_TOOLS = [
  {
    name: "norma.getVersion",
    title: "Get Norma Core version",
    description: "Return Norma Core version and MCP capability metadata.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    outputSchema: GET_VERSION_OUTPUT_SCHEMA,
  },
  {
    name: "norma.serializeCanonicalJson",
    title: "Serialize canonical JSON",
    description: "Return deterministic canonical JSON for an explicit structured value.",
    inputSchema: {
      type: "object",
      required: ["value"],
      additionalProperties: false,
      properties: {
        value: {},
        policy: {
          type: "string",
        },
      },
    },
    outputSchema: SERIALIZE_CANONICAL_JSON_OUTPUT_SCHEMA,
  },
  {
    name: "norma.verifyRun",
    title: "Verify Norma run",
    description: "Verify an explicit Norma run envelope using existing Norma Core verification semantics.",
    inputSchema: {
      type: "object",
      required: ["input"],
      additionalProperties: false,
      properties: {
        input: {},
      },
    },
    outputSchema: VERIFY_RUN_OUTPUT_SCHEMA,
  },
  {
    name: "norma.verifyArtifactFreshness",
    title: "Verify artifact freshness",
    description: "Verify explicit artifact freshness using existing Norma Core artifact freshness semantics.",
    inputSchema: {
      type: "object",
      required: ["input"],
      additionalProperties: false,
      properties: {
        input: {},
      },
    },
    outputSchema: VERIFY_ARTIFACT_FRESHNESS_OUTPUT_SCHEMA,
  },
  {
    name: "norma.replayMvpDemo",
    title: "Replay Norma MVP demo",
    description: "Replay the fixed Norma Core MVP demo using existing in-memory demo data and existing replay semantics.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    outputSchema: REPLAY_MVP_DEMO_OUTPUT_SCHEMA,
  },
  STRUCTURED_ANALYSIS_MCP_TOOL,
] as const satisfies readonly McpToolDefinition[];

type McpStructuredContent = Readonly<Record<string, unknown>>;

interface JsonRpcErrorResponse {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId | null;
  readonly error: {
    readonly code: JsonRpcErrorCode;
    readonly message: string;
    readonly data?: unknown;
  };
}

interface InitializeResponse {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly result: {
    readonly protocolVersion: string;
    readonly capabilities: {
      readonly tools: {
        readonly listChanged: false;
      };
    };
    readonly serverInfo: {
      readonly name: typeof MCP_SERVER_NAME;
      readonly version: typeof MCP_SERVER_VERSION;
    };
  };
}

interface ToolsListResponse {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly result: {
    readonly tools: typeof PR38_MCP_TOOLS;
  };
}

interface ToolsCallResponse {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly result: {
    readonly content: readonly [
      {
        readonly type: "text";
        readonly text: string;
      },
    ];
    readonly structuredContent: McpStructuredContent;
    readonly isError: false;
  };
}

type JsonTraversalStackItem = {
  readonly value: unknown;
  readonly depth: number;
  readonly ancestors: readonly object[];
};

export function handleMcpJsonRpcMessage(rawLine: string): string | null {
  const rawLineFailure = rawLineLimitFailure(rawLine);
  if (rawLineFailure !== null) {
    return stringifyJsonRpcResponse(rawLineFailure);
  }

  const parsed = parseJsonRpcLine(rawLine);
  return parsed.ok ? handleParsedJsonRpcMessage(parsed.message) : stringifyJsonRpcResponse(parsed.error);
}

export function handleMcpJsonRpcRequest(
  message: unknown,
): InitializeResponse | ToolsListResponse | ToolsCallResponse | JsonRpcErrorResponse | null {
  if (!isRecord(message) || Array.isArray(message)) {
    return createJsonRpcError(null, -32600, "Invalid Request");
  }

  const hasId = Object.hasOwn(message, "id");
  const id = hasId && isJsonRpcId(message.id) ? message.id : null;

  if (hasId && id === null) {
    return createJsonRpcError(null, -32600, "Invalid Request");
  }

  if (message.jsonrpc !== "2.0" || typeof message.method !== "string" || message.method.length === 0) {
    return createJsonRpcError(id, -32600, "Invalid Request");
  }

  if (!hasId) {
    return null;
  }

  if (id === null) {
    return createJsonRpcError(null, -32600, "Invalid Request");
  }

  if (message.method === "initialize") {
    return createInitializeResult(id, selectInitializeProtocolVersion(message.params));
  }

  if (message.method === "tools/list") {
    if (!isValidToolsListParams(message.params, Object.hasOwn(message, "params"))) {
      return createJsonRpcError(id, -32602, "Invalid params");
    }

    return createToolsListResult(id);
  }

  if (message.method === "tools/call") {
    return handleToolsCall(id, message.params);
  }

  return createJsonRpcError(id, -32601, "Method not found");
}

export function createJsonRpcError(
  id: JsonRpcId | null,
  code: JsonRpcErrorCode,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse {
  const error =
    data === undefined
      ? {
          code,
          message,
        }
      : {
          code,
          message,
          data,
        };

  return {
    jsonrpc: "2.0",
    id,
    error,
  };
}

export function createInitializeResult(
  id: JsonRpcId,
  protocolVersion = MCP_PROTOCOL_VERSION,
): InitializeResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion,
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      },
    },
  };
}

function selectInitializeProtocolVersion(params: unknown): string {
  if (!isRecord(params) || Array.isArray(params)) {
    return MCP_PROTOCOL_VERSION;
  }

  return typeof params.protocolVersion === "string" && isCompatibleMcpProtocolDateString(params.protocolVersion)
    ? params.protocolVersion
    : MCP_PROTOCOL_VERSION;
}

function isCompatibleMcpProtocolDateString(protocolVersion: string): boolean {
  if (!mcpProtocolDateStringPattern.test(protocolVersion)) {
    return false;
  }

  const year = Number(protocolVersion.slice(0, 4));
  const month = Number(protocolVersion.slice(5, 7));
  const day = Number(protocolVersion.slice(8, 10));

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    protocolVersion >= minimumCompatibleMcpProtocolDate
  );
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function createToolsListResult(id: JsonRpcId): ToolsListResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      tools: PR38_MCP_TOOLS,
    },
  };
}

function handleToolsCall(id: JsonRpcId, params: unknown): ToolsCallResponse | JsonRpcErrorResponse {
  const call = parseToolsCallParams(params);
  if (call === null) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  if (call.name === "norma.getVersion") {
    return callGetVersion(id, call.arguments);
  }

  if (call.name === "norma.serializeCanonicalJson") {
    return callSerializeCanonicalJson(id, call.arguments);
  }

  if (call.name === "norma.verifyRun") {
    return callVerifyRun(id, call.arguments);
  }

  if (call.name === "norma.verifyArtifactFreshness") {
    return callVerifyArtifactFreshness(id, call.arguments);
  }

  if (call.name === "norma.replayMvpDemo") {
    return callReplayMvpDemo(id, call.arguments);
  }

  if (call.name === "norma.analyzeStructuredCompositionV1") {
    return callAnalyzeStructuredCompositionV1(id, call.arguments);
  }

  return createJsonRpcError(id, -32602, `Unknown tool: ${call.name}`);
}

function callGetVersion(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  if (toolArguments !== undefined && Object.keys(toolArguments).length !== 0) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  return createToolResult(id, {
    kind: "norma-mcp-tool-result",
    tool: "norma.getVersion",
    status: "ok",
    coreVersion: CORE_VERSION,
    protocolVersion: MCP_PROTOCOL_VERSION,
    serverName: MCP_SERVER_NAME,
    serverVersion: MCP_SERVER_VERSION,
    capabilities: {
      toolsList: true,
      getVersion: true,
      serializeCanonicalJson: true,
      verifyRun: true,
      verifyArtifactFreshness: true,
      replayMvpDemo: true,
      resources: false,
      prompts: false,
      remoteMcp: false,
    },
  });
}

function callSerializeCanonicalJson(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  if (toolArguments === undefined) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  const argumentKeys = Object.keys(toolArguments);
  if (
    !Object.hasOwn(toolArguments, "value") ||
    argumentKeys.some((key) => key !== "value" && key !== "policy")
  ) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  if (
    Object.hasOwn(toolArguments, "policy") &&
    (typeof toolArguments.policy !== "string" || toolArguments.policy !== STABLE_SERIALIZATION_VERSION)
  ) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  if (!isJsonCompatibleValue(toolArguments.value)) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  try {
    return createToolResult(id, {
      kind: "norma-mcp-tool-result",
      tool: "norma.serializeCanonicalJson",
      status: "ok",
      serializationVersion: STABLE_SERIALIZATION_VERSION,
      canonicalJson: serializeCanonicalJson(toolArguments.value),
    });
  } catch {
    return createJsonRpcError(id, -32603, "Internal error");
  }
}

function callVerifyRun(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  const input = parseVerifyToolInput(toolArguments);
  if (input === invalidVerifyToolInput) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  try {
    const result = verifyRun(input as Parameters<typeof verifyRun>[0]);
    return createToolResult(id, {
      kind: "norma-mcp-tool-result",
      tool: "norma.verifyRun",
      status: result.status,
      result,
    });
  } catch {
    return createJsonRpcError(id, -32603, "Internal error");
  }
}

function callVerifyArtifactFreshness(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  const input = parseVerifyToolInput(toolArguments);
  if (input === invalidVerifyToolInput) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  try {
    const result = verifyArtifactFreshness(input as Parameters<typeof verifyArtifactFreshness>[0]);
    return createToolResult(id, {
      kind: "norma-mcp-tool-result",
      tool: "norma.verifyArtifactFreshness",
      status: result.status,
      result,
    });
  } catch {
    return createJsonRpcError(id, -32603, "Internal error");
  }
}

function callReplayMvpDemo(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  if (toolArguments !== undefined && Object.keys(toolArguments).length !== 0) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  try {
    const mvpDemoInput = createMvpDemoInput();
    const demoResult = runMvpDemo(mvpDemoInput);
    if (demoResult.status !== "ok" || demoResult.output === null) {
      return createJsonRpcError(id, -32603, "Internal error");
    }

    const result = replayRun({
      run: demoResult.output.runEnvelope,
      mvpDemoInput,
      recordedMvpResult: demoResult.output,
      packLock: demoResult.output.packLock,
      operationContext: demoResult.output.operationContext,
    });

    return createToolResult(id, {
      kind: "norma-mcp-tool-result",
      tool: "norma.replayMvpDemo",
      status: result.status,
      result,
    });
  } catch {
    return createJsonRpcError(id, -32603, "Internal error");
  }
}

function callAnalyzeStructuredCompositionV1(
  id: JsonRpcId,
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): ToolsCallResponse | JsonRpcErrorResponse {
  const input = parseStructuredAnalysisToolInput(toolArguments);
  if (input === invalidStructuredAnalysisToolInput) {
    return createJsonRpcError(id, -32602, "Invalid params");
  }

  try {
    const result = analyzeStructuredCompositionV1(input);
    return createToolResult(id, {
      kind: "norma-mcp-tool-result",
      tool: "norma.analyzeStructuredCompositionV1",
      status: result.status,
      result,
    });
  } catch {
    return createJsonRpcError(id, -32603, "Internal error");
  }
}

function createToolResult(id: JsonRpcId, structuredContent: McpStructuredContent): ToolsCallResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [
        {
          type: "text",
          text: serializeCanonicalJson(structuredContent),
        },
      ],
      structuredContent,
      isError: false,
    },
  };
}

const invalidVerifyToolInput = Symbol("invalidVerifyToolInput");
const invalidStructuredAnalysisToolInput = Symbol("invalidStructuredAnalysisToolInput");

function parseVerifyToolInput(toolArguments: Readonly<Record<string, unknown>> | undefined): unknown {
  if (toolArguments === undefined) {
    return invalidVerifyToolInput;
  }

  const argumentKeys = Object.keys(toolArguments);
  if (argumentKeys.length !== 1 || !Object.hasOwn(toolArguments, "input")) {
    return invalidVerifyToolInput;
  }

  return isJsonCompatibleValue(toolArguments.input) ? toolArguments.input : invalidVerifyToolInput;
}

function parseStructuredAnalysisToolInput(
  toolArguments: Readonly<Record<string, unknown>> | undefined,
): StructuredCompositionAnalysisInputV1 | typeof invalidStructuredAnalysisToolInput {
  if (
    toolArguments === undefined ||
    !matchesJsonSchemaSubset(toolArguments, STRUCTURED_ANALYSIS_TOOL_INPUT_SCHEMA)
  ) {
    return invalidStructuredAnalysisToolInput;
  }

  return toolArguments.input as StructuredCompositionAnalysisInputV1;
}

function matchesJsonSchemaSubset(value: unknown, schema: unknown): boolean {
  if (!isRecord(schema)) {
    return true;
  }

  const oneOf = schema.oneOf;
  if (Array.isArray(oneOf)) {
    return oneOf.filter((candidate) => matchesJsonSchemaSubset(value, candidate)).length === 1;
  }

  if (Object.hasOwn(schema, "const") && !sameJsonSchemaValue(value, schema.const)) {
    return false;
  }

  const enumValues = schema.enum;
  if (Array.isArray(enumValues) && !enumValues.some((candidate) => sameJsonSchemaValue(value, candidate))) {
    return false;
  }

  const schemaType = schema.type;
  if (typeof schemaType === "string" && !matchesJsonSchemaType(value, schemaType)) {
    return false;
  }

  if (schemaType === "array") {
    const itemSchema = schema.items;
    return Array.isArray(value) && value.every((item) => matchesJsonSchemaSubset(item, itemSchema));
  }

  if (schemaType !== "object") {
    return true;
  }

  if (!isRecord(value) || Array.isArray(value)) {
    return false;
  }

  const properties = isRecord(schema.properties) ? schema.properties : {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  if (!required.every((key) => typeof key === "string" && Object.hasOwn(value, key))) {
    return false;
  }

  if (schema.additionalProperties === false) {
    const propertyNames = new Set(Object.keys(properties));
    if (Object.keys(value).some((key) => !propertyNames.has(key))) {
      return false;
    }
  }

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (Object.hasOwn(value, key) && !matchesJsonSchemaSubset(value[key], propertySchema)) {
      return false;
    }
  }

  if (isRecord(schema.additionalProperties)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (!Object.hasOwn(properties, key) && !matchesJsonSchemaSubset(nestedValue, schema.additionalProperties)) {
        return false;
      }
    }
  }

  return true;
}

function matchesJsonSchemaType(value: unknown, schemaType: string): boolean {
  switch (schemaType) {
    case "array":
      return Array.isArray(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "object":
      return isRecord(value) && !Array.isArray(value);
    case "string":
      return typeof value === "string";
    default:
      return true;
  }
}

function sameJsonSchemaValue(left: unknown, right: unknown): boolean {
  if (!isJsonCompatibleValue(left) || !isJsonCompatibleValue(right)) {
    return false;
  }

  return serializeCanonicalJson(left) === serializeCanonicalJson(right);
}

function parseToolsCallParams(
  params: unknown,
): { readonly name: string; readonly arguments?: Readonly<Record<string, unknown>> } | null {
  if (!isRecord(params) || Array.isArray(params)) {
    return null;
  }

  const keys = Object.keys(params);
  if (keys.some((key) => key !== "name" && key !== "arguments" && key !== "_meta")) {
    return null;
  }

  if (typeof params.name !== "string") {
    return null;
  }

  if (!Object.hasOwn(params, "arguments")) {
    return {
      name: params.name,
    };
  }

  if (!isRecord(params.arguments) || Array.isArray(params.arguments)) {
    return null;
  }

  return {
    name: params.name,
    arguments: stripRootReservedMcpMeta(params.arguments),
  };
}

function isValidToolsListParams(params: unknown, hasParams: boolean): boolean {
  if (!hasParams) {
    return true;
  }

  if (!isRecord(params) || Array.isArray(params)) {
    return false;
  }

  const keys = Object.keys(params);
  if (keys.length === 0) {
    return true;
  }

  if (keys.some((key) => key !== "cursor" && key !== "_meta")) {
    return false;
  }

  return !Object.hasOwn(params, "cursor") || typeof params.cursor === "string";
}

function stripRootReservedMcpMeta(params: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  if (!Object.hasOwn(params, "_meta")) {
    return params;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== "_meta") {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return (
    (typeof value === "string" && value.length <= MCP_STDIO_MAX_STRING_LENGTH) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function stringifyJsonRpcResponse(
  response: InitializeResponse | ToolsListResponse | ToolsCallResponse | JsonRpcErrorResponse,
): string {
  return JSON.stringify(response);
}

function rawLineLimitFailure(rawLine: string): JsonRpcErrorResponse | null {
  return requestEncoder.encode(rawLine).length > MCP_STDIO_MAX_REQUEST_BYTES
    ? createJsonRpcError(null, -32600, "Invalid Request")
    : null;
}

function parseJsonRpcLine(rawLine: string): { readonly ok: true; readonly message: unknown } | {
  readonly ok: false;
  readonly error: JsonRpcErrorResponse;
} {
  try {
    return { ok: true, message: JSON.parse(rawLine) };
  } catch {
    return { ok: false, error: createJsonRpcError(null, -32700, "Parse error") };
  }
}

function handleParsedJsonRpcMessage(message: unknown): string | null {
  const preDispatchResponse = parsedMessagePreDispatchResponse(message);
  if (preDispatchResponse !== undefined) {
    return preDispatchResponse;
  }

  try {
    const response = handleMcpJsonRpcRequest(message);
    return response === null ? null : stringifyJsonRpcResponse(response);
  } catch {
    return stringifyJsonRpcResponse(createJsonRpcError(safeJsonRpcId(message), -32603, "Internal error"));
  }
}

function parsedMessagePreDispatchResponse(message: unknown): string | null | undefined {
  if (isJsonRpcNotification(message)) {
    return null;
  }

  const limitFailure = parsedMessageLimitFailure(message);
  return limitFailure === null ? undefined : stringifyJsonRpcResponse(limitFailure);
}

function parsedMessageLimitFailure(message: unknown): JsonRpcErrorResponse | null {
  if (jsonValueLimitExceeded(message)) {
    const id = safeJsonRpcId(message);
    return createJsonRpcError(id, limitFailureCode(message), limitFailureMessage(message));
  }

  return null;
}

function safeJsonRpcId(message: unknown): JsonRpcId | null {
  const id = rawJsonRpcId(message);
  return isJsonRpcId(id) ? id : null;
}

function isToolOrListRequest(message: unknown): boolean {
  return isJsonRpcRequestRecord(message) && message.jsonrpc === "2.0" && isToolRequestMethod(message.method);
}

function rawJsonRpcId(message: unknown): unknown {
  return isJsonRpcRequestRecord(message) && Object.hasOwn(message, "id") ? message.id : undefined;
}

function isJsonRpcNotification(message: unknown): boolean {
  if (!isJsonRpcRequestRecord(message) || Object.hasOwn(message, "id")) {
    return false;
  }

  if (message.jsonrpc !== "2.0") {
    return false;
  }

  return isNonEmptyString(message.method);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function limitFailureCode(message: unknown): -32600 | -32602 {
  return isToolOrListRequest(message) ? -32602 : -32600;
}

function limitFailureMessage(message: unknown): "Invalid Request" | "Invalid params" {
  return isToolOrListRequest(message) ? "Invalid params" : "Invalid Request";
}

function isToolRequestMethod(method: unknown): boolean {
  return method === "tools/call" || method === "tools/list";
}

function isJsonRpcRequestRecord(message: unknown): message is Record<string, unknown> {
  return isRecord(message) && !Array.isArray(message);
}

function isJsonCompatibleValue(value: unknown): boolean {
  return !jsonValueLimitExceeded(value);
}

function jsonValueLimitExceeded(value: unknown): boolean {
  const stack: JsonTraversalStackItem[] = [
    { value, depth: 1, ancestors: [] },
  ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      break;
    }

    if (!validateJsonStackItem(current, stack)) {
      return true;
    }
  }

  return false;
}

function validateJsonStackItem(
  item: JsonTraversalStackItem,
  stack: JsonTraversalStackItem[],
): boolean {
  if (item.depth > MCP_STDIO_MAX_JSON_DEPTH) {
    return false;
  }

  const value = item.value;
  return isJsonScalar(value) ? isBoundedJsonScalar(value) : pushJsonCompositeChildren(item, stack);
}

function isJsonScalar(value: unknown): boolean {
  return value === null || typeof value !== "object";
}

function isBoundedJsonScalar(value: unknown): boolean {
  if (typeof value === "string") {
    return value.length <= MCP_STDIO_MAX_STRING_LENGTH;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return value === null || typeof value === "boolean";
}

function pushJsonCompositeChildren(item: JsonTraversalStackItem, stack: JsonTraversalStackItem[]): boolean {
  const value = item.value as object;
  if (item.ancestors.includes(value)) {
    return false;
  }

  const ancestors = [...item.ancestors, value];
  if (Array.isArray(value)) {
    pushJsonArrayItems(value, item.depth + 1, ancestors, stack);
    return true;
  }

  return isPlainJsonRecord(value) && pushJsonRecordEntries(value, item.depth + 1, ancestors, stack);
}

function pushJsonArrayItems(
  value: readonly unknown[],
  depth: number,
  ancestors: readonly object[],
  stack: JsonTraversalStackItem[],
): void {
  for (let index = value.length - 1; index >= 0; index -= 1) {
    stack.push({ value: value[index], depth, ancestors });
  }
}

function pushJsonRecordEntries(
  value: object,
  depth: number,
  ancestors: readonly object[],
  stack: JsonTraversalStackItem[],
): boolean {
  const entries = Object.entries(value);
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const [key, nestedValue] = entries[index] as [string, unknown];
    if (key.length > MCP_STDIO_MAX_STRING_LENGTH) {
      return false;
    }
    stack.push({ value: nestedValue, depth, ancestors });
  }

  return true;
}

function isPlainJsonRecord(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
