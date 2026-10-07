# Worked example: movie-diary

How the one hand-built repo, `task-harness/movie-diary-harness`, for
`software-ai-engineering`'s 005-js-modules module project, answered each of the ten
interview questions. Use it to see what a good answer looks like, not to copy
it. A different assignment will answer most of these differently.

## 1. Point me at the exercise.

`software-ai-engineering/005-js-modules/module-project-movie-diary-or-pokedex/movie-diary-or-pokedex.md`.
The curriculum source is one document with two variants, Movie Diary (TMDB API)
and Pokédex (PokéAPI), sharing every requirement through FR006 and differing only
in which API they call and what the second page is named (`journal.*` or
`pokedex.*`). The exemplar repo picks one, Movie Diary, and the README says how to
switch to the other:

> Doing the Pokédex instead? Same requirements, same rules. Rename
> `journal.html` and `journal.js` to `pokedex.*` and change the two matching
> lines in `.claude/harness/config.json`.

## 2. What is this project built with, and what should students avoid adding halfway through?

"Vanilla JavaScript: two pages, plain `<script>` tags, Tailwind from a CDN. No
build step, no npm, no imports." (`README.md`, "The setup".)

The second half of that section is the part worth reading closely. Vite, bundlers
and ES modules are not wrong, and they are not far off: they arrive later **in the
same curriculum unit**. The README does not tell the student those tools are
premature or above their level. The argument it makes is about cost:

> adding one mid-project means every teammate's clone stops working until
> they run an install step

That is the tutor's whole case against a mid-project switch. It is a
coordination cost for the group, not a judgment about what has or has not been
taught. Keep this distinction clear in a new assignment, because the reason to
hold a line is almost never "you do not know this yet."

## 3. Which parts of the code must students write themselves to learn the module topic?

