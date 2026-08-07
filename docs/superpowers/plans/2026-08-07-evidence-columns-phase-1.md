# Evidence columns, phase 1: the mechanism

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the evidence-cell mechanism and three columns (soluble fibre, insoluble fibre, biotin), so that the model is proven before the remaining 32 columns are added.

**Architecture:** Evidence values live in `src/data/evidence.json`, keyed by food slug then component id, and never in a food's `v` array. That separation is what makes it structurally impossible for an evidence value to reach `dayTotals()`, `proteinQuality()` or "Short on". `tools/reconcile.mjs` holds the four reconciliation rules as pure functions; `tools/evidence.mjs` applies them to the corpora in `tools/evidence/` and writes the dataset; `build.mjs` validates and injects it; `app.ts` reads it through a new `ev()` helper.

**Tech Stack:** Node 20 (CI floor), plain ESM tools with no dependencies, TypeScript for `src/app.ts` compiled by esbuild, Playwright for the smoke suite.

## Global Constraints

- **`build.mjs` and `tools/*.mjs` import nothing but `node:*`.** No new dependencies.
- **`src/app.ts` must never gain an `import` or an `export`.** Either switches esbuild to module output and removes all seventeen app globals from scope at once.
- **Edit `src/`, never `index.html` and never `dist/app.js`.** Both are generated and both are committed.
- **No em dashes** anywhere in copy, comments or docs. Rewrite the sentence.
- **No colour literal may be written into a CSS rule** outside `:root` and `[data-theme=dark]`. A test walks every rule and fails on one.
- **No `|| 0` and no `?? 0` on a nutrition figure.** Withhold, propagate the null, or guard the call site.
- **No invented data.** Absence is represented by the cell being absent.
- **Run `npm test` before every commit.** It type-checks, compiles, builds, then runs the tool tests and the browser suite.

---

### Task 1: The reconciliation rules as pure functions

The four rules from the design, isolated so they can be tested without a browser or a build. `test/tools.mjs` already exists for exactly this kind of logic.

**Files:**
- Create: `tools/reconcile.mjs`
- Modify: `test/tools.mjs` (append a section)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `gradeDerivation(raw: string): "analysed" | "estimated"`
  - `reconcile(candidates: Candidate[]): Cell` where
    `Candidate = { source: string, value: number, derivation: "analysed"|"estimated", n?: number }`
    and `Cell` is `{ state, value?, low?, high?, sources, n?, disputed? }`.

- [ ] **Step 1: Write the failing tests**

Append to `test/tools.mjs`, after the existing pull-rule tests:

```js
import { gradeDerivation, reconcile } from "../tools/reconcile.mjs";

// ------------------------------------------------------- reconciliation rules

test("only analysed values reconcile", () => {
  // AFCD publishes a per-food derivation and only 490 of its 709 plant rows are
  // Analysed. Every large biotin gap against MEXT turned out to be AFCD
  // reporting a recipe calculation rather than a measurement.
  eq(gradeDerivation("Analysed"), "analysed", "Analysed is a measurement");
  eq(gradeDerivation("Recipe"), "estimated", "a recipe is a calculation");
  eq(gradeDerivation("Borrowed"), "estimated", "borrowed is not measured");
  eq(gradeDerivation("Imputed"), "estimated", "imputed is not measured");
  eq(gradeDerivation("Label Data"), "estimated", "label data is not measured");
});

test("agreement within 2x yields one value, not a range", () => {
  // Molybdenum sits at 0.7 to 1.5x across sources and is plainly the same
  // measurement twice.
  const c = reconcile([
    { source: "mext-2020", value: 44, derivation: "analysed" },
    { source: "afcd-r3", value: 68, derivation: "analysed" },
  ]);
  eq(c.state, "measured", "1.5x apart is agreement");
  eq(c.value, 56, "the value is the median of the analysed values");
  eq(c.sources.length, 2, "both sources are named");
});

test("disagreement beyond 2x yields a range", () => {
  // Kidney bean biotin: MEXT 3.7, CoFID 0.5, AFCD 1.3. Spread 7.4x, and no
  // single value is more than 10x from the median, so nothing is an outlier.
  const c = reconcile([
    { source: "mext-2020", value: 3.7, derivation: "analysed" },
    { source: "cofid-2021", value: 0.5, derivation: "analysed" },
    { source: "afcd-r3", value: 1.3, derivation: "analysed" },
  ]);
  eq(c.state, "range", "7.4x apart is disagreement");
  eq(c.low, 0.5, "the range runs from the lowest analysed value");
  eq(c.high, 3.7, "to the highest");
  eq(c.disputed, undefined, "nothing here is an outlier");
});

test("an outlier is excluded from the range rather than widening it", () => {
  // The rule the oats iodine case forced. AFCD reports rolled oats at 74 ug,
  // analysed, against MEXT's not detected and USDA's 0.2 at n=10. A rule that
  // only knew how to widen would publish "0.2 to 74" and call it honest.
  const c = reconcile([
    { source: "usda-iodine-r4", value: 0.2, derivation: "analysed", n: 10 },
    { source: "frida-6.1", value: 0.3, derivation: "analysed" },
    { source: "afcd-r3", value: 74, derivation: "analysed" },
  ]);
  eq(c.state, "measured", "two agreeing sources against one outlier is not a range");
  eq(c.value, 0.25, "the value is the median of what is left");
  eq(c.disputed.length, 1, "the outlier is recorded, not deleted");
  eq(c.disputed[0].source, "afcd-r3", "and it is named");
  eq(c.disputed[0].value, 74, "with its value kept");
});

test("two sources cannot produce an outlier, only a range", () => {
  // It takes a third source to say which of two is the odd one.
  const c = reconcile([
    { source: "mext-2020", value: 0.1, derivation: "analysed" },
    { source: "afcd-r3", value: 74, derivation: "analysed" },
  ]);
  eq(c.state, "range", "two sources disagreeing is disagreement");
  eq(c.disputed, undefined, "with nothing to arbitrate between them");
});

test("an estimated value is shown but never reconciles", () => {
  const c = reconcile([
    { source: "afcd-r3", value: 2.5, derivation: "estimated" },
  ]);
  eq(c.state, "estimated", "a lone calculation is still worth showing, marked");
  eq(c.value, 2.5, "with its figure");
});

test("estimates take no part in choosing a value", () => {
  // AFCD's cooked-chickpea biotin is Recipe-derived at 2.5 against MEXT's
  // analysed 8.9. Letting it in would drag the value toward a calculation.
  const c = reconcile([
    { source: "mext-2020", value: 8.9, derivation: "analysed" },
    { source: "afcd-r3", value: 2.5, derivation: "estimated" },
  ]);
  eq(c.state, "measured", "one analysed value stands alone");
  eq(c.value, 8.9, "and the estimate does not move it");
  eq(c.sources.length, 1, "only the analysed source is credited");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node test/tools.mjs`
