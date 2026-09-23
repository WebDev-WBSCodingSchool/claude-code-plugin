// src/lib/api.ts — yours to type.
//
// The markers below name requirements from README.md. Keep them: the brief, your
// issues, the agent and this file then all use the same words for the same thing.

// FR004 — one call to the Art Institute, one gate on the way back.
//   The search endpoint is https://api.artic.edu/api/v1/artworks/search. Read
//   https://api.artic.edu/docs/ before you write the URL, particularly the part
//   about which fields come back by default and which you have to ask for — the
//   image is one you have to ask for.
//   Nothing that arrived over the network reaches the rest of the app
//   unvalidated. "Invalid" needs an answer that is not a crash, and deciding what
//   that answer is — drop the bad ones, or fail the whole search — is part of
//   this requirement.
