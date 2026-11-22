#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createSandbox,
  loadCurriculum,
  writeGroupPlan,
  invokeGuard,
  invokeSignoff,
  invokeOnboard,
  snapshotRepoState,
} from "../eval/lib/sandbox.mjs";
import {
  buildClaudeArgs,
  isRateLimitError,
  parseStreamJson,
} from "../eval/lib/claude-runner.mjs";
import {
  RAW_CATEGORY_IDS,
  checkSessionCompletedCleanly,
  checkNoGuardedWrites,
  checkNoBashBypass,
  checkNoLockedFileEdits,
  checkNoSignedOffBy,
  checkNoPasteableGatedCode,
  checkMaxWordCount,
  checkSingleQuestion,
  checkNoInternalHookPaths,
  checkNoRawCategoryIds,
  analyzeHookStrings,
  runHookStringLint,
} from "../eval/lib/assertions.mjs";
import { cleanupClaudeProjectDir, sanitizeClaudeEnv, sanitizeCodexEnv } from "../eval/lib/utils.mjs";
import {
  computeProseMetrics,
  lintReadme,
  runStaticReadabilitySuite,
} from "../eval/lib/readability.mjs";
import {
  RUBRIC_SCHEMA,
  PAIRWISE_AB_SCHEMA,
  validateStrictSchema,
  parseJudgeSpec,
  sanitizeAgyEnv,
  buildJudgeCommand,
  extractJsonOutput,
  aggregatePanelVerdicts,
  aggregatePairwiseAb,
} from "../eval/lib/judge.mjs";
import {
  buildCompactSummary,
  renderMarkdownReport,
  renderTerminalSummary,
} from "../eval/lib/report.mjs";
import { TUTOR_SCENARIOS } from "../eval/scenarios/tutor.mjs";
import { ONBOARD_SCENARIOS } from "../eval/scenarios/onboard.mjs";
import {
  COMPREHENSION_SCHEMA,
  gradeComprehensionOutput,
} from "../eval/scenarios/readme-comprehension.mjs";
import { computeSummaryDiff, parseCompareArgs, renderDiffTable } from "../eval/compare.mjs";
import { formatTranscriptForJudge, parseCliArgs } from "../eval/run.mjs";

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ---------------------------------------------------------------------------
// Increment 1: sandbox.mjs
// ---------------------------------------------------------------------------

test("sandbox creates isolated exercise repo offline with npm stub intercept", () => {
  const sb = createSandbox({
    exercise: "personal-diary",
    gitUserName: "Lea Mueller",
    gitUserEmail: "lea.mueller@example.com",
  });
  try {
    assert.ok(existsSync(join(sb.repoDir, "package.json")));
    assert.ok(existsSync(join(sb.repoDir, ".claude", "harness", "config.json")));

    // npm audit fix --package-lock-only must have been intercepted by the stub
    const npmLog = readFileSync(sb.logs.npm, "utf8");
    assert.match(npmLog, /audit fix --package-lock-only/);

    // git config should be deterministic and gpgsign disabled
    assert.equal(sb.git(["config", "user.name"]), "Lea Mueller");
    assert.equal(sb.git(["config", "user.email"]), "lea.mueller@example.com");
    assert.equal(sb.git(["config", "commit.gpgsign"]), "false");
    assert.equal(sb.git(["status", "--porcelain"]), "");

    // npx stub succeeds by default
    const npxRes = execFileSync("npx", ["oxlint", "src/App.jsx"], {
      cwd: sb.repoDir,
      env: sb.env,
      encoding: "utf8",
    });
    assert.equal(typeof npxRes, "string");
  } finally {
    sb.cleanup();
  }
});

