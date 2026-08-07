# Fat re-pull and two new columns: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `tools/usda.mjs pull` incapable of destroying a figure, then use that to re-pull the fat group and add gamma-tocopherol and phytosterol columns.

**Architecture:** One rule change in `cmdPull` unblocks three data changes. The rule is extracted as a pure exported function so it can be tested without running the CLI, which needs a new non-browser test file since the existing suite drives a browser. The three data changes are then `KNOWN` entries plus `pull` runs, with two pieces of Methodology prose switched from hand-typed to computed.

**Tech Stack:** Node 20+ (CI pins 20), plain ESM tools with no runtime dependencies, TypeScript for `src/app.ts` only, Playwright for the browser suite.

## Global Constraints

- **No em dashes** anywhere in copy, comments, docs or commit messages. Rewrite the sentence rather than swapping the punctuation.
- **No invented data.** Where USDA has no figure the table shows `n/a`. No `|| 0` or `?? 0` on any nutrition figure.
- **Edit `src/`, never `index.html` and never `dist/app.js`.** Both are generated and both are committed on purpose.
- **`src/app.ts` must never gain an `import` or an `export`.** Either switches esbuild to module output and removes all seventeen app globals from scope at once.
- **`build.mjs` imports nothing but `node:*`** and must keep no dependencies.
- **Every nutrient column needs a `label` and a `why` of at least 40 characters**, or `build.mjs` refuses the build.
- **Node 20 compatibility for tools.** `import.meta.main` is Node 24+ and must not be used; compare `process.argv[1]` against `fileURLToPath(import.meta.url)` instead.
- **Run `npm test` after any change to `src/`**, and commit the regenerated `index.html` and `dist/app.js` with it.
- Prose describing the data derives from the data.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `tools/usda.mjs` | Modify | Add `nextValue()` (the never-blank rule), use it in `cmdPull`, guard the CLI dispatch, add three `KNOWN` entries for the fat totals and two for the new columns |
| `test/tools.mjs` | **Create** | Non-browser tests for tool logic. First member: the never-blank rule |
| `package.json` | Modify | Run `test/tools.mjs` as part of `npm test` |
| `.github/workflows/ci.yml` | Modify | Nothing new to add; `npm test` covers it. Verify only |
| `src/data/nutrients.json` | Regenerate | Output of the pull runs. Never hand-edited |
| `src/app.ts` | Modify | Two derived prose blocks and the Methodology caveats that use them |
| `test/smoke.mjs` | Modify | Four new browser tests |
| `README.md`, `HANDOVER.md` | Modify | Corrections and the record of what changed |

---

### Task 1: The never-blank rule

**Files:**
- Modify: `tools/usda.mjs:355-380` (the fill loop), `tools/usda.mjs:555-564` (the CLI dispatch)
- Create: `test/tools.mjs`
- Modify: `package.json:9` (the `test` script)

**Interfaces:**
- Produces: `nextValue(current, incoming)` exported from `tools/usda.mjs`. Returns the incoming figure when there is one, otherwise the current figure when it is a number, otherwise `null`. Task 2 relies on it being in force; nothing else calls it directly.

- [ ] **Step 1: Write the failing test**

Create `test/tools.mjs`:

```js
#!/usr/bin/env node
/**
 * Tests for tool logic that no browser can exercise.
 *
 * The smoke suite drives the built page, which is the right shape for every
 * feature that renders. The pull tools decide what reaches the page at all,
 * and a rule about what they may never do belongs here instead. Run with
 * `npm test`.
 */
import { nextValue } from "../tools/usda.mjs";

let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try { fn(); passed++; results.push(`  PASS  ${name}`); }
  catch (e) { failed++; results.push(`  FAIL  ${name}\n          ${e.message}`); }
}
const eq = (a, b, msg) => {
  if (!Object.is(a, b)) throw new Error(`${msg}, expected ${b}, got ${a}`);
};

// ---------------------------------------------------------------- pull rules

test("a pull never replaces a figure with nothing", () => {
  // The case this exists for: Amaranth is mapped and reviewed to 170683, whose
  // row carries 33 nutrient ids and not one of the 12 fatty acid ids. Under the
  // old rule a re-pull wrote null over five real values for it. A row that is
  // silent about a nutrient is not evidence that the nutrient is absent.
  eq(nextValue(0.043, undefined), 0.043, "an absent id must not destroy a figure");
  eq(nextValue(0.043, null), 0.043, "a null id must not destroy a figure");
  eq(nextValue(0, undefined), 0, "a measured zero is a figure, not a gap");
});

test("a pull still fills a gap and still updates a figure", () => {
  eq(nextValue(null, 0.119), 0.119, "a gap must be filled");
  eq(nextValue(undefined, 0.119), 0.119, "an unset cell must be filled");
  eq(nextValue(0.021, 0.119), 0.119, "an existing figure must be updated");
  eq(nextValue(0.119, 0), 0, "a figure must be updatable to a measured zero");
});

test("a pull leaves a gap as a gap when neither side has a figure", () => {
  eq(nextValue(null, undefined), null, "nothing on either side stays null");
  eq(nextValue(undefined, undefined), null, "unset with nothing incoming is null");
});

console.log(results.join("\n"));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node test/tools.mjs`
Expected: FAIL. `nextValue` is not exported from `tools/usda.mjs`, so the import throws `SyntaxError: The requested module '../tools/usda.mjs' does not provide an export named 'nextValue'`.

