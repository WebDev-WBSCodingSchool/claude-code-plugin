#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { preflightJudges, runBlindPairwiseAb } from "./lib/judge.mjs";
import { formatPct, isDirectRun, runPool } from "./lib/utils.mjs";

function round4(n) {
  return Number(n.toFixed(4));
}

function delta(a, b) {
  if (typeof a !== "number" || typeof b !== "number") return null;
  return round4(b - a);
}

function fmtDelta(d) {
  if (d === null || d === undefined) return "—";
  if (d === 0) return "0%";
  const scaled = d * 100;
  const rounded = Math.round(scaled);
  if (rounded === 0) {
    const dec = Number(scaled.toFixed(1));
    const shown = dec === 0 ? (d > 0 ? 0.1 : -0.1) : dec;
    return shown > 0 ? `+${shown}%` : `${shown}%`;
  }
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
}

function tierRateFromChecks(checks, tier) {
  const list = (checks ?? []).filter((c) => c.tier === tier);
  if (!list.length) return null;
  return round4(list.filter((c) => c.pass).length / list.length);
}

/**
 * Compute side-by-side metric deltas and regression flags between two compact summaries.
 */
export function computeSummaryDiff(baseline, candidate) {
  const rows = [];
  const regressions = [];
  const missingScenarios = [];
  let comparedSections = 0;

  const baseScenarios = baseline.scenarios ?? {};
  const currScenarios = candidate.scenarios ?? {};
  const sameSuite =
    Boolean(baseline.metadata?.suite) &&
    baseline.metadata?.suite === candidate.metadata?.suite;

  const scenarioIds = [
    ...new Set([...Object.keys(baseScenarios), ...Object.keys(currScenarios)]),
  ].sort();

  for (const scenarioId of scenarioIds) {
    const baseModels = baseScenarios[scenarioId]?.models ?? {};
    const currModels = currScenarios[scenarioId]?.models ?? {};
    const models = [...new Set([...Object.keys(baseModels), ...Object.keys(currModels)])].sort();

    for (const model of models) {
      const b = baseModels[model];
      const c = currModels[model];
      if (b && !c) {
        missingScenarios.push({ scenarioId, model });
        if (sameSuite) {
          regressions.push({
            scenarioId,
            model,
            tier: "hard",
            base: b.tiers?.hard?.passRate ?? null,
            curr: null,
            delta: null,
            reason: "missing from candidate run",
          });
        }
        continue;
      }
      if (!b || !c) continue;

      comparedSections++;
      const baseHard = b.tiers?.hard?.passRate ?? null;
      const currHard = c.tiers?.hard?.passRate ?? null;
      const baseDetHard = b.deterministicTiers?.hard?.passRate ?? null;
      const currDetHard = c.deterministicTiers?.hard?.passRate ?? null;
      const baseRubHard = b.rubricTiers?.hard?.passRate ?? null;
      const currRubHard = c.rubricTiers?.hard?.passRate ?? null;
      const baseTarget = b.tiers?.target?.passRate ?? null;
      const currTarget = c.tiers?.target?.passRate ?? null;
      const baseSoft = b.tiers?.soft?.passRate ?? null;
      const currSoft = c.tiers?.soft?.passRate ?? null;

      const hardDelta = delta(baseHard, currHard);
      const detHardDelta = delta(baseDetHard, currDetHard);
      const rubHardDelta = delta(baseRubHard, currRubHard);
      const targetDelta = delta(baseTarget, currTarget);
      const softDelta = delta(baseSoft, currSoft);
      const agreementDelta = delta(b.agreementRate, c.agreementRate);
      const wordsDelta =
        typeof b.medianWords === "number" && typeof c.medianWords === "number"
          ? Number((c.medianWords - b.medianWords).toFixed(1))
          : null;

      const row = {
        scenarioId,
        model,
        baseHard,
        currHard,
        hardDelta,
        baseDetHard,
        currDetHard,
        detHardDelta,
        baseRubHard,
        currRubHard,
        rubHardDelta,
        baseTarget,
        currTarget,
        targetDelta,
        baseSoft,
        currSoft,
        softDelta,
        baseAgreement: b.agreementRate ?? null,
        currAgreement: c.agreementRate ?? null,
        agreementDelta,
        baseWords: b.medianWords ?? null,
        currWords: c.medianWords ?? null,
        wordsDelta,
      };
      rows.push(row);

      let flaggedHard = false;
      if (typeof baseDetHard === "number" && currDetHard === null) {
        flaggedHard = true;
        regressions.push({
          scenarioId,
          model,
          tier: "hard",
          source: "deterministic",
          base: baseDetHard,
          curr: null,
          delta: null,
          reason: "deterministic hard pass rate dropped to null",
        });
      } else if (typeof detHardDelta === "number" && detHardDelta < 0) {
        flaggedHard = true;
        regressions.push({
          scenarioId,
          model,
          tier: "hard",
          source: "deterministic",
          base: baseDetHard,
          curr: currDetHard,
          delta: detHardDelta,
          reason: "deterministic hard invariant drop",
        });
      }
      if (typeof baseRubHard === "number" && currRubHard === null) {
        flaggedHard = true;
        regressions.push({
          scenarioId,
          model,
          tier: "hard",
          source: "rubric",
          base: baseRubHard,
          curr: null,
          delta: null,
          reason: "rubric hard pass rate dropped to null",
        });
      } else if (typeof rubHardDelta === "number" && rubHardDelta < 0) {
        flaggedHard = true;
        regressions.push({
          scenarioId,
          model,
          tier: "hard",
          source: "rubric",
          base: baseRubHard,
          curr: currRubHard,
          delta: rubHardDelta,
          reason: "behavioral rubric hard drop",
        });
      }
      if (!flaggedHard) {
        if (typeof baseHard === "number" && currHard === null) {
          regressions.push({
            scenarioId,
            model,
            tier: "hard",
            base: baseHard,
            curr: null,
            delta: null,
            reason: "pass rate dropped to null",
          });
        } else if (typeof hardDelta === "number" && hardDelta < 0) {
          regressions.push({
            scenarioId,
            model,
            tier: "hard",
            base: baseHard,
            curr: currHard,
            delta: hardDelta,
          });
        }
      }
      if (typeof baseTarget === "number" && currTarget === null) {
        regressions.push({
          scenarioId,
          model,
          tier: "target",
          base: baseTarget,
          curr: null,
          delta: null,
          reason: "pass rate dropped to null",
        });
      } else if (typeof targetDelta === "number" && targetDelta < -0.05) {
        regressions.push({
          scenarioId,
          model,
          tier: "target",
          base: baseTarget,
          curr: currTarget,
          delta: targetDelta,
        });
      }
    }
  }

  // Static hook-string lint regressions (#29)
  if (baseline.hookStringLint?.checks && candidate.hookStringLint?.checks) {
    comparedSections++;
    const currById = new Map(candidate.hookStringLint.checks.map((c) => [c.id, c]));
    for (const bc of baseline.hookStringLint.checks) {
      const cc = currById.get(bc.id);
      if (bc.pass && (!cc || !cc.pass)) {
        regressions.push({
          scenarioId: `hookStringLint:${bc.id}`,
          model: "static",
          tier: bc.tier ?? "hard",
          base: 1,
          curr: 0,
          delta: -1,
          reason: cc ? cc.detail : "check missing in candidate",
        });
      }
    }
  }

  // Static README readability/lint regressions
  if (baseline.staticReadability?.summary && candidate.staticReadability?.summary) {
    comparedSections++;
    const bs = baseline.staticReadability.summary;
    const cs = candidate.staticReadability.summary;
    const bHard = bs.hardTotal ? round4(bs.hardPassed / bs.hardTotal) : null;
    const cHard = cs.hardTotal ? round4(cs.hardPassed / cs.hardTotal) : null;
    const bTarget = bs.targetTotal ? round4(bs.targetPassed / bs.targetTotal) : null;
    const cTarget = cs.targetTotal ? round4(cs.targetPassed / cs.targetTotal) : null;
    const dHard = delta(bHard, cHard);
    const dTarget = delta(bTarget, cTarget);
    if (typeof bHard === "number" && cHard === null) {
      regressions.push({
        scenarioId: "staticReadability",
        model: "static",
        tier: "hard",
        base: bHard,
        curr: null,
        delta: null,
        reason: "pass rate dropped to null",
      });
    } else if (typeof dHard === "number" && dHard < 0) {
      regressions.push({
        scenarioId: "staticReadability",
        model: "static",
        tier: "hard",
        base: bHard,
        curr: cHard,
        delta: dHard,
      });
    }
    if (typeof dTarget === "number" && dTarget < -0.05) {
      regressions.push({
        scenarioId: "staticReadability",
        model: "static",
        tier: "target",
        base: bTarget,
        curr: cTarget,
        delta: dTarget,
      });
    }
  }

  // Simulated-student README comprehension regressions
  const baseCompList = Array.isArray(baseline.comprehension) ? baseline.comprehension : [];
  const currCompList = Array.isArray(candidate.comprehension) ? candidate.comprehension : [];
  if (baseCompList.length && currCompList.length) {
    comparedSections++;
    const baseCompChecks = baseCompList.flatMap((c) => c.checks ?? []);
    const currCompChecks = currCompList.flatMap((c) => c.checks ?? []);
    const bHard = tierRateFromChecks(baseCompChecks, "hard");
    const cHard = tierRateFromChecks(currCompChecks, "hard");
    const bTarget = tierRateFromChecks(baseCompChecks, "target");
    const cTarget = tierRateFromChecks(currCompChecks, "target");
    const dHard = delta(bHard, cHard);
    const dTarget = delta(bTarget, cTarget);
    if (typeof bHard === "number" && cHard === null) {
      regressions.push({
        scenarioId: "comprehension",
        model: "all",
        tier: "hard",
        base: bHard,
        curr: null,
        delta: null,
        reason: "pass rate dropped to null",
      });
    } else if (typeof dHard === "number" && dHard < 0) {
      regressions.push({
        scenarioId: "comprehension",
        model: "all",
        tier: "hard",
        base: bHard,
        curr: cHard,
        delta: dHard,
      });
    }
    if (typeof dTarget === "number" && dTarget < -0.05) {
      regressions.push({
        scenarioId: "comprehension",
        model: "all",
        tier: "target",
        base: bTarget,
        curr: cTarget,
        delta: dTarget,
      });
    }
  }

  if (comparedSections === 0) {
    regressions.push({
      scenarioId: "comparison",
      model: "all",
      tier: "hard",
      base: null,
      curr: null,
      delta: null,
      reason: "no overlapping scenarios or static checks between baseline and candidate",
    });
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
    missingScenarios,
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
  const hasSplitHard = diff.rows.some(
    (r) => typeof r.currDetHard === "number" || typeof r.currRubHard === "number",
  );
  lines.push(`\n=== Comparison: ${diff.baseLabel} -> ${diff.currLabel} ===`);
  if (hasSplitHard) {
    lines.push(
      `Scenario                     Model    DetHard (Δ)       RubHard (Δ)       Target (Δ)        Soft (Δ)          Words (Δ)    Agree`,
    );
    lines.push("-".repeat(126));
  } else {
    lines.push(
      `Scenario                     Model    Hard (Δ)          Target (Δ)        Soft (Δ)          Words (Δ)    Agree`,
    );
    lines.push("-".repeat(108));
  }
  for (const r of diff.rows) {
    const hardStr = `${formatPct(r.currHard)} (${fmtDelta(r.hardDelta)})`.padEnd(17);
    const detHardStr = `${formatPct(r.currDetHard)} (${fmtDelta(r.detHardDelta)})`.padEnd(17);
    const rubHardStr = `${formatPct(r.currRubHard)} (${fmtDelta(r.rubHardDelta)})`.padEnd(17);
    const targetStr = `${formatPct(r.currTarget)} (${fmtDelta(r.targetDelta)})`.padEnd(17);
    const softStr = `${formatPct(r.currSoft)} (${fmtDelta(r.softDelta)})`.padEnd(17);
    const wDelta = r.wordsDelta === null ? "—" : r.wordsDelta > 0 ? `+${r.wordsDelta}` : `${r.wordsDelta}`;
    const wordsStr = `${r.currWords ?? "—"} (${wDelta})`.padEnd(12);
    const isReg =
      (typeof r.detHardDelta === "number" && r.detHardDelta < 0) ||
      (typeof r.baseDetHard === "number" && r.currDetHard === null) ||
      (typeof r.rubHardDelta === "number" && r.rubHardDelta < 0) ||
      (typeof r.baseRubHard === "number" && r.currRubHard === null) ||
      (typeof r.hardDelta === "number" && r.hardDelta < 0) ||
      (typeof r.baseHard === "number" && r.currHard === null) ||
      (typeof r.targetDelta === "number" && r.targetDelta < -0.05) ||
      (typeof r.baseTarget === "number" && r.currTarget === null);
    const flag = isReg ? "  [REGRESSION]" : "";
    if (hasSplitHard) {
      lines.push(
        `${r.scenarioId.padEnd(28)} ${r.model.padEnd(8)} ${detHardStr} ${rubHardStr} ${targetStr} ${softStr} ${wordsStr} ${formatPct(r.currAgreement)}${flag}`,
      );
    } else {
      lines.push(
        `${r.scenarioId.padEnd(28)} ${r.model.padEnd(8)} ${hardStr} ${targetStr} ${softStr} ${wordsStr} ${formatPct(r.currAgreement)}${flag}`,
      );
    }
  }

  if ((diff.missingScenarios ?? []).length) {
    lines.push(
      `\nNote: ${diff.missingScenarios.length} baseline (scenario, model) pair(s) not present in candidate.`,
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
      const reasonSuffix = reg.reason ? ` — ${reg.reason}` : "";
      lines.push(
        `  ! ${reg.scenarioId} (${reg.model}) [${reg.tier}]: ${formatPct(reg.base)} -> ${formatPct(reg.curr)} (${fmtDelta(reg.delta)})${reasonSuffix}`,
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
    try {
      const res = await runBlindPairwiseAb(judgeSpecs, {
        scenarioId: tA.scenarioId,
        description: `${tA.suite} / ${tA.exercise}`,
        transcriptA: tA.transcript ?? JSON.stringify(tA.turns ?? []),
        transcriptB: tB.transcript ?? JSON.stringify(tB.turns ?? []),
      });
      return { tA, res, error: null };
    } catch (err) {
      console.error(`✗ A/B pair failed (${key}): ${err.message}`);
      return { tA, res: null, error: err.message };
    }
  });

  for (const { tA, res, error } of pairResults) {
    const trialLabel = allTrials ? ` #${tA.trial ?? 1}` : "";
    if (error || !res) {
      console.log(`${`${tA.scenarioId}${trialLabel}`.padEnd(32)} ${tA.model.padEnd(7)} ERROR: ${error}`);
      continue;
    }
    const summaryStr = Object.entries(res)
      .map(([j, r]) => {
        totals[j][r.winner]++;
        if (r.positionBias) totals[j].positionBias++;
        return `${j}=${r.winner}${r.positionBias ? "(bias->tie)" : ""}`;
      })
      .join("  ");
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
    judges: ["codex", "agy:gemini-4-neon-medium"],
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
  --judges <spec,...>          Judge panel for --ab mode (default: codex,agy:gemini-4-neon-medium)
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
