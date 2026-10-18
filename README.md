# Plugin Review Case Studio

A dependency-free, local-first authoring tool for OpenAI MCP plugin review evidence. It enforces the current exact shape of five positive and three negative cases, checks essential safety coverage, and exports both an OpenAI extension fragment and an execution runbook. Skills-only plugins do not use this case flow. Plugin-level cases apply only when there is exactly one MCP server; with multiple servers, select and name the server-specific scope.

## Use

Requires Node.js 20 or newer.

```sh
npm start
# open http://127.0.0.1:4174
npm run check
node src/cli.mjs review.json
```

After loading its same-origin assets, the browser makes no post-load or third-party network requests and keeps drafts only in memory. Imports accept a review fragment or a full plugin manifest with `extensions["com.openai"]`, and are limited to 1 MB and 50 draft cases per group. Use placeholders, never live credentials. The exported `tools_triggered` value follows the official string field. Place the exported `{ review, publication }` fragment under `extensions["com.openai"]` for a single-server plugin; for multi-server plugins, use the chosen server-specific placement shown by the current official builder rather than replacing the whole extension.

## What readiness means

READY means the draft passes deterministic structure checks: exact counts, required fields, unique prompts, an HTTPS demo URL, release notes, and no credential-like strings. It is not proof the cases passed in production and not an OpenAI approval. Execute every case against the production endpoint with reviewer-safe data before submission.

See [research](docs/RESEARCH.md), [threat model](docs/THREAT_MODEL.md), [release verification](docs/RELEASE_VERIFICATION.md), and [privacy](PRIVACY.md).

## License

MIT
