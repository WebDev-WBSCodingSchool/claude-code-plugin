import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanupClaudeProjectDir, registerCleanup, sanitizeClaudeEnv, sleep, spawnAsync } from "./utils.mjs";

export const DEFAULT_SUBJECT_TOOLS = "Read,Edit,Write,Glob,Grep,Skill,Bash";

export function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Build CLI arguments for an isolated subject Claude Code session.
 * Never passes --bare (which disables OAuth and hooks).
 */
export function buildClaudeArgs({
  prompt,
  model = "sonnet",
  persistSession = false,
  resumeSessionId = null,
  tools = DEFAULT_SUBJECT_TOOLS,
  allowedTools = DEFAULT_SUBJECT_TOOLS,
} = {}) {
  const args = [
    "-p",
    "--setting-sources",
    "project",
    "--strict-mcp-config",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-hook-events",
    "--permission-mode",
    "acceptEdits",
    "--permission-prompts",
    "none",
    "--tools",
    tools,
    "--allowedTools",
    allowedTools,
    "--model",
    model,
  ];

  if (resumeSessionId) {
    args.push("--resume", resumeSessionId);
  } else if (!persistSession) {
    args.push("--no-session-persistence");
  }

  args.push(prompt);
  return args;
}

/**
 * Parse NDJSON stdout from `claude -p --output-format stream-json --verbose --include-hook-events`.
 * Strictly filters hook decisions on hook_event === "PreToolUse" (ignoring Stop/SessionEnd).
 */
