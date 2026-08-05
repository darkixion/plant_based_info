# Handover: where things stand

Written 2026-08-05, updated 2026-08-06. Read `README.md` first; it carries
everything durable that a handover note should not be holding.

**The flavonoid work that this note used to scope is done and shipped.** What it
found, including the parts that argue against going further, is in the README
under "The flavonoid columns, and why they come from a second tool". Start from
the open list at the bottom instead.

## Current state

Repo: `/home/thom/development/plant_based_info`, branch `main`. Everything is
committed and pushed. The GitHub remote (`darkixion/plant_based_info`) is
public, so pushing stays the owner's call.

- **128 foods x 63 nutrients**, sourced from USDA SR Legacy plus the USDA
  flavonoid release for the last three columns.
- `npm test` runs 50 browser tests against the built page. All passing.
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
their own group while it scrolls; the food list grew from 91 to **128** across
three batches; and two more pieces of prose that were drifting behind the data
now derive from it, the amino acid gap list and the fortified food list.

## The flavonoids, now shipped

Three columns joined the plant compounds group: **anthocyanidins**,
**flavan-3-ols** and **flavonols**, from the USDA Database for the Flavonoid
Content of Selected Foods, Release 3.3. `tools/flavonoids.mjs` does the
extraction, the join and the pull, and `README.md` explains every decision in
it. The parts most likely to be re-litigated:

- **51 of 128 foods have a flavonoid row at all**, and after the completeness
  rule below the columns fill 24, 35 and 38 of 128. Sparse, and accepted as
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

- **Re-pull the whole fat group from the mapped rows.** Six foods have existing
  MUFA totals that disagree with their USDA row, so their omega-9 and omega-7
  are withheld. A re-pull resolves them but changes roughly 17 currently
  displayed values. Still an open offer, not a decision anyone has made.
- **Phytosterols**, if the plant compounds group is worth deepening further.
  Also a separate download and mapping, not a `pull`. Note that the flavonoid
  work found its coverage no better than the 8 to 14 foods estimated earlier,
  so this is likely still a no.
- **Proanthocyanidins**, which Release 3.3 does not carry at all. USDA
  published them separately once; whether that release is still available was
  not checked.
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
  it gets no amino acid score, which is correct rather than a gap to fill. The
  flavonoid columns extend this to partial measurements: an incomplete sum is
  withheld rather than shown looking like a complete one.
- **Prose that describes the data derives from the data.** The amino acid gap
  list, the fortified food list and the flavonoid coverage count are all
  computed in `app.js` and asserted in the tests, because each of them had or
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
- **Favourites are keyed by food name, not row index**, so the food list can be
  reordered or extended safely. Renaming a food orphans saved favourites.
- **One control per piece of state.**
- **No em dashes** anywhere in copy, comments or docs. Rewrite the sentence
  rather than swapping the punctuation.
