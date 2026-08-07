# Evidence columns, phase 2a: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 16 evidence columns the existing 81 reviewed MEXT mappings already reach, in two new column groups, and repair the prose those columns falsify.

**Architecture:** Evidence values live in `src/data/evidence.json`, keyed by food slug, and never enter any food's `v` array. That separation is the invariant the whole feature rests on and no task may weaken it. `tools/evidence.mjs` generates the file from the corpora in `tools/evidence/`; `build.mjs` validates and injects it; `src/app.ts` renders it through `ev()` and `evText()`. This plan reshapes the cell first while only three columns exist, then adds the columns, then repairs the prose.

**Tech Stack:** TypeScript compiled by esbuild, plain Node ESM tools with no dependencies, Playwright smoke tests against the built `index.html`.

## Global Constraints

- **No em dashes** anywhere in copy, comments, commit messages or docs. Rewrite the sentence rather than swapping the punctuation.
- **No invented data.** Never resolve a strict-null error by substituting a value. No `|| 0` and no `?? 0` on a nutrition figure. Withhold the figure, propagate the null, or guard the call site.
- **`build.mjs` has no dependencies and must keep none.**
- **Array position in `nutrients.json` is the position of the value in each food's `v` and may never be reordered.** Every new column is appended at the end of the array. Display order is `COL_ORDER` in `app.ts`.
- **An evidence value must never reach a total, a daily-value percentage, an amino acid score or "Short on."** It is not in `v`, `val()` throws on its id, `shown()` returns null before reaching `val()`, and `dayTotals()` builds no row for it. All four locks stay.
- **Automated name matching is refused.** No task here adds a mapping; all 16 columns use the reviewed pairs already in `tools/evidence/page-map-mext.json`.
- Run the full suite with `npm test`. It runs `tsc --noEmit`, compiles, builds, then `node test/tools.mjs` and `node test/smoke.mjs`. There is no single-test filter; find your test by its name in the PASS/FAIL list.

---

### Task 1: Reshape the evidence cell

Do this first, while only three columns exist and the file holds 243 cells. After Task 4 it holds about 1,280 and the same change costs four times as much to verify.

`unit`, `basis`, `prep` and `match` repeat on every cell. `app.ts` reads none of the first three (verified: no `c.unit`, `c.basis` or `c.prep` anywhere), and reads `match` at exactly one site. `basis` is the constant `"per 100 g"`. `unit` duplicates the column definition in `nutrients.json` and can drift from it. `prep` and `match` are properties of the food's mapping, identical across every cell of one food.

**Files:**
- Modify: `tools/evidence.mjs` (the `out[slug]` assembly and the `common` object)
- Modify: `src/app.ts:51-58` (the `EvidenceCell` interface), `src/app.ts:207` (`declare const EV`), `src/app.ts:781` (`ev`), `src/app.ts:1426` (the proxy marker)
- Modify: `build.mjs:62-107` (`checkEvidence`) and `build.mjs:394-398` (the uncited-source check)
- Test: `test/tools.mjs`

**Interfaces:**
- Produces: `EvidenceFood { prep: string; match: "exact" | "close" | "proxy"; cells: Record<string, EvidenceCell> }`. `EV` becomes `Record<string, EvidenceFood>`. `ev(slug, id)` keeps its signature `(string, string) => EvidenceCell | undefined`. New helper `evFood(slug: string): EvidenceFood | undefined`.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write the failing test**

Add to `test/tools.mjs`, in the evidence-validation section:

```js
test("a food's mapping is stored once, not on every cell", () => {
  const nutrients = [{ id: "solfibre", evidence: true, unit: "g" }];
  const foods = [{ name: "Oats", state: "rolled, dry", v: [] }];
  const sources = { "mext-2020": { title: "t", quality: "high" } };

  // The shape the generator now writes: prep and match on the food, cells under
  // their own key, and no unit or basis anywhere.
  const good = {
    "oats-rolled-dry": {
      prep: "rolled, dry", match: "exact",
      cells: { solfibre: { state: "measured", value: 3.2, sources: ["mext-2020"] } },
    },
  };
  eq(checkEvidence(good, nutrients, foods, sources).length, 0,
     "the new shape must validate clean");

  // A food with no match grade is a mapping nobody graded, which is the thing
  // the reviewed-mapping rule exists to prevent.
  assertHas(checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", cells: {} } },
    nutrients, foods, sources), "no match grade");

  assertHas(checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", match: "guessed", cells: {} } },
    nutrients, foods, sources), "unknown match grade");

  // Preparation is still the sharpest edge in this data, and the check moves up
  // a level with the field rather than disappearing.
  assertHas(checkEvidence({ "oats-rolled-dry": { prep: "boiled", match: "exact", cells: {} } },
    nutrients, foods, sources), "disagrees with the food's state");
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node test/tools.mjs`
Expected: FAIL on "a food's mapping is stored once, not on every cell". `checkEvidence` still iterates `Object.entries(cells)` where `cells` is now `{ prep, match, cells }`, so it reports `prep` and `match` as unknown components.

- [ ] **Step 3: Reshape the generator**

In `tools/evidence.mjs`, replace the `common` object and the `out[slug]` assembly. Delete `const common = {...}`. Every `food[id] = { ...cell, unit: "g", ...common }` becomes `cells[id] = cell`, and every passthrough assignment loses its `unit` and `...common`. Rename the local `food` to `cells`. Then:

```js
  if (Object.keys(cells).length)
    out[slug] = { prep: p.page_state || "as listed", match: p.match, cells };
```

- [ ] **Step 4: Reshape the type and the reads in `app.ts`**

Replace the `EvidenceCell` interface at `src/app.ts:51-58` with:

```ts
/* A cell carries only what varies between components of one food. The unit is
   on the column definition in nutrients.json, the basis is "per 100 g" for
   every cell in the file, and the preparation and match grade belong to the
   food's mapping rather than to any one component. Holding a unit here as well
   would let the two disagree; not holding it makes that unrepresentable. */
interface EvidenceCell {
  state: EvState;
  value?: number; low?: number; high?: number;
  sources?: string[];
  n?: number; disputed?: { source: string; value: number }[];
}
/* One reviewed mapping from this page's food to a source's row, and the cells
   that mapping made reachable. `match` is graded by a human and `proxy` must
   stay visible to a reader wherever its values appear. */
interface EvidenceFood {
  prep: string;
  match: "exact" | "close" | "proxy";
  cells: Record<string, EvidenceCell>;
}
```

