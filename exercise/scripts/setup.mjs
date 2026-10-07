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
// Exercise IDs in the order the curriculum teaches them.
const curriculum = JSON.parse(readFileSync(join(exercisesRoot, "curriculum.json"), "utf8"));
const plugin = JSON.parse(
  readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"),
);

function catalog() {
  return readdirSync(exercisesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => {
      const directory = join(exercisesRoot, entry.name);
      const manifest = JSON.parse(readFileSync(join(directory, "exercise.json"), "utf8"));
      return { ...manifest, directory };
    })
    // An exercise missing from the curriculum list (for example one just packed)
    // sorts last rather than breaking the catalog; test/setup.test.mjs flags it.
    .sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

function rank(id) {
  const index = curriculum.indexOf(id);
  return index === -1 ? Infinity : index;
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
  const staging = mkdtempSync(join(parent, ".wbs-cs-"));

  try {
    copyContents(runtimeRoot, staging);
    rmSync(join(staging, "SOURCE"), { force: true });
    rmSync(join(staging, ".gitignore-base"), { force: true });
    copyContents(join(exercise.directory, "overlay"), staging);

    // The committed lockfile ages between releases, so patch it to the newest
    // fixed versions the package.json ranges allow. Without --force this never
    // crosses a major version, so the starter stays on what it was written for.
    // Offline or unfixable is not a reason to fail setup.
    if (existsSync(join(staging, "package-lock.json"))) {
      try {
        execFileSync("npm", ["audit", "fix", "--package-lock-only"], {
          cwd: staging,
          stdio: "ignore",
          shell: process.platform === "win32",
        });
      } catch {
        console.warn(
          "note: could not apply security fixes to package-lock.json; run `npm audit` after installing",
        );
      }
    }

    writeFileSync(
      join(staging, ".claude", "harness", "lock.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          pluginVersion: plugin.version,
          exercise: exercise.id,
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
        GIT_AUTHOR_NAME: "WBS Coding School",
        GIT_AUTHOR_EMAIL: "wbs-cs@wbs.invalid",
        GIT_COMMITTER_NAME: "WBS Coding School",
        GIT_COMMITTER_EMAIL: "wbs-cs@wbs.invalid",
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
