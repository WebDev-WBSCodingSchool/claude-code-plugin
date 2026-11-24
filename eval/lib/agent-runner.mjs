// Subject runners for non-Claude agents (Codex CLI, Antigravity `agy`).
// They follow AGENTS.md / GEMINI.md without Claude hooks, so the eval measures
// whether the agent complies on its own. Each parser returns the same `parsed`
// shape as parseStreamJson, with tool calls renamed to Claude tool names
// (Bash/Edit/Write/Read/Grep) so the existing deterministic checks apply unchanged.
import { countWords, isRateLimitError, runClaudeTurn } from "./claude-runner.mjs";
import { sanitizeAgyEnv } from "./judge.mjs";
import { sanitizeCodexEnv, sleep, spawnAsync } from "./utils.mjs";

/** Split a subject model spec: "sonnet" → claude, "codex:gpt-6.2-astra" → codex, "agy:<id>" → agy. */
export function parseSubjectModel(spec) {
  const s = String(spec ?? "").trim();
  const idx = s.indexOf(":");
  const prefix = idx === -1 ? "" : s.slice(0, idx);
  if (prefix === "codex" || prefix === "agy") {
    return { provider: prefix, model: s.slice(idx + 1) || null };
  }
  return { provider: "claude", model: s };
}

/** Pick the per-turn runner for a subject model spec (all share runClaudeTurn's signature). */
export function subjectTurnRunner(spec) {
  const { provider } = parseSubjectModel(spec);
  if (provider === "codex") return runCodexTurn;
  if (provider === "agy") return runAgyTurn;
  return runClaudeTurn;
}

