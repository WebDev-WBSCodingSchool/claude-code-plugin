#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { problems } from "./verify.mjs";

// Shared runtime files; exercise-specific README and config are packaged separately.
const MECHANICAL = [
  ".claude/hooks",
  ".claude/skills",
  ".claude/settings.json",
  ".claude/githooks",
  ".claude/harness/README.md",
  ".vscode",
  "CLAUDE.md",
  "AGENTS.md",
  "GEMINI.md",
  ".github",
];

const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowedMechanicalOverrides = new Set([
  ".claude/settings.json",
  ".vscode/settings.json",
]);

function git(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new Error((error.stderr || error.stdout || error.message).toString().trim());
  }
}

function manifest(root) {
  const path = join(root, ".claude-plugin", "plugin.json");
  if (!existsSync(path)) throw new Error(`${root} is not a Claude Code plugin source checkout`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function requireRepository(root, label) {
  const top = realpathSync(git(root, ["rev-parse", "--show-toplevel"]));
  if (top !== realpathSync(root)) throw new Error(`${label} must be the root of its Git repository`);
  const dirty = git(root, ["status", "--porcelain"]);
  if (dirty) throw new Error(`${label} has uncommitted changes:\n${dirty}`);
}

function isMechanical(relative) {
  return MECHANICAL.some((root) => relative === root || relative.startsWith(`${root}/`));
}

function sameFile(a, b) {
  return existsSync(a) && readFileSync(a).equals(readFileSync(b));
}

function copyTrackedFile(source, relative, overlay) {
  const destination = join(overlay, relative);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(source, relative), destination);
}

function pack(pluginRoot, starterRoot, id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error("exercise id must contain lowercase words separated by hyphens");
  }

  requireRepository(pluginRoot, "plugin source");
  requireRepository(starterRoot, "review starter");

  const sourcePlugin = manifest(pluginRoot);
  const runningPlugin = manifest(toolRoot);
  if (sourcePlugin.name !== "exercise") {
    throw new Error(`unexpected plugin name: ${sourcePlugin.name}`);
  }
  if (sourcePlugin.version !== runningPlugin.version) {
    throw new Error(
      `plugin version mismatch: source is ${sourcePlugin.version}, running skill is ${runningPlugin.version}`,
    );
  }

  const target = join(pluginRoot, "exercises", id);
  if (existsSync(target)) throw new Error(`exercise already exists: ${id}`);

  const found = problems(starterRoot);
  if (found.length) throw new Error(`review starter failed verification:\n- ${found.join("\n- ")}`);

  const config = JSON.parse(
    readFileSync(join(starterRoot, ".claude", "harness", "config.json"), "utf8"),
  );
  if (typeof config.assignment !== "string" || !config.assignment.trim()) {
    throw new Error("review starter config has no assignment title");
  }

  const required = [
    "README.md",
    ".claude/harness/config.json",
    ".claude/harness/readme-state.json",
  ];
  for (const relative of required) {
    if (!existsSync(join(starterRoot, relative))) throw new Error(`review starter is missing ${relative}`);
  }

  const tracked = git(starterRoot, ["ls-files", "-z"])
    .split("\0")
    .filter(Boolean);
  const runtime = join(pluginRoot, "runtime");
  const staging = mkdtempSync(join(pluginRoot, "exercises", `.pack-${id}-`));
  const overlay = join(staging, "overlay");
  mkdirSync(overlay);

  try {
    for (const relative of tracked) {
      if (relative === ".claude/harness/lock.json") continue;

      const starterFile = join(starterRoot, relative);
      const runtimeFile = join(runtime, relative);
      if (sameFile(runtimeFile, starterFile)) continue;

      if (isMechanical(relative)) {
        const allowed =
          allowedMechanicalOverrides.has(relative) && (config.writableExceptions ?? []).length > 0;
        if (!allowed) throw new Error(`shared runtime file differs in review starter: ${relative}`);
      }

      copyTrackedFile(starterRoot, relative, overlay);
    }

    const source = {
      repository: basename(starterRoot),
      commit: git(starterRoot, ["rev-parse", "HEAD"]),
    };
    writeFileSync(
      join(staging, "exercise.json"),
      `${JSON.stringify({ id, title: config.assignment.trim(), source }, null, 2)}\n`,
    );
    renameSync(staging, target);
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }

  return target;
}

const [pluginArgument, starterArgument, id, ...extra] = process.argv.slice(2);
if (!pluginArgument || !starterArgument || !id || extra.length) {
  console.error("usage: node scripts/pack-exercise.mjs <plugin-source> <review-starter> <exercise-id>");
  process.exit(2);
}

try {
  const target = pack(resolve(pluginArgument), resolve(starterArgument), id);
  console.log(`Packed ${id} at ${target}`);
} catch (error) {
  console.error(`pack failed: ${error.message}`);
  process.exit(1);
}
