# Evidence store

Extracted food-composition data for components USDA SR Legacy does not carry, kept
so that adding a food later costs nothing: the values are already here, for far more
foods than the page lists.

**All 47 of the page's evidence columns draw on this directory**, over
1,942 cells across 157 foods and 42 sources. Phase 1 added three (soluble fibre,
insoluble fibre and biotin) and phase 2a added 16 more, all from MEXT, which
still supplies 1,564 of the cells. The rest come from IFCT, CoFID, AFCD, CNF,
FAO/INFOODS, the USDA proanthocyanidin release, the Australian and Danish
vitamin K datasets and thirty-odd single papers.

Every evidence column now carries at least one cell. There was an `mk11` column
and it has been removed: searched for three times and never found, because both
Walther homologue tables stop at MK-10, the 2022 analytical method that
validates MK-4 through MK-10 stops there too, and the 2026 fermented-soybean
work analyses through MK-9. MK-11 is produced by gut *Bacteroides* rather than
by food fermentation, which is the likely reason there is nothing to report. A
column that can only ever say "no data" was worth less than the space it took,
and filling it by inference from MK-10 was never an option.

## Why this exists

SR Legacy *defines* nutrient ids for chromium, molybdenum, boron, biotin, taurine,
inulin, pectin, beta-glucan, the oligosaccharides and soluble and insoluble fibre,
and publishes **zero rows of every one of them** across all 7,793 foods. That was
measured, not assumed: the same parser counts 7,793 rows for protein and 7,708 for
calcium. So every component here had to come from somewhere else.

## Files

| File | Rows | What it holds |
|---|---|---|
| `mext-2020-plant.json` | 1,125 | chromium, molybdenum, iodine, selenium, biotin |
| `mext-2020-fibre.json` | 1,106 | soluble, insoluble and total fibre by two methods, plus resistant starch |
| `mext-2020-sugars.json` | 717 | starch, glucose, fructose, galactose, sucrose, maltose, sorbitol, mannitol |
| `mext-2020-organic-acids.json` | 201 | 22 organic acids including oxalic |
| `afcd-r3-plant.json` | 612 | **inulin**, raffinose, stachyose, resistant starch, oxalic acid, iodine, molybdenum, biotin |
| `ifct-2017-table11.json` | 304 | **raffinose, stachyose, verbascose, ajugose**, phytate, saponins, phytosterol fractions, each with n and SD |
| `ifct-2017-table9.json` | 312 | **oxalate as total, soluble and insoluble**, plus citric, fumaric, malic, quinic, succinic and tartaric acids, each with n and SD |
| `cofid-2021-plant.json` | 456 | lumped oligosaccharide total, biotin |
| `usda-iodine-r4.json` | 478 | iodine with **n, mean, SD, min, max**; joins by NDB id |
| `frida-6.1.json` | 1,240 | **boron**, chromium, molybdenum, iodine, biotin, raffinose, fibre fractions, oxalic acid, each with min, max, median and n |
| `phenol-explorer.json` | 6,953 | 508 polyphenols over 458 foods, with mean, min, max, SD, n and **PubMed ids**; adds lignans and stilbenes |
| `fao-oligosaccharides.json` | 157 | **verbascose**, raffinose and stachyose from FAO/INFOODS BioFoodComp 4.0 and AnFooD 2.0, with each row's water content |
| `sim-2021-vitamin-k.json` | 28 | phylloquinone, **MK-4 and MK-7** across Australian supermarket foods, mostly as analysed absence |
| `walther-2013-menaquinones.json` | 2 | the full **MK-4 to MK-10** profile of natto and sauerkraut, quoting Schurgers 2000 and Kamao 2007 |
| `walther-2017-menaquinones.json` | 3 | the same author's later and finer table: ranges rather than midpoints, one row per primary study |
| `jensen-2022-vitamin-k.json` | 3 | a direct LC analysis of **MK-4 to MK-10** in broccoli, canola oil and natto, with a limit of quantification per homologue |
| `jensen-2025-vitamin-k.json` | 9 | PK and MK-4 to MK-10 in 88 Danish composite foods. Kept for later: **no page food is among them** |
| `page-map-mext.json` | 81 | reviewed mappings from this page's foods to MEXT rows |