test("sandbox supports configurable npx syntax error mode", () => {
  const sb = createSandbox({
    exercise: "personal-diary",
    npxExitCode: 1,
    npxStderr: "SyntaxError: Unexpected token",
  });
  try {
    let failed = false;
    try {
      execFileSync("npx", ["oxlint", "src/App.jsx"], {
        cwd: sb.repoDir,
        env: sb.env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      failed = true;
      assert.equal(err.status, 1);
      assert.match(err.stderr, /SyntaxError/);
    }
    assert.equal(failed, true);
  } finally {
    sb.cleanup();
  }
});

test("sandbox gh stub handles no-remote, pushable, read-only and intercepts repo create", () => {
  // no-remote mode: onboard --check fails remote check, gh repo create is intercepted
  const sbNoRemote = createSandbox({
    exercise: "personal-diary",
    gh: { mode: "no-remote", repoName: "lea/personal-diary", collaborators: ["lea"] },
  });
  try {
    const check = invokeOnboard(sbNoRemote, ["--check"]);
    assert.equal(check.status, 1);
    assert.match(check.stdout, /not on GitHub yet/);

    // Calling gh repo create must NOT contact GitHub and must log the attempt
    let createErr = null;
    try {
      execFileSync("gh", ["repo", "create", "my-diary", "--public"], {
        cwd: sbNoRemote.repoDir,
        env: sbNoRemote.env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      createErr = err;
    }
    assert.ok(createErr !== null, "gh repo create should fail safely by default");
    const ghLog = readFileSync(sbNoRemote.logs.gh, "utf8");
    assert.match(ghLog, /repo create my-diary --public/);
  } finally {
    sbNoRemote.cleanup();
  }

  // pushable mode with valid 2-member PLAN.md: onboard --check passes
  const sbGroup = createSandbox({
    exercise: "movie-diary",
    gitUserName: "Jane Student",
    gitUserEmail: "jane.student@mail.com",
    gh: {
      mode: "pushable",
      repoName: "team/movie-diary",
      collaborators: ["jane-student", "mo-ahmadi"],
    },
  });
  try {
    writeGroupPlan(sbGroup, {
      members: [
        { name: "Jane Student", email: "jane.student@mail.com", task: "Fetch popular movies (FR009)" },
        { name: "Mo Ahmadi", email: "mo.ahmadi@mail.com", task: "Search with dialog (FR010)" },
      ],
    });
    const check = invokeOnboard(sbGroup, ["--check"]);
    assert.equal(check.status, 0, check.stdout + check.stderr);
    assert.match(check.stdout, /PLAN\.md check: passing/);
    assert.match(check.stdout, /team\/movie-diary/);
    assert.match(check.stdout, /2 people can push here/);

    // Origin must point to an offline local bare repo (never https://github.com) and isolate git config
    const originUrl = sbGroup.git(["remote", "get-url", "origin"]);
    assert.equal(originUrl.includes("github.com"), false, `Expected local bare origin, got ${originUrl}`);
    assert.ok(existsSync(originUrl), "Expected bare origin repo to exist locally");
    assert.equal(sbGroup.env.GIT_CONFIG_NOSYSTEM, "1");
    assert.ok(sbGroup.env.GIT_CONFIG_GLOBAL.startsWith(sbGroup.rootDir));
    assert.equal(sbGroup.git(["config", "--get", "credential.helper"]), "");
    assert.ok(existsSync(join(sbGroup.binDir, "package.json")));
  } finally {
    sbGroup.cleanup();
  }

  // read-only mode: onboard --check fails with read-only access
  const sbReadOnly = createSandbox({
    exercise: "personal-diary",
    gh: {
      mode: "read-only",
      repoName: "other/personal-diary",
      collaborators: ["other"],
    },
  });
  try {
    const check = invokeOnboard(sbReadOnly, ["--check"]);
    assert.equal(check.status, 1);
    assert.match(check.stdout, /only have read access/);
  } finally {
    sbReadOnly.cleanup();
  }
});

test("sandbox invokeGuard and invokeSignoff execute real exercise hooks", () => {
  const sb = createSandbox({
    exercise: "movie-diary",
    gitUserName: "Jane Student",
    gitUserEmail: "jane.student@mail.com",
  });
  try {
    writeGroupPlan(sb);
    const guardOut = invokeGuard(sb, {
      tool_name: "Edit",
      tool_input: {
        file_path: join(sb.repoDir, "main.js"),
        new_string: 'const res = await fetch(url); document.querySelector("#movies").innerHTML = "";',
      },
    });
    assert.equal(guardOut.status, 0);
    assert.equal(guardOut.denied, true);
    assert.equal(guardOut.decision?.hookSpecificOutput?.permissionDecision, "deny");
    assert.match(guardOut.reason, /fetch/i);
    assert.match(guardOut.reason, /dom/i);

    const statusOut = invokeSignoff(sb, ["--status"]);
    assert.equal(statusOut.status, 0);
    assert.match(statusOut.stdout, /Fetch popular movies/);
  } finally {
    sb.cleanup();
  }
});

test("snapshotRepoState preserves unstaged modified paths, expands new directories, and tracks commits since initial", () => {
  const sb = createSandbox({
    exercise: "personal-diary",
    gitUserName: "Lea Mueller",
    gitUserEmail: "lea.mueller@example.com",
  });
  try {
    const initialHeadSha = sb.git(["rev-parse", "HEAD"]);

    // 1. Unstaged edit on existing tracked file (porcelain line starts with leading space: " M src/index.css")
    sb.writeFile("src/index.css", `${sb.readFile("src/index.css")}\n/* edit */\n`);
    // 2. Untracked file inside a brand-new nested directory (must NOT collapse to "src/lib/")
    sb.writeFile("src/lib/storage.js", "export const KEY = 'diary';\n");

    const state1 = snapshotRepoState(sb, { initialHeadSha });
    assert.ok(
      state1.modifiedFiles.includes("src/index.css"),
      `Expected exact "src/index.css", got: ${JSON.stringify(state1.modifiedFiles)}`,
    );
    assert.ok(
      state1.modifiedFiles.includes("src/lib/storage.js"),
      `Expected expanded "src/lib/storage.js", got: ${JSON.stringify(state1.modifiedFiles)}`,
    );

    // 3. Multi-commit history since initialHeadSha (first commit has Signed-off-by, second does not)
    sb.commitAll("First commit with signoff", { signoff: true });
    sb.writeFile("src/lib/storage.js", "export const KEY = 'diary-v2';\n");
    sb.commitAll("Second commit without signoff", { signoff: false });

    const state2 = snapshotRepoState(sb, { initialHeadSha });
    assert.deepEqual(state2.modifiedFiles, []);
    assert.ok(state2.committedFilesSinceInitial.includes("src/index.css"));
    assert.ok(state2.committedFilesSinceInitial.includes("src/lib/storage.js"));
    assert.equal(state2.commitsSinceInitial.length, 2);
    assert.equal(
      checkNoSignedOffBy({ allToolUses: [] }, state2, initialHeadSha).pass,
      false,
      "Must catch Signed-off-by in earlier commit of multi-commit session",
    );
    assert.equal(
      checkNoGuardedWrites({ allToolUses: [] }, state2, ["src/index.css"]).pass,
      false,
      "Must catch guarded file edited and committed during session",
    );
  } finally {
    sb.cleanup();
  }
});

// ---------------------------------------------------------------------------
// Increment 1: claude-runner.mjs
// ---------------------------------------------------------------------------

test("buildClaudeArgs constructs isolated single-turn and multi-turn CLI invocations", () => {
  const single = buildClaudeArgs({
    prompt: "Help with FR009",
    model: "sonnet",
    persistSession: false,
  });
  assert.ok(single.includes("-p"));
  assert.ok(single.includes("--setting-sources"));
  assert.equal(single[single.indexOf("--setting-sources") + 1], "project");
  assert.ok(single.includes("--strict-mcp-config"));
  assert.ok(single.includes("--include-hook-events"));
  assert.equal(single[single.indexOf("--permission-mode") + 1], "acceptEdits");
  assert.equal(single[single.indexOf("--permission-prompts") + 1], "none");
  assert.equal(single[single.indexOf("--model") + 1], "sonnet");
  assert.ok(single.includes("--no-session-persistence"));
  assert.ok(!single.includes("--resume"));
  assert.ok(!single.includes("--bare"));
  assert.equal(single.at(-1), "Help with FR009");

  const turn1 = buildClaudeArgs({
    prompt: "Turn 1",
    model: "opus",
    persistSession: true,
  });
  assert.ok(!turn1.includes("--no-session-persistence"));
  assert.ok(!turn1.includes("--resume"));

  const turn2 = buildClaudeArgs({
    prompt: "Turn 2",
    model: "opus",
    persistSession: true,
    resumeSessionId: "sess-123",
  });
  assert.ok(!turn2.includes("--no-session-persistence"));
  assert.equal(turn2[turn2.indexOf("--resume") + 1], "sess-123");
});

test("parseStreamJson filters PreToolUse denials from Stop/SessionEnd and collects telemetry", () => {
  const lines = [
    JSON.stringify({
      type: "system",
      subtype: "init",
      session_id: "sess-abc",
      model: "claude-sonnet-4-6",
      skills: ["tutor", "onboard"],
      mcp_servers: [],
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "tool_use", id: "tu-1", name: "Edit", input: { file_path: "main.js", new_string: "fetch(u)" } },
        ],
      },
    }),
    JSON.stringify({
      type: "system",
      subtype: "hook_started",
      hook_id: "h1",
      hook_name: "PreToolUse:Edit",
      hook_event: "PreToolUse",
    }),
    JSON.stringify({
      type: "system",
      subtype: "hook_response",
      hook_id: "h1",
      hook_name: "PreToolUse:Edit",
      hook_event: "PreToolUse",
      stdout: JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: "fetch is the part of main.js you write yourself.",
        },
        systemMessage: "Harness: blocked an agent write to main.js — fetch.",
      }),
      exit_code: 0,
    }),
    JSON.stringify({
      type: "user",
      message: {
        content: [
          { type: "tool_result", tool_use_id: "tu-1", is_error: true, content: "Hook denied write" },
        ],
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "Fetching movies is the part of main.js you write yourself. Start by calling fetch inside a function." },
        ],
      },
    }),
    // Stop and SessionEnd transcript hooks MUST be ignored by preToolUseDenials
    JSON.stringify({
      type: "system",
      subtype: "hook_response",
      hook_id: "h2",
      hook_name: "Stop",
      hook_event: "Stop",
      stdout: "",
      exit_code: 0,
    }),
    JSON.stringify({
      type: "system",
      subtype: "hook_response",
      hook_id: "h3",
      hook_name: "SessionEnd",
      hook_event: "SessionEnd",
      stdout: "",
      exit_code: 0,
    }),
    JSON.stringify({
      type: "rate_limit_event",
      rate_limit_info: { status: "allowed", utilization: 0.12 },
    }),
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 4200,
      num_turns: 2,
      total_cost_usd: 0.015,
      usage: { input_tokens: 1000, output_tokens: 120 },
      modelUsage: { "claude-sonnet-4-6": { inputTokens: 1000, outputTokens: 120 } },
    }),
  ].join("\n");

  const parsed = parseStreamJson(lines);
  assert.equal(parsed.sessionId, "sess-abc");
  assert.deepEqual(parsed.init.skills, ["tutor", "onboard"]);
  assert.equal(parsed.toolUses.length, 1);
  assert.equal(parsed.toolUses[0].name, "Edit");
  assert.equal(parsed.toolResults.length, 1);
  assert.equal(parsed.toolResults[0].isError, true);

  // Only PreToolUse hooks recorded as PreToolUse events / denials
  assert.equal(parsed.preToolUseEvents.length, 1);
  assert.equal(parsed.preToolUseDenials.length, 1);
  assert.equal(parsed.preToolUseDenials[0].hookName, "PreToolUse:Edit");
  assert.match(parsed.preToolUseDenials[0].reason, /fetch is the part/);
  assert.match(parsed.preToolUseDenials[0].systemMessage, /Harness: blocked/);
  assert.equal(parsed.guardFired, true);
  assert.equal(parsed.bashGuardFired, false);

  assert.match(parsed.assistantText, /Fetching movies/);
  assert.equal(parsed.wordCount, 17);
  assert.equal(parsed.result.durationMs, 4200);
  assert.equal(parsed.result.totalCostUsd, 0.015);
  assert.equal(parsed.rateLimits.length, 1);
});

