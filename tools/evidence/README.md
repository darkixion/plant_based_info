# Evidence store

Extracted food-composition data for components USDA SR Legacy does not carry, kept
so that adding a food later costs nothing: the values are already here, for far more
foods than the page lists.

**All 45 of the page's evidence columns draw on this directory**, over
1,985 cells across 170 foods and 46 sources. Phase 1 added three (soluble fibre,
insoluble fibre and biotin) and phase 2a added 16 more, all from MEXT, which
still supplies 1,564 of the cells. The rest come from IFCT, CoFID, AFCD, CNF,
FAO/INFOODS, the USDA proanthocyanidin release, the Australian and Danish
vitamin K datasets and thirty-odd single papers.

Every evidence column now carries at least one cell, and two columns have been
removed for failing that test in spirit rather than in letter. **Total phenolics
and verbascose** each held exactly one value after five rounds of searching, and
neither was going to gain a second.

Total phenolics had olive oil and nothing else, and the figure is barely
comparable to anything: Folin-Ciocalteu results depend on the assay and are
expressed as gallic acid equivalents, so two sources rarely mean the same thing
by the number. The only release that could have filled it, USDA's ORAC database,
was withdrawn by USDA in 2012. Its one source, Owen 2000, left `sources.json`
with it.

Verbascose had cooked chickpeas and nothing else, and the section below on why
records the reason at length: every other source reports the raffinose family on
a dry-matter basis for raw seed, and converting that to a cooked fresh weight
would assume soaking and boiling remove none of it, which is known to be false.
The FAO workbooks still carry its 110 rows and `fao-oligosaccharides.json` still
holds them, so the data survives the column.

A column that can only ever say "no data" costs a reader more than it tells
them. There was also an `mk11` column
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
| `ifct-2017-cited.json` | 7 | the IFCT figures this page actually cites, phytate and soluble and insoluble oxalate, one row per food, with the four figures withdrawn and why. Replaces the two whole tables, which the IFCT licence did not permit this repository to hold |
| `cofid-2021-plant.json` | 456 | lumped oligosaccharide total, biotin |
| `usda-iodine-r4.json` | 478 | iodine with **n, mean, SD, min, max**; joins by NDB id |
| `frida-6.1.json` | 1,240 | **boron**, chromium, molybdenum, iodine, biotin, raffinose, fibre fractions, oxalic acid, each with min, max, median, n, source and the `sourceFood` that marks a value copied from another food. Rebuilt by `tools/extract_frida.mjs` |
| `phenol-explorer.json` | 6,953 | 508 polyphenols over 458 foods, with mean, min, max, SD, n and **PubMed ids**; adds lignans and stilbenes |
| `fao-oligosaccharides.json` | 157 | **verbascose**, raffinose and stachyose from FAO/INFOODS BioFoodComp 4.0 and AnFooD 2.0, with each row's water content |
| `fao-phytate.json` | 2,442 | **phytate** per 100 g edible portion, fresh weight, from FAO/INFOODS PhyFoodComp 1.0, each row with its country, sample count and `biblioid`. Rebuilt by `tools/extract_fao_phytate.mjs` |
| `fao-phytate-sources.json` | 324 | PhyFoodComp's own bibliography, which is what makes each row's origin answerable and what the admission rule is decided from |
| `sim-2021-vitamin-k.json` | 28 | phylloquinone, **MK-4 and MK-7** across Australian supermarket foods, mostly as analysed absence |
| `walther-2013-menaquinones.json` | 2 | the full **MK-4 to MK-10** profile of natto and sauerkraut, quoting Schurgers 2000 and Kamao 2007 |
| `walther-2017-menaquinones.json` | 3 | the same author's later and finer table: ranges rather than midpoints, one row per primary study |
| `jensen-2022-vitamin-k.json` | 3 | a direct LC analysis of **MK-4 to MK-10** in broccoli, canola oil and natto, with a limit of quantification per homologue |
| `jensen-2025-vitamin-k.json` | 9 | PK and MK-4 to MK-10 in 88 Danish composite foods. Kept for later: **no page food is among them** |
| `mattila-2001-coq.json` | 12 | **CoQ9** and CoQ10 in ug/g fresh weight. The only food table here carrying CoQ9, and the only CoQ source reaching vegetables and fruit rather than oils |
| `verde-2022-melatonin.json` | 7 | **Melatonin** in nuts, pg/g fresh weight, four walnut cultivars assayed separately, with LOD and LOQ |
| `fdc-foundation-2026.json` | 8 | **beta-glucan**, ergothioneine, raffinose and stachyose from USDA Foundation Foods, each with n, min, max and median |
| `tbca-carbohydrate-2019.json` | 7 | **resistant starch** by AOAC 2002.02 per 100 g edible portion, with each sample's moisture printed beside the analyte |
| `kawabata-1973-pectin.json` | 10 | **pectin** as calcium pectate in the fresh edible portion, from a 1973 Japanese survey of 24 vegetables |
| `usda-glucosinolate-r1.json` | 14 | **glucoraphanin** in mg/100 g fresh weight from USDA/ODS-NIH Release 1, with cultivar, n, SD and range per observation |
| `tanaka-2026-vitamin-k.json` | 4 | PK and **MK-4, MK-6, MK-7, MK-8, MK-9** in fermented soybean products, as phylloquinone equivalents. Only its absences are used |
| `page-map-mext.json` | 102 | reviewed mappings from this page's foods to MEXT rows |
| `BIOTIN-MAP-REVIEW.md` | 133 | every candidate pairing put to review for the biotin column, what was accepted into the CoFID and AFCD maps, and the reason for each refusal |
| `LICENCES.md` | 13 | what each source permits, checked against the publisher's own terms, and the two places this repository currently exceeds them |
| `FRIDA-PROVENANCE.md` | 5 | Frida's licence (CC BY 4.0, so republishable with credit) and why 400 of its 873 biotin values are refused: borrowed from another food, undetermined, or compiled from CoFID, AFCD and the CNF under other ids |
| `FAO-PROVENANCE.md` | 4 | what PhyFoodComp measured and what it copied: 291 of its 2,442 plant rows are IFCT 2017, which this page cites in its own right, so those rows are refused. Also what that cost |
| `FAO-PHYTATE-MAP-REVIEW.md` | 23 | every candidate pairing put to review for the phytate column, what was banked, and the reason for each refusal |
| `frida-6.1-sources.json` | 502 | Frida's own source table, which names every reference its values cite and types each one, the file the admission rule is decided from |

