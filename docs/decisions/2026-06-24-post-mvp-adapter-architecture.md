# Post-MVP Adapter Architecture And Structured Analyze V1 Boundary

## Status

This is an architecture decision.

R5 is documentation only.

R5 gives no runtime authorization.

R5 implements no adapter, operation, schema, MCP tool, ChatGPT app, hosted
endpoint, UI, provider, import path, dependency, or public submission.

R5 selects exactly one first product outcome:

```text
ChatGPT Structured Analyze V1
```

## Selected Product Outcome

The approved outcome is:

```text
I want ChatGPT to analyze user-supplied structured layout or composition data
through Norma Core before any image, vision, camera, CAD, plugin, hosted-cloud,
or public-app work.
```

This narrows the first post-MVP product slice to explicit structured input. It
does not approve image or perception inference as the first slice.

## Existing Decisions Reconciled

R5 does not replace the earlier adapter architecture. It freezes the first
structured-only product slice and reconciles it with the current decisions:

| Concern | Existing source | Existing decision | R5 action |
| --- | --- | --- | --- |
| MVP guardrails | `docs/MVP_GUARDRAILS.md` | Structured source objects are truth; image, prompt, UI, CAD, cloud, plugin, and artifacts are not source truth. | Preserve. |
| Core glossary | `docs/GLOSSARY_CORE.md` | Core owns deterministic algorithms; packs, profiles, tolerances, provenance, and context stay explicit. | Preserve. |
| Post-MVP architecture | `docs/decisions/2026-06-19-post-mvp-product-vision-and-adapter-architecture.md` | Providers and adapters stay outside core; accepted structured geometry becomes effective input. | Reuse boundary, narrow first slice. |
| Geometry observation | `docs/decisions/2026-06-19-geometry-observation-and-perception-provider-contract-approval.md` | `GeometryObservation` is candidate evidence; `AcceptedGeometry` is the accepted contract. | Reuse truth-state vocabulary. |
| Accepted geometry mapping | `docs/decisions/2026-06-20-accepted-geometry-to-core-mapping-contract-approval.md` | A mapper may consume only validated `AcceptedGeometry@1` and must not infer packs, rules, tolerances, or core results. | Preserve as future mapper boundary. |
| MCP contract | `docs/MCP_TOOL_CONTRACT.md` and `docs/OPERATIONS_RUNBOOK.md` | Current local STDIO MCP inventory is exactly five tools; all five declare `outputSchema`; annotations are absent. | Do not change. |
| Remote/hosted MCP | `docs/MCP_REMOTE_THREAT_MODEL.md` | Remote MCP, auth, deployment, resources, prompts, writes, and arbitrary replay are blocked. | Keep deferred. |

The PR75 image-oriented local/synthetic direction remains historical context and
a later possible path. R5 makes structured user-supplied geometry the selected
first product outcome.

PR0 does not need amendment for this structured-only slice.

## Adapter Boundary

Norma Core remains independent of:

- ChatGPT;
- OpenAI SDKs;
- vision providers;
- camera SDKs;
- CAD SDKs;
- plugin APIs;
- cloud provider APIs;
- MCP transport details;
- UI state.

Adapters depend inward on stable Norma contracts. Norma Core never depends
outward on adapters or hosts.

An adapter may:

- receive external structured data;
- validate transport-level shape;
- map external identifiers to explicit proposed or accepted source identifiers;
- preserve provenance;
- preserve provider, adapter, and version metadata;
- produce deterministic structured handoff data;
- return mapping diagnostics;
- reject unsupported input.

An adapter must not:

- create Norma ratios, rules, packs, profiles, or tolerances;
- infer an implicit pack;
- alter measurement algorithms or evaluation meaning;
- hide validation errors;
- silently repair duplicate IDs;
- silently normalize geometry in a result-affecting way;
- claim that prompts, artifacts, images, UI state, or external assets are source truth;
- issue creative recommendations;
- optimize compositions;
- score beauty.

## Data Flow

The structured-only flow is:

```text
external structured input
-> transport/schema validation
-> proposed structured geometry
-> mapping/normalization with explicit version
-> geometry/domain validation
-> explicit acceptance
-> accepted structured geometry
-> one strict future Norma operation
-> structured result
-> derived artifact, if any
```

Only accepted structured geometry may cross into domain computation.

## Truth-State Model

R5 uses the repository-aligned terms below:

- External input: user-provided structured layout or composition data from a
  host surface.
- Proposed structured geometry: normalized candidate geometry that remains
  visible and unaccepted.
- Accepted structured geometry: validated geometry plus explicit acceptance
  record or acceptance mode; this is the first state that may enter core
  computation.
- Norma core result: deterministic measurements, evaluations, comparison,
  decision, diagnostics, provenance, refs, run identity, and replay-readiness
  data returned by an approved operation.
- Derived artifact: a report, overlay, exported summary, or other projection of
  source objects; it never becomes source truth.

