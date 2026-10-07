# Contributing

This guide is for instructors and maintainers. Students only need the
[README](README.md).

## Install

Instructor commands live in a separate `instructor` plugin in the `instructor/`
folder, so students who install `exercise@wbs-cs` never see them. Run these two
commands once, in a terminal:

```sh
claude plugin marketplace add "WebDev-WBSCodingSchool/claude-code-plugin#stable"
claude plugin install instructor@wbs-cs
```

If you already added the marketplace for `exercise@wbs-cs`, skip the first
command. To check that it worked, start Claude Code and type `/instructor:`.

## Update

Auto-update is set per marketplace, so if you enabled it for `wbs-cs`, the
instructor plugin updates along with `exercise`. To update by hand instead:

```sh
claude plugin marketplace update wbs-cs
claude plugin update instructor@wbs-cs
```

Restart Claude Code afterwards.

## Commands that change this repository

Some commands, such as `/instructor:add-exercise`, write into this repository.
They run from a clone of it, never from the copy Claude Code installed. Clone the
repository, make sure the working tree is clean, and start Claude Code with the
instructor plugin loaded from the checkout:

```sh
git clone https://github.com/WebDev-WBSCodingSchool/claude-code-plugin.git
cd claude-code-plugin
claude --plugin-dir instructor
```

For that session, `--plugin-dir instructor` replaces an installed
`instructor@wbs-cs`, so you can keep the installed copy. Loading it from the
checkout also guarantees that the command's instructions match the scripts and
files it writes to.

Name new instructor commands as a verb and the thing they act on, like
`add-exercise`.

## Commands

### `/instructor:add-exercise`

Turns a project assessment into a new exercise.

```text
/instructor:add-exercise /path/to/assessment.md
```

You need the assessment as a Markdown file and a clean working tree. The command
reads the assessment but never changes it. It runs in these steps:

1. **Checks.** It confirms that it runs in a clean checkout of this repository
   and that the assessment file is readable. If either check fails, it stops
   and names the problem.
2. **Interview.** It asks ten questions, one at a time: what the project is built
   with, which code students must write themselves, which requirements practise
   that code, which files students create locally, and so on. If you get stuck,
   it offers an example answer. Afterwards it summarizes every answer and shows
   which part of the exercise each one produces. Nothing is written until you
   approve that summary.
3. **Exercise ID.** It asks for the ID students will type, in lowercase words
   separated by hyphens, such as `movie-diary`.
4. **Review starter.** It builds the complete project in a temporary folder
   outside the checkout, including the student-facing README. You review the
   README before it continues.
5. **Packaging.** It copies only the assignment-specific files into
   `exercises/<id>/`, generates a fresh project from the new entry, and runs the
   tests.

It hands back the path of the new entry, the path of the generated project, and
a list of requirements the assessment left unclear. It does not commit or push.

If the exercise needs the harness to recognise a new kind of protected code, the
command proposes a change to the shared `runtime/.claude/hooks/guard.mjs` first.
That change must be reviewed and committed before packaging, because packaging
requires a clean working tree.

Then:

1. Open the generated project and run it.
2. Add the exercise to the table in the [README](README.md).
3. Commit on a branch and open a Pull Request.

The exercise reaches students with the next release.

## Change the shared harness

`runtime/` holds the hooks, skills, and settings that every exercise shares. A
change there reaches every project set up after the next release. Projects
already set up never change: once setup finishes, a project is governed by the
harness committed inside it, and teammates who clone it have no plugin at all.

Two rules follow from that, and `test/setup.test.mjs` enforces both:

- **The plugin ships skills only.** Claude Code loads a plugin's hooks, agents,
  MCP servers, output styles, and settings into every session, including inside
  a student's project. The test allows only the current top-level files and
  `plugin.json` keys. A new one fails the test until you add it to the list
  there, which you should only do once you know it cannot act inside a project.
- **Nothing in `runtime/` or an exercise refers to the plugin's files**, such as
  `${CLAUDE_PLUGIN_ROOT}`. A project has to work with the plugin uninstalled.

## Test

```sh
node test/setup.test.mjs
node test/detectors.test.mjs
node test/pack-exercise.test.mjs
claude plugin validate --strict .
claude plugin validate --strict instructor
```

## Release

Students install from the `stable` branch, so nothing merged to `main` reaches
them until a release. To release, open **Actions → Release → Run workflow** on
`main` and choose `patch`, `minor`, or `major`. The workflow runs the tests,
bumps `version` in both `.claude-plugin/plugin.json` and
`instructor/.claude-plugin/plugin.json`, tags the commit, and moves
`stable` to it. Installed copies only update when that version changes.
