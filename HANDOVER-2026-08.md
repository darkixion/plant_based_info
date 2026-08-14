# Handover, August 2026

Branch `evidence-provenance`, 14 commits ahead of `main`, all pushed. Tests are
green: `npm test` gives 36 in `test/tools.mjs` and 139 in `test/smoke.mjs`.

## Where things stand

**222 foods, 119 nutrient columns, 45 of them evidence columns.** The evidence
store holds 1,985 cells across 170 foods and 46 sources.

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

## Next up: does sulforaphane deserve a column?

**We currently hold no sulforaphane data at all and there is no column.**

The question has been researched once and the answer was no, for a reason worth
re-testing rather than re-deriving:

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

Sources already identified as genuine conditioned-yield experiments, none of them
ingested: Matusheski 2004 (open PDF at UC ANR, homogenised fresh florets,
endogenous myrosinase, 25 °C, initial pH 6.3), Wang 2012, Pérez 2014 (dry mass,
so unusable here), Sarvan 2016 (in vitro digestion).

## Known unfinished business

- **Kawabata 1974** Table 6 has pectin for ~50 fruits and nuts on the same fresh
  basis. The numbers are readable; the food names run vertically down a 1974
  scan and could not be aligned to rows with confidence. Needs a better scan.
- **Baker 1997** on fruit and vegetable pectin levels: Wiley blocks it.
- **Pellegrini 2010** would give glucoraphanin and total glucosinolates in the
  same samples, which would fix broccoli's part-exceeds-whole.
- **Natto MK-7** is Kamao's 939 while this README says it should be a range. The
  range cannot be built because no source publishes a total K2 for natto and the
  subset check refuses a part above its whole. Documented in the README.
- `usda-map.json` covers **44 of 222 foods**, which is why the flavonoid columns
  are thin. Widening it is likely worth more than any new source.
