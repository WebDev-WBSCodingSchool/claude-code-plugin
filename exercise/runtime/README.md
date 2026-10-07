# <FILL: project name>

<FILL: module name and duration, one line, without the module number, which differs between courses. "Advanced React II: Next.js.
Solo project, two days." or "Five days full time, ten days part time. Group
project with a presentation at the end.">

<FILL: what students build, in two to four sentences. Name the data source and
link a demo if the assessment has one.>

<FILL: variant note, or delete this paragraph if the project has no variants.>

## How you work

<For a solo project (onboarding false), delete step 2, renumber, and replace the
last step with a local merge: "Merge the branch into `main` and push it", the
three commands, and one sentence saying a Pull Request is optional because there
is nobody to review it.>

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

You write the bold tasks yourself. For the others, you can ask the agent for help.

<If unlockRoute is false, add: "The bold tasks stay yours for the whole exercise.
When you mark the exercise as done, the agent may help with all of them, but you
still have to ask for each change.">

<FILL: if tasks[].file names files the student creates (preScaffold), list each
file with its task ids and say that a task's commit must change its file.
Otherwise delete this paragraph.>

<FILL: things the requirements don't mention but students will run into, as a
short list, or delete this subsection.>

## Setup

<FILL: what the project is built with, and what students must not add during the
project. Name the libraries. For a group project, the reason is that a new package
can break everyone else's clone. For a solo project, the reason is that the
package would do the work the exercise practises.>

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

The agent only acts when you ask it to. An empty file or a finished task list
doesn't count as a request. Before each code change, it asks you at least one
question about the change and waits for your answer.

This list also tells you what you could get from a browser chat instead. That's
intentional. The rules are written down, and following them is your choice.

## Write it, commit it, explain it

When you have written a bold task:

1. Write the code.
2. Commit it with
   `git add <file> && git commit --signoff -m "<task id>: <what it does>"`.
3. Explain it. The agent asks what your commit does, then up to three short
   follow-up questions. A large commit gets more questions, a small one fewer.

Explaining your own code shows you whether you understood it. This is for your own understanding only. It's not graded, or recorded.

<If unlockRoute is false, delete the next two paragraphs and write instead: "The
bold tasks stay yours for the whole exercise.">

Once you have written and explained one piece of a kind of code, the agent may
write that kind of code with you for the rest of the project. That includes
features beyond the requirements.

The agent records each completed task in a file under
`.claude/harness/progress/`, filed under your git email. Commit that file with your
work. You can ask the agent at any time which tasks you have completed.

### Signing your commits

`git commit --signoff` adds this line to the commit message:

```
Signed-off-by: Lea Müller <lea.mueller@example.com>
```

The line says that you wrote the code. Many open-source
projects require it. Nothing in this repo checks it, but use it on all your own
commits, not only on the bold tasks.

When the agent wrote a commit or helped with it, the agent adds a
`Co-Authored-By: Claude …` line instead. With both lines in place, `git log` shows
who wrote what.

### Reviewing a teammate's code counts

<Delete this subsection when onboarding is false, because a solo student has no
teammate to review. Also delete it when unlockRoute is false, because a review is
a second way to open a topic, and nothing opens in that case.>

When a teammate has written one of their bold tasks, you can review their Pull
Request on GitHub and then answer the agent's questions about their code. After
that, the agent may write that kind of code with you too, even if the Pull Request
is already merged. Tell the agent which Pull Request you reviewed.

You can never have more reviewed tasks than written ones. So everyone writes their
first task themselves.

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
member listed in it has at least one task. Meet first, in one call with one shared
screen, and write it together.

`PLAN.md` has two parts. First, describe in your own words what you are building,
who uses it, and how much of it you will build. Name the parts you leave out on
purpose. This is where two of you find out that you imagined different amounts of
work, so write down what you agree on.

Second, the split. List every member with their git email, which is the address
`git config user.email` prints. Then list each task with the name of the person
who took it:

```markdown
## Members

- Jane Student — jane.student@mail.com
- Mo Ahmadi — mo.ahmadi@mail.com

## Tasks

- Login page (T1) — Jane
- Settings page (T2) — Mo Ahmadi
```

You can use a list, a table, or prose, in German or English. Each member appears
twice: once in the member list with their git email, and once on a task. On the
task line, a name is enough. The agent stores progress under the email, so the
email has to appear once.

Run `/onboard`, and the agent guides the conversation. It points out work nobody
has taken and places where two of you will edit the same code, and it checks the
file. It won't write any of `PLAN.md`, because the check reads that file, and an
agent that wrote it could unlock itself.

The agent reads `PLAN.md` again before every code change. If you edit it so that a
member has no task, the agent stops writing code for everyone until you fix it. If
someone has left the group, remove them from the member list.

A rough plan is enough, and you can change it later.

## Splitting the work

<Delete this section when onboarding is false.>

After the kickoff, your tasks live in GitHub Issues in your group's repo, not in
`PLAN.md`. `/onboard` can create the issues from your task lines, or you can
create them by hand. Nothing syncs them back to `PLAN.md`.

Write the issues yourselves. The agent won't break the work down for you. Once you
have a draft, it tells you if one person has much more work than the others, if a
task waits on two other people, or if two of you are about to edit the same code.

<FILL: one sentence naming the files or requirements where everyone's work meets,
so the group knows where merge conflicts will happen. Delete the sentence if
nothing in this project works that way.> Resolve merge conflicts together.

Ask for help if you are stuck for more than 30 minutes. Use the daily stand-ups.

## Running it

Open this folder in VS Code and start Claude Code here, not in a subfolder. Claude
Code loads this repo's settings only from the root folder. Without them, the agent
may write code that you are supposed to write.

Use the same git email on every computer. The agent stores your progress under that
email, and work you do under a second email won't count.

To change how the agent talks to you, for example with simpler language or shorter
answers, tell it, and ask it to save that as a personal skill in
`~/.claude/skills/`. The skill also applies in your later projects. It doesn't
change which code you write yourself.

Some files in this repo are read-only for you and the agent:

- `.vscode/settings.json` turns off inline suggestions, the gray code that tools
  like Copilot show while you type. Those suggestions write code without you
  asking for it.
- `README.md` and `CLAUDE.md` say which code you write yourself and where the
  agent may help. The agent must not change them.
- `PLAN.md` belongs to your group, and the `PLAN.md` check reads it. <Delete this
  item when onboarding is false.>

If you think a requirement is wrong or unclear, talk to your instructor.

You can get around these locks, but they are here to help you to learn.
