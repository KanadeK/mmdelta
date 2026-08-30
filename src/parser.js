import { MmdeltaError, syntaxError } from "./errors.js";

export const LIMITS = Object.freeze({
  maxBytes: 256 * 1024,
  maxNodes: 1_000,
  maxEdges: 5_000,
});

const EDGE_OPERATORS = [
  ["<-->", "bidirectional"],
  ["-.->", "dotted_arrow"],
  ["o--o", "circle_both"],
  ["x--x", "cross_both"],
  ["==>", "thick_arrow"],
  ["-->", "arrow"],
  ["--o", "circle_end"],
  ["--x", "cross_end"],
  ["---", "open"],
];

const NODE_SHAPES = [
  [/^\(\[([\s\S]*)\]\)$/u, "stadium"],
  [/^\[\[([\s\S]*)\]\]$/u, "subroutine"],
  [/^\[\(([\s\S]*)\)\]$/u, "cylinder"],
  [/^\(\(([\s\S]*)\)\)$/u, "circle"],
  [/^\[([\s\S]*)\]$/u, "rect"],
  [/^\(([\s\S]*)\)$/u, "rounded"],
  [/^\{([\s\S]*)\}$/u, "diamond"],
];

const STYLE_STATEMENT = /^(?:classDef|class|style|linkStyle)\b/u;
const NODE_ID = /^[A-Za-z_][A-Za-z0-9_-]*/u;

export function parseFlowchart(source) {
  if (typeof source !== "string") {
    throw new MmdeltaError("INVALID_INPUT", "Flowchart source must be text.");
  }
  if (Buffer.byteLength(source, "utf8") > LIMITS.maxBytes) {
    throw new MmdeltaError(
      "INPUT_TOO_LARGE",
      `Flowchart source exceeds the ${LIMITS.maxBytes}-byte limit.`,
      { hint: "Split the diagram before comparing it." },
    );
  }

  const lines = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const meaningful = lines
    .map((text, index) => ({ text: stripComment(text).trim(), line: index + 1 }))
    .filter(({ text }) => text.length > 0);

  if (meaningful.length === 0) {
    throw new MmdeltaError("EMPTY_INPUT", "Flowchart source is empty.", { line: 1 });
  }

  const header = /^(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)$/u.exec(meaningful[0].text);
  if (!header) {
    throw new MmdeltaError(
      "UNSUPPORTED_DIAGRAM",
      "Expected a flowchart or graph header with an explicit direction.",
      {
        line: meaningful[0].line,
        hint: "Start the file with, for example, `flowchart LR`.",
      },
    );
  }

  const nodes = new Map();
  const edges = [];
  const subgraphs = new Map();
  const subgraphStack = [];

  for (const statement of meaningful.slice(1)) {
    if (/^direction\s+(?:TB|TD|BT|RL|LR)$/u.test(statement.text)) {
      continue;
    }
    if (STYLE_STATEMENT.test(statement.text)) {
      continue;
    }
    if (statement.text === "end") {
      if (subgraphStack.length === 0) {
        throw new MmdeltaError("UNEXPECTED_END", "Found `end` outside a subgraph.", {
          line: statement.line,
        });
      }
      subgraphStack.pop();
      continue;
    }
    if (statement.text.startsWith("subgraph ")) {
      const subgraph = parseSubgraph(statement.text, statement.line, subgraphStack);
      const existing = subgraphs.get(subgraph.id);
      if (existing && !sameRecord(existing, subgraph)) {
        throw syntaxError(
          `Subgraph ${subgraph.id} is declared with conflicting metadata.`,
          statement.line,
          "Give each subgraph a stable unique identifier.",
        );
      }
      subgraphs.set(subgraph.id, subgraph);
      subgraphStack.push(subgraph.id);
      continue;
    }

    const split = splitEdges(statement.text, statement.line);
    const currentSubgraph = subgraphStack.at(-1) ?? null;
    if (!split) {
      const node = parseNode(statement.text, statement.line);
      upsertNode(nodes, node, currentSubgraph, statement.line);
      continue;
    }

    const parsedNodes = split.nodes.map((value) => parseNode(value, statement.line));
    for (const node of parsedNodes) {
      upsertNode(nodes, node, currentSubgraph, statement.line);
    }
    for (let index = 0; index < split.operators.length; index += 1) {
      const operator = split.operators[index];
      edges.push({
        source: parsedNodes[index].id,
        target: parsedNodes[index + 1].id,
        label: operator.label,
        kind: operator.kind,
      });
      if (edges.length > LIMITS.maxEdges) {
        throw new MmdeltaError(
          "TOO_MANY_EDGES",
          `Flowchart exceeds the ${LIMITS.maxEdges}-edge limit.`,
          { line: statement.line, hint: "Split the diagram before comparing it." },
        );
      }
    }
  }

  if (subgraphStack.length > 0) {
    throw new MmdeltaError(
      "UNCLOSED_SUBGRAPH",
      `Subgraph ${subgraphStack.at(-1)} has no matching end.`,
      { hint: "Add `end` before the end of the file." },
    );
  }

  return Object.freeze({
    direction: header[1],
    nodes: sortedMap(nodes),
    edges: edges.toSorted(compareEdges).map(Object.freeze),
    subgraphs: sortedMap(subgraphs),
  });
}

