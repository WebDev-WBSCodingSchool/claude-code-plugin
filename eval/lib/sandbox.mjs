import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanupClaudeProjectDir, registerCleanup, sanitizeClaudeEnv } from "./utils.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const EXERCISE_ROOT = join(REPO_ROOT, "exercise");
export const SETUP_SCRIPT = join(EXERCISE_ROOT, "scripts", "setup.mjs");
export const CURRICULUM_PATH = join(EXERCISE_ROOT, "exercises", "curriculum.json");

export function loadCurriculum() {
  return JSON.parse(readFileSync(CURRICULUM_PATH, "utf8"));
}

export function loadExerciseConfig(exerciseId) {
  return JSON.parse(
    readFileSync(
      join(EXERCISE_ROOT, "exercises", exerciseId, "overlay", ".claude", "harness", "config.json"),
      "utf8",
    ),
  );
}

function makeFakeNpm(binDir, logPath) {
  const script = `#!/bin/sh
echo "$*" >> ${JSON.stringify(logPath)}
exit 1
`;
  const target = join(binDir, "npm");
  writeFileSync(target, script, "utf8");
  chmodSync(target, 0o755);
}

function makeFakeNpx(binDir, logPath, { exitCode = 0, stdout = "", stderr = "" } = {}) {
  const script = `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(logPath)}, process.argv.slice(2).join(" ") + "\\n");
if (${JSON.stringify(stdout)}) process.stdout.write(${JSON.stringify(stdout)} + "\\n");
if (${JSON.stringify(stderr)}) process.stderr.write(${JSON.stringify(stderr)} + "\\n");
process.exit(${Number(exitCode)});
`;
  const target = join(binDir, "npx");
  writeFileSync(target, script, "utf8");
  chmodSync(target, 0o755);
}

function makeFakeGh(binDir, logPath, ghConfig = {}) {
  const cfg = {
    mode: ghConfig.mode ?? "no-remote", // "no-remote" | "pushable" | "read-only"
    repoName: ghConfig.repoName ?? "student/eval-project",
    collaborators: ghConfig.collaborators ?? ["student"],
    loggedOut: Boolean(ghConfig.loggedOut),
    hasIssuesEnabled: ghConfig.hasIssuesEnabled ?? true,
    allowMockCreate: Boolean(ghConfig.allowMockCreate),
    viewerPermission:
      ghConfig.viewerPermission ??
      (ghConfig.mode === "read-only" ? "READ" : "ADMIN"),
  };

  const script = `#!/usr/bin/env node
import { appendFileSync } from "node:fs";

const cfg = ${JSON.stringify(cfg)};
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(logPath)}, args.join(" ") + "\\n");

const [cmd, sub, ...rest] = args;

if (cmd === "auth" && sub === "status") {
  if (cfg.loggedOut) {
    process.stderr.write("You are not logged into any GitHub hosts.\\n");
    process.exit(1);
  }
  const login = cfg.collaborators[0] ?? "student";
  process.stdout.write(\`Logged in to github.com as \${login} (oauth_token)\\n\`);
  process.exit(0);
}

if (cfg.loggedOut) {
  process.stderr.write("error: not authenticated with GitHub CLI\\n");
  process.exit(1);
}

if (cmd === "repo" && sub === "set-default") {
  if (cfg.mode === "no-remote") {
    process.stderr.write("no remote named origin\\n");
    process.exit(1);
  }
  process.exit(0);
}

if (cmd === "repo" && sub === "view") {
  if (cfg.mode === "no-remote") {
    process.stderr.write("none of the git remotes configured for this repository point to a known GitHub host\\n");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({
    nameWithOwner: cfg.repoName,
    viewerPermission: cfg.viewerPermission,
    hasIssuesEnabled: cfg.hasIssuesEnabled,
  }) + "\\n");
  process.exit(0);
}

if (cmd === "repo" && sub === "edit") {
  process.exit(0);
}

if (cmd === "repo" && sub === "create") {
  if (cfg.allowMockCreate) {
    process.stdout.write(\`https://github.com/\${cfg.repoName}\\n\`);
    process.exit(0);
  }
  process.stderr.write("mock gh: network disabled in eval sandbox (repo create intercepted)\\n");
  process.exit(1);
}

if (cmd === "api") {
  const endpoint = sub ?? "";
  if (endpoint.includes("/collaborators")) {
    const hasJq = args.includes("--jq");
    const out = hasJq
      ? cfg.collaborators
      : cfg.collaborators.map((login) => ({ login }));
    process.stdout.write(JSON.stringify(out) + "\\n");
    process.exit(0);
  }
  if (endpoint.startsWith("search/users")) {
    process.stdout.write("\\n");
    process.exit(0);
  }
  process.stdout.write("[]\\n");
  process.exit(0);
}

if (cmd === "issue" && sub === "list") {
  process.stdout.write("[]\\n");
  process.exit(0);
}

if (cmd === "issue" && sub === "create") {
  process.stdout.write(\`https://github.com/\${cfg.repoName}/issues/1\\n\`);
  process.exit(0);
}

if (cmd === "issue" && sub === "edit") {
  process.exit(0);
}

process.stderr.write(\`mock gh: unhandled command: \${args.join(" ")}\\n\`);
process.exit(1);
`;
  const target = join(binDir, "gh");
  writeFileSync(target, script, "utf8");
  chmodSync(target, 0o755);
}

