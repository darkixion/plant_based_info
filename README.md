# plant_based_info

A single-page nutrient reference for whole plant foods: amino acids, vitamins,
minerals, omega oils, carotenoids, flavonoids and macronutrients, per 100 g or
per 100 kcal, sortable and filterable.

The deliverable is **one self-contained `index.html`**: no server, no build step
at view time, no network calls. Open it from disk, email it, or serve it from
GitHub Pages.

## Working on it

```bash
npm run build     # src/ -> index.html
npm run watch     # rebuild on save
npm test          # build, then drive the real page in a real browser
npm run serve     # build and serve on :8080
```

`index.html` is generated. **Edit `src/`, never `index.html`**. Your changes
there are overwritten by the next build. It is committed anyway so the page can
be served straight from the repo.

That last part is a trap worth naming: a commit where `index.html` disagrees
with `src/` ships a stale page, and nobody reviews a 180 kB generated diff
closely enough to catch it. `.github/workflows/ci.yml` runs the tests and then
rebuilds and fails if the result differs from what was committed, so run
`npm run build` before committing source changes.

## Layout

```
src/
  index.html          page shell; {{STYLES}} {{DATA}} {{ICONS}} {{APP}} are filled by the build
  styles.css          all styling, light and dark
  app.js              all behaviour
  data/nutrients.json the dataset: nutrient definitions + one value array per food
  data/icons.json     inline SVG icons
  data/usda-map.json  the reviewed USDA row behind each of the original foods
build.mjs             inlines the above into index.html, and validates the data
test/smoke.mjs        browser tests for rendering and persistence
tools/usda.mjs        pulls nutrient columns and adds foods from the USDA dataset
tools/flavonoids.mjs  the three flavonoid columns, from a second USDA release
tools/food-additions.json  foods to add, and what was looked for and not found
docs/superpowers/specs/    design notes, written before the feature was built
.github/workflows/    CI: tests, then checks index.html matches src/
```

`tools/` and `docs/` are developer-side and reach nothing the page loads. The
two tools carry dependencies of their own; `build.mjs` deliberately has none.

### The data shape

`nutrients.json` holds a nutrient list and, for each food, a `v` array of values
**positionally matched to that list**. It is compact, but it means a value array
of the wrong length silently misaligns every column after the gap, which looks
like plausible numbers rather than an error. The build refuses to produce output
if lengths disagree, if a nutrient id is duplicated, or if two foods would
generate the same storage key.

Every nutrient also carries a `why`: one or two sentences on what it does in the
body, shown as the column header's tooltip, as the header's accessible
description, and in the note above the table on hover, focus or sort. The build
requires one per nutrient, so a new column cannot ship without an explanation.

The third top-level key is `notes`, for figures that need a caveat attached to
the individual cell rather than the whole food. Each note names a marker, a
short label, the explanation, and the food-and-nutrient pairs it applies to.
Only one exists so far, covering the values that come from fortification rather
than from the food: nutritional yeast's B vitamins and soy milk's B12, calcium
and vitamin D. Soy milk's protein is still soy milk's protein, which is why this
is keyed per cell. The build checks every food key and nutrient id a note names,
since a typo in either would simply stop matching and the note would vanish with
nothing to say it had gone.

## Notes for future changes

**Favourites and day entries are stored by food key, not row index.** Keys come
from the food's name and state, so reordering or extending the list is safe. The
build fails if two foods collide on a key.

Renaming one changes its key, and anything stored under the old name is dropped
on load with nothing to say it had gone. `RENAMED` in `app.js` maps old key to
new so those are carried across instead: one line per rename, which is cheaper
than never renaming a food. Navy beans to Haricot beans is the entry there now.
A rename also has to be made in three places, and the build will tell you if you
miss the third: `tools/food-additions.json`, the food in `nutrients.json`, and
any per-cell `notes` keyed on the old slug.

**Everything user-facing persists to `localStorage`** under `vegan-nutrients:v1`,
guarded so blocked storage degrades to a working page rather than an error. Bump
the key if the stored shape changes incompatibly.

