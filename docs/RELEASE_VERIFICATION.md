# Release verification

Tie every release claim to an exact commit.

1. `npm run check` passes.
2. Desktop light/dark, 390 px mobile, keyboard-only, and reduced-motion browser journeys pass.
3. The sample is READY with 5/3 cases and complete coverage; count, duplicate, secret-like, non-HTTPS, and missing-field fixtures surface the intended findings.
4. Import, manifest export, runbook export, clear, and invalid/oversized import are exercised.
5. Production has no post-load network requests, console errors, or horizontal overflow.
6. The release notes state that runtime execution and OpenAI approval are not claimed.
