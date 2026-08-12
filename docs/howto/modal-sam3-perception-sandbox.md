# Modal SAM 3 perception sandbox

Status: repository-ready, live setup not performed by this change.

This is a custom authenticated Modal Server deployed with the Python SDK/CLI. The Modal **Endpoints** catalog screen is for catalog LLM endpoints and is not the deployment path for SAM 3.

## Frozen boundary

- App: `norma-sam3-perception`
- Modal workspace/environment: `panamini` / `main`
- Modal Secret name: `norma-sam3-hf`
- Required secret key: `HF_TOKEN`
- Meta code revision: `46957e47805eaa273f4aa7bbbd25a88bca9108ce`
- Hugging Face model: `facebook/sam3`, file `sam3.pt`
- Hugging Face revision: `3c879f39826c281e95690f02c7821c4de09afae7`
- Python 3.12, PyTorch 2.10.0 with CUDA 12.8 wheels, one L4 per container
- Authenticated Modal Server (`unauthenticated=False`), no Volume, Dict, or durable payload store
- The HTTP server listens during model cold-start; `/readyz` returns 503 until the complete SAM 3 inference bundle is ready, then 200 (at most 60 bounded probes); exactly one inference request and no inference replay

The server accepts candidate prompts and returns bounded deterministic row-run masks. It is not source truth, does not create accepted geometry, and cannot run Norma Core.

## One operator action

After reviewing this PR, an authorized operator performs this sequence from a clean checkout at the approved commit:

1. Confirm access to the gated `facebook/sam3` model and acceptance of the SAM license for the Hugging Face account behind the secret. The secret `norma-sam3-hf` is already reported to exist in `panamini` / `main`; do not display, export, copy, or commit its value.
2. Confirm the active Modal CLI profile targets workspace `panamini`, then deploy:

   ```sh
   modal deploy --env main deploy/modal/modal_app.py
   ```

3. Record the authenticated Server URL without placing credentials in source control.
4. Create a dedicated Modal Proxy Token and scope it to environment `main` when RBAC is enabled:

   ```sh
   modal workspace proxy-tokens create
   modal workspace proxy-tokens allow TOKEN_ID main
   ```

   The token secret is shown once. Store the ID and secret directly in the Railway sandbox secret manager; do not paste either into tickets, chat, logs, test fixtures, or command history.
5. Configure these three required Railway sandbox variables as one atomic change:

   - `NORMA_PERSONAL_VISUAL_HARMONY_SEGMENTATION_URL`
   - `NORMA_PERSONAL_VISUAL_HARMONY_MODAL_KEY`
   - `NORMA_PERSONAL_VISUAL_HARMONY_MODAL_SECRET`
   - Optional: `NORMA_PERSONAL_VISUAL_HARMONY_SOURCE_IMAGE_ALLOWED_ORIGINS` — additional,
     comma-separated exact HTTPS origins for controlled local fixtures. Ordinary ChatGPT
     operation needs no value: Norma includes OpenAI's documented regional temporary-file
     host family internally. Never paste a signed download URL or configure another wildcard
   - Optional: `NORMA_PERSONAL_VISUAL_HARMONY_SEGMENTATION_DEADLINE_MS` — a bounded
     readiness/inference deadline in milliseconds (`1000`–`300000`); omit it to use
     the five-minute cold-start window.

   During `prepare`, the server downloads the host-provided file reference through the
   built-in OpenAI transport allowlist (plus any optional exact fixture origins) and captures
   a bounded content hash. A later fresh widget URL is accepted for SAM only when its
   downloaded bytes match that session-bound hash, before any Modal call.

   All provider variables absent means disabled. The endpoint and two proxy credentials must
   be present together; either optional variable on its own also fails startup. Never configure
   this provider in production as part of this sandbox action.
6. Restart only the Railway sandbox service. Authenticate through the existing OAuth flow with the existing visual-harmony scope, attach an approved non-sensitive image fixture, and use the widget’s **Proposer le masque SAM 3** action. Verify:

   - an unauthenticated request cannot list or call the two perception tools;
   - the candidate set reports `visualInterpretationSource: "hybrid"` or `"sam3"`, `imageBytesObservedByNorma: true`, and a `perceptionReceiptIdentity`;
   - the job does not confirm a candidate and `coreRun` stays `false`;
   - one later explicit widget confirmation is still required before any accepted geometry or Core result;
   - application and Modal logs contain no image bytes, download URLs, prompts, credentials, provider bodies, or database content.

## Rollback and stop

Disable the integration first by removing the three required Railway sandbox variables and
any optional perception variables, then restart that sandbox service. The existing ChatGPT
V1 path then remains the only registered path.

To roll back the Modal app to its preceding deployed version:

```sh
modal app rollback norma-sam3-perception --env main
```

To stop the app and terminate its containers:

```sh
modal app stop norma-sam3-perception --env main
```

Revoke or delete the dedicated Proxy Token after disabling the Railway variables. Do not delete `norma-sam3-hf` as part of an application rollback.

## Operational limits

- Zero-to-one cold start keeps the container reachable while the model loads; the asynchronous job polls the bounded readiness window and exposes a terminal `provider_unavailable` or `provider_timeout` state when it expires. A model-load failure returns a redacted provider-unavailable response and never reports readiness.
- The readiness client makes at most 60 checks and reserves its last check for the configured cutoff instead of adding an undocumented 61st check.
- The first inference POST is never replayed, including on 503, timeout, connection loss, or container preemption.
- Jobs are process-memory-only, capacity-bounded, TTL-bound, and may disappear on restart.
- The image is downloaded into bounded memory, identity-checked, normalized to at most 512 × 512, and never persisted.
- L4 is the unbenchmarked initial sandbox choice. Qualification and cost/latency benchmarking are separate live work.
- This repository change does not prove gated checkpoint access, successful image construction, GPU startup, model quality, live latency, or Railway-to-Modal connectivity.

## Official references

- [Meta SAM 3 repository](https://github.com/facebookresearch/sam3)
- [Modal Servers](https://modal.com/docs/guide/servers)
- [Modal Server SDK](https://modal.com/docs/sdk/py/latest/App#server)
- [Modal Proxy Tokens](https://modal.com/docs/guide/webhook-proxy-auth)
- [Modal Secrets](https://modal.com/docs/guide/secrets)
- [Modal app rollback and stop](https://modal.com/docs/cli/latest/app)
