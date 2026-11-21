import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildMinimalEnv,
  cleanupClaudeProjectDir,
  registerCleanup,
  sanitizeClaudeEnv,
  sanitizeCodexEnv,
  sleep,
  spawnAsync,
} from "./utils.mjs";

export const RUBRIC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "notes"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "pass", "evidence"],
        properties: {
          id: { type: "string" },
          pass: { type: "boolean" },
          evidence: { type: "string" },
        },
      },
    },
    notes: { type: "string" },
  },
};

export const PAIRWISE_AB_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["winner", "reasoning"],
  properties: {
    winner: { type: "string", enum: ["A", "B", "tie"] },
    reasoning: { type: "string" },
  },
};

/**
 * Validate that every object in a JSON Schema satisfies OpenAI/Codex strict structured output rules:
 * `additionalProperties: false` and `required` listing every key in `properties`.
 */
export function validateStrictSchema(schema, path = "$") {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;

  if (schema.type === "object") {
    if (schema.additionalProperties !== false) {
      errors.push(`${path}: missing additionalProperties: false`);
    }
    const props = Object.keys(schema.properties ?? {});
    const req = Array.isArray(schema.required) ? schema.required : [];
    const reqSet = new Set(req);
    for (const prop of props) {
      if (!reqSet.has(prop)) {
        errors.push(`${path}: property "${prop}" missing from required`);
      }
    }
    for (const r of req) {
      if (!props.includes(r)) {
        errors.push(`${path}: required property "${r}" not in properties`);
      }
    }
    for (const [k, v] of Object.entries(schema.properties ?? {})) {
      errors.push(...validateStrictSchema(v, `${path}.properties.${k}`));
    }
  }

  if (schema.type === "array" && schema.items) {
    errors.push(...validateStrictSchema(schema.items, `${path}.items`));
  }

  return errors;
}

export function parseJudgeSpec(spec) {
  const trimmed = String(spec ?? "").trim();
  if (!trimmed) throw new Error("Empty judge spec");
  const idx = trimmed.indexOf(":");
  const provider = idx === -1 ? trimmed : trimmed.slice(0, idx);
  const model = idx === -1 ? null : trimmed.slice(idx + 1) || null;
  if (!["claude", "codex", "agy"].includes(provider)) {
    throw new Error(`Unsupported judge provider "${provider}" (expected claude, codex, or agy)`);
  }
  return { spec: trimmed, provider, model };
}

export function sanitizeAgyEnv(env = process.env) {
  return buildMinimalEnv(env);
}

export function buildJudgeCommand(
  specObj,
  { prompt, schemaPath, schemaJson, outPath, emptyDir, printTimeout = "120s" },
) {
  if (specObj.provider === "claude") {
    const args = [
      "-p",
      "--model",
      specObj.model ?? "sonnet",
      "--output-format",
      "json",
      "--json-schema",
      schemaJson,
      "--setting-sources",
      "",
      "--strict-mcp-config",
      "--tools",
      "",
      "--no-session-persistence",
      prompt,
    ];
    return {
      bin: "claude",
      args,
      stdinText: null,
      env: sanitizeClaudeEnv(process.env),
    };
  }

  if (specObj.provider === "codex") {
    const args = [
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--sandbox",
      "read-only",
      "--skip-git-repo-check",
      "-C",
      emptyDir,
      "--output-schema",
      schemaPath,
      "-o",
      outPath,
    ];
    if (specObj.model) {
      args.push("-m", specObj.model);
    }
    args.push("-");
    return {
      bin: "codex",
      args,
      stdinText: prompt,
      env: sanitizeCodexEnv(process.env),
    };
  }

  if (specObj.provider === "agy") {
    const args = [
      "--output-format",
      "json",
      "--json-schema",
      schemaPath,
      "--disable-slash-commands",
      "--sandbox",
      "--print-timeout",
      printTimeout,
    ];
    if (specObj.model) {
      args.push("--model", specObj.model);
    }
    args.push("-p", prompt);
    return {
      bin: "agy",
      args,
      stdinText: null,
      env: sanitizeAgyEnv(process.env),
    };
  }

  throw new Error(`Unknown judge provider: ${specObj.provider}`);
}

/**
 * Preflight check for a single judge adapter.
 * Uses `agy models` for Antigravity to fail fast (<1s) instead of waiting 60s on OAuth.
 */
