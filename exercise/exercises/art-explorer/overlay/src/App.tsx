// src/App.tsx — yours to type.
//
// The markers below name requirements from README.md. Keep them: the brief, your
// issues, the agent and this file then all use the same words for the same thing.

// FR012 — the state everything else hangs off.
//   What has been searched for, what came back, what has been saved. One set of
//   types describes all of it, and they come out of your schemas rather than
//   being written a second time by hand. This is the requirement that goes wrong
//   quietly: it is not "add types at the end", it is having one answer to "what
//   is an artwork here" that every component agrees with.
//
// FR005 and FR008 land here too, or in components this one renders: the search
//   interface, and adding a result to the gallery.

// Everything below is a placeholder so that `npm run dev` shows you something on
// the first run. Replace it.
export default function App() {
  return (
    <main>
      <h1>Art Institute Explorer</h1>
      <p>Nothing here yet. Start with FR003, in src/lib/artwork.ts.</p>
    </main>
  )
}
