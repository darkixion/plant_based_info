# TypeScript conversion, and minifying the built page

Design, 2026-08-06. Implements the first open item in `HANDOVER.md`.

## What this changes

`src/app.js` becomes `src/app.ts`, type-checked under full `strict` by
TypeScript 7 and compiled to a minified `dist/app.js` by esbuild. `build.mjs`
inlines that file into `index.html` exactly as it inlines `src/app.js` today,
and keeps importing nothing but `node:*`.

The shipped artifact does not change shape. `index.html` remains one file with
the stylesheet, the data, the icons and the script all embedded, loading nothing
over the network and needing no build step at view time.

## Why, and what the payoff really is

Two goals, of unequal size.

**Types, for the bugs they turn up.** This is the larger prize. The dataset has
a shape worth stating, and two lookups in the current code are unsafe in a way
that matters to a project whose first rule is no invented data. See "What the
types actually catch" below.

**Minification, for size.** Worth being honest about the scale. `index.html` is
244 kB raw but 77 kB gzipped, which is what GitHub Pages serves, and 126 kB of
the raw figure is `nutrients.json`, which minifying JavaScript does not touch.
Gzip already collapses most of what a minifier removes. The estimate was 10 to
15 kB gzipped, and the measured figure is **11.7 kB**: the script goes from
109.9 kB to 72.8 kB raw, and from 36.7 kB to 25.0 kB gzipped. That is a real
improvement and not a large one, and it was decided on with the number in view.

## Pipeline

| script | does | dependencies |
| --- | --- | --- |
| `npm run check` | `tsc --noEmit` | typescript |
| `npm run compile` | esbuild `src/app.ts` to `dist/app.js`, minified | esbuild |
| `npm run build` | `node build.mjs` | none |
| `npm test` | `check`, `compile`, `build`, then `smoke.mjs` | all |

The compile command is fixed:

```
esbuild src/app.ts --outfile=dist/app.js --minify --target=es2022 \
  --charset=utf8 --legal-comments=none
```

`--charset=utf8` keeps `µg` a character rather than an escape. `--legal-comments=none`
and the pinned version below make the output deterministic, which the CI
byte-comparison depends on.

**There is deliberately no second compile mode.** No `--dev`, no unminified
variant. `dist/app.js` is committed and CI byte-compares it against a fresh
compile, so a second mode is a route to committing the wrong artifact. Debugging
against unminified output is a command typed by hand, recorded in `README.md`,
not a script that can be shipped by accident.

No source maps. An external `.map` breaks the single-file rule and an inline one
costs more than the minification saves.

### Versions

- `typescript`, caret range, currently 7.0.2. TypeScript 7 is the native
  compiler and ships as platform binaries, so `npm ci` on the CI runner pulls
  `@typescript/typescript-linux-x64`. A caret is safe because tsc emits nothing
  here; its version cannot move the committed artifact.
- `esbuild`, **pinned exactly** to `0.28.1`, no caret. esbuild owns the emit, and
  CI byte-compares `dist/app.js`. A patch bump that changed the output by one
  character would fail CI on an unrelated pull request.

### Why `dist/app.js` is committed

So that `node build.mjs` on a fresh checkout still regenerates the page with
nothing but Node installed. That is the property the "build.mjs has no
dependencies" rule exists to protect; gitignoring the compiled file would make
`tsc` a build dependency in practice while leaving the letter of the rule
intact.

This makes two generated-but-committed artifacts in the repo. Both are guarded
the same way, by a CI step that recompiles and fails on a dirty tree.

### Repo layout after the change

- `src/` holds files a human edits: `app.ts`, `index.html`, `styles.css`, `data/`.
- `dist/` holds generated output that must never be edited: `app.js`.
- `index.html` at the root stays generated, committed, and served.

### CI

Two steps join the existing ones:

- `npm run check`, so a type error fails the build rather than waiting to be
  noticed.
- a `git diff --quiet -- dist/app.js` guard mirroring the one already guarding
  `index.html`, with a message naming `npm run compile`.

## `app.ts` stays a single file with no imports

This is load-bearing rather than lazy. Any `import` or `export` makes the file
an ES module; esbuild then emits ESM, and the page's single classic `<script>`
would have to become `type="module"`. Types are declared inline at the top of
the file, and the two globals `build.mjs` injects ahead of the app code get
ambient declarations.

