# Handover, August 2026

**All of this is on `main` and pushed.** `evidence-provenance` and
`preparation-alliums` were both merged and deleted; the remote still carries a
stale `evidence-provenance` that can go whenever. Tests are green: `npm test`
gives 36 in `test/tools.mjs` and 144 in `test/smoke.mjs`.

## Where things stand

**222 foods, 119 nutrient columns, 45 of them evidence columns.** The evidence
store holds 1,985 cells across 170 foods and 46 sources. `src/data/preparation.json`
holds 7 records over 2 components and 7 sources.

Three corrections to earlier sections of this document are marked in place below,
and they are the most useful thing in it. The sulforaphane question is settled,
the claim that `usda-map.json` is why the flavonoid columns are thin was wrong,
and the 40-minute chopping rule is refused while the 10-minute garlic one is not.

**The canonical food list is `src/data/nutrients.json` under `foods`.** Not
`src/data/portions.json`, which covers a subset and lacks the raw variants added
in `8e70d8b`. Reading portions as the food list produced a wrong inventory once
already.

## What changed, in order

1. **CoQ9** went from 1 cell to 8, from Mattila 2001, a paper already cited for
   CoQ10. Also corrected cauliflower CoQ10 from 0.3 to 0.27, which was a
   one-decimal rounding stored in a two-decimal column.
2. **Melatonin** was repaired rather than extended. Three of its four cells named
   Arnao 2018 for figures that paper does not contain (its table has no walnut
   and no pistachio row), and all three printed as `0.0`. Tomato and pistachio
   dropped, walnut re-derived from Verde 2022 as a range over four cultivars.
3. **Beta-glucan, ergothioneine, raffinose, stachyose** from USDA FoodData
   Central **Foundation Foods**, which is not SR Legacy and carries components
   SR Legacy defines and never fills.
4. **Fifteen foods added** (rye bread, pumpernickel, three mushrooms, kimchi,
   cassava, bamboo shoots, radicchio, mangetout, nectarines, tangerines,
   elderberries, tamarind, mulberries), then **fifteen more as raw variants** of
   vegetables previously carried only cooked.
5. **MK-10 got its first figure** (rye bread, 0.12 µg) from `jensen-2025`, which
   had sat unused in this repo since ingestion because no page food matched it.
   It was never a sourcing problem; the food list was the gap.
6. **Glucoraphanin** went from 2 cells to 14, from the **USDA/ODS-NIH
   Glucosinolate Database Release 1 (May 2026)**, the first source here that
   states its own molecular weight (437, the free acid).
7. **Pectin** went from 1 cell to 10, from **Kawabata & Sawayama 1973** on
   J-STAGE. Its English abstract gives only banded categories; Table 3 has the
   per-food figures and is a scanned image that had to be read, not parsed.
8. **Resistant starch** gained 5 foods from **TBCA's carbohydrate profile
   supplement** (Brazil), which prints each sample's moisture beside the analyte.
9. **Total phenolics and verbascose columns removed.** One value each after five
   rounds; neither was going to gain a second.
10. **`src/data/preparation.json` added**, the first dataset here that describes
    what to do to a food rather than what is in it. Five records on cooked
    brassicas, five sources read from their primary abstracts, its own check in
    `build.mjs` and a `prep` dialog. Its `measuredIn` field is the load-bearing
    one: the records apply to nine cooked brassicas and were measured in broccoli,
    and the page marks the other eight as carried rather than asserting eight
    measurements nobody made.
11. **Lee 2010's two-directional disagreement explained** as one preparation
    artefact rather than two conflicts, and nothing moved on the strength of it.
12. **Garlic added to `preparation.json`**, and the 10-minute rule kept rather
    than refused. Song & Milner 2001 tested exactly that interval; Lawson & Hughes
    1992 shows the kinetics do not contradict it, because garlic has two alliinase
    activities and the fast one, allicin, is over in about 20 seconds. Onion, leek,
    shallot and spring onion deliberately get nothing.
13. **`componentLabel` added** to the preparation schema, its first extension. A
    record may now name a substance the table does not measure, because there is
    no allicin column and no data for one, and adding an empty column to carry the
    advice would be worse than saying there is no column.

## Rules that earned their keep

These are written up properly in `tools/evidence/README.md`. In short:

- **Fresh weight as eaten.** If a sample was dried before analysis, the moisture
  in its results describes the dried material and no conversion is possible.
  This killed most of the journal literature.
