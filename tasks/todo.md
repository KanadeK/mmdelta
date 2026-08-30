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

- [ ] Acceptance: exact commit is pushed and tagged; CI and Release are green/public.
- [ ] Acceptance: downloaded tarball installs in a fresh directory and executes the example.
- [ ] Acceptance: contributors show only the intended author and Gmail notification is sent.
- [ ] Verify: public URLs, asset hashes, fresh-install output, and sent-message evidence.
