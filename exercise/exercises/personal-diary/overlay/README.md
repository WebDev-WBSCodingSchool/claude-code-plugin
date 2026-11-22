# Personal Diary

Building Applications with React. Solo project with a presentation at a time your
instructor sets. Five days full time, ten days part time.

You build a diary that runs in the browser. The home page lists your entries as
cards, newest first, each with a preview image, a date, and a title. Clicking a
card opens the full entry in a modal. An "Add Entry" button opens a second modal
with a form for the title, date, image URL, and content. The diary saves
everything to `localStorage`, so your entries are still there when you come back.
At the end, you deploy the built site to Render.

Keep your repo public, and don't add your instructors as collaborators. They read
it from the outside, like anyone else.

## How you work

1. Run `npm install`, then `/onboard`. `/onboard` puts this repo on GitHub and
   checks your setup. This step is done when all checks pass and `npm run dev`
   shows you a page.
2. Pick a task and create a branch for it, for example
   `git switch -c FR013-entry-card`.
3. Write the code, commit it, and explain it to the agent. This step is done when
   the agent records your sign-off. See "Write it, commit it, explain it" below.
4. Merge the branch into `main` and push it:

   ```
   git switch main
   git merge FR013-entry-card
   git push
   ```

   You work alone, so you don't need a Pull Request. Open one anyway if you want to
   read the diff on GitHub before you merge. Then go back to step 2.

## Requirements

| id | requirement |
| --- | --- |
| FR001 | Your repo stays public, and all the code lives in it. Don't add instructors as collaborators. |
| FR002 | You make every change on a task branch and merge it into `main`, either locally or through a Pull Request. |
| FR003 | The project uses React and Vite. This repo already has that setup. |
| FR004 | The project uses Tailwind, installed through npm. This repo already has Tailwind v4 set up in Vite, so classes work right away. |
| FR005 | The app keeps UI state in `useState` and side effects in `useEffect`. This covers the four bold tasks below. |
| **FR006** | An "Add Entry" button opens the modal for a new entry. Whether the modal is open is kept in state. |
| FR007 | The form asks for a title, a date, an image URL, and the content. |
| FR008 | The app stores all entries as one array in `localStorage` and keeps it in sync with the screen. |
| FR009 | There is one entry per day. If the chosen day already has an entry, the app shows a message instead of saving a second one. |
| FR010 | The form can't be submitted until all four fields are filled in. |
| **FR011** | The home page shows the entries as a list, newest first. |
| **FR012** | When the app starts, it loads the stored entries and shows them. |
| **FR013** | Each entry is a card with its preview image, date, and title. |
| FR014 | Clicking a card opens a modal with the full entry: title, date, image, and content. |
| FR015 | You build the site with `npm run build` and deploy it to Render as a static site. |

You write the bold tasks yourself. For the others, you can ask the agent for help.

## Setup

```
npm install
npm run dev
```

Vite, React, and Tailwind are already installed and set up. You can build
everything in this project with them.

You may add a UI kit such as daisyUI or shadcn/ui, or a form library such as
Formik, and the agent will help you set it up. None of them is expected, and you
learn more from building your own modal and your own validation.

Don't add a state library such as Zustand, Redux, or Jotai. These libraries
replace React's own state and effects, which is what this project teaches. Your
entries, your modals, and your form use React state and effects the whole week.

You don't need an API key, a server, or a `.env` file. Your entries are stored in
your browser's `localStorage`, not in the repo. If you clear your browser data,
your diary is gone too, so don't write anything there that you would mind losing.

## What you write yourself

You write three kinds of code yourself:

- building UI from components: a component that returns markup, a list rendered
  from data, and markup that depends on a condition
- state: a value held in `useState` and changed with its setter
- effects: code in `useEffect` that loads data when the component mounts and saves
  it when something changes

The agent won't write any of these for you until you have written one yourself,
committed it, and explained it. Until then, it explains them and talks you through
them.

You can ask the agent to help with everything else:

- all styling: the Tailwind classes, the card grid, the modal's frame, the
  responsive layout, and the empty state
- the validation for FR010 that checks whether all four fields are filled in
- the date check for FR009 that finds out whether a day already has an entry
- the storage part of FR008: reading, writing, and parsing the JSON in
  `localStorage`
- the sort function behind FR011, but not the `.map()` that renders the list
- the Render build settings for FR015
- the git and GitHub work for FR001 and FR002: branches, Pull Request
  descriptions, and merges

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

Explaining your code helps you check your own understanding. Your answers aren't
graded or saved. The agent only records that you finished the task.

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

## Planning your components

Sketch the layout before you start, on paper or in any drawing tool. Here is one possible
component tree. How you split the UI into components is your decision, and FR011
and FR013 ask you to make it.

```
App                ← holds the entries, the selected entry, and the modal flags
├── Header
│   └── AddEntryButton      ← opens AddEntryModal
├── EntryList               ← the cards, newest first
│   └── EntryCard           ← a click selects the entry and opens ViewEntryModal
├── AddEntryModal
│   └── EntryForm
└── ViewEntryModal
    └── EntryDetails
```

This repo contains three of these files, `App.jsx`, `EntryCard.jsx`, and
`EntryList.jsx`, plus the Vite entry point `main.jsx`. You create the others and
name them as you like.

Keep notes wherever you like, and turn them into GitHub Issues in your repo once
they are clear. Ask for help if you are stuck for more than 30 minutes, and use the
daily stand-ups.

## Running it

Open this folder at the repository root in VS Code and start Claude Code there
(not in a subfolder, or hooks and settings won't load). Keep the same git email
on every machine so your progress stays under one record.

To adjust how the agent talks to you (such as shorter answers or simpler
language), ask it to save a personal skill in `~/.claude/skills/`. That skill
cannot change which files or topics stay yours.

`.vscode/settings.json` turns off inline ghost-text suggestions, and `README.md`,
`CLAUDE.md`, `AGENTS.md`, and the `.claude/` setup files are read-only so neither
you nor the agent edits the rules by mistake. If you use another coding agent
(Codex, Gemini CLI, Copilot, or Cursor), point it to `AGENTS.md` — only Claude
Code enforces these rules with hooks.

If a requirement seems wrong or unclear, talk to your instructor. These locks
are here to help you learn.