/**
 * Create an isolated temporary exercise repository using exercise/scripts/setup.mjs
 * with offline PATH stubs (npm, npx, gh) and deterministic git config.
 */
export function createSandbox({
  exercise,
  gitUserName = "Jane Student",
  gitUserEmail = "jane.student@mail.com",
  gh = { mode: "no-remote" },
  npxExitCode = 0,
  npxStdout = "",
  npxStderr = "",
} = {}) {
  if (!exercise) throw new Error("createSandbox requires an exercise ID");

  const rootDir = mkdtempSync(join(tmpdir(), `wbs-eval-${exercise}-`));
  try {
    const binDir = join(rootDir, "bin");
    const logDir = join(rootDir, "logs");
    const repoDir = join(rootDir, exercise);
    const gitConfigGlobal = join(rootDir, ".gitconfig");
    mkdirSync(binDir, { recursive: true });
    mkdirSync(logDir, { recursive: true });

    // Ensure extensionless ESM stubs (npx, gh) run as modules across all Node 22+ versions
    writeFileSync(join(binDir, "package.json"), '{"type":"module"}\n', "utf8");
    // Isolate git from host global/system configs (e.g. !/usr/bin/gh credential helpers)
    writeFileSync(
      gitConfigGlobal,
      "[credential]\n\thelper =\n[commit]\n\tgpgsign = false\n[init]\n\tdefaultBranch = main\n",
      "utf8",
    );

    const logs = {
      npm: join(logDir, "npm.log"),
      npx: join(logDir, "npx.log"),
      gh: join(logDir, "gh.log"),
    };
    writeFileSync(logs.npm, "", "utf8");
    writeFileSync(logs.npx, "", "utf8");
    writeFileSync(logs.gh, "", "utf8");

    makeFakeNpm(binDir, logs.npm);
    makeFakeNpx(binDir, logs.npx, { exitCode: npxExitCode, stdout: npxStdout, stderr: npxStderr });
    makeFakeGh(binDir, logs.gh, gh);

    const baseEnv = sanitizeClaudeEnv(process.env);
    const env = {
      ...baseEnv,
      PATH: `${binDir}${delimiter}${baseEnv.PATH ?? ""}`,
      CLAUDE_PROJECT_DIR: repoDir,
      GIT_CONFIG_GLOBAL: gitConfigGlobal,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0",
    };

    execFileSync(process.execPath, [SETUP_SCRIPT, "setup", exercise, repoDir], {
      cwd: rootDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const git = (args, extra = {}) =>
      execFileSync("git", args, {
        cwd: repoDir,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        ...extra,
      }).trim();

    git(["config", "user.name", gitUserName]);
    git(["config", "user.email", gitUserEmail]);
    git(["config", "commit.gpgsign", "false"]);

    if (gh?.mode === "pushable" || gh?.mode === "read-only") {
      // Point origin at an offline local bare repo so `git push` can never contact GitHub.
      // onboard.mjs --check delegates repo metadata to the stubbed `gh` CLI.
      const bareOriginDir = join(rootDir, "origin.git");
      execFileSync("git", ["init", "--bare", bareOriginDir], {
        cwd: rootDir,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (gh.mode === "read-only") {
        const hookPath = join(bareOriginDir, "hooks", "pre-receive");
        writeFileSync(
          hookPath,
          "#!/bin/sh\necho 'remote: permission denied (read-only eval sandbox)' >&2\nexit 1\n",
          "utf8",
        );
        chmodSync(hookPath, 0o755);
      }
      git(["remote", "add", "origin", bareOriginDir]);
    }

    const readFile = (rel) => readFileSync(join(repoDir, rel), "utf8");
    const writeFile = (rel, content) => {
      const full = join(repoDir, rel);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content, "utf8");
    };
    const commitAll = (message, { signoff = false } = {}) => {
      git(["add", "--all"]);
      const args = ["commit", "--no-verify"];
      if (signoff) args.push("--signoff");
      args.push("-m", message);
      git(args);
    };
    const resetHard = (sha) => {
      git(["reset", "--hard", sha]);
      git(["clean", "-fd"]);
    };

    let cleaned = false;
    let unregisterCleanup = () => {};
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      unregisterCleanup();
      cleanupClaudeProjectDir(repoDir);
      rmSync(rootDir, { recursive: true, force: true });
    };
    unregisterCleanup = registerCleanup(cleanup);

    return {
      exercise,
      rootDir,
      repoDir,
      binDir,
      logs,
      env,
      gitUserName,
      gitUserEmail,
      git,
      readFile,
      writeFile,
      commitAll,
      resetHard,
      cleanup,
    };
  } catch (err) {
    rmSync(rootDir, { recursive: true, force: true });
    throw err;
  }
}

/**
 * Write a valid group PLAN.md with at least 2 members (ensuring branchState() stays enabled).
 */
export function writeGroupPlan(
  sandbox,
  {
    description = "We are building the assigned course project together as a team. We will focus on the core requirements first and add stretch goals only if time remains.",
    members,
    commit = true,
  } = {},
) {
  const list =
    members && members.length >= 2
      ? members
      : [
          {
            name: sandbox.gitUserName,
            email: sandbox.gitUserEmail,
            task: "Core task 1 (FR009)",
          },
          {
            name: "Mo Ahmadi",
            email: "mo.ahmadi@mail.com",
            task: "Core task 2 (FR010)",
          },
        ];

  const memberLines = list.map((m) => `- ${m.name} — ${m.email}`).join("\n");
  const taskLines = list.map((m) => `- ${m.task} — ${m.name}`).join("\n");
  const content = `# Project Plan\n\n${description}\n\n## Members\n\n${memberLines}\n\n## Tasks\n\n${taskLines}\n`;

  sandbox.writeFile("PLAN.md", content);
  if (commit) {
    sandbox.commitAll("Add group PLAN.md", { signoff: true });
  }
  return content;
}

/**
 * Invoke the sandbox's own guard.mjs directly with a synthetic PreToolUse payload.
 */
export function invokeGuard(sandbox, event) {
  const hookPath = join(sandbox.repoDir, ".claude", "hooks", "guard.mjs");
  const res = spawnSync(process.execPath, [hookPath], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    encoding: "utf8",
    input: JSON.stringify(event),
  });
  let decision = null;
  if (res.stdout?.trim()) {
    try {
      decision = JSON.parse(res.stdout.trim());
    } catch {
      decision = null;
    }
  }
  const denied = decision?.hookSpecificOutput?.permissionDecision === "deny";
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    decision,
    denied,
    reason: decision?.hookSpecificOutput?.permissionDecisionReason ?? "",
    systemMessage: decision?.systemMessage ?? "",
  };
}

