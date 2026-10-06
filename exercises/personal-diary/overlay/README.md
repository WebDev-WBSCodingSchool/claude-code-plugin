# Personal Diary

#### Duration: Five days (full time) / ten days (part time)

#### Presentation: Mandatory, at a time set by your instructor

#### Format: Solo project

This repo is your starting point. **Put it on GitHub as your own repo**
(`/onboard` walks you through that), and merge every change to `main` through a
Pull Request. Keep your repo public, and do not add your instructors
as collaborators. They read it from the outside, the same way anyone else would.

You are building a diary that lives in your browser. The homepage lists your
entries newest-first as cards with a preview image, a date and a title, and
clicking a card opens the full entry in a modal. An "Add Entry" button opens a
second modal with a form for title, date, image URL and content. All four are
required, and there is one entry per day. Everything persists to `localStorage`, so
it is still there when you come back. At the end you deploy the built site to
Render.

## Get started

There are four stages. Each one names what ends it, since that's the part
that's easy to lose sight of from the inside.

1. Run `npm install`, then run `/onboard`, which puts this repo on GitHub. This ends when the check passes and `npm run dev` serves you
   a page.
2. Pick a task, and cut a branch: `git switch -c <task-id>-<short-name>`.
   This ends when you have a branch for the work instead of committing to
   `main`.
3. Write it, commit it, explain it. This ends when the sign-off is recorded,
   and it tells you what just opened up.
4. Open a Pull Request. This ends when it is merged. Then return to stage 2
   with the next task.

## The requirements

| id | what it asks for |
| --- | --- |
| FR001 | Your repo stays public, and all the code lives in it. Do not add instructors as collaborators. |
| FR002 | Every change reaches `main` through a Pull Request, including your own solo ones. |
| FR003 | React and Vite. **Already done.** This repo is a working Vite and React app: `npm install`, then `npm run dev`. |
| FR004 | Tailwind via npm. **Already done.** Tailwind v4 is installed and wired into Vite; write classes and they work. |
| FR005 | State and effects. The umbrella over the four bold rows: UI state in `useState`, side-effects in `useEffect`, nowhere else. |
| **FR006** | **Add Entry button.** A button opens the entry-creation modal, and whether that modal is open is held in state. |
| FR007 | The form collects **title**, **date**, **image URL** and **content**. |
| FR008 | Entries are stored as one array in `localStorage` and stay in step with what is on screen. |
| FR009 | One entry per day. If the chosen date already has an entry, show a message instead of accepting a second one. |
| FR010 | Submission is blocked unless all four fields are filled. |
| **FR011** | **Homepage list.** The entries render as a list, sorted newest first. |
| **FR012** | **Load entries on startup.** Stored entries are read and rendered when the app first mounts. |
| **FR013** | **Card layout.** Each entry is a card showing its preview image, date and title. |
| FR014 | Clicking a card opens a modal with the full entry: title, date, image, content. |
| FR015 | `npm run build`, then deploy the built site to Render as a static site. |

**Bold = you type this one yourself.** For the others, you may ask the agent to
help you implement them.

## The setup

```
npm install
npm run dev
```

That's the whole setup. Vite, React and Tailwind are already installed and
wired together, so the thing you would normally spend the first morning on
is done, because this week is about what you build on top of it.

Your project is Vite, React and Tailwind, and that's enough to build all of
this by hand. If you want to pull in a UI kit like daisyUI or shadcn/ui, or a
form library like Formik, nothing stops you and the agent will help you wire
it up. But none of it is expected, and hand-rolling your own modal and your
own validation is the more useful five days.

**State libraries are the one thing that stays out.** Zustand, Redux, Jotai
and the rest are not just heavier than this project needs, they replace the
exact thing it exists to teach. Your entries, your modals and your form live
in React's own state and effects for the whole week.

Nothing here needs a key, a server or a `.env` file. Your entries live in
your browser's `localStorage`, which means they are yours and they are not
in the repo, and also that clearing your browser data clears your diary. Do
not put anything in there you would mind losing.

## What you type, and where the agent can help

Three things are yours: **building UI out of components**, **state**, and
**effects**.

- Writing a component that returns markup, rendering a list from data, and
  showing one thing or another depending on a condition. That's the first.
- Holding something in `useState` and changing it with the setter. That's
  the second.
- Reaching outside the render with `useEffect`, loading on mount and writing
  back on change. That's the third.

Those are the three ideas this module is named after, and until you have
written each one yourself and explained it, the agent will talk you through
them and will not type them for you.

**Everything else you may ask the agent to help implement:**

- All the styling. Every Tailwind class, the card grid, the modal chrome,
  the responsive layout, the empty state.
- FR010's validation logic, deciding whether all four fields are filled.
- FR009's date check, deciding whether an entry already exists for the day.
- FR008's storage half: reading, writing and JSON-parsing `localStorage`.
- The sort comparator behind FR011. The `.map()` that renders it is yours.
- FR015's Render configuration and build settings.
- The git and GitHub side of FR001 and FR002: branches, PR descriptions,
  merges.

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
two, `git log` shows who wrote what, which is more use to you than trying to
remember in week three.

## Before you write code

Do not open a file yet. The requirements describe a diary, but they don't
describe *your* diary, and one of them is genuinely ambiguous:

> **FR009, one entry per day. Which day?**
>
> The day named in the form's date field, or the day you are sitting there typing?
> They are the same thing right up until someone writes up last Tuesday. Decide
> which one you mean, and write the answer down in a sentence before you build the
> check. It changes the form, the validation and the message the user sees.

Sketch the thing too. Figma, MS Paint, paper, whatever gets a layout out of your
head. The suggested component tree is below. Treat it as one answer rather than
the answer, because how you cut the UI into components is a decision FR011 and
FR013 are asking you to make.

```
App                ← owns the entries, the selected entry, the modal flags
├── Header
│   └── AddEntryButton      ← opens AddEntryModal
├── EntryList               ← the cards, newest first
│   └── EntryCard           ← click sets selectedEntry, opens ViewEntryModal
├── AddEntryModal
│   └── EntryForm
└── ViewEntryModal
    └── EntryDetails
```

This repo ships four of those files: `App.jsx`, `EntryCard.jsx`, `EntryList.jsx`
and the Vite entry point. The rest you create, named however you decide.

Keep your own notes wherever you like, and turn them into GitHub Issues on your
repo once they firm up. Ask for help if you are stuck for more than 30 minutes, and
use the daily stand-ups.

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
help after you ask, so it is not a page the agent gets to reword. Your own
writing about your project goes in files you make, whether that's your
Issues, your notes, or anything else you want.

If you think a requirement is wrong or unclear, say so to your instructor.
That's a conversation, not a diff.

None of these locks is a cage, and you should know that up front. Read-only
here means VS Code rejects typing in those buffers, there is a setting to
change that, and you can use other editors. But none of it can happen
quietly. Every file named above is committed, so any change lands in your PR
with your name on it. That's the mechanism: not "you cannot", but "it is
visible".
