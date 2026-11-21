#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { preflightJudges, runBlindPairwiseAb } from "./lib/judge.mjs";
import { isDirectRun } from "./lib/utils.mjs";

function round4(n) {
  return Number(n.toFixed(4));
}

function delta(a, b) {
  if (typeof a !== "number" || typeof b !== "number") return null;
  return round4(b - a);
}

function fmtPct(rate) {
  if (rate === null || rate === undefined) return "—";
  return `${Math.round(rate * 100)}%`;
}

function fmtDelta(d) {
  if (d === null || d === undefined) return "—";
  const pct = Math.round(d * 100);
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Compute side-by-side metric deltas and regression flags between two compact summaries.
 */
export function computeSummaryDiff(baseline, candidate) {
  const rows = [];
  const regressions = [];

  const scenarioIds = [
    ...new Set([
      ...Object.keys(baseline.scenarios ?? {}),
      ...Object.keys(candidate.scenarios ?? {}),
    ]),
  ].sort();

  for (const scenarioId of scenarioIds) {
    const baseModels = baseline.scenarios?.[scenarioId]?.models ?? {};
    const currModels = candidate.scenarios?.[scenarioId]?.models ?? {};
    const models = [...new Set([...Object.keys(baseModels), ...Object.keys(currModels)])].sort();

    for (const model of models) {
      const b = baseModels[model];
      const c = currModels[model];
      if (!b || !c) continue;

      const hardDelta = delta(b.tiers?.hard?.passRate, c.tiers?.hard?.passRate);
      const targetDelta = delta(b.tiers?.target?.passRate, c.tiers?.target?.passRate);
      const softDelta = delta(b.tiers?.soft?.passRate, c.tiers?.soft?.passRate);
      const rubricDelta = delta(
        b.rubricTiers?.hard?.passRate,
        c.rubricTiers?.hard?.passRate,
      );
      const agreementDelta = delta(b.agreementRate, c.agreementRate);
      const wordsDelta =
        typeof b.medianWords === "number" && typeof c.medianWords === "number"
          ? Number((c.medianWords - b.medianWords).toFixed(1))
          : null;

      const row = {
        scenarioId,
        model,
        baseHard: b.tiers?.hard?.passRate ?? null,
        currHard: c.tiers?.hard?.passRate ?? null,
        hardDelta,
        baseTarget: b.tiers?.target?.passRate ?? null,
        currTarget: c.tiers?.target?.passRate ?? null,
        targetDelta,
        baseSoft: b.tiers?.soft?.passRate ?? null,
        currSoft: c.tiers?.soft?.passRate ?? null,
        softDelta,
        rubricDelta,
        baseAgreement: b.agreementRate ?? null,
        currAgreement: c.agreementRate ?? null,
        agreementDelta,
        baseWords: b.medianWords ?? null,
        currWords: c.medianWords ?? null,
        wordsDelta,
      };
      rows.push(row);

      if (typeof hardDelta === "number" && hardDelta < 0) {
        regressions.push({
          scenarioId,
          model,
          tier: "hard",
          base: row.baseHard,
          curr: row.currHard,
          delta: hardDelta,
        });
      }
      if (typeof targetDelta === "number" && targetDelta < -0.05) {
        regressions.push({
          scenarioId,
          model,
          tier: "target",
          base: row.baseTarget,
          curr: row.currTarget,
          delta: targetDelta,
        });
      }
    }
  }

  const baseTokens = baseline.staticReadability?.summary?.avgExerciseTokens ?? null;
  const currTokens = candidate.staticReadability?.summary?.avgExerciseTokens ?? null;
  const readmeTokensDelta =
    typeof baseTokens === "number" && typeof currTokens === "number"
      ? currTokens - baseTokens
      : null;

  const baseHookWords = baseline.hookStringLint?.medianReasonWords ?? null;
  const currHookWords = candidate.hookStringLint?.medianReasonWords ?? null;
  const hookWordsDelta =
    typeof baseHookWords === "number" && typeof currHookWords === "number"
      ? currHookWords - baseHookWords
      : null;

  const baseCompList = Array.isArray(baseline.comprehension) ? baseline.comprehension : [];
  const currCompList = Array.isArray(candidate.comprehension) ? candidate.comprehension : [];
  const baseConfusions = baseCompList.length
    ? baseCompList.reduce((sum, c) => sum + (c.confusionsCount ?? 0), 0)
    : null;
  const currConfusions = currCompList.length
    ? currCompList.reduce((sum, c) => sum + (c.confusionsCount ?? 0), 0)
    : null;
  const confusionsDelta =
    typeof baseConfusions === "number" && typeof currConfusions === "number"
      ? currConfusions - baseConfusions
      : null;

  return {
    baseLabel: baseline.metadata?.label ?? "baseline",
    currLabel: candidate.metadata?.label ?? "candidate",
    rows,
    regressions,
    baseTokens,
    currTokens,
    readmeTokensDelta,
    baseHookWords,
    currHookWords,
    hookWordsDelta,
    baseConfusions,
    currConfusions,
    confusionsDelta,
  };
}

export function renderDiffTable(diff) {
  const lines = [];
  lines.push(`\n=== Comparison: ${diff.baseLabel} -> ${diff.currLabel} ===`);
  lines.push(
    `Scenario                     Model    Hard (Δ)          Target (Δ)        Soft (Δ)          Words (Δ)    Agree`,
  );
  lines.push("-".repeat(108));
  for (const r of diff.rows) {
    const hardStr = `${fmtPct(r.currHard)} (${fmtDelta(r.hardDelta)})`.padEnd(17);
    const targetStr = `${fmtPct(r.currTarget)} (${fmtDelta(r.targetDelta)})`.padEnd(17);
    const softStr = `${fmtPct(r.currSoft)} (${fmtDelta(r.softDelta)})`.padEnd(17);
    const wDelta = r.wordsDelta === null ? "—" : r.wordsDelta > 0 ? `+${r.wordsDelta}` : `${r.wordsDelta}`;
    const wordsStr = `${r.currWords ?? "—"} (${wDelta})`.padEnd(12);
    const flag = typeof r.hardDelta === "number" && r.hardDelta < 0 ? "  [REGRESSION]" : "";
    lines.push(
      `${r.scenarioId.padEnd(28)} ${r.model.padEnd(8)} ${hardStr} ${targetStr} ${softStr} ${wordsStr} ${fmtPct(r.currAgreement)}${flag}`,
    );
  }

  if (diff.readmeTokensDelta !== null) {
    lines.push(
      `\nREADME avg exercise tokens: ${diff.baseTokens} -> ${diff.currTokens} (${diff.readmeTokensDelta >= 0 ? "+" : ""}${diff.readmeTokensDelta})`,
    );
  }
  if (diff.hookWordsDelta !== null) {
    lines.push(
      `Hook reason.mjs median words: ${diff.baseHookWords} -> ${diff.currHookWords} (${diff.hookWordsDelta >= 0 ? "+" : ""}${diff.hookWordsDelta})`,
    );
  }
  if (diff.confusionsDelta !== null) {
    lines.push(
      `README comprehension total confusions: ${diff.baseConfusions} -> ${diff.currConfusions} (${diff.confusionsDelta >= 0 ? "+" : ""}${diff.confusionsDelta})`,
    );
  }

  if (diff.regressions.length) {
    lines.push(`\nRegressions flagged (${diff.regressions.length}):`);
    for (const reg of diff.regressions) {
      lines.push(
        `  ! ${reg.scenarioId} (${reg.model}) [${reg.tier}]: ${fmtPct(reg.base)} -> ${fmtPct(reg.curr)} (${fmtDelta(reg.delta)})`,
      );
    }
  } else {
    lines.push(`\nZero regressions detected.`);
  }
  return lines.join("\n");
}

function loadJsonOrDir(pathArg, preferredFile) {
  const full = resolve(pathArg);
  if (statSync(full).isDirectory()) {
    const candidate = join(full, preferredFile);
    if (!existsSync(candidate)) {
      throw new Error(`Expected ${candidate} inside directory ${pathArg}`);
    }
    return JSON.parse(readFileSync(candidate, "utf8"));
  }
  return JSON.parse(readFileSync(full, "utf8"));
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIdx = 0;
  async function loop() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => loop()));
  return results;
}

