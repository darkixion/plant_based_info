# Portion Weights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a reader set a My day quantity by choosing a USDA portion ("1 medium" banana, 118 g) instead of typing grams.

**Architecture:** A developer-side tool filters USDA's `food_portion.csv` down to a reviewed `src/data/portions.json`, which `build.mjs` inlines into the page as a global `P` beside `DATA` and `I`. The day row gains a `<select>` that writes its portion's grams into the existing quantity field. `S.day` keeps storing `{ slug, g }`, so no total, export or saved day changes.

**Tech Stack:** Node 18+ with no runtime dependencies, TypeScript compiled by esbuild, Playwright browser tests.

**Design spec:** `docs/superpowers/specs/2026-08-06-portion-weights-design.md`

## Global Constraints

Every task's requirements implicitly include these.

- **No em dashes** anywhere: copy, code, comments, docs or commit messages. Rewrite the sentence instead.
- **`build.mjs` must import nothing but `node:*`.** It has no dependencies and must keep none.
- **`src/app.ts` must never gain an `import` or an `export`.** Either switches esbuild to module output and takes all seventeen top-level names out of the global scope at once, breaking the tests.
- **No invented data.** No `?? 0` or `|| 0` on a nutrition figure. Withhold, propagate the null, or guard the call site.
- **No colour literal in any CSS rule** outside `:root` and `[data-theme=dark]`. A test walks every rule in the built page and fails on one.
- **Edit `src/` only.** `dist/app.js` and `index.html` are generated, committed, and overwritten by the next build.
- **`npm test` before every commit**, which type-checks, compiles, builds and runs the browser tests. Commit `dist/app.js` and `index.html` alongside the source that moved them, or CI fails.
- **Watch every new test fail before making it pass**, with the wrong value visible in the failure message.

---

### Task 1: One CSV reader for all three tools

`usda.mjs` and `flavonoids.mjs` each carry their own copy of the same RFC4180
reader. The two `parseCSV` bodies are identical apart from one hoisted
`text.length`; the two `readCSV` wrappers differ only in that `usda.mjs` takes a
name relative to its `CSV_DIR` while `flavonoids.mjs` takes a full path. A third
copy is about to be written for portions, so extract one before that happens.

This task changes no behaviour. It is verified by capturing both tools' output
before and after and diffing.

**Files:**
- Create: `tools/csv.mjs`
- Modify: `tools/usda.mjs:155-186`
- Modify: `tools/flavonoids.mjs:114-142`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `tools/csv.mjs`, exporting `parseCSV(text)`, a generator yielding one
  `string[]` per row, and `readCSV(path)`, async, taking a **full path** and
  returning `Record<string, string>[]` keyed by the header row.

- [ ] **Step 1: Capture the baseline**

Both commands write nothing. The second takes a couple of minutes.

```bash
mkdir -p .superpowers/sdd/2026-08-07-portion-weights
node tools/flavonoids.mjs coverage > .superpowers/sdd/2026-08-07-portion-weights/before-flav.txt 2>&1
node tools/usda.mjs pull --dry-run 1268 1275 > .superpowers/sdd/2026-08-07-portion-weights/before-usda.txt 2>&1
git status --short
```

Expected: `git status --short` shows nothing under `tools/` or `src/data/`. If
either command wrote a file, stop: the baseline is not a dry run and the
comparison in Step 5 would be meaningless.

- [ ] **Step 2: Write the shared reader**

Create `tools/csv.mjs`. The comment is merged from the two it replaces, both of
which explained the same thing about USDA's quoting.

```js
/**
 * The CSV reader the USDA tools share.
 *
 * Minimal RFC4180: a quoted field can contain a comma, and the USDA food
 * descriptions are full of them. Extracted from usda.mjs and flavonoids.mjs,
 * which each carried an identical copy before portions.mjs would have made a
 * third.
 *
 * `readCSV` takes a full path rather than a name, because the three tools read
 * from three different directories.
 */
import { readFile } from "node:fs/promises";

export function* parseCSV(text) {
  let i = 0, field = "", row = [], quoted = false;
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); yield row; row = []; field = ""; }
    else if (c !== "\r") field += c;
    i++;
  }
  if (field || row.length) { row.push(field); yield row; }
}

export async function readCSV(path) {
  const it = parseCSV(await readFile(path, "utf8"));
  const head = it.next().value;
  const out = [];
  for (const r of it) {
    if (r.length === 1 && !r[0]) continue;
    const o = {};
    head.forEach((h, i) => { o[h] = r[i]; });
    out.push(o);
  }
  return out;
}
```

