// Your TMDB token goes here — but not in *this* file.
//
// Copy this file to config.js and put your own token in the copy:
//
//     cp config.example.js config.js      (macOS / Linux / Git Bash)
//     copy config.example.js config.js    (Windows cmd)
//
// config.js is gitignored, so your token never lands in a commit. This file is
// the committed template, so a real token must never be pasted in here.
//
// A global variable in a public front-end is a stopgap, not the real answer:
// anyone who opens your page can read the token out of it. Keeping a credential
// genuinely secret needs a server that holds it for you, and that comes later in
// the course. Until then: keep it out of git, and if it ever does get committed,
// generate a new one — a token that has been public once stays burned.

const TMDB_TOKEN = "paste-your-TMDB-read-access-token-here";
