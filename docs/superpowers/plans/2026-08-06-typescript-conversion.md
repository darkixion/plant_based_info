# TypeScript Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `src/app.js` to `src/app.ts`, type-checked under full `strict` by TypeScript 7, compiled to a minified `dist/app.js` by esbuild and inlined into the same single self-contained `index.html`.

**Architecture:** `src/app.ts` is the file a human edits. It stays a single file with no imports, so esbuild emits a classic script rather than an ES module. `tsc --noEmit` checks it, esbuild emits it, and `build.mjs` inlines the result exactly as it inlines `src/app.js` today, keeping its zero dependencies. Both generated artifacts, `dist/app.js` and `index.html`, are committed and guarded by CI recompiling and failing on a dirty tree.

**Tech Stack:** TypeScript 7.0.2 (native compiler), esbuild 0.28.1 (pinned exactly), Node 20+, Playwright for the existing browser suite.

Design: `docs/superpowers/specs/2026-08-06-typescript-conversion-design.md`.

## Global Constraints

- **`index.html` stays one self-contained file.** CSS, data, icons and script all inlined. No external requests, no build step at view time.
- **`build.mjs` imports nothing but `node:*`.** It must never learn that TypeScript exists.
- **`src/app.ts` has no `import` or `export`.** Any module syntax makes esbuild emit ESM, which would require `<script type="module">` and would scope every top-level name to the module, taking the whole test suite dark at once. This is the single most important invariant in this plan.
- **`esbuild` is pinned exactly to `0.28.1`, no caret.** CI byte-compares `dist/app.js`.
- **`dist/app.js` is generated and committed. Never edit it by hand.**
- **No em dashes** anywhere in copy, comments or docs. Rewrite the sentence rather than swapping the punctuation.
- **No invented data.** Where USDA has no figure the table shows `n/a`. A type fix must never turn a withheld value into a zero or a placeholder.
- **The compile command is fixed and has exactly one mode:**
  `esbuild src/app.ts --outfile=dist/app.js --minify --target=es2022 --charset=utf8 --legal-comments=none`

## Measured baseline

Run before writing this plan, against a scratch copy of `app.js` renamed to `.ts` under the final `tsconfig.json`:

| stage | `tsc --noEmit` errors |
| --- | --- |
| unmodified `app.js` as TypeScript | 304 |
| after Task 2 (data model and ambient declarations) | 230 |

Minified output measured at **72.8 kB raw from 109.9 kB**, and **25.0 kB gzipped from 36.7 kB**, so the saving is **11.7 kB gzipped**. That confirms the design's estimate of 10 to 15 kB.

**esbuild does not mangle top-level names in a non-module script.** This was verified: all seventeen app-owned globals the suite reaches for survive minification intact, because esbuild cannot prove a global is unreferenced from outside the script. This is why the design's `Object.assign(window, ...)` debug surface is **not** in this plan; Task 1 replaces it with a guard test, which protects the same thing without shipping code. See Task 1 Step 6.

---

### Task 1: Toolchain, pipeline, and a minified page that passes

Establishes the whole build and proves minification does not break the page, with **no typing work at all**. esbuild does not type-check, so `app.js` renamed to `app.ts` compiles as-is. `tsc` is installed and configured here but is deliberately **not** wired into `npm test` until Task 6, so that "does minification break the page" and "does it type-check" are two independently testable risks rather than one.

**Files:**
- Modify: `package.json` (devDependencies, scripts)
- Create: `tsconfig.json`
- Rename: `src/app.js` to `src/app.ts` (via `git mv`, preserving history)
- Create: `dist/app.js` (generated, committed)
- Modify: `build.mjs:21` (the `app:` line of `SOURCES`)
- Modify: `.github/workflows/ci.yml`
- Modify: `test/smoke.mjs` (one new guard test)

**Interfaces:**
- Consumes: nothing.
- Produces: the four npm scripts `check`, `compile`, `build`, `test`; the committed artifact `dist/app.js`; a `tsconfig.json` that later tasks reduce the error count against.

- [ ] **Step 1: Install the two dev dependencies at the exact versions**

```bash
npm i -D --save-exact esbuild@0.28.1
npm i -D typescript@^7.0.2
```

