#!/usr/bin/env node
//
// Drift check: template/ against the exemplar it was vendored from.
//
//   node sync.mjs --check /home/stephan/coding/task-harness/movie-diary-harness
//
// The template is a copy, so it goes stale every time a red-team run changes a
// hook or a skill in task-harness. This makes that staleness a diff you read
// rather than a thing you remember. Re-vendoring is `cp -a`.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The mechanical tier, and the whole of it. The exemplar's root also holds
// README.md and .claude/harness/config.json — generated and authored tiers,
// which the template must not carry and which differ per assignment.
//
// `.claude` is listed as four entries rather than one on purpose: it now houses
// harness/ too, and `.claude` whole would drag config.json and progress/ into
// the mechanical tier, where a re-vendor would overwrite the skeleton with one
// assignment's answers.
export const MECHANICAL = [
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

function walk(dir, base) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(join(dir, e.name), base)
      : [relative(base, join(dir, e.name))],
  );
}

function filesUnder(dir, rel) {
  const abs = join(dir, rel);
  if (!existsSync(abs)) return [];
  return statSync(abs).isDirectory() ? walk(abs, dir) : [rel];
}

/**
 * Compare two trees over `roots` only, in both directions.
 * Returns [{rel, how}] — "differs" | "missing upstream" | "new upstream".
 * An empty array means the copy is current.
 */
export function drift(aDir, bDir, roots = MECHANICAL) {
  const out = [];
  for (const root of roots) {
    const inA = new Set(filesUnder(aDir, root));
    const inB = new Set(filesUnder(bDir, root));
    for (const rel of inA) {
      if (!inB.has(rel)) out.push({ rel, how: "missing upstream" });
      else if (!readFileSync(join(aDir, rel)).equals(readFileSync(join(bDir, rel))))
        out.push({ rel, how: "differs" });
    }
    for (const rel of inB) if (!inA.has(rel)) out.push({ rel, how: "new upstream" });
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const exemplar = process.argv[3];
  if (process.argv[2] !== "--check" || !exemplar) {
    console.error("usage: node sync.mjs --check <path-to-movie-diary-harness>");
    process.exit(2);
  }
  const home = dirname(fileURLToPath(import.meta.url));
  const template = join(home, "template");
  const rows = drift(template, exemplar);

  console.log(readFileSync(join(template, "SOURCE"), "utf8").trim());
  if (!rows.length) {
    console.log("template/ is current");
    process.exit(0);
  }
  for (const r of rows) console.log(`  ${r.how.padEnd(17)}${r.rel}`);

  // Re-vendoring is `cp -a`, which overwrites template/ wholesale. That is safe
  // only when the drift is entirely upstream-caused. The first time this skill
  // is used as designed, a NEW detector is drift too — it exists only in
  // template/.claude/hooks/guard.mjs, nowhere upstream yet — and re-vendoring
  // would silently delete it. Two tells that the change is ours:
  //
  //   hooks   — anything under .claude/hooks/, which is where a new detector goes.
  //   ours    — a "missing upstream" row, which is not a tell but a proof: the
  //             file exists HERE and nowhere upstream. The AGENTS.md feature is
  //             the live case, and it is a worse trap than the detector one,
  //             because it spans four files. `cp -a` would overwrite the two
  //             settings.json that lock those files while leaving the files
  //             themselves in place — the agent-instruction pages still there
  //             and no longer read-only, which is the worst of both states.
  const hooksRoot = join(".claude", "hooks") + "/";
  const hooksDrifted = rows.some((r) => (r.rel + "/").startsWith(hooksRoot));
  const templateOnly = rows.filter((r) => r.how === "missing upstream");
  if (hooksDrifted || templateOnly.length) {
    console.log(
      hooksDrifted
        ? `\n${rows.length} file(s) drifted, including hooks. If the change is yours — a new\n` +
            `detector — port it to task-harness first: re-vendoring overwrites it.`
        : `\n${rows.length} file(s) drifted, and ${templateOnly.length} of them exist only here:\n` +
            `${templateOnly.map((r) => `  ${r.rel}`).join("\n")}\n` +
            `Re-vendoring would half-revert that — port it to task-harness first.`,
    );
  } else {
    // Derived from MECHANICAL rather than spelled out, because a hand-written
    // list is what let AGENTS.md, GEMINI.md and .github fall out of this command
    // while staying in the drift check above — a re-vendor that reports on more
    // files than it copies. A nested entry gets its own line: `cp -a` on
    // `.claude/harness/README.md` would otherwise land it at `template/README.md`.
    const top = MECHANICAL.filter((r) => !r.includes("/"));
    const lines = [`  cp -a ${top.map((r) => `${exemplar}/${r}`).join(" ")} template/`];
    for (const r of MECHANICAL.filter((r) => r.includes("/"))) {
      lines.push(`  cp -a ${exemplar}/${r} template/${dirname(r)}/`);
    }
    console.log(
      `\n${rows.length} file(s) drifted. Re-vendor with:\n${lines.join("\n")}\n` +
        `then update template/SOURCE.`,
    );
  }
  process.exit(1);
}
