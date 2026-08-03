import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES,
  PERSONAL_VISUAL_HARMONY_SEGMENTATION_RESPONSE_CONTRACT_ID,
  PersonalVisualHarmonySegmentationClient,
  PersonalVisualHarmonySegmentationError,
  createPersonalVisualHarmonySegmentationClientFromEnv,
  downloadPersonalVisualHarmonySourceImage,
  personalVisualHarmonySourceImageAllowedOriginsFromEnv,
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

test("segmentation client normalizes one bounded semantic text prompt", async () => {
  let request;
  const fetch = async (url, init) => {
    if (init.method === "GET") return new Response(null, { status: 200 });
    request = JSON.parse(init.body);
    return Response.json(responseFor(request));
  };
  await clientWith(fetch).segment({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    prompt: { kind: "text", text: "  yellow   school bus  " },
  });
  assert.deepEqual(request.prompt, { kind: "text", text: "yellow school bus" });
});

test("segmentation client rejects empty, invalid, and overlong semantic targets before network access", async () => {
  let fetchCount = 0;
  const fetch = async () => {
    fetchCount += 1;
    return new Response(null, { status: 500 });
  };
  for (const text of ["", "   ", "bad\nvalue", "x".repeat(501)]) {
    await assert.rejects(
      clientWith(fetch).segment({
        sourceImageBytes: imageBytes,
        sourceImageMediaType: "image/png",
        prompt: { kind: "text", text },
      }),
      (error) => error.code === "provider_response_invalid",
    );
  }
  assert.equal(fetchCount, 0);
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

test("segmentation client waits through a bounded cold start and never sends inference after readiness failure", async () => {
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
    clientWith(fetch, { deadlineMs: 1_000 }).segment({
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

test("segmentation client reserves its final bounded probe for the readiness deadline", async () => {
  let getCount = 0;
  let postCount = 0;
  let now = 0;
  const delays = [];
  const fetch = async (_url, init) => {
    if (init.method === "GET") {
      getCount += 1;
      return new Response(null, {
        status: getCount < PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES ? 503 : 200,
      });
    }
    postCount += 1;
    const request = JSON.parse(init.body);
    return Response.json(responseFor(request));
  };
  const client = new PersonalVisualHarmonySegmentationClient({
    endpointUrl: "https://sam3.example.test/",
    modalKey: "key-private",
    modalSecret: "secret-private",
    availabilityProbeDelayMs: 0,
    deadlineMs: 1_000,
  }, {
    fetch,
    delay: async (milliseconds) => {
      delays.push(milliseconds);
      now += milliseconds;
    },
    now: () => now,
  });
  const result = await client.segment({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    prompt,
  });
  assert.equal(getCount, PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES);
  assert.equal(postCount, 1);
  assert.equal(result.receipt.availabilityProbeCount, PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES);
  assert.ok(now >= 700, `expected final bounded wait, got ${now}`);
  assert.ok(now < 1_000, `final probe crossed the cutoff at ${now}`);
});

test("segmentation client observes readiness during the final 250ms without exceeding the probe cap", async () => {
  let now = 0;
  let postCount = 0;
  const probeTimes = [];
  const client = new PersonalVisualHarmonySegmentationClient({
    endpointUrl: "https://sam3.example.test/",
    modalKey: "key-private",
    modalSecret: "secret-private",
    availabilityProbeDelayMs: 5_000,
    deadlineMs: 1_000,
  }, {
    now: () => now,
    delay: async (milliseconds) => {
      now += milliseconds;
    },
    fetch: async (_url, init) => {
      if (init.method === "GET") {
        probeTimes.push(now);
        return new Response(null, { status: now >= 875 ? 200 : 503 });
      }
      postCount += 1;
      const request = JSON.parse(init.body);
      return Response.json(responseFor(request));
    },
  });

  const result = await client.segment({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    prompt,
  });

  assert.equal(postCount, 1);
  assert.equal(result.receipt.availabilityProbeCount, probeTimes.length);
  assert.ok(probeTimes.length <= PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES);
  assert.equal(probeTimes.at(-2), 750);
  assert.equal(probeTimes.at(-1), 875);
  assert.ok(probeTimes.every((probeAt) => probeAt < 1_000));
});

test("segmentation client does not create the Base64 request before readiness", () => {
  const source = readFileSync(
    new URL("../src/personal-visual-harmony-segmentation.ts", import.meta.url),
    "utf8",
  );
  const segmentStart = source.indexOf("public async segment(");
  const segmentEnd = source.indexOf("\n  async #awaitAvailability", segmentStart);
  const segmentSource = source.slice(segmentStart, segmentEnd);
  const readinessIndex = segmentSource.indexOf("await this.#awaitAvailability");
  const encodingIndex = segmentSource.indexOf("imageBase64: bytesToBase64");
  assert.notEqual(readinessIndex, -1);
  assert.notEqual(encodingIndex, -1);
  assert.ok(readinessIndex < encodingIndex);
});

test("segmentation client rejects readiness and inference responses after the absolute deadline", async (context) => {
  await context.test("late readiness performs zero inference", async () => {
    let now = 0;
    let postCount = 0;
    const client = new PersonalVisualHarmonySegmentationClient({
      endpointUrl: "https://sam3.example.test/",
      modalKey: "key-private",
      modalSecret: "secret-private",
      deadlineMs: 1_000,
      availabilityProbeDelayMs: 0,
    }, {
      now: () => now,
      delay: async (milliseconds) => {
        now += milliseconds;
      },
      fetch: async (_url, init) => {
        if (init.method === "GET") {
          now = 1_001;
          return new Response(null, { status: 200 });
        }
        postCount += 1;
        return new Response(null, { status: 500 });
      },
    });
    await assert.rejects(
      client.segment({
        sourceImageBytes: imageBytes,
        sourceImageMediaType: "image/png",
        prompt,
      }),
      (error) => error.code === "provider_timeout",
    );
    assert.equal(postCount, 0);
  });

  await context.test("late inference response is rejected", async () => {
    let now = 0;
    let postCount = 0;
    const client = new PersonalVisualHarmonySegmentationClient({
      endpointUrl: "https://sam3.example.test/",
      modalKey: "key-private",
      modalSecret: "secret-private",
      deadlineMs: 1_000,
      availabilityProbeDelayMs: 0,
    }, {
      now: () => now,
      delay: async (milliseconds) => {
        now += milliseconds;
      },
      fetch: async (_url, init) => {
        if (init.method === "GET") return new Response(null, { status: 200 });
        postCount += 1;
        const request = JSON.parse(init.body);
        now = 1_001;
        return Response.json(responseFor(request));
      },
    });
    await assert.rejects(
      client.segment({
        sourceImageBytes: imageBytes,
        sourceImageMediaType: "image/png",
        prompt,
      }),
      (error) => error.code === "provider_timeout",
    );
    assert.equal(postCount, 1);
  });
});

test("segmentation client rejects a provider response decoded after the absolute deadline", async () => {
  let now = 0;
  let postCount = 0;
  const client = new PersonalVisualHarmonySegmentationClient({
    endpointUrl: "https://sam3.example.test/",
    modalKey: "key-private",
    modalSecret: "secret-private",
    deadlineMs: 1_000,
    availabilityProbeDelayMs: 0,
  }, {
    now: () => now,
    delay: async () => {},
    fetch: async (_url, init) => {
      if (init.method === "GET") return new Response(null, { status: 200 });
      postCount += 1;
      const request = JSON.parse(init.body);
      const bytes = new TextEncoder().encode(JSON.stringify(responseFor(request)));
      let emitted = false;
      return {
        body: {
          cancel: async () => {},
          getReader: () => ({
            cancel: async () => {},
            read: async () => {
              if (emitted) return { done: true, value: undefined };
              emitted = true;
              now = 1_001;
              return { done: false, value: bytes };
            },
          }),
        },
        headers: new Headers({ "content-type": "application/json" }),
        ok: true,
        status: 200,
      };
    },
  });

  await assert.rejects(
    client.segment({
      sourceImageBytes: imageBytes,
      sourceImageMediaType: "image/png",
      prompt,
    }),
    (error) => error.code === "provider_timeout",
  );
  assert.equal(postCount, 1);
});

test("segmentation client rechecks the deadline after synchronous request body construction", async () => {
  let nowReads = 0;
  let postCount = 0;
  const client = new PersonalVisualHarmonySegmentationClient({
    endpointUrl: "https://sam3.example.test/",
    modalKey: "key-private",
    modalSecret: "secret-private",
    deadlineMs: 1_000,
    availabilityProbeDelayMs: 0,
  }, {
    now: () => {
      nowReads += 1;
      return nowReads <= 4 ? 0 : 1_000;
    },
    delay: async () => {},
    fetch: async (_url, init) => {
      if (init.method === "GET") return new Response(null, { status: 200 });
      postCount += 1;
      return new Response(null, { status: 500 });
    },
  });

  await assert.rejects(
    client.segment({
      sourceImageBytes: imageBytes,
      sourceImageMediaType: "image/png",
      prompt,
    }),
    (error) => error.code === "provider_timeout",
  );
  assert.equal(postCount, 0);

  const source = readFileSync(
    new URL("../src/personal-visual-harmony-segmentation.ts", import.meta.url),
    "utf8",
  );
  const segmentStart = source.indexOf("public async segment(");
  const segmentEnd = source.indexOf("\n  async #awaitAvailability", segmentStart);
  const segmentSource = source.slice(segmentStart, segmentEnd);
  const bodyIndex = segmentSource.indexOf("const requestBody = JSON.stringify(request)");
  const deadlineRecheckIndex = segmentSource.indexOf(
    "if (controller.signal.aborted || this.#now() >= deadlineAtMs)",
    bodyIndex,
  );
  const postIndex = segmentSource.indexOf("const response = await this.#fetch", bodyIndex);
  assert.notEqual(bodyIndex, -1);
  assert.ok(bodyIndex < deadlineRecheckIndex);
  assert.ok(deadlineRecheckIndex < postIndex);
});

test("segmentation client sends exactly one inference after a cold-start readiness wait", async () => {
  let getCount = 0;
  let postCount = 0;
  const fetch = async (_url, init) => {
    if (init.method === "GET") {
      getCount += 1;
      return new Response(null, { status: getCount < 4 ? 503 : 200 });
    }
    postCount += 1;
    const request = JSON.parse(init.body);
    return Response.json(responseFor(request));
  };
  const result = await clientWith(fetch, { deadlineMs: 1_000 }).segment({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    prompt,
  });
  assert.equal(getCount, 4);
  assert.equal(postCount, 1);
  assert.equal(result.receipt.availabilityProbeCount, 4);
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
  await context.test("unexpected provider identity", async () => {
    const fetch = async (_url, init) => {
      if (init.method === "GET") return new Response(null, { status: 200 });
      const request = JSON.parse(init.body);
      return Response.json(responseFor(request, {
        provider: {
          providerId: "other-provider",
          modelId: "other-model",
          modelVersion: "other-version",
        },
      }));
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
  await context.test("ready response with abstention reason", async () => {
    const fetch = async (_url, init) => {
      if (init.method === "GET") return new Response(null, { status: 200 });
      const request = JSON.parse(init.body);
      return Response.json(responseFor(request, { abstentionReason: "ambiguous" }));
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

test("segmentation readiness backoff uses the remaining deadline window and then fails closed", async () => {
  let probeCount = 0;
  const client = new PersonalVisualHarmonySegmentationClient({
    endpointUrl: "https://sam3.example.test/",
    modalKey: "key-private",
    modalSecret: "secret-private",
    deadlineMs: 1_000,
    availabilityProbeDelayMs: 5_000,
  }, {
    fetch: async () => {
      probeCount += 1;
      return new Response(null, { status: 503 });
    },
  });
  const startedAt = Date.now();
  await assert.rejects(
    client.segment({
      sourceImageBytes: imageBytes,
      sourceImageMediaType: "image/png",
      prompt,
    }),
    (error) => error.code === "provider_unavailable",
  );
  assert.equal(probeCount, 3);
  assert(Date.now() - startedAt < 3_000);
});

test("configuration is disabled only when all provider variables are absent", () => {
  assert.equal(createPersonalVisualHarmonySegmentationClientFromEnv({}), null);
  assert.throws(
    () => createPersonalVisualHarmonySegmentationClientFromEnv({
      NORMA_PERSONAL_VISUAL_HARMONY_SEGMENTATION_DEADLINE_MS: "300000",
    }),
    (error) => error.code === "configuration_invalid",
  );
  assert.throws(
    () => createPersonalVisualHarmonySegmentationClientFromEnv({
      NORMA_PERSONAL_VISUAL_HARMONY_SEGMENTATION_URL: "https://sam3.example.test/",
    }),
    (error) => error.code === "configuration_invalid",
  );
  const configured = {
    NORMA_PERSONAL_VISUAL_HARMONY_SEGMENTATION_URL: "https://sam3.example.test/",
    NORMA_PERSONAL_VISUAL_HARMONY_MODAL_KEY: "key",
    NORMA_PERSONAL_VISUAL_HARMONY_MODAL_SECRET: "secret",
    NORMA_PERSONAL_VISUAL_HARMONY_SOURCE_IMAGE_ALLOWED_ORIGINS:
      "https://files.example.test,https://files-backup.example.test",
  };
  assert(createPersonalVisualHarmonySegmentationClientFromEnv(configured));
  assert.throws(
    () => createPersonalVisualHarmonySegmentationClientFromEnv({
      ...configured,
      NORMA_PERSONAL_VISUAL_HARMONY_SEGMENTATION_DEADLINE_MS: "not-a-duration",
    }),
    (error) => error.code === "configuration_invalid",
  );
  assert.deepEqual(personalVisualHarmonySourceImageAllowedOriginsFromEnv(configured), [
    "https://files.example.test",
    "https://files-backup.example.test",
  ]);
});

test("source downloads reject untrusted origins before fetch and cancel declared oversize bodies", async () => {
  let fetchCount = 0;
  await assert.rejects(
    downloadPersonalVisualHarmonySourceImage({
      url: "https://untrusted.example.test/image.png",
      allowedOrigins: ["https://files.example.test"],
      expectedMediaType: "image/png",
      fetch: async () => {
        fetchCount += 1;
        return new Response(imageBytes);
      },
    }),
    (error) => error.code === "source_download_failed",
  );
  assert.equal(fetchCount, 0);

  let cancelled = false;
  const oversizedBody = new ReadableStream({
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    downloadPersonalVisualHarmonySourceImage({
      url: "https://files.example.test/image.png",
      allowedOrigins: ["https://files.example.test"],
      expectedMediaType: "image/png",
      maxBytes: 10,
      fetch: async () => new Response(oversizedBody, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": "11",
        },
      }),
    }),
    (error) => error.code === "source_too_large",
  );
  assert.equal(cancelled, true);
});

test("source downloads cancel bodies rejected by media-type validation", async () => {
  for (const testCase of [
    { expectedMediaType: "image/png", responseMediaType: "image/jpeg" },
    { expectedMediaType: "image/png", responseMediaType: "image/gif" },
    { expectedMediaType: null, responseMediaType: null },
  ]) {
    let cancelled = false;
    const body = new ReadableStream({
      cancel() {
        cancelled = true;
      },
    });
    await assert.rejects(
      downloadPersonalVisualHarmonySourceImage({
        url: "https://files.example.test/image",
        allowedOrigins: ["https://files.example.test"],
        expectedMediaType: testCase.expectedMediaType,
        fetch: async () => new Response(body, {
          status: 200,
          headers: testCase.responseMediaType === null
            ? {}
            : { "content-type": testCase.responseMediaType },
        }),
      }),
      (error) => error.code === "source_media_type_invalid",
    );
    assert.equal(cancelled, true);
  }
});

test("segmentation rejects provider-unsupported image media types before network access", async () => {
  let fetchCount = 0;
  await assert.rejects(
    clientWith(async () => {
      fetchCount += 1;
      return new Response(null, { status: 500 });
    }).segment({
      sourceImageBytes: imageBytes,
      sourceImageMediaType: "image/gif",
      prompt,
    }),
    (error) => error.code === "source_media_type_invalid",
  );
  assert.equal(fetchCount, 0);
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
