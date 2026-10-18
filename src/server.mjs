import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
export const routes = new Map([["/", "index.html"], ["/icon.svg", "icon.svg"], ["/styles.css", "styles.css"], ["/controls.css", "controls.css"], ["/src/app.mjs", "src/app.mjs"], ["/src/core.mjs", "src/core.mjs"]]);
export const isAllowedHost = (host = "") => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host);
export function handler(req, res) { if (req.method !== "GET" || !isAllowedHost(req.headers.host) || !routes.has(req.url)) { res.writeHead(404).end("Not found"); return; } readFile(join(root, routes.get(req.url))).then((body) => { const type = req.url.endsWith(".css") ? "text/css" : req.url.endsWith(".mjs") ? "text/javascript" : req.url.endsWith(".svg") ? "image/svg+xml" : "text/html"; res.writeHead(200, { "content-type": `${type}; charset=utf-8`, "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cache-control": "no-store" }); res.end(body); }).catch(() => res.writeHead(404).end("Not found")); }
if (process.argv[1] === fileURLToPath(import.meta.url)) createServer(handler).listen(4174, "127.0.0.1", () => console.log("Plugin Review Case Studio: http://127.0.0.1:4174"));
