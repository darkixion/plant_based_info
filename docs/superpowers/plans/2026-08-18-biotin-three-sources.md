# Biotin across three sources: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make biotin a real three-source column by reading the reviewed maps
this project already holds, widening those maps where a source carries a biotin
figure, and taking the biotin cell out of the MEXT loop that currently caps it.

**Architecture:** The biotin cell becomes a pure function, `biotinCell`, in a new
`tools/biotin.mjs`, fed by a pass in `tools/evidence.mjs` that iterates the union
of `page-map-mext.json`, `page-map-cofid.json` and `page-map-afcd.json` instead
of the MEXT map alone. `reconcile()` in `tools/reconcile.mjs` is not touched: the
rules are settled and this work only feeds them more candidates. The same file
also carries a `propose` command that suggests map pairs for hand review.

**Tech Stack:** Node ESM, no dependencies. Tests are `test/tools.mjs`, a
hand-rolled `test(name, fn)` runner with an `eq(actual, expected, msg)`
assertion. Build is `node build.mjs`. Full gate is `npm test`.

**Spec:** `docs/superpowers/specs/2026-08-18-biotin-three-sources-design.md`

## Global Constraints

- **No em dashes.** Anywhere: code, comments, documentation, commit messages.
- **Automated name matching is refused.** The `propose` command proposes and
  never merges. A pair reaches a `page-map-*.json` only after Thom has read it.
- **Absence is never stored as zero**, and a state is never collapsed. The six
  states are `measured`, `not-detected`, `trace`, `estimated`, `not-measured`,
  `no-data`.
- **Only analysed figures reconcile.** AFCD's `derivation` decides this through
  `gradeDerivation`, already imported by `tools/evidence.mjs`.
- **A map merge and a regenerate land in the same commit.** Widening a map widens
  `reach()` in `loadAttested`, and a cell citing a source no map connects it to
  fails the build.
- Commit messages in this repo are a sentence in the imperative describing what
  was found or done, not a `feat:` prefix. Match the existing log.
- Baseline before any change: `npm test` gives 41 tests in `test/tools.mjs` and
  145 in `test/smoke.mjs`, and `node build.mjs` reports no problems.

## File structure

| File | Responsibility |
|---|---|
| `tools/biotin.mjs` | **New.** Exports `biotinCell`, the pure cell builder. Run as an entry point it is the `propose` command. |
| `tools/evidence.mjs` | Loses the biotin block inside the MEXT loop (lines 177 to 201) and the `afcd` half of `ALT`. Gains a union pass calling `biotinCell`. |
| `build.mjs` | `loadAttested` reads the AFCD map's new shape. Nothing else changes. |
| `tools/evidence/page-map-afcd.json` | Values become `{ "key": ..., "match": ... }`. |
| `tools/evidence/page-map-cofid.json` | Gains reviewed entries, batch by batch. |
| `test/tools.mjs` | Gains the `biotinCell` tests. |
| `tools/merge_afcd_maps.mjs`, `tools/update_evidence_mjs.mjs` | **Deleted** in Task 2. See the note there. |

---

### Task 1: `biotinCell`, the cell builder as a pure function

`tools/evidence.mjs` runs its loops at import, so nothing inside it can be
tested. The decision about what a biotin cell says comes out into a function
that takes rows and returns a cell.

**Files:**
- Create: `tools/biotin.mjs`
- Test: `test/tools.mjs`

**Interfaces:**
- Consumes: `reconcile` and `gradeDerivation` from `tools/reconcile.mjs`.
- Produces: `biotinCell(rows)` where `rows` is
  `{ mext?: { state: string, value: number|null }, cofid?: { biotin_ug: string },
  afcd?: { biotin_ug: string, derivation: string } }`. Returns a cell object, or
  `null` where no source has anything to say. A returned cell may carry
  `conflict: { mext: "not-detected", cofid: "trace" }` when the two sources
  report different findings and neither has a figure. Task 5 consumes this.

- [ ] **Step 1: Write the failing tests**

Append to `test/tools.mjs`, after the existing reconcile tests. Add the import
alongside the others at the top of the file:

```js
import { biotinCell } from "../tools/biotin.mjs";
```

