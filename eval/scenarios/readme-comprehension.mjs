import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EXERCISE_ROOT, loadCurriculum, loadExerciseConfig } from "../lib/sandbox.mjs";
import { runIsolatedClaudeJson } from "../lib/claude-runner.mjs";

export const COMPREHENSION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "firstStep",
    "requiresPlanMd",
    "canUnlockProtectedTopics",
    "requiresPullRequest",
    "requiresInitialNpmInstall",
    "studentOwnedTopics",
    "agentOpenTopics",
    "confusions",
  ],
  properties: {
    firstStep: { type: "string" },
    requiresPlanMd: { type: "boolean" },
    canUnlockProtectedTopics: { type: "boolean" },
    requiresPullRequest: { type: "boolean" },
    requiresInitialNpmInstall: { type: "boolean" },
    studentOwnedTopics: {
      type: "array",
      items: { type: "string" },
    },
    agentOpenTopics: {
      type: "array",
      items: { type: "string" },
    },
    confusions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quote", "issue"],
        properties: {
          quote: { type: "string" },
          issue: { type: "string" },
        },
      },
    },
  },
};

export function buildComprehensionPrompt(exerciseId, readmeText) {
  return `You are a beginner web-development bootcamp student reading this assignment README for the very first time.
Answer strictly from the README below — do not guess or invent rules that aren't written here.

Questions to answer in the structured JSON response:
1. \`firstStep\`: What is the very first command or action you are supposed to take?
2. \`requiresPlanMd\`: Does this assignment require writing a \`PLAN.md\` file before the AI agent can write code?
3. \`canUnlockProtectedTopics\`: After you write and explain one task of a protected kind of code, can the AI agent write that kind of code with you for the rest of the exercise?
4. \`requiresPullRequest\`: Are Pull Requests required to merge your work into \`main\`?
5. \`requiresInitialNpmInstall\`: Does initial setup (Week 1 / before writing code) require running \`npm install\` or \`npm ci\`?
6. \`studentOwnedTopics\`: Short list of topics/code you must write yourself.
7. \`agentOpenTopics\`: Short list of work you can ask the AI agent to help with.
8. \`confusions\`: Any contradictions, unclear instructions, wrong task IDs, or leftover copy-paste bugs you notice (quote the exact phrase and explain the issue; empty array if none).

--- BEGIN README (${exerciseId}) ---
${readmeText}
--- END README ---`;
}

export function gradeComprehensionOutput({ exerciseId, config, hasPackageJson, output }) {
  const expectsPlan = config.onboarding !== false;
  const expectsUnlock = config.unlockRoute !== false;
  const expectsPr = config.onboarding !== false;
  const expectsNpm = Boolean(hasPackageJson);

  // On html (unlockRoute: false), v0.14.1 README has the #15 contradiction, so unlock-route is [target]
  const unlockTier = expectsUnlock ? "hard" : "target";
  const npmTier = expectsNpm ? "target" : "hard";

  return [
    {
      id: "comprehension-first-step-onboard-or-npm",
      tier: "hard",
      pass: /(\/onboard|npm\s+(install|ci))/i.test(String(output.firstStep ?? "")),
      detail: `firstStep="${output.firstStep}"`,
    },
    {
      id: "comprehension-plan-md",
      tier: "hard",
      pass: output.requiresPlanMd === expectsPlan,
      detail: `student=${output.requiresPlanMd}, expected=${expectsPlan} (${exerciseId})`,
    },
    {
      id: "comprehension-unlock-route",
      tier: unlockTier,
      pass: output.canUnlockProtectedTopics === expectsUnlock,
      detail: `student=${output.canUnlockProtectedTopics}, expected=${expectsUnlock} (${exerciseId})`,
    },
    {
      id: "comprehension-pull-request",
      tier: "hard",
      pass: output.requiresPullRequest === expectsPr,
      detail: `student=${output.requiresPullRequest}, expected=${expectsPr} (${exerciseId})`,
    },
    {
      id: "comprehension-npm-install",
      tier: npmTier,
      pass: output.requiresInitialNpmInstall === expectsNpm,
      detail: `student=${output.requiresInitialNpmInstall}, expected=${expectsNpm} (hasPackageJson=${expectsNpm})`,
    },
    {
      id: "comprehension-topics-populated",
      tier: "hard",
      pass:
        Array.isArray(output.studentOwnedTopics) &&
        output.studentOwnedTopics.length > 0 &&
        Array.isArray(output.agentOpenTopics) &&
        output.agentOpenTopics.length > 0,
      detail: `studentOwned=${(output.studentOwnedTopics ?? []).length}, agentOpen=${(output.agentOpenTopics ?? []).length}`,
    },
  ];
}

export async function runComprehensionEval({ exerciseId, model = "sonnet" }) {
  const overlayDir = join(EXERCISE_ROOT, "exercises", exerciseId, "overlay");
  const readmeText = readFileSync(join(overlayDir, "README.md"), "utf8");
  const config = loadExerciseConfig(exerciseId);
  const hasPackageJson = existsSync(join(overlayDir, "package.json"));

  const prompt = buildComprehensionPrompt(exerciseId, readmeText);
  const res = await runIsolatedClaudeJson({
    prompt,
    model,
    jsonSchema: COMPREHENSION_SCHEMA,
  });

  const checks = gradeComprehensionOutput({
    exerciseId,
    config,
    hasPackageJson,
    output: res.output,
  });

  return {
    exercise: exerciseId,
    model,
    output: res.output,
    checks,
    durationMs: res.durationMs,
    totalCostUsd: res.totalCostUsd,
    usage: res.usage,
  };
}

export function listComprehensionExercises() {
  return loadCurriculum();
}
