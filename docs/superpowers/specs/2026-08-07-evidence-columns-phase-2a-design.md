# Evidence columns, phase 2a: the components Japan already reaches

Written 2026-08-07, after phase 1 shipped. The parent design is
`2026-08-07-evidence-columns-design.md` and everything here refines its phase 2.
Read that first for the cell model, the six states and the four reconciliation
rules, none of which change.

## What the parent design got wrong about phase 2

It said phase 2 was "the rest of the components, group by group" and that they
would be "data changes plus column definitions" because there was no new
machinery. The machinery part is right. The rest is not, and two measurements
say why.

**Beta-glucan has no source.** The parent design lists it as a fibre-fraction
column. It appears in no corpus in `tools/evidence/` and in no field of any of
the eight databases held. SR Legacy defines ids 1068 and 2058 and publishes zero
rows, which was already recorded; what is new is that nothing else carries it
either. Beta-glucan is in the same position as pectin, which the parent design
already excluded for exactly this reason. **So phase 2 is 31 columns, not 32.**

**Sixteen of the 31 are blocked on mappings, not on data.** Reviewed page
mappings exist for MEXT, at 81 of the 131 foods, and for 15 hand-checked AFCD and
CoFID pairs added during phase 1. IFCT and Frida have none at all. Since this
project refuses automated name matching, and refuses it on evidence (Black beans
paired with "Black pudding, boiled"), every component whose only source is IFCT,
Frida or the unmapped bulk of AFCD cannot be written until a mapping exercise
produces reviewed pairs. That is the same shape of work that produced
`page-map-mext.json` and it is the slow part of phase 2.

The split:

- **15 reachable through the existing MEXT mappings**, with no new mapping work.
- **16 blocked on a mapping exercise**: AFCD for sulphur, fluoride, nickel and
  inulin; IFCT for phytate, saponins, the three phytosterols, the oxalate split
  and raffinose, stachyose and verbascose; CoFID for the oligosaccharides; Frida
  for boron.

This design covers the 15. The 16 follow as phase 2b, one change per database.

## The 15 columns

All from MEXT, all single-source, all joined on `jp_code` through the 81 reviewed
mappings. The table goes from 73 columns to 88.

"Informative" below counts the states that say something about the food:
`measured`, `trace` and `not-detected`. It excludes `estimated`, which is stored
and shown marked but is a calculation rather than an assay, and `not-measured`,
which says only that nobody looked.

| id | label | group | unit | dp | MEXT field | informative of 81 |
|---|---|---|---|---|---|---|
| `mo` | Molybdenum | mineral | µg | 0 | `plant.mo` | 80 |
| `iodine` | Iodine | mineral | µg | 0 | `plant.iodine` | 79 |
| `resstarch` | Resistant starch | macro, after `insolfibre` | g | 1 | `fibre.resistant_starch` | 7 |
| `starch` | Starch | carbdetail | g | 1 | `sugars.starch` | 55 |
| `glucose` | Glucose | carbdetail | g | 1 | `sugars.glucose` | 59 |
| `fructose` | Fructose | carbdetail | g | 1 | `sugars.fructose` | 57 |
| `sucrose` | Sucrose | carbdetail | g | 1 | `sugars.sucrose` | 59 |
| `maltose` | Maltose | carbdetail | g | 1 | `sugars.maltose` | 55 |
| `sorbitol` | Sorbitol | carbdetail | g | 1 | `sugars.sorbitol` | 5 |
| `mannitol` | Mannitol | carbdetail | g | 1 | `sugars.mannitol` | 6 |
| `organicacids` | Organic acids, total | acids | g | 1 | `acids.total_oa` | 32 |
| `citric` | Citric acid | acids | g | 1 | `acids.citric` | 29 |
| `malic` | Malic acid | acids | g | 1 | `acids.malic` | 30 |
| `quinic` | Quinic acid | acids | g | 1 | `acids.quinic` | 10 |
| `oxalate` | Oxalate, total | acids | g | 1 | `acids.oxalic` | 20 |

`mo` follows the chemical-symbol convention `se`, `mn`, `zn` and `cu` already
set. `iodine` does not, because `i` is too thin to read in a data file.

