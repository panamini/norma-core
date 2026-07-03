# Package API Export Contract Approval

## Status

PR95 approves only a future package-root API export contract for guided
inspection consumers.

PR95 is docs/tests/guard only. It does not implement public exports, package
publication, package metadata changes, dependency changes, lockfile changes,
hosted MCP runtime, ChatGPT connector runtime, OpenAI/provider calls,
image/CAD/Figma adapters, inference, recommendation, optimization, correction,
scoring, automatic family selection, CLI behavior, MCP behavior, viewer
behavior, examples, or runtime source behavior.

## Sequencing Basis

PR94 completed the package-private guided inspection consumer proof. The helper
can structurally consume the existing guided inspection demo envelope while
keeping `result.json` canonical and guided inspection artifacts derived-only.

PR95 chooses the package API track for the next gate. It does not choose hosted
MCP, ChatGPT connector runtime, provider, adapter, publication, or runtime
implementation work.

## Approved Future Package-Root Names

PR95 approves these exact future package-root function names for a later PR:

- `createGuidedInspectionArtifactContractV1`
- `consumeGuidedInspectionDemoEnvelopeV1`

PR95 approves these exact future package-root type names for a later PR:

- `GuidedInspectionArtifactContractInputV1`
- `GuidedInspectionArtifactContractV1`
- `GuidedInspectionArtifactRefV1`
- `GuidedInspectionDemoEnvelopeV1`
- `GuidedInspectionConsumerProofV1`

## Approved Future Shapes

PR95 approves these exact future public object shapes for PR96:

```ts
interface GuidedInspectionArtifactContractInputV1 {
  readonly outputDir: string;
  readonly artifacts: readonly GuidedInspectionArtifactRefV1["name"][];
}

interface GuidedInspectionArtifactRefV1 {
  readonly name:
    | "result.json"
    | "guide.html"
    | "report.html"
    | "visual.svg"
    | "summary.json"
    | "summary.md";
  readonly path: string;
  readonly role: "canonical-truth" | "derived-inspection-artifact";
  readonly required: boolean;
}

interface GuidedInspectionArtifactContractV1 {
  readonly canonicalTruth: "result.json";
  readonly resultJson: GuidedInspectionArtifactRefV1 & {
    readonly name: "result.json";
    readonly role: "canonical-truth";
    readonly required: true;
  };
  readonly derivedArtifacts: readonly GuidedInspectionArtifactRefV1[];
  readonly localOnly: true;
}

interface GuidedInspectionDemoEnvelopeV1 {
  readonly status: "ok";
  readonly outputDir: string;
  readonly resultJson: string;
  readonly guideHtml: string;
  readonly reportHtml?: string;
  readonly visualSvg?: string;
  readonly summaryJson?: string;
  readonly summaryMarkdown?: string;
  readonly canonicalTruth: "result.json";
  readonly derivedArtifacts: true;
  readonly localOnly: true;
}

interface GuidedInspectionConsumerProofV1 {
  readonly canonicalTruth: "result.json";
  readonly resultJson: GuidedInspectionArtifactRefV1 & {
    readonly name: "result.json";
    readonly role: "canonical-truth";
    readonly required: true;
  };
  readonly derivedArtifacts: readonly GuidedInspectionArtifactRefV1[];
  readonly localOnly: true;
  readonly outputDir: string;
}
```

`GuidedInspectionArtifactRefV1.path` is structural metadata supplied by the
caller or envelope. It is never read by the API, and the API must never parse
the artifact contents behind that path.

Every `GuidedInspectionArtifactRefV1` in `derivedArtifacts` must use
`role: "derived-inspection-artifact"`. `guide.html` is required for
`GuidedInspectionDemoEnvelopeV1`; `reportHtml`, `visualSvg`, `summaryJson`, and
`summaryMarkdown` are optional derived fields that may be absent. No approved
shape contains an artifact-as-truth field, parsed artifact payload, inferred
truth field, recommendation field, score field, corrected result field, selected
family field, provider response field, filesystem read result, or generated
Norma result.

## Future API Contract

`createGuidedInspectionArtifactContractV1(input)` may accept explicit
structural artifact refs. It must require `result.json`, recognize
`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` as
derived artifacts, reject unsafe artifact refs, return deterministic structural
metadata, avoid filesystem reads, avoid parsing JSON, HTML, SVG, or Markdown
contents, avoid network, shell, provider, MCP, and CLI calls, and avoid mutating
caller input.

`consumeGuidedInspectionDemoEnvelopeV1(envelope)` may accept the existing guided
inspection demo output envelope shape. It must identify `resultJson` as the
canonical `result.json`, identify guide, report, visual, and summary fields as
derived artifacts only, return a structural consumer proof, avoid recomputing
Norma results, avoid parsing `result.json` contents, avoid treating
`guide.html`, `report.html`, `visual.svg`, `summary.json`, or `summary.md` as
truth, and avoid inference, correction, recommendation, optimization, scoring,
automatic family selection, and provider calls.

## Truth Boundary

`result.json` remains the canonical machine-consumable Norma truth for the
guided inspection flow.

`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` are
derived inspection artifacts only.

Derived artifacts may be referenced as inspection outputs only. They must never
become source truth, package API truth, inferred truth, corrected truth,
recommended truth, optimized truth, scored truth, selected-family truth, or a
replacement for `result.json`.

## Package Boundary

The package remains private. `package.json` must continue to expose only the
existing package root. No package-level `bin` is approved. No dependency,
devDependency, peerDependency, or optionalDependency expansion is approved.

Guided inspection helpers are not package-root exports in PR95. PR96 may
implement the approved package-root names later only if it preserves this
structural contract and keeps generated artifacts derived-only.

## Non-Approval Boundary

PR95 does not approve:

- package publishing;
- public npm publication;
- package metadata changes;
- package export implementation;
- package-level `bin`;
- dependency, devDependency, peerDependency, or optionalDependency expansion;
- hosted MCP;
- remote MCP;
- ChatGPT connector runtime;
- OpenAI/provider calls;
- image/CAD/Figma adapters;
- CLI behavior changes;
- MCP behavior changes;
- viewer behavior changes;
- examples changes;
- inference;
- recommendation;
- optimization;
- correction;
- scoring;
- automatic family selection.

## Decision

Approve the exact future guided inspection package-root export contract above.
Keep PR95 as docs/tests/guard only. A later PR96 may implement the approved
names, but PR95 itself does not export them.