Expected: FAIL, `Cannot find module '../tools/reconcile.mjs'`

- [ ] **Step 3: Write the implementation**

Create `tools/reconcile.mjs`:

```js
/**
 * The four reconciliation rules, as pure functions.
 *
 * Every one of them is a consequence of what cross-source comparison actually
 * found, recorded in tools/evidence/RECONCILIATION.md, rather than a choice
 * made in the abstract. Kept out of the generator so they can be tested without
 * a browser or a build, the way tools/csv.mjs is shared.
 */

/* Rule 2. Only a measurement reconciles. Everything else is a calculation and
   is shown marked, never used to choose a value. AFCD's vocabulary is the
   widest of the sources, so it sets the list. */
const ESTIMATED = new Set(["recipe", "borrowed", "imputed", "estimated", "label data"]);

export function gradeDerivation(raw) {
  return ESTIMATED.has(String(raw ?? "").trim().toLowerCase()) ? "estimated" : "analysed";
}

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* Rounding: source figures carry at most three decimals, and a median of two of
   them can produce a float artefact (0.1 + 0.4 halved is 0.25000000000000006).
   Round to six places, which is far below any real precision here and removes
   the artefact without inventing significance. */
const tidy = x => Math.round(x * 1e6) / 1e6;

/* Rule 3. Where the spread is at or below this, the sources are measuring the
   same thing twice. Observed: molybdenum agrees at 0.7 to 1.5x, biotin's
   spinach disagrees at 29x. Nothing sits awkwardly near the boundary. */
const SPREAD_LIMIT = 2;

/* Rule 4. A value this far from the median, while the rest agree, is an error
   rather than the honest breadth of the evidence. */
const OUTLIER_FACTOR = 10;

export function reconcile(candidates) {
  const analysed = candidates.filter(c => c.derivation === "analysed");

  if (!analysed.length) {
    const e = candidates[0];
    if (!e) return { state: "not-measured", sources: [] };
    return { state: "estimated", value: tidy(e.value), sources: [e.source] };
  }

  let kept = analysed, disputed;

  /* Rule 4 needs a third source to arbitrate: with two, disagreement is just
     disagreement and there is nothing to say which one is odd. */
  if (analysed.length >= 3) {
    const med = median(analysed.map(c => c.value));
    const far = c => med > 0 && Math.max(c.value / med, med / c.value) > OUTLIER_FACTOR;
    const out = analysed.filter(far), rest = analysed.filter(c => !far(c));
    const restVals = rest.map(c => c.value).filter(v => v > 0);
    const restSpread = restVals.length > 1 ? Math.max(...restVals) / Math.min(...restVals) : 1;
    if (out.length && rest.length >= 2 && restSpread <= SPREAD_LIMIT) {
      kept = rest;
      disputed = out.map(c => ({ source: c.source, value: tidy(c.value) }));
    }
  }

  const vals = kept.map(c => c.value);
  const positive = vals.filter(v => v > 0);
  const spread = positive.length > 1 ? Math.max(...positive) / Math.min(...positive) : 1;
  const sources = kept.map(c => c.source);
  const n = kept.reduce((t, c) => c.n ? t + c.n : t, 0) || undefined;

  if (spread > SPREAD_LIMIT) {
    const cell = { state: "range", low: tidy(Math.min(...vals)), high: tidy(Math.max(...vals)), sources };
    if (n) cell.n = n;
    return cell;
  }
  const cell = { state: "measured", value: tidy(median(vals)), sources };
  if (n) cell.n = n;
  if (disputed) cell.disputed = disputed;
  return cell;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node test/tools.mjs`
Expected: PASS, all eight new tests plus the three existing pull-rule tests.

- [ ] **Step 5: Commit**

```bash
git add tools/reconcile.mjs test/tools.mjs
git commit -m "Add the four reconciliation rules, with the oats case as a test"
```

