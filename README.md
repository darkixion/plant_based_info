# plant_based_info

A single-page nutrient reference for whole plant foods: amino acids, vitamins,
minerals, omega oils, carotenoids and macronutrients, all per 100 g, sortable
and filterable.

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

## Layout

```
src/
  index.html          page shell; {{STYLES}} {{DATA}} {{ICONS}} {{APP}} are filled by the build
  styles.css          all styling, light and dark
  app.js              all behaviour
  data/nutrients.json the dataset: nutrient definitions + one value array per food
  data/icons.json     inline SVG icons
build.mjs             inlines the above into index.html, and validates the data
test/smoke.mjs        browser tests for rendering and persistence
```

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

**Favourites are stored by food key, not row index.** Keys come from the food's
name and state. Renaming a food will orphan anyone's saved favourite for it;
reordering the list is safe. The build fails if two foods collide on a key.

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
Amino acid score, limiting amino acid, protein per 100 kcal and the omega-6:3
ratio are all calculated in `app.js` from the columns already present, so they
cannot drift out of agreement with the row they describe.

### Pulling more nutrients from USDA

```bash
node tools/usda.mjs match              # propose food mappings for review
node tools/usda.mjs pull 1268 1275     # add those USDA nutrients as columns
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

**Coverage is 51 of 128 foods**, and per subclass: anthocyanidins 24, flavan-3-ols
35, flavonols 38. Sparse, and deliberately preferred to the alternative. USDA's
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
- **Phytosterols, phytic acid, isoflavones and proanthocyanidins.** SR Legacy has
  no figures at all for them and reaches only 8 to 14 of these foods for
  phytosterols. USDA publishes phytosterols in a separate database that would
  need its own download and mapping. Isoflavones are in the expanded flavonoid
  release, but its analytical values cover the soy foods so patchily that miso
  would be the only soy row with a figure.
- **Foods with no SR Legacy row at all**, among them romanesco, freekeh, cavolo
  nero, runner beans and dragon fruit. Each could only be approximated from a
  near relative already in the table, which would be an estimate rather than a
  measurement. Some are subtler than they look: USDA's snap beans are
  *Phaseolus vulgaris* while the runner bean is *P. coccineus*.
- **Varieties USDA does not separate**, such as orange sweet peppers, and white
  and red onions. There is one generic onion row, which is in the table.
- **Fennel**, which is in SR Legacy but raw only and with no amino acid
  analysis, so it does not match the cooked-vegetable convention.
- **Iodine**, as reliable per-food values are scarce for plant foods.

Every one of these carries its reason under `unavailable` in
`tools/food-additions.json`. That list is the record of what was looked for and
not found, so the same search does not get repeated. Check it before concluding
a food is missing by oversight, and delete an entry if a usable row turns up.
Absence of amino acids is *not* on its own a reason to exclude a food: roughly
twenty rows have none, and the table handles that by withholding the protein
quality score rather than by leaving the food out.

## Licence and disclaimer

Reference data, not medical advice. Nutrient needs vary by age, sex, pregnancy,
medication and health status. Note that vitamin B12 is not reliably available
from unfortified plant foods.
