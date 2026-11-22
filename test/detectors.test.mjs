#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'exercise');

// New detectors add one row with at least one positive and one nearby negative.
const CASES = [
  ['fetch', 'main.js', 'fetch("/api")', 'const fetched = true'],
  ['getRequests', 'main.js', 'fetch("/api")', 'fetch("/api", { method: "POST" })'],
  ['getRequests', 'main.js', 'fetch("https://fakestoreapi.com/products", { cache: "no-store" })', 'fetch("/api", { headers: { Authorization: "Bearer x" }, method: "PUT", body: "{}" })'],
  ['getRequests', 'main.js', 'fetch("https://fakestoreapi.com/products", { next: { revalidate: 60 } })', 'fetch("/api", { method: "DELETE" })'],
  ['getRequests', 'main.js', 'fetch(url, { signal: controller.signal })', 'fetch(url, { method })'],
  ['getRequests', 'main.js', 'fetch(url, { headers: { Authorization: `Bearer ${token}` } })', 'fetch(url, options)'],
  ['getRequests', 'main.js', 'fetch(url, { method: "GET" })', 'fetch(url, { ...opts })'],
  ['getRequests', 'main.js', 'fetch(BASE + "/events")', 'const getRequests = []'],
  ['getRequests', 'main.js', 'fetch(buildUrl())', 'function fetchData() {}'],
  ['getRequests', 'main.js', 'fetch(url, { cache: "no-store" });\nfetch(url, { method: "POST" });', 'fetch(url, { method: "POST" })'],
  ['getRequests', 'main.js', 'fetch(\n  "/api",\n)', 'fetch(url, {\n  // create\n  method: "POST",\n})'],
  ['getRequests', 'main.js', 'fetch(url, { method: "GET" /* read */ })', 'fetch(url, {\n  /* spread */\n  ...opts,\n})'],
  ['postRequests', 'main.js', 'fetch("/api", { method: "POST" })', 'fetch("/api")'],
  ['putRequests', 'main.js', 'fetch("/api", { method: "PUT" })', 'fetch("/api")'],
  ['deleteRequests', 'main.js', 'fetch("/api", { method: "DELETE" })', 'fetch("/api")'],
  ['dom', 'main.js', 'document.createElement("li")', 'button.addEventListener("click", run)'],
  ['localStorage', 'main.js', 'localStorage.setItem("key", value)', 'const storage = new Map()'],
  ['reactRendering', 'App.jsx', 'return <main />', 'return a < b'],
  ['reactState', 'App.jsx', 'useState(0)', 'const state = 0'],
  ['reactEffects', 'App.jsx', 'useEffect(() => {}, [])', 'function effect() {}'],
  [
    'clientComponents',
    'CartTable.tsx',
    '"use client";\nexport function CartTable() {}',
    "// No 'use client' here: this page renders on the server\nexport default async function Page() {}",
  ],
  [
    'reactContext',
    'CartContext.tsx',
    'const CartContext = createContext<Cart | null>(null)',
    'const { items } = useCart()',
  ],
  [
    'reactContext',
    'CartContext.tsx',
    '<CartContext value={cart}>{children}</CartContext>',
    '<CartContextProvider>{children}</CartContextProvider>',
  ],
  ['reactRouting', 'App.jsx', '<Route path="/" element={<Home />} />', 'const routes = []'],
  ['errorHandling', 'main.js', 'if (!response.ok) throw new Error()', 'try { parse() } catch {}'],
  ['frontendAuth', 'auth.js', 'localStorage.setItem("token", token)', 'localStorage.setItem("theme", "dark")'],
  ['typedReact', 'App.tsx', 'type Artwork = { id: number }', 'import type { Artwork } from "./artwork"'],
  ['typedReact', 'App.tsx', 'const items: Artwork[] = []', 'const { id: artworkId } = artwork'],
  ['typedReact', 'App.tsx', 'const label: string = "hi"', 'const obj = { a: 1, b: String }'],
  ['typedReact', 'App.tsx', 'const add = (a, b: number) => a + b', 'fn({ a: 1, b: String })'],
  ['typedReact', 'App.tsx', 'const onPick = (e, item: Artwork) => {}', 'const label = "x: string"'],
  ['runtimeValidation', 'schema.ts', 'z.object({ id: z.number() })', 'JSON.parse(text)'],
  ['semanticHtml', 'index.html', '<!doctype html><main></main>', 'if (a < b) return a'],
  ['css', 'styles.css', 'display: flex;', 'const box = { display: "flex" }'],
  ['tailwindStyling', 'index.html', '<div class="flex gap-4">', '<div class="card">'],
  ['tailwindStyling', 'App.jsx', '<div className={`flex gap-4 ${active ? "bg-blue-500" : ""}`}>', '<div className={`card ${active ? "card-active" : ""}`}>'],
  ['tailwindStyling', 'App.jsx', '<div className={`md:grid ${open ? "block" : "hidden"}`}>', 'const classes = `flex gap-4`'],
  ['tailwindStyling', 'App.jsx', '<div className={active ? "flex" : "hidden"}>', '<div className={`card ${active ? "card-active" : ""}`}>'],
  ['tailwindStyling', 'index.html', '<div class="\n  flex\n  gap-4\n">', '<div class="\n  card\n">'],
  ['tailwindStyling', 'App.jsx', '<div className={\n  active ? "flex" : "hidden"\n} />', '<div className={`card ${hidden ? "card-off" : "card-on"}`} />'],
  ['tailwindStyling', 'App.jsx', '<div className={`${base} flex`} />', '<div className={`${fixed} card`} />'],
  ['esModules', 'main.js', 'import { render } from "./render.js"', 'let exportButton = null'],
  ['viteConfig', 'vite.config.js', 'defineConfig({})', 'const config = { input: "main.js" }'],
];