/**
 * Invoke the sandbox's own bash-guard.mjs directly with a synthetic Bash PreToolUse payload.
 */
export function invokeBashGuard(sandbox, command) {
  const hookPath = join(sandbox.repoDir, ".claude", "hooks", "bash-guard.mjs");
  const res = spawnSync(process.execPath, [hookPath], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
  });
  let decision = null;
  if (res.stdout?.trim()) {
    try {
      decision = JSON.parse(res.stdout.trim());
    } catch {
      decision = null;
    }
  }
  const denied = decision?.hookSpecificOutput?.permissionDecision === "deny";
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    decision,
    denied,
    reason: decision?.hookSpecificOutput?.permissionDecisionReason ?? "",
    systemMessage: decision?.systemMessage ?? "",
  };
}

/**
 * Invoke the sandbox's own signoff.mjs.
 */
export function invokeSignoff(sandbox, args = []) {
  const scriptPath = join(sandbox.repoDir, ".claude", "hooks", "signoff.mjs");
  const res = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    encoding: "utf8",
  });
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

/**
 * Invoke the sandbox's own onboard.mjs.
 */
export function invokeOnboard(sandbox, args = []) {
  const scriptPath = join(sandbox.repoDir, ".claude", "hooks", "onboard.mjs");
  const res = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    encoding: "utf8",
  });
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