export function parseStreamJson(raw) {
  const rawEvents = [];
  let init = null;
  let sessionId = null;
  const assistantTexts = [];
  const assistantMessages = [];
  const toolUses = [];
  const toolResults = [];
  const preToolUseEvents = [];
  const preToolUseDenials = [];
  const rateLimits = [];
  const timeline = [];
  let result = null;

  for (const line of String(raw ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let ev;
    try {
      ev = JSON.parse(trimmed);
    } catch {
      continue;
    }
    rawEvents.push(ev);

    if (ev.type === "system" && ev.subtype === "init") {
      sessionId = ev.session_id ?? sessionId;
      init = {
        sessionId: ev.session_id ?? null,
        model: ev.model ?? null,
        skills: ev.skills ?? [],
        mcpServers: ev.mcp_servers ?? [],
      };
      continue;
    }

    if (ev.type === "system" && ev.subtype === "hook_response") {
      if (ev.hook_event !== "PreToolUse") continue;
      let parsedStdout = null;
      if (typeof ev.stdout === "string" && ev.stdout.trim()) {
        try {
          parsedStdout = JSON.parse(ev.stdout.trim());
        } catch {
          parsedStdout = null;
        }
      }
      const entry = {
        hookId: ev.hook_id ?? null,
        hookName: ev.hook_name ?? null,
        hookEvent: ev.hook_event,
        exitCode: ev.exit_code ?? null,
        stdout: ev.stdout ?? "",
        stderr: ev.stderr ?? "",
        decision: parsedStdout?.hookSpecificOutput?.permissionDecision ?? null,
        reason: parsedStdout?.hookSpecificOutput?.permissionDecisionReason ?? "",
        systemMessage: parsedStdout?.systemMessage ?? "",
      };
      preToolUseEvents.push(entry);
      if (entry.decision === "deny") {
        preToolUseDenials.push(entry);
        timeline.push({
          type: "hook_denial",
          hookName: entry.hookName,
          reason: entry.reason,
          systemMessage: entry.systemMessage,
        });
      }
      continue;
    }

    if (ev.type === "assistant") {
      const blocks = ev.message?.content ?? ev.content ?? [];
      if (Array.isArray(blocks)) {
        const msgTexts = [];
        for (const block of blocks) {
          if (block?.type === "text" && typeof block.text === "string") {
            assistantTexts.push(block.text);
            if (block.text.trim()) {
              msgTexts.push(block.text.trim());
            }
          } else if (block?.type === "tool_use") {
            const tu = {
              id: block.id ?? null,
              name: block.name ?? "",
              input: block.input ?? {},
            };
            toolUses.push(tu);
            if (msgTexts.length) {
              const joined = msgTexts.join("\n\n");
              timeline.push({ type: "text", text: joined });
              assistantMessages.push(joined);
              msgTexts.length = 0;
            }
            timeline.push({ type: "tool_use", ...tu });
          }
        }
        if (msgTexts.length) {
          const joined = msgTexts.join("\n\n");
          timeline.push({ type: "text", text: joined });
          assistantMessages.push(joined);
        }
      }
      continue;
    }

    if (ev.type === "user") {
      const blocks = ev.message?.content ?? ev.content ?? [];
      if (Array.isArray(blocks)) {
        for (const block of blocks) {
          if (block?.type === "tool_result") {
            toolResults.push({
              toolUseId: block.tool_use_id ?? null,
              isError: Boolean(block.is_error),
              content:
                typeof block.content === "string"
                  ? block.content
                  : JSON.stringify(block.content ?? ""),
            });
          }
        }
      }
      continue;
    }

    if (ev.type === "rate_limit_event") {
      rateLimits.push(ev.rate_limit_info ?? ev);
      continue;
    }

    if (ev.type === "result") {
      sessionId = ev.session_id ?? sessionId;
      result = {
        subtype: ev.subtype ?? null,
        isError: Boolean(ev.is_error),
        durationMs: ev.duration_ms ?? null,
        numTurns: ev.num_turns ?? null,
        totalCostUsd: ev.total_cost_usd ?? null,
        usage: ev.usage ?? null,
        modelUsage: ev.modelUsage ?? null,
        resultText: typeof ev.result === "string" ? ev.result : null,
      };
    }
  }

  const finalAssistantText =
    (typeof result?.resultText === "string" && result.resultText.trim()) ||
    assistantMessages.at(-1) ||
    "";
  const preToolTexts = assistantMessages.length > 1 ? assistantMessages.slice(0, -1) : [];
  const assistantText = finalAssistantText || assistantTexts.join("\n\n").trim();
  const guardFired = preToolUseDenials.some(
    (d) =>
      /Edit|Write|NotebookEdit/i.test(d.hookName ?? "") ||
      /blocked an agent write/i.test(d.systemMessage ?? ""),
  );
  const bashGuardFired = preToolUseDenials.some(
    (d) =>
      /Bash/i.test(d.hookName ?? "") ||
      /blocked (an inline-eval|a shell write)/i.test(d.systemMessage ?? ""),
  );

  return {
    sessionId,
    init,
    assistantTexts,
    preToolTexts,
    finalAssistantText,
    assistantText,
    wordCount: countWords(assistantText),
    toolUses,
    toolResults,
    preToolUseEvents,
    preToolUseDenials,
    timeline,
    guardFired,
    bashGuardFired,
    rateLimits,
    result,
    rawEvents,
  };
}

export function isRateLimitError(stderr, parsed) {
  const combined = `${stderr ?? ""} ${parsed?.result?.resultText ?? ""}`.toLowerCase();
  return (
    combined.includes("rate limit") ||
    /\b429\b/.test(combined) ||
    combined.includes("overloaded") ||
    combined.includes("too many requests") ||
    combined.includes("temporarily unavailable")
  );
}

/**
 * Run one subject Claude Code turn with exponential backoff on transient rate-limit errors.
 */
export async function runClaudeTurn({
  cwd,
  env,
  prompt,
  model = "sonnet",
  persistSession = false,
  resumeSessionId = null,
  tools = DEFAULT_SUBJECT_TOOLS,
  allowedTools = DEFAULT_SUBJECT_TOOLS,
  timeoutMs = 180_000,
  maxRetries = 3,
  onBeforeRetry = null,
} = {}) {
  const args = buildClaudeArgs({
    prompt,
    model,
    persistSession,
    resumeSessionId,
    tools,
    allowedTools,
  });
  const childEnv = sanitizeClaudeEnv(env ?? process.env);

  let attempt = 0;
  while (true) {
    const started = Date.now();
    const res = await spawnAsync("claude", args, { cwd, env: childEnv, timeoutMs });
    const durationMs = Date.now() - started;
    const parsed = parseStreamJson(res.stdout);

    const failed = res.timedOut || res.exitCode !== 0 || parsed.result?.isError;
    if (failed && attempt < maxRetries && isRateLimitError(res.stderr, parsed)) {
      attempt++;
      if (typeof onBeforeRetry === "function") {
        await onBeforeRetry(attempt);
      }
      const backoffMs = Math.min(60_000, 4000 * 2 ** (attempt - 1));
      await sleep(backoffMs);
      continue;
    }

    return {
      prompt,
      model,
      args,
      exitCode: res.exitCode,
      timedOut: res.timedOut,
      stderr: res.stderr,
      durationMs,
      retries: attempt,
      parsed,
    };
  }
}

/**
 * Run a 1-turn or multi-turn subject Claude session in an isolated sandbox.
 * `turns` is an array of strings or functions `(prevTurns, sandbox) => string | { prompt, beforeTurn }`.
 */
export async function runClaudeSession({
  sandbox,
  turns,
  context = {},
  model = "sonnet",
  timeoutMs = 180_000,
  maxRetries = 3,
} = {}) {
  const multiTurn = turns.length > 1;
  const completedTurns = [];
  let sessionId = null;

  for (let i = 0; i < turns.length; i++) {
    const spec = turns[i];
    let prompt;
    if (typeof spec === "function") {
      const out = await spec(completedTurns, sandbox, context);
      if (typeof out === "string") {
        prompt = out;
      } else {
        if (typeof out.beforeTurn === "function") await out.beforeTurn(sandbox);
        prompt = out.prompt;
      }
    } else if (typeof spec === "object" && spec !== null) {
      if (typeof spec.beforeTurn === "function") await spec.beforeTurn(sandbox);
      prompt = spec.prompt;
    } else {
      prompt = String(spec);
    }

    // Snapshot clean pre-turn HEAD so a rate-limit retry resets any partial edits from the failed attempt
    let preTurnCleanHead = null;
    try {
      if (!sandbox.git(["status", "--porcelain"])) {
        preTurnCleanHead = sandbox.git(["rev-parse", "HEAD"]);
      }
    } catch {
      preTurnCleanHead = null;
    }

    const turnResult = await runClaudeTurn({
      cwd: sandbox.repoDir,
      env: sandbox.env,
      prompt,
      model,
      persistSession: multiTurn,
      resumeSessionId: i === 0 ? null : sessionId,
      timeoutMs,
      maxRetries,
      onBeforeRetry:
        preTurnCleanHead && typeof sandbox.resetHard === "function"
          ? () => sandbox.resetHard(preTurnCleanHead)
          : null,
    });

    if (i === 0 && turnResult.parsed.sessionId) {
      sessionId = turnResult.parsed.sessionId;
    }
    completedTurns.push(turnResult);

    if (multiTurn && !sessionId && i < turns.length - 1) {
      throw new Error(`Multi-turn session lost session_id after turn ${i + 1}`);
    }
  }

  return {
    model,
    sessionId,
    turns: completedTurns,
    totalDurationMs: completedTurns.reduce((sum, t) => sum + (t.durationMs ?? 0), 0),
    totalCostUsd: completedTurns.reduce(
      (sum, t) => sum + (t.parsed.result?.totalCostUsd ?? 0),
      0,
    ),
    allToolUses: completedTurns.flatMap((t) => t.parsed.toolUses),
    allPreToolUseDenials: completedTurns.flatMap((t) => t.parsed.preToolUseDenials),
    guardFired: completedTurns.some((t) => t.parsed.guardFired),
    bashGuardFired: completedTurns.some((t) => t.parsed.bashGuardFired),
    wordCounts: completedTurns.map((t) => t.parsed.wordCount),
    rateLimits: completedTurns.flatMap((t) => t.parsed.rateLimits),
  };
}

/**
 * Run a completely isolated single-turn structured-JSON Claude call from a fresh empty temp dir
 * (no CLAUDE.md, skills, hooks, MCP servers, or tools).
 */
export async function runIsolatedClaudeJson({
  prompt,
  model = "sonnet",
  jsonSchema,
  timeoutMs = 120_000,
  maxRetries = 3,
} = {}) {
  const emptyDir = mkdtempSync(join(tmpdir(), "wbs-eval-isolated-"));
  const cleanup = () => {
    cleanupClaudeProjectDir(emptyDir);
    rmSync(emptyDir, { recursive: true, force: true });
  };
  const unregister = registerCleanup(cleanup);
  const schemaStr = typeof jsonSchema === "string" ? jsonSchema : JSON.stringify(jsonSchema);
  const args = [
    "-p",
    "--model",
    model,
    "--output-format",
    "json",
    "--json-schema",
    schemaStr,
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--tools",
    "",
    "--no-session-persistence",
    prompt,
  ];

  try {
    let attempt = 0;
    while (true) {
      const started = Date.now();
      const res = await spawnAsync("claude", args, {
        cwd: emptyDir,
        env: sanitizeClaudeEnv(process.env),
        timeoutMs,
      });
      const durationMs = Date.now() - started;

      let envelope = null;
      if (res.stdout?.trim()) {
        try {
          envelope = JSON.parse(res.stdout.trim());
        } catch {
          envelope = null;
        }
      }

      const structured = envelope?.structured_output ?? null;
      const failed = res.timedOut || res.exitCode !== 0 || envelope?.is_error || !structured;
      // Scan only the result text (or raw stdout if non-JSON), never numeric envelope fields like duration_ms
      const errorText = envelope
        ? typeof envelope.result === "string"
          ? envelope.result
          : ""
        : res.stdout;
      if (failed && attempt < maxRetries && isRateLimitError(res.stderr, { result: { resultText: errorText } })) {
        attempt++;
        await sleep(Math.min(60_000, 4000 * 2 ** (attempt - 1)));
        continue;
      }

      if (failed) {
        throw new Error(
          `Isolated claude JSON failed (exit=${res.exitCode}, timedOut=${res.timedOut}): ${res.stderr || res.stdout.slice(0, 400)}`,
        );
      }

      return {
        output: structured,
        durationMs,
        totalCostUsd: envelope?.total_cost_usd ?? null,
        usage: envelope?.usage ?? null,
        retries: attempt,
      };
    }
  } finally {
    unregister();
    cleanup();
  }
}
