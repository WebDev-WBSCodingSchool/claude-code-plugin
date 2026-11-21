#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const pluginRoot = resolve(fileURLToPath(new URL("../exercise", import.meta.url)));
const setup = join(pluginRoot, "scripts", "setup.mjs");
const scratch = mkdtempSync(join(tmpdir(), "wbs-harness-plugin-test-"));

// A stand-in npm that records each call and fails, as it would offline. Setup
// must still succeed, and the test never touches the network.
const fakeBin = join(scratch, "bin");
const npmLog = join(scratch, "npm.log");
mkdirSync(fakeBin);
writeFileSync(
  join(fakeBin, "npm"),
  `#!/bin/sh\nif [ "$WBS_FAKE_NPM_SLEEP" != "" ]; then sleep "$WBS_FAKE_NPM_SLEEP"; fi\necho "$*" >> "${npmLog}"\nexit 1\n`,
);
chmodSync(join(fakeBin, "npm"), 0o755);
const env = { ...process.env, PATH: `${fakeBin}${delimiter}${process.env.PATH}` };

try {
  const exerciseIds = readdirSync(join(pluginRoot, "exercises"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();

  // Every shipped exercise needs a place in the curriculum order, and `list`
  // must print them in that order.
  const curriculum = JSON.parse(readFileSync(join(pluginRoot, "exercises", "curriculum.json"), "utf8"));
  assert.deepEqual([...curriculum].sort(), exerciseIds);
  const listed = execFileSync(process.execPath, [setup, "list"], { encoding: "utf8" })
    .trim().split("\n").map((line) => line.split("\t")[0]);
  assert.deepEqual(listed, curriculum);

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
    // #23: setup must initialize a fresh single-commit repo, never inherit runtime/.git
    assert.equal(
      execFileSync("git", ["rev-list", "--count", "HEAD"], { cwd: target, encoding: "utf8" }).trim(),
      "1",
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

  // The plugin ships skills, plus agents that only a skill starts. Hooks, MCP
  // servers, output styles and settings in a plugin are active inside every
  // session, including a student's project, which would tie projects to the
  // installed plugin version. Adding a new top-level entry or manifest key means
  // deciding it cannot do that.
  // `.in_use` is Claude Code's own marker in an installed copy, not ours.
  const shipped = readdirSync(pluginRoot)
    .filter((name) => name !== ".git" && name !== ".in_use")
    .sort();
  assert.deepEqual(shipped, [
    ".claude-plugin", "agents", "exercises", "runtime", "scripts", "skills",
  ]);
  const manifest = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest).sort(), ["author", "description", "name", "version"]);

  // #18: every curriculum exercise must appear in root README.md table in order
  const rootReadme = readFileSync(resolve(pluginRoot, "..", "README.md"), "utf8");
  let lastReadmePos = -1;
  for (const id of curriculum) {
    const marker = `\`${id}\``;
    const idx = rootReadme.indexOf(marker);
    assert.notEqual(idx, -1, `root README.md is missing curriculum exercise ${id}`);
    assert.ok(idx > lastReadmePos, `root README.md lists ${id} out of curriculum order`);
    lastReadmePos = idx;
  }

  // Validate marketplace, plugin manifests, and skill/agent frontmatter
  const repoRoot = resolve(pluginRoot, "..");
  const marketplace = JSON.parse(readFileSync(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf8"));
  assert.ok(marketplace.name && Array.isArray(marketplace.plugins) && marketplace.plugins.length >= 2);
  for (const entry of marketplace.plugins) {
    const manifestPath = join(repoRoot, entry.source, ".claude-plugin", "plugin.json");
    const m = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(m.name, entry.name);
    assert.match(m.version, /^\d+\.\d+\.\d+$/);
    assert.ok(m.description && m.author?.name);
  }
  for (const dir of [
    ...readdirSync(join(pluginRoot, "skills"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(pluginRoot, "skills", d.name, "SKILL.md")),
    ...readdirSync(join(pluginRoot, "agents"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(pluginRoot, "agents", f)),
    ...readdirSync(join(repoRoot, "instructor", "skills"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(repoRoot, "instructor", "skills", d.name, "SKILL.md")),
  ]) {
    const md = readFileSync(dir, "utf8");
    const fm = md.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(fm, `Missing YAML frontmatter in ${dir}`);
    assert.match(fm[1], /^name:\s+\S+/m, `Missing name in ${dir}`);
    assert.match(fm[1], /^description:\s+\S+/m, `Missing description in ${dir}`);
  }

  const rejected = spawnSync(process.execPath, [setup, "setup", "not-an-exercise"], {
    cwd: scratch,
    encoding: "utf8",
  });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /unknown exercise/);

  // #23: slow/hanging npm audit fix times out cleanly and setup still finishes
  const timeoutTarget = join(scratch, "timeout-check");
  const startMs = Date.now();
  const timedOut = spawnSync(process.execPath, [setup, "setup", "personal-diary", timeoutTarget], {
    encoding: "utf8",
    env: { ...env, WBS_FAKE_NPM_SLEEP: "5", WBS_NPM_AUDIT_TIMEOUT_MS: "200" },
  });
  const elapsedMs = Date.now() - startMs;
  assert.equal(timedOut.status, 0, timedOut.stderr);
  assert.match(timedOut.stderr, /could not apply security fixes/);
  assert.ok(elapsedMs < 3000, `Expected audit timeout to fall back quickly, took ${elapsedMs}ms`);

  console.log(`${exerciseIds.length} setup integration checks passed`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