- **Molar units need a stated molecular mass.** Glucoraphanin is 437.5 as the
  free acid, 475.6 as the potassium salt, different again as the desulfo form.
  Sources that do not state the convention stay in µmol.
- **The abstract is not the table.** Twice now the abstract gave bands or a
  summary and the table gave usable figures.
- **Data products beat papers.** Every substantial win came from a database, a
  release, a workbook or a supplementary file.
- The generator must be **idempotent**; `test/tools.mjs` asserts the store is a
  fixed point of its own passes. That test has caught two real data-destroying
  bugs.

## Thinnest columns now, out of 222 foods

MK-10 1, MK-9 2, quinic acid 3, melatonin 3, MK-4 3, MK-8 3, beta-glucan 4,
inulin 4, raffinose 4, stachyose 4, MK-7 4, CoQ9 5.

The menaquinone counts are misleading in isolation: MK-4 has 32 cells and MK-7
33, most of them analysed absences, which is a finding rather than a gap.

## Settled: sulforaphane and myrosinase both get no column

**Answered 2026-08-14, both no, for different reasons. Do not re-open either
without reading `docs/superpowers/specs/2026-08-14-glucosinolate-preparation-design.md`,
which holds the verified sources.**

**Sulforaphane**: the reasoning below stood up. It is the yield of a reaction
rather than a constituent.

**Myrosinase**: no column either, and it fails for a sharper reason than
sulforaphane does. Published activity is defined by its assay, not by the food.
Gonda 2016 measures four fresh vegetables against two substrates in one
laboratory, and the substrate choice **reverses the rank order** of two of them:
sinigrin says radish holds 2.3 times the myrosinase of watercress, gluconasturtiin
says watercress holds slightly more than radish. Only two of its four foods map to
ours, so a column would have launched at two cells, one fewer than the two columns
deleted last round for holding one each.

**What was built instead**: `src/data/preparation.json`, which says what to *do*
to a cooked brassica rather than what is in it. Five records, five verified
sources, its own build check and a `prep` dialog. The strongest is Okunade 2018, a
randomised human crossover where 1 g of mustard powder with 200 g of cooked
broccoli raised urinary sulforaphane metabolite from 9.8 to 44.7 µmol/g creatinine.
The widely repeated 40-minute rule is refused: it has no traceable source, and
crushing at room temperature makes the inactive nitrile the main product, 52 to
91 % of it depending on cultivar.

The original reasoning, which held:

> Intact broccoli contains almost no sulforaphane. It contains **glucoraphanin**,
> stored apart from the enzyme **myrosinase**. Sulforaphane forms only when the
> tissue is damaged and the two meet. So "sulforaphane content" is not a property
> of a food, it is the yield of a reaction, and it varies with chop size, time
> before heating, cooking method, residual enzyme activity, pH, ascorbate and the
> digestion protocol.

The practical consequence is that two published sulforaphane figures for the same
vegetable are usually not measuring the same quantity, so a column of them would
not be comparable down its own length, which is the one thing a column must be.

The glucoraphanin column exists and is populated (14 foods), and glucoraphanin is
the thing a food actually contains.

**If the column is wanted anyway**, the defensible shape is a separate
conditioned-yield record, not a composition column: food, preparation, tissue
disruption, myrosinase source, temperature, pH, time, additives, then the yield.
Do not derive sulforaphane from glucoraphanin: conversion ranges from a few per
cent to most of the substrate.

Sources already identified as genuine conditioned-yield experiments. **Matusheski
2004 and Wang 2012 have since been read and are cited by `preparation.json`**;
Pérez 2014 is dry mass and unusable here, Sarvan 2016 is in vitro digestion and
was not pulled.

One method note that will save the next session ten minutes: **PubMed's web
interface blocks the fetcher with a cookie wall.** Use E-utilities instead,
`efetch.fcgi?db=pubmed&id=<ids>&rettype=abstract&retmode=text`, which returns
clean text and takes several ids at once.

## Answered 2026-08-17: no, not for Phenol-Explorer's sake

**Phenol-Explorer is not a second source for these columns.** It and USDA
Release 3.3 compiled the same papers: 143 of the 178 cells a page map would fill
share at least one publication with USDA's own reference list for the same food.
Its pecan is USDA's pecan to one decimal place. What survives the preparation,
completeness and method rules is 8 new figures, 2 disagreements worth a range,
and about 30 analysed zeros, which does not pay for taking five columns out of
the chart and re-rendering 224 cells.

