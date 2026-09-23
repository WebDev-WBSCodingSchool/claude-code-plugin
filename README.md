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
/wbs-harness-prototype:add-exercise /path/to/assessment.md
```

It runs the instructor interview, builds a review starter, verifies it, and
packages the assignment-specific files as a new catalog entry. It refuses to
author into an installed plugin cache or a dirty source checkout.

## Try it

Run Claude Code with the plugin loaded from this checkout:

```sh
claude --plugin-dir /home/stephan/coding/wbs-task-harness/claude-harness-plugin-prototype
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

## Deliberate limits

This is not a distribution or update system. Exercise snapshots live inside the
plugin, existing directories are never updated or overwritten, and publishing a
new plugin version is the only update path. That keeps the prototype focused on
whether the student-facing workflow and the one-bundle maintenance model are
worth pursuing.
