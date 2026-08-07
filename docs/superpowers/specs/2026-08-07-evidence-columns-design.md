# Evidence columns: components from outside SR Legacy

Written 2026-08-07, after five rounds of source research. The evidence itself is
in `tools/evidence/`, with `sources.json` as its index and `RECONCILIATION.md`
carrying the cross-source findings this design is built on.

## Why these columns cannot work like the other seventy

Every column on the page today comes from **one release, USDA SR Legacy**, pulled
by one tool, with one basis and one notion of what a missing value means. That
uniformity is why provenance could stay implicit: a figure is a figure, `n/a`
means USDA did not publish one, and the only per-cell marks needed were `†` for
an undifferentiated fatty acid and `*` for fortification.

The components in this work have none of that. SR Legacy *defines* nutrient ids
for chromium, molybdenum, boron, biotin, taurine, inulin, pectin, beta-glucan,
the oligosaccharides and both fibre fractions, and **publishes zero rows of every
one of them** across all 7,793 foods. Measured, not assumed: the same parser
counts 7,793 rows for protein and 7,708 for calcium.

So every value here comes from somewhere else, and "somewhere else" turned out to
be eight databases in five countries that disagree with each other. Three
findings from reconciling them shape everything below.

**Sources disagree more than expected, and coverage does not predict agreement.**
Biotin has the best coverage of any component here, four sources and over 3,000
food-rows. Reconciled, it is the worst: spreads reach 29x on spinach, 9.3x on
carrots, 7.4x on kidney beans, and only 4 of 14 comparable foods agree within 2x.
An earlier assessment in this project called biotin the safest single value of
the nine. That was wrong, and it was wrong because it rested on counting rows
before comparing any of them. **Coverage is not agreement.**

**Most apparent disagreement is not disagreement at all.** AFCD publishes a
per-food derivation, and only 490 of its 709 plant rows are `Analysed`. The rest
are `Recipe` calculations, `Borrowed` from similar foods, or `Imputed`. Every
large biotin gap between AFCD and MEXT turned out to be AFCD reporting a recipe
calculation. Where both had actually assayed the food, they agreed within 20%.

**Some disagreement is real, and one case is neither.** AFCD reports rolled oats
at 74 ug of iodine per 100 g, analysed, twice, for hulled and rolled
independently. MEXT reports not detected. That looked like genuine geographic
variation until a third source settled it: the USDA/FDA/ODS-NIH iodine database
gives cooked oatmeal 0.2 ug at n=10, max 1.1, and brown rice 0 ug at n=28 with
min and max both 0. Two independent sources near zero against one at 74 is an
outlier, not a range. **A rule that only knows how to widen a range would have
published "0 to 74" and called it honest.**

## The shape that follows

**These are evidence columns, not figures.** A cell is not a number; it is a
record of what is known, how well, and from where. That is a different kind of
object from the 70 columns already here, and the design keeps it a different
object rather than making the existing cells pretend to be one.

The single most important consequence is structural. **Evidence values are not
stored in `v`.** The `v` array stays exactly what it is: positional per-100-g
numbers from SR Legacy, read by `val()`, summed by `dayTotals()`, scored by
`proteinQuality()`. Evidence lives in its own file, keyed by food and component.

That is not tidiness. It is how the invariant gets enforced: **an evidence value
can never enter a total, a daily-value percentage, an amino acid score or "Short
on", because it is not in the array those functions read.** The bioavailability
work took the same approach and guarded it with a test that empties
`interactions.json` and asserts no rendered figure moves. The equivalent test
here is cheaper still, because the separation is structural rather than
conventional.

## The cell

```json
{
  "state": "measured",
  "value": 2.3,
  "unit": "g",
  "basis": "per 100 g",
  "prep": "cooked",
  "sources": ["afcd-r3"],
  "match": "exact",
  "n": 7,
  "derivation": "analysed"
}
```

`state` is the load-bearing field, and it has six values because "no number"
means six different things and collapsing them throws away the best thing this
data says:

| state | meaning | renders as |
|---|---|---|
| `measured` | a figure was reported | the figure |
| `range` | analysed sources disagree beyond the threshold | `a to b` |
| `trace` | the source says trace | `trace` |
| `not-detected` | **assayed and none found** | `none detected` |
| `estimated` | calculated, imputed, borrowed or recipe-derived | the figure, marked |
| `not-measured` | the source has the food but did not assay it | `not measured` |

A food with no entry at all has no data, and renders `no data`. **Absence is
never stored as zero**, which is the rule this project already broke twice and
now has regression tests for.

