---
title: "PR265 Remote visual MCP sandbox surface"
status: proposed
date: 2026-07-24
---

# PR265 Remote visual MCP sandbox surface

## Decision

Extend the existing OAuth-protected Railway sandbox MCP endpoint with the
already implemented personal visual-harmony tools and `ui://` resource. Keep
the deterministic structured-analysis tool on the same endpoint and retain the
single qualified Scalekit scope `norma:structured_analyze`.

This is a sandbox qualification change only. It does not select Scalekit for
production, create a production resource, migrate data, or change the
Railway-to-Supabase/RLS boundary.

## Why

The Railway service currently serves only the structured-analysis MCP tool.
ChatGPT's image flow therefore cannot fetch the visual widget template even
though the repository already contains the personal visual-harmony MCP server
and its `ui://widget/norma-personal-visual-harmony-v1.html` resource.

## Contract

- OAuth verification remains provider-neutral and fail-closed.
- The exact existing scope is reused; no new provider scope is introduced.
- The tool list contains the three visual-harmony tools plus
  `norma.analyzeStructuredCompositionV1`.
- Visual tools advertise the existing output template and widget resource.
- The widget resource is read-only server content; image bytes remain owned by
  ChatGPT and are not downloaded by the server.
- The visual session service is shared by requests inside the sandbox process
  so preparation can be followed by explicit refinement or confirmation.
- The remote endpoint remains stateless at the MCP transport layer and does not
  create durable sessions or persistence.

## Verification and rollback

The contract test must prove authenticated tools/list, resource listing and
resource reading, visual preparation without a Core run, and preservation of
the existing structured-analysis parity test. A failed sandbox check rolls
back by restoring the previous Railway start/runtime commit; no database or
provider migration is involved.

## Non-goals

Production OAuth selection, Supabase RLS activation, tenant rollout, public
launch, automatic image analysis, and changes to deterministic Core geometry
remain outside this PR.
