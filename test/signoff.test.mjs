#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "exercise");
const scratch = mkdtempSync(join(tmpdir(), "wbs-signoff-test-"));

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Jane Student",
  GIT_AUTHOR_EMAIL: "jane@example.com",
  GIT_COMMITTER_NAME: "Jane Student",
  GIT_COMMITTER_EMAIL: "jane@example.com",
};

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    env: gitEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runSignoff(repo, args) {
  return spawnSync(process.execPath, [join(repo, ".claude/hooks/signoff.mjs"), ...args], {
    cwd: repo,
    env: { ...gitEnv, CLAUDE_PROJECT_DIR: repo },
    encoding: "utf8",
  });
}

function makeRepo(name, configOverrides = {}) {
  const repo = join(scratch, name);
  cpSync(join(pluginRoot, "runtime"), repo, { recursive: true });
  const cfgPath = join(repo, ".claude/harness/config.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  Object.assign(cfg, {
    assignment: "signoff test",
    onboarding: true,
    unlockRoute: true,
    branchDiscipline: "warn",
    integrationBranch: "main",
    gated: ["fetch", "dom"],
    guardedExtensions: [".js", ".jsx", ".ts", ".tsx"],
    tasks: [
      { id: "FR001", title: "Fetch data", file: "main.js", categories: ["fetch"] },
      { id: "FR002", title: "Render DOM", file: "dom.js", categories: ["dom"] },
      { id: "FR003", title: "Refactor", file: "main.js", categories: [] },
    ],
    ...configOverrides,
  });
  delete cfg.variant;
  delete cfg.localFile;
  writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
  writeFileSync(join(repo, "main.js"), "// main starter\n");
  writeFileSync(join(repo, "dom.js"), "// dom starter\n");
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.name", "Jane Student"]);
  git(repo, ["config", "user.email", "jane@example.com"]);
  git(repo, ["config", "commit.gpgsign", "false"]);
  git(repo, ["add", "--all"]);
  git(repo, ["commit", "--no-verify", "-m", "Starter"]);
  return repo;
}

