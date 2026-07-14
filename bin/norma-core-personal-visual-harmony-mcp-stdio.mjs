#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const ENABLE_FLAG = "--enable-personal-visual-harmony-demo";

if (!process.argv.slice(2).includes(ENABLE_FLAG)) {
  process.stderr.write("norma_personal_visual_harmony_mcp_disabled_by_default\n");
  process.exitCode = 2;
} else {
  try {
    const { createPersonalVisualHarmonyMcpServerV1 } = await import(
      "../dist/src/mcp/personal-visual-harmony-app.js"
    );
    const server = createPersonalVisualHarmonyMcpServerV1();
    await server.connect(new StdioServerTransport());
  } catch {
    process.stderr.write("norma_personal_visual_harmony_mcp_build_or_start_failed\n");
    process.exitCode = 1;
  }
}