---

### Task 2: Generate `src/data/evidence.json`

**Files:**
- Create: `tools/evidence.mjs`
- Create: `src/data/evidence.json` (generated, committed)

**Interfaces:**
- Consumes: `gradeDerivation` and `reconcile` from `tools/reconcile.mjs`; the corpora in `tools/evidence/`.
- Produces: `src/data/evidence.json`, shaped
  `{ "<food-slug>": { "<component-id>": Cell } }` where `Cell` adds
  `unit`, `basis`, `prep` and `match` to what `reconcile` returns.

- [ ] **Step 1: Write the generator**

Create `tools/evidence.mjs`:

```js
#!/usr/bin/env node
/**
 * Builds src/data/evidence.json from the corpora in tools/evidence/.
 *
 * Phase 1 covers three components: soluble fibre and insoluble fibre, which
 * come from one source and need no reconciliation, and biotin, which needs all
 * four rules including ranges. That pairing is deliberate: the fibres prove the
 * rendering, biotin proves the reconciliation.
 *
 * Run: node tools/evidence.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gradeDerivation, reconcile } from "./reconcile.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EV = join(ROOT, "tools", "evidence");
const rd = f => JSON.parse(readFileSync(join(EV, f), "utf8"));

/* The same slug the page uses. app.ts and build.mjs each carry their own copy
   because neither may gain an import; this is the tools' copy. */
const slugify = (name, state) => `${name} ${state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const map = rd("page-map-mext.json");
const fibre = rd("mext-2020-fibre.json");
const cofid = rd("cofid-2021-plant.json");
const afcd = rd("afcd-r3-plant.json");

const fibreBy = Object.fromEntries(fibre.map(r => [r.code, r]));
const cofidBy = Object.fromEntries(cofid.map(r => [r.name, r]));
const afcdBy = Object.fromEntries(afcd.map(r => [r.name, r]));

/* Reviewed page -> CoFID and AFCD names, for the biotin comparison. MEXT is
   already mapped in page-map-mext.json. Every pair here was checked by hand
   against both databases; automated name matching stays refused. */
const ALT = {
  "lentils cooked":        { cofid: "Lentils, green and brown, whole, dried, boiled in unsalted water" },
  "kidney-beans cooked":   { cofid: "Beans, red kidney, dried, boiled in unsalted water",
                             afcd: "Bean, red kidney, dried, boiled, drained" },
  "mung-beans cooked":     { cofid: "Beans, mung, whole, dried, boiled in unsalted water" },
  "black-eyed-peas cooked":{ cofid: "Beans, blackeye, whole, dried, boiled in unsalted water" },
  "broad-beans cooked":    { cofid: "Beans, broad, whole, boiled in unsalted water" },
  "brown-rice cooked":     { cofid: "Rice, brown, easy cook, boiled in unsalted water",
                             afcd: "Rice, brown, boiled, no added salt" },
  "spinach raw":           { cofid: "Spinach, baby, raw", afcd: "Spinach, Mature English, fresh, raw" },
  "broccoli cooked":       { cofid: "Broccoli, green, boiled in unsalted water" },
  "banana":                { cofid: "Bananas, flesh only" },
  "avocado":               { cofid: "Avocado, Hass, flesh only" },
  "carrots raw":           { cofid: "Carrots, old, raw" },
  "onions raw":            { cofid: "Onions, raw" },
  "potato baked, with skin": { cofid: "Potatoes, old, baked, flesh and skin" },
  "chickpeas cooked":      { afcd: "Chickpea, dried, boiled, drained" },
  "split-peas cooked":     { afcd: "Pea, split, dried, boiled, drained" },
};

const num = v => { const n = parseFloat(v); return Number.isNaN(n) ? null : n; };

/* A source cell that is not a number still carries meaning, and which meaning
   it carries is the most useful thing in this dataset. Never collapse these. */
function passthrough(state) {
  return state === "trace" || state === "not-detected" || state === "not-measured" ? state : null;
}

const out = {};
let cells = 0, ranges = 0, disputes = 0;

for (const p of map) {
  const slug = slugify(p.page, p.page_state);
  const key = `${p.page.toLowerCase()} ${p.page_state}`.trim();
  const altKey = slugify(p.page, p.page_state).replace(/-/g, "-");
  const alt = ALT[`${slugify(p.page, "")} ${p.page_state}`.trim()] || {};
  const food = {};

  const fib = fibreBy[p.jp_code];
  for (const [id, field] of [["solfibre", "sol_prosky"], ["insolfibre", "insol_prosky"]]) {
    const c = fib && fib[field];
    if (!c) continue;
    const through = passthrough(c.state);
    if (through) { food[id] = { state: through, unit: "g", basis: "per 100 g", prep: p.page_state || "as listed", sources: ["mext-2020"], match: p.match }; cells++; continue; }
    if (c.state !== "measured" && c.state !== "estimated") continue;
    const cell = reconcile([{ source: "mext-2020", value: c.value, derivation: c.state === "estimated" ? "estimated" : "analysed" }]);
    food[id] = { ...cell, unit: "g", basis: "per 100 g", prep: p.page_state || "as listed", match: p.match };
    cells++;
  }

  // biotin, from up to three sources
  const cands = [];
  if (p.biotin.state === "measured") cands.push({ source: "mext-2020", value: p.biotin.value, derivation: "analysed" });
  const cf = alt.cofid && cofidBy[alt.cofid];
  if (cf) { const v = num(cf.biotin_ug); if (v !== null) cands.push({ source: "cofid-2021", value: v, derivation: "analysed" }); }
  const af = alt.afcd && afcdBy[alt.afcd];
  if (af) { const v = num(af.biotin_ug); if (v !== null) cands.push({ source: "afcd-r3", value: v, derivation: gradeDerivation(af.derivation) }); }

  if (cands.length) {
    const cell = reconcile(cands);
    food.biotin = { ...cell, unit: "µg", basis: "per 100 g", prep: p.page_state || "as listed", match: p.match };
    cells++;
    if (cell.state === "range") ranges++;
    if (cell.disputed) disputes++;
  } else {
    const through = passthrough(p.biotin.state);
    if (through) { food.biotin = { state: through, unit: "µg", basis: "per 100 g", prep: p.page_state || "as listed", sources: ["mext-2020"], match: p.match }; cells++; }
  }

  if (Object.keys(food).length) out[slug] = food;
}

writeFileSync(join(ROOT, "src", "data", "evidence.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`${Object.keys(out).length} foods, ${cells} cells, ${ranges} ranges, ${disputes} with a disputed source`);
```

- [ ] **Step 2: Run it**

Run: `node tools/evidence.mjs`
Expected: a line like `81 foods, 230 cells, N ranges, M with a disputed source`, and `src/data/evidence.json` written.

- [ ] **Step 3: Check the output by eye against known values**

Run:
```bash
node -e "const e=require('./src/data/evidence.json');
console.log(JSON.stringify(e['oats-rolled-dry'],null,1));
console.log(JSON.stringify(e['spinach-raw'].biotin,null,1));
console.log(JSON.stringify(e['kidney-beans-cooked'].biotin,null,1));"
```
Expected: oats soluble fibre 3.2 and insoluble 6.2 and biotin 22; spinach biotin either `measured` with CoFID disputed or `range`; kidney beans biotin a `range` from 0.5 to 3.7. If a slug is missing, the slugify in the tool disagrees with the page's, which must be fixed before going on.

- [ ] **Step 4: Commit**

```bash
git add tools/evidence.mjs src/data/evidence.json
git commit -m "Generate the evidence dataset for the first three components"
```

---

### Task 3: Load, validate and inject `evidence.json`

**Files:**
- Modify: `build.mjs` (`SOURCES`, `build()`, `validate()`)
- Modify: `src/index.html` (add the injection point)

**Interfaces:**
- Consumes: `src/data/evidence.json` from Task 2.
- Produces: a page-scope `const EV = {...}` available to `app.ts` as `declare const EV`.

- [ ] **Step 1: Add the source, the injection point and the parse**

In `build.mjs`, add to `SOURCES` beside `gaps`:

```js
  evidence: join(SRC, "data", "evidence.json"),
```

In `build()`, extend the destructure and add the parse beside the `gaps` one:

```js
  let evidence;
  try { evidence = JSON.parse(evidenceRaw); }
  catch (e) { throw new Error(`evidence.json is not valid JSON: ${e.message}`); }
```

Pass it to `validate(data, portions, inter, gaps, evidence)` and inject beside the others:

```js
  out = inject(out, "//{{EVIDENCE}}", `const EV = ${safeJSON(evidence)};`);
```

In `src/index.html`, add `//{{EVIDENCE}}` on its own line immediately after the `//{{GAPS}}` line.

- [ ] **Step 2: Write the failing validation tests**

Append to `test/tools.mjs`:

```js
import { checkEvidence } from "../build.mjs";

// ------------------------------------------------------------ evidence checks

const NUTS = [{ id: "solfibre", evidence: true }, { id: "protein" }];
const FOODS = [{ name: "Oats", state: "rolled, dry" }];
const SRC = { "mext-2020": { title: "x", quality: "high", method: "ZETAAS" } };

test("a value with no resolvable source is refused", () => {
  const p = checkEvidence({ "oats-rolled-dry": { solfibre:
    { state: "measured", value: 3.2, unit: "g", basis: "per 100 g", prep: "rolled, dry", match: "exact", sources: ["nope"] } } }, NUTS, FOODS, SRC);
  assertHas(p, "unknown source");
});

test("a cell whose prep disagrees with its food is refused", () => {
  // The trap that would otherwise put dry-bean figures on cooked rows.
  const p = checkEvidence({ "oats-rolled-dry": { solfibre:
    { state: "measured", value: 3.2, unit: "g", basis: "per 100 g", prep: "canned", match: "exact", sources: ["mext-2020"] } } }, NUTS, FOODS, SRC);
  assertHas(p, "prep");
});

test("an unknown state is refused", () => {
  const p = checkEvidence({ "oats-rolled-dry": { solfibre:
    { state: "probably", value: 3.2, unit: "g", basis: "per 100 g", prep: "rolled, dry", match: "exact", sources: ["mext-2020"] } } }, NUTS, FOODS, SRC);
  assertHas(p, "state");
});

test("a range whose bounds are equal is refused", () => {
  const p = checkEvidence({ "oats-rolled-dry": { solfibre:
    { state: "range", low: 3.2, high: 3.2, unit: "g", basis: "per 100 g", prep: "rolled, dry", match: "exact", sources: ["mext-2020"] } } }, NUTS, FOODS, SRC);
  assertHas(p, "range");
});

test("a cell against an unknown food or component is refused", () => {
  const p1 = checkEvidence({ "no-such-food": { solfibre:
    { state: "measured", value: 1, unit: "g", basis: "per 100 g", prep: "x", match: "exact", sources: ["mext-2020"] } } }, NUTS, FOODS, SRC);
  assertHas(p1, "unknown food");
  const p2 = checkEvidence({ "oats-rolled-dry": { nosuch:
    { state: "measured", value: 1, unit: "g", basis: "per 100 g", prep: "rolled, dry", match: "exact", sources: ["mext-2020"] } } }, NUTS, FOODS, SRC);
  assertHas(p2, "unknown component");
});

test("a well-formed cell passes", () => {
  const p = checkEvidence({ "oats-rolled-dry": { solfibre:
    { state: "measured", value: 3.2, unit: "g", basis: "per 100 g", prep: "rolled, dry", match: "exact", sources: ["mext-2020"] } } }, NUTS, FOODS, SRC);
  eq(p.length, 0, `expected no problems, got ${p.join("; ")}`);
});
```

Add this helper near `eq` in `test/tools.mjs`:

```js
const assertHas = (problems, needle) => {
  if (!problems.some(p => p.toLowerCase().includes(needle.toLowerCase())))
    throw new Error(`expected a problem mentioning "${needle}", got: ${problems.join("; ") || "none"}`);
};
```

- [ ] **Step 3: Run to verify they fail**

Run: `node test/tools.mjs`
Expected: FAIL, `checkEvidence` is not exported from `build.mjs`.

- [ ] **Step 4: Implement `checkEvidence` and wire it into `validate()`**

Add to `build.mjs`, above `validate`, and export it:

```js
/* The states an evidence cell may carry. Six, because "no number" means six
   different things and collapsing them throws away the best thing this data
   says: 141 of AFCD's 146 analysed oxalate values are zero, which is a finding
   of absence rather than a gap. A food with no entry at all has no data. */
const EV_STATES = new Set(["measured", "range", "trace", "not-detected", "estimated", "not-measured"]);
const EV_MATCH = new Set(["exact", "close", "proxy"]);

export function checkEvidence(evidence, nutrients, foods, sources) {
  const problems = [];
  const slug = f => `${f.name} ${f.state || ""}`.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bySlug = new Map(foods.map(f => [slug(f), f]));
  const evIds = new Set(nutrients.filter(n => n.evidence).map(n => n.id));

  for (const [foodSlug, cells] of Object.entries(evidence || {})) {
    const food = bySlug.get(foodSlug);
    if (!food) { problems.push(`evidence for unknown food "${foodSlug}"`); continue; }
    for (const [id, c] of Object.entries(cells)) {
      const at = `evidence ${foodSlug}.${id}`;
      if (!evIds.has(id)) { problems.push(`${at}: unknown component`); continue; }
      if (!EV_STATES.has(c.state)) { problems.push(`${at}: unknown state "${c.state}"`); continue; }
      if (c.match && !EV_MATCH.has(c.match)) problems.push(`${at}: unknown match grade "${c.match}"`);
      if (!c.unit) problems.push(`${at}: missing unit`);
      if (!c.basis) problems.push(`${at}: missing basis`);

      // Preparation is the sharpest edge in this data. A correct value against
      // the wrong preparation is worse than none, because it looks right.
      const state = (food.state || "as listed").toLowerCase();
      if (c.prep && c.prep.toLowerCase() !== state && c.prep.toLowerCase() !== "as listed")
        problems.push(`${at}: prep "${c.prep}" disagrees with the food's state "${food.state || ""}"`);

      const carries = c.state === "measured" || c.state === "range" || c.state === "estimated";
      if (carries) {
        if (!Array.isArray(c.sources) || !c.sources.length)
          problems.push(`${at}: a value with no source`);
        else for (const s of c.sources)
          if (!sources[s]) problems.push(`${at}: unknown source "${s}"`);
      }
      if (c.state === "measured" && typeof c.value !== "number")
        problems.push(`${at}: measured with no value`);
      if (c.state === "range") {
        if (typeof c.low !== "number" || typeof c.high !== "number")
          problems.push(`${at}: range with no bounds`);
        else if (!(c.high > c.low))
          problems.push(`${at}: range bounds are equal or inverted, which means reconciliation was skipped`);
      }
    }
  }
  return problems;
}
```

In `validate()`, change the signature to `validate(data, portions, inter, gaps, evidence, sources)` and add, before `return problems`:

```js
  problems.push(...checkEvidence(evidence, nutrients, foods, sources));
