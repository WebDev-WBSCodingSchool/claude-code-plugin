# Fake eCommerce Site

Module 021, Advanced React II: Next.js. Solo project, two days.

You built this shop before as a React single-page app. Now you build it again with
Next.js and the App Router. The pages are the same. What changes is where the code
runs: Next.js renders most components on the server and sends only the interactive
ones to the browser. The product data comes from
[FakeStoreAPI](https://fakestoreapi.com/). The React version runs at
<https://ecommerce-react-xutq.onrender.com/>, so you can see what the finished shop
looks like.

## How you work

1. Run `/onboard`. It puts this repo on GitHub under your account and checks your
   setup. This step is done when all checks pass.
2. Pick a task and create a branch for it, for example
   `git switch -c FR001-home-page`.
3. Write the code, commit it, and explain it to the agent. This step is done when
   the agent records your sign-off. See "Write it, commit it, explain it" below.
4. Merge the branch into `main` and push it:

   ```
   git switch main
   git merge FR001-home-page
   git push
   ```

   You work alone, so you don't need a Pull Request. Open one anyway if you want to
   read the diff on GitHub before you merge. Then go back to step 2.

## Requirements

| id | requirement |
| --- | --- |
| **FR001** | `/` loads all categories and all products from FakeStoreAPI. It shows each product as a card with its title, its price in euros, a link to its category, and the cart controls from FR004. |
| **FR002** | `/category/[category]` shows the products of the category in the URL. It uses the same card component as the Home page. |
| **FR003** | Every page shares one cart. The app loads the cart from `localStorage` when it starts and saves it there after every change. |
| **FR004** | Every product card has cart controls. A product that isn't in the cart has an add button. A product in the cart has add and remove buttons and shows its quantity. Removing the last one removes the product from the cart, so a quantity never goes below zero. |
| **FR005** | Every page has a navigation bar with links to Home and Cart. Its cart icon shows the total quantity and the total price. |
| **FR006** | `/cart` shows a table with one row per product, the row's sum, and the cart total. Each row has the same add and remove controls. |
| **X1** | A category that doesn't exist, such as `/category/does-not-exist`, shows the Next.js 404 page. |
| **X2** | Until the saved cart has loaded, the cart icon shows a placeholder instead of `0`. |
| X3 | Optional. While the products load, the Home page shows a loading skeleton. |

You write the bold tasks yourself. For the others, you can ask the agent for help.

Each bold task belongs to one of four files. Next.js derives these paths from the
URLs, so the code can't go anywhere else:

- `src/app/page.tsx` for FR001 and FR004
- `src/app/category/[category]/page.tsx` for FR002 and X1
- `src/app/layout.tsx` for FR003, FR005, and X2
- `src/app/cart/page.tsx` for FR006

Your commit for a task must change its file. You decide where everything else goes
and what it's called, including your components, the cart context, and your helper
functions.

### Things the requirements don't mention

- Use Server Components by default. Add `'use client'` only to a component that
  needs the browser, meaning one that uses state, effects, event handlers, or
  `localStorage`. No task checks this on its own. It applies to every task.
- The server has no `localStorage`. Next.js renders Client Components once on the
  server before the browser takes over, so the cart can't read `localStorage` when
  it's created. Load the saved cart after the component has mounted. Until then,
  the page shows an empty cart. X2 is about this moment.
- Category names contain spaces and apostrophes, for example `men's clothing`.
  Encode the name with `encodeURIComponent` when you build a link to
  `/category/...`. Decode the `category` param with `decodeURIComponent` before
  you pass it to the API.
- Format prices with `Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })`.
  The server doesn't know the browser's locale. If you format with the browser's
  locale, the server and the browser render different prices, and React reports a
  hydration error.

## Setup

This repo is the output of `create-next-app` with TypeScript, ESLint, Tailwind, the
App Router, and a `src/` folder. DaisyUI is installed on top. Three files differ
from the template:

- `globals.css` loads DaisyUI. It no longer sets the template's color variables,
  because they would override DaisyUI's themes.
- `next.config.ts` sets `agentRules: false`. Without it, `next dev` adds its own
  section to `AGENTS.md` whenever an agent starts it, and `AGENTS.md` is read-only
  in this repo.
- `eslint.config.mjs` skips the `.claude/` folder, which holds the course scripts.

Run `npm install`, then `npm run dev`. Read `package.json`, `next.config.ts`, and
`tsconfig.json` before you start.

Choose your styling on day one. You can use plain CSS, Tailwind, Tailwind with
DaisyUI as installed, or another styling library. Don't add a state library such
as Redux, Zustand, or Jotai, and don't add a data-fetching library such as SWR,
React Query, or axios. This exercise is about sharing the cart through React
Context, fetching data in Server Components, and deciding which components run in
the browser. Those libraries would do that work for you.

You can copy components and helpers from your React version. Expect to change the
parts that use state or `localStorage`.

Two days is not much time for eight tasks. Get all routes working with placeholder
content first, then load the real data, then build the cart.

FakeStoreAPI needs no API key, so you don't need a `.env` file.

## What you write yourself

You write three kinds of code yourself:

- `fetch` calls inside async Server Components
- `'use client'` directives, which means deciding which components need one
- the cart context: `createContext`, the provider, and the code that reads it

The agent won't write any of these for you until you have written one yourself,
committed it, and explained it.

You can ask the agent to help with everything else:

- the layout and the nav links to Home and Cart
- the product card's markup: title, image, price, and the category link
- price formatting with `Intl.NumberFormat("de-DE", …)`
- how the Home page shows the categories
- the cart helpers in `src/utils` that add and remove products
- saving the cart to `localStorage` and loading it again
- the Cart page around its table
- X3, the optional loading skeleton in `loading.tsx`
- all styling
- features beyond these requirements
- explaining errors and hydration warnings, and finding answers in the Next.js docs

The agent only acts when you ask it to. An empty file or a finished task list
doesn't count as a request. Before each code change, it asks you at least one
question about the change and waits for your answer.

This list also tells you what you could get from a browser chat instead. That's
intentional. The rules are written down, and following them is your choice.

## Write it, commit it, explain it

When you have written a bold task:

1. Write the code.
2. Commit it with
   `git add <file> && git commit --signoff -m "<task id>: <what it does>"`.
3. Explain it. The agent asks what your commit does, then up to three short
   follow-up questions. A large commit gets more questions, a small one fewer.

Explaining your own code shows you whether you understood it. Nobody grades your
answers, and nothing you say is saved. The commit already records that you wrote
the code.

Once you have written and explained one piece of a kind of code, the agent may
write that kind of code with you for the rest of the project. That includes
features beyond the requirements.

The agent records each completed task in a file under
`.claude/harness/progress/`, filed under your git email. Commit that file with your
work. You can ask the agent at any time which tasks you have completed.

### Signing your commits

`git commit --signoff` adds this line to the commit message:

```
Signed-off-by: Lea Müller <lea.mueller@example.com>
```

The line says that you wrote the code. The Linux kernel and many other open-source projects require it.
Nothing in this repo checks it, but use it on all your own commits, not only on the
bold tasks.

When the agent wrote a commit or helped with it, the agent adds a
`Co-Authored-By: Claude …` line instead. With both lines in place, `git log` shows
who wrote what.

## Running it

Open this folder in VS Code and start Claude Code here, not in a subfolder. Claude
Code loads this repo's settings only from the root folder. Without them, the agent
may write code that you are supposed to write.

Use the same git email on every computer. The agent stores your progress under that
email, and work you do under a second email won't count.

To change how the agent talks to you, for example with simpler language or shorter
answers, tell it, and ask it to save that as a personal skill in
`~/.claude/skills/`. The skill also applies in your later projects. It doesn't
change which code you write yourself.

Some files in this repo are read-only for you and the agent:

- `.vscode/settings.json` turns off inline suggestions, the gray code that tools
  like Copilot show while you type. Those suggestions write code without you
  asking for it.
- `README.md` and `CLAUDE.md` say which code you write yourself and where the
  agent may help. The agent must not change them.

If you think a requirement is wrong or unclear, talk to your instructor.

You can get around these locks. VS Code has a setting for it, and other editors
ignore it. All of these files are committed, though, so any change to them shows
up in the git history under your name.