Change the declaration at `src/app.ts:207`:

```ts
declare const EV: Record<string, EvidenceFood>;
```

Change `ev` at `src/app.ts:781` and add its sibling:

```ts
const ev = (slug: string, id: string): EvidenceCell | undefined => EV[slug]?.cells[id];
/* The mapping behind a food's cells. Separate from ev() because a reader needs
   the match grade even where they are looking at one component. */
const evFood = (slug: string): EvidenceFood | undefined => EV[slug];
```

Change the proxy marker at `src/app.ts:1426`. It must still only mark a cell that exists, so the `cell &&` guard is load-bearing:

```ts
          const proxy = cell && evFood(slugAt(i))?.match === "proxy" ? ` data-match="proxy"` : "";
```

- [ ] **Step 5: Reshape `checkEvidence`**

In `build.mjs`, change the loop header and the per-food checks. Replace the body of the `for` loop over `Object.entries(evidence || {})`:

```js
  for (const [foodSlug, entry] of Object.entries(evidence || {})) {
    const food = bySlug.get(foodSlug);
    if (!food) { problems.push(`evidence for unknown food "${foodSlug}"`); continue; }

    /* The mapping, checked once per food rather than once per cell. Preparation
       is the sharpest edge in this data: a correct value against the wrong
       preparation is worse than none, because it looks right. */
    if (!entry.match) problems.push(`evidence ${foodSlug}: no match grade`);
    else if (!EV_MATCH.has(entry.match))
      problems.push(`evidence ${foodSlug}: unknown match grade "${entry.match}"`);
    const state = (food.state || "as listed").toLowerCase();
    if (entry.prep && entry.prep.toLowerCase() !== state && entry.prep.toLowerCase() !== "as listed")
      problems.push(`evidence ${foodSlug}: prep "${entry.prep}" disagrees with the food's state "${food.state || ""}"`);

    for (const [id, c] of Object.entries(entry.cells || {})) {
      const at = `evidence ${foodSlug}.${id}`;
      // Unknown covers both halves deliberately: a component with no column and
      // a column that is not an evidence column are the same mistake, a figure
      // put somewhere the page will not read it from.
      if (!evIds.has(id)) { problems.push(`${at}: unknown component`); continue; }
      if (!EV_STATES.has(c.state)) { problems.push(`${at}: unknown state "${c.state}"`); continue; }

      const carries = c.state === "measured" || c.state === "range" || c.state === "estimated";
      if (carries) {
        if (!Array.isArray(c.sources) || !c.sources.length)
          problems.push(`${at}: a value with no source`);
        else for (const s of c.sources)
          if (!sources[s]) problems.push(`${at}: unknown source "${s}"`);
      }
      if ((c.state === "measured" || c.state === "estimated") && typeof c.value !== "number")
        problems.push(`${at}: ${c.state} with no value`);
      if (c.state === "range") {
        if (typeof c.low !== "number" || typeof c.high !== "number")
          problems.push(`${at}: range with no bounds`);
        else if (!(c.high > c.low))
          problems.push(`${at}: range bounds are equal or inverted, which means reconciliation was skipped`);
      }
    }
  }
```

The `c.match`, `c.unit` and `c.basis` checks are gone with their fields.

Then fix the uncited-source check at `build.mjs:394-398`, which still reaches one level too shallow:

```js
  for (const key of Object.keys(srcs || {}))
    if (!Object.values(evidence || {}).some(entry =>
        Object.values(entry.cells || {}).some(c => (c.sources || []).includes(key))))
      problems.push(`sources: "${key}" is cited by no evidence cell`);
```

- [ ] **Step 6: Regenerate and run the whole suite**

Run: `node tools/evidence.mjs && npm test`
Expected: the generator prints `81 foods, 243 cells, ...` unchanged, and every test passes including the reshape test from Step 1 and the existing evidence smoke tests. If `src/data/evidence.json` shrank by roughly a third, that is the four fields leaving.

- [ ] **Step 7: Commit**

```bash
git add tools/evidence.mjs src/app.ts build.mjs test/tools.mjs src/data/evidence.json
git commit -m "Stop repeating a food's mapping on every one of its cells

unit, basis, prep and match sat on all 243 cells. app.ts reads none of
the first three and reads match at one site, basis is a constant, and
unit duplicates the column definition it can now no longer disagree
with. prep and match belong to the food's mapping, so they move up one
level and are stored once.

Done now rather than after phase 2a's columns land, when the same change
would have to be verified against 1,280 cells instead of 243.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: DROPPED, the guard already exists

Not to be implemented. Kept numbered so the later task numbers and their briefs stay stable.

This task was written to add a rendered-header regression guard, on the strength of the handover's note that phase 1's header break went unnoticed by 148 tests. That note is accurate about the moment the bug landed and misleading about now: **phase 1 added the guard when it fixed the bug.**

`test/smoke.mjs:3304`, "every group label spans exactly its own columns", already asserts more than this task's test would have:

- every group appears once in the column order, as one unbroken run
- each label's `colspan` equals the run of columns beneath it, in the same order
- one body cell per column, plus the food column

It also filters `__name` out of the `[data-sort]` list, which this task's snippet did not, so the snippet counted the food-name button as a column and reported a false failure at every group boundary. A group rendering `colspan="0"` is caught too, since it would appear in the header spans and not in the counted runs.

Task 3 is therefore already protected. Writing a second test asserting the same thing would be duplication.

### Task 3: Add the two groups and the 16 column definitions

After this task every new column renders `no data` in all 131 rows, because `evidence.json` holds no cells for them yet. That is the point: it proves the plumbing, the header, the groups and the absence rendering before any value exists to confuse the picture.

**Files:**
- Modify: `src/data/nutrients.json` (append 16 entries to the end of `nutrients`)
- Modify: `src/data/icons.json` (two new icons)
- Modify: `src/app.ts:8` (`NutrientGroup`), `src/app.ts:211-218` (`GROUPS`), `src/app.ts:1606` (`DETAIL_TABS`), `src/app.ts:3235` (`GROUP_BLURB`)
- Test: `test/smoke.mjs`

