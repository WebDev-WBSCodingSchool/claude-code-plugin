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

You write the bold tasks yourself. For the others, you can ask the agent for help.

The eight sections are the tasks. When this page talks about bold tasks, it means
T1 to T8. Each one is markup and styling, each one has to meet FR004, FR006, and
FR009 on its own, and all of them live in `index.html`.

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

- Header and navigation (T1) — Jane
- Hero and property search bar (T2) — Mo Ahmadi
```

You can use a list, a table, or prose, in German or English. Each member appears
twice: once in the member list with their git email, and once on a task. On the
task line, a name is enough. The agent stores progress under the email, so the
email has to appear once.

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

Write down what you agree on. It doesn't have to be perfect, but everyone has to
use the same answers.

Run `/onboard`, and the agent guides the conversation. It points out work nobody
has taken and places where two of you will edit the same code, and it checks the
file. It won't write any of `PLAN.md`, because the check reads that file, and an
agent that wrote it could unlock itself.

The agent reads `PLAN.md` again before every code change. If you edit it so that a
member has no task, the agent stops writing code for everyone until you fix it. If
someone has left the group, remove them from the member list.

A rough plan is enough, and you can change it later.

## Splitting the work

After the kickoff, your tasks live in GitHub Issues in your group's repo, not in
`PLAN.md`. `/onboard` can create the issues from your task lines, or you can
create them by hand. Nothing syncs them back to `PLAN.md`.

Write the issues yourselves. The agent won't break the work down for you. Once you
have a draft, it tells you if one person has much more work than the others, if a
task waits on two other people, or if two of you are about to edit the same code.

All eight sections live in `index.html`, so every one of you edits that file all
week. No project in the course causes more merge conflicts, and no way of
splitting the work avoids them. Keep your sections in the order they appear on the
page. Pull `main` before you start and again before you open the Pull Request.
Resolve merge conflicts together.

Ask for help if you are stuck for more than 30 minutes. Use the daily stand-ups.

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
