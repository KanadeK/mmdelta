const NODE_FIELDS = ["label", "shape", "subgraph"];
const SUBGRAPH_FIELDS = ["label", "parent"];
const UNDIRECTED_KINDS = new Set(["open", "bidirectional", "circle_both", "cross_both"]);

export function diffGraphs(before, after) {
  const nodes = diffRecords(before.nodes, after.nodes, NODE_FIELDS);
  const edges = diffMultiset(before.edges, after.edges, edgeKey);
  const subgraphs = diffRecords(before.subgraphs, after.subgraphs, SUBGRAPH_FIELDS);
  const paths = diffPaths(before, after);

  const counts = Object.freeze({
    nodesAdded: nodes.added.length,
    nodesRemoved: nodes.removed.length,
    nodesChanged: nodes.changed.length,
    edgesAdded: edges.added.length,
    edgesRemoved: edges.removed.length,
    subgraphsAdded: subgraphs.added.length,
    subgraphsRemoved: subgraphs.removed.length,
    subgraphsChanged: subgraphs.changed.length,
    pathsLost: paths.lost.length,
    pathsGained: paths.gained.length,
    total:
      nodes.added.length +
      nodes.removed.length +
      nodes.changed.length +
      edges.added.length +
      edges.removed.length +
      subgraphs.added.length +
      subgraphs.removed.length +
      subgraphs.changed.length +
      paths.lost.length +
      paths.gained.length,
    breaking:
      nodes.removed.length +
      edges.removed.length +
      subgraphs.removed.length +
      paths.lost.length,
  });

  return Object.freeze({
    schema: "mmdelta.diff.v1",
    before: Object.freeze({ nodes: before.nodes.size, edges: before.edges.length }),
    after: Object.freeze({ nodes: after.nodes.size, edges: after.edges.length }),
    hasChanges: counts.total > 0,
    hasBreakingChanges: counts.breaking > 0,
    counts,
    nodes,
    edges,
    subgraphs,
    paths,
  });
}

function diffRecords(before, after, fields) {
  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, beforeRecord] of before) {
    const afterRecord = after.get(id);
    if (!afterRecord) {
      removed.push(beforeRecord);
      continue;
    }
    const changedFields = fields.filter((field) => beforeRecord[field] !== afterRecord[field]);
    if (changedFields.length > 0) {
      changed.push(
        Object.freeze({
          id,
          fields: Object.freeze(changedFields),
          before: beforeRecord,
          after: afterRecord,
        }),
      );
    }
  }
  for (const [id, afterRecord] of after) {
    if (!before.has(id)) {
      added.push(afterRecord);
    }
  }

  return Object.freeze({
    added: Object.freeze(added),
    removed: Object.freeze(removed),
    changed: Object.freeze(changed),
  });
}

function diffMultiset(before, after, keyFor) {
  const beforeBuckets = bucket(before, keyFor);
  const afterBuckets = bucket(after, keyFor);
  const added = [];
  const removed = [];
  const keys = new Set([...beforeBuckets.keys(), ...afterBuckets.keys()]);

  for (const key of [...keys].toSorted(compareText)) {
    const beforeItems = beforeBuckets.get(key) ?? [];
    const afterItems = afterBuckets.get(key) ?? [];
    if (beforeItems.length > afterItems.length) {
      removed.push(...beforeItems.slice(afterItems.length));
    } else if (afterItems.length > beforeItems.length) {
      added.push(...afterItems.slice(beforeItems.length));
    }
  }

  return Object.freeze({ added: Object.freeze(added), removed: Object.freeze(removed) });
}

function bucket(items, keyFor) {
  const buckets = new Map();
  for (const item of items) {
    const key = keyFor(item);
    const entries = buckets.get(key) ?? [];
    entries.push(item);
    buckets.set(key, entries);
  }
  return buckets;
}

function diffPaths(before, after) {
  const beforeDirections = buildDirections(before);
  const afterDirections = buildDirections(after);
  const entries = [...before.nodes.keys()].filter(
    (id) => (beforeDirections.inDegree.get(id) ?? 0) === 0,
  );
  const exits = [...before.nodes.keys()].filter(
    (id) => (beforeDirections.outDegree.get(id) ?? 0) === 0,
  );
  const lost = [];
  const gained = [];

  for (const source of entries) {
    if (!after.nodes.has(source)) {
      continue;
    }
    const beforeReachable = reachableFrom(source, beforeDirections.adjacency);
    const afterReachable = reachableFrom(source, afterDirections.adjacency);
    for (const target of exits) {
      if (source === target || !after.nodes.has(target)) {
        continue;
      }
      const existed = beforeReachable.has(target);
      const exists = afterReachable.has(target);
      if (existed && !exists) {
        lost.push(Object.freeze({ source, target }));
      } else if (!existed && exists) {
        gained.push(Object.freeze({ source, target }));
      }
    }
  }

  return Object.freeze({ lost: Object.freeze(lost), gained: Object.freeze(gained) });
}

function buildDirections(graph) {
  const adjacency = new Map();
  const inDegree = new Map();
  const outDegree = new Map();
  for (const id of graph.nodes.keys()) {
    adjacency.set(id, new Set());
    inDegree.set(id, 0);
    outDegree.set(id, 0);
  }
  for (const edge of graph.edges) {
    connect(edge.source, edge.target, adjacency, inDegree, outDegree);
    if (UNDIRECTED_KINDS.has(edge.kind)) {
      adjacency.get(edge.target).add(edge.source);
    }
  }
  return { adjacency, inDegree, outDegree };
}

function connect(source, target, adjacency, inDegree, outDegree) {
  const neighbors = adjacency.get(source);
  if (neighbors.has(target)) {
    return;
  }
  neighbors.add(target);
  outDegree.set(source, outDegree.get(source) + 1);
  inDegree.set(target, inDegree.get(target) + 1);
}

function reachableFrom(source, adjacency) {
  const visited = new Set();
  const queue = [source];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  visited.delete(source);
  return visited;
}

function edgeKey(edge) {
  return `${edge.source}\u0000${edge.target}\u0000${edge.kind}\u0000${edge.label}`;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