- [ ] **Step 3: Add the rule to `tools/usda.mjs`**

Insert above `/* ---------- pull ---------- */` (currently line 299):

```js
/* ---------- the rule a pull may not break ----------
   A pull may overwrite a figure with a figure, and may fill a gap. It may
   never replace a figure with nothing.

   Writing null wherever the mapped row lacks an id is right for a fresh
   column, where every cell starts empty and null means "USDA has no figure".
   It is wrong for a re-pull. Four foods hold fat values whose mapped row
   carries no fatty acid id at all: Amaranth, whose row 170683 simply has no
   fatty acid analysis, and Soy milk, Seitan and Nutritional yeast, which are
   deliberately unmapped. Their figures came from a source the map does not
   record, and a silent row is not evidence of absence.

   Exported so the rule can be tested as a property of the tool rather than as
   a fact about those four foods. */
export function nextValue(current, incoming) {
  if (incoming !== undefined && incoming !== null) return incoming;
  return typeof current === "number" ? current : null;
}
```

- [ ] **Step 4: Use it in the fill loop**

In `cmdPull`, replace this block (currently lines 373-378):

```js
      if (v === undefined || v === null) { f.v[col] = null; missing.push(`${f.name}/${KNOWN[id].id}`); }
      else {
        f.v[col] = v; filled++;
        wrote.add(`${slug} ${col}`);
        if (fell) viaFallback.push([slug, KNOWN[id].id]);
      }
```

with:

```js
      const before = f.v[col];
      f.v[col] = nextValue(before, v);
      if (v === undefined || v === null) {
        // Preserved rather than missing: the cell keeps a figure this run could
        // not reproduce, which is a different thing from "USDA has no figure"
        // and is worth counting separately.
        if (typeof before === "number") preserved.push(`${f.name}/${KNOWN[id].id}`);
        else missing.push(`${f.name}/${KNOWN[id].id}`);
      } else {
        filled++;
        wrote.add(`${slug} ${col}`);
        if (fell) viaFallback.push([slug, KNOWN[id].id]);
      }
```

Then declare `preserved` alongside the other counters. Replace line 356:

```js
  let filled = 0, held = 0, missing = [], viaFallback = [];
```

with:

```js
  let filled = 0, held = 0, missing = [], preserved = [], viaFallback = [];
```

- [ ] **Step 5: Report what was preserved**

After the `missing.length` line in the summary (currently line 427), add:

```js
  if (preserved.length) {
    console.log(`\n${preserved.length} existing figure(s) kept: the mapped row has no value ` +
      `for them.\n  A pull never replaces a figure with nothing, so these were left as they are.`);
    preserved.forEach(p => console.log(`  ${p}`));
  }
```

- [ ] **Step 6: Guard the CLI dispatch so importing the module does not run it**

Replace the block at the end of the file (currently lines 555-564):

```js
const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === "match") await cmdMatch();
  else if (cmd === "pull") await cmdPull(rest);
  else if (cmd === "add") await cmdAdd(rest);
  else {
    console.error("usage: usda.mjs match | pull <nutrientId>... [--fill-gaps] [--dry-run] | add [--dry-run]");
    process.exit(1);
  }
} catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
```

with:

```js
/* Only dispatch when run as a script. Importing this module, which the tool
   tests do, must not execute a command. `import.meta.main` would say this more
   directly but landed in Node 24, and CI pins Node 20. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    if (cmd === "match") await cmdMatch();
    else if (cmd === "pull") await cmdPull(rest);
    else if (cmd === "add") await cmdAdd(rest);
    else {
      console.error("usage: usda.mjs match | pull <nutrientId>... [--fill-gaps] [--dry-run] | add [--dry-run]");
      process.exit(1);
    }
  } catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
}
```

`fileURLToPath` is already imported at line 22. Do not add an import.

- [ ] **Step 7: Run the test to verify it passes**

Run: `node test/tools.mjs`
Expected: PASS, `3 passed, 0 failed`.

- [ ] **Step 8: Verify the CLI still works**

