# mmdelta v0.1.0 Tasks

## Task 1: Define contracts and parser tests

- [x] Acceptance: graph, node, edge, and stable error contracts are explicit.
- [x] Acceptance: tests cover every supported node/edge form plus unsupported syntax.
- [x] Verify: focused parser tests fail before implementation, then pass.
- [x] Files: `package.json`, `src/errors.js`, `test/parser.test.js`.

## Task 2: Implement strict parsing and normalization

- [x] Acceptance: documented flowchart subset parses from real text.
- [x] Acceptance: comments/order/layout/style-only changes normalize away.
- [x] Verify: `node --test test/parser.test.js`.
- [x] Files: `src/parser.js`, `test/parser.test.js`.

## Task 3: Compare graph meaning and reachable paths

- [x] Acceptance: node/edge add/remove/change records are deterministic.
- [x] Acceptance: lost and gained old-entry-to-old-exit paths are reported.
- [x] Verify: `node --test test/diff.test.js`.
- [x] Files: `src/diff.js`, `test/diff.test.js`.

## Task 4: Deliver CLI and reports

- [x] Acceptance: text, JSON, and Markdown agree on one canonical result.
- [x] Acceptance: exit `0/1/2` contracts work with `--fail-on`.
- [x] Verify: `node --test test/reporters.test.js test/cli.test.js`.
- [x] Files: `src/reporters.js`, `src/cli.js`, two test files.

## Task 5: Add user-facing proof and documentation

- [x] Acceptance: committed before/after files demonstrate a meaningful topology change.
- [x] Acceptance: README includes 60-second use, limitations, acceptance commands, and failure repair.
- [x] Verify: `npm run demo` and documentation link check.
- [x] Files: `examples/*`, `README.md`, `docs/*`, `CHANGELOG.md`.

## Task 6: Automate the release gate

- [x] Acceptance: cross-platform CI gates lint, tests, coverage, audit, demo, and package contents.
- [x] Acceptance: tag workflow builds the tarball and checksums without npm publication.
- [x] Verify: `npm run check` and `npm run package:release` from a clean tree.
- [x] Files: `.github/workflows/*`, `scripts/*`, package metadata.

## Task 7: Publish and independently verify v0.1.0

- [x] Acceptance: exact commit is pushed and tagged; CI and Release are green/public.
- [x] Acceptance: downloaded tarball installs in a fresh directory and executes the example.
- [x] Acceptance: contributors show only the intended author and Gmail notification is sent.
- [x] Verify: public URLs, asset hashes, fresh-install output, and sent-message evidence.

## Verified release closure — 2026-10-07

- Public repository: https://github.com/KanadeK/mmdelta
- Annotated `v0.1.0` tag: `cf05f71d94612f03f531e168af4172e8686a893f`.
- CI: https://github.com/KanadeK/mmdelta/actions/runs/37735719965 — all four Ubuntu/Windows and Node 22.13/24 jobs passed.
- Release workflow: https://github.com/KanadeK/mmdelta/actions/runs/37735834156 — passed.
- Public Release: https://github.com/KanadeK/mmdelta/releases/tag/v0.1.0 — non-draft, non-prerelease; tarball and `SHA256SUMS` uploaded.
- Downloaded public tarball matched its published checksum. Fresh installation passed the command wrapper, real example, and exit codes `0`, `1`, and `2`.
- All 46 tests passed; overall coverage was 98.94% lines, 94.10% branches, and 100% functions. Dependency audit reported zero vulnerabilities.
- Contributor list contained only `KanadeK`. Gmail notification was sent after the published-package checks.
- The release tag remains on the validated release commit; this checklist is a later documentation-only update.
