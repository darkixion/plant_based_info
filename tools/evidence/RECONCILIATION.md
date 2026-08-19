# Cross-source reconciliation

First pass. Compares components measured by more than one source, to decide where a
single best value is defensible and where the spread demands a range.

**Nothing is reconciled into a final value yet.** This records the method, the rules
that fell out of it, and the conflicts found.

## Rule 1: derivation outranks source

The single most useful thing found in this pass. AFCD publishes a per-food
`derivation`, and it changes how a cell should be read:

| Derivation | Plant rows | Treat as |
|---|---|---|
| Analysed | 490 | measured |
| Recipe | 164 | **estimated** (calculated from ingredients and cooking factors) |
| Borrowed | 33 | estimated (taken from a similar food) |
| Imputed | 15 | estimated |
| Label Data | 6 | low quality |
| Estimated | 1 | estimated |

A `Recipe` value is not a measurement of that food. Grading by source alone would
have put 219 of 709 AFCD plant rows on the page as though they were assayed.

MEXT carries the same idea in its notation, where `(n)` means calculated. Any
reconciliation must compare **analysed against analysed**.

## Rule 2: most apparent conflicts are derivation artefacts

Biotin, AFCD versus MEXT, ug/100 g:

| Food | AFCD | AFCD derivation | MEXT | Ratio | Real conflict? |
|---|---|---|---|---|---|
| Brown rice, cooked | 2.9 | Analysed | 2.5 | 1.2x | no, agrees |
| Spinach, raw | 2.5 | Analysed | 2.9 | 0.9x | no, agrees |
| Chickpeas, cooked | 2.5 | **Recipe** | 8.9 | 0.3x | no, not a measurement |
| Split peas, cooked | 2.3 | Recipe | 5.7 | 0.4x | no |
| Kidney beans, cooked | 1.3 | Recipe | 3.7 | 0.4x | no |

Where both sources analysed the food, they agree within 20%. Every large biotin
"disagreement" was AFCD reporting a recipe calculation. Molybdenum behaves the same
way: tofu 68 versus 44 (1.5x) and brown rice 24 versus 34 (0.7x), both analysed,
both acceptable.

### Corrected 2026-08-19: molybdenum is not the easy case after all

That last sentence was true of the four foods then compared and is not true of the
27 MEXT and AFCD both reach. **Ten of them fall outside 2x**, every one on figures
both tables call analysed:

| Food | MEXT | AFCD | ratio |
|---|---|---|---|
| Soy milk, unsweetened | 54 | 4.1 | **13x** |
| Avocado | 2 | 0.2 | **10x** |
| Green peas, cooked | 60 | 12.7 | 4.7x |
| Celery, raw | 2 | 8.9 | 4.5x |
| Pumpkin seeds | 42 | 180 | 4.3x |

The other five are apple, apricot, chestnut, grapefruit and orange, each 1 against
AFCD's 0, and those are the shape rule 7 exists for rather than real breadth.

Nothing follows for the 2x limit itself, which was never derived from molybdenum
alone. What follows is that the column is a range in 10 of its 27 overlaps, and
that a rule of thumb taken from four foods should not have been written down as a
property of the component.

## Rule 3: some conflicts are real and must be preserved

Iodine, ug/100 g:

| Food | AFCD | AFCD derivation | MEXT | Verdict |
|---|---|---|---|---|
| **Oats, rolled** | **74** | **Analysed** | not detected | **genuine conflict** |
| Brown rice, cooked | 9.8 | Analysed | not detected | genuine conflict |
| Spinach, raw | 0 | Analysed | 3 | genuine conflict |
| Amaranth | 1 | Analysed | 1 | agrees |
| Buckwheat | 0.7 | Analysed | 1 | agrees |
| Millet, cooked | 0.6 | Recipe | not detected | artefact |

Oats is the sharp one: two national programmes, both analysed, differing by a factor
of at least 74. AFCD reports 74 for hulled and rolled oats independently, so it is
not a transcription slip. Iodine in plants tracks soil and irrigation water, and
Australian and Japanese soils differ, so this may be real geographic variation rather
than error. Either way it must be shown as a range with both sources named, never
averaged to 37.