For Structured Analyze V1:

- user-supplied structured geometry may be treated as accepted only after the
  required validation succeeds and the acceptance event is explicit;
- no image/perception conversion exists;
- no model-generated geometry is silently accepted;
- if ChatGPT reformats or proposes a structure, that proposal remains visible
  and requires explicit acceptance before it becomes source input.

## Provenance Model

Adapter handoff must preserve these concepts where applicable:

- source kind;
- external source reference;
- caller-provided source IDs;
- adapter identity;
- adapter version;
- provider identity and version when a provider exists;
- mapping or normalization version;
- transformation steps;
- validation result;
- acceptance actor or acceptance mode;
- original-versus-derived distinction;
- operation context linkage.

Volatile timestamps must not affect deterministic domain identity unless an
existing contract explicitly requires them. Operational metadata that is
non-deterministic must remain outside meaningful domain-result equality.

## Confidence Model

Adapter or perception confidence describes uncertainty in observation or
mapping. It is not:

- measurement;
- evaluation score;
- decision;
- validity;
- acceptance;
- source truth;
- beauty;
- recommendation.

Adapter confidence must remain visible when relevant and must not silently
change geometry, select packs, select ratios, select rules, select profiles, or
select tolerances.

For Structured Analyze V1, no inferred adapter confidence is required. The user
supplies structured data and Norma validates it directly. Norma evaluation
confidence, when present, keeps its current meaning and remains separate from
adapter confidence.

## Validation And Correction

Invalid data must:

- return deterministic structured diagnostics;
- preserve offending IDs and paths;
- not produce successful downstream measurements or evaluations;
- never be silently repaired.

Correction must produce a new explicit proposed or accepted payload. It must not
mutate historical input invisibly.

Duplicate IDs, unsupported primitive kinds, hidden coordinate transforms,
missing pack references, missing profile or tolerance policy, and malformed
operation context must fail validation unless the current approved contract
explicitly defines a deterministic default.

## Ownership

| Item | Owner |
| --- | --- |
| Packs | Explicit approved Norma pack references or pack locks. |
| Ratios | Packs. |
| Rule declarations | Packs. |
| Rule types and algorithms | Core. |
| Evaluation profile | Explicit operation input or approved contract field. |
| Tolerance policy | Explicit operation input or approved contract field. |
| Operation context | Explicit when it can affect output. |
| Mapping or normalization version | Adapter contract. |
| Diagnostics | Contract boundary that detects the condition. |
| Source refs and provenance | Preserved across adapter, operation, and artifact boundaries. |
| Hidden defaults | Not approved. |

Adapters and models cannot invent output-affecting values. Missing
output-affecting values cause validation failure unless an existing approved
contract explicitly defines a deterministic default.

## Failure And Warning Propagation

Adapters and client surfaces must preserve:

- validation status;
- warnings;
- blocking errors;
- diagnostics;
- provenance;
- source refs;
- mismatches;
- artifact freshness;
- replay readiness;
- unknown statuses as non-success.

No adapter may reduce a result to only `valid`, `success`, `score`,
`better/worse`, or a boolean.

The correct user-facing phrasing is that Norma identifies which composition is
closer to the declared proportional system. R5 does not authorize beauty,
quality, taste, intent, or recommendation claims.

## Privacy And Security Boundary

The current official OpenAI Apps SDK and Developer Mode references reinforce
these constraints:

- define the use case and tool boundary before implementation;
- keep tool inputs explicit and outputs predictable;
- validate model-provided input server-side;
- use least privilege;
- include only required structured data;
- do not expose secrets;
- treat prompt injection and malformed input as expected threats;
- keep public app submission separate from private Developer Mode testing;
- account for tool annotations and client confirmation behavior, without
  treating them as server-side enforcement.

References checked for R5:

- `https://developers.openai.com/apps-sdk/plan/use-case`
- `https://developers.openai.com/apps-sdk/plan/tools`
- `https://developers.openai.com/apps-sdk/guides/security-privacy`
- `https://developers.openai.com/apps-sdk/deploy/connect-chatgpt`
- `https://developers.openai.com/api/docs/guides/developer-mode`
- `https://developers.openai.com/apps-sdk/reference`

Norma-specific decisions:

- core computation remains local and pure unless a later hosting decision
  changes deployment;
- adapters validate every input;
- external services use least privilege;
- secrets never enter core source objects;
- raw prompts are not source truth;
- raw external payload retention is an adapter/operator policy, not core logic;
- logs redact secrets and personal data;
- network access belongs outside core;
- prompt injection cannot create packs, rules, tolerances, or geometry;
- no write or destructive action is authorized by this slice.

## Versioning And Compatibility

These boundaries require versioning or explicit compatibility review:

- adapter contract;
- accepted-geometry contract;
- mapping or normalization version;
- operation version;
- output contract;
- pack lock;
- operation context.