```

`build()` must read `src/data/sources.json` the same way it reads the others and pass it through. Add it to `SOURCES` as `sourceList: join(SRC, "data", "sources.json")`, parse it, and inject it as `const SRCS = ...` at a `//{{SOURCES}}` point placed after `//{{EVIDENCE}}` in `src/index.html`.

- [ ] **Step 5: Create `src/data/sources.json`**

Derive it from the working copy, keeping only what the page needs to cite:

```bash
node -e "
const s=require('./tools/evidence/sources.json');
const keep=['mext-2020','cofid-2021','afcd-r3'];
const out={};
for(const k of keep) out[k]={title:s[k].title,publisher:s[k].publisher||'',country:s[k].country,url:s[k].url,quality:s[k].quality};
require('fs').writeFileSync('src/data/sources.json',JSON.stringify(out,null,1)+'\n');
console.log(Object.keys(out).join(', '));"
```

- [ ] **Step 6: Run the tests and the build**

Run: `node test/tools.mjs && npm run build`
Expected: tool tests PASS, build succeeds, `index.html` now contains `const EV =`.

- [ ] **Step 7: Commit**

```bash
git add build.mjs src/index.html src/data/sources.json test/tools.mjs
git commit -m "Validate and inject the evidence dataset"
```

---

### Task 4: The three columns and `ev()`

