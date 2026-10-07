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
  [`${onboard}; echo x > main.js`, true],
  [`${signoff} FR009 && echo '{}' > .claude/harness/config.json`, true],
  [`${onboard}; node -e "console.log('test')"`, true],
  [`echo '${signoff}'; echo '{}' > .claude/harness/config.json`, true],
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
  console.log(`${cases.length} bash guard checks passed`);
} finally {
  rmSync(repo, { recursive: true, force: true });
}
