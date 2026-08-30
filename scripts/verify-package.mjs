import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const expectedFiles = [
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "package.json",
  "src/cli.js",
  "src/diff.js",
  "src/errors.js",
  "src/index.js",
  "src/parser.js",
  "src/reporters.js",
];

const result = runNpm(["pack", "--dry-run", "--json", "--ignore-scripts"]);
const [manifest] = JSON.parse(result.stdout);
const actualFiles = manifest.files.map(({ path }) => path).toSorted();

assert.equal(manifest.name, packageMetadata.name);
assert.equal(manifest.version, packageMetadata.version);
assert.deepEqual(actualFiles, expectedFiles);
assert.equal(packageMetadata.dependencies, undefined, "runtime dependencies must remain empty");
assert.ok(manifest.unpackedSize < 200_000, "unpacked package must remain below 200 KiB");

const cli = manifest.files.find(({ path }) => path === "src/cli.js");
assert.equal(packageMetadata.bin.mmdelta, "./src/cli.js");
if (process.platform !== "win32") {
  assert.ok((cli.mode & 0o111) !== 0, "packaged CLI must be executable");
}

process.stdout.write(
  `MMDELTA_PACKAGE_GATE=PASS files=${actualFiles.length} unpacked=${manifest.unpackedSize}\n`,
);

function runNpm(arguments_) {
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, "Run package verification through npm so npm_execpath is available.");
  const command = spawnSync(process.execPath, [npmCli, ...arguments_], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: resolve(".npm-cache"),
    },
    windowsHide: true,
  });
  if (command.status !== 0) {
    process.stderr.write(command.stderr);
    process.exit(command.status ?? 1);
  }
  return command;
}