export function preflightJudge(specObj) {
  const env =
    specObj.provider === "agy"
      ? sanitizeAgyEnv(process.env)
      : specObj.provider === "claude"
        ? sanitizeClaudeEnv(process.env)
        : sanitizeCodexEnv(process.env);
  const cmd =
    specObj.provider === "claude"
      ? ["claude", ["--version"]]
      : specObj.provider === "codex"
        ? ["codex", ["--version"]]
        : ["agy", ["models"]];

  const res = spawnSync(cmd[0], cmd[1], {
    encoding: "utf8",
    env,
    timeout: 15_000,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (res.error) {
    return {
      spec: specObj.spec,
      provider: specObj.provider,
      ok: false,
      detail: `${cmd[0]} not executable: ${res.error.message}`,
    };
  }

  if (res.status !== 0) {
    const hint =
      specObj.provider === "agy"
        ? "Run `agy` interactively to sign in, or omit `agy` / pass `--allow-partial-judges` to fall back to claude:sonnet,codex."
        : `Verify \`${cmd[0]}\` is installed and authenticated.`;
    const errText = `${res.stderr ?? ""} ${res.stdout ?? ""}`.trim().split("\n")[0];
    return {
      spec: specObj.spec,
      provider: specObj.provider,
      ok: false,
      detail: `${errText || `exit ${res.status}`}. ${hint}`,
    };
  }

  return {
    spec: specObj.spec,
    provider: specObj.provider,
    ok: true,
    version: (res.stdout ?? "").trim().split("\n")[0],
  };
}

export function preflightJudges(specs, { allowPartial = false } = {}) {
  const parsed = specs.map((s) => (typeof s === "string" ? parseJudgeSpec(s) : s));
  const results = parsed.map((p) => ({ specObj: p, check: preflightJudge(p) }));
  const available = results.filter((r) => r.check.ok).map((r) => r.specObj);
  const unavailable = results.filter((r) => !r.check.ok);

  if (unavailable.length > 0 && !allowPartial) {
    const lines = unavailable.map((u) => `  - ${u.specObj.spec}: ${u.check.detail}`).join("\n");
    throw new Error(`Judge preflight failed:\n${lines}`);
  }
  if (available.length === 0 && parsed.length > 0) {
    const lines = unavailable.map((u) => `  - ${u.specObj.spec}: ${u.check.detail}`).join("\n");
    throw new Error(`No requested judges are available:\n${lines}`);
  }

  return { available, unavailable, checks: results.map((r) => r.check) };
}

export function validateJudgePayload(data, schema) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Judge payload is not a JSON object");
  }
  if (schema === RUBRIC_SCHEMA) {
    if (!Array.isArray(data.items) || typeof data.notes !== "string") {
      throw new Error("Judge rubric payload missing required items[] or notes");
    }
    for (const item of data.items) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        typeof item.pass !== "boolean" ||
        typeof item.evidence !== "string"
      ) {
        throw new Error("Judge rubric payload contains malformed item");
      }
    }
    return data;
  }
  if (schema === PAIRWISE_AB_SCHEMA) {
    if (!["A", "B", "tie"].includes(data.winner) || typeof data.reasoning !== "string") {
      throw new Error("Judge pairwise A/B payload missing valid winner or reasoning");
    }
    return data;
  }
  return data;
}

export function extractJsonOutput(provider, stdout, outPath, schema = null) {
  let payload;
  if (provider === "codex") {
    if (!existsSync(outPath)) {
      throw new Error(`codex did not write output file ${outPath}`);
    }
    payload = JSON.parse(readFileSync(outPath, "utf8").trim());
  } else {
    const trimmed = String(stdout ?? "").trim();
    const parsed = JSON.parse(trimmed);
    if (parsed?.is_error) {
      throw new Error(`${provider} returned error envelope: ${String(parsed.result ?? "").slice(0, 200)}`);
    }
    if (parsed?.structured_output && typeof parsed.structured_output === "object") {
      payload = parsed.structured_output;
    } else if (typeof parsed?.result === "string" && parsed.result.trim()) {
      payload = JSON.parse(parsed.result.trim());
    } else if (provider === "claude") {
      throw new Error("claude output envelope missing structured_output and JSON result");
    } else {
      // agy may emit the structured payload directly at top level when not wrapped
      payload = parsed;
    }
  }
  return schema ? validateJudgePayload(payload, schema) : payload;
}

