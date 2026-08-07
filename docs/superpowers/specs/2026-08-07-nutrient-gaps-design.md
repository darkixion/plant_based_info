# What food alone will not supply

Written 2026-08-07. Companion to
`2026-08-07-bioavailability-design.md`: that one says *you get less of this
figure than it looks*, this one says *this figure is not here at all*.

## The entries were derived, not listed

The four obvious candidates were named from memory first, then checked against
the data. All four survived, which is worth recording because it is not what
usually happens, and the check found three things memory would have missed.

Every nutrient with a daily value was ranked by the best **unfortified** food in
the table, per 100 g:

| nutrient | best unfortified | food | foods over 20% DV |
|---|---|---|---|
| **Vitamin D** | **3%** | Oyster mushrooms | **0** |
| **Vitamin B12** | **3%** | Tempeh | **0** |
| Carbohydrate | 27% | Dates | 4 |
| **Choline** | **35%** | TVP | **2** |
| Potassium | 51% | TVP | 8 |
| Calcium | 75% | Sesame seeds | 5 |
| ... | ... | ... | ... |
| Selenium | 3485% | Brazil nuts | 15 |

Two nutrients sit at 3% with nothing over 20%. The next is a macronutrient at
27%. There is no ambiguity about where the line falls.

Nutrients with no column were checked directly against the SR Legacy cache, for
the 128 foods that carry an FDC id:

| SR Legacy nutrient | rows | non-zero | note |
|---|---|---|---|
| Iodine (1100) | **0** | 0 | defined, published for none of these foods |
| DHA (1272) | 113 | **1** | quinoa 0.015 g |
| EPA (1278) | 113 | **4** | nori 0.08, sunflower 0.014, kelp 0.004, edamame 0.003 |
| DPA (1280) | 112 | 0 | |
| Vitamin D3 (cholecalciferol) | 3 | **0** | |
| Vitamin D2 (ergocalciferol) | 3 | 3 | max 0.7 µg |
| Vitamin K, menaquinone-4 | 8 | **0** | no MK-7 id exists in SR Legacy |
| Biotin, chromium, molybdenum, boron, taurine | **0** | 0 | absent entirely |

## Three findings the check produced

- **The vitamin D in these foods is D2, not D3.** Cholecalciferol was assayed
  three times and found zero every time; ergocalciferol three times and found
  every time. So the trace that exists is mushroom D2, which raises serum
  25(OH)D less effectively than D3. That belongs in the entry, and it would not
  have been written from memory.
- **Choline is the next thinnest and is a different kind of problem.** 123 of
  131 measured, best food 35% of a daily value per 100 g, only two foods over
  20%. The top five at 100 g each come to 107% of a day, so it is reachable but
  only deliberately, and the two leaders are TVP and wheatgerm rather than
  anything eaten daily. Present, so not a supplement case.
- **Vitamin K2 is invisible to this dataset.** MK-4 assayed eight times and
  found zero; SR Legacy has no MK-7 id at all. Natto is in this table and is the
  classic vegan K2 source, and the data cannot show it.

## Three tiers

1. **Gaps.** Food will not supply these: **B12, vitamin D, iodine, EPA and
   DHA.**
2. **Worth planning.** Present but thin: **choline.**
3. **What this data cannot see.** K2, and biotin, chromium, molybdenum, boron
   and taurine named as checked and absent, so silence does not read as
   coverage.

**Calcium, iron and zinc are deliberately excluded.** Their best figures per
100 g are 75%, 158% and 152%: they are not absence problems, they are absorption
problems, and the Absorption dialog already covers all three with sourced
records. Putting them here too would be the second copy that drifts.

**Selenium is excluded too**, and the reason is recorded rather than acted on:
it is the mirror image, abundant here at 3485% from Brazil nuts, but
soil-dependent, and these are US soils which are richer than European ones. That
is a "your figures may not be your figures" caveat about the whole dataset
rather than a gap, so it belongs in Methodology. Left on the open list.

## The dataset: `src/data/gaps.json`

Same architecture as `interactions.json`, for the same reasons.

```json
{
  "sources": { "key": "full citation" },
  "gaps": [
    {
      "id": "b12",
      "tier": "gap",
      "nutrient": "b12",
      "label": "Vitamin B12",
      "role": "what it does in the body",
      "why": "why the gap exists, mechanically",
      "closing": "fortified foods and supplements, named as the two routes",
      "cites": ["key"]
    }
  ]
}
```

