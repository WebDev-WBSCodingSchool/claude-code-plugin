# Build and package the exercise

Build a complete starter repository outside the plugin worktree. The plugin
source must remain clean until the final packaging command.

## Build the review starter

1. Create a temporary review directory.
2. Copy `<repo-root>/exercise/runtime/.` into it.
3. Remove `SOURCE` and `.gitignore-base` from the copy.
4. Build `.gitignore` from the runtime's `.gitignore-base` text plus the local
   files chosen in question 9.
5. Fill `.claude/harness/config.json` from the approved answers.
6. Write the assignment-specific README and starter files.
7. Apply approved writable exceptions to the copied settings files.

Keep these config defaults unless an interview answer changes them:

- `transcripts` is `false`.
- `planFile` is `PLAN.md`.
- `integrationBranch` is `main`.
- `branchDiscipline` is `warn`.
- `progressDir` is `.claude/harness/progress`.
- `neverWritable` and `canonical` remain as shipped.

Group projects normally set both `unlockRoute` and `onboarding` to `true`. A solo
exercise sets `onboarding` to `false`, because there is no group to plan with. Set
`unlockRoute` to `false` only when the instructor decides that the protected code
stays with the students for the whole exercise.

## Write the README

Start from `exercise/runtime/README.md`. Keep its shared paragraphs word for word,
replace every fill marker with the approved content, and follow its notes for solo
projects and for `unlockRoute: false`. Keep the template's section order:

1. Title, module name without the module number, duration, description, and
   variant note.
2. "How you work". A solo project merges locally, and a Pull Request is optional.
3. "Requirements", with the task files when `preScaffold` is `true`.
4. "Setup", with the setup limit and any local file.
5. "What you write yourself", with the open work.
6. "Write it, commit it, explain it".
7. For a group project, "Before any of that: PLAN.md" and "Splitting the work".
   For a solo project, "Before you write code", only when question 6 named a
   decision.
8. "Running it".

Rewrite each assessment requirement as one or two full sentences and keep its ID.
Do not change the source assessment.

The instructor reviews the complete README. After approval, record its state:

```sh
node "<repo-root>/instructor/scripts/record-readme.mjs" \
  "<repo-root>" "<review-starter-root>"
```

## Verify and commit the review starter

Run:

```sh
node "<repo-root>/exercise/scripts/verify.mjs" "<review-starter-root>"
```

It must print `no problems`. Then initialize a local Git repository, configure
`.claude/githooks` as `core.hooksPath`, and commit the starter. Do not publish it.
The packer only reads files Git tracks, and it refuses a starter with uncommitted changes.

## Package it

Run the command from the main skill. The packer:

- verifies both repositories and their clean state;
- omits files that are identical to the shared runtime;
- rejects unexpected changes to shared runtime files;
- permits settings overrides only for approved `writableExceptions`;
- writes `exercise.json` and the assignment overlay atomically.

After packaging, add the exercise ID to `exercise/exercises/curriculum.json` at its
place in the curriculum; the catalog lists exercises in that order, and
`test/setup.test.mjs` fails until the ID is there. Then generate a fresh project through `exercise/scripts/setup.mjs`. Inspect its
README, run the project, and run:

```sh
node test/setup.test.mjs
node test/detectors.test.mjs
claude plugin validate . --strict
```

Do not commit or push the plugin without a separate instructor request.