## The evidence states

Every cell carries a `state`, because "no value" means several different things and
collapsing them throws away the most useful thing the data says:

- `measured` : a figure was reported
- `not-detected` : analysed, none found. **This is a finding, not a gap.**
- `trace` : the source says trace. CoFID marks this `Tr` in its own tables; it
  used to reach `parseFloat`, become `NaN` and leave no data, and is now carried
  through as `trace` instead
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

`page-map-afcd.json` entries are `{ key, match }`, each carrying its own
reviewed grade. The code used to default every entry to `exact` regardless of
what the reviewer had actually found.

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
- a `range` over three or more attested figures: it must also carry its `median`
- a source with no corpus here: not checked, and not failed either

## A range carries its own centre

A range is `low`, `high` and, where three or more figures make one, `median`.
The page prints the median first and the bounds behind it, "23.9 (1.2 to 217.9)",
and sorts the column on the median.

It used to print the bounds alone and sort on their midpoint, which is only the
centre of a symmetric spread. Raw broccoli glucoraphanin is 210 cultivar means
from 1.19 to 217.9 with a median of 23.85, and it sorted at **109.5**, ahead of
every other food in the column, on a figure nobody had measured. Raw brussels
sprouts sorted at 17.9 against a median of 6.16, above red cabbage's own measured
13.06.

**Two figures get no median**, and this is the important half of the rule. The
median of two figures is their midpoint, and printing the midpoint is exactly
what the iodine case forbids: AFCD 74 ug in rolled oats against MEXT not
detected must read as 0 to 74 and never as 37. Three figures or more make a
centre that is a measurement rather than an average of two extremes.

`spanCell` in `reconcile.mjs` applies the rule to repeated samples of one food
and `reconcile` to figures from different sources, so a range built by either
carries the same kind of centre.

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

### Miso, and a food that carries none