**One control per piece of state.** Nutrient groups, food categories, search and
favourites are all toggled in the sidebar, and Export CSV sits once above the
table. Each of those started out duplicated: a second row of group pills, a
category dropdown in the toolbar, a search box in the hero, and a "Build your
own comparison" box holding a second Export CSV and a second favourites toggle.
Two controls for one piece of state is two places to look and two things to keep
in sync.

The sidebar's "Compare foods" button was the last of them, writing the same
`S.view` as the Chart segment in the toolbar. It is gone, and the segment is the
only thing that chooses between **Table** and **Chart**.

**My day is in the sidebar, not in that segment.** Table and Chart are two
renderings of the same food list; My day is not one of those, it is somewhere
else to be. So it sits with Foods and Favourites, and while you are there the
segment goes away along with everything else in the toolbar that only describes
the table. Pressing it again returns to the table, as does Foods, so it is not a
view you can switch on but not off.

**The table has no pagination.** It lists every food in one scrolling box.
Twenty rows a page meant sorting by a column and then paging to find where your
food had gone, for a job the scrollbar already did.

**Panels share one shadow.** `--box-shadow` in `:root` is the only place it is
defined, and one rule near the foot of `styles.css` lists every selector that
draws it. Adding a panel means adding it to that selector, not writing another
shadow beside it. Only the *colour* is themed, as `--box-shadow-colour`, because
a light shadow on the dark theme is a halo rather than a shadow; custom
properties resolve where they are used, so the dark override reaches the one
declaration without it being written twice. Buttons are in that list by choice,
being the one thing on the page that should look liftable; segments, table cells
and the sidebar nav are still out, being controls rather than panels.

**No colour is written into a rule, only into a variable.** `:root` and
`[data-theme=dark]` are the two blocks that hold colours, and everything else
refers to them. A hex buried two hundred lines down is the thing that cannot be
themed: it looks right in the theme it was written in and wrong in the other,
which is how five of the `--g-*` colours ended up unreadable on black. A test
walks every rule in the built page and fails on a colour literal outside those
two blocks, so this cannot drift back. It caught five when it was written: white
on the two green fills, the food swatch's hairline and its highlight, and the
dialog backdrop, now `--on-green`, `--sw-edge`, `--sw-gloss` and `--backdrop`.

**Two warm surfaces.** `--raise-warm` carries the buttons, the nutrient note and
the pinned food column; `--raise-warm-deep` is one step further back, used by the
segmented control's groove and by a button under the cursor. Both are themed.

**A nutrient group has one colour, defined once.** `--g-macro` through
`--g-plant` in `styles.css` are drawn by the group label in the table header and
by the heading on the matching totals card in My day, both keyed off the same
`data-g` attribute, so a group reads as the same colour wherever it appears.
They are themed: only macronutrients ever adapted to dark mode, because it alone
had been written as a variable, and the other five sat as fixed hex at poor
contrast on a near-black panel. Adding a group means a `--g-` pair and a line in
each of the two selector blocks.

**A wrapper that carries a shadow needs the radius of what it wraps.**
`.dayadd` and `.search` are bare positioning wrappers around a rounded input,
and had no radius of their own, so a shadow drawn on them squared off at the
corners around a control that is rounded. Both now set the radius and the input
inherits it. Worth remembering for any future wrapper that gains a border,
background or shadow.

## Per 100 g and per 100 kcal

The table shows every figure on one of two bases, and the toolbar switches
between them. Per 100 g is the only fair basis for "what is in this food", but
it quietly rewards one property that has nothing to do with nutrition, which is
dryness: a food with its water removed wins every column. Ranked both ways the
top five for iron, calcium and protein are nearly disjoint lists, and per 100 g
the leafy greens look like nothing.

**It is a toggle rather than a replacement, because the per-calorie basis is
exactly as biased in the other direction.** Watercress leads calcium and protein
per calorie only because 100 kcal of it is 909 g. Neither basis is the truer
one, so the page shows both and declares neither canonical, the same way it
handles partial totals and withheld scores. **Every row carries the grams that
make 100 kcal**, pinned beside the food name rather than placed in the
macronutrient group: a column could be switched off from the sidebar, and the
figure that keeps the ranking honest would be the first thing to go.

