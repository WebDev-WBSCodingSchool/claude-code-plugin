# <FILL: project name — module>

<FILL: duration, one line. "Five days (full time) / ten days (part time). Group
project, mandatory presentation at the end.">

This repo is your starting point. **Put it on GitHub once<FILL: " for your group" if
this is a group project>**, and `/onboard` walks you through that. <FILL: for a
group project, "One of you does this and adds the others as collaborators; they
clone that repo instead of setting the project up again. One repo, everyone works
in it, and" — for a solo project, "From then on"> every change merges to `main`
through a Pull Request.

<FILL: variant-rename note, or delete this paragraph if the project has no variants>

## Where you are

<If onboarding is false, delete stage 2 and renumber; the other four are true of
every assignment. (This is also the solo case: working alone is `onboarding:
false`, and there is no one to meet or split the plan with.)>

<If unlockRoute is false, reword stage 4's ending. Nothing "opens up" task by task
here. The stage still happens (write it, commit it, and explain it if you want the
self-check), but what gets recorded is one `--done` for the whole exercise, not a
per-task sign-off. See "Write it, commit it, explain it" below. The two flags are
independent: this repo ships both false, but neither implies the other, so check
each on its own.>

Five stages. Each stage names what ends it, which is the part easy to lose sight
of from the inside.

1. **Run `/onboard`, which puts this repo on GitHub, or clone your group's
   copy if a teammate already did.** Ends when the only open item is
   `PLAN.md`. That is stage 2, and it stays open until you get there.
   Everything above it should pass.
2. **Meet, and write `PLAN.md` together.** Ends when the check passes: every
   member listed has a task line, and your own git email is one of them. Until
   then the agent writes no code for anyone in the group.
3. **Pick a task, cut a branch.** `git switch -c <task-id>-<short-name>`. Ends
   when you have a branch for the work instead of committing to `main`.
4. **Write it, commit it, explain it.** Ends when the sign-off is recorded. It
   tells you what just opened up.
5. **Open a Pull Request.** Ends when it is merged. Then return to stage 3 with
   the next task.

## The requirements

<FILL: the requirement table. Ids kept, descriptions rewritten to one readable
line each. Bold the id of every requirement that appears in tasks[].>

**Bold = you type this one yourself.** For the others, you may ask the agent to
help you implement them.

<If unlockRoute is false, add a note here: bold still marks what stays yours to
type, but nothing opens one bold item at a time. The whole set stays yours until
you mark the exercise done (see "Write it, commit it, explain it" below), and then
the write check opens all of it at once. You still have to ask for any change.>

## The setup

<FILL: the setup limit. One authored sentence saying what this project is built out
of and what should not be added mid-project. Prose, never config. The argument is
the cost to the teammates, never the syllabus.>

<FILL: the local-file story, or delete this paragraph. If it is a credential, say
plainly what the stopgap does not protect against and what to do if it lands in the
history anyway.>

## What you type, and where the agent can help

<FILL: which code is theirs and why. One paragraph, naming the topics rather than
the API names.>

**Everything else you may ask the agent to help implement:**

<FILL: what students may ask the agent to help implement, as a list.>

**The agent waits to be asked.** It will not start building because a file is empty
or because your plan is finished. None of this is a to-do list it works through on
its own. Ask it for what you want. Before every code edit, it asks at least one
question about your requested change and waits for your answer.

Yes, this tells you exactly what you could paste into a browser chat instead. You
are given the rule directly rather than fenced in by it. A rule you can read is
one you can choose to follow.

## Write it, commit it, explain it

When you have written one of the tasks marked in bold above:

```
1. Write it.
2. Commit it.   git add <your file> && git commit --signoff -m "<task id>: <what it does>"
3. Explain it.  The agent asks what your commit does, then a few short questions.
```

**Step 3 is the one worth having.** Explaining code you have just written is how
you find out whether you understood it, and it works the same whether anyone is
listening or not. Expect one question about what your commit does and up to three
short follow-ups: more for a big commit, fewer for a small one. Nothing is graded
and nothing you say is written down. The commit ahead of it in the history is
already the record of who wrote what.

<If unlockRoute is false, delete "What changes afterwards" and the paragraph after
it ("Which of the tasks marked in bold..."). Neither kind of code unlocks on its
own here, and progress is not filed per task. Replace both with one line: once
everything is written, committed, and (if you want the self-check) explained, run
`node .claude/hooks/signoff.mjs --done`, which is what opens the whole gated set,
recorded the same way, once.>

**What changes afterwards.** Once you have written and explained one piece of a
given kind of code, the agent will write that kind with you for the rest of the
project, including in features that are nowhere in the requirements.

Which of the tasks marked in bold you have done is kept in a small file under
`.claude/harness/progress/`, filed under your git email. The agent writes it once
you have explained your commit; you commit it like anything else. Ask it where you
stand whenever you want to know.

### Signing your commits

`git commit --signoff` adds one line to the commit message:

```
Signed-off-by: Lea Müller <lea.mueller@example.com>
```

It means **I wrote this code**. It is an ordinary git trailer and you will meet it
in real projects. Nothing here checks it, and it is worth doing anyway. Use it on
all of your own work, not only on the tasks marked in bold.

