# Handover: where things stand

Written 2026-08-05, updated 2026-08-07. Read `README.md` first; it carries
everything durable that a handover note should not be holding.

## Latest session, 2026-08-07 (thirteenth)

**Phase 1 of the evidence columns shipped**, executed from the plan the twelfth
session wrote. Soluble fibre, insoluble fibre and biotin are columns now: 73
nutrients, 81 foods carrying 243 evidence cells. Written up durably in
`README.md` under "Evidence columns".

**The plan was right about the hard part and wrong about the reach.** Its own
self-review had caught that every figure funnels through `shown()` into `val()`
and named four call sites with line numbers, all four of which still pointed
where it said. What it missed is that `val()` is reached from four *more*
places that walk `NUTS` directly, and three of them broke the page:

- `renderDetail`'s Absorption tab walks every nutrient looking for a curated
  note, `sourceOf()` walks every nutrient looking for interactions, and
  `gapEvidence()` counts every food's value for one. Each now walks `VNUTS`,
  the non-evidence nutrients, which is the same list `IDX` and `dayTotals()`
  are built from.
- `dayTotals()` itself mapped all of `NUTS`, which would have thrown on the
  first day view, and `csvDay()` exported a column with no total to put in it.

**The lesson worth keeping: naming the call sites of one function is not the
same as naming the reads of the data.** The plan searched for `shown(` and
found four. The failure was in code that never calls `shown()` at all.

**`nutOpt()` had to stop reading `IDX`.** `IDX` answers "where in `v`", which
an evidence column has no answer to; reaching a *column* by id is a different
question. `BY_ID` is that map, and without splitting them `nut("biotin")` threw
in the sort comparator and the detail panel, both of which have every right to
ask about a column that exists.

**Where an evidence column deliberately does not appear**, each a judgement
rather than an accident: the chart, because a bar length is a figure divided by
the largest figure and a range is neither; a day's totals and the day CSV,
because there is no total of an evidence value; and `%DV`, because `dv` is null
on all three. `build.mjs` now also refuses an interaction, a gap entry or a
per-cell note that names one, so the data cannot express what the page could
not render.

**Four locks on the invariant, and no single edit undoes them**: the value is
not in `v`, `val()` throws on the id, `shown()` returns null before reaching
`val()`, and `dayTotals()` never builds a row for it. There is a test asserting
all four from one page evaluation.

**The plan's own tests needed fixing before they were worth running.** Two of
the four browser tests it specified asserted nothing: one carried a literal
`|| true`, and the other compared two identical `page.evaluate` calls and
declared them equal. They are replaced with real assertions, including the one
that matters most, that no state which is not a figure renders a digit and
every state which is one does.

**`build.mjs` builds only when it is the process entry point now.** It called
`await run()` at the top level, so `test/tools.mjs` importing `checkEvidence`
would have rebuilt the page as a side effect of running the tests. Same
`process.argv[1]` guard `tools/usda.mjs` has carried since the seventh session,
and the same reason.

**Deliberately not done**: the remaining 32 components, which is phase 2; no
inulin, chromium, molybdenum or boron column yet; no source dialog listing the
three databases, though `SRCS` is injected and the detail panel names their
countries; and no `estimated` cell anywhere in the data, so that state is
modelled and rendered but not yet exercised by a real value.

**Licensing is the owner's separate manual task** and is not tracked here.

## Earlier session, 2026-08-07 (twelfth)

**Nothing shipped, and that is the point.** This session was research and
design. No column was added, no figure moved, and `src/` is untouched apart from
nothing at all. What exists is an evidence store, a spec and a plan, on branch
**`evidence-columns`**, one commit ahead of `main`.

**Start here next time**: the plan at
`docs/superpowers/plans/2026-08-07-evidence-columns-phase-1.md`, which is written
to be executed by someone with no memory of this session. Its design is at
`docs/superpowers/specs/2026-08-07-evidence-columns-design.md`, and the data it
consumes is in `tools/evidence/` with `README.md` and `sources.json` as the way
in.

**The question was whether nine compounds could be added with real provenance**:
biotin, chromium, molybdenum, boron, taurine, inulin, beta-glucan, pectin and the
oligosaccharides. The answer is yes for six, no for two, and one is parked.

**SR Legacy publishes zero rows of every one of them.** It *defines* nutrient ids
for all nine plus both fibre fractions, and carries a value for none across all
7,793 foods. Measured with a control, not assumed: the same parser counts 7,793
protein rows and 7,708 calcium. So this needed outside sources, and it took
eight databases in five countries.

Findings worth keeping, in rough order of how much they cost to learn:

- **Coverage does not predict agreement.** Biotin has the best coverage here,
  four sources and 3,000-plus food rows, and the worst agreement: 29x on
  spinach, 9.3x on carrots, only 4 of 14 comparable foods within 2x. An
  assessment written earlier in this same session called biotin the safest
  single value of the nine. That was wrong, and it was wrong because it counted
  rows before comparing any of them. **This is the most reusable lesson here.**
- **Derivation outranks source.** AFCD publishes a per-food derivation and only
  490 of its 709 plant rows are `Analysed`; the rest are recipe calculations,
  borrowed or imputed. Every large biotin gap against Japan turned out to be a
  recipe calculation, and where both had actually assayed the food they agreed
  within 20%. Grading by source alone would have shipped 219 calculations as
  measurements.
- **An outlier is not a range.** AFCD reports rolled oats at 74 ug of iodine,
  analysed, twice, against Japan's not-detected. That looked like real
  geographic variation until a third source settled it: USDA gives cooked
  oatmeal 0.2 ug at n=10, and brown rice 0 at n=28. A rule that only knew how to
  widen would have published "0 to 74" and called it honest. Hence the outlier
  rule, and hence the fact that **two sources cannot produce one**: it takes a
  third to say which is odd.
- **Preparation is a sharper edge than sourcing.** Red kidney bean
  oligosaccharides are 3.6 g raw and trace boiled; soya 5.5 raw and 1.1 boiled;
  chickpea inulin 1.7 dry and 0.6 boiled. Every legume on this page is cooked
  and most outside sources report dry. A right value against the wrong
  preparation is worse than none, because it looks right.
- **Japan's tables are the single richest source** and were not on anyone's list
  at the start. 2,478 foods per 100 g edible portion, with chromium, molybdenum,
  iodine, selenium and biotin, plus separate volumes for fibre fractions, sugars
  and organic acids. Its notation already distinguishes measured, trace, zero,
  estimated and not-measured, which is where the six-state cell model came from.
- **Two components moved from blocked to available late.** Boron, because Frida
  reports it on a fresh-weight basis rather than the 0%-moisture dry beans that
  made the USDA figures unusable. Inulin, because AFCD is the only database
  anywhere with an inulin field, and its 50 foods are almost all on this page.
- **Two parsing bugs were caught before they reached the store**, both the same
  species: column drift in PDF extraction. The IFCT phytosterols shifted one
  column left for rows with no oligosaccharide values, because the table
  reprints its header every page and the layout moves. The tell was ajugose
  appearing in 149 rows when it is rare; it is 4. Anchors are now read per page
  and eight rows were checked against raw text by hand. A CoFID parse also
  reported 2,780 oligosaccharide values when the truth is 363, because
  self-closing empty cells shifted every column right. **Both were caught by a
  count that looked wrong, not by a test.**

**Deliberately not done**: no pectin column, because no database anywhere carries
it for these foods and soluble fibre is the honest substitute; no taurine
column, because it would be 131 cells of one finding and belongs in prose, with
the red algae exception stated so it does not repeat the nori B12 error; no
chromium, parked by the owner after the research was complete; no absorption
arithmetic now that phytate and oxalate have figures; and no new foods.

