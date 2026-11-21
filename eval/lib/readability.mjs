import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EXERCISE_ROOT, loadCurriculum, loadExerciseConfig } from "./sandbox.mjs";

const SPELLING_PAIRS = [
  { uk: /\bpractis(e|es|ed|ing)\b/gi, us: /\bpractic(e|es|ed|ing)\b/gi, label: "practise/practice" },
  { uk: /\bfavourit(e|es)\b/gi, us: /\bfavorit(e|es)\b/gi, label: "favourites/favorites" },
  { uk: /\bbehavio(u)r(s)?\b/gi, us: /\bbehavior(s)?\b/gi, label: "behaviour/behavior" },
  { uk: /\brecognis(e|es|ed|ing)\b/gi, us: /\brecogniz(e|es|ed|ing)\b/gi, label: "recognise/recognize" },
  { uk: /\bapologis(e|es|ed|ing)\b/gi, us: /\bapologiz(e|es|ed|ing)\b/gi, label: "apologise/apologize" },
  { uk: /\bjudgement(s)?\b/gi, us: /\bjudgment(s)?\b/gi, label: "judgement/judgment" },
];

function stripCodeBlocks(markdown) {
  return String(markdown ?? "").replace(/```[\s\S]*?```/g, "");
}

function countSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  const trimmed = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/**
 * Compute static prose readability metrics on a Markdown document.
 */
export function computeProseMetrics(markdown) {
  const raw = String(markdown ?? "");
  const lines = raw === "" ? 0 : raw.replace(/\n$/, "").split("\n").length;
  const allWords = raw.trim() ? raw.trim().split(/\s+/).filter(Boolean) : [];
  const words = allWords.length;
  // Approximate LLM prompt token footprint (~4 chars per token for English Markdown)
  const estimatedTokens = Math.ceil(raw.length / 4);

  // Strip code blocks, tables, markdown markers, and URLs for prose readability scoring
  const prose = stripCodeBlocks(raw)
    .replace(/`[^`]*`/g, "code")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/^\|.*\|$/gm, "")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_~>#]/g, " ")
    .trim();

  const sentences = prose
    .split(/[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => /[a-zA-Z]/.test(s));
  const proseWords = prose.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = Math.max(1, proseWords.length);
  const syllableCount = proseWords.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgSentenceLength = Number((proseWords.length / sentenceCount).toFixed(2));
  const fleschKincaidGrade = Number(
    (0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59).toFixed(2),
  );

  return {
    lines,
    words,
    chars: raw.length,
    estimatedTokens,
    avgSentenceLength,
    fleschKincaidGrade,
  };
}

function extractSection(markdown, headingText) {
  const lines = String(markdown ?? "").split("\n");
  const target = `## ${headingText}`.trim().toLowerCase();
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() === target) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function findSpellingDrift(markdown) {
  const prose = stripCodeBlocks(markdown).replace(/`[^`]*`/g, "");
  const ukMatches = [];
  const usMatches = [];
  for (const pair of SPELLING_PAIRS) {
    const uks = prose.match(pair.uk) ?? [];
    const uss = prose.match(pair.us) ?? [];
    for (const m of uks) ukMatches.push({ word: m.toLowerCase(), pair: pair.label });
    for (const m of uss) usMatches.push({ word: m.toLowerCase(), pair: pair.label });
  }
  return {
    ukWords: [...new Set(ukMatches.map((m) => m.word))],
    usWords: [...new Set(usMatches.map((m) => m.word))],
    ukCount: ukMatches.length,
    usCount: usMatches.length,
  };
}

/**
 * Lint a single README (either runtime template or packaged exercise overlay).
 */
export function lintReadme({
  id,
  markdown,
  config = null,
  hasPackageJson = false,
  isTemplate = false,
}) {
  const raw = String(markdown ?? "");
  const metrics = computeProseMetrics(raw);
  const checks = [];

  // 1. Zero <FILL: placeholders in overlay READMEs (hard)
  const fillHits = raw.match(/<FILL:[^>]*>/g) ?? [];
  if (!isTemplate) {
    checks.push({
      id: "no-fill-placeholders",
      tier: "hard",
      pass: fillHits.length === 0,
      detail:
        fillHits.length === 0
          ? "Zero <FILL:> placeholders"
          : `Found ${fillHits.length} <FILL:> placeholder(s)`,
    });
  }

  // 2. Zero retired phrases matching /\bmarks?\s+the\s+exercise\s+as\s+done\b/i (target for #15)
  const retiredHits = raw.match(/\bmarks?\s+the\s+exercise\s+as\s+done\b/gi) ?? [];
  checks.push({
    id: "no-retired-done-phrase",
    tier: "target",
    pass: retiredHits.length === 0,
    detail:
      retiredHits.length === 0
        ? "No retired 'mark(s) the exercise as done' phrase"
        : `Found retired phrase: ${retiredHits.join(", ")}`,
  });

  // 3. Zero leaked internal hook commands in student-facing sections (hard)
  const hookLeaks =
    raw.match(
      /(\.claude\/hooks\/|\bonboard\.mjs\b|\bsignoff\.mjs\b|\bguard\.mjs\b|\bbash-guard\.mjs\b)/g,
    ) ?? [];
  checks.push({
    id: "no-leaked-hook-commands",
    tier: "hard",
    pass: hookLeaks.length === 0,
    detail:
      hookLeaks.length === 0
        ? "No leaked internal hook commands"
        : `Leaked hook command(s): ${[...new Set(hookLeaks)].join(", ")}`,
  });

  // 4. Student README spelling consistency (US English convention; target for #33)
  const spelling = findSpellingDrift(raw);
  const hasSpellingDrift = spelling.ukCount > 0; // Flag UK spellings against US English README standard
  checks.push({
    id: "spelling-consistency",
    tier: "target",
    pass: !hasSpellingDrift,
    detail: !hasSpellingDrift
      ? `Consistent spelling (UK=${spelling.ukCount}, US=${spelling.usCount})`
      : `UK spellings found (${spelling.ukWords.join(", ")}); US spellings (${spelling.usWords.join(", ") || "none"})`,
  });

  // 5. One-way parity checks for overlay READMEs with config.json (hard)
  if (!isTemplate && config) {
    const boldIds = new Set();
    const boldRe = /\*\*([A-Za-z0-9_-]+)\*\*/g;
    let m;
    while ((m = boldRe.exec(raw)) !== null) {
      boldIds.add(m[1]);
    }
    const missingTasks = (config.tasks ?? [])
      .map((t) => t.id)
      .filter((taskId) => !boldIds.has(taskId));
    checks.push({
      id: "task-bold-parity",
      tier: "hard",
      pass: missingTasks.length === 0,
      detail:
        missingTasks.length === 0
          ? `All ${(config.tasks ?? []).length} config.tasks IDs are bolded in README`
          : `Missing bold task IDs: ${missingTasks.join(", ")}`,
    });

    const hasPlanSection = /^##\s+.*PLAN\.md/m.test(raw);
    const expectsPlan = config.onboarding !== false;
    checks.push({
      id: "plan-section-parity",
      tier: "hard",
      pass: hasPlanSection === expectsPlan,
      detail:
        hasPlanSection === expectsPlan
          ? `PLAN.md section matches config.onboarding=${expectsPlan}`
          : `Mismatch: hasPlanSection=${hasPlanSection}, config.onboarding=${expectsPlan}`,
    });

    // 6. `## How you work` install check (target for #32 #7)
    const howYouWork = extractSection(raw, "How you work") ?? "";
    const mentionsNpmInstall = /\bnpm\s+(install|ci)\b/i.test(howYouWork);
    const installPass = !hasPackageJson || mentionsNpmInstall;
    checks.push({
      id: "how-you-work-npm-install",
      tier: "target",
      pass: installPass,
      detail: !hasPackageJson
        ? "n/a (no package.json in overlay)"
        : mentionsNpmInstall
          ? "`## How you work` mentions `npm install`/`npm ci`"
          : "`package.json` exists in overlay, but `## How you work` omits `npm install`/`npm ci`",
    });
  }

  return {
    id,
    isTemplate,
    hasPackageJson,
    metrics,
    spelling,
    checks,
  };
}

