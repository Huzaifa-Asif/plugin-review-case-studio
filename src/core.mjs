export const MAX_BYTES = 1_000_000;
export const POSITIVE_COUNT = 5;
export const NEGATIVE_COUNT = 3;
export const MAX_DRAFT_CASES = 50;
export const COVERAGE = ["permission", "prompt-injection", "input-validation", "error-handling", "confirmation", "no-match"];
const secretPattern = /(sk-[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._-]{12,}|api[_ -]?key\s*[:=]\s*\S+|(?:token|password|secret|api[_-]?key)=[^&#\s]+|https:\/\/[^/\s@]+@)/i;
const safe = (value, limit = 4000) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export function normalizeDocument(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected an object document.");
  const openai = input.extensions?.["com.openai"];
  const source = input.review?.test_cases ?? openai?.review?.test_cases ?? input.test_cases ?? input;
  const positive = normalizeCases(source.positive, "positive");
  const negative = normalizeCases(source.negative, "negative");
  return {
    positive,
    negative,
    demo_recording_url: safe(input.review?.demo_recording_url ?? openai?.review?.demo_recording_url ?? input.demo_recording_url, 2048),
    release_notes: safe(input.publication?.release_notes ?? openai?.publication?.release_notes ?? input.release_notes, 5000),
    scope: input.studio?.scope === "single-server" || input.studio?.scope === "server-specific" ? input.studio.scope : (input.scope === "single-server" || input.scope === "server-specific" ? input.scope : ""),
    server_name: safe(input.studio?.server_name ?? input.server_name, 128),
  };
}

function normalizeCases(value, kind) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${kind} must be an array.`);
  if (value.length > MAX_DRAFT_CASES) throw new Error(`${kind} supports at most ${MAX_DRAFT_CASES} draft cases.`);
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${kind}[${index}] must be an object.`);
    return {
      description: safe(item.description, 4000), prompt: safe(item.prompt, 4000),
      tools_triggered: safe(Array.isArray(item.tools_triggered) ? item.tools_triggered.filter((x) => typeof x === "string").join(", ") : item.tools_triggered, 1000),
      expected_behavior: safe(item.expected_behavior, 4000),
      file_attachment_urls: Array.isArray(item.file_attachment_urls) ? item.file_attachment_urls.filter((x) => typeof x === "string").map((x) => safe(x, 2048)).slice(0, 20) : [],
      expected_output_url: safe(item.expected_output_url, 2048),
      coverage: Array.isArray(item.coverage) ? [...new Set(item.coverage.filter((x) => COVERAGE.includes(x)))] : [],
    };
  });
}

export function auditDocument(input) {
  const document = normalizeDocument(input); const findings = [];
  if (!document.scope) findings.push(f("error", "scope", "missing-scope", "Select whether these are plugin-level cases for exactly one MCP server or server-specific cases."));
  if (document.scope === "server-specific" && !document.server_name) findings.push(f("error", "server_name", "missing-server-name", "Name the MCP server these cases cover."));
  if (secretPattern.test(document.server_name)) findings.push(f("error", "server_name", "possible-secret", "Possible credential material detected; replace it with an obvious placeholder."));
  if (document.positive.length !== POSITIVE_COUNT) findings.push(f("error", "positive", "positive-count", `Exactly ${POSITIVE_COUNT} positive cases are required; found ${document.positive.length}.`));
  if (document.negative.length !== NEGATIVE_COUNT) findings.push(f("error", "negative", "negative-count", `Exactly ${NEGATIVE_COUNT} negative cases are required; found ${document.negative.length}.`));
  const prompts = new Map();
  for (const kind of ["positive", "negative"]) document[kind].forEach((item, index) => {
    const path = `${kind}[${index}]`;
    if (!item.description) findings.push(f("error", `${path}.description`, "missing-description", "Explain what this case proves."));
    if (!item.prompt) findings.push(f("error", `${path}.prompt`, "missing-prompt", "Add the exact user prompt."));
    if (kind === "positive" && !item.tools_triggered) findings.push(f("error", `${path}.tools_triggered`, "missing-tools", "Name the expected tool."));
    if (!item.expected_behavior) findings.push(f(kind === "positive" ? "error" : "warning", `${path}.expected_behavior`, "missing-expectation", "Describe the expected safe behavior."));
    if (item.prompt.includes("@")) findings.push(f("warning", `${path}.prompt`, "mention-dependent", "Use a natural prompt that does not depend on an @mention."));
    for (const [field, value] of Object.entries({ description: item.description, prompt: item.prompt, tools_triggered: item.tools_triggered, expected_behavior: item.expected_behavior, expected_output_url: item.expected_output_url })) if (secretPattern.test(value)) findings.push(f("error", `${path}.${field}`, "possible-secret", "Possible credential material detected; replace it with an obvious placeholder."));
    item.file_attachment_urls.forEach((value, attachmentIndex) => { if (secretPattern.test(value)) findings.push(f("error", `${path}.file_attachment_urls[${attachmentIndex}]`, "possible-secret", "Possible credential material detected; replace it with an obvious placeholder.")); });
    item.file_attachment_urls.forEach((value, attachmentIndex) => { if (!isSafeHttps(value)) findings.push(f("error", `${path}.file_attachment_urls[${attachmentIndex}]`, "attachment-url", "Attachment references must be HTTPS URLs without embedded credentials.")); });
    if (item.expected_output_url && !isSafeHttps(item.expected_output_url)) findings.push(f("error", `${path}.expected_output_url`, "expected-output-url", "Expected output references must be HTTPS URLs without embedded credentials."));
    const normalized = item.prompt.toLocaleLowerCase("en").replace(/\s+/g, " ");
    if (normalized) { if (prompts.has(normalized)) findings.push(f("error", `${path}.prompt`, "duplicate-prompt", `Duplicates ${prompts.get(normalized)}.`)); else prompts.set(normalized, path); }
  });
  const covered = new Set([...document.positive, ...document.negative].flatMap((item) => item.coverage));
  for (const tag of ["permission", "prompt-injection", "input-validation", "error-handling"]) if (!covered.has(tag)) findings.push(f("warning", "coverage", "coverage-gap", `No case is tagged ${tag}.`));
  if (!isSafeHttps(document.demo_recording_url)) findings.push(f("error", "demo_recording_url", "demo-url", "Add the final HTTPS demo recording URL without embedded credentials."));
  if (!document.release_notes) findings.push(f("error", "release_notes", "missing-release-notes", "Add concise release notes for reviewers."));
  for (const [field, value] of Object.entries({ demo_recording_url: document.demo_recording_url, release_notes: document.release_notes })) if (secretPattern.test(value)) findings.push(f("error", field, "possible-secret", "Possible credential material detected; replace it with an obvious placeholder."));
  const counts = { error: 0, warning: 0 }; findings.forEach((item) => counts[item.severity]++);
  return { document, findings, counts, ready: counts.error === 0, coverage: Object.fromEntries(COVERAGE.map((tag) => [tag, covered.has(tag)])) };
}
const f = (severity, path, code, message) => ({ severity, path, code, message });
function isSafeHttps(value) { try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !secretPattern.test(value); } catch { return false; } }

