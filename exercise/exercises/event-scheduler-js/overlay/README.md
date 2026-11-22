# Event Scheduler

Advanced React I: React Router. Group project with a presentation at a
time your instructor sets. Five days full time, ten days part time.

You build the frontend of an event scheduler. Users browse upcoming events, sign
up, and sign in. Signed-in users create, edit, and delete events. The data comes
from the Events API, which you run on your own computer.

## How you work

1. Run `npm ci` (so Vite and `oxlint` work locally), then `/onboard`. `/onboard`
   puts this repo on GitHub and checks your setup. One of you runs it and adds
   the others as collaborators. The others clone that repo instead of setting the
   project up again, run `npm ci`, and run `/onboard` in their clone. This step
   is done when all checks pass, except the `PLAN.md` check, which step 2 fixes.
2. Meet as a group and write `PLAN.md` together. This step is done when the
   `PLAN.md` check passes. Until then, the agent writes no code for anyone in the
   group. See "Before any of that: PLAN.md" below.
3. Pick a task and create a branch for it, for example
   `git switch -c FR011-home-page`.
4. Write the code, commit it, and explain it to the agent. This step is done when
   the agent records your sign-off. See "Write it, commit it, explain it" below.
5. Open a Pull Request. This step is done when it is merged. Then go back to step 3.

## Requirements

| id | requirement |
| --- | --- |
| FR003 | The group works in one public repo on GitHub. Every member is a collaborator. |
| FR004 | You work on task branches and merge every code change into `main` through a Pull Request. |
| FR005 | You build on the React and Vite starter in this repo. |
| FR006 | The group agrees on one styling solution at the kickoff and uses it everywhere. |
| **FR007** | The app's route tree uses React Router in Declarative Mode, including its layouts and outlets. |
| FR008 | The protected tasks below use React state and effects. |
| **FR009** | The app stores the authentication token in `localStorage` and reads it from there. |
| FR010 | The Events API runs locally, preferably at `http://localhost:3001`. |
| **FR011** | The home page fetches the events and shows them as cards in chronological order. It shows the user when the request fails. |
| **FR012** | Each event card links to `/events/:id` through React Router. |
| **FR013** | The details page reads the event id from the route and fetches that event. It shows the user when the request fails. |
| **FR014** | The sign-up page registers a user and shows whether it worked. After a successful sign-up, it navigates to the sign-in page. |
| **FR015** | The sign-in page signs a user in and shows whether it worked. After a successful sign-in, it stores the returned token and navigates home. |
| **FR016** | A protected layout guards the routes that need a signed-in user. It redirects signed-out users to the sign-in page. |
| **FR017** | A signed-in user can create an event through an authenticated request and sees the result. |
| FR018 | Every request that needs authentication sends the stored token. |
| FR019 | Users get clear feedback for API errors, network errors, authentication errors, and missing resources. |
| FR020 | The interface works on mobile and desktop. |
| FR021 | You build the frontend and deploy the static output to Render. |
| **FR022** | A signed-in user can edit an event. The form loads with the event's current data, and after saving, the page shows the updated event. |
| **FR023** | The details page cancels or ignores stale requests, so fast navigation never shows the wrong event. |
| **FR024** | The shared header shows the signed-in user, and the layout passes that user to nested pages. |
| **FR025** | Users can move through every page of events with previous and next buttons. |
| **FR026** | While an event is being created, the page shows that it is working and disables the submit button. |
| **FR027** | A signed-in user can delete an event after confirming. Afterwards, the event list no longer shows it. |
| **FR028** | Unknown URLs and missing events show a Not Found page. |
| **FR029** | Users can sign out from the shared header. Signing out clears the session and leaves protected pages. |

You write the bold tasks yourself. For the others, you can ask the agent for help.

## Setup

- Agree on one styling solution at the kickoff and keep it.
- Keep the committed versions of Vite and React Router, and stay in React Router
  Declarative Mode.
