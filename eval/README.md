# Agentic Evaluation Suite (`eval/`)

Zero-dependency Node.js 22+ evaluation suite measuring behavioral compliance, pedagogical effectiveness, and student-facing readability of the WBS exercise harness against real Claude Code sessions (`sonnet` and `opus`) via your local `claude` CLI subscription.

## Suites

| Suite | Contents | Default Models / Trials |
| --- | --- | --- |
| `smoke` | 4 representative behavioral scenarios (`tutor-refusal-basic`, `tutor-plan-md-block`, `tutor-open-you-decide`, `onboard-solo-fresh`) + static README lint + `#29` hook-string lint | `sonnet`, 1 trial |
| `tutor` | All 11 runtime tutor scenarios + `#29` hook-string lint | `sonnet`, 1 trial |
| `onboard` | All 4 runtime `/onboard` scenarios | `sonnet`, 1 trial |
| `readability` | Static README prose/consistency lint (8 docs) + simulated-student comprehension across all 7 exercises (primary model) | `sonnet`, 1 trial |
| `full` | All 15 behavioral scenarios + `#29` hook-string lint + static README lint + 7-exercise comprehension (primary model) | `sonnet`, 2 trials |

## Quick Start

```sh
# 1. Deterministic unit tests + static lint (0 LLM calls)
node test/eval-lib.test.mjs
node eval/run.mjs --static-only

# 2. Fast quota-friendly smoke check (sonnet + codex & Gemini Neon judges, ~1 min)
node eval/run.mjs --suite smoke

# 3. Standard full check (sonnet, 2 trials, codex + Gemini Neon judges — 0 Claude quota spent on judging)
node eval/run.mjs --suite full

# 4. Cross-family release baseline (explicitly opt into opus)
node eval/run.mjs --suite full --models sonnet,opus --trials 2 \
  --judges codex,agy:gemini-4-neon-medium --save-baseline v<next-version>

# 5. Run specific scenario(s) (defaults to suite=custom, skipping unrelated static lint)
node eval/run.mjs --scenario tutor-open-ambiguous,tutor-plan-md-block --models sonnet --trials 1
```

## Judges & Cross-Family Agreement

- Default judge panel: **`codex,agy:gemini-4-neon-medium`** (two non-Claude model families, strict JSON schemas, zero Claude tokens spent on judging; available Gemini Neon tiers: `gemini-4-neon-low`, `gemini-4-neon-medium`, `gemini-4-neon-high`, `gemini-4-neon-xhigh`).
- Optional Claude judge: **`--judges claude:sonnet,codex`** or **`--judges codex,agy:gemini-4-neon-medium,claude:sonnet`** (3-judge tie-breaker panel).
- Preflight runs `agy models` in a sanitized environment (stripping nested `ANTIGRAVITY_*`/`GEMINI_HOME` vars) and validates the requested model ID so an unauthenticated CLI or typo fails in <1s; pass `--allow-partial-judges` to fall back to available judges.
- Pass `--no-judge` to run only deterministic checks and static lint.
- Consensus uses majority vote; a 2-judge split marks `disputed: true` and lowers the reported **inter-judge agreement %**. Reports separate **Unanimous Behavioral Failures** from **Disputed Judge Splits (1:1)**.

## Check Tiers & Orientation Telemetry

- **`Det Hard` vs. `Rub Hard`**: Reports and `compare.mjs` show deterministic safety/contract invariants (`Det Hard`) separately from LLM-judged behavioral rubrics (`Rub Hard`) so 100% safety passes never mask behavioral drops.
- **`hard`**: Safety & contract invariants (clean session completion, zero guarded writes, zero Bash bypasses, no `PLAN.md`/`.claude/` edits, no `Signed-off-by:` trailer, valid open JS helper syntax) plus hard behavioral rubrics. Any drop flags a hard regression.
- **`target`**: Issue-improvement metrics (`#15`, `#29`–`#33`, US English spelling consistency, specified CSS content, `Co-Authored-By:` handling, multi-turn interviews).
- **`soft`**: Tone and single-question guidelines (non-defensive tone, no apology/scoring tally, one question mark per turn).
- **Orientation telemetry (not fail checks)**:
  - `Med Words`: response length orientation (~150–180 words guideline, tracked as telemetry only — never fails a run).
  - `Guard Fired`: diagnostic count (`0/N` means the agent refused proactively without hitting the hook; `>0` means live `PreToolUse` `guard.mjs` intervened).
- **Dirty-tree tracking**: `metadata.gitDirty` flags runs executed with uncommitted changes as `(dirty)` in reports and warns on `--save-baseline`.

## Comparing Runs & Blind A/B Testing

```sh
# Side-by-side metric delta & regression check (pass --fail-on-regression to exit 1 on regressions)
node eval/compare.mjs eval/baselines/v0.14.2.json eval/results/<run>/summary.json --fail-on-regression

# Blind swapped-order A/B pairwise comparison (requires two local full.json runs under gitignored eval/results/;
# defaults to trial 1, add --all-trials for all)
node eval/compare.mjs eval/results/<baseline-run>/full.json eval/results/<candidate-run>/full.json \
  --ab --judges claude:sonnet,codex --concurrency 2
```

## Storage & Git Hygiene

- `eval/results/` is gitignored and holds full run transcripts (`full.json`, `summary.json`, `report.md`).
- The current baseline is `eval/baselines/v0.14.2` (git `52c8697`). Name a new baseline after the version the release workflow will bump to, not the current `plugin.json` version. The earlier `v0.14.1` baseline was removed because its run predates the judge-transcript truncation fix (`48d8b24`).
- Comprehension runs once per exercise × model and ignores `--trials`.
- `eval/baselines/` holds compact, git-tracked summaries (`<label>.json` + `<label>.md`) with zero raw transcripts so colleagues can review conclusions and diff changes directly on GitHub.
