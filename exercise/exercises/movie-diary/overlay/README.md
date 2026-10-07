# Movie Diary

#### Duration

- Week 1: Two days (full time) / ten days (part time)
- Week 2 (refactor): One day (full time) / six days (part time), continuing
  straight on in the same repo

#### Presentation: Mandatory, at a time set by your instructor

#### Format: Group project

This repo is your starting point. **Put it on GitHub once for your group**:
one of you runs `/onboard`, which walks you through it, and adds the others as
collaborators. They clone that repo instead of setting the project up again.
One repo, everyone works in it for both weeks,
and every change merges to `main` through a Pull Request.

Doing the Pokédex instead? Same requirements, same rules. Rename `journal.html`
and `journal.js` to `pokedex.*` and change the two matching lines in
`.claude/harness/config.json`. In week 2, do the same with `src/journal.js`.

## Get started

There are five stages. Each one names what ends it, since that's the part
that's easy to lose sight of from the inside. They repeat for every task, in
both week 1 and week 2.

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
4. Write it, commit it, explain it. This ends when the sign-off is recorded,
   and it tells you what just opened up.
5. Open a Pull Request. This ends when it is merged. Then return to stage 3
   with the next task.

## The requirements

### Week 1

| id        | what it asks for                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| FR001     | You build it as a group, and everyone shares responsibility for it.                                            |
| FR002     | Follow best practices for teamwork and communication.                                                          |
| FR003     | Work in one public repo on GitHub. Do not add instructors as collaborators.                                      |
| FR004     | All updates merge into `main` strictly through Pull Requests.                                                  |
| FR005     | Demonstrate usage of `DOM manipulation`, `localStorage`, and `fetch`.                                          |
| FR006     | Style UI using Tailwind CSS utilities via CDN script.                                                          |
| FR007     | Setup dual-page app (`index.html` ↔ `main.js`, `journal.html` ↔ `journal.js`).js`.                             |
| FR008     | A navbar on **both** pages, switching between the homepage and the journal.                                    |
| **FR009** | **Fetch and render popular movies or Pokémon dynamically on load.**                                            |
| **FR010** | **Provide search input; display query results or messages in a dialog modal.**                                 |
| **FR011** | **Each movie's image, title and info, laid out as a card.**                                                    |
| **FR012** | **An "add to favourites" button that stores the movie as an object in an array in `localStorage`.**            |
| **FR013** | **When the films cannot be loaded, or a search finds nothing, the page says so instead of sitting empty.**     |
| **FR014** | **A card's favourite button shows whether that film is already in your journal, and flips when you click it.** |
| **FR015** | **The journal page lists the favourite movies from `localStorage`, with image, title and info.**               |
| **FR016** | **Allow users to attach custom text notes to saved objects in `localStorage`.**                                |
| **FR017** | **Delete selected objects from `localStorage` and update the view without full reload.**                       |

**Bold = you type this one yourself.** For the others, you may ask the agent to
help you implement them.

TMDB needs a free signup. [TMDB docs](https://developer.themoviedb.org/docs/getting-started)
· [PokéAPI](https://pokeapi.co/) (no signup) · [Tailwind docs](https://tailwindcss.com/docs/installation)

Week 1 ends with all of the above signed off, merged, and presented. **Keep
reading, since week 2 continues right here, in the same repo.**

### Week 2: refactor

Same app, same requirements above still hold. This is about _how_ it's built,
not new features. Empty-result and error handling is **FR013's job, not
repeated here**: you already built it in week 1, and it just has to survive
the move.

| id        | what it asks for                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| **FR018** | **Remove CDN references. install Vite and Tailwind as npm dependencies and wire Tailwind's Vite plugin into the build.** |
| **FR019** | **Configure `vite.config.js` to build `index.html` and `journal.html` as separate entry points.**                        |
| **FR020** | **Convert the homepage to native ES modules (`import`/`export`), living under `src/`.**                                  |
| **FR021** | **Convert the journal page to native ES modules (`import`/`export`), living under `src/`.**                              |
| **FR022** | **Break large functions down; separate data fetching, UI rendering, and storage logic.**                                 |
| **FR023** | **Restructure journal logic into small, single-responsibility modular helper functions.**                                |
| FR024     | Comment or JSDoc the code: what each module is responsible for, what the tricky logic does.                              |
| FR025     | Fix bugs left over from week 1.                                                                                          |
| FR026     | Produce a production build and deploy it as a static site on Render.                                                     |

**Bold = you type this one yourself.** For the others, you may ask the agent
to help you implement them, FR025 included, as long as the fix itself
doesn't require writing the kind of code that's still bold above (e.g. a bug
that's really missing DOM/fetch/localStorage handling stays yours until
you've demonstrated it).

[Vite multi-page guide](https://v7.vite.dev/guide/build#multi-page-app) ·
[Render](https://render.com/)

## The setup

**Your TMDB token** goes in `config.js`, which you make by copying
`config.example.js`. That copy is gitignored, so your token stays out of the
history, and the template stays committed so the next person knows what to
make. This is a stopgap and you should know it: the token is a global
variable in a public page, readable by anyone who opens it. Keeping a
credential properly secret needs a server holding it for you, which is
further down the course. If a token does get committed, generate a new one.
A token that has been public once is burned. This holds for both weeks:
nothing about the token changes in the refactor.

### Week 1

**This project is vanilla JavaScript: two pages, plain `<script>` tags,
Tailwind from a CDN. No build step, no npm, no imports.** Bundlers, modules
and Vite come in week 2. They are not wrong, they are just not what week 1 is
made of, and adding one mid-week means every teammate's clone stops working
until they run an install step. Ask the agent about any of it. It will
answer, and it will tell you when an answer would change how the project is
built.

### Week 2

**Week 2 flips that rule on purpose.** The whole point of the refactor is
adding Vite, npm and ES modules. From week 2 on, don't add a _second_
bundler, config format, or package manager without checking with the group
first: the same "everyone's clone breaks" cost still applies, just one layer
up.

## What you type, and where the agent can help

### Week 1

**The JavaScript in the rows marked in bold is yours to type.** Asking the
web for data, building and changing the page, and keeping things between
visits are the three things week 1 exists to teach, and typing them is how
you learn them. That covers both directions of each one: not only the
request that works but the one that fails, not only building a card but
changing one that is already there, not only saving a film but taking it
back out.

**Everything else you may ask the agent to help implement:**

- All markup and all Tailwind: `index.html`, `journal.html`, every class
  string.
- The navbar and page plumbing (FR006 to FR008).
- Anything past the requirements: extra features, polish, ideas of your own.
- Explaining what a requirement means, reading errors with you, and working
  out which lines came from which branch after a messy merge. It will not
  resolve a conflict for you, because in this project the conflicts are the
  lesson.

### Week 2

**The same rule covers the migration and the refactor itself.** Setting up
Vite and its config, converting the code to ES modules, and splitting it
into smaller, better-separated functions are the three things that week
teaches, so they're yours to type too: FR018/FR019 (Vite config), FR020/FR021
(ES modules) and FR022/FR023 (the refactor). The refactor can't be blocked
the way the others can (there's no syntax that marks "readable code"), so
it's enforced by the write-it/commit-it/explain-it step below rather than by
a write-block, but it's still yours, not the agent's, the first time.

**Everything else you may ask the agent to help implement:**

- Comments/JSDoc (FR024), ordinary bug fixes (FR025), and the Render
  deployment (FR026), unless a bug fix would require writing
  DOM/fetch/localStorage/ES-module/Vite-config code you haven't demonstrated
  yet, in which case that part is still yours until you have.
- Anything past the requirements: extra features, polish, ideas of your own.

**The agent waits to be asked**, in both weeks. It will not start building
just because a file is empty or your plan is finished. This isn't a to-do
list it works through on its own, so ask it for what you want. Before every
code edit, it asks at least one question about your requested change and
waits for your answer.

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
how you find out whether you understood it, and that's true whether anyone
is listening or not. Expect one question about what your commit does and up
to three short follow-ups: more for a big commit, fewer for a small one.
Nothing is graded and nothing you say is written down. The commit ahead of
it in the history is already the record of who wrote what.

**What changes afterwards.** Once you have written and explained one piece
of a given kind of code, the agent will write that kind with you for the
rest of the project, including in features that are nowhere in the
requirements.

Which of the tasks marked in bold you have done is kept in a small file
under `.claude/harness/progress/`, filed under your git email. The agent
writes it once you have explained your commit, and you commit it like
anything else. Ask it where you stand whenever you want to know.

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

### Reviewing a teammate's code counts

If a teammate wrote one of their tasks, post a real review on their Pull
Request and answer the agent's questions about their code, and the agent
will write that kind of code with you too, even after the PR has merged.
Tell it which PR; it records the same way.

It is capped: you can never have more reviewed tasks than written ones, so
your first task is always written by you. Nobody can skip the writing, and
everyone reads other parts of the project rather than only their own tasks.

## Before any of that: `PLAN.md`

**The agent writes no code for anyone in the group until `PLAN.md` exists and
every member listed in it has at least one task.** Meet first, one call with
one screen shared, and write it together.

### Week 1

It has two halves:

- A short restatement **in your own words** of what you are building, who
  uses it, and how much of it you are actually going to build. Name which
  parts are in and which you are leaving out on purpose. This is usually
  where two of you find out you pictured different amounts of work, so
  write down what you agree on.
- The split: everyone's **git email** (the address `git config user.email`
  prints), and each of you again on the task you took.

While you are all there, settle one more thing **together**: **what is a
favourite, once it is in `localStorage`?** That means which fields of the
film get stored, and what "the film" means at that point. FR012 is where
that gets decided, and three other rows depend on it: the journal reads
those fields back (FR015), the button on a card has to recognise a film it
has seen before (FR014), and removing one means finding it again (FR017).
It's exactly the decision two of you can each assume differently and only
discover in a merge conflict on day four. Write down what you land on. It
does not have to be right, it has to be shared.

Here's what the split looks like written out:

```markdown
## Who's in the group