- **`nutrient`** is a nutrient id, or `null` where there is no column (iodine).
  `label` carries the name in that case.
- **`tier`** is `gap`, `plan` or `unseen`.
- **`cites`** is an array. Learned from the interaction dataset, where a
  single-key field could not express a record resting on two papers.

`build.mjs` validates: every non-null `nutrient` resolves, every `tier` is one
of the three, every entry cites at least one source that exists, and no source
goes uncited.

## The evidence is computed, not typed

This is the part that matters most, and it is the project's established habit
rather than a new idea: the amino acid gap list, the fortified food list and the
flavonoid coverage count are all computed for the same reason.

For each entry with a column the page derives, from the table as it stands:

- how many foods carry a figure at all,
- how many of those are fortification-marked,
- the best **unfortified** figure, as a percentage of a daily value.

So the B12 entry renders "6 of 131 carry a figure, the three highest are
fortification, and the best unfortified is 3% of a day" because that is what the
data contains today. Add a food tomorrow and the sentence corrects itself.

Iodine has no column, so its evidence is cited rather than derived. **The entry
says which it is**, because a derived number and a quoted one are different kinds
of claim and the reader should not have to guess.

## EPA and DHA become columns

On the strength of 113 of 131 assayed with near-zero results. Three arguments:

- **A measured zero is not missing data**, and this app distinguishes the two
  everywhere else. 113 foods were tested for DHA and found to have essentially
  none, which is far stronger than having no column at all.
- **Coverage beats what already shipped.** The flavonoid columns went out at 25,
  36 and 39 of 131 and are defended in the README on those numbers.
- **It closes an oddity.** The fats group carries ALA and LA but not the two
  things ALA is supposed to convert into, so the page currently raises the
  conversion question and cannot answer it.

Added the documented way: entries in `KNOWN` **and** `COLUMN_TO_USDA` in
`tools/usda.mjs`, then a pull. Both are required; missing the second makes
`usda.mjs add` throw, which has caught this project out twice.

## Surfaces

- **A dialog**, "What food alone will not supply", in the sidebar beside
  Absorption.
- **A line in the nutrient note** for B12, vitamin D and choline, shaped like the
  absorption line already there.
- **No new cell marker.** The fortification `*` already marks the B12 and
  vitamin D cells that need one, and a fifth marker would be noise.

## It replaces rather than adds

`DAY_NOTES` currently carries hand-typed B12 and iodine paragraphs. Both derive
from this dataset instead. This is the same cut-back "Intake is not absorption"
received when the interaction data arrived, and for the same reason: a
hand-written copy of a dataset is a copy that stops being true.

## The line this does not cross

**No doses, no brands, no imperatives.** Each entry says what the nutrient does,
why the gap exists, and that fortified foods and supplements are the two routes.
That is the wording the page already uses for B12 under "Not medical advice",
extended consistently to three more nutrients rather than invented here.

Dose guidance varies by country, age and pregnancy, and is a clinical matter.
The page describes foods.

**Every source is checked before use**, not written from memory. This is the
standard the project already applies to FDC ids, and the Absorption work applied
to its eight citations. The D2-versus-D3 claim and the ALA conversion figures
particularly need it.

## Testing

- The derived counts match the data: B12 reports 6 of 131 with 3 fortified.
- The build rejects an entry naming a nutrient that does not exist, a tier that
  is not one of the three, or a citation that does not resolve.
- The dialog carries the not-medical-advice line.
- No entry text contains a dose.
- The day notes for B12 and iodine derive from the dataset rather than repeating
  it, asserted the way the absorption note was.
- EPA and DHA render `n/a` where unmeasured and `0` where measured as zero,
  which is the distinction the whole column rests on.

## Build order

1. **EPA and DHA columns**, via the pull.
2. **Dataset, dialog and derived evidence.**
3. **Wire the day notes and the nutrient note.**

## Deliberately not done

- **No doses, and no supplement products or brands.**
- **No iodine column.** SR Legacy defines id 1100 and publishes it for none of
  these foods. The USDA/FDA/ODS-NIH iodine database would reach them by NDB
  number, and that is a separate project of the shape `flavonoids.mjs` is.
- **No K2 column.** SR Legacy has no MK-7 id, so there is nothing to pull.
- **No biotin, chromium or molybdenum columns.** Zero rows for these foods, and
  none is a vegan-specific shortfall.
- **No selenium entry.** See above; it is a dataset-wide caveat for Methodology.
- **No change to calcium, iron or zinc**, which belong to Absorption.
