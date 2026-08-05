# plant_based_info

A single-page nutrient reference for whole plant foods — amino acids, vitamins,
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

`index.html` is generated. **Edit `src/`, never `index.html`** — your changes
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
of the wrong length silently misaligns every column after the gap — which looks
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

**Nutrient groups are toggled in one place** — the sidebar. There was previously
a second row of pills doing the same job; two controls for one piece of state is
what made it worth removing.

**Highlight lenses** are named nutrient sets that cut across groups. Built-ins
live in `BUILTIN_LENSES` in `app.js`; users can save their own. Selecting a lens
switches on whatever column groups it needs, since highlighting a hidden column
would highlight nothing.

## Data source

Values currently follow USDA FoodData Central. See the in-page **Methodology**
dialog for how amino acids are derived and what the figures do not account for.

## Licence and disclaimer

Reference data, not medical advice. Nutrient needs vary by age, sex, pregnancy,
medication and health status. Note that vitamin B12 is not reliably available
from unfortified plant foods.
