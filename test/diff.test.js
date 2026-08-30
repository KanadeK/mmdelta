import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diffGraphs } from "../src/diff.js";
import { parseFlowchart } from "../src/parser.js";

function compare(before, after) {
  return diffGraphs(parseFlowchart(before), parseFlowchart(after));
}

describe("diffGraphs", () => {
  it("treats layout, order, style, and whitespace edits as unchanged", () => {
    const result = compare(
      `flowchart TD
        A[Start] -->|go now| B{Ready?}
        B --> C[Done]
      `,
      `flowchart LR
        style A fill:#fff
        C[Done]
        B{ Ready? } --> C
        A[ Start ] -->|go   now| B
      `,
    );

    assert.equal(result.hasChanges, false);
    assert.equal(result.hasBreakingChanges, false);
    assert.equal(result.counts.total, 0);
  });

  it("reports node additions, removals, and field-level changes", () => {
    const result = compare(
      `flowchart LR
        A[Start] --> B{Check}
        B --> C[Done]
      `,
      `flowchart LR
        A([Begin]) --> B{Check}
        B --> D[Archive]
      `,
    );

    assert.deepEqual(result.nodes.added.map(({ id }) => id), ["D"]);
    assert.deepEqual(result.nodes.removed.map(({ id }) => id), ["C"]);
    assert.deepEqual(result.nodes.changed, [
      {
        id: "A",
        fields: ["label", "shape"],
        before: { id: "A", label: "Start", shape: "rect", subgraph: null },
        after: { id: "A", label: "Begin", shape: "stadium", subgraph: null },
      },
    ]);
    assert.equal(result.hasBreakingChanges, true);
  });

  it("compares parallel edges as a multiset", () => {
    const result = compare(
      `flowchart LR
        A -->|primary| B
        A -->|backup| B
        A -->|backup| B
      `,
      `flowchart LR
        A -->|primary| B
        A -->|backup| B
        A -.->|telemetry| B
      `,
    );

    assert.deepEqual(result.edges.removed, [
      { source: "A", target: "B", label: "backup", kind: "arrow" },
    ]);
    assert.deepEqual(result.edges.added, [
      { source: "A", target: "B", label: "telemetry", kind: "dotted_arrow" },
    ]);
  });

  it("reports lost reachability between surviving old entries and exits", () => {
    const result = compare(
      `flowchart LR
        start --> gate
        gate -->|yes| done
        gate -->|no| retry
        retry --> gate
      `,
      `flowchart LR
        start --> gate
        gate -->|no| retry
        retry --> gate
        done
      `,
    );

    assert.deepEqual(result.paths.lost, [{ source: "start", target: "done" }]);
    assert.deepEqual(result.paths.gained, []);
  });

  it("reports gained reachability for an old entry and exit pair", () => {
    const result = compare(
      `flowchart LR
        start --> middle
        finish
      `,
      `flowchart LR
        start --> middle --> finish
      `,
    );

    assert.deepEqual(result.paths.gained, [{ source: "start", target: "finish" }]);
    assert.deepEqual(result.paths.lost, []);
  });

  it("treats open and bidirectional edges as traversable both ways", () => {
    const result = compare(
      `flowchart LR
        start --> A --- B <--> done
      `,
      `flowchart LR
        start --> A
        B <--> done
      `,
    );

    assert.deepEqual(result.paths.lost, [{ source: "start", target: "done" }]);
  });

  it("reports subgraph metadata and membership changes", () => {
    const result = compare(
      `flowchart LR
        subgraph api [Public]
          A --> B
        end
      `,
      `flowchart LR
        subgraph api [Internal]
          A
        end
        A --> B
      `,
    );

    assert.deepEqual(result.subgraphs.changed, [
      {
        id: "api",
        fields: ["label"],
        before: { id: "api", label: "Public", parent: null },
        after: { id: "api", label: "Internal", parent: null },
      },
    ]);
    assert.deepEqual(result.nodes.changed.map(({ id, fields }) => ({ id, fields })), [
      { id: "B", fields: ["subgraph"] },
    ]);
  });

  it("publishes consistent summary counts", () => {
    const result = compare(
      `flowchart LR
        A --> B --> C
      `,
      `flowchart LR
        A --> D
        C
      `,
    );

    assert.deepEqual(result.counts, {
      nodesAdded: 1,
      nodesRemoved: 1,
      nodesChanged: 0,
      edgesAdded: 1,
      edgesRemoved: 2,
      subgraphsAdded: 0,
      subgraphsRemoved: 0,
      subgraphsChanged: 0,
      pathsLost: 1,
      pathsGained: 0,
      total: 6,
      breaking: 4,
    });
  });

  it("handles removal of an old entry without inventing path findings", () => {
    const result = compare(
      `flowchart LR
        start --> middle --> done
      `,
      `flowchart LR
        middle --> done
      `,
    );

    assert.deepEqual(result.paths, { lost: [], gained: [] });
    assert.equal(result.nodes.removed[0].id, "start");
  });
});
