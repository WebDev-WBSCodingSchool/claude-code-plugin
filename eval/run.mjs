#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runClaudeSession } from "./lib/claude-runner.mjs";
import { snapshotRepoState } from "./lib/sandbox.mjs";
import { checkSessionCompletedCleanly, runHookStringLint } from "./lib/assertions.mjs";
import { runStaticReadabilitySuite } from "./lib/readability.mjs";
import { preflightJudges, runJudgePanel } from "./lib/judge.mjs";
import { installSignalCleanup, isDirectRun, runPool } from "./lib/utils.mjs";
import {
  buildCompactSummary,
  renderMarkdownReport,
  renderTerminalSummary,
  writeRunOutputs,
} from "./lib/report.mjs";
import { TUTOR_SCENARIOS } from "./scenarios/tutor.mjs";
import { ONBOARD_SCENARIOS } from "./scenarios/onboard.mjs";
import {
  listComprehensionExercises,
  runComprehensionEval,
} from "./scenarios/readme-comprehension.mjs";

const EVAL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = resolve(EVAL_ROOT, "..");

const SMOKE_SCENARIO_IDS = [
  "tutor-refusal-basic",
  "tutor-hook-refusal-live",
  "tutor-open-you-decide",
  "onboard-solo-fresh",
];

function usage() {
  console.error(`Usage: node eval/run.mjs [options]

Options:
  --suite <smoke|tutor|onboard|readability|full>   Suite to run (default: smoke)
  --scenario <id,...>                              Comma-separated scenario ID filter
  --models <list>                                  Subject models (default: sonnet for smoke, sonnet,opus otherwise)
  --trials <n>                                     Trials per scenario × model (default: 1, or 3 for full)
  --concurrency <n>                                Parallel trials (default: 2)
  --judges <spec,...>                              Judge panel (default: claude:sonnet,codex)
  --allow-partial-judges                           Skip unavailable judges instead of aborting
  --no-judge                                       Run deterministic checks + static lint only
  --static-only                                    Run static README + #29 hook-string lint only (0 LLM calls)
  --save-baseline <label>                          Save compact JSON/MD baseline to eval/baselines/<label>.*
  -h, --help                                       Show this help
`);
}

function requireFlagValue(argv, idx, flag) {
  const val = argv[idx];
  if (val === undefined || val.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return val;
}

function parsePositiveInt(raw, flag) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid value for ${flag}: "${raw}" (expected positive integer)`);
  }
  return n;
}

export function parseCliArgs(argv) {
  const opts = {
    suite: null,
    scenarios: null,
    models: null,
    trials: null,
    concurrency: 2,
    judges: ["claude:sonnet", "codex"],
    allowPartialJudges: false,
    noJudge: false,
    staticOnly: false,
    saveBaseline: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg === "--suite") {
      opts.suite = requireFlagValue(argv, ++i, "--suite");
    } else if (arg === "--scenario") {
      opts.scenarios = requireFlagValue(argv, ++i, "--scenario")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--models") {
      opts.models = requireFlagValue(argv, ++i, "--models")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--trials") {
      opts.trials = parsePositiveInt(requireFlagValue(argv, ++i, "--trials"), "--trials");
    } else if (arg === "--concurrency") {
      opts.concurrency = parsePositiveInt(
        requireFlagValue(argv, ++i, "--concurrency"),
        "--concurrency",
      );
    } else if (arg === "--judges") {
      opts.judges = requireFlagValue(argv, ++i, "--judges")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--allow-partial-judges") {
      opts.allowPartialJudges = true;
    } else if (arg === "--no-judge") {
      opts.noJudge = true;
    } else if (arg === "--static-only") {
      opts.staticOnly = true;
    } else if (arg === "--save-baseline") {
      const label = requireFlagValue(argv, ++i, "--save-baseline");
      if (!/^[A-Za-z0-9._-]+$/.test(label) || label.includes("..")) {
        throw new Error(
          `Invalid --save-baseline label "${label}" (use letters, digits, '.', '_', '-')`,
        );
      }
      opts.saveBaseline = label;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (opts.help) return opts;

  if (!opts.suite) {
    opts.suite = opts.scenarios?.length ? "custom" : "smoke";
  }

  if (!["smoke", "tutor", "onboard", "readability", "full", "custom"].includes(opts.suite)) {
    throw new Error(`Invalid --suite "${opts.suite}"`);
  }
  if (opts.models && opts.models.length === 0) {
    throw new Error("Invalid --models (empty list)");
  }
  if (!opts.models) {
    opts.models = opts.suite === "smoke" || opts.suite === "custom" ? ["sonnet"] : ["sonnet", "opus"];
  }
  if (!opts.trials) {
    opts.trials = opts.suite === "full" ? 3 : 1;
  }
  return opts;
}

function safeCmd(bin, args, cwd = REPO_ROOT) {
  try {
    return execFileSync(bin, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
      .trim()
      .split("\n")[0];
  } catch {
    return null;
  }
}

export function formatTranscriptForJudge(session, repoState) {
  const parts = [];
  for (let i = 0; i < session.turns.length; i++) {
    const t = session.turns[i];
    parts.push(`### Turn ${i + 1} — Student`);
    parts.push(t.prompt);
    parts.push("");

    const timeline = Array.isArray(t.parsed.timeline) ? t.parsed.timeline : [];
    if (timeline.length) {
      // Find the final text block index so earlier steps appear in true chronological order
      let lastTextIdx = -1;
      for (let k = timeline.length - 1; k >= 0; k--) {
        if (timeline[k].type === "text") {
          lastTextIdx = k;
          break;
        }
      }
      const actionLines = [];
      for (let k = 0; k < timeline.length; k++) {
        if (k === lastTextIdx) continue;
        const ev = timeline[k];
        if (ev.type === "text") {
          actionLines.push(`- [Pre-tool note] ${ev.text.replace(/\s+/g, " ").slice(0, 200)}`);
        } else if (ev.type === "tool_use") {
          actionLines.push(`- Tool ${ev.name}: ${JSON.stringify(ev.input).slice(0, 300)}`);
        } else if (ev.type === "hook_denial") {
          actionLines.push(`- Hook Denial [${ev.hookName}]: ${ev.systemMessage}`);
        }
      }
      if (actionLines.length) {
        parts.push(`### Turn ${i + 1} — Agent Actions (Chronological)`);
        parts.push(...actionLines);
        parts.push("");
      }
    }

    parts.push(`### Turn ${i + 1} — Assistant`);
    parts.push(t.parsed.assistantText || "(no text output)");
    parts.push("");
  }
  parts.push(`### Final Repo State`);
  parts.push(`- Branch: ${repoState.branch}`);
  parts.push(`- Modified/untracked files: ${repoState.modifiedFiles.join(", ") || "none"}`);
  parts.push(`- Progress files: ${Object.keys(repoState.progressFiles ?? {}).join(", ") || "none"}`);
  return parts.join("\n");
}

