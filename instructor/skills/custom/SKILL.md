---
name: custom
description: Build a one-off starter repository with the WBS task harness for a single batch, either by adjusting a packaged exercise or from the description of a new assignment. Use when an instructor needs a custom starter that should not become a packaged exercise.
argument-hint: "[exercise-id | description | path-to-description.md]"
disable-model-invocation: true
---

# Build a custom starter

Run a short interview, then assemble one starter repository with the shared
harness in a folder outside the plugin repository. Nothing is packaged, so the
plugin repository is only read, never changed.

## Preflight

The shared harness lives in the `exercise` plugin, which an installed copy of
this plugin cannot reach. Read it from a checkout of the plugin repository and
use `${CLAUDE_PLUGIN_ROOT}` only to read this skill.

1. Resolve the current Git root, `<repo-root>`, with
   `git rev-parse --show-toplevel`.
2. Confirm that its `exercise/.claude-plugin/plugin.json` names `exercise`.
3. Confirm that the version in its `instructor/.claude-plugin/plugin.json`
   equals the version in `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.
4. Require an empty `git -C "<repo-root>" status --porcelain -- exercise`. The
   starter copies the harness from there, so uncommitted edits would end up in
   it. If it is not empty, stop and name the changed paths.

If these checks fail, explain that the instructor must open a checkout of the
plugin repository and run Claude Code there with `claude --plugin-dir instructor`.

## Choose the path

Use `$ARGUMENTS` when it settles this, and ask otherwise:

- **Adjust a packaged exercise.** The argument matches an ID or title printed by
  `node "<repo-root>/exercise/scripts/setup.mjs" list`.
- **New assignment.** The argument is a description, or a path to a Markdown
  file with one. Read the file without editing it. A curriculum assessment is
  fine here; the curriculum checks of `/instructor:add-exercise` do not apply to
  a one-off starter.

Ask one question per turn and wait for the answer. When the instructor says
"you decide", choose, say the choice in one line, and move on.

## Interview: adjust a packaged exercise

Read the exercise's `README.md` and `.claude/harness/config.json` under
`<repo-root>/exercise/exercises/<id>/overlay/`.

1. Summarize the exercise in a few lines: what students build, solo or group,
   the duration, the requirements with the bold ones marked, and the protected
   topics. Then ask what should be different for this batch.
2. Ask follow-ups only for what the change touches. A new or changed protected
   requirement needs its task ID, its one file, and its topic. A dropped
   protected requirement may leave a topic that no task covers; ask whether to
   drop the topic too. A switch between solo and group changes `onboarding` and
   the README sections that depend on it.
3. Ask for a short batch label, such as `ft-2026-11`, and the target folder.
   Propose `<id>-<label>` next to `<repo-root>`.

## Interview: new assignment

Read [../add-exercise/references/interview.md](../add-exercise/references/interview.md)
and work through its ten questions in order. Keep it brief: when the description
already answers a question, read the answer back in one sentence and ask only
for confirmation. Questions 5 and 10 default to "nothing" unless the instructor
raises something. When the instructor stalls, offer the matching section of
[../add-exercise/references/exemplar.md](../add-exercise/references/exemplar.md)
as an example.

Keep a requirements-clarity list. Then ask for the starter's name, in lowercase
words separated by hyphens, and the target folder. Propose `<name>` next to
`<repo-root>`.

## Limits

The starter keeps the shared harness unchanged. Change only the README,
`.claude/harness/config.json`, `.gitignore`, the starter files, and the settings
lines that an approved `writableExceptions` entry requires. Protected topics must
use detectors that `exercise/runtime/.claude/hooks/guard.mjs` already has. If a
change needs a new one, stop: that is a change to the shared harness, described
in [../add-exercise/references/detectors.md](../add-exercise/references/detectors.md).

The target folder must be outside `<repo-root>` and must not exist yet. No file
in the starter may mention `<repo-root>` or `CLAUDE_PLUGIN_ROOT`, because the
starter must work without the plugin.

## Approval

Summarize every decision and name the README section, config key, or starter
file it changes or produces. Include the requirements-clarity list. Create no
files until the instructor approves.

## Build

The commits use the identity that `exercise/scripts/setup.mjs` uses. Prefix each
commit below with:

```sh
GIT_AUTHOR_NAME="WBS Coding School" GIT_AUTHOR_EMAIL="wbs-cs@wbs.invalid" \
GIT_COMMITTER_NAME="WBS Coding School" GIT_COMMITTER_EMAIL="wbs-cs@wbs.invalid"
```

### Adjusted exercise

1. Generate the packaged exercise into the target:

   ```sh
   node "<repo-root>/exercise/scripts/setup.mjs" setup "<id>" "<target>"
   ```

2. Apply the approved changes. Rewrite changed README passages by the rules in
   the "Write the README" section of
   [../add-exercise/references/authoring.md](../add-exercise/references/authoring.md),
   and leave the rest of the README as it is.
3. Show the instructor `git -C "<target>" diff` and revise until they approve it.

### New assignment

Follow the sections "Build the review starter", "Write the README", and "Verify
and commit the review starter" of
[../add-exercise/references/authoring.md](../add-exercise/references/authoring.md),
with these differences:

- Build directly in the target instead of a temporary folder.
- Skip `record-readme.mjs` and everything under "Package it".
- Also write `.claude/harness/lock.json`, as setup does, with the version from
  `<repo-root>/exercise/.claude-plugin/plugin.json`:

  ```json
  {
    "schemaVersion": 1,
    "pluginVersion": "<version>",
    "exercise": "<name>"
  }
  ```

The instructor reviews the complete README before the commit.

## Verify and commit

Run:

```sh
node "<repo-root>/exercise/scripts/verify.mjs" "<target>"
```

It must print `no problems`. Then commit everything with `--no-verify`:

- for an adjusted exercise, as a second commit, `Adapt <title> for <label>`, so
  `git show` records what this batch changed;
- for a new assignment, as the first commit, `Create <title> starter`, after
  `git init -b main` and `git config core.hooksPath .claude/githooks`.

## Finish

Hand back the target path and the requirements-clarity list. Tell the instructor
to open the starter and run it once, then share it with the batch the way they
share other starters. Students run `/onboard` in their own copy.

Do not push or publish the starter, and do not change the plugin repository.