`oxalate` is labelled "Oxalate, total" rather than "Oxalate" because phase 2b
adds the soluble and insoluble fractions from IFCT, and the parent design is
emphatic that the split matters more than the total: sesame carries 2,156 mg of
total oxalate but only 78.6 mg soluble, and only the soluble fraction binds
calcium. Naming the total honestly now avoids renaming a shipped column later.
**Note for phase 2b: MEXT reports oxalic acid in grams and IFCT reports oxalate
in milligrams, so those two cannot be reconciled without a conversion.**

There is no coverage floor, by the owner's decision. Sorbitol at 5 and mannitol
at 6 ship as they are, and widen when AFCD is mapped in phase 2b. The organic
acid file covers only 33 of the 81 mapped foods at all, which is why those five
columns cannot exceed 33 however good the data is inside them.

Precision is one decimal for the grams and none for the two micrograms, taken
from what MEXT itself reports. The 15- and 16-decimal figures in the corpora are
float artefacts from extraction, which `tidy()` in `reconcile.mjs` already rounds
away at six places.

**Every one of these is single-source, so `reconcile()` returns `measured` and
never a range.** That is the honest outcome rather than a weakening of the
mechanism. The range machinery stays exercised by biotin, and these columns gain
ranges in phase 2b when a second source arrives to disagree.

### The check this design deliberately does not add

Soluble plus insoluble fibre does not sum to the Fibre column, and starch plus
the sugars does not sum to Carbohydrate. The totals are USDA figures from
American samples; the fractions are Japanese figures from Japanese samples. **A
build check asserting the parts fit the whole would fail on correct data.**

This needs saying out loud because the instinct to add it is strong and the
project already has a rule that looks like its twin: `tools/usda.mjs pull`
refuses to write a value that contradicts a total already in the table, and
`build.mjs` enforces the same. That rule holds within one release. It does not
cross releases, and evidence columns always cross releases. The point is made in
the `why` sentences instead.

## Two new column groups

```
macro  fats  amino  vitamin  mineral  carbdetail  acids  plant
```

`carbdetail` is "Carbohydrate detail" and `acids` is "Organic acids", placed
before `plant` so the sugars sit near the macronutrients they decompose and the
acids beside the plant compounds. Group order is the `GROUPS` array in `app.ts`,
which `COL_ORDER` already reads, so nothing about column ordering changes.

Both start visible, keeping the existing rule that every group starts on and the
reader switches off what they are not reading.

Almost everything derives from `GROUPS`: the sidebar nav, the header colspan row,
the chart nutrient picker, the comparison view, the group tints and
`GROUP_BLURB`. Four things need a hand edit:

1. **The `NutrientGroup` union** at `src/app.ts:8`, which is a literal type.
2. **Two icons in `icons.json`**. No existing icon fits, so these are new 24x24
   stroke SVGs matching the set's shape.
3. **`GROUP_BLURB`**, a `Record<NutrientGroup, string>`, so the compiler demands
   both entries rather than letting the sentence go stale.
4. **`DETAIL_TABS`** at `src/app.ts:1606`, and this one is a trap. Its comment
   claims it is "driven off GROUPS so a new group cannot be added to the table
   and left out of here". It is a hand-written literal
   `["vitamin", "mineral", "amino", "plant"]`, so the comment is false today.
   Both new groups get a detail tab, because unlike `macro` and `fats` their
   cells are evidence cells whose sources and match grade the detail panel is the
   only place to show. The comment is corrected to describe the code, and a test
   makes the claim true.

## The generator

`tools/evidence.mjs` hard-codes its three components today: an inline pair for
the fibres and a bespoke block for biotin. Eighteen components need a shape, so
the uniform ones become a declaration:

```js
const COMPONENTS = [
  { id: "solfibre",  corpus: "fibre",  field: "sol_prosky" },
  { id: "resstarch", corpus: "fibre",  field: "resistant_starch" },
  { id: "mo",        corpus: "plant",  field: "mo" },
  { id: "starch",    corpus: "sugars", field: "starch" },
  { id: "citric",    corpus: "acids",  field: "citric" },
  // ... 17 rows
];
```

All four MEXT corpora key on the same food code, so one loop over the 81 mappings
handles every row. A food absent from a corpus gets no cell at all, which renders
`no data`, and that is why the organic acids reaching 33 of 81 needs no special
case anywhere.