**Interfaces:**
- Consumes: `EvidenceFood` and `evFood` from Task 1.
- Produces: the column ids `mo`, `iodine`, `cr`, `resstarch`, `starch`, `glucose`, `fructose`, `sucrose`, `maltose`, `sorbitol`, `mannitol`, `organicacids`, `citric`, `malic`, `quinic`, `oxalate`, and the group ids `carbdetail` and `acids`. Task 4 writes cells keyed by these exact ids.

- [ ] **Step 1: Write the failing tests**

```js
await test("every group holding evidence columns has a detail tab", async () => {
  /* DETAIL_TABS is a hand-written literal whose comment claimed it was derived
     from GROUPS. It was not, so a new group could be added to the table and
     left out of the detail panel silently. This makes the comment true. */
  await withPage(async page => {
    const missing = await page.evaluate(() => {
      const need = new Set(DATA.nutrients.filter(n => n.evidence).map(n => n.group));
      openDetail(0);
      const tabs = new Set([...document.querySelectorAll('#dlgB [role="tab"], .dtab')]
        .map(t => t.dataset.tab));
      return [...need].filter(g => !tabs.has(g));
    });
    eq(missing.length, 0, `groups with evidence columns and no detail tab: ${missing.join(", ")}`);
  });
});

await test("the new columns exist, in their groups, with no daily value", async () => {
  await withPage(async page => {
    const r = await page.evaluate(() => {
      const want = {
        mo: "mineral", iodine: "mineral", cr: "mineral", resstarch: "macro",
        starch: "carbdetail", glucose: "carbdetail", fructose: "carbdetail",
        sucrose: "carbdetail", maltose: "carbdetail", sorbitol: "carbdetail",
        mannitol: "carbdetail", organicacids: "acids", citric: "acids",
        malic: "acids", quinic: "acids", oxalate: "acids",
      };
      const by = Object.fromEntries(DATA.nutrients.map(n => [n.id, n]));
      const bad = [];
      for (const [id, group] of Object.entries(want)) {
        const n = by[id];
        if (!n) { bad.push(`${id} missing`); continue; }
        if (n.group !== group) bad.push(`${id} in ${n.group}, wanted ${group}`);
        if (!n.evidence) bad.push(`${id} is not an evidence column`);
        if (n.dv !== null) bad.push(`${id} has a daily value`);
        if (!n.why || n.why.length < 40) bad.push(`${id} has no usable why`);
      }
      return { bad, vLen: [...new Set(DATA.foods.map(f => f.v.length))],
               want: DATA.nutrients.filter(n => !n.evidence).length };
    });
    eq(r.bad.length, 0, r.bad.join("; "));
    // The invariant, restated where it is cheapest to break: 16 new columns and
    // not one new position in any food's value array.
    eq(r.vLen.length, 1, `every food has one value-array length, got ${r.vLen.join(", ")}`);
    eq(r.vLen[0], r.want, "value arrays hold the non-evidence nutrients and nothing else");
  });
});
```

Replace the `eq(r.ev.length, 3, "three evidence columns")` assertion in the existing test "an evidence value reaches no total, no percentage and no score" with `eq(r.ev.length, 19, "nineteen evidence columns")`.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL on "the new columns exist, in their groups, with no daily value" with `mo missing; iodine missing; ...`, and FAIL on the amended count assertion with "expected 18, got 3".

- [ ] **Step 3: Add the two groups to `app.ts`**

At `src/app.ts:8`:

```ts
type NutrientGroup = "macro" | "fats" | "amino" | "vitamin" | "mineral" | "carbdetail" | "acids" | "plant";
```

In `GROUPS` at `src/app.ts:211`, insert two entries between `mineral` and `plant`:

```ts
  { id: "carbdetail", label: "Carbohydrate detail", icon: I.carb },
  { id: "acids",   label: "Organic acids",  icon: I.acid },
```

At `src/app.ts:1606`, extend the literal and correct the comment above it, which currently claims the list is derived from `GROUPS` and is not:

```ts
    // Overview first, then one tab per group that has its own detail list. A
    // hand-written list rather than GROUPS, because macro and fats are shown in
    // the overview instead. A test asserts every group holding evidence columns
    // appears here, since those cells carry sources the panel is the only place
    // to show.
    const DETAIL_TABS: NutrientGroup[] = ["vitamin", "mineral", "carbdetail", "acids", "amino", "plant"];
```

At `src/app.ts:3235`, add both entries. The `Record<NutrientGroup, string>` type means the compiler refuses the build without them:

```ts
const GROUP_BLURB: Record<NutrientGroup, string> = { macro: "macronutrients", fats: "fat fractions", amino: "amino acids",
                      vitamin: "vitamins", mineral: "minerals", carbdetail: "sugars and starches",
                      acids: "organic acids", plant: "plant compounds" };
```

- [ ] **Step 4: Add the two icons**

In `src/data/icons.json`, add `carb` and `acid` matching the shape of the existing set exactly: `width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`. Copy the attribute string from the `macro` entry so nothing drifts. `carb` is a stack of three grain shapes; `acid` is a flask.

```json
  "carb": "<svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 3c-2 2-2 4 0 6 2-2 2-4 0-6z\"/><path d=\"M12 10c-2 2-2 4 0 6 2-2 2-4 0-6z\"/><path d=\"M12 17c-2 2-2 3 0 4 2-1 2-2 0-4z\"/></svg>",
  "acid": "<svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M10 3h4\"/><path d=\"M11 3v6l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3\"/><path d=\"M7.5 15h9\"/></svg>"
```

- [ ] **Step 5: Append the 16 column definitions**

Append these to the **end** of the `nutrients` array in `src/data/nutrients.json`, in this order, after the existing `biotin` entry. Order matters twice: array position must stay at the end so no `v` index moves, and file order within a group is display order, which is why the seven carbohydrate columns are listed in the order a reader should meet them.

`mo`, `iodine` and `cr` need no `after`: they are appended last, so a stable sort by group already places them at the end of the minerals. `resstarch` does need one, because without it the sort leaves it after `water` rather than beside the other two fibre fractions.

