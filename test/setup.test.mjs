#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const pluginRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const setup = join(pluginRoot, "scripts", "setup.mjs");
const scratch = mkdtempSync(join(tmpdir(), "wbs-harness-plugin-test-"));

try {
  const exerciseIds = readdirSync(join(pluginRoot, "exercises"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();

  for (const id of exerciseIds) {
    const target = join(scratch, id);
    execFileSync(process.execPath, [setup, "setup", id, target], { stdio: "pipe" });

    const expectedConfig = JSON.parse(
      readFileSync(join(pluginRoot, "exercises", id, "overlay", ".claude", "harness", "config.json"), "utf8"),
    );
    const config = JSON.parse(
      readFileSync(join(target, ".claude", "harness", "config.json"), "utf8"),
    );
    const lock = JSON.parse(
      readFileSync(join(target, ".claude", "harness", "lock.json"), "utf8"),
    );

    assert.deepEqual(config, expectedConfig);
    assert.equal(lock.exercise, id);
    for (const file of new Set(config.tasks.map((task) => task.file))) {
      assert.equal(existsSync(join(target, file)), true, `${id} is missing ${file}`);
    }
    assert.equal(
      execFileSync("git", ["config", "--get", "core.hooksPath"], {
        cwd: target,
        encoding: "utf8",
      }).trim(),
      ".claude/githooks",
    );
    assert.equal(
      execFileSync("git", ["status", "--porcelain"], { cwd: target, encoding: "utf8" }),
      "",
    );
  }

  const rejected = spawnSync(process.execPath, [setup, "setup", "not-an-exercise"], {
    cwd: scratch,
    encoding: "utf8",
  });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /unknown exercise/);

  console.log(`${exerciseIds.length} setup integration checks passed`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
