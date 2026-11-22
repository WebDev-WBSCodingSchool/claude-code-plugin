#!/usr/bin/env node
//
// PreToolUse hook on Bash: close the documented hole in the file-tool guard.
//
// Permission rules and file-tool hooks do not touch arbitrary subprocesses, so
// `node -e "fs.writeFileSync('main.js', ...)"` sails straight past guard.mjs.
// This does not re-implement the content floor — it cannot, since the content is
// inside a shell string it would have to interpret. It removes the *routes*:
// eval flags, heredocs/piped interpreters, and shell writes into the files the
// floor protects.
//
// Same exit-code contract as guard.mjs: non-zero fails OPEN, so never throw.
//
// This is a speed bump and is meant to read as one. A student who wants to run
// `node -e` in their own terminal always can; what this stops is the agent
// quietly doing it on the student's behalf when a write was already refused.

import { loadConfig, lockedPaths } from "./harness.mjs";

// Eval flags, heredocs/here-strings, and piped stdin execution: no legitimate use
// in this project, and the canonical bypasses.
const EVAL = /\b(node|deno|bun|python3?|perl|ruby)\b[^|;&\n]*(?:\s(?:-e|--eval|-p|--print|-c)\b|<<)/;
// Flags only (`| node --input-type=module`, `| python3 -u -`): a script path
// after the interpreter is a real program reading stdin, not piped code.
const PIPED_INTERPRETER = /\|\s*(?:node|deno|bun|python3?|perl|ruby)(?:\s+-[^\s|;&\n]*)*(?=\s*(?:[|;&\n]|$))/;

function writesInto(command, exts) {
  const e = exts.map((x) => x.replace(".", "\\.")).join("|");
  const redirectTarget = String.raw`(?:"[^"\n]*(?:${e})"|'[^'\n]*(?:${e})'|[^\s|;&"'<>]*(?:\\ [^\s|;&"'<>]*)*(?:${e})(?=[\s|;&<>]|$))`;
  return [
    // redirection:  > main.js   >> journal.js   >| main.js   > "src/my file.js"
    new RegExp(String.raw`(?:>>|>\||>)\s*${redirectTarget}`, "i"),
    // tee, in-place sed/perl, and copy/move of a scratch file over a guarded one
    new RegExp(String.raw`(?:^|[\s;|&(])tee(?=\s)[^|;&\n]*(?:${e})\b`, "i"),
    new RegExp(String.raw`(?:^|[\s;|&(])(?:sed|perl)(?=\s)[^|;&\n]*\s-i(?:\b|\S*)`, "i"),
    new RegExp(String.raw`(?:^|[\s;|&(])(?:cp|mv|install|rsync)(?=\s)[^|;&\n]*(?:${e})\b`, "i"),
  ].some((re) => re.test(command));
}

const WRITE_VERBS = String.raw`tee|cp|mv|install|rsync|truncate|touch|rm|unlink|ln`;

/**
 * A shell write into a locked path — the harness's own files, and the brief.
 *
 * This is separate from writesInto() and matches on the PATH, not the extension,
 * because the locked set is mostly not source: `README.md`, `CLAUDE.md` and
 * `.claude/harness/config.json` are none of them in guardedExtensions, so before this
 * existed `echo x > README.md` and `echo {} > .claude/harness/config.json` both went
 * straight past the shell guard while the identical Edit was denied. A guard the
 * agent can step around by changing tools is not a guard.
 *
 * Adding `.md`/`.json` to guardedExtensions would NOT have been the fix: that
 * list also drives the content detectors, and running them over markdown would
 * start blocking a student's own notes for containing the word localStorage.
 * `PLAN.md` is locked by name instead, through neverWritable.
 */
