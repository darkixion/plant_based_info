# plant_based_info

A single-page nutrient reference for whole plant foods: amino acids, vitamins,
minerals, omega oils and macronutrients, all per 100 g, sortable and filterable.

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

## Notes for future changes

**Favourites are stored by food key, not row index.** Keys come from the food's
name and state. Renaming a food will orphan anyone's saved favourite for it;
reordering the list is safe. The build fails if two foods collide on a key.

**Everything user-facing persists to `localStorage`** under `vegan-nutrients:v1`,
guarded so blocked storage degrades to a working page rather than an error. Bump
the key if the stored shape changes incompatibly.

**Nutrient groups are toggled in one place**, the sidebar. There was previously
a second row of pills doing the same job; two controls for one piece of state is
what made it worth removing.

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

## Licence and disclaimer

Reference data, not medical advice. Nutrient needs vary by age, sex, pregnancy,
medication and health status. Note that vitamin B12 is not reliably available
from unfortified plant foods.