- [ ] **Step 3: Refactor usda.mjs**

Delete the `parseCSV` and `readCSV` definitions at `tools/usda.mjs:155-186`,
including the `/* ---------- csv ---------- */` banner comment above them, and
add to the imports at the top of the file:

```js
import { parseCSV, readCSV as readCSVAt } from "./csv.mjs";
```

Then, where the deleted block was, put the one line that keeps every existing
call site working unchanged:

```js
/* Every CSV this tool reads lives in CSV_DIR, so the call sites name a file
   rather than a path. */
const readCSV = name => readCSVAt(join(CSV_DIR, name));
```

`usda.mjs` also calls `parseCSV` directly when streaming `food_nutrient.csv`,
which is why it is imported as well as `readCSV`.

- [ ] **Step 4: Refactor flavonoids.mjs**

Delete the `parseCSV` and `readCSV` definitions at `tools/flavonoids.mjs:114-142`
and add to the imports at the top:

```js
import { parseCSV, readCSV } from "./csv.mjs";
```

Its `readCSV(path)` signature already matches the shared one, so no call site
changes. Check whether `parseCSV` is actually called anywhere in this file after
the deletion; if it is not, import only `readCSV`, because an unused import is
a lie about what the file needs.

- [ ] **Step 5: Verify nothing changed**

```bash
node tools/flavonoids.mjs coverage > .superpowers/sdd/2026-08-07-portion-weights/after-flav.txt 2>&1
node tools/usda.mjs pull --dry-run 1268 1275 > .superpowers/sdd/2026-08-07-portion-weights/after-usda.txt 2>&1
diff .superpowers/sdd/2026-08-07-portion-weights/before-flav.txt .superpowers/sdd/2026-08-07-portion-weights/after-flav.txt
diff .superpowers/sdd/2026-08-07-portion-weights/before-usda.txt .superpowers/sdd/2026-08-07-portion-weights/after-usda.txt
git status --short
```

Expected: both diffs produce no output, and `git status --short` shows only
`tools/csv.mjs`, `tools/usda.mjs` and `tools/flavonoids.mjs`. A refactor that
changes output is not a refactor.

Then confirm the page still builds, since the tools feed the data it inlines:

```bash
npm test
```

Expected: all 105 tests pass.

- [ ] **Step 6: Commit**

```bash
git add tools/csv.mjs tools/usda.mjs tools/flavonoids.mjs
git commit -m "Extract the CSV reader the USDA tools both carry

Two identical copies were about to become three. Verified by diffing both
tools' output before and after: flavonoids coverage and a usda dry-run pull
are byte for byte unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The propose tool and the portion data

**Files:**
- Create: `tools/portions.mjs`
- Create: `src/data/portions.json` (generated by the tool, then committed)

**Interfaces:**
- Consumes: `parseCSV` and `readCSV` from `tools/csv.mjs` (Task 1).
- Produces: `src/data/portions.json`, shaped `Record<string, { label: string, g: number }[]>`, keyed by the food slug that `build.mjs` and `app.ts` both compute as `` `${name} ${state}` `` lowercased, non-alphanumerics collapsed to `-`, leading and trailing `-` stripped.

- [ ] **Step 1: Write the tool**

Create `tools/portions.mjs`, reading CSV through the shared module Task 1 created.

```js
#!/usr/bin/env node
/**
 * Portion weights for My day, from the SR Legacy food_portion.csv.
 *
 *   node tools/portions.mjs propose    write src/data/portions.json, report every drop
 *   node tools/portions.mjs coverage   report what shipped, write nothing
 *
 * Why a committed file rather than reading the CSV at build time: USDA's
 * portion descriptions are written for a database, not for a reader. They carry
 * regulatory serving sizes, purchase quantities and USDA's own disambiguation
 * notes, none of which can go on the page as written. So the filter below is
 * proposed by this tool and reviewed by a human, the same arrangement
 * usda-map.json has and for the same reason.
 *
 * The fdc ids come from two files. usda-map.json holds the 44 original foods;
 * tools/food-additions.json holds the other 87 across its `requested` and
 * `staples` arrays. Reading only the first finds a third of the table.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readCSV as readCSVAt } from "./csv.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CSV_DIR = join(ROOT, "tools", "cache", "FoodData_Central_sr_legacy_food_csv_2018-04");
const DATA = join(ROOT, "src", "data", "nutrients.json");
const MAP = join(ROOT, "src", "data", "usda-map.json");
const ADDITIONS = join(ROOT, "tools", "food-additions.json");
const OUT = join(ROOT, "src", "data", "portions.json");

/* A portion is a plausible single helping. Above the cap it is a purchase (a
   whole melon, a head of pak choi); below the floor it is one pistachio kernel,
   which nobody adds to a day and which clampG would round away in the app. */