**This is the case that justifies the whole range mechanism.** A single "best" iodine
value for oats would be wrong whichever number was picked.

### Settled 2026-08-19, and the table above is now what the page shows

The column carried MEXT alone until this date, so every verdict here described a
conflict the page had no way to display. `tools/iodine.mjs` owns it now, over
MEXT, AFCD and the USDA, FDA and ODS-NIH release that had been sitting in this
directory unread. Oats reads **0 to 74**, brown rice **0 to 9.8** and raw
spinach **3 (0 to 6.7)**, each naming its sources. Cooked millet reads
not-detected: the Recipe figure is graded `estimated` and does not contradict an
assay, which is the artefact verdict reached without being told it.

Two rules came out of it, both recorded in `USDA-IODINE-PROVENANCE.md` and both
one rule seen twice. **A numeric zero corroborates a source's own finding of
absence and never overrides it**, so almonds read none detected over three
sources rather than 0. And **rules 3 and 4 are ratio tests, which are
meaningless near zero**, so iodine carries a floor of half a microgram: without
it, twelve fruit reconciled to ranges that printed as "0 (0 to 0)", and raw
banana had Japan's not-detected dropped as a tenfold outlier over a fifth of a
microgram.

## Rule 4: preparation still dominates

Before comparing anything, the preparation must match. Reconciling a dry IFCT legume
against a cooked MEXT row measures hydration, not disagreement. See the leaching
table in `README.md`.

### The worked case: Lee 2010 on glucoraphanin

Lee 2010 sits as `disputed` on two cooked rows and disagrees with each in the
*opposite* direction, which looks erratic until the preparation is checked.

| Food | Lee 2010 | our cooked cell | our raw cell, median and full spread |
|---|---|---|---|
| Broccoli | **89** | 6.37 to 9.24 (2 means) | 23.85, spread 1.19 to 217.9 over 210 means |
| Brussels sprouts | **3** | 17.55 to 30.28 (2 means, proxy) | 6.16, spread 0.17 to 35.55 over 15 means |

Both of Lee's figures land comfortably inside the **raw** distribution and nowhere
near the cooked one. 89 sits among the high raw broccoli cultivars, where Brigadier
gives 85.88 and Marathon 217.9. 3 sits just below the raw brussels sprouts median of
6.16.

Lee's own quality note in `sources.json` already records the reason: *the paper does
not state a preparation for the vegetables assayed*. The most economical reading is
that Lee measured raw material in both cases, and the two-directional disagreement is
one artefact, not two conflicts.

Two things follow. **Nothing has been moved**, because a preparation inferred from
where a number lands is still inferred, and this project does not reassign figures on
inference. And the raw rows Lee would need to be compared against only exist as of
commit `8e70d8b`; Lee was filed as disputed when the page carried these vegetables
cooked only, so it was never given the chance to agree with anything.

Independently, `build.mjs` already refuses Lee's 89 on the cooked broccoli row by the
subset check, because it exceeds the 61.7 mg of total glucosinolates recorded there.
That guard was written for this exact figure.

## Coverage after grading by derivation

AFCD plant rows, `present` versus `analysed`:

| Component | Present | Analysed |
|---|---|---|
| iodine | 709 | 490 |
| starch | 709 | 490 |
| caffeine | 709 | 490 |
| beta-tocopherol | 366 | 261 |
| delta-tocopherol | 349 | 251 |
| citric acid | 354 | 243 |
| malic acid | 353 | 242 |
| quinic acid | 330 | 228 |
| molybdenum | 338 | 256 |
| biotin | 264 | 194 |
| fluoride | 241 | 180 |
| oxalic acid | 214 | 146 |
| chromium | 214 | 169 |
| sulphur | 167 | 133 |
| resistant starch | 104 | 88 |
| nickel | 79 | 62 |
| sorbitol | 77 | 56 |
| lutein | 52 | 31 |
| inulin | 46 | 33 |
| raffinose | 21 | 14 |
| stachyose | 16 | 11 |
| tocotrienols | 12 | 9 |
| cobalt | 1 | 1 |

## Rule 5: biotin does not reconcile to a single value

