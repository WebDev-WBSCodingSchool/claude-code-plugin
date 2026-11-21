#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "exercise");
const repo = mkdtempSync(join(tmpdir(), "wbs-bash-guard-test-"));
const onboard = "node .claude/hooks/onboard.mjs";
const signoff = "node .claude/hooks/signoff.mjs";
const cases = [
  [onboard, false],
  [`${onboard} --check --issues`, false],
  [`${signoff} FR009`, false],
  [`${signoff} --status`, false],
  [`${signoff} FR009 --review --pr https://github.com/example/project/pull/1 --author teammate`, false],
  [`${signoff} FR009 --review --pr https://github.com/org/rm-app/pull/1 --author alice`, false],
  ["cat README.md", false],
  ["git status", false],
  ["node --check main.js", false],
  ["echo hi > notes.txt", false],
  ["cat main.js 2>/dev/null", false],
  [`${onboard}; echo x > main.js`, true],
  [`${signoff} FR009 && echo '{}' > .claude/harness/config.json`, true],
  [`${onboard}; node -e "console.log('test')"`, true],
  [`echo '${signoff}'; echo '{}' > .claude/harness/config.json`, true],
  // #11: .claude/githooks/ locked against shell and editor writes
  ["echo '#!/bin/sh' > .claude/githooks/pre-commit", true],
  ["echo 'process.exit(0)' > .claude/githooks/pre-commit.mjs", true],
  ["rm -rf .claude/githooks", true],
  // #13: rm/unlink/ln, absolute/variable redirections, spaces, >|, heredocs, piped interpreters
  ["rm .claude/hooks/guard.mjs", true],
  ["rm -f .claude/harness/config.json", true],
  ["unlink .claude/hooks/guard.mjs", true],
  ["ln -sf /tmp/x README.md", true],
  [`echo x > ${repo}/README.md`, true],
  ['echo x > "$PWD/README.md"', true],
  ["echo x >| README.md", true],
  ['echo x > "src/my file.js"', true],
  ["echo x >| main.js", true],
  ["node <<EOF\nconsole.log(1)\nEOF", true],
  ["python3 <<'EOF'\nopen('main.js','w').write('x')\nEOF", true],
  ['echo "console.log(1)" | node', true],
];

try {
  cpSync(join(pluginRoot, "runtime"), repo, { recursive: true });
  for (const [command, denied] of cases) {
    // Feed the proposed command to the hook; never execute the command itself.
    const result = spawnSync(process.execPath, [join(repo, ".claude", "hooks", "bash-guard.mjs")], {
      cwd: repo,
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    });
    assert.equal(result.status, 0, result.stderr);
    if (denied) {
      assert.notEqual(result.stdout, "", `allowed a protected command: ${command}`);
      assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, "deny", command);
    } else {
      assert.equal(result.stdout, "", `blocked a standalone helper: ${command}`);
    }
  }
  // #11: verify guard.mjs also denies Write/Edit to .claude/githooks/*
  for (const githook of [".claude/githooks/pre-commit", ".claude/githooks/pre-commit.mjs"]) {
    const guardRes = spawnSync(process.execPath, [join(repo, ".claude", "hooks", "guard.mjs")], {
      cwd: repo,
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
      input: JSON.stringify({ tool_input: { file_path: githook, content: "exit 0" } }),
    });
    assert.equal(guardRes.status, 0, guardRes.stderr);
    assert.equal(JSON.parse(guardRes.stdout).hookSpecificOutput.permissionDecision, "deny", githook);
  }
  console.log(`${cases.length} bash guard checks passed`);
} finally {
  rmSync(repo, { recursive: true, force: true });
}
