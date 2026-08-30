import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { diffGraphs } from "../src/diff.js";
import { parseFlowchart } from "../src/parser.js";
import { renderMarkdown } from "../src/reporters.js";

const EXAMPLES = new URL("../examples/", import.meta.url);

describe("committed example", () => {
  it("matches the reviewed Markdown evidence", async () => {
    const [before, after, expected] = await Promise.all([
      readFile(new URL("before.mmd", EXAMPLES), "utf8"),
      readFile(new URL("after.mmd", EXAMPLES), "utf8"),
      readFile(new URL("expected.md", EXAMPLES), "utf8"),
    ]);
    const report = diffGraphs(parseFlowchart(before), parseFlowchart(after));
    const actual = renderMarkdown(report, {
      beforePath: "examples/before.mmd",
      afterPath: "examples/after.mmd",
    });

    assert.equal(actual, expected.replaceAll("\r\n", "\n"));
    assert.deepEqual(report.paths.lost, [{ source: "start", target: "done" }]);
    assert.equal(report.hasBreakingChanges, true);
  });
});
