# Spec: mmdelta v0.1.0

## Objective

`mmdelta` is an offline command-line tool for reviewing Mermaid flowchart changes as graph changes instead of text churn. It is for maintainers who keep architecture and process diagrams in version control and need CI to distinguish formatting or layout edits from node, edge, label, shape, and reachable-path changes.

The v0.1.0 user flow is:

1. provide a before and after `.mmd` file;
2. parse a documented, strict subset of Mermaid `flowchart`/`graph` syntax without rendering or executing content;
3. compare normalized graph models;
4. emit deterministic text, JSON, or Markdown; and
5. return an exit code suitable for CI.

## Tech Stack

- Node.js `>=22.13.0`, ECMAScript modules.
- Node built-ins for argument parsing, files, testing, and graph algorithms.
- No runtime dependencies and no browser, renderer, network, or shell execution.
- ESLint `10.9.1` is the only development dependency.

## Commands

```text
Install:  npm install --ignore-scripts
Lint:     npm run lint
Test:     npm test
Coverage: npm run test:coverage
Build:    npm run build
Demo:     npm run demo
Package:  npm run package:release
```

## Project Structure

```text
src/                 CLI, parser, graph comparison, and reporters
test/                unit, integration, and CLI tests
examples/            deterministic before/after flowchart fixture
docs/                research, architecture decision, and repair playbook
tasks/               implementation plan and completion checklist
scripts/             release packaging and complete local gate
.github/workflows/   cross-platform CI and tag-based release automation
```

## Code Style

Use small pure functions, explicit data shapes, fail-fast boundary validation, and no speculative abstraction.

```js
export function normalizeLabel(value) {
  return value.replaceAll(/\s+/g, " ").trim();
}
```

Names describe domain concepts (`removedEdges`, `lostPaths`), reporters consume one canonical result, and errors carry a stable code plus source line when available.

## Testing Strategy

- Unit tests cover accepted node/edge forms, normalization, graph comparison, and each reporter.
- Integration tests execute the CLI against real files and assert stdout, stderr, and exit codes.
- Abuse tests cover oversized files, excessive nodes/edges, unsupported syntax, malformed input, and output-path conflicts.
- Node's test runner enforces at least 90% line, branch, and function coverage over `src/`.
- CI runs lint, tests, coverage, build, package inspection, demo behavior, and `npm audit` on Ubuntu and Windows where applicable.

## Boundaries

- Always: read inputs only, cap resources, reject unsupported statements, keep output deterministic, preserve literal source text only as inert report data.
- Ask first: expand to another Mermaid diagram family, introduce a runtime dependency, publish to npm, or add hosted services.
- Never: render diagrams, fetch image/link targets, execute Mermaid click actions, silently ignore unknown syntax, rewrite input files, or claim full Mermaid compatibility.

## Supported v0.1 Syntax

- `flowchart` or `graph` headers with `TB`, `TD`, `BT`, `RL`, or `LR` direction.
- Standalone and inline nodes using plain, rectangle, rounded, stadium, subroutine, cylinder, circle, and diamond forms.
- Directed/open/thick/dotted/bidirectional/circle/cross edges and pipe labels.
- Edge chains on one line.
- `%%` comments and `subgraph ... end` membership.
- Layout direction, statement order, comments, and styling-only directives are ignored by semantic comparison.

Any statement outside the supported subset fails with a line-numbered `UNSUPPORTED_SYNTAX` error. This is a deliberate correctness boundary, not partial Mermaid compatibility.

## Exit Codes

- `0`: no semantic differences under the selected policy.
- `1`: semantic differences meet the selected `--fail-on` policy.
- `2`: usage, input, parse, resource-limit, or output failure.

## Success Criteria

- Reordered statements, whitespace, comments, and direction-only changes produce no diff.
- Added/removed nodes and edges, label or shape changes, and lost entry-to-exit reachability are reported from real files.
- `text`, `json`, and `markdown` reports agree on counts and are byte-stable across repeated runs.
- The committed example reports a removed guarded route, an added bypass, and the resulting path impact.
- Invalid, unsupported, and oversized input paths are covered by tests and exit `2` with a repair hint.
- The full local gate passes with at least 90% line, branch, and function coverage.
- Public completion requires a clean tagged commit, green remote CI, a non-draft GitHub Release with the npm tarball and `SHA256SUMS`, contributor verification, and a fresh install from the downloaded asset.

## Open Questions

None for v0.1.0. Markdown fence discovery, sequence diagrams, rename inference, and rendered visual overlays are explicitly deferred.