Verify `package.json` shows `"esbuild": "0.28.1"` with **no caret** and `"typescript": "^7.0.2"` with one. The asymmetry is deliberate: esbuild owns the emit and CI byte-compares its output, so its version cannot be allowed to drift; tsc emits nothing here and cannot move the artifact.

- [ ] **Step 2: Create `tsconfig.json`**

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

`types: []` keeps Node's ambient globals out of a file that runs in a browser; they would otherwise arrive through Playwright. `erasableSyntaxOnly` makes "tsc checks, esbuild emits" enforceable rather than a convention, by rejecting any syntax esbuild cannot simply strip.

- [ ] **Step 3: Rename the file and add the npm scripts**

```bash
git mv src/app.js src/app.ts
```

Then in `package.json`, replace the `build` and `test` scripts and add two:

```json
"check": "tsc --noEmit",
"compile": "esbuild src/app.ts --outfile=dist/app.js --minify --target=es2022 --charset=utf8 --legal-comments=none",
"build": "node build.mjs",
"test": "npm run compile && npm run build && node test/smoke.mjs",
"watch": "node build.mjs --watch"
```

`check` is intentionally absent from `test` in this task. Task 6 adds it, once it passes.

- [ ] **Step 4: Point `build.mjs` at the compiled file**

In `build.mjs`, the `SOURCES` object at line 18 currently reads `app: join(SRC, "app.js"),`. Change that one line:

```js
const SOURCES = {
  html: join(SRC, "index.html"),
  css: join(SRC, "styles.css"),
  app: join(ROOT, "dist", "app.js"),
  data: join(SRC, "data", "nutrients.json"),
  icons: join(SRC, "data", "icons.json"),
};
```

Nothing else in `build.mjs` changes. Leave the `"use strict";\n` prepend at line 154 alone: esbuild emits its own `"use strict";` too, and a duplicated directive prologue is legal and harmless. Keeping it means `build.mjs` guarantees what it injects without depending on esbuild's output details.

- [ ] **Step 5: Compile and build, and confirm the page still works**

```bash
npm run compile && npm run build
```

Expected: esbuild reports roughly `72.8kb`, and `build.mjs` prints a line like `built index.html  ... (66 nutrients x 131 foods)` at a smaller size than the previous 244 kB.

- [ ] **Step 6: Add the guard test that protects the no-imports invariant**

The globals survive minification only because `app.ts` is a classic script. If anyone adds an `import`, esbuild switches to module semantics, every top-level name becomes module-scoped, and all 100 tests fail at once with confusing errors. This test fails first and says why.

Add to `test/smoke.mjs`, in the "basics" section near the top, using the file's
existing `test` / `withPage` / `assert` helpers:

```js
await test("the app's own globals survive minification", async () => {
  await withPage(async page => {
    // Written as `typeof`, which yields "undefined" for a name that was never
    // declared instead of throwing, so this reports every missing name at once
    // rather than dying on the first.
    const missing = await page.evaluate(() => {
      const probes = {
        S: typeof S, FOODS: typeof FOODS, GROUPS: typeof GROUPS,
        SLUGS: typeof SLUGS, BY_SLUG: typeof BY_SLUG,
        dayTotals: typeof dayTotals, proteinQuality: typeof proteinQuality,
        omegaRatio: typeof omegaRatio, shown: typeof shown,
        savePrefs: typeof savePrefs, render: typeof render,
        addToDay: typeof addToDay, setDayGrams: typeof setDayGrams,
        dayAminoAcids: typeof dayAminoAcids,
        dayProteinQuality: typeof dayProteinQuality,
        dayStanding: typeof dayStanding, toggleGroup: typeof toggleGroup,
      };
      return Object.entries(probes)
        .filter(([, t]) => t === "undefined").map(([name]) => name);
    });
    assert(missing.length === 0,
      `these globals vanished, which almost always means src/app.ts gained an ` +
      `import and esbuild switched to module output: ${missing.join(", ")}`);
  });
});
```

The harness is `await test(name, async () => { await withPage(async page => {...}) })`,
with `assert(cond, msg)` and `eq(a, b, msg)` as the two assertion helpers. There
is no `assert.deepEqual`.

- [ ] **Step 7: Run the full suite against the minified page**

```bash
npm test
```

Expected: **101 passed, 0 failed** (the existing 100 plus the new guard). If any fail, the cause is minification, not typing, because no types exist yet. That separation is the point of this task.

- [ ] **Step 8: Update CI**

