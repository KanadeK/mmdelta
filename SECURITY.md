# Security policy

## Supported versions

The latest GitHub Release receives security fixes. Before the first stable release, fixes may include narrowly breaking changes when necessary to preserve fail-closed behavior.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository. Do not open a public issue for an input that causes code execution, resource exhaustion below the documented limits, source overwrite, terminal escape injection, or a false “unchanged” result.

Include the smallest before/after input pair, exact command, Node version, operating system, observed result, and expected result. Do not include secrets or private diagram content.

## Security boundary

`mmdelta` treats diagram files and labels as untrusted data. It reads local UTF-8 text, applies explicit size/graph limits, escapes terminal controls in human reports, refuses to write over either input, and never renders, fetches, follows links, or executes diagram content.
