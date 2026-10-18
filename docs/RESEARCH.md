# Research notes — 2026-10-19 MYT

Primary OpenAI plugin sources reviewed: submission reference, submission-errors guidance, app review, plugin guidelines, and security/privacy guidance.

The MCP review flow currently asks for five positive cases, three negative cases, a demo recording, release notes, production HTTPS endpoints, declared tool behavior, and reviewer-safe access where necessary. Negative cases should demonstrate that the plugin does not invoke in unsupported or unsafe situations. Security guidance emphasizes least privilege, explicit consent, input validation, prompt-injection resistance, data minimization, and human confirmation for irreversible actions.

OpenAI's broader packaging tools and community examples help with full plugin assembly. General test generators also exist. This app has a narrower, distinct purpose: exact review-case authoring, deterministic structure checks, coverage tags, and a safe reviewer runbook. It neither runs tests nor submits a plugin.