Tanaka and Tanaka 2026 assayed barley miso and rice miso and found **no
menaquinone of any chain length in either**, only phylloquinone. That fills
MK-4, MK-8 and MK-9 on a page food that had none of them, and it is what the
biology predicts: miso is fermented with *Aspergillus oryzae*, not with the
*Bacillus subtilis* that makes natto's MK-7.

It also disagrees with the page. Miso MK-7 is 10.1 µg from Schurgers, and
Tanaka did not detect it. That is the sauerkraut MK-4 case again, so it is
resolved the same way: a detection and a non-detection are not symmetrical, the
figure stands, and Tanaka is recorded as `disputed` beside it.

**Only the absences are taken from this paper.** Its table is in phylloquinone
equivalents and this store holds actual per-vitamer masses, which is why
`jensen-2025-vitamin-k.json` draws on that paper's supplementary table rather
than its main text. Recovering a mass from a PK equivalent means assuming the
authors equated on moles, which is the usual convention but is not stated in
the table, and being wrong about it moves MK-7 by 44 per cent. An `nd` carries
no such problem. On that assumption its natto MK-7 would be about 539 µg, which
falls inside the span the page already records, and its MK-4 and MK-9 absences
agree with what natto already carries, so both are recorded as corroboration.

Its fourth row is **Okinawan fermented tofu, which is not the page's tofu**.
Tofuyo is bean curd cured in brine and awamori and aged for months; the page
carries plain firm tofu, which is neither fermented nor aged. The two share an
English name and nothing else, and a menaquinone figure is exactly the kind of
value that exists only because of the fermentation.

The paper's method covers six vitamers and **MK-10 is not one of them**, so it
does not help the one column still empty of figures.

### The phylloquinone equivalent, resolved

Tanaka's Table 5 is printed in PK equivalents and this store holds masses. The
full text states the convention, so the ambiguity that kept its measured figures
off the page is gone:

> Content of the individual vitamin K and total vitamin K contents were
> calculated as PK-equivalence as µg PKeq/100 g by multiplying the relative
> difference in the molecular mass. The molecular masses used for correction
> were 450.7, 444.6, 580.9, 649.0, 717.1, and 785.2, for PK, MK-4, MK-6, MK-7,
> MK-8, and MK-9, respectively (Jensen et al. 2025).

A PK equivalent is a molar equivalence, so `PKeq = mass × 450.7 / MW` and the
mass comes back as `PKeq × MW / 450.7`. For MK-7 that is ×1.440. Natto's 374.23
PKeq is **538.87 µg** of MK-7 and its 3.49 is **5.553 µg** of MK-8.

It changes no cell. MK-8 is already a range of 0 to 89.8 over three sources and
5.553 sits inside it. What it does change is the natto MK-7 question below,
which now has a fourth analysed figure in it.

### Natto MK-7, and why the range described below cannot be built

The section below says natto MK-7 "is a range over all three" of Kamao,
Schurgers and Sim. The data says `{"state":"measured","value":939,
"sources":["kamao-2007"]}`. The range was attempted and **the build refused it**,
for a reason worth keeping.

Four analyses now exist:

| Source | MK-7, µg/100 g | |
|---|---|---|
| Sim 2021 | 81.6 | one Australian supermarket sample |
| Tanaka 2026 | 538.9 | converted from PK equivalents, above |
| Kamao 2007 | 939 | |
| Schurgers 2000, via Walther | 882 to 1034 | |

Sim does not belong at the bottom of that span. It is a single sample, and
`sources.json` already records what its own authors say about that column: they
had no MK-7 standard for their recovery work. So the honest cell is a range of
**538.87 to 1034** over the three analyses that had one, with Sim recorded as
`disputed`, which is exactly how sauerkraut MK-4 already treats it.

`checkEvidence` refuses that cell:

```
evidence natto.mk7: 1034 exceeds k2 939, which it is part of
```

And it is right. Natto's **Total K2 is 939, cited to Kamao**, and a part cannot
exceed the whole within a shared source. Schurgers reports MK-7 up to 1034 with
MK-8 at 84 and MK-6 at 14 on top of it, so natto's real total is over 1,000 and
the k2 cell is simply too low.