The map, both databases' publication lists, the provenance check and the
reasoning are committed: `tools/evidence/PHENOL-EXPLORER-MAP-REVIEW.md`,
`tools/phenol_explorer.mjs`, `tools/flavonoids.mjs refs`. The conversion is one
session whenever a source that is genuinely outside USDA's reference list turns
up, and that is now a question this repo can ask of a candidate before doing any
of the work.

The section below is what was believed before that, kept because the sizing and
the column-by-column line-up are still right.

## Superseded: do the flavonoid columns become evidence columns?

**This gates the most valuable work left, and it is a design decision rather than
a data pull.**

`tools/evidence/phenol-explorer.json` holds 6,953 rows over 439 foods, is graded
`quality: high`, and its own note calls its 5,055 PubMed ids the best provenance
of any source here. It has **zero cells**. Four of the five flavonoid columns line
up with it, because it stores aglycones as their own rows and the aglycones are
what those columns sum. Anthocyanidins does not: it reports glycosides.

The blocker is not the data. The five flavonoid columns live in `v`, filled by
`flavonoids.mjs` from one source, and a `v` column has nowhere to record which
source a cell came from. Evidence columns do. So taking a second flavonoid source
means converting those columns first, and that changes how 222 rows render.

Sized at roughly **30 foods gained** against 128 now empty. Full assessment,
including why a reviewed page map is needed and the "Pearl barley" to "pear"
match that proves it, is in `tools/evidence/RECONCILIATION.md`.

## Known unfinished business

- **Kawabata 1974** Table 6 has pectin for ~50 fruits and nuts on the same fresh
  basis. The numbers are readable; the food names run vertically down a 1974
  scan and could not be aligned to rows with confidence. Needs a better scan.
- **Baker 1997** on fruit and vegetable pectin levels: Wiley blocks it.
- ~~**Pellegrini 2010** would give glucoraphanin and total glucosinolates in the
  same samples, which would fix broccoli's part-exceeds-whole.~~
  **No longer needed, checked 2026-08-17. There is no part-exceeds-whole left.**
  Every row holding both figures now has the part below its total; cooked broccoli
  is 9.24 against 61.7. The violation was Lee 2010's 89 mg, and it went away when
  the USDA glucosinolate release replaced Lee's two figures and Lee stayed on as
  the dissent. The subset check in `build.mjs` still stands guard over it.
  Pellegrini was pulled anyway (PMID 20218674): it is a cooking-methods study and
  its abstract reports glucosinolates only as a group, so it would not have
  answered this without its tables, which are behind ACS.
  **One latent risk worth knowing:** `broccoli-raw` carries glucoraphanin up to
  **217.9** and no total. Any total added for raw broccoli below that will trip
  the subset check, and the fault will be the 217.9, which is one cultivar extreme
  out of 210 means.
- **Natto MK-7** is Kamao's 939 while this README says it should be a range. The
  range cannot be built because no source publishes a total K2 for natto and the
  subset check refuses a part above its whole. Documented in the README.
- ~~`usda-map.json` covers **44 of 222 foods**, which is why the flavonoid columns
  are thin. Widening it is likely worth more than any new source.~~
  **Wrong, and checked 2026-08-14.** `sourceRows()` in `tools/usda.mjs` merges the
  map with the `fdc_id` each food carries in `tools/food-additions.json`, which
  already held 178, so **219 of 222 foods were already mapped**. The map was
  widened to all 222 and the pull re-run: the filled counts did not move,
  33/53/66/2/70 before and after. The flavonoid columns are thin because **only 94
  of 222 foods appear in USDA Flavonoid Release 3.3 at all**, which is a property
  of that database. Widening those columns needs a **new source**, not a better
  map. The map is deliberately left at 44 rather than holding a second copy of 178
  mappings that can drift, since it silently wins on a collision. Written up in
  `tools/evidence/RECONCILIATION.md`.
- **`tools/usda.mjs match` grades every pure oil `exact`**, because oils are all
  near 100 % fat and nothing else, so the fingerprint distance between any two is
  near zero while the shared word "Oil" clears the content-word guard. One run
  proposed corn and canola oil for rapeseed, sunflower, sesame, walnut and
  avocado, and sunflower oil for peanut. Read `exact` as "the macros agree", not
  as "this is the food", and distrust it for anything macro-degenerate: oils,
  juices, refined starches.
- **Two mapping choices worth revisiting**, recorded and not made, because each
  would change a published figure: turnip greens uses a with-salt row where every
  other cooked vegetable uses without-salt, and raisins uses golden rather than
  dark seedless.