Biotin was the best-covered component of the nine and looked like the safest single
figure. Reconciled across MEXT, CoFID and AFCD it is the **worst**, and Rule 1 does
not explain it: these are analysed values.

| Food | MEXT | CoFID | AFCD (analysed) | Spread |
|---|---|---|---|---|
| Spinach, raw | 2.9 | 0.1 | 2.5 | **29x** |
| Carrots, raw | 2.8 | 0.3 | - | **9.3x** |
| Kidney beans, cooked | 3.7 | 0.5 | 1.3 | **7.4x** |
| Broad beans, cooked | 6.9 | 1.5 | - | 4.6x |
| Mung beans, cooked | 3.3 | 0.9 | - | 3.7x |
| Brown rice, cooked | 2.5 | 1.0 | 2.9 | 2.9x |
| Split peas, cooked | 5.7 | - | 2.3 | 2.5x |
| Avocado | 5.3 | 2.4 | - | 2.2x |
| Broccoli, cooked | 7.1 | 3.5 | - | 2.0x |
| Banana | 1.4 | 2.5 | - | 1.8x |
| Onions, raw | 0.6 | 1.0 | - | 1.7x |
| Black-eyed peas, cooked | 4.8 | 7.0 | - | 1.5x |

Only 4 of 14 agree within 2x. CoFID runs systematically low on vegetables.

The likely cause is method rather than sample: biotin occurs largely protein-bound,
so a figure depends on whether the assay hydrolysed it free, and microbiological
assay, LC-MS/MS and immunoassay do not agree with each other. None of the three
databases states its biotin method per food.

**Biotin must be shown as a range with sources named.** An earlier assessment in this
project called it the strongest single-value candidate of the nine; that was wrong,
and it was wrong because it rested on coverage counts before any cross-comparison had
been done. Coverage is not agreement.

### The 14-food table above is now a corpus, not an argument

That table compared 14 foods by hand. Biotin has since been given its own pass
over the union of MEXT, CoFID and AFCD, mapped and reviewed rather than run
inside the loop over MEXT's rows alone, and the same disagreement now shows in
the whole column rather than a sample of it: 142 of 222 foods carry a biotin
cell, 92 measured, 30 range, 8 trace, 2 estimated and 10 not-measured. Of the
142, 79 cells cite one source, 46 cite two and 17 cite three, and 4 of those
carry sources that disagree. 63 foods now rest on two or three national
programmes, against 13 before this pass. Ten of the ranges carry a median,
against 2 before.

Running biotin as its own pass rather than inside MEXT's loop is also what
grew coverage: a food MEXT never assayed can now still carry a biotin figure,
and 40 foods with no MEXT mapping now do. Pistachios, pecans, walnuts,
wholewheat pasta, brazil nuts, pine nuts and coconut were the first.

CoFID's `Tr` marker, which used to reach `parseFloat`, become `NaN` and
vanish, is now carried through as the `trace` state. Eight cells hold one:
boiled pearl barley and the seven oils. Fat carries essentially no biotin and
Britain assayed it and said so, which is a different statement from nobody
having looked.

**Raw plums is the case that shows what a trace is worth against a figure.**
CoFID reports a trace and AFCD reports an analysed zero, and the cell reads 0
citing AFCD alone. A zero is a measurement and a trace is not, so the zero
decides the cell and the trace does not appear in it. The same choice was made
deliberately for the oils in the other direction: AFCD holds analysed zeros for
olive, peanut and soybean oil, and mapping them would have made three oils read
0 while four identical oils read trace. That difference would have recorded
which country assayed which oil, not a fact about oil, so only CoFID is mapped
there and all seven read the same way.

## Rule 6: a zero is not the same statement as an absence

MEXT marks an absence in words and AFCD writes the number 0, so the same finding
arrives from the two tables in two forms that do not mean the same thing. **A
numeric zero corroborates a source's own finding and never overrides it.**

Almonds are not-detected in Japan, 0 in Australia and 0 over three FDA samples,
and the cell reads *none detected* naming all three rather than the number 0.
"None detected" is what a laboratory said; 0 is what a spreadsheet holds. A trace
is a finding of presence and outranks a zero on the same reading: MEXT sees a
trace of iodine in sesame seeds where AFCD's row says 0, and the trace stands.

