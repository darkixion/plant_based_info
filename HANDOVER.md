# Handover: where things stand

Written 2026-08-05, updated 2026-08-06. Read `README.md` first; it carries
everything durable that a handover note should not be holding.

**Next session starts with the flavonoid scoping below.** It is scoped, not
started, and the groundwork that makes it cheap is already recorded there.

## Current state

Repo: `/home/thom/development/plant_based_info`, branch `main`. Everything up to
and including the 32 fruit and vegetables is committed and pushed (`d4d8b8b`).
**The last five foods and the yeast fortification markers are uncommitted** in
the working tree. The GitHub remote (`darkixion/plant_based_info`) is public, so
pushing stays the owner's call.

- **128 foods x 60 nutrients**, sourced from USDA SR Legacy.
- `npm test` runs 47 browser tests against the built page. All passing.
- `npm run build` turns `src/` into a single self-contained `index.html`.
  **Edit `src/`, never `index.html`.**
- `~/Downloads/vegan-nutrients.html` is a copy of the built page, **currently
  stale**: it predates the last three batches of foods and the sticky group
  labels. Re-copy it from `index.html` if it should stay current. The
  pre-existing backup is at
  `~/Downloads/vegan-nutrients.backup-20260805-161505.html`.

## What changed

1. **Plant compounds**, a sixth nutrient group: beta-carotene, alpha-carotene,
   beta-cryptoxanthin, lutein and zeaxanthin, and lycopene. 385 of 455 values
   filled. Phytosterols and the flavonoid family were deliberately left out;
   the reasons are in the README and in the Methodology dialog.
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
their own group while it scrolls; the food list grew from 91 to **128** across
three batches; and two more pieces of prose that were drifting behind the data
now derive from it, the amino acid gap list and the fortified food list.

## Next up: anthocyanins and the rest of the flavonoids

The question that prompted this: does the table cover antioxidants? Partly. The
carotenoids do, and so do vitamins A, C and E with selenium, zinc, copper and
manganese behind them. **Anthocyanins and the whole polyphenol family do not**,
which is conspicuous now that blackberries, blueberries, raspberries, cherries,
plums, pomegranate, aubergine and red grapes are all in the table and the
compound that defines them is missing.

### What is already established

- **SR Legacy cannot supply them.** It *defines* the nutrient ids: 1348
  anthocyanidins, 1347 flavonoids, 1343 isoflavones, 1339 total phenolics, plus
  ids for quercetin, the individual catechins and six proanthocyanidin chain
  lengths. **Zero rows in `food_nutrient.csv` carry a value for any of them.**
  The vocabulary is there, the measurements never were. Verified, not assumed.
- **The data lives in a separate USDA release**: the *Database for the Flavonoid
  Content of Selected Foods, Release 3.3* (March 2018), hosted on the ARS
  Beltsville site rather than on FoodData Central. **It is not on the FDC
  download page**, so `tools/usda.mjs` cannot reach it the way it reaches SR
  Legacy. 506 foods, five subclasses: flavonols, flavones, flavanones,
  flavan-3-ols and **anthocyanidins** (cyanidin, delphinidin, malvidin,
  pelargonidin, peonidin, petunidin).
- **There is also an expanded release**, 1.1, with 29 individual compounds across
  2,926 foods. Worth comparing on coverage before choosing.
- **Proanthocyanidins are not in it** at present, and no isoflavone database is
  offered alongside it. Those are separate questions.
- **The join can be exact.** The flavonoid database is keyed by NDB number, and
  `tools/cache/.../sr_legacy_food.csv` maps `fdc_id` to `NDB_number`. All **125**
  source rows the table uses have one. So this needs no fuzzy matching and no
  human review pass, unlike `usda.mjs match`. That is the single fact that makes
  this cheap, and it is why the work is worth doing rather than deferring again.

### The obstacle

Release 3.3 ships as an **MS Access `.accdb` file**, not CSV. Extraction needs
`mdbtools` (`mdb-export`) or equivalent. That is a one-off developer dependency
for the extraction step only; it must not become a dependency of `build.mjs`,
which has none by design and must stay that way.

### Steps, in order

1. Download Release 3.3 into `tools/cache/` (gitignored) and extract with
   `mdb-export`. If `mdbtools` is unavailable, check whether the expanded 1.1
   release offers a CSV or Excel form.
2. **Measure coverage before building anything.** Join on NDB number and count
   how many of the 128 foods are reached, per subclass. Report it as a table like
   the carotenoid one in the first handover. This is the go/no-go.
3. Only then decide the shape. Anthocyanidins alone is the honest minimum, since
   that is what the question was about. The six individual anthocyanidins as
   separate columns is probably too fine; a single total is likely right.
4. If it proceeds: extend `KNOWN` and `COLUMN_TO_USDA`, add the columns to the
   existing `plant` group rather than making a seventh, and write a `why`
   sentence for each. `build.mjs` will refuse to build without one.

### Two cautions to carry in

- **Expect it to be sparse.** 506 foods against SR Legacy's 7,793. If coverage
  lands where the phytosterols did, 8 to 14 of the mapped foods, the answer is
  the same as it was for phytosterols: do not ship a column that is almost
  entirely `n/a`.
- **Do not add an ORAC or "total antioxidant" column.** USDA withdrew its ORAC
  database in 2012 on the grounds that test-tube antioxidant capacity does not
  predict anything useful in the body. A single antioxidant-power number would be
  worse than no number, and the withdrawal is the reason to say so.

## Open, in rough order of value

- **Re-pull the whole fat group from the mapped rows.** Six foods have existing
  MUFA totals that disagree with their USDA row, so their omega-9 and omega-7
  are withheld. A re-pull resolves them but changes roughly 17 currently
  displayed values. Still an open offer, not a decision anyone has made.
- **Phytosterols**, if the plant compounds group is worth deepening beyond the
  flavonoid work above. Also a separate download and mapping, not a `pull`.
- **Estimated rows.** Romanesco and freekeh could be approximated from
  cauliflower and durum wheat, but only behind a visible "estimated" marker.
  The table carries no provenance concept yet; the per-cell `notes` mechanism
  added for fortification is the natural place to build one.
- **The sidebar now scrolls** on a short viewport, which puts "How to use" and
  "Methodology" below the fold. Both are reachable from the top bar, so this is
  a nuisance rather than a fault.

## Conventions worth preserving

- **No invented data.** Where USDA has no figure the table shows `n/a` and the
  detail panel says "not measured". Protein quality is withheld entirely rather
  than scoring absent amino acids as zeros. Kohlrabi has no tyrosine figure, so
  it gets no amino acid score, which is correct rather than a gap to fill.
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
- **Favourites are keyed by food name, not row index**, so the food list can be
  reordered or extended safely. Renaming a food orphans saved favourites.
- **One control per piece of state.**
- **No em dashes** anywhere in copy, comments or docs. Rewrite the sentence
  rather than swapping the punctuation.
