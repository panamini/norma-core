export interface DisabledLiveProviderExperimentHarnessConfigPresenceV1 {
  readonly enableFlagPresent?: boolean;
  readonly providerNamePresent?: boolean;
  readonly providerCredentialPresent?: boolean;
}

export interface DisabledLiveProviderExperimentHarnessRequestV1 {
  readonly manualOperatorIntent?: boolean;
  readonly redactedConfigurationPresence?: DisabledLiveProviderExperimentHarnessConfigPresenceV1;
}

export type DisabledLiveProviderExperimentHarnessGateStatusV1 =
  | "blocked_disabled_by_default"
  | "blocked_missing_manual_operator_intent"
  | "blocked_missing_redacted_configuration_presence"
  | "live_execution_unapproved_requires_future_change_contract";

export interface DisabledLiveProviderExperimentHarnessStateV1 {
  readonly harnessKind: "norma.disabled-local-live-provider-experiment-harness.v1";
  readonly gateStatus: DisabledLiveProviderExperimentHarnessGateStatusV1;
  readonly localOnly: true;
  readonly disabledByDefault: true;
  readonly manualOnly: true;
  readonly failClosed: true;
  readonly liveProviderExecution: false;
  readonly ciLiveNetworkDependency: false;
  readonly providerNeutral: true;
  readonly providerEvidenceOnly: true;
  readonly acceptedStructuredGeometryOnlyCoreInput: true;
  readonly providerOutputIsCoreTruth: false;
  readonly providerOutputCanCreateAcceptedGeometry: false;
  readonly providerSelfAcceptance: false;
  readonly confidenceScoreValueCanAuthorizeAcceptance: false;
  readonly promptArtifactOrMetricPolicyCanAuthorizeAcceptance: false;
  readonly coreInputProduced: false;
  readonly acceptedStructuredGeometryProduced: false;
  readonly resultJsonProduced: false;
  readonly providerPayloadParsed: false;
  readonly providerOutputPersisted: false;
  readonly providerApiCall: false;
  readonly providerSdkUsage: false;
  readonly imageRecognition: false;
  readonly networkCall: false;
  readonly packageRootExport: false;
  readonly packageApiTruth: false;
  readonly connectorTruth: false;
  readonly hostedTruth: false;
  readonly artifactTruth: false;
  readonly metricPolicyAuthority: false;
  readonly coreSchemaWidening: false;
  readonly coreRuntimeWidening: false;
  readonly mcpChatGptRuntime: false;
  readonly cadFigmaRuntime: false;
  readonly requiresFutureApprovalForNetwork: true;
  readonly futureApprovalGate: "PR117+ explicit Change Contract";
  readonly canonicalTruthRule: "provider_output_is_untrusted_evidence_only";
  readonly gateInputs: {
    readonly manualOperatorIntentRepresented: boolean;
    readonly redactedConfigurationPresenceRepresented: boolean;
    readonly redactedConfigurationPresence: {
      readonly enableFlagPresent: boolean;
      readonly providerNamePresent: boolean;
      readonly providerCredentialPresent: boolean;
      readonly presenceOnly: true;
      readonly rawValuesAccepted: false;
      readonly rawValuesReturned: false;
    };
  };
  readonly futureGateNames: readonly [
    "NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT",
    "NORMA_LIVE_PROVIDER",
    "NORMA_LIVE_PROVIDER_API_KEY",
  ];
}

const FUTURE_GATE_NAMES = Object.freeze([
  "NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT",
  "NORMA_LIVE_PROVIDER",
  "NORMA_LIVE_PROVIDER_API_KEY",
] as const);

export function createDisabledLiveProviderExperimentHarnessStateV1(
  request: DisabledLiveProviderExperimentHarnessRequestV1 | null = {},
): DisabledLiveProviderExperimentHarnessStateV1 {
  const safeRequest = request ?? {};
  const redactedConfigurationPresence = {
    enableFlagPresent: safeRequest.redactedConfigurationPresence?.enableFlagPresent === true,
    providerNamePresent: safeRequest.redactedConfigurationPresence?.providerNamePresent === true,
    providerCredentialPresent: safeRequest.redactedConfigurationPresence?.providerCredentialPresent === true,
    presenceOnly: true,
    rawValuesAccepted: false,
    rawValuesReturned: false,
  } as const;
  const manualOperatorIntentRepresented = safeRequest.manualOperatorIntent === true;
  const redactedConfigurationPresenceRepresented = [
    redactedConfigurationPresence.enableFlagPresent,
    redactedConfigurationPresence.providerNamePresent,
    redactedConfigurationPresence.providerCredentialPresent,
  ].every(Boolean);

  return {
    harnessKind: "norma.disabled-local-live-provider-experiment-harness.v1",
    gateStatus: gateStatusFor({
      manualOperatorIntentRepresented,
      redactedConfigurationPresenceRepresented,
    }),
    localOnly: true,
    disabledByDefault: true,
    manualOnly: true,
    failClosed: true,
    liveProviderExecution: false,
    ciLiveNetworkDependency: false,
    providerNeutral: true,
    providerEvidenceOnly: true,
    acceptedStructuredGeometryOnlyCoreInput: true,
    providerOutputIsCoreTruth: false,
    providerOutputCanCreateAcceptedGeometry: false,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    promptArtifactOrMetricPolicyCanAuthorizeAcceptance: false,
    coreInputProduced: false,
    acceptedStructuredGeometryProduced: false,
    resultJsonProduced: false,
    providerPayloadParsed: false,
    providerOutputPersisted: false,
    providerApiCall: false,
    providerSdkUsage: false,
    imageRecognition: false,
    networkCall: false,
    packageRootExport: false,
    packageApiTruth: false,
    connectorTruth: false,
    hostedTruth: false,
    artifactTruth: false,
    metricPolicyAuthority: false,
    coreSchemaWidening: false,
    coreRuntimeWidening: false,
    mcpChatGptRuntime: false,
    cadFigmaRuntime: false,
    requiresFutureApprovalForNetwork: true,
    futureApprovalGate: "PR117+ explicit Change Contract",
    canonicalTruthRule: "provider_output_is_untrusted_evidence_only",
    gateInputs: {
      manualOperatorIntentRepresented,
      redactedConfigurationPresenceRepresented,
      redactedConfigurationPresence,
    },
    futureGateNames: FUTURE_GATE_NAMES,
  };
}

function gateStatusFor({
  manualOperatorIntentRepresented,
  redactedConfigurationPresenceRepresented,
}: {
  readonly manualOperatorIntentRepresented: boolean;
  readonly redactedConfigurationPresenceRepresented: boolean;
}): DisabledLiveProviderExperimentHarnessGateStatusV1 {
  if (manualOperatorIntentRepresented && redactedConfigurationPresenceRepresented) {
    return "live_execution_unapproved_requires_future_change_contract";
  }

  if (manualOperatorIntentRepresented) {
    return "blocked_missing_redacted_configuration_presence";
  }

  if (redactedConfigurationPresenceRepresented) {
    return "blocked_missing_manual_operator_intent";
  }

  return "blocked_disabled_by_default";
}
