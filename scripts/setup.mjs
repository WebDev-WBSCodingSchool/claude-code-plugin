#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { problems } from "./verify.mjs";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exercisesRoot = join(pluginRoot, "exercises");
const runtimeRoot = join(pluginRoot, "runtime");
const plugin = JSON.parse(
  readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"),
);

function catalog() {
  return readdirSync(exercisesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directory = join(exercisesRoot, entry.name);
      const manifest = JSON.parse(readFileSync(join(directory, "exercise.json"), "utf8"));
      return { ...manifest, directory };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function usage() {
  console.error("usage: node scripts/setup.mjs list");
  console.error("       node scripts/setup.mjs setup <exercise-id> [target-directory]");
}

function copyContents(source, destination) {
  for (const entry of readdirSync(source)) {
    cpSync(join(source, entry), join(destination, entry), {
      recursive: true,
      force: true,
    });
  }
}

function runGit(args, cwd, extra = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...extra,
  });
}

function createProject(exercise, targetArgument) {
  const target = resolve(targetArgument ?? exercise.id);
  if (existsSync(target)) throw new Error(`target already exists: ${target}`);

  const parent = dirname(target);
  mkdirSync(parent, { recursive: true });
  const staging = mkdtempSync(join(parent, ".wbs-harness-prototype-"));

  try {
    copyContents(runtimeRoot, staging);
    rmSync(join(staging, "SOURCE"), { force: true });
    rmSync(join(staging, ".gitignore-base"), { force: true });
    copyContents(join(exercise.directory, "overlay"), staging);

    writeFileSync(
      join(staging, ".claude", "harness", "prototype-lock.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          prototype: true,
          pluginVersion: plugin.version,
          exercise: exercise.id,
          source: exercise.source,
        },
        null,
        2,
      )}\n`,
    );

    const found = problems(staging);
    if (found.length) {
      throw new Error(`assembled project failed verification:\n- ${found.join("\n- ")}`);
    }

    runGit(["init", "-b", "main"], staging);
    runGit(["config", "core.hooksPath", ".claude/githooks"], staging);
    runGit(["add", "--all"], staging);
    runGit(["commit", "--no-verify", "-m", `Create ${exercise.title} starter`], staging, {
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "WBS Harness Prototype",
        GIT_AUTHOR_EMAIL: "prototype@wbs.invalid",
        GIT_COMMITTER_NAME: "WBS Harness Prototype",
        GIT_COMMITTER_EMAIL: "prototype@wbs.invalid",
      },
    });

    renameSync(staging, target);
    return target;
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}

const [command, exerciseId, targetArgument, ...extra] = process.argv.slice(2);

try {
  const exercises = catalog();

  if (command === "list" && !exerciseId) {
    for (const exercise of exercises) console.log(`${exercise.id}\t${exercise.title}`);
    process.exit(0);
  }

  if (command !== "setup" || !exerciseId || extra.length) {
    usage();
    process.exit(2);
  }

  const exercise = exercises.find((candidate) => candidate.id === exerciseId);
  if (!exercise) {
    throw new Error(
      `unknown exercise "${exerciseId}"; choose ${exercises.map(({ id }) => id).join(" or ")}`,
    );
  }

  const target = createProject(exercise, targetArgument);
  console.log(`Created ${exercise.title} at ${target}`);
} catch (error) {
  console.error(`setup failed: ${error.message}`);
  process.exit(1);
}
