# WBS CODING SCHOOL exercises for Claude Code

This plugin sets up WBS CODING SCHOOL assignments as ready-to-work projects. Each
project comes with its task harness, which decides which code you write yourself
and where Claude may help. Once a project is set up, it no longer depends on the
plugin.

You need Claude Code, Node.js 22 or newer, Git, and a GitHub account. The
[GitHub CLI](https://cli.github.com) (`gh`) is recommended.

## Install

Run these two commands once, in a terminal:

```sh
claude plugin marketplace add "WebDev-WBSCodingSchool/claude-code-plugin#stable"
claude plugin install exercise@wbs-cs
```

To check that it worked, start Claude Code and type `/exercise:`. You should see
`/exercise:setup`, `/exercise:list` and `/exercise:custom`.

## Update

To receive new exercises and fixes automatically, open `/plugin` in Claude Code,
go to **Marketplaces**, select `wbs-cs`, and choose **Enable auto-update**. To
update by hand instead:

```sh
claude plugin marketplace update wbs-cs
claude plugin update exercise@wbs-cs
```

The first command fetches the latest catalog and the second installs the new
version. Restart Claude Code afterwards. An update only affects projects you set up afterwards.

## Usage

Open Claude Code in the folder where you keep your projects and ask for an
exercise by name, or use the command with an optional target folder:

```text
Set up the movie-diary exercise
/exercise:setup movie-diary ./my-movie-diary
```

| Exercise             | Title                      |
| -------------------- | -------------------------- |
| `html`               | From concept to deployment |
| `tailwind`           | Figma and Tailwind CSS     |
| `movie-diary`        | Movie Diary                |
| `personal-diary`     | Personal Diary             |
| `event-scheduler-js` | Event Scheduler            |
| `art-explorer`       | Art Institute Explorer     |

Then open Claude Code in the new folder and run `/onboard`. It puts the project
on GitHub and walks you through the start of the assignment.

In a group project, only one member runs setup. The others clone that member's
GitHub repository and run `/onboard` there.

## Practise your own topic

To practise something that is not a packaged exercise, run `/exercise:custom`,
optionally with the topic:

```text
/exercise:custom recursion in Python
```

Claude asks what you want to practise, in which language (JavaScript,
TypeScript, HTML/CSS, Python or C#), which parts you want to write yourself, and
whether to create a new folder or use the current one. It then writes
`PRACTICE.md`, the agreement that lists your parts and a few tasks, and a small
tutor skill that tells the agent to help around those parts instead of writing
them. Unlike the packaged exercises, nothing enforces this: the rules are
instructions to the agent, not a lock. You can change `PRACTICE.md` whenever
your goal changes.
