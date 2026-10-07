# From concept to deployment

#### Duration: Two days

#### Presentation: Mandatory, at a time set by your instructor

#### Format: Group project

This is the first thing you build as a team, and it's a website: semantic
HTML, hand-written CSS, live on GitHub Pages when you're done.

This repo is your starting point. **Put it on GitHub once for your group**:
one of you runs `/onboard`, which walks you through it, and adds the others as
collaborators. They clone that repo instead of setting the project up again.
One repo, everyone works in it, and every
change merges to `main` through a Pull Request.

**The design is yours, and there are two ways to get one:**

- Take the barebones Figma wireframe and make it your own.
- Pick a site you like from [frontendpractice.com](https://www.frontendpractice.com)
  and rebuild its look.

Clone something that exists or let your creativity reign free. Both are real
projects, and neither changes a word of what follows. Decide it in the first
hour, together, and write it in `PLAN.md` so nobody is still designing on day
two.

## Get started

There are five stages. Each one names what ends it, since that's the part
that's easy to lose sight of from the inside.

1. Run `/onboard`, which puts this repo on GitHub, or clone your group's copy
   if a teammate already did and run `/onboard` there. This
   ends when the only open item is `PLAN.md`. That's stage 2, and it stays
   open until you get there. Everything above it should pass.
2. Meet, and write `PLAN.md` together. This ends when the check passes: every
   member listed has a task line, and your own git email is one of them.
   Until then the agent writes no code for anyone in the group.
3. Pick a task, and cut a branch: `git switch -c <task-id>-<short-name>`.
   This ends when you have a branch for the work instead of committing to
   `main`.
4. Write it, commit it, explain it. This ends when your change is committed.
   Explanation is an optional self-check here; the protected code stays yours
   to write throughout the exercise.
5. Open a Pull Request. This ends when it is merged. Then return to stage 3
   with the next task.

## The requirements

|           | what it is                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR001** | **The page itself** — the doctype, a head carrying the title, the character encoding, the viewport and your stylesheet, and the body everything lives in. |
| **FR002** | **Header and navigation** — the top of the page, and how someone gets from here to your other sections or pages.                                          |
| **FR003** | **The content sections** — the middle of the page: whatever your design has, built out of elements that say what each part _is_.                          |
| **FR004** | **Footer** — the bottom, belonging to the page rather than to the section above it.                                                                       |
| **FR005** | **Images and media** — with alt text that says what the picture shows, and dimensions so the page does not jump while it loads.                           |
| **FR006** | **The layout** — where the boxes go, built with flexbox and grid.                                                                                         |
| **FR007** | **The look of it** — colour, typography, spacing, borders, and what happens on hover and on keyboard focus.                                               |
| **FR008** | **Every change to `main` arrives through a Pull Request** that a teammate reviewed. No direct pushes, not even for a typo.                                |
| **FR009** | **The site is live on GitHub Pages**, and the link is on the repo's front page.                                                                           |
| **FR010** | _Stretch:_ **responsive.** Desktop first; if you have time, make it work on a phone.                                                                      |

**Bold = you type this one yourself, and here that is all of it.** Every
requirement above that produces HTML or CSS stays yours until the group marks the
exercise done. Nothing opens one bold item at a time. The write check opens all
the HTML and CSS at once afterwards, and you still have to ask for any change.

FR008 and FR009 are bold for a different reason. They are not code, so there is
nothing for anyone to type on your behalf. They are also the two most likely to be
left until the last afternoon. Do FR009 on day one, with an empty page. A
deployment that works before there is anything to deploy is worth an hour of your
last evening.

## The setup

This project is plain HTML and CSS files, served exactly as they are. GitHub
Pages puts your `index.html` on the web with no build step in between, and any
teammate can clone the repo and open it in a browser with nothing to install.
Keep it that way:

- **No `npm install`, no Tailwind or Bootstrap, no preprocessor.** The CSS is
  yours, written by hand.
- Google Fonts and an icon set like Font Awesome are fine, linked in your
  `<head>`. That's the shape of the only exception: anything else external
  comes from a CDN as a `<link>` or `<script>` tag, late, as the last cherry
  on top.
- Anything that has to be _installed_ before the site runs stops every
  teammate's clone working until they have run the same setup you did, in the
  middle of a two-day project where nobody has time to debug somebody else's
  toolchain.

You start with `index.html` and `css/style.css`. More pages, or more
stylesheets (extra `<link>` tags, or `@import` at the top of this one), are
yours to add if you want them. Nothing has to be installed, and nothing here
is generated.

## What you type, and where the agent can help

**Two topics, and between them they are the entire site: semantic HTML and
CSS.** That covers the elements you choose and the structure they make, the
layout you build with flexbox and grid, and the colour, type, spacing, hover
and focus states. That's what this module is for, so that's what you type,
every tag and every rule, both days. The agent will not write markup or
stylesheet rules for you: not one element, not three lines "just to get you
started", not by putting them in the chat for you to copy across. That's not
it being difficult with you. You have two days to build something your hands
know how to do, and there is no version of that where something else does the
typing.

**Everything else you may ask the agent to help implement:**

- **Git, and on this project that's the big one.** Five people and two files
  means merge conflicts. That's not a mistake anyone made, it's what the
  workflow is for. Ask it to walk you through the loop until it is muscle
  memory: branch, commit, update `main`, merge `main` into your branch, push,
  open the PR, merge it on GitHub. Ask it _before_ you do anything that feels
  like it might lose work, which is the moment it is most useful. When you do
  hit a conflict it will show you what each side does and which markers to
  delete. **You** type the resolution, because untangling one is the thing
  you are here to learn, and it takes ten minutes the second time.
- **Everything around the site.** GitHub Pages setup, the repo's front page,
  the `.gitignore`, how to word an issue or a PR description. It advises; you
  write your own issues and your own reviews.
- **Reading your code back to you.** What is wrong with it and why, why that
  element rather than the one you picked, why the layout collapses at that
  width. It will tell you what to change. You change it.
- **Words, in the chat.** If you are stuck on how a paragraph should be
  phrased, ask. It can suggest wording, and you type what you like into the
  page. And if the text isn't the point yet, lorem ipsum is a perfectly good
  answer.
- **Anything you want to understand**, including things this project doesn't
  use. JavaScript, frameworks, build tools, what a bundler is. Asking is free
  and the answer is not a detour.

**If you brought a different agent**, whether that's Codex, Gemini, Copilot,
Cursor, Pi or whatever else you have running, read `AGENTS.md`, which is the
same rule written for it. Only Claude Code is actually held to it by hooks.
Every other tool is on the honour system, so if yours reads some other
instructions file, point it at `AGENTS.md` yourself.

**The agent waits to be asked.** It will not start building just because a
file is empty or your plan is finished. This isn't a to-do list it works
through on its own, so ask it for what you want. Before every code edit, it
asks at least one question about your requested change and waits for your
answer.

Yes, this tells you exactly what you could paste into a browser chat instead.
You're given the rule directly rather than fenced in by it. A rule you can
read is one you can choose to follow.

## Write it, commit it, explain it

When you have written one of the tasks marked in bold above:

```
1. Write it.
2. Commit it.   git add <your file> && git commit --signoff -m "<task id>: <what it does>"
3. Explain it.  The agent asks what your commit does, then a few short questions.
```

**Step 3 is the one worth having.** Explaining code you have just written is
how you find out whether you understood it, and that's true whether anyone is
listening or not. Expect one question about what your commit does and up to
three short follow-ups: more for a big commit, fewer for a small one. Nothing
is graded and nothing you say is written down. The commit ahead of it in the
history is already the record of who wrote what.

The HTML and CSS remain yours to write throughout this assignment.

### Signing your commits

`git commit --signoff` adds one line to the commit message:

```
Signed-off-by: Lea Müller <lea.mueller@example.com>
```

It means **I wrote this code**. It is an ordinary git trailer and you will
meet it in real projects. Nothing here checks it, and it is worth doing
anyway. Use it on all of your own work, not only on the tasks marked in bold.

When the agent wrote or helped write something, the commit carries a
`Co-Authored-By: Claude …` line instead, which it adds itself. Between the
two, `git log` shows who wrote what, which is more use to all of you than
trying to remember in week three.

## Before any of that: `PLAN.md`

**The agent writes no code for anyone in the group until `PLAN.md` exists and
every member listed in it has at least one task.** Meet first, one call with
one screen shared, and write it together.

It has two halves:

- A short restatement **in your own words** of what you are building, who
  uses it, and how much of it you are actually going to build. Name which
  parts of the design are in and which you are leaving out on purpose. This
  is usually where two of you find out you pictured different amounts of
  work, so write down what you agree on.
- The split: everyone's **git email** (the address `git config user.email`
  prints), and each of you again on the task you took.