/**
 * Capture git working tree, recent commit messages, branch, and progress files after a session.
 * Uses `git status --porcelain -uall -z` without trimming leading whitespace so unstaged
 * modifications (` M file`) and files inside new untracked directories are preserved intact.
 */
export function snapshotRepoState(sandbox, { initialHeadSha = "" } = {}) {
  const gitRaw = (args) =>
    execFileSync("git", args, {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

  const statusPorcelainZ = gitRaw(["status", "--porcelain", "-uall", "-z"]);
  const modifiedFiles = [];
  const tokens = statusPorcelainZ.split("\0");
  for (let i = 0; i < tokens.length; i++) {
    const entry = tokens[i];
    if (!entry || entry.length < 4) continue;
    const status = entry.slice(0, 2);
    const filePath = entry.slice(3);
    if (filePath) modifiedFiles.push(filePath);
    if (status[0] === "R" || status[0] === "C" || status[1] === "R" || status[1] === "C") {
      i++;
    }
  }
  const statusPorcelain = gitRaw(["status", "--porcelain", "-uall"]).replace(/\r?\n$/, "");

  let branch = "";
  try {
    branch = sandbox.git(["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {
    branch = "";
  }

  let recentCommitMessages = [];
  try {
    const raw = sandbox.git(["log", "-n", "10", "--format=%B%x1e"]);
    recentCommitMessages = raw
      .split("\x1e")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    recentCommitMessages = [];
  }

  let headSha = "";
  try {
    headSha = sandbox.git(["rev-parse", "HEAD"]);
  } catch {
    headSha = "";
  }

  let committedFilesSinceInitial = [];
  let commitsSinceInitial = [];
  if (initialHeadSha && headSha && headSha !== initialHeadSha) {
    try {
      const diffFiles = sandbox.git(["diff", "--name-only", `${initialHeadSha}..HEAD`]);
      committedFilesSinceInitial = diffFiles
        ? diffFiles
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    } catch {
      committedFilesSinceInitial = [];
    }
    try {
      const rawMsgs = sandbox.git(["log", `${initialHeadSha}..HEAD`, "--format=%B%x1e"]);
      commitsSinceInitial = rawMsgs
        .split("\x1e")
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      commitsSinceInitial = [];
    }
  }

  const progressDir = join(sandbox.repoDir, ".claude", "harness", "progress");
  const progressFiles = {};
  if (existsSync(progressDir)) {
    for (const file of readdirSync(progressDir)) {
      if (file.endsWith(".json")) {
        try {
          progressFiles[file] = JSON.parse(readFileSync(join(progressDir, file), "utf8"));
        } catch {
          progressFiles[file] = readFileSync(join(progressDir, file), "utf8");
        }
      }
    }
  }

  return {
    branch,
    headSha,
    statusPorcelain,
    modifiedFiles,
    committedFilesSinceInitial,
    commitsSinceInitial,
    recentCommitMessages,
    progressFiles,
    ghLog: existsSync(sandbox.logs.gh) ? readFileSync(sandbox.logs.gh, "utf8") : "",
    npxLog: existsSync(sandbox.logs.npx) ? readFileSync(sandbox.logs.npx, "utf8") : "",
  };
}
