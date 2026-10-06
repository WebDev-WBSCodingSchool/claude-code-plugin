# WBS Harness Claude Code plugin prototype

This throwaway prototype tests one narrow design: a single Claude Code plugin
can act as both setup command and versioned exercise catalog, without a separate
MCP server or registry service.

It bundles every starter currently in `/home/stephan/coding/wbs/starter-repos`:

- `art-explorer`
- `event-scheduler-js`
- `html`
- `movie-diary`
- `personal-diary`
- `tailwind`

Each entry is an assignment-specific overlay. The shared `runtime/` contains the
hooks, skills, settings, and editor configuration used by every exercise. Setup
assembles the two layers, verifies the result, records its source version,
initializes a clean Git repository, and only then makes the target directory
visible.

The plugin also contains an explicit instructor command. From a clean clone of
the plugin repository, run Claude Code with `--plugin-dir .`, then invoke:

```text
/exercise:add /path/to/assessment.md
```

It runs the instructor interview, builds a review starter, verifies it, and
packages the assignment-specific files as a new catalog entry. It refuses to
author into an installed plugin cache or a dirty source checkout.

## Install

This repository is also a Claude Code plugin marketplace named `wbs-cs`, after
WBS CODING SCHOOL, listing one plugin, `exercise`. Students install it once:

```sh
claude plugin marketplace add WebDev-WBSCodingSchool/claude-code-plugin#stable
claude plugin install exercise@wbs-cs
```

`#stable` makes them install only released versions. The Release workflow moves
that branch; merges to `main` reach nobody until the next release. Installed
copies update when the release's version reaches them: run
`claude plugin marketplace update wbs-cs`, or turn on auto-update for `wbs-cs` under
**Marketplaces** in `/plugin`.

## Try it

Run Claude Code with the plugin loaded from this checkout:

```sh
claude --plugin-dir .
```

Then ask:

```text
Setup the movie-diary project
```

or:

```text
Setup the art-explorer project in ./my-art-explorer
```

The underlying command is also usable directly:

```sh
node scripts/setup.mjs list
node scripts/setup.mjs setup movie-diary ./movie-diary
```

Run the small integration test with:

```sh
node test/setup.test.mjs
node test/detectors.test.mjs
node test/pack-exercise.test.mjs
```

## The plugin and a project are separate

The plugin is the student's interface to the assignments: it lists them and sets
one up. The project it creates is the local code for one assignment, and from the
moment setup finishes it is governed by the harness committed inside it, not by
the plugin. A new plugin version changes what the next setup produces. It never
changes a project that already exists, and setup refuses to write into an
existing directory.

Two rules keep it that way, and `test/setup.test.mjs` enforces both:

- The plugin ships skills only. Hooks, agents, MCP servers, output styles, and
  settings in a plugin are active in every session, including inside a student's
  project, so adding any of them would make projects depend on the installed
  plugin version.
- Nothing in a project refers to the plugin's files. The harness in `runtime/`
  and the exercise overlays must work with the plugin uninstalled, which is also
  what teammates who clone the group's repo have.

A fix to the harness therefore reaches only projects set up after the release
that contains it. A project that needs the fix mid-assignment gets it by hand,
as an ordinary commit in that project's repository.