```js
// ------------------------------------------------------------------- biotin

test("a food absent from MEXT still gets a biotin cell", () => {
  // The structural limit this work exists to remove. Walnuts, pistachios,
  // brazil nuts and wholewheat pasta each carry an analysed AFCD figure and
  // no Japanese row, so the old pass, which looped over the MEXT map, could
  // never reach them.
  const c = biotinCell({ afcd: { biotin_ug: "19", derivation: "Analysed" } });
  eq(c.state, "measured", "one analysed source is a measurement");
  eq(c.value, 19, "and it is that source's own figure");
  eq(c.sources[0], "afcd-r3", "named");
});

test("an AFCD recipe figure never reconciles against a measurement", () => {
  // Rule 1. Chickpeas is the case: AFCD's 2.5 is calculated from ingredients
  // and cooking factors, so MEXT's 8.9 stands alone rather than becoming a
  // range of 2.5 to 8.9 that no laboratory would recognise.
  const c = biotinCell({
    mext: { state: "measured", value: 8.9 },
    afcd: { biotin_ug: "2.5", derivation: "Recipe" },
  });
  eq(c.state, "measured", "a recipe cannot open a range");
  eq(c.value, 8.9, "the analysed figure stands");
  eq(c.sources.length, 1, "and cites one source");
});

test("three sources let the outlier be disputed rather than printed", () => {
  // Almonds. CoFID 64 and MEXT 60 agree at 1.07x, AFCD's 0.5 sits 120x from
  // the median, and rule 4 has the third source it needs to say which is odd.
  const c = biotinCell({
    mext: { state: "measured", value: 60 },
    cofid: { biotin_ug: "64" },
    afcd: { biotin_ug: "0.5", derivation: "Analysed" },
  });
  eq(c.state, "measured", "two agreeing sources against one outlier");
  eq(c.value, 62, "the median of what is left");
  eq(c.disputed[0].source, "afcd-r3", "the outlier is named");
});

test("CoFID's trace marker is a finding, not a gap", () => {
  // "Tr" went through parseFloat, became NaN and then no data, discarding the
  // finding on 63 rows. Trace is one of the six states.
  const c = biotinCell({ cofid: { biotin_ug: "Tr" } });
  eq(c.state, "trace", "a trace is what the source said");
  eq(c.sources[0], "cofid-2021", "and it is named");
});

test("a trace never bounds a range", () => {
  // A trace carries no figure, so it cannot be a low bound. Where a source has
  // a number, the number is the cell.
  const c = biotinCell({
    mext: { state: "measured", value: 2.5 },
    cofid: { biotin_ug: "Tr" },
  });
  eq(c.state, "measured", "the figure decides the cell");
  eq(c.value, 2.5, "at its own value");
  eq(c.sources.length, 1, "citing only the source that had a figure");
});

test("CoFID's N is no data and never a zero", () => {
  const c = biotinCell({ cofid: { biotin_ug: "N" } });
  eq(c, null, "a component nobody assayed says nothing");
});

test("a finding beats a gap when neither source has a figure", () => {
  // MEXT looked at nothing, CoFID saw a trace. The trace is the only
  // information here.
  const c = biotinCell({
    mext: { state: "not-measured", value: null },
    cofid: { biotin_ug: "Tr" },
  });
  eq(c.state, "trace", "the finding is the cell");
});

test("a gap does not disagree with a finding", () => {
  // Not-measured is nobody having looked. It has no quarrel with a trace, and
  // recording one would fill the conflict report with noise that hides the
  // real disagreements.
  const c = biotinCell({
    mext: { state: "not-measured", value: null },
    cofid: { biotin_ug: "Tr" },
  });
  eq(c.state, "trace", "the finding is still the cell");
  eq(c.conflict, undefined, "and nothing is reported as a conflict");
});

test("two sources reporting different findings record the conflict", () => {
  // Not-detected against trace is a disagreement no figure can express, and
  // the one thing that must not happen is silence about it.
  const c = biotinCell({
    mext: { state: "not-detected", value: null },
    cofid: { biotin_ug: "Tr" },
  });
  eq(c.state, "trace", "the more informative finding is shown");
  eq(c.conflict.mext, "not-detected", "and the other is recorded");
  eq(c.conflict.cofid, "trace", "with what it said");
});

test("MEXT's own state passes through when nothing has a figure", () => {
  const c = biotinCell({ mext: { state: "not-detected", value: null } });
  eq(c.state, "not-detected", "analysed and none found is a finding");
  eq(c.sources[0], "mext-2020", "named");
});

test("an analysed absence ranges against a finding", () => {
  // AFCD reports 18 analysed biotin zeros. The fix of 2026-08-18 meeting the
  // case it was written for: a source that looked and found nothing widens the
  // spread rather than being averaged away.
  const c = biotinCell({
    mext: { state: "measured", value: 4 },
    afcd: { biotin_ug: "0", derivation: "Analysed" },
  });
  eq(c.state, "range", "an absence against a finding is a range");
  eq(c.low, 0, "from nothing");
  eq(c.high, 4, "to the figure");
  eq(c.median, undefined, "and two figures get no median");
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `node test/tools.mjs`
Expected: the run aborts on the import, `Cannot find module .../tools/biotin.mjs`.

- [ ] **Step 3: Write `tools/biotin.mjs`**

```js
#!/usr/bin/env node
/**
 * Biotin, the only component here that three databases measure and none of
 * them agree about.
 *
 * RECONCILIATION.md rule 5 is the reason this has a file of its own: biotin
 * spreads up to 29x on analysed figures, because it occurs largely
 * protein-bound and a figure depends on whether the assay hydrolysed it free.
 * It is the best genuine three-source range the page carries.
 *
 * The cell builder is here rather than in tools/evidence.mjs because that file
 * runs its loops at import, so nothing inside it can be tested.
 */
import { gradeDerivation, reconcile } from "./reconcile.mjs";

/* CoFID's two markers. N is a component it did not measure. Tr is a trace,
   which is a finding: something was there, below the point where the assay
   would put a number on it. Tr used to reach parseFloat, become NaN and then
   nothing at all, which threw the finding away on 63 rows. */
const num = v => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

/* A state that carries meaning without carrying a figure. Never collapse
   these: which kind of nothing a cell holds is the most useful thing this
   dataset says. */
const passthrough = s =>
  s === "trace" || s === "not-detected" || s === "not-measured" ? s : null;

/* Which of two findings to show where neither carries a figure. A trace says
   something was seen and not-detected says nothing was, so the trace is the
   stronger statement and printing not-detected over it would claim more than
   the evidence supports. The disagreement is recorded either way. */
const RANK = { trace: 3, "not-detected": 2, "not-measured": 1 };

/* Two of these are findings and one is a gap. Not-measured says nothing, so
   it cannot disagree with anything. */
const FINDING = new Set(["trace", "not-detected"]);

/**
 * The biotin cell for one food, from whichever of the three sources reach it.
 *
 * @param {{
 *   mext?: { state: string, value: number|null },
 *   cofid?: { biotin_ug: string },
 *   afcd?: { biotin_ug: string, derivation: string },
 * }} rows
 * @returns {object|null} a cell, or null where no source says anything
 */
