# Art Institute Explorer — 023 TypeScript II

Two days (full time) / five days (part time). Solo project, mandatory
presentation at the end.

This repo is your starting point. **Fork it once** and work in your fork. Every
change merges to `main` through a Pull Request.

## Where you are

Four stages. Each stage names what ends it, which is the part easy to lose sight
of from the inside.

1. **Fork it, clone it, run `/onboard`.** Ends when the setup checks pass and you
   have answered the two questions in "Before you write code" below.
2. **Pick a task, cut a branch.** `git switch -c <task-id>-<short-name>`. Ends
   when you have a branch for the work instead of committing to `main`.
3. **Write it, commit it, explain it.** Ends when the sign-off is recorded. It
   tells you what just opened up.
4. **Open a Pull Request.** Ends when it is merged. Then return to stage 2 with
   the next task.

## The requirements

| id | what it asks for |
| --- | --- |
| FR001 | React and Vite in TypeScript. Already scaffolded in this repo, see "The setup". |
| FR002 | Add Zod. It is deliberately missing from `package.json`. |
| **FR003** | `ArtworkSchema`, with id, title, artist and image at least, and sensible defaults where the API leaves a field out. |
| **FR004** | A helper that queries the Art Institute's search endpoint and validates what comes back. Bad data gets handled, not passed on. |
| FR005 | A search interface: type a query, get results. |
| **FR006** | `ArtworkCard`, showing one artwork's image, title and artist. Both the results and the gallery use it. |
| **FR007** | `Gallery`, showing the artworks that have been saved. |
| FR008 | Add to Gallery: a saved artwork survives a reload, in `localStorage`. |
| FR009 | The gallery shows every saved artwork, through `ArtworkCard`. |
| **FR010** | A short note per saved artwork, added and edited by the user, validated by its own small schema. |
| FR011 | Delete an artwork, and its note with it. |
| **FR012** | Types threaded through components and state, taken from the schemas rather than written a second time. |

**Bold = you type this one yourself.** For the others, you may ask the agent to
help you implement them.

## The setup

This project is React, TypeScript, Zod and Vite, and that is the whole toolchain.
The reason to keep it there is the clock: you have two days, and an hour spent
wiring up a fourth library is an hour not spent on the typing and the validation
this module exists to teach.

**FR001 is already done for you.** This repo is what the `react-ts` template of
`npm create vite@latest` produces, meaning Vite 8, React 19, TypeScript 6 and
oxlint. It arrives that way because that command refuses to run in a folder that
already has files in it, and this one arrives with a harness in it. Run `npm
install`, then `npm run dev`, and the app is on localhost. Read `package.json`,
`vite.config.ts` and `tsconfig.app.json` once before you start: you are expected to
know what is in the project you are working in.

**FR002 is not done for you.** Zod is missing from `package.json` on purpose. `npm
install zod` is yours to run, and it is the first thing you will need.

Nothing here needs an API key. The Art Institute's API is open, with no token, no
header and no account, so there is no credential to keep out of this repo. Read
their docs at <https://api.artic.edu/docs/> before you write your first URL,
particularly the part about which fields come back by default and which you have to
ask for.

## What you type, and where the agent can help

Two topics, and they are why this module exists: **typing a React app** and
**runtime validation**. Every type annotation in this project is yours: the props a
component takes, the shape of your state, what a helper returns, the type that
comes out of a schema. So is every schema: the object, its fields, its defaults,
and the parse that runs data through it. The agent will not write either of those
for you until you have written that kind of code yourself and explained it.

What that leaves the agent is most of the code and none of the types. It can write
a whole component in JSX with nothing annotated, and you thread the types through
it afterwards. That is an odd way to write TypeScript and it is deliberate: the
annotation is the part that is hard to get right, and it is the part you will be
asked about in the presentation.

**Everything else you may ask the agent to help implement:**

- All JSX and all styling: the search form, the card markup, the gallery layout,
  the CSS.
- The fetch call itself: building the URL, calling it, handling the failure.
- Reading and writing `localStorage`, and the add and delete plumbing around it.
- State wiring and effects, as long as nothing in them is annotated.
- Anything past the twelve requirements: extra features, polish, ideas of your own.
- Explaining an error, reading the API docs with you, and working out why a parse
  you wrote is throwing.

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
`git log` shows who wrote what, which is more use to you than trying to remember in
week three.

## Before you write code

Two questions. They cost five minutes each and they are the two this project
punishes you for answering late.

**How much of this are you actually going to build?** Twelve requirements, two
days. Decide now which parts are in, which are stretch, and which you are leaving
out on purpose, then write that down somewhere you will still see it on day two.

**What is a saved artwork, once it is in `localStorage`?** The whole object the API
sent, or four fields you picked out of it? And does what comes back out get
validated on the way in, or do you trust it because you were the one who wrote it?
FR008 stores it, FR009 reads it, FR010 hangs a note off it and FR012 wants a single
type describing it. Answer this once, before the first thing is saved, and those
four stop arguing with each other.

Run `/onboard` and the agent will put both to you and check the rest of your setup.
It will not answer either of them for you.

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
after you ask, so it is not a page the agent gets to reword. Your own writing
about your project goes in files you make, whether that is your notes, your
Issues, or anything else you want.

If you think a requirement is wrong or unclear, say so to your instructor. That is
a conversation, not a diff.

None of these locks is a cage, and you should know that up front. Read-only here
means VS Code rejects typing in those buffers, there is a setting to change that,
and you can use other editors. But none of it can happen quietly. Every file
named above is committed, so any change lands in your PR with your name on it.
That is the mechanism: not "you cannot", but "it is visible".
