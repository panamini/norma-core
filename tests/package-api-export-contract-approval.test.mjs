import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const decisionDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-02-package-api-export-contract-approval.md",
);
const roadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const packageJsonPath = join(repoRoot, "package.json");
const srcIndexPath = join(repoRoot, "src", "index.ts");

const futureApiNames = [
  "createGuidedInspectionArtifactContractV1",
  "consumeGuidedInspectionDemoEnvelopeV1",
  "GuidedInspectionArtifactContractV1",
  "GuidedInspectionArtifactRefV1",
  "GuidedInspectionDemoEnvelopeV1",
  "GuidedInspectionConsumerProofV1",
];

const derivedArtifactNames = [
  "guide.html",
  "report.html",
  "visual.svg",
  "summary.json",
  "summary.md",
];

const futureShapeSnippets = [
  "interface GuidedInspectionArtifactRefV1",
  "readonly name:",
  "| \"result.json\"",
  "| \"guide.html\"",
  "| \"report.html\"",
  "| \"visual.svg\"",
  "| \"summary.json\"",
  "| \"summary.md\"",
  "readonly path: string",
  "readonly role: \"canonical-truth\" | \"derived-inspection-artifact\"",
  "readonly required: boolean",
  "interface GuidedInspectionArtifactContractV1",
  "readonly canonicalTruth: \"result.json\"",
  "readonly resultJson: GuidedInspectionArtifactRefV1 &",
  "readonly name: \"result.json\"",
  "readonly role: \"canonical-truth\"",
  "readonly required: true",
  "readonly derivedArtifacts: readonly GuidedInspectionArtifactRefV1[]",
  "readonly localOnly: true",
  "interface GuidedInspectionDemoEnvelopeV1",
  "readonly status: \"ok\"",
  "readonly outputDir: string",
  "readonly resultJson: string",
  "readonly guideHtml: string",
  "readonly reportHtml?: string",
  "readonly visualSvg?: string",
  "readonly summaryJson?: string",
  "readonly summaryMarkdown?: string",
  "readonly derivedArtifacts: true",
  "interface GuidedInspectionConsumerProofV1",
  "readonly outputDir: string",
];

const blockedSurfaces = [
  "package publishing",
  "public npm publication",
  "hosted MCP",
  "remote MCP",
  "ChatGPT connector runtime",
  "OpenAI/provider calls",
  "image/CAD/Figma adapters",
  "inference",
  "recommendation",
  "optimization",
  "correction",
  "scoring",
  "automatic family selection",
];

test("PR95 decision doc exists and approves only a future package API export contract", () => {
  assert.equal(existsSync(decisionDocPath), true);

  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "# Package API Export Contract Approval",
    "PR95 approves only a future package-root API export contract",
    "PR95 is docs/tests/guard only",
    "PR95 itself does not export them",
  ]);
  assertDocMentions(combinedDocs(), [
    "Current package API decision reference:",
    "docs/decisions/2026-07-02-package-api-export-contract-approval.md",
  ]);
});

test("PR95 documents the exact approved future package-root API names", () => {
  const decisionDoc = readDoc(decisionDocPath);

  for (const futureApiName of futureApiNames) {
    assertDocMentions(decisionDoc, [`\`${futureApiName}\``]);
  }
});

test("PR95 freezes the approved future public type and object shapes", () => {
  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "## Approved Future Shapes",
    "PR95 approves these exact future public object shapes for PR96",
    ...futureShapeSnippets,
    "`GuidedInspectionArtifactRefV1.path` is structural metadata",
    "Every `GuidedInspectionArtifactRefV1` in `derivedArtifacts` must use",
    "`role: \"derived-inspection-artifact\"`",
    "`guide.html` is required for `GuidedInspectionDemoEnvelopeV1`",
    "`reportHtml`, `visualSvg`, `summaryJson`, and `summaryMarkdown` are optional derived fields",
  ]);
});

test("PR95 future shapes do not approve artifact-as-truth or generated result fields", () => {
  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "No approved shape contains an artifact-as-truth field",
    "parsed artifact payload",
    "inferred truth field",
    "recommendation field",
    "score field",
    "corrected result field",
    "selected family field",
    "provider response field",
    "filesystem read result",
    "generated Norma result",
  ]);

  assert.doesNotMatch(decisionDoc, /\breadonly\s+artifactTruth\b/u);
  assert.doesNotMatch(decisionDoc, /\breadonly\s+sourceTruthArtifact\b/u);
  assert.doesNotMatch(decisionDoc, /\breadonly\s+parsedResultJson\b/u);
  assert.doesNotMatch(decisionDoc, /\breadonly\s+score\b/u);
  assert.doesNotMatch(decisionDoc, /\breadonly\s+selectedFamily\b/u);
  assert.doesNotMatch(decisionDoc, /\breadonly\s+providerResponse\b/u);
});