In `.github/workflows/ci.yml`, add a compile step before `npm test` is run, and a second up-to-date check after it, mirroring the existing `index.html` one:

```yaml
      - name: dist/app.js is up to date with src/app.ts
        run: |
          npm run compile
          if ! git diff --quiet -- dist/app.js; then
            echo "::error::dist/app.js does not match src/app.ts. Run 'npm run compile' and commit the result."
            git diff --stat -- dist/app.js
            exit 1
          fi
```

Place it immediately before the existing `index.html is up to date with src/` step, because a stale `dist/app.js` would otherwise be reported as a stale `index.html`, which sends the reader to the wrong command.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json build.mjs \
        src/app.ts dist/app.js index.html test/smoke.mjs .github/workflows/ci.yml
git commit -m "Compile the app through esbuild and ship it minified

src/app.js becomes src/app.ts and is compiled to a committed dist/app.js,
which build.mjs inlines in its place. build.mjs keeps its zero dependencies
and the page stays one self-contained file, 11.7 kB smaller gzipped.

No types yet. esbuild does not type-check, so this proves minification alone
leaves the page working before any conversion work begins.

A guard test asserts the app's globals are reachable. They survive
minification only because app.ts is a classic script with no imports, and the
test names that cause when a stray import takes the suite dark."
```

---

### Task 2: The data model

Declares the two globals `build.mjs` injects and types the dataset. Measured effect: **304 errors down to 230**, and it removes all 28 "cannot find name" errors by itself. Strict-null errors will *rise* here (from 6 to 38), which is correct: the nullness was always there and is now visible.

**Files:**
- Modify: `src/app.ts` (add a types block at the very top)

**Interfaces:**
- Consumes: `tsconfig.json` from Task 1.
- Produces: `NutrientGroup`, `Unit`, `Nutrient`, `Food`, `Note`, `Dataset`, and the ambient `DATA` and `I`. Every later task uses these names.

- [ ] **Step 1: Record the starting error count**

```bash
npm run check 2>&1 | grep -cE "error TS"
```

Expected: `304`.

- [ ] **Step 2: Add the types block at the top of `src/app.ts`**

Insert above the existing first line (`const NUTS = DATA.nutrients, FOODS = DATA.foods;`):

```ts
/* ---------- the data ----------
   Shapes transcribed from src/data/nutrients.json as it actually is. Every
   nutrient carries all seven keys and every food all five; `alt` is the only
   genuinely optional key, on 41 of 131 foods.
   A present key is not a usable value: `dv` is there on all 66 nutrients and
   null on 35 of them, which is why it is typed nullable below.
   `notes` is optional because build.mjs and this file both read it as
   `data.notes || []`. The type describes what the code believes, not what
   today's data file happens to contain. */
type NutrientGroup = "macro" | "fats" | "amino" | "vitamin" | "mineral" | "plant";
type Unit = "kcal" | "g" | "mg" | "µg";

interface Nutrient {
  id: string; label: string; group: NutrientGroup;
  unit: Unit; dp: number; why: string;
  /* Present on all 66 nutrients, but null on 35 of them: sugars, water, most
     fatty acids, all amino acids and most carotenoids and flavonoids have no
     published daily value. Every read has to decide what to do about that. */
  dv: number | null;
}
interface Food {
  name: string; state: string; cat: string; colour: string;
  alt?: string; v: readonly (number | null)[];
}
interface Note {
  id: string; marker: string; short: string; text: string;
  cells: Record<string, string[]>;
}
interface Dataset { nutrients: Nutrient[]; foods: Food[]; notes?: Note[]; }

/* Both are declared by build.mjs ahead of this file, inside the same script.
   They are not owned by this file and must not be redeclared here. */
declare const DATA: Dataset;
declare const I: Record<string, string>;
```

**Copy the `µg` character from `src/data/nutrients.json`, do not retype it.** The micro sign U+00B5 and the Greek letter mu U+03BC look identical and a mismatch produces a baffling error.

- [ ] **Step 3: Confirm the error count fell**

```bash
npm run check 2>&1 | grep -cE "error TS"
```

Expected: `230`. Also confirm zero remain of the "cannot find name" class:

```bash
npm run check 2>&1 | grep -c "TS2304"
```

Expected: `0`.

- [ ] **Step 4: Confirm the page still works**

```bash
npm test
```

Expected: **101 passed**. Types are erased at compile time, so this task cannot change behaviour; running the suite confirms that rather than assuming it.

- [ ] **Step 5: Commit**

```bash
git add src/app.ts dist/app.js index.html
git commit -m "Type the dataset, and declare the two globals build.mjs injects