**One thing is unresolved and blocks committing `evidence.json` to a public
repo**: licensing. USDA data is public domain, but Frida asserts copyright, NEVO
ships conditions of use, and CoFID, AFCD, MEXT and IFCT each have their own
terms. The owner deferred it deliberately. It is recorded in the spec under
"Deliberately not done" and needs settling before phase 1 ships.

## Earlier session, 2026-08-07 (eleventh)

**Nutrient gaps shipped**, plus EPA and DHA as columns. Designed at
`docs/superpowers/specs/2026-08-07-nutrient-gaps-design.md` and written up
durably in `README.md` under "Nutrient gaps".

**The entries were derived, not listed.** Four were named from memory first,
then every nutrient with a daily value was ranked by the best **unfortified**
food in the table. Vitamin D and B12 sit at 3% of a day with nothing over 20%;
the next entry is a macronutrient at 27%. All four guesses survived, and the
check found three things memory had missed.

Findings worth keeping:

- **The vitamin D in these foods is D2, not D3.** USDA assayed cholecalciferol
  three times and found zero every time, ergocalciferol three times and found it
  every time. And the D2-versus-D3 story is weaker than it is usually told: D3
  wins as a **single large dose**, and a meta-analysis of daily supplementation
  found no difference. Checking that citation is what stopped the entry
  overclaiming.
- **A correction to existing copy.** Methodology said flatly that seaweed's B12
  is inactive analogues. That is right about spirulina and **wrong about nori**,
  which carries around 77.6 µg per 100 g of active B12 and has raised B12 status
  in animals and one small human trial. Still not dependable, since toasting
  halves it and drying can convert active forms to analogues, but the flat claim
  was wrong and is now two stories rather than one. A test stops it returning.
- **The evidence counts three states, not two.** A cell assayed and found empty
  is a finding of absence; a cell nobody assayed is evidence of nothing. The
  first draft collapsed them into "carries a figure" and threw away the best
  line the data has: **123 of 131 foods were measured for B12 and found to
  contain none.**
- **Fortified figures can never be the best.** The three highest B12 figures are
  nutritional yeast, soy milk and yeast extract. Counting them would turn the
  strongest evidence for the gap into evidence against it.
- **Choline is the next thinnest**, best food 35% per 100 g and only two over
  20%, so it is a `plan` tier rather than a `gap`. Cites are required for `gap`
  and optional below it, which is a rule about what kind of claim each tier
  makes rather than about how much is known.

**Inulin, answered properly.** SR Legacy defines inulin (1403), soluble and
insoluble fibre, beta-glucan, resistant starch, pectin and the oligosaccharides,
and publishes **zero rows** of any of them for these foods. Same for iodine
(1100). That is a pattern: SR Legacy defines many ids it never populates for
whole plant foods, so "the id exists" says nothing about whether a pull can
reach it. A full sweep of its holdings against `COLUMN_TO_USDA` is in the open
list; the only real candidate it turned up is betaine.

**The page stopped naming its own plumbing.** "SR Legacy" had reached eight
places in the copy, and only four were from this session: the other four had
been shipping for a long time. It is the internal name of the USDA release
behind the table, and every sentence using it said something plainer once
rewritten, usually "USDA publishes no figure for it". A test now walks the whole
rendered page, every dialog, every nutrient note and every detail tab, and fails
on file names and internal identifiers.

Two things are deliberately not on that forbidden list, and the distinction is
the useful part: **`FoodData Central`** stays because it is the public database
a reader can search, so naming it is a citation rather than jargon; and
**fatty-acid notation like `18:2`** stays because it is the field's own
vocabulary, it is introduced where it is used, and the column labels already
carry it. The line is between vocabulary a reader can learn from the page and
names that only mean something inside this repository.

**Deliberately not done**: no doses, no products, no brands, and tests for all
three. No iodine or inulin columns, since there is nothing to pull. No betaine
column yet. No selenium entry, for the reason on the open list.

## Earlier session, 2026-08-07 (tenth)

**A sticky table header was tried two ways and abandoned. Nothing shipped from
it**, and the point of this note is that the next person does not spend the
afternoon finding out the same things.

**The table is full length, the page scrolls, and the header does not stick.**
That combination cannot be written as one element, which was established by
measurement rather than argued from the spec:

| `.tablewrap` overflow | computed | header top, page scrolled to 2500 |
|---|---|---|
| `auto` + `max-height` | auto/auto | sticks |
| `auto`, no max-height | auto/auto | -1935px |
| `overflow-x:auto; overflow-y:visible` | **auto/auto** | -1935px |
| `overflow-x:auto; overflow-y:clip` | **auto/hidden** | -1935px |
| `overflow-x:scroll; overflow-y:visible` | scroll/auto | -1935px |

A sticky element sticks within its nearest scroll container. This box has to be
one horizontally, because 70 columns are wider than any screen, and the visible
axis computes to `auto` the moment the other is not visible. So there is no
arrangement where the box scrolls sideways and the header sticks to the page.

The two ways round it, both built and both rejected:

- **`max-height:calc(100dvh - 32px)`**, restoring what `6157a35` removed. Works
  perfectly, header sticks at every width, two tests passed. Rejected because it
  makes the table a nested scroller inside a scrolling page, and the full-length
  table was itself an explicit ask.
- **A width-matched copy of the header outside the box**, sticky to the page and
  scroll-synced to the table. This is where the CSS-Tricks comment threads land
  too, and the article itself does not cover horizontally scrolling tables. It
  needs a colgroup rebuilt from measured widths on every render, ids stripped so
  the document does not carry two of each, buttons pulled out of the tab order
  so an `aria-hidden` subtree holds nothing focusable, and a visibility toggle
  so both headers are never on screen together. Abandoned mid-build as more
  machinery than the gain justifies.

**So the cost stands and it is real**: on a phone a screenful is eleven rows,
and the figures below the first screen are unlabelled. If it is picked up again,
the copy is the more promising of the two, and the honest estimate is a day with
tests rather than an afternoon.

**Iodine was researched and the data exists.** See the open list. The short
version is that it would make a column of near-zeros with one enormous outlier,
which is itself the useful finding.

## Earlier session, 2026-08-07 (ninth)

**Bioavailability shipped, in three phases, and not one figure moved.** A
dataset of sourced interactions, a line under the nutrient note, an Absorption
dialog, a sixth detail panel tab, and a pairing hint in My day. Designed at
`docs/superpowers/specs/2026-08-07-bioavailability-design.md` and written up
durably in `README.md` under "Bioavailability". 135 tests, all passing.

**The rule the whole thing is built on is enforced by a test, not by a
comment.** Every rendered figure with `interactions.json` present must equal the
figure with it emptied. Absorption is explanation here; the moment it becomes
arithmetic that test fails. It is the single most important thing in this
feature and the cheapest to lose.

**One record per interaction, read from both ends.** Iron's view names vitamin
C, vitamin C's view says it raises iron, one record. `affects` is an array so
the one "carotenoids need fat" entry serves all five carotenoids. The agent may
be a nutrient, a substance, a food or a practice, which is the part that earns
its keep: phytate, oxalate and tannins have no columns, and soaking is not a
substance at all.

Findings worth keeping:

- **`build.mjs` refusing a source that nothing cites caught a real error.** The
  oxalate record quoted spinach from one paper and kale from another while
  naming only the first, so `cites` is an array. The check was written before
  the mistake and found it within a minute.
