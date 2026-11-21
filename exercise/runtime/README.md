# <FILL: project name>

<FILL: module name and duration, one line, without the module number, which differs between courses. "Advanced React II: Next.js.
Solo project, two days." or "Five days full time, ten days part time. Group
project with a presentation at the end.">

<FILL: what students build, in two to four sentences. Name the data source and
link a demo if the assessment has one.>

<FILL: variant note, or delete this paragraph if the project has no variants.>

## How you work

<If the project has package.json, start step 1 with "Run `npm install` (or `npm ci`), then `/onboard`." For a solo project (onboarding false), delete step 2, renumber, and replace the last step with a local merge: "Merge the branch into `main` and push it", the three commands, and one sentence saying a Pull Request is optional because there is nobody to review it.>

<If unlockRoute is false, end the "Write the code" step with "This step is done
when you have committed and explained it." No sign-off is recorded, and nothing
opens up task by task. The two flags are independent, so check each one.>

1. Run `/onboard`. It puts this repo on GitHub and checks your setup. <FILL: for
   a group project, "One of you runs it and adds the others as collaborators.
   The others clone that repo instead of setting the project up again."> This
   step is done when all checks pass<FILL: for a group project, ", except the
   `PLAN.md` check, which step 2 fixes">.
2. Meet as a group and write `PLAN.md` together. This step is done when the
   `PLAN.md` check passes. Until then, the agent writes no code for anyone in
   the group.
3. Pick a task and create a branch for it, for example
   `git switch -c FR001-<short-name>`.
4. Write the code, commit it, and explain it to the agent. This step is done when
   the agent records your sign-off. See "Write it, commit it, explain it" below.
5. Open a Pull Request. This step is done when it is merged. Then go back to step 3.

## Requirements

<FILL: the requirement table. Keep the ids. Rewrite each requirement as one or
two full sentences. Bold the id of every requirement that appears in tasks[].>

You write the bold tasks yourself. <If some requirements are not bold, add: "For
the others, you can ask the agent for help." If unlockRoute is false, add: "The
bold tasks stay yours for the whole exercise.">

<FILL: if tasks[].file names files the student creates (preScaffold), list each
file with its task ids and say that a task's commit must change its file.
Otherwise delete this paragraph.>

<FILL: things the requirements don't mention but students will run into, as a
short list, or delete this subsection.>

## Setup

<FILL: what the project is built with, and what students must not add during the
project. Name the libraries. For a group project, the reason is that a new package
can break everyone else's clone. For a solo project, the reason is that the
package would do the work the exercise practices.>

<FILL: how to install and run it, and which files differ from the generator's
template, if any.>

<FILL: the local file students create and never commit, or delete this paragraph.
If it holds a credential, say that ignoring the file does not protect a secret
that was already committed, and what to do if that happens.>

## What you write yourself

<FILL: the protected topics as a short list, named as topics, not API names.
Then: "The agent won't write any of these for you until you have written one
yourself, committed it, and explained it.">

You can ask the agent to help with everything else:

<FILL: the open work as a list.>

The agent edits code only when you ask — an empty file or task list isn't a
request. Whenever placement, scope, naming, or behavior is still open, it asks
you a question and waits for your answer before editing.

These rules are also written down so you know what a regular browser chat could
give away. Following the workflow here is your choice.

## Write it, commit it, explain it

When you finish a bold task:

1. Write the code.
2. Commit it with
   `git add <file> && git commit --signoff -m "<task id>: <what it does>"`.
3. Explain it. The agent asks what your commit does and up to three short
   follow-up questions (more for larger commits, fewer for small ones).

Explaining your code helps you check your own understanding. It's not graded or
recorded.

<If unlockRoute is false, delete the next two paragraphs and write instead: "The
bold tasks stay yours for the whole exercise.">

Once you finish and explain one task for a topic, the agent may write that topic
with you for the rest of the project, including features beyond the
requirements.

The agent tracks completed tasks per git email under `.claude/harness/progress/`.
Commit that file with your work. Ask the agent at any time which tasks you have
completed.

### Signing your commits

`git commit --signoff` adds a `Signed-off-by: Name <email>` line to show you
wrote the code (use it on all your own commits). When the agent writes or helps
with a commit, it adds `Co-Authored-By: Claude …` instead so `git log` shows
who wrote what.

### Reviewing a teammate's code counts

<Delete this subsection when onboarding is false, because a solo student has no
teammate to review. Also delete it when unlockRoute is false, because a review is
a second way to open a topic, and nothing opens in that case.>

You can also unlock a topic by reviewing a teammate's Pull Request on GitHub
(even if already merged) and answering the agent's questions about their code.
You can never have more reviewed tasks than written ones, so everyone writes
their first task themselves.

## Before you write code

<For a group project (onboarding true), delete this section and keep "Before any
of that: PLAN.md". For a solo project, keep this section only if the interview
named a decision the student must make before coding. Put that decision here as
one question with a short explanation. The onboard skill asks exactly the
questions this section names. If there is no such decision, delete the section,
and the onboard skill asks nothing.>

## Before any of that: PLAN.md

<Delete this section when onboarding is false.>

The agent writes no code for anyone in the group until `PLAN.md` exists and every
member listed in it has at least one task. Meet first on a shared screen and
write it together.

`PLAN.md` has two parts: first, a short description in your own words of what
you are building, who uses it, and what is in or out of scope; second, the
initial split listing every member with their `git config user.email` and every
task with its owner's name:

```markdown
## Members

- Jane Student — jane.student@mail.com
- Mo Ahmadi — mo.ahmadi@mail.com

## Tasks

- <FILL: real task title> (<id>) — Jane
- <FILL: real task title> (<id>) — Mo Ahmadi
```

Use a list, table, or prose in German or English. Run `/onboard` to check it —
the agent points out unclaimed work or overlaps, and re-reads `PLAN.md` live on
every code write. If someone leaves the group, remove them from the member list.
A rough plan is enough, and you can change it later.

## Splitting the work

<Delete this section when onboarding is false.>

After kickoff, move active tasks into GitHub Issues (`/onboard` can create them
from `PLAN.md`; changes don't sync back). Write issues yourselves — the agent
can flag uneven loads, dependencies, or shared files.

<FILL: one sentence naming the files or requirements where everyone's work meets,
so the group knows where merge conflicts will happen. Delete the sentence if
nothing in this project works that way.> Resolve merge conflicts together. Ask for
help if you are stuck for more than 30 minutes, and use daily stand-ups.

## Running it

Open this folder at the repository root in VS Code and start Claude Code there
(not in a subfolder, or hooks and settings won't load). Keep the same git email
on every machine so your progress stays under one record.

To adjust how the agent talks to you (such as shorter answers or simpler
language), ask it to save a personal skill in `~/.claude/skills/`. That skill
cannot change which files or topics stay yours.

`.vscode/settings.json` turns off inline ghost-text suggestions, and `README.md`,
`CLAUDE.md`, `AGENTS.md`, <Delete "`PLAN.md`, " when onboarding is false.>
`PLAN.md`, and the `.claude/` setup files are read-only so neither you nor the
agent edits the rules by mistake. If you use another coding agent (Codex, Gemini
CLI, Copilot, or Cursor), point it to `AGENTS.md` — only Claude Code enforces
these rules with hooks.

If a requirement seems wrong or unclear, talk to your instructor. These locks
are here to help you learn.