async function runBehavioralTrial({ scenario, model, trial, judgeSpecs }) {
  const setupRes = scenario.setup();
  const { sandbox, initialHeadSha, context = {}, cleanup } = setupRes;
  try {
    const session = await runClaudeSession({
      sandbox,
      turns: scenario.turns,
      context,
      model,
    });
    const repoState = snapshotRepoState(sandbox, { initialHeadSha });
    const sessionCleanCheck = checkSessionCompletedCleanly(session);
    const deterministic = [
      sessionCleanCheck,
      ...scenario.evaluate({
        session,
        repoState,
        sandbox,
        initialHeadSha,
        context,
      }),
    ];
    const transcript = formatTranscriptForJudge(session, repoState);
    let rubric = null;
    if (judgeSpecs.length && sessionCleanCheck.pass) {
      try {
        rubric = await runJudgePanel(judgeSpecs, {
          scenario,
          transcript,
          context: `Exercise: ${scenario.exercise}. Final branch: ${repoState.branch}. Modified files: ${repoState.modifiedFiles.join(", ") || "none"}.`,
        });
        if (rubric?.errors) {
          for (const [jSpec, jErr] of Object.entries(rubric.errors)) {
            console.warn(`[warn] ${scenario.id} (${model} #${trial}) judge ${jSpec} failed: ${jErr}`);
          }
        }
      } catch (judgeErr) {
        console.warn(`[warn] ${scenario.id} (${model} #${trial}) judge panel failed: ${judgeErr.message}`);
        deterministic.push({
          id: "judge-panel-execution",
          tier: "hard",
          pass: false,
          detail: `Judge panel failed: ${judgeErr.message}`,
        });
      }
    }

    const helperDurationMs = context.helperTelemetry?.durationMs ?? 0;
    const helperCostUsd = context.helperTelemetry?.totalCostUsd ?? 0;

    return {
      scenarioId: scenario.id,
      suite: scenario.suite,
      exercise: scenario.exercise,
      model,
      trial,
      deterministic,
      rubric,
      transcript,
      telemetry: {
        turns: session.turns.length,
        wordCounts: session.wordCounts,
        durationMs: session.totalDurationMs + helperDurationMs,
        totalCostUsd: session.totalCostUsd + helperCostUsd,
        helperCostUsd: helperCostUsd || undefined,
        guardFired: session.guardFired,
        bashGuardFired: session.bashGuardFired,
        toolCalls: session.allToolUses.map((tu) => tu.name),
        preToolUseDenials: session.allPreToolUseDenials.map((d) => ({
          hookName: d.hookName,
          systemMessage: d.systemMessage,
        })),
        rateLimits: session.rateLimits,
      },
      turns: session.turns.map((t) => ({
        prompt: t.prompt,
        assistantText: t.parsed.assistantText,
        preToolTexts: t.parsed.preToolTexts,
        wordCount: t.parsed.wordCount,
        exitCode: t.exitCode,
        timedOut: t.timedOut,
        durationMs: t.durationMs,
        retries: t.retries,
        toolUses: t.parsed.toolUses,
        preToolUseDenials: t.parsed.preToolUseDenials,
        usage: t.parsed.result?.usage ?? null,
        totalCostUsd: t.parsed.result?.totalCostUsd ?? null,
      })),
      repoState,
    };
  } finally {
    cleanup();
  }
}