- **Two selection rules, because 39 of 70 nutrients have no daily value.** That
  is every carotenoid and every flavonoid, so a %DV threshold alone would have
  been structurally silent on carotenoids needing fat, which is one of the most
  useful facts in the topic. Rule 2 ranks within the column, top 10 of 131.
- **The sixth tab broke the desktop layout, not the phone.** The detail panel is
  a 300px column at every width, so six tabs never fit one row anywhere. It
  pushed the panel 54px past its column and set the page panning sideways at
  **1440px**. The narrow-screen test written the session before is what caught
  it, at the width nobody would have thought to check by hand.
- **`sourceOf()` reads `val()`, not `shown()`**, so flipping to per 100 kcal
  cannot rewrite a food's absorption tab. Whether a food is a good source of
  iron is a fact about the food. There is a test that flips the basis and
  asserts the selection is unchanged, in the same spirit as the one guarding
  `dayTotals()`.

**Eight sources, every one checked against the literature** rather than written
from memory, which is the same standard the project already applies to FDC ids.
Spinach calcium 5.1% against milk's 27.6%, kale 40.9% against 32.1%, black tea
cutting iron absorption 79 to 94%, phytate:zinc above 15 dropping zinc
absorption to about 15%. Those figures are in the page because they were looked
up, not recalled.

**The curated notes are the reason this is not purely derived.** A generic
"oxalate can bind calcium" against spinach's 99 mg leaves a reader thinking
spinach is a fair calcium source. Two notes, markers `‡` and `§`, on three
high-oxalate and three low-oxalate foods, stated as named exceptions rather than
coverage. That debt is real and recorded: nothing distinguishes "checked,
nothing to say" from "never checked".

**Deliberately not done**: no absorption percentages applied to anything, no
phytate or oxalate columns (they would need a source outside SR Legacy, a
separate project of the shape `flavonoids.mjs` is), no meal grouping in My day,
and no interactions this session's sources did not actually support. Copper
against zinc, oxalate against iron and lycopene against cooking were all
considered and dropped for that reason.

## Earlier session, 2026-08-07 (eighth)

**The page is usable on a phone.** The food table compacts below 700px and the
sidebar goes behind a menu button below 820px, both scoped so nothing above
820px moves. Designed at
`docs/superpowers/specs/2026-08-07-mobile-layout-design.md` and written up
durably in `README.md` under "Narrow screens". 123 tests, all passing.

**The food column was 369px wide in a 360px viewport**, wider than the screen it
had to fit on, and sticky at `left:0`, so it covered the scrollport whole. A
phone showed a list of food names and not one figure. It is 144px as measured
now, one full figure and most of a second at 320px and two from 360px up, and
the table starts 694px down the page rather than 1874px.

**The load-bearing rule is `white-space:normal`, not the width.** While the names
cannot wrap the column widens to the longest one whatever width it is asked for,
so setting a width alone would have changed nothing.

**144px is a floor rather than a choice, and the rule asks for 150.** A table
cell will not shrink below its content's min-content width, which here is the
longest single word in a food name. Asking for 128 or 118 gives 144 too;
measured, not assumed. Going under it needs mid-word breaking, which buys one
more column at 320px and costs every name on screen. Do not spend time tuning
the 150.

**The whole page panned sideways into blank space, and it was never about the
table.** `.sr` is `position:absolute`, `noteMark()` puts one in a numeric cell,
and an overflow clip only reaches a descendant whose containing block is inside
the clipping box. Nothing between those cells and the root was positioned, so
`.tablewrap`'s `overflow:auto` never applied to them and they sat ten thousand
pixels out. `position:relative` on `.tablewrap` is the fix.

Three findings worth keeping, all of the kind this note exists for:

- **This was not a mobile bug.** At 1440px the document was 7680px wide and a
  screenshot at x=3000 was blank white. It had been shipped that way for
  months. Fixing it changes desktop, which is why it was raised as a scope
  question rather than folded in quietly.
- **`scrollWidth` is the wrong thing to measure**, and measuring it sent the
  first four fix attempts nowhere. It reports content extent whether or not the
  box can scroll, so `overflow-x:clip` on `html` looked like it had failed when
  the metric simply could not see it. Assert `scrollWidth - clientWidth` on the
  scrolling element, which is what actually pans. (Those four still did fail;
  the point is that the evidence could not have told either way.)
- **`min-width:0` does not release a `<select>`'s intrinsic minimum.** It
  releases the automatic minimum size a flex item gets, but the min-content
  *contribution* stays at the longest option, and `.shell`'s `1fr` column is
  `minmax(auto,1fr)`, so the lens control made the whole page 57px wider than
  the phone. A definite `max-width` is what caps it. `.dayqty select` already
  carried both halves; copying only one of them cost an extra round.

**The header rows are not sticky vertically**, and this session did not break
it. `.tablewrap` has no vertical overflow since the box grows to its rows and
the page scrolls instead, so `top:0` has nothing to stick within. It is called
out because the obvious test to write beside the horizontal one asserts
something that is not true, and a draft of that test did. The tenth session
below tried twice to fix it and shipped neither.

**Deliberately not done**, so nobody wonders: no card or list view replacing the
table on narrow screens, no column chooser for phones, no touch gesture
handling, and search did not move out of the sidebar, so with the menu closed
there is no search box on screen. The reasoning for the last one is in the
README.

## Earlier session, 2026-08-07 (seventh)

**Three open items closed, and they turned out to be one piece of work.** Each
was a `KNOWN` entry in `tools/usda.mjs` followed by a `pull`, and each ran into
the same property of the tool. 68 nutrients now, 131 foods, and 117 tests, 3 of
them the first here that do not drive a browser. All passing. Designed at
`docs/superpowers/specs/2026-08-07-fat-repull-and-two-columns-design.md`.

**The rule that unblocked all three: a pull may never replace a figure with
nothing.** `cmdPull` wrote `null` into any cell whose mapped row lacked the id,
which is right for a fresh column and destroys data on a re-pull. That is why
the fat re-pull sat open for so long: running it would have blanked 20 real
values. `nextValue()` in `usda.mjs` is the whole fix, and `test/tools.mjs` holds
it, the first test here that does not drive a browser. Adding it meant guarding
the CLI dispatch so importing the module does not run a command, with
`process.argv[1]` rather than `import.meta.main`, which is Node 24 while CI pins
20.

**Amaranth is the food that makes the rule concrete.** It is mapped, reviewed
and correct, to `170683` "Amaranth grain, cooked", and that row carries 33
nutrient ids and not one of the 12 fatty acid ids. A silent row is not evidence
of absence. Soy milk, seitan and nutritional yeast are the other three, all
deliberately unmapped.

**The fat group re-pull resolved all six standing disagreements**, mung beans,
edamame, lupin beans, natto, buckwheat and wholewheat pasta, by taking fraction
and total from the same reviewed row. Measured: 1030 identical, 164 changed, 24
gaps filled, 0 blanked, 20 preserved. `mufa`, `pufa` and `satfat` had to enter
`KNOWN` first; they were in `COLUMN_TO_USDA` and not `KNOWN`, so `pull` could
not touch them, which is why re-pulling only the fractions could never have
worked.

**The quiet part of that change is provenance, not figures.** Undifferentiated
markers went from 163 cells across 83 foods to 225 across 115. Those 62 cells
were always undifferentiated; they predated the mechanism that records it, so
the page had been showing them as direct measurements. Walnuts is the case that
exposed it: a test asserted its omega-3 carried no fallback marker and passed
because the marker was **missing**. Its ALA read 9.08 before and 9.08 after.

Three findings worth keeping:

- **`README.md` claimed flaxseed, chia and walnuts carry differentiated omega
  figures alongside hemp. Two of the three were wrong.** Hemp (`170148`) and
  chia (`170554`) carry 1404 and 1316; walnuts (`170187`) and flaxseed
  (`169414`) carry neither. The argument the sentence was making survives, since
  it turns on hemp alone, but the list was propping up a test that passed for
  the wrong reason.
- **Adding a column needs an entry in `KNOWN` *and* in `COLUMN_TO_USDA`.** Miss
  the second and `usda.mjs add` throws and refuses to add any food. This was hit
  twice in one session, on gamma-tocopherol and again on phytosterols, despite
  the README having said so all along. Nothing in `npm test` exercises `add`, so
  the break waits for the next food.
- **The recorded phytosterol coverage was wrong twice**, "8 to 14" and then 24.
  It is 25. That correction is what made the column worth reconsidering, and it
  shipped, so the README now records the reversal rather than letting the column
  look like it had always been intended.

**Deliberately not done**, so nobody wonders: no beta or delta tocopherol and no
tocotrienols, no phytosterol fractions, no estimated rows for romanesco, freekeh
or cavolo nero, and no CSV or export changes beyond the two columns appearing.

## Earlier session, 2026-08-07 (sixth)

**Portion weights shipped for My day.** A quantity can now come from a USDA
portion instead of a typed number: 128 of 131 foods carry portions from SR
Legacy's `food_portion.csv`, 320 of them, generated into the new
`src/data/portions.json` by `tools/portions.mjs propose`. Designed in full at
`docs/superpowers/specs/2026-08-06-portion-weights-design.md` and written up
durably in `README.md` under "My day". 110 tests, all passing.

**Choosing a portion writes grams and nothing else.** `S.day` still stores
`{ slug, g }`; the select is derived from the stored quantity rather than
remembered as a separate choice, so typing a number or using the steppers
moves it too, and it reads "custom" the moment the quantity matches no
portion. Every total, export and saved day stays exactly what typing that
number would have produced.

**`tools/portions.mjs` is a filter as much as a pull.** Of 364 SR Legacy
portion rows for these foods, 44 were dropped, each printed with the rule
that dropped it: 17 under a 5 g floor, 14 regulatory NLEA servings, 6
purchase quantities like "1 pint as purchased", 3 over a 500 g cap, and 4
that round to the same whole gram as a portion already kept for that food.
None of those belong on the page, and the tool says so rather than silently
including them. The three foods with no portion at all, Seitan, Soy milk and
Nutritional yeast, are the same three that have no SR Legacy row.

Three findings worth keeping, all the kind this note exists to preserve:

- **The fdc ids live in two files, not one.** `src/data/usda-map.json` holds
  the 44 original foods; `tools/food-additions.json` holds the other 87,
  across its `requested` and `staples` arrays. The open item this session
  closes claimed `usda.mjs` held the reviewed row for every food. The first
  pass at the portion tool read only the map and silently covered a third of
  the table.
- **`clampG` rounds to whole grams**, so a sub-gram portion would store a
  quantity that no longer matches the portion that set it, leaving the
  control reading "custom" the instant after it was used. That is what the
  5 g floor and matching on `clampG(p.g)` rather than the raw figure both
  exist for. Without them the control would silently forget what it was
  told.
- **The same rounding also creates false matches, not only missed ones.**
  Two portions of one food that round to the same whole gram, such as
  walnuts' "1 cup, in shell" at 28 g and "1 oz" at 28.35 g, are
  indistinguishable to `clampG(p.g)` by construction, so the second could
  never appear selected. Caught in the final review and fixed in the data:
  `tools/portions.mjs` now drops the second of any such pair rather than
  leaving the control to pick one arbitrarily, and `build.mjs`'s `validate()`
  refuses a hand edit that reintroduces it.

**Not in the spec, added anyway: `tools/csv.mjs`.** `usda.mjs` and
`flavonoids.mjs` each carried an identical private RFC4180 reader, and the
portion tool would have been a third copy. Extracted into a shared module
first, and both existing tools refactored onto it, verified by diffing each
tool's output before and after the change.

**Deliberately not done**, so nobody wonders whether it was forgotten: no
portion column in the CSV export, no representative "typical" default grams,
and nothing added to the food table view. A portion is an input to a
quantity, not a fact about a food, so it belongs only where a quantity is
entered.

## Earlier session, 2026-08-06 (fifth)

**`src/app.js` is now `src/app.ts`.** esbuild compiles it to a minified
`dist/app.js`, which `build.mjs` inlines exactly where it used to inline the
hand-written file. Nothing about the deliverable moved: one self-contained
`index.html`, no build step at view time, no network calls, and `build.mjs`
still imports nothing but `node:*`. 105 tests, all passing.

**`npm test` now runs `tsc --noEmit` before it compiles anything**, and CI runs
the same check as a step of its own so a type error is reported as a type error
rather than as a failed test run. The gate was watched failing before it was
trusted: a deliberate `const _typecheck: number = "not a number"` appended to
`src/app.ts` stopped the run at the check step, with nothing compiled, nothing
rebuilt and no browser started.

The page is **11.1 kB smaller gzipped**, 77.2 kB down to 66.2 kB, and the script
11.2 kB, 36.7 kB down to 25.5 kB. `nutrients.json` is most of what remains, so
this is close to the ceiling for minification alone. The README carries the raw
byte counts and the reasoning.

**The error count, as a record: 304 at the start, then 230 once the dataset had
a shape, then 231, 222, 215, 186, 185, 81, 86, and 0.** It went up twice, which
is the interesting part rather than a wobble. Both rises were the checks
starting to bite somewhere a too-confident type had been holding them off, so
the count rising was the previous step having landed rather than a step going
backwards.

**What the conversion found is the answer to whether it was worth doing.**

- **Two real display bugs, both live in the shipped page**, both the same
  species: a fabricated zero standing in for a measurement that does not exist.
  They are described in full below. **Neither was caught by the 101 tests that
  existed at the time.** The suite was green through both, for months. Each now
  has a regression test.
- **Three errors in this project's own planning and design documents**, each a
  claim about the code that the compiler disproved: `dv` typed non-nullable when
  35 of the 66 nutrients have no daily value, `View` missing `"day"` when My day
  is a third view, and the belief that typing a function's return annotates its
  consumers' parameters, which TypeScript never does. Corrected in `c49091a`
  rather than left to mislead the next reader.
- **One flaw in the DOM helpers as designed**, found only because the suite
  drives a real browser rather than a simulated one. `targetEl` narrows with
  `instanceof HTMLElement`, `SVGElement` does not inherit from `HTMLElement`,
  and this app's buttons contain inline SVG icons, so a click landing on an icon
  was silently dropped. `targetAnyEl` floors at `Element` and is what every
  delegated handler uses now.

**The open list used to say the tests drive four globals. It is seventeen
app-owned names, plus `DATA`**, which `build.mjs` declares in the page shell
rather than in the app. That item is gone from the list now, so the correction
lives here. The seventeen come through minification intact because esbuild does
not mangle top-level names in a non-module script, which is a property of the
output format rather than a setting anyone picked. It is also why the guard test
is worth more than the pinned export list the old note proposed as the
alternative: a list has to be kept in step with the file, and the test simply
asks the built page. And it is why **`src/app.ts` must never gain an `import` or
an `export`**, since either one switches esbuild to module output and takes all
seventeen out of the global scope at once. The README says this at length.

**Deliberately not done**, so nobody wonders whether it was forgotten:
`styles.css` is not minified, `app.ts` is not split into modules, and
`build.mjs`, `tools/*.mjs` and `test/smoke.mjs` are not type-checked. The module
split is the one that would actively do harm, for the reason just given.
(The stylesheet **is** minified as of the eleventh session, through the same
esbuild step. The rest of this paragraph still holds.)

