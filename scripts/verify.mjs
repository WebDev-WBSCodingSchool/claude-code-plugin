#!/usr/bin/env node
//
// Check a generated starter repo before anyone forks it.
//
//   node verify.mjs <repo>
//   node verify.mjs <repo> --against /home/stephan/coding/task-harness/movie-diary-harness
//
// Every check here is a failure that is silent on a student's machine. The
// loudest is the first: guard.mjs treats a gated category with no detector as a
// hit, so one typo in `gated` denies every guarded write and the repo reads as
// broken rather than as misconfigured.

import { readFileSync, existsSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drift } from "./sync.mjs";

/**
 * A skeleton config ships several keys as `<FILL: ...>` placeholders
 * (`assignment`, `variant`, `localFile`) so a copy of `template/` still
 * parses. A marker is not a value — any check that reads one as real reports
 * a problem that was never there. Every check below that reads a
 * generator-filled key should route through this first.
 */
function isFilled(v) {
  return typeof v === "string" && v.trim() !== "" && !/^<FILL:/.test(v.trim());
}

/**
 * The detector names guard.mjs actually implements.
 * ponytail: text scan, because guard.mjs is a hook script — importing it runs
 * it against stdin. Upgrade to an import if it ever grows an export.
 */
export function detectorNames(guardSource) {
  const block = guardSource.match(/const DETECTORS = \{([\s\S]*?)\n\};/);
  if (!block) return [];
  return [...block[1].matchAll(/^\s{2}([A-Za-z_$][\w$]*)\s*:\s*\[/gm)].map((m) => m[1]);
}

/** Returns a list of problems. Empty means the repo is sound. */
export function problems(repo) {
  const out = [];
  const configPath = join(repo, ".claude/harness", "config.json");
  if (!existsSync(configPath)) return [".claude/harness/config.json is missing"];

  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (e) {
    return [`.claude/harness/config.json does not parse: ${e.message}`];
  }

  const guardPath = join(repo, ".claude", "hooks", "guard.mjs");
  const known = existsSync(guardPath) ? detectorNames(readFileSync(guardPath, "utf8")) : [];
  if (!known.length) out.push(".claude/hooks/guard.mjs has no detectors");

  const gated = config.gated ?? [];
  for (const c of gated)
    if (!known.includes(c))
      out.push(`gated category "${c}" has no detector in guard.mjs — it will deny every guarded write`);

  // The reverse of the check above: `demonstrated()` in harness.mjs only ever
  // opens a category that appears in some task's `categories`, so a gated
  // category no task carries can never be demonstrated — it is closed for
  // every student, forever, with no error anywhere else.
  const covered = new Set((config.tasks ?? []).flatMap((t) => t.categories ?? []));
  for (const c of gated)
    if (!covered.has(c))
      out.push(`gated category "${c}" is unlocked by no task — it can never be demonstrated`);

  const exts = (config.guardedExtensions ?? []).map((e) => e.toLowerCase());
  for (const t of config.tasks ?? []) {
    // preScaffold means the source tree doesn't exist yet by design — the
    // student scaffolds it (e.g. `npm create vite`) before any task file can
    // exist. Only this one check is false by design there; extension and
    // category coverage are still meaningful against a file that is yet to
    // be scaffolded.
    if (!config.preScaffold && !existsSync(join(repo, t.file)))
      out.push(`task ${t.id} points at ${t.file}, which does not exist`);
    if (!exts.includes(extname(t.file).toLowerCase()))
      out.push(`task ${t.id} writes ${t.file}, whose extension is not in guardedExtensions`);
    for (const c of t.categories ?? [])
      if (!gated.includes(c)) out.push(`task ${t.id} exercises "${c}", which is not gated`);
  }

  // A credential file that was never gitignored is silent until the token is
  // public. isFilled() screens out the skeleton's own `<FILL: ...>` marker —
  // an unfilled key is not a value, so it must not read as "check this".
  if (isFilled(config.localFile)) {
    const gi = existsSync(join(repo, ".gitignore"))
      ? readFileSync(join(repo, ".gitignore"), "utf8")
      : "";
    if (!gi.split(/\r?\n/).some((l) => l.trim() === config.localFile.trim()))
      out.push(`localFile "${config.localFile}" is not in .gitignore — a student's copy gets committed`);
  }

  // Only structural paths are checked. Two named `neverWritable` entries are
  // exempt by design, not by shape: `planFile` (PLAN.md by default) is written
  // by the students during onboarding, and .claude/settings.local.json is
  // created by Claude Code at runtime and gitignored. Everything else in the
  // lock list — directories, files, the canonical brief — is always present in
  // a generated repo, so a missing one is a typo in the lock list, which
  // protects nothing while reading as protection.
  const exempt = new Set([config.planFile ?? "PLAN.md", ".claude/settings.local.json"]);
  const structural = [
    ...(config.neverWritable ?? []).filter((p) => !exempt.has(p)),
    ...(config.canonical ?? []),
  ];
  for (const p of structural)
    if (!existsSync(join(repo, p))) out.push(`locked path ${p} does not exist`);

  // A writableExceptions carve-out is four edits across three files: this key,
  // one line out of .vscode/settings.json's files.readonlyInclude, and two
  // lines out of .claude/settings.json's permissions.deny (the path is denied
  // once under Edit( and once under Write(). Miss one of the deny lines and
  // permissions.deny refuses the write before guard.mjs is ever consulted —
  // the agent sees a bare permission refusal with no harness explanation.
  // ponytail: substring match, so an exact carve-out (`.claude/skills/`) will
  // also flag a glob that merely contains it (`.claude/skills/**`) as still
  // denied even once it is opened. That over-reports rather than under-reports
  // — it fails loud at generation time in front of the instructor, not silent
  // in front of a student. Upgrade to a real permissions-string parser if the
  // false positives ever become a nuisance.
  for (const p of config.writableExceptions ?? []) {
    const s = join(repo, ".claude", "settings.json");
    if (existsSync(s) && readFileSync(s, "utf8").includes(p))
      out.push(`writableExceptions carves out ${p}, but .claude/settings.json still denies it`);
    const v = join(repo, ".vscode", "settings.json");
    if (existsSync(v) && readFileSync(v, "utf8").includes(p))
      out.push(`writableExceptions carves out ${p}, but .vscode/settings.json still marks it read-only`);
  }

  const progressDir = config.progressDir ?? ".claude/harness/progress";
  if (config.unlockRoute && !existsSync(join(repo, progressDir)))
    out.push(`unlockRoute is on but ${progressDir} does not exist`);

  if (config.transcripts) out.push("transcripts is on — it must ship off in a starter");

  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = process.argv[2];
  if (!repo) {
    console.error("usage: node verify.mjs <repo> [--against <exemplar>]");
    process.exit(2);
  }

  const found = problems(repo);
  for (const p of found) console.log(`  problem  ${p}`);
  console.log(found.length ? `\n${found.length} problem(s)` : "no problems");

  let drifted = [];
  const i = process.argv.indexOf("--against");
  if (i !== -1) {
    const exemplar = process.argv[i + 1];
    drifted = drift(repo, exemplar);
    console.log(`\nmechanical tier against ${exemplar}:`);
    for (const r of drifted) console.log(`  ${r.how.padEnd(17)}${r.rel}`);
    if (!drifted.length) console.log("  identical");
    // The brief is generated prose and will not match byte for byte. Reported
    // for reading, never a failure.
    const a = join(repo, "README.md");
    const b = join(exemplar, "README.md");
    if (existsSync(a) && existsSync(b))
      console.log(
        readFileSync(a, "utf8") === readFileSync(b, "utf8")
          ? "\nREADME.md is identical"
          : "\nREADME.md differs — read it, do not assume it is wrong",
      );
  }

  process.exit(found.length || drifted.length ? 1 : 0);
}
