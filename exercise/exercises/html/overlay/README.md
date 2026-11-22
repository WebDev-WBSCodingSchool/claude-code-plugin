# From concept to deployment

HTML, CSS and Git. Group project with a presentation at a time your instructor
sets. Two days.

This is the first thing you build as a team: a website made of semantic HTML and
hand-written CSS. When you're done, it's live on GitHub Pages.

The design is yours. You can get one in two ways:

- Take the basic Figma wireframe and make it your own.
- Pick a site you like from [frontendpractice.com](https://www.frontendpractice.com)
  and rebuild its look.

Both options count the same, and nothing below changes with your choice. Decide in
the first hour, together, and write your choice in `PLAN.md`, so that nobody is
still designing on day two.

## How you work

1. Run `/onboard`. It puts this repo on GitHub and checks your setup. One of you
   runs it and adds the others as collaborators. The others clone that repo
   instead of setting the project up again, and run `/onboard` in their clone.
   This step is done when all checks pass, except the `PLAN.md` check, which step
   2 fixes.
2. Meet as a group and write `PLAN.md` together. This step is done when the
   `PLAN.md` check passes. Until then, the agent writes no code for anyone in the
   group. See "Before any of that: PLAN.md" below.
3. Pick a task and create a branch for it, for example
   `git switch -c FR002-header`.
4. Write the code and commit it. You can also explain it to the agent. This step is
   done when you have committed it.
5. Open a Pull Request. This step is done when it is merged. Then go back to step 3.

## Requirements

| id | requirement |
| --- | --- |
| **FR001** | The page itself: the doctype, a head with the title, the character encoding, the viewport, and your stylesheet, and the body that holds everything else. |
| **FR002** | The header and navigation at the top of the page. The navigation takes visitors to your other sections or pages. |
| **FR003** | The content sections in the middle of the page. Each part is built from elements that say what the part is. |
| **FR004** | The footer at the bottom. It belongs to the page, not to the section above it. |
| **FR005** | Images and media, with alt text that says what each picture shows, and dimensions so the page doesn't jump while it loads. |
| **FR006** | The layout: where the boxes go, built with Flexbox and Grid. |
| **FR007** | The look: colors, fonts, spacing, borders, and what happens on hover and on keyboard focus. |
| **FR008** | Every change reaches `main` through a Pull Request that a teammate reviewed. Nobody pushes directly, not even for a typo. |
| **FR009** | The site is live on GitHub Pages, and the link is on the repo's front page. |
| **FR010** | Optional: the site is responsive. Build it for desktop first, and make it work on a phone if you have time. |

You write the bold tasks yourself. In this project, every requirement is bold,
and all HTML and CSS stays yours for the whole exercise.

FR008 and FR009 are bold for a different reason. They aren't code, so there is
nothing the agent could write for you. They are also the two tasks that groups
most often leave until the last afternoon. Do FR009 on day one, with an empty page.
Then the deployment already works before there is anything to deploy.

## Setup

The project is plain HTML and CSS files. GitHub Pages publishes your `index.html`
as it is, without a build step, and every teammate can clone the repo and open the
page in a browser without installing anything. Keep it that way:

- Don't use `npm install`, Tailwind, Bootstrap, or a CSS preprocessor. You write
  the CSS by hand.
- You may link Google Fonts and an icon set such as Font Awesome in your
  `<head>`. Other external code also has to come from a CDN as a `<link>` or
  `<script>` tag, and only at the end, after the page is done.
- If something has to be installed before the site runs, every teammate's clone
  stops working until they do the same setup. In a two-day project, nobody has
  time to debug someone else's setup.

You start with `index.html` and `css/style.css`. You may add more pages, or more
stylesheets with extra `<link>` tags or an `@import` at the top of `style.css`.
Nothing needs to be installed, and nothing is generated.

## What you write yourself

You write two kinds of code yourself, and together they are the whole site:

- semantic HTML: which elements you choose and how they nest
- CSS: the layout with Flexbox and Grid, and the colors, fonts, spacing, and hover
  and focus states

You write every tag and every rule, on both days. The agent doesn't write markup
or CSS for you, not a single element, not a few lines to get you started, and not
as text in the chat for you to copy. You have two days to learn how to build a page
with your own hands, and that only works if you do the typing.

You can ask the agent to help with everything else:

- Git, which is the biggest part of this project. Five people working in two files
  means merge conflicts, and handling them is what the workflow is for. Ask the
  agent to walk you through the cycle until you know it by heart: create a branch,
  commit, update `main`, merge `main` into your branch, push, open the Pull
  Request, and merge it on GitHub. Ask before you do something that feels like it
  might lose work. When you hit a merge conflict, the agent shows you what each
  side does and which markers to delete. You type the resolution yourself, because
  that's what you are here to learn.
- the work around the site: setting up GitHub Pages, the repo's front page, the
  `.gitignore`, and how to word an issue or a Pull Request description. The agent
  gives advice, and you write your own issues and reviews.
- reviewing your code: what is wrong and why, which element fits better than the
  one you chose, and why the layout breaks at a certain width. The agent tells you
  what to change, and you change it.
- wording, in the chat. If you are stuck on a paragraph, ask for suggestions and
  type what you like into the page. If the text doesn't matter yet, lorem ipsum is
  fine.
- anything you want to understand, including things this project doesn't use, such
  as JavaScript, frameworks, build tools, or bundlers

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

The bold tasks stay yours for the whole exercise.

### Signing your commits

`git commit --signoff` adds a `Signed-off-by: Name <email>` line to show you
wrote the code (use it on all your own commits). When the agent writes or helps
with a commit, it adds `Co-Authored-By: Claude …` instead so `git log` shows
who wrote what.

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

- Header and navigation (FR002) — Jane
- The content sections (FR003) — Mo Ahmadi
```

Use a list, table, or prose in German or English. Run `/onboard` to check it —
the agent points out unclaimed work or overlaps, and re-reads `PLAN.md` live on
every code write. If someone leaves the group, remove them from the member list.
A rough plan is enough, and you can change it later.

## Splitting the work

After kickoff, move active tasks into GitHub Issues (`/onboard` can create them
from `PLAN.md`; changes don't sync back). Write issues yourselves — the agent
can flag uneven loads, dependencies, or shared files.

On the first day, the whole project is `index.html` and `css/style.css`. Every one
of you works in the same two files, and the header someone is styling sits a few
lines above the section someone else is writing. Resolve merge conflicts together.
Ask for help if you are stuck for more than 30 minutes, and use the daily
stand-ups (including one on the morning of day two).

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