`not-detected` versus `no data` is the distinction worth the most. The nutrient
gaps work already found this: the strongest line in the B12 data was not that
some foods are low, it was that **123 of 131 foods were measured and found to
contain none**. The same shape recurs here. Oxalic acid has 146 analysed values
in AFCD of which 141 are zero. Iodine across these foods is mostly analysed
absence. A column that renders both as `n/a` says nothing; a column that
separates them says a great deal.

## The reconciliation rules

Applied in order. All four are consequences of `RECONCILIATION.md` rather than
choices made in the abstract.

**1. Preparation gates everything.** Two values may only be compared when the
food *and* its preparation match. Comparing IFCT's dry chickpea against MEXT's
boiled one measures hydration, not disagreement. Several components leach or
concentrate enough that a right value against the wrong preparation is worse
than none, because it looks correct:

| Component | raw or dry | cooked | source |
|---|---|---|---|
| Oligosaccharides, red kidney bean | 3.6 g | trace | CoFID |
| Oligosaccharides, soya bean | 5.5 g | 1.1 g | CoFID |
| Inulin, chickpea | 1.7 g | 0.6 g | AFCD |
| Chromium, tomato | trace fresh | 11 ug dried | MEXT |

**2. Only analysed values reconcile.** A `Recipe`, `Borrowed`, `Imputed`,
`Estimated` or `Label Data` derivation is stored with `state: "estimated"` and
takes no part in choosing a value or forming a range. It is still shown when it
is all there is, marked as calculated.

**3. Spread decides value versus range.** Over the analysed values for one food
and preparation:

- ratio of max to min **at or below 2** : one value, the median, sources listed
- ratio **above 2** : `state: "range"`, both ends shown, sources listed

Two is not arbitrary. It is where the observed data separates: molybdenum sits at
0.7 to 1.5x across sources and is plainly the same measurement twice, while
biotin's spinach at 29x is plainly not.

**4. An outlier is not a range.** With three or more analysed sources, if one
value differs from the median by more than 10x while the rest agree within 2x,
it is marked `disputed`, excluded from the range, and **recorded rather than
deleted**. The oats iodine case is exactly this and is the reason the rule
exists. Without it the page would publish "0 to 74" for oats and present a
probable error as the honest breadth of the evidence.

With only two sources this rule cannot fire, and the range stands. That is
correct: two sources disagreeing is disagreement, and it takes a third to say
which one is odd.

## Mapping is reviewed, always

None of these databases shares an id with SR Legacy, with the single exception of
the USDA iodine database, which carries NDB numbers and therefore joins by id the
way `flavonoids.mjs` already does. Everything else is matched by a human and
committed, the way `usda-map.json` already works, and carries a grade:

- `exact` : same species, same preparation
- `close` : same species, preparation differs slightly
- `proxy` : related species or notably different preparation

**`proxy` must be visible to a reader.** 13 of the 81 MEXT mappings are proxy
grade, and a reader comparing quinoa across two columns deserves to know that one
of them is a dry grain standing in for a cooked one.

Automated name matching stays refused. The reason on file is Black beans paired
with "Black pudding, boiled". The Japanese data made the same point in a new
alphabet during this work: a substring search for `なし` (pear) matches `皮なし`
("without skin") in every sweet potato row.

## The columns

Thirty-five, in six groups. Counted rather than estimated, because an earlier
draft said "around 36" and the list adds to 35.

**Fibre fractions** (new group, or extending macronutrients): soluble fibre,
insoluble fibre, resistant starch, beta-glucan, inulin, oligosaccharides total,
raffinose, stachyose, verbascose.

**Trace elements**: iodine, molybdenum, boron, sulphur, fluoride, nickel.

**Vitamins**: biotin.

**Carbohydrate detail**: starch, glucose, fructose, sucrose, maltose, sorbitol,
mannitol.

**Organic acids and antinutrients**: total organic acids, citric, malic, quinic,
oxalate total, oxalate soluble, oxalate insoluble, phytate, saponins.

**Phytosterol fractions**: campesterol, stigmasterol, beta-sitosterol.

Oxalate is split three ways because IFCT reports it that way and the split
matters more than the total: sesame carries 2,156 mg of total oxalate but only
78.6 mg soluble, and only the soluble fraction binds calcium. A total-oxalate
column alone would misrepresent every seed on the page.

