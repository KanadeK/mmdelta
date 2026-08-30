import assert from "node:assert/strict";
import { link, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../src/cli.js", import.meta.url));
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function fixture(before, after) {
  const directory = await mkdtemp(join(tmpdir(), "mmdelta-"));
  temporaryDirectories.push(directory);
  const beforePath = join(directory, "before.mmd");
  const afterPath = join(directory, "after.mmd");
  await writeFile(beforePath, before, "utf8");
  await writeFile(afterPath, after, "utf8");
  return { directory, beforePath, afterPath };
}

function run(...arguments_) {
  return spawnSync(process.execPath, [CLI, ...arguments_], {
    encoding: "utf8",
    windowsHide: true,
  });
}

describe("mmdelta CLI", () => {
  it("returns zero for presentation-only changes", async () => {
    const files = await fixture("flowchart TD\nA --> B", "flowchart LR\nB\nA --> B");
    const result = run("diff", files.beforePath, files.afterPath);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /mmdelta UNCHANGED/u);
    assert.equal(result.stderr, "");
  });

  it("returns one and reports semantic changes by default", async () => {
    const files = await fixture("flowchart LR\nA --> B", "flowchart LR\nA --> C");
    const result = run("diff", files.beforePath, files.afterPath, "--format", "markdown");

    assert.equal(result.status, 1);
    assert.match(result.stdout, /## mmdelta: breaking changes/u);
    assert.equal(result.stderr, "");
  });

  it("allows additive changes under the breaking policy", async () => {
    const files = await fixture("flowchart LR\nA", "flowchart LR\nA --> B");
    const result = run(
      "diff",
      files.beforePath,
      files.afterPath,
      "--fail-on",
      "breaking",
      "--format",
      "json",
    );

    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).hasChanges, true);
  });

  it("returns two with a stable parse error and no stack trace", async () => {
    const files = await fixture("flowchart LR\nA --> B", "sequenceDiagram\nA->>B: hello");
    const result = run("diff", files.beforePath, files.afterPath);

    assert.equal(result.status, 2);
    assert.match(result.stderr, /error \[UNSUPPORTED_DIAGRAM\].*after\.mmd:1/u);
    assert.match(result.stderr, /hint:/u);
    assert.doesNotMatch(result.stderr, /at parseFlowchart|node:internal/u);
  });

  it("writes JSON to an explicit output file", async () => {
    const files = await fixture("flowchart LR\nA", "flowchart LR\nA --> B");
    const outputPath = join(files.directory, "report.json");
    const result = run(
      "diff",
      files.beforePath,
      files.afterPath,
      "--format",
      "json",
      "--output",
      outputPath,
      "--fail-on",
      "never",
    );

    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(JSON.parse(await readFile(outputPath, "utf8")).counts.nodesAdded, 1);
  });

  it("refuses to overwrite either input file", async () => {
    const before = "flowchart LR\nA";
    const files = await fixture(before, "flowchart LR\nA --> B");
    const result = run("diff", files.beforePath, files.afterPath, "--output", files.beforePath);

    assert.equal(result.status, 2);
    assert.match(result.stderr, /OUTPUT_CONFLICT/u);
    assert.equal(await readFile(files.beforePath, "utf8"), before);
  });

  it("refuses an output hard link that aliases an input file", async () => {
    const before = "flowchart LR\nA";
    const files = await fixture(before, "flowchart LR\nA --> B");
    const aliasPath = join(files.directory, "before-alias.mmd");
    await link(files.beforePath, aliasPath);
    const result = run("diff", files.beforePath, files.afterPath, "--output", aliasPath);

    assert.equal(result.status, 2);
    assert.match(result.stderr, /OUTPUT_CONFLICT/u);
    assert.equal(await readFile(files.beforePath, "utf8"), before);
  });

  it("rejects invalid options and prints focused help", async () => {
    const files = await fixture("flowchart LR\nA", "flowchart LR\nB");
    const invalid = run("diff", files.beforePath, files.afterPath, "--format", "xml");
    const help = run("--help");
    const version = run("--version");

    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /INVALID_OPTION/u);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /mmdelta diff <before\.mmd> <after\.mmd>/u);
    assert.equal(version.stdout.trim(), "mmdelta 0.1.0");
  });

  it("rejects unknown flags, invalid usage, and invalid fail policies", async () => {
    const files = await fixture("flowchart LR\nA", "flowchart LR\nB");
    const unknown = run("diff", files.beforePath, files.afterPath, "--wat");
    const usage = run("compare", files.beforePath, files.afterPath);
    const policy = run("diff", files.beforePath, files.afterPath, "--fail-on", "maybe");

    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /INVALID_OPTION/u);
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /INVALID_USAGE/u);
    assert.equal(policy.status, 2);
    assert.match(policy.stderr, /Unsupported fail policy/u);
  });

  it("reports input read and output write failures", async () => {
    const files = await fixture("flowchart LR\nA", "flowchart LR\nB");
    const missingInput = run("diff", join(files.directory, "missing.mmd"), files.afterPath);
    const missingOutputDirectory = run(
      "diff",
      files.beforePath,
      files.afterPath,
      "--output",
      join(files.directory, "missing", "report.txt"),
    );

    assert.equal(missingInput.status, 2);
    assert.match(missingInput.stderr, /INPUT_READ_FAILED/u);
    assert.equal(missingOutputDirectory.status, 2);
    assert.match(missingOutputDirectory.stderr, /OUTPUT_WRITE_FAILED/u);
  });
});
