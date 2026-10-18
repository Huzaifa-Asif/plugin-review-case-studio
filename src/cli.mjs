#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { auditDocument, MAX_BYTES, parseBoundedJson, runbookMarkdown } from "./core.mjs";
const file = process.argv[2];
if (!file) { console.error("Usage: node src/cli.mjs <review.json> [--json]"); process.exitCode = 2; }
else try { if ((await stat(file)).size > MAX_BYTES) throw new Error("Input exceeds the 1 MB limit."); const input = parseBoundedJson(await readFile(file, "utf8")); const audit = auditDocument(input); console.log(process.argv.includes("--json") ? JSON.stringify({ ready: audit.ready, counts: audit.counts, findings: audit.findings, coverage: audit.coverage }, null, 2) : runbookMarkdown(input)); if (!audit.ready) process.exitCode = 1; } catch (error) { console.error(`Unable to audit input: ${error instanceof Error ? error.message : "unknown error"}`); process.exitCode = 2; }
