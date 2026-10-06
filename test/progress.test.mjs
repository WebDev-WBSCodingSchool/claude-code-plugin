#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = mkdtempSync(join(tmpdir(), "wbs-progress-test-"));
const previousProjectDir = process.env.CLAUDE_PROJECT_DIR;
const emails = ["jane@example.com", "jane@another.edu", "jane.doe@example.com", "jane-doe@example.com"];

function useEmail(email) {
  execFileSync("git", ["config", "user.email", email], { cwd: repo });
}

try {
  cpSync(join(pluginRoot, "runtime"), repo, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: repo, stdio: "pipe" });
  process.env.CLAUDE_PROJECT_DIR = repo;
  const { studentKey, loadConfig, readProgress, writeProgress, demonstrated } =
    await import(pathToFileURL(join(repo, ".claude/hooks/harness.mjs")));
  const config = {
    ...loadConfig(),
    unlockRoute: true,
    tasks: emails.map((email, index) => ({ id: `T${index}`, categories: ["fetch"] })),
  };
  const keys = [];
  for (const [index, email] of emails.entries()) {
    useEmail(email);
    keys.push(studentKey());
    assert.match(studentKey(), /^[a-z0-9-]+$/);
    assert.deepEqual(readProgress(config), [], `${email} inherited another student's signoffs`);
    assert.equal(demonstrated(config, readProgress(config)).size, 0);
    writeProgress(config, [{ task: `T${index}`, route: "written" }]);
  }
  assert.equal(new Set(keys).size, emails.length);
  for (const [index, email] of emails.entries()) {
    useEmail(email);
    assert.equal(studentKey(), keys[index]);
    assert.deepEqual(readProgress(config), [{ task: `T${index}`, route: "written" }]);
    assert.deepEqual([...demonstrated(config, readProgress(config))], ["fetch"]);
  }
  useEmail(emails[0].toUpperCase());
  assert.equal(studentKey(), keys[0]);
  assert.deepEqual(readProgress(config), [{ task: "T0", route: "written" }]);

  assert.deepEqual(demonstrated({ ...config, unlockRoute: false, gated: ["fetch"] }, [{ route: "done" }]), new Set());
  execFileSync("git", ["add", "--all"], { cwd: repo });
  execFileSync("git", ["-c", "user.name=Progress Test", "-c", "commit.gpgsign=false", "commit", "--no-verify", "-m", "Fixture"], {
    cwd: repo, stdio: "pipe",
  });
  const before = readProgress(config);
  const retired = spawnSync(process.execPath, [join(repo, ".claude/hooks/signoff.mjs"), "--done"], {
    cwd: repo, encoding: "utf8",
  });
  assert.equal(retired.status, 1, retired.stderr);
  assert.deepEqual(readProgress(config), before);
  const status = spawnSync(process.execPath, [join(repo, ".claude/hooks/signoff.mjs"), "--status"], {
    cwd: repo, encoding: "utf8",
  });
  assert.equal(status.status, 0, status.stderr);
  assert.doesNotMatch(status.stdout, /--done|Core hand-written/);
  console.log("Progress identity and signoff checks passed");
} finally {
  if (previousProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = previousProjectDir;
  rmSync(repo, { recursive: true, force: true });
}
