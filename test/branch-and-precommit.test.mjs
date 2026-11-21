#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "exercise");
const scratch = mkdtempSync(join(tmpdir(), "wbs-branch-precommit-test-"));

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Jane Student",
  GIT_AUTHOR_EMAIL: "jane@example.com",
  GIT_COMMITTER_NAME: "Jane Student",
  GIT_COMMITTER_EMAIL: "jane@example.com",
};

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    env: gitEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function makeRepo(name, configPatch = {}) {
  const repo = join(scratch, name);
  cpSync(join(pluginRoot, "runtime"), repo, { recursive: true });
  const configPath = join(repo, ".claude/harness/config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  Object.assign(config, {
    assignment: "branch test",
    onboarding: true,
    unlockRoute: true,
    branchDiscipline: "warn",
    integrationBranch: "main",
    gated: ["fetch"],
    tasks: [{ id: "FR001", title: "Task 1", file: "main.js", categories: ["fetch"] }],
    ...configPatch,
  });
  delete config.variant;
  delete config.localFile;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(join(repo, "main.js"), "// starter\n");

  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.name", "Jane Student"]);
  git(repo, ["config", "user.email", "jane@example.com"]);
  git(repo, ["config", "commit.gpgsign", "false"]);
  git(repo, ["add", "--all"]);
  git(repo, ["commit", "--no-verify", "-m", "Initial starter"]);
  return repo;
}

