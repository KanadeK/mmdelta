import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MmdeltaError } from "../src/errors.js";
import { LIMITS, parseFlowchart } from "../src/parser.js";

describe("parseFlowchart", () => {
  it("parses nodes, directed edges, and pipe labels", () => {
    const graph = parseFlowchart(`flowchart LR
      start[Start] --> choice{Deploy?}
      choice -->|yes| done((Done))
      choice -->|no| start
    `);

    assert.equal(graph.direction, "LR");
    assert.deepEqual([...graph.nodes.values()], [
      { id: "choice", label: "Deploy?", shape: "diamond", subgraph: null },
      { id: "done", label: "Done", shape: "circle", subgraph: null },
      { id: "start", label: "Start", shape: "rect", subgraph: null },
    ]);
    assert.deepEqual(graph.edges, [
      { source: "choice", target: "done", label: "yes", kind: "arrow" },
      { source: "choice", target: "start", label: "no", kind: "arrow" },
      { source: "start", target: "choice", label: "", kind: "arrow" },
    ]);
  });

  it("parses every supported node shape", () => {
    const graph = parseFlowchart(`graph TD
      plain
      rect[Rectangle]
      rounded(Rounded)
      stadium([Stadium])
      subroutine[[Subroutine]]
      cylinder[(Database)]
      circle((Circle))
      decision{Decision}
    `);

    assert.deepEqual(
      [...graph.nodes.values()].map(({ id, shape }) => [id, shape]),
      [
        ["circle", "circle"],
        ["cylinder", "cylinder"],
        ["decision", "diamond"],
        ["plain", "plain"],
        ["rect", "rect"],
        ["rounded", "rounded"],
        ["stadium", "stadium"],
        ["subroutine", "subroutine"],
      ],
    );
  });

  it("parses chains and normalizes supported edge markers", () => {
    const graph = parseFlowchart(`flowchart TD
      A --> B --- C -.-> D ==> E <--> F --o G --x H
      I o--o J
      K x--x L
    `);

    assert.deepEqual(
      graph.edges.map(({ source, target, kind }) => [source, target, kind]),
      [
        ["A", "B", "arrow"],
        ["B", "C", "open"],
        ["C", "D", "dotted_arrow"],
        ["D", "E", "thick_arrow"],
        ["E", "F", "bidirectional"],
        ["F", "G", "circle_end"],
        ["G", "H", "cross_end"],
        ["I", "J", "circle_both"],
        ["K", "L", "cross_both"],
      ],
    );
  });

  it("ignores comments, layout direction, and styling directives", () => {
    const graph = parseFlowchart(`flowchart TD
      %% a full-line comment
      A --> B %% an inline comment
      direction LR
      classDef risk fill:#f00
      class A risk
      style B fill:#0f0
      linkStyle 0 stroke:#333
    `);

    assert.equal(graph.nodes.size, 2);
    assert.equal(graph.edges.length, 1);
  });

  it("tracks explicit subgraph membership", () => {
    const graph = parseFlowchart(`flowchart TB
      subgraph api [Public API]
        request[Request] --> response[Response]
      end
      response --> client
    `);

    assert.deepEqual([...graph.subgraphs.values()], [
      { id: "api", label: "Public API", parent: null },
    ]);
    assert.equal(graph.nodes.get("request").subgraph, "api");
    assert.equal(graph.nodes.get("response").subgraph, "api");
    assert.equal(graph.nodes.get("client").subgraph, null);
  });

  it("uses the last explicit node declaration and normalizes label whitespace", () => {
    const graph = parseFlowchart(`flowchart LR
      A[ First   label ] --> B
      A("Final   label")
    `);

    assert.deepEqual(graph.nodes.get("A"), {
      id: "A",
      label: "Final label",
      shape: "rounded",
      subgraph: null,
    });
  });

  it("sorts nodes and edges for deterministic downstream comparison", () => {
    const graph = parseFlowchart(`flowchart LR
      Z --> A
      B --> A
    `);

    assert.deepEqual([...graph.nodes.keys()], ["A", "B", "Z"]);
    assert.deepEqual(
      graph.edges.map(({ source, target }) => [source, target]),
      [
        ["B", "A"],
        ["Z", "A"],
      ],
    );
  });

  it("rejects unsupported diagram types with a line number", () => {
    assert.throws(
      () => parseFlowchart("sequenceDiagram\nA->>B: hello"),
      (error) =>
        error instanceof MmdeltaError &&
        error.code === "UNSUPPORTED_DIAGRAM" &&
        error.line === 1,
    );
  });

  it("rejects unknown statements instead of silently ignoring them", () => {
    assert.throws(
      () => parseFlowchart("flowchart LR\nclick A https://example.com"),
      (error) =>
        error instanceof MmdeltaError &&
        error.code === "UNSUPPORTED_SYNTAX" &&
        error.line === 2 &&
        error.hint.includes("supported subset"),
    );
  });

  it("rejects malformed nodes and labels", () => {
    assert.throws(
      () => parseFlowchart("flowchart LR\nA[missing --> B"),
      (error) => error instanceof MmdeltaError && error.line === 2,
    );
  });

  it("rejects unclosed and unexpected subgraph ends", () => {
    assert.throws(
      () => parseFlowchart("flowchart LR\nsubgraph api\nA --> B"),
      (error) => error instanceof MmdeltaError && error.code === "UNCLOSED_SUBGRAPH",
    );
    assert.throws(
      () => parseFlowchart("flowchart LR\nend"),
      (error) => error instanceof MmdeltaError && error.code === "UNEXPECTED_END",
    );
  });

  it("rejects sources larger than the byte limit", () => {
    const oversized = `flowchart LR\n%% ${"x".repeat(LIMITS.maxBytes)}`;
    assert.throws(
      () => parseFlowchart(oversized),
      (error) => error instanceof MmdeltaError && error.code === "INPUT_TOO_LARGE",
    );
  });

  it("rejects graphs larger than the node limit", () => {
    const nodes = Array.from({ length: LIMITS.maxNodes + 1 }, (_, index) => `N${index}`);
    assert.throws(
      () => parseFlowchart(`flowchart LR\n${nodes.join("\n")}`),
      (error) => error instanceof MmdeltaError && error.code === "TOO_MANY_NODES",
    );
  });
});