const MAX_G = 500;
const MIN_G = 5;

/* Every CSV this tool reads lives in CSV_DIR, so the call site names a file
   rather than a path, the same shorthand usda.mjs keeps. */
const readCSV = name => readCSVAt(join(CSV_DIR, name));

const slugify = (name, state) => `${name} ${state || ""}`.toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Rows whose text disqualifies them whatever they weigh. NLEA is the
   regulatory label serving, and it disagrees with the natural portion where
   both exist: kiwi's NLEA is 148 g against "1 fruit" at 69 g. The second rule
   catches quantities describing a purchase rather than a helping, and USDA's
   internal "NS as to" disambiguation notes. */
const TEXT_DROPS = [
  [/\bNLEA\b/i, "regulatory NLEA serving"],
  [/\bas purchased\b|\byields\b|\bNS as to\b/i, "a purchase quantity, not a portion"],
];

/* Sweet potato is mapped to the baked row and its portion reads
   `1 medium (2" dia, 5" long, raw)`. The gram weight is right for the mapped
   row, but printing that descriptor beside a column headed "baked" reads as a
   contradiction the page cannot explain. */
const strip = s => s.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ")
  .replace(/[,\s]+$/, "").trim();

/* The only two fractional amounts that survive the filter, both legitimate:
   a quarter block of tofu and half a grapefruit. */
const AMOUNT = { "0.5": "1/2", "0.25": "1/4" };
const label = (amount, desc) => `${AMOUNT[amount] ?? amount} ${desc}`.trim();

async function load() {
  const [portions, map, additions, data] = await Promise.all([
    readCSV("food_portion.csv"),
    readFile(MAP, "utf8").then(JSON.parse),
    readFile(ADDITIONS, "utf8").then(JSON.parse),
    readFile(DATA, "utf8").then(JSON.parse),
  ]);

  const fdcBySlug = new Map();
  for (const [slug, m] of Object.entries(map))
    if (m && m.fdc_id) fdcBySlug.set(slug, String(m.fdc_id));
  for (const key of ["requested", "staples"])
    for (const f of additions[key] || [])
      if (f.fdc_id) fdcBySlug.set(slugify(f.name, f.state), String(f.fdc_id));

  const byFdc = new Map();
  for (const p of portions) {
    if (!byFdc.has(p.fdc_id)) byFdc.set(p.fdc_id, []);
    byFdc.get(p.fdc_id).push(p);
  }
  return { data, fdcBySlug, byFdc };
}

/** Returns { kept, drops, collisions }. Nothing is written here, so `coverage`
 *  and `propose` report on exactly the same computation. */
function compute({ data, fdcBySlug, byFdc }) {
  const kept = {}, drops = [], collisions = [];

  for (const f of data.foods) {
    const slug = slugify(f.name, f.state);
    const rows = byFdc.get(fdcBySlug.get(slug)) || [];
    const out = [];

    for (const p of rows) {
      const desc = (p.modifier || p.portion_description || "").trim();
      const g = Number(p.gram_weight);
      let reason = null;
      if (!desc) reason = "no description";
      for (const [re, why] of TEXT_DROPS) if (!reason && re.test(desc)) reason = why;
      if (!reason && !(g > 0)) reason = "no gram weight";
      if (!reason && g > MAX_G) reason = `${g} g, over the ${MAX_G} g cap`;
      if (!reason && g < MIN_G) reason = `${g} g, under the ${MIN_G} g floor`;
      if (reason) { drops.push({ slug, text: label(p.amount, desc), reason }); continue; }
      out.push({ label: label(p.amount, strip(desc)), g, full: label(p.amount, desc) });
    }

    /* Stripping the dimensions can make two kept portions collide: pineapple
       has a 166 g and an 84 g "1 slice", told apart only by the text that was
       stripped. Both revert to their full description rather than one being
       dropped, because losing it silently would be the tool inventing a
       simpler dataset than the source. */
    const seen = new Map();
    for (const o of out) seen.set(o.label, (seen.get(o.label) || 0) + 1);
    for (const o of out) {
      if (seen.get(o.label) > 1) {
        collisions.push({ slug, label: o.label, full: o.full, g: o.g });
        o.label = o.full;
      }
      delete o.full;
    }
    if (out.length) kept[slug] = out;
  }
  return { kept, drops, collisions, foods: data.foods.length };
}

