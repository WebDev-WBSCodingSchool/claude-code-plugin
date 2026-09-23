# Instructor interview

The assessment predates agent-assisted project work. Read its facts, but ask the
instructor to decide which work still demonstrates the module topic.

Ask these ten questions one at a time. Do not show the remaining questions. Do
not infer an answer when the instructor is vague. Explain what is missing and ask
again.

## 1. Point me at the exercise

Restate in one paragraph what students build, how long they have, and what they
must finish. Ask the instructor to confirm the restatement. If the assessment has
variants, select one and record what the other variant would rename.

This produces the README title, duration, description, and variant note.

## 2. What is the project built with, and what should students avoid adding halfway through?

Frame the limit around coordination cost. A new package, build tool, or framework
can stop teammates' clones from working until everyone changes their setup. It is
not a judgment about what students are allowed to learn.

Draft one setup-limit sentence and read it back. This belongs in README prose,
not config.

## 3. Which code must students write themselves to learn the module topic?

This defines the protected topics. Use camelCase topic names such as
`reactState`, not API names such as `useState`.

This produces `gated` in `.claude/harness/config.json` and the README explanation
of what students type themselves.

## 4. Which requirements make students practise each protected topic?

Review the assessment requirements one at a time. Map each protected requirement
to one topic and one file. Record requirements that are vague, overlap, or hide
multiple topics. Do not resolve ambiguity for the instructor.

Each protected task becomes:

```json
{
  "id": "FR001",
  "title": "Short student-facing title",
  "file": "path/to/file.js",
  "categories": ["topicName"]
}
```

The file is the one file that the task's commit must touch. Add every ambiguity
to the requirements-clarity list.

## 5. Which important practice is missing?

Review each protected topic separately. First state what the mapped tasks make
students practise. Then name one concrete gap, if there is one. The instructor
accepts or declines every suggestion.

Write accepted additions as user-visible behavior. Use IDs such as `X1` and `X2`
so they cannot collide with future curriculum requirements. Add them to the
config task list, README requirement table, starter-file markers, and
requirements-clarity list.

Prefer additions that use existing protected topics. If an addition needs a new
topic, explain the detector and test cost before the instructor accepts it.

## 6. Which remaining requirements may the agent help implement after a student asks?

Read the whole requirement list again, including accepted additions. Confirm the
open work. If little remains open, revisit questions 3 through 5.

Agent help still requires a student request, one project-specific question from
the agent, and the student's answer before an edit. Opening a protected topic
after sign-off does not itself request work.

Then ask which shared decision is likely to cause disagreement after coding
starts. Record the decision itself in the README kickoff section, not an abstract
instruction to discuss the project.

## 7. Which files and folders should exist, and which file types can contain protected work?

This produces the starter tree and `guardedExtensions`. Include `.html` whenever
protected JavaScript could be written in an inline script.

Create one marked starter file for every distinct `tasks[].file`. Mark the
requirements in plain language, but do not add empty functions, signatures, or
solution structure.

## 8. Which command checks one source file?

Use a command the project already supports, such as `node --check`, `npx oxlint`,
or `npx eslint`. Read `package.json` before choosing. Omit `syntaxCheck` when no
safe one-file command exists.

## 9. Which local files must students create but never commit?

Ask this every time. The answer may be `.env`, a local credentials file copied
from a committed example, a database, or nothing.

This produces `.gitignore` additions, setup prose, `localFile` in config, and a
committed example file when students need one. Explain that ignoring a secret
does not revoke it if it was already committed.

## 10. Must students edit normally read-only Claude or VS Code files?

Usually no. Answer yes only when the module teaches agent configuration or editor
setup.

This produces `writableExceptions`. Every exception also requires removing the
matching denial from `.claude/settings.json` and the matching read-only entry from
`.vscode/settings.json`.

## Approval summary

Restate all ten answers. Map each answer to its README section, config key, or
starter file. Include the requirements-clarity list and any proposed detector.
Wait for explicit approval before creating the review starter.
