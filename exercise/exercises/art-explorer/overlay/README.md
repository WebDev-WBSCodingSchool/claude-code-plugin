# Art Institute Explorer

TypeScript II. Solo project with a presentation at the end. Two days
full time, five days part time.

You build a search for the collection of the Art Institute of Chicago. The user
searches for artworks, saves them to a gallery that survives a reload, and adds a
note to each saved artwork. Every piece of data from the API goes through a Zod
schema before the app uses it.

## How you work

1. Run `/onboard`. It puts this repo on GitHub and checks your setup. This step is
   done when all checks pass.
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

If you think a requirement is wrong or unclear, talk to your instructor.

You can get around these locks, but they are here to help you to learn.