function report({ kept, drops, collisions, foods }) {
  const rows = Object.values(kept).reduce((n, a) => n + a.length, 0);
  console.log(`${Object.keys(kept).length} of ${foods} foods have at least one portion, ` +
    `${rows} portions in total`);

  console.log(`\ndropped (${drops.length}):`);
  for (const d of drops) console.log(`  ${d.slug.padEnd(28)} "${d.text}"  ${d.reason}`);

  console.log(`\nlabel collisions, both kept with their full description (${collisions.length}):`);
  for (const c of collisions) console.log(`  ${c.slug}: "${c.label}" -> "${c.full}" at ${c.g} g`);
}

const cmd = process.argv[2];
const state = compute(await load());

if (cmd === "coverage") {
  report(state);
} else if (cmd === "propose") {
  report(state);
  await writeFile(OUT, JSON.stringify(state.kept, null, 1) + "\n");
  console.log(`\nwrote ${OUT}`);
} else {
  console.error("usage: node tools/portions.mjs propose | coverage");
  process.exitCode = 1;
}
```

- [ ] **Step 2: Run it and check the numbers against the design**

Run: `node tools/portions.mjs coverage`

Expected, exactly:
```
128 of 131 foods have at least one portion, 324 portions in total
```
and in the drop report, 40 rows in total: 17 under the 5 g floor, 14 NLEA servings, 6 purchase quantities, 3 over the 500 g cap.

The collision report ends with **two lines, both `pineapple-raw`**:

```
label collisions, both kept with their full description (2):
  pineapple-raw: "1 slice" -> "1 slice (4-2/3" dia x 3/4" thick)" at 166 g
  pineapple-raw: "1 slice" -> "1 slice (3-1/2" dia x 3/4" thick)" at 84 g
```

That is one colliding label across two rows, and the count is of rows reverted
rather than of labels, because every row involved has to revert for the pair to
stay distinguishable. Two lines here is correct.

If any of these differ, stop and work out why before writing the file. These figures come from the design's own measurement of the source.

- [ ] **Step 3: Write the data file**

Run: `node tools/portions.mjs propose`

- [ ] **Step 4: Spot-check the three foods the tests will use**

Run:
```bash
node -e 'const p=require("./src/data/portions.json");
console.log("banana:", JSON.stringify(p.banana));
console.log("lentils:", JSON.stringify(p["lentils-cooked"]));
console.log("seitan:", p.seitan === undefined ? "absent, as intended" : "PRESENT, wrong");'
```

Expected:
```
banana: [{"label":"1 cup, mashed","g":225},{"label":"1 cup, sliced","g":150},{"label":"1 extra small","g":81},{"label":"1 small","g":101},{"label":"1 medium","g":118},{"label":"1 large","g":136},{"label":"1 extra large","g":152}]
lentils: [{"label":"1 cup","g":198},{"label":"1 tbsp","g":12.3}]
seitan: absent, as intended
```

Note the banana slug is `banana`, not `banana-raw`: its `state` is empty. Seitan is one of the three foods with no `fdc_id` at all.

- [ ] **Step 5: Commit**

```bash
git add tools/portions.mjs src/data/portions.json
git commit -m "Add a tool that proposes portion weights, and its reviewed output

324 portions across 128 of the 131 foods, from SR Legacy's food_portion.csv.
The 40 dropped rows are printed with the rule that dropped them, because the
filter is the judgement in this feature and it should be reviewable rather
than merely trusted.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Inline and validate the portions in the build

**Files:**
- Modify: `build.mjs:18-27` (SOURCES), `build.mjs:40-136` (validate), `build.mjs:142-168` (build)
- Modify: `src/index.html:249-251` (the injection tokens)

**Interfaces:**
- Consumes: `src/data/portions.json` from Task 2.
- Produces: a global `const P` in the built page, shaped `Record<string, { label: string, g: number }[]>`, declared in the page shell exactly as `DATA` and `I` are.

