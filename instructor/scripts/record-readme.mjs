#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const policyFiles = [
  "instructor/skills/add-exercise/SKILL.md",
  "instructor/skills/add-exercise/references/interview.md",
  "instructor/skills/add-exercise/references/authoring.md",
  "exercise/runtime/README.md",
];

function git(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error((error.stderr || error.stdout || error.message).toString().trim());
  }
}

function hash(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function record(repoRoot, starterRoot) {
  const top = realpathSync(git(repoRoot, ["rev-parse", "--show-toplevel"]).trim());
  if (top !== realpathSync(repoRoot)) throw new Error("plugin repository must be its Git repository root");

  const manifestPath = join(repoRoot, "exercise", ".claude-plugin", "plugin.json");
  if (!existsSync(manifestPath)) throw new Error("plugin repository has no exercise/.claude-plugin/plugin.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.name !== "exercise") throw new Error(`unexpected plugin: ${manifest.name}`);

  const commit = git(repoRoot, ["rev-parse", "HEAD"]).trim();
  const currentPolicy = policyFiles.map((path) => readFileSync(join(repoRoot, path), "utf8"));
  const committedPolicy = policyFiles.map((path) => git(repoRoot, ["show", `${commit}:${path}`]));
  if (hash(JSON.stringify(currentPolicy)) !== hash(JSON.stringify(committedPolicy))) {
    throw new Error("README policy has uncommitted changes; review and commit them first");
  }

  const readmePath = join(starterRoot, "README.md");
  const configPath = join(starterRoot, ".claude", "harness", "config.json");
  if (!existsSync(readmePath) || !existsSync(configPath)) {
    throw new Error("review starter must contain README.md and .claude/harness/config.json");
  }

  const state = {
    schemaVersion: 1,
    source: {
      commit,
      fingerprint: hash(JSON.stringify(currentPolicy)),
    },
    readme: {
      path: "README.md",
      hash: hash(readFileSync(readmePath, "utf8")),
    },
  };
  const statePath = join(starterRoot, ".claude", "harness", "readme-state.json");
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  return statePath;
}

const [repoArgument, starterArgument, ...extra] = process.argv.slice(2);
if (!repoArgument || !starterArgument || extra.length) {
  console.error("usage: node instructor/scripts/record-readme.mjs <plugin-repository> <review-starter>");
  process.exit(2);
}

try {
  console.log(`Recorded ${record(resolve(repoArgument), resolve(starterArgument))}`);
} catch (error) {
  console.error(`record failed: ${error.message}`);
  process.exit(1);
}