export function biotinCell(rows) {
  const cands = [];
  const states = {};

  if (rows.mext) {
    if (rows.mext.state === "measured" && typeof rows.mext.value === "number")
      cands.push({ source: "mext-2020", value: rows.mext.value, derivation: "analysed" });
    else if (passthrough(rows.mext.state)) states.mext = rows.mext.state;
  }
  if (rows.cofid) {
    const raw = String(rows.cofid.biotin_ug ?? "").trim();
    if (raw === "Tr") states.cofid = "trace";
    else if (raw !== "N") {
      const v = num(raw);
      if (v !== null) cands.push({ source: "cofid-2021", value: v, derivation: "analysed" });
    }
  }
  if (rows.afcd) {
    const v = num(rows.afcd.biotin_ug);
    if (v !== null) cands.push({ source: "afcd-r3", value: v,
      derivation: gradeDerivation(rows.afcd.derivation) });
  }

  if (cands.length) return reconcile(cands);

  const held = Object.entries(states);
  if (!held.length) return null;
  held.sort((a, b) => RANK[b[1]] - RANK[a[1]]);
  const [who, state] = held[0];
  const cell = { state, sources: [who === "mext" ? "mext-2020" : "cofid-2021"] };
  /* Two sources reporting different findings is a disagreement no figure can
     express and no range can hold. Recorded rather than resolved. A finding
     against a gap is not a disagreement, so both have to be findings. */
  if (held.length > 1 && held[1][1] !== state && held.every(([, st]) => FINDING.has(st)))
    cell.conflict = Object.fromEntries(held);
  return cell;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `node test/tools.mjs`
Expected: 52 pass, 0 fail. The count rises from 41 by the 11 tests added.

- [ ] **Step 5: Run the whole gate**

Run: `npm test`
Expected: passes. `tools/biotin.mjs` is not yet imported by anything that
builds, so nothing on the page moves.

- [ ] **Step 6: Commit**

```bash
git add tools/biotin.mjs test/tools.mjs
git commit -m "Give the biotin cell a function of its own, and a test"
```

---

### Task 2: Give the AFCD map its match grade

`page-map-afcd.json` maps a slug to a bare key string, and `evidence.mjs:268`
defaults every one of them to `exact`. The README requires one grade per source,
and the pairs the review batches add will include `close` and `proxy`, which a
reader has to be able to see.

The 33 existing entries take `exact` written out. That is what the code has been
asserting and what the page has been showing, so this needs no new review, only
that the assertion stop being implicit.

**Two scaffolding scripts are deleted in this task**, and this is deliberate
rather than tidying. `tools/merge_afcd_maps.mjs` writes `page-map-afcd.json`
from `scratch/` files in the old bare-string shape, so after this change it is a
loaded gun pointed at the file being changed. `tools/update_evidence_mjs.mjs`
rewrites `tools/evidence.mjs` by regex against text this plan replaces, and
running it would corrupt the generator. Both are one-shot scaffolding from an
earlier session and neither is referenced by `package.json`.

**Files:**
- Modify: `tools/evidence/page-map-afcd.json` (all 33 values)
- Modify: `tools/evidence.mjs:265-267`
- Modify: `build.mjs:341-347`
- Delete: `tools/merge_afcd_maps.mjs`, `tools/update_evidence_mjs.mjs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `page-map-afcd.json` values are `{ key: string, match: "exact"|"close"|"proxy" }`.
  Task 5 and every review batch rely on this shape.

- [ ] **Step 1: Record the byte-exact baseline**

The point of this task is that nothing on the page moves. Capture what has to
stay the same:

```bash
cp src/data/evidence.json /tmp/evidence-before.json
```

- [ ] **Step 2: Migrate the map file**

```bash
node -e '
const fs = require("fs");
const p = "tools/evidence/page-map-afcd.json";
const m = JSON.parse(fs.readFileSync(p, "utf8"));
const out = {};
for (const [slug, v] of Object.entries(m))
  out[slug] = typeof v === "string" ? { key: v, match: "exact" } : v;
fs.writeFileSync(p, JSON.stringify(out, null, 2) + "\n");
console.log(Object.keys(out).length, "entries");
'
```

Expected: `33 entries`.

- [ ] **Step 3: Teach the two readers the new shape**

In `tools/evidence.mjs`, replace the head of the AFCD pass:

```js
// AFCD integration
for (const p of Object.entries(afcdMap)) {
  const [slug, key] = p;
  if (!key) continue;
  grade(slug, "afcd-r3", out[slug]?.matches?.["afcd-r3"] || "exact");
  const row = afcdKeyBy[key];
```

with:

```js
// AFCD integration
for (const [slug, entry] of Object.entries(afcdMap)) {
  if (!entry) continue;
  const { key, match } = entry;
  if (!key) continue;
  grade(slug, "afcd-r3", match);
  const row = afcdKeyBy[key];
```

In `build.mjs`, replace:

```js
    for (const [slug, key] of Object.entries(afcdMap)) {
      reach("afcd-r3", slug);
      const row = rows.get(key);
```

with:

```js
    for (const [slug, entry] of Object.entries(afcdMap)) {
      reach("afcd-r3", slug);
      const row = rows.get(entry && entry.key);
```

- [ ] **Step 4: Delete the two scaffolding scripts**

```bash
git rm tools/merge_afcd_maps.mjs tools/update_evidence_mjs.mjs
```

- [ ] **Step 5: Regenerate and prove nothing moved**

```bash
node tools/evidence.mjs
diff /tmp/evidence-before.json src/data/evidence.json && echo "IDENTICAL"
```

Expected: `IDENTICAL`. If the diff is not empty, the migration changed a grade
somewhere and the cause must be found before going on. Do not accept a diff
here on the grounds that it looks harmless.

- [ ] **Step 6: Run the whole gate**

Run: `npm test`
Expected: passes, 52 and 145, and `node build.mjs` reports no problems.

- [ ] **Step 7: Commit**

```bash
git add tools/evidence/page-map-afcd.json tools/evidence.mjs build.mjs
git commit -m "Stop assuming every AFCD mapping is exact, and say so in the file"
```

---

### Task 3: `tools/biotin.mjs propose`

The command that suggests map pairs for review. It proposes and never merges.

**Files:**
- Modify: `tools/biotin.mjs`
- Create on first run: `tools/evidence/proposed-page-map-cofid.json`,
  `tools/evidence/proposed-page-map-afcd.json`,
  `tools/evidence/BIOTIN-MAP-REVIEW.md`

**Interfaces:**
- Consumes: `biotinCell` is untouched by this task.
- Produces: `node tools/biotin.mjs propose <Category> [<Category>...]`.
  Categories are the `cat` values in `src/data/nutrients.json`: `Legumes`, `Soy`,
  `Grains`, `Nuts`, `Seeds`, `Vegetables`, `Algae & yeast`, `Fruit`,
  `Fats & Oils`, `Herbs & Spices`.

- [ ] **Step 1: Write the failing test for the scorer**

The scorer is the part with judgement in it, so it is the part that gets tested.
Append to `test/tools.mjs` and extend the import:

```js
import { biotinCell, scoreCandidate } from "../tools/biotin.mjs";
```

```js
test("a plural page food still matches its singular source row", () => {
  // A first crude pass scored chickpeas and cashews as having no candidate in
  // either database when both hold them, because "Chickpeas" does not contain
  // "Chickpea, dried, boiled, drained".
  const s = scoreCandidate("Chickpeas", "cooked", "Chickpea, dried, boiled, drained");
  if (!(s > 0)) throw new Error(`expected a positive score, got ${s}`);
});

test("scoring refuses to cross raw and cooked", () => {
  // Preparation is the sharpest edge in this data. A cooked page food matched
  // to a dried row measures hydration, not disagreement.
  const cooked = scoreCandidate("Lentils", "cooked", "Lentils, green and brown, whole, dried, boiled in unsalted water");
  const dried = scoreCandidate("Lentils", "cooked", "Lentils, green and brown, whole, dried, raw");
  if (!(cooked > dried)) throw new Error(`cooked ${cooked} should beat dried ${dried}`);
  if (dried > 0) throw new Error(`a raw row for a cooked food should not score, got ${dried}`);
});

test("a food with no preparation is not penalised for having none", () => {
  // Nuts and most fruit carry no state, and neither do their rows.
  const s = scoreCandidate("Almonds", "", "Almonds, whole kernels");
  if (!(s >= 18)) throw new Error(`expected at least 18, got ${s}`);
});

test("a different basis scores below the same basis", () => {
  // CoFID holds almonds four ways. "Weighed with shells" at 23.7 against 64
  // for kernels is a different basis, not a different figure, and a reviewer
  // who accepted it would put a shell-diluted number on the page.
  const kernels = scoreCandidate("Almonds", "", "Almonds, whole kernels");
  const shells = scoreCandidate("Almonds", "", "Almonds, weighed with shells");
  if (!(kernels > shells)) throw new Error(`kernels ${kernels} should beat shells ${shells}`);
});

test("juice is not the fruit", () => {
  const fruit = scoreCandidate("Apples", "raw", "Apples, eating, raw, flesh only");
  const juice = scoreCandidate("Apples", "raw", "Apple juice, clear, ambient and chilled");
  if (!(fruit > juice)) throw new Error(`fruit ${fruit} should beat juice ${juice}`);
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `node test/tools.mjs`
Expected: the run aborts, `scoreCandidate` is not exported.

- [ ] **Step 3: Write the scorer and the command**

Append to `tools/biotin.mjs`:

```js
/* Words that say nothing about which food this is. Preparation words are not
   here: they are scored separately, because getting them wrong is the one
   mistake that puts a plausible number on the wrong row. */
const STOP = new Set(["and", "with", "the", "in", "or", "no", "added", "whole",
  "fresh", "weighed", "flesh", "only", "commercial", "average", "type",
  "unfortified", "regular", "unsalted", "salt", "water", "drained", "from",
  "each", "per", "all", "kernels", "seeds"]);

/* A crude stem: enough to pair "Chickpeas" with "Chickpea" and "Almonds" with
   "Almond" without pulling in a stemmer. Deliberately conservative, because a
   stem that over-merges invents matches a reviewer then has to catch. */
const stem = w => w.length > 3 && w.endsWith("es") ? w.slice(0, -2)
  : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;

const tokens = s => new Set(String(s).toLowerCase().split(/[^a-z]+/)
  .filter(w => w.length > 2 && !STOP.has(w)).map(stem));

const COOKED = ["cooked", "boiled", "baked", "roasted", "steamed", "grilled", "fried", "stewed"];
const RAW = ["raw", "dried", "dry", "uncooked"];

/* Rows whose figure is on a different basis, or whose food is a different
   food, and which score well on words alone. Each of these was seen in the
   corpora rather than imagined. */
const TRAPS = [
  [/weighed with (shell|skin|stone|pod)/, 40],
  [/weighed as purchased/, 40],
  [/juice/, 30],
  [/in syrup|sweetened|with sugar/, 25],
  [/canned/, 15],
  [/salted|toasted|smoked/, 15],
];

/**
 * How well a source row matches a page food. Zero or below means no candidate.
 *
 * @param {string} name page food name, "Chickpeas"
 * @param {string} state page food state, "cooked" or ""
 * @param {string} row the source row's own name
 * @returns {number}
 */
export function scoreCandidate(name, state, row) {
  const want = tokens(name), have = tokens(row);
  let shared = 0;
  for (const w of want) if (have.has(w)) shared++;
  if (!shared) return 0;

  let score = shared * 10;
  const low = String(row).toLowerCase();
  const wantsCooked = COOKED.some(w => String(state).toLowerCase().includes(w));
  const wantsRaw = RAW.some(w => String(state).toLowerCase().includes(w));
  const rowCooked = COOKED.some(w => low.includes(w));
  const rowRaw = RAW.some(w => low.includes(w)) && !rowCooked;

  if (wantsCooked && rowCooked) score += 8;
  if (wantsRaw && rowRaw) score += 8;
  /* A page food carrying no state, matched to a row that names no preparation
     either, has nothing to disagree about. Without this, a whole nut and a raw
     fruit can never reach the score that suggests an exact grade, and every
     pair in those categories arrives at review marked proxy. */
  if (!wantsCooked && !wantsRaw && !rowCooked && !rowRaw) score += 8;
  /* A preparation mismatch is not a weaker match, it is a different
     measurement. It takes the candidate out rather than ranking it lower. */
  if (wantsCooked && rowRaw) return 0;
  if (wantsRaw && rowCooked) return 0;

  for (const [re, penalty] of TRAPS)
    if (re.test(low) && !re.test(String(name).toLowerCase())) score -= penalty;

  return score;
}

/* A grade is a claim about the pair, and the reviewer's to make. This suggests
   one so the common case is a nod rather than a decision. */
const suggestGrade = (score, name, row) => {
  const want = tokens(name), have = tokens(row);
  let shared = 0;
  for (const w of want) if (have.has(w)) shared++;
  return shared === want.size && score >= 18 ? "exact" : score >= 18 ? "close" : "proxy";
};
```

Then the command itself, at the end of the file:

```js
/* Run as a command rather than imported: propose map pairs for review. The
   same entry-point guard tools/usda.mjs carries, so importing this file for
   biotinCell never runs a proposal. */
if (process.argv[1] && process.argv[1].endsWith("biotin.mjs")) {
  const [, , cmd, ...args] = process.argv;
  if (cmd !== "propose") {
    console.error("usage: node tools/biotin.mjs propose <Category> [<Category>...]");
    process.exit(1);
  }
  const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
  const EV = join(ROOT, "tools", "evidence");
  const rd = f => JSON.parse(readFileSync(join(EV, f), "utf8"));
  const slugify = (name, state) => `${name} ${state || ""}`
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const foods = JSON.parse(readFileSync(join(ROOT, "src", "data", "nutrients.json"), "utf8"))
    .foods.filter(f => args.includes(f.cat));
  if (!foods.length) {
    console.error(`no page foods in category ${args.join(", ")}`);
    process.exit(1);
  }

  const hasFigure = v => v != null && v !== "" && v !== "N" && !Number.isNaN(parseFloat(v));
  const cofidRows = rd("cofid-2021-plant.json")
    .filter(r => hasFigure(r.biotin_ug) || r.biotin_ug === "Tr");
  const afcdRows = rd("afcd-r3-plant.json").filter(r => hasFigure(r.biotin_ug));

  const cofidMapped = new Set(rd("page-map-cofid.json")
    .map(m => slugify(m.page, m.page_state)));
  const afcdMapped = new Set(Object.keys(rd("page-map-afcd.json")));

  const top = (rows, nameOf, food) => rows
    .map(r => ({ row: r, score: scoreCandidate(food.name, food.state, nameOf(r)) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const cofidOut = [], afcdOut = {};
  let lines = `\n## Batch: ${args.join(", ")}\n\nProposed ${new Date().toISOString().slice(0, 10)}. Nothing here is mapped until it is read.\n`;

  for (const food of foods) {
    const slug = slugify(food.name, food.state);
    const label = `${food.name}${food.state ? `, ${food.state}` : ""}`;
    const cofid = cofidMapped.has(slug) ? [] : top(cofidRows, r => r.name, food);
    const afcd = afcdMapped.has(slug) ? [] : top(afcdRows, r => r.name, food);
    if (!cofid.length && !afcd.length) continue;

    lines += `\n### ${label}\n\n| Source | Row | Biotin | Derivation | Score | Grade |\n|---|---|---|---|---|---|\n`;
    for (const c of cofid)
      lines += `| CoFID | ${c.row.code} ${c.row.name} | ${c.row.biotin_ug} | analysed | ${c.score} | ${suggestGrade(c.score, food.name, c.row.name)} |\n`;
    for (const c of afcd)
      lines += `| AFCD | ${c.row.key} ${c.row.name} | ${c.row.biotin_ug} | ${c.row.derivation} | ${c.score} | ${suggestGrade(c.score, food.name, c.row.name)} |\n`;

    if (cofid[0]) cofidOut.push({ page: food.name, page_state: food.state || "",
      cofid_code: cofid[0].row.code, cofid_name: cofid[0].row.name,
      match: suggestGrade(cofid[0].score, food.name, cofid[0].row.name),
      biotin_ug: cofid[0].row.biotin_ug });
    if (afcd[0]) afcdOut[slug] = { key: afcd[0].row.key, name: afcd[0].row.name,
      match: suggestGrade(afcd[0].score, food.name, afcd[0].row.name),
      biotin_ug: afcd[0].row.biotin_ug, derivation: afcd[0].row.derivation };
  }

  writeFileSync(join(EV, "proposed-page-map-cofid.json"), JSON.stringify(cofidOut, null, 1) + "\n");
  writeFileSync(join(EV, "proposed-page-map-afcd.json"), JSON.stringify(afcdOut, null, 1) + "\n");
  const doc = join(EV, "BIOTIN-MAP-REVIEW.md");
  const head = "# Biotin map proposals, for review\n\nWritten by `node tools/biotin.mjs propose`. Every pair here is a suggestion.\nAutomated name matching is refused in this project, so nothing reaches a\n`page-map-*.json` until it has been read.\n";
  writeFileSync(doc, (existsSync(doc) ? readFileSync(doc, "utf8") : head) + lines);
  console.log(`${cofidOut.length} CoFID and ${Object.keys(afcdOut).length} AFCD pairs proposed, for review in tools/evidence/BIOTIN-MAP-REVIEW.md`);
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `node test/tools.mjs`
Expected: 57 pass, 0 fail.

- [ ] **Step 5: Run the whole gate and commit**

Run: `npm test`
Expected: passes.

```bash
git add tools/biotin.mjs test/tools.mjs
git commit -m "Suggest biotin map pairs, and refuse to merge them"
```

---

### Task 4: Review batch one, nuts and seeds

Taken first because almonds needs it. AFCD's mapped figure is 0.5 against MEXT's
60, and on two sources that can only read as a range from 0.5 to 60. CoFID holds
64 for whole kernels, which gives rule 4 the third source it needs. Landing this
batch before the union pass of Task 5 means the bad two-source cell never
reaches the page.

**Files:**
- Modify: `tools/evidence/page-map-cofid.json`, `tools/evidence/page-map-afcd.json`
- Modify: `src/data/evidence.json` (regenerated)

**Interfaces:**
- Consumes: `page-map-afcd.json`'s `{ key, match }` shape from Task 2, and the
  `propose` command from Task 3.
- Produces: nothing in code. Wider maps.

- [ ] **Step 1: Propose**

```bash
node tools/biotin.mjs propose Nuts Seeds
```

- [ ] **Step 2: Stop, and put the proposals to Thom**

Show `tools/evidence/BIOTIN-MAP-REVIEW.md` and ask which pairs to take and at
which grade. **This is a review gate, not a formality.** Do not merge a pair
Thom has not accepted, and do not merge the tool's suggested grade over a grade
Thom gives.

- [ ] **Step 3: Apply the accepted pairs by hand**

CoFID pairs append to `tools/evidence/page-map-cofid.json` as
`{ "page": "Almonds", "page_state": "", "cofid_code": "14-896", "cofid_name": "Almonds, whole kernels", "match": "exact" }`.
AFCD pairs go into `tools/evidence/page-map-afcd.json` as
`"almonds": { "key": "...", "match": "exact" }`.

Delete `tools/evidence/proposed-page-map-cofid.json` and
`proposed-page-map-afcd.json` once applied. They are a workbench, not a record.

- [ ] **Step 4: Regenerate and read the diff**

```bash
node tools/evidence.mjs
git diff --stat src/data/evidence.json
```

Read the diff for the foods in this batch. Any cell that moves should move for a
reason you can name. A cell that becomes a range from two sources agreeing, or a
figure that changes by a factor nobody expected, is a mapping error and not a
finding.

- [ ] **Step 5: Run the whole gate**

Run: `npm test`
Expected: passes, and `node build.mjs` reports no problems. A failure naming a
source with no reviewed map means a map merge and a regenerate did not land
together.

- [ ] **Step 6: Commit the map and the regeneration together**

```bash
git add tools/evidence/page-map-cofid.json tools/evidence/page-map-afcd.json src/data/evidence.json tools/evidence/BIOTIN-MAP-REVIEW.md
git commit -m "Map the nuts and seeds into CoFID and AFCD for biotin"
```

---

### Task 5: The union pass

The biotin block leaves the MEXT loop. Until this task, a food MEXT never
assayed cannot have a biotin cell whatever the other two sources hold.

**Files:**
- Modify: `tools/evidence.mjs`: delete lines 177 to 201 and the `afcd` keys in
  `ALT`; add the pass after the MEXT loop closes.
- Test: `test/tools.mjs` (already covers `biotinCell`; nothing new here)

**Interfaces:**
- Consumes: `biotinCell(rows)` from Task 1, `page-map-afcd.json`'s
  `{ key, match }` from Task 2.
- Produces: nothing later tasks import.

- [ ] **Step 1: Record the baseline**

```bash
cp src/data/evidence.json /tmp/evidence-before-union.json
```

- [ ] **Step 2: Remove the old block**

In `tools/evidence.mjs`, delete from the comment `// biotin, from up to three
sources` through the closing brace of its `else` clause, leaving the MEXT
component loop and the `grade(slug, "mext-2020", ...)` call that follows intact.

Delete the five `afcd` entries from the `ALT` table. If that empties `ALT`,
delete `ALT`, its comment and the `alt` binding in the loop. Check first whether
any other pass reads `alt`, with `grep -n "alt\." tools/evidence.mjs`.

`afcdBy`, the AFCD index by name at `tools/evidence.mjs:53`, exists only for the
`ALT` biotin lookup and becomes dead with it. Confirm with
`grep -n "afcdBy" tools/evidence.mjs` and delete it if the definition is the only
line left. `afcdKeyBy`, the index by key, stays: the union pass and the AFCD
inulin pass both use it.

Add `import { biotinCell } from "./biotin.mjs";` beside the existing
`reconcile.mjs` import.

- [ ] **Step 3: Add the union pass**

After the MEXT loop closes, before the IFCT loop:

```js
/* Biotin, over the union of the three maps rather than inside the loop over
   one of them.
 *
 * This used to sit inside the MEXT loop, which meant a food Japan never
 * assayed could not have a biotin cell whatever Britain and Australia held.
 * Walnuts, pistachios, brazil nuts and wholewheat pasta each carry an analysed
 * AFCD figure and had no route to the page. loadAttested in build.mjs already
 * read all three maps, so the checker and the generator held different views
 * of what evidence existed for this column. */
const mextBySlug = Object.fromEntries(map.map(p => [slugify(p.page, p.page_state), p]));
const biotinSlugs = new Set([
  ...Object.keys(mextBySlug),
  ...Object.keys(COFID_ROW),
  ...Object.keys(afcdMap),
]);
const conflicts = [];

for (const slug of biotinSlugs) {
  const mp = mextBySlug[slug];
  const cm = COFID_ROW[slug];
  const cf = cm && cofidByCode[cm.cofid_code];
  const am = afcdMap[slug];
  const af = am && afcdKeyBy[am.key];

  const cell = biotinCell({
    mext: mp && mp.biotin,
    cofid: cf,
    afcd: af,
  });
  if (!cell) continue;

  if (cell.conflict) { conflicts.push(`${slug}: ${JSON.stringify(cell.conflict)}`); delete cell.conflict; }

  /* A grade per source that the cell actually cites. A grade for a source no
     cell names is stripped at the end of this file anyway, but writing one
     here would claim a mapping was used when it was not. */
  const named = new Set([...(cell.sources || []), ...(cell.disputed || []).map(d => d.source)]);
  const prep = mp ? mp.page_state : undefined;
  if (named.has("mext-2020") && mp) grade(slug, "mext-2020", mp.match, prep);
  if (named.has("cofid-2021") && cm) grade(slug, "cofid-2021", cm.match, prep);
  if (named.has("afcd-r3") && am) grade(slug, "afcd-r3", am.match, prep);

  entryFor(slug, prep).cells.biotin = cell;
  nCells++;
  if (cell.state === "range") ranges++;
  if (cell.disputed) disputes++;
}
```

And beside the existing `dropped` report at the end of the file:

```js
for (const c of conflicts) console.log(`biotin findings disagree, ${c}`);
```

- [ ] **Step 4: Regenerate and read the diff carefully**

```bash
node tools/evidence.mjs
git diff src/data/evidence.json | head -200
```

Expected changes, and each should be visible in the diff:

- Walnuts gains 19, pistachios 24, brazil nuts 9.7, wholewheat pasta 4.5, each
  measured, each citing `afcd-r3` alone.
- Banana's 1.95 becomes a range from 0.3 to 2.5 with a median of 1.4, over
  MEXT, CoFID and AFCD.
- Sunflower seeds, mushrooms and kale become ranges.
- Almonds becomes 62 measured with AFCD's 0.5 disputed, given Task 4 landed its
  CoFID pair.
- Chickpeas does **not** change. AFCD's 2.5 is a Recipe, rule 1 excludes it, and
  MEXT's 8.9 stands alone. A cell that holds still here is the design working.

- [ ] **Step 5: Run the whole gate**

Run: `npm test`
Expected: passes, and `node build.mjs` reports no problems.

- [ ] **Step 6: Commit**

```bash
git add tools/evidence.mjs src/data/evidence.json
git commit -m "Stop letting Japan decide which foods may have a biotin figure"
```

---

### Task 6: Review batch two, legumes and soy

Same shape as Task 4. The steps are repeated rather than referenced, because
they are a gate and a gate that has to be looked up gets skipped.

**Files:**
- Modify: `tools/evidence/page-map-cofid.json`, `tools/evidence/page-map-afcd.json`,
  `src/data/evidence.json`

- [ ] **Step 1: Propose**

```bash
node tools/biotin.mjs propose Legumes Soy
```

- [ ] **Step 2: Put the proposals to Thom and wait**

Show `tools/evidence/BIOTIN-MAP-REVIEW.md`. Merge only accepted pairs, at the
grade Thom gives.

- [ ] **Step 3: Apply the accepted pairs by hand, and delete the proposal files**

CoFID pairs append to `page-map-cofid.json` as
`{ "page": "...", "page_state": "...", "cofid_code": "...", "cofid_name": "...", "match": "..." }`.
AFCD pairs go into `page-map-afcd.json` as `"<slug>": { "key": "...", "match": "..." }`.

- [ ] **Step 4: Regenerate and read the diff**

```bash
node tools/evidence.mjs
git diff src/data/evidence.json
```

Watch particularly for AFCD `Recipe` figures being excluded as they should be:
RECONCILIATION.md rule 2 records that every large biotin disagreement between
AFCD and MEXT in the legumes was AFCD reporting a recipe calculation.

- [ ] **Step 5: Run `npm test` and confirm it passes**

- [ ] **Step 6: Commit**

```bash
git add tools/evidence/page-map-cofid.json tools/evidence/page-map-afcd.json src/data/evidence.json tools/evidence/BIOTIN-MAP-REVIEW.md
git commit -m "Map the legumes and soy into CoFID and AFCD for biotin"
```

---

### Task 7: Review batch three, grains

- [ ] **Step 1: Propose**

```bash
node tools/biotin.mjs propose Grains
```

- [ ] **Step 2: Put the proposals to Thom and wait**

- [ ] **Step 3: Apply the accepted pairs by hand, and delete the proposal files**

CoFID pairs append to `page-map-cofid.json` as
`{ "page": "...", "page_state": "...", "cofid_code": "...", "cofid_name": "...", "match": "..." }`.
AFCD pairs go into `page-map-afcd.json` as `"<slug>": { "key": "...", "match": "..." }`.

- [ ] **Step 4: Regenerate and read the diff**

```bash
node tools/evidence.mjs
git diff src/data/evidence.json
```

- [ ] **Step 5: Run `npm test` and confirm it passes**

- [ ] **Step 6: Commit**

```bash
git add tools/evidence/page-map-cofid.json tools/evidence/page-map-afcd.json src/data/evidence.json tools/evidence/BIOTIN-MAP-REVIEW.md
git commit -m "Map the grains into CoFID and AFCD for biotin"
```

---

### Task 8: Review batch four, vegetables

The largest batch at 81 page foods, and the one where the known bias lives:
RECONCILIATION.md rule 5 records CoFID running systematically low on vegetables,
spinach at 0.1 against MEXT's 2.9 and AFCD's 2.5. Expect ranges rather than
agreement, and expect that to be right rather than a mapping error.

- [ ] **Step 1: Propose**

```bash
node tools/biotin.mjs propose Vegetables
```

- [ ] **Step 2: Put the proposals to Thom and wait**

If 81 foods is too much to read at once, split the review by what the proposals
themselves show: the pairs the tool grades `exact` first, then `close` and
`proxy` as a second pass. Do not split it by inventing sub-categories.

- [ ] **Step 3: Apply the accepted pairs by hand, and delete the proposal files**

CoFID pairs append to `page-map-cofid.json` as
`{ "page": "...", "page_state": "...", "cofid_code": "...", "cofid_name": "...", "match": "..." }`.
AFCD pairs go into `page-map-afcd.json` as `"<slug>": { "key": "...", "match": "..." }`.

- [ ] **Step 4: Regenerate and read the diff**

```bash
node tools/evidence.mjs
git diff src/data/evidence.json
```

- [ ] **Step 5: Run `npm test` and confirm it passes**

- [ ] **Step 6: Commit**

```bash
git add tools/evidence/page-map-cofid.json tools/evidence/page-map-afcd.json src/data/evidence.json tools/evidence/BIOTIN-MAP-REVIEW.md
git commit -m "Map the vegetables into CoFID and AFCD for biotin"
```

---

### Task 9: Review batch five, fruit

- [ ] **Step 1: Propose**

```bash
node tools/biotin.mjs propose Fruit
```

- [ ] **Step 2: Put the proposals to Thom and wait**

The juice trap is at its worst here. CoFID holds apple juice concentrate at 2.0
and clear apple juice at 0.9 alongside the apples themselves, and the scorer
penalises but does not exclude them.

- [ ] **Step 3: Apply the accepted pairs by hand, and delete the proposal files**

CoFID pairs append to `page-map-cofid.json` as
`{ "page": "...", "page_state": "...", "cofid_code": "...", "cofid_name": "...", "match": "..." }`.
AFCD pairs go into `page-map-afcd.json` as `"<slug>": { "key": "...", "match": "..." }`.

- [ ] **Step 4: Regenerate and read the diff**

```bash
node tools/evidence.mjs
git diff src/data/evidence.json
```

- [ ] **Step 5: Run `npm test` and confirm it passes**

- [ ] **Step 6: Commit**

```bash
git add tools/evidence/page-map-cofid.json tools/evidence/page-map-afcd.json src/data/evidence.json tools/evidence/BIOTIN-MAP-REVIEW.md
git commit -m "Map the fruit into CoFID and AFCD for biotin"
```

---

### Task 10: Review batch six, the rest

Algae and yeast, fats and oils, herbs and spices. Expect this batch to be mostly
empty and expect that to be correct: neither CoFID nor AFCD holds much biotin for
seaweed or for oil, and a pure oil has no biotin to hold.

- [ ] **Step 1: Propose**

```bash
node tools/biotin.mjs propose "Algae & yeast" "Fats & Oils" "Herbs & Spices"
```

- [ ] **Step 2: Put the proposals to Thom and wait**

- [ ] **Step 3: Apply the accepted pairs by hand, and delete the proposal files**

CoFID pairs append to `page-map-cofid.json` as
`{ "page": "...", "page_state": "...", "cofid_code": "...", "cofid_name": "...", "match": "..." }`.
AFCD pairs go into `page-map-afcd.json` as `"<slug>": { "key": "...", "match": "..." }`.

- [ ] **Step 4: Regenerate and read the diff**

```bash
node tools/evidence.mjs
git diff src/data/evidence.json
```

- [ ] **Step 5: Run `npm test` and confirm it passes**

- [ ] **Step 6: Commit**

```bash
git add tools/evidence/page-map-cofid.json tools/evidence/page-map-afcd.json src/data/evidence.json tools/evidence/BIOTIN-MAP-REVIEW.md
git commit -m "Map what is left into CoFID and AFCD for biotin"
```

---

### Task 11: Record what happened

**Files:**
- Modify: `tools/evidence/RECONCILIATION.md`, `tools/evidence/README.md`
- Modify: `src/data/nutrients.json` if the biotin `why` no longer describes the
  column

- [ ] **Step 1: Measure the column as it now stands**

```bash
node -e '
const ev = require("./src/data/evidence.json");
const c = {};
let sources = {};
for (const e of Object.values(ev)) {
  const b = e.cells.biotin;
  if (!b) continue;
  c[b.state] = (c[b.state] || 0) + 1;
  const n = (b.sources || []).length;
  sources[n] = (sources[n] || 0) + 1;
}
console.log("states", c);
console.log("cells by number of sources", sources);
'
```

- [ ] **Step 2: Update RECONCILIATION.md**

Under Rule 5, record the counts from step 1 and that the range is now built from
three reviewed maps rather than one map and a hardcoded table. State how many
cells rest on two or three sources, since that is what "biotin does not
reconcile" now shows rather than asserts.

- [ ] **Step 3: Update tools/evidence/README.md**

Three corrections, all of them things the file currently gets wrong or omits:

- The corpus table says `page-map-mext.json` holds 81 mappings. It holds 102.
- The AFCD map's shape is now `{ key, match }` and its grade is real rather than
  defaulted.
- CoFID's `Tr` is a trace and passes through as one.

- [ ] **Step 4: Check the biotin column description still tells the truth**

`src/data/nutrients.json` describes biotin as a column where "several foods show
a range rather than a number". Confirm against the counts from step 1 and adjust
the wording if "several" has become an understatement.

- [ ] **Step 5: Run the whole gate**

Run: `npm test`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add tools/evidence/RECONCILIATION.md tools/evidence/README.md src/data/nutrients.json
git commit -m "Say what the biotin column became"
```