- [ ] **Step 1: Add the source and the token**

In `build.mjs`, add to `SOURCES` after `icons`:

```js
  portions: join(SRC, "data", "portions.json"),
```

In `src/index.html`, add a line after `//{{ICONS}}`:

```
//{{PORTIONS}}
```

In `build.mjs`, widen the destructure and the parse. The existing line reads:

```js
  const [html, css, app, dataRaw, iconsRaw] = await Promise.all(
    Object.values(SOURCES).map(p => readFile(p, "utf8")));
```

Replace with:

```js
  const [html, css, app, dataRaw, iconsRaw, portionsRaw] = await Promise.all(
    Object.values(SOURCES).map(p => readFile(p, "utf8")));
```

After the `icons` parse, add:

```js
  let portions;
  try { portions = JSON.parse(portionsRaw); }
  catch (e) { throw new Error(`portions.json is not valid JSON: ${e.message}`); }
```

And after the `//{{ICONS}}` injection:

```js
  out = inject(out, "//{{PORTIONS}}", `const P = ${safeJSON(portions)};`);
```

- [ ] **Step 2: Validate the portions**

`validate()` currently takes `data`. Change its signature to `validate(data, portions)` and its call site to `validate(data, portions)`. Add this block just before `return problems;`, after the existing subset checks:

```js
  // A portion pointing at a food that does not exist renders nothing at all and
  // would sit in the data unnoticed, which is the same failure the per-cell
  // notes checks above exist to refuse. Renaming a food should fail the build
  // rather than silently drop its portions.
  for (const [slug, list] of Object.entries(portions)) {
    if (!slugs.has(slug)) problems.push(`portions: no food with key "${slug}"`);
    if (!Array.isArray(list) || !list.length) {
      problems.push(`portions: "${slug}" lists none`);
      continue;
    }
    const labels = new Set();
    for (const p of list) {
      if (!p.label) problems.push(`portions: "${slug}" has a portion with no label`);
      else if (labels.has(p.label))
        problems.push(`portions: "${slug}" lists "${p.label}" twice`);
      labels.add(p.label);
      // Zero or negative would render a portion that sets a quantity of
      // nothing, and above the cap is a purchase rather than a helping.
      if (typeof p.g !== "number" || !(p.g > 0) || p.g > 500)
        problems.push(`portions: "${slug}" portion "${p.label}" has an impossible weight ${p.g}`);
    }
  }
```

`slugs` is the `Set` the food loop above already builds, so this must stay below it.

- [ ] **Step 3: Build, and check the page grew by about the right amount**

Run: `npm run build`

Expected: it succeeds and reports a size around 221 kB, up from 208.8 kB. The portion data is 12.1 kB of JSON.

- [ ] **Step 4: Watch the validation fail**

Do not skip this. The check is worthless until it has been seen rejecting something.

```bash
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("src/data/portions.json"));
p["not-a-food"]=[{label:"1 imaginary",g:50}];
fs.writeFileSync("src/data/portions.json",JSON.stringify(p,null,1)+"\n")'
npm run build
```

Expected: the build fails with `portions: no food with key "not-a-food"`.

Then restore the file and confirm the build passes again:

```bash
node tools/portions.mjs propose && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add build.mjs src/index.html index.html
git commit -m "Inline the portion data, and refuse one that names no food

Same check the per-cell notes carry, for the same reason: a portion keyed on a
food that has been renamed renders nothing and would sit in the data with
nothing to say it had gone. Watched failing on an invented key before it was
trusted.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The portion select in the day row

**Files:**
- Modify: `src/app.ts:78-92` (ambient declares), `src/app.ts:1263-1286` (`renderDayList`), `src/app.ts:1865-1867` (the `#dayList` change listener)
- Modify: `src/styles.css:425-438` (the `.dayqty` rules)
- Test: `test/smoke.mjs`

**Interfaces:**
- Consumes: the global `P` from Task 3.
- Produces: `interface Portion { label: string; g: number }`, `declare const P: Record<string, Portion[]>`, and `portionsFor(slug: string): Portion[]`. Nothing later in this plan depends on them.

- [ ] **Step 1: Write the four failing tests**

Add to `test/smoke.mjs`, after the existing test `"a nonsense quantity cannot put a NaN into a total"` (around line 1621), so they sit with the other day-quantity tests. `seedDay` is defined at line 1361 and switches to the day view for you.