```json
{ "id": "mo", "label": "Molybdenum", "group": "mineral", "unit": "µg", "dv": null, "dp": 0, "evidence": true,
  "why": "A trace element that a handful of enzymes use to break down sulphites and purines. The requirement is tiny, deficiency is effectively unknown outside rare genetic disorders, and legumes and grains carry it in quantity." },
{ "id": "iodine", "label": "Iodine", "group": "mineral", "unit": "µg", "dv": null, "dp": 0, "evidence": true,
  "why": "Needed to make thyroid hormones, and the widest-spanning figure on this page: seaweed carries thousands of times what any other plant food does, while most were assayed and found to contain none at all. These are Japanese figures, and iodine tracks the soil and the irrigation water as much as the food, so they do not transfer between countries." },
{ "id": "cr", "label": "Chromium", "group": "mineral", "unit": "µg", "dv": null, "dp": 0, "evidence": true,
  "why": "A trace element once believed essential to the way insulin works. The evidence weakened rather than strengthened, and European authorities no longer set an intake for it. These are Japanese figures; older Western ones run ten to fifty times higher, which is contamination from stainless steel during sampling rather than a richer soil." },
{ "id": "resstarch", "label": "Resistant starch", "group": "macro", "unit": "g", "dv": null, "dp": 1, "evidence": true, "after": "insolfibre",
  "why": "Starch that survives the small intestine and ferments in the colon, behaving like fibre rather than like carbohydrate. Cooking a starchy food and then cooling it raises the figure, which no composition table can capture." },
{ "id": "starch", "label": "Starch", "group": "carbdetail", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "The bulk of the carbohydrate in grains, legumes and tubers, as distinct from the sugars beside it. These are Japanese figures and the Carbohydrate column is American, so the parts here will not add up to that total." },
{ "id": "glucose", "label": "Glucose", "group": "carbdetail", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "Free glucose, already in the form the blood carries, as distinct from the far larger amount locked up in starch and sucrose." },
{ "id": "fructose", "label": "Fructose", "group": "carbdetail", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "The sweetest of the common sugars and the one fruit holds most of. It is absorbed more slowly than glucose and handled almost entirely by the liver." },
{ "id": "sucrose", "label": "Sucrose", "group": "carbdetail", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "Table sugar: one glucose and one fructose bonded together. In these foods it is what the plant stored rather than anything added, and root vegetables and fruit carry the most." },
{ "id": "maltose", "label": "Maltose", "group": "carbdetail", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "Two glucose units bonded together, formed when starch is broken down by sprouting, malting or cooking. Most whole plant foods were assayed and found to contain none, which is what this column mostly shows." },
{ "id": "sorbitol", "label": "Sorbitol", "group": "carbdetail", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "A sugar alcohol found in stone fruit and some berries. It is absorbed slowly and incompletely, which is why a large amount of it loosens the bowels." },
{ "id": "mannitol", "label": "Mannitol", "group": "carbdetail", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "A sugar alcohol, poorly absorbed, so it yields less energy than its weight suggests. Only a few foods here carry a measured figure for it." },
{ "id": "organicacids", "label": "Organic acids, total", "group": "acids", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "The acids that make fruit and fermented foods taste sharp, added together. They carry a little energy and a great deal of flavour, and the columns beside this one are the largest of them." },
{ "id": "citric", "label": "Citric acid", "group": "acids", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "The dominant acid of citrus fruit and a minor one almost everywhere else. It is what makes a lemon sharp rather than what makes it nourishing." },
{ "id": "malic", "label": "Malic acid", "group": "acids", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "The acid of apples and stone fruit, and named for them. It tastes sharper than citric acid at the same concentration." },
{ "id": "quinic", "label": "Quinic acid", "group": "acids", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "An acid of cranberries, coffee and some stone fruit, and the building block a plant starts from when it makes its polyphenols." },
{ "id": "oxalate", "label": "Oxalate, total", "group": "acids", "unit": "g", "dv": null, "dp": 1, "evidence": true,
  "why": "The compound that binds calcium into a form the gut cannot take up, which is why spinach delivers far less calcium than its figure suggests. This is a total, and only the soluble part binds; separating the two needs a source this page does not yet carry." }
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS on both new tests and on the amended 18-column assertion. The two new groups appear in the sidebar, and every new column reads `no data` in all 131 rows because no cell exists yet. The header guard from Task 2 must still pass; if it fails, the group order in `GROUPS` and the column groups in `nutrients.json` disagree.

- [ ] **Step 7: Commit**

```bash
git add src/app.ts src/data/nutrients.json src/data/icons.json test/smoke.mjs
git commit -m "Add two column groups and the sixteen columns that fill them

Carbohydrate detail and Organic acids, because seven sugars and five
acids do not belong in a group about calories and protein. Molybdenum
and iodine join the minerals and resistant starch the macronutrients.

Every one reads no data until the generator runs, which is deliberate:
it proves the header, the groups and the absence rendering before any
value exists to confuse the picture.

DETAIL_TABS claimed in a comment to be derived from GROUPS and was a
hand-written literal, so a new group could be left out of the detail
panel silently. The comment now describes the code and a test asserts
the part that mattered.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Make the generator declarative and emit the cells

**Files:**
- Modify: `tools/evidence.mjs`
- Modify: `src/styles.css:413` and `src/styles.css:417` (the two competing `::after` rules)
- Test: `test/smoke.mjs`

**Interfaces:**
- Consumes: the column ids from Task 3 and the `{ prep, match, cells }` shape from Task 1.
- Produces: `src/data/evidence.json` with about 1,280 cells over 81 foods.

**A finding this task must act on.** The MEXT extractor never parsed a value out of a parenthesised figure. Every `estimated` cell in all four corpora carries `value: null` while its `raw` holds a real number, `"(40.1)"` for example. MEXT's parentheses mean the figure was calculated rather than assayed, which is exactly what `state: "estimated"` is for. Phase 1's `derivation: "estimated"` branch has therefore been dead code since it shipped, and the handover records the consequence: no `estimated` cell exists anywhere, so that state is modelled and rendered but never exercised. Parsing the parentheses in the generator recovers 105 cells across the new columns and exercises the sixth state for the first time. The corpora are committed extraction output and the MEXT extractor is not in this repository, so the parsing belongs here rather than in the data.

- [ ] **Step 1: Write the failing test**

