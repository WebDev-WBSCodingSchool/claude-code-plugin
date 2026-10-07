// App.jsx — the top of your component tree, and yours to write.
//
// The markers below name requirements from README.md. They are here so the
// brief, your Issues, the agent and this file all use the same words for the
// same thing — nothing reads them, and you can move or delete them once the
// code they name exists.
//
// What lives here is your decision. The suggested tree in the README puts the
// entries, the selected entry and the modal flags in this file; that is one
// answer, not the answer.

// FR006 — Add Entry button.
// Something on the page opens the entry-creation modal, and whether that modal
// is open is held in state rather than in the DOM.

// FR012 — Load entries on startup.
// When the app first mounts, the entries already in localStorage are read and
// rendered. A refresh should show the same diary, not an empty one.

export default function App() {
  return (
    <main>
      <h1>Personal Diary</h1>
    </main>
  )
}