```js
// ---------------------------------------------------------------- portions

/** The index of a portion by its label, looked up in the page rather than
 *  hardcoded, so reordering the data file cannot quietly make these tests
 *  assert something else. Throws in the browser if the label is gone, which
 *  is the failure we want rather than a silent pass. */
const portionIndex = (page, slug, label) => page.evaluate(([s, l]) => {
  const i = P[s].findIndex(p => p.label === l);
  if (i === -1) throw new Error(`no portion "${l}" for ${s}`);
  return String(i);
}, [slug, label]);

await test("a portion sets the grams it says it does", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "banana", g: 100 }]);
    await page.selectOption('[data-dayportion="banana"]',
      await portionIndex(page, "banana", "1 medium"));

    eq(await page.evaluate(() => S.day[0].g), 118, "quantity after choosing 1 medium");
    eq(await page.locator('[data-dayg="banana"]').inputValue(), "118", "the quantity field");
  });
});

await test("typing a quantity no portion matches says custom", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "banana", g: 118 }]);
    eq(await page.locator('[data-dayportion="banana"]').inputValue(),
      await portionIndex(page, "banana", "1 medium"), "the select at 118 g");

    await page.fill('[data-dayg="banana"]', "137");
    await page.locator('[data-dayg="banana"]').blur();
    eq(await page.locator('[data-dayportion="banana"]').inputValue(), "",
      "the select at a quantity no portion matches");
  });
});

await test("a food USDA published no portion for offers no portion control", async () => {
  await withPage(async page => {
    // Seitan is one of the three foods with no SR Legacy row at all, so there
    // is nothing to offer and nothing may be invented to fill the gap.
    await seedDay(page, [{ slug: "seitan", g: 100 }, { slug: "banana", g: 100 }]);
    eq(await page.locator('[data-dayportion="seitan"]').count(), 0, "controls for seitan");
    eq(await page.locator('[data-dayportion="banana"]').count(), 1, "controls for banana");
  });
});

await test("a portion changes nothing that typing the same quantity would not", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "banana", g: 100 }]);
    await page.selectOption('[data-dayportion="banana"]',
      await portionIndex(page, "banana", "1 medium"));
    const chosen = await page.evaluate(() => JSON.stringify(dayTotals().map(t => t.total)));

    await page.evaluate(() => { S.day = [{ slug: "banana", g: 118 }]; savePrefs(); render(); });
    const typed = await page.evaluate(() => JSON.stringify(dayTotals().map(t => t.total)));

    eq(chosen, typed, "totals reached by portion against by quantity");
  });
});
```

Also add `P` to the globals probe in the existing test `"the app's own globals survive minification"` (around line 50), in the `probes` object beside `S` and `FOODS`:

```js
        P: typeof P,
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: the four new tests FAIL, all on the missing `[data-dayportion]` element. The globals probe **passes**, because Task 3 already inlined `P` into the page: it is defined before any app code reads it. Read the failure messages and confirm they name the missing element rather than something unrelated. If any of the four passes at this point, stop: a test that passes before the feature exists is asserting nothing.

- [ ] **Step 3: Declare the type and the data**

In `src/app.ts`, after the `Note` interface (around line 26) add:

```ts
interface Portion { label: string; g: number; }
```

After `declare const I: ...` (line 92) add:

```ts
/* Portion weights, injected by build.mjs from src/data/portions.json the same
   way DATA is. 128 of the 131 foods have at least one; the three that do not
   have no USDA row at all, so an index read is genuinely optional here rather
   than a missing measurement being papered over. */
declare const P: Record<string, Portion[]>;
```

- [ ] **Step 4: Add the lookup and the render**

In `src/app.ts`, beside the other day helpers and above `renderDayList` (around line 1245), add:

```ts
/* `?? []` is not the substitution the no-invented-data rule forbids: an absent
   key means USDA published no portion for that food, and an empty list is
   exactly what that means. No nutrition figure passes through here. */
const portionsFor = (slug: string): Portion[] => P[slug] ?? [];

/** The select is derived from the stored grams rather than from a stored
 *  choice, so typing a quantity or using the steppers moves it with no extra
 *  wiring. Matching on clampG() is what makes that work: the stored quantity
 *  is always a whole number, and a tablespoon of lentils weighs 12.3 g, so
 *  comparing against the raw figure would never match and the control would
 *  read "custom" the instant after it was used. */
