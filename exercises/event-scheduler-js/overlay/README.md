# Event Scheduler

#### Duration: Five days (full time) / ten days (part time)

#### Presentation: Mandatory, at a time set by your instructor

#### Format: Group project

This repo is your starting point. **Put it on GitHub once for your group**:
one of you runs `/onboard`, which walks you through it, and adds the others as
collaborators. They clone that repo instead of setting the project up again.
One repo, everyone works in it, and every change merges to `main`
through a Pull Request.

## Get started

There are five stages. Each one names what ends it, since that's the part
that's easy to lose sight of from the inside.

1. Run `/onboard`, which puts this repo on GitHub, or clone your group's copy
   if a teammate already did and run `/onboard` there. This
   ends when the only open item is `PLAN.md`. That's stage 2, and it stays
   open until you get there. Everything above it should pass.
2. Meet, and write `PLAN.md` together. This ends when the check passes: every
   member listed has a task line, and your own git email is one of them. Until
   then the agent writes no code for anyone in the group. Refer [below](#before-any-of-that-planmd) for more details on PLAN.md
3. Pick a task, and cut a branch: `git switch -c <task-id>-<short-name>`. This
   ends when you have a branch for the work instead of committing to `main`.
4. Write it, commit it, explain it. This ends when the sign-off is recorded,
   and it tells you what just opened up.
5. Open a Pull Request. This ends when it is merged. Then return to stage 3
   with the next task.

## The requirements

| ID        | Requirement                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| FR003     | Work in one public repo on GitHub, and add every teammate as a collaborator.                                               |
| FR004     | Work on task branches and merge every code change into `main` through a Pull Request.                                     |
| FR005     | Build on the provided React and Vite starter.                                                                             |
| FR006     | Agree on one styling solution at kickoff and use it consistently.                                                         |
| **FR007** | **Configure the app's route tree with React Router in Declarative Mode, including its layouts and outlets.**              |
| FR008     | Use React state and effects in the protected feature work below.                                                          |
| **FR009** | **Store and retrieve the authentication token in `localStorage`.**                                                        |
| FR010     | Run the provided Events API locally, preferably at `http://localhost:3001`.                                               |
| **FR011** | **Fetch the events for the home page, show failures, and display the results as chronological cards.**                    |
| **FR012** | **Make each event card navigate to `/events/:id` through React Router.**                                                  |
| **FR013** | **Read the route ID, fetch that event on the details page, and show failures to the user.**                               |
| **FR014** | **Register a user, show success or failure, and navigate to Sign-In after success.**                                      |
| **FR015** | **Sign a user in, show success or failure, store the returned token, and navigate home.**                                 |
| **FR016** | **Guard authenticated routes with a protected layout and redirect signed-out users to Sign-In.**                          |
| **FR017** | **Let a signed-in user create an event through an authenticated request and show the result.**                            |
| FR018     | Attach the stored token to every request that needs authentication.                                                       |
| FR019     | Give users clear feedback for API, network, authentication, and missing-resource errors.                                  |
| FR020     | Keep the interface usable on mobile and desktop.                                                                          |
| FR021     | Build the frontend and deploy the static output to Render.                                                                |
| **FR022** | **Editing Events: Load an event into a prefilled form, save edits, and show the updated event.**                          |
| **FR023** | **Fetch: Cancel or ignore stale requests so fast navigation never shows the wrong event details.**                        |
| **FR024** | **Layout: Show the signed-in user in the shared header and pass that user to nested pages.**                              |
| **FR025** | **Pagination: Let users move through every page of events with previous and next controls.**                              |
| **FR026** | **Create Event User Feedback: Show when event creation is in progress and disable submission until it finishes.**         |
| **FR027** | **Signed in users can delete events: Confirm and delete an event, then return to an event list that no longer shows it.** |
| **FR028** | **404 page: Show a clear Not Found page for unknown app URLs and missing events.**                                        |
| **FR029** | **Logout: Let users sign out from the shared header, clear their session, and leave protected pages.**                    |

**Bold = you type this one yourself.** For the others, you may ask the agent to
help you implement them.

## The setup

- Agree on one styling solution at kickoff, and stick with it.
- Keep the committed versions of Vite and React Router stable, and stay in
  React Router Declarative Mode.
- Keep the Events API at `http://localhost:3001` when practical, so every
  teammate's clone runs with the same setup.
- Requires Node.js 22.22 or newer.

Install and run it with:

```bash
npm ci
npm run dev
```

The backend is a separate repository. Clone the
[Events API](https://github.com/WebDev-WBSCodingSchool/events-api) wherever you
keep local projects, then follow its README to run it with npm or Docker. You
can ask an agent for help.

## What you type, and where the agent can help

You write these yourself, since they are the module topics this project exists
to practise. Each one stays yours until you have written and explained one
matching task:

- React state and effects
- Declarative routing
- GET, POST, PUT and DELETE requests
- Request error handling and feedback
- The complete frontend authentication flow

**Everything else you may ask the agent to help implement:**

- Git, branches, Pull Requests and reasonable dependency updates during kickoff
- Setting up or running the separate Events API with npm or Docker
- Page and component markup, chronological sorting, and the styling solution your group chose
- Responsive layout and other UI work that does not write a protected topic for you
- Render deployment guidance and required redirect files, but not installing hosting CLIs
- Optional features such as profile editing, once their protected topics have opened

**The agent waits to be asked.** It will not start building just because a file
is empty or your plan is finished. This isn't a to-do list it works through on
its own, so ask it for what you want. Before every code edit, it asks at least
one question about your requested change and waits for your answer.

Yes, this tells you exactly what you could paste into a browser chat instead.
You're given the rule directly rather than fenced in by it. A rule you can read
is one you can choose to follow.

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

**What changes afterwards.** Once you have written and explained one piece of
a given kind of code, the agent will write that kind with you for the rest of
the project, including in features that are nowhere in the requirements.

Which of the tasks marked in bold you have done is kept in a small file under
`.claude/harness/progress/`, filed under your git email. The agent writes it
once you have explained your commit, and you commit it like anything else. Ask
it where you stand whenever you want to know.

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
every member listed in it has at least one task.** Meet first, one call with
one screen shared, and write it together.

It has two halves:

- A short restatement **in your own words** of what you are building, who
  uses it, and how much of it you are actually going to build. Name which
  parts are in and which you are leaving out on purpose. This is usually
  where two of you find out you pictured different amounts of work, so write
  down what you agree on.
- The split: everyone's **git email** (the address `git config user.email`
  prints), and each of you again on the task you took.

Before you split the tasks, settle which layout owns the signed-in user and
token, and what the outlet context exposes to nested pages. The login,
protected layout, shared header and sign-out work all depend on that contract.

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

Run `/onboard` and the agent will guide the conversation, point out unassigned
parts and places where two of you will collide, and check the file. **It will
not write a word of it.** `PLAN.md` is what the check reads, so an agent that
could write it would clear its own way.

**The check is live.** Edit `PLAN.md` so that someone has no task, and the
agent stops writing code for everyone until the line is fixed. There is
nothing to re-run: it reads the file again on the next write. If someone has
actually left the group, take them off the member list. That's the right
answer, not a slight.

A sketch is enough, and it is allowed to change. The question is whether you
have a plan, never whether it was any good.

## Splitting the work

`PLAN.md` is the snapshot from the kickoff. **From then on your tasks are
GitHub Issues on your repo.** `/onboard` can create them from your task lines,
or you can make them by hand. The issues are the live version, and nothing
syncs them back.

Write them yourselves either way. The agent will not give you a breakdown.
Once you have a draft, it will tell you if:

- the load looks lopsided
- something is blocked on two other people
- two of you are about to edit the same function

That last one will happen. Keep tasks that share `src/App.jsx`,
`src/layouts/MainLayout.jsx`, `src/pages/HomePage.jsx`,
`src/pages/EventDetailsPage.jsx` or `src/pages/CreateEventPage.jsx` with one
owner, or sequence those changes deliberately. Resolve conflicts together;
that's the point.

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
help after you ask, so it is not a page the agent gets to reword. `PLAN.md` is
read-only to the agent as well, for a different reason: it is yours, and it is
what the check reads. Your own writing about your project goes in files you
make, whether that's `PLAN.md`, your Issues, or anything else you want.

If you think a requirement is wrong or unclear, say so to your instructor.
That's a conversation, not a diff.

None of these locks is a cage, and you should know that up front. Read-only
here means VS Code rejects typing in those buffers, there is a setting to
change that, and you can use other editors. But none of it can happen
quietly. Every file named above is committed, so any change lands in your PR
with your name on it. That's the mechanism: not "you cannot", but "it is
visible".