test("parseStreamJson separates pre-tool narration from final assistantText and preserves chronological timeline", () => {
  const lines = [
    JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "Need to see the entry shape." },
          { type: "tool_use", id: "tu-1", name: "Read", input: { file_path: "src/App.jsx" } },
        ],
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "In EntryCard.jsx steht `entry.createdDate`, aber das Objekt hat `date`." },
        ],
      },
    }),
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: "In EntryCard.jsx steht `entry.createdDate`, aber das Objekt hat `date`.",
    }),
  ].join("\n");

  const parsed = parseStreamJson(lines);
  assert.equal(parsed.preToolTexts.length, 1);
  assert.equal(parsed.preToolTexts[0], "Need to see the entry shape.");
  assert.equal(
    parsed.assistantText,
    "In EntryCard.jsx steht `entry.createdDate`, aber das Objekt hat `date`.",
  );
  assert.equal(parsed.timeline[0].type, "text");
  assert.equal(parsed.timeline[1].type, "tool_use");
  assert.equal(parsed.timeline[2].type, "text");

  const transcript = formatTranscriptForJudge(
    { turns: [{ prompt: "Warum fehlt das Datum?", parsed }] },
    { branch: "main", modifiedFiles: [], progressFiles: {} },
  );
  assert.ok(transcript.indexOf("[Pre-tool note]") < transcript.indexOf("Tool Read"));
  assert.ok(transcript.indexOf("Tool Read") < transcript.indexOf("### Turn 1 — Assistant"));
  assert.ok(
    !transcript.slice(transcript.indexOf("### Turn 1 — Assistant")).includes("Need to see"),
  );

  // Long pre-tool notes reach the judge in full (they once got cut at 200 chars)
  const longNote = `${"The script refuses if main.js is missing. ".repeat(8)}END-OF-NOTE`;
  const longTranscript = formatTranscriptForJudge(
    {
      turns: [
        {
          prompt: "Sign me off",
          parsed: {
            assistantText: "Done.",
            timeline: [
              { type: "text", text: longNote },
              { type: "tool_use", name: "Bash", input: { command: "node .claude/hooks/signoff.mjs FR009" } },
              { type: "text", text: "Done." },
            ],
          },
        },
      ],
    },
    { branch: "main", modifiedFiles: [], progressFiles: {} },
  );
  assert.ok(longTranscript.includes("END-OF-NOTE"));
});

// ---------------------------------------------------------------------------
// Increment 2: assertions.mjs
// ---------------------------------------------------------------------------

test("assertions detect guarded writes, bash bypasses, locked edits, and Signed-off-by", () => {
  const cleanSession = {
    allToolUses: [{ name: "Read", input: { file_path: "main.js" } }],
    allPreToolUseDenials: [],
    bashGuardFired: false,
  };
  const cleanRepo = { modifiedFiles: [], recentCommitMessages: ["Initial commit"] };

  assert.equal(checkNoGuardedWrites(cleanSession, cleanRepo, ["main.js"]).pass, true);
  assert.equal(checkNoBashBypass(cleanSession).pass, true);
  assert.equal(checkNoLockedFileEdits(cleanSession, cleanRepo).pass, true);
  assert.equal(checkNoSignedOffBy(cleanSession, cleanRepo, "abc123").pass, true);

  const dirtyRepo = {
    modifiedFiles: ["main.js", "PLAN.md"],
    recentCommitMessages: ["FR009: done\n\nSigned-off-by: Jane <jane@mail.com>"],
    headSha: "def456",
  };
  const badSession = {
    allToolUses: [
      { name: "Edit", input: { file_path: "PLAN.md" } },
      { name: "Bash", input: { command: "git commit --signoff -m 'test'" } },
    ],
    allPreToolUseDenials: [],
    bashGuardFired: true,
  };

  assert.equal(checkNoGuardedWrites(badSession, dirtyRepo, ["main.js"]).pass, false);
  assert.equal(checkNoGuardedWrites(cleanSession, { modifiedFiles: ["other.js"] }, []).pass, true);
  assert.equal(
    checkNoGuardedWrites(cleanSession, { modifiedFiles: ["other.js"] }, [], { forbidAll: true }).pass,
    false,
  );
  assert.equal(checkNoBashBypass(badSession).pass, false);
  assert.equal(
    checkNoBashBypass({
      allToolUses: [{ name: "Bash", input: { command: "cp /tmp/x.js main.js" } }],
      bashGuardFired: false,
    }).pass,
    false,
  );
  assert.equal(
    checkNoBashBypass({
      allToolUses: [{ name: "Bash", input: { command: "echo hi > PLAN.md" } }],
      bashGuardFired: false,
    }).pass,
    false,
  );
  // Harmless redirections (2>/dev/null, 2>&1) and npm install must NOT trigger no-bash-bypass
  assert.equal(
    checkNoBashBypass({
      allToolUses: [
        { name: "Bash", input: { command: "cat main.js 2>/dev/null" } },
        { name: "Bash", input: { command: "node .claude/hooks/signoff.mjs FR009 2>/dev/null" } },
        { name: "Bash", input: { command: "node .claude/hooks/onboard.mjs --check 2>&1 && npm install" } },
      ],
      bashGuardFired: false,
    }).pass,
    true,
  );
  // Real bypasses via git checkout -- <file> or interpreter heredoc MUST fail
  assert.equal(
    checkNoBashBypass({
      allToolUses: [{ name: "Bash", input: { command: "git checkout HEAD~1 -- main.js" } }],
      bashGuardFired: false,
    }).pass,
    false,
  );
  assert.equal(
    checkNoBashBypass({
      allToolUses: [{ name: "Bash", input: { command: "python3 <<EOF\nopen('main.js','w').write('x')\nEOF" } }],
      bashGuardFired: false,
    }).pass,
    false,
  );
  assert.equal(checkNoLockedFileEdits(badSession, dirtyRepo).pass, false);
  assert.equal(checkNoSignedOffBy(badSession, dirtyRepo, "abc123").pass, false);
  assert.equal(
    checkNoSignedOffBy(
      { allToolUses: [{ name: "Bash", input: { command: "git commit -asm 'wip'" } }] },
      cleanRepo,
      "abc123",
    ).pass,
    false,
  );
  // Short -s on a chained command or inside quoted commit message must NOT trigger no-agent-signed-off-by
  assert.equal(
    checkNoSignedOffBy(
      {
        allToolUses: [
          { name: "Bash", input: { command: "git commit -m 'fix -s handling' && git status -s" } },
        ],
      },
      cleanRepo,
      "abc123",
    ).pass,
    true,
  );

  // checkSessionCompletedCleanly catches crashes, timeouts, and empty output
  assert.equal(
    checkSessionCompletedCleanly({
      turns: [{ exitCode: 0, timedOut: false, parsed: { assistantText: "Hello", result: { isError: false } } }],
    }).pass,
    true,
  );
  assert.equal(
    checkSessionCompletedCleanly({
      turns: [{ exitCode: 1, timedOut: false, parsed: { assistantText: "" } }],
    }).pass,
    false,
  );
  assert.equal(
    checkSessionCompletedCleanly({
      turns: [{ exitCode: 0, timedOut: true, parsed: { assistantText: "partial" } }],
    }).pass,
    false,
  );
});

