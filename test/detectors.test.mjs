#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// New detectors add one row with at least one positive and one nearby negative.
const CASES = [
  ["fetch", "main.js", 'fetch("/api")', "const fetched = true"],
  ["getRequests", "main.js", 'fetch("/api")', 'fetch("/api", { method: "POST" })'],
  ["postRequests", "main.js", 'fetch("/api", { method: "POST" })', 'fetch("/api")'],
  ["putRequests", "main.js", 'fetch("/api", { method: "PUT" })', 'fetch("/api")'],
  ["deleteRequests", "main.js", 'fetch("/api", { method: "DELETE" })', 'fetch("/api")'],
  ["dom", "main.js", 'document.createElement("li")', 'button.addEventListener("click", run)'],
  ["localStorage", "main.js", 'localStorage.setItem("key", value)', "const storage = new Map()"],
  ["reactRendering", "App.jsx", "return <main />", "return a < b"],
  ["reactState", "App.jsx", "useState(0)", "const state = 0"],
  ["reactEffects", "App.jsx", "useEffect(() => {}, [])", "function effect() {}"],
  ["reactRouting", "App.jsx", '<Route path="/" element={<Home />} />', "const routes = []"],
  ["errorHandling", "main.js", "if (!response.ok) throw new Error()", "try { parse() } catch {}"],
  [
    "frontendAuth",
    "auth.js",
    'localStorage.setItem("token", token)',
    'localStorage.setItem("theme", "dark")',
  ],
  ["typedReact", "App.tsx", "type Artwork = { id: number }", 'import type { Artwork } from "./artwork"'],
  ["runtimeValidation", "schema.ts", "z.object({ id: z.number() })", "JSON.parse(text)"],
  ["semanticHtml", "index.html", "<!doctype html><main></main>", "if (a < b) return a"],
  ["css", "styles.css", "display: flex;", 'const box = { display: "flex" }'],
  ["tailwindStyling", "index.html", '<div class="flex gap-4">', '<div class="card">'],
  ["esModules", "main.js", 'import { render } from "./render.js"', "let exportButton = null"],
  ["viteConfig", "vite.config.js", "defineConfig({})", 'const config = { input: "main.js" }'],
];

function denied(repo, file, content) {
  const result = spawnSync(process.execPath, [join(repo, ".claude", "hooks", "guard.mjs")], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
    input: JSON.stringify({ tool_input: { file_path: file, content } }),
  });
  assert.equal(result.status, 0, result.stderr);
  return /"permissionDecision":"deny"/.test(result.stdout);
}

for (const [category, file, positive, negative] of CASES) {
  const repo = mkdtempSync(join(tmpdir(), `wbs-detector-${category}-`));
  try {
    cpSync(join(pluginRoot, "runtime"), repo, { recursive: true });
    const configPath = join(repo, ".claude", "harness", "config.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.assignment = "detector test";
    delete config.variant;
    delete config.localFile;
    config.onboarding = false;
    config.unlockRoute = true;
    config.gated = [category];
    config.guardedExtensions = [".js", ".jsx", ".ts", ".tsx", ".html", ".css"];
    config.tasks = [{ id: "T1", title: "Detector test", file, categories: [category] }];
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    assert.equal(denied(repo, file, positive), true, `${category} missed its positive case`);
    assert.equal(denied(repo, file, negative), false, `${category} caught its negative case`);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

console.log(`${CASES.length} detector checks passed`);