When the agent wrote or helped write something, the commit carries a
`Co-Authored-By: Claude …` line instead, which it adds itself. Between the two,
`git log` shows who wrote what, which is more use to all of you than trying to
remember in week three.

### Reviewing a teammate's code counts

<Delete this subsection when onboarding is false: working alone, there is no
teammate's code to review, and the cap below has nothing to be a cap on. Delete it
too when unlockRoute is false, even in a group, because reviewing is a second route
to *unlocking* a task, and with no unlock route there is no unlock for the cap to
bound. The two conditions are independent: this repo ships both false, so either
one alone is already reason enough to cut this subsection.>

If a teammate wrote one of their tasks, post a real review on their Pull Request
and answer the agent's questions about their code, and the agent will write that
kind of code with you too, even after the PR has merged. Tell it which PR; it
records the same way.

It is capped: you can never have more reviewed tasks than written ones, so your
first task is always written by you. Nobody can skip the writing, and everyone
reads other parts of the project rather than only their own tasks.

## Before any of that: `PLAN.md`

<Delete this whole section when onboarding is false. Replace it with a "Before you
write code" section carrying the scoping question and whatever Q5 named as the
thing this project gets wrong on day one. (Working alone is the onboarding-false
case: there is no one to meet and no split to write, so the replacement section
puts that question to the student instead of to the group.)>

**The agent writes no code for anyone in the group until `PLAN.md` exists and
every member listed in it has at least one task.** Meet first, one call with one
screen shared, and write it together.

Two halves. First, a short restatement **in your own words**: what you are
building, who uses it, and how much of it you are actually going to build. That
means naming which parts are in and which you are leaving out on purpose. That
last point is where two of you find out you pictured different amounts of work,
so write down what you agree on.

Then the split. Everyone's **git email**, the address `git config user.email`
prints, and each of you again on the task you took:

```markdown
## Who's in the group
- Jane Student — jane.student@mail.com
- Mo Ahmadi — mo.ahmadi@mail.com

## The split
- Login page (T1) — Jane
- Settings page (T2) — Mo Ahmadi
```

That is the whole format. Use a list, a table, or prose, in German or English.
Each of you has to appear twice: once in the member list with your **git** email,
and again on the task you took. On the task line your name is enough. The address
is needed once, because progress is filed under it.

Run `/onboard` and the agent will guide the conversation, point out unassigned
parts and places where two of you will collide, and check the file. **It will not
write a word of it.** `PLAN.md` is what the check reads, so an agent that could
write it would clear its own way.

**The check is live.** Edit `PLAN.md` so that someone has no task and the agent
stops writing code for everyone until the line is fixed. There is nothing to
re-run: it reads the file again on the next write. If someone has actually left the
group, take them off the member list. That is the right answer, not a slight.

A sketch is enough and it is allowed to change. The question is whether you have a
plan, never whether it was any good.

## Splitting the work

<Delete when onboarding is false: working alone, there is no one else's work to
split against.>

`PLAN.md` is the snapshot from the kickoff. **From then on your tasks are GitHub
Issues in your group's repo.** `/onboard` can create them from your task lines, or make
them by hand. The issues are the live version and nothing syncs them back.

Write them yourselves either way. The agent will not give you a breakdown. Once
you have a draft it will tell you if the load looks lopsided, if something is
blocked on two other people, or if two of you are about to edit the same function.

That last one will happen. <FILL: one sentence naming the file(s) or requirement(s)
that concentrate everyone's work, so the group knows where merge conflicts will
land, or delete this sentence if nothing in this project concentrates work that
way.> Resolve them together; that is the point.

Ask for help if you are stuck for more than 30 minutes. Use the daily stand-ups.

## Running it

Open **this folder** in VS Code and start Claude Code from the repo root. Starting
it from a subfolder silently drops this folder's settings, which mostly means the
agent starts writing code it should be helping you write.

Your progress is filed under your git email, so set it once and use the same one on
every machine you work from. Otherwise the work you did in the lab and the work you
did at home end up in two separate records, and neither counts for the other.

**If you want the agent to talk differently**, with simpler language, shorter
answers, or more or less detail, say so, and ask it to save that as a personal
skill in `~/.claude/skills/`. It travels with you to the next project, so you only
have to ask once. It changes how the agent talks, not which code you must write
yourself.

Inline suggestions (Copilot-style ghost text) are turned off for this folder in
`.vscode/settings.json`. That file is read-only, and the agent cannot write to it.
Otherwise it could restore ghost text in a single edit, and ghost text is the one
form of help that arrives without being asked.

**This file is read-only too**, along with `CLAUDE.md`. This page is the
requirements: it tells the agent which code you must write and where it may help
after you ask, so it is not a page the agent gets to reword.
`PLAN.md` is read-only to the agent as well, for a different reason: it is yours,
and it is what the check reads. Your own writing about your project goes in files
you make, whether that is `PLAN.md`, your Issues, or anything else you want.

If you think a requirement is wrong or unclear, say so to your instructor. That is
a conversation, not a diff.

None of these locks is a cage, and you should know that up front. Read-only here
means VS Code rejects typing in those buffers, there is a setting to change that,
and you can use other editors. But none of it can happen quietly. Every file
named above is committed, so any change lands in your PR with your name on it.
That is the mechanism: not "you cannot", but "it is visible".