export async function runSingleJudge(
  specObj,
  { prompt, schema = RUBRIC_SCHEMA, timeoutMs = 150_000, maxRetries = 2 } = {},
) {
  const emptyDir = mkdtempSync(join(tmpdir(), `wbs-eval-judge-${specObj.provider}-`));
  const cleanup = () => {
    if (specObj.provider === "claude") cleanupClaudeProjectDir(emptyDir);
    rmSync(emptyDir, { recursive: true, force: true });
  };
  const unregister = registerCleanup(cleanup);
  const schemaJson = JSON.stringify(schema);
  const schemaPath = join(emptyDir, "schema.json");
  const outPath = join(emptyDir, "out.json");
  writeFileSync(schemaPath, schemaJson, "utf8");

  const cmd = buildJudgeCommand(specObj, {
    prompt,
    schemaPath,
    schemaJson,
    outPath,
    emptyDir,
  });

  try {
    let attempt = 0;
    while (true) {
      rmSync(outPath, { force: true });
      const started = Date.now();
      const res = await spawnAsync(cmd.bin, cmd.args, {
        cwd: emptyDir,
        env: cmd.env,
        stdinText: cmd.stdinText,
        timeoutMs,
      });
      const durationMs = Date.now() - started;

      if (!res.timedOut && res.exitCode === 0) {
        try {
          const data = extractJsonOutput(specObj.provider, res.stdout, outPath, schema);
          return { spec: specObj.spec, provider: specObj.provider, data, durationMs, retries: attempt };
        } catch (parseErr) {
          if (attempt < maxRetries) {
            attempt++;
            await sleep(3000 * attempt);
            continue;
          }
          throw new Error(`Judge ${specObj.spec} returned invalid JSON: ${parseErr.message}`);
        }
      }

      const combined = `${res.stderr} ${res.stdout}`.toLowerCase();
      const transient =
        res.timedOut ||
        combined.includes("rate limit") ||
        /\b429\b/.test(combined) ||
        combined.includes("overloaded") ||
        combined.includes("timeout");
      if (attempt < maxRetries && transient) {
        attempt++;
        await sleep(4000 * 2 ** (attempt - 1));
        continue;
      }

      throw new Error(
        `Judge ${specObj.spec} failed (exit=${res.exitCode}, timedOut=${res.timedOut}): ${(res.stderr || res.stdout).slice(0, 400)}`,
      );
    }
  } finally {
    unregister();
    cleanup();
  }
}

/**
 * Aggregate rubric verdicts across the judge panel.
 * Majority vote wins; a 2-judge split marks `disputed: true` (and `pass: false` conservatively).
 */
export function aggregatePanelVerdicts(rubricItems, judgeResultsBySpec) {
  const judgeNames = Object.keys(judgeResultsBySpec);
  const aggregatedItems = [];
  let agreedCount = 0;
  let comparableCount = 0;

  for (const item of rubricItems) {
    const judges = {};
    const votes = [];
    for (const name of judgeNames) {
      const found = (judgeResultsBySpec[name]?.items ?? []).find((x) => x.id === item.id);
      if (found) {
        judges[name] = { pass: Boolean(found.pass), evidence: String(found.evidence ?? "") };
        votes.push(Boolean(found.pass));
      } else {
        judges[name] = { pass: false, evidence: "(judge omitted item)" };
        votes.push(false);
      }
    }

    const passCount = votes.filter(Boolean).length;
    const failCount = votes.length - passCount;
    const isTie = votes.length > 0 && passCount === failCount;
    const pass = votes.length > 0 && passCount > failCount;
    const disputed = isTie;

    if (votes.length >= 2) {
      comparableCount++;
      if (passCount === votes.length || failCount === votes.length) {
        agreedCount++;
      }
    }

    aggregatedItems.push({
      id: item.id,
      tier: item.tier ?? "hard",
      description: item.description,
      pass,
      disputed,
      votes: { pass: passCount, fail: failCount },
      judges,
    });
  }

  const agreementRate = comparableCount > 0 ? agreedCount / comparableCount : null;
  const notes = Object.fromEntries(
    judgeNames.map((n) => [n, String(judgeResultsBySpec[n]?.notes ?? "")]),
  );

  return {
    judges: judgeNames,
    agreementRate,
    disputedCount: aggregatedItems.filter((i) => i.disputed).length,
    items: aggregatedItems,
    notes,
  };
}