function denied(repo, file, content) {
  const result = spawnSync(process.execPath, [join(repo, '.claude', 'hooks', 'guard.mjs')], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
    input: JSON.stringify({ tool_input: { file_path: file, content } }),
  });
  assert.equal(result.status, 0, result.stderr);
  return /"permissionDecision":"deny"/.test(result.stdout);
}

function deniedEdit(repo, file, old_string, new_string) {
  const result = spawnSync(process.execPath, [join(repo, '.claude', 'hooks', 'guard.mjs')], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
    input: JSON.stringify({ tool_input: { file_path: file, old_string, new_string } }),
  });
  assert.equal(result.status, 0, result.stderr);
  return /"permissionDecision":"deny"/.test(result.stdout);
}

for (const [category, file, positive, negative] of CASES) {
  const repo = mkdtempSync(join(tmpdir(), `wbs-detector-${category}-`));
  try {
    cpSync(join(pluginRoot, 'runtime'), repo, { recursive: true });
    const configPath = join(repo, '.claude', 'harness', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    config.assignment = 'detector test';
    delete config.variant;
    delete config.localFile;
    config.onboarding = false;
    config.unlockRoute = true;
    config.gated = [category];
    config.guardedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css'];
    config.tasks = [{ id: 'T1', title: 'Detector test', file, categories: [category] }];
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    assert.equal(denied(repo, file, positive), true, `${category} missed its positive case`);
    assert.equal(denied(repo, file, negative), false, `${category} caught its negative case`);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

// #24: Edit payload diffing & post-edit checks
{
  const repo = mkdtempSync(join(tmpdir(), 'wbs-edit-scope-'));
  try {
    cpSync(join(pluginRoot, 'runtime'), repo, { recursive: true });
    const configPath = join(repo, '.claude', 'harness', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    config.assignment = 'edit scope test';
    delete config.variant;
    delete config.localFile;
    config.onboarding = false;
    config.unlockRoute = true;
    config.gated = ['reactState', 'fetch', 'getRequests'];
    config.guardedExtensions = ['.js', '.jsx'];
    config.tasks = [{ id: 'T1', title: 'Test', file: 'App.jsx', categories: ['reactState', 'fetch', 'getRequests'] }];
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    // 1. Unchanged gated context line adjacent to an open edit must be allowed
    writeFileSync(join(repo, 'App.jsx'), 'const [count, setCount] = useState(0);\n// old comment\n');
    assert.equal(
      deniedEdit(repo, 'App.jsx', 'const [count, setCount] = useState(0);\n// old comment', 'const [count, setCount] = useState(0);\n// new comment'),
      false,
      'unchanged useState context line falsely blocked open comment edit',
    );

    // 2. Adding a new gated line alongside existing gated line must be denied
    assert.equal(
      deniedEdit(
        repo,
        'App.jsx',
        'const [count, setCount] = useState(0);\n// old comment',
        'const [count, setCount] = useState(0);\nconst [name, setName] = useState("");',
      ),
      true,
      'newly added useState line missed',
    );

    // 3. Inline split-edit bypass (`fet` + `ch`) must be denied
    writeFileSync(join(repo, 'App.jsx'), 'fet("/api");\n');
    assert.equal(
      deniedEdit(repo, 'App.jsx', 't("/api")', 'tch("/api")'),
      true,
      'inline split-edit completing fetch("/api") was not caught',
    );

    // 4. Multi-line split-edit completing a gated call must be denied
    writeFileSync(join(repo, 'App.jsx'), 'fetch\n("/api");\n');
    assert.equal(
      deniedEdit(repo, 'App.jsx', 'fetch\n("/api");', 'fetch(\n"/api");'),
      true,
      'multi-line split-edit completing fetch("/api") was not caught',
    );

    // 5. Deletion-only edit joining `fet\nch(` into `fetch(` must be denied
    writeFileSync(join(repo, 'App.jsx'), 'fet\nch("/api");\n');
    assert.equal(deniedEdit(repo, 'App.jsx', 'fet\n', 'fet'), true, 'newline deletion joining fetch( was not caught');

    // 6. Deleting `method: "POST"` turns the call into a GET and must be denied
    writeFileSync(join(repo, 'App.jsx'), 'fetch("/api", {\n  method: "POST",\n  cache: "no-store",\n});\n');
    assert.equal(deniedEdit(repo, 'App.jsx', '  method: "POST",\n', ''), true, 'deleting method: POST was not caught');

    // 7. Deleting a line between existing gated lines must still be allowed
    writeFileSync(join(repo, 'App.jsx'), 'const [a, setA] = useState(0);\n// remove me\nconst [b, setB] = useState(1);\n');
    assert.equal(deniedEdit(repo, 'App.jsx', '// remove me\n', ''), false, 'deleting a comment next to useState was blocked');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

// #12: Case-insensitive locked-path matching and symlinked roots
{
  const scratch = mkdtempSync(join(tmpdir(), 'wbs-locked-paths-'));
  try {
    const realRepo = join(scratch, 'real-repo');
    const linkRepo = join(scratch, 'link-repo');
    cpSync(join(pluginRoot, 'runtime'), realRepo, { recursive: true });
    symlinkSync(realRepo, linkRepo, 'dir');

    const checkLocked = (cwd, projectDir, filePath) => {
      const res = spawnSync(process.execPath, [join(realRepo, '.claude', 'hooks', 'guard.mjs')], {
        cwd,
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
        input: JSON.stringify({ tool_input: { file_path: filePath, content: 'overwrite' } }),
      });
      assert.equal(res.status, 0, res.stderr);
      return JSON.parse(res.stdout);
    };

    for (const mixedCase of ['readme.md', 'plan.md', '.Claude/harness/config.json', '.CLAUDE/githooks/pre-commit']) {
      const out = checkLocked(realRepo, realRepo, mixedCase);
      assert.equal(out.hookSpecificOutput.permissionDecision, 'deny', `missed mixed-case lock for ${mixedCase}`);
      if (mixedCase === 'plan.md') {
        assert.match(out.systemMessage, /group writes their own plan/i);
      }
    }

    // Symlinked project root vs real file_path and vice versa
    const symlinkTargetRes = checkLocked(realRepo, linkRepo, join(realRepo, 'README.md'));
    assert.equal(symlinkTargetRes.hookSpecificOutput.permissionDecision, 'deny');
    const symlinkRootRes = checkLocked(linkRepo, realRepo, join(linkRepo, '.Claude', 'hooks', 'guard.mjs'));
    assert.equal(symlinkRootRes.hookSpecificOutput.permissionDecision, 'deny');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

console.log(`${CASES.length} detector checks passed`);