```js
await test("a calculated figure is shown as one, not as a measurement", async () => {
  /* MEXT prints a calculated value in parentheses. The extractor kept the raw
     string and set value to null, so every estimated cell was silently dropped
     and the sixth state had never once been exercised by real data. */
  await withPage(async page => {
    const r = await page.evaluate(() => {
      const states = {};
      for (const f of Object.values(EV))
        for (const c of Object.values(f.cells)) states[c.state] = (states[c.state] || 0) + 1;
      return states;
    });
    assert(r.estimated > 50, `expected the estimated state to be exercised, got ${r.estimated || 0}`);
    // And it must render as a figure, since a calculation is still a number.
    const cells = await page.$$eval('#tbody td[data-ev="estimated"]',
      tds => tds.map(t => t.textContent.trim()));
    assert(cells.length > 0, "no estimated cell rendered");
    assert(cells.every(t => /[0-9]/.test(t)), "an estimated cell must show its figure");
  });
});

await test("the sixteen new columns carry the evidence they should", async () => {
  await withPage(async page => {
    const r = await page.evaluate(() => {
      const ids = ["mo", "iodine", "cr", "resstarch", "starch", "glucose", "fructose",
                   "sucrose", "maltose", "sorbitol", "mannitol", "organicacids", "citric",
                   "malic", "quinic", "oxalate"];
      const out = {};
      for (const id of ids) out[id] = 0;
      for (const f of Object.values(EV))
        for (const id of ids) if (f.cells[id]) out[id]++;
      return out;
    });
    // Every column must reach at least one food, or it is a column of nothing.
    const empty = Object.entries(r).filter(([, n]) => n === 0).map(([id]) => id);
    eq(empty.length, 0, `columns with no cell at all: ${empty.join(", ")}`);
    // The two best-covered, as a check that the join actually joined.
    assert(r.mo >= 79, `molybdenum reached ${r.mo} foods, expected at least 79`);
    assert(r.iodine >= 79, `iodine reached ${r.iodine} foods, expected at least 79`);
    assert(r.cr >= 79, `chromium reached ${r.cr} foods, expected at least 79`);
    // The organic acid corpus carries only 33 of the 81 mapped foods at all, so
    // this column is capped by the source rather than by the mapping.
    assert(r.organicacids <= 33, `organic acids reached ${r.organicacids}, expected at most 33`);
  });
});

await test("a figure that is both calculated and a proxy shows both marks", async () => {
  /* An element has one ::after. The estimated rule sets " calc" and the proxy
     rule sets " ~", the proxy rule is declared later, so it won and the calc
     marker silently vanished on exactly the least certain cells on the page:
     a figure never assayed, for a food that is only a proxy for the one named.
     Latent since phase 1 and invisible until an estimated cell existed. */
  await withPage(async page => {
    const marks = await page.$$eval('#tbody td[data-ev="estimated"][data-match="proxy"]',
      tds => tds.map(t => getComputedStyle(t, "::after").content));
    assert(marks.length > 0, "no cell is both calculated and a proxy match");
    const lost = marks.filter(m => !m.includes("calc"));
    eq(lost.length, 0, `cells that dropped the calc marker: ${lost.length} of ${marks.length}`);
    const noProxy = marks.filter(m => !m.includes("~"));
    eq(noProxy.length, 0, `cells that dropped the proxy marker: ${noProxy.length} of ${marks.length}`);
  });
});

await test("iodine says what it was measured to say", async () => {
  await withPage(async page => {
    // The finding, and the reason this column is worth having: mostly analysed
    // absence, with seaweed orders of magnitude above everything else.
    eq(await cellText(page, "Kelp", "iodine"), "200000", "kelp iodine");
    const none = await page.evaluate(() =>
      Object.values(EV).filter(f => f.cells.iodine?.state === "not-detected").length);
    assert(none >= 40, `expected at least 40 foods assayed and found to contain none, got ${none}`);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL on all three. `EV` holds no cells for any of the 16 ids, so `columns with no cell at all` lists all sixteen.

- [ ] **Step 3: Rewrite the generator's component handling**

In `tools/evidence.mjs`, replace the four `rd(...)` corpus loads and the `fibreBy` map with a keyed set, and add the component table above the main loop:

```js
const CORPORA = {
  fibre:  rd("mext-2020-fibre.json"),
  plant:  rd("mext-2020-plant.json"),
  sugars: rd("mext-2020-sugars.json"),
  acids:  rd("mext-2020-organic-acids.json"),
};
/* All four Japanese corpora key on the same food code, which is what makes one
   loop over the reviewed mappings enough. */
const BY_CODE = Object.fromEntries(Object.entries(CORPORA)
  .map(([k, rows]) => [k, Object.fromEntries(rows.map(r => [r.code, r]))]));

/* The uniform components: one source, one field, one cell. Biotin is not here
   and stays hand-written below, because it is the only multi-source component
   and the shape of a multi-source declaration is not knowable until the AFCD
   and IFCT mappings exist. This table covers what is uniform. */
const COMPONENTS = [
  { id: "solfibre",     corpus: "fibre",  field: "sol_prosky" },
  { id: "insolfibre",   corpus: "fibre",  field: "insol_prosky" },
  { id: "resstarch",    corpus: "fibre",  field: "resistant_starch" },
  { id: "mo",           corpus: "plant",  field: "mo" },
  { id: "iodine",       corpus: "plant",  field: "iodine" },
  { id: "cr",           corpus: "plant",  field: "cr" },
  { id: "starch",       corpus: "sugars", field: "starch" },
  { id: "glucose",      corpus: "sugars", field: "glucose" },
  { id: "fructose",     corpus: "sugars", field: "fructose" },
  { id: "sucrose",      corpus: "sugars", field: "sucrose" },
  { id: "maltose",      corpus: "sugars", field: "maltose" },
  { id: "sorbitol",     corpus: "sugars", field: "sorbitol" },
  { id: "mannitol",     corpus: "sugars", field: "mannitol" },
  { id: "organicacids", corpus: "acids",  field: "total_oa" },
  { id: "citric",       corpus: "acids",  field: "citric" },
  { id: "malic",        corpus: "acids",  field: "malic" },
  { id: "quinic",       corpus: "acids",  field: "quinic" },
  { id: "oxalate",      corpus: "acids",  field: "oxalic" },
];