export function buildRubricPrompt({ scenario, transcript, context = "" }) {
  const rubricLines = (scenario.rubric ?? [])
    .map((r) => `- \`${r.id}\` [${r.tier}]: ${r.description}`)
    .join("\n");

  return `You are a strict, impartial evaluator grading a coding-tutor AI session for a web-development bootcamp exercise.

## Scenario
- ID: ${scenario.id}
- Suite: ${scenario.suite}
- Exercise: ${scenario.exercise}
- Goal: ${scenario.description}
${context ? `\n## Context\n${context}\n` : ""}
## Transcript
${transcript}

## Rubric Items
Evaluate EVERY rubric item below strictly based on observable evidence in the transcript. Quote brief evidence for each verdict. Do not invent facts not present in the transcript.
Return JSON matching the required schema with one entry per rubric ID (exact IDs):

${rubricLines}
`;
}

export async function runJudgePanel(judgeSpecs, { scenario, transcript, context = "" }) {
  if (!judgeSpecs.length || !(scenario.rubric ?? []).length) {
    return null;
  }
  const prompt = buildRubricPrompt({ scenario, transcript, context });
  const settled = await Promise.allSettled(
    judgeSpecs.map((specObj) =>
      runSingleJudge(specObj, { prompt, schema: RUBRIC_SCHEMA }),
    ),
  );
  const bySpec = {};
  const judgeTelemetry = {};
  const errors = {};
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    const spec = judgeSpecs[i].spec;
    if (s.status === "fulfilled") {
      const r = s.value;
      bySpec[r.spec] = r.data;
      judgeTelemetry[r.spec] = { durationMs: r.durationMs, retries: r.retries };
    } else {
      errors[spec] = s.reason?.message ?? String(s.reason);
    }
  }
  if (Object.keys(bySpec).length === 0) {
    const msg = Object.entries(errors)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    throw new Error(`All judges failed: ${msg}`);
  }
  return {
    ...aggregatePanelVerdicts(scenario.rubric, bySpec),
    telemetry: judgeTelemetry,
    ...(Object.keys(errors).length ? { errors } : {}),
  };
}

/**
 * Combine two swapped-order A/B judge evaluations (`ab` had A first, B second;
 * `ba` had B first, A second). Only consistent preferences count as a win.
 */
export function aggregatePairwiseAb(abResult, baResult) {
  const ab = abResult?.winner ?? "tie";
  // Map swapped order back to original A/B identities
  const baMapped =
    baResult?.winner === "A" ? "B" : baResult?.winner === "B" ? "A" : "tie";

  if (ab === baMapped) {
    return {
      winner: ab,
      positionBias: false,
      abOrderWinner: ab,
      baOrderMappedWinner: baMapped,
      reasoning: [abResult?.reasoning, baResult?.reasoning].filter(Boolean).join(" | "),
    };
  }

  return {
    winner: "tie",
    positionBias: ab !== "tie" && baMapped !== "tie" && ab !== baMapped,
    abOrderWinner: ab,
    baOrderMappedWinner: baMapped,
    reasoning: [abResult?.reasoning, baResult?.reasoning].filter(Boolean).join(" | "),
  };
}

export async function runBlindPairwiseAb(
  judgeSpecs,
  { scenarioId, description, transcriptA, transcriptB },
) {
  const makePrompt = (first, second) => `You are an impartial evaluator comparing two anonymized AI tutor responses for the same student scenario.

## Scenario
- ID: ${scenarioId}
- Goal: ${description}

## Response A
${first}

## Response B
${second}

Compare Response A and Response B on:
1. Tone (calm, non-defensive, concise, no lecturing/apology/praise)
2. Clarity (plain student-friendly language, concrete, focused)
3. Adherence (follows pedagogical/harness rules without leaking internal jargon or writing gated code)

Choose winner: "A", "B", or "tie", with brief reasoning.`;

  const entries = await Promise.all(
    judgeSpecs.map(async (specObj) => {
      const [ab, ba] = await Promise.all([
        runSingleJudge(specObj, {
          prompt: makePrompt(transcriptA, transcriptB),
          schema: PAIRWISE_AB_SCHEMA,
        }),
        runSingleJudge(specObj, {
          prompt: makePrompt(transcriptB, transcriptA),
          schema: PAIRWISE_AB_SCHEMA,
        }),
      ]);
      return [specObj.spec, aggregatePairwiseAb(ab.data, ba.data)];
    }),
  );
  return Object.fromEntries(entries);
}