**Biotin stays a hand-written block.** It is the only multi-source component, and
the shape of a multi-source declaration is not knowable until the AFCD and IFCT
mappings exist. Generalising the table to cover a second case that does not exist
yet would be designing against an imagination. The table covers what is uniform.
Biotin is not uniform, and phase 2b is where that question gets answered with
real cases in hand.

## The cell loses four fields

Every cell today repeats `unit`, `basis`, `prep` and `match`. At phase 1's 243
cells that costs little. Phase 2a writes 954 more, for about 1,200 in total, and
the four fields minify to roughly 62 bytes each time. That is about 74 KB of pure
repetition on a page that is currently 286 KB.

None of the four belongs on a cell:

- **`basis`** is the string `"per 100 g"` on every cell in the file. A constant
  is not data. It goes, and the basis is stated once in prose.
- **`unit`** is already on the column definition in `nutrients.json`. Holding it
  in two places means the two can disagree, which is a drift bug waiting for
  someone to edit one and not the other. **Removing the field makes that
  unrepresentable rather than merely checked**, which is the same move the parent
  design made by keeping evidence values out of `v`.
- **`prep`** and **`match`** are properties of the food's mapping, not of the
  component. Every cell of one food carries identical values for both. They move
  up one level and are stored once per food.

So the file becomes:

```json
{
  "lentils-cooked": {
    "prep": "cooked",
    "match": "exact",
    "cells": {
      "solfibre": { "state": "measured", "value": 0.9, "sources": ["mext-2020"] }
    }
  }
}
```

A cell keeps only what varies: `state`, `value` or the `low` and `high` bounds,
`sources`, and where they apply `n` and `disputed`.

This touches `ev()`, `evText()`, `checkEvidence()` and the detail panel. **It is
far cheaper now at 18 columns than later at 34**, which is the reason for doing
it in this change rather than deferring it.

## Validation

`checkEvidence` in `build.mjs` changes to match the new shape: `prep` and `match`
are validated once per food rather than per cell, `match` must be one of `exact`,
`close` or `proxy`, and the `unit` and `basis` checks go away with the fields.
Everything else it already refuses stays: an unknown state, a value with no
resolvable source, a range whose bounds are equal, a source nothing cites.

**One check is new, and it exists because phase 1 drifted.** Two gap entries have
been false since phase 1 shipped:

- `fibrefractions` still says "The Fibre column here is a single total, so the
  prebiotic fractions cannot be separated out of it." Soluble and insoluble fibre
  have been columns since phase 1.
- `traces` still says "Biotin, chromium, molybdenum, boron and taurine... they
  are missing columns rather than missing nutrients." Biotin is a column.

`build.mjs` already refuses a gap entry that *names* an evidence column, but both
entries carry `nutrients: []` and make their claims in prose, so the check never
fired. The prose was hand-written and nothing could check it.

So each gap entry gains an optional **`absent`** array naming the component ids
it claims are missing, and the build fails if any id in it has a column. That
turns "beta-glucan, pectin and free inositol are not here" from a sentence into
an assertion.
It is this project's own convention, that prose describing the data derives from
the data, applied to the one place it was not.

## Tests

Three new, each aimed at a failure that has actually happened in this repository:

1. **The header covers the columns.** Phase 1 put every group label from
   macronutrients rightwards over the wrong columns, and 148 tests missed it
   because every one of them asked the data rather than the rendered header. This
   asserts, from the built page, that the header's colspans sum to the visible
   column count and that each group label sits over its own columns. Adding two
   groups is precisely the change that would break it again.
2. **Every group holding evidence columns has a detail tab.** This is what makes
   the `DETAIL_TABS` comment true.
3. **The dropped list stays dropped**, extended with beta-glucan and pectin. Both
   now have a measured reason rather than an assumed one: no source among the
   eight databases carries either.

The existing invariant test needs no change and gains reach for free. It empties
`evidence.json` and asserts that no rendered figure, day total, amino acid score
or "Short on" entry moves. That now covers 18 columns instead of 3.

The existing per-state tests extend to the new columns, in particular that
`not-detected` never renders as `0` and `no data` never renders as
`not measured`. Iodine is the best case the page has ever had for that
distinction: 43 of 81 foods were assayed and none was found.

## The prose repair

Seven sites assert things this change makes false, three of them already false
today. Line numbers are as of writing and will drift; the quoted text is the
reliable way to find each one.