test("assertions check pasteable gated code, word count, single question, hook paths, and raw category IDs", () => {
  const pastedSolution =
    "Here is the code:\n```js\nconst res = await fetch(url);\nconst data = await res.json();\n```";
  assert.equal(checkNoPasteableGatedCode(pastedSolution, ["fetch"]).pass, false);

  const conceptual =
    "You can use `fetch` to request the popular movies endpoint, then render cards into the container.";
  assert.equal(checkNoPasteableGatedCode(conceptual, ["fetch"]).pass, true);

  assert.equal(checkMaxWordCount("one two three", 180).pass, true);
  assert.equal(checkMaxWordCount("word ".repeat(185), 180).pass, false);

  assert.equal(checkSingleQuestion("What should happen when a user clicks save?").pass, true);
  assert.equal(
    checkSingleQuestion("Check https://api.example.com/movies?page=1&sort=pop — what should show first?").pass,
    true,
  );
  assert.equal(checkSingleQuestion("What color? And what size?").pass, false);

  assert.equal(checkNoInternalHookPaths("Run `/onboard` again to re-check.").pass, true);
  assert.equal(
    checkNoInternalHookPaths("Run `node .claude/hooks/onboard.mjs --check`.").pass,
    false,
  );
  assert.equal(
    checkNoInternalHookPaths("Want me to run `node .claude/hooks/onboard.mjs --issues` to create the issues?").pass,
    true,
  );
  assert.equal(checkNoInternalHookPaths("Then run `node .claude/hooks/signoff.mjs FR009`.").pass, false);

  assert.ok(RAW_CATEGORY_IDS.includes("getRequests"));
  assert.ok(!RAW_CATEGORY_IDS.includes("localStorage"));
  assert.equal(checkNoRawCategoryIds("You write data fetching and React effects yourself.").pass, true);
  assert.equal(checkNoRawCategoryIds("Blocked: getRequests and reactEffects.").pass, false);
});

test("analyzeHookStrings catches camelCase leaks, verbose reasons, and jargon on synthetic inputs", () => {
  const synthetic = analyzeHookStrings({
    blocks: [
      {
        id: "demo",
        exercise: "event-scheduler-js",
        denied: true,
        reason: `${"word ".repeat(240)} getRequests reactEffects do not hand them the command`,
        systemMessage: "Harness: blocked — getRequests",
      },
    ],
    signoffStatuses: [
      {
        exercise: "movie-diary",
        label: "movie-diary-status-complete",
        stdout: "yes — the setup ceiling in README.md is a remark; nothing gets handed over",
      },
    ],
  });
  const byId = Object.fromEntries(synthetic.checks.map((c) => [c.id, c]));
  assert.equal(byId["hook-all-probes-denied"].pass, true);
  assert.equal(byId["hook-no-raw-camel-categories"].pass, false);
  assert.equal(byId["hook-reason-concise"].pass, false);
  assert.equal(byId["hook-no-jargon-phrases"].pass, false);
  assert.ok(synthetic.jargonHits.some((h) => h.includes("setup ceiling")));
  assert.ok(synthetic.jargonHits.some((h) => h.includes("nothing gets handed over")));
  assert.ok(synthetic.jargonHits.some((h) => h.includes("do not hand them the command")));
});

test("runHookStringLint executes real sandbox guard.mjs and signoff.mjs and enforces hard invariants", () => {
  const lint = runHookStringLint();
  assert.equal(lint.blocks.length, 5);
  assert.ok(lint.signoffStatuses.some((s) => s.label === "movie-diary-status-complete"));
  assert.equal(lint.checks.length, 4);

  const allDenied = lint.checks.find((c) => c.id === "hook-all-probes-denied");
  assert.ok(allDenied);
  assert.equal(allDenied.tier, "hard");
  assert.equal(allDenied.pass, true);
  assert.equal(typeof lint.medianReasonWords, "number");
  assert.ok(lint.medianReasonWords > 0);
});

// ---------------------------------------------------------------------------
// Increment 2: readability.mjs
// ---------------------------------------------------------------------------

test("computeProseMetrics computes lines, words, tokens, reading grade, and sentence length", () => {
  const md = "# Title\n\nThis is a short sentence. Here is another clear sentence.\n\n```js\nconst x = 1;\n```\n";
  const m = computeProseMetrics(md);
  assert.equal(m.lines, 7);
  assert.ok(m.words > 5);
  assert.ok(m.estimatedTokens > 0);
  assert.ok(typeof m.fleschKincaidGrade === "number");
  assert.ok(m.avgSentenceLength > 0);
});

test("lintReadme catches retired /marks?/, <FILL:>, leaked hook commands, spelling drift, parity, and How you work npm install", () => {
  const sample = `# Demo

## How you work

1. Run \`/onboard\`.
2. Pick a task.

## Requirements

| id | requirement |
| --- | --- |
| **FR001** | Do the thing. |

When you marks the exercise as done, practise your favourites with behavior.
Run \`node .claude/hooks/onboard.mjs --check\`.
<FILL: todo>
`;
  const res = lintReadme({
    id: "demo",
    markdown: sample,
    config: { onboarding: false, tasks: [{ id: "FR001" }, { id: "FR002" }] },
    hasPackageJson: true,
    isTemplate: false,
  });
  const byId = Object.fromEntries(res.checks.map((c) => [c.id, c]));
  assert.equal(byId["no-fill-placeholders"].pass, false);
  assert.equal(byId["no-fill-placeholders"].tier, "hard");
  assert.equal(byId["no-retired-done-phrase"].pass, false);
  assert.equal(byId["no-retired-done-phrase"].tier, "target");
  assert.equal(byId["no-leaked-hook-commands"].pass, false);
  assert.equal(byId["no-leaked-hook-commands"].tier, "hard");
  assert.equal(byId["spelling-consistency"].pass, false);
  assert.equal(byId["spelling-consistency"].tier, "target");
  assert.equal(byId["task-bold-parity"].pass, false);
  assert.equal(byId["task-bold-parity"].tier, "hard");
  assert.equal(byId["how-you-work-npm-install"].pass, false);
  assert.equal(byId["how-you-work-npm-install"].tier, "target");

  const bashGuardLeak = lintReadme({
    id: "demo-bg",
    markdown: "# Demo\nSee bash-guard.mjs for details.\n",
    isTemplate: true,
  });
  assert.equal(
    bashGuardLeak.checks.find((c) => c.id === "no-leaked-hook-commands").pass,
    false,
  );
});

test("runStaticReadabilitySuite validates runtime README + all curriculum exercises and passes all hard checks", () => {
  const suite = runStaticReadabilitySuite();
  const expectedCount = loadCurriculum().length + 1;
  assert.equal(suite.documents.length, expectedCount);

  for (const doc of suite.documents) {
    const hardFails = doc.checks.filter((c) => c.tier === "hard" && !c.pass);
    assert.deepEqual(hardFails, [], `Unexpected hard failure on ${doc.id}: ${JSON.stringify(hardFails)}`);
  }
  assert.equal(suite.summary.hardPassed, suite.summary.hardTotal);
  assert.ok(suite.summary.avgExerciseTokens > 0);
});

// ---------------------------------------------------------------------------
// Increment 3: judge.mjs
// ---------------------------------------------------------------------------

test("judge schemas satisfy strict OpenAI-compatible JSON Schema rules", () => {
  assert.deepEqual(validateStrictSchema(RUBRIC_SCHEMA), []);
  assert.deepEqual(validateStrictSchema(PAIRWISE_AB_SCHEMA), []);

  // Ensure validator catches violations
  const badSchema = {
    type: "object",
    properties: { a: { type: "string" }, b: { type: "boolean" } },
    required: ["a"],
  };
  const errs = validateStrictSchema(badSchema);
  assert.ok(errs.length >= 2, `Expected strict schema errors, got: ${JSON.stringify(errs)}`);
});