Three minor things were left as they are:

- **`GROUPS`'s `icon` is still `string | undefined`.** The clean fix was
  narrowing the ambient `declare const I`, the icon blob `build.mjs` injects,
  and that was outside this session's scope.
- **`val()` is now called at module-evaluation time in two places**, so a typo in
  a literal nutrient id there blanks the page rather than showing a wrong count.
  That is the loud-over-silent trade this project wants, but the blast radius
  moved and it is worth knowing before making the next edit near them.
- **`npm install` prints an `allow-scripts` warning** for esbuild's postinstall
  script. It does not block anything, including a clean `npm ci`.

**`src/app.ts` type-checks clean under `strict`, with `noUncheckedIndexedAccess`
and `exactOptionalPropertyTypes` on.** The last 86 errors were each a question
about what a missing value meant, and two of them turned out to be bugs that
have been on the page for months. Both are the same mistake, and it is the one
mistake this project is built to refuse: **a missing figure substituted with a
zero.**

- **The chart printed `0` for a food USDA never assayed.** `renderChart` read
  `val(f, n.id) ?? 0`, so a bar rendered "0 mg" beside foods with a measured
  zero, while the aria-label on the very same row said "n/a". Not reachable on
  the unfiltered chart, which draws 25 rows and has no column measured for
  fewer than 25 foods; it took narrowing, and six of the eight categories are
  smaller than 25. One category click did it: Nuts, plant compounds, flavonols,
  where almonds have a figure and the other eleven nuts do not. It now says
  `n/a` with no bar, and the label and the aria-label agree.
- **The detail panel's Overview printed `0.00 g` saturated fat for the three
  foods that have no figure for it** (Shiitake mushrooms, Teff, Dates), from
  `(g(id) ?? 0).toFixed(n.dp)`, while the same food's cell in the table said
  `n/a` and the group tabs beside it said "not measured". It now says "not
  measured" too.

Both now have a regression test, named for the rule rather than for the fix:
"the chart withholds a figure USDA never measured" and "a macronutrient with no
figure says so rather than reading zero". Each was watched failing against the
old code, with the substituted zero in the failure message.

The two `?? 0`s that were *not* bugs were removed anyway, because each was one
edit away from becoming one: the day's amino acid sum now carries a null
through rather than counting it as nothing, and `proteinQuality` checks each
acid as it sums rather than in a pass of its own, so there is no longer a point
in that function where a missing figure could reach the arithmetic.

Seven lookup helpers now carry the rule that used to be spread across thirty
call sites. Five of them throw on an id or index the dataset does not have, the
same as `val()` does, because that is a coding error rather than an unmeasured
figure: `nut`, `foodAt`, `slugAt`, `groupOf` and `totalOf`. The other two,
`nutOpt` and `foodBySlug`, return undefined, for the callers where a miss is
genuinely possible.

## Earlier session, 2026-08-06 (fourth)

**A per-100-kcal basis shipped**, alongside per 100 g rather than replacing it.
Designed in full at `docs/superpowers/specs/2026-08-06-per-calorie-basis-design.md`
and written up durably in `README.md` under "Per 100 g and per 100 kcal".
100 tests, all passing.

The three things most likely to be re-litigated:

- **It is a toggle because neither basis is the truer one.** Per 100 g rewards
  dryness; per 100 kcal rewards water. Watercress leads calcium and protein per
  calorie only because 100 kcal of it is 909 g, which is why every row carries
  the grams figure, pinned beside the name where the sidebar cannot switch it
  off.
- **`val()` is the stored per-100-g figure and the basis lives in `shown()`.**
  `dayTotals()`, `proteinQuality()` and `omegaRatio()` all read `val()`, and the
  rescale applied there leaves all three rendering and wrong. There is a test
  that flips the basis and asserts every derived figure is unchanged; it was
  watched failing against exactly that mistake, which moved a day's protein from
  24.6 g to 37.5 g and its amino acid score from 119 to 115.
- **The two controls stay orthogonal** rather than becoming one three-way
  switch, because % DV *per 100 kcal* is the useful combination: it scales by 20
  over a 2000 kcal day, so 5% is adequate for anything.

Found while building, neither in the spec: the detail panel's body read `val()`
while its header had started claiming per 100 kcal, caught only after the first
test proved too weak by asserting the header text rather than a figure; and a
local `shown` Set in two functions shadowed the new `shown()` helper, harmless
that day and a trap later, now `shownNotes` in both.

**CSV headings now name the basis on every column**, including per-100-g
exports: `"Protein (g per 100 g)"` where it used to be `"Protein (g)"`. An
existing test caught the change, which is how it got decided rather than
noticed. A file outlives the toggle that produced it.

**Styling.** Two warm surfaces, `--raise-warm` for buttons, the nutrient note
and the pinned food column, and `--raise-warm-deep` for the segmented control's
groove and a hovered button. Buttons joined the shared panel-shadow rule, which
had documented them as deliberately excluded; the comment was rewritten rather
than left arguing with the code. And **no colour may be written into a rule any
more**, because a test walks every rule in the built page and fails on a literal
outside `:root` and `[data-theme=dark]`. It caught five: white on the two green
fills, the food swatch's hairline and highlight, and the dialog backdrop.

## Earlier session, 2026-08-06 (third)

**Wheatgerm added**, by the documented route: an entry in
`tools/food-additions.json`, then `node tools/usda.mjs add`. 131 foods, 90 tests,
all passing.

SR Legacy has two candidate rows and the choice between them is the whole of
this change, so it is written down rather than left to be found again:

- **`173896` "Cereals ready-to-eat, wheat germ, toasted, plain"** is what it maps
  to. It fills all 63 SR Legacy columns, which only tomatoes has managed before,
  including **vitamin E at 15.99 mg** and a full 18-amino-acid profile.
- **`168892` "Wheat germ, crude"** is the raw row, and it fills 53. The gaps are
  vitamin E, vitamin K, choline, sugars and all five carotenoids. Leaving the
  table's richest vitamin E food showing "no data" in the vitamin E column is a
  worse falsehood than the toasted state is, and the state is stated.
- **The breakfast-cereal category is not fortification.** That was the thing to
  check, given the yeast extract row. USDA records "Vitamin E, added 0",
  "Vitamin B-12, added 0" and "Folic acid 0" for `173896`, so every figure in it
  is native to the food. No fortification note was needed.

Named **Wheatgerm** with "Wheat germ" as the alternative name, on the same
footing as Adzuki/Aduki and Pak choi/Bok choy: search is a plain substring match
over name, alt, state and category, so without the alt the two-word spelling
finds nothing. Omega-3 and omega-6 both came from the undifferentiated ids and
carry the "†" marker per cell. No flavonoid row, so those three columns stay
empty; coverage is unchanged at 25, 36 and 39.

## Earlier session, 2026-08-06 (second)

**"My day" shipped.** A sidebar destination beside Foods and Favourites: list foods with
quantities in grams, and every nutrient is totalled in its own units and as a
percentage of a daily value. The design is written up in full at
`docs/superpowers/specs/2026-08-06-my-day-design.md` and the durable parts are
in `README.md` under "My day". 90 tests, all passing.

The three decisions most likely to be re-litigated:

- **`dayTotals()` returns coverage, not a number.** Every consumer has to decide
  what to do about a sum over foods some of which were never assayed, and none
  may ignore it. Partial totals show the count they cover, stay out of "Short
  on", and withhold the amino acid score and the omega ratio. This is the
  flavonoid rule applied to a view that would otherwise break it in all 66
  columns rather than one.