/**
 * Run static readability and consistency checks on exercise/runtime/README.md
 * and all 7 packaged exercise READMEs (0 LLM calls).
 */
export function runStaticReadabilitySuite() {
  const documents = [];

  const runtimeReadmePath = join(EXERCISE_ROOT, "runtime", "README.md");
  documents.push(
    lintReadme({
      id: "runtime",
      markdown: readFileSync(runtimeReadmePath, "utf8"),
      config: null,
      hasPackageJson: false,
      isTemplate: true,
    }),
  );

  for (const exerciseId of loadCurriculum()) {
    const overlayDir = join(EXERCISE_ROOT, "exercises", exerciseId, "overlay");
    const readmePath = join(overlayDir, "README.md");
    const config = loadExerciseConfig(exerciseId);
    const hasPackageJson = existsSync(join(overlayDir, "package.json"));
    documents.push(
      lintReadme({
        id: exerciseId,
        markdown: readFileSync(readmePath, "utf8"),
        config,
        hasPackageJson,
        isTemplate: false,
      }),
    );
  }

  const totalTokens = documents
    .filter((d) => !d.isTemplate)
    .reduce((sum, d) => sum + d.metrics.estimatedTokens, 0);
  const avgTokens = Math.round(
    totalTokens / Math.max(1, documents.filter((d) => !d.isTemplate).length),
  );

  const allChecks = documents.flatMap((d) => d.checks.map((c) => ({ doc: d.id, ...c })));
  const summary = {
    documentCount: documents.length,
    avgExerciseTokens: avgTokens,
    totalExerciseTokens: totalTokens,
    hardPassed: allChecks.filter((c) => c.tier === "hard" && c.pass).length,
    hardTotal: allChecks.filter((c) => c.tier === "hard").length,
    targetPassed: allChecks.filter((c) => c.tier === "target" && c.pass).length,
    targetTotal: allChecks.filter((c) => c.tier === "target").length,
  };

  return { documents, summary };
}