Written the other way round, the column would have turned thirty-odd laboratory
findings into the number 0.

### And a zero is sometimes not a statement at all

**AFCD reports oxalic acid in grams to one decimal place, and 205 of its 214
figures are 0.** A step of a tenth of a gram cannot see an analyte usually quoted
in tens of milligrams, so a 0 there is the field's floor rather than the food's
content. The database says so itself: **"Seed, sesame, unsalted" reads 0 and
"Tahini, sesame seed pulp" reads 0.6, both marked Analysed.** Tahini is ground
sesame seed and cannot hold six times the oxalate of what it is made from. AFCD's
derivation is per row rather than per component, which is how a row can be
Analysed while this component on it was not.

So AFCD's oxalate zeros are refused as non-answers, uniformly, with the reason
printed on every run of the generator. Its nine real figures stand, and 23
refusals are reported. Molybdenum needs no such limit: its AFCD field carries
0.2, 0.7 and 0.8, so it can plainly see below the unit its column prints.

## Rule 7: a ratio says nothing near zero

Rules 3 and 4 are both ratio tests. 0.2 against 0.4 is a factor of two, and 0
against anything is infinite, so near the bottom of a column they manufacture
conflicts out of the noise. **Each component supplies a floor, below which its
sources are not disagreeing.**

Iodine's is half a microgram, which is both where the FDA's assay stops and below
what a `dp: 0` column can print. Without it, raw apple was AFCD 0, the FDA 0.1 at
n=35 and MEXT not-detected, which reconciled to the range 0 to 0.1 and printed as
**"0 (0 to 0)"**. Twelve fruit were in that state, nineteen figures printed as 0
without being one, and raw banana had Japan's not-detected dropped as a tenfold
outlier over a fifth of a microgram.

A figure below the floor and above zero is written as a **trace**: a presence too
small for the page to number is what a trace means, and printing 0.2 as "0" is a
claim of absence the source did not make. `test/tools.mjs` has refused that shape
since the CoQ9 and melatonin cells were found in it.

The floor belongs to the component and not to `reconcile.mjs`, which is why
`nationalCell` takes it as an argument. Half a microgram is nothing for iodine and
everything for a column measured in grams.

## Status by component

| Component | Reconciles? | Treatment |
|---|---|---|
| **Molybdenum** | **no, 10 of 27 overlaps beyond 2x** | **range where they disagree, value where they do not** |
| Soluble / insoluble fibre | single source (MEXT) | single value, source named |
| Inulin | single source (AFCD) | single value, source named |
| Raffinose / stachyose / verbascose | FAO and AFCD, both thin | single value, dry basis stated |
| Phytate | single source (FAO PhyFoodComp), 58 foods | value or range over the rows it samples |
| Saponins | single source (IFCT) | single value, source named |
| **Biotin** | **no, up to 29x** | **range** |
| **Iodine** | **no, oats 74 vs not detected** | **range, and a floor of 0.5 ug below which a ratio says nothing** |
| **Oxalic acid** | **no, spinach 0.3 vs 0.7** | **range; and AFCD's zeros are refused, see rule 6** |

## The flavonoid columns are not thin because of the mapping

`HANDOVER-2026-08.md` names widening `usda-map.json` beyond its 44 foods as the
highest-value remaining work, on the grounds that it is why the flavonoid columns
are thin. **That premise is wrong**, checked 2026-08-14.

`sourceRows()` in `tools/usda.mjs` reads **two** files and merges them: the
reviewed `usda-map.json` and the `fdc_id` each food carries in
`tools/food-additions.json`. The map held 44, food-additions held 178, and
between them **219 of 222 foods already had a reviewed USDA source row**. The
three without are `soy-milk-unsweetened`, `seitan` and `nutritional-yeast`, each
carrying a null id and a recorded reason for it.

The columns are thin because **only 94 of 222 foods appear in USDA Flavonoid
Release 3.3 at all**. That is a property of the flavonoid database, not of our
mapping, and no amount of mapping work reaches it. Running the map out to all 222
foods and re-running the pull changes the filled counts by nothing: 33
anthocyanidins, 53 flavan-3-ols, 66 flavonols, 2 flavanones, 70 flavones, before
and after.

