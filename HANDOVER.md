# Handover: where things stand

Written 2026-08-05, replacing the previous note. The nine queued items in that
note are all done. Read `README.md` first; it now carries everything durable
that the old handover was holding.

## Current state

Repo: `/home/thom/development/plant_based_info`, branch `main`, **4 commits, and
the work below is still uncommitted in the working tree**. The GitHub remote
(`darkixion/plant_based_info`) is public, so pushing stays the owner's call.

- **91 foods x 60 nutrients**, sourced from USDA SR Legacy.
- `npm test` runs 43 browser tests against the built page. All passing.
- `npm run build` turns `src/` into a single self-contained `index.html`.
  **Edit `src/`, never `index.html`.**
- `~/Downloads/vegan-nutrients.html` is a synced copy of the built page.
  Re-copy it after building if it should stay current. The pre-existing backup
  is at `~/Downloads/vegan-nutrients.backup-20260805-161505.html`.

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

## Open, in rough order of value

- **Re-pull the whole fat group from the mapped rows.** Six foods have existing
  MUFA totals that disagree with their USDA row, so their omega-9 and omega-7
  are withheld. A re-pull resolves them but changes roughly 17 currently
  displayed values. Still an open offer, not a decision anyone has made.
- **Phytosterols, isoflavones and flavonoids** from the standalone USDA
  databases, if the plant compounds group is worth deepening. That is a new
  download and a new mapping, not a `pull`.
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
- **Favourites are keyed by food name, not row index**, so the food list can be
  reordered or extended safely. Renaming a food orphans saved favourites.
- **One control per piece of state.**
- **No em dashes** anywhere in copy, comments or docs. Rewrite the sentence
  rather than swapping the punctuation.
