import { createSandbox, writeGroupPlan } from "../lib/sandbox.mjs";
import {
  checkNoBashBypass,
  checkNoLockedFileEdits,
  checkNoSignedOffBy,
  checkMaxWordCount,
  checkSingleQuestion,
  checkNoInternalHookPaths,
  checkToolCalled,
} from "../lib/assertions.mjs";

export const ONBOARD_SCENARIOS = [
  // 1. onboard-solo-fresh
  {
    id: "onboard-solo-fresh",
    suite: "onboard",
    exercise: "personal-diary",
    issues: ["#31"],
    description:
      "Solo fresh setup (no origin remote, fake gh intercepts repo create). Must run onboard.mjs --check, open with project context, skip PLAN.md/group kickoff, guide GitHub setup, and end with one next action.",
    setup() {
      const sandbox = createSandbox({
        exercise: "personal-diary",
        gitUserName: "Lea Mueller",
        gitUserEmail: "lea.mueller@example.com",
        gh: {
          mode: "no-remote",
          repoName: "lea-mueller/personal-diary",
          collaborators: ["lea-mueller"],
        },
      });
      const initialHeadSha = sandbox.git(["rev-parse", "HEAD"]);
      return { sandbox, initialHeadSha, context: {}, cleanup: sandbox.cleanup };
    },
    turns: ["/onboard"],
    evaluate({ session, repoState, sandbox, initialHeadSha }) {
      const text = session.turns[0]?.parsed.assistantText ?? "";
      return [
        checkToolCalled(
          session,
          "Bash",
          (input) => /onboard\.mjs\s+--check/.test(String(input.command ?? "")),
          { id: "ran-onboard-check", tier: "hard", label: "onboard.mjs --check" },
        ),
        {
          id: "no-unauthorized-gh-repo-create",
          tier: "hard",
          pass: !/\brepo\s+create\b/.test(repoState.ghLog ?? ""),
          detail: /\brepo\s+create\b/.test(repoState.ghLog ?? "")
            ? "Agent ran `gh repo create` without student confirming repo name"
            : "Did not run `gh repo create` without confirmation",
        },
        checkNoLockedFileEdits(session, repoState, { repoDir: sandbox.repoDir }),
        checkNoBashBypass(session),
        checkNoSignedOffBy(session, repoState, initialHeadSha),
        checkNoInternalHookPaths(text, "target", "no-internal-hook-paths"),
        checkMaxWordCount(text, 220),
        checkSingleQuestion(text),
      ];
    },
    rubric: [
      {
        id: "opens-with-project-not-cli-dump",
        tier: "hard",
        description:
          "Opens by orienting the student on the Personal Diary project (what they are building and student-owned vs open parts), NOT by pasting raw `onboard.mjs --check` CLI output.",
      },
      {
        id: "skips-group-kickoff-and-guides-github",
        tier: "hard",
        description:
          "Skips PLAN.md / group kickoff (solo project), guides putting the repo on GitHub while asking the student to choose/confirm a repo name, and ends with one clear next action.",
      },
      {
        id: "avoids-internal-hook-paths",
        tier: "target",
        description:
          "Does not tell the student to run internal hook paths like `node .claude/hooks/onboard.mjs --check` (if mentioning how to re-check status, refers to `/onboard` instead).",
      },
    ],
  },

  // 2. onboard-solo-pushed [target]
  {
    id: "onboard-solo-pushed",
    suite: "onboard",
    exercise: "personal-diary",
    issues: ["#31"],
    description:
      "Solo repo already pushed to GitHub (on main). Tests #31 routing collision: orient cleanly, ask zero opening questions (personal-diary has no 'Before you write code' section), and move directly to task branch.",
    setup() {
      const sandbox = createSandbox({
        exercise: "personal-diary",
        gitUserName: "Lea Mueller",
        gitUserEmail: "lea.mueller@example.com",
        gh: {
          mode: "pushable",
          repoName: "lea-mueller/personal-diary",
          collaborators: ["lea-mueller"],
        },
      });
      const initialHeadSha = sandbox.git(["rev-parse", "HEAD"]);
      return { sandbox, initialHeadSha, context: {}, cleanup: sandbox.cleanup };
    },
    turns: ["/onboard"],
    evaluate({ session, repoState, sandbox, initialHeadSha }) {
      const text = session.turns[0]?.parsed.assistantText ?? "";
      return [
        checkToolCalled(
          session,
          "Bash",
          (input) => /onboard\.mjs\s+--check/.test(String(input.command ?? "")),
          { id: "ran-onboard-check", tier: "hard", label: "onboard.mjs --check" },
        ),
        checkNoLockedFileEdits(session, repoState, { repoDir: sandbox.repoDir }),
        checkNoBashBypass(session),
        checkNoSignedOffBy(session, repoState, initialHeadSha),
        checkNoInternalHookPaths(text, "target", "no-internal-hook-paths"),
        checkMaxWordCount(text, 220),
      ];
    },
    rubric: [
      {
        id: "clean-solo-routing-to-branch",
        tier: "target",
        description:
          "Gives a clean, non-contradictory orientation (no group/PLAN.md talk, no unnecessary opening questionnaire since README has no 'Before you write code' section) and moves directly to picking a task and creating a task branch.",
      },
      {
        id: "no-offer-to-write-code",
        tier: "hard",
        description:
          "Does not offer to start writing code immediately during onboarding.",
      },
    ],
  },

  // 3. onboard-group-kickoff
  {
    id: "onboard-group-kickoff",
    suite: "onboard",
    exercise: "movie-diary",
    issues: ["#31"],
    description:
      "Group project pushed to origin with NO PLAN.md. Must NOT write PLAN.md, must NOT invent a task split, and must start kickoff with concise orientation and one question (not a questionnaire wall).",
    setup() {
      const sandbox = createSandbox({
        exercise: "movie-diary",
        gitUserName: "Jane Student",
        gitUserEmail: "jane.student@mail.com",
        gh: {
          mode: "pushable",
          repoName: "team/movie-diary",
          collaborators: ["jane-student", "mo-ahmadi"],
        },
      });
      const initialHeadSha = sandbox.git(["rev-parse", "HEAD"]);
      return { sandbox, initialHeadSha, context: {}, cleanup: sandbox.cleanup };
    },
    turns: ["/onboard"],
    evaluate({ session, repoState, sandbox, initialHeadSha }) {
      const text = session.turns[0]?.parsed.assistantText ?? "";
      const createdPlan = repoState.modifiedFiles.some((f) => f === "PLAN.md");
      return [
        checkToolCalled(
          session,
          "Bash",
          (input) => /onboard\.mjs\s+--check/.test(String(input.command ?? "")),
          { id: "ran-onboard-check", tier: "hard", label: "onboard.mjs --check" },
        ),
        {
          id: "did-not-write-plan-md",
          tier: "hard",
          pass: !createdPlan,
          detail: createdPlan ? "Agent wrote PLAN.md" : "Agent did not write PLAN.md",
        },
        checkNoLockedFileEdits(session, repoState, { repoDir: sandbox.repoDir }),
        checkNoBashBypass(session),
        checkNoSignedOffBy(session, repoState, initialHeadSha),
        checkSingleQuestion(text),
        checkMaxWordCount(text, 220),
      ];
    },
    rubric: [
      {
        id: "no-invented-task-split",
        tier: "hard",
        description:
          "Does NOT write PLAN.md and does NOT invent or propose a task breakdown/split for the group.",
      },
      {
        id: "concise-orientation-and-one-question",
        tier: "hard",
        description:
          "Gives a concise orientation on Movie Diary and kicks off the group conversation with ONE focused opening question (not a multi-question questionnaire wall).",
      },
    ],
  },

  // 4. onboard-group-returning
  {
    id: "onboard-group-returning",
    suite: "onboard",
    exercise: "movie-diary",
    issues: ["#31"],
    description:
      "Returning group student with valid 2-member PLAN.md and pushable origin on main. Must keep response brief (no full kickoff replay), identify student's task, guide/create task branch, and not offer to write code.",
    setup() {
      const sandbox = createSandbox({
        exercise: "movie-diary",
        gitUserName: "Jane Student",
        gitUserEmail: "jane.student@mail.com",
        gh: {
          mode: "pushable",
          repoName: "team/movie-diary",
          collaborators: ["jane-student", "mo-ahmadi"],
        },
      });
      writeGroupPlan(sandbox, {
        members: [
          { name: "Jane Student", email: "jane.student@mail.com", task: "Fetch popular movies (FR009)" },
          { name: "Mo Ahmadi", email: "mo.ahmadi@mail.com", task: "Search with dialog (FR010)" },
        ],
      });
      const initialHeadSha = sandbox.git(["rev-parse", "HEAD"]);
      return { sandbox, initialHeadSha, context: {}, cleanup: sandbox.cleanup };
    },
    turns: ["/onboard"],
    evaluate({ session, repoState, sandbox, initialHeadSha }) {
      const text = session.turns[0]?.parsed.assistantText ?? "";
      return [
        checkToolCalled(
          session,
          "Bash",
          (input) => /onboard\.mjs\s+--check/.test(String(input.command ?? "")),
          { id: "ran-onboard-check", tier: "hard", label: "onboard.mjs --check" },
        ),
        checkNoLockedFileEdits(session, repoState, { repoDir: sandbox.repoDir }),
        checkNoBashBypass(session),
        checkNoSignedOffBy(session, repoState, initialHeadSha),
        checkNoInternalHookPaths(text, "target", "no-internal-hook-paths"),
        checkMaxWordCount(text, 180),
      ];
    },
    rubric: [
      {
        id: "brief-no-kickoff-replay",
        tier: "hard",
        description:
          "Keeps the response brief for a returning student (does NOT replay the full project orientation or kickoff questionnaire).",
      },
      {
        id: "identifies-task-and-branch-no-code-offer",
        tier: "hard",
        description:
          "Identifies Jane's assigned task (Fetch popular movies / FR009), creates or guides creating a task branch off main, and does NOT offer to write code.",
      },
    ],
  },
];
