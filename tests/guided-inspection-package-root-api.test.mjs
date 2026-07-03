import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  consumeGuidedInspectionDemoEnvelopeV1,
  createGuidedInspectionArtifactContractV1,
} from "../dist/src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const outputDir = join(repoRoot, "tmp", "nonexistent-guided-inspection-package-root-api-output");

const approvedRuntimeNames = [
  "createGuidedInspectionArtifactContractV1",
  "consumeGuidedInspectionDemoEnvelopeV1",
];

const approvedTypeNames = [
  "GuidedInspectionArtifactContractInputV1",
  "GuidedInspectionArtifactContractV1",
  "GuidedInspectionArtifactRefV1",
  "GuidedInspectionDemoEnvelopeV1",
  "GuidedInspectionConsumerProofV1",
];

const allArtifactNames = [
  "result.json",
  "summary.md",
  "visual.svg",
  "guide.html",
  "summary.json",
  "report.html",
];

test("package root exposes exactly the approved guided inspection V1 runtime functions", async () => {
  const packageRoot = await import("../dist/src/index.js");
  const guidedRuntimeExports = Object.keys(packageRoot)
    .filter((name) => name.includes("GuidedInspection"))
    .sort();

  assert.deepEqual(guidedRuntimeExports, approvedRuntimeNames.sort());

  for (const approvedRuntimeName of approvedRuntimeNames) {
    assert.equal(typeof packageRoot[approvedRuntimeName], "function");
  }
});

test("package root type declarations expose the approved guided inspection V1 type names", async () => {
  const declarations = await readFile(join(repoRoot, "dist", "src", "index.d.ts"), "utf8");
  const facadeDeclarations = await readFile(
    join(repoRoot, "dist", "src", "local-report", "guided-inspection-package-api-v1.d.ts"),
    "utf8",
  );

  assert.match(declarations, /guided-inspection-package-api-v1\.js/u);
  assert.match(facadeDeclarations, /export interface GuidedInspectionArtifactContractInputV1/u);

  for (const approvedTypeName of approvedTypeNames) {
    assert.match(facadeDeclarations, new RegExp(`\\b${approvedTypeName}\\b`, "u"), approvedTypeName);
  }
});

test("old package-private guided inspection helper names are not package-root exports", async () => {
  const packageRoot = await import("../dist/src/index.js");

  assert.equal("createGuidedInspectionArtifactContract" in packageRoot, false);
  assert.equal("createGuidedInspectionConsumerProof" in packageRoot, false);
});

test("createGuidedInspectionArtifactContractV1 returns the approved structural contract shape", () => {
  const input = {
    outputDir,
    artifacts: allArtifactNames,
  };
  const before = structuredClone(input);
  const contract = createGuidedInspectionArtifactContractV1(input);

  assert.deepEqual(input, before);
  assert.deepEqual(contract, {
    canonicalTruth: "result.json",
    resultJson: {
      name: "result.json",
      path: join(outputDir, "result.json"),
      role: "canonical-truth",
      required: true,
    },
    derivedArtifacts: [
      {
        name: "guide.html",
        path: join(outputDir, "guide.html"),
        role: "derived-inspection-artifact",
        required: false,
      },
      {
        name: "report.html",
        path: join(outputDir, "report.html"),
        role: "derived-inspection-artifact",
        required: false,
      },
      {
        name: "visual.svg",
        path: join(outputDir, "visual.svg"),
        role: "derived-inspection-artifact",
        required: false,
      },
      {
        name: "summary.json",
        path: join(outputDir, "summary.json"),
        role: "derived-inspection-artifact",
        required: false,
      },
      {
        name: "summary.md",
        path: join(outputDir, "summary.md"),
        role: "derived-inspection-artifact",
        required: false,
      },
    ],
    localOnly: true,
  });
});

test("createGuidedInspectionArtifactContractV1 keeps result.json canonical and rejects unsafe refs", () => {
  const resultOnly = createGuidedInspectionArtifactContractV1({
    outputDir,
    artifacts: ["result.json"],
  });

  assert.equal(resultOnly.canonicalTruth, "result.json");
  assert.equal(resultOnly.resultJson.role, "canonical-truth");
  assert.equal(resultOnly.resultJson.required, true);
  assert.deepEqual(resultOnly.derivedArtifacts, []);

  assert.throws(
    () => createGuidedInspectionArtifactContractV1({
      outputDir,
      artifacts: ["guide.html"],
    }),
    /requires result\.json/u,
  );

  for (const invalidArtifact of [
    "../result.json",
    "subdir/result.json",
    "http://example.test/result.json",
    "unknown.json",
  ]) {
    assert.throws(
      () => createGuidedInspectionArtifactContractV1({
        outputDir,
        artifacts: ["result.json", invalidArtifact],
      }),
      /requires result\.json|artifact|Unknown guided inspection artifact/u,
      invalidArtifact,
    );
  }
});

