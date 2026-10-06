#!/usr/bin/env node

import assert from "node:assert/strict";
import { checkPlan, taskLines } from "../runtime/.claude/hooks/harness.mjs";

const members = "- Jane Student — jane.student@mail.com\n- Mo Ahmadi — mo.ahmadi@mail.com\n";
const cases = [
  [
    members + "- Fetch popular movies (FR009) — Jane\n- Search bar + dialog (FR010) — Mo Ahmadi\n",
    [
      { title: "Fetch popular movies (FR009) — Jane", emails: ["jane.student@mail.com"], line: 3 },
      { title: "Search bar + dialog (FR010) — Mo Ahmadi", emails: ["mo.ahmadi@mail.com"], line: 4 },
    ],
  ],
  [
    members + "- Fetch popular movies — jane.student@mail.com\n- Search movies — mo.ahmadi@mail.com\n",
    [
      { title: "Fetch popular movies", emails: ["jane.student@mail.com"], line: 3 },
      { title: "Search movies", emails: ["mo.ahmadi@mail.com"], line: 4 },
    ],
  ],
  [
    members + "| Fetch movies | Jane |\n| Search movies | Mo |\n",
    [
      { title: "Fetch movies · Jane", emails: ["jane.student@mail.com"], line: 3 },
      { title: "Search movies · Mo", emails: ["mo.ahmadi@mail.com"], line: 4 },
    ],
  ],
  [
    "| Jane Student | jane.student@mail.com | Fetch movies |\n| Mo Ahmadi | mo.ahmadi@mail.com | Search movies |\n",
    [
      { title: "Jane Student ·  · Fetch movies", emails: ["jane.student@mail.com"], line: 1 },
      { title: "Mo Ahmadi ·  · Search movies", emails: ["mo.ahmadi@mail.com"], line: 2 },
    ],
  ],
  [
    members + "Jane fetches movies.\nMO handles search.\n",
    [
      { title: "Jane fetches movies.", emails: ["jane.student@mail.com"], line: 3 },
      { title: "MO handles search.", emails: ["mo.ahmadi@mail.com"], line: 4 },
    ],
  ],
  [
    members + "- Fetch movies — Jane and mo.ahmadi@mail.com\n",
    [{ title: "Fetch movies — Jane and", emails: ["mo.ahmadi@mail.com", "jane.student@mail.com"], line: 3 }],
  ],
  [
    "- Jane Student — jane.student@mail.com\n- Jane Doe — jane.doe@mail.com\n" +
      "- Fetch movies — Jane Student\n- Search movies — jane.doe@mail.com\n",
    [
      { title: "Fetch movies — Jane Student", emails: ["jane.student@mail.com"], line: 3 },
      { title: "Search movies", emails: ["jane.doe@mail.com"], line: 4 },
    ],
  ],
  [
    "- José Núñez — jose.nunez@mail.com\n- Jose\u0301 García — jose.garcia@mail.com\n" +
      "- Fetch movies — José Núñez\n- Search movies — José García\n",
    [
      { title: "Fetch movies — José Núñez", emails: ["jose.nunez@mail.com"], line: 3 },
      { title: "Search movies — José García", emails: ["jose.garcia@mail.com"], line: 4 },
    ],
  ],
];

const internationalNames = [
  ["Ömer Yılmaz", "ömer"],
  ["José Núñez", "Jose\u0301"],
  ["Ольга Иванова", "ольга"],
  ["李明", "李明"],
  ["أحمد علي", "أحمد"],
  ["अनिता शर्मा", "अनिता"],
  ["E\u0301lodie Martin", "Élodie"],
];
for (const [name, firstName] of internationalNames) {
  for (const owner of [name, firstName]) {
    cases.push([
      `- ${name} — student@example.com\n- Fetch movies — ${owner}\n`,
      [{ title: `Fetch movies — ${owner}`, emails: ["student@example.com"], line: 2 }],
    ]);
  }
  for (const adjacent of ["x", "é", "字", "1", "_", "\u0301"]) {
    for (const owner of [`${adjacent}${firstName}`, `${firstName}${adjacent}`]) {
      const text = `- ${name} — student@example.com\n- Fetch movies — ${owner}\n`;
      assert.equal(checkPlan(text).ok, false, text);
      assert.deepEqual(taskLines(text), [], text);
    }
  }
}

for (const [text, expected] of cases) {
  assert.equal(checkPlan(text).ok, true, text);
  assert.deepEqual(taskLines(text), expected);
}
assert.deepEqual(taskLines(members + "| Task | Owner |\n| --- | --- |\n"), []);
console.log(`${cases.length} plan assignment checks passed`);
