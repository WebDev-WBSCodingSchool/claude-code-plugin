---
name: custom
description: Create a custom practice exercise from what the student wants to practise, with a contract file and a light AI tutor that leaves the practised parts to the student. Use when the student wants to practise a topic of their own choosing rather than a packaged WBS exercise.
argument-hint: "[topic]"
---

# Set up a custom practice exercise

Interview the student about what they want to practise, then write a contract,
`PRACTICE.md`, and a tutor skill that holds the agent to it. Nothing here is
enforced by hooks. The contract and the tutor skill are the whole mechanism.

## Interview

Ask one question per turn and wait for the answer. Reply in the student's
language. Every question you write is said out loud, so keep notes about how to
handle an answer out of the question itself.

Find out, in roughly this order, skipping anything the student already said:

1. What they want to practise, and what they already know about it.
2. The language: JavaScript, TypeScript, HTML/CSS, Python or C#.
3. A small, concrete thing to build that exercises the topic. Offer one or two
   ideas if they have none, sized for an afternoon rather than a project.
4. Which parts they write alone. Propose the files or functions where the topic
   actually happens and let them adjust. These are the guarded parts.
5. Where the agent may help: typically setup, tooling, test data, styling and
   explanations. Anything not guarded is open.
6. Where to create it: a new folder (the default, ask for its name) or the
   folder Claude Code is open in.

If the student says "you decide" to any of these, choose, say the choice in one
line, and move on.

## Check the target

Before writing anything:

- If the target folder contains `.claude/harness/`, stop. It is a packaged
  exercise with a stricter tutor already, and two sets of rules would conflict.
- If it contains `PRACTICE.md`, stop and ask whether to replace it.
- A new folder must not already exist.

## Write the contract

Draft `PRACTICE.md` from
`${CLAUDE_PLUGIN_ROOT}/skills/custom/practice-template.md`. Write two to five
tasks, each one result the student can check on their own, in the order they
would build them. Mark guarded parts by file and, where a file is shared, by
function or section.

Pick the syntax check for the language:

| Language   | Syntax check                      |
| ---------- | --------------------------------- |
| JavaScript | `node --check <file>`             |
| TypeScript | `npx tsc --noEmit <file>`         |
| Python     | `python3 -m py_compile <file>`    |
| C#         | `dotnet build`                    |
| HTML/CSS   | none                              |

Show the draft to the student and change it until they accept it.

## Create the files

In the target folder:

1. For a new folder, create it and run `git init`. Leave an existing folder's git
   state alone.
2. Write the accepted `PRACTICE.md`.
3. Copy the tutor skill:

   ```sh
   mkdir -p .claude/skills/practice-tutor
   cp "${CLAUDE_PLUGIN_ROOT}/skills/custom/practice-tutor.md" .claude/skills/practice-tutor/SKILL.md
   ```

4. Append to `CLAUDE.md`, creating it if missing:

   ```markdown
   @PRACTICE.md

   Before responding to a request that could lead to code, read and follow
   `.claude/skills/practice-tutor/SKILL.md`.
   ```

5. Append to `AGENTS.md`, creating it if missing:

   ```markdown
   This folder holds a practice exercise. Before answering any request that could
   lead to code, read `PRACTICE.md`, then follow
   `.claude/skills/practice-tutor/SKILL.md`. Do not write the parts `PRACTICE.md`
   assigns to the student, and do not give them a finished block to paste.
   ```

6. Create each guarded file empty, if it does not exist. Project scaffolding the
   language needs, such as `dotnet new console` or `npm init -y`, is setup work you
   may do. Write nothing inside a guarded file.

## Finish

Report the path. In a new folder, tell the student to open Claude Code there.
Then say once that the rules are instructions to the agent, not a lock: an agent
told to ignore them can still write the guarded code, so the practice holds
because the student wants it to.

Do not start the first task. The student starts it.
