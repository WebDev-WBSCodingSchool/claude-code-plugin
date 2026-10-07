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

You write the bold tasks yourself. For the others, you can ask the agent for help.

In this project, every requirement is bold. All HTML and CSS stays yours until the
group marks the exercise as done. After that, the agent may help with all of it,
but you still have to ask for each change.

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

If you use a different agent, such as Codex, Gemini, Copilot, or Cursor, it should
read `AGENTS.md`, which has the same rules written for other agents. Only Claude
Code is held to the rules by hooks. If your agent reads a different instructions
file, point it to `AGENTS.md` yourself.

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

The bold tasks stay yours for the whole exercise.

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

- Header and navigation (FR002) — Jane
- The content sections (FR003) — Mo Ahmadi
```

You can use a list, a table, or prose, in German or English. Each member appears
twice: once in the member list with their git email, and once on a task. On the
task line, a name is enough. The agent stores progress under the email, so the
email has to appear once.

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

On the first day, the whole project is `index.html` and `css/style.css`. Every one
of you works in the same two files, and the header someone is styling sits a few
lines above the section someone else is writing. Resolve merge conflicts together.

Ask for help if you are stuck for more than 30 minutes. Use the daily stand-ups.
In a two-day project, that means one stand-up on the morning of day two. Don't
skip it because the project is short.

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
