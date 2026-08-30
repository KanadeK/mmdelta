export function renderText(report, context) {
  const lines = [
    `mmdelta ${statusLabel(report)}`,
    `before: ${visible(context.beforePath)} (${report.before.nodes} nodes, ${report.before.edges} edges)`,
    `after:  ${visible(context.afterPath)} (${report.after.nodes} nodes, ${report.after.edges} edges)`,
    `changes: ${report.counts.total} total, ${report.counts.breaking} breaking`,
  ];

  if (!report.hasChanges) {
    lines.push("", "No semantic changes.");
    return `${lines.join("\n")}\n`;
  }

  appendTextRecords(lines, "Nodes", report.nodes, formatNode, formatChangedRecord);
  appendTextRecords(lines, "Edges", report.edges, formatEdge);
  appendTextRecords(lines, "Subgraphs", report.subgraphs, formatSubgraph, formatChangedRecord);
  appendTextPaths(lines, report.paths);
  return `${lines.join("\n")}\n`;
}

export function renderJson(report, context) {
  const { schema, ...rest } = report;
  return `${JSON.stringify(
    {
      schema,
      files: { beforePath: context.beforePath, afterPath: context.afterPath },
      ...rest,
    },
    null,
    2,
  )}\n`;
}

export function renderMarkdown(report, context) {
  const title = report.hasBreakingChanges
    ? "breaking changes"
    : report.hasChanges
      ? "semantic changes"
      : "unchanged";
  const lines = [
    `## mmdelta: ${title}`,
    "",
    `Compared ${codeSpan(context.beforePath)} to ${codeSpan(context.afterPath)}.`,
    "",
    "| Measure | Count |",
    "| --- | ---: |",
    `| Before | ${report.before.nodes} nodes / ${report.before.edges} edges |`,
    `| After | ${report.after.nodes} nodes / ${report.after.edges} edges |`,
    `| Total semantic changes | ${report.counts.total} |`,
    `| Breaking changes | ${report.counts.breaking} |`,
  ];

  if (!report.hasChanges) {
    lines.push("", "No semantic changes were found.");
    return `${lines.join("\n")}\n`;
  }

  appendMarkdownRecords(lines, "Added nodes", report.nodes.added, (node) => markdownNode(node));
  appendMarkdownRecords(lines, "Removed nodes", report.nodes.removed, (node) => markdownNode(node));
  appendMarkdownRecords(lines, "Changed nodes", report.nodes.changed, markdownChangedRecord);
  appendMarkdownRecords(lines, "Added edges", report.edges.added, markdownEdge);
  appendMarkdownRecords(lines, "Removed edges", report.edges.removed, markdownEdge);
  appendMarkdownRecords(lines, "Added subgraphs", report.subgraphs.added, markdownSubgraph);
  appendMarkdownRecords(lines, "Removed subgraphs", report.subgraphs.removed, markdownSubgraph);
  appendMarkdownRecords(lines, "Changed subgraphs", report.subgraphs.changed, markdownChangedRecord);
  appendMarkdownRecords(lines, "Lost paths", report.paths.lost, markdownPath);
  appendMarkdownRecords(lines, "Gained paths", report.paths.gained, markdownPath);
  return `${lines.join("\n")}\n`;
}

function statusLabel(report) {
  if (report.hasBreakingChanges) {
    return "BREAKING";
  }
  return report.hasChanges ? "CHANGED" : "UNCHANGED";
}

function appendTextRecords(lines, heading, records, formatter, changedFormatter) {
  if (records.added.length + records.removed.length + (records.changed?.length ?? 0) === 0) {
    return;
  }
  lines.push("", `${heading}:`);
  for (const record of records.added) {
    lines.push(`  + ${formatter(record)}`);
  }
  for (const record of records.removed) {
    lines.push(`  - ${formatter(record)}`);
  }
  for (const record of records.changed ?? []) {
    lines.push(`  ~ ${(changedFormatter ?? formatChangedRecord)(record)}`);
  }
}

function appendTextPaths(lines, paths) {
  if (paths.lost.length + paths.gained.length === 0) {
    return;
  }
  lines.push("", "Paths:");
  for (const path of paths.lost) {
    lines.push(`  - ${visible(path.source)} => ${visible(path.target)}`);
  }
  for (const path of paths.gained) {
    lines.push(`  + ${visible(path.source)} => ${visible(path.target)}`);
  }
}

function formatNode(node) {
  return `${visible(node.id)} [${node.shape}] "${visible(node.label)}"${
    node.subgraph ? ` in ${visible(node.subgraph)}` : ""
  }`;
}

function formatSubgraph(subgraph) {
  return `${visible(subgraph.id)} "${visible(subgraph.label)}"${
    subgraph.parent ? ` in ${visible(subgraph.parent)}` : ""
  }`;
}

function formatChangedRecord(change) {
  const fields = change.fields.map(
    (field) =>
      `${visible(field)} ${formatValue(change.before[field])} -> ${formatValue(change.after[field])}`,
  );
  return `${visible(change.id)}: ${fields.join("; ")}`;
}

function formatEdge(edge) {
  const label = edge.label ? `, label="${visible(edge.label)}"` : "";
  return `${visible(edge.source)} -> ${visible(edge.target)} [${edge.kind}${label}]`;
}

function formatValue(value) {
  if (value === null) {
    return "none";
  }
  return `"${visible(value)}"`;
}

function appendMarkdownRecords(lines, heading, records, formatter) {
  if (records.length === 0) {
    return;
  }
  lines.push("", `### ${heading}`, "");
  for (const record of records) {
    lines.push(`- ${formatter(record)}`);
  }
}

function markdownNode(node) {
  const membership = node.subgraph ? ` in ${codeSpan(node.subgraph)}` : "";
  return `${codeSpan(node.id)} — ${codeSpan(node.shape)} ${codeSpan(node.label)}${membership}`;
}

function markdownSubgraph(subgraph) {
  const parent = subgraph.parent ? ` in ${codeSpan(subgraph.parent)}` : "";
  return `${codeSpan(subgraph.id)} — ${codeSpan(subgraph.label)}${parent}`;
}

function markdownChangedRecord(change) {
  const fields = change.fields.map(
    (field) =>
      `${codeSpan(field)}: ${codeSpan(valueText(change.before[field]))} → ${codeSpan(
        valueText(change.after[field]),
      )}`,
  );
  return `${codeSpan(change.id)} — ${fields.join("; ")}`;
}

function markdownEdge(edge) {
  const label = edge.label ? `, label ${codeSpan(edge.label)}` : "";
  return `${codeSpan(edge.source)} → ${codeSpan(edge.target)} — ${codeSpan(edge.kind)}${label}`;
}

function markdownPath(path) {
  return `${codeSpan(path.source)} → ${codeSpan(path.target)}`;
}

function codeSpan(value) {
  const safe = visible(String(value));
  const longestRun = Math.max(0, ...[...safe.matchAll(/`+/gu)].map(([ticks]) => ticks.length));
  const fence = "`".repeat(longestRun + 1);
  const padding = safe.startsWith("`") || safe.endsWith("`") ? " " : "";
  return `${fence}${padding}${safe}${padding}${fence}`;
}

function valueText(value) {
  return value === null ? "none" : String(value);
}

function visible(value) {
  return String(value).replaceAll(/[\u0000-\u001f\u007f-\u009f]/gu, (character) =>
    `\\u${character.codePointAt(0).toString(16).padStart(4, "0")}`,
  );
}