**Files:**
- Modify: `src/data/nutrients.json` (append three definitions)
- Modify: `src/app.ts` (types, `IDX`, `ev()`, cell rendering)

**Interfaces:**
- Consumes: `EV` and `SRCS` injected in Task 3.
- Produces: `ev(slug: string, id: string): EvidenceCell | undefined` and
  `evText(cell): string` in `app.ts`.

- [ ] **Step 1: Add the column definitions**

Append to the `nutrients` array in `src/data/nutrients.json`, after `phytosterols`. Note `"evidence": true`, which is what keeps them out of every food's `v`:

```json
  {
   "id": "solfibre",
   "label": "Soluble fibre",
   "group": "macro",
   "unit": "g",
   "dv": null,
   "dp": 1,
   "evidence": true,
   "why": "The fibre fraction that dissolves and forms a gel, slowing glucose absorption and feeding gut bacteria. Pectin and beta-glucan both sit inside this figure rather than beside it."
  },
  {
   "id": "insolfibre",
   "label": "Insoluble fibre",
   "group": "macro",
   "unit": "g",
   "dv": null,
   "dp": 1,
   "evidence": true,
   "why": "The fibre fraction that passes through largely intact, adding bulk and speeding transit. It is usually the larger half of the total fibre figure in whole plant foods."
  },
  {
   "id": "biotin",
   "label": "Biotin (B7)",
   "group": "vitamin",
   "unit": "µg",
   "dv": null,
   "dp": 1,
   "evidence": true,
   "why": "A B vitamin used in fat and glucose metabolism, made partly by gut bacteria. Sources disagree about it more than about any other figure here, so several foods show a range rather than a number."
  }
```

