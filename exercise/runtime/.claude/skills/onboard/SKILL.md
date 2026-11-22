---
name: onboard
description: Guide a student through project setup, repository checks, optional group planning, and their first task branch. Use when a student runs /onboard, joins an existing group clone, or needs help after the plan blocks a write.
disable-model-invocation: true
---

# Onboard

Guide the student through setup and into their first task branch. Start with
the project they are building, not a missing file or failed check. Use the
student's language and draw all assignment-specific facts from `README.md`.

## Prepare

Read before replying:

1. `.claude/harness/config.json` (`onboarding`, `planFile`, `tasks`,
   `integrationBranch`).
2. `README.md`.
3. The configured plan file (`PLAN.md` by default), if `onboarding` is not
   `false` and the file exists.

Then run:

```text
node .claude/hooks/onboard.mjs --check
```

Do not paste raw CLI output or mention internal `.claude/hooks/` script paths to
the student (tell them to rerun `/onboard` when they need a re-check).

## Shared setup blockers

Handle any failed setup check first:

- **Not on GitHub (`no origin`):** Explain that pull requests and backups need a
  GitHub remote. In a group project, verify first that no teammate already
  created the repo — everyone must clone that one repo. Ask the student to
  choose and confirm a repository name first (never run `gh repo create` without
  their confirmation). Once confirmed, run:

  ```text
  gh repo create <repo-name> --public --source . --remote origin --push
  ```

  If `gh` is missing or unauthenticated, guide them to create an empty repo on
  github.com and run `git remote add origin <repository-url>` followed by
  `git push -u origin main`. In a group project, remind the creator to add all
  teammates under **Settings → Collaborators**.
- **Read-only repository:** They either lack collaborator access on the group's
  repo or cloned someone else's repo. Explain how to get added or clone the
  group's exact URL instead.
- **Local setup:** Ensure `git config user.email` is set (and stays identical on
  every machine because unlocks are filed under it), verify Claude Code opened
  at the repository root, and mention any local file or account setup from
  `README.md`.

## Solo flow (`onboarding` is `false`)

Skip `PLAN.md`, group kickoff, and GitHub issue creation completely.

- **If setup checks fail:** Give a brief orientation (~100 words: what they are
  building, which parts they write vs. ask help for, and the cycle: branch →
  code → commit → explain → merge locally or via PR), explain the blocker, and
  end with the single next question or action (e.g., asking for a GitHub repo
  name).
- **If checks pass and on `integrationBranch` (`main`):** Give a concise
  orientation (~100–140 words from `README.md`). Ask opening questions **only**
  if `README.md` has a `## Before you write code` section (one at a time, at most
  one follow-up each; if no such section exists, ask zero opening questions).
  Then help pick a first task and create or guide a task branch:
  `git switch -c <task-id>-<short-name>`.
- **If checks pass and already on a task branch:** Briefly state their branch
  and current status, and give only the next action.

## Group flow (`onboarding` is `true`)

Only the initial kickoff runs the full orientation and planning conversation.

- **Returning student (`PLAN.md` passes and checks pass):** Keep the response
  strictly brief (under ~150 words; do **not** replay the project orientation or
  kickoff questionnaire). Confirm setup passes, name their assigned task from
  `PLAN.md` (clarifying ambiguous ownership or mentioning at most one clear
  concern once), offer once to create GitHub issues via
  `node .claude/hooks/onboard.mjs --issues` only if they want it, and create or
  guide their task branch (`git switch -c <task-id>-<short-name>`) if still on
  `integrationBranch`.
- **Plan blocks a write or fails check:** Quote the member/line from the block
  message. Tell the group they can add a task line (name or git email) or remove
  someone who left the project, and let them edit `PLAN.md` themselves. Never
  write or edit `PLAN.md`.
- **Kickoff (`PLAN.md` missing):** Give a brief orientation (~100–130 words from
  `README.md`), explain that `PLAN.md` needs each member once with their
  `git config user.email` and again on at least one task line (list, table, or
  prose in German or English), and open with **one** focused question (*"In your
  own words, what are you building?"*) rather than a multi-question list. As they
  reply, work one question at a time through: intended user, smallest scope,
  member task split (never invent or propose a split yourself), any unclaimed
  work from `README.md`, and overlaps/shared decisions from `README.md`.

## Finish

Close with only the unfinished actions (plus a reminder to rerun `/onboard` if
setup checks are still incomplete). Do **not** offer to write code during
onboarding — treat any prior code request as context only and wait for a new
message naming the first concrete change.