Raising it is where this stops. **No source here publishes a total K2 for
natto.** Every total available is a sum of one table's own homologues: 567.2 for
Tanaka, 1,044 to 1,105 for Walther 2013, 980 to 1,146 for Walther 2017. Those
sums are arithmetic on each source's figures, but citing Walther for a total it
never printed is the fault this store exists to prevent, and both Walther sums
also fold an ND in as zero while Walther 2017 marks natto MK-10 not reported.

So MK-7 stays at Kamao's 939 and the inconsistency stays documented. What
unblocks it is a source that publishes natto's total K2 directly, or a decision
that a derived total may be stored as `estimated` and marked calculated on the
page. That is a change to what this store allows, not a data entry.

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

## Coenzyme Q9, and a column that was one cell

CoQ9 had a single figure on it, sunflower oil at 10.13 mg/100 g from
Rodríguez-Acuña, and every other food read as no data. It now has eight cells,
five measured and three analysed absences, all from a source `sources.json`
already carried and the page already cited for CoQ10: Mattila and Kumpulainen's
2001 table is the first food table to report CoQ9 beside CoQ10, and the only one
here that reaches a vegetable or a fruit rather than an oil.

The table is printed in **µg/g fresh weight** and this store holds mg/100 g, so
every figure is scaled by a tenth in `tools/evidence.mjs` and rounded back,
because 0.04 × 0.1 leaves float noise otherwise. Four foods gained CoQ10 as
well. The pass **never writes over another paper's figure**: Mattila's CoQ10
disagrees with Fine 2016 on rapeseed oil (6.35 against 3.5) and with Kubo 2008
on orange (0.14 against 0.39), and neither disagreement is a generator's to
settle, so those two cells stay with the sources that already held them.

Cauliflower's CoQ10 was **0.3 and is now 0.27**. The source says 2.7 µg/g, and
0.3 was a one-decimal rounding of it stored in a two-decimal column, so the page
printed 0.30 for a figure the paper never gave.

`coq9` is the first evidence column to need **three decimal places**. Cauliflower
is 0.04 µg/g, which is 0.004 mg/100 g, and at the column's old `dp` of 2 a
measured value would have printed as 0.00, which reads as none. Thirty-two other
columns already use three.

### Why this corpus is not attested

`loadAttested` does not index it, unlike the Jensen and Walther corpora. What is
transcribed here is the Czech Journal of Food Sciences reprint of Mattila's
Table 1, not the 2001 original, and it is shorter than the original's 35 foods.
Wiring a partial reproduction would fail every cell citing Mattila for a food
the reprint omits, and one such cell exists: **sesame oil carries CoQ10 3.15
mg/100 g cited to Mattila, and this table's only dietary fat is rapeseed oil**.
`research.json` records that value's derivation as "Mattila 2001 & Kubo 2008",
which is two sources where the cell names one. Whether the original table has a
sesame oil row is unresolved and the paper is paywalled. A check that cannot
tell a missing row from a wrong figure is worse than no check.

One row is deliberately unmapped. The table says only **"Bean"**, at 0.06 µg/g,
and this page carries twenty of them.

## Melatonin, and three cells that named a paper without them

The column had four cells and three of them were wrong in a way that made them
invisible rather than obviously false. Tomato carried 0.0001 ng/100 g, walnut
0.0003 and pistachio 0.0023, all cited to Arnao and Hernández-Ruiz 2018. At the
column's one decimal place every one of them printed as **0.0 ng**, so the page
showed three measured values as nothing.

They came from `literature-misc.json`, which records one source string for a
whole row and which `tools/evidence.mjs` stopped reading for that reason. These
survived the sweep because each had been given a per-value citation, and nobody
checked it against the paper. Arnao's table gives melatonin in ng/g and:

- **has no walnut row and no pistachio row at all**
- gives tomato as **0.3 to 114 ng/g fresh weight**, which is 30 to 11,400
  ng/100 g and nothing like the 0.0001 filed under it

So all three named a source that does not contain them, which is the same fault
the 127-cell purge was written for. Tomato and pistachio are dropped rather than
converted: their magnitudes suggest mg/100 g in a nanogram column, but a unit
that can be guessed at has not been established. `arnao-2018` is gone from
`sources.json`, because nothing cites it now and the build refuses a registered
source no cell uses.

