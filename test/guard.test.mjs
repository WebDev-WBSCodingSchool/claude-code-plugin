#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "exercise");
const scratch = mkdtempSync(join(tmpdir(), "wbs-guard-test-"));

function runGuard(repo, payload, { cwd = repo, projectDir = repo, rawInput = null } = {}) {
  const res = spawnSync(process.execPath, [join(repo, ".claude/hooks/guard.mjs")], {
    cwd,
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    input: rawInput ?? JSON.stringify({ tool_input: payload }),
    encoding: "utf8",
  });
  assert.equal(res.status, 0, res.stderr);
  return {
    stdout: res.stdout,
    decision: res.stdout ? JSON.parse(res.stdout) : null,
  };
}

function setupRepo(name, configOverrides = {}) {
  const repo = join(scratch, name);
  cpSync(join(pluginRoot, "runtime"), repo, { recursive: true });
  const cfgPath = join(repo, ".claude/harness/config.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  Object.assign(cfg, {
    assignment: "guard test",
    onboarding: true,
    unlockRoute: true,
    gated: ["fetch", "dom"],
    guardedExtensions: [".js", ".jsx", ".html"],
    tasks: [
      { id: "T1", title: "Fetch data", file: "main.js", categories: ["fetch"] },
      { id: "T2", title: "Render DOM", file: "main.js", categories: ["dom"] },
    ],
    ...configOverrides,
  });
  delete cfg.variant;
  delete cfg.localFile;
  writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
  execFileSync("git", ["init", "-b", "main"], { cwd: repo, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "jane@example.com"], { cwd: repo, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "Jane"], { cwd: repo, stdio: "pipe" });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repo, stdio: "pipe" });
  return repo;
}

