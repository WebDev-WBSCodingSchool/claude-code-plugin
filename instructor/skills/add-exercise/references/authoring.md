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
exercise may set either to `false`, but record that as an instructor decision.

## Write the README

Keep the shared runtime sections from `exercise/runtime/README.md`. Replace every fill
marker with the approved assignment content. Preserve this order:

1. Title, duration, description, and the put-it-on-GitHub-once instruction.
2. Requirement table.
3. Setup limit and local-file instructions.
4. What students type and where agent help is available.
5. The existing write, commit, explain, sign-off, and review instructions.
6. The plan and kickoff decision when onboarding is enabled.
7. Work splitting guidance when onboarding is enabled.
8. Running instructions and the read-only explanation.

Rewrite assessment requirements into concise student-facing rows while keeping
their IDs. Do not change the source assessment.

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

After packaging, generate a fresh project through `exercise/scripts/setup.mjs`. Inspect its
README, run the project, and run:

```sh
node test/setup.test.mjs
node test/detectors.test.mjs
claude plugin validate . --strict
```

Do not commit or push the plugin without a separate instructor request.