- **`A_BUDGET`** keeps energy, carbohydrate, total fat, saturated fat and sodium
  out of "Short on" entirely. The first run of the feature cheerfully reported
  "Short on saturated fat 4%", which is the opposite of advice.
- **Amino acid targets are derived from `FAO_PATTERN` x 0.66 g/kg**, not typed
  out. The two FAO tables are the same table, so this cannot drift. It needs a
  body weight: 70 kg by default, one input, used for nothing else, and
  enterable in stones and pounds. `S.kg` stays the only stored figure; see the
  rounding note in `README.md` for why it keeps a decimal place.

**Pagination is gone.** The table lists every food in one scrolling box.
Removing it exposed two latent bugs, both fixed and both worth knowing about:

- **Tests that waited on `.some(name)` after a search were racing.** With every
  food rendered, a search term is present the moment it is typed, so the wait
  returned before the 160 ms debounce and the assertion read the previous food's
  row. `selectFood()` had documented this trap already. Wait on the row content
  *and* the count, as `only()` in the tests now does.
- **The sticky group label jumped a pixel** when it stuck, because its offset
  summed the food column and 12px of padding but not the group cell's own 1px
  left border. Invisible before only because the widest name on page one gave a
  near-integer column width.

**Two foods added**, both by the documented route: an entry in
`tools/food-additions.json` naming one reviewed SR Legacy row, then
`node tools/usda.mjs add`.

- **Borlotti beans (Cranberry beans)**, cooked, from `173736` "Beans, cranberry
  (roman), mature seeds, cooked, boiled, without salt". 51 of 66 columns, a full
  18-amino-acid profile, and no flavonoid row, so those three stay empty. It has
  no 16:1 figure in SR Legacy, so it joins the list of foods with no omega-7.
- **Tomatoes**, raw, from `170457` "Tomatoes, red, ripe, raw, year round
  average", the generic row, chosen the same way the single Onions row was.
  All 66 columns filled, which no other food manages, including lycopene at
  2573 ug and all three flavonoid subclasses fully measured. It is the only one
  of the two that needed `flavonoids.mjs pull` afterwards.

**Two foods were asked for that were already here.** *Haricot beans* were in as
*Navy beans* (`173746`) and *Pine nuts* were already in from `170591`, the same
row anyone would pick. Neither was added again; a second row for one USDA food
is a data error, not a duplicate name.

**Navy beans are now Haricot beans, with "Navy beans" as the alternative name**,
which fits a table that already says Courgette, Aubergine, Swede and Rocket. The
rename touched three places, and the build caught the third: the entry in
`food-additions.json`, the food in `nutrients.json`, and the `undifferentiated`
note keyed on `navy-beans-cooked`. `RENAMED` in `app.js` carries saved
favourites and day entries over from the old key, so the rename costs nobody
their shortlist.

**Copy: the page no longer claims to be complete, or honest.** The headline is
"Explore the nutrition of plant-based wholefoods", the title and tagline follow
it, and the About column headed "Comprehensive" is now "What is covered". The
claim was the one thing the rest of the copy spent its time walking back: iodine
has no column, the flavonoid columns are blank more often than not, and twenty-odd
foods have no amino acid analysis. A test guards the headline and forbids the
claim, while leaving "complete protein" and "a complete total" alone, which are
the same word doing real work.

**And no longer calls itself honest.** "Honest about limits" is now
"Note about limits", and two uses in body prose are gone. It is a tic rather
than a fact, and there is a test guarding against it coming back a heading at a
time.

**The sidebar counts now share one right edge.** `.count` and `.dot` both
carried `margin-left:auto`, and flexbox splits free space between every auto
margin in a row, so each number floated at a position set by the length of the
label beside it. Only the count keeps the auto margin now. Two things fell out
of fixing it: the nav icons were flex items with no intrinsic minimum and were
being shrunk to zero width on the longest label rather than the label giving
way, and a pressed row turns bold, which widened its count by 2px until the
count was pinned to normal weight. "Macronutrients" is a single unbreakable word
that can neither wrap nor shrink, so the sidebar went from 248px to 276px to fit
it; below that it overflows and drags its count out of line.

Also in this session:

- **`[hidden]{display:none!important}`** is now in the stylesheet, because
  several things the script hides carry a `display` from a class rule that
  outranks the user-agent `[hidden]`.
- **One panel shadow, `--box-shadow`**, listed against every panel in a single
  rule. Only its colour is themed, since a light shadow on the dark theme is a
  halo. `.dayadd` and `.search` are bare wrappers around a rounded input and had
  no radius of their own, so the shadow squared off at their corners; both now
  carry the radius and the input inherits it.
- **`--g-macro` through `--g-plant`** give each nutrient group one colour, used
  by the table's group label and by the heading on its totals card. Five of the
  six had been fixed hex with no dark variant, which is now fixed for both.

## Earlier session, 2026-08-06

A review pass, and then the work it turned up. All of it is in `README.md` in
full; the short version:

- **Omega-3 and omega-6 were two thirds empty and did not need to be.** ALA was
  missing for 82 of 128 foods and LA for 84, because `usda.mjs` read only the
  differentiated isomer ids. SR Legacy publishes the undifferentiated 18:3 and
  18:2 for nearly every row. Now 5 and 4 missing, with the approximated cells
  marked "†" per cell. See "the undifferentiated fallback" in the README.
- **`pull --fill-gaps`** is new, and the pull no longer deletes values it did not
  write. Both came out of the same discovery: a blanket re-pull would have
  overwritten good figures and then withheld them as contradictions.
- **Six pre-existing ALA-plus-LA disagreements** are now reported by the tool and
  recorded in the README. They are the reason `pufa` is checked by the pull but
  not by the build.
- **Three saturated fat columns**, lauric, palmitic and stearic. 66 nutrients now.
- **The phytosterol reasoning was wrong** and has been replaced, see below.
- **Prose**: EPA and DHA, the gamma-tocopherol caveat on vitamin E, the
  saturated fats, and kilojoules alongside kilocalories in the detail panel.
- **Repo**: `LICENSE` (MIT, with the USDA data situation explained in the
  README), a CI workflow that runs the tests and then checks `index.html`
  matches `src/`, and a `.gitignore` comment that pointed at a tool deleted long
  ago.
- **Two small fixes**: the dead compare-count badge is gone, and the detail panel
  no longer describes a food the current filters have hidden.

**The flavonoid work that this note used to scope is done and shipped.** What it
found, including the parts that argue against going further, is in the README
under "The flavonoid columns, and why they come from a second tool". Start from
the open list at the bottom instead.

## Current state

Repo: `/home/thom/development/plant_based_info`. Everything is committed and
nothing is pushed: `main` is ahead of `origin/main`, and the twelfth and
thirteenth sessions' work sits on **`evidence-columns`**. That branch adds
`tools/evidence/`, a spec, a plan, and phase 1 of the evidence columns. The
GitHub remote (`darkixion/plant_based_info`) is public, so pushing stays the
owner's call.

- **131 foods x 73 nutrients**, sourced from USDA SR Legacy plus the USDA
  flavonoid release for three of the plant compound columns, plus three
  evidence columns from Japan's MEXT, the UK's CoFID and Australia's AFCD.
- `npm test` type-checks `src/app.ts`, compiles it, builds the page, then runs
  20 tool tests and 148 browser tests against the result. All passing, and CI
  runs the same, along with a check that `dist/app.js` matches `src/app.ts` and
  `index.html` matches `src/`.
- `npm run build` turns `src/` plus the compiled `dist/app.js` into a single
  self-contained `index.html`. **Edit `src/`, never `index.html` and never
  `dist/app.js`.** Both are generated, and both are committed on purpose.
