---
name: list
description: List the WBS exercises this plugin can set up. Use when the user asks which exercises or starter projects are available.
---

# List exercises

Read the current catalog with:

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.mjs" list
```

Show the result as a table with the exercise ID and title, in the order the
script prints them (the curriculum order). Then tell the user
they can start one with `/exercise:setup <exercise-id> [target-directory]`, or
practise a topic of their own with `/exercise:custom`.