Walnut is re-derived from **Verde 2022**, a primary measurement in pg/g fresh
weight needing no basis conversion, with a limit of detection and quantification
stated. Four commercial cultivars were assayed separately and no one of them is
the walnut, so the cell is a range over the whole spread, 119.1 to 330.1
ng/100 g, the same shape the FAO phytate release forced. Raw peanut comes from
the same paper at 8.3 ng/100 g.

Two of that paper's foods are deliberately unmapped. Its chestnut figure is raw
and the page's chestnuts are roasted, and the paper's own finding is that
roasting lowers melatonin in every nut but peanut. Its almond, hazelnut,
pistachio and cashew values exist only as bars in Fig. 3, with no number in the
text, and reading a value off a bar chart is not a transcription.

`sources.json` is the index. Every corpus file names its source by key, and every
source records country, year, method, quality and limitations.

## Known gaps and unfinished work

- **IFCT Table 10** (individual polyphenols) is not extracted. Table 9 now is,
  but its `name` column parses as numeric noise and every entry in
  the old `page-map-ifct.json` had an empty `ifct_name`, so no IFCT mapping could be
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
  a range. Many foods that could carry a phytate figure have none, because the
  release has no row of that species at that preparation.
- **PhyFoodComp is a compilation, and 291 of its 2,442 plant rows are IFCT
  2017.** This page cites IFCT in its own right, so those rows are refused:
  admitting one puts a single table on the page twice under two names.
  `FAO-PROVENANCE.md` has the finding, `tools/fao_phytate.mjs` has the rule, and
  `node tools/fao_phytate.mjs provenance` reproduces every count with no
  network. The question was asked nine days after the release first reached the
  page in `d89a243`, and by then 46 cells rested on it: it removed 14 pairings
  and trimmed 12.
- **The other FAO release here has not been asked the same question.**
  `fao-oligosaccharides.json`, 4 cells, comes from BioFoodComp and AnFooD, the
  same publisher on the same pattern. Its workbooks are in `tools/cache/`.
- **Not reachable from this environment**: Frida (Denmark), Fineli (Finland) and
  Ciqual (France) all blocked automated fetches. Each is known to carry relevant
  components and is worth a manual download.
- **Not yet checked**: NEVO (Netherlands), Korea, China, Brazil (TBCA), EuroFIR.
- **Full texts still unread**: Cabrera 2003 (legumes and nuts), Bratakos 2002 (Greek
  foods), Tinggi 1997 (Australian foods). Only abstracts were seen.
- **Chromium is parked** at the owner's request. The evidence is kept in
  `mext-2020-plant.json` and `sources.json`, and the finding is recorded below.

## The August 2026 sweep, and what it settled

A third literature sweep over the eight thinnest columns. Recorded in full
because two of its leads had already been chased twice, and the cost of this
directory is re-deriving the same refusals:

| Lead | Column | Why it did not land |
|---|---|---|
| O'Leary 2026, AAFC and Saskatchewan, 37 dry bean genotypes | raffinose, stachyose, verbascose | The most promising of them, and it fails on basis like the rest. Table 5 reports **canned** beans, which is the right preparation, but every column is `%DW` and the paper gives no moisture for the canned product, so there is no arithmetic from it to an as-eaten figure. It also reports **total RFO only**: stachyose is ~88% and raffinose ~10% of it, and verbascose was "below the reliable detection limit" |
| Siva 2019, Njoumi 2019, OECD common bean, RFO reviews | the same three | Dry matter, raw seed, every one. The same refusal the verbascose section above records, reached again from new papers |
| Mushroom beta-glucan literature | beta-glucan | Reported as % of dry matter. Mushrooms are about 90% water, so the conversion is a basis conversion and a large one |
| Tortorella glucoraphanin table; Sasaki 2012 | glucoraphanin | Sasaki was already rejected above for giving only a per-cultivar maximum. Tortorella is paywalled at ACS and its table mixes mg/100 g FW, µmol/100 g FW and µmol/g DW by study |
| Pyo, six Korean commercial oils | CoQ9 | Sesame and soybean oil are page foods and this is the best remaining CoQ9 lead. Springer requires authentication and the figures could not be read |
| Rodríguez-Acuña 2008, soybean and rapeseed oil | CoQ9 | The page already cites this paper for sunflower oil. Its soybean and rapeseed figures are behind the ACS paywall, and the secondary sources that quote it **conflate its numbers with Kamei's corn oil and Mattila's rapeseed oil**, so nothing quoting it can be trusted for them |
| Peach and pear quinic acid, cultivar datasets | quinic | Chased over three rounds and now closed. See "The peach paper, and a table that is not there" below |
| Venda and Nottingham theses, Chandel 2022 | pectin | Tertiary tables quoting older work, and they mix pectin content with **extraction yield** from peel and pomace. The one cell here, carrot 1.7 g from EuroFIR, is a whole-food measurement |
| Dunlop 2022, Australian vitamin K | MK-4 to MK-10 | Cheese, yoghurt and meat. No plant food in it |