async function runAbMode(
  pathA,
  pathB,
  judgeSpecStrings,
  { allowPartial = false, allTrials = false, concurrency = 2 } = {},
) {
  const runA = loadJsonOrDir(pathA, "full.json");
  const runB = loadJsonOrDir(pathB, "full.json");
  if (!Array.isArray(runA.trials) || !Array.isArray(runB.trials)) {
    throw new Error("--ab mode requires full run files (eval/results/<run>/full.json or run directories)");
  }

  const { available: judgeSpecs } = preflightJudges(judgeSpecStrings, { allowPartial });

  const indexTrials = (trials) => {
    const map = new Map();
    for (const t of trials) {
      const key = allTrials
        ? `${t.scenarioId}::${t.model}::${t.trial ?? 1}`
        : `${t.scenarioId}::${t.model}`;
      if (!map.has(key)) map.set(key, t);
    }
    return map;
  };
  const mapA = indexTrials(runA.trials);
  const mapB = indexTrials(runB.trials);
  const sharedKeys = [...mapA.keys()].filter((k) => mapB.has(k)).sort();

  if (!sharedKeys.length) {
    throw new Error("No shared (scenario, model) trials found between the two runs.");
  }

  const totals = Object.fromEntries(
    judgeSpecs.map((j) => [j.spec, { A: 0, B: 0, tie: 0, positionBias: 0 }]),
  );

  const scopeNote = allTrials
    ? `all shared trials (${sharedKeys.length} pairs)`
    : `trial 1 per scenario × model (${sharedKeys.length} pairs; pass --all-trials for all)`;
  console.log(
    `\n=== Blind Swapped-Order A/B Comparison ===\nA: ${runA.metadata?.label ?? pathA}\nB: ${runB.metadata?.label ?? pathB}\nJudges: ${judgeSpecs.map((j) => j.spec).join(", ")}\nScope: ${scopeNote} | Concurrency: ${concurrency}\n`,
  );

  const pairResults = await runPool(sharedKeys, concurrency, async (key) => {
    const tA = mapA.get(key);
    const tB = mapB.get(key);
    const res = await runBlindPairwiseAb(judgeSpecs, {
      scenarioId: tA.scenarioId,
      description: `${tA.suite} / ${tA.exercise}`,
      transcriptA: tA.transcript ?? JSON.stringify(tA.turns ?? []),
      transcriptB: tB.transcript ?? JSON.stringify(tB.turns ?? []),
    });
    return { tA, res };
  });

  for (const { tA, res } of pairResults) {
    const summaryStr = Object.entries(res)
      .map(([j, r]) => {
        totals[j][r.winner]++;
        if (r.positionBias) totals[j].positionBias++;
        return `${j}=${r.winner}${r.positionBias ? "(bias->tie)" : ""}`;
      })
      .join("  ");
    const trialLabel = allTrials ? ` #${tA.trial ?? 1}` : "";
    console.log(`${`${tA.scenarioId}${trialLabel}`.padEnd(32)} ${tA.model.padEnd(7)} ${summaryStr}`);
    for (const [j, r] of Object.entries(res)) {
      if (r.reasoning) console.log(`    [${j}] ${r.reasoning.slice(0, 220)}`);
    }
  }

  console.log("\n--- Pairwise Tally (A = baseline, B = candidate) ---");
  for (const [j, t] of Object.entries(totals)) {
    console.log(
      `  ${j.padEnd(16)} B wins=${t.B}  A wins=${t.A}  ties=${t.tie} (position-bias neutralized=${t.positionBias})`,
    );
  }
}

