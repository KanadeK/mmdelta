import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diffGraphs } from "../src/diff.js";
import { parseFlowchart } from "../src/parser.js";
import { renderJson, renderMarkdown, renderText } from "../src/reporters.js";

const context = { beforePath: "examples/before.mmd", afterPath: "examples/after.mmd" };

function changedReport() {
  return diffGraphs(
    parseFlowchart(`flowchart LR
      start[Start] --> gate{Safe?}
      gate -->|yes| done[Done]
      gate -->|no| retry[Retry]
      retry --> gate
    `),
    parseFlowchart(`flowchart LR
      start[Begin] --> gate{Safe?}
      gate -->|no| retry[Retry]
      retry --> gate
      done
      gate -.->|bypass| archive[Archive]
    `),
  );
}

describe("reporters", () => {
  it("renders a deterministic human-readable report", () => {
    const report = changedReport();
    const first = renderText(report, context);
    const second = renderText(report, context);

    assert.equal(first, second);
    assert.match(first, /^mmdelta BREAKING\n/u);
    assert.match(first, /before: examples\/before\.mmd \(4 nodes, 4 edges\)/u);
    assert.match(first, /\+ archive \[rect\] "Archive"/u);
    assert.match(first, /~ start: label "Start" -> "Begin"/u);
    assert.match(first, /- gate -> done \[arrow, label="yes"\]/u);
    assert.match(first, /- start => done/u);
  });

  it("renders a stable JSON contract with file context", () => {
    const output = renderJson(changedReport(), context);
    const parsed = JSON.parse(output);

    assert.equal(output.endsWith("\n"), true);
    assert.equal(parsed.schema, "mmdelta.diff.v1");
    assert.deepEqual(parsed.files, context);
    assert.equal(parsed.hasBreakingChanges, true);
    assert.deepEqual(parsed.paths.lost, [{ source: "start", target: "done" }]);
  });

  it("renders Markdown suitable for a pull request summary", () => {
    const output = renderMarkdown(changedReport(), context);

    assert.match(output, /^## mmdelta: breaking changes/mu);
    assert.match(output, /\| Total semantic changes \| \d+ \|/u);
    assert.match(output, /### Changed nodes/u);
    assert.match(output, /`start`.*`label`/u);
    assert.match(output, /### Lost paths/u);
  });

  it("escapes terminal control characters in text and Markdown", () => {
    const report = diffGraphs(
      parseFlowchart("flowchart LR\nA[Safe]"),
      parseFlowchart(`flowchart LR\nA["${String.fromCharCode(27)}[31munsafe"]`),
    );

    assert.equal(renderText(report, context).includes("\u001b"), false);
    assert.match(renderText(report, context), /\\u001b/u);
    assert.equal(renderMarkdown(report, context).includes("\u001b"), false);
    assert.match(renderMarkdown(report, context), /\\u001b/u);
  });

  it("renders an explicit unchanged result", () => {
    const graph = parseFlowchart("flowchart LR\nA --> B");
    const report = diffGraphs(graph, graph);

    assert.match(renderText(report, context), /mmdelta UNCHANGED/u);
    assert.match(renderText(report, context), /No semantic changes\./u);
    assert.match(renderMarkdown(report, context), /## mmdelta: unchanged/u);
  });
});