## The evidence states

Every cell carries a `state`, because "no value" means several different things and
collapsing them throws away the most useful thing the data says:

- `measured` : a figure was reported
- `not-detected` : analysed, none found. **This is a finding, not a gap.**
- `trace` : the source says trace
- `estimated` : the source calculated or imputed it
- `not-measured` : nobody assayed it
- `no-data` : the source has no cell at all

A food with no entry has no data. Absence is never stored as zero.

## Mapping rule

Foods are joined to this page by **reviewed mapping only**, recorded in a
`page-map-*.json` per source with a `match` grade:

- `exact` : same species and same preparation
- `close` : same species, preparation differs slightly
- `proxy` : related species or notably different preparation. Must be visible
  to a reader if a value from one is ever shown.

**One grade per source, not one per food.** A food is mapped once into each
database it draws on and those mappings are not equally good: cooked lentils are
MEXT's own boiled-lentil row and IFCT's dry dhal. The single per-food grade this
replaced could only be right about one of them, and it recorded `exact`, so the
dry-basis phytate figure reached the page with no proxy mark on it at all. The
grades live in `evidence.json` as `matches: { "<source>": "<grade>" }`, and a
cell's mark is the worst grade among the sources that cell names.

## Values must be the source's own

`build.mjs` reads these corpora back and refuses any cell whose figure the
database it cites does not hold. Written after a review found 127 cells carrying
plausible numbers attributed to databases that had never contained them: brazil
nut phytate at 1719 mg against this release's 190, cocoa at 1740 with no cocoa
row here at all, and 33 of 35 proanthocyanidin cells disagreeing with the row
their own food maps to. The rule is in `checkEvidence`, fed by `loadAttested`:

- one source with a figure here: the cell must reproduce it exactly
- several sources: the cell is a reconciliation and must lie within their span
- a `range`: it must contain every figure its sources attest
- a source with no corpus here: not checked, and not failed either

A source that has a corpus but no reviewed map is a cell citing a database
nothing connects it to, and fails.

None of these databases shares an id with SR Legacy, so there is no id join anywhere
here. Automated name matching is refused, for the reason the README already records
(Black beans paired with "Black pudding, boiled"). The Japanese data makes the same
point in a new alphabet: a substring search for `なし` (pear) matches `皮なし`
("without skin") in every sweet potato row.

## Preparation is the sharpest edge in this data

Not sourcing. Several components leach into cooking water or concentrate on drying,
so a correct value against the wrong preparation is worse than no value, because it
looks right:

| Component | Raw or dry | Cooked | Source |
|---|---|---|---|
| Oligosaccharides, red kidney bean | 3.6 g | trace | CoFID |
| Oligosaccharides, soya bean | 5.5 g | 1.1 g | CoFID |
| Inulin, chickpea | 1.7 g | 0.6 g | AFCD |
| Chromium, adzuki | 2 ug | 1 ug | MEXT |
| Chromium, tomato | trace (fresh) | 11 ug (dried) | MEXT |

Every legume on this page is cooked. IFCT and much of AFCD report foods dry.

## Verbascose, and why one food

Verbascose has its own INFOODS tag, `VERS`, in the two FAO workbooks, which is
what makes it extractable at all: every other source here folds the raffinose
family into a single total. 110 rows carry a VERS figure.

Only one of them reaches a food on this page. Both workbooks report per 100 g on
a **fresh weight basis**, and the page's legumes are all cooked, but nearly every
verbascose row is a sun-dried or freeze-dried raw seed. Water content is the
check that settles it, and is extracted for that purpose: of 157 rows, nine
carry 40 g of water or more, and the only one of those with verbascose and a
species on this page is a Portuguese chickpea, water-soaked and pressure-cooked
at 56.5 g water.

