# Threat model

## Assets and boundary

Draft prompts, expected outcomes, tool names, and reviewer notes remain in browser memory or user-requested downloads. There is no account, backend, or credential store.

## Considered threats

- Imported prompt injection: content is inert data and never executed.
- Credential disclosure: common credential-like strings block readiness; findings describe the location without echoing the value.
- Oversized input: imports are limited to 1 MB and 50 cases per group.
- Path traversal and DNS rebinding: the local server serves fixed routes and loopback Host values only.
- False assurance: READY describes draft structure only; the product repeatedly requires production execution and human review.
- Silent persistence or exfiltration: no local draft persistence, telemetry, third-party assets, or browser network connections.

## Out of scope

The app cannot validate production availability, authentication, reviewer credentials, tool annotations, video contents, or the result of the OpenAI review process.
