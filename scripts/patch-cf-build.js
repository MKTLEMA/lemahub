#!/usr/bin/env node
/**
 * Post-build patch: fixes circular ESM dependency in Nitro's cloudflare-module output.
 *
 * Nitro generates two SSR chunks where:
 *   A.mjs imports `server_exports` from B.mjs
 *   B.mjs imports `__exportAll` + `createCsrfMiddleware` from A.mjs
 *
 * Cloudflare Workers ESM runtime doesn't handle circular deps well — exports are
 * undefined at init time. This patch inlines A's exports into B, breaking the cycle.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ssrDir = join(import.meta.dirname, "..", ".output", "server", "_ssr");
const files = readdirSync(ssrDir).filter((f) => f.endsWith(".mjs"));

// Step 1: find the source file (has __exportAll definition) and target file (imports it)
let sourceFile = null;
let targetFile = null;

for (const f of files) {
	const content = readFileSync(join(ssrDir, f), "utf-8");
	if (content.includes("var __exportAll") && content.includes("var createCsrfMiddleware")) {
		sourceFile = f;
	}
	if (/import\s*\{[^}]*__exportAll/.test(content)) {
		targetFile = f;
	}
}

if (!sourceFile || !targetFile) {
	console.log("[patch-cf-build] No circular dependency detected — skipping.");
	process.exit(0);
}

if (sourceFile === targetFile) {
	console.error("[patch-cf-build] Source and target are the same — aborting.");
	process.exit(1);
}

console.log(`[patch-cf-build] Source: ${sourceFile}`);
console.log(`[patch-cf-build] Target: ${targetFile}`);

const sourceContent = readFileSync(join(ssrDir, sourceFile), "utf-8");
let targetContent = readFileSync(join(ssrDir, targetFile), "utf-8");

// Step 2: extract __defProp + __exportAll and CSRF middleware from source
const defPropExportAllMatch = sourceContent.match(
	/var __defProp\s*=\s*Object\.defineProperty;\s*\nvar __exportAll\s*=\s*\(all,\s*no_symbols\)\s*=>\s*\{[\s\S]*?\n\};/,
);
if (!defPropExportAllMatch) {
	console.error("[patch-cf-build] Failed to extract __defProp + __exportAll.");
	process.exit(1);
}

// Extract from "var createMiddleware" through the last helper function before the export line
const csrfStart = sourceContent.indexOf("var createMiddleware");
const exportLine = sourceContent.lastIndexOf("export {");
if (csrfStart === -1 || exportLine === -1) {
	console.error("[patch-cf-build] Failed to locate CSRF block boundaries.");
	process.exit(1);
}
// Get everything from createMiddleware to just before the export line
const csrfBlock = sourceContent.slice(csrfStart, exportLine).trimEnd();

const inlinedCode = `${defPropExportAllMatch[0]}\n\n// ── Inlined CSRF middleware (circular dep fix for CF Workers) ──\n${csrfBlock}\n// ── End inlined ──\n`;

// Step 3: replace the import line in target
const importRegex = /import\s*\{[^}]*__exportAll[^}]*\}\s*from\s*"\.\/[^"]+"\s*;\n?/;
if (!importRegex.test(targetContent)) {
	console.error("[patch-cf-build] Could not find import line in target.");
	process.exit(1);
}
targetContent = targetContent.replace(importRegex, inlinedCode);

// Step 4: make defaultCsrfMiddleware lazy (avoid top-level call that may fail)
if (targetContent.includes("var defaultCsrfMiddleware = createCsrfMiddleware({")) {
	targetContent = targetContent.replace(
		/var defaultCsrfMiddleware = createCsrfMiddleware\(\{ filter: \(ctx\) => ctx\.handlerType === "serverFn" \}\);/,
		`var _defaultCsrfMw;
function _getDefaultCsrfMw() {
	if (!_defaultCsrfMw) _defaultCsrfMw = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" });
	return _defaultCsrfMw;
}`,
	);
	// Replace usage
	targetContent = targetContent.replace(
		/\[defaultCsrfMiddleware\]/g,
		"[_getDefaultCsrfMw()]",
	);
}

// Step 5: write
writeFileSync(join(ssrDir, targetFile), targetContent);
console.log(`[patch-cf-build] Patched ${targetFile} successfully.`);