What would actually widen those columns is a different source, not a better map.

### The candidate: Phenol-Explorer, ingested and never used

`tools/evidence/phenol-explorer.json` holds **6,953 rows across 439 foods**, is
graded `quality: high`, and its own source note says **5,055 of those rows carry a
PubMed id, the best provenance of any source here**. It has **zero cells** in
`evidence.json`. It has been sitting unused since ingestion, the same way
`jensen-2025` sat until a food list finally matched it.

**Four of our five columns line up.** Phenol-Explorer stores glycosides and
aglycones as separate rows, and the aglycones are exactly what our columns sum:

| Column | Aglycones needed | Fresh-weight rows | Foods |
|---|---|---|---|
| Flavonols | Kaempferol, Myricetin, Quercetin | 504 | 197 |
| Flavones | Apigenin, Luteolin | 287 | 147 |
| Flavan-3-ols | catechin, EGC, EC, ECG, EGCG | 421 | 126 |
| Flavanones | Eriodictyol, Hesperetin, Naringenin | 127 | 69 |
| **Anthocyanidins** | Cyanidin, Delphinidin, Malvidin, Pelargonidin, Peonidin, Petunidin | **9** | **5** |

**Anthocyanidins is out.** Phenol-Explorer reports anthocyanins as their
glycosides, and the aglycone rows barely exist. Converting glycoside to aglycone
needs a molecular mass per compound and a decision this project has refused
elsewhere, so that column stays with USDA.

**The realistic gain is around 30 foods**, against 128 currently empty. A crude
name match hits 78 of our 222 foods, 33 of which are empty in all four columns.

### Why it is a project rather than a pull

- **It needs a reviewed page map**, like the ten already in this directory. The
  crude match used for the estimate above paired **"Pearl barley" with "pear"**,
  which is the whole argument for a reviewed map in one line.
- **Phenol-Explorer food names often omit the preparation.** Its "potato" does not
  say baked or boiled, and Rule 4 above forbids comparing across that.
- **The flavonoid columns live in `v`, not in the evidence store**, and are filled
  by `flavonoids.mjs` from a single source. A second source needs per-cell
  provenance, which only evidence columns carry. So step one is deciding whether
  the five flavonoid columns become evidence columns, and that is a bigger
  decision than the fill it would enable.
- Phenol-Explorer is a compilation spanning methods and decades. Its own
  limitation note says the method group is recorded per row and must be carried
  through.

**Recommendation, superseded 2026-08-17.** It read: worth doing, a piece of work
the size of `flavonoids.mjs` rather than an afternoon, starting with the column
conversion. The map was built and the recommendation did not survive it. See
**"Phenol-Explorer is not a second source"** below and
`PHENOL-EXPLORER-MAP-REVIEW.md`.

### One blocker cleared, 2026-08-17

`usda-flavonoids.json` named **54** page foods while the columns themselves reach
**94**, because the columns resolve through a chain the corpus did not. Converting
the columns in that state would have *lost* data: flavonols show 66 foods today
and only 54 could have followed.

`flavonoids.mjs map` now rebuilds `page_slugs` from the chain `computeValues`
already uses, and the corpus names **94** foods, matching `coverage` exactly.
Nothing in it is a new judgement: page food to `fdc_id` comes from `usda-map.json`
and `food-additions.json`, both human-reviewed, and `fdc_id` to NDB number comes
from SR Legacy's own crosswalk. There is no fuzzy matching in the chain, which is
why it can be run rather than reviewed by hand. Checked afterwards: every food
showing a flavonol value is now named by the corpus, and no food is named twice.

**Precedent worth knowing:** `proanthocyanidins` is already an evidence column in
the same group, with the same unit and the same null daily value, holding 62 cells
and 0 `v` values. Its corpus carries `page_slugs` in exactly this shape and
`build.mjs` indexes what it attests at the foot of `loadAttested()`. So the
conversion has a working model to copy rather than a design to invent.

### Why the columns were not flipped in the same pass

