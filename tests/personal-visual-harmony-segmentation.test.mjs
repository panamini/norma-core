import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES,
  PERSONAL_VISUAL_HARMONY_SEGMENTATION_RESPONSE_CONTRACT_ID,
  PersonalVisualHarmonySegmentationClient,
  PersonalVisualHarmonySegmentationError,
  createPersonalVisualHarmonySegmentationClientFromEnv,
} from "../dist/src/personal-visual-harmony-segmentation.js";

const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const sourceImageContentIdentity =
  `sha256:${createHash("sha256").update(imageBytes).digest("hex")}`;
const prompt = {
  kind: "interactive",
  points: [],
  box: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
};
const mask = {
  contractId: "norma.personal-visual-harmony-segmentation-mask@1",
  contractVersion: 1,
  width: 10,
  height: 10,
  runs: [
    { y: 2, startX: 2, endXExclusive: 6 },
    { y: 3, startX: 2, endXExclusive: 6 },
    { y: 4, startX: 2, endXExclusive: 6 },
    { y: 5, startX: 2, endXExclusive: 6 },
  ],
};

function responseFor(request, overrides = {}) {
  return {
    contractId: PERSONAL_VISUAL_HARMONY_SEGMENTATION_RESPONSE_CONTRACT_ID,
    contractVersion: 1,
    status: "ready",
    requestIdentity: request.requestIdentity,
    sourceImageContentIdentity: request.sourceImageContentIdentity,
    provider: {
      providerId: "modal-sam3",
      modelId: "facebook/sam3",
      modelVersion: "3c879f39826c281e95690f02c7821c4de09afae7",
    },
    mask,
    providerConfidence: 0.9,
    abstentionReason: null,
    ...overrides,
  };
}

function clientWith(fetch, overrides = {}) {
  return new PersonalVisualHarmonySegmentationClient({
    endpointUrl: "https://sam3.example.test/",
    modalKey: "key-private",
    modalSecret: "secret-private",
    availabilityProbeDelayMs: 0,
    ...overrides,
  }, {
    fetch,
    delay: async () => {},
  });
}

test("segmentation client creates deterministic source-bound receipts and one inference call", async () => {
  let postCount = 0;
  const fetch = async (url, init) => {
    if (init.method === "GET") return new Response("ready", { status: 200 });
    postCount += 1;
    assert.equal(init.headers["Modal-Key"], "key-private");
    assert.equal(init.headers["Modal-Secret"], "secret-private");
    const request = JSON.parse(init.body);
    assert.equal(request.sourceImageContentIdentity, sourceImageContentIdentity);
    return Response.json(responseFor(request));
  };
  const client = clientWith(fetch);
  const first = await client.segment({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    prompt,
  });
  const second = await client.segment({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    prompt,
  });
  assert.equal(postCount, 2);
  assert.equal(first.receipt.inferenceAttempts, 1);
  assert.equal(first.receipt.availabilityProbeCount, 1);
  assert.equal(first.receipt.receiptIdentity, second.receipt.receiptIdentity);
  assert.equal(first.response.sourceImageContentIdentity, sourceImageContentIdentity);
  assert.equal(first.receipt.coreRun, false);
});

test("segmentation client accepts a bounded provider abstention", async () => {
  const fetch = async (_url, init) => {
    if (init.method === "GET") return new Response(null, { status: 200 });
    const request = JSON.parse(init.body);
    return Response.json(responseFor(request, {
      status: "abstained",
      mask: null,
      providerConfidence: null,
      abstentionReason: "no_mask",
    }));
  };
  const result = await clientWith(fetch).segment({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    prompt,
  });
  assert.equal(result.response.status, "abstained");
  assert.equal(result.response.mask, null);
  assert.equal(result.receipt.status, "abstained");
});

test("segmentation client limits cold-start probes to three and never sends inference", async () => {
  let getCount = 0;
  let postCount = 0;
  const fetch = async (_url, init) => {
    if (init.method === "GET") {
      getCount += 1;
      return new Response(null, { status: 503 });
    }
    postCount += 1;
    return new Response(null, { status: 500 });
  };
  await assert.rejects(
    clientWith(fetch).segment({
      sourceImageBytes: imageBytes,
      sourceImageMediaType: "image/png",
      prompt,
    }),
    (error) => error instanceof PersonalVisualHarmonySegmentationError
      && error.code === "provider_unavailable",
  );
  assert.equal(getCount, PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES);
  assert.equal(postCount, 0);
});