DOM, Web Storage and Fetch, the three APIs FR005 names and the only reason this
module exists ("Core Web APIs Usage … Demonstrate DOM, Web Storage, and Fetch
APIs"). That maps directly onto `.claude/harness/config.json`:

```json
"gated": ["fetch", "dom", "localStorage"]
```

Three protected topics, three `gated` entries, three detectors in `guard.mjs`.
No more, no fewer. An entry with no counterpart in either direction is a config
and detector mismatch. See `references/detectors.md`.

## 4. Which requirements make students practise each protected topic?

The six-row `tasks[]` table, quoted whole from `.claude/harness/config.json`:

| id | title | file | categories |
| --- | --- | --- | --- |
| FR009 | Fetch popular movies | `main.js` | `fetch`, `dom` |
| FR010 | Search with dialog | `main.js` | `fetch`, `dom` |
| FR011 | Movie cards | `main.js` | `dom` |
| FR012 | Add to favourites | `main.js` | `localStorage` |
| FR013 | Journal page display | `journal.js` | `localStorage`, `dom` |
| FR014 | Personal notes | `journal.js` | `localStorage`, `dom` |

`file` is where `signoff.mjs` looks for the student's work: the file that task's
commit has to touch, not the whole tree. After signoff, the write check stops
refusing the code in `categories`, everywhere, not just in that file. The student
must still ask for a change, and the agent must ask a project-specific question
before editing.

## 5. Which important parts of those topics do the requirements fail to practise?

**The exemplar repo predates this question**, so nothing below is in its
`config.json`. This is what the walk turns up when you run it against that
six-row table, and it is here to show the shape of the walk rather than to be
copied in.

Three protected topics, so three passes.

**`fetch`** is exercised twice, in FR009 and FR010, and both times as a happy-path
GET against TMDB: one list endpoint, one search. What the tasks never touch is
either end of that request. Nothing asks what the page shows while the films are
still coming, and nothing asks what it shows when TMDB is unreachable or the key
is refused, which on a class of thirty students with one shared key happens on the
first afternoon. Two candidates, written the way a student would read them:

> **X1** Say something useful when the films cannot be loaded, instead of an empty
> page.
>
> **X2** Show that something is happening while they load.

**`dom`** is exercised as building markup that was not there before: cards in
FR011, a dialog in FR010. What it never touches is changing something already on
the page. Every current task can be satisfied by throwing the list away and
rendering it again. One candidate:

> **X3** The favourite button on a card shows whether that film is already a
> favourite, and flips when clicked without the list being redrawn.

**`localStorage`** is written to in FR012, FR013 and FR014 and, in the strict
sense, never read back from a state the student did not just put there. Nothing
covers a first visit with nothing stored, and nothing covers taking something out
again. One candidate:

> **X4** Remove a film from your journal.

A plausible instructor takes X1, X3 and X4 and declines X2 as polish, which is a
good outcome: four gated tasks become seven, all three categories get a second
angle, no new category is introduced, and every one of the new rows lives in
`main.js` or `journal.js` alongside the tasks already there.

That last part carries a consequence. Three of the four additions land in
`main.js`, which already held three of the six original tasks, so the README
sentence about where merge conflicts will land needs rewriting: it is now
emphatically `main.js`, and the group should be told so rather than finding out.

## 6. Which remaining requirements may the agent help implement after a student asks?

Students may ask for implementation help with everything that is not one of the
six tasks above:

- All markup and all Tailwind: `index.html`, `journal.html`, every class string.
- The navbar and page plumbing (FR006 to FR008).
- Anything past the requirements: extra features, polish, ideas of the student's
  own.
- Explaining what a requirement means, reading errors with the student, and
  working out which lines came from which branch after a messy merge. Not
  resolving the conflict itself, though; in this project the conflicts are the
  lesson.

This is not a list for the agent to work through. The student must request a
change in the current chat. The agent then asks at least one project-specific
question and waits for the answer before editing code.

The thing this group has to settle at the kickoff, written into `README.md` as the
thing itself rather than as a question to go round the room with, is **what a
favourite actually is once it is in `localStorage`**: which fields of the movie
get stored, and what "the movie" means at that point. It sits in FR012, and it is
exactly the kind of decision two teammates each assume silently and only discover
in a merge conflict three days later.

## 7. Which files and folders should the project contain, and which file types can hold protected work?

`index.html ↔ main.js`, `journal.html ↔ journal.js` (FR007). In
`.claude/harness/config.json`, `guardedExtensions` is `[".js", ".mjs", ".cjs",
".html"]`. `.html` is in that list on purpose, so that pasting gated content into
an inline `<script>` block is not a way around the guard.

## 8. Which command can check one source file for syntax errors?

`node --check`, plain, no flags. `.claude/harness/config.json`'s `syntaxCheck` key
carries it as data because it's language-specific. The field is absent, and the
step skipped, on an assignment with no single-file syntax check.

## 9. Which local files must students create but never commit?

`config.example.js` is the committed template. The student copies it to
`config.js`, which is gitignored, and pastes their own TMDB token into the copy.
`index.html` loads it with a third `<script>` tag, before `main.js` and after the
Tailwind CDN tag, so the token is a plain global variable by the time `main.js`
runs, with no import to write.

That "plain global, no import" choice is the point. It removes `type="module"`
from the picture, and with it the dev-server requirement and the `file://` CORS
warning a `<script type="module">` throws when opened directly, all in the one
move of keeping `config.js` a non-ESM script. The harness doesn't have to explain
module loading to explain how to keep a token out of git.

This answer is **this assignment's**, not a template. A different module's answer
to "what does a student create locally and never commit" might be a `.env` file, a
seeded local database, an API key in a different shape entirely, or nothing at
all. The config generator has to ask the question fresh each time, not default to
this one.

## 10. Does this exercise require students to edit the normally read-only `.claude/skills/` or `.vscode/` files?

No. `writableExceptions` is `[]`. Nothing in this module is *about* writing a
Claude Code skill or changing editor settings, so the two paths that are locked
mechanically in every generated repo stay locked here with nothing carved out.

---

One thing the exemplar's README does that no config key expresses, and that every
generated README should keep doing: it tells the student the rule instead of just
fencing them in by it.

> Yes, this tells you exactly what you could paste into a browser chat
> instead. You are being told the rule rather than fenced in by it, because
> a rule you can read is one you can decide to keep.

A `neverWritable` path and a gated category stop a *write*. They say nothing to
the student about why, and they do not have to, because the guard's refusal
message carries that. But the README is read before any of that fires, and it is
the one place that can say what is locked, why, and what it would take to get
around it anyway. That is a deliberate choice about how much respect the
document extends to the student reading it, and it costs nothing to keep.