function portionSelect(slug: string, f: Food, g: number): string {
  const ps = portionsFor(slug);
  if (!ps.length) return "";
  const at = ps.findIndex(p => clampG(p.g) === g);
  return `<select data-dayportion="${esc(slug)}"
      aria-label="Portion of ${esc(f.name)}${f.state ? `, ${esc(f.state)}` : ""}">
      <option value="" disabled${at === -1 ? " selected" : ""}>custom</option>` +
    ps.map((p, i) =>
      `<option value="${i}"${i === at ? " selected" : ""}>${esc(p.label)} · ${p.g} g</option>`)
      .join("") + `</select>`;
}
```

`custom` is `disabled` on purpose: it is a computed state rather than a choice, and an enabled option that snaps back the moment it is picked would be a control arguing with the reader.

In `renderDayList`, insert the select between the `+` stepper button and the remove button. The existing markup ends the `.dayqty` span like this:

```ts
        <button class="stp" type="button" data-daystep="${esc(slug)}" data-by="10"
          ${g >= DAY_MAX_G ? "disabled" : ""}>${I.plus}<span class="sr">More ${esc(f.name)}</span></button>
      </span>
```

Change it to:

```ts
        <button class="stp" type="button" data-daystep="${esc(slug)}" data-by="10"
          ${g >= DAY_MAX_G ? "disabled" : ""}>${I.plus}<span class="sr">More ${esc(f.name)}</span></button>
        ${portionSelect(slug, f, g)}
      </span>
```

- [ ] **Step 5: Wire the change handler**

`src/app.ts:1865-1867` currently reads:

```ts
$("#dayList").addEventListener("change", e => {
  if (targetEl(e)?.dataset.dayg) render();
});
```

Replace with:

```ts
$("#dayList").addEventListener("change", e => {
  const t = targetEl(e);
  if (!t) return;
  const slug = t.dataset.dayportion;
  if (slug !== undefined) {
    // Choosing goes through setDayGrams like every other route to a quantity,
    // so clamping, saving and the totals all behave identically.
    const p = t instanceof HTMLSelectElement ? portionsFor(slug)[+t.value] : undefined;
    if (p) setDayGrams(slug, p.g);
    return render();
  }
  if (t.dataset.dayg) render();
});
```

- [ ] **Step 6: Style the select**

In `src/styles.css`, after the `.dayqty .stp:disabled` rule (line 438) add:

```css
/* Sits inside .dayqty so it wraps with the quantity controls rather than
   away from them. No colour literal: every value here is a variable, which
   the stylesheet test enforces. */
.dayqty select{border:1px solid var(--line); border-radius:8px; background:var(--panel);
  color:var(--muted); font-size:12.5px; min-height:38px; padding:0 6px;
  max-width:150px; margin-left:4px}
.dayqty select:hover{border-color:var(--green-dark)}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`

Expected: all tests pass, 109 of them, up from 105.

- [ ] **Step 8: Check the row at a narrow viewport**

Run: `npm run serve`, open `http://localhost:8080`, go to My day, add a banana, and set the window to 380 px wide.

The `.dayrow` is a flex row and `.dayqty` is `flex:none`, so the select can push the row wider than the viewport. If it does, add this to `src/styles.css` inside the existing narrow-viewport media query, and rerun `npm test` afterwards:

```css
  .dayqty{flex-wrap:wrap; justify-content:flex-end}
  .dayqty select{margin-left:0; max-width:100%}
```

If the row already fits, change nothing and say so in the commit message.

- [ ] **Step 9: Commit**

```bash
git add src/app.ts src/styles.css test/smoke.mjs dist/app.js index.html
git commit -m "Offer USDA portions in the day row, which set the grams

The select is derived from the stored quantity rather than stored beside it,
so S.day keeps its { slug, g } shape and no saved day, total or export moves.
Matching on clampG() is what makes deriving it work, since a tablespoon of
lentils weighs 12.3 g and the stored quantity is always whole.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The documentation this leaves behind

**Files:**
- Modify: `README.md` (the "My day" section around line 316, and the layout listing around line 44)
- Modify: `HANDOVER.md` (the open list around line 445)

**Interfaces:**
- Consumes: everything above. Produces nothing consumed by code.

- [ ] **Step 1: Document the feature in the README**

Add to the end of the "My day" section:

```markdown
**Quantities can come from a USDA portion.** 128 of the 131 foods carry portion
weights from SR Legacy's `food_portion.csv`, so a banana can be "1 medium" at
118 g rather than a number you guess. Choosing one writes its grams into the
quantity field and nothing else: `S.day` still stores `{ slug, g }`, so every
total, export and saved day is exactly what typing that number would produce.
The select shows "custom" whenever the quantity matches no portion, which is
derived from the quantity rather than remembered, so the steppers move it too.

