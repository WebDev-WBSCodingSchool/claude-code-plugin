// The deny reason string.
//
// Written last, and deliberately.
//
// `permissionDecisionReason` is handed to Claude on every single block. That
// makes this the one piece of the tutor persona that re-primes after every
// compaction and therefore cannot erode — the skill file can be dropped from a
// long session, this cannot. Anything the agent must not forget while a student
// is struggling at hour six belongs here rather than there.
//
// It is also where the *conditional* part lives. The skill is shared across
// assignments and cannot promise an unlock that some assignments do not have.
// The chain is: config -> guard.mjs -> this string -> agent. The skill stays
// generic; this says whether there is a way out on this assignment.
//
// Two things it must not become. Not an error message: the student reads it
// through the agent, so it has to leave the agent something useful to say. And
// not a wall: it is injected on every block, and a reason nobody finishes
// reading is a reason that does not work.
//
// It opens with the line the student should hear, in the student's words. Earlier
// trials showed the agent relaying this string's own vocabulary — "gate", "gated",
// "prose" — and inventing restraint-narration around it. That is what a block
// message full of instructions about itself primes. Give the agent the sentence
// instead, then the instructions, and keep the instructions short.

import { categoryLabel, formatCategories, isPluralCategories } from "./harness.mjs";

/**
 * Which tasks would open this category, if the student demonstrated one.
 *
 * Title first, id second, and deliberately: whatever order this prints in is the
 * order the agent says it in, and a student who is told to write "FR009" has been
 * handed a row number instead of a piece of work. The id stays because they type
 * it into a command.
 */
function routesTo(config, category) {
  return config.tasks
    .filter((t) => (t.categories ?? []).includes(category))
    .map((t) => `${t.title} (${t.id})`);
}

export function denyReason({ config, rel, blocked, open }) {
  const what = formatCategories(blocked);
  const capWhat = what.startsWith("localStorage") ? what : `${what.charAt(0).toUpperCase()}${what.slice(1)}`;
  const plural = isPluralCategories(blocked);
  const verb = plural ? "are" : "is";
  const parts = blocked.length > 1 ? "parts" : "part";
  const lines = [];

  // The unlock path goes inside the quoted sentence: evals showed agents relay the quote but drop instructions further down.
  const firstTask = config.unlockRoute === false ? undefined : config.tasks?.find((t) => blocked.some((c) => (t.categories ?? []).includes(c)));
  const unlock = firstTask
    ? ` Once you write one task such as ${firstTask.title}, commit it with --signoff, and explain it to me, I can help here too.`
    : "";
  lines.push(
    `Tell the student in their language: "${capWhat} ${verb} the ${parts} of ${rel} you write yourself — I'll help you get there.${unlock}"`,
  );

  lines.push(
    `Write nothing for ${what} in ${rel} (no code, comments, or pasteable blocks); never apologize, retry, or bypass via Bash.`,
  );

  lines.push(
    `Help levels (inspect ${rel} first; start at the lowest level missing on disk, advance only after new code):\n` +
      `1. Plain English: goal and location.\n` +
      `2. Docs + guiding questions.\n` +
      `3. Steps without syntax (last resort).`,
  );

  if (config.unlockRoute === false) {
    lines.push(
      `**${capWhat} ${plural ? "stay" : "stays"} student-written for the whole assignment** (no unlock or sign-off). When it works, offer unscored understanding questions once as an optional self-check.`,
    );
    lines.push(
      `Open work in README.md stays available: wait for a request and clarify undecided details first.`,
    );
  } else {
    const routes = blocked
      .map((c) => `  - ${categoryLabel(c)}: ${routesTo(config, c).join(", ") || "no task opens this"}`)
      .join("\n");
    lines.push(
      `Unlock: once the student has committed one task below and explained its branch diff (1 open + up to 3 unscored MCQs), you run \`node .claude/hooks/signoff.mjs <TASK>\` (checks file, clean tree, commit; PR reviews count 1:1); never hand the student this command:\n${routes}`,
    );
    const openList = [...open];
    lines.push(
      `${openList.length ? `Unlocked: ${formatCategories(openList)}.` : `None unlocked yet.`} For open work in README.md, wait for a request and clarify undecided details first.`,
    );
  }

  return lines.join("\n\n");
}