try {
  const repo = makeRepo("signoff-main");

  // 1. Error rejections: missing arg, unknown task, already-uncommitted dirty file, missing file
  assert.equal(runSignoff(repo, []).status, 1);
  assert.equal(runSignoff(repo, ["NOPE"]).status, 1);

  writeFileSync(join(repo, "main.js"), "fetch('/api');\n");
  const dirtyRes = runSignoff(repo, ["FR001"]);
  assert.equal(dirtyRes.status, 1);
  assert.match(dirtyRes.stderr, /uncommitted changes/i);

  // Missing task file
  rmSync(join(repo, "dom.js"));
  const missingFileRes = runSignoff(repo, ["FR002"]);
  assert.equal(missingFileRes.status, 1);
  assert.match(missingFileRes.stderr, /doesn't exist/i);
  git(repo, ["checkout", "--", "dom.js"]);

  // 2. Written signoff on branch with multiple commits touching task file
  git(repo, ["switch", "-c", "FR001-fetch"]);
  git(repo, ["add", "main.js"]);
  git(repo, ["commit", "--no-verify", "-m", "FR001: initial fetch"]);
  const c1 = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, "main.js"), "fetch('/api/v2');\n");
  git(repo, ["add", "main.js"]);
  git(repo, ["commit", "--no-verify", "-m", "FR001: update url"]);
  const c2 = git(repo, ["rev-parse", "HEAD"]);

  // Needs written before review (1:1 cap)
  const capZero = runSignoff(repo, ["FR002", "--review", "--pr", "https://example.com/pr/1", "--author", "mo"]);
  assert.equal(capZero.status, 1);
  assert.match(capZero.stderr, /reviewed tasks can't outnumber written/i);

  const okWrite = runSignoff(repo, ["FR001"]);
  assert.equal(okWrite.status, 0, okWrite.stderr);
  assert.match(okWrite.stdout, /Pull Request for this branch/);

  const key = createHash("sha256").update("jane@example.com").digest("hex");
  const progressFile = join(repo, ".claude/harness/progress", `${key}.json`);
  assert.ok(existsSync(progressFile));
  const saved = JSON.parse(readFileSync(progressFile, "utf8"));
  assert.equal(saved.unlocks.length, 1);
  assert.equal(saved.unlocks[0].task, "FR001");
  assert.equal(saved.unlocks[0].route, "written");
  assert.equal(saved.unlocks[0].branch, "FR001-fetch");
  assert.deepEqual(saved.unlocks[0].commits, [c2, c1]);

  // Duplicate signoff rejected
  assert.equal(runSignoff(repo, ["FR001"]).status, 1);

  // 3. Empty-category task (#19)
  const emptyCat = runSignoff(repo, ["FR003"]);
  assert.equal(emptyCat.status, 0, emptyCat.stderr);
  assert.match(emptyCat.stdout, /does not gate any additional category/i);

  // 4. --review validation & 1:1 cap (1 written -> 1 review allowed, 2nd review rejected)
  const missingPr = runSignoff(repo, ["FR002", "--review"]);
  assert.equal(missingPr.status, 1);
  assert.match(missingPr.stderr, /--pr <url> --author/);

  const okReview = runSignoff(repo, [
    "FR002",
    "--review",
    "--pr",
    "https://github.com/team/app/pull/5",
    "--author",
    "mo-ahmadi",
  ]);
  assert.equal(okReview.status, 0, okReview.stderr);
  const savedAfterReview = JSON.parse(readFileSync(progressFile, "utf8"));
  const revRow = savedAfterReview.unlocks.find((u) => u.task === "FR002");
  assert.equal(revRow.route, "reviewed");
  assert.equal(revRow.branch, "");
  assert.equal(revRow.pr, "https://github.com/team/app/pull/5");
  assert.equal(revRow.author, "mo-ahmadi");

  // Add a 4th task and check 2nd review is blocked (only 1 written? Wait: FR001 and FR003 are both written = 2!)
  const cfg = JSON.parse(readFileSync(join(repo, ".claude/harness/config.json"), "utf8"));
  cfg.tasks.push(
    { id: "FR004", title: "Extra 1", file: "main.js", categories: ["fetch"] },
    { id: "FR005", title: "Extra 2", file: "main.js", categories: ["fetch"] },
  );
  writeFileSync(join(repo, ".claude/harness/config.json"), `${JSON.stringify(cfg, null, 2)}\n`);
  assert.equal(
    runSignoff(repo, ["FR004", "--review", "--pr", "https://github.com/team/app/pull/6", "--author", "mo"]).status,
    0,
  );
  // Now 2 written (FR001, FR003) and 2 reviewed (FR002, FR004) -> 3rd review must be refused!
  const capBlocked = runSignoff(repo, [
    "FR005",
    "--review",
    "--pr",
    "https://github.com/team/app/pull/7",
    "--author",
    "mo",
  ]);
  assert.equal(capBlocked.status, 1);
  assert.match(capBlocked.stderr, /reviewed tasks can't outnumber written/i);

  // 5. --status handles missing/empty commits array (#28) and reports coverage
  const brokenCommitsData = JSON.parse(readFileSync(progressFile, "utf8"));
  brokenCommitsData.unlocks[0].commits = [];
  writeFileSync(progressFile, `${JSON.stringify(brokenCommitsData, null, 2)}\n`);
  const statusRes = runSignoff(repo, ["--status"]);
  assert.equal(statusRes.status, 0, statusRes.stderr);
  assert.match(statusRes.stdout, /no commit/);
  assert.match(statusRes.stdout, /not yet/);

  // 6. coverage() counts only written rows across students and reports unreadable files
  const moKey = createHash("sha256").update("mo@example.com").digest("hex");
  writeFileSync(
    join(repo, ".claude/harness/progress", `${moKey}.json`),
    JSON.stringify({
      student: moKey,
      unlocks: [
        { task: "FR002", route: "reviewed", commits: [c1] },
        { task: "FR004", route: "written", commits: [c1] },
        { task: "FR005", route: "written", commits: [c1] },
      ],
    }),
  );
  writeFileSync(join(repo, ".claude/harness/progress", "bad.json"), "{conflict");

  const cov = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { loadConfig, coverage } from ${JSON.stringify(pathToFileURL(join(repo, ".claude/hooks/harness.mjs")).href)};
         console.log(JSON.stringify(coverage(loadConfig())));`,
      ],
      { cwd: repo, env: { ...gitEnv, CLAUDE_PROJECT_DIR: repo }, encoding: "utf8" },
    ).trim(),
  );
  assert.equal(cov.complete, false, "FR002 only has reviewed rows so core must not be complete");
  assert.deepEqual(cov.missing, ["FR002"]);
  assert.deepEqual(cov.unreadable, ["bad.json"]);

  // 7. Solo config.onboarding omitted vs false (#28)
  const soloRepo = makeRepo("signoff-solo", {
    onboarding: false,
    tasks: [{ id: "FR001", title: "Task 1", file: "main.js", categories: ["fetch"] }],
  });
  git(soloRepo, ["switch", "-c", "FR001-solo"]);
  writeFileSync(join(soloRepo, "main.js"), "fetch('/x');\n");
  git(soloRepo, ["add", "main.js"]);
  git(soloRepo, ["commit", "--no-verify", "-m", "FR001"]);
  const soloOk = runSignoff(soloRepo, ["FR001"]);
  assert.equal(soloOk.status, 0, soloOk.stderr);
  assert.match(soloOk.stdout, /merge this branch into main/i);

  // 8. Multi-file / directory task.files (#20)
  const filesRepo = makeRepo("signoff-files", {
    onboarding: false,
    gated: ["clientComponents"],
    tasks: [
      {
        id: "FR004",
        title: "Cart controls",
        file: "src/app/page.tsx",
        files: ["src/"],
        categories: ["clientComponents"],
      },
    ],
  });
  mkdirSync(join(filesRepo, "src/app"), { recursive: true });
  writeFileSync(join(filesRepo, "src/app/page.tsx"), "export default function Page() { return null; }\n");
  git(filesRepo, ["add", "--all"]);
  git(filesRepo, ["commit", "--no-verify", "-m", "Add page"]);

  git(filesRepo, ["switch", "-c", "FR004-controls"]);
  mkdirSync(join(filesRepo, "src/components"), { recursive: true });
  writeFileSync(join(filesRepo, "src/components/ProductCard.tsx"), '"use client";\n');
  // Uncommitted untracked file inside src/ must block signoff
  const dirtyChild = runSignoff(filesRepo, ["FR004"]);
  assert.equal(dirtyChild.status, 1);
  assert.match(dirtyChild.stderr, /src\/components\/ProductCard\.tsx/);

  // Non-guarded file inside src/ must NOT block once code file is committed
  git(filesRepo, ["add", "src/components/ProductCard.tsx"]);
  git(filesRepo, ["commit", "--no-verify", "-m", "FR004: child component"]);
  const childCommitSha = git(filesRepo, ["rev-parse", "HEAD"]);
  writeFileSync(join(filesRepo, "src/notes.txt"), "scratch\n");

  const okChildSignoff = runSignoff(filesRepo, ["FR004"]);
  assert.equal(okChildSignoff.status, 0, okChildSignoff.stderr);
  const childSaved = JSON.parse(
    readFileSync(join(filesRepo, ".claude/harness/progress", `${key}.json`), "utf8"),
  );
  assert.deepEqual(childSaved.unlocks[0].commits, [childCommitSha]);

  console.log("signoff.mjs and coverage() checks passed");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