The three foods without portions are Seitan, Soy milk and Nutritional yeast,
the same three with no SR Legacy row at all.

`tools/portions.mjs propose` regenerates `src/data/portions.json` and prints
every row it dropped with the rule that dropped it, because the filter is the
judgement in this feature: USDA publishes regulatory NLEA servings, purchase
quantities like "1 pint as purchased", and its own disambiguation notes, none
of which belong on the page. Portions under 5 g are dropped too, since stored
quantities are whole grams and a 0.7 g pistachio kernel could never match the
portion that set it.
```

- [ ] **Step 2: Correct the id-source claim and the layout listing**

The README's layout listing describes `data/usda-map.json` as "the reviewed USDA row behind each of the original foods", which is right, but nothing says where the other 87 live. Add to that listing, beside the existing `tools/` entries:

```
src/data/portions.json     USDA portion weights per food; generated by tools/portions.mjs
tools/portions.mjs         proposes the above from food_portion.csv, reports every drop
```

And in the section describing the USDA tooling, add:

```markdown
**The fdc ids live in two files.** `src/data/usda-map.json` holds the 44
original foods. `tools/food-additions.json` holds the other 87, across its
`requested` and `staples` arrays. Anything walking every food's USDA row has to
read both, which `tools/portions.mjs` does and which is easy to get wrong: the
first pass at the portion tool read only the map and silently covered a third
of the table.
```

- [ ] **Step 3: Correct the test count**

`HANDOVER.md:12` says "103 tests, all passing". The suite actually has 105, and
had 105 before this branch started: Task 1 counted them and touched no test
file. Correct that number to the count `npm test` reports after Task 4, and do
not simply trust this plan's arithmetic for it. Run the suite and read the
figure.

- [ ] **Step 4: Close the open item in the handover**

In `HANDOVER.md`, delete the "Portion weights for the day view" bullet from the open list, and add a session entry at the top describing what shipped, following the shape of the existing entries: what was built, the two findings worth keeping (the two id sources, and the rounding trap that set the 5 g floor), and what was deliberately left out (no CSV column, no representative default, nothing in the table view).

- [ ] **Step 5: Verify the docs match the build**

Run: `npm test`

Expected: all tests pass. The suite asserts prose that derives from the data, so a claim written into the README that disagrees with the page is worth catching here.

Then confirm no em dashes were introduced:

```bash
git diff main -- README.md HANDOVER.md | grep -n '^+.*\xe2\x80\x94'
```

Expected: no output. This greps only added lines, so em dashes already in those files from earlier work do not mask a new one.

- [ ] **Step 6: Commit**

```bash
git add README.md HANDOVER.md
git commit -m "Document portions, and say where the fdc ids actually live

The open list called this a pull rather than a judgement call, and pointed at
one file for the reviewed rows when there are two. Both corrected, since the
next person to walk every food's USDA row will hit the same thing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review notes

Checked against the spec:

- **Spec coverage.** Tool and filter, Task 2. Rounding trap, Task 2 (`MIN_G`) and Task 4 (`clampG` matching), with the reasoning recorded in comments at both sites. Data shape and build validation, Task 3. The app and the derived select, Task 4. Testing, Task 4 Step 1. Documentation, Task 5. Task 1 is a refactor the spec does not mention, added because the user chose one shared CSV reader over a third copy.
- **The spec's "deliberately not done" list needs no task**, which is the point of it: no CSV column, no representative default, nothing in the table view, no portions for the three unmapped foods, and no parsing of typed input. None of the tasks above adds any of them.
- **One thing the spec left implicit and this plan settles:** collisions revert to the full description automatically rather than waiting on a hand edit. The spec said `propose` reports them and leaves the decision to review; deciding it in the tool is deterministic, keeps both rows, and still prints what it did. Pineapple is the only affected food.
- **Types are consistent across tasks:** `Portion` is declared once in Task 4 Step 3 and used by `portionsFor` and `portionSelect` in Step 4. `P` is produced in Task 3 and consumed in Task 4. The slug rule is stated identically in Task 2 and enforced in Task 3.
