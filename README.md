<div align="center">

# mmdelta

**Review the graph change, not the diagram text churn.**

[![CI](https://github.com/KanadeK/mmdelta/actions/workflows/ci.yml/badge.svg)](https://github.com/KanadeK/mmdelta/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/KanadeK/mmdelta)](https://github.com/KanadeK/mmdelta/releases/latest)
[![Node.js 22.13+](https://img.shields.io/badge/node-%3E%3D22.13-43853d)](https://nodejs.org/)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

`mmdelta` compares two Mermaid flowcharts as graphs. It ignores statement order, comments, layout direction, whitespace, and style-only directives, then reports node, edge, subgraph, and reachable-route changes in text, JSON, or Markdown.

It is offline and dependency-free at runtime. It does not launch a browser, render SVG, follow links, execute click actions, contact GitHub, or rewrite either input file.

## Why it exists

A review that changes `flowchart TD` to `flowchart LR`, reorders declarations, and adjusts colors can look enormous while changing no behavior. A one-line edge deletion can look harmless while removing the only route from `start` to `done`.

`mmdelta` makes those cases mechanically different:

```text
mmdelta BREAKING
before: examples/before.mmd (5 nodes, 5 edges)
after:  examples/after.mmd (5 nodes, 4 edges)
changes: 7 total, 4 breaking

Nodes:
  + archive [cylinder] "Archive"
  - publish [rect] "Publish"

Edges:
  + validate -> archive [dotted_arrow, label="manual bypass"]
  - publish -> done [arrow]
  - validate -> publish [arrow, label="yes"]

Paths:
  - start => done
```

## 60-second start

Requires Node.js 22.13 or newer.

```bash
git clone https://github.com/KanadeK/mmdelta.git
cd mmdelta
npm ci --ignore-scripts
node src/cli.js diff examples/before.mmd examples/after.mmd --fail-on never
```

The example contains real topology changes: the guarded publish route is removed, a manual bypass to an archive is added, and the old `start → done` route becomes unreachable.

After v0.1.0 is released, the packaged CLI can be installed directly from the GitHub Release without an npm-registry publication:

```bash
npm install --global https://github.com/KanadeK/mmdelta/releases/download/v0.1.0/mmdelta-0.1.0.tgz
mmdelta --version
```

## Usage

```text
mmdelta diff <before.mmd> <after.mmd> [options]

  -f, --format <text|json|markdown>  Report format (default: text)
  -o, --output <path>                Write to a path other than either input
      --fail-on <any|breaking|never> Exit 1 policy (default: any)
```

Examples:

```bash
# Human review; exit 1 on any semantic change
mmdelta diff main.mmd proposed.mmd

# Pull-request body; only block removals and lost paths
mmdelta diff main.mmd proposed.mmd --format markdown --fail-on breaking

# Generate JSON without using differences as the process status
mmdelta diff main.mmd proposed.mmd --format json --fail-on never --output report.json
```

Exit codes are stable: `0` means the selected policy passes, `1` means semantic differences meet the policy, and `2` means usage/input/parse/resource/output failure.

## What it reports

- added and removed nodes;
- node label, shape, and subgraph-membership changes;
- added and removed edges as a multiset, including parallel edges;
- subgraph label and parent changes; and
- lost or gained reachability between surviving entry/exit nodes from the old graph.

Removed nodes, edges, subgraphs, and lost paths count as breaking. Additions and field changes still appear under `--fail-on any` but do not make `--fail-on breaking` fail by themselves.

## Supported syntax and limits

v0.1.0 intentionally supports a strict subset of Mermaid `flowchart`/`graph`:

- explicit `TB`, `TD`, `BT`, `RL`, or `LR` header direction;
- plain, rectangle, rounded, stadium, subroutine, cylinder, circle, and diamond nodes;
- `-->`, `---`, `-.->`, `==>`, `<-->`, `--o`, `--x`, `o--o`, and `x--x` edges;
- pipe labels such as `A -->|approved| B`, chains, comments, and explicit subgraphs;
- style-only `classDef`, `class`, `style`, `linkStyle`, and nested `direction` statements are accepted and ignored.

Unknown syntax fails with a line number. The tool does not claim full Mermaid compatibility. Inputs are capped at 256 KiB, 1,000 nodes, and 5,000 edges. See the [specification](docs/spec.md) and [architecture decision](docs/decisions/0001-strict-flowchart-subset.md).

## Acceptance commands

```bash
npm ci --ignore-scripts
npm run lint
npm test
npm run test:coverage
npm run build
npm run demo
npm audit --audit-level=high
npm run check
```

The complete gate checks lint, tests, 90% line/branch/function coverage, package contents, example behavior, help/version, error behavior, and the dependency audit. CI runs the same contract on Ubuntu and Windows.

## When a command fails

Do not bypass the error or lower an assertion. The short route is:

1. read the stable error code and source line;
2. use the matching row in the [repair playbook](docs/repair-playbook.md);
3. rerun the focused failing command; and
4. rerun `npm run check` after any code or fixture change.

## Project boundary

The [dated overlap audit](docs/research.md) distinguishes mmdelta from Mermaid CLI rendering, a parser library, account-backed visual sync, and LangGraph-specific diagram contracts. Broader Mermaid families, Markdown fence discovery, fuzzy rename inference, hosted bots, and visual overlays are non-goals for v0.1.0.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for the test-first workflow and [SECURITY.md](SECURITY.md) for private vulnerability reporting. The project is available under the [MIT License](LICENSE).