test("segmentation client never replays an inference POST after 503", async () => {
  let postCount = 0;
  const fetch = async (_url, init) => {
    if (init.method === "GET") return new Response(null, { status: 200 });
    postCount += 1;
    return new Response(null, { status: 503 });
  };
  await assert.rejects(
    clientWith(fetch).segment({
      sourceImageBytes: imageBytes,
      sourceImageMediaType: "image/png",
      prompt,
    }),
    (error) => error.code === "provider_unavailable",
  );
  assert.equal(postCount, 1);
});

test("segmentation client fails closed on source mismatch, malformed, and oversized responses", async (context) => {
  await context.test("source mismatch", async () => {
    const fetch = async (_url, init) => {
      if (init.method === "GET") return new Response(null, { status: 200 });
      const request = JSON.parse(init.body);
      return Response.json(responseFor(request, {
        sourceImageContentIdentity: `sha256:${"0".repeat(64)}`,
      }));
    };
    await assert.rejects(
      clientWith(fetch).segment({
        sourceImageBytes: imageBytes,
        sourceImageMediaType: "image/png",
        prompt,
      }),
      (error) => error.code === "source_mismatch",
    );
  });
  await context.test("malformed", async () => {
    const fetch = async (_url, init) => init.method === "GET"
      ? new Response(null, { status: 200 })
      : Response.json({ status: "ready" });
    await assert.rejects(
      clientWith(fetch).segment({
        sourceImageBytes: imageBytes,
        sourceImageMediaType: "image/png",
        prompt,
      }),
      (error) => error.code === "provider_response_invalid",
    );
  });
  await context.test("unexpected response field", async () => {
    const fetch = async (_url, init) => {
      if (init.method === "GET") return new Response(null, { status: 200 });
      const request = JSON.parse(init.body);
      return Response.json({
        ...responseFor(request),
        unexpected: null,
      });
    };
    await assert.rejects(
      clientWith(fetch).segment({
        sourceImageBytes: imageBytes,
        sourceImageMediaType: "image/png",
        prompt,
      }),
      (error) => error.code === "provider_response_invalid",
    );
  });
  await context.test("oversized", async () => {
    const fetch = async (_url, init) => init.method === "GET"
      ? new Response(null, { status: 200 })
      : new Response("{}", {
          status: 200,
          headers: { "content-length": "9999" },
        });
    await assert.rejects(
      clientWith(fetch, { maxProviderResponseBytes: 100 }).segment({
        sourceImageBytes: imageBytes,
        sourceImageMediaType: "image/png",
        prompt,
      }),
      (error) => error.code === "provider_response_too_large",
    );
  });
});

test("segmentation client aborts a bounded inference deadline", async () => {
  const fetch = async (_url, init) => {
    if (init.method === "GET") return new Response(null, { status: 200 });
    return new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
  };
  await assert.rejects(
    clientWith(fetch, { deadlineMs: 1_000 }).segment({
      sourceImageBytes: imageBytes,
      sourceImageMediaType: "image/png",
      prompt,
    }),
    (error) => error.code === "provider_timeout",
  );
});

test("configuration is disabled only when all provider variables are absent", () => {
  assert.equal(createPersonalVisualHarmonySegmentationClientFromEnv({}), null);
  assert.throws(
    () => createPersonalVisualHarmonySegmentationClientFromEnv({
      NORMA_PERSONAL_VISUAL_HARMONY_SEGMENTATION_URL: "https://sam3.example.test/",
    }),
    (error) => error.code === "configuration_invalid",
  );
});

test("segmentation errors redact credentials, URLs, prompts, and provider bodies", async () => {
  const sensitiveValues = [
    "key-private",
    "secret-private",
    "sam3.example.test",
    "private visual prompt",
    "provider body",
  ];
  const fetch = async (_url, init) => {
    if (init.method === "GET") return new Response(null, { status: 200 });
    return new Response("provider body", { status: 500 });
  };
  const textPrompt = { kind: "text", text: "private visual prompt" };
  const error = await clientWith(fetch).segment({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    prompt: textPrompt,
  }).then(
    () => null,
    (caught) => caught,
  );
  assert(error instanceof PersonalVisualHarmonySegmentationError);
  for (const sensitive of sensitiveValues) {
    assert.doesNotMatch(error.message, new RegExp(sensitive, "u"));
  }
});
