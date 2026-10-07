# Worked example: movie-diary

This file shows how the `movie-diary` exercise answered the ten interview
questions. The exercise comes from the 005-js-modules module project in
`software-ai-engineering`. Use it to see what a good answer looks like. A
different assignment will answer most questions differently, so don't copy the
answers.

The exercise runs over two weeks. Week 1 builds the app in plain JavaScript, and
week 2 moves it to Vite and ES modules. The answers below describe week 1 unless
they say otherwise.

## 1. Point me at the exercise

The source is
`software-ai-engineering/005-js-modules/module-project-movie-diary-or-pokedex/movie-diary-or-pokedex.md`.
It describes two variants. Movie Diary uses the TMDB API, and Pokédex uses
PokéAPI. Both share every requirement. They differ only in the API they call and
in the name of the second page, `journal.*` or `pokedex.*`.

The exercise picks Movie Diary, and the README says how to switch:

> Doing the Pokédex instead? The requirements and the rules are the same. Rename
> `journal.html` and `journal.js` to `pokedex.html` and `pokedex.js`, and change
> the two matching lines in `.claude/harness/config.json`.

## 2. What is the project built with, and what should students avoid adding halfway through?

Week 1 is plain JavaScript: two pages, plain `<script>` tags, and Tailwind from
the CDN. There is no build step, no npm, and no `import`.

Vite, bundlers, and ES modules come in week 2 of the same project. The README
doesn't tell students that these tools are too advanced for them. It gives the
cost instead:

> If someone adds one of them during week 1, everyone else's clone stops working
> until they run an install step.

This is a group project, so the reason is the cost to teammates. In a solo
project, the reason is usually that a package would do the work the exercise
practises. Neither reason is a judgment about what students are allowed to learn.

## 3. Which code must students write themselves to learn the module topic?

Requirement FR005 names three APIs: DOM manipulation, `localStorage`, and
`fetch`. They are the reason this module exists, and they map directly onto the
config:

```json
"gated": ["fetch", "dom", "localStorage"]
```

Week 2 adds two more topics, `esModules` and `viteConfig`, for the move to Vite.

Each protected topic needs a detector in `guard.mjs`, and each detector belongs
to a protected topic. An entry on one side without a match on the other is an
error. See `references/detectors.md`.

## 4. Which requirements make students practise each protected topic?

The first version of the exercise had six week 1 tasks:

| id | title | file | categories |
| --- | --- | --- | --- |
| FR009 | Fetch popular movies | `main.js` | `fetch`, `dom` |
| FR010 | Search with dialog | `main.js` | `fetch`, `dom` |
| FR011 | Movie cards | `main.js` | `dom` |
| FR012 | Add to favourites | `main.js` | `localStorage` |
| FR015 | Journal page display | `journal.js` | `localStorage`, `dom` |
| FR016 | Personal notes | `journal.js` | `localStorage`, `dom` |

`file` is the file that the task's commit must change. `signoff.mjs` checks that
file, not the whole project. After a sign-off, the guard stops blocking the
task's `categories` everywhere in the project, not only in that file. The student
still has to ask for each change, and the agent still asks a project-specific
question before it edits.

## 5. Which important practice is missing?

Go through the protected topics one at a time. For each one, say what the tasks
make students practise, then name what they don't.

**`fetch`.** FR009 and FR010 both make a successful GET request to TMDB. No task
covers a failed request. With one shared key in a class of thirty students, TMDB
refuses requests on the first afternoon. Two candidates:

> **X1** When the movies can't be loaded, the page says so instead of staying
> empty.
>
> **X2** While the movies load, the page shows that it is working.

**`dom`.** FR010 and FR011 build markup that wasn't on the page before. No task
changes markup that is already there. Every task works if the student throws the
list away and renders it again. One candidate:

> **X3** A card's favourite button shows whether the movie is already in the
> journal, and switches when you click it, without redrawing the list.

**`localStorage`.** The tasks write to storage, but none of them reads back data
that the student didn't just save, and none of them removes anything. One
candidate:

> **X4** Users can remove a movie from the journal.

The instructor accepted X1, X3, and X4 and declined X2. The exercise now has them
as FR013, FR014, and FR017. All three topics got a second kind of practice, and
no new topic was needed.

The additions changed the merge-conflict note in the README. Two of the three
landed in `main.js`, which already held four of the six tasks. The README now
tells the group that most conflicts will happen in `main.js`.

## 6. Which remaining requirements may the agent help implement after a student asks?

Students may ask the agent to help with everything outside the protected tasks:

- all markup and all Tailwind classes in `index.html` and `journal.html`
- the navbar and the page setup, FR006 to FR008
- features beyond the requirements
- explaining requirements, reading errors, and finding out which lines came from
  which branch after a difficult merge. The agent doesn't resolve merge conflicts,
  because resolving them is part of what the project teaches.

This list isn't a to-do list for the agent. The student has to ask for a change.
The agent then asks at least one project-specific question and waits for the
answer before it edits code.

The decision this group has to make at the kickoff is **what a favourite looks
like in `localStorage`**: which fields of the movie get stored. The README states
the decision itself, not a general instruction to discuss the project. FR012
stores the fields, and FR014, FR015, and FR017 depend on them. Two teammates who
assume different answers find out in a merge conflict a few days later.

## 7. Which files and folders should exist, and which file types can contain protected work?

FR007 asks for two pages, `index.html` with `main.js` and `journal.html` with
`journal.js`. The config sets `guardedExtensions` to
`[".js", ".mjs", ".cjs", ".html"]`. `.html` is in the list so that a student
can't get around the guard by putting protected code in an inline `<script>`.

The week 2 files, `src/home.js` and `src/journal.js`, don't exist in the starter.
Students create them during the refactor, so the config sets `preScaffold` to
`true`.

## 8. Which command checks one source file?

`node --check`, with no flags. The config stores it in `syntaxCheck` because the
right command depends on the language. When no single-file check exists, the key
is left out and the tutor skips the step.

## 9. Which local files must students create but never commit?

`config.example.js` is committed. Each student copies it to `config.js`, which is
in `.gitignore`, and puts their own TMDB token in the copy. `index.html` loads
`config.js` with its own `<script>` tag before `main.js`, so the token is a global
variable by the time `main.js` runs.

Keeping `config.js` a plain script avoids `type="module"`. A module script needs a
dev server and fails with a CORS error when the page is opened directly from the
file system. With a plain script, the README doesn't have to explain module
loading in week 1.

This answer belongs to this assignment. Another module might need a `.env` file,
a local database, or no local file at all. Ask the question every time.

## 10. Must students edit normally read-only Claude or VS Code files?

No. `writableExceptions` is `[]`. The module doesn't teach agent configuration or
editor settings, so both stay read-only.

---

The README also does something no config key can. It tells students the rules
directly:

> This list also tells you what you could get from a browser chat instead. That's
> intentional. The rules are written down, and following them is your choice.

The guard blocks writes, and its refusal messages explain each block. Students
read the README before any of that happens, so it is the place to say what is
protected and why. Keep this paragraph in every README.