Run: `node tools/usda.mjs`
Expected: the usage line, exit code 1. The guard must not have broken dispatch.

Run: `node tools/usda.mjs pull 1404 --dry-run`
Expected: a normal dry run ending in `--dry-run: nothing written`.

- [ ] **Step 9: Wire the tool tests into `npm test`**

In `package.json`, change the `test` script from:

```json
"test": "npm run check && npm run compile && npm run build && node test/smoke.mjs",
```

to:

```json
"test": "npm run check && npm run compile && npm run build && node test/tools.mjs && node test/smoke.mjs",
```

Tool tests run before the browser suite because they are fast and need no browser, so a broken rule is reported in a second rather than after a full page build. CI needs no change: it calls `npm test`.

- [ ] **Step 10: Run the full suite**

Run: `npm test`
Expected: tool tests pass, then all 110 browser tests pass. No data has changed yet.

- [ ] **Step 11: Commit**

```bash
git add tools/usda.mjs test/tools.mjs package.json
git commit -F - <<'EOF'
A pull may never replace a figure with nothing

cmdPull wrote null wherever the mapped row lacked an id. That is right for a
fresh column, where null means "USDA has no figure", and wrong for a re-pull,
where the cell may already hold a figure from a source the map does not
record. It is what has kept the fat re-pull an open offer rather than a patch:
running it today destroys real data.

Four foods depend on the new rule. Amaranth is the instructive one, mapped and
reviewed to 170683, whose row carries 33 nutrient ids and not one of the 12
fatty acid ids, so a re-pull blanked five real values for it. Soy milk, Seitan
and Nutritional yeast are deliberately unmapped and hold fat figures from
elsewhere. A row that says nothing about a nutrient is not evidence that the
nutrient is absent.

nextValue() is exported so the rule is testable as a property of the tool
rather than as a fact about those four foods, which meant guarding the CLI
dispatch so importing the module does not run a command. process.argv[1]
rather than import.meta.main, which is Node 24 and CI pins 20.

The run now reports preserved figures separately from missing ones, since
"kept a figure this run could not reproduce" and "USDA has no figure" are
different facts about a cell.

test/tools.mjs is new: the smoke suite drives the built page, which is the
right shape for anything that renders, and the wrong shape for a rule about
what a tool may never do.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Re-pull the fat group

**Files:**
- Modify: `tools/usda.mjs` (three `KNOWN` entries)
- Regenerate: `src/data/nutrients.json`
- Modify: `test/smoke.mjs`

**Interfaces:**
- Consumes: `nextValue()` in force from Task 1. Without it this task destroys 20 values.
- Produces: `mufa`, `pufa` and `satfat` re-pullable; `nutrients.json` with all fat subsets reconciling.

- [ ] **Step 1: Write the failing test**

Append to `test/smoke.mjs`, after the amino acid gap test (currently ends line 565):

```js
await test("every fat fraction reconciles against the total it belongs to", async () => {
  await withPage(async page => {
    // Each list is a subset of its total and never the whole of it, since the
    // chain lengths left out have no column, so a sum may fall short of the
    // total but must never exceed it. Six foods failed this before the fat
    // group was re-pulled from the mapped rows, because fraction and total had
    // been assembled from different sources at different times.
    const bad = await page.evaluate(() => {
      const SUBSET = { mufa: ["oleic", "palmitoleic"], pufa: ["ala", "la"],
                       satfat: ["lauric", "palmitic", "stearic"] };
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const out = [];
      for (const [total, parts] of Object.entries(SUBSET)) {
        const ti = at(total);
        for (const f of DATA.foods) {
          const t = f.v[ti];
          if (typeof t !== "number") continue;
          const sum = parts.reduce((s, p) =>
            s + (typeof f.v[at(p)] === "number" ? f.v[at(p)] : 0), 0);
          // The same tolerance the pull uses: USDA's own figures are rounded,
          // so an exact comparison flags rounding as a contradiction.
          if (sum > t * 1.01 + 0.005)
            out.push(`${f.name}: ${parts.join("+")} ${sum.toFixed(3)} vs ${total} ${t}`);
        }
      }
      return out;
    });
    assert(bad.length === 0, `fat fractions exceed their total:\n          ${bad.join("\n          ")}`);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL on this test, naming six foods: Mung beans, Edamame, Lupin beans, Natto, Buckwheat, Wholewheat pasta, each with `ala+la` above `pufa`.

- [ ] **Step 3: Add the three totals to `KNOWN`**

In `tools/usda.mjs`, after the three saturated fat entries (currently ends line 68), add:

```js
  // The three totals the fractions above are checked against. They were in
  // COLUMN_TO_USDA, so a newly added food got them, and absent from KNOWN, so
  // `pull` could not touch them. That asymmetry is why re-pulling the fat group
  // could not resolve the fraction-versus-total disagreements: the fractions
  // came from the mapped row and the totals stayed as they were. Definitions
  // copied from the committed columns in nutrients.json, unchanged.
  // No `after`: all three columns already exist, so nothing is being placed.
  1292: { id: "mufa", label: "Monounsaturated", group: "fats", unit: "g", dv: null, dp: 2,
    why: "Fats with a single double bond, the omega-9 and omega-7 columns included. Stable enough to cook with, and the fraction Mediterranean diets are richest in." },
  1293: { id: "pufa", label: "Polyunsaturated", group: "fats", unit: "g", dv: null, dp: 2,
    why: "Fats with more than one double bond, including both of the essential fatty acids. They oxidise readily with heat and light, which is why cold-pressed seed oils need more careful handling." },
  1258: { id: "satfat", label: "Saturated fat", group: "macro", unit: "g", dv: 20, dp: 2,
    why: "The fraction with no double bonds, solid at room temperature. Plant foods are generally low in it, coconut and palm being the exceptions, and it is the fraction dietary guidance asks people to limit." },
```

- [ ] **Step 4: Dry-run the re-pull and read the numbers before writing anything**

Run:
```bash
node tools/usda.mjs pull 1404 1316 1275 1268 1292 1293 1263 1265 1266 1258 --dry-run
```

Expected, and check each one:
- `1030` values identical, `164` changed, `24` gaps filled
- **`20` existing figures kept**, listed as Amaranth, Soy milk, Seitan and Nutritional yeast against `ala`, `la`, `mufa`, `pufa`, `satfat`
- **no `conflicts` section at all**, because fraction and total now come from the same row
- ends with `--dry-run: nothing written`

If any figure differs from the above, stop and report it rather than proceeding. The counts were measured against the current data and a difference means something else changed.

- [ ] **Step 5: Run it for real**

```bash
node tools/usda.mjs pull 1404 1316 1275 1268 1292 1293 1263 1265 1266 1258
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS, including the new reconciliation test. The undifferentiated `†` markers are rewritten by the run, and `build.mjs` validates every cell they name, so a stale marker fails the build rather than passing quietly.

- [ ] **Step 7: Commit**

```bash
git add tools/usda.mjs src/data/nutrients.json test/smoke.mjs index.html dist/app.js
git commit -F - <<'EOF'
Re-pull the fat group from the mapped rows

Closes the oldest open item. Six foods carried an ala-plus-LA total slightly
above their own polyunsaturated figure: Mung beans, Edamame, Lupin beans,
Natto, Buckwheat and Wholewheat pasta. Nothing withheld them because the
values predated the check that would have. They existed only because fraction
and total had been assembled from different sources at different times, so
taking both from the same reviewed row resolves all six to none.

mufa, pufa and satfat had to enter KNOWN first. They were in COLUMN_TO_USDA,
so a newly added food got them, and absent from KNOWN, so pull could not touch
them. Re-pulling only the fractions against stale totals would have left every
disagreement exactly where it was.

1030 values identical, 164 changed, 24 gaps filled, 0 blanked. The changes are
the mapped row replacing an older derivation rather than corrections of
arithmetic, which is what re-pull means and why it needed a decision: Broccoli
ALA 0.021 to 0.119, Kale 0.18 to 0.378, Wholewheat pasta pufa 0.22 to 0.574.

20 figures were kept that this run could not reproduce, all in the four foods
whose mapped row has no fatty acid analysis. Under the old rule they would
have been destroyed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: The gamma-tocopherol column

**Files:**
- Modify: `tools/usda.mjs` (one `KNOWN` entry)
- Regenerate: `src/data/nutrients.json`
- Modify: `src/app.ts:2117-2124` (derived lists) and `src/app.ts:2340-2344` (the caveat)
- Modify: `test/smoke.mjs`

**Interfaces:**
- Consumes: `andList(names: string[]): string`, `fullName(f: Food): string`, `FOODS: Food[]`, `val(f: Food, id: string): number | null` (throws on an id the dataset lacks), all already in `src/app.ts`.
- Produces: nutrient id `"gammatoc"` in group `"vitamin"`; `GAMMA_OVER_ALPHA: Food[]` in `src/app.ts`.

- [ ] **Step 1: Add the column definition**

In `tools/usda.mjs`, after the `1258` satfat entry from Task 2, add:

```js
  // Gamma-tocopherol, the vitamin E form the alpha-only column does not count.
  // 57 of the 131 foods have a figure and 43 are non-zero; the 14 measured
  // zeros are figures rather than gaps and display as such. Every food with a
  // gamma figure already has alpha, so the column never appears beside an empty
  // vitamin E cell.
  //
  // dv: null is not a shortcut. Only alpha-tocopherol carries the vitamin E
  // daily value, and the % DV view sums what it is given, so a daily value here
  // would add gamma milligrams to a target defined for alpha alone. Same
  // double-counting the carotenoid columns already avoid.
  1126: { id: "gammatoc", label: "Gamma-tocopherol", group: "vitamin", unit: "mg", dv: null, dp: 2, after: "vite",
    why: "The vitamin E form that dominates in seeds and most nuts, often several times the alpha figure beside it. It carries no daily value and the body excretes it faster, so it is not counted as vitamin E, but it is not nothing either." },
```

- [ ] **Step 2: Pull it**

```bash
node tools/usda.mjs pull 1126 --dry-run
```

Expected: `+ column gammatoc (Gamma-tocopherol) at 39`, then `57 values filled, 74 left as "no data"`. No preserved figures, because the column is new and every cell starts empty.

Then for real:

```bash
node tools/usda.mjs pull 1126
```

- [ ] **Step 3: Write the failing test**

Append to `test/smoke.mjs`:

```js
await test("the methodology names the gamma-over-alpha foods from the data", async () => {
  await withPage(async page => {
    // The hand-written version of this caveat named four foods and the data
    // says eighteen. It omitted pistachios at 20.41 mg gamma against 2.86 mg
    // alpha, which is not a marginal case. Prose describing the data derives
    // from the data, and this one could not until the column existed.
    const names = await page.evaluate(() => {
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const a = at("vite"), g = at("gammatoc");
      return DATA.foods
        .filter(f => typeof f.v[a] === "number" && typeof f.v[g] === "number" && f.v[g] > f.v[a])
        .map(f => f.name);
    });
    assert(names.length > 4, `expected more than the four the old prose named, got ${names.length}`);
    assert(names.includes("Pistachios"), "pistachios must be in the computed list");

    await page.click('[data-dlg="meth"]');
    const text = (await page.locator("#dlgB").textContent()).replace(/\s+/g, " ");
    for (const n of names) assert(text.includes(n), `food with more gamma than alpha not named: ${n}`);
    // The count is stated, and stated from the data rather than as a literal.
    assert(text.includes(`${names.length} of these foods`),
      `expected the caveat to state the count ${names.length}`);
  });
});

await test("gamma-tocopherol withholds a figure USDA never measured", async () => {
  await withPage(async page => {
    // Same rule as every other column: a food with no measurement reads n/a
    // rather than 0.00, which would be indistinguishable from the 14 foods
    // whose measured gamma really is zero.
    const { unmeasured, measuredZero } = await page.evaluate(() => {
      const g = DATA.nutrients.findIndex(n => n.id === "gammatoc");
      return { unmeasured: DATA.foods.filter(f => f.v[g] === null).length,
               measuredZero: DATA.foods.filter(f => f.v[g] === 0).length };
    });
    assert(unmeasured > 0 && measuredZero > 0,
      `expected both kinds, got ${unmeasured} unmeasured and ${measuredZero} measured zeros`);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm test`
Expected: FAIL on the first of the two. The Methodology text still names only four foods, so the assertion trips on the first missing name, and the count assertion trips too.

- [ ] **Step 5: Derive the list in `src/app.ts`**

After the `FLAV_IDS` block (currently around line 2130), add:

```ts
/* Foods carrying more gamma-tocopherol than alpha. Counted rather than typed
   for the reason the amino acid gap list is: the hand-written version of this
   named four foods and the table holds eighteen, having quietly gone wrong as
   foods were added. It could not derive from the data until gamma had a
   column, which is most of why the column is worth having. */
const GAMMA_OVER_ALPHA = FOODS.filter(f => {
  const a = val(f, "vite"), g = val(f, "gammatoc");
  return a !== null && g !== null && g > a;
});
```

Note: `val()` throws on an id the dataset lacks, and this runs at module-evaluation time, so a typo in either literal blanks the page rather than showing a wrong count. That is the loud-over-silent trade this project wants, and `HANDOVER.md` already records it for the two existing cases.

- [ ] **Step 6: Rewrite the caveat to use it**

Replace `src/app.ts:2340-2344`:

```
      <li><b>Vitamin E here is alpha-tocopherol alone.</b> It is the form that carries a daily value
      and the one the body holds on to, but it is not the only one in food. Most nuts and seeds
      contain more gamma-tocopherol than alpha, pumpkin seeds, pecans, walnuts and flaxseed
      especially, and none of that is counted in this column. Read it as the vitamin E your body
      will bank rather than as everything in the food with vitamin E activity.</li>
```

with:

```
      <li><b>Vitamin E here is alpha-tocopherol alone.</b> It is the form that carries a daily value
      and the one the body holds on to, but it is not the only one in food.
      ${GAMMA_OVER_ALPHA.length} of these foods contain more gamma-tocopherol than alpha:
      ${andList(GAMMA_OVER_ALPHA.map(fullName))}. None of that counts towards the vitamin E
      column, which is why gamma has a column of its own beside it. Read vitamin E as the amount
      your body will bank rather than as everything in the food with vitamin E activity.</li>
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: PASS, both new tests included.

- [ ] **Step 8: Commit**

```bash
git add tools/usda.mjs src/data/nutrients.json src/app.ts test/smoke.mjs index.html dist/app.js
git commit -F - <<'EOF'
Add gamma-tocopherol, and derive the vitamin E caveat from it

57 of 131 foods have a figure, 43 non-zero. It reframes the vitamin E column
rather than extending it: pumpkin seeds are 35.1 mg gamma against 2.18 alpha,
pecans 24.44 against 1.4, walnuts 20.83 against 0.7. Every food with a gamma
figure already has alpha, so the column never appears on its own.

No daily value, for the reason the carotenoids have none. Only alpha carries
the vitamin E DV and the % DV view sums what it is given, so a daily value
here would count gamma milligrams against a target defined for alpha.

The column also makes an existing error fixable. The Methodology dialog said
"most nuts and seeds contain more gamma-tocopherol than alpha, pumpkin seeds,
pecans, walnuts and flaxseed especially". The table holds eighteen such foods,
not four, and the missing ones are not marginal: pistachios are 20.41 against
2.86, and pine nuts, Brazil nuts, cashews and edamame are all absent from the
list too. That is prose describing the data that did not derive from it, which
this project treats as a defect, and it could not derive from it before
because the figure was not in the table. It does now, and a test asserts the
computed list rather than the wording.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: The phytosterol column

**Files:**
- Modify: `tools/usda.mjs` (one `KNOWN` entry)
- Regenerate: `src/data/nutrients.json`
- Modify: `src/app.ts` (a derived list and a new caveat)
- Modify: `test/smoke.mjs`

**Interfaces:**
- Consumes: `andList`, `FOODS`, `val`, `fullName` as in Task 3.
- Produces: nutrient id `"phytosterols"` in group `"plant"`; `STEROL_EMPTY_CATS: string[]` in `src/app.ts`.

- [ ] **Step 1: Add the column definition**

In `tools/usda.mjs`, after the `1122` lycopene entry (currently ends line 85), add:

```js
  // Phytosterols. This reverses a recorded decision, so the reasoning is worth
  // keeping: the objection on file was that SR Legacy reached "8 to 14" of
  // these foods, which was wrong. It reaches 25, all non-zero, the same
  // coverage as anthocyanidins, which shipped.
  //
  // The real limit is which 25. Sesame at 714 mg, sunflower at 534 and
  // pistachios at 214 dominate it, while almonds, walnuts and avocado have no
  // figure at all, and four whole categories have none: legumes, soy, grains
  // and algae. Sorting by this column therefore ranks foods partly by who USDA
  // assayed. That is true of the flavonoid columns too, and the answer is the
  // same: ship the data and state the limit on the page rather than withhold it.
  //
  // No daily value exists for phytosterols at all, so dv is null rather than
  // omitted for a double-counting reason.
  1283: { id: "phytosterols", label: "Phytosterols", group: "plant", unit: "mg", dv: null, dp: 0, after: "flavonols",
    why: "Plant cholesterol analogues that block some dietary cholesterol from being absorbed. Seeds and nuts carry by far the most, and USDA has assayed too few foods for this column to be read as a ranking." },
```

- [ ] **Step 2: Pull it**

```bash
node tools/usda.mjs pull 1283 --dry-run
```

Expected: `+ column phytosterols (Phytosterols) at 67`, then `25 values filled, 106 left as "no data"`.

Then for real:

```bash
node tools/usda.mjs pull 1283
```

- [ ] **Step 3: Write the failing test**

Append to `test/smoke.mjs`:

```js
await test("the phytosterol caveat names the categories it is silent on", async () => {
  await withPage(async page => {
    // 25 of 131, and the gaps are not scattered: four whole categories have no
    // figure at all. Naming them from the data is the honest version of "this
    // column ranks foods partly by who was assayed", and it cannot drift the
    // way the hand-written vitamin E list did.
    const { empty, filled, missingRich } = await page.evaluate(() => {
      const at = DATA.nutrients.findIndex(n => n.id === "phytosterols");
      const cats = [...new Set(DATA.foods.map(f => f.cat))];
      return {
        empty: cats.filter(c => DATA.foods.filter(f => f.cat === c)
          .every(f => f.v[at] === null)),
        filled: DATA.foods.filter(f => f.v[at] !== null).length,
        missingRich: DATA.foods
          .filter(f => (f.cat === "Nuts" || f.cat === "Seeds") && f.v[at] === null)
          .map(f => f.name),
      };
    });
    assert(empty.length >= 4, `expected at least four empty categories, got ${empty.join(", ")}`);
    assert(filled === 25, `expected 25 foods with a figure, got ${filled}`);
    // The two the old README singled out by hand. They must come out of the
    // data here, not out of a literal in the prose.
    assert(missingRich.includes("Almonds") && missingRich.includes("Walnuts"),
      `expected almonds and walnuts among the unassayed nuts, got ${missingRich.join(", ")}`);

    await page.click('[data-dlg="meth"]');
    const text = (await page.locator("#dlgB").textContent()).replace(/\s+/g, " ");
    for (const c of empty) assert(text.includes(c), `category with no figure not named: ${c}`);
    for (const n of missingRich) assert(text.includes(n), `unassayed nut or seed not named: ${n}`);
    assert(text.includes(`${filled} of these foods`),
      `expected the caveat to state the count ${filled}`);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm test`
Expected: FAIL. There is no phytosterol caveat in the dialog yet, so the first category name assertion trips.

- [ ] **Step 5: Derive the list in `src/app.ts`**

After the `GAMMA_OVER_ALPHA` block from Task 3, add:

```ts
/* Categories with no phytosterol figure anywhere in them. The column reaches
   25 of the 131 foods and the gaps are not scattered: four entire categories
   are empty, which is a fairer statement of the limit than naming three foods
   and a truer one than a coverage count on its own. */
const STEROL_EMPTY_CATS = [...new Set(FOODS.map(f => f.cat))]
  .filter(c => FOODS.every(f => f.cat !== c || val(f, "phytosterols") === null));
const STEROL_FOODS = FOODS.filter(f => val(f, "phytosterols") !== null);
/* The unassayed nuts and seeds, named from the data rather than typed. The
   README picked out almonds, walnuts and avocado by hand; the table holds
   fifteen such nuts and seeds, and a hand-picked three is the same defect as
   the vitamin E list two caveats up. */
const STEROL_MISSING_RICH = FOODS.filter(f =>
  (f.cat === "Nuts" || f.cat === "Seeds") && val(f, "phytosterols") === null);
```

- [ ] **Step 6: Add the caveat**

In the `<h4>Known caveats</h4>` list in `src/app.ts`, immediately after the vitamin E caveat rewritten in Task 3, add:

```
      <li><b>Phytosterols are measured for a minority of these foods.</b> USDA has a figure for
      ${STEROL_FOODS.length} of them and none at all for anything in
      ${andList(STEROL_EMPTY_CATS)}. Even among the nuts and seeds, where phytosterols
      concentrate, ${STEROL_MISSING_RICH.length} have no figure:
      ${andList(STEROL_MISSING_RICH.map(fullName))}. Read the column as how much was found in
      the foods that were tested, never as a ranking: sesame and sunflower seeds sit on top
      partly because they are among the few that were assayed at all.</li>
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add tools/usda.mjs src/data/nutrients.json src/app.ts test/smoke.mjs index.html dist/app.js
git commit -F - <<'EOF'
Add phytosterols, reversing a recorded no

The reason on file was wrong twice. README.md and HANDOVER.md both said SR
Legacy reached "8 to 14" of these foods; the handover corrected that to 24.
Measured against the mapped rows it is 25, all non-zero, the same coverage as
anthocyanidins, which shipped.

The real objection stands and is now on the page rather than only in a design
doc. Sesame at 714 mg, sunflower at 534 and pistachios at 214 dominate the
column, almonds, walnuts and avocado have no figure at all, and four entire
categories have none: legumes, soy, grains and algae. Sorting by it ranks
foods partly by who USDA assayed.

That is equally true of the flavonoid columns, and the answer here is the one
this project already gave there: ship the data and state the limit. The
caveat computes the empty categories and the coverage count from the table, so
it cannot drift the way the hand-written vitamin E list did.

No daily value, because none exists for phytosterols.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: The documentation

**Files:**
- Modify: `README.md`
- Modify: `HANDOVER.md`

**Interfaces:**
- Consumes: everything from Tasks 1 to 4. Nothing consumes this.

- [ ] **Step 1: Find every claim this work falsifies**

Run:

```bash
grep -n "8 to 14\|1283\|phytosterol\|Phytosterol" README.md HANDOVER.md
grep -n "gamma-tocopherol\|Gamma-tocopherol" README.md HANDOVER.md
grep -n "66 nutrients\|x 66\|110 tests" README.md HANDOVER.md
```

Every hit is either a correction or a count that has moved. There are now **68 nutrients** (66 plus gamma-tocopherol and phytosterols) and the test count has risen by the four browser tests plus the three tool tests.

- [ ] **Step 2: Correct the phytosterol reasoning in `README.md`**

The bullet at `README.md:639-649` sits in the list of things deliberately left out, and phytosterols are no longer one of them. **Delete it in full**, from `- **Phytosterols**, but not for the reason recorded here until now.` through `do not re-derive the 8 to 14.`

In its place, in the section describing the plant compounds group, add:

```markdown
**Phytosterols shipped, reversing a decision recorded in this file.** The
reason on file was wrong twice: first that SR Legacy "reaches only 8 to 14 of
these foods", then 24. It reaches **25**, every one non-zero, the same coverage
anthocyanidins has.

The objection was never really coverage, though. It is *which* 25. Sesame at
714 mg, sunflower seeds at 534 and pistachios at 214 tower over a long tail of
fruit and vegetables at 2 to 18 mg. Fifteen of the nuts and seeds have no
figure at all, almonds and walnuts among them, and four whole categories are
empty: legumes, soy, grains, and algae and yeast. Sorting by this column ranks
foods partly by which of them USDA happened to assay.

That objection is real and it did not turn out to be a reason to withhold the
data, because it is equally true of the flavonoid columns, which shipped. It is
a reason to say so on the page, which the Methodology dialog now does, counting
the empty categories and the unassayed nuts from the table rather than naming
them by hand. Withholding a measured figure because its neighbours are missing
is not something this project does anywhere else.
```

Also update the "Phytic acid, isoflavones and proanthocyanidins" bullet at `README.md:635-638`: phytosterols are no longer grouped with them, and proanthocyanidins now have a measured finding rather than an assumption. SR Legacy defines the seven proanthocyanidin ids and carries a value for none of these 131 foods, so the separate PA02 release is the only route.

- [ ] **Step 3: Record the never-blank rule in `README.md`**

Under the section describing `tools/usda.mjs`, alongside the existing note that `pull` refuses to write a value contradicting a total. The rule, why it exists (the four foods), and that `test/tools.mjs` holds it.

- [ ] **Step 4: Update `HANDOVER.md`**

- Add a session entry for 2026-08-07 covering all four tasks.
- **Remove three items from the open list**: the fat re-pull, gamma-tocopherol, and the phytosterol reasoning. Each is now done rather than pending.
- **Leave the remaining open items**, and add the two loose ends deferred to the next spec so they are not lost: the sidebar scrolling nuisance and `slugify` written in five places.
- Note that proanthocyanidins now have a measured finding attached: SR Legacy carries the seven ids and **zero values for any of these 131 foods**, so the separate PA02 release is the only route and it has its own spec.

- [ ] **Step 5: Verify the counts are true before writing them**

Run:

```bash
node -e 'const d=require("./src/data/nutrients.json");
console.log("nutrients:", d.nutrients.length, "foods:", d.foods.length);'
npm test 2>&1 | tail -5
```

Use the numbers this prints. Do not carry forward a count from this plan; the plan was written before the work ran.

- [ ] **Step 6: Commit**

```bash
git add README.md HANDOVER.md
git commit -F - <<'EOF'
Document the re-pull, the two columns and the corrected phytosterol reasoning

Three items leave the open list. The phytosterol entry is the one worth
reading: it had the wrong coverage figure twice, "8 to 14" and then 24, and
the correct 25 is what made it worth reconsidering at all. The column shipped,
so the README says the decision was reversed rather than letting it appear as
though it had always been intended.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Verification

After Task 5, all of the following must hold. Run them; do not assume.

```bash
npm test                      # tool tests then browser tests, all passing
git status --short            # clean: index.html and dist/app.js committed
node tools/usda.mjs           # usage line, exit 1: the CLI guard did not break dispatch
```

- `src/data/nutrients.json` has **68 nutrients** and 131 foods.
- The reconciliation test passes for all 131 foods, so the six standing conflicts are gone.
- Amaranth, Soy milk, Seitan and Nutritional yeast still show figures for `ala`, `la`, `mufa`, `pufa` and `satfat`. This is the never-blank rule visible on the page; check it directly rather than trusting the pull's summary.

## Deliberately not in this plan

- **Proanthocyanidins**, the sidebar scroll nuisance and the `slugify` duplication. Next spec.
- **Estimated rows** for Romanesco, freekeh and cavolo nero. They would be the first invented figures in the table.
- **Beta and delta tocopherol, the four tocotrienols, and the phytosterol fractions** (beta-sitosterol, campesterol, stigmasterol), all of which SR Legacy carries. Sparser than what shipped, and they would bury it.
- **A CSV export column change** beyond the two new columns appearing automatically, and **no change to `--fill-gaps`, the conflict check, or the undifferentiated fallback**.