**The basis and `% daily value` are independent controls, and the combination is
the point.** A % DV per 100 kcal figure scales by 20 over a 2000 kcal day, so 5%
is adequate for any nutrient — one number that reads the whole table without
knowing sixty-odd daily values. The meta line says so whenever both are on.

**`val()` stays the stored per-100-g figure and must.** `dayTotals()`,
`proteinQuality()` and `omegaRatio()` all read it: a day's totals are grams of
real food against real daily values, and the amino acid score and the omega
ratio are ratios, which are the same on any basis. Applying the rescale at
`val()` leaves all three rendering, looking plausible and being wrong. So the
basis lives in `shown(f, n)`, read only by the table, the detail panel, the sort
comparator and the CSV. There is a test that flips the basis and asserts every
derived figure is byte-identical; it was watched failing against exactly that
mistake, which moved a day's protein from 24.6 g to 37.5 g.

Energy is exempt from the rescale, inside `shown()` rather than at its call
sites, because energy per 100 kcal is 100 for every food. CSV headings name the
basis on every column, including per-100-g exports, since the file outlives the
toggle that produced it.

## My day

Type a food into the box at the top, give it a quantity in grams,
and all 66 nutrients are totalled across the list, in their own units and as a
percentage of a daily value. This is the only basis on which a shortfall means
anything, and the reason to have it is that neither table basis can answer "am I
getting enough": per 100 g and per 100 kcal both describe a food, and this
describes a day.

**The table rows gained no button for it.** A second icon beside the heart on
131 rows reads as an extra column of furniture, and building a day is something
people do by naming foods rather than by hunting for them in a table. The two
ways in are the search at the top of the day view, which offers favourites
first, and an "Add to my day" button in the detail panel. Favourites and the day
stay separate: a favourite is a food you care about, kept for months, and a day
is what you ate, cleared often. Merging them would mean clearing today wipes a
shortlist someone built over weeks.

**Everything reads `dayTotals()`**, which returns per nutrient not a number but
`{ total, from, of, partial, notes }`. That is the whole point. A sum over foods
where some were never assayed is a partial total indistinguishable from a
complete one, which is exactly the failure the flavonoid columns are built to
refuse, except a totals view creates it in every column rather than one.
Cysteine is missing for 19 of these foods and the flavonoid columns for 90 or
more, so a day of six foods routinely sums over three. Consequently:

- a partial total renders the count it covers, and never appears in **Short on**;
- the day's amino acid score is withheld if any listed food is missing any of
  the nine, exactly as `proteinQuality()` already withholds it per food;
- the omega-6:3 ratio is withheld unless both columns are complete;
- per-cell notes propagate, so a B12 total built from nutritional yeast still
  carries the fortification marker;
- the CSV export carries a "Foods measured" row, so the coverage travels with
  the numbers.

**Amino acids are scored in the totals list as well as in the summary**, against
the FAO/WHO requirement for the body weight rather than a daily value, since
they carry no `dv`. Both read `dayAminoAcids()`, so the two cannot disagree, and
both move when the weight changes. Methionine is scored with cysteine and
phenylalanine with tyrosine, so each of those four rows shows the pair's
percentage and names its partner; the acids the body can build for itself have
no published requirement and show a total only.

**`A_BUDGET` is the other rule that matters.** Energy, carbohydrate, total fat,
saturated fat and sodium have daily values that cap rather than target, so they
are never listed as something you are short of. "Short on saturated fat" is the
opposite of advice. They get an "Above the guideline" list of their own instead.

**The amino acid targets are derived, not a second table.** FAO/WHO 2007
publishes adult requirements as mg per kg per day, and `FAO_PATTERN` is that
same table divided by the 0.66 g/kg protein requirement it is built on.
Multiplying back recovers it exactly: lysine 45 x 0.66 = 29.7 against a
published 30, leucine 38.9 against 39, tryptophan 3.96 against 4. So the day's
targets come from the constant already in the file, and the day view and the
per-food score cannot drift apart. It needs a body weight, which is the one
input the feature asks for, defaulting to 70 kg and used for nothing else. It
can be given in kilograms or in stones and pounds.