Splitting the 2,093 lines into modules is a reasonable future change. It would
require `esbuild --bundle --format=iife`, which is a different decision and not
this one.

## Configuration

`tsconfig.json`, checking only. esbuild owns the emit.

```jsonc
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022", "dom", "dom.iterable"],
    "types": [],
    "noEmit": true,
    "strict": true,
    "erasableSyntaxOnly": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  },
  "include": ["src/app.ts"]
}
```

Three of those are doing more than decoration.

- **`erasableSyntaxOnly`** guarantees `app.ts` uses only syntax esbuild can
  strip. It turns "tsc checks, esbuild emits" from a convention someone breaks
  with an `enum` in six months into something the compiler enforces.
- **`types: []`** stops Node's ambient globals reaching a file that runs in a
  browser. They would otherwise arrive through playwright.
- **`noUncheckedIndexedAccess`** is the flag most likely to produce a large
  error count, and it carries most of the value. See below.

Full `strict` is on from the first commit rather than ratcheted flag by flag.
That was chosen knowing the alternative: nothing type-checks until everything
does, so there is no green checkpoint until the end.

## The data model

Transcribed from `src/data/nutrients.json` as it actually is. Every nutrient
carries all seven keys and every food all five; `alt` is the only genuinely
optional key, on 41 of 131 foods.

**A key being present is not the same as its value being usable, and this
design originally got that wrong.** `dv` is present on all 66 nutrients but its
value is `null` on 35 of them: sugars, water, most fatty acids, all amino acids,
and most carotenoids and flavonoids simply have no published daily value. The
first draft typed it `number`, because the check behind that claim counted keys
and never looked at values. It is `number | null`, and it is the only field in
the dataset where the two differ.

```ts
type NutrientGroup = "macro" | "fats" | "amino" | "vitamin" | "mineral" | "plant";
type Unit = "kcal" | "g" | "mg" | "µg";

interface Nutrient { id: string; label: string; group: NutrientGroup;
                     unit: Unit; dv: number | null; dp: number; why: string; }
interface Food { name: string; state: string; cat: string; colour: string;
                 alt?: string; v: readonly (number | null)[]; }
interface Note { id: string; marker: string; short: string; text: string;
                 cells: Record<string, string[]>; }
interface Dataset { nutrients: Nutrient[]; foods: Food[]; notes?: Note[]; }

declare const DATA: Dataset;
declare const I: Record<string, string>;
```

`notes` stays optional because `build.mjs` and `app.js` both read it as
`data.notes || []`. The type should describe what the code believes, not what
today's data file happens to contain.

The `µg` literal is copied from the data rather than retyped. The micro sign and
the Greek letter mu are different characters, and a mismatch would produce a
baffling error.

The state object `S` gets an interface too, pinning fields that currently hold
bare strings. The literals are taken from `loadPrefs()`, which is where the
accepted set is already written down as validation:

```ts
type Basis = "g" | "kcal";
type WeightUnit = "kg" | "stlb";
type View = "table" | "chart" | "day";
interface Sort { id: string; dir: 1 | -1; }
interface DayEntry { slug: string; g: number; }
interface Lens { id: string; name: string; ids: string[]; why?: string; }
```

`WeightUnit` is `"kg" | "stlb"` and not `"kg" | "st"`. `loadPrefs()` is the
authority on these, and reading it is how the second spelling was caught.

`Lens.why` is optional because `loadPrefs()` builds custom lenses with a
conditional spread that omits the key entirely when there is no text, which is
the shape `exactOptionalPropertyTypes` is strict about. The remaining string
`View` has three members, not two. "My day" is a view alongside the table and
the chart: `S.view` is assigned `"day"` directly at `app.ts:1536` and compared
against it in five places. An earlier draft of this design listed only `"table"`
and `"chart"`, and the compiler caught it as five no-overlap comparisons.

The remaining string
fields on `S`, `tab` and `chartNut`, are pinned to literal unions
during implementation from the code that reads them.

## What the types actually catch

Not the positional `v` array. TypeScript cannot check an array's positions
against a list that exists only at runtime, and `build.mjs` will keep doing that
job. The value is elsewhere.

