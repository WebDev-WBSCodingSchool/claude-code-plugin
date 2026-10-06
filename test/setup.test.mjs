#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
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

    // After setup the project must work with the plugin uninstalled, so no file
    // in it may point back at the plugin's files. See "The plugin and a project
    // are separate" in README.md.
    const files = execFileSync("git", ["ls-files", "-z"], { cwd: target, encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
    for (const file of files) {
      const text = readFileSync(join(target, file), "utf8");
      assert.doesNotMatch(text, /CLAUDE_PLUGIN_(ROOT|DATA)/, `${id}/${file} refers to the plugin`);
      assert.equal(text.includes(pluginRoot), false, `${id}/${file} refers to the plugin checkout`);
    }
  }

  // The plugin ships skills only. Hooks, agents, MCP servers, output styles and
  // settings in a plugin are active inside every session, including a student's
  // project, which would tie projects to the installed plugin version. Adding a
  // new top-level entry or manifest key means deciding it cannot do that.
  // `.in_use` is Claude Code's own marker in an installed copy, not ours.
  const shipped = readdirSync(pluginRoot)
    .filter((name) => name !== ".git" && name !== ".in_use")
    .sort();
  assert.deepEqual(shipped, [
    ".claude-plugin", ".github", "README.md", "exercises", "runtime", "scripts", "skills", "test",
  ]);
  const manifest = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest).sort(), ["author", "description", "name", "version"]);

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
