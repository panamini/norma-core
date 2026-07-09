# PR121: Controlled Live Provider Smoke Outcome Checkpoint

## Status

Accepted as a local, manually gated smoke checkpoint.

The controlled live provider smoke returned `status: "ok"` after the local
operator selected an accessible GPT-5-family vision model and the smoke request
used low reasoning effort with low image detail.

## Evidence Boundary

- The smoke was run only through the explicit manual live gate.
- The provider path remained `openai-responses-vision`.
- Redacted smoke artifacts were written outside the repository.
- Raw provider output was not persisted.
- Raw provider response body was not persisted.
- Raw request body was not persisted.
- Raw image bytes and base64 were not persisted.
- The local absolute input image path was not persisted.
- API keys, bearer tokens, and credentials were not persisted.
- The exact model environment value was not recorded in this checkpoint.

## Request Boundary

The active smoke request remains a receipt-only Responses API call:

- `store: false`;
- `reasoning.effort: "low"`;
- image `detail: "low"`;
- no tools;
- no provider SDK;
- no package-root export;
- no provider response fixture.

The prompt remains limited to confirming image receipt. It does not ask for
geometry, ratios, families, recommendations, corrections, optimization,
scoring, accepted geometry, or Core truth.

## Non-Goals

This checkpoint does not approve:

- production OpenAI integration;
- provider output as Norma truth;
- automatic acceptance;
- confidence-threshold acceptance;
- provider-derived accepted structured geometry;
- Core input from provider output;
- Structured Analyze execution from provider output;
- `result.json` production from provider output;
- package/API readiness;
- hosted MCP;
- ChatGPT connector runtime;
- CAD/Figma adapters;
- upload, auth, OAuth, deployment, or public product launch.

## Outcome

The successful smoke proves only that the local, manually gated, redacted
provider call can complete with an accessible model and the current receipt-only
request shape.

It does not prove that external evidence can become accepted geometry. The
existing boundary still applies:

```text
provider output -> untrusted evidence -> explicit acceptance -> accepted geometry -> Core
```

## Next Step

The next PR should inspect the redacted success artifacts and define the first
controlled provider-evidence replay or acceptance handoff step without raw
provider persistence, automatic acceptance, package/API expansion, or Core truth
bypass.