The wider literature does not help, and this has now been checked twice over.
The review at PMC8891438 tabulates verbascose for peas, soybean, chickpea, faba
bean, lupins, black gram and mung bean, and reports every one of them **on a dry
matter basis for raw seeds**. The faba bean literature is the same: PMC10383711
gives 8 to 15 g/kg across 15 varieties, the 2024 Canadian screen 9.6 to 16.8
g/kg, both dry matter, with no fresh-weight figure anywhere in either.

Converting those to a cooked fresh weight is not a unit conversion but a basis
conversion, and it would have to assume that soaking and boiling remove none of
the oligosaccharide. They remove a great deal of it, which is the whole reason
this data is interesting, so the assumption is not merely unverified but known
to be false.

## Menaquinones, and what "not detected" is worth

MK-4 has 30 cells and 28 of them are `not-detected`. That is the finding, not a
failure to find one: Sim 2021 assayed 60 Australian supermarket foods and states
plainly that MK-4 and MK-7 were not detected in any non-fermented vegetable or
fruit. A column of analysed absences is the honest shape of this component in
plant food, and the six-state model exists so that it can be said.

Two disagreements are recorded rather than resolved:

- **Natto MK-7** is 939 to 998 µg in Japan (Kamao, Schurgers) and 81.6 µg in
  Australian supermarkets (Sim), an eleven-fold gap between analysed sources
  with no third to arbitrate, so the cell is a range over all three.
- **Sauerkraut MK-4** is 0.4 µg to Schurgers and not detected to Sim. A
  detection and a non-detection are not symmetrical, since the second depends on
  a limit of detection, so the figure stands and Sim is named as disputed.

Walther's table also reports **MK-5 and MK-6** for both foods. The page has no
column for either, so those figures are extracted and unused.

### Where the two accounts disagree, and how a third settled it

Walther wrote both menaquinone tables, four years apart, and they define their
abbreviations differently. The 2013 one says "ND, not detectable" and marks
natto MK-9 and MK-10, and sauerkraut MK-10, as ND. The 2017 one says "nd, not
determined; nr, not reported" and marks natto MK-9 as nd and MK-10 as nr in
every row drawn from Schurgers. One account says the assay ran and found
nothing; the other says it never ran, and those are different cells here. The
primary is paywalled at Karger and cannot be read to settle it.

Jensen 2022 settled it for natto by measuring the thing directly: MK-10 below
4 µg and MK-9 below 1 µg, at limits of quantification the paper states. That is
an analysed absence on its own authority and owes nothing to either review, so
natto MK-9 and MK-10 are `not-detected`. Sauerkraut MK-10 stays `not-measured`,
because Jensen did not assay sauerkraut and the two reviews still disagree.

That paper is the most useful menaquinone source here for a reason worth
naming: it publishes **a limit of quantification per homologue** rather than one
figure for the method. A below-LOQ result at a stated floor is a stronger claim
than an unqualified ND, and it is what lets an absence be recorded as a finding
rather than a shrug.

An absence also bounds a range. `loadAttested` indexes an ND or a below-LOQ
result as zero, so a cell citing such a source has to contain that finding: a
range from nothing to 3.3 µg may credit a source that found nothing, and a
single figure of 3.3 may not.

### Glucoraphanin, and a rule that was wrong

Three independent screens put glucoraphanin in broccoli above the 61.7 mg of
total glucosinolates this page records for it from McNaughton:

| Source | Broccoli glucoraphanin, per 100 g fresh weight |
|---|---|
| Lee 2010 | 89 mg, florets |
| Verkerk 2010, Acta Hort 856 | 27 to 141 µmol across 6 cultivars |
| Sasaki 2012, J Chromatogr B | up to 119.4 mg, highest of 6 cultivars |

The first version of the subset check refused all of these, and it was wrong to.
A part exceeding its total is impossible **within one set of samples** and is
merely a disagreement across two: McNaughton's 61.7 mg is a UK literature mean
and Lee's 89 mg an Australian measurement, and holding the second against the
first refuses a real figure on the strength of an unrelated one. The rule now
applies only where the part and the total share a source, which is where the
compositional identity actually holds. Broccoli's glucoraphanin is on the page
as a result.