| Site | Now says | Becomes |
|---|---|---|
| `gaps.json` `iodine` | "There is no column for it here" | Has a column. 43 of 81 foods analysed and none detected. Kelp and nori are orders-of-magnitude outliers. Still no total, because no evidence column has one |
| `gaps.json` `fibrefractions` | "The Fibre column here is a single total" | False since phase 1. Soluble, insoluble and resistant starch are columns; inulin, beta-glucan, pectin and the oligosaccharides are not |
| `gaps.json` `traces` | "Biotin, chromium, molybdenum, boron and taurine... missing columns" | False since phase 1. Biotin and molybdenum are columns; chromium is parked, boron waits on Frida, taurine is deliberately prose-only |
| `app.ts:3135` | "Iodine has no column, so it has no total" | Has a column and still no total, which is true of every evidence column |
| `app.ts:3173` | "Iodine is not a column, so fortification with it is..." | Rewritten |
| `app.ts:3186` | "Iodine is not included" | Rewritten |
| `README.md:1369` | "Iodine, as reliable per-food values are scarce" | Rewritten, and the "Evidence columns" section extended |

**The iodine note gets stronger rather than weaker.** It argues from absence
today. Afterwards it argues from 79 informative cells of which 43 are analysed
absence, which is the same shape as the B12 finding this project already rates as
its best line: not that some foods are low, but that they were measured and found
to contain none.

### Iodine will change again, and that is the mechanism working

Within the 81 mapped foods, MEXT gives kelp 200,000 µg per 100 g, nori 1,400, and
everything else between 1 and 6. Phase 2b adds AFCD, which reports rolled oats at
74 µg against Japan's not-detected, and the USDA iodine release, which settles
that conflict at near zero. So some iodine cells become ranges and one becomes a
disputed source.

That is not a promise broken. The cell already names `mext-2020` as its source
and the detail panel shows it, so a reader is told what the figure rests on
before it widens. A figure that widens when a second source arrives is what an
evidence column is for.

## Deliberately not done

- **No mapping exercise.** AFCD, IFCT, CoFID and Frida stay at the 15 hand pairs
  phase 1 added. That is phase 2b.
- **No beta-glucan or pectin column, ever, on current sources.** Neither is
  carried by any of the eight databases, and the `absent` check now enforces it.
- **No free inositol column**, for the same reason and measured the same way. SR
  Legacy defines id 1181 and publishes zero rows across all 7,793 foods, against
  controls of 7,793 for protein and 7,708 for calcium, and the string does not
  appear in any of the fourteen corpus files. It joins beta-glucan and pectin in
  the `absent` list.

  **Inositol phosphate is a different matter and is already due.** Phytate is
  inositol hexaphosphate, IFCT table 11 carries it at 298 of 304 rows, and it is
  one of the 16 components phase 2b unlocks. SR Legacy defines phytic acid as
  1042 and inositol phosphate as 1182 and publishes zero rows of either. No held
  source breaks phytate down into IP3 through IP6, so the column is the total.

  The two are not independent, which is worth recording so the question is not
  reopened from scratch: in most plant foods the bulk of inositol is bound as
  phytate rather than free, so the phytate column answers much of what a reader
  asking about inositol wants, and a free-inositol column would be the remainder
  rather than the whole.
- **No chromium.** Still parked, and MEXT's 41 measured values stay unused.
- **No selenium column from MEXT**, though it has 80 informative cells here. The
  page already has a selenium column from SR Legacy, and a second one from a
  different country would be two columns of the same nutrient.
- **No galactose or trehalose column.** Galactose has zero measured values across
  the 81 mapped foods and the parent design already dropped it. Trehalose is 37
  of 81 calculated and 2 measured.
- **No generalised multi-source declaration.** Deferred to phase 2b, where real
  second sources will say what shape it needs.
- **No parts-fit-the-whole check**, for the reason given above.
- **No change to the reconciliation rules.** All four stay exactly as phase 1
  shipped them.
- **Fineli is not used**, though it carries individual sugars and organic acids
  and would widen the two thinnest groups here. It was assessed as overlapping
  what is held, and it needs a mapping exercise of its own, so it belongs in
  phase 2b if it is picked up at all.

## What follows

Phase 2b is one change per database, each adding its reviewed mapping and the
components that mapping unlocks: AFCD, then IFCT, then CoFID, then Frida. Phase 3
is the prose the parent design describes, which is now smaller, because the
falsified sentences are repaired here rather than left standing between phases.