function stripComment(line) {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < line.length - 1; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quoted) {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === "%" && line[index + 1] === "%") {
      return line.slice(0, index);
    }
  }
  return line;
}

function parseSubgraph(text, line, stack) {
  const match = /^subgraph\s+([A-Za-z_][A-Za-z0-9_-]*)(?:\s+\[([^\]]+)\])?$/u.exec(text);
  if (!match) {
    throw syntaxError(
      "Unsupported subgraph declaration.",
      line,
      "Use `subgraph stable_id [Visible label]` or `subgraph stable_id`.",
    );
  }
  return Object.freeze({
    id: match[1],
    label: normalizeLabel(match[2] ?? match[1]),
    parent: stack.at(-1) ?? null,
  });
}

function splitEdges(text, line) {
  const nodes = [];
  const operators = [];
  const closers = [];
  let quoted = false;
  let escaped = false;
  let segmentStart = 0;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoted && character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (quoted) {
      continue;
    }
    if (character === "[" || character === "(" || character === "{") {
      closers.push(character === "[" ? "]" : character === "(" ? ")" : "}");
      continue;
    }
    if (character === "]" || character === ")" || character === "}") {
      if (closers.pop() !== character) {
        throw syntaxError("Unbalanced node delimiters.", line, "Quote delimiter characters used in labels.");
      }
      continue;
    }
    if (closers.length > 0) {
      continue;
    }

    const operator = EDGE_OPERATORS.find(([token]) => text.startsWith(token, index));
    if (!operator) {
      continue;
    }

    const nodeText = text.slice(segmentStart, index).trim();
    if (nodeText.length === 0) {
      throw syntaxError("An edge is missing its source node.", line, "Put a node on both sides of every edge.");
    }
    nodes.push(nodeText);
    index += operator[0].length;

    let cursor = index;
    while (text[cursor] === " " || text[cursor] === "\t") {
      cursor += 1;
    }
    let label = "";
    if (text[cursor] === "|") {
      const labelEnd = text.indexOf("|", cursor + 1);
      if (labelEnd === -1) {
        throw syntaxError("An edge label is missing its closing `|`.", line, "Use `-->|label|`.");
      }
      label = normalizeLabel(text.slice(cursor + 1, labelEnd));
      cursor = labelEnd + 1;
    }
    operators.push({ kind: operator[1], label });
    segmentStart = cursor;
    index = cursor - 1;
  }

  if (quoted || closers.length > 0) {
    throw syntaxError("Unclosed node label or delimiter.", line, "Close the quoted label and its node shape.");
  }
  if (operators.length === 0) {
    return null;
  }

  const finalNode = text.slice(segmentStart).trim();
  if (finalNode.length === 0) {
    throw syntaxError("An edge is missing its target node.", line, "Put a node on both sides of every edge.");
  }
  nodes.push(finalNode);
  return { nodes, operators };
}

function parseNode(text, line) {
  const match = NODE_ID.exec(text);
  if (!match) {
    throw syntaxError(
      `Unsupported node expression: ${text}`,
      line,
      "Node IDs must start with a letter or underscore and use letters, numbers, underscores, or hyphens.",
    );
  }

  const id = match[0];
  const suffix = text.slice(id.length).trim();
  if (suffix.length === 0) {
    return { id, label: id, shape: "plain", explicit: false };
  }

  for (const [pattern, shape] of NODE_SHAPES) {
    const shapeMatch = pattern.exec(suffix);
    if (shapeMatch) {
      return {
        id,
        label: normalizeLabel(unquote(shapeMatch[1])),
        shape,
        explicit: true,
      };
    }
  }

  throw syntaxError(
    `Unsupported node shape or trailing syntax for ${id}.`,
    line,
    "Use one of the node forms documented in the supported subset.",
  );
}

function upsertNode(nodes, parsed, subgraph, line) {
  const existing = nodes.get(parsed.id);
  if (!existing) {
    nodes.set(
      parsed.id,
      Object.freeze({
        id: parsed.id,
        label: parsed.label,
        shape: parsed.shape,
        subgraph,
      }),
    );
    if (nodes.size > LIMITS.maxNodes) {
      throw new MmdeltaError(
        "TOO_MANY_NODES",
        `Flowchart exceeds the ${LIMITS.maxNodes}-node limit.`,
        { line, hint: "Split the diagram before comparing it." },
      );
    }
    return;
  }
  if (!parsed.explicit && subgraph === null) {
    return;
  }
  nodes.set(
    parsed.id,
    Object.freeze({
      id: parsed.id,
      label: parsed.explicit ? parsed.label : existing.label,
      shape: parsed.explicit ? parsed.shape : existing.shape,
      subgraph: subgraph ?? existing.subgraph,
    }),
  );
}

function normalizeLabel(value) {
  return value.replaceAll(/\s+/gu, " ").trim();
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\");
  }
  return trimmed;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareEdges(left, right) {
  return compareText(
    `${left.source}\u0000${left.target}\u0000${left.kind}\u0000${left.label}`,
    `${right.source}\u0000${right.target}\u0000${right.kind}\u0000${right.label}`,
  );
}

function sortedMap(map) {
  return new Map([...map].toSorted(([left], [right]) => compareText(left, right)));
}

function sameRecord(left, right) {
  return left.id === right.id && left.label === right.label && left.parent === right.parent;
}
