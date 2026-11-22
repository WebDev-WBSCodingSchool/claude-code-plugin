# Movie Diary

JavaScript Modules. Group project with a presentation at a time your instructor
sets. It runs over two weeks in the same repo:

- Week 1: two days full time, ten days part time.
- Week 2, the refactor: one day full time, six days part time.

You build a two-page web app. The homepage loads popular movies from TMDB, lets
users search, and lets them save movies as favorites in `localStorage`. The
journal page lists the favorites, and users can add notes to them or remove them.
In week 1 you build it in plain JavaScript. In week 2 you move it to Vite and ES
modules and make the code easier to read.

Doing the Pokédex instead? The requirements and the rules are the same. Rename
`journal.html` and `journal.js` to `pokedex.html` and `pokedex.js`, and update
all five matching `file` entries in `.claude/harness/config.json` (`FR015`,
`FR016`, and `FR017` from `"journal.js"` to `"pokedex.js"` in week 1, plus
`FR021` and `FR023` from `"src/journal.js"` to `"src/pokedex.js"` in week 2).
In week 2, rename `src/journal.js` the same way. In VS Code, `config.json` opens
read-only — run **File: Toggle Active Editor Read-only in Session** from the
Command Palette (or edit the file outside VS Code) to save your change.

## How you work

These steps repeat for every task, in both weeks.

1. Run `/onboard`. It puts this repo on GitHub and checks your setup. One of you
   runs it and adds the others as collaborators. The others clone that repo
   instead of setting the project up again, and run `/onboard` in their clone.
   This step is done when all checks pass, except the `PLAN.md` check, which step
   2 fixes.
2. Meet as a group and write `PLAN.md` together. This step is done when the
   `PLAN.md` check passes. Until then, the agent writes no code for anyone in the
   group. See "Before any of that: PLAN.md" below.
3. Pick a task and create a branch for it, for example
   `git switch -c FR009-popular-movies`.
4. Write the code, commit it, and explain it to the agent. This step is done when
   the agent records your sign-off. See "Write it, commit it, explain it" below.
5. Open a Pull Request. This step is done when it is merged. Then go back to step 3.

## Requirements

### Week 1

| id | requirement |
| --- | --- |
| FR001 | You build the app as a group, and everyone shares responsibility for it. |
| FR002 | You follow good practices for teamwork and communication. |
| FR003 | The group works in one public repo on GitHub. Don't add instructors as collaborators. |
| FR004 | Every change reaches `main` through a Pull Request. |
| FR005 | The app uses DOM manipulation, `localStorage`, and `fetch`. |
| FR006 | The UI uses Tailwind CSS utility classes, loaded from the CDN script. |
| FR007 | The app has two pages: `index.html` with `main.js`, and `journal.html` with `journal.js`. |
| FR008 | Both pages have a navbar that links to the homepage and the journal. |
| **FR009** | When the homepage loads, it fetches popular movies and shows them. |
| **FR010** | A search input sends a query and shows the results, or a message, in a dialog. |
| **FR011** | Each movie appears as a card with its image, title, and information. |
| **FR012** | An "add to favorites" button stores the movie as an object in an array in `localStorage`. |
| **FR013** | When the movies can't be loaded, or a search finds nothing, the page says so instead of staying empty. |
| **FR014** | A card's favorite button shows whether the movie is already in the journal, and switches when you click it. |
| **FR015** | The journal page lists the favorites from `localStorage` with their image, title, and information. |
| **FR016** | Users can add their own notes to saved movies. The notes are stored in `localStorage`. |
| **FR017** | Users can delete saved movies from `localStorage`. The page updates without a full reload. |

You write the bold tasks yourself. For the others, you can ask the agent for help.

