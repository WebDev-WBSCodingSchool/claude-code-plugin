# Add a protected-topic detector

A detector recognizes code that students must write themselves. It is a
conservative floor, not complete plagiarism prevention. A false positive blocks
help that the README promises, so it costs more than a narrow detector.

## Before writing a pattern

1. Name the category after the topic in camelCase.
2. List code that the detector must catch.
3. List nearby code that must remain open to agent help.
4. Show both lists to the instructor.

Add the detector to `runtime/.claude/hooks/guard.mjs` under `DETECTORS`. Add a row
to `CASES` in `test/detectors.test.mjs` with at least one positive and one negative
case. Run that test and the full setup test.

Do not put the detector in an exercise overlay. Every exercise uses the shared
runtime, and the packer rejects an assignment-specific hook.

## Review rule

No detector ships with positive cases alone. The negative case must name a real
piece of open project work that the pattern could otherwise block. When a regex
could match broadly, narrow it.

Because the packer requires a clean plugin worktree, ask the instructor to review
and commit the shared detector change before continuing to package the exercise.
