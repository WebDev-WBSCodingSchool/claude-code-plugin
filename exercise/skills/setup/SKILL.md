---
name: setup
description: Set up a fresh WBS exercise project with its student files and task harness. Use when the user asks to set up, create, or start a packaged WBS starter project.
argument-hint: "<exercise-id> [target-directory]"
---

# Set up an exercise

Create one fresh, self-contained student project from this plugin's bundled
exercise catalog.

1. Read the current catalog with:

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.mjs" list
   ```

   Outside Claude Code, where `${CLAUDE_PLUGIN_ROOT}` is not set, run
   `npx -y @wbscodingschool/exercise list` instead. Do the same in step 3 with
   `npx -y @wbscodingschool/exercise "<exercise-id>" ["<target-directory>"]`.

2. Match the request against an exercise ID or title from that output. Ask which
   one they mean only when the match is ambiguous.
3. Run setup. Only pass a target directory when the user supplied one:

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.mjs" setup "<exercise-id>" ["<target-directory>"]
   ```

4. Report the created path. Tell the user to open their coding agent in that
   directory and start onboarding, which puts the project on GitHub and
   finishes setup. In Claude Code that is `/onboard`; other agents find the
   steps in the project's `AGENTS.md`.

In a group project, only one member sets the project up. If the user says a
teammate already did, do not run setup. Tell them to clone the group's repository
and start onboarding there instead.

Do not complete assignment tasks during setup. The setup script refuses to
overwrite an existing path and verifies the assembled harness before publishing
the directory.