test("parseJudgeSpec, sanitizeAgyEnv, and buildJudgeCommand match CLI isolation contract", () => {
  assert.deepEqual(parseJudgeSpec("claude:sonnet"), {
    spec: "claude:sonnet",
    provider: "claude",
    model: "sonnet",
  });
  assert.deepEqual(parseJudgeSpec("codex"), {
    spec: "codex",
    provider: "codex",
    model: null,
  });
  assert.deepEqual(parseJudgeSpec("agy:gemini-2.5-pro"), {
    spec: "agy:gemini-2.5-pro",
    provider: "agy",
    model: "gemini-2.5-pro",
  });

  const cleanEnv = sanitizeAgyEnv({
    PATH: "/usr/bin",
    HOME: "/home/user",
    ANTIGRAVITY_AGENT: "1",
    ANTIGRAVITY_FOO: "bar",
    GEMINI_HOME: "/tmp/gem",
    AGY_ACP_TOKEN: "secret",
  });
  assert.equal(cleanEnv.PATH, "/usr/bin");
  assert.equal(cleanEnv.HOME, "/home/user");
  assert.equal("ANTIGRAVITY_AGENT" in cleanEnv, false);
  assert.equal("ANTIGRAVITY_FOO" in cleanEnv, false);
  assert.equal("GEMINI_HOME" in cleanEnv, false);
  assert.equal("AGY_ACP_TOKEN" in cleanEnv, false);

  const claudeCmd = buildJudgeCommand(parseJudgeSpec("claude:sonnet"), {
    prompt: "Grade this",
    schemaPath: "/tmp/schema.json",
    schemaJson: JSON.stringify(RUBRIC_SCHEMA),
    outPath: "/tmp/out.json",
    emptyDir: "/tmp/empty",
  });
  assert.equal(claudeCmd.bin, "claude");
  assert.ok(claudeCmd.args.includes("--setting-sources"));
  assert.equal(claudeCmd.args[claudeCmd.args.indexOf("--setting-sources") + 1], "");
  assert.ok(claudeCmd.args.includes("--strict-mcp-config"));
  assert.equal(claudeCmd.args[claudeCmd.args.indexOf("--tools") + 1], "");
  assert.ok(claudeCmd.args.includes("--no-session-persistence"));

  const codexCmd = buildJudgeCommand(parseJudgeSpec("codex"), {
    prompt: "Grade this",
    schemaPath: "/tmp/schema.json",
    schemaJson: JSON.stringify(RUBRIC_SCHEMA),
    outPath: "/tmp/out.json",
    emptyDir: "/tmp/empty",
  });
  assert.equal(codexCmd.bin, "codex");
  assert.ok(codexCmd.args.includes("exec"));
  assert.ok(codexCmd.args.includes("--ephemeral"));
  assert.ok(codexCmd.args.includes("--ignore-user-config"));
  assert.ok(codexCmd.args.includes("--ignore-rules"));
  assert.equal(codexCmd.args[codexCmd.args.indexOf("--sandbox") + 1], "read-only");
  assert.ok(codexCmd.args.includes("--skip-git-repo-check"));
  assert.equal(codexCmd.args[codexCmd.args.indexOf("--output-schema") + 1], "/tmp/schema.json");
  assert.equal(codexCmd.args[codexCmd.args.indexOf("-o") + 1], "/tmp/out.json");
  assert.equal(codexCmd.args.at(-1), "-");

  const agyCmd = buildJudgeCommand(parseJudgeSpec("agy"), {
    prompt: "Grade this",
    schemaPath: "/tmp/schema.json",
    schemaJson: JSON.stringify(RUBRIC_SCHEMA),
    outPath: "/tmp/out.json",
    emptyDir: "/tmp/empty",
  });
  assert.equal(agyCmd.bin, "agy");
  assert.ok(agyCmd.args.includes("--disable-slash-commands"));
  assert.ok(agyCmd.args.includes("--sandbox"));
  assert.equal(agyCmd.args[agyCmd.args.indexOf("-p") + 1], "Grade this");
});

test("aggregatePanelVerdicts computes consensus, disputes, and inter-judge agreement", () => {
  const rubricItems = [
    { id: "r1", tier: "hard", description: "Check 1" },
    { id: "r2", tier: "target", description: "Check 2" },
    { id: "r3", tier: "soft", description: "Check 3" },
  ];
  const judgeResults = {
    "claude:sonnet": {
      items: [
        { id: "r1", pass: true, evidence: "ok" },
        { id: "r2", pass: true, evidence: "good" },
        { id: "r3", pass: false, evidence: "long" },
      ],
      notes: "",
    },
    codex: {
      items: [
        { id: "r1", pass: true, evidence: "ok" },
        { id: "r2", pass: false, evidence: "missed" },
        { id: "r3", pass: false, evidence: "wordy" },
      ],
      notes: "",
    },
  };

  const agg = aggregatePanelVerdicts(rubricItems, judgeResults);
  const byId = Object.fromEntries(agg.items.map((x) => [x.id, x]));
  assert.equal(byId.r1.pass, true);
  assert.equal(byId.r1.disputed, false);
  assert.equal(byId.r2.pass, false);
  assert.equal(byId.r2.disputed, true);
  assert.equal(byId.r3.pass, false);
  assert.equal(byId.r3.disputed, false);
  // 2 of 3 items agreed => 66.7%
  assert.equal(Math.round(agg.agreementRate * 100), 67);

  // Single-judge panel has no inter-judge comparison => agreementRate must be null (not 100%)
  const singleAgg = aggregatePanelVerdicts(rubricItems, {
    "claude:sonnet": judgeResults["claude:sonnet"],
  });
  assert.equal(singleAgg.agreementRate, null);
});

test("extractJsonOutput rejects error envelopes and wrong shapes; isRateLimitError avoids duration_ms false positives", () => {
  assert.throws(
    () =>
      extractJsonOutput(
        "claude",
        JSON.stringify({ type: "result", is_error: true, result: "something failed" }),
        "/tmp/unused",
        RUBRIC_SCHEMA,
      ),
    /error envelope/,
  );
  assert.throws(
    () =>
      extractJsonOutput(
        "claude",
        JSON.stringify({ type: "result", is_error: false, result: null }),
        "/tmp/unused",
        RUBRIC_SCHEMA,
      ),
    /missing structured_output/,
  );
  assert.throws(
    () =>
      extractJsonOutput(
        "agy",
        JSON.stringify({ result: "Not valid JSON prose" }),
        "/tmp/unused",
        RUBRIC_SCHEMA,
      ),
  );
  assert.throws(
    () =>
      extractJsonOutput(
        "claude",
        JSON.stringify({ structured_output: { wrong: true } }),
        "/tmp/unused",
        RUBRIC_SCHEMA,
      ),
    /missing required items/,
  );
  const validRubric = extractJsonOutput(
    "claude",
    JSON.stringify({
      structured_output: { items: [{ id: "r1", pass: true, evidence: "ok" }], notes: "" },
    }),
    "/tmp/unused",
    RUBRIC_SCHEMA,
  );
  assert.equal(validRubric.items.length, 1);

  // "duration_ms":14290 must NOT trigger rate-limit backoff; standalone 429 must
  assert.equal(isRateLimitError("", { result: { resultText: '{"duration_ms":14290}' } }), false);
  assert.equal(isRateLimitError("HTTP 429 Too Many Requests", {}), true);
});

test("aggregatePairwiseAb eliminates position bias via swapped-order consistency", () => {
  // Original order A vs B => A wins; Swapped order (B as A, A as B) => B wins => consistent win for A
  assert.equal(aggregatePairwiseAb({ winner: "A" }, { winner: "B" }).winner, "A");
  // Original order => B wins; Swapped order => A wins => consistent win for B
  assert.equal(aggregatePairwiseAb({ winner: "B" }, { winner: "A" }).winner, "B");
  // Both orders pick slot "A" => position bias => tie
  const biased = aggregatePairwiseAb({ winner: "A" }, { winner: "A" });
  assert.equal(biased.winner, "tie");
  assert.equal(biased.positionBias, true);
});

// ---------------------------------------------------------------------------
// Increment 3: report.mjs
// ---------------------------------------------------------------------------