async function main() {
  installSignalCleanup();
  const opts = parseCliArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    process.exit(0);
  }

  const allBehavioral = [...TUTOR_SCENARIOS, ...ONBOARD_SCENARIOS];
  let selectedScenarios = [];
  if (!opts.staticOnly) {
    if (opts.suite === "smoke") {
      selectedScenarios = allBehavioral.filter((s) => SMOKE_SCENARIO_IDS.includes(s.id));
    } else if (opts.suite === "tutor") {
      selectedScenarios = TUTOR_SCENARIOS;
    } else if (opts.suite === "onboard") {
      selectedScenarios = ONBOARD_SCENARIOS;
    } else if (opts.suite === "full") {
      selectedScenarios = allBehavioral;
    }
    if (opts.scenarios?.length) {
      const wanted = new Set(opts.scenarios);
      selectedScenarios = allBehavioral.filter((s) => wanted.has(s.id));
      if (!selectedScenarios.length) {
        throw new Error(`No scenarios matched --scenario ${opts.scenarios.join(",")}`);
      }
    }
  }

  const runHookLint =
    opts.staticOnly || ["smoke", "tutor", "full"].includes(opts.suite);
  const runStaticReadme =
    opts.staticOnly || ["smoke", "readability", "full"].includes(opts.suite);
  const runComprehension =
    !opts.staticOnly && !opts.scenarios?.length && ["readability", "full"].includes(opts.suite);

  // Preflight judges when needed
  let activeJudges = [];
  if (!opts.staticOnly && !opts.noJudge && selectedScenarios.length > 0) {
    const preflight = preflightJudges(opts.judges, {
      allowPartial: opts.allowPartialJudges,
    });
    activeJudges = preflight.available;
    if (preflight.unavailable.length) {
      for (const u of preflight.unavailable) {
        console.warn(`[warn] Skipping unavailable judge ${u.specObj.spec}: ${u.check.detail}`);
      }
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const label = opts.saveBaseline ?? `${timestamp}-${opts.suite}`;
  const gitCommit = safeCmd("git", ["rev-parse", "--short", "HEAD"]);
  const gitTag = safeCmd("git", ["describe", "--tags", "--always"]);

  const cliVersions = {
    node: process.version,
    claude: safeCmd("claude", ["--version"]),
    codex: safeCmd("codex", ["--version"]),
  };

  console.log(
    `Starting eval suite=${opts.suite} models=[${opts.models.join(",")}] trials=${opts.trials} judges=[${activeJudges.map((j) => j.spec).join(",") || "none"}] concurrency=${opts.concurrency}`,
  );

  // 1. Static checks (0 LLM calls)
  const hookStringLint = runHookLint ? runHookStringLint() : null;
  if (hookStringLint) {
    console.log(
      `[static] hook-lint #29: medianReasonWords=${hookStringLint.medianReasonWords}, camelLeaks=${hookStringLint.camelLeaks.length}, jargonHits=${hookStringLint.jargonHits.length}`,
    );
  }

  const staticReadability = runStaticReadme ? runStaticReadabilitySuite() : null;
  if (staticReadability) {
    const rs = staticReadability.summary;
    console.log(
      `[static] readme-lint: docs=${rs.documentCount}, avgTokens=${rs.avgExerciseTokens}, hard=${rs.hardPassed}/${rs.hardTotal}, target=${rs.targetPassed}/${rs.targetTotal}`,
    );
  }

  // 2. Behavioral trials
  const trialJobs = [];
  for (const scenario of selectedScenarios) {
    for (const model of opts.models) {
      for (let trial = 1; trial <= opts.trials; trial++) {
        trialJobs.push({ scenario, model, trial });
      }
    }
  }

  const trials = await runPool(trialJobs, opts.concurrency, async (job, idx) => {
    const tag = `[${idx + 1}/${trialJobs.length}] ${job.scenario.id} (${job.model}, trial ${job.trial})`;
    console.log(`→ Running ${tag}...`);
    try {
      const result = await runBehavioralTrial({
        scenario: job.scenario,
        model: job.model,
        trial: job.trial,
        judgeSpecs: activeJudges,
      });
      const hardChecks = [
        ...result.deterministic.filter((c) => c.tier === "hard"),
        ...(result.rubric?.items ?? []).filter((c) => c.tier === "hard"),
      ];
      const hardPass = hardChecks.filter((c) => c.pass).length;
      console.log(
        `✓ Done ${tag}: hard=${hardPass}/${hardChecks.length} words=[${result.telemetry.wordCounts.join(",")}] guardFired=${result.telemetry.guardFired} (${Math.round(result.telemetry.durationMs / 1000)}s)`,
      );
      return result;
    } catch (err) {
      console.error(`✗ Error ${tag}: ${err.message}`);
      return {
        scenarioId: job.scenario.id,
        suite: job.scenario.suite,
        exercise: job.scenario.exercise,
        model: job.model,
        trial: job.trial,
        error: err.message,
        deterministic: [
          {
            id: "trial-execution",
            tier: "hard",
            pass: false,
            detail: `Trial threw error: ${err.message}`,
          },
        ],
        rubric: null,
        transcript: "",
        telemetry: {
          turns: 0,
          wordCounts: [],
          durationMs: 0,
          totalCostUsd: 0,
          guardFired: false,
          bashGuardFired: false,
          toolCalls: [],
          preToolUseDenials: [],
          rateLimits: [],
        },
        turns: [],
        repoState: null,
      };
    }
  });

  // 3. Simulated-student README comprehension
  const compJobs = [];
  if (runComprehension) {
    for (const exerciseId of listComprehensionExercises()) {
      for (const model of opts.models) {
        compJobs.push({ exerciseId, model });
      }
    }
  }

  const comprehension = await runPool(compJobs, opts.concurrency, async (job, idx) => {
    const tag = `[comp ${idx + 1}/${compJobs.length}] ${job.exerciseId} (${job.model})`;
    console.log(`→ Running ${tag}...`);
    try {
      const res = await runComprehensionEval(job);
      const passed = res.checks.filter((c) => c.pass).length;
      console.log(
        `✓ Done ${tag}: ${passed}/${res.checks.length} checks, confusions=${(res.output?.confusions ?? []).length}`,
      );
      return res;
    } catch (err) {
      console.error(`✗ Error ${tag}: ${err.message}`);
      return {
        exercise: job.exerciseId,
        model: job.model,
        error: err.message,
        output: { confusions: [] },
        checks: [
          {
            id: "comprehension-execution",
            tier: "hard",
            pass: false,
            detail: `Comprehension eval threw error: ${err.message}`,
          },
        ],
        durationMs: 0,
        totalCostUsd: 0,
      };
    }
  });

  const reproCommand = `node eval/run.mjs ${process.argv.slice(2).join(" ")}`.trim();
  const runData = {
    metadata: {
      label,
      suite: opts.suite,
      gitCommit,
      gitTag,
      date: new Date().toISOString(),
      models: opts.models,
      judges: activeJudges.map((j) => j.spec),
      trials: opts.trials,
      cliVersions,
      reproCommand,
    },
    trials,
    hookStringLint,
    staticReadability,
    comprehension,
  };

  const summary = buildCompactSummary(runData);
  const markdown = renderMarkdownReport(summary);

  const resultsDir = join(EVAL_ROOT, "results", label);
  const baselineDir = opts.saveBaseline ? join(EVAL_ROOT, "baselines") : null;
  writeRunOutputs({
    resultsDir,
    baselineDir,
    label,
    runData,
    summary,
    markdown,
  });

  console.log(renderTerminalSummary(summary));
  console.log(`\nSaved full run to ${resultsDir}`);
  if (opts.saveBaseline) {
    console.log(`Saved compact baseline to ${join(baselineDir, `${opts.saveBaseline}.json`)} and .md`);
  }
}

if (isDirectRun(import.meta.url)) {
  main().catch((err) => {
    console.error(`Eval failed: ${err.message}`);
    process.exit(1);
  });
}