- Jane Student — jane.student@mail.com
- Mo Ahmadi — mo.ahmadi@mail.com

## The split

- Fetch popular movies (FR009) — Jane
- Search bar + dialog (FR010) — Mo Ahmadi
```

That's the whole format. Use a list, a table, or prose, in German or English.
Each of you has to appear twice: once in the member list with your **git**
email, and again on the task you took. On the task line your name is
enough. The address is needed once, because progress is filed under it.

Run `/onboard` and the agent will guide the conversation, point out
unassigned parts and places where two of you will collide, and check the
file. **It will not write a word of it.** `PLAN.md` is what the check
reads, so an agent that could write it would clear its own way.

**The check is live.** Edit `PLAN.md` so that someone has no task, and the
agent stops writing code for everyone until the line is fixed. There is
nothing to re-run: it reads the file again on the next write. If someone
has actually left the group, take them off the member list. That's the
right answer, not a slight.

A sketch is enough, and it is allowed to change. The question is whether
you have a plan, never whether it was any good.

### Week 2

Same repo, same file, new tasks. Add the week 2 rows to the split, since the
check still just wants everyone listed with a task, so this is an edit, not
a re-write.

Before anyone starts the migration, settle one more thing **together**:
**how does the code split into modules?** That means who owns fetching, who
owns rendering the cards, who owns the favourites/journal storage logic.
Two people restructuring `main.js`/`journal.js` into `src/` at the same
time, with different ideas about where the boundaries go, is the week 2
version of the `localStorage` shape question above: exactly the kind of
thing that's fine to disagree about in a five-minute conversation and
expensive to discover in a merge conflict on day two.

## Splitting the work

`PLAN.md` is the snapshot from the kickoff. **From then on your tasks are
GitHub Issues on your repo.** `/onboard` can create them from your task
lines, or you can make them by hand. The issues are the live version, and
nothing syncs them back.

Write them yourselves either way. The agent will not give you a breakdown.
Once you have a draft, it will tell you if:

- the load looks lopsided
- something is blocked on two other people
- two of you are about to edit the same function

### Week 1

That last one will happen, and it will happen in `main.js`: six of the nine
tasks you type yourself live in that one file, against three in
`journal.js`. Expect the homepage to be where you meet each other, and plan
around it: small branches, merged early, rather than four days of separate
work landing at once. Resolve the conflicts together; that's the point.

### Week 2

The same collision moves to `vite.config.js` (FR018 and FR019 both live
there) and to `src/home.js` / `src/journal.js` (each carries both an
ES-modules task and a refactor task). Same advice: small branches, merged
early.

Ask for help if you are stuck for more than 30 minutes. Use the daily
stand-ups.

## Running it

- Open **this folder** in VS Code and start Claude Code from the repo root.
  Starting it from a subfolder silently drops this folder's settings, which
  mostly means the agent starts writing code it should be helping you write.
- Your progress is filed under your git email, so set it once and use the
  same one on every machine you work from. Otherwise the work you did in the
  lab and the work you did at home end up in two separate records, and
  neither counts for the other.
- **If you want the agent to talk differently**, with simpler language,
  shorter answers, or more or less detail, say so, and ask it to save that
  as a personal skill in `~/.claude/skills/`. It travels with you to the
  next project, so you only have to ask once. It changes how the agent
  talks, not which code you must write yourself.
- Inline suggestions (Copilot-style ghost text) are turned off for this
  folder in `.vscode/settings.json`. That file is read-only, and the agent
  cannot write to it. Otherwise it could restore ghost text in a single
  edit, and ghost text is the one form of help that arrives without being
  asked.

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