**Converting on its own adds no data and changes 224 rendered cells.** The gain
from evidence columns is per-cell provenance and room for a second source, and the
second source is the entire point. Doing the conversion without Phenol-Explorer
leaves the page altered with nothing to show for it.

And Phenol-Explorer cannot follow the same deterministic chain. Its food names are
free text with no NDB number, so its page map has to be matched and then reviewed,
which is the step this project insists on precisely because automated matching is
confidently wrong in ways that are hard to spot. **The two belong in one pass, or
in neither.**

### Phenol-Explorer is not a second source, 2026-08-17

The map was built, 73 page foods against 173 Phenol-Explorer foods, and it
answers the question the other way round from how this document expected.

**143 of the 178 cells it would fill share at least one publication with USDA
Release 3.3's own reference list for the same food.** Both are compilations and
they compiled the same papers: Hertog 1992, Justesen 1998, Harnly 2006, Lugasi
and Hovari 2000 and 2002, Arts 2000, Mattila 2000. Phenol-Explorer's pecan is
USDA's pecan to one decimal place on all eight compounds, because publication 655
there is Harnly 2006, which is reference R110 here. Celeriac and kohlrabi agree
with the page **exactly**, because both sides read Lugasi and Hovari 2000.

This is checkable rather than inferred, and now checkable offline: both databases
publish their paper lists, and both are ingested. `node tools/phenol_explorer.mjs
overlap` prints it.

**Three rules fell out of the exercise.**

*Method beats source.* Phenol-Explorer stores two chromatography methods and the
choice changes a figure by an order of magnitude. Its plain `Chromatography` rows
report the free aglycone, near zero in anything storing the compound as a
glycoside; the `Chromatography after hydrolysis` rows report the aglycone total,
which is what USDA measures. Blackberry quercetin is 0 by the first and 0.87 by
the second, yellow onion quercetin 0.28 against 12.65. This belongs beside Rule 1:
a derivation, a preparation and now a method can each make two figures for the
same food not comparable.

*Shared provenance is not agreement.* Two compilations agreeing is worth nothing
if they read the same paper, and the page must not print one measurement twice
under two names. The rule written into the map: a cell may cite a second
compilation beside USDA only where the two do not share a paper, and that only
bites where USDA already has a figure, since an empty cell duplicates nothing.
47 of the 178 pass.

*A PubMed id is traceability, not quality.* All 121 Phenol-Explorer rows citing
Harnly 2006 carry the PMID of a 2012 narrative review of endothelial function
instead. The mismatch is upstream in the published file.

**What is left of the 30 foods.** After the preparation rule, the completeness
rule and the method rule: **8 new figures above zero**, 2 genuine disagreements
worth a range (pak choi flavonols 48.7 against 6.42, and flavones 5.7 against
0.33, both Bahorun 2004, which USDA did not use for that food), and about 30
analysed zeros. The best of them is orange flavanones at 44.83 mg, in a column
holding two figures in the whole table.

**So the columns were not converted.** Converting costs 224 rendered cells, takes
the five columns out of the chart, since `app.ts` offers only non-evidence columns
there, and silently zeroes `FLAV_REACHED`. That price was worth paying for a
second source and is not worth paying for eight figures. The map, both publication
lists and the provenance rule are committed, so the decision costs one session
whenever it is next taken.

### Two mapping choices worth revisiting, found on the way

Neither is changed here, because both would alter a published figure and that is
a decision about data rather than about mapping.

| Food | Current row | Alternative | Why it might be better |
|---|---|---|---|
| Turnip greens, cooked | 170139, boiled **with salt** | 170466, boiled **without salt** | Every other cooked vegetable here uses a without-salt row. The current one carries cooking salt into the sodium column. |
| Raisins | 168164, **golden** seedless | 168165, **dark** seedless | Dark seedless is the ordinary retail raisin. Golden is a sulphured product and differs in more than colour. |

**Both settled 2026-08-17, and they went opposite ways, which is the point of
checking rather than assuming.**

**Turnip greens was changed.** It showed **265 mg** of sodium against 40 in its own
raw row, 15 for cooked collard greens and 9 for cooked mustard greens. It was an
order of magnitude out of line with every comparable food, and the cause was
cooking salt rather than the vegetable. Comparing the two SR Legacy rows nutrient
by nutrient, **only 2 of 90 differ by more than 2 %**: sodium, 265 against 29, and
choline, absent against 0.3 mg. So the correction was those two figures and the
mapping, not a re-pull.