Verkerk's µmol figures were still not converted. Glucosinolate work reports the
free acid at 437.5 g/mol and the potassium salt at 475.6, a 9% spread, and a
conversion whose answer depends on which convention is assumed is not a
measurement. Sasaki gives only the maximum across its cultivars, which bounds
nothing on its own.

### One error this found

The page carried sauerkraut MK-7 as 4.8 µg, cited to Schurgers. Walther's
transcription of that study gives sauerkraut MK-4 0.4, MK-5 0.8, MK-6 1.5, MK-7
0.2, MK-8 0.8 and MK-9 1.1, which sum to exactly 4.8. The figure was the total
of all six homologues filed under one of them. MK-7 is 0.2 µg and 4.8 is the
total.

`sources.json` is the index. Every corpus file names its source by key, and every
source records country, year, method, quality and limitations.

## Known gaps and unfinished work

- **IFCT Table 10** (individual polyphenols) is not extracted. Table 9 now is,
  but its `name` column parses as numeric noise and every entry in
  `page-map-ifct.json` has an empty `ifct_name`, so no IFCT mapping can be
  checked by eye. Its cowpea phytate reads 1.63 mg where every other cooked
  legume is in the hundreds, which is what a mis-parse looks like.
- **IFCT reports pulses dry and this page cooks them.** The phytate figures for
  lentils, chickpeas and mung beans are dry-basis against cooked rows and are
  graded `proxy` for that reason, but the grade is a warning, not a correction.
- **Twenty-two cells rest on a single paper with no corpus here**, mostly
  coenzyme Q10, melatonin and squalene. Each names its paper, and nothing in
  this repository can check any of them.
- **IFCT parsing covers 304 of 528 foods.** Rows whose names wrap in the PDF may be
  missing. Column anchors are read per page; an early global-anchor version shifted
  phytosterols one column left for rows with no oligosaccharide values, and was
  discarded rather than shipped. Eight rows were verified against raw text by hand.
- **Cross-source reconciliation is done for biotin only.** MEXT, AFCD, CoFID and
  IFCT overlap on many more foods than that, and for the rest no "best value" or
  range has been chosen. The machinery exists in `reconcile.mjs` and the build
  now verifies any reconciliation against the sources it names, so the remaining
  work is mapping rather than method.
- **FAO PhyFoodComp samples cultivars and treatments, not foods.** "Cashew nut,
  raw" is three rows spanning 290 to 929 mg and no one of them is the cashew, so
  `page-map-fao-phytate.json` maps a food to a list of rows and the cell becomes
  a range. Forty-five foods that had a phytate figure now have none, because the
  release has no row of that species at that preparation.
- **Not reachable from this environment**: Frida (Denmark), Fineli (Finland) and
  Ciqual (France) all blocked automated fetches. Each is known to carry relevant
  components and is worth a manual download.
- **Not yet checked**: NEVO (Netherlands), Korea, China, Brazil (TBCA), EuroFIR.
- **Full texts still unread**: Cabrera 2003 (legumes and nuts), Bratakos 2002 (Greek
  foods), Tinggi 1997 (Australian foods). Only abstracts were seen.
- **Chromium is parked** at the owner's request. The evidence is kept in
  `mext-2020-plant.json` and `sources.json`, and the finding is recorded below.

## Chromium, parked

Worth keeping because it took the most work and the conclusion is clean. Two modern
quality-controlled sources agree with each other and sit 10 to 50 times below the
older Western compilation, which is the signature of contamination rather than of
real variation:

| Food | Thor 2011 median (range) | Ręczajska 2005 | MEXT 2020 |
|---|---|---|---|
| Onion | 34.2 (1.67-134) | - | not detected |
| Celery | 7.0 (0.3-8.0) | - | not detected |
| Banana | 0.80 (0.001-16.4) | - | not detected |
| Apple | 3.25 (0.002-39.7) | 0.9 | not detected |
| Carrot | 1.74 (0.4-9.0) | 0.4 | 1 |

FSANZ says the same of its own chromium data: "Levels appear to be highly variable
and values presented in this database should be used with caution." Plant foods are
a poor chromium source and the high older figures are largely analytical artefact.