/* MEXT prints a calculated figure in parentheses and the extractor kept the
   string without parsing it, so every one of these arrived with value null.
   The parentheses are the source saying "calculated, not assayed", which is
   what state estimated means, so the figure is recovered here rather than
   dropped. Returns null for anything that is not a parenthesised number. */
const bracketed = raw => {
  const m = /^\(\s*([\d.]+)\s*\)$/.exec(String(raw ?? "").trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isNaN(n) ? null : n;
};

/* The figure a cell carries, whichever way the extractor recorded it. Never
   substitutes a value for a missing one: a null here means no figure, and the
   caller must drop the cell rather than write a zero. */
const figureOf = c => c.value !== null && c.value !== undefined ? c.value : bracketed(c.raw);
```

Replace the fibre pair inside the `for (const p of map)` loop with the component loop, renaming `food` to `cells`:

```js
  for (const comp of COMPONENTS) {
    const row = BY_CODE[comp.corpus][p.jp_code];
    const c = row && row[comp.field];
    if (!c) continue;                        // no entry at all, which is no data
    const through = passthrough(c.state);
    if (through) { cells[comp.id] = { state: through, sources: ["mext-2020"] }; nCells++; continue; }
    if (c.state !== "measured" && c.state !== "estimated") continue;
    const value = figureOf(c);
    if (value === null) continue;            // a state that carries no figure
    cells[comp.id] = reconcile([{ source: "mext-2020", value,
      derivation: c.state === "estimated" ? "estimated" : "analysed" }]);
    nCells++;
  }
```

Task 1 already renamed the outer counter to `nCells` so it does not collide with the per-food `cells` object. Use `nCells` and leave the closing `console.log` alone.

- [ ] **Step 4: Fix the marker collision**

In `src/styles.css`, delete the two competing rules at lines 413 and 417 and replace them with one that composes the marker from both attributes. Fixing the cause rather than the declaration order also means a third mark added later cannot silently swallow a second one.

```css
/* One ::after per element, so the marks compose here rather than competing.
   Two separate rules meant the later one won outright, and the cells that
   carry both are the least certain figures on the page: a value never
   assayed, for a food that is only a proxy for the one named. */
tbody td[data-ev=estimated]::after,
tbody td[data-match=proxy]::after{font-size:.75em; color:var(--muted)}
tbody td[data-ev=estimated]:not([data-match=proxy])::after{content:" calc"}
tbody td[data-match=proxy]:not([data-ev=estimated])::after{content:" ~"}
tbody td[data-ev=estimated][data-match=proxy]::after{content:" calc ~"}
```

The proxy marker keeps its own colour and loses nothing: it was previously `color:var(--muted)` with no size change, and inheriting `.75em` alongside the calc marker is the intended appearance for both.

- [ ] **Step 5: Run the generator and read its output**

Run: `node tools/evidence.mjs`
Expected: roughly `81 foods, 1278 cells, ...`, up from 243. If the cell count is near 1,173 rather than 1,278, the parenthesised figures are still being dropped and `figureOf` is not being reached.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS throughout, including the four new tests. The existing invariant test must still pass unchanged: 16 more columns and still no evidence id in any day total, no daily value on any of them, and `val()` still throwing on an evidence id.

- [ ] **Step 7: Commit**

```bash
git add tools/evidence.mjs src/data/evidence.json src/styles.css test/smoke.mjs
git commit -m "Fill the sixteen columns from Japan's tables

The uniform components become a declaration and one loop, since all four
Japanese corpora key on the same food code. Biotin stays hand-written:
it is the only multi-source component, and the shape of a multi-source
declaration is not knowable until the AFCD and IFCT mappings exist.

Recovers 105 cells the extractor had been dropping. MEXT prints a
calculated figure in parentheses and the extractor kept the string
without parsing it, so every estimated cell arrived with a null value
and was skipped. That is why the sixth state had never once been
exercised by real data.

Which in turn exposed a marker collision latent since phase 1. An
element has one ::after, the estimated and proxy rules each set one, and
the proxy rule was declared later, so it won and the calc marker
disappeared on the 24 cells that are both. Those are the least certain
figures on the page: a value never assayed, for a food that is only a
proxy for the one named. The marks compose now rather than compete.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Make an absence claim checkable, and repair the two that went stale

Two gap entries have been false since phase 1 shipped. `fibrefractions` says "The Fibre column here is a single total, so the prebiotic fractions cannot be separated out of it" and `traces` says biotin is a missing column. `build.mjs` already refuses a gap entry that *names* an evidence column, but both carry `nutrients: []` and make their claims in prose, so nothing could check them.

**Files:**
- Modify: `build.mjs:353-388` (the gaps validation block)
- Modify: `src/data/gaps.json` (the `fibrefractions` and `traces` entries)
- Test: `test/tools.mjs`

**Interfaces:**
- Consumes: the column ids from Task 3.
- Produces: the optional `absent: string[]` field on a gap entry, refused by `build.mjs` if any id in it has a column.

- [ ] **Step 1: Write the failing test**

Add to `test/tools.mjs`. `checkGaps` does not exist yet; Step 3 creates and exports it, lifted out of `validate` so it can be tested without a build, the way `checkEvidence` already is.

```js
test("a claim that something is absent fails once it is present", () => {
  const nutrients = [{ id: "biotin", evidence: true }, { id: "fiber" }];
  const sources = {};
  const entry = { id: "traces", tier: "unseen", nutrients: [], label: "Traces",
                  role: "r", why: "x".repeat(50), closing: "c", cites: [] };

  eq(checkGaps({ sources, gaps: [{ ...entry, absent: ["chromium"] }] }, nutrients).length, 0,
     "naming a component with no column is the whole point of the field");

  assertHas(checkGaps({ sources, gaps: [{ ...entry, absent: ["biotin"] }] }, nutrients),
    "biotin");
  assertHas(checkGaps({ sources, gaps: [{ ...entry, absent: ["biotin"] }] }, nutrients),
    "has a column");
});
```

Use `sources: {}` in the fixture, not `{ s1: "A citation." }`. `checkGaps` carries the whole gaps block including the "source cited by nothing" rule, and a source no entry cites would add a problem the assertions do not expect. With `sources: {}` that loop has nothing to iterate and the `tier: "unseen"` entry needs no cites, so the fixture validates clean.

- [ ] **Step 2: Run to verify it fails**

Run: `node test/tools.mjs`
Expected: FAIL with `checkGaps is not defined` or an import error.

- [ ] **Step 3: Extract and extend the gaps check**

In `build.mjs`, lift the gaps block out of `validate` into an exported function beside `checkEvidence`, taking the parsed `gaps` object and the nutrients array, and returning problems. `validate` calls it and spreads the result. Then add the new rule inside the per-entry loop:

```js
    /* An entry may claim a component is not here at all, and the claim is
       checked rather than trusted. Two entries carried exactly this claim in
       prose and went false the day phase 1 shipped a column for what they said
       was missing, because `nutrients: []` meant nothing could catch it. */
    for (const id of g.absent || []) {
      if (allIds.has(id))
        problems.push(`${at} says "${id}" is absent, and it has a column`);
    }
```

`allIds` is every nutrient id, evidence or not: `const allIds = new Set(nutrients.map(n => n.id))`.

- [ ] **Step 4: Repair the two stale entries**

In `src/data/gaps.json`, replace the `why` of `fibrefractions` and add its `absent` array:

```json
"absent": ["betaglucan", "pectin", "inulin", "oligosaccharides", "inositol"],
"why": "Soluble fibre, insoluble fibre and resistant starch each have a column here now, taken from Japan's tables because USDA measures all three and publishes none of them for any of these foods. The rest of the family is still missing. Inulin and the oligosaccharides need a database this page does not yet join to. Beta-glucan, pectin and free inositol are carried by none of the eight sources gathered for this work, so none of the three can be shown at all. Most of the inositol in a plant food is bound up as phytate rather than free, which is a different figure and one this page may yet reach."
```

And for `traces`:

```json
"absent": ["boron", "taurine"],
"label": "Boron and taurine",
"why": "Biotin, molybdenum and chromium have columns here now, taken from Japan's tables rather than from USDA, which publishes none of the three for any of these foods. Two of the original five are still absent. Boron is measured by a Danish database this page does not yet join to. Taurine was assayed across 48 plant foods and detected in none, so a column would be one finding repeated 131 times, and the exception worth stating in words is red algae: nori and kelp are not zero."
```

The `traces` label changes because it named five things and three of them are columns now.

**A limitation to record rather than solve.** An id in `absent` is checked against the columns that exist, so a typo like `"betaglukan"` names nothing, matches nothing, and passes forever. Guarding that would need a vocabulary of every component this project has considered, which is more machinery than the risk deserves. Note it in `README.md` when Task 7 documents the field.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS. If the build now refuses with `says "inulin" is absent, and it has a column`, then a column was added that this plan does not call for; check `nutrients.json` rather than weakening the rule.

- [ ] **Step 6: Commit**

```bash
git add build.mjs src/data/gaps.json test/tools.mjs
git commit -m "Turn an absence claim into something the build can check

Two gap entries went false the day phase 1 shipped. One said the fibre
column was a single total with the fractions inseparable from it, and
one said biotin was a missing column. Both were true when written and
neither could be caught, because build.mjs only refuses an entry that
names an evidence column and both made their claims in prose with an
empty nutrients array.

An entry may now list what it claims is absent, and the build refuses it
once any of them has a column. Both entries are rewritten to say what is
true today, and the traces entry is renamed, because it named five
things and two of them are columns now.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Repair the iodine prose

Four sites say iodine has no column. It has one now.

**Files:**
- Modify: `src/data/gaps.json` (the `iodine` entry)
- Modify: `src/app.ts` (three sites, near lines 3135, 3173 and 3186)
- Test: `test/smoke.mjs`

**Interfaces:**
- Consumes: the `iodine` column from Task 3 and its cells from Task 4.

- [ ] **Step 1: Write the failing test**

```js
await test("the page does not say iodine has no column", async () => {
  /* It has one. Four sentences said otherwise, and a page that contradicts its
     own table is worse than one that shows less. */
  await withPage(async page => {
    /* openDialog replaces #dlgB each time, so the text has to be collected per
       dialog rather than read from the body once at the end. The five ids are
       DLG's own keys; "gaps" is the one that renders gaps.json. */
    const text = await page.evaluate(() => {
      let all = "";
      for (const id of ["how", "meth", "about", "bio", "gaps"]) {
        openDialog(id);
        all += document.querySelector("#dlgB").innerText + "\n";
      }
      return all;
    });
    for (const claim of ["Iodine has no column", "Iodine is not a column",
                         "Iodine is not included", "no column for it here"])
      assert(!text.includes(claim), `the page still says "${claim}"`);
  });
});
```

`DLG`'s keys are exactly `how`, `meth`, `about`, `bio` and `gaps`, verified against `src/app.ts`. `openDialog` is typed `(k: keyof typeof DLG)`, so a wrong id is a compile error rather than a silent miss.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL naming whichever claim is found first.

- [ ] **Step 3: Rewrite the gap entry**

In `src/data/gaps.json`, the `iodine` entry keeps `tier: "gap"` and its citation, and `nutrients` stays `[]`, because a gap's evidence is counted over `v` and an evidence column has no `v` to count. Only the `why` changes:

```json
"why": "There is a column for it now, taken from Japan's tables, and it says something sharper than its absence did. Of the foods measured, most were assayed and found to contain none at all. Seaweed is the exception and an extreme one: kelp carries thousands of times what any other plant food here does, enough that a single serving overshoots the requirement many times over, which is its own kind of problem. Iodine in plants tracks the soil and the irrigation water as much as the food, so figures gathered in Japan do not transfer to a British or American plate. And because it is an evidence column rather than a measured figure in this table, it reaches no total: what you are short of below does not count it."
```

- [ ] **Step 4: Rewrite the three sentences in `app.ts`**

Find each by its text rather than by line number.

Replace `<b>Iodine has no column, so it has no total.</b>` and the sentence following it with:

```
<b>Iodine has a column now, and still no total.</b> A view that lists what you are
short of implies the list is complete. Iodine is a real requirement and a common gap on a
plant-based diet, and its figures here come from Japan rather than from the table the totals
are built on, so they are shown per food and never summed.
```

Replace `Iodine is not a column, so fortification with it is` and its continuation so that it reads as fortification not being tracked rather than the column not existing. The surrounding sentence is about fortified soy milk; keep its subject and change only the claim:

```
Iodine is shown per food from an outside source, so fortification with it is not tracked here
the way the B12, calcium and vitamin D added to soy milk are.
```

Replace `<b>Iodine is not included.</b>` and the sentence after it with:

```
<b>Iodine comes from outside this table.</b> USDA measures it in plenty of other foods and
publishes a figure for none of these, so the column is built from Japan's tables instead. It is
shown per food, it carries its source, and it enters no total.
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, including the prose test and the existing "a gap's evidence is measured from the table, not typed into it" test, which must not have been disturbed.

- [ ] **Step 6: Commit**

```bash
git add src/data/gaps.json src/app.ts test/smoke.mjs
git commit -m "Stop saying iodine has no column

It has one. Four sentences said otherwise, and a page contradicting its
own table is worse than one that shows less.

The gap entry argues from measurement now rather than from absence,
which is the stronger claim: most of the foods measured were assayed and
found to contain none, and kelp overshoots the requirement many times
over on one serving. It stays a gap, keeps its citation, and still
counts toward no total, because an evidence column has no figure in the
value array the totals are summed from.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Write the durable documentation

`README.md` carries everything durable. `HANDOVER.md` carries what the next session needs and nothing that belongs in the README.

**Files:**
- Modify: `README.md` (the "Evidence columns" section, the iodine line near 1369, the group counts)
- Modify: `HANDOVER.md` (a new latest-session section at the top)
- Modify: `tools/evidence/README.md` (its opening claim is stale)

- [ ] **Step 1: Update `README.md`**

Extend "Evidence columns" with: the 16 new columns and their group placement; that all 16 are single-source and therefore never a range until phase 2b; the cell shape and why `unit`, `basis`, `prep` and `match` left it; the parenthesised-figure finding and the 105 cells it recovered; the marker collision and why the marks compose rather than compete; the `absent` field, what it is for, and that a typo in it names nothing and passes. Correct the iodine line near 1369, which says reliable per-food values are scarce, to say the column exists and what it rests on. Record that chromium is unparked from MEXT only, and that AFCD's chromium and Thor 2011 stay rejected. Check any sentence counting groups or columns, since both numbers changed.

- [ ] **Step 2: Update `tools/evidence/README.md`**

Its second paragraph says "Nothing in this directory is on the page. No column has been added." That has been false since phase 1 and is now false for 18 columns. Replace it with what is on the page and what is still raw material.

- [ ] **Step 3: Add the handover section**

At the top of `HANDOVER.md`, under a new heading for this session, record:

- Phase 2a shipped 16 columns and two groups, taking the table to 89 columns.
- Beta-glucan and free inositol have no source anywhere, measured rather than assumed, so they join pectin. Inositol phosphate is phytate and is due in phase 2b.
- 16 components remain, blocked on reviewed mappings for AFCD, IFCT, CoFID and Frida. That is phase 2b, and the mapping is the slow part rather than the columns.
- **The parenthesised-figure bug, and its lesson: a state that is modelled and rendered but never exercised is a state nobody has tested.** The `estimated` branch was dead code for a whole phase and the marker for it had never once been drawn.
- **The marker collision, and its lesson: two `::after` rules on one element is one rule.** It was invisible until the first estimated cell met the first proxy food.
- **The chromium note, and the sharpest lesson here: a note recording what was rejected must name the source it rejected, not the nutrient.** "Chromium is parked" nearly skipped a column with better coverage than most of phase 2a, because the rejection was of AFCD's chromium and the 1980s literature and the note did not say so.
- The two gap entries went false the day phase 1 shipped, which is why the `absent` check exists, and that a typo in an `absent` list still names nothing and passes.

- [ ] **Step 4: Verify and commit**

Run: `npm test`
Expected: PASS. Then check no em dash entered any file: `grep -rn "—" README.md HANDOVER.md tools/evidence/README.md docs/` must print nothing.

```bash
git add README.md HANDOVER.md tools/evidence/README.md
git commit -m "Write down what phase 2a did and what phase 2b needs

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Every section of the design has a task. The 16 columns and their units, groups and precision, chromium included (Task 3, with the values written out rather than described). The two new groups and all four hand edits the design lists, including the `DETAIL_TABS` trap (Task 3). The declarative generator with biotin left hand-written, and the parenthesised-figure recovery (Task 4). The marker collision (Task 4). The cell losing four fields (Task 1). The `absent` check and the two stale entries (Task 5). The iodine prose and the other three sites (Task 6). All the new tests: the header guard (Task 2), the detail-tab test (Task 3), the estimated-state and double-marker tests (Task 4), and the dropped list, which is the `absent` array in Task 5 carrying beta-glucan, pectin and free inositol. The parts-fit-the-whole check is deliberately absent and no task adds one, and neither trehalose nor galactose gets a column.

**Two items from the design are deliberately not tasks.** The free-inositol entry belongs in the same `absent` arrays Task 5 writes, and is folded into `fibrefractions` rather than given a task of its own. The note that MEXT reports oxalate in grams while IFCT reports it in milligrams is a phase 2b concern and is recorded in the design and the handover rather than implemented here.

**Placeholder scan.** No TBD, no "add error handling", no "similar to Task N". Every code step carries the code. Two steps name a judgement rather than a literal: Task 3's icon paths may be redrawn if they read badly at 17 px, and Task 7's prose is described by what it must say rather than written out, because it is documentation rather than code. Task 6's dialog ids and Task 5's fixture sources are flagged inline as things to check against the file rather than assume.

**Type consistency.** `EvidenceFood` and `evFood` are defined in Task 1 and used in Tasks 1 and 3. `checkEvidence` keeps its four-argument signature throughout. `checkGaps` is introduced in Task 5 with the signature its test uses, `(gaps, nutrients) => string[]`. The 16 column ids are written identically in Tasks 3 and 4, and `COMPONENTS` in Task 4 uses the same ids as `nutrients.json` in Task 3. `figureOf` and `bracketed` are defined once, in Task 4, and used only there.

**Ordering.** Task 1 before Task 4, so the cell reshape is verified against 243 cells rather than 1,280. Task 2 before Task 3, so the header guard exists before the change that could break it. Task 3 before Task 4, so the columns render `no data` once before they render values. Tasks 5 and 6 after Task 3, because both depend on columns existing.