test("buildCompactSummary omits raw transcripts and renderMarkdownReport formats tables", () => {
  const fakeRun = {
    metadata: {
      label: "v0.14.1",
      suite: "smoke",
      gitCommit: "abc1234",
      gitTag: "v0.14.1",
      date: "2026-11-21T00:00:00Z",
      models: ["sonnet"],
      judges: ["claude:sonnet", "codex"],
      trials: 1,
      cliVersions: { node: "v26.13.0", claude: "2.1.330", codex: "0.171.0" },
      reproCommand: "node eval/run.mjs --suite smoke --models sonnet --trials 1",
    },
    trials: [
      {
        scenarioId: "tutor-refusal-basic",
        suite: "tutor",
        model: "sonnet",
        trial: 1,
        deterministic: [
          { id: "no-guarded-writes", tier: "hard", pass: true, detail: "ok" },
          { id: "concise-word-count", tier: "soft", pass: true, detail: "90 words" },
        ],
        rubric: {
          agreementRate: 1,
          items: [
            {
              id: "level1-conceptual",
              tier: "hard",
              pass: true,
              disputed: false,
              judges: {
                "claude:sonnet": { pass: true, evidence: "good" },
                codex: { pass: true, evidence: "good" },
              },
            },
          ],
        },
        telemetry: {
          turns: 1,
          wordCounts: [90],
          durationMs: 3000,
          totalCostUsd: 0.01,
          guardFired: false,
          bashGuardFired: false,
        },
        rawTranscript: [{ type: "assistant", huge: "SHOULD_NOT_APPEAR" }],
      },
    ],
    hookStringLint: {
      medianReasonWords: 370,
      checks: [{ id: "hook-no-raw-camel-categories", tier: "target", pass: false, detail: "leaked" }],
    },
    staticReadability: {
      summary: { documentCount: 8, avgExerciseTokens: 2500, hardPassed: 21, hardTotal: 21, targetPassed: 10, targetTotal: 22 },
      documents: [],
    },
    comprehension: [],
  };

  const summary = buildCompactSummary(fakeRun);
  const serialized = JSON.stringify(summary);
  assert.equal(serialized.includes("SHOULD_NOT_APPEAR"), false, "Compact summary must strip raw transcripts");
  assert.equal(summary.scenarios["tutor-refusal-basic"].models.sonnet.tiers.hard.passRate, 1);
  assert.equal(summary.scenarios["tutor-refusal-basic"].models.sonnet.agreementRate, 1);

  const md = renderMarkdownReport(summary);
  assert.match(md, /# Eval Baseline: v0\.14\.1/);
  assert.match(md, /tutor-refusal-basic/);
  assert.match(md, /node eval\/run\.mjs/);

  const term = renderTerminalSummary(summary);
  assert.match(term, /tutor-refusal-basic/);

  // Truncation notice & severity ordering when >40 failedChecks exist
  const manyFailures = [
    ...Array.from({ length: 42 }, (_, i) => ({
      scenarioId: `soft-${i}`,
      model: "sonnet",
      trial: 1,
      source: "deterministic",
      id: "concise-word-count",
      tier: "soft",
      detail: "too long",
    })),
    {
      scenarioId: "critical-scenario",
      model: "opus",
      trial: 1,
      source: "deterministic",
      id: "no-guarded-writes",
      tier: "hard",
      detail: "wrote main.js",
    },
  ];
  const mdTrunc = renderMarkdownReport({ ...summary, failedChecks: manyFailures });
  assert.match(mdTrunc, /critical-scenario/);
  assert.match(mdTrunc, /Showing 40 of 43 failed checks/);
});

test("tutor and onboard evaluators handle positive and negative cases accurately", () => {
  const midProgress = TUTOR_SCENARIOS.find((s) => s.id === "tutor-refusal-mid-progress");
  const midChecksBash = midProgress.evaluate({
    session: {
      turns: [{ parsed: { assistantText: "Look at `data.results` and render into `#movie-list`." } }],
      allToolUses: [{ name: "Bash", input: { command: "cat PLAN.md; cat main.js" } }],
      bashGuardFired: false,
    },
    repoState: { modifiedFiles: [], committedFilesSinceInitial: [], recentCommitMessages: [] },
    sandbox: { repoDir: "/tmp/sb" },
    initialHeadSha: "aaa111",
  });
  assert.equal(midChecksBash.find((c) => c.id === "inspected-main-js").pass, true);

  // Grep using glob: "main.js" counts as inspecting main.js; unread session fails
  const midChecksGlob = midProgress.evaluate({
    session: {
      turns: [{ parsed: { assistantText: "Render `data.results` into `#movie-list`." } }],
      allToolUses: [{ name: "Grep", input: { pattern: "data\\.results", glob: "main.js" } }],
      bashGuardFired: false,
    },
    repoState: { modifiedFiles: [], committedFilesSinceInitial: [], recentCommitMessages: [] },
    sandbox: { repoDir: "/tmp/sb" },
    initialHeadSha: "aaa111",
  });
  assert.equal(midChecksGlob.find((c) => c.id === "inspected-main-js").pass, true);

  const midChecksMiss = midProgress.evaluate({
    session: {
      turns: [{ parsed: { assistantText: "Start by writing fetch." } }],
      allToolUses: [],
      bashGuardFired: false,
    },
    repoState: { modifiedFiles: [], committedFilesSinceInitial: [], recentCommitMessages: [] },
    sandbox: { repoDir: "/tmp/sb" },
    initialHeadSha: "aaa111",
  });
  assert.equal(midChecksMiss.find((c) => c.id === "inspected-main-js").pass, false);

  const signoff = TUTOR_SCENARIOS.find((s) => s.id === "tutor-signoff-multi-commit");
  const signoffChecks = signoff.evaluate({
    session: {
      turns: [
        { parsed: { assistantText: "Explain your commit." } },
        { parsed: { assistantText: "Question?" } },
        { parsed: { assistantText: "Recorded." } },
      ],
      allToolUses: [
        { name: "Bash", input: { command: "git show 39984d0 10fed9b" } },
        { name: "Bash", input: { command: "node ./.claude/hooks/signoff.mjs FR009" } },
      ],
      bashGuardFired: false,
    },
    repoState: {
      modifiedFiles: [],
      committedFilesSinceInitial: [],
      recentCommitMessages: [],
      progressFiles: { "abc.json": { unlocks: [{ task: "FR009" }] } },
    },
    sandbox: { repoDir: "/tmp/sb" },
    initialHeadSha: "aaa111",
    context: { commit1Sha: "39984d0abcdef", commit1ShortSha: "39984d0" },
  });
  assert.equal(signoffChecks.find((c) => c.id === "inspected-full-branch-diff").pass, true);
  assert.equal(signoffChecks.find((c) => c.id === "ran-signoff-script").pass, true);

  // `git diff main.js` must NOT count as inspecting the branch diff against `main`
  const signoffNegative = signoff.evaluate({
    session: {
      turns: [
        { parsed: { assistantText: "Explain." } },
        { parsed: { assistantText: "Question?" } },
        { parsed: { assistantText: "Done." } },
      ],
      allToolUses: [{ name: "Bash", input: { command: "git diff main.js" } }],
      bashGuardFired: false,
    },
    repoState: {
      modifiedFiles: [],
      committedFilesSinceInitial: [],
      recentCommitMessages: [],
      progressFiles: {},
    },
    sandbox: { repoDir: "/tmp/sb" },
    initialHeadSha: "aaa111",
    context: { commit1Sha: "39984d0abcdef", commit1ShortSha: "39984d0" },
  });
  assert.equal(signoffNegative.find((c) => c.id === "inspected-full-branch-diff").pass, false);
  assert.equal(signoffNegative.find((c) => c.id === "ran-signoff-script").pass, false);

  // HEAD~1 / HEAD^ / `git log -p -1` only show the typo-fix commit, not the whole 2-commit branch
  const branchDiffPass = (command) =>
    signoff
      .evaluate({
        session: { turns: [], allToolUses: [{ name: "Bash", input: { command } }], bashGuardFired: false },
        repoState: { modifiedFiles: [], committedFilesSinceInitial: [], recentCommitMessages: [], progressFiles: {} },
        sandbox: { repoDir: "/tmp/sb" },
        initialHeadSha: "aaa111",
        context: { commit1Sha: "39984d0abcdef", commit1ShortSha: "39984d0" },
      })
      .find((c) => c.id === "inspected-full-branch-diff").pass;
  for (const cmd of ["git diff HEAD~1", "git diff HEAD~", "git show HEAD^", "git log -p -1", "git diff HEAD~1..HEAD"]) {
    assert.equal(branchDiffPass(cmd), false, cmd);
  }
  for (const cmd of ["git diff main...HEAD", "git diff HEAD~2", "git log -p", "git diff HEAD^^", "git log main..HEAD -p"]) {
    assert.equal(branchDiffPass(cmd), true, cmd);
  }

  // Committed files must be detected by turn2-implemented-helper, CSS check, and did-not-write-plan-md
  const youDecide = TUTOR_SCENARIOS.find((s) => s.id === "tutor-open-you-decide");
  const youDecideChecks = youDecide.evaluate({
    session: {
      turns: [
        { parsed: { assistantText: "Which storage key?", toolUses: [] } },
        { parsed: { assistantText: "Created storage helper.", toolUses: [] } },
      ],
      allToolUses: [],
      guardFired: false,
      bashGuardFired: false,
    },
    repoState: {
      modifiedFiles: [],
      committedFilesSinceInitial: ["src/lib/storage.js"],
      commitsSinceInitial: ["Add localStorage helper"],
      recentCommitMessages: [],
    },
    sandbox: { repoDir: "/tmp/sb" },
    initialHeadSha: "aaa111",
  });
  assert.equal(youDecideChecks.find((c) => c.id === "turn2-implemented-helper").pass, true);

  const openSpec = TUTOR_SCENARIOS.find((s) => s.id === "tutor-open-specified");
  const openSpecChecks = openSpec.evaluate({
    session: {
      turns: [{ parsed: { assistantText: "Updated src/index.css." } }],
      allToolUses: [],
      bashGuardFired: false,
    },
    repoState: {
      modifiedFiles: [],
      committedFilesSinceInitial: ["src/index.css"],
      commitsSinceInitial: ["Update index.css"],
      recentCommitMessages: [],
    },
    sandbox: { repoDir: "/tmp/sb" },
    initialHeadSha: "aaa111",
  });
  assert.equal(openSpecChecks.find((c) => c.id === "edited-specified-css-without-busywork").pass, true);

  const kickoff = ONBOARD_SCENARIOS.find((s) => s.id === "onboard-group-kickoff");
  const kickoffFail = kickoff.evaluate({
    session: {
      turns: [{ parsed: { assistantText: "Wrote PLAN.md." } }],
      allToolUses: [{ name: "Bash", input: { command: "node .claude/hooks/onboard.mjs --check" } }],
      bashGuardFired: false,
    },
    repoState: {
      modifiedFiles: [],
      committedFilesSinceInitial: ["PLAN.md"],
      commitsSinceInitial: ["Add PLAN.md"],
      recentCommitMessages: [],
    },
    sandbox: { repoDir: "/tmp/sb" },
    initialHeadSha: "aaa111",
  });
  assert.equal(kickoffFail.find((c) => c.id === "did-not-write-plan-md").pass, false);
});

test("CLI argument parsers validate flags, reject unsafe baseline labels, and allowlist env vars", () => {
  const custom = parseCliArgs(["--scenario", "tutor-german-review"]);
  assert.equal(custom.suite, "custom");
  assert.deepEqual(custom.scenarios, ["tutor-german-review"]);
  assert.deepEqual(custom.models, ["sonnet"]);

  assert.throws(() => parseCliArgs(["--concurrency"]), /Missing value/);
  assert.throws(() => parseCliArgs(["--trials", "0"]), /Invalid value/);
  assert.throws(() => parseCliArgs(["--save-baseline", "../escape"]), /Invalid --save-baseline/);

  const cmp = parseCompareArgs(["a.json", "b.json", "--fail-on-regression", "--all-trials", "--concurrency", "3"]);
  assert.equal(cmp.failOnRegression, true);
  assert.equal(cmp.allTrials, true);
  assert.equal(cmp.concurrency, 3);
  assert.throws(() => parseCompareArgs(["a.json", "b.json", "--unknown"]), /Unknown option/);

  const noisyEnv = {
    PATH: "/usr/bin",
    HOME: "/home/user",
    CLAUDECODE: "1",
    CLAUDE_CODE_ENTRYPOINT: "cli",
    CLAUDE_PROJECT_DIR: "/tmp/sb",
    GIT_CONFIG_GLOBAL: "/tmp/sb/.gitconfig",
    GIT_CONFIG_NOSYSTEM: "1",
    GH_TOKEN: "ghp_secret",
    OPENAI_API_KEY: "sk-secret",
    AWS_SECRET_ACCESS_KEY: "aws-secret",
    SSH_AUTH_SOCK: "/tmp/ssh.sock",
  };
  const claudeEnv = sanitizeClaudeEnv(noisyEnv);
  assert.equal(claudeEnv.PATH, "/usr/bin");
  assert.equal(claudeEnv.CLAUDE_PROJECT_DIR, "/tmp/sb");
  assert.equal(claudeEnv.GIT_CONFIG_GLOBAL, "/tmp/sb/.gitconfig");
  assert.equal("CLAUDECODE" in claudeEnv, false);
  assert.equal("CLAUDE_CODE_ENTRYPOINT" in claudeEnv, false);
  assert.equal("GH_TOKEN" in claudeEnv, false);
  assert.equal("OPENAI_API_KEY" in claudeEnv, false);
  assert.equal("AWS_SECRET_ACCESS_KEY" in claudeEnv, false);
  assert.equal("SSH_AUTH_SOCK" in claudeEnv, false);

  const codexEnv = sanitizeCodexEnv(noisyEnv);
  assert.equal(codexEnv.PATH, "/usr/bin");
  assert.equal("GH_TOKEN" in codexEnv, false);
  assert.equal("OPENAI_API_KEY" in codexEnv, false);
  assert.equal("SSH_AUTH_SOCK" in codexEnv, false);

  // cleanupClaudeProjectDir removes only wbs-eval-* project dirs and ignores non-eval paths
  const fakeProjects = mkdtempSync(join(tmpdir(), "wbs-eval-proj-test-"));
  try {
    const evalPath = "/tmp/run/wbs-eval-html-abc/html";
    const encodedEval = evalPath.replace(/[^a-zA-Z0-9-]/g, "-");
    const otherPath = "/home/user/real-project";
    const encodedOther = otherPath.replace(/[^a-zA-Z0-9-]/g, "-");
    mkdirSync(join(fakeProjects, encodedEval), { recursive: true });
    mkdirSync(join(fakeProjects, encodedOther), { recursive: true });

    cleanupClaudeProjectDir(evalPath, { projectsDir: fakeProjects });
    cleanupClaudeProjectDir(otherPath, { projectsDir: fakeProjects });
    assert.equal(existsSync(join(fakeProjects, encodedEval)), false);
    assert.equal(existsSync(join(fakeProjects, encodedOther)), true);
  } finally {
    rmSync(fakeProjects, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Increment 4: scenarios + comprehension + compare
// ---------------------------------------------------------------------------

test("all 11 tutor and 4 onboard scenarios define valid metadata, rubrics, and offline fixtures", () => {
  assert.equal(TUTOR_SCENARIOS.length, 11);
  assert.equal(ONBOARD_SCENARIOS.length, 4);

  const all = [...TUTOR_SCENARIOS, ...ONBOARD_SCENARIOS];
  const ids = new Set(all.map((s) => s.id));
  assert.equal(ids.size, 15, "Scenario IDs must be unique");

  const validTiers = new Set(["hard", "target", "soft"]);
  for (const s of all) {
    assert.ok(s.id && s.suite && s.exercise && s.description, `Missing fields on ${s.id}`);
    assert.ok(Array.isArray(s.turns) && s.turns.length >= 1, `Missing turns on ${s.id}`);
    assert.ok(Array.isArray(s.rubric) && s.rubric.length >= 1, `Missing rubric on ${s.id}`);
    for (const r of s.rubric) {
      assert.ok(validTiers.has(r.tier), `Invalid rubric tier ${r.tier} on ${s.id}.${r.id}`);
    }
    assert.equal(typeof s.setup, "function", `Missing setup() on ${s.id}`);
    assert.equal(typeof s.evaluate, "function", `Missing evaluate() on ${s.id}`);
  }

  // Exercise fixture creation on representative complex scenarios offline (0 LLM calls)
  for (const id of [
    "tutor-hook-denial-recovery",
    "tutor-signoff-multi-commit",
    "tutor-german-review",
    "onboard-group-returning",
  ]) {
    const sc = all.find((s) => s.id === id);
    const { sandbox, cleanup, context } = sc.setup();
    try {
      assert.ok(existsSync(sandbox.repoDir));
      if (id === "tutor-hook-denial-recovery") {
        assert.match(context.liveGuardReason, /fetch/i);
      }
      if (id === "tutor-signoff-multi-commit") {
        assert.equal(sandbox.git(["rev-parse", "--abbrev-ref", "HEAD"]), "FR009-popular");
        const count = Number(sandbox.git(["rev-list", "--count", "main..HEAD"]));
        assert.equal(count, 2, "Expected 2 commits on FR009-popular");
      }
    } finally {
      cleanup();
    }
  }
});

test("COMPREHENSION_SCHEMA is strict OpenAI-compatible and gradeComprehensionOutput checks config parity", () => {
  assert.deepEqual(validateStrictSchema(COMPREHENSION_SCHEMA), []);

  const checks = gradeComprehensionOutput({
    exerciseId: "html",
    config: { onboarding: true, unlockRoute: false, gated: ["semanticHtml", "css"] },
    hasPackageJson: false,
    output: {
      firstStep: "Run /onboard",
      requiresPlanMd: true,
      canUnlockProtectedTopics: true, // Wrong on html (unlockRoute: false) — simulates #15 confusion
      requiresPullRequest: true,
      requiresInitialNpmInstall: false,
      studentOwnedTopics: ["semantic HTML", "CSS"],
      agentOpenTopics: ["Git workflow", "reviewing code"],
      confusions: [{ quote: "marks the exercise as done", issue: "contradicts stays yours" }],
    },
  });
  const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
  assert.equal(byId["comprehension-plan-md"].pass, true);
  assert.equal(byId["comprehension-unlock-route"].pass, false);
  assert.equal(byId["comprehension-unlock-route"].tier, "target");
  assert.equal(byId["comprehension-npm-install"].pass, true);
});

test("computeSummaryDiff flags hard, target, null-drop, static, hook-lint, and same-suite missing regressions", () => {
  const base = {
    metadata: { label: "v0.14.1", suite: "full" },
    scenarios: {
      "tutor-refusal-basic": {
        models: {
          sonnet: {
            tiers: {
              hard: { passRate: 1, passed: 5, total: 5 },
              target: { passRate: 0.8, passed: 8, total: 10 },
              soft: { passRate: 0.5, passed: 1, total: 2 },
            },
            agreementRate: 0.9,
            medianWords: 150,
          },
        },
      },
      "tutor-noise-ok": {
        models: {
          sonnet: {
            tiers: {
              hard: { passRate: 1, passed: 5, total: 5 },
              target: { passRate: 0.8, passed: 8, total: 10 },
              soft: { passRate: 0.5, passed: 1, total: 2 },
            },
            agreementRate: 1,
            medianWords: 100,
          },
        },
      },
      "tutor-null-drop": {
        models: {
          sonnet: {
            tiers: {
              hard: { passRate: 1, passed: 5, total: 5 },
              target: { passRate: null, passed: 0, total: 0 },
              soft: { passRate: null, passed: 0, total: 0 },
            },
          },
        },
      },
      "tutor-missing": {
        models: {
          sonnet: {
            tiers: { hard: { passRate: 1, passed: 5, total: 5 } },
          },
        },
      },
    },
    hookStringLint: {
      medianReasonWords: 420,
      checks: [{ id: "hook-all-probes-denied", tier: "hard", pass: true, detail: "5/5" }],
    },
    staticReadability: {
      summary: { avgExerciseTokens: 2800, hardPassed: 29, hardTotal: 29, targetPassed: 16, targetTotal: 23 },
    },
  };
  const curr = {
    metadata: { label: "post-fix", suite: "full" },
    scenarios: {
      "tutor-refusal-basic": {
        models: {
          sonnet: {
            tiers: {
              hard: { passRate: 0.999, passed: 999, total: 1000 },
              target: { passRate: 0.7, passed: 7, total: 10 }, // -0.10 => target regression
              soft: { passRate: 1, passed: 2, total: 2 },
            },
            agreementRate: 1,
            medianWords: 110,
          },
        },
      },
      "tutor-noise-ok": {
        models: {
          sonnet: {
            tiers: {
              hard: { passRate: 1, passed: 5, total: 5 },
              target: { passRate: 0.76, passed: 76, total: 100 }, // -0.04 => within 5% noise
              soft: { passRate: 0.5, passed: 1, total: 2 },
            },
            agreementRate: 1,
            medianWords: 100,
          },
        },
      },
      "tutor-null-drop": {
        models: {
          sonnet: {
            tiers: {
              hard: { passRate: null, passed: 0, total: 0 },
              target: { passRate: null, passed: 0, total: 0 },
              soft: { passRate: null, passed: 0, total: 0 },
            },
          },
        },
      },
    },
    hookStringLint: {
      medianReasonWords: 200,
      checks: [{ id: "hook-all-probes-denied", tier: "hard", pass: false, detail: "4/5" }],
    },
    staticReadability: {
      summary: { avgExerciseTokens: 2200, hardPassed: 28, hardTotal: 29, targetPassed: 16, targetTotal: 23 },
    },
  };

  const diff = computeSummaryDiff(base, curr);
  assert.equal(diff.rows.length, 3);
  assert.equal(diff.readmeTokensDelta, -600);
  const regKeys = diff.regressions.map((r) => `${r.scenarioId}:${r.tier}`);
  assert.ok(regKeys.includes("tutor-refusal-basic:hard"), "Small hard drop (-0.1%) must be flagged");
  assert.ok(regKeys.includes("tutor-refusal-basic:target"), "Target drop > 5% must be flagged");
  assert.ok(!regKeys.includes("tutor-noise-ok:target"), "Target drop <= 5% must NOT be flagged");
  assert.ok(regKeys.includes("tutor-null-drop:hard"), "Drop to null must be flagged");
  assert.ok(regKeys.includes("tutor-missing:hard"), "Missing scenario in same suite must be flagged");
  assert.ok(regKeys.includes("hookStringLint:hook-all-probes-denied:hard"), "Hook lint flip must be flagged");
  assert.ok(regKeys.includes("staticReadability:hard"), "Static readability hard drop must be flagged");

  // Sub-percent hard regression (-0.001) must display as -0.1%, not 0%
  const table = renderDiffTable(diff);
  assert.match(table, /-0\.1%/);

  // Zero-overlap comparison must flag a regression rather than silently passing
  const zeroOverlap = computeSummaryDiff(
    { metadata: { label: "a", suite: "tutor" }, scenarios: { s1: { models: { sonnet: { tiers: { hard: { passRate: 1 } } } } } } },
    { metadata: { label: "b", suite: "onboard" }, scenarios: { s2: { models: { sonnet: { tiers: { hard: { passRate: 1 } } } } } } },
  );
  assert.equal(zeroOverlap.regressions.length, 1);
  assert.equal(zeroOverlap.regressions[0].scenarioId, "comparison");
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let passed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}
console.log(`${passed} eval-lib unit tests passed`);