304 type errors down to 230. Strict-null errors rise from 6 to 38 in the same
step, which is the point: the missing figures were always there and are now
visible to the compiler rather than only to the reader."
```

Note `dist/app.js` and `index.html` are staged: adding a comment block changes the compiled output, and CI byte-compares both.

---

### Task 3: The state object

`S` is initialised with `day: []` and `custom: []`, which infer as `never[]`, producing 21 errors of the form "Property 'slug' does not exist on type 'never'". One interface fixes all of them.

It does **not** fix the 8 "Parameter 'totals' implicitly has an any type" errors, despite an earlier draft of this plan claiming it would. TypeScript does not infer a function's parameter types from its call sites, so annotating what `dayTotals()` returns says nothing about the separately declared `totals` parameters of its consumers. Those need explicit annotations and belong to Task 5.

**Files:**
- Modify: `src/app.ts` (types block, and the `const S = {...}` declaration at what is currently line 88)

**Interfaces:**
- Consumes: `Nutrient`, `Note` from Task 2.
- Produces: `Basis`, `WeightUnit`, `Sort`, `DayEntry`, `Lens`, `State`, `DayTotal`. Task 5 relies on `DayTotal` in particular.

- [ ] **Step 1: Record the starting error count**

```bash
npm run check 2>&1 | grep -cE "error TS"
```

Expected: `230`.

- [ ] **Step 2: Add the state types to the types block**

The string literals come from `loadPrefs()`, which is where the accepted set is already written down as validation. Read it rather than trusting the initial value of `S`: the weight unit is `"kg" | "stlb"`, not `"kg" | "st"`.

```ts
/* ---------- state ----------
   The literal unions are taken from loadPrefs(), which is the authority on
   what a stored preference is allowed to be. */
type Basis = "g" | "kcal";
type WeightUnit = "kg" | "stlb";
/* Three, not two. "My day" is a view alongside the table and the chart:
   S.view is assigned "day" directly, and compared against it in five places. */
type View = "table" | "chart" | "day";

interface Sort { id: string; dir: 1 | -1; }
interface DayEntry { slug: string; g: number; }

/* `why` is optional because loadPrefs() builds custom lenses with a conditional
   spread that omits the key entirely when there is no text. */
interface Lens { id: string; name: string; ids: string[]; why?: string; }

interface State {
  groups: Set<NutrientGroup>;
  sort: Sort;
  q: string;
  cat: string;
  sel: number;
  favs: Set<string>;
  favsOnly: boolean;
  dv: boolean;
  basis: Basis;
  view: View;
  tab: string;
  chartNut: string;
  dark: boolean;
  lens: string;
  custom: Lens[];
  day: DayEntry[];
  kg: number;
  wUnit: WeightUnit;
}

/* One row of dayTotals(). `total` is null when nothing in the day list had a
   figure for this nutrient, and `partial` marks a sum that covers only some of
   the foods, which is why no consumer may treat it as a plain number. */
