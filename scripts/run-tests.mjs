// Runs the end-to-end suite in every storage/hosting mode.
import { spawnSync } from "node:child_process";
const modes = [
  { GV_TEST_STORAGE: "file" },
  { GV_TEST_STORAGE: "redis" },
  { GV_TEST_STORAGE: "redis", GV_TEST_SERVERLESS: "1" },
];
let failed = 0;
for (const env of modes) {
  const r = spawnSync(process.execPath, ["scripts/e2e.mjs"], { stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} mode(s) failed` : "\nAll modes passed");
process.exit(failed ? 1 : 0);