Adding a field may be compatible only if current consumers can ignore it
safely. Renaming or removing required fields, changing field meaning, dropping
diagnostics, dropping provenance, or changing result status semantics is
breaking.

## First Authorized Vertical Slice

R5 authorizes exactly:

```text
ChatGPT Structured Analyze V1
```

User experience:

1. User provides explicit structured geometry or composition input.
2. Input is visible to the user.
3. ChatGPT forwards or submits the structured payload.
4. A strict Norma boundary validates it.
5. Norma performs deterministic analysis.
6. ChatGPT reports source-backed structured facts.
7. The result says "closer to the declared proportional system", never
   "better", "more beautiful", or "recommended".

The slice may include:

- structured source geometry;
- explicit source IDs;
- explicit pack reference or pack lock;
- explicit rule, profile, tolerance, and context where required;
- measurements;
- evaluations;
- comparison;
- decision;
- provenance;
- diagnostics;
- run identity;
- replay-readiness.

The slice must not include:

- image upload as source;
- image understanding;
- vision inference;
- camera input;
- OCR;
- CAD import;
- plugin integration;
- file-system ingestion;
- URL fetching;
- free-form prose as geometric source truth;
- automatic geometry generation;
- automatic correction;
- recommendations;
- optimization;
- beauty score;
- arbitrary replay;
- hosted MCP;
- public app submission;
- custom ChatGPT UI or widget.

R5 authorizes architecture only.

R5 must not add an operation, type, schema, or MCP tool.

## R6 Authorization Boundary

R6 may later inspect and propose:

- one stable structured analysis operation;
- at most one corresponding MCP tool if existing tools are insufficient.

`norma.analyzeCompositionV1` is a provisional name only. R6 must decide first
whether an existing stable operation can be exposed or one new stable operation
is required.

Any future R6 tool must:

- accept strict structured input;
- use `additionalProperties: false` where the contract is closed;
- declare `outputSchema` from first introduction;
- preserve the current five tools;
- be read-only and non-destructive;
- avoid open-world or network behavior;
- validate model-provided input server-side;
- preserve diagnostics and provenance;
- expose no `replayRun`;
- expose no arbitrary core execution;
- include deterministic A/B, custom, and invalid tests;
- include direct-core/MCP parity tests;
- remain private/developer-only during manual proof.

R5 does not change current tool annotations. R6 must evaluate annotations
against actual behavior.

## Deferred Capabilities

R5 explicitly defers:

- image or vision provider;
- camera provider;
- OCR;
- CAD adapter;
- Figma or plugin adapter;
- Blender or 3D adapter;
- native file formats;
- cloud provider;
- hosted MCP;
- persistent user storage;
- marketplace or public app submission.

Future perception adapters may output only proposed structured geometry plus
provenance and confidence. They must pass through the same validation and
acceptance boundary before core execution. No future adapter may bypass accepted
structured geometry.

## Documentation Scope

R5 may modify only:

- `docs/decisions/2026-06-24-post-mvp-adapter-architecture.md`;
- `docs/BUSINESS_READINESS_ROADMAP.md`.

R5 must not modify:

- `src/**`;
- `tests/**`;
- `bin/**`;
- `examples/**`;
- `viewer/**`;
- `schemas/**`;
- package or lock files;
- `.github/**`;
- MCP descriptors;
- tool inventory;
- `outputSchema`;
- annotations;
- tunnel, app, DNS, or external verification configuration.

## Guardrail Impact

Historical changed-file guards may not yet recognize the exact R5 docs-only file
set. If full validation fails only because those guards reject the exact final
R5 files, guard maintenance is required as a separate approved action.

Forbidden guard maintenance includes:

- broad `docs/**` allowance;
- broad `tests/**` allowance;
- branch-name bypass;
- early return;
- skipped tests;
- global protected-surface weakening.

Any later guard maintenance must use the exact final R5 file set and preserve
negative proofs for unrelated docs, runtime, package, CI, and protected files.

## Validation Gates

R5 is acceptable only when:

- the selected outcome is explicit;
- exactly one adapter boundary is selected;
- exactly one first vertical slice is selected;
- no runtime code changes;
- no test changes unless a later approved guard PR authorizes them;
- no schema, tool, annotation, package, lockfile, dependency, or CI changes;
- current MCP inventory remains exactly five tools;
- structured data remains source truth;
- proposed and accepted geometry remain distinct;
- provenance is mandatory;
- confidence is not score;
- no hidden pack, rule, profile, tolerance, or context is authorized;
- invalid input cannot reach downstream computation;
- image, vision, CAD, plugin, cloud, hosted MCP, and public submission remain
  deferred;
- R6 scope is explicit.

## Rollback

Rollback is to revert only:

- `docs/decisions/2026-06-24-post-mvp-adapter-architecture.md`;
- the R5 roadmap reference in `docs/BUSINESS_READINESS_ROADMAP.md`.

No runtime migration, data migration, tool migration, or package migration is
required.
