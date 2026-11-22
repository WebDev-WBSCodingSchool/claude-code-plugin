#!/usr/bin/env node
//
// PreToolUse hook: the static floor plus the student's earned categories.
//
// ---------------------------------------------------------------------------
// The exit-code contract, which is a trap worth restating in full:
//
//   exit 0, nothing on stdout    -> no opinion. The write proceeds.
//   exit 0 + JSON on stdout      -> a decision. This is how we deny.
//   ANY non-zero exit            -> a NON-BLOCKING error. The write PROCEEDS.
//
// So an uncaught exception in this file does not fail safe, it fails open. Never
// throw out of here; catch and deny instead. Everything below the stdin parse is
// wrapped for exactly that reason.
// ---------------------------------------------------------------------------
//
// What it decides: whether the payload being written matches a gated content
// category that this student has not yet demonstrated. Not which file it is
// (globs don't cover cross-file tasks) and not which task it is
// (the FR landmarks are comments with no mechanical authority, and the tickets
// are student-authored, so intent is not observable — only content is).

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  root,
  relPath,
  loadConfig,
  readProgress,
  demonstrated,
  lockedAs,
  normalizeRel,
  planFile,
  onboardingBlock,
  branchState,
  formatCategories,
} from "./harness.mjs";
import { denyReason } from "./reason.mjs";

// --- Detectors -------------------------------------------------------------
//
// Deliberately conservative, and imperfect on purpose: this is a floor, not a
// fence. Over-reaching costs more than under-reaching, because a false positive
// blocks the agent in territory it was promised (markup, styling, plumbing,
// stretch features) and that is the failure that gets the harness deleted.
//
// Note what is NOT in `dom`: addEventListener, classList, showModal. Those are
// event wiring and styling, which happen throughout open territory. The category
// is DOM *construction and mutation* — the thing FR011 and FR013 are actually
// about.

function splitTopLevel(text, openIdx, closeChar, maxScan = 4000) {
  const limit = Math.min(text.length, openIdx + maxScan);
  const parts = [];
  let partStart = openIdx + 1;
  let paren = closeChar === ")" ? 1 : 0;
  let brace = closeChar === "}" ? 1 : 0;
  let bracket = 0;
  let quote = null;
  const tmplBraces = [];
  let lineComment = false;
  let blockComment = false;

  for (let i = openIdx + 1; i < limit; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (quote === "`" && ch === "$" && next === "{") {
        tmplBraces.push(brace);
        brace++;
        quote = null;
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === "/" && next === "/") {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "(") paren++;
    else if (ch === ")") {
      paren--;
      if (closeChar === ")" && paren === 0) {
        parts.push(text.slice(partStart, i));
        return parts;
      }
    } else if (ch === "[") bracket++;
    else if (ch === "]") bracket = Math.max(0, bracket - 1);
    else if (ch === "{") brace++;
    else if (ch === "}") {
      brace--;
      if (tmplBraces.length && brace === tmplBraces.at(-1)) {
        tmplBraces.pop();
        quote = "`";
      } else if (closeChar === "}" && brace === 0) {
        parts.push(text.slice(partStart, i));
        return parts;
      }
    } else if (
      ch === "," &&
      paren === (closeChar === ")" ? 1 : 0) &&
      brace === (closeChar === "}" ? 1 : 0) &&
      bracket === 0
    ) {
      parts.push(text.slice(partStart, i));
      partStart = i + 1;
    }
  }
  return null;
}

