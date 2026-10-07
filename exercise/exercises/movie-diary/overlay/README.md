# Movie Diary

JavaScript Modules. Group project with a presentation at a time your instructor
sets. It runs over two weeks in the same repo:

- Week 1: two days full time, ten days part time.
- Week 2, the refactor: one day full time, six days part time.

You build a two-page web app. The homepage loads popular movies from TMDB, lets
users search, and lets them save movies as favourites in `localStorage`. The
journal page lists the favourites, and users can add notes to them or remove them.
In week 1 you build it in plain JavaScript. In week 2 you move it to Vite and ES
modules and make the code easier to read.

Doing the Pokédex instead? The requirements and the rules are the same. Rename
`journal.html` and `journal.js` to `pokedex.html` and `pokedex.js`, and change the
two matching lines in `.claude/harness/config.json`. In week 2, rename
`src/journal.js` the same way.

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
| **FR009** | When the homepage loads, it fetches popular movies or Pokémon and shows them. |
| **FR010** | A search input sends a query and shows the results, or a message, in a dialog. |
| **FR011** | Each movie appears as a card with its image, title, and information. |
| **FR012** | An "add to favourites" button stores the movie as an object in an array in `localStorage`. |
| **FR013** | When the movies can't be loaded, or a search finds nothing, the page says so instead of staying empty. |
| **FR014** | A card's favourite button shows whether the movie is already in the journal, and switches when you click it. |
| **FR015** | The journal page lists the favourites from `localStorage` with their image, title, and information. |
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

The agent only acts when you ask it to. An empty file or a finished task list
doesn't count as a request. Before each code change, it asks you at least one
question about the change and waits for your answer. This applies in both weeks.

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

The line says that you wrote the code. Many open-source projects require it.
Nothing in this repo checks it, but use it on all your own commits, not only on the
bold tasks.

When the agent wrote a commit or helped with it, the agent adds a
`Co-Authored-By: Claude …` line instead. With both lines in place, `git log` shows
who wrote what.

### Reviewing a teammate's code counts

When a teammate has written one of their bold tasks, you can review their Pull
Request on GitHub and then answer the agent's questions about their code. After
that, the agent may write that kind of code with you too, even if the Pull Request
is already merged. Tell the agent which Pull Request you reviewed.

You can never have more reviewed tasks than written ones. So everyone writes their
first task themselves.

## Before any of that: PLAN.md

The agent writes no code for anyone in the group until `PLAN.md` exists and every
member listed in it has at least one task. Meet first, in one call with one shared
screen, and write it together.

### Week 1

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

- Fetch popular movies (FR009) — Jane
- Search bar and dialog (FR010) — Mo Ahmadi
```

You can use a list, a table, or prose, in German or English. Each member appears
twice: once in the member list with their git email, and once on a task. On the
task line, a name is enough. The agent stores progress under the email, so the
email has to appear once.

While you are all together, decide one more thing: **what does a favourite look
like in `localStorage`?** Decide which fields of the movie you store. FR012 stores
them, and three other tasks depend on that choice. FR015 reads the fields back,
FR014 has to recognise a movie that is already saved, and FR017 has to find a
movie again to remove it. If two of you assume different answers, you find out in
a merge conflict on day four. Write down what you agree on. It doesn't have to be
perfect, but everyone has to use the same answer.

Run `/onboard`, and the agent guides the conversation. It points out work nobody
has taken and places where two of you will edit the same code, and it checks the
file. It won't write any of `PLAN.md`, because the check reads that file, and an
agent that wrote it could unlock itself.

The agent reads `PLAN.md` again before every code change. If you edit it so that a
member has no task, the agent stops writing code for everyone until you fix it. If
someone has left the group, remove them from the member list.

A rough plan is enough, and you can change it later.

### Week 2

Keep using the same `PLAN.md` and add the week 2 tasks to it. The check still only
needs every member listed with a task.

Before anyone starts the move, decide together **how the code splits into
modules**. Decide who owns fetching, who owns rendering the cards, and who owns
the storage code for the favourites and the journal. If two people move
`main.js` and `journal.js` into `src/` at the same time with different ideas about
the boundaries, you find out in a merge conflict on day two. A five-minute
conversation now avoids that.

## Splitting the work

After the kickoff, your tasks live in GitHub Issues in your group's repo, not in
`PLAN.md`. `/onboard` can create the issues from your task lines, or you can
create them by hand. Nothing syncs them back to `PLAN.md`.

Write the issues yourselves. The agent won't break the work down for you. Once you
have a draft, it tells you if one person has much more work than the others, if a
task waits on two other people, or if two of you are about to edit the same code.

In week 1, six of the nine bold tasks live in `main.js`, and three live in
`journal.js`. Expect to edit `main.js` at the same time as your teammates. Keep
branches small and merge them early, instead of merging four days of separate work
at once.

In week 2, the same happens in `vite.config.js`, where FR018 and FR019 both live,
and in `src/home.js` and `src/journal.js`, which each carry an ES modules task and
a refactor task. Keep branches small and merge them early here too.

Resolve merge conflicts together. Ask for help if you are stuck for more than 30
minutes. Use the daily stand-ups.

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
- `PLAN.md` belongs to your group, and the `PLAN.md` check reads it.

If you think a requirement is wrong or unclear, talk to your instructor.

You can get around these locks, but they are here to help you to learn.
