import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  controlledLiveProviderSmokeOutcomeCheckpointChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const checkpointPath = new URL(
  "../docs/decisions/2026-07-09-controlled-live-provider-smoke-outcome-checkpoint.md",
  import.meta.url,
);
const roadmapPath = new URL("../docs/BUSINESS_READINESS_ROADMAP.md", import.meta.url);

const forbiddenCheckpointPatterns = [
  /sk-[A-Za-z0-9_-]+/u,
  /Bearer\s+[A-Za-z0-9_.-]+/u,
  /data:image\/[a-z0-9.+-]+;base64,/iu,
  /"request"\s*:/iu,
  /"body"\s*:/iu,
  /"message"\s*:/iu,
  /provider request id/iu,
  /chain[- ]of[- ]thought/iu,
  /\/Users\/pana\/|\/Volumes\/video\//u,
];

test("PR121 checkpoint records a redacted controlled live provider smoke success only", async () => {
  const checkpoint = await readFile(checkpointPath, "utf8");

  assert.match(checkpoint, /status: "ok"/u);
  assert.match(checkpoint, /manual live gate/u);
  assert.match(checkpoint, /accessible GPT-5-family vision model/u);
  assert.match(checkpoint, /reasoning\.effort: "low"/u);
  assert.match(checkpoint, /image `detail: "low"`/u);
  assert.match(checkpoint, /Redacted smoke artifacts were written outside the repository/u);

  assert.match(checkpoint, /Raw provider output was not persisted/u);
  assert.match(checkpoint, /Raw provider response body was not persisted/u);
  assert.match(checkpoint, /Raw request body was not persisted/u);
  assert.match(checkpoint, /Raw image bytes and base64 were not persisted/u);
  assert.match(checkpoint, /local absolute input image path was not persisted/u);
  assert.match(checkpoint, /API keys, bearer tokens, and credentials were not persisted/u);
  assert.match(checkpoint, /exact model environment value was not recorded/u);

  assert.match(checkpoint, /provider output -> untrusted evidence -> explicit acceptance -> accepted geometry -> Core/u);
  assert.match(checkpoint, /does not approve:\n\n- production OpenAI integration/u);
  assert.match(checkpoint, /provider output as Norma truth/u);
  assert.match(checkpoint, /automatic acceptance/u);
  assert.match(checkpoint, /provider-derived accepted structured geometry/u);
  assert.match(checkpoint, /Core input from provider output/u);
  assert.match(checkpoint, /`result\.json` production from provider output/u);
  assert.match(checkpoint, /package\/API readiness/u);
  assert.match(checkpoint, /hosted MCP/u);
  assert.match(checkpoint, /ChatGPT connector runtime/u);
  assert.match(checkpoint, /CAD\/Figma adapters/u);

  for (const pattern of forbiddenCheckpointPatterns) {
    assert.doesNotMatch(checkpoint, pattern);
  }
});

test("PR121 roadmap update records smoke success without product readiness claims", async () => {
  const roadmap = await readFile(roadmapPath, "utf8");
  const section = roadmap.slice(roadmap.indexOf("PR121 records the first redacted"));

  assert.match(section, /PR121: controlled live provider smoke outcome checkpoint/u);
  assert.match(section, /manual operator gates/u);
  assert.match(section, /accessible GPT-5\nfamily vision model/u);
  assert.match(section, /`reasoning\.effort: "low"`/u);
  assert.match(section, /image `detail: "low"`/u);
  assert.match(section, /Provider output remains evidence only/u);
  assert.match(section, /no\naccepted structured geometry, Core input, Structured Analyze run, or\n`result\.json` was produced/u);
  assert.match(section, /does not approve production OpenAI integration/u);
  assert.match(section, /package\/API readiness/u);
  assert.match(section, /hosted MCP/u);
  assert.match(section, /ChatGPT runtime/u);
  assert.match(section, /CAD\/Figma adapters/u);
  assert.match(section, /automatic acceptance/u);
  assert.match(section, /provider truth/u);

  assert.doesNotMatch(section, /production-ready|product-ready|package-ready|provider truth approved/iu);
  assert.doesNotMatch(section, /sk-[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9_.-]+|data:image\/[a-z0-9.+-]+;base64,/iu);
});

test("PR121 changed-file guard accepts only the smoke outcome checkpoint scope", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderSmokeOutcomeCheckpointChangedFiles),
    controlledLiveProviderSmokeOutcomeCheckpointChangedFiles,
  );

  for (const forbiddenFile of [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "src/providers/openai.ts",
    "src/providers/openai-sdk.ts",
    "src/provider-runtime/openai.ts",
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "docs/examples/openai-vision-pilot.md",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...controlledLiveProviderSmokeOutcomeCheckpointChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});