## Resistant starch, and a false zero caught in time

TBCA publishes a **carbohydrate profile supplement** separate from Brazil's
ordinary nutrient tables, easy to miss if only the main database is inspected.
Resistant starch by AOAC 2002.02, per 100 g of edible portion, and unusually it
prints **each sample's moisture in the column beside the analyte**, so the basis
is checkable row by row rather than taken on trust. Chickpeas, lentils, green
peas, oat bran and pinto beans gained a figure.

The reason this entry exists is the row that did not go in. Raw broccoli is in
the release at 94.10 g moisture, and its resistant starch cell is **a dash,
meaning not analysed**. It was first read as 0.00 plus or minus 0.02, which is
two columns further right and belongs to the fibre fractions. This store records
an analysed absence as a finding and distinguishes it from a gap, so a false
zero here would have been worse than a blank: it would have said broccoli was
tested and found to contain none. Reading a table by column position rather than
by eye is what caught it.

Total fructans are in the same release and are not taken. Fructans are not
inulin, and relabelling them would be a fabrication.

## Pectin, found in 1973

The column had one figure in it. Three releases define a pectin component and
publish nothing, and four rounds of searching produced peel, pomace, extraction
yield and dry matter and no usable value. It now has **ten**, from a paper
published in 1973.

**Kawabata and Sawayama, *A study on the content of pectic substances in
vegetables*, Jpn J Nutr Diet 31(1):32-36.** Twenty-four vegetables, open access
on J-STAGE, and Table 3 reports against the **fresh edible portion**, which is
already this store's basis and is exactly what nothing modern would give.

Two things about it matter more than the numbers.

**The abstract is not the data.** Its English abstract reports only banded
categories: 2 per cent or over, 1.00 to 1.99, 0.50 to 0.99, 0.10 to 0.49. Every
secondary account of this paper repeats those bands, and a band is nearly
useless. Table 3 carries the per-food figures, and the table is a scanned image
with no text layer, so it had to be read rather than parsed. The Japanese
summary also lists okra in a band the English abstract leaves it out of, which
is a second reason not to work from the abstract.

**The analyte is operationally defined.** This is total pectin as **calcium
pectate**, summed over three sequential extractions: water at 30 C, 0.4 per cent
sodium hexametaphosphate at 30 C, and 0.05 N hydrochloric acid at 85 C. It is
not a modern molecularly defined pectin assay, and the cells mean what that
method means. The paper reports the three fractions separately and the corpus
keeps them.

Only raw page foods are mapped. The table also holds pumpkin, okra, aubergine,
green beans, edamame, lotus root, taro, potato and yam, every one of them cooked
on this page.

Carrot is the one disagreement: EuroFIR's 1.7 g against this paper's 0.628. Two
methods rather than two samples, so the cell spans both and names both.

Its 1974 companion covers fifty fruits, vegetable fruits and nuts on the same
basis, including avocado, banana, pineapple, mango, papaya, apple, pear, tomato,
watermelon, chestnut, walnut and peanut. It has been fetched and confirmed. It
is not transcribed, because its food names run vertically down the left column
of a scan and misreading one would put a real figure on the wrong food.

## Glucoraphanin, and a database that states its own molecular weight

The column had two figures, broccoli 89 mg and Brussels sprouts 3 mg, both from
a paper that does not say how its vegetables were prepared. It now has
**fourteen**, from the **USDA and ODS-NIH Database for the Glucosinolate Content
of Foods, Release 1, May 2026**, published as an Excel workbook with its own
documentation.