// Codex wraps every command as `/usr/bin/zsh -lc '<cmd>'` (or "<cmd>"); checks want the inner command.
export function unwrapShellCommand(cmd) {
  const s = String(cmd ?? "").trim();
  const single = /^\S*(?:sh|bash|zsh)\s+-l?c\s+'([\s\S]*)'$/.exec(s);
  if (single) return single[1].replace(/'\\''/g, "'");
  const double = /^\S*(?:sh|bash|zsh)\s+-l?c\s+"([\s\S]*)"$/.exec(s);
  if (double) return double[1].replace(/\\(["\\$`])/g, "$1");
  return s;
}

function finishParsed({ sessionId, messages, toolUses, toolResults, timeline, isError, finalText, rawEvents, usage }) {
  const finalAssistantText = (finalText ?? "").trim() || messages.at(-1) || "";
  return {
    sessionId,
    init: null,
    assistantTexts: messages,
    preToolTexts: messages.length > 1 ? messages.slice(0, -1) : [],
    finalAssistantText,
    assistantText: finalAssistantText,
    wordCount: countWords(finalAssistantText),
    toolUses,
    toolResults,
    preToolUseEvents: [],
    preToolUseDenials: [],
    timeline,
    guardFired: false,
    bashGuardFired: false,
    rateLimits: [],
    result: { isError, totalCostUsd: null, usage: usage ?? null, resultText: finalAssistantText },
    rawEvents,
  };
}

/** Parse `codex exec --json` JSONL output. */
export function parseCodexJsonl(raw) {
  const rawEvents = [];
  const messages = [];
  const toolUses = [];
  const toolResults = [];
  const timeline = [];
  let sessionId = null;
  let isError = false;
  let usage = null;

  for (const line of String(raw ?? "").split("\n")) {
    let ev;
    try {
      ev = JSON.parse(line.trim());
    } catch {
      continue;
    }
    rawEvents.push(ev);
    if (ev.type === "thread.started") sessionId = ev.thread_id ?? sessionId;
    else if (ev.type === "turn.completed") usage = ev.usage ?? usage;
    else if (ev.type === "turn.failed" || ev.type === "error") isError = true;
    if (ev.type !== "item.completed" || !ev.item) continue;

    const item = ev.item;
    if (item.type === "agent_message" && typeof item.text === "string") {
      if (item.text.trim()) {
        messages.push(item.text.trim());
        timeline.push({ type: "text", text: item.text.trim() });
      }
    } else if (item.type === "command_execution") {
      const tu = { id: item.id, name: "Bash", input: { command: unwrapShellCommand(item.command) } };
      toolUses.push(tu);
      timeline.push({ type: "tool_use", ...tu });
      toolResults.push({
        toolUseId: item.id,
        isError: item.exit_code !== 0,
        content: String(item.aggregated_output ?? ""),
      });
    } else if (item.type === "file_change") {
      (item.changes ?? []).forEach((c, i) => {
        const tu = {
          id: `${item.id}:${i}`,
          name: c.kind === "add" ? "Write" : "Edit",
          input: { file_path: c.path, kind: c.kind },
        };
        toolUses.push(tu);
        timeline.push({ type: "tool_use", ...tu });
        toolResults.push({ toolUseId: tu.id, isError: item.status === "failed", content: "" });
      });
    } else if (item.type !== "reasoning") {
      const tu = { id: item.id, name: item.type, input: {} };
      toolUses.push(tu);
      timeline.push({ type: "tool_use", ...tu });
    }
  }

  return finishParsed({ sessionId, messages, toolUses, toolResults, timeline, isError, finalText: null, rawEvents, usage });
}

function normalizeAgyTool(name, params = {}) {
  // Parameter names vary by tool (Path, TargetFile, AbsolutePath, ...); take the first path-like one
  const pathKey = Object.keys(params).find((k) => /path|file/i.test(k) && typeof params[k] === "string");
  const filePath = pathKey ? params[pathKey] : null;
  if (name === "run_command") return { name: "Bash", input: { command: String(params.CommandLine ?? "") } };
  if (/write/i.test(name)) return { name: "Write", input: { file_path: filePath } };
  if (/edit|replace|sed_file/i.test(name)) return { name: "Edit", input: { file_path: filePath } };
  if (name === "view_file" || name === "read_file") return { name: "Read", input: { file_path: filePath } };
  if (name === "grep_search") return { name: "Grep", input: params };
  return { name, input: params };
}

/** Parse `agy --output-format stream-json` NDJSON output. */
export function parseAgyStreamJson(raw) {
  const rawEvents = [];
  const messages = [];
  const toolUses = [];
  const toolResults = [];
  const timeline = [];
  const textByStep = new Map();
  let sessionId = null;
  let isError = false;
  let finalText = null;
  let usage = null;

  for (const line of String(raw ?? "").split("\n")) {
    let ev;
    try {
      ev = JSON.parse(line.trim());
    } catch {
      continue;
    }
    rawEvents.push(ev);
    if (ev.event === "init") sessionId = ev.conversation_id ?? sessionId;
    if (ev.event === "result") {
      sessionId = ev.result?.conversation_id ?? sessionId;
      isError = ev.result?.status !== "SUCCESS";
      finalText = typeof ev.result?.response === "string" ? ev.result.response : null;
      usage = ev.result?.usage ?? null;
      continue;
    }
    if (ev.event === "error") isError = true;
    const step = ev.step_update;
    if (!step) continue;

    if (step.step_type === "agent_response") {
      const acc = (textByStep.get(step.step_index) ?? "") + (step.text_delta ?? "");
      textByStep.set(step.step_index, acc);
      if (step.state !== "ACTIVE" && acc.trim()) {
        messages.push(acc.trim());
        timeline.push({ type: "text", text: acc.trim() });
      }
    } else if (step.step_type === "tool" && step.state !== "ACTIVE") {
      const info = step.tool_info ?? {};
      const tu = { id: `step-${step.step_index}`, ...normalizeAgyTool(step.tool_name ?? info.name ?? "", info.parameters) };
      toolUses.push(tu);
      timeline.push({ type: "tool_use", ...tu });
      const output = String(info.output ?? "");
      const exit = /Command exited with code (\d+)/.exec(output);
      toolResults.push({
        toolUseId: tu.id,
        isError: step.state !== "DONE" || (exit ? exit[1] !== "0" : false),
        content: output,
      });
    }
  }

  return finishParsed({ sessionId, messages, toolUses, toolResults, timeline, isError, finalText, rawEvents, usage });
}

async function runWithRetry({ bin, args, cwd, env, stdinText, parse, prompt, model, timeoutMs, maxRetries, onBeforeRetry }) {
  let attempt = 0;
  while (true) {
    const started = Date.now();
    const res = await spawnAsync(bin, args, { cwd, env, stdinText, timeoutMs });
    const durationMs = Date.now() - started;
    const parsed = parse(res.stdout);
    const failed = res.timedOut || res.exitCode !== 0 || parsed.result?.isError;
    if (failed && attempt < maxRetries && isRateLimitError(res.stderr, parsed)) {
      attempt++;
      if (typeof onBeforeRetry === "function") await onBeforeRetry(attempt);
      await sleep(Math.min(60_000, 4000 * 2 ** (attempt - 1)));
      continue;
    }
    if (failed) parsed.result.isError = true;
    return { prompt, model, args, exitCode: res.exitCode, timedOut: res.timedOut, stderr: res.stderr, durationMs, retries: attempt, parsed };
  }
}

/**
 * One Codex subject turn. Codex's own sandbox is bypassed so shell commands behave like
 * the Claude subject (which runs unsandboxed in the same throwaway repo); user config is ignored.
 */
export async function runCodexTurn({
  cwd,
  env,
  prompt,
  model,
  persistSession = false,
  resumeSessionId = null,
  timeoutMs = 180_000,
  maxRetries = 3,
  onBeforeRetry = null,
} = {}) {
  const { model: codexModel } = parseSubjectModel(model);
  const common = ["--json", "--ignore-user-config", "--skip-git-repo-check", "--dangerously-bypass-approvals-and-sandbox"];
  if (codexModel) common.push("-m", codexModel);
  const args = resumeSessionId
    ? ["exec", "resume", ...common, resumeSessionId, "-"]
    : ["exec", ...common, ...(persistSession ? [] : ["--ephemeral"]), "-C", cwd, "-"];
  return runWithRetry({
    bin: "codex",
    args,
    cwd,
    env: { ...sanitizeCodexEnv(process.env), ...env },
    stdinText: prompt,
    parse: parseCodexJsonl,
    prompt,
    model,
    timeoutMs,
    maxRetries,
    onBeforeRetry,
  });
}

/** One Antigravity (`agy`) subject turn; permissions auto-approved, slash commands off. */
export async function runAgyTurn({
  cwd,
  env,
  prompt,
  model,
  resumeSessionId = null,
  timeoutMs = 180_000,
  maxRetries = 3,
  onBeforeRetry = null,
} = {}) {
  const { model: agyModel } = parseSubjectModel(model);
  const args = [
    "--output-format",
    "stream-json",
    "--dangerously-skip-permissions",
    "--disable-slash-commands",
    "--print-timeout",
    `${Math.max(30, Math.floor(timeoutMs / 1000) - 10)}s`,
  ];
  if (agyModel) args.push("--model", agyModel);
  if (resumeSessionId) args.push("--conversation", resumeSessionId);
  args.push(`-p=${prompt}`);
  return runWithRetry({
    bin: "agy",
    args,
    cwd,
    env: { ...sanitizeAgyEnv(process.env), ...env },
    stdinText: null,
    parse: parseAgyStreamJson,
    prompt,
    model,
    timeoutMs,
    maxRetries,
    onBeforeRetry,
  });
}
