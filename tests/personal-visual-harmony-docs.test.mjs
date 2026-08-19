import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoDoc = readFileSync(
  join(repoRoot, "docs/examples/personal-chatgpt-visual-harmony-demo.md"),
  "utf8",
);
const assessmentDoc = readFileSync(
  join(repoRoot, "docs/decisions/2026-07-17-triangle-center-assessment.md"),
  "utf8",
);
const postPr318DecisionDoc = readFileSync(
  join(repoRoot, "docs/decisions/2026-08-19-post-pr318-private-observation-gate.md"),
  "utf8",
);

test("the active visual-harmony guide records the post-PR318 private closure", () => {
  assert.match(demoDoc, /Post-PR318 current closure \(2026-08-19\)/u);
  assert.match(demoDoc, /The PR318 baseline and deployed merge SHA is/u);
  assert.match(demoDoc, /1e39e026f8df5d358fbfce62c6acc4bac0cbc8e0/u);
  assert.match(demoDoc, /PR312 added the direct mouse A\/B\s+measurement path/u);
  assert.match(demoDoc, /PR314 broadened automatic harmonic discovery/u);
  assert.match(demoDoc, /bdc416c8-7ff3-4206-b456-e20ead106b77/u);
  assert.match(demoDoc, /Direct A\/B confirmation\s+validates only the two declared image-plane segment measurements; it does not\s+confirm structured geometry, and Core remains stopped after confirmation/u);
  assert.match(demoDoc, /The next gate is observation-led maintenance/u);
  assert.match(demoDoc, /Public ChatGPT app submission, collaborator\s+access, commercial qualification, and public npm publication remain deferred/u);
  assert.doesNotMatch(demoDoc, /Exact `main` is/u);
  assert.match(postPr318DecisionDoc, /Widget publication metadata is not public publication/u);
  assert.match(postPr318DecisionDoc, /existing prepared surface-guide candidates/u);
  assert.match(postPr318DecisionDoc, /Its confirmation validates only the two declared\s+image-plane segment measurements; it does not confirm structured geometry, and\s+Core remains stopped after confirmation/u);
  assert.match(postPr318DecisionDoc, /Earlier full-suite evidence, collected before the final wording correction:\s+- `npm run build`;\s+- full `npm test`\./u);
  assert.doesNotMatch(postPr318DecisionDoc, /existing reviewed guides/iu);
  assert.doesNotMatch(postPr318DecisionDoc, /Core remains stopped until the user confirms/iu);
  assert.doesNotMatch(postPr318DecisionDoc, /automatic relationships? (?:is|are) source truth/iu);
});

test("the active visual-harmony guide preserves conditional triangle prerequisites", () => {
  assert.match(demoDoc, /PR240 adds the preparation diagnostic and `triangleRequestCount`/u);
  assert.match(
    demoDoc,
    /conditional pre-confirmation order is: keep its parent guides selected; enable \*\*Prolongements\*\*; if any vertex uses a format-diagonal parent, enable \*\*Diagonales format\*\*; if any vertex is a junction intersection, enable \*\*Angles jonction\*\*; enable \*\*Triangles\*\*; then enable the requested triangle family/u,
  );
  assert.doesNotMatch(
    demoDoc,
    /pre-confirmation dependency order is: keep the three parent guides selected, enable \*\*Prolongements\*\*, enable \*\*Triangles\*\*/u,
  );
  assert.match(demoDoc, /\*\*Centroïde\*\* derives exactly one point as the arithmetic mean/u);
  assert.match(demoDoc, /one `triangleCentroids` point/u);
  assert.match(demoDoc, /candidateEvidenceOnly=true/u);
  assert.doesNotMatch(demoDoc, /No centroid, circumcenter, incenter, or orthocenter is exposed/u);
  assert.doesNotMatch(demoDoc, /These layers expose no centroid/u);
});

test("the triangle-center assessment records the bounded implementation without granting authority", () => {
  assert.match(assessmentDoc, /The centroid is the first safe triangle-center candidate and is implemented/u);
  assert.match(assessmentDoc, /sourceTruth: `?false`?/u);
  assert.match(assessmentDoc, /coreAuthority: `?false`?/u);
  assert.match(assessmentDoc, /CC-20260717-TRIANGLE-CENTROID-v1/u);
  assert.match(assessmentDoc, /CC-20260717-TRIANGLE-CENTROID-v2/u);
  assert.doesNotMatch(assessmentDoc, /not executed/u);
  assert.doesNotMatch(assessmentDoc, /this PR must not expose or render it/u);
});