function writesIntoLocked(command, locked) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Directory entries (e.g. ".claude/hooks/", ".claude/githooks/") match both the
  // directory itself (e.g. `rm -rf .claude/githooks`) and anything beneath it.
  // Allow arbitrary path prefixes (/abs/path/, $PWD/, ./) and quotes around targets.
  // Either separator: a quoted Windows path keeps its backslashes.
  const SEP = String.raw`[/\\]`;
  const pathRe = (s) => esc(s).replace(/\//g, SEP);
  const parents = new Set();
  const targets = locked.map((p) => {
    const clean = p.replace(/\\/g, "/").replace(/^\.\//, "");
    // Parents of a locked path (`.claude` for `.claude/hooks/`): `rm -rf .claude`
    // or `mv .claude x` takes every locked file beneath it along.
    const parts = clean.replace(/\/$/, "").split("/");
    for (let i = 1; i < parts.length; i++) parents.add(parts.slice(0, i).join("/"));
    return clean.endsWith("/")
      ? `${pathRe(clean.slice(0, -1))}(?:${SEP}[^\\s|;&"'<>]*)?`
      : pathRe(clean);
  });
  for (const dir of parents) if (dir && dir !== ".") targets.push(`${pathRe(dir)}${SEP}?`);
  if (!targets.length) return false;
  const alternatives = targets.join("|");
  const unquotedTarget = String.raw`(?:[^\s|;&"'<>]*${SEP})?(?:${alternatives})(?=[\s|;&<>]|$)`;
  const quotedTarget = (q) => String.raw`${q}(?:[^${q}\n]*${SEP})?(?:${alternatives})${q}`;
  const target = String.raw`(?:${quotedTarget('"')}|${quotedTarget("'")}|${unquotedTarget})`;

  return [
    // redirection:  > README.md   >> .claude/harness/config.json   >| README.md   > /abs/README.md
    new RegExp(String.raw`(?:>>|>\||>)\s*${target}`, "i"),
    new RegExp(String.raw`(?:^|[\s;|&(])(?:${WRITE_VERBS})(?=\s)[^|;&\n]*${target}`, "i"),
    new RegExp(String.raw`(?:^|[\s;|&(])(?:sed|perl)(?=\s)[^|;&\n]*\s-i\S*[^|;&\n]*${target}`, "i"),
  ].some((re) => re.test(command));
}

function deny(reason, studentMessage) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
      systemMessage: studentMessage,
    }),
  );
  process.exit(0);
}

const chunks = [];
for await (const c of process.stdin) chunks.push(c);

let event;
try {
  event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  process.exit(0); // envelope is Claude Code's, not the agent's — see guard.mjs
}

try {
  const command = event?.tool_input?.command;
  if (typeof command !== "string" || !command.trim()) process.exit(0);

  const config = loadConfig();
  const exts = config.guardedExtensions ?? [".js"];
  const syntaxCheck = typeof config.syntaxCheck === "string" ? config.syntaxCheck : null;
  // The whole command, not a substring of it. `includes` meant that
  // `node --check main.js; echo x > main.js` skipped every check below — the
  // exemption is for running the project's own check, not for carrying it.
  if (syntaxCheck && new RegExp(`^\\s*${syntaxCheck.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+[\\w./\\\\-]+\\s*$`).test(command)) {
    process.exit(0);
  }

  if (EVAL.test(command) || PIPED_INTERPRETER.test(command)) {
    deny(
      `Blocked: inline, heredoc, or piped interpreter scripts (\`-e\`/\`--eval\`/\`-p\`/\`-c\`, \`<<\`) are closed off here — they ` +
        `can write project files without passing the guard, so they ` +
        `are refused whatever they do. Reading something? Read the file directly. Running ` +
        `the project's own check? That one is allowed by name` +
        (syntaxCheck ? `: \`${syntaxCheck} <file>\`.` : `.`) +
        ` So is \`node .claude/hooks/signoff.mjs\`.`,
      `Harness: blocked an inline-eval command.`,
    );
  }

  if (writesIntoLocked(command, lockedPaths(config))) {
    deny(
      `Blocked: that command writes into a file the harness locks — either its own ` +
        `machinery or the assignment brief. Both are denied to you through Edit and ` +
        `Write, and the shell is not a way around that. If the student wants the ` +
        `requirements changed, that is their instructor's call, not a diff you make ` +
        `for them.`,
      `Harness: blocked a shell write into a locked file.`,
    );
  }

  if (writesInto(command, exts)) {
    deny(
      `Blocked: writing project source through the shell skips the guard that reads ` +
        `what is being written. Use Edit or Write so the check can run. If it refuses, ` +
        `that refusal is the answer — explain the code in chat instead.`,
      `Harness: blocked a shell write into project source.`,
    );
  }

  process.exit(0);
} catch (err) {
  deny(
    `The harness could not check this command and denied it to stay safe. ` +
      `Show this message to the student and suggest mentioning it to their instructor: ${err?.message ?? err}`,
    `Harness: bash guard error, command denied (failing closed). ${err?.message ?? err}`,
  );
}
