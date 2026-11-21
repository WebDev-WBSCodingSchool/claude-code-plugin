import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatPct, median as computeMedian } from "./utils.mjs";

const median = (values) => computeMedian(values, { round: 2 });

function pct(num, den) {
  if (!den) return null;
  return Number((num / den).toFixed(4));
}

function clip(text, max = 180) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function summarizeChecksByTier(checks) {
  const tiers = {
    hard: { passed: 0, total: 0, passRate: null },
    target: { passed: 0, total: 0, passRate: null },
    soft: { passed: 0, total: 0, passRate: null },
  };
  for (const c of checks) {
    const t = tiers[c.tier ?? "hard"];
    if (!t) continue;
    t.total++;
    if (c.pass) t.passed++;
  }
  for (const t of Object.values(tiers)) {
    t.passRate = pct(t.passed, t.total);
  }
  return tiers;
}

/**
 * Build a compact, deterministic, git-trackable summary object
 * with zero raw transcripts.
 */
export function buildCompactSummary(runData) {
  const scenarios = {};
  const failedChecks = [];
  const disputedItems = [];

  for (const trial of runData.trials ?? []) {
    if (!scenarios[trial.scenarioId]) {
      scenarios[trial.scenarioId] = {
        suite: trial.suite,
        exercise: trial.exercise ?? null,
        models: {},
      };
    }
    const sc = scenarios[trial.scenarioId];
    if (!sc.models[trial.model]) {
      sc.models[trial.model] = {
        trialCount: 0,
        _detChecks: [],
        _rubricItems: [],
        _wordCounts: [],
        _durations: [],
        _costs: [],
        _agreementRates: [],
        _guardFiredCount: 0,
        _perJudge: {},
      };
    }
    const bucket = sc.models[trial.model];
    bucket.trialCount++;
    bucket._detChecks.push(...(trial.deterministic ?? []));

    for (const c of trial.deterministic ?? []) {
      if (!c.pass) {
        failedChecks.push({
          scenarioId: trial.scenarioId,
          model: trial.model,
          trial: trial.trial,
          source: "deterministic",
          id: c.id,
          tier: c.tier,
          detail: clip(c.detail, 180),
        });
      }
    }

    if (trial.rubric) {
      if (typeof trial.rubric.agreementRate === "number") {
        bucket._agreementRates.push(trial.rubric.agreementRate);
      }
      for (const item of trial.rubric.items ?? []) {
        bucket._rubricItems.push(item);
        if (!item.pass) {
          failedChecks.push({
            scenarioId: trial.scenarioId,
            model: trial.model,
            trial: trial.trial,
            source: "rubric",
            id: item.id,
            tier: item.tier,
            disputed: item.disputed,
            detail: clip(
              Object.entries(item.judges ?? {})
                .map(([j, v]) => `${j}=${v.pass ? "PASS" : "FAIL"} (${clip(v.evidence, 90)})`)
                .join("; "),
              220,
            ),
          });
        }
        if (item.disputed) {
          disputedItems.push({
            scenarioId: trial.scenarioId,
            model: trial.model,
            trial: trial.trial,
            id: item.id,
            tier: item.tier,
            verdicts: Object.fromEntries(
              Object.entries(item.judges ?? {}).map(([j, v]) => [j, Boolean(v.pass)]),
            ),
          });
        }
        for (const [jName, verdict] of Object.entries(item.judges ?? {})) {
          if (!bucket._perJudge[jName]) bucket._perJudge[jName] = { passed: 0, total: 0 };
          bucket._perJudge[jName].total++;
          if (verdict.pass) bucket._perJudge[jName].passed++;
        }
      }
    }

    bucket._wordCounts.push(...(trial.telemetry?.wordCounts ?? []));
    if (typeof trial.telemetry?.durationMs === "number") bucket._durations.push(trial.telemetry.durationMs);
    if (typeof trial.telemetry?.totalCostUsd === "number") bucket._costs.push(trial.telemetry.totalCostUsd);
    if (trial.telemetry?.guardFired) bucket._guardFiredCount++;
  }

  // Finalize per-scenario × model aggregates
  const allDetChecks = [];
  const allRubricItems = [];
  const allAgreements = [];

  for (const sc of Object.values(scenarios)) {
    for (const [model, b] of Object.entries(sc.models)) {
      allDetChecks.push(...b._detChecks);
      allRubricItems.push(...b._rubricItems);
      allAgreements.push(...b._agreementRates);

      const combinedChecks = [...b._detChecks, ...b._rubricItems];
      const perJudge = {};
      for (const [jName, counts] of Object.entries(b._perJudge)) {
        perJudge[jName] = {
          passed: counts.passed,
          total: counts.total,
          passRate: pct(counts.passed, counts.total),
        };
      }

      sc.models[model] = {
        trials: b.trialCount,
        tiers: summarizeChecksByTier(combinedChecks),
        deterministicTiers: summarizeChecksByTier(b._detChecks),
        rubricTiers: summarizeChecksByTier(b._rubricItems),
        agreementRate: b._agreementRates.length
          ? Number(
              (
                b._agreementRates.reduce((s, v) => s + v, 0) / b._agreementRates.length
              ).toFixed(4),
            )
          : null,
        perJudge,
        medianWords: median(b._wordCounts),
        medianDurationMs: Math.round(median(b._durations)),
        totalCostUsd: Number(b._costs.reduce((s, v) => s + v, 0).toFixed(4)),
        guardFiredTrials: b._guardFiredCount,
      };
    }
  }

  // Summarize comprehension trials compactly
  const comprehensionSummary = (runData.comprehension ?? []).map((c) => ({
    exercise: c.exercise,
    model: c.model,
    checks: c.checks,
    confusionsCount: (c.output?.confusions ?? []).length,
    confusions: (c.output?.confusions ?? []).slice(0, 3).map((cf) => ({
      quote: clip(cf.quote, 90),
      issue: clip(cf.issue, 130),
    })),
    durationMs: c.durationMs ?? null,
    totalCostUsd: c.totalCostUsd ?? null,
  }));

  const overallCombined = [
    ...allDetChecks,
    ...allRubricItems,
    ...(runData.hookStringLint?.checks ?? []),
    ...(runData.staticReadability?.documents ?? []).flatMap((d) => d.checks ?? []),
    ...comprehensionSummary.flatMap((c) => c.checks ?? []),
  ];

  const compactStaticReadability = runData.staticReadability
    ? {
        summary: runData.staticReadability.summary,
        documents: (runData.staticReadability.documents ?? []).map((d) => ({
          id: d.id,
          isTemplate: d.isTemplate,
          hasPackageJson: d.hasPackageJson,
          metrics: d.metrics,
          spelling: d.spelling,
          checks: d.checks,
        })),
      }
    : null;

  return {
    schemaVersion: 1,
    metadata: runData.metadata ?? {},
    overall: {
      tiers: summarizeChecksByTier(overallCombined),
      behavioralTiers: summarizeChecksByTier([...allDetChecks, ...allRubricItems]),
      agreementRate: allAgreements.length
        ? Number((allAgreements.reduce((s, v) => s + v, 0) / allAgreements.length).toFixed(4))
        : null,
      disputedCount: disputedItems.length,
    },
    scenarios,
    hookStringLint: runData.hookStringLint ?? null,
    staticReadability: compactStaticReadability,
    comprehension: comprehensionSummary,
    failedChecks,
    disputedItems,
  };
}

