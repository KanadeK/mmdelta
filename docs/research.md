# Research and overlap boundary

Research date: 2026-08-30.

## User problem

Mermaid diagrams are source-controlled text, but a textual diff mixes presentation churn with graph changes. Maintainers need a small offline gate that says whether nodes, transitions, meaning-bearing labels, and reachable routes changed.

## Representative projects inspected

| Project | What it does | Why mmdelta is not a duplicate |
| --- | --- | --- |
| [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) | Renders Mermaid source to SVG, PNG, or PDF. | mmdelta never renders; it compares normalized graph meaning and emits CI evidence. |
| [mermaid-ast](https://github.com/neongreen/mermaid-ast) | Parses and renders several Mermaid diagrams as programmatic ASTs. | It is a library, not a semantic review policy or CLI; its own README lists better diff support as future work. mmdelta also avoids its young parser dependency by enforcing a strict subset. |
| [Mermaid Chart VS Code](https://github.com/Mermaid-Chart/vscode-mermaid-chart) | Offers side-by-side visual diff during account-backed remote synchronization. | mmdelta is account-free, renderer-free, deterministic, scriptable, and operates on arbitrary local before/after files. |
| [lg2m](https://github.com/psenger/lg2m) | Keeps a LangGraph implementation and one generated Mermaid state diagram in sync. | Its authority is a LangGraph runtime and annotations; mmdelta compares two general flowchart sources without importing application code. |

Searches also covered `Mermaid semantic diff`, `Mermaid graph diff`, `mmd diff`, and `Mermaid AST diff`. No representative project found in that bounded scan offered the same combination of strict offline flowchart parsing, presentation-noise normalization, path-impact analysis, three deterministic reporters, and CI exit policy. This is evidence of differentiation, not a guarantee that no adjacent project exists.

## Source constraints

- The [official Mermaid flowchart syntax](https://mermaid.js.org/syntax/flowchart.html) defines flowchart headers, node forms, directions, edges, labels, comments, and subgraphs used by the supported subset.
- The [official syntax reference](https://mermaid.js.org/intro/syntax-reference.html) warns that unknown words and misspellings break diagrams. mmdelta therefore fails on unsupported statements instead of silently dropping them.
- Mermaid's current flowchart parser has a reported [quadratic whitespace case](https://github.com/mermaid-js/mermaid/issues/8127). mmdelta does not import or execute the renderer/parser and applies explicit input/graph limits.
- Node's documented [`util.parseArgs`](https://nodejs.org/download/release/v24.4.0/docs/api/util.html#utilparseargsconfig) provides the CLI option contract, and the [Node test runner](https://nodejs.org/download/release/v24.13.1/docs/api/test.html) supplies built-in coverage thresholds.

## Rejected alternatives

- Visual pixel diff: layout engines introduce noise and require a browser.
- Full Mermaid compatibility: too broad for a trustworthy first release without adopting a large renderer dependency or internal unstable APIs.
- Rename inference: fuzzy matching can turn delete/add into an unprovable rename.
- Hosted PR bot: adds credentials, retention, uptime, and billing before the local contract is proven.