```js
const val = (f, id) => f.v[IDX.get(id)];
```

`IDX` is a `Map<string, number>`, so `IDX.get(id)` is `number | undefined`, and
indexing an array with that is an error the moment `strict` is on. Today a
mistyped nutrient id returns `undefined` and renders as a blank cell,
indistinguishable from "not measured". In a table whose first rule is that no
figure is ever invented, a silent blank is the worst available failure.

`val()` then returns `number | null | undefined`, so every consumer must state
what it does about missing data. That invariant already runs through the
codebase, upheld by discipline and comments: protein quality withheld rather
than scoring absent amino acids as zero, partial day totals reporting the count
they cover, an incomplete flavonoid sum withheld rather than shown looking
complete. Strict null checking makes it something the compiler will not let a
future change forget.

## The test globals: a guard test, not a debug surface

**Revised after measurement.** This section originally specified an
`Object.assign(window, ...)` block pinning the names against mangling. Running
the real compile showed that block is unnecessary, so it is not being built.

esbuild **does not mangle top-level names in a non-module script**. It cannot:
in a classic script those names are globals, and esbuild has no way to prove
nothing outside the script references them. Compiling the unmodified `app.js`
with the exact command above and grepping the output confirmed all seventeen
app-owned names the suite reaches for survive intact. The page therefore keeps
exactly today's semantics, and no runtime code needs adding to preserve them.

The eighteenth name, `DATA`, was never at risk: `build.mjs` declares it ahead of
the app code, outside anything esbuild touches.

What remains is a real fragility, and it is the one worth protecting. All of
this holds only while `app.ts` has no `import` or `export`. Add one, and esbuild
emits a module, every top-level name leaves the global scope, and all 100 tests
fail at once with errors that point nowhere near the cause.

So the protection is **a guard test rather than shipped code**: one test that
probes each name with `typeof` and fails with a message naming the likely cause.
It defends the same invariant, catches the failure mode that can actually
happen, and adds nothing to the page a user downloads. Pinning names into
`window` would have been insurance against a risk that does not exist, at the
cost of a permanent public surface on the page.

The list in that test is now the written record of what the suite depends on.
`HANDOVER.md` recorded four such names; there are seventeen plus `DATA`, which
is the sort of drift that happens to knowledge kept only in prose.

## Testing

The bar is the existing suite, unchanged, passing against the minified page:
100 tests, plus the new guard test, plus `tsc --noEmit` clean.

No new test infrastructure is needed. The suite already drives the real built
artifact in a real browser, which is exactly the coverage a minification change
calls for. Nothing in it reads `index.html` as text: the three `createReadStream`
uses are CSV downloads, and the stylesheet test walks `document.styleSheets` at
runtime, which minifying JavaScript does not affect.

## Scope

Out, deliberately:

- **`styles.css` is not minified.** An independent change that deserves its own
  decision.
- **`build.mjs`, `tools/*.mjs` and `test/smoke.mjs` stay unchecked JavaScript.**
  Typing them is a defensible next step. Pulling them in now would put
  `@types/node` back into a config that just excluded it.
- **No module split of `app.ts`.** Reasonable later, and a different decision.

## Documentation

`README.md` and `HANDOVER.md` both describe a build that no longer exists, and
updating them is part of this change rather than a follow-up. Specifically:
the `src/` and `dist/` split and the rule that `dist/app.js` is never edited;
the four commands; the unminified debugging command; and the correction from
four test globals to eighteen.

## Risks

- **Full `strict` on 2,093 lines with 127 top-level declarations produces a
  large error count before anything runs.** Accepted deliberately. The two
  pervasive sources are `document.querySelector` returning `Element | null`
  through the `$` helper, which is used in nearly every function, and
  `noUncheckedIndexedAccess` on array reads.
- **Correctness changes hiding among type fixes.** Silencing a strict-null error
  with a non-null assertion where the null case was real would change behaviour
  while looking like a type fix. Assertions need a reason, and where the null
  case turns out to be reachable it is a bug to fix rather than an error to
  quiet.
- **Rollback is cheap.** Nothing about the shipped page's shape changes, so
  reverting the commits restores the previous build exactly.
