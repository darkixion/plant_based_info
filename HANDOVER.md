# Handover: where things stand

Written 2026-08-05, updated 2026-08-07. Read `README.md` first; it carries
everything durable that a handover note should not be holding.

## Latest session, 2026-08-07 (sixth)

**Portion weights shipped for My day.** A quantity can now come from a USDA
portion instead of a typed number: 128 of 131 foods carry portions from SR
Legacy's `food_portion.csv`, 324 of them, generated into the new
`src/data/portions.json` by `tools/portions.mjs propose`. Designed in full at
`docs/superpowers/specs/2026-08-06-portion-weights-design.md` and written up
durably in `README.md` under "My day". 109 tests, all passing.

**Choosing a portion writes grams and nothing else.** `S.day` still stores
`{ slug, g }`; the select is derived from the stored quantity rather than
remembered as a separate choice, so typing a number or using the steppers
moves it too, and it reads "custom" the moment the quantity matches no
portion. Every total, export and saved day stays exactly what typing that
number would have produced.

**`tools/portions.mjs` is a filter as much as a pull.** Of 364 SR Legacy
portion rows for these foods, 40 were dropped, each printed with the rule
that dropped it: 17 under a 5 g floor, 14 regulatory NLEA servings, 6
purchase quantities like "1 pint as purchased", and 3 over a 500 g cap. None
of those belong on the page, and the tool says so rather than silently
including them. The three foods with no portion at all, Seitan, Soy milk and
Nutritional yeast, are the same three that have no SR Legacy row.

Two findings worth keeping, both the kind this note exists to preserve:

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
still imports nothing but `node:*`. 109 tests, all passing.

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

Repo: `/home/thom/development/plant_based_info`, branch `main`. Everything is
committed and pushed. The GitHub remote (`darkixion/plant_based_info`) is
public, so pushing stays the owner's call.

- **131 foods x 66 nutrients**, sourced from USDA SR Legacy plus the USDA
  flavonoid release for three of the plant compound columns.
- `npm test` type-checks `src/app.ts`, compiles it, builds the page, then runs
  109 browser tests against the result. All passing, and CI runs the same, along
  with a check that `dist/app.js` matches `src/app.ts` and `index.html` matches
  `src/`.
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
