# Failure and repair playbook

`mmdelta` fails closed. Exit code `2` means it could not make a trustworthy comparison; it never means “no changes.”

| Error or gate | Cause | Smallest repair |
| --- | --- | --- |
| `UNSUPPORTED_DIAGRAM` | The first declaration is not `flowchart`/`graph` plus a direction. | Compare a supported flowchart file or wait for a release that explicitly adds that diagram family. |
| `UNSUPPORTED_SYNTAX` | The reported line is outside the documented subset or malformed. | Rewrite only that line into a supported canonical node, edge, label, or subgraph form. Do not delete it merely to pass the gate. |
| `INPUT_TOO_LARGE`, `TOO_MANY_NODES`, `TOO_MANY_EDGES` | The bounded analysis budget was exceeded. | Split the diagram at a real subsystem boundary and compare each part. Do not raise limits without a performance test. |
| `INPUT_READ_FAILED` | Missing path, denied access, or non-readable input. | Confirm the exact path and UTF-8 file permissions; rerun with the same content. |
| `OUTPUT_CONFLICT` | `--output` resolves to one of the inputs. | Choose a separate report path. The input was not modified. |
| `OUTPUT_WRITE_FAILED` | Parent directory is missing or not writable. | Create/select a writable report directory; do not change input permissions. |
| Exit `1` | The selected policy found real differences. | Review the report. Use `--fail-on breaking` only when additive changes are accepted by policy, not to hide removals. |
| `npm ci` fails | Lockfile/runtime mismatch or network/cache failure. | Use Node 22.13+, keep `package-lock.json`, retry `npm ci --ignore-scripts` against the official npm registry; do not use `--force` or hand-edit the lockfile. |
| `npm audit` reports high/critical | A locked development dependency has a known advisory. | Check reachability and the fixed version, update the single direct dependency deliberately, review the lock diff, then rerun the full gate. Never run `npm audit fix --force`. |
| Coverage fails | New behavior lacks a tested path. | Add a behavior-level test. Do not exclude the file, skip the test, or lower 90%. |
| Example output changed | Parser/diff/report behavior changed. | Confirm the change is intended in the spec, regenerate `examples/expected.md`, review the semantic diff, then rerun the full gate. |

For a reproducible defect, include the smallest before/after pair, command, Node version, exit code, and complete stderr. Remove confidential labels before posting publicly.