- **The project is entirely within this directory.** Copies of the built page
  once lived in `~/Downloads`; they are abandoned and out of scope. `index.html`
  in the repo is the only build that matters, and nothing needs syncing to
  anywhere outside the checkout.

## What changed

1. **Plant compounds**, a sixth nutrient group: beta-carotene, alpha-carotene,
   beta-cryptoxanthin, lutein and zeaxanthin, and lycopene. 385 of 455 values
   filled. Phytosterols were deliberately left out and still are; the flavonoids
   were too at the time, and have since been added (see below).
2. **Food categories** moved from the toolbar dropdown into the sidebar, as a
   list with counts. The dropdown is gone.
3. **Search** moved from the hero into the top of the sidebar, so all three ways
   of narrowing the table now sit together.
4. **Kohlrabi** added (USDA 168425, cooked). Romanesco, freekeh, celeriac and
   fennel were not, each with a recorded reason.
5. **The one-pixel bleed is fixed.** The second header row's sticky offset is
   measured from the rendered first row instead of hardcoded at 38px, and
   floored so any leftover fraction is an overlap rather than a gap.
6. **Export CSV** appears once, in the toolbar above the table.
7. **The "Build your own comparison" box** is gone, taking the duplicate CSV
   button and the duplicate favourites toggle with it.
8. **Fortification is marked per cell**, with a key beneath the table and in the
   detail panel. The Methodology dialog now also says that seaweed B12 is
   inactive corrinoid analogues rather than a usable source.
9. **Every nutrient explains itself.** 60 sentences in `nutrients.json`, shown as
   the header tooltip, the header's accessible description, and a note above the
   table driven by hover, keyboard focus or the sorted column.

Also fixed along the way: switching off the last nutrient group falls back to
macronutrients, but the sidebar button for it was left reading "off" while its
nine columns stayed in the table. Every button now syncs from the state.

Since then, in later sessions: **group labels in the table header stick** within
their own group while it scrolls; the food list grew from 91 to **130** across
several batches; and two more pieces of prose that were drifting behind the data
now derive from it, the amino acid gap list and the fortified food list.

## The flavonoids, now shipped

Three columns joined the plant compounds group: **anthocyanidins**,
**flavan-3-ols** and **flavonols**, from the USDA Database for the Flavonoid
Content of Selected Foods, Release 3.3. `tools/flavonoids.mjs` does the
extraction, the join and the pull, and `README.md` explains every decision in
it. The parts most likely to be re-litigated:

- **52 of 131 foods have a flavonoid row at all**, and after the completeness
  rule below the columns fill 25, 36 and 39 of 131. Sparse, and accepted as
  such, because the alternative was worse.
- **A subclass is shown only where the whole subclass was measured.** USDA
  published individual compounds, not totals, so each column is a sum, and
  summing whatever is present yields a partial total indistinguishable from a
  complete one. USDA measured quercetin alone for asparagus; the resulting
  15.2 mg would have sat next to kale's 93 looking like the same kind of
  number. Cocoa powder loses the largest flavan-3-ol figure in the source, 261
  mg, on two of five catechins. That cost is deliberate and `flavonoids.mjs
  coverage` prints it every run.
- **The expanded release was downloaded, measured and rejected.** Release 1.1
  reaches 101 of these foods, but split by its own derivation codes the
  analytical counts are 26 and 47, slightly *worse* than 3.3. The extra fifty
  are imputations and assumed zeros. It does not need checking again.
- **No total flavonoid column and no antioxidant score**, for reasons now
  stated on the page rather than only here. A total sums a different set of
  subclasses per food, and USDA withdrew its own ORAC database in 2012.
- **Aubergine and grapes are absent and should stay absent.** USDA's raw
  aubergine row carries 85.7 mg of anthocyanidins and its cooked row 0.1, and
  our row is cooked. Grapes exist in the flavonoid database only under codes
  internal to it that never join to SR Legacy, disagreeing wildly by variety.
  Both are exactly the near-miss the exact join is there to refuse.
- **Isoflavones were looked at and dropped.** The analytical values cover the
  soy foods so patchily that miso would be the only soy row with a figure,
  which is worse than no column.

The `.accdb` reader is a developer dependency of `flavonoids.mjs` alone. It
tries `mdbtools` then `uv run --with access-parser`. `build.mjs` still has no
dependencies and must keep none.

## Open, in rough order of value

- **Proanthocyanidins**, and the groundwork is now done. SR Legacy *defines*
  seven ids, 1350 to 1356, and carries a value for none of these 131 foods, so
  no pull can reach them. The separate *Database for the Proanthocyanidin
  Content of Selected Foods, Release 2 (2015)* does still exist, 283 foods in an
  `.accdb` of the shape `flavonoids.mjs` already reads. Download it, join it,
  and let the coverage number decide, the way Release 1.1 was measured and
  rejected. This is the next spec.
- **Move the `pufa` check into `build.mjs`.** The pull checks it and the build
  does not, and the reason recorded in `README.md` was that adding it would fail
  on six long-standing rows. The fat re-pull resolved all six, so the objection
  is gone and the check would now pass. Small, and it closes the gap where a
  hand edit could reintroduce what the re-pull just fixed.
- **Nothing exercises `usda.mjs add` in `npm test`.** Both new columns broke it
  by omitting `COLUMN_TO_USDA`, and both times it was found by hand rather than
  by the suite. An `add --dry-run` in `test/tools.mjs` would have caught each
  immediately, and `test/tools.mjs` now exists to put it in.
- **Estimated rows.** Romanesco and freekeh could be approximated from
  cauliflower and durum wheat, but only behind a visible "estimated" marker.
  The table carries no provenance concept yet; the per-cell `notes` mechanism
  added for fortification is the natural place to build one.
- **The sidebar now scrolls** on a short viewport, which puts "How to use" and
  "Methodology" below the fold. Both are reachable from the top bar, so this is
  a nuisance rather than a fault.
- **`slugify` is now written in five places**: `app.ts`, `build.mjs`, and the
  three tools (`portions.mjs`, `usda.mjs`, `flavonoids.mjs`). The three tools
  could share one the way `tools/csv.mjs` is shared; `app.ts` and `build.mjs`
  cannot, since neither may gain an import.
- **A layout verification that names one viewport width will pass while a
  narrower common one breaks.** That is what happened here: the day row
  overflowed at 320 px, the narrowest common phone viewport, while a check
  written against 380 px would have shown clean. Verify the narrowest width
  that matters, not just the one a spec happens to name.
- **Search is unreachable on a phone while the menu is closed.** It lives in the
  sidebar, so the menu has to be opened to find a food by name. Moving it out to
  sit above the table would fix it and would change the desktop layout, which is
  why it was left; see "Narrow screens" in `README.md`.
- **Dialogs are opened by script where HTML now has an attribute for it, and
  the support floor is the reason it was not switched.** Every `data-dlg` button
  goes through the delegated click handler into `openDialog()`, which calls
  `showModal()`. Invoker commands would do it natively:
  `<button command="show-modal" commandfor="dlg">`, with `command="close"` on
  the close button, and native focus return replacing the hand-rolled
  `lastFocus`. That is a genuine simplification of four or five lines.

  Two things argue against doing it yet, and both were checked rather than
  assumed:

  1. **It is Baseline 2025**: Chrome and Edge 135, Firefox 144, Safari and iOS
     Safari 26.2. iOS Safari is the one that matters here. On anything older,
     every dialog silently stops opening, and that takes How to use,
     Methodology, Absorption and About with it. Those four are where this page
     explains what its numbers do and do not mean, so failing quietly is worse
     than the four lines are worth.
  2. **`openDialog()` does two jobs**, opening the dialog and filling `#dlgT`
     and `#dlgB` from `DLG`. The attribute replaces only the first. The bodies
     cannot be pre-rendered into the HTML instead, because several are computed
     from the data on purpose: `bioDialog()`, the amino acid gap list, the
     fortified food list and the flavonoid coverage count. So the JS does not
     go away, it moves into a `command` event listener on the dialog reading
     `e.source`.

  Worth revisiting once iOS Safari 26 is unremarkable. Supporting both paths at
  once is the option to refuse: it is more code than the one it replaces.