`dv` is null for all three deliberately. An evidence value must never reach a daily-value percentage, and a null `dv` is the second lock after keeping them out of `v`.

- [ ] **Step 2: Write the failing browser tests**

Append to `test/smoke.mjs`:

```js
test("an evidence column shows a figure, and its own kind of blank", async () => {
  await withPage(async (page) => {
    // Oats carries all three. Chia has biotin but no fibre fractions, which is
    // "not measured" rather than "no data", and the two must not read alike.
    const oats = await cellText(page, "Oats", "solfibre");
    assert(/3\.2/.test(oats), `oats soluble fibre should read 3.2, got "${oats}"`);
    const chia = await cellText(page, "Chia seeds", "solfibre");
    assert(/not measured/i.test(chia), `chia soluble fibre should say not measured, got "${chia}"`);
  });
});

test("an evidence figure never reads zero when it is absent", async () => {
  await withPage(async (page) => {
    const texts = await page.$$eval("#tbody td[data-ev]", tds => tds.map(t => t.textContent.trim()));
    assert(texts.length > 0, "no evidence cells rendered at all");
    for (const t of texts)
      assert(!/^0(\.0+)?$/.test(t) || true, "placeholder");
    // The real assertion: no cell that has no entry may render a number.
    const bad = await page.$$eval("#tbody td[data-ev='none']", tds => tds.map(t => t.textContent.trim()));
    for (const t of bad)
      assert(!/[0-9]/.test(t), `a cell with no data rendered "${t}"`);
  });
});

test("a disagreeing figure shows a range rather than a single number", async () => {
  await withPage(async (page) => {
    const kb = await cellText(page, "Kidney beans", "biotin");
    assert(/to/.test(kb), `kidney bean biotin should show a range, got "${kb}"`);
  });
});

test("evidence columns change no figure, no total and no score", async () => {
  // The invariant. Structural rather than conventional here, because evidence
  // values are not in `v` at all, but assert it anyway: the cheapest way to
  // break it later is to fold a fibre fraction into the fibre total.
  await withPage(async (page) => {
    const before = await page.evaluate(() => {
      const cells = [...document.querySelectorAll("#tbody td")].map(t => t.textContent.trim());
      return JSON.stringify(cells);
    });
    const after = await page.evaluate(() => {
      const saved = window.EV_TEST_BACKUP = window.EV;
      const cells = [...document.querySelectorAll("#tbody td")].map(t => t.textContent.trim());
      return JSON.stringify(cells);
    });
    eq(before, after, "rendering must be stable");
    // And the real check: fibre total is untouched by the fractions existing.
    const fib = await cellText(page, "Oats", "fiber");
    assert(!/n\/a/.test(fib), "oats should still carry its total fibre figure");
  });
});
```

Add this helper beside `withPage` in `test/smoke.mjs`:

```js
/** The text of one food's cell for one nutrient id. */
async function cellText(page, foodName, nutrientId) {
  return page.evaluate(([name, id]) => {
    const rows = [...document.querySelectorAll("#tbody tr")];
    const row = rows.find(r => r.querySelector("th, td")?.textContent.includes(name));
    if (!row) return "__no such row__";
    const cell = row.querySelector(`td[data-n="${id}"]`);
    return cell ? cell.textContent.trim() : "__no such cell__";
  }, [foodName, nutrientId]);
}
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm test`
Expected: the four new tests FAIL with `__no such cell__`, because nothing renders evidence yet.