test("PR95 preserves private package metadata existing root export and package bin absence", () => {
  const packageJson = JSON.parse(readDoc(packageJsonPath));
  const decisionDoc = readDoc(decisionDocPath);

  assert.equal(packageJson.private, true);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.equal(Object.hasOwn(packageJson, "bin"), false);
  assertDocMentions(decisionDoc, [
    "The package remains private",
    "continue to expose only the existing package root",
    "No package-level `bin` is approved",
  ]);
});

test("PR95 does not approve dependency expansion", () => {
  const packageJson = JSON.parse(readDoc(packageJsonPath));
  const decisionDoc = readDoc(decisionDocPath);

  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "peerDependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "optionalDependencies"), false);
  assert.deepEqual(packageJson.devDependencies, { typescript: "^5.8.0" });
  assertDocMentions(decisionDoc, [
    "No dependency, devDependency, peerDependency, or optionalDependency expansion is approved",
  ]);
});

test("PR96 exports only the approved guided inspection V1 facade from the package root", async () => {
  const srcIndex = readDoc(srcIndexPath);
  const decisionDoc = readDoc(decisionDocPath);
  const packageRoot = await import("../dist/src/index.js");

  for (const futureApiName of futureApiNames.slice(0, 2)) {
    assert.equal(typeof packageRoot[futureApiName], "function", futureApiName);
  }

  assert.equal("createGuidedInspectionArtifactContract" in packageRoot, false);
  assert.equal("createGuidedInspectionConsumerProof" in packageRoot, false);
  assert.match(srcIndex, /guided-inspection-package-api-v1/u);
  assert.doesNotMatch(srcIndex, /guided-inspection-artifact-contract|guided-inspection-consumer-proof/u);
  assertDocMentions(decisionDoc, [
    "Guided inspection helpers are not package-root exports in PR95",
    "PR96 may implement the approved package-root names later",
  ]);
});

test("PR95 keeps result.json canonical and every guided artifact derived-only", () => {
  const docs = combinedDocs();

  assertDocMentions(docs, [
    "`result.json` remains the canonical machine-consumable Norma truth",
    "derived inspection artifacts only",
    "Derived artifacts may be referenced as inspection outputs only",
    "They must never become source truth, package API truth",
  ]);

  for (const derivedArtifactName of derivedArtifactNames) {
    assertDocMentions(docs, [`\`${derivedArtifactName}\``]);
  }
});

test("PR95 approves structural future semantics without filesystem content parsing or providers", () => {
  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "accept explicit structural artifact refs",
    "return deterministic structural metadata",
    "avoid filesystem reads",
    "avoid parsing JSON, HTML, SVG, or Markdown contents",
    "avoid network, shell, provider, MCP, and CLI calls",
    "avoid mutating caller input",
    "return a structural consumer proof",
    "avoid recomputing Norma results",
    "avoid parsing `result.json` contents",
  ]);
});

test("PR95 does not approve publishing hosted connector provider adapter or inference surfaces", () => {
  const docs = combinedDocs();

  assertDocMentions(docs, blockedSurfaces);

  for (const blockedSurface of blockedSurfaces) {
    assertNoApproval(docs, blockedSurface);
  }
});

function combinedDocs() {
  return [readDoc(decisionDocPath), readDoc(roadmapDocPath)].join("\n");
}

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "i"), `${snippet} should be documented`);
  }
}

function assertNoApproval(doc, surface) {
  for (const approvalPattern of approvalPatterns(surface)) {
    assert.doesNotMatch(
      doc,
      approvalPattern,
      `${surface} approval wording must remain absent`,
    );
  }
}

function approvalPatterns(surface) {
  const surfacePattern = escapeRegExp(surface).replace(/\s+/g, "\\s+");
  const separator = "[\\s:;,.-]+";

  return [
    new RegExp(`\\b${surfacePattern}\\b(?:\\s+(?:is|are|was|were))?${separator}approved\\b`, "i"),
    new RegExp(`(?:^|[\\n.;])\\s*(?:[-*]\\s*)?approved\\b${separator}${surfacePattern}\\b`, "i"),
    new RegExp(`(?:^|[\\n.;])\\s*(?:PR95|this\\s+decision|the\\s+decision|this\\s+PR|the\\s+PR)\\s+approv(?:e|es|ed|ing)\\b[^\\n.;]*\\b${surfacePattern}\\b`, "i"),
  ];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