try {
  // 1. Locked paths: neverWritable, canonical, PLAN.md, mixed case, symlinks
  const lockRepo = setupRepo("locks");
  const lockLink = join(scratch, "locks-symlink");
  symlinkSync(lockRepo, lockLink, "dir");

  const machineryPaths = [
    ".claude/harness/config.json",
    ".claude/harness/progress/abc.json",
    ".claude/settings.json",
    ".claude/settings.local.json",
    ".claude/hooks/guard.mjs",
    ".claude/githooks/pre-commit",
    ".claude/githooks/pre-commit.mjs",
    ".claude/skills/tutor/SKILL.md",
    ".vscode/settings.json",
    ".CLAUDE/githooks/pre-commit",
    ".Claude/HARNESS/config.json",
  ];
  for (const p of machineryPaths) {
    const res = runGuard(lockRepo, { file_path: p, content: "x" });
    assert.equal(res.decision?.hookSpecificOutput?.permissionDecision, "deny", `expected deny for ${p}`);
  }

  const canonicalPaths = [
    "README.md",
    "readme.md",
    "CLAUDE.md",
    "AGENTS.md",
    "GEMINI.md",
    ".github/copilot-instructions.md",
  ];
  for (const p of canonicalPaths) {
    const res = runGuard(lockRepo, { file_path: p, content: "x" });
    assert.equal(res.decision?.hookSpecificOutput?.permissionDecision, "deny", `expected deny for ${p}`);
    assert.match(res.decision.systemMessage, /brief/i);
  }

  for (const planName of ["PLAN.md", "plan.md"]) {
    const res = runGuard(lockRepo, { file_path: planName, content: "- Jane — jane@example.com" });
    assert.equal(res.decision?.hookSpecificOutput?.permissionDecision, "deny");
    assert.match(res.decision.systemMessage, /plan/i);
  }

  // Symlinked root & target
  const symRes = runGuard(
    lockRepo,
    { file_path: join(lockRepo, "README.md"), content: "x" },
    { projectDir: lockLink },
  );
  assert.equal(symRes.decision?.hookSpecificOutput?.permissionDecision, "deny");

  // 2. writableExceptions opens locked path while still enforcing content detectors inside it
  const excRepo = setupRepo("writable-exc", {
    onboarding: false,
    neverWritable: [".claude/custom/", ".claude/hooks/"],
    writableExceptions: [".claude/custom/"],
  });
  assert.equal(
    runGuard(excRepo, { file_path: ".claude/custom/helper.js", content: "export const x = 1;" }).decision,
    null,
  );
  assert.equal(
    runGuard(excRepo, { file_path: ".claude/custom/helper.js", content: 'fetch("/api");' }).decision
      ?.hookSpecificOutput?.permissionDecision,
    "deny",
  );

  // 3. Onboarding gate blocks guarded extensions until PLAN.md passes, allows non-guarded files
  assert.equal(
    runGuard(lockRepo, { file_path: "notes.md", content: "# Notes" }).decision,
    null,
  );
  const noPlanRes = runGuard(lockRepo, { file_path: "main.js", content: "const x = 1;" });
  assert.equal(noPlanRes.decision?.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(noPlanRes.decision.systemMessage, /plan/i);

  writeFileSync(join(lockRepo, "PLAN.md"), "# Plan without emails\n- Jane\n");
  assert.equal(
    runGuard(lockRepo, { file_path: "main.js", content: "const x = 1;" }).decision
      ?.hookSpecificOutput?.permissionDecision,
    "deny",
  );

  writeFileSync(
    join(lockRepo, "PLAN.md"),
    "- Jane — jane@example.com\n- Mo — mo@example.com\n- T1 — Jane\n",
  );
  const missingMemberRes = runGuard(lockRepo, { file_path: "main.js", content: "const x = 1;" });
  assert.equal(missingMemberRes.decision?.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(missingMemberRes.decision.hookSpecificOutput.permissionDecisionReason, /mo@example\.com/);

  writeFileSync(
    join(lockRepo, "PLAN.md"),
    "- Jane — jane@example.com\n- Mo — mo@example.com\n- T1 — Jane\n- T2 — Mo\n",
  );
  // Live re-read: benign write immediately allowed once PLAN.md passes
  assert.equal(runGuard(lockRepo, { file_path: "main.js", content: "const x = 1;" }).decision, null);

  execFileSync("git", ["add", "--all"], { cwd: lockRepo, stdio: "pipe" });
  execFileSync("git", ["commit", "--no-verify", "-m", "Init"], { cwd: lockRepo, stdio: "pipe" });
  // On main (with commit): warns without denying
  const onMainAllow = runGuard(lockRepo, { file_path: "main.js", content: "const x = 1;" });
  assert.equal(onMainAllow.decision?.hookSpecificOutput?.permissionDecision, undefined);
  assert.match(onMainAllow.decision?.systemMessage ?? "", /on `main`/);

  execFileSync("git", ["switch", "-q", "-c", "T1-fetch"], { cwd: lockRepo, stdio: "pipe" });
  assert.equal(runGuard(lockRepo, { file_path: "main.js", content: "const x = 1;" }).decision, null);

  // 4. Category gating and selective unlocking via signoff
  assert.equal(
    runGuard(lockRepo, { file_path: "main.js", content: 'fetch("/api");' }).decision
      ?.hookSpecificOutput?.permissionDecision,
    "deny",
  );
  writeFileSync(join(lockRepo, "main.js"), 'fetch("/api");\n');
  execFileSync("git", ["add", "--all"], { cwd: lockRepo, stdio: "pipe" });
  execFileSync("git", ["commit", "--no-verify", "-m", "T1: fetch"], { cwd: lockRepo, stdio: "pipe" });
  const signoffOut = spawnSync(process.execPath, [join(lockRepo, ".claude/hooks/signoff.mjs"), "T1"], {
    cwd: lockRepo,
    env: { ...process.env, CLAUDE_PROJECT_DIR: lockRepo },
    encoding: "utf8",
  });
  assert.equal(signoffOut.status, 0, signoffOut.stderr);

  // fetch is now unlocked (warns about reused branch if still on T1-fetch; clean on fresh branch)
  const reusedAllow = runGuard(lockRepo, { file_path: "main.js", content: 'fetch("/api/other");' });
  assert.equal(reusedAllow.decision?.hookSpecificOutput?.permissionDecision, undefined);
  assert.match(reusedAllow.decision?.systemMessage ?? "", /already carries a signed-off task/);

  execFileSync("git", ["switch", "-q", "-c", "T2-dom"], { cwd: lockRepo, stdio: "pipe" });
  assert.equal(
    runGuard(lockRepo, { file_path: "main.js", content: 'fetch("/api/other");' }).decision,
    null,
  );
  assert.equal(
    runGuard(lockRepo, { file_path: "main.js", content: 'document.createElement("div");' }).decision
      ?.hookSpecificOutput?.permissionDecision,
    "deny",
  );

  // 5. Malformed stdin stays out of the way (exit 0, empty stdout)
  const badStdin = runGuard(lockRepo, null, { rawInput: "{not-json" });
  assert.equal(badStdin.stdout, "");

  // 6. Fail closed on corrupt config.json or corrupt progress file
  const corruptProgressDir = join(lockRepo, ".claude/harness/progress");
  mkdirSync(corruptProgressDir, { recursive: true });
  // Use the current student's key via signoff --status output or overwrite the existing progress file
  const files = execFileSync("ls", [corruptProgressDir], { encoding: "utf8" }).trim().split("\n");
  writeFileSync(join(corruptProgressDir, files[0]), "{corrupt");
  const corruptProgressRes = runGuard(lockRepo, { file_path: "main.js", content: 'fetch("/api");' });
  assert.equal(corruptProgressRes.decision?.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(corruptProgressRes.decision.systemMessage, /guard error/i);

  writeFileSync(join(lockRepo, ".claude/harness/config.json"), "{corrupt");
  const corruptCfgRes = runGuard(lockRepo, { file_path: "main.js", content: "const x = 1;" });
  assert.equal(corruptCfgRes.decision?.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(corruptCfgRes.decision.systemMessage, /guard error/i);

  console.log("guard.mjs lock, gate, unlock, and fail-closed checks passed");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
