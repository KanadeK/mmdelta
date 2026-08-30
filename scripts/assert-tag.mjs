import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const expected = `v${packageMetadata.version}`;
assert.equal(process.env.GITHUB_REF_NAME, expected, `release tag must be ${expected}`);
process.stdout.write(`MMDELTA_TAG_GATE=PASS ${expected}\n`);
