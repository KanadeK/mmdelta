import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url);
const packageMetadata = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const fileName = `${packageMetadata.name}-${packageMetadata.version}.tgz`;
const dist = new URL("dist/", root);
const archive = new URL(fileName, dist);
const checksums = new URL("SHA256SUMS", dist);

await mkdir(dist, { recursive: true });
await rm(archive, { force: true });
await rm(checksums, { force: true });

const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "Run release packaging through npm so npm_execpath is available.");
const packed = spawnSync(
  process.execPath,
  [npmCli, "pack", "--pack-destination", "dist", "--json", "--ignore-scripts"],
  {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: resolve(".npm-cache"),
    },
    windowsHide: true,
  },
);
if (packed.status !== 0) {
  process.stderr.write(packed.stderr);
  process.exit(packed.status ?? 1);
}

const [{ filename }] = JSON.parse(packed.stdout);
assert.equal(filename, fileName);
const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
await writeFile(checksums, `${digest}  ${fileName}\n`, "utf8");
process.stdout.write(`MMDELTA_PACKAGE=PASS ${fileName} sha256=${digest}\n`);
