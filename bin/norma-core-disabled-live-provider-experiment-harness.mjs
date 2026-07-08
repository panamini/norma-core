import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createDisabledLiveProviderExperimentHarnessStateV1 } from "../dist/src/local-report/disabled-live-provider-experiment-harness.js";

export { runDisabledLiveProviderExperimentHarnessCli };

async function runDisabledLiveProviderExperimentHarnessCli({ stdout = process.stdout } = {}) {
  const state = createDisabledLiveProviderExperimentHarnessStateV1();
  stdout.write(`${JSON.stringify(state)}\n`);
  return 0;
}

function isCliEntrypoint() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  process.exitCode = await runDisabledLiveProviderExperimentHarnessCli();
}
