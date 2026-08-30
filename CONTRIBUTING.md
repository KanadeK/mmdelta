# Contributing

Contributions should make the supported contract more trustworthy, not silently broader.

1. Open an issue for a new Mermaid syntax family or public behavior change.
2. Add a failing behavior test before implementation.
3. Make the smallest complete change and keep unknown syntax fail-closed.
4. Run `npm run check` on Node.js 22.13 or newer.
5. Describe the user-visible effect, boundary change, and verification in the pull request.

Do not add a runtime dependency, renderer, network call, syntax fallback, or compatibility promise without an accepted design update. Do not weaken the 90% coverage gate or skip failure-path tests.

Commits use `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, and `chore:` prefixes. Keep generated/package changes separate from behavior changes where practical.