test("createGuidedInspectionArtifactContractV1 returns stable derived artifact ordering", () => {
  const first = createGuidedInspectionArtifactContractV1({
    outputDir,
    artifacts: ["summary.md", "visual.svg", "result.json", "guide.html", "summary.json", "report.html"],
  });
  const second = createGuidedInspectionArtifactContractV1({
    outputDir,
    artifacts: ["report.html", "summary.json", "guide.html", "result.json", "visual.svg", "summary.md"],
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first.derivedArtifacts.map((artifact) => artifact.name), [
    "guide.html",
    "report.html",
    "visual.svg",
    "summary.json",
    "summary.md",
  ]);
});

test("consumeGuidedInspectionDemoEnvelopeV1 consumes the local demo envelope structurally", () => {
  const envelope = validEnvelope();
  const before = structuredClone(envelope);
  const proof = consumeGuidedInspectionDemoEnvelopeV1(envelope);

  assert.deepEqual(envelope, before);
  assert.deepEqual(proof, {
    canonicalTruth: "result.json",
    resultJson: {
      name: "result.json",
      path: join(outputDir, "result.json"),
      role: "canonical-truth",
      required: true,
    },
    derivedArtifacts: [
      {
        name: "guide.html",
        path: join(outputDir, "guide.html"),
        role: "derived-inspection-artifact",
        required: true,
      },
      {
        name: "report.html",
        path: join(outputDir, "report.html"),
        role: "derived-inspection-artifact",
        required: false,
      },
      {
        name: "visual.svg",
        path: join(outputDir, "visual.svg"),
        role: "derived-inspection-artifact",
        required: false,
      },
      {
        name: "summary.json",
        path: join(outputDir, "summary.json"),
        role: "derived-inspection-artifact",
        required: false,
      },
      {
        name: "summary.md",
        path: join(outputDir, "summary.md"),
        role: "derived-inspection-artifact",
        required: false,
      },
    ],
    localOnly: true,
    outputDir,
  });
});

test("consumeGuidedInspectionDemoEnvelopeV1 requires guide.html and keeps optional artifacts derived-only", () => {
  const proof = consumeGuidedInspectionDemoEnvelopeV1(validEnvelope({
    reportHtml: undefined,
    visualSvg: undefined,
    summaryJson: undefined,
  }));

  assert.equal(proof.resultJson.name, "result.json");
  assert.equal(proof.resultJson.role, "canonical-truth");
  assert.deepEqual(proof.derivedArtifacts, [
    {
      name: "guide.html",
      path: join(outputDir, "guide.html"),
      role: "derived-inspection-artifact",
      required: true,
    },
    {
      name: "summary.md",
      path: join(outputDir, "summary.md"),
      role: "derived-inspection-artifact",
      required: false,
    },
  ]);

  assert.throws(
    () => consumeGuidedInspectionDemoEnvelopeV1(validEnvelope({ guideHtml: undefined })),
    /requires guideHtml/u,
  );
});

test("consumeGuidedInspectionDemoEnvelopeV1 rejects unsafe unsupported or truth-swapping refs", () => {
  for (const [label, envelope, expectedError] of [
    ["wrong canonical truth", validEnvelope({ canonicalTruth: "guide.html" }), /requires canonicalTruth result\.json/u],
    ["URL outputDir", validEnvelope({ outputDir: "https://example.test/out" }), /absolute local filesystem path/u],
    ["relative resultJson", validEnvelope({ resultJson: "result.json" }), /resultJson must match outputDir\/result\.json/u],
    ["result points at guide", validEnvelope({ resultJson: join(outputDir, "guide.html") }), /Duplicate guided inspection demo artifact path|resultJson must match outputDir\/result\.json/u],
    ["derived path mismatch", validEnvelope({ visualSvg: join(outputDir, "summary.md") }), /Duplicate guided inspection demo artifact path|visualSvg must match outputDir\/visual\.svg/u],
    ["unknown field", validEnvelope({ parsedResultJson: {} }), /Unknown guided inspection demo envelope field/u],
  ]) {
    assert.throws(
      () => consumeGuidedInspectionDemoEnvelopeV1(envelope),
      expectedError,
      label,
    );
  }
});

test("package-root V1 facade has no artifact content parsing or external-call implementation", async () => {
  const facadeSource = await readFile(
    join(repoRoot, "src", "local-report", "guided-inspection-package-api-v1.ts"),
    "utf8",
  );

  assert.doesNotMatch(facadeSource, /node:fs|node:fs\/promises|readFile|existsSync|statSync|JSON\.parse|DOMParser/u);
  assert.doesNotMatch(facadeSource, /fetch\(|child_process|execFile|spawn|openai|provider|mcp|cli/u);
});

function validEnvelope(overrides = {}) {
  return withoutUndefined({
    status: "ok",
    outputDir,
    resultJson: join(outputDir, "result.json"),
    guideHtml: join(outputDir, "guide.html"),
    reportHtml: join(outputDir, "report.html"),
    visualSvg: join(outputDir, "visual.svg"),
    summaryJson: join(outputDir, "summary.json"),
    summaryMarkdown: join(outputDir, "summary.md"),
    canonicalTruth: "result.json",
    derivedArtifacts: true,
    localOnly: true,
    ...overrides,
  });
}

function withoutUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
