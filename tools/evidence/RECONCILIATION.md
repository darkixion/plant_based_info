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

## Status by component

| Component | Reconciles? | Treatment |
|---|---|---|
| Molybdenum | yes, 0.7-1.5x on analysed values | single value defensible |
| Soluble / insoluble fibre | single source (MEXT) | single value, source named |
| Inulin | single source (AFCD) | single value, source named |
| Raffinose / stachyose / verbascose | IFCT primary, AFCD thin | single value, dry basis stated |
| Phytate, saponins | single source (IFCT) | single value, source named |
| **Biotin** | **no, up to 29x** | **range** |
| **Iodine** | **no, oats 74 vs not detected** | **range** |
| **Oxalic acid** | **no, spinach 0.3 vs 0.7** | **range** |

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

**Recommendation:** worth doing, and it is a piece of work the size of
`flavonoids.mjs` itself rather than an afternoon. Start by settling whether the
flavonoid columns become evidence columns, because everything else depends on it.

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
- Decide the range rule: how far apart two analysed values may sit before the page
  shows a range rather than a value.
- Decide what a range should summarise when a source has **hundreds** of rows for one
  food. The convention is min to max over the release's own means, which is faithful
  and, at large n, close to uninformative. Raw broccoli in the USDA glucosinolate
  release is the case: 210 means, a median of 23.85 and a middle half of 15.07 to
  33.08, printed as **1.19 to 217.9** because two cultivar extremes set the bounds.
  The endpoints were checked and are real broccoli floret samples, EV 6-1 at the
  bottom and Marathon at the top, with no sprout or microgreen rows contaminating the
  mapping. So the figure is honest and still tells a reader almost nothing. Every
  other range here is built over a handful of means, where min to max is fine, so
  this is a question about one source rather than a flaw in the mechanism.