**Raisins was left alone.** The same comparison gives **24 mg against 26 mg** of
sodium. Golden and dark seedless differ in sulphur dioxide treatment and colour,
neither of which this page carries, so switching would have changed the citation
without changing anything a reader sees.

### And one trap in the matcher

`tools/usda.mjs match` proposes at `exact` confidence for every pure oil, because
oils are all close to 100 % fat and 0 of everything else, so the fingerprint
distance between any two of them is near zero and the shared word "Oil" clears
the content-word guard. In one run it proposed **corn and canola oil** for
rapeseed, sunflower, sesame, walnut **and** avocado oil, and sunflower oil for
peanut oil. The right rows all exist. This is the same failure the tool's own
docstring describes for black beans and black pudding, and it is worth knowing
that `exact` means "the macros agree", not "this is the food".

## Settled 2026-08-18: what a range shows, and one thing it must never show

Both open range questions are answered, and answering the first turned up a
defect that contradicted rule 3 in code.

**How far apart before a range?** Already decided and already implemented:
`SPREAD_LIMIT` in `reconcile.mjs` is 2, from the observed data rather than
chosen in the abstract. Molybdenum agrees at 0.7 to 1.5x, biotin's spinach
disagrees at 29x, and nothing sits awkwardly near the boundary. What was open
was the second question and a hole in the first.

**The hole. `reconcile([0, 74])` returned `measured 37`.** Rule 3 above says of
that exact case, AFCD's 74 ug of iodine in rolled oats against MEXT's not
detected, that it "must be shown as a range with both sources named, never
averaged to 37". The spread was computed over the values above zero, so a source
that looked and found nothing could not widen it, and the cell collapsed to a
midpoint neither laboratory measured. An analysed absence is a finding and the
widest disagreement there is. Fixed, and covered by two tests. It was latent
rather than live: every cell of that shape on the page today was written by
another pass and is correctly a range. The biotin work would have hit it.

**What a range summarises.** A range is now `low`, `high` and, where three or
more figures make one, `median`. The page prints the median first and the bounds
behind it, and sorts on the median.

Sorting is where the old convention did visible damage. A range sorted on the
midpoint of its bounds, which is the centre of an interval rather than of the
evidence:

| food | printed | sorted at | median |
|---|---|---|---|
| Broccoli, raw | 1.19 to 217.9 | **109.5** | 23.85 |
| Brussels sprouts, raw | 0.17 to 35.55 | 17.9 | 6.16 |
| Cabbage, raw | 0.34 to 19.64 | 10.0 | 1.03 |

Raw broccoli led the glucoraphanin column on 109.5, a figure nobody measured,
and raw brussels sprouts outranked red cabbage's own measured 13.06. The bounds
are kept because they are honest and because 217.9 is a real floret sample; the
median is added because it is the figure a reader should compare on.

**Two figures get no median.** This is the half that protects rule 3. The median
of two figures is their midpoint, so a two-figure range prints its bounds alone:
oats iodine reads 0 to 74 and never 37. Thirty of the 62 range cells carry a
median; the other 32 rest on two figures.

The rule lives in `reconcile.mjs` for both shapes a range can take: `reconcile`
for figures from different sources, and `spanCell` for repeated samples of one
food, which the four passes in `evidence.mjs` that span samples now share rather
than building cells by hand.

## Still to do

- Reconcile biotin across **three** sources (MEXT, CoFID, AFCD). CoFID covers 1,925
  foods and has not been joined yet; it is the best candidate for a real three-source
  range.
- Reconcile oligosaccharides: IFCT (broken down, dry) against CoFID (lumped, both raw
  and boiled) against AFCD (undifferentiated, largely imputed and to be rejected).
- Reconcile oxalic acid: MEXT against AFCD against IFCT (which reports soluble and
  insoluble separately and is not yet extracted).
- Build reviewed page mappings for CoFID and IFCT. Only MEXT (81 foods) and AFCD
  (15 foods, this pass) exist so far.