```markdown
## Who's in the group

- Jane Student — jane.student@mail.com
- Mo Ahmadi — mo.ahmadi@mail.com

## The split

- Login page (T1) — Jane
- Settings page (T2) — Mo Ahmadi
```

That's the whole format. Use a list, a table, or prose, in German or English.
Each of you has to appear twice: once in the member list with your **git**
email, and again on the task you took. On the task line your name is enough.
The address is needed once, because progress is filed under it.

Run `/onboard` and the agent will guide the conversation, point out
unassigned parts and places where two of you will collide, and check the
file. **It will not write a word of it.** `PLAN.md` is what the check reads,
so an agent that could write it would clear its own way.

**The check is live.** Edit `PLAN.md` so that someone has no task, and the
agent stops writing code for everyone until the line is fixed. There is
nothing to re-run: it reads the file again on the next write. If someone has
actually left the group, take them off the member list. That's the right
answer, not a slight.

A sketch is enough, and it is allowed to change. The question is whether you
have a plan, never whether it was any good.

## Splitting the work

`PLAN.md` is the snapshot from the kickoff. **From then on your tasks are
GitHub Issues on your repo.** `/onboard` can create them from your task
lines, or you can make them by hand. The issues are the live version, and
nothing syncs them back.

Write them yourselves either way. The agent will not give you a breakdown.
Once you have a draft, it will tell you if:

- the load looks lopsided
- something is blocked on two other people
- two of you are about to edit the same part of a file

That last one will happen, and you can see it coming from here. For the
first day this whole project is `index.html` and `css/style.css`, so every
one of you is working in the same two files, and the header someone is
styling sits three lines above the section someone else is writing. Resolve
them together; that's the point.

Ask for help if you are stuck for more than 30 minutes. Have a stand-up on
the morning of day two, even though it's only two days, and especially
because it's only two days.

## Running it

- Open **this folder** in VS Code and start Claude Code from the repo root.
  Starting it from a subfolder silently drops this folder's settings, which
  mostly means the agent starts writing code it should be helping you write.
- Your progress is filed under your git email, so set it once and use the
  same one on every machine you work from. Otherwise the work you did in the
  lab and the work you did at home end up in two separate records, and
  neither counts for the other.
- **If you want the agent to talk differently**, with simpler language,
  shorter answers, or more or less detail, say so, and ask it to save that as
  a personal skill in `~/.claude/skills/`. It travels with you to the next
  project, so you only have to ask once. It changes how the agent talks, not
  which code you must write yourself.
- Inline suggestions (Copilot-style ghost text) are turned off for this
  folder in `.vscode/settings.json`. That file is read-only, and the agent
  cannot write to it. Otherwise it could restore ghost text in a single edit,
  and ghost text is the one form of help that arrives without being asked.

**This file is read-only too**, along with `CLAUDE.md`. This page is the
requirements: it tells the agent which code you must write and where it may
help after you ask, so it is not a page the agent gets to reword. `PLAN.md`
is read-only to the agent as well, for a different reason: it is yours, and
it is what the check reads. Your own writing about your project goes in
files you make, whether that's `PLAN.md`, your Issues, or anything else you
want.

If you think a requirement is wrong or unclear, say so to your instructor.
That's a conversation, not a diff.

None of these locks is a cage, and you should know that up front. Read-only
here means VS Code rejects typing in those buffers, there is a setting to
change that, and you can use other editors. But none of it can happen
quietly. Every file named above is committed, so any change lands in your PR
with your name on it. That's the mechanism: not "you cannot", but "it is
visible".