Its header row settles the two things that had blocked every other candidate:

> Presented in milligrams per 100 grams (mg/100g) of sample on a fresh-weight
> (FW) basis. USDA Analytical Data and Published Literature (North America)

and it prints a **molecular weight per compound** on its own row, giving
glucoraphanin as **437 g/mol**, the free acid. That is why these figures can be
held in milligrams at all. Every other source for this column reports µmol and
leaves the mass to be guessed, and the guess is worth 9 per cent: 437.5 as the
free acid against 475.6 as the potassium salt. The README already records
refusing Verkerk's µmol figures for exactly that reason, and Song and
Thornalley's raw-vegetable values are refused on the same ground.

A food maps to many rows, because the release samples cultivars, growing
locations and storage regimes rather than foods: raw broccoli alone is 210
observations spanning 1.19 to 217.9 mg. No single row is the food, so the cell
is a range over the means and every observation is kept in the corpus, the same
shape the FAO phytate release forced.

**Lee 2010 was not deleted, it was demoted.** Its broccoli 89 and Brussels
sprouts 3 are recorded as `disputed` beside the new ranges. A figure whose
preparation is unstated cannot be reconciled with one whose preparation is the
whole point, and 89 sits inside this release's *raw* spread rather than its
boiled one, which is the likeliest explanation of it.

Only boiled rows reach the cooked foods. The release separates boiling from
steaming, microwaving and blanching, and they differ enough to matter: boiled
broccoli florets are 6.37 mg against 15.91 for steamed whole florets.

Sprouts and microgreens are excluded throughout. Both are several times richer
than the vegetable and neither is a food on this page, so folding them in would
inflate a range with something the reader cannot buy.

Rocket reaches nothing, because the release carries arugula only as microgreens.
Turnip, turnip greens, pak choi and watercress have rows but no glucoraphanin
figure.

### The peach paper, and a table that is not there

Guo et al., *Antioxidant profile of thinned young and ripe fruits of Chinese
peach and nectarine varieties*, Int J Food Prop 2020, was the best quinic acid
lead for three rounds: fresh weight, cultivar level, ripe and unripe separated,
and the page carries raw peaches. It was unreachable behind a 403 until the
owner supplied the PDF.

**It contains no quinic acid value for ripe peach.** The organic acids appear
only in Figure 3, a heat map, and its own caption says "the content of each
component was normalized to complete linkage hierarchical clustering", so even
the colours are not concentrations. The running text gives absolute figures for
the **thinned young** fruit alone: malic 4.3 to 6.8, quinic 4.5 to 6.0, citric
0.2 to 1.2 and oxalic 0.17 to 0.23 g/kg. For the ripe fruit it gives only a
total, 3.8 to 6.7 g/kg, and a ratio: "the malic and quinic acid contents of the
thinned young fruit were 1.2 to 4.7-fold and 2.1 to 4.5-fold higher than those
of their ripe counterparts".

A ripe figure could be reconstructed from that as roughly 1.0 to 2.9 g/kg, and
it is refused. The concentration range and the fold range are aggregates over
seven varieties and are not paired per variety, so dividing one by the other
invents a number that no sample produced.

Worth recording alongside it: an earlier search reported per-variety quinic acid
for this lead as Jinxia 1.90, Yuhua3 1.57, Tropic Prince 1.98 and seven more.
This paper has seven varieties, none of them called any of those, and no such
table. Those figures did not come from the paper they were attributed to.

### Round three, and the thing three rounds of paper-hunting missed

The sweep changed strategy: stop searching journals, inventory food composition
databases instead, because their unit of publication is per 100 g of edible
portion as consumed and journals' is dry matter. That produced the largest
single find in this directory's history, and it was sitting in USDA's own
holdings the whole time.

**FoodData Central Foundation Foods is not SR Legacy.** It is a separate,
much smaller release of individually analysed samples, published with n, the
minimum, the maximum, the median and the analytical method behind every figure.
The "Why this exists" section above is still true: SR Legacy defines beta-glucan
and publishes zero rows of it across 7,793 foods. **Foundation Foods has 199.**
It also carries ergothioneine for 91 foods, quinic acid for 144, boron for 844
and MK-4 for 438.

What it reaches on this page so far:

| Food | Component | Was | Now |
|---|---|---|---|
| Oyster mushrooms | beta-glucan | nothing | 1.92 g, n=8 |
| Shiitake mushrooms | beta-glucan | nothing | 2.92 g, n=8 |
| Soy milk | raffinose | nothing | 0.067 g, n=8 |
| Soy milk | stachyose | nothing | 0.434 g, n=8 |
| Rolled oats | beta-glucan | 5.5 g | 5.5 to 7.52 |
| White mushrooms | beta-glucan | 0.4 g | 0.4 to 0.75 |
| Oyster mushrooms | ergothioneine | 0.95 mg | 0.95 to 14.0 |
| Shiitake mushrooms | ergothioneine | 1.29 mg | 1.29 to 11.06 |
| White mushrooms | ergothioneine | 13 mg | 4.25 to 13 |

The ergothioneine disagreements are the interesting ones. Halliwell's review puts
oyster mushroom at 0.95 mg and eight analysed samples here put it at 14.0, a
fifteen-fold gap, and shiitake is 1.29 against 11.06. Recorded as ranges rather
than resolved, because a fifteen-fold spread is what this component does and
saying so is worth more than preferring whichever source arrived first.

**Soy milk is how the raffinose family finally got past the basis problem.**
Every cooked-legume source refused over three rounds reported dry matter. A
drunk soy food is measured as sold, so there is nothing to convert.

Most of that release is still unmapped and it is the largest unworked seam here.
Its boron is mostly dry beans labelled "(0% moisture)", which is a dry basis and
refused; its quinic acid is mostly fruit juice; its MK-4 mostly meat and cheese.
Pectin and inulin are defined in it and empty, which now makes three independent
releases that define pectin and publish nothing.

### Round two of the same sweep

Pushed harder on the rows round one had not really searched, and on open copies
of papers it had abandoned at a publisher paywall. Two sources landed, both
verified against the primary table rather than the report of it:

| Lead | Outcome |
|---|---|
| Verde 2022, melatonin in nuts | **Accepted.** Author's deposit in the Universidade de Vigo repository. Note that host's TLS chain is missing an intermediate, so fetching it needs verification relaxed |
| Tanaka & Tanaka 2026, fermented soybean products | **Accepted for its absences only**, per the PK equivalent problem above |
| Sturtz 2011, tomato and strawberry melatonin | Still unreached. Reports 4.11 to 114.52 ng/g FW for tomato and 1.38 to 11.26 for strawberry, which is four to seven orders of magnitude above what this page carried. **The best remaining melatonin lead** |
| Vitalini 2011, grape melatonin | Milan repository holds it as *accesso riservato*, and the study is tissue-specific rather than whole berry |
| Gonzalez-Gomez 2009, sweet cherry melatonin | *Prunus avium*, the right species unlike Burkhardt's *P. cerasus*, but reachable only through a thesis discussing it. Values around 0.01 to 0.22 ng/g and one variety not detected |
| Obizoba 2000, cowpea oligosaccharides | Cooked cowpeas measured, but the public abstract gives percentage reductions rather than concentrations |
| Park 2013, cabbage glucoraphanin | Dry weight, no same-sample fresh moisture |
| Pectin, all foods | Nothing. Three sweeps now |

One trap worth naming, because it nearly landed: an earlier attempt at Sari 2017
read the dry matter column backwards, taking 100 minus 94.280 as the sample's
dry matter and converting oyster mushroom beta-glucan to a plausible-looking
1.386 g/100 g fresh. Had the printed figure been used the answer would have been
22.8 g/100 g, obviously impossible, and the source would have been rejected on
sight. **The arithmetic error is what made the answer credible.** The source
fails regardless: its samples were hot-air dried before assay, so its dry matter
describes the dried powder, not the mushroom.

**MK-8, MK-9 and MK-10 are now a food-list problem, not a source problem.**
`jensen-2025-vitamin-k.json` already holds MK-10 at 0.12 to 0.25 µg/100 g in rye
bread, wheat buns and three plant-based cheeses, measured per vitamer at a
stated LOQ. The figures are here and unused because the page carries no bread
and no plant-based cheese. Adding one of those foods would fill three columns
from data already in this directory; no further searching will.

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
