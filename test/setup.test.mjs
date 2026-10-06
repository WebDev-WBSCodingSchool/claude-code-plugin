#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const pluginRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const setup = join(pluginRoot, "scripts", "setup.mjs");
const scratch = mkdtempSync(join(tmpdir(), "wbs-harness-plugin-test-"));

// A stand-in npm that records each call and fails, as it would offline. Setup
// must still succeed, and the test never touches the network.
const fakeBin = join(scratch, "bin");
const npmLog = join(scratch, "npm.log");
mkdirSync(fakeBin);
writeFileSync(join(fakeBin, "npm"), `#!/bin/sh\necho "$*" >> "${npmLog}"\nexit 1\n`);
chmodSync(join(fakeBin, "npm"), 0o755);
const env = { ...process.env, PATH: `${fakeBin}${delimiter}${process.env.PATH}` };

try {
  const exerciseIds = readdirSync(join(pluginRoot, "exercises"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();

  for (const id of exerciseIds) {
    const target = join(scratch, id);
    execFileSync(process.execPath, [setup, "setup", id, target], { stdio: "pipe", env });

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

    // A set-up project is governed by the harness committed inside it, never by
    // the plugin: a plugin update must not change it, and teammates who clone it
    // have no plugin at all. So no file in it may point back at the plugin.
    const files = execFileSync("git", ["ls-files", "-z"], { cwd: target, encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
    for (const file of files) {
      const text = readFileSync(join(target, file), "utf8");
      assert.doesNotMatch(text, /CLAUDE_PLUGIN_(ROOT|DATA)/, `${id}/${file} refers to the plugin`);
      assert.equal(text.includes(pluginRoot), false, `${id}/${file} refers to the plugin checkout`);
    }
  }

  const withLockfile = exerciseIds.filter((id) =>
    existsSync(join(pluginRoot, "exercises", id, "overlay", "package-lock.json")),
  );
  assert.ok(withLockfile.length > 0);
  assert.deepEqual(
    readFileSync(npmLog, "utf8").trim().split("\n"),
    withLockfile.map(() => "audit fix --package-lock-only"),
  );

  // The plugin ships skills only. Hooks, agents, MCP servers, output styles and
  // settings in a plugin are active inside every session, including a student's
  // project, which would tie projects to the installed plugin version. Adding a
  // new top-level entry or manifest key means deciding it cannot do that.
  // `.in_use` is Claude Code's own marker in an installed copy, not ours.
  const shipped = readdirSync(pluginRoot)
    .filter((name) => name !== ".git" && name !== ".in_use")
    .sort();
  assert.deepEqual(shipped, [
    ".claude-plugin", ".github", "CONTRIBUTING.md", "README.md", "exercises", "runtime", "scripts", "skills", "test",
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
