# Implementation Plan: mmdelta v0.1.0

## Overview

Build a strict, dependency-free Mermaid flowchart parser and semantic comparison pipeline, expose it through a deterministic CLI, then package and publish the exact validated commit.

## Architecture Decisions

- Parse only a documented flowchart subset and reject everything else. Silent partial parsing would make a semantic diff untrustworthy.
- Normalize source into immutable node, edge, and subgraph records before comparing. Reporters never reinterpret source.
- Treat layout direction and style directives as presentation, while node shape, labels, edge direction, edge marker, and edge labels are semantic.
- Compute path impact only between old entry and exit nodes that still exist after the change, avoiding speculative rename inference.
- Use Node built-ins only at runtime to keep installation small and remove parser/render supply-chain and denial-of-service risk.

## Dependency Graph

```text
strict parser -> normalized graph -> semantic diff -> reporters -> CLI
                         |                 |
                         +-> path impact <-+
```

## Phases

### Phase 1: Foundation

- Task 1: repository metadata, errors, model contract, and parser RED tests.
- Task 2: strict parser and normalization implementation.

Checkpoint: focused parser tests pass and unsupported syntax fails explicitly.

### Phase 2: Core behavior

- Task 3: semantic diff and entry-to-exit path impact tests/implementation.
- Task 4: text, JSON, Markdown reporters and CLI integration.

Checkpoint: real before/after files produce consistent reports and exit codes.

### Phase 3: Delivery

- Task 5: examples, README, research, ADR, repair playbook, and changelog.
- Task 6: CI, deterministic packaging, release gate, and security/resource tests.

Checkpoint: local release-equivalent gate and independent five-axis review pass.

### Phase 4: Public release

- Task 7: commit hygiene, public GitHub repository, remote CI, annotated tag, Release assets, public fresh-install smoke, contributor verification, and Gmail notification.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Partial Mermaid parsing hides a real change | High | Strict allowlist; unknown statements fail with source line |
| Graph comparison becomes quadratic or unbounded | Medium | 256 KiB, 1,000-node, and 5,000-edge limits; bounded BFS |
| Presentation changes are mistaken for behavior | Medium | Normalize order/direction/comments/styles out before diff |
| Useful syntax is rejected | Low | Document exact subset and fail with a focused repair hint |
| Release asset differs from tested source | High | Package from tagged clean commit and fresh-install downloaded asset |

## Open Questions

None inside v0.1.0 scope.
