import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

/**
 * Strip nested Claude Code session env vars so child `claude -p` processes
 * run cleanly when evals are launched from inside a Claude Code session.
 */
export function sanitizeClaudeEnv(env = process.env) {
  const clean = {};
  for (const [k, v] of Object.entries(env ?? {})) {
    if (k === "CLAUDECODE" || k === "CLAUDE_CODE_ENTRYPOINT") continue;
    clean[k] = v;
  }
  return clean;
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
