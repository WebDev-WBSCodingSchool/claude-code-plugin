# Figma and Tailwind CSS

Intro to JavaScript. Group project with a presentation at a time your instructor
sets. Two days full time, ten days part time.

You build a one-page website from a design, with semantic HTML and Tailwind CSS.
The page works on phones first and adapts to wider screens. At the end, you deploy
it with GitHub Pages.

Choose your design before anything else. All three options count the same:

- Design your own wireframe in Figma, with a header and navigation, a main part
  made of sections, and a footer.
- Re-create the [Find Your Dream Home template](https://www.figma.com/design/cJMWiom7k05yqZVF5F5ztJ/Find-Your-Dream-Home-Website-UI-Template--Community-?node-id=0-1)
  as closely as you can. The tasks below are named after its sections, so this is
  the easiest option.
- Bring a design you found somewhere else. Ask your instructor first. The answer
  is usually yes, unless the design is far too big for the project.

If you use your own design, rename the eight tasks below after your own sections
and keep about the same number.

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
   `git switch -c T1-header`.
4. Write the code, commit it, and explain it to the agent. This step is done when
   the agent records your sign-off. See "Write it, commit it, explain it" below.
5. Open a Pull Request. This step is done when it is merged. Then go back to step 3.

## Requirements

| id | requirement |
| --- | --- |
| FR001 | The group settles on a design first: your own Figma wireframe, the Dream Home template, or another design your instructor has approved. |
| FR002 | The group shares one public repo. Don't add instructors as collaborators. |
| FR003 | You deploy the finished project with GitHub Pages. |
| **FR004** | The page uses semantic HTML. You choose each element for what the content is, not for how it looks. |
| FR005 | Tailwind CSS does the styling and loads from the CDN. `index.html` already includes it. |
| **FR006** | The plain classes describe the phone layout. Breakpoint prefixes adjust it for wider screens. |
| FR007 | Every change reaches `main` through a Pull Request. |
| FR008 | The text, colors, and images are your own, not the template's placeholders. |
| **FR009** | You use Flexbox and Grid, each where it fits, and you can explain your choice for every section. |

FR004, FR006, and FR009 apply to all eight sections, so they aren't split between
people. The sections are what you split:

| id | section |
| --- | --- |
| **T1** | Header and navigation |
| **T2** | Hero and property search bar |
| **T3** | "We help you find" section with the stats row |
| **T4** | "Why choose us" feature cards |
| **T5** | Popular residences: the property cards |
| **T6** | Testimonials |
| **T7** | Get-help call to action, with its form |
| **T8** | Footer |

The eight sections are the tasks. When this page talks about bold tasks, it means
T1 to T8. You write your first section yourself. For the requirements that aren't
bold, you can ask the agent for help. Each section is markup and styling, each
one has to meet FR004, FR006, and FR009 on its own, and all of them live in
`index.html`.

Nobody writes all eight sections by hand. After you sign off your first section,
the agent may work on the other sections with you. Each of you takes at least one
section and starts it early, because nobody gets agent help until they have
signed off a section.

## Setup

The project is HTML files, Tailwind from the CDN in a `<script>` tag, and your own
images. Nothing needs to be installed.

- Don't add `npm install`, a build step, or the Tailwind CLI. If one of you adds
  one, everyone else's clone stops working until they run the install too.
- A small library from a CDN, such as a date picker or an animation, is fine. It's
  one `<script>` tag, and nothing needs to be installed.
- The site has to work without JavaScript. Extras such as the current year in the
  footer or a library you added come after the page is done.

Install the Tailwind CSS IntelliSense extension (`bradlc.vscode-tailwindcss`) in
VS Code. It completes utility class names and shows the CSS behind a class when you
hover over it. The extension only turns on when the project has a stylesheet with
the Tailwind directive, which is why `styles.css` exists and is linked. Put any CSS
that Tailwind can't express in that file too.

You don't create any local files that stay out of git. Everything you make,
including your images, is committed.

## What you write yourself

You write two kinds of code yourself:

- the markup: which element each part of the page is, and how the elements nest
- the styling: the utility classes that turn the markup into the design,
  including responsive and state variants, and any CSS in `styles.css` for what
  Tailwind can't express

The agent won't write any of these for you until you have written one yourself,
committed it, and explained it.

The markup and the styling are separate topics, and when the agent declines, it
says which one. They open together, though. Your first signed-off section opens
markup, utility classes, and plain CSS everywhere in the project, not only in the
section you wrote.

You can ask the agent to help with everything else:

- turning on GitHub Pages, and finding out why it shows a blank page
- git: branches, Pull Requests, review comments, merge conflicts, and recovering
  work that looks lost
- your text: headlines, section text, and button labels
- finding images, sizing them, and writing their `alt` text
- choosing colors and fonts
- reviewing your markup for accessibility, heading order, and elements used for
  the wrong job
- explaining what a Tailwind class does, what a breakpoint prefix means, and why
  one layout approach will cause problems later
- your own notes, except `PLAN.md`, and the presentation

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

- Header and navigation (T1) — Jane
- Hero and property search bar (T2) — Mo Ahmadi
```

Use a list, table, or prose in German or English.

While you are all together, answer these four questions as a group. Groups often
find out on day four that they disagreed about them:

- How do you start mobile-first in Tailwind? Which classes describe the phone
  layout, and which ones only apply from a breakpoint on?
- Which parts of the design will need the most changes at phone width? Look at the
  design and name them now.
- Where do your breakpoints go? Choose them once, together, so that eight sections
  don't use eight different ideas of "tablet".
- When is a section done? Make it concrete enough that you know when to open the
  Pull Request instead of polishing further.

Write down what you agree on — it doesn't have to be perfect, just shared.

Run `/onboard` to check `PLAN.md` — the agent points out unclaimed work or
overlaps, and re-reads it live on every code write. If someone leaves the group,
remove them from the member list.

## Splitting the work

After kickoff, move active tasks into GitHub Issues (`/onboard` can create them
from `PLAN.md`; changes don't sync back). Write issues yourselves — the agent
can flag uneven loads, dependencies, or shared files.

All eight sections live in `index.html`, so every one of you edits that file all
week. No project in the course causes more merge conflicts, and no way of
splitting the work avoids them. Keep your sections in the order they appear on the
page. Pull `main` before you start and again before you open the Pull Request.
Resolve merge conflicts together. Ask for help if you are stuck for more than
30 minutes, and use the daily stand-ups.

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