export function parseCompareArgs(argv) {
  const opts = {
    ab: false,
    allTrials: false,
    failOnRegression: false,
    judges: ["claude:sonnet", "codex"],
    allowPartial: false,
    concurrency: 2,
    help: false,
    positional: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ab") opts.ab = true;
    else if (a === "--all-trials") opts.allTrials = true;
    else if (a === "--fail-on-regression") opts.failOnRegression = true;
    else if (a === "--allow-partial-judges") opts.allowPartial = true;
    else if (a === "--judges") {
      const val = argv[++i];
      if (!val || val.startsWith("-")) throw new Error("Missing value for --judges");
      opts.judges = val.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (a === "--concurrency") {
      const val = argv[++i];
      const n = Number(val);
      if (!val || !Number.isInteger(n) || n < 1) {
        throw new Error(`Invalid value for --concurrency: "${val ?? ""}" (expected positive integer)`);
      }
      opts.concurrency = n;
    } else if (a === "-h" || a === "--help") {
      opts.help = true;
    } else if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    } else {
      opts.positional.push(a);
    }
  }
  return opts;
}

async function main() {
  const opts = parseCompareArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(
      `Usage: node eval/compare.mjs <baseline.json> <candidate.json> [options]

Options:
  --fail-on-regression         Exit with status 1 if any hard/target regression is flagged
  --ab                         Run blind swapped-order A/B pairwise comparison on full.json runs
  --all-trials                 In --ab mode, compare all trials instead of trial 1 only
  --concurrency <n>            Parallel pairs in --ab mode (default: 2)
  --judges <spec,...>          Judge panel for --ab mode (default: claude:sonnet,codex)
  --allow-partial-judges       Skip unavailable judges in --ab mode`,
    );
    process.exit(0);
  }

  if (opts.positional.length !== 2) {
    console.error("Usage: node eval/compare.mjs <baseline> <candidate> [--ab --judges ...]");
    process.exit(2);
  }

  if (opts.ab) {
    await runAbMode(opts.positional[0], opts.positional[1], opts.judges, {
      allowPartial: opts.allowPartial,
      allTrials: opts.allTrials,
      concurrency: opts.concurrency,
    });
    return;
  }

  const base = loadJsonOrDir(opts.positional[0], "summary.json");
  const curr = loadJsonOrDir(opts.positional[1], "summary.json");
  const diff = computeSummaryDiff(base, curr);
  console.log(renderDiffTable(diff));
  if (opts.failOnRegression && diff.regressions.length > 0) {
    process.exit(1);
  }
}

if (isDirectRun(import.meta.url)) {
  main().catch((err) => {
    console.error(`Compare failed: ${err.message}`);
    process.exit(1);
  });
}
