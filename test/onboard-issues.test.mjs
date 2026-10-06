#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scratch = mkdtempSync(join(tmpdir(), "wbs-onboard-issues-test-"));
const repo = join(scratch, "project");
const mock = join(scratch, "mock-gh.mjs");
const log = join(scratch, "gh-calls.jsonl");

try {
  cpSync(join(pluginRoot, "runtime"), repo, { recursive: true });
  copyFileSync(
    join(pluginRoot, "exercises/movie-diary/overlay/.claude/harness/config.json"),
    join(repo, ".claude/harness/config.json"),
  );
  writeFileSync(join(repo, "PLAN.md"), "- Jane Student — jane@example.com\n- Fetch movies — Jane\n");

  // Mock gh in the child process so the test never contacts GitHub, on any platform.
  writeFileSync(mock, `
import childProcess from "node:child_process";
import { appendFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const original = childProcess.execFileSync;
childProcess.execFileSync = (file, args, options) => {
  if (file !== "gh") return original(file, args, options);
  appendFileSync(process.env.WBS_TEST_GH_LOG, JSON.stringify(args) + "\\n");
  const command = args.slice(0, 2).join(" ");
  if (command === process.env.WBS_TEST_GH_FAILURE) throw new Error("simulated gh failure");
  switch (command) {
    case "auth status":
    case "repo set-default": return "";
    case "repo view": return JSON.stringify({
      nameWithOwner: "group/project",
      hasIssuesEnabled: process.env.WBS_TEST_GH_FAILURE !== "repo edit",
    });
    case "issue list": return "[]";
    case "issue create": return "https://github.com/group/project/issues/1\\n";
    default:
      if (args[0] === "api") return "";
      throw new Error("unexpected gh command: " + command);
  }
};
syncBuiltinESMExports();
`);

  const cases = [
    ["repo set-default", ["--issues"], false],
    ["repo view", ["--issues"], false],
    ["repo edit", ["--issues"], false],
    ["", ["--issues"], true],
    ["", [], false],
  ];
  for (const [failure, args, createsIssues] of cases) {
    writeFileSync(log, "");
    const result = spawnSync(process.execPath, ["--import", mock, join(repo, ".claude/hooks/onboard.mjs"), ...args], {
      cwd: repo,
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: repo, WBS_TEST_GH_LOG: log, WBS_TEST_GH_FAILURE: failure },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /PLAN.md check: passing/);
    const calls = readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
    assert.equal(calls.some((call) => call[0] === "issue" && call[1] === "create"), createsIssues, failure);
    if (createsIssues) {
      const create = calls.find((call) => call[0] === "issue" && call[1] === "create");
      assert.match(create[create.indexOf("--body") + 1], /Owner: jane@example.com/);
    }
    if (failure) assert.equal(calls.some((call) => call[0] === "issue"), false, failure);
    if (!args.length) assert.deepEqual(calls, []);
  }
  console.log(`${cases.length} optional issue checks passed`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