**`S.kg` stays the one canonical weight**, because the requirements are
published per kilogram and everything derived from them reads it. Stones and
pounds are a display and entry format over it, never a second value to keep in
sync, so switching units repeatedly cannot walk the figure away from what was
entered. The catch is rounding: 11 st 4 lb is 71.67 kg, and storing that as a
whole 72 turns it back into 11 st 5 lb, so the pounds field would tick up by one
the moment it lost focus. `clampKg` therefore keeps one decimal, which is a
tenth of a pound and far too small to move a rounded pounds figure. It also
clamps out-of-range input to the nearest end rather than snapping to the
default, so typing the "5" of "55" no longer reads as 70 for a keystroke.

**Three standing notes are shown whatever the totals say**: B12, that iodine is
not in this dataset at all, and that intake is not absorption. A view listing
what you are short of implies the list is complete, and each of these is a wrong
conclusion the totals actively invite.

**The day is stored by slug and grams**, in the same `localStorage` blob as
favourites and for the same reason. An entry naming a food that has left the
dataset is dropped on load and again in `dayEntries()`, and the count on the
sidebar is taken from the entries that resolve rather than from the stored list.

**Switching off the last nutrient group falls back to macronutrients**, since a
table with no columns is not a view anyone asked for. `toggleGroup` therefore
syncs every sidebar button from the state rather than only the one clicked: the
fallback switches a group on that nobody pressed.

**Highlight lenses** are named nutrient sets that cut across groups. Built-ins
live in `BUILTIN_LENSES` in `app.js`; users can save their own. Selecting a lens
switches on whatever column groups it needs, since highlighting a hidden column
would highlight nothing.

## Data source

Values follow USDA FoodData Central. See the in-page **Methodology** dialog for
how amino acids are derived and what the figures do not account for.

