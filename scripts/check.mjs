import assert from "node:assert/strict";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "Run the release gate through npm so npm_execpath is available.");

for (const arguments_ of [
  ["run", "lint"],
  ["run", "test:coverage"],
  [
    "audit",
    "--audit-level=high",
    "--ignore-scripts",
    "--registry=https://registry.npmjs.org",
  ],
  ["run", "build"],
  ["run", "demo"],
]) {
  const result = spawnSync(process.execPath, [npmCli, ...arguments_], {
    cwd: new URL("..", import.meta.url),
    stdio: "inherit",
    env: {
      ...process.env,
      npm_config_cache: resolve(".npm-cache"),
    },
    windowsHide: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

process.stdout.write("MMDELTA_RELEASE_GATE=PASS\n");