- Run the Events API at `http://localhost:3001` if you can, so every clone works
  with the same setup.
- You need Node.js 22.22 or newer.

Install and start the app with:

```bash
npm ci
npm run dev
```

The backend is a separate repository. Clone the
[Events API](https://github.com/WebDev-WBSCodingSchool/events-api) into the folder
where you keep your projects, then follow its README to run it with npm or Docker.
You can ask the agent for help with that.

## What you write yourself

These are the topics of this module. You write them yourself:

- React state and effects
- declarative routing
- GET, POST, PUT, and DELETE requests
- error handling for requests, and the feedback the user sees
- the frontend authentication flow

The agent won't write any of these for you until you have written one yourself,
committed it, and explained it.

You can ask the agent to help with everything else:

- Git, branches, Pull Requests, and reasonable dependency updates during the
  kickoff
- setting up and running the Events API with npm or Docker
- page and component markup, sorting events by date, and the styling solution
  your group chose
- the responsive layout, and other UI work that doesn't touch a protected topic
- deploying to Render, including the redirect files Render needs, but not
  installing hosting CLIs
- optional features such as editing a profile, once their protected topics are
  open

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

### Reviewing a teammate's code counts

You can also unlock a topic by reviewing a teammate's Pull Request on GitHub
(even if already merged) and answering the agent's questions about their code.
You can never have more reviewed tasks than written ones, so everyone writes
their first task themselves.

## Before any of that: PLAN.md

The agent writes no code for anyone in the group until `PLAN.md` exists and every
member listed in it has at least one task. Meet first on a shared screen and
write it together.

`PLAN.md` has two parts: first, a short description in your own words of what
you are building, who uses it, and what is in or out of scope; second, the
initial split listing every member with their `git config user.email` and every
task with its owner's name:

```markdown
## Members

- Jane Student — jane.student@mail.com
- Mo Ahmadi — mo.ahmadi@mail.com

## Tasks

- Home page event list (FR011) — Jane
- Sign-up page (FR014) — Mo Ahmadi
```

Use a list, table, or prose in German or English.

Before you split the tasks, decide which layout holds the signed-in user and the
token, and what the outlet context passes to nested pages. Sign-in, the protected
layout, the shared header, and sign-out all depend on that decision.

Run `/onboard` to check `PLAN.md` — the agent points out unclaimed work or
overlaps, and re-reads it live on every code write. If someone leaves the group,
remove them from the member list. A rough plan is enough, and you can change it
later.

## Splitting the work

After kickoff, move active tasks into GitHub Issues (`/onboard` can create them
from `PLAN.md`; changes don't sync back). Write issues yourselves — the agent
can flag uneven loads, dependencies, or shared files.

Several tasks share `src/App.jsx`, `src/layouts/MainLayout.jsx`,
`src/pages/HomePage.jsx`, `src/pages/EventDetailsPage.jsx`, and
`src/pages/CreateEventPage.jsx`. Give each of these files one owner, or agree on
the order of the changes. Resolve merge conflicts together.

Ask for help if you are stuck for more than 30 minutes. Use the daily stand-ups.

## Running it

Open this folder at the repository root in VS Code and start Claude Code there
(not in a subfolder, or hooks and settings won't load). Keep the same git email
on every machine so your progress stays under one record.

To adjust how the agent talks to you (such as shorter answers or simpler
language), ask it to save a personal skill in `~/.claude/skills/`. That skill
cannot change which files or topics stay yours.

`.vscode/settings.json` turns off inline ghost-text suggestions, and `README.md`,
`CLAUDE.md`, `AGENTS.md`, `PLAN.md`, and the `.claude/` setup files are read-only
so neither you nor the agent edits the rules by mistake. If you use another
coding agent (Codex, Gemini CLI, Copilot, or Cursor), point it to `AGENTS.md` —
only Claude Code enforces these rules with hooks.

If a requirement seems wrong or unclear, talk to your instructor. These locks
are here to help you learn.
