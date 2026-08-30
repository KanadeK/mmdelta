## mmdelta: breaking changes

Compared `examples/before.mmd` to `examples/after.mmd`.

| Measure | Count |
| --- | ---: |
| Before | 5 nodes / 5 edges |
| After | 5 nodes / 4 edges |
| Total semantic changes | 6 |
| Breaking changes | 4 |

### Added nodes

- `archive` — `cylinder` `Archive`

### Removed nodes

- `publish` — `rect` `Publish`

### Added edges

- `validate` → `archive` — `dotted_arrow`, label `manual bypass`

### Removed edges

- `publish` → `done` — `arrow`
- `validate` → `publish` — `arrow`, label `yes`

### Lost paths

- `start` → `done`