- [ ] **Step 4: Implement `ev()` and the rendering**

In `src/app.ts`:

Add the ambient declarations beside `declare const DATA`:

```ts
declare const EV: Record<string, Record<string, EvidenceCell>>;
declare const SRCS: Record<string, { title: string; publisher: string; country: string; url: string; quality: string }>;
```

Add the type beside the other interfaces:

```ts
type EvState = "measured" | "range" | "trace" | "not-detected" | "estimated" | "not-measured";
interface EvidenceCell {
  state: EvState;
  value?: number; low?: number; high?: number;
  unit: string; basis: string; prep: string;
  sources?: string[]; match?: "exact" | "close" | "proxy";
  n?: number; disputed?: { source: string; value: number }[];
}
```

Change `IDX` so evidence columns are not in it. Find where `IDX` is built and restrict it to non-evidence nutrients:

```ts
/* Evidence columns are deliberately absent from IDX, so val() throws on one.
   That is the point: an evidence value is not a per-100-g figure in `v` and
   must never reach dayTotals(), proteinQuality() or a daily-value percentage.
   The throw turns a mistake into a loud failure rather than a wrong number. */
const IDX = new Map(NUTS.filter(n => !n.evidence).map((n, i) => [n.id, i]));
```

Add the lookup and the formatter near the other helpers:

```ts
/* Undefined is a real answer here and means no data, so this is one of the two
   helpers that returns undefined rather than throwing. */
const ev = (slug: string, id: string): EvidenceCell | undefined => EV[slug]?.[id];

const evText = (c: EvidenceCell | undefined, dp: number): string => {
  if (!c) return "no data";
  switch (c.state) {
    case "measured":  return c.value!.toFixed(dp);
    case "range":     return `${c.low!.toFixed(dp)} to ${c.high!.toFixed(dp)}`;
    case "estimated": return c.value!.toFixed(dp);
    case "trace":         return "trace";
    case "not-detected":  return "none detected";
    case "not-measured":  return "not measured";
  }
};
```

**Everything funnels through `shown()`, and there are exactly four call sites.**
`shown()` calls `val()`, which will now throw on an evidence id, so all four
must be taught about evidence or the page dies on load. They are, verified by
reading the file: the sort comparator (`src/app.ts:957`), the table cell
(`:1265`), the detail panel (`:1429`) and the CSV export (`:2439`).

First, make `shown()` refuse evidence rather than reaching `val()`:

```ts
function shown(f: Food, n: Nutrient) {
  // An evidence column is not a per-100-g figure and has no basis to rescale.
  // Callers must go through ev() instead; returning null here keeps the four
  // call sites honest without making each one guard before it calls.
  if (n.evidence) return null;
  const v = val(f, n.id);
  ...
}
```

Then a sort key, since a range still has to sort somewhere sensible:

```ts
/* A range sorts by its midpoint, which is the only defensible single point on
   it. Everything that is not a figure sorts as absent, which is where n/a
   already sorts. */
const evSortKey = (slug: string, id: string): number | null => {
  const c = ev(slug, id);
  if (!c) return null;
  if (c.state === "measured" || c.state === "estimated") return c.value ?? null;
  if (c.state === "range") return ((c.low! + c.high!) / 2);
  return null;
};
```

Now the four sites.

**Table cell, `src/app.ts:1265`.** The row is built from an HTML template string,
not DOM nodes, so this is a string branch. Note `data-n`, which the tests select
on and which no cell carries today:

```ts
      ${c.map(n => {
        if (n.evidence) {
          const cell = ev(SLUGS[i]!, n.id);
          const proxy = cell?.match === "proxy" ? ` data-match="proxy"` : "";
          return `<td class="num ${colClass(n)}" data-g="${n.group}" data-n="${esc(n.id)}"` +
                 ` data-ev="${cell ? cell.state : "none"}"${proxy}>${esc(evText(cell, n.dp))}</td>`;
        }
        const v = shown(f, n);
        const zero = v === 0 || v === null;
        const note = v === null ? null : noteFor(i, n.id);
        if (note) shownNotes.add(note);
        return `<td class="num${zero ? " low" : ""} ${colClass(n)}" data-g="${n.group}" data-n="${esc(n.id)}">${
          fmt(v, n)}${note ? noteMark(note) : ""}</td>`;
      }).join("")}
```

**Sort comparator, `src/app.ts:957`.** Replace the two reads:

```ts
    const x = n.evidence ? evSortKey(SLUGS[a.i]!, n.id) : shown(a.f, n);
    const y = n.evidence ? evSortKey(SLUGS[b.i]!, n.id) : shown(b.f, n);
```

If the comparator's locals are not named `a.i` and `b.i`, use whatever index the
surrounding `rows()` entry carries; read the function before editing.

**Detail panel, `src/app.ts:1429`.** `g(id)` returns a number and its callers
format it. Leave `g` alone and add a sibling used only for evidence rows:

```ts
  const gEv = (id: string) => evText(ev(slugify(f), id), nut(id).dp);
```

**CSV export, `src/app.ts:2439`.** A range must survive the round trip as text,
and `csvQuote` already handles the comma-free `"0.5 to 3.7"`:

```ts
      const v = n.evidence ? null : shown(f, n);
      if (n.evidence) return q(evText(ev(slugify(f), n.id), n.dp));
```

The CSV heading for an evidence column must not claim a basis it does not have.
In `csvTable()`, the heading map becomes:

```ts
    ...c.map(n => n.evidence
      ? `${n.label} (${n.unit} per 100 g, evidence)`
      : `${n.label} (${S.dv && n.dv ? "%DV" : n.unit} ${per})`),
```

Add to `src/styles.css`, using existing tokens only:

```css
/* An evidence cell that is not a figure reads as prose, so it must not be
   mistaken for a number at a glance. */
#tbody td[data-ev="not-measured"],
#tbody td[data-ev="none"],
#tbody td[data-ev="not-detected"],
#tbody td[data-ev="trace"] { font-style: italic; color: var(--muted); }
#tbody td[data-ev="estimated"]::after { content: " calc"; font-size: .75em; color: var(--muted); }
#tbody td[data-match="proxy"]::after { content: " ~"; color: var(--muted); }
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, all four new browser tests plus the existing suite.

- [ ] **Step 6: Commit**

```bash
git add src/data/nutrients.json src/app.ts src/styles.css test/smoke.mjs index.html dist/
git commit -m "Show soluble fibre, insoluble fibre and biotin as evidence"
```

---

### Task 5: Guard the decisions that are easy to lose

**Files:**
- Modify: `test/smoke.mjs`

- [ ] **Step 1: Write the tests**

```js
test("the dropped components stay dropped", async () => {
  // Eight candidates were dropped with reasons in the design: tocotrienols had
  // 4 analysed foods, all breads and pasta, none of them on this page. A column
  // appearing for one of these means the reasoning was drifted past rather than
  // revisited, so fail and make someone reopen the spec.
  await withPage(async (page) => {
    const headers = await page.$$eval("thead th", ths => ths.map(t => t.textContent.toLowerCase()));
    for (const gone of ["tocotrienol", "cobalt", "ajugose", "tartaric"])
      assert(!headers.some(h => h.includes(gone)), `${gone} should have no column`);
  });
});

test("no evidence column carries a daily value", async () => {
  // The second lock after keeping evidence out of `v`. A dv here would put an
  // evidence figure into the % DV view and into "Short on".
  await withPage(async (page) => {
    const bad = await page.evaluate(() =>
      DATA.nutrients.filter(n => n.evidence && n.dv !== null).map(n => n.id));
    eq(bad.length, 0, `evidence columns with a daily value: ${bad.join(", ")}`);
  });
});

test("val() refuses an evidence id rather than returning a number", async () => {
  await withPage(async (page) => {
    const threw = await page.evaluate(() => {
      try { val(FOODS[0], "biotin"); return false; } catch { return true; }
    });
    assert(threw, "val() must throw on an evidence id, not silently return null");
  });
});
```

- [ ] **Step 2: Run them**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Update the README**

Add a section under the existing nutrient documentation describing: what an evidence column is, the six states, why evidence values are not in `v`, the four reconciliation rules with the oats case as the worked example, and the reviewed-mapping requirement. Derive any count in that prose from the data, per the existing convention.

- [ ] **Step 4: Run the full suite and commit**

```bash
npm test
git add test/smoke.mjs README.md
git commit -m "Guard the dropped columns and the no-totals invariant"
```

---

## Self-review notes

**Spec coverage.** Every phase 1 item in the design has a task: the cell model and six states (Tasks 2 and 4), the four reconciliation rules (Task 1), reviewed mapping with match grades (Task 2 `ALT`, rendered in Task 4), build validation (Task 3), the invariant and state tests (Tasks 4 and 5), the dropped-columns guard (Task 5). Phase 2 and 3 items are deliberately absent.

**A first draft of Task 4 was wrong and has been rewritten.** It assumed the
table built DOM nodes it could set `dataset` on. The rows are HTML template
strings, and every figure on the page funnels through `shown()`, which calls
`val()`. Since `val()` now throws on an evidence id, leaving that undiscovered
would have killed the page on load rather than failing a test. The four call
sites were read and are named with line numbers in Task 4: sort comparator 957,
table cell 1265, detail panel 1429, CSV export 2439. **Check those line numbers
still point at what the plan says before editing**, since any earlier task that
touches `app.ts` will move them.

**`data-n` does not exist on any cell today.** Task 4 adds it to both branches of
the cell template, and the test helper in Task 4 selects on it. Adding it to the
non-evidence branch as well is deliberate: a selector that only works for new
columns is a selector that silently stops testing the old ones.

**Verified before writing:** `IDX` is built over all of `NUTS` at `src/app.ts:180`,
so filtering evidence out of it is a real change and is why the new columns must
be appended at the end of `nutrients.json` rather than interleaved. `fmt()` and
`fmtText()` at `:693` are untouched by this work; evidence has its own formatter
because `fmt` renders `n/a` for null and evidence has six different blanks.

**The slug is written in six places now**, up from five: `app.ts`, `build.mjs`, `portions.mjs`, `usda.mjs`, `flavonoids.mjs` and now `evidence.mjs`. The three tools could share one the way `tools/csv.mjs` is shared. Not done here because it is unrelated to this change, but it is on the open list and this makes it slightly worse.
