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
const scratch = mkdtempSync(join(tmpdir(), "wbs-onboard-check-test-"));
const mockGh = join(scratch, "mock-gh.mjs");

writeFileSync(
  mockGh,
  `
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
const orig = childProcess.execFileSync;
childProcess.execFileSync = (file, args, opts) => {
  if (file !== "gh") return orig(file, args, opts);
  const cmd = args.slice(0, 2).join(" ");
  if (cmd === "repo set-default") return "";
  if (cmd === "repo view") {
    return JSON.stringify({
      nameWithOwner: "team/project",
      viewerPermission: process.env.WBS_MOCK_PERM || "WRITE",
      hasIssuesEnabled: true,
    });
  }
  if (args[0] === "api") return JSON.stringify(["jane-student", "mo-ahmadi"]);
  throw new Error("unexpected gh cmd: " + args.join(" "));
};
syncBuiltinESMExports();
`,
);

function makeRepo(name, { onboarding = true, withRemote = true, withEmail = true } = {}) {
  const repo = join(scratch, name);
  cpSync(join(pluginRoot, "runtime"), repo, { recursive: true });
  const cfgPath = join(repo, ".claude/harness/config.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  cfg.assignment = "onboard check test";
  cfg.onboarding = onboarding;
  delete cfg.variant;
  delete cfg.localFile;
  writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);

  execFileSync("git", ["init", "-b", "main"], { cwd: repo, stdio: "pipe" });
  if (withEmail) {
    execFileSync("git", ["config", "user.name", "Jane Student"], { cwd: repo, stdio: "pipe" });
    execFileSync("git", ["config", "user.email", "jane@example.com"], { cwd: repo, stdio: "pipe" });
  }
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repo, stdio: "pipe" });
  execFileSync("git", ["add", "--all"], { cwd: repo, stdio: "pipe" });
  execFileSync(
    "git",
    ["-c", "user.name=Init", "-c", "user.email=init@example.com", "commit", "--no-verify", "-m", "Init"],
    { cwd: repo, stdio: "pipe" },
  );
  if (withRemote) {
    execFileSync("git", ["remote", "add", "origin", "https://example.invalid/team/project.git"], {
      cwd: repo,
      stdio: "pipe",
    });
  }
  return repo;
}

function runCheck(repo, { cwd = repo, perm = "WRITE", envOverrides = {} } = {}) {
  return spawnSync(
    process.execPath,
    ["--import", mockGh, join(repo, ".claude/hooks/onboard.mjs"), "--check"],
    {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: repo,
        WBS_MOCK_PERM: perm,
        ...envOverrides,
      },
    },
  );
}

try {
  // 1. Passing group repo at root & wires core.hooksPath
  const groupRepo = makeRepo("group-pass");
  writeFileSync(
    join(groupRepo, "PLAN.md"),
    "- Jane Student — jane@example.com\n- Mo — mo@example.com\n- T1 — Jane\n- T2 — Mo\n",
  );
  const passRes = runCheck(groupRepo);
  assert.equal(passRes.status, 0, passRes.stdout + passRes.stderr);
  assert.match(passRes.stdout, /at the repo root/);
  assert.match(passRes.stdout, /jane@example\.com is in PLAN\.md/);
  assert.match(passRes.stdout, /git will run this repo's pre-commit check/);
  assert.equal(
    execFileSync("git", ["config", "--get", "core.hooksPath"], { cwd: groupRepo, encoding: "utf8" }).trim(),
    ".claude/githooks",
  );

  // 2. Symlinked cwd at repo root still passes (#16)
  const linkRepo = join(scratch, "group-link");
  symlinkSync(groupRepo, linkRepo, "dir");
  const symRes = runCheck(groupRepo, { cwd: linkRepo });
  assert.equal(symRes.status, 0, symRes.stdout + symRes.stderr);
  assert.match(symRes.stdout, /at the repo root/);

  // 3. Running from a subfolder fails
  const sub = join(groupRepo, "src");
  mkdirSync(sub);
  const subRes = runCheck(groupRepo, { cwd: sub });
  assert.equal(subRes.status, 1);
  assert.match(subRes.stdout, /The repo root is/);

  // 4. Email missing from PLAN.md fails
  writeFileSync(
    join(groupRepo, "PLAN.md"),
    "- Other — other@example.com\n- Mo — mo@example.com\n- T1 — Other\n- T2 — Mo\n",
  );
  const wrongEmailRes = runCheck(groupRepo);
  assert.equal(wrongEmailRes.status, 1);
  assert.match(wrongEmailRes.stdout, /does not appear in PLAN\.md/);

  // 5. Missing git user.email fails (isolate from global gitconfig)
  const noEmailRepo = makeRepo("no-email", { withEmail: false });
  const emptyGitCfg = join(scratch, "empty-gitconfig");
  writeFileSync(emptyGitCfg, "");
  const noEmailRes = runCheck(noEmailRepo, {
    envOverrides: { GIT_CONFIG_GLOBAL: emptyGitCfg, GIT_CONFIG_NOSYSTEM: "1" },
  });
  assert.equal(noEmailRes.status, 1);
  assert.match(noEmailRes.stdout, /git has no user\.email set/);

  // 6. Missing origin remote fails
  const noRemoteRepo = makeRepo("no-remote", { onboarding: false, withRemote: false });
  const noRemoteRes = runCheck(noRemoteRepo);
  assert.equal(noRemoteRes.status, 1);
  assert.match(noRemoteRes.stdout, /not on GitHub yet/);

  // 7. Read-only origin fails
  const roRepo = makeRepo("read-only", { onboarding: false, withRemote: true });
  const roRes = runCheck(roRepo, { perm: "READ" });
  assert.equal(roRes.status, 1);
  assert.match(roRes.stdout, /only have read access/);

  // 8. Solo repo skips PLAN.md and passes without PLAN.md
  const soloRepo = makeRepo("solo-pass", { onboarding: false, withRemote: true });
  const soloRes = runCheck(soloRepo);
  assert.equal(soloRes.status, 0, soloRes.stdout + soloRes.stderr);
  assert.match(soloRes.stdout, /PLAN\.md check is off/);

  console.log("onboard.mjs --check integration checks passed");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
