# Movie Diary — JavaScript Modules

Five days (full time) / ten days (part time). Group project, mandatory
presentation at the end.

This repo is your starting point. **Fork it once for your group** and add your team
members as collaborators. One fork, everyone works in it, and every change merges
to `main` through a Pull Request.

Doing the Pokédex instead? Same requirements, same rules. Rename `journal.html`
and `journal.js` to `pokedex.*` and change the two matching lines in
`.claude/harness/config.json`.

## Where you are

Five stages. Each stage names what ends it, which is the part easy to lose sight
of from the inside.

1. **Fork it, clone it, run `/onboard`.** Ends when the only open item is
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

| id | what it asks for |
| --- | --- |
| FR001 | You build it as a group, and everyone shares responsibility for it. |
| FR002 | Follow the bootcamp's group-work guidelines. |
| FR003 | One **public** GitHub repo. Do **not** add instructors as collaborators. |
| FR004 | Every change to `main` arrives through a Pull Request. |
| FR005 | The site uses the three core web APIs: **DOM**, **Web Storage** and **Fetch**. |
| FR006 | Tailwind does all the styling. |
| FR007 | Two pages: `index.html` ↔ `main.js`, and `journal.html` ↔ `journal.js`. |
| FR008 | A navbar on **both** pages, switching between the homepage and the journal. |
| **FR009** | The homepage fetches popular movies from the TMDB API and displays them. |
| **FR010** | A search bar. On submit, results or a message appear in a dialog. |
| **FR011** | Each movie's image, title and info, laid out as a card. |
| **FR012** | An "add to favourites" button that stores the movie as an object in an array in `localStorage`. |
| **X1** | When the films cannot be loaded, or a search finds nothing, the page says so instead of sitting empty. |
| **X3** | A card's favourite button shows whether that film is already in your journal, and flips when you click it. |
| **FR013** | The journal page lists the favourite movies from `localStorage`, with image, title and info. |
| **FR014** | Notes you can add to a movie, saved on the same object in `localStorage`. |
| **X4** | Taking a film back out of the journal, so it is gone after a reload too. |

**Bold = you type this one yourself.** For the others, you may ask the agent to
help you implement them.

TMDB needs a free signup. [TMDB docs](https://developer.themoviedb.org/docs/getting-started)
· [PokéAPI](https://pokeapi.co/) (no signup) · [Tailwind docs](https://tailwindcss.com/docs/installation)

## The setup

**This project is vanilla JavaScript: two pages, plain `<script>` tags, Tailwind
from a CDN. No build step, no npm, no imports.** Bundlers, modules and Vite come
later in this unit. They are not wrong, they are just not what this project is made
of, and adding one mid-project means every teammate's clone stops working until
they run an install step. Ask the agent about any of it. It will answer, and it
will tell you when an answer would change how the project is built.

**Your TMDB token** goes in `config.js`, which you make by copying
`config.example.js`. That copy is gitignored, so your token stays out of the
history, and the template stays committed so the next person knows what to make.
This is a stopgap and you should know it: the token is a global variable in a
public page, readable by anyone who opens it. Keeping a credential properly secret
needs a server holding it for you, which is further down the course. If a token
does get committed, generate a new one. A token that has been public once is
burned.

## What you type, and where the agent can help

**The JavaScript in the rows marked in bold is yours to type.** Asking the web for
data, building and changing the page, and keeping things between visits are the
three things this module exists to teach, and typing them is how you learn them.
That covers both directions of each one: not only the request that works but the
one that fails, not only building a card but changing one that is already there,
not only saving a film but taking it back out.

**Everything else you may ask the agent to help implement:**

- All markup and all Tailwind: `index.html`, `journal.html`, every class string.
- The navbar and page plumbing (FR006 to FR008).
- Anything past the requirements: extra features, polish, ideas of your own.
- Explaining what a requirement means, reading errors with you, and working out
  which lines came from which branch after a messy merge. It will not resolve a
  conflict for you, because in this project the conflicts are the lesson.

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

If a teammate wrote one of their tasks, post a real review on their Pull Request
and answer the agent's questions about their code, and the agent will write that
kind of code with you too, even after the PR has merged. Tell it which PR; it
records the same way.

It is capped: you can never have more reviewed tasks than written ones, so your
first task is always written by you. Nobody can skip the writing, and everyone
reads other parts of the project rather than only their own tasks.

## Before any of that: `PLAN.md`

**The agent writes no code for anyone in the group until `PLAN.md` exists and
every member listed in it has at least one task.** Meet first, one call with one
screen shared, and write it together.

Two halves. First, a short restatement **in your own words**: what you are
building, who uses it, and how much of it you are actually going to build. That
means naming which parts are in and which you are leaving out on purpose. That
last point is where two of you find out you pictured different amounts of work,
so write down what you agree on.

While you are all there, settle one more thing **together**: **what is a favourite,
once it is in `localStorage`?** Which fields of the film get stored, and what "the
film" means at that point. FR012 is where that gets decided, and three other rows
depend on it — the journal reads those fields back (FR013), the button on a card
has to recognise a film it has seen before (X3), and removing one means finding it
again (X4). It is exactly the decision two of you can each assume differently and
only discover in a merge conflict on day four. Write down what you land on. It does
not have to be right, it has to be shared.

Then the split. Everyone's **git email**, the address `git config user.email`
prints, and each of you again on the task you took:

```markdown
## Who's in the group
- Jane Student — jane.student@mail.com
- Mo Ahmadi — mo.ahmadi@mail.com

## The split
- Fetch popular movies (FR009) — Jane
- Search bar + dialog (FR010) — Mo Ahmadi
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

`PLAN.md` is the snapshot from the kickoff. **From then on your tasks are GitHub
Issues on your fork.** `/onboard` can create them from your task lines, or make
them by hand. The issues are the live version and nothing syncs them back.

Write them yourselves either way. The agent will not give you a breakdown. Once
you have a draft it will tell you if the load looks lopsided, if something is
blocked on two other people, or if two of you are about to edit the same function.

That last one will happen, and it will happen in `main.js`: six of the nine tasks
you type yourself live in that one file, against three in `journal.js`. Expect the
homepage to be where you meet each other, and plan around it — small branches,
merged early, rather than four days of separate work landing at once. Resolve the
conflicts together; that is the point.

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