**Dropped, with reasons**: tocotrienols (4 analysed foods, all breads and pasta,
none on this page), cobalt (1 food), ajugose (4 foods, reaches one page food),
galactose and succinic acid (0 measured across the 81 mapped foods), tartaric
acid (grapes only, matching the precedent already set for caffeine and
theobromine), and the AOAC 2011.25 fibre fractions (8 to 9 foods, and redundant
against the Prosky soluble and insoluble pair at 73 to 75).

**Chromium is parked** at the owner's request. The evidence is kept.

## Files

- **`src/data/evidence.json`** : the cells, sparse, keyed by food slug then
  component id. Sparse is not an optimisation; it is what makes "no data"
  unrepresentable as a value.
- **`src/data/sources.json`** : citations, one per source key, carrying country,
  year, method, quality and limitations. `tools/evidence/sources.json` is the
  working copy and the shipped one is derived from it.
- **`src/data/nutrients.json`** : gains the column definitions only, so labels,
  units, groups and `why` sentences live where every other column's do. No
  values, and no entry in any food's `v`.

## Build validation

`build.mjs` already refuses a source that nothing cites, and that check caught a
real error in the interaction data. Extend it to refuse:

- a cell with a value and no resolvable source key
- `state: "measured"` on a cell whose source records no method
- a cell whose `prep` disagrees with its food's own state, which is the trap that
  would otherwise put dry-bean figures on cooked rows
- a `range` whose bounds are equal, or a `measured` carrying two analysed sources
  more than 2x apart, since either means the reconciliation was skipped
- an unknown `state`, `match` or `derivation`

## Tests

- **The invariant**: every rendered figure, every day total, every amino acid
  score and every "Short on" entry is identical with `evidence.json` present and
  with it emptied. Structural here rather than conventional, but assert it
  anyway, because the cheapest way to break it later is to "helpfully" fold a
  fibre fraction into the fibre total.
- **`not-detected` never renders as `0`**, and `no data` never renders as
  `not measured`. One test per state, driven from a fixture.
- **A proxy mapping is visibly marked** wherever its value appears.
- **The dropped list stays dropped**: a test naming tocotrienols, cobalt and
  ajugose fails if a column appears for them, so the reasoning above has to be
  revisited deliberately rather than drifted past.
- **Prose describing this data derives from it**, per the existing convention.
  Any sentence counting sources or coverage is computed, not typed.

## Phasing

Thirty-five columns, eight sources and a new cell model is too much for one
change. Three phases, each shippable on its own:

1. **The mechanism, on the cleanest data.** `evidence.json`, `ev()`, the six
   states, the build checks, the invariant test, and one group of columns:
   soluble fibre, insoluble fibre and biotin. Soluble and insoluble come from one
   source at 73 and 74 of 81 foods and need no reconciliation, so they prove the
   rendering. Biotin needs all four rules including ranges, so it proves the
   reconciliation. If the model is wrong, it is wrong here, cheaply.
2. **The rest of the components**, group by group, each with its reviewed
   mappings. No new machinery, so these are data changes plus column definitions.
3. **The prose**: methodology, the source list, and whatever the Absorption
   dialog should say now that phytate and oxalate have figures rather than
   curated exceptions.

Phase 1 is the one that needs a plan. Phases 2 and 3 are repetition of it.

## Deliberately not done

- **No pectin column.** No database anywhere carries pectin for these foods.
  Soluble fibre is shown instead and the page says plainly that pectin sits
  inside it. This is the one component of the original nine with no data at all.
- **No taurine column.** Laidlaw 1990 assayed 48 plant foods and detected none,
  so a column would be 131 cells of the same finding. It belongs in prose, with
  the red algae exception stated: Porphyra has been measured near 4.11 mg/g dry
  matter, so nori and kelp are not zero, and a blanket claim would repeat the
  nori B12 error this project already corrected once.
- **No chromium.** Parked.
- **No absorption arithmetic.** Phytate and oxalate now have data, and it would
  be easy to start multiplying iron figures by a phytate ratio. The
  bioavailability work's rule holds: explanation, not arithmetic.
- **No new foods.** The 50 unmapped foods of the 131 stay unmapped and read
  `no data`. Adding foods is a separate, documented route.
- **No total polyphenol column** from Phenol-Explorer yet, and no lignans or
  stilbenes. They are stored and they are real, but they belong with a review of
  the existing flavonoid columns rather than bolted on here.
- **Licensing is unresolved.** USDA data is public domain; Frida asserts
  copyright, NEVO ships conditions of use, and CoFID, AFCD, MEXT and IFCT each
  have their own terms. The repository is public. This is deferred by the owner's
  decision, and must be settled before `evidence.json` is committed.