try {
  // 1. branchState() unit checks via harness.mjs in isolated subprocess
  const repo = makeRepo("branch-states");
  const queryBranchState = () => {
    const out = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { loadConfig, branchState } from ${JSON.stringify(pathToFileURL(join(repo, ".claude/hooks/harness.mjs")).href)};
         console.log(JSON.stringify(branchState(loadConfig())));`,
      ],
      { cwd: repo, env: { ...gitEnv, CLAUDE_PROJECT_DIR: repo }, encoding: "utf8" },
    );
    return JSON.parse(out.trim());
  };

  // Solo auto-disable: no PLAN.md -> mode drops to "off"
  assert.deepEqual(queryBranchState(), { mode: "off", branch: "", problems: [] });

  // Single-member PLAN.md -> still solo -> mode drops to "off"
  writeFileSync(join(repo, "PLAN.md"), "- Jane — jane@example.com\n- FR001 — Jane\n");
  assert.deepEqual(queryBranchState(), { mode: "off", branch: "", problems: [] });

  // Group PLAN.md (2 members) on main -> on-main problem
  writeFileSync(
    join(repo, "PLAN.md"),
    "- Jane — jane@example.com\n- Mo — mo@example.com\n- FR001 — Jane\n- FR002 — Mo\n",
  );
  git(repo, ["add", "PLAN.md"]);
  git(repo, ["commit", "--no-verify", "-m", "Add group plan"]);

  const onMain = queryBranchState();
  assert.equal(onMain.mode, "warn");
  assert.equal(onMain.branch, "main");
  assert.deepEqual(onMain.problems.map((p) => p.code), ["on-main"]);

  // Fresh feature branch (same tip as main) -> NOT flagged as merged
  git(repo, ["switch", "-c", "feat-fresh"]);
  assert.deepEqual(queryBranchState().problems, []);

  // Commit on feature branch -> clean
  writeFileSync(join(repo, "main.js"), "// work 1\n");
  git(repo, ["add", "main.js"]);
  git(repo, ["commit", "--no-verify", "-m", "feat-fresh commit"]);
  assert.deepEqual(queryBranchState().problems, []);

  // Merge into main, advance main, switch back to feat-fresh -> "merged" (and NOT "stale-base")
  git(repo, ["switch", "main"]);
  git(repo, ["merge", "--no-ff", "--no-verify", "feat-fresh", "-m", "Merge feat-fresh"]);
  writeFileSync(join(repo, "notes.txt"), "main moved\n");
  git(repo, ["add", "notes.txt"]);
  git(repo, ["commit", "--no-verify", "-m", "Advance main"]);
  git(repo, ["switch", "feat-fresh"]);
  assert.deepEqual(queryBranchState().problems.map((p) => p.code), ["merged"]);

  // Stale base: cut feat-stale before advancing main
  git(repo, ["switch", "main"]);
  git(repo, ["switch", "-c", "feat-stale"]);
  writeFileSync(join(repo, "main.js"), "// stale branch work\n");
  git(repo, ["add", "main.js"]);
  git(repo, ["commit", "--no-verify", "-m", "Work on feat-stale"]);
  git(repo, ["switch", "main"]);
  writeFileSync(join(repo, "notes.txt"), "main moved again\n");
  git(repo, ["add", "notes.txt"]);
  git(repo, ["commit", "--no-verify", "-m", "Advance main again"]);
  git(repo, ["switch", "feat-stale"]);
  assert.deepEqual(queryBranchState().problems.map((p) => p.code), ["stale-base"]);

  // Reused branch: signoff recorded on current branch -> "reused"
  git(repo, ["switch", "main"]);
  git(repo, ["switch", "-c", "feat-reused"]);
  writeFileSync(join(repo, "main.js"), "// task 1\n");
  git(repo, ["add", "main.js"]);
  git(repo, ["commit", "--no-verify", "-m", "FR001 work"]);
  const signoffRes = spawnSync(
    process.execPath,
    [join(repo, ".claude/hooks/signoff.mjs"), "FR001"],
    { cwd: repo, env: { ...gitEnv, CLAUDE_PROJECT_DIR: repo }, encoding: "utf8" },
  );
  assert.equal(signoffRes.status, 0, signoffRes.stderr);
  assert.deepEqual(queryBranchState().problems.map((p) => p.code), ["reused"]);

  // branchDiscipline: "off" suppresses all checks even on main
  const offCfg = JSON.parse(readFileSync(join(repo, ".claude/harness/config.json"), "utf8"));
  offCfg.branchDiscipline = "off";
  writeFileSync(join(repo, ".claude/harness/config.json"), `${JSON.stringify(offCfg, null, 2)}\n`);
  git(repo, ["switch", "main"]);
  assert.deepEqual(queryBranchState().problems, []);

  // 2. pre-commit & pre-commit.mjs integration checks
  const blockRepo = makeRepo("precommit-block", { branchDiscipline: "block" });
  writeFileSync(
    join(blockRepo, "PLAN.md"),
    "- Jane — jane@example.com\n- Mo — mo@example.com\n- FR001 — Jane\n- FR002 — Mo\n",
  );
  git(blockRepo, ["add", "PLAN.md"]);
  git(blockRepo, ["commit", "--no-verify", "-m", "Add group plan"]);
  git(blockRepo, ["config", "core.hooksPath", ".claude/githooks"]);

  // Direct pre-commit.mjs invocation on main in block mode -> exits 9
  const directBlock = spawnSync(
    process.execPath,
    [join(blockRepo, ".claude/githooks/pre-commit.mjs")],
    { cwd: blockRepo, env: { ...gitEnv, CLAUDE_PROJECT_DIR: blockRepo }, encoding: "utf8" },
  );
  assert.equal(directBlock.status, 9);

  // git commit with pre-commit hook on main in block mode -> blocked (exit 1)
  writeFileSync(join(blockRepo, "main.js"), "// direct main edit\n");
  git(blockRepo, ["add", "main.js"]);
  const blockedCommit = spawnSync("git", ["commit", "-m", "Blocked commit"], {
    cwd: blockRepo,
    env: gitEnv,
    encoding: "utf8",
  });
  assert.notEqual(blockedCommit.status, 0);
  assert.match(blockedCommit.stderr, /This commit was not made/);

  // Same commit on a feature branch -> succeeds
  git(blockRepo, ["switch", "-c", "FR001-task"]);
  const okCommit = spawnSync("git", ["commit", "-m", "Clean branch commit"], {
    cwd: blockRepo,
    env: gitEnv,
    encoding: "utf8",
  });
  assert.equal(okCommit.status, 0, okCommit.stderr);

  // warn mode without a controlling TTY (detached session) -> fails open (exit 0)
  const warnRepo = makeRepo("precommit-warn", { branchDiscipline: "warn" });
  writeFileSync(
    join(warnRepo, "PLAN.md"),
    "- Jane — jane@example.com\n- Mo — mo@example.com\n- FR001 — Jane\n- FR002 — Mo\n",
  );
  git(warnRepo, ["add", "PLAN.md"]);
  git(warnRepo, ["commit", "--no-verify", "-m", "Add group plan"]);
  const warnNonTty = spawnSync(
    process.execPath,
    [join(warnRepo, ".claude/githooks/pre-commit.mjs")],
    {
      cwd: warnRepo,
      env: { ...gitEnv, CLAUDE_PROJECT_DIR: warnRepo },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    },
  );
  assert.equal(warnNonTty.status, 0, warnNonTty.stderr);

  // Shell wrapper fail-open when config is corrupt or `node` is missing from PATH
  writeFileSync(join(blockRepo, ".claude/harness/config.json"), "{not-valid-json");
  const corruptRes = spawnSync("sh", [join(blockRepo, ".claude/githooks/pre-commit")], {
    cwd: blockRepo,
    env: { ...gitEnv, CLAUDE_PROJECT_DIR: blockRepo },
    encoding: "utf8",
  });
  assert.equal(corruptRes.status, 0);

  const emptyBin = join(scratch, "empty-bin");
  mkdirSync(emptyBin);
  const shPath = "/bin";
  const missingNodeRes = spawnSync("/bin/sh", [join(blockRepo, ".claude/githooks/pre-commit")], {
    cwd: blockRepo,
    env: { PATH: `${emptyBin}:${shPath}` },
    encoding: "utf8",
  });
  // Ensure even if /bin doesn't have node (if /bin/node exists, test fake failing executable in emptyBin)
  if (missingNodeRes.status !== 0) {
    throw new Error(`Expected shell wrapper fail-open, got ${missingNodeRes.status}`);
  }
  const fakeNode = join(emptyBin, "node");
  writeFileSync(fakeNode, "#!/bin/sh\nexit 2\n");
  chmodSync(fakeNode, 0o755);
  const nonNineRes = spawnSync("/bin/sh", [join(blockRepo, ".claude/githooks/pre-commit")], {
    cwd: blockRepo,
    env: { PATH: `${emptyBin}:/bin:/usr/bin` },
    encoding: "utf8",
  });
  assert.equal(nonNineRes.status, 0);

  console.log("branchState and pre-commit hook checks passed");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