interface DayTotal {
  n: Nutrient;
  total: number | null;
  from: number;
  of: number;
  partial: boolean;
  notes: Note[];
}
```

- [ ] **Step 3: Annotate `S` and `dayTotals()`**

Change the declaration of `S` (currently line 88) to carry the type:

```ts
const S: State = {
```

and give `dayTotals()` its return type:

```ts
function dayTotals(): DayTotal[] {
```

Leave both bodies untouched, with **one unavoidable exception**. Inside
`dayTotals()`, `const notes = new Set();` infers as `Set<unknown>`, so
`[...notes]` is `unknown[]` and the `DayTotal[]` annotation cannot hold. Give it
its type argument:

```ts
const notes = new Set<Note>();
```

The set only ever receives `Note` values, from `noteFor()`. Do not instead
weaken `DayTotal.notes` to `unknown[]`: that would make the type lie and push
the problem into every consumer.

- [ ] **Step 4: Confirm the count fell and the `never` errors are gone**

```bash
npm run check 2>&1 | grep -cE "error TS"
npm run check 2>&1 | grep -c "type 'never'"
```

The second must be `0`. That is the exact requirement.

Treat the total as a soft figure. Fixing a `never` type exposes errors that were
hidden beneath it, so the net fall is much smaller than the count of errors
removed: measured at 9, against an earlier estimate of 29 that counted only
removals. Judge the task on the `never` count and on whether the types are true,
never on the total landing at a predicted number.

- [ ] **Step 5: Run the suite**

```bash
npm test
```

Expected: **101 passed**.

- [ ] **Step 6: Commit**

```bash
git add src/app.ts dist/app.js index.html
git commit -m "Type the state object and the day totals

S.day and S.custom inferred as never[] from their empty initialisers, which
accounted for 21 errors on their own. The literal unions come from
loadPrefs(), which is where the accepted values were already written down;
reading it is how the weight unit turned out to be stlb rather than st."
```

---

### Task 4: Typed DOM access

`$` currently returns `Element | null` and is called 120 times. Event handlers read `.value`, `.dataset`, `.closest` and `.matches` off `e.target`, which is `EventTarget | null`. Four small helpers make all of it type-safe without scattering non-null assertions through the file.

**Files:**
- Modify: `src/app.ts` (the helpers at what are currently lines 211 to 214, and the call sites the compiler flags)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `$`, `$opt`, `targetEl`, `targetInput`. Task 5 uses all four.

- [ ] **Step 1: Replace the `$` helper with a throwing generic, and add three companions**

```ts
/* The page's own elements are part of the build: src/index.html ships in the
   same artifact, so a selector that does not match is a build error rather
   than a runtime condition to handle. Throwing says so at the point of
   failure instead of yielding null and failing further away. */
const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
};

/* For the handful of lookups whose element genuinely may not be on the page
   yet, such as a suggestion button that only exists while the list is open. */
const $opt = <T extends HTMLElement = HTMLElement>(sel: string): T | null =>
  document.querySelector<T>(sel);

/* e.target is EventTarget|null to the type system. These narrow it once, so
   handlers stop reaching for .dataset and .closest through optional calls. */
const targetEl = (e: Event): HTMLElement | null =>
  e.target instanceof HTMLElement ? e.target : null;
const targetInput = (e: Event): HTMLInputElement | null =>
  e.target instanceof HTMLInputElement ? e.target : null;
```

- [ ] **Step 2: Switch the two genuinely optional lookups to `$opt`**

Currently lines 1561 and 1562, the only two call sites that already guard with `?.`:

```ts
if (e.key === "ArrowDown") { e.preventDefault(); return $opt("#daySug button")?.focus(); }
if (e.key === "Enter") { e.preventDefault(); $opt("#daySug button")?.click(); }
```

- [ ] **Step 3: Give the typed call sites their element type**

Where a call site reads a property specific to an element type, pass it as the type argument rather than casting the result. For example the two select elements:

```ts
const chartSel = $<HTMLSelectElement>("#chartNut");
chartSel.onchange = () => { S.chartNut = chartSel.value; savePrefs(); renderChart(rows()); };

const lensSel = $<HTMLSelectElement>("#lensSel");
lensSel.onchange = () => setLens(lensSel.value);
```

Prefer closing over the element like this to reading `e.target`, wherever the handler is bound to one known element. It is both simpler and fully typed. Use `targetEl` and `targetInput` only for delegated handlers, where the target really is one of many, such as the `[data-sort]`, `[data-dayg]` and `[role="tab"]` handlers.

- [ ] **Step 4: Work through the remaining DOM errors**

```bash
npm run check 2>&1 | grep -E "TS2339|TS18047|TS2531" | head -30
```

Fix each by choosing the right helper. Do not reach for `as` casts or `!`. If a cast seems unavoidable, that is a signal the element type argument belongs on the `$` call instead.

- [ ] **Step 5: Run the suite, and check the page actually renders**

```bash
npm test
```

Expected: **101 passed**. This task carries the most behavioural risk in the plan, because the new `$` throws where the old one returned null. A selector that never matched would previously have failed quietly at first use, and now fails at boot with a blank page. The suite catches that immediately, which is the intent.

- [ ] **Step 6: Commit**

```bash
git add src/app.ts dist/app.js index.html
git commit -m "Type DOM access through four helpers

$ throws rather than returning null, because src/index.html ships in the same
artifact as this file: a selector that does not match is a build error, not a
condition to handle. The two lookups that genuinely may miss use $opt and say
so. Delegated handlers narrow e.target once through targetEl or targetInput
instead of reaching through optional calls."
```

---

### Task 5: The remaining annotations, and the null cases that are real

What is left is roughly 117 implicit-`any` parameters on the file's own helpers, plus the strict-null errors that Tasks 2 and 3 made visible. **This is the task the whole conversion was for.** Some of these are annotations; some are bugs.

**Files:**
- Modify: `src/app.ts` (throughout)

**Interfaces:**
- Consumes: every type and helper from Tasks 2, 3 and 4.
- Produces: a file that passes `tsc --noEmit` with zero errors.

- [ ] **Step 1: Fix the two lookups the design named**

`val()` and `totalOf()` both index an array with the result of `IDX.get()`, which is `number | undefined`. Today a mistyped nutrient id yields `undefined` and renders as a blank cell, indistinguishable from "not measured", which in a table whose first rule is that no figure is invented is the worst available failure.

Every id reaching `val()` is either a literal in this file or a stored preference already validated by `loadPrefs()` against `IDX.has()`, so throwing is safe:

```ts
const val = (f: Food, id: string): number | null => {
  const i = IDX.get(id);
  if (i === undefined) throw new Error(`unknown nutrient id: ${id}`);
  return f.v[i] ?? null;
};

const totalOf = (totals: DayTotal[], id: string): DayTotal | undefined => {
  const i = IDX.get(id);
  return i === undefined ? undefined : totals[i];
};
```

- [ ] **Step 2: Annotate the remaining parameters**

```bash
npm run check 2>&1 | grep "TS7006" | head -40
```

Work through them. Most take `Food`, `Nutrient`, `Lens`, `DayEntry`, `DayTotal` or `string`. Annotate the parameter; do not write `any`. If a parameter genuinely takes more than one shape, that is worth a union type and a comment rather than an escape hatch.

- [ ] **Step 3: Resolve the strict-null errors, one at a time, deciding each**

```bash
npm run check 2>&1 | grep -E "TS18048|TS2532|TS2538|TS18047|TS2531"
```

For each, decide which of three it is, and treat them differently:

1. **The value cannot be missing, and the compiler cannot see why.** Restructure so it can, or add a narrowing check. Only if neither is possible, use a non-null assertion **with a comment saying why it holds**.
2. **The value can be missing and the code already handles it.** Add the guard the compiler wants; behaviour is unchanged.
3. **The value can be missing and the code does not handle it.** This is a bug the conversion found. Fix it, and if it is user-visible, note it for the commit message and for `HANDOVER.md`.

**A bare `!` with no comment is not an acceptable resolution.** Silencing a real null case would change behaviour while looking like a type fix, which is the main risk this plan carries.

- [ ] **Step 4: Clear the last stragglers**

```bash
npm run check 2>&1 | grep -E "TS7053|TS7031|TS7005|TS7034|TS18046|TS2345|TS6133|TS2769|TS2698"
```

`TS7053` is string-indexing an object literal, such as `GROUP_BLURB[g.id]` near the end of the file; give the object a `Record<NutrientGroup, string>` type. `TS2345` is an argument type mismatch and is the class most likely to be a genuine bug rather than a missing annotation, so read each of those five carefully.

- [ ] **Step 5: Confirm zero errors**

```bash
npm run check
```

Expected: no output, exit code 0.

- [ ] **Step 6: Run the suite**

```bash
npm test
```

Expected: **101 passed**.

- [ ] **Step 7: Commit**

```bash
git add src/app.ts dist/app.js index.html
git commit -m "Annotate the rest, and fix the null cases that were real

src/app.ts now type-checks clean under strict.

val() and totalOf() indexed an array with the result of IDX.get(), so a
mistyped nutrient id returned undefined and rendered as a blank cell,
indistinguishable from a figure USDA never measured. Both now throw, which is
safe because every id reaching them is either a literal here or a stored
preference loadPrefs() has already checked against IDX.has()."
```

If Step 3 turned up user-visible bugs, name each one in this commit message instead of leaving it to the diff.

---

### Task 6: Close the gate, and update the documentation

Wires `check` into `npm test` and CI now that it passes, and corrects the two documents that describe a build which no longer exists.

**Files:**
- Modify: `package.json` (the `test` script)
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `HANDOVER.md`
- Modify: `.gitignore` (a comment only)

**Interfaces:**
- Consumes: a clean `npm run check` from Task 5.
- Produces: nothing further tasks depend on.

- [ ] **Step 1: Put the type check in front of the build**

In `package.json`:

```json
"test": "npm run check && npm run compile && npm run build && node test/smoke.mjs",
```

- [ ] **Step 2: Add the check to CI**

In `.github/workflows/ci.yml`, before the `npm test` step:

```yaml
      - run: npm run check
```

It runs inside `npm test` as well. Listing it separately means a type error is reported as a type error rather than as a failed test run.

- [ ] **Step 3: Verify the gate actually holds**

Introduce a deliberate error, confirm it is caught, then remove it:

```bash
printf '\nconst _typecheck: number = "not a number";\n' >> src/app.ts
npm test
```

Expected: **fails at the check step**, before any build or browser test runs. Then:

```bash
git checkout src/app.ts
npm test
```

Expected: **101 passed**. A gate nobody has watched fail is not known to be a gate.

- [ ] **Step 4: Update `README.md`**

Cover, in the project's existing voice:

- `src/` holds what a human edits, `dist/app.js` is generated and must never be edited, and `index.html` is generated, committed and served.
- The four commands and what each is for.
- Why `build.mjs` still has no dependencies, and why `dist/app.js` is committed: so `node build.mjs` alone rebuilds the page on a fresh checkout with nothing but Node.
- Why `esbuild` is pinned exactly and `typescript` is not.
- **Why `src/app.ts` must never gain an `import`**, with the consequence stated: esbuild would emit a module, every top-level name would leave the global scope, and the suite would go dark at once. Point at the guard test.
- The command for debugging against unminified output, which is a command you type rather than a script that could be shipped:
  `npx esbuild src/app.ts --outfile=dist/app.js --target=es2022 --charset=utf8`
  followed by `npm run build`, and a warning to run `npm run compile` again before committing.
- The size: 11.7 kB gzipped, 25.0 kB from 36.7 kB for the script.

- [ ] **Step 5: Update `HANDOVER.md`**

- Add a session entry describing the conversion, the measured error counts (304, down to 230 after the data model, to zero), and any bugs Task 5 turned up.
- **Correct the open-item note, which says the tests drive four globals. It is seventeen app-owned names plus `DATA`.** Record that they survive minification because esbuild does not mangle top-level names in a non-module script, and that the guard test is what protects this.
- Remove the TypeScript conversion from the open list, and note that a module split of `app.ts` and minifying `styles.css` were both deliberately left out.

- [ ] **Step 6: Update the `.gitignore` comment**

`node_modules/` is already ignored. Add a line noting that `dist/app.js` is **not** ignored and is committed on purpose, so the next person does not helpfully add it.

- [ ] **Step 7: Final verification**

```bash
npm test
git status --short
```

Expected: **101 passed**, and a clean tree with no uncommitted generated files.

- [ ] **Step 8: Commit**

```bash
git add package.json .github/workflows/ci.yml README.md HANDOVER.md .gitignore
git commit -m "Gate the build on the type check, and document the new pipeline

npm test and CI both run tsc first, verified by watching a deliberate type
error fail before any build or browser test ran.

HANDOVER recorded that the tests drive four globals. It is seventeen, plus
DATA. They survive minification because esbuild does not mangle top-level
names in a non-module script, which is why src/app.ts must never gain an
import, and why a guard test now says so when one appears."
```

---

## Notes for whoever executes this

- **Run `npm test` after every task, not just the ones that mention it.** Types erase at compile time, so most of these tasks cannot change behaviour. Confirming that is cheap; assuming it is how a real change gets attributed to the wrong commit.
- **Stage `dist/app.js` and `index.html` with every change to `src/app.ts`.** Even a comment moves the compiled output, and CI byte-compares both. A commit that forgets them fails CI on the up-to-date check.
- **The error counts in this plan are measured, not estimated.** 304 at the start and 230 after Task 2 were run against a scratch copy under the exact `tsconfig.json` above. If your numbers differ noticeably, something is different about the config, and that is worth understanding before continuing.
- **The one change that would invalidate this whole plan is an `import` in `src/app.ts`.** Everything else is recoverable.
