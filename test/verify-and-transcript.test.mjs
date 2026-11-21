#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { problems } from "../exercise/scripts/verify.mjs";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "exercise");
const scratch = mkdtempSync(join(tmpdir(), "wbs-verify-transcript-test-"));

function makeStarter(name, mutator) {
  const repo = join(scratch, name);
  cpSync(join(pluginRoot, "runtime"), repo, { recursive: true });
  writeFileSync(join(repo, ".gitignore"), readFileSync(join(repo, ".gitignore-base"), "utf8"));
  rmSync(join(repo, "SOURCE"), { force: true });
  rmSync(join(repo, ".gitignore-base"), { force: true });
  const cfgPath = join(repo, ".claude/harness/config.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  cfg.assignment = "verify test";
  cfg.gated = ["fetch"];
  cfg.tasks = [{ id: "T1", title: "Task 1", file: "main.js", categories: ["fetch"] }];
  delete cfg.variant;
  delete cfg.localFile;
  writeFileSync(join(repo, "main.js"), "// starter\n");
  if (mutator) mutator(repo, cfg);
  writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
  return repo;
}

try {
  // 1. verify.mjs positive & negative cases
  assert.deepEqual(problems(makeStarter("valid")), []);

  const unknownDet = makeStarter("unknown-detector", (_r, c) => {
    c.gated = ["notARealDetector"];
  });
  assert.ok(problems(unknownDet).some((p) => p.includes("has no detector in guard.mjs")));

  const uncovered = makeStarter("uncovered-cat", (_r, c) => {
    c.gated = ["fetch", "dom"];
  });
  assert.ok(problems(uncovered).some((p) => p.includes("unlocked by no task")));

  const missingTaskFile = makeStarter("missing-task-file", (r) => {
    rmSync(join(r, "main.js"));
  });
  assert.ok(problems(missingTaskFile).some((p) => p.includes("which does not exist")));

  const preScaffoldOk = makeStarter("prescaffold-ok", (r, c) => {
    c.preScaffold = true;
    rmSync(join(r, "main.js"));
  });
  assert.deepEqual(problems(preScaffoldOk), []);

  const badExt = makeStarter("bad-ext", (r, c) => {
    writeFileSync(join(r, "notes.txt"), "hi\n");
    c.tasks[0].file = "notes.txt";
  });
  assert.ok(problems(badExt).some((p) => p.includes("not in guardedExtensions")));

  const badFiles = makeStarter("bad-files", (_r, c) => {
    c.tasks[0].files = [];
  });
  assert.ok(problems(badFiles).some((p) => p.includes("invalid files list")));

  const unignoredLocal = makeStarter("unignored-local", (_r, c) => {
    c.localFile = "config.js";
  });
  assert.ok(problems(unignoredLocal).some((p) => p.includes("is not in .gitignore")));

  const missingLocked = makeStarter("missing-locked", (_r, c) => {
    c.canonical.push("DOES_NOT_EXIST.md");
  });
  assert.ok(problems(missingLocked).some((p) => p.includes("locked path DOES_NOT_EXIST.md")));

  const excMismatch = makeStarter("exc-mismatch", (_r, c) => {
    c.writableExceptions = [".claude/skills/"];
  });
  const excProblems = problems(excMismatch);
  assert.ok(excProblems.some((p) => p.includes(".claude/settings.json still denies")));
  assert.ok(excProblems.some((p) => p.includes(".vscode/settings.json still marks it read-only")));

  const transcriptsOn = makeStarter("transcripts-on", (_r, c) => {
    c.transcripts = true;
  });
  assert.ok(problems(transcriptsOn).some((p) => p.includes("transcripts is on")));

  // 2. transcript.mjs checks
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Jane Student",
    GIT_AUTHOR_EMAIL: "jane@example.com",
    GIT_COMMITTER_NAME: "Jane Student",
    GIT_COMMITTER_EMAIL: "jane@example.com",
  };
  const txRepo = makeStarter("transcripts-repo");
  execFileSync("git", ["init", "-b", "main"], { cwd: txRepo, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "Jane Student"], { cwd: txRepo, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "jane@example.com"], { cwd: txRepo, stdio: "pipe" });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: txRepo, stdio: "pipe" });
  execFileSync("git", ["add", "--all"], { cwd: txRepo, stdio: "pipe" });
  execFileSync("git", ["commit", "--no-verify", "-m", "Init"], { cwd: txRepo, env: gitEnv, stdio: "pipe" });

  const sampleTranscript = join(scratch, "session.jsonl");
  writeFileSync(sampleTranscript, '{"type":"user","text":"hi"}\n');

  const runTranscript = (repo, payloadStr) =>
    spawnSync(process.execPath, [join(repo, ".claude/hooks/transcript.mjs")], {
      cwd: repo,
      env: { ...gitEnv, CLAUDE_PROJECT_DIR: repo },
      input: payloadStr,
      encoding: "utf8",
    });

  // transcripts: false -> no-op
  const offRes = runTranscript(
    txRepo,
    JSON.stringify({ hook_event_name: "SessionEnd", session_id: "s1", transcript_path: sampleTranscript }),
  );
  assert.equal(offRes.status, 0);
  assert.equal(existsSync(join(txRepo, ".claude/harness/transcripts")), false);

  // Enable transcripts: true
  const txCfgPath = join(txRepo, ".claude/harness/config.json");
  const txCfg = JSON.parse(readFileSync(txCfgPath, "utf8"));
  txCfg.transcripts = true;
  writeFileSync(txCfgPath, `${JSON.stringify(txCfg, null, 2)}\n`);
  execFileSync("git", ["add", ".claude/harness/config.json"], { cwd: txRepo, stdio: "pipe" });
  execFileSync("git", ["commit", "--no-verify", "-m", "Enable transcripts"], { cwd: txRepo, env: gitEnv, stdio: "pipe" });

  // Stop copies file without committing
  const stopRes = runTranscript(
    txRepo,
    JSON.stringify({ hook_event_name: "Stop", session_id: "s1", transcript_path: sampleTranscript }),
  );
  assert.equal(stopRes.status, 0);
  const txDir = join(txRepo, ".claude/harness/transcripts");
  assert.equal(readdirSync(txDir).length, 1);
  assert.equal(execFileSync("git", ["rev-list", "--count", "HEAD"], { cwd: txRepo, encoding: "utf8" }).trim(), "2");

  // Stage an unrelated file, then run SessionEnd -> commits ONLY transcript, leaving staged file staged
  writeFileSync(join(txRepo, "main.js"), "// staged edit\n");
  execFileSync("git", ["add", "main.js"], { cwd: txRepo, stdio: "pipe" });
  writeFileSync(sampleTranscript, '{"type":"user","text":"hi"}\n{"type":"assistant","text":"hello"}\n');
  const endRes = runTranscript(
    txRepo,
    JSON.stringify({ hook_event_name: "SessionEnd", session_id: "s1", transcript_path: sampleTranscript }),
  );
  assert.equal(endRes.status, 0);
  assert.equal(execFileSync("git", ["rev-list", "--count", "HEAD"], { cwd: txRepo, encoding: "utf8" }).trim(), "3");
  assert.match(
    execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: txRepo, encoding: "utf8" }),
    /main\.js/,
  );

  // Malformed stdin exits 0 cleanly
  assert.equal(runTranscript(txRepo, "{bad-json").status, 0);

  console.log("verify.mjs and transcript.mjs checks passed");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