function isGetOptions(optsText) {
  const trimmed = optsText.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
  const props = splitTopLevel(trimmed, 0, "}");
  if (!props) return false;
  let hasMethod = false;
  let methodIsGet = false;
  // splitTopLevel skips comments while splitting but keeps them in each slice,
  // so `// create\n method: "POST"` must lose its comment before the checks below.
  const comments = String.raw`(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*`;
  for (const rawProp of props) {
    const prop = rawProp.replace(new RegExp(`^${comments}`), "");
    if (!prop) continue;
    if (prop.startsWith("...")) return false;
    const match = prop.match(/^(?:["']method["']|method(?=\s*(?::|$)))\s*(:)?([\s\S]*)$/);
    if (match) {
      hasMethod = true;
      if (!match[1]) return false;
      methodIsGet = /^["'`]GET["'`]$/i.test(match[2].replace(new RegExp(`${comments}$`), "").trim());
    }
  }
  return !hasMethod || methodIsGet;
}

function hasGetFetch(text) {
  const re = /(?<![\w$.])(?:(?:window|globalThis)\s*\.\s*)?fetch\s*\(/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const openIdx = match.index + match[0].length - 1;
    const args = splitTopLevel(text, openIdx, ")");
    if (!args) continue;
    // A trailing comma (Prettier's multiline style) leaves an empty last slice.
    if (args.length > 1 && args.at(-1).trim() === "") args.pop();
    if (args.length === 1 && args[0].trim() !== "") return true;
    if (args.length >= 2 && isGetOptions(args[1])) return true;
  }
  return false;
}

const TW_VARIANTS =
  "(?:sm|md|lg|xl|2xl|hover|focus|focus-within|focus-visible|active|disabled|checked|dark|first|last|odd|even|group-hover|peer-focus|motion-safe|motion-reduce|print)";
const TW_UTILITIES =
  "(?:flex|inline-flex|grid|inline-grid|block|inline-block|hidden|absolute|relative|fixed|sticky|mx-auto|items-\\w+|justify-\\w+|self-\\w+|gap-[\\d.]|space-[xy]-[\\d.]|grid-cols-\\d|col-span-\\d|row-span-\\d|[mp][xytrbl]?-[\\d.]|w-[\\w./]|h-[\\w./]|max-w-\\w|min-w-\\w|max-h-\\w|min-h-\\w|text-\\w+|font-\\w+|leading-\\w+|tracking-\\w+|bg-\\w+|border-\\w|rounded[\\w-]*|shadow[\\w-]*|opacity-\\d|z-\\d|overflow-\\w+|object-\\w+|transition[\\w-]*|duration-\\d|ease-\\w+|cursor-\\w+)";
// Template-literal body: any char, a lone `$`, or a whole `${...}` skipped as a unit.
const TW_TEMPLATE = String.raw`(?:[^\`$]|\$(?!\{)|\$\{[^}\`]*\}){0,400}?`;

const DETECTORS = {
  fetch: [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\baxios\b/,
  ],
  // HTTP methods are separate teaching steps in assignments that need a GET
  // sign-off to leave POST, PUT and DELETE closed. Fetch defaults to GET when
  // `options` omits `method`, while dynamic options objects stay open rather than
  // making an ambiguous method block work.
  getRequests: [
    { test: hasGetFetch },
  ],
  postRequests: [
    /(?<![\w$.])(?:(?:window|globalThis)\s*\.\s*)?fetch\s*\([\s\S]{1,300}?,\s*\{[\s\S]{0,300}?\bmethod\s*:\s*["'`]POST["'`]/i,
  ],
  putRequests: [
    /(?<![\w$.])(?:(?:window|globalThis)\s*\.\s*)?fetch\s*\([\s\S]{1,300}?,\s*\{[\s\S]{0,300}?\bmethod\s*:\s*["'`]PUT["'`]/i,
  ],
  deleteRequests: [
    /(?<![\w$.])(?:(?:window|globalThis)\s*\.\s*)?fetch\s*\([\s\S]{1,300}?,\s*\{[\s\S]{0,300}?\bmethod\s*:\s*["'`]DELETE["'`]/i,
  ],
  dom: [
    /\bdocument\s*\.\s*(querySelector(All)?|getElementById|getElementsBy\w+|createElement|createTextNode|createDocumentFragment)\s*\(/,
    /\.\s*(innerHTML|outerHTML|textContent|innerText)\s*=/,
    /\.\s*insertAdjacentHTML\s*\(/,
    /\.\s*(append|appendChild|prepend|replaceChildren|insertBefore)\s*\(/,
    /\.\s*setAttribute\s*\(/,
  ],
  localStorage: [
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\.\s*(setItem|getItem|removeItem)\s*\(/,
  ],
  // React. Note what is NOT here: `className`, imports, props, JSX attributes.
  // Those are styling and plumbing, open territory throughout. What each of
  // these three matches is the topic itself — producing elements, holding
  // state, reaching outside render.
  reactRendering: [
    // Every pattern anchors `<` immediately after the operator, so comparisons
    // survive: `return a < b`, `(a, b) => b.date - a.date`, `i < n`, `a && b < c`
    // are all untouched. A sort comparator and a validation helper stay writable.
    /\breturn\s*\(?\s*</,
    /=>\s*\(?\s*</,
    /(&&|\?)\s*</,
  ],
  reactState: [
    /\buseState\s*\(/,
    /\buseReducer\s*\(/,
    /\buseActionState\s*\(/,
    /\buseFormStatus\s*\(/,
  ],
  reactEffects: [
    /\buseEffect\s*\(/,
    /\buseLayoutEffect\s*\(/,
    // The lazy initializer that loads from storage inside useState, which would
    // otherwise satisfy "load on startup" without an effect ever being written.
    // Bounded scan, so it only fires when the storage call is inside the
    // initializer rather than somewhere further down the file.
    /useState\s*\(\s*(\(\s*\)\s*=>|function\s*\(\s*\))[\s\S]{0,200}?(localStorage|sessionStorage|getItem)/,
  ],
  // The Next.js server/client boundary: the directive that turns a file into a
  // Client Component. Note what is NOT here: `"use server"`, hooks, and prose
  // about the directive. A comment explaining why a page stays on the server
  // starts with `//`, so the line anchor keeps it open.
  clientComponents: [
    /^\s*["']use client["']/m,
  ],
  // React Context: creating one, providing a value, reading it. Note what is NOT
  // here: rendering the student's own provider component (`<CartContextProvider>`
  // in a layout) or calling their custom hook (`useCart()`). Both are wiring
  // around Context code already written, and matching them would close the
  // layout and every consumer for open work like nav links.
  reactContext: [
    /\bcreateContext\s*[<(]/,
    /\buseContext\s*\(/,
    /\buse\s*\(\s*\w*Context\s*\)/,
    // `<CartContext value={…}>` (React 19) or `<CartContext.Provider …>`. The
    // lookahead after `Context` is what keeps `<CartContextProvider>` out.
    /<\/?\w*Context(\.Provider)?(?=[\s/>])/,
  ],
  // Declarative React Router. Imports and route-shaped data are open; these are
  // the rendered router components and hooks that make navigation work.
  reactRouting: [
    /<\/?(BrowserRouter|Routes|Route|Link|NavLink|Navigate|Outlet)(?=\s|\/?>)/,
    /\b(useParams|useNavigate|useLocation|useOutletContext|useSearchParams)\s*\(/,
  ],
  // Request failures and visible feedback. Generic try/catch and ordinary state
  // are intentionally absent because both occur throughout open application code.
  errorHandling: [
    /\b(response|res)\s*\.\s*ok\b/,
    /\btry\s*\{[\s\S]{0,1200}?\bfetch\s*\([\s\S]{0,800}?\)[\s\S]{0,1200}?\}\s*catch\s*(\([^)]*\))?\s*\{/,
    /\bfetch\s*\([\s\S]{1,500}?\)\s*\.\s*catch\s*\(/,
    /\bset(Api|Network|Auth|Form)?Error(Message)?\s*\(/,
    /\btoast\s*\.\s*error\s*\(/i,
    /<Route\b(?=[^\n]{0,300}\bpath\s*=\s*["']\*["'])(?=[^\n]{0,300}\belement\s*=\s*\{\s*<NotFound(Page)?\b)[^\n]{0,300}/i,
  ],
  // Frontend authentication, not storage in general. Theme preferences and
  // ordinary Outlet context stay open; token/session code and auth guards do not.
  frontendAuth: [
    /\b(localStorage|sessionStorage)\s*\.\s*(getItem|setItem|removeItem)\s*\(\s*["'`](token|jwt|(auth|access|refresh|id)[-_]?(token|jwt))["'`]/i,
    /\b(localStorage|sessionStorage)\s*\.\s*(getItem|setItem|removeItem)\s*\(\s*((AUTH|ACCESS|REFRESH|ID)_?)?(TOKEN|JWT)(_KEY)?\b/,
    /\b(get|set|remove|clear)(Auth|Access)?Token\s*\(/,
    /(["'`]Authorization["'`]|\bAuthorization\b)\s*:\s*["'`]Bearer\s/i,
    /\b\w*headers\s*\.\s*set\s*\(\s*["'`]Authorization["'`]\s*,\s*["'`]Bearer\s/i,
    /!\s*(token|authToken|isAuthenticated|isLoggedIn|currentUser)\b[\s\S]{0,160}?<Navigate\b/i,
    /\b(token|authToken|isAuthenticated|isLoggedIn|currentUser)\b\s*\?[\s\S]{0,160}?<Outlet\b[\s\S]{0,160}?:[\s\S]{0,80}?<Navigate\b/i,
    /<Outlet\b[^>]{0,300}\bcontext\s*=\s*\{\s*\{[^}]{0,200}\b(user|currentUser|authUser)\b[^}]{0,200}\}\s*\}/,
    /\b(const|let)\s*\{[^}]{0,200}\b(user|currentUser|authUser)\b[^}]*\}\s*=\s*useOutletContext\s*\(/,
  ],
  // TypeScript in a React app: the annotations, not the code they sit in. The
  // agent writes the components, the state wiring and the plumbing untyped —
  // every type in them is the student's. Note what is NOT here: JSX itself,
  // `className`, props destructured without an annotation, and `import type`,
  // which names a type the student already wrote rather than writing one.
  typedReact: [
    // A declared shape: `type ArtworkProps = {`, `interface Note {`. The
    // capitalized name is what keeps `import type { Artwork } from "./x"` out —
    // there, `type` is followed by a brace rather than by a name.
    /\b(type|interface)\s+[A-Z]\w*\s*[=<{]/,
    // A typed variable declaration: `const items: Artwork[] = []`, `const label: string = "hi"`.
    /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*:\s*(?:[A-Z][\w.]*(?:<[^>\n]*>)?(?:\[\])?|(?:string|number|boolean|bigint|symbol|void|unknown|any|never|null|undefined|object)\b|\{)/,
    // A type argument on a hook call: `useState<Artwork[]>(`, `useRef<HTMLElement>(`.
    // Both the closing `>` and the `(` are required, so `useCount < max` cannot fire.
    /\buse[A-Z]\w*\s*<[^<>()\n]{1,80}>\s*\(/,
    // The annotation on a destructured parameter — a component's props type.
    /\}\s*:\s*[A-Z][\w.]*(\[\]|<[^>\n]*>)?\s*\)/,
    // The annotation on a plain parameter: `(artwork: Artwork)`. An object
    // literal cannot match here: it opens with `{`, not with an identifier.
    /\(\s*\w+\??\s*:\s*[A-Z][\w.]*(<[^>\n]*>)?(\[\])?\s*[,)=]/,
    // A return type, which has to be followed by the body it belongs to.
    /\)\s*:\s*(Promise\s*<[^\n]*>|[A-Z][\w.]*(<[^>\n]*>)?(\[\])?)\s*(\{|=>)/,
    // The same shapes again for primitives, which the capitalized patterns above
    // cannot see. `(q: string)` is a typed parameter and nothing else.
    /\(\s*\w+\??\s*:\s*(string|number|boolean|bigint|symbol|void|unknown|any|null|undefined)\b/,
    /\)\s*:\s*(string|number|boolean|bigint|symbol|void|unknown|any)\s*(\{|=>)/,
    // A 2nd+ typed parameter: `(a, b: number)` or `({ a }, b: Artwork)`.
    /\(\s*(?:(?:[A-Za-z_$][\w$]*(?:\s*=\s*[^,){}\n]+)?|\{[^:(){}\n]*\})\s*,\s*)+[A-Za-z_$][\w$]*\??\s*:\s*(?:[A-Z][\w.]*(?:<[^>\n]*>)?(?:\[\])?|(?:string|number|boolean|bigint|symbol|void|unknown|any|null|undefined|never|object)\b|\{)/,
    // An inline object type on a destructured parameter: `({ query }: { query: string })`.
    /\}\s*:\s*\{/,
    // React's own type names, wherever they are annotated.
    /:\s*(React\.)?(FC|FunctionComponent|ReactNode|ReactElement|PropsWithChildren|ChangeEvent|FormEvent|MouseEvent|KeyboardEvent|Dispatch|SetStateAction|RefObject)\b/,
    /:\s*JSX\.Element\b/,
    // A schema becoming a type — the bridge between the two gated topics.
    /\bz\s*\.\s*infer\s*</,
  ],
  // Runtime validation: building a schema and running data through it. Note what
  // is NOT here: `import { z } from "zod"`, which is plumbing, and `z.infer`,
  // which produces a type and so belongs to typedReact.
  runtimeValidation: [
    /\bz\s*\.\s*(object|string|number|boolean|array|union|discriminatedUnion|literal|enum|nativeEnum|coerce|nullable|nullish|optional|record|tuple|date|any|unknown|never|instanceof)\b/,
    // `.parse` and `.safeParse`. The lookbehind is what keeps `JSON.parse` out:
    // reading localStorage is open plumbing throughout a project like this, and
    // it is the one collision that would block it. The lookbehind spans the
    // whitespace too, so a chain broken over two lines by a formatter is still
    // recognized as JSON.parse rather than as a schema.
    /(?<!JSON\s{0,20})\.\s*(parse|safeParse|parseAsync|safeParseAsync)\s*\(/,
    /\bZodError\b/,
  ],
  // The two categories of a first HTML/CSS project, where the deliverable is
  // the taught material end to end. They are the widest detectors here, and
  // they are still floors: on an assignment that gates these, the agent's open
  // territory is git, the repo around the site, and talking — not other code in
  // the same files. So the cost of a miss is small and the cost of a false
  // positive is mostly borne outside the two extensions that matter.
  //
  // The tag list is explicit rather than `[a-z][\w-]*`, which would fire on
  // every `a <b` in a script file. Note what is NOT in it: `b` and `i`, whose
  // one-letter names are exactly the comparison collision, and which a module
  // teaching semantic markup has no reason to hand out anyway.
  semanticHtml: [
    /<!doctype\s+html/i,
    /<\/?(html|head|body|header|nav|main|section|article|aside|footer|h[1-6]|p|div|span|a|ul|ol|li|dl|dt|dd|img|picture|source|figure|figcaption|video|audio|iframe|canvas|svg|form|input|label|button|select|option|textarea|fieldset|legend|table|thead|tbody|tfoot|tr|th|td|caption|strong|em|small|mark|time|address|blockquote|pre|code|br|hr|details|summary|dialog|title|meta|link|style|script)\b[^<>]*>/i,
  ],
  css: [
    // A declaration. The unquoted value and the semicolon are what keep object
    // literals out: `{ color: "red" }` and `{ width: 100, height: 50 }` are
    // JS, and a student writing either is not writing this module's CSS.
    /\b(display|position|top|right|bottom|left|inset|float|clear|flex|flex-direction|flex-wrap|flex-basis|justify-content|justify-items|align-items|align-content|align-self|order|gap|row-gap|column-gap|grid|grid-template|grid-template-columns|grid-template-rows|grid-template-areas|grid-area|grid-column|grid-row|width|height|min-width|max-width|min-height|max-height|margin|margin-top|margin-right|margin-bottom|margin-left|padding|padding-top|padding-right|padding-bottom|padding-left|box-sizing|overflow|color|background|background-color|background-image|background-size|background-position|background-repeat|border|border-radius|border-top|border-right|border-bottom|border-left|box-shadow|text-shadow|opacity|font|font-family|font-size|font-weight|font-style|line-height|letter-spacing|word-spacing|text-align|text-transform|text-decoration|vertical-align|white-space|list-style|object-fit|aspect-ratio|cursor|transition|transform|animation|z-index|visibility|filter|backdrop-filter)\s*:\s*[^;{}"'`]+;/i,
    // A custom property. Not in the list above because the list is names, and
    // this one is whatever the student called it — but `:` then a value then
    // `;` is the same shape, and a block of nothing but these is a real
    // stylesheet the property list would have waved through.
    /--[\w-]+\s*:\s*[^;{}"'`]+;/,
    // A rule opening a block: `.card {`, `#hero {`, `:root {`. The excluded `(`
    // is what keeps `.map(x => {` and every other chained callback out.
    /(^|[\n};])\s*([.#][\w-]|:root\b)[^{}\n(]*\{/,
    /@(media|import|font-face|keyframes|supports)\b/i,
  ],
  // A vanilla-to-Vite refactor: converting the codebase to native ES modules.
  // Note what is NOT here: the module's contents. `import`/`export` are the
  // topic itself, once a project moves off plain `<script>` tags; everything
  // written inside the module is the student's anyway, and this detector
  // does not need to see it twice.
  esModules: [
    // A statement, not the word: `\s+` after `import`/`export` is what keeps
    // `let exportButton = ...` and prose ("// export this later") out, since
    // neither has whitespace directly after the bare word.
    /^\s*import\s+[\s\S]{0,200}?\bfrom\s+['"]/m,
    /^\s*export\s+(default|const|function|class|let|var)\b/m,
  ],
  // Vite's own config file: the plugin wiring and the multi-page build entries.
  // Note what is NOT here: the word "config" alone, or a variable named
  // `input` — both are common outside this file, and only the three Vite-
  // specific terms below are unique to it.
  viteConfig: [
    /\bdefineConfig\s*\(/,
    /\brollupOptions\b/,
    /@tailwindcss\/vite\b/,
  ],
  // Utility-class styling, for a module taught as Tailwind rather than as CSS.
  // Both patterns require a literal `class=` / `className=` attribute, which is
  // what keeps them off everything else in a script file: `classList.add("hidden")`
  // has no `=` after `class`, and `const classes = "flex"` has no `=` after
  // `class` either.
  //
  // Precision matters less here than it looks. Inside markup, `semanticHtml` has
  // already caught the tag the attribute sits in, so a collision with a
  // hand-written class name — `class="container"`, `class="hidden"` — costs
  // nothing that was not already gated. These patterns are only load-bearing in
  // the extensions `semanticHtml` does not reach, and there they cannot fire
  // without an attribute assignment.
  //
  // Note what is NOT here: the class attribute on its own. A student naming a
  // section `class="hero"` is writing markup, not utilities, and an agent
  // reading the file back to them must be able to quote it.
  tailwindStyling: [
    // A variant prefix or core utility inside a class / className attribute
    // (straight quotes, JSX template literals, or JSX braced expressions).
    // Attributes may span lines. The template-literal scan steps over `${...}`
    // so an identifier like `hidden` in `${hidden ? ...}` is not read as a
    // utility; the string literals inside it are covered by the braced patterns.
    new RegExp(String.raw`\bclass(?:Name)?\s*=\s*(?:"[^"]{0,400}?|'[^']{0,400}?|\{\s*\`${TW_TEMPLATE})\b${TW_VARIANTS}:[-a-z0-9[\]/.]`, "i"),
    new RegExp(String.raw`\bclass(?:Name)?\s*=\s*(?:"[^"]{0,400}?|'[^']{0,400}?|\{\s*\`${TW_TEMPLATE})\b${TW_UTILITIES}\b`, "i"),
    new RegExp(String.raw`\bclass(?:Name)?\s*=\s*\{[^}]{0,400}?(?:"[^"]{0,400}?|'[^']{0,400}?)\b${TW_VARIANTS}:[-a-z0-9[\]/.]`, "i"),
    new RegExp(String.raw`\bclass(?:Name)?\s*=\s*\{[^}]{0,400}?(?:"[^"]{0,400}?|'[^']{0,400}?)\b${TW_UTILITIES}\b`, "i"),
  ],
};

function categoriesIn(text, gated) {
  const hits = [];
  for (const name of gated) {
    const patterns = DETECTORS[name];
    // A gated category with no detector is a config/script mismatch. Treat it as
    // a hit: better to over-block and be told than to silently gate nothing.
    if (!patterns) {
      hits.push(name);
      continue;
    }
    if (patterns.some((re) => re.test(text))) hits.push(name);
  }
  return hits;
}

// --- Payload ---------------------------------------------------------------

/** Every field a file-writing tool can carry new text in. */
function payloadOf(toolInput) {
  return [toolInput?.content, toolInput?.new_string, toolInput?.new_source]
    .filter((v) => typeof v === "string")
    .join("\n");
}

function changedNewLineIndices(oldStr, newStr) {
  const oldLines = oldStr.split(/\r?\n/);
  const newLines = newStr.split(/\r?\n/);

  let start = 0;
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) {
    start++;
  }
  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  while (oldEnd >= start && newEnd >= start && oldLines[oldEnd] === newLines[newEnd]) {
    oldEnd--;
    newEnd--;
  }

  if (newEnd < start) return [];

  const m = oldEnd - start + 1;
  const n = newEnd - start + 1;
  if (m <= 0 || m * n > 200_000) {
    return Array.from({ length: n }, (_, k) => start + k);
  }

  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] =
        oldLines[start + i] === newLines[start + j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const changed = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[start + i] === newLines[start + j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      changed.push(start + j);
      j++;
    }
  }
  while (j < n) {
    changed.push(start + j);
    j++;
  }
  return changed;
}

function lineStartOffsets(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function fullLineAt(text, offset) {
  const start = offset <= 0 ? 0 : text.lastIndexOf("\n", offset - 1) + 1;
  const endIdx = text.indexOf("\n", offset);
  const end = endIdx === -1 ? text.length : endIdx;
  return text.slice(start, end).replace(/\r$/, "");
}

/** The whole lines covering text[start..end], including the line `end` lands on. */
function linesAround(text, start, end) {
  const s = start <= 0 ? 0 : text.lastIndexOf("\n", start - 1) + 1;
  const e = text.indexOf("\n", end);
  return text.slice(s, e === -1 ? text.length : e);
}

function detectHits(toolInput, filePath, gated) {
  if (typeof toolInput?.old_string !== "string" || typeof toolInput?.new_string !== "string") {
    return categoriesIn(payloadOf(toolInput), gated);
  }

  const oldString = toolInput.old_string;
  const newString = toolInput.new_string;
  // May be empty for a pure deletion; that still needs the region and
  // whole-file checks below, since deleting text can join or unwrap a call.
  const changed = changedNewLineIndices(oldString, newString);

  const newLines = newString.split(/\r?\n/);
  const absPath = resolve(root, filePath);

  if (oldString && existsSync(absPath)) {
    try {
      const beforeText = readFileSync(absPath, "utf8");
      const positions = [];
      let searchFrom = 0;
      while (true) {
        const idx = beforeText.indexOf(oldString, searchFrom);
        if (idx === -1) break;
        positions.push(idx);
        if (toolInput.replace_all !== true) break;
        searchFrom = idx + oldString.length;
      }

      if (positions.length > 0) {
        let afterText = "";
        let cursor = 0;
        const afterOffsets = [];
        for (const pos of positions) {
          afterText += beforeText.slice(cursor, pos);
          afterOffsets.push(afterText.length);
          afterText += newString;
          cursor = pos + oldString.length;
        }
        afterText += beforeText.slice(cursor);

        const newStarts = lineStartOffsets(newString);
        const hunkLines = [];
        for (const offset of afterOffsets) {
          for (const lineIdx of changed) {
            hunkLines.push(fullLineAt(afterText, offset + newStarts[lineIdx]));
          }
        }

        // The whole lines the edit touched, before and after. A category that
        // appears there only afterwards was made by the edit, even when no new
        // line was added (`fet\nch(` joined into `fetch(` by deleting a newline).
        const regionNew = positions.flatMap((pos, i) => {
          const before = new Set(categoriesIn(linesAround(beforeText, pos, pos + oldString.length), gated));
          const after = linesAround(afterText, afterOffsets[i], afterOffsets[i] + newString.length);
          return categoriesIn(after, gated).filter((c) => !before.has(c));
        });

        const hunkHits = categoriesIn(hunkLines.join("\n"), gated);
        const beforeHits = new Set(categoriesIn(beforeText, gated));
        const newlyIntroduced = categoriesIn(afterText, gated).filter((c) => !beforeHits.has(c));
        return [...new Set([...hunkLines.length ? hunkHits : [], ...regionNew, ...newlyIntroduced])];
      }
    } catch {
      /* fall through to diff-only check */
    }
  }

  return categoriesIn(changed.map((idx) => newLines[idx]).join("\n"), gated);
}

function deny(reason, studentMessage) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
      systemMessage: studentMessage,
    }),
  );
  process.exit(0);
}

// The other way out: no opinion, the write proceeds. If the work is sitting
// somewhere it cannot be reviewed, say so on the way past — this never denies,
// because a branch problem is not a reason to refuse text a student is in the
// middle of writing. Silent on a clean branch: an allowed write must put
// NOTHING on stdout (see the exit-code contract at the top of this file), not
// an empty JSON envelope, which Claude Code would treat as a decision rather
// than as no opinion.
function allow(config) {
  // The outer catch fails closed on purpose (a fault denies). This call is
  // deliberately exempt from that: branchState() is built never to throw, but
  // this hook must not take that on faith. A nicety — a branch warning — must
  // never be the reason a student can't get text into a file, so any fault
  // here is swallowed and the write proceeds exactly as if there were nothing
  // to say.
  try {
    const bs = branchState(config);
    if (bs.problems.length) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: { hookEventName: "PreToolUse" },
          systemMessage: bs.problems.map((p) => p.text).join(" "),
        }),
      );
    }
  } catch {
    /* see comment above: a branch warning must never turn into a denial */
  }
  process.exit(0);
}

// --- Main ------------------------------------------------------------------

const chunks = [];
for await (const c of process.stdin) chunks.push(c);

let event;
try {
  event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  // The envelope is built by Claude Code, not by the agent, so a malformed one
  // means the tool payload format changed — not that someone is routing around
  // us. Denying here would brick every write for every student in the cohort at
  // once, which is a far worse failure than one missed check. Stay out of the way.
  process.exit(0);
}

try {
  const filePath = event?.tool_input?.file_path ?? event?.tool_input?.notebook_path;
  if (!filePath) process.exit(0);

  const config = loadConfig();
  const rel = relPath(filePath);

  // 1. Locked paths. The agent cannot edit its own gate, it cannot grant itself
  //    an unlock, and it cannot edit the brief it is being held to.
  //    Content-independent, checked first.
  const locked = lockedAs(config, rel);

  // PLAN.md is in neverWritable, so it would deny as "machinery" — but that message
  // is about the guard and its ledger, and this file is the students'. It gets its
  // own reason, and it comes first: the agent must not be able to open its own gate,
  // and it must be able to say why it won't try.
  if (
    locked &&
    normalizeRel(rel) === normalizeRel(planFile(config))
  ) {
    deny(
      `\`${rel}\` belongs to the group and is read-only to you. ` +
        `Help the group spot unclaimed work or overlaps while they edit it themselves.`,
      `Harness: blocked an agent write to ${rel} — the group writes their own plan.`,
    );
  }

  if (locked === "machinery") {
    deny(
      `\`${rel}\` is part of the harness setup and is read-only to you. ` +
        `To record a signed-off task, run \`node .claude/hooks/signoff.mjs\`.`,
      `Harness: blocked an agent write to ${rel}.`,
    );
  }

  if (locked === "canonical") {
    deny(
      `\`${rel}\` is the assignment brief and is read-only to you. ` +
        `If a requirement seems unclear or wrong, help the student bring it to their instructor instead of editing this file.`,
      `Harness: blocked an agent write to ${rel} — the brief is read-only.`,
    );
  }

  // 2. Is this even a file the detectors apply to?
  const exts = config.guardedExtensions ?? [".js"];
  if (!exts.some((e) => rel.toLowerCase().endsWith(e))) allow(config);

  // 3. Is the group onboarded? This gates EVERY guarded extension, not just the
  //    gated categories: code generation starts once the split exists, not before.
  //    Live — the file is re-read here on every write, so a fixed line is a fixed
  //    gate with nothing to re-run.
  const notOnboarded = onboardingBlock(config);
  if (notOnboarded) {
    deny(
      `${notOnboarded}\n\nUntil the plan check passes, code files such as ${rel} stay blocked. ` +
        `Share the message above with the student and help them update \`${planFile(config)}\` themselves.`,
      `Harness: blocked an agent write to ${rel} — the group's plan is not settled.`,
    );
  }

  // 4. Does the payload contain gated content?
  const hits = detectHits(event.tool_input, filePath, config.gated ?? []);
  if (hits.length === 0) allow(config);

  // 5. Has this student demonstrated it?
  const open = demonstrated(config, readProgress(config));
  const blocked = hits.filter((c) => !open.has(c));
  if (blocked.length === 0) allow(config);

  deny(
    denyReason({ config, rel, blocked, open }),
    `Harness: blocked an agent write to ${rel} — ${formatCategories(blocked)}. ` +
      `That part is yours to type.`,
  );
} catch (err) {
  // Fail closed. Config missing, progress file corrupt, git unavailable: we do
  // not know whether this write is allowed, so it is not allowed. The reason is
  // written for a human because a student will read it through the agent.
  deny(
    `The harness guard encountered an error checking this write and denied it to stay safe. ` +
      `Show this message to the student and suggest mentioning it to their instructor: ${err?.message ?? err}`,
    `Harness: guard error, write denied (failing closed). ${err?.message ?? err}`,
  );
}
