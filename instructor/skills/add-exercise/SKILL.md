---
name: add-exercise
description: Add a pre-AI project assessment to the WBS harness plugin through the instructor interview. Use when an instructor wants to turn an assessment Markdown file into a new packaged exercise.
argument-hint: "<path-to-assessment.md>"
disable-model-invocation: true
---

# Add an exercise

Run the instructor interview, build a reviewable starter repository, and package
that repository as one new exercise in a checkout of the plugin repository.

## Preflight

This skill is public, but authoring requires the plugin's Git repository. Treat
the current working tree as the write target and run every script from it, under
`<repo-root>/instructor/scripts/` or `<repo-root>/exercise/scripts/`. Use
`${CLAUDE_PLUGIN_ROOT}` only to read this skill.

Before the interview:

1. Resolve the current Git root, `<repo-root>`, with
   `git rev-parse --show-toplevel`.
2. Confirm that its `exercise/.claude-plugin/plugin.json` names
   `exercise`.
3. Confirm that the version in its `instructor/.claude-plugin/plugin.json`
   equals the version in `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.
4. Require an empty `git status --porcelain`. If it is not empty, stop and name
   the changed paths. Do not stash or commit them.
5. Confirm that `$ARGUMENTS` points to a readable Markdown file. Read it without
   editing it.
6. Resolve the assessment's own Git root, `<curriculum-root>`, with
   `git -C "$(dirname "$ARGUMENTS")" rev-parse --show-toplevel`. Its
   `git remote get-url origin` must name one of the two curriculum repositories,
   over SSH or HTTPS, with or without `.git`:
   - `WBSCodingSchool/software-ai-engineering`, the short course and the source
     of every current exercise;
   - `WBSCodingSchool/se-curriculum`, the long course, which adds Python and C#.
7. Require an empty `git -C "<curriculum-root>" status --porcelain`. If it is not
   empty, stop and name the changed paths.
8. Run `git -C "<curriculum-root>" fetch origin`, then require
   `git -C "<curriculum-root>" rev-list --left-right --count HEAD...@{u}` to
   print two zeros: commits ahead, then commits behind. If the branch has no
   upstream, is behind, or is ahead, stop and say which. Do not pull, push, or
   switch branches for the instructor.

An installed plugin cache is not an authoring repository. If the current Git
root fails these checks, explain that the instructor must open a checkout of the
plugin repository and run Claude Code there with `claude --plugin-dir instructor`.

If the assessment fails checks 6 to 8, explain that it must come from an
up-to-date, unmodified checkout of one of the two curriculum repositories, so
that the exercise matches what students are taught.

## Interview

Read [references/interview.md](references/interview.md) completely. Ask its ten
questions one at a time and wait for each answer. When the instructor stalls,
read only the matching section of
[references/exemplar.md](references/exemplar.md) and offer it as an example.

Keep a requirements-clarity list while discussing questions 4 and 5. The source
assessment remains read-only.

After question 10, summarize every answer and identify the exact README section,
config key, or starter file it will produce. Ask for approval. Create no files
until the instructor approves the summary.

## Build and package

After approval, read [references/authoring.md](references/authoring.md)
completely and follow it. Ask for the exercise ID before building. The ID uses
lowercase words separated by hyphens.

If the interview requires a protected category that is absent from
`exercise/runtime/.claude/hooks/guard.mjs`, also read
[references/detectors.md](references/detectors.md). A shared detector change must
be reviewed and committed before packaging the exercise, because the packer
requires a clean plugin worktree.

The final packaging command is:

```sh
node "<repo-root>/instructor/scripts/pack-exercise.mjs" \
  "<repo-root>" "<review-starter-root>" "<exercise-id>"
```

Then generate the packaged exercise through the student interface and run it:

```sh
node "<repo-root>/exercise/scripts/setup.mjs" setup \
  "<exercise-id>" "<fresh-review-directory>"
```

Run the plugin tests and strict Claude Code validation. Hand back the new entry
path, the generated review path, and the requirements-clarity list. Do not commit,
push, publish, or edit the assessment unless the instructor separately asks.