A move to a European source was investigated and rejected. EuroFIR's own
FoodEXplorer is subscription-only; its best free member database, Danish
[Frida](https://frida.fooddata.dk) 6.1 (CC BY 4.0), is genuinely richer, with 231 parameters
including iodine, biotin and oxalic acid, and complete 18-amino-acid profiles
for 967 foods. The blocker was **state matching**: seven
of these foods are absent from Frida, and eight more exist only raw or dry where
this table shows them cooked. Comparing 100 g of dry quinoa with 100 g of cooked
broccoli is not a fair row, so the swap would have traded a consistent table for
a mixed one. Worth revisiting if the food list ever changes to an as-purchased
basis.

**Derived figures are computed from the table, never sourced separately.**
Amino acid score, limiting amino acid, protein per 100 kcal, the omega-6:3
ratio, every figure in **My day** and the FAO requirements those are measured
against are all calculated in `app.js` from the columns already present, so they
cannot drift out of agreement with the rows they describe.

### Pulling more nutrients from USDA

```bash
node tools/usda.mjs match                        # propose food mappings for review
node tools/usda.mjs pull 1268 1275               # add those USDA nutrients as columns
node tools/usda.mjs pull 1404 --fill-gaps        # fill only the empty cells
node tools/usda.mjs pull 1268 --dry-run
```

`match` downloads the SR Legacy bulk dataset (cached in `tools/cache/`,
gitignored) and proposes a mapping from each of our foods to a USDA row, scored
on a nutritional fingerprint and required to share a name word. `pull` reads
only the reviewed mapping and never re-decides it.

**Two files record which USDA row a food came from**, because foods arrived by
two routes. The original list was matched and reviewed into `usda-map.json`;
everything added since names its row directly in `tools/food-additions.json`.
`pull` reads both, through `sourceRows()`. It used to read only the first, which
would have left the 46 added foods empty in every newly pulled column.

Adding a nutrient means an entry in `KNOWN` (the column definition, with `after`
to place it) and in `COLUMN_TO_USDA` (so `add` can fill it for new foods). A new
*group* additionally needs a `GROUPS` entry and icon in `app.js`, a `--t-<group>`
tint pair and a `th.grp[data-g=…]` colour in `styles.css`, and a `GROUP_BLURB`
line. The first nutrient in a new group must anchor its `after` to an existing
column, since `pull` has no group to append to yet.

**Mappings are reviewed by a human and committed** to `src/data/usda-map.json`.
This is not ceremony. An early fingerprint-only run paired *Black beans* with
*Black pudding, boiled* (blood sausage) because the macros happened to line up. `pull` refuses to run while any entry has `"reviewed": false`. Three foods
are deliberately unmapped with the reason recorded: seitan, soy milk and
nutritional yeast have no suitable SR Legacy row.

**The tool will not write a value that contradicts a total already in the
table.** Six foods have existing MUFA figures that disagree with the USDA row
they map to. Edamame's own fat fractions do not sum to its total fat before
USDA is involved at all. Their omega-9 and omega-7 are left as "no data"
rather than shown exceeding the monounsaturated column above them. Re-pulling
the whole fat group from the mapped rows would resolve this, at the cost of
changing values that are currently displayed. The build enforces the same
constraint, so this cannot regress silently.

**It withholds only what it wrote.** A disagreement between two values that
were already in the table is real, but it is not the pull's to resolve, and
deleting a figure the tool did not put there loses data on the way to filling a
gap somewhere else. So a conflict involving nothing from this run is reported
and left alone. Six foods are in that state today: mung beans, edamame, lupin
beans, natto, buckwheat and wholewheat pasta each carry an ALA-plus-LA total
slightly above their own polyunsaturated figure, because the fractions and the
total came from different derivations. That is why `pufa` is checked by the pull
but deliberately *not* by the build: adding it there would fail on six rows that
have been that way all along, and the fix is a fat-group re-pull rather than
six deletions.

**`--fill-gaps` writes only where the table has no figure.** Adding a column is
a clean slate, but filling holes in a column that is already populated is not:
the values already there were derived from a per-protein profile or an earlier
source, and re-deriving them from the mapped row is a separate decision with its
own consequences. Without the flag a gap-filling pull silently becomes a
re-pull, and on these foods that made things worse. Pistachios reconcile today
at 13.454 g of ALA plus LA against a 13.46 g polyunsaturated total; the mapped
row gives 14.38, which exceeds the total, so the check would then withhold both,
losing a good figure in order to fill a gap elsewhere.

### The omega-3 and omega-6 columns, and the undifferentiated fallback

SR Legacy publishes the two essential fatty acids under two different ids and
populates them very differently. The differentiated isomer ids, 1404 for ALA and
1316 for LA, are present for about a third of the mapped rows. The
undifferentiated 18:3 (1270) and 18:2 (1269) are present for nearly all of them.
Reading only the differentiated ids left **omega-3 empty for 82 of 128 foods and
omega-6 for 84**, including pecans, macadamias, tahini, coconut, cocoa powder
and olives, while the figure sat unread in the same reviewed row. `FALLBACK` in
`usda.mjs` names the second id to try, and the columns now stand at 5 and 4
missing.

This is the convention the omega-9 column has always used: 1268 is 18:1
undifferentiated, and the Methodology dialog says so. The catch specific to 18:3
is that it bundles the omega-6 GLA in with the omega-3 ALA. Among these foods
that only matters for hemp, which already has a differentiated figure, as do
flaxseed, chia and walnuts, so every food that takes the fallback is one where
GLA is negligible.

**Values that came this way are marked per cell**, under the `undifferentiated`
note, rather than mixed in silently. A column drawn from two derivations with no
way to tell them apart is exactly the quiet inconsistency this dataset refuses
elsewhere. The tool rebuilds that note on every pull rather than appending to
it, so a re-pull that finds a differentiated figure drops the marker with it,
and the build now rejects a note pointing at a cell with no value in it.

### The saturated fat breakdown

The macronutrient group carries one saturated total. **Lauric (12:0), palmitic
(16:0) and stearic (18:0)** say what it is made of, which is the difference
between coconut and everything else: nearly all of coconut's saturated fat is
lauric, and lauric is close to absent from every other food in the table. The
three also behave differently in the body, which a single total hides. They are
a subset of the saturated figure and never the whole of it, since the shorter
and longer chains are left out, so `build.mjs` checks that they sum to no more
than it. None carries a daily value, for the same reason the carotenoids do not:
the total above them already has one.

Four foods have an existing saturated total that disagrees with the row they map
to, so their breakdown is withheld: tempeh, wholewheat pasta, kale and sweet
potato. Same rule, same reason as the MUFA six.

### The flavonoid columns, and why they come from a second tool

```bash
node tools/flavonoids.mjs extract      # .accdb -> tools/cache/flav_r33/*.csv
node tools/flavonoids.mjs coverage     # what the join reaches, writes nothing
node tools/flavonoids.mjs pull         # add the columns to nutrients.json
```

**SR Legacy cannot supply flavonoids.** It defines the nutrient ids (1348
anthocyanidins, 1347 flavonoids, 1343 isoflavones, and ids for quercetin, the
individual catechins and six proanthocyanidin chain lengths) but not one row in
`food_nutrient.csv` carries a value for any of them. The vocabulary is there and
the measurements never were. That was verified before any of this was built.

The data lives in the *USDA Database for the Flavonoid Content of Selected
Foods, Release 3.3*, hosted on the ARS Beltsville site rather than on FoodData
Central, and it ships as an MS Access `.accdb`. `extract` reads it with either
`mdbtools` or `uv run --with access-parser`, whichever is present, and writes
CSVs that every later step reads. **That reader is a one-off developer
dependency and must stay inside `flavonoids.mjs`**; `build.mjs` has no
dependencies by design.

**The join is exact and must stay that way.** Release 3.3 is keyed by NDB
number and `sr_legacy_food.csv` maps `fdc_id` to `NDB_number`, so every food
resolves through the row a human already reviewed. There is no fuzzy matching,
and the near-misses are precisely the trap: USDA's *raw* aubergine row carries
85.7 mg of anthocyanidins and its *cooked* row carries 0.1, so reaching for a
close-enough row would be wrong by a factor of 800. Grapes are missing for the
same reason. The flavonoid database holds them only under codes internal to
itself (red 48 mg, black 22, white 5.7, Concord 120) which never join to SR
Legacy, and picking one variety would be a choice dressed as a measurement.

**A subclass is only shown where the whole subclass was measured.** USDA
published individual compounds, not totals, so each column is a sum, and summing
whatever happens to be present produces a partial total that reads like a
complete one. USDA measured quercetin alone for asparagus; a 15.2 mg flavonols
figure built from it would sit in the table looking like kale's 93. So
`SUBCLASS` in the tool names the compounds a food must have, and the cost is
visible in `coverage`: cocoa powder has the largest flavan-3-ol figure in the
source at 261 mg, but only two of the five catechins were measured for it, so it
shows no data. Minor compounds outside the required list (isorhamnetin,
gallocatechin) are added to the sum when present but never required.

**Coverage is 52 of 131 foods**, and per subclass: anthocyanidins 25, flavan-3-ols
36, flavonols 39. Sparse, and deliberately preferred to the alternative. USDA's
*Expanded Flavonoid Database, Release 1.1* reaches 101 of these foods, but split
by its own derivation codes its **analytical** counts are 26 and 47, slightly
*worse* than Release 3.3. The extra fifty foods are imputations and assumed
zeros. It was downloaded, measured and rejected on that basis, so it does not
need checking again.

Because these columns have no SR Legacy id, `usda.mjs` lists them in
`FROM_OTHER_SOURCE` rather than `COLUMN_TO_USDA`. A newly added food gets "no
data" for them until `flavonoids.mjs pull` runs, which is usually the correct
answer anyway.

### What is deliberately not in the data

- **A total flavonoid column, or any single antioxidant score.** A total would
  sum a different set of subclasses for each food, so no two rows would be
  comparable. As for an antioxidant score, USDA withdrew its own ORAC database
  in 2012 because antioxidant capacity measured in a test tube predicts nothing
  useful in the body, and that withdrawal is the reason not to invent a
  replacement.
- **Phytic acid, isoflavones and proanthocyanidins.** SR Legacy has no figures at
  all for them. Isoflavones are in the expanded flavonoid release, but its
  analytical values cover the soy foods so patchily that miso would be the only
  soy row with a figure.
- **Phytosterols**, but not for the reason recorded here until now. This file and
  the handover both said SR Legacy "reaches only 8 to 14 of these foods". It
  reaches **24**, every one of them non-zero, which is exactly the coverage
  anthocyanidins has, and anthocyanidins shipped. So that argument does not hold
  and has been replaced. The real objection is *which* 24: sesame at 714 mg,
  sunflower seeds at 534 and pistachios at 214 tower over a long tail of fruit
  and vegetables at 2 to 18 mg, while almonds, walnuts and avocado, the foods
  most associated with phytosterols, have no figure at all. A column that ranks
  foods by which of them happened to be assayed says more about USDA's sampling
  than about the foods. Measure it again with `1283` before revisiting this;
  do not re-derive the 8 to 14.
- **Foods with no SR Legacy row at all**, among them romanesco, freekeh, cavolo
  nero, runner beans and dragon fruit. Each could only be approximated from a
  near relative already in the table, which would be an estimate rather than a
  measurement. Some are subtler than they look: USDA's snap beans are
  *Phaseolus vulgaris* while the runner bean is *P. coccineus*.
- **Varieties USDA does not separate**, such as orange sweet peppers, and white
  and red onions. There is one generic onion row, which is in the table.
- **Portion weights.** Quantities in **My day** are grams only, because the
  dataset carries no portion weights and "1 medium banana" would have to be
  invented. USDA publishes them in SR Legacy's `food_portion.csv` and
  `usda.mjs` already holds the reviewed row for every food, so sourcing them
  properly is the obvious next step rather than a blocker.
- **Upper limits.** Nothing in the data carries one, so the day view names the
  single case worth knowing unaided, selenium, in words rather than inventing a
  ceiling for 31 columns.
- **Fennel**, which is in SR Legacy but raw only and with no amino acid
  analysis, so it does not match the cooked-vegetable convention.
- **Iodine**, as reliable per-food values are scarce for plant foods.
- **EPA and DHA.** Measured, and there is nothing to show: USDA finds EPA in four
  of these foods and DHA in one, all at traces indistinguishable from assay
  noise. Whole plant foods are not a source, which is a fact the Methodology
  dialog now states in words rather than a column that would be blank 124 times
  over. The seaweeds are not an exception; the algae cultured for oil are
  different organisms from nori and kelp.
- **Gamma-tocopherol**, though it is present for 42 of these foods and is the
  dominant vitamin E form in most seeds: pumpkin seeds 35 mg, pecans 24,
  walnuts 21, flaxseed 20, against a vitamin E column that counts only
  alpha-tocopherol. A column would need its own daily value discussion, since
  only alpha has one, so this is recorded as a caveat in the Methodology dialog
  instead. It is the strongest remaining candidate if the vitamin group is ever
  deepened.

Every one of these carries its reason under `unavailable` in
`tools/food-additions.json`. That list is the record of what was looked for and
not found, so the same search does not get repeated. Check it before concluding
a food is missing by oversight, and delete an entry if a usable row turns up.
Absence of amino acids is *not* on its own a reason to exclude a food: roughly
twenty rows have none, and the table handles that by withholding the protein
quality score rather than by leaving the food out.

## Licence and disclaimer

The code in this repository, meaning everything under `src/`, `tools/`, `test/`
and `build.mjs`, is MIT licensed. See [LICENSE](LICENSE).

The nutrient values are not ours to license. They come from USDA FoodData
Central's SR Legacy release and from the USDA Database for the Flavonoid Content
of Selected Foods, both works of the United States government and in the public
domain in the United States. USDA asks to be credited rather than implied to
have endorsed anything, which the in-page Methodology dialog does. The
selection, arrangement and wording around those values are covered by the MIT
licence above.

Reference data, not medical advice. Nutrient needs vary by age, sex, pregnancy,
medication and health status. Note that vitamin B12 is not reliably available
from unfortified plant foods.
