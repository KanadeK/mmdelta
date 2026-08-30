# ADR-0001: Use a strict, dependency-free flowchart subset

## Status

Accepted

## Date

2026-08-30

## Context

The useful claim is not merely that Mermaid text parses; it is that no meaningful graph change was hidden. A permissive partial parser would undermine that claim. Importing the full Mermaid renderer brings browser-oriented dependencies and does not expose a stable public flowchart AST. The separate `mermaid-ast` package is young, pins older generated parsers, and adds a dependency for behavior the first release can bound more clearly.

## Decision

Implement and document a strict subset of common `flowchart`/`graph` syntax with no runtime dependencies. Every non-empty, non-comment statement must be recognized. Unsupported syntax produces a line-numbered error and exit code `2`.

The parser caps source bytes, nodes, and edges; never renders, fetches, follows links, executes click actions, or modifies source.

## Alternatives Considered

### Depend on Mermaid and reach into its graph database

- Pro: closest rendering compatibility.
- Con: internal API, large browser-oriented graph, and no stable public AST contract.
- Rejected because the release must remain reviewable and deterministic in a headless CLI.

### Depend on `mermaid-ast`

- Pro: typed AST and broad syntax.
- Con: a very young package, older vendored parser generation, and a larger trust surface than the v0.1 scope needs.
- Rejected for v0.1; it can be reevaluated only with evidence that broader syntax is demanded.

### Regex over arbitrary Mermaid and ignore unknown lines

- Pro: minimal code.
- Con: false negatives are inevitable and invisible.
- Rejected because silent omission contradicts the product's core guarantee.

## Consequences

- Installation is fast and works without browsers or native binaries.
- Error messages can state exactly which syntax must be simplified or deferred.
- Some valid Mermaid diagrams are intentionally rejected in v0.1.
- New syntax families require explicit grammar, tests, documentation, and a versioned behavior change.