/**
 * Render a readable GitHub-friendly Markdown report from a compact summary.
 */
export function renderMarkdownReport(summary) {
  const m = summary.metadata ?? {};
  const lines = [];
  lines.push(`# Eval Baseline: ${m.label ?? m.gitTag ?? "run"}`);
  lines.push("");
  lines.push(`- **Date:** ${m.date ?? "unknown"}`);
  lines.push(`- **Git:** \`${m.gitCommit ?? "unknown"}\` (${m.gitTag ?? "untagged"})`);
  lines.push(`- **Suite:** \`${m.suite ?? "unknown"}\` | **Trials:** ${m.trials ?? 1}`);
  lines.push(`- **Subject Models:** ${(m.models ?? []).join(", ") || "none"}`);
  lines.push(`- **Judge Panel:** ${(m.judges ?? []).join(", ") || "none"}`);
  if (m.cliVersions) {
    lines.push(
      `- **CLI Versions:** ${Object.entries(m.cliVersions)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    );
  }
  if (m.reproCommand) {
    lines.push(`- **Reproduce:** \`${m.reproCommand}\``);
  }
  lines.push("");

  // Overall tier summary
  const ov = summary.overall?.tiers ?? {};
  lines.push("## Overall Summary");
  lines.push("");
  lines.push("| Tier | Passed | Total | Pass Rate |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const tier of ["hard", "target", "soft"]) {
    const t = ov[tier] ?? { passed: 0, total: 0, passRate: null };
    lines.push(`| \`${tier}\` | ${t.passed} | ${t.total} | ${formatPct(t.passRate)} |`);
  }
  if (summary.overall?.agreementRate !== null && summary.overall?.agreementRate !== undefined) {
    lines.push("");
    lines.push(
      `Inter-judge agreement: **${formatPct(summary.overall.agreementRate)}** (${summary.overall.disputedCount ?? 0} disputed rubric item(s)).`,
    );
  }
  lines.push("");

  // Behavioral scenarios table
  const scenarioEntries = Object.entries(summary.scenarios ?? {});
  if (scenarioEntries.length) {
    lines.push("## Behavioral Scenarios");
    lines.push("");
    lines.push("| Scenario | Model | Hard | Target | Soft | Agreement | Med Words | Guard Fired |");
    lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const [id, sc] of scenarioEntries) {
      for (const [model, st] of Object.entries(sc.models ?? {})) {
        lines.push(
          `| \`${id}\` | ${model} | ${formatPct(st.tiers.hard.passRate)} | ${formatPct(st.tiers.target.passRate)} | ${formatPct(st.tiers.soft.passRate)} | ${formatPct(st.agreementRate)} | ${st.medianWords} | ${st.guardFiredTrials}/${st.trials} |`,
        );
      }
    }
    lines.push("");
  }

  // Deterministic #29 hook string lint
  if (summary.hookStringLint) {
    const hl = summary.hookStringLint;
    lines.push("## Hook & Script String Lint (`#29`)");
    lines.push("");
    lines.push(`- Median \`reason.mjs\` block length: **${hl.medianReasonWords} words**`);
    lines.push("");
    lines.push("| Check | Tier | Status | Detail |");
    lines.push("| --- | --- | --- | --- |");
    for (const c of hl.checks ?? []) {
      lines.push(`| \`${c.id}\` | \`${c.tier}\` | ${c.pass ? "PASS" : "FAIL"} | ${c.detail} |`);
    }
    lines.push("");
  }

  // Static README lint
  if (summary.staticReadability?.documents?.length) {
    lines.push("## README Static Readability & Lint");
    lines.push("");
    lines.push("| Document | Lines | Words | Est. Tokens | FK Grade | Hard | Target | Notable Failures |");
    lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
    for (const d of summary.staticReadability.documents) {
      const hard = d.checks.filter((c) => c.tier === "hard");
      const target = d.checks.filter((c) => c.tier === "target");
      const fails = d.checks.filter((c) => !c.pass).map((c) => `\`${c.id}\``).join(", ") || "—";
      lines.push(
        `| \`${d.id}\` | ${d.metrics.lines} | ${d.metrics.words} | ${d.metrics.estimatedTokens} | ${d.metrics.fleschKincaidGrade} | ${hard.filter((c) => c.pass).length}/${hard.length} | ${target.filter((c) => c.pass).length}/${target.length} | ${fails} |`,
      );
    }
    lines.push("");
  }

  // Simulated-student comprehension
  if ((summary.comprehension ?? []).length) {
    lines.push("## Simulated-Student README Comprehension");
    lines.push("");
    lines.push("| Exercise | Model | Checks Passed | Confusions Reported |");
    lines.push("| --- | --- | ---: | ---: |");
    for (const c of summary.comprehension) {
      const passed = (c.checks ?? []).filter((x) => x.pass).length;
      const total = (c.checks ?? []).length;
      lines.push(`| \`${c.exercise}\` | ${c.model} | ${passed}/${total} | ${c.confusionsCount} |`);
    }
    lines.push("");
  }

  // Highlighted failures & disputes (hard -> target -> soft, with truncation notice)
  if ((summary.failedChecks ?? []).length) {
    const tierOrder = { hard: 0, target: 1, soft: 2 };
    const sortedFailures = [...summary.failedChecks].sort(
      (a, b) => (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9),
    );
    const maxListed = 40;
    lines.push("## Highlighted Behavioral Failures");
    lines.push("");
    for (const f of sortedFailures.slice(0, maxListed)) {
      const disp = f.disputed ? " *(disputed)*" : "";
      lines.push(
        `- \`${f.scenarioId}\` (${f.model}, trial ${f.trial}) [\`${f.tier}\` / ${f.source}] \`${f.id}\`${disp}: ${f.detail}`,
      );
    }
    if (sortedFailures.length > maxListed) {
      lines.push("");
      lines.push(
        `> _Showing ${maxListed} of ${sortedFailures.length} failed checks (sorted by tier: hard → target → soft). See the JSON summary for the complete list._`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

/**
 * Render a concise terminal summary table.
 */
export function renderTerminalSummary(summary) {
  const lines = [];
  const ov = summary.overall?.tiers ?? {};
  lines.push(
    `\n=== Eval Summary (${summary.metadata?.label ?? summary.metadata?.suite ?? "run"}) ===`,
  );
  lines.push(
    `Overall: hard=${formatPct(ov.hard?.passRate)} (${ov.hard?.passed ?? 0}/${ov.hard?.total ?? 0}) | target=${formatPct(ov.target?.passRate)} (${ov.target?.passed ?? 0}/${ov.target?.total ?? 0}) | soft=${formatPct(ov.soft?.passRate)} (${ov.soft?.passed ?? 0}/${ov.soft?.total ?? 0}) | judge-agree=${formatPct(summary.overall?.agreementRate)}`,
  );

  for (const [id, sc] of Object.entries(summary.scenarios ?? {})) {
    for (const [model, st] of Object.entries(sc.models ?? {})) {
      lines.push(
        `  ${id.padEnd(28)} ${model.padEnd(7)} hard=${formatPct(st.tiers.hard.passRate).padStart(4)}  target=${formatPct(st.tiers.target.passRate).padStart(4)}  soft=${formatPct(st.tiers.soft.passRate).padStart(4)}  words=${String(st.medianWords).padStart(3)}  agree=${formatPct(st.agreementRate).padStart(4)}`,
      );
    }
  }

  if (summary.hookStringLint) {
    const hl = summary.hookStringLint;
    lines.push(
      `  [hook-lint #29] medianReasonWords=${hl.medianReasonWords}, camelLeaks=${(hl.camelLeaks ?? []).length}, jargonHits=${(hl.jargonHits ?? []).length}`,
    );
  }
  if (summary.staticReadability?.summary) {
    const rs = summary.staticReadability.summary;
    lines.push(
      `  [readme-static] docs=${rs.documentCount}, avgTokens=${rs.avgExerciseTokens}, hard=${rs.hardPassed}/${rs.hardTotal}, target=${rs.targetPassed}/${rs.targetTotal}`,
    );
  }
  return lines.join("\n");
}

export function writeRunOutputs({
  resultsDir,
  baselineDir = null,
  label,
  runData,
  summary,
  markdown,
}) {
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(join(resultsDir, "full.json"), `${JSON.stringify(runData, null, 2)}\n`, "utf8");
  writeFileSync(join(resultsDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(join(resultsDir, "report.md"), markdown, "utf8");

  if (baselineDir && label) {
    mkdirSync(baselineDir, { recursive: true });
    writeFileSync(join(baselineDir, `${label}.json`), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    writeFileSync(join(baselineDir, `${label}.md`), markdown, "utf8");
  }
}
