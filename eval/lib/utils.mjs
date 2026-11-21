import { spawn } from "node:child_process";
import { realpathSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SAFE_ENV_KEYS = new Set([
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TERM",
  "COLORTERM",
  "TMPDIR",
  "TEMP",
  "TMP",
  "LANG",
  "TZ",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "NODE_EXTRA_CA_CERTS",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
  "SystemRoot",
  "COMSPEC",
  "APPDATA",
  "LOCALAPPDATA",
  "USERPROFILE",
]);

const SAFE_ENV_PREFIXES = ["LC_", "XDG_"];

export function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export function median(values, { round = null } = {}) {
  const nums = (values ?? [])
    .filter((v) => typeof v === "number" && !Number.isNaN(v))
    .sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  const raw = nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
  return typeof round === "number" ? Number(raw.toFixed(round)) : raw;
}

export function formatPct(rate) {
  if (rate === null || rate === undefined) return "—";
  return `${Math.round(rate * 100)}%`;
}

export async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIdx = 0;
  async function loop() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => loop());
  await Promise.all(runners);
  return results;
}

/**
 * Build a minimal allowlisted environment so child agents and judges do not
 * inherit unrelated credentials (e.g. GH_TOKEN, OPENAI_API_KEY, AWS_*, SSH_AUTH_SOCK).
 */
export function buildMinimalEnv(env = process.env, { extraAllowed = [] } = {}) {
  const allowed = new Set([...SAFE_ENV_KEYS, ...extraAllowed]);
  const clean = {};
  for (const [k, v] of Object.entries(env ?? {})) {
    if (v === undefined) continue;
    if (allowed.has(k) || SAFE_ENV_PREFIXES.some((p) => k.startsWith(p))) {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Allowlist environment for child `claude -p` processes (drops nested
 * CLAUDECODE/CLAUDE_CODE_ENTRYPOINT vars as well as unrelated host secrets).
 */
export function sanitizeClaudeEnv(env = process.env) {
  return buildMinimalEnv(env, {
    extraAllowed: [
      "CLAUDE_CONFIG_DIR",
      "CLAUDE_PROJECT_DIR",
      "GIT_CONFIG_GLOBAL",
      "GIT_CONFIG_NOSYSTEM",
      "GIT_TERMINAL_PROMPT",
    ],
  });
}

/**
 * Allowlist environment for child `codex exec` judge processes.
 */
export function sanitizeCodexEnv(env = process.env) {
  return buildMinimalEnv(env, {
    extraAllowed: ["CODEX_HOME"],
  });
}

/**
 * Remove the temporary ~/.claude/projects/<encoded-cwd> directory created by
 * `claude -p` for ephemeral eval sandboxes. Guarded so only `wbs-eval-*` paths
 * can ever be removed.
 */
export function cleanupClaudeProjectDir(dirPath, { projectsDir = join(homedir(), ".claude", "projects") } = {}) {
  if (!dirPath || typeof dirPath !== "string") return;
  const candidates = new Set([dirPath]);
  try {
    candidates.add(realpathSync(dirPath));
  } catch {
    // dirPath may already be removed
  }
  for (const candidate of candidates) {
    const encoded = candidate.replace(/[^a-zA-Z0-9-]/g, "-");
    if (!encoded.includes("wbs-eval-")) continue;
    try {
      rmSync(join(projectsDir, encoded), {
        recursive: true,
        force: true,
      });
    } catch {
      // best-effort cleanup
    }
  }
}

const activeCleanups = new Set();
let signalHandlersInstalled = false;

export function registerCleanup(fn) {
  if (typeof fn !== "function") return () => {};
  activeCleanups.add(fn);
  return () => {
    activeCleanups.delete(fn);
  };
}

export function runRegisteredCleanups() {
  for (const fn of [...activeCleanups]) {
    activeCleanups.delete(fn);
    try {
      fn();
    } catch {
      // ignore cleanup failures during shutdown
    }
  }
}

export function installSignalCleanup() {
  if (signalHandlersInstalled) return;
  signalHandlersInstalled = true;
  for (const [sig, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ]) {
    process.on(sig, () => {
      runRegisteredCleanups();
      process.exit(code);
    });
  }
}

export function spawnAsync(
  command,
  args,
  { cwd, env, stdinText = null, timeoutMs = 180_000 } = {},
) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: [stdinText !== null ? "pipe" : "ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
            setTimeout(() => child.kill("SIGKILL"), 5000).unref();
          }, timeoutMs)
        : null;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      resolvePromise({
        exitCode: code,
        signal,
        timedOut,
        stdout,
        stderr,
      });
    });

    if (stdinText !== null) {
      child.stdin.write(stdinText);
      child.stdin.end();
    }
  });
}

/**
 * Safely check whether an ESM module is being executed directly via `node <file>`,
 * handling spaces, symlinks, and Windows paths.
 */
export function isDirectRun(importMetaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    const target = realpathSync(resolve(argv1));
    const self = realpathSync(fileURLToPath(importMetaUrl));
    return target === self;
  } catch {
    return importMetaUrl === pathToFileURL(resolve(argv1)).href;
  }
}
