# Agentic Evaluation Suite (`eval/`)

Zero-dependency Node.js 22+ evaluation suite measuring behavioral compliance, pedagogical effectiveness, and student-facing readability of the WBS exercise harness against real Claude Code sessions (`sonnet` and `opus`) via your local `claude` CLI subscription.

## Suites

| Suite | Contents | Default Models / Trials |
| --- | --- | --- |
| `smoke` | 4 representative behavioral scenarios (`tutor-refusal-basic`, `tutor-hook-refusal-live`, `tutor-open-you-decide`, `onboard-solo-fresh`) + static README lint + `#29` hook-string lint | `sonnet`, 1 trial |
| `tutor` | All 11 runtime tutor scenarios + `#29` hook-string lint | `sonnet,opus`, 1 trial |
| `onboard` | All 4 runtime `/onboard` scenarios | `sonnet,opus`, 1 trial |
| `readability` | Static README prose/consistency lint (8 docs) + simulated-student comprehension across all 7 exercises | `sonnet,opus`, 1 trial |
| `full` | All 15 behavioral scenarios + `#29` hook-string lint + static README lint + 7-exercise comprehension | `sonnet,opus`, 3 trials |

## Quick Start

```sh
# 1. Deterministic unit tests + static lint (0 LLM calls)
node test/eval-lib.test.mjs
node eval/run.mjs --static-only

# 2. Fast smoke check (~1-2 min)
node eval/run.mjs --suite smoke --models sonnet --trials 1 --judges claude:sonnet,codex

# 3. Full baseline capture (saved to gitignored eval/results/ + committed eval/baselines/)
node eval/run.mjs --suite full --models sonnet,opus --trials 3 \
  --judges claude:sonnet,codex --save-baseline v0.14.1

# 4. Run specific scenario(s) (defaults to suite=custom, skipping unrelated static lint)
node eval/run.mjs --scenario tutor-signoff-multi-commit,tutor-german-review --models sonnet --trials 1
```

## Judges & Cross-Family Agreement

- Default judge panel: **`claude:sonnet,codex`** (two distinct model families, each executed from a fresh empty temporary directory with strict OpenAI-compatible JSON schemas and zero repo access).
- Optional third judge: **`agy`** (`--judges claude:sonnet,codex,agy`). Preflight runs `agy models` so an unauthenticated CLI fails in <1s with instructions to sign in, or pass `--allow-partial-judges` to skip unavailable judges.
- Pass `--no-judge` to run only deterministic checks and static lint.
- Consensus uses majority vote; a 2-judge split marks `disputed: true` and lowers the reported **inter-judge agreement %**.

## Check Tiers

- **`hard`**: Safety & contract invariants (clean session completion, zero guarded writes, zero Bash bypasses, no `PLAN.md`/`.claude/` edits, no `Signed-off-by:` trailer). Must pass 100% before and after changes.
- **`target`**: Issue-improvement metrics (`#15`, `#29`–`#33`, including US English spelling consistency in student-facing READMEs) where `v0.14.1` is expected to show room for improvement and post-fix runs should move toward 100%.
- **`soft`**: Conciseness and tone guidelines (e.g., `≤ 180` words, single question per turn, non-defensive tone).

## Comparing Runs & Blind A/B Testing

```sh
# Side-by-side metric delta & regression check (pass --fail-on-regression to exit 1 on regressions)
node eval/compare.mjs eval/baselines/v0.14.1.json eval/results/<run>/summary.json --fail-on-regression

# Blind swapped-order A/B pairwise comparison (eliminates position bias; defaults to trial 1, add --all-trials for all)
node eval/compare.mjs eval/results/v0.14.1/full.json eval/results/<run>/full.json \
  --ab --judges claude:sonnet,codex --concurrency 2
```

## Storage & Git Hygiene

- `eval/results/` is gitignored and holds full run transcripts (`full.json`, `summary.json`, `report.md`).
- `eval/baselines/` holds compact, git-tracked summaries (`<label>.json` + `<label>.md`) with zero raw transcripts so colleagues can review conclusions and diff changes directly on GitHub.