TMDB needs a free account. [TMDB docs](https://developer.themoviedb.org/docs/getting-started),
[PokéAPI](https://pokeapi.co/) (no account needed),
[Tailwind docs](https://tailwindcss.com/docs/installation).

Week 1 ends when all of the above is signed off, merged, and presented. Week 2
continues in this same repo.

### Week 2: the refactor

The app and the week 1 requirements stay the same. Week 2 changes how the app is
built, not what it does. FR013 already covers empty results and errors. That
handling has to keep working after the move, but it isn't a new task.

| id | requirement |
| --- | --- |
| **FR018** | Remove the CDN references. Install Vite and Tailwind as npm dependencies, and add Tailwind's Vite plugin to the build. |
| **FR019** | `vite.config.js` builds `index.html` and `journal.html` as separate entry points. |
| **FR020** | The homepage code uses native ES modules (`import` and `export`) and lives in `src/`. |
| **FR021** | The journal page code uses native ES modules (`import` and `export`) and lives in `src/`. |
| **FR022** | Large functions are split up. Fetching data, rendering the UI, and storage are separate. |
| **FR023** | The journal code is split into small helper functions in modules, each with one job. |
| FR024 | Comments or JSDoc explain what each module is for and what the tricky code does. |
| FR025 | Bugs left over from week 1 are fixed. |
| FR026 | You make a production build and deploy it to Render as a static site. |

You write the bold tasks yourself. For the others, you can ask the agent for help,
including the bug fixes in FR025. The exception is a fix that needs code of a kind
you haven't written yourself yet. For example, a bug that is really missing DOM,
`fetch`, or `localStorage` handling stays yours until you have signed off a task
of that kind.

[Vite multi-page guide](https://v7.vite.dev/guide/build#multi-page-app),
[Render](https://render.com/).

## Setup

Your TMDB token goes in `config.js`. Create it by copying `config.example.js`.
`config.js` is ignored by git, so your token stays out of the history, and
`config.example.js` stays committed so everyone knows which file to create.

This only keeps the token out of the repo. The token is still a global variable on
a public page, and anyone who opens the page can read it. Keeping a token really
secret needs a server that holds it for you, which comes later in the course. If a
token gets committed anyway, create a new one in TMDB. A token that was public once
is no longer safe. All of this applies to both weeks.

### Week 1

The project is plain JavaScript: two pages, plain `<script>` tags, and Tailwind
from the CDN. There is no build step, no npm, and no `import`. Bundlers, modules,
and Vite come in week 2. If someone adds one of them during week 1, everyone else's
clone stops working until they run an install step. You can ask the agent about
any of these tools. It answers, and it tells you when an answer would change how
the project is built.

### Week 2

In week 2, you add Vite, npm, and ES modules on purpose. Don't add a second
bundler, another config format, or another package manager without checking with
the group first. That would break everyone's clone in the same way.

## What you write yourself

### Week 1

You write the JavaScript for the bold tasks yourself. Week 1 teaches three things:

- requesting data from the web with `fetch`
- building and changing the page through the DOM
- keeping data between visits with `localStorage`

Each one includes both directions. A request can succeed or fail, a card is built
and later changed, and a movie is saved and later removed.

The agent won't write any of these for you until you have written one yourself,
committed it, and explained it.

You can ask the agent to help with everything else:

- all markup and all Tailwind classes in `index.html` and `journal.html`
- the navbar and the page setup for FR006 to FR008
- features beyond the requirements
- explaining what a requirement means, reading errors with you, and finding out
  which lines came from which branch after a difficult merge. It won't resolve a
  merge conflict for you, because resolving conflicts is part of what this project
  teaches.

### Week 2

The same rule covers the move and the refactor. Week 2 teaches three things, and
you write them yourself:

- the Vite setup and its config, FR018 and FR019
- the move to ES modules, FR020 and FR021
- splitting the code into smaller functions with clearer jobs, FR022 and FR023

The agent can't detect readable code the way it detects a `fetch` call, so it
can't block the refactor tasks. You still write them yourself the first time, and
the write, commit, and explain step below checks that you did.

You can ask the agent to help with everything else:

- comments and JSDoc (FR024), ordinary bug fixes (FR025), and the Render
  deployment (FR026). A fix that needs DOM, `fetch`, `localStorage`, ES module, or
  Vite config code you haven't written yourself yet stays yours until you have.
- features beyond the requirements

The agent edits code only when you ask — an empty file or task list isn't a
request. Whenever placement, scope, naming, or behavior is still open, it asks
you a question and waits for your answer before editing. This applies in both
weeks.

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

You can also unlock a topic by reviewing a teammate's Pull Request on GitHub
(even if already merged) and answering the agent's questions about their code.
You can never have more reviewed tasks than written ones, so everyone writes
their first task themselves.

## Before any of that: PLAN.md

The agent writes no code for anyone in the group until `PLAN.md` exists and every
member listed in it has at least one task. Meet first on a shared screen and
write it together.

### Week 1

`PLAN.md` has two parts: first, a short description in your own words of what
you are building, who uses it, and what is in or out of scope; second, the
initial split listing every member with their `git config user.email` and every
task with its owner's name:

```markdown
## Members

- Jane Student — jane.student@mail.com
- Mo Ahmadi — mo.ahmadi@mail.com

## Tasks

- Fetch popular movies (FR009) — Jane
- Search bar and dialog (FR010) — Mo Ahmadi
```

Use a list, table, or prose in German or English. While you are all together,
also agree on **what a favorite looks like in `localStorage`** — which fields of
the movie you store. FR012 stores them, FR015 reads them back, FR014 has to
recognize a movie that is already saved, and FR017 has to find a movie again to
remove it. Write down what you agree on so everyone uses the same shape.

Run `/onboard` to check `PLAN.md` — the agent points out unclaimed work or
overlaps, and re-reads `PLAN.md` live on every code write. It won't edit
`PLAN.md` itself. If someone leaves the group, remove them from the member list.
A rough plan is enough, and you can change it later.

### Week 2

Keep using the same `PLAN.md` and add the week 2 tasks to it. Before moving code
into `src/`, decide together **how the code splits into modules** (who owns
fetching, card rendering, and the storage code for favorites and the journal) so
two people don't move `main.js` and `journal.js` with conflicting boundaries.

## Splitting the work

After kickoff, move active tasks into GitHub Issues (`/onboard` can create them
from `PLAN.md`; changes don't sync back). Write issues yourselves — the agent
can flag uneven loads, dependencies, or shared files.

In week 1, six of the nine bold tasks live in `main.js` and three live in
`journal.js`. In week 2, FR018 and FR019 both live in `vite.config.js`, and
`src/home.js` and `src/journal.js` each carry an ES modules task and a refactor
task. Keep branches small and merge them early, resolve merge conflicts
together, ask for help if stuck for more than 30 minutes, and use daily
stand-ups.

## Running it

Open this folder at the repository root in VS Code and start Claude Code there
(not in a subfolder, or hooks and settings won't load). Keep the same git email
on every machine so your progress stays under one record.

To adjust how the agent talks to you (such as shorter answers or simpler
language), ask it to save a personal skill in `~/.claude/skills/`. That skill
cannot change which files or topics stay yours.

`.vscode/settings.json` turns off inline ghost-text suggestions, and `README.md`,
`CLAUDE.md`, `AGENTS.md`, and the `.claude/` setup files are read-only so
neither you nor the agent edits the rules by mistake. `PLAN.md` is locked for
the agent only, because your group writes and updates it. If you use another
coding agent (Codex, Gemini CLI, Copilot, or Cursor), point it to `AGENTS.md` —
only Claude Code enforces these rules with hooks.

If a requirement seems wrong or unclear, talk to your instructor. These locks
are here to help you learn.
