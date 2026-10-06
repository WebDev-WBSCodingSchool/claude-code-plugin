#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scratch = mkdtempSync(join(tmpdir(), "wbs-pack-exercise-test-"));
const pluginCopy = join(scratch, "plugin");
const starter = join(scratch, "starter");
const regenerated = join(scratch, "regenerated");
const id = "movie-diary-copy";
const gitEnvironment = {
  ...process.env,
  GIT_AUTHOR_NAME: "WBS Plugin Test",
  GIT_AUTHOR_EMAIL: "test@wbs.invalid",
  GIT_COMMITTER_NAME: "WBS Plugin Test",
  GIT_COMMITTER_EMAIL: "test@wbs.invalid",
};

function git(cwd, args) {
  return execFileSync("git", args, { cwd, env: gitEnvironment, encoding: "utf8" });
}

try {
  cpSync(pluginRoot, pluginCopy, {
    recursive: true,
    filter: (source) => basename(source) !== ".git",
  });
  git(pluginCopy, ["init", "-b", "main"]);
  git(pluginCopy, ["add", "--all"]);
  git(pluginCopy, ["commit", "-m", "Plugin fixture"]);

  execFileSync(process.execPath, [join(pluginRoot, "scripts", "setup.mjs"), "setup", "movie-diary", starter]);
  execFileSync(process.execPath, [
    join(pluginRoot, "scripts", "record-readme.mjs"),
    pluginCopy,
    starter,
  ]);
  const readmeState = JSON.parse(
    readFileSync(join(starter, ".claude", "harness", "readme-state.json"), "utf8"),
  );
  assert.equal(readmeState.source.commit, git(pluginCopy, ["rev-parse", "HEAD"]).trim());
  git(starter, ["add", ".claude/harness/readme-state.json"]);
  git(starter, ["commit", "--no-verify", "-m", "Record README review"]);

  execFileSync(process.execPath, [
    join(pluginRoot, "scripts", "pack-exercise.mjs"),
    pluginCopy,
    starter,
    id,
  ]);

  const entry = join(pluginCopy, "exercises", id);
  const manifest = JSON.parse(readFileSync(join(entry, "exercise.json"), "utf8"));
  assert.equal(manifest.id, id);
  assert.equal(existsSync(join(entry, "overlay", "main.js")), true);
  assert.equal(existsSync(join(entry, "overlay", ".claude", "hooks", "guard.mjs")), false);
  assert.equal(
    existsSync(join(entry, "overlay", ".claude", "harness", "lock.json")),
    false,
  );

  const setup = join(pluginCopy, "scripts", "setup.mjs");
  const catalog = execFileSync(process.execPath, [setup, "list"], { encoding: "utf8" });
  // An unfinished packaging directory must not affect listing or project setup.
  mkdirSync(join(pluginCopy, "exercises", ".pack-interrupted"));
  assert.equal(execFileSync(process.execPath, [setup, "list"], { encoding: "utf8" }), catalog);

  execFileSync(process.execPath, [setup, "setup", id, regenerated]);
  const lock = JSON.parse(
    readFileSync(join(regenerated, ".claude", "harness", "lock.json"), "utf8"),
  );
  assert.equal(lock.exercise, id);
  assert.equal(git(regenerated, ["status", "--porcelain"]), "");

  console.log("pack exercise integration test passed");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