export function exportReviewPatch(input) {
  const audit = auditDocument(input);
  if (!audit.ready) throw new Error("Resolve blocking findings before exporting the extension fragment.");
  const { document } = audit;
  const strip = (item, positive) => ({ description: item.description, prompt: item.prompt, expected_behavior: item.expected_behavior, ...(item.file_attachment_urls.length ? { file_attachment_urls: item.file_attachment_urls } : {}), ...(item.expected_output_url ? { expected_output_url: item.expected_output_url } : {}), ...(positive ? { tools_triggered: item.tools_triggered } : {}) });
  return { review: { test_cases: { positive: document.positive.map((x) => strip(x, true)), negative: document.negative.map((x) => strip(x, false)) }, demo_recording_url: document.demo_recording_url }, publication: { release_notes: document.release_notes } };
}

export function runbookMarkdown(input) {
  const audit = auditDocument(input); const lines = ["# Plugin review runbook", "", `Status: ${audit.ready ? "READY FOR HUMAN REVIEW" : "NEEDS WORK"}`, `Errors: ${audit.counts.error}; warnings: ${audit.counts.warning}`, `Scope: ${audit.document.scope || "Not selected"}${audit.document.server_name ? ` (${safeMarkdown(audit.document.server_name)})` : ""}`, "", "## Positive cases"];
  for (const [i, item] of audit.document.positive.entries()) lines.push(`\n### ${i + 1}. ${redact(item.description) || "Untitled"}\n\nPrompt: ${redact(item.prompt) || "(missing)"}\n\nExpected tool: ${redact(item.tools_triggered) || "(missing)"}\n\nExpected behavior: ${redact(item.expected_behavior) || "(missing)"}`);
  lines.push("", "## Negative cases");
  for (const [i, item] of audit.document.negative.entries()) lines.push(`\n### ${i + 1}. ${redact(item.description) || "Untitled"}\n\nPrompt: ${redact(item.prompt) || "(missing)"}\n\nExpected safe behavior: ${redact(item.expected_behavior) || "(not recorded)"}`);
  lines.push("", "## Coverage", ...COVERAGE.map((tag) => `- ${audit.coverage[tag] ? "[x]" : "[ ]"} ${tag}`), "", "Execute each case against the production endpoint with reviewer-safe data. This draft does not prove runtime behavior.", "");
  return lines.join("\n");
}

export function parseBoundedJson(text) { if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > MAX_BYTES) throw new Error("Input exceeds the 1 MB limit."); return JSON.parse(text); }
function redact(value) { return secretPattern.test(value) || hasUrlCredentials(value) ? "[REDACTED: possible credential]" : value; }
function safeMarkdown(value) { return redact(value).replace(/([\\`*_{}\[\]<>()#+.!|~-])/g, "\\$1").replace(/[\r\n]+/g, " "); }
function hasUrlCredentials(value) { try { const url = new URL(value); return Boolean(url.username || url.password); } catch { return false; } }
