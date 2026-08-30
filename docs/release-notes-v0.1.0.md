`mmdelta` v0.1.0 is the first public release of an offline semantic diff for Mermaid flowcharts.

Highlights:

- separates layout/order/style churn from node, edge, label, shape, subgraph, and route changes;
- reports lost and gained reachability between the old graph's surviving entries and exits;
- emits deterministic text, JSON, and pull-request-ready Markdown;
- provides `any`, `breaking`, and `never` CI policies with stable `0/1/2` exit codes; and
- ships with no runtime dependencies, no renderer/browser/network behavior, explicit resource caps, and tested failure repair.

The release contains an installable npm tarball and `SHA256SUMS`. It is distributed through GitHub Releases and is not claimed to be published on the npm registry.
