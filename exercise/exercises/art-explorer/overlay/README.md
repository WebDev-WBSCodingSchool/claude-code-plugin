# Art Institute Explorer

TypeScript II. Solo project with a presentation at the end. Two days
full time, five days part time.

You build a search for the collection of the Art Institute of Chicago. The user
searches for artworks, saves them to a gallery that survives a reload, and adds a
note to each saved artwork. Every piece of data from the API goes through a Zod
schema before the app uses it.

## How you work

1. Run `npm install`, then `/onboard`. `/onboard` puts this repo on GitHub and
   checks your setup. This step is done when all checks pass and `npm run dev`
   shows the app.
2. Pick a task and create a branch for it, for example
   `git switch -c FR003-artwork-schema`.
3. Write the code, commit it, and explain it to the agent. This step is done when
   the agent records your sign-off. See "Write it, commit it, explain it" below.
4. Merge the branch into `main` and push it:

   ```
   git switch main
   git merge FR003-artwork-schema
   git push
   ```

   You work alone, so you don't need a Pull Request. Open one anyway if you want to
   read the diff on GitHub before you merge. Then go back to step 2.

## Requirements

| id | requirement |
| --- | --- |
| FR001 | The project uses React and Vite with TypeScript. This repo already has that setup, see "Setup". |
| FR002 | Add Zod to the project. It is missing from `package.json` on purpose. |
| **FR003** | `ArtworkSchema` describes an artwork with at least its id, title, artist, and image. It sets defaults for fields the API leaves out. |
| **FR004** | A helper function queries the Art Institute's search endpoint and validates the response. It handles bad data instead of passing it on. |
| FR005 | A search interface lets the user type a query and see the results. |
| **FR006** | `ArtworkCard` shows one artwork's image, title, and artist. The search results and the gallery both use it. |
| **FR007** | `Gallery` shows the saved artworks. |
| FR008 | "Add to Gallery" saves an artwork to `localStorage`, so it survives a reload. |
| FR009 | The gallery shows every saved artwork through `ArtworkCard`. |
| **FR010** | The user can add and edit a short note for each saved artwork. A small schema of its own validates the note. |
| FR011 | The user can delete a saved artwork, which also deletes its note. |
| **FR012** | Components and state use types derived from the schemas. You don't write those types a second time by hand. |

You write the bold tasks yourself. For the others, you can ask the agent for help.

## Setup

The project uses React, TypeScript, Zod, and Vite. You don't need any other
libraries.

FR001 is already done. This repo is the output of `npm create vite@latest` with the
`react-ts` template: Vite 8, React 19, TypeScript 6, and oxlint. The repo ships
that way because `npm create vite` refuses to run in a folder that already
contains files, and this folder contains the course files. Run `npm install`, then
`npm run dev`. Read `package.json`, `vite.config.ts`, and `tsconfig.app.json`
before you start.

FR002 is not done. Zod is missing from `package.json` on purpose. Install it
yourself with `npm install zod`. You need it before any other task.

The Art Institute's API needs no API key, no header, and no account, so you don't
need a `.env` file. Read the API docs at <https://api.artic.edu/docs/> before you
write your first URL. They explain which fields the API returns by default and
which ones you have to request.

## What you write yourself

You write two kinds of code yourself:

- type annotations: the props a component takes, the shape of your state, what a
  helper returns, and the type you derive from a schema
- schemas: the object, its fields, its defaults, and the parse call that runs data
  through it

The agent won't write any of these for you until you have written one yourself,
committed it, and explained it.

This means the agent can write a whole component in JSX without any annotations,
and you add the types afterwards. That's an unusual way to write TypeScript, and
it's on purpose. The annotations are the hard part, and you will be asked about
them in the presentation.

You can ask the agent to help with everything else:

- all JSX and all styling: the search form, the card markup, the gallery layout,
  and the CSS
- the fetch call: building the URL, calling it, and handling a failed request
- reading and writing `localStorage`, and the code that adds and deletes artworks
- state and effects, as long as they contain no type annotations
- features beyond the twelve requirements
- explaining errors, reading the API docs with you, and finding out why one of your
  schemas throws

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
