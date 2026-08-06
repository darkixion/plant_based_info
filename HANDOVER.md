# Handover: where things stand

Written 2026-08-05, updated 2026-08-06. Read `README.md` first; it carries
everything durable that a handover note should not be holding.

## Latest session, 2026-08-06 (second)

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

Repo: `/home/thom/development/plant_based_info`, branch `main`. Everything is
committed and pushed. The GitHub remote (`darkixion/plant_based_info`) is
public, so pushing stays the owner's call.

- **130 foods x 66 nutrients**, sourced from USDA SR Legacy plus the USDA
  flavonoid release for three of the plant compound columns.
- `npm test` runs 90 browser tests against the built page. All passing, and CI
  runs them too, along with a check that `index.html` matches `src/`.
- `npm run build` turns `src/` into a single self-contained `index.html`.
  **Edit `src/`, never `index.html`.**
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

- **52 of 130 foods have a flavonoid row at all**, and after the completeness
  rule below the columns fill 25, 36 and 39 of 130. Sparse, and accepted as
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

- **Re-pull the whole fat group from the mapped rows.** This has grown since it
  was written. Six foods have existing MUFA totals that disagree with their USDA
  row, so their omega-9 and omega-7 are withheld; four more disagree on
  saturated fat, so their lauric, palmitic and stearic are withheld; and six
  carry an ALA-plus-LA total slightly above their own polyunsaturated figure,
  which nothing withholds because the values predate the check. One re-pull
  resolves all three sets, at the cost of changing values currently displayed.
  Still an open offer, not a decision anyone has made, and `--fill-gaps` exists
  precisely so that gap-filling no longer forces the question.
- **Gamma-tocopherol** is now the strongest candidate for deepening a group.
  It covers 42 of these foods and is the dominant vitamin E form in most seeds,
  which the alpha-only vitamin E column does not count. Currently a caveat in
  the Methodology dialog rather than a column, because only alpha carries a
  daily value and a column would have to say something about that.
- **Phytosterols are still a no, but the recorded reason was wrong.** This note
  and the README both said SR Legacy reaches "8 to 14" of these foods. Measured
  against the mapped rows it reaches 24, all non-zero, the same coverage as
  anthocyanidins, which shipped. The real objection is which 24: three seeds
  dominate and almonds, walnuts and avocado have no figure at all, so the column
  would rank foods by who got assayed. Do not re-derive the 8 to 14; measure
  `1283` again if this is revisited.
- **Portion weights for the day view.** Quantities are grams only, because
  inventing "1 medium banana" is the one thing this dataset will not do. USDA
  publishes real ones in SR Legacy's `food_portion.csv`, and `usda.mjs` already
  holds the reviewed row for every food, so this is a pull rather than a
  judgement call. It is the single change that would most improve the feature.
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
- **Favourites and the day list are keyed by food name, not row index**, so the
  food list can be reordered or extended safely. Renaming a food orphans both.
- **One control per piece of state.** The segment above the table chooses
  between Table and Chart; the sidebar chooses between the food table and My
  day, and holds the filters.
- **A total is not allowed to look more complete than it is.** Same rule as the
  flavonoid columns, now enforced across every figure in the day view.
- **No em dashes** anywhere in copy, comments or docs. Rewrite the sentence
  rather than swapping the punctuation.