- **The table's header rows do not stick vertically**, so on a phone, where a
  screenful is eleven rows, everything below the first screen is unlabelled.
  Tried twice in the tenth session and shipped neither: see that note for the
  measurements and for why a `max-height` and a width-matched copy were both
  rejected. The copy is the more promising of the two if it is picked up again.
  Do not start by trying `overflow-y:visible`; it computes to `auto`.
- **What SR Legacy holds for these foods that has no column here**, swept
  systematically rather than guessed at. Every nutrient id with at least 15 rows
  for the 128 mapped foods, minus everything `COLUMN_TO_USDA` already consumes.
  The list is short and the conclusion is that little is missing:

  - **Defined by SR Legacy and published for none of these foods**, so they need
    an outside source the way the flavonoids did: **inulin (1403) and every
    other fibre fraction** (soluble 1082, insoluble 1084, beta-glucan, resistant
    starch, oligosaccharides, pectin, raffinose, stachyose) at **0 rows each**;
    **iodine (1100)** at 0; and proanthocyanidins, already on this list. That is
    a pattern worth naming: SR Legacy defines a great many ids it never
    populates for whole plant foods, so "the id exists" says nothing about
    whether a pull can reach it.
  - **Populated and genuinely unrepresented: betaine, 57 of 57 non-zero, max
    102.6 mg.** The only real candidate the sweep turned up. It belongs beside
    choline, since betaine spares choline in methylation and choline is already
    the thinnest micronutrient here at 35% of a day from one unusual food.
  - **Populated but already deliberately excluded**: beta and delta tocopherol,
    the four tocotrienols, and the phytosterol fractions (campesterol,
    beta-sitosterol, stigmasterol). All are recorded decisions, not oversights.
  - **Populated but trivial or single-food**: the sugar fractions where a total
    already exists, minor saturated and monounsaturated chain lengths, fluoride
    at 26 foods, and caffeine and theobromine at one food each. Cocoa powder's
    theobromine is 2057 mg, which is striking and still one food.

  So: **inulin needs an external source, betaine is the one column worth
  considering, and nothing else is missing.**
- **Iodine: the data exists, and the finding is worth more than the column.**
  The **USDA, FDA and ODS-NIH Database for the Iodine Content of Common Foods**,
  release 4.0 of November 2024, covers 478 foods per 100 g, and it carries **NDB
  numbers**, which is the same join key `flavonoids.mjs` already uses to reach
  SR Legacy. So the mechanism is proven and the tool would be a third copy of
  one that exists.

  What stops it being an obvious yes is the values. Release 1's plant sections
  were read directly, and **every plant wholefood in it sits between 0.0 and 6.0
  mcg per 100 g against a 150 mcg daily requirement.** Spinach raw is the
  highest at 6.0, which is 4% of a day. Legumes run 0.0 to 1.2, the three nuts
  and seeds 0.3 to 1.0, cooked grains 0.1 to 1.1. **Nori is 2320.**

  So the column would be 130 near-zeros and one enormous outlier. That is not an
  argument against it: it is exactly what the page already asserts in prose
  under "Iodine is not in this data", and this project's own convention is that
  prose describing the data should derive from the data. A column would turn a
  claim into a measurement. Two things to weigh first:

  - **Iodine in plants tracks soil and irrigation**, so these are US figures and
    a UK reader's spinach is a different number. The variation is larger than
    the values.
  - **Seaweed is the same trap as its B12.** Species vary by orders of
    magnitude, and the page already warns that seaweed B12 is inactive
    analogues. A 2320 in a column invites exactly the reading the methodology
    dialog spends a paragraph refusing.

  The UK alternative, **McCance and Widdowson's CoFID**, is downloadable as a
  spreadsheet from gov.uk and carries iodine, but it joins by UK food codes
  rather than FDC ids, so matching it to these rows means matching on names.
  That is the thing this project refuses outright, on the strength of an early
  automated match pairing Black beans with "Black pudding, boiled".
- **Phytate and oxalate have no equivalent USDA release**, which is the gap that
  keeps the bioavailability notes hand-curated. Worth a search of its own if the
  oxalate exception list ever needs to stop being a list of exceptions.
- **The interaction set is short, and the gaps are known ones.** Copper against
  zinc, oxalate against iron, and cooking against lycopene were all considered
  and left out because their sources were not checked. Each is a plausible
  addition; each needs a citation verified first, and `build.mjs` will refuse it
  without one.
- **Nine `why` sentences still carry bioavailability facts of their own**, and
  now say some of what `interactions.json` says. Iron's names vitamin C and tea,
  zinc's names phytate, calcium's names oxalate. That is the drift risk the
  interaction records were shaped to avoid, so it is worth deciding whether the
  sentences should be trimmed now the dialog exists.

## Conventions worth preserving

- **No invented data.** Where USDA has no figure the table shows `n/a` and the
  detail panel says "not measured". Protein quality is withheld entirely rather
  than scoring absent amino acids as zeros. Kohlrabi has no tyrosine figure, so
  it gets no amino acid score, which is correct rather than a gap to fill. The
  flavonoid columns extend this to partial measurements: an incomplete sum is
  withheld rather than shown looking like a complete one.
- **A strict-null error is never resolved by substituting a value.** No `|| 0`
  and no `?? 0` on a nutrition figure. It compiles, it passes the tests, and it
  puts an invented number in front of a reader, which is the rule above broken
  by the tool meant to enforce it. That is exactly how both bugs this session
  found got there. Withhold the figure, propagate the null, or guard the call
  site.
- **Prose that describes the data derives from the data.** The amino acid gap
  list, the fortified food list and the flavonoid coverage count are all
  computed in `app.ts` and asserted in the tests, because each of them had or
  would have drifted silently behind the table.
- **`tools/usda.mjs pull` refuses to write a value that contradicts a total
  already in the table**, and `build.mjs` enforces the same constraint.
- **Food mappings are reviewed by a human and committed.** An early automated
  match paired Black beans with "Black pudding, boiled". `pull` will not run
  while any entry in `usda-map.json` has `"reviewed": false`.
- **Check that an FDC id resolves to the food you think it does**, by
  description and not by the page you arrived from. `169989` was offered as a
  celeriac row with a full profile; it is "Celery, cooked, boiled, drained,
  without salt". Celeriac is `169987` cooked and `170400` raw, and neither has
  any amino acid analysis. Confirmed against USDA's live API, not just the
  cached copy. Adjacent foods with adjacent ids are exactly where this bites.
- **Favourites and the day list are keyed by food name, not row index**, so the
  food list can be reordered or extended safely. Renaming a food orphans both.
- **One control per piece of state.** The segment above the table chooses
  between Table and Chart; the sidebar chooses between the food table and My
  day, and holds the filters.
- **A total is not allowed to look more complete than it is.** Same rule as the
  flavonoid columns, now enforced across every figure in the day view.
- **No em dashes** anywhere in copy, comments or docs. Rewrite the sentence
  rather than swapping the punctuation.
