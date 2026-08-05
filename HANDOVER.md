# Handover: where things stand and what is queued

Written 2026-08-05. Pick this up in a fresh session; everything below is
verified against the data unless it says otherwise.

## Current state

Repo: `/home/thom/development/plant_based_info`, branch `main`, **4 commits, not
pushed**. The GitHub remote (`darkixion/plant_based_info`) is **public**, which
is why pushing has been left as the owner's call.

- **90 foods x 55 nutrients**, sourced from USDA SR Legacy.
- `npm test` runs 31 browser tests against the built page. All passing.
- `npm run build` turns `src/` into a single self-contained `index.html`.
  **Edit `src/`, never `index.html`.**
- `~/Downloads/vegan-nutrients.html` is a synced copy of the built page.
  Re-copy it after building if it should stay current.
- The original file is backed up at
  `~/Downloads/vegan-nutrients.backup-20260805-161505.html`.

Read `README.md` first: it covers the build, the data shape, the reviewed
USDA mapping workflow, and why the page stays on USDA rather than EuroFIR.

### Recent local edit not made by me

`src/app.js` line ~50: the default sort was changed to
`sort: { id: "__name", dir: 1 }` (name ascending, was protein descending).
Left as is. One test assumed the old default and was adjusted to search for its
row rather than expect it on page one.

## Queued work

Nine items, in the order they were raised. Items 1, 4, 7 and 8 need a decision
before they can be finished; the rest are straightforward.

### 1. New nutrient group: plant compounds

Add a sixth group alongside macro / fats / amino / vitamin / mineral.

Coverage was measured across the 87 foods that have a mapped USDA row:

| Nutrient | USDA id | Coverage | Verdict |
|---|---|---|---|
| Beta-carotene | 1107 | 77/87 | include |
| Alpha-carotene | 1108 | 76/87 | include |
| Beta-cryptoxanthin | 1120 | 76/87 | include |
| Lutein + zeaxanthin | 1123 | 76/87 | include |
| Lycopene | 1122 | 75/87 | include |
| Betaine | 1198 | 39/87 | optional, sparse |
| Gamma-tocopherol | 1126 | 39/87 | optional, sparse |
| Beta-sitosterol | 1288 | 14/87 | sparse |
| Campesterol / stigmasterol | 1286 / 1285 | 14/87 | sparse |
| Phytosterols, total | 1283 | 8/87 | too sparse |
| Phytic acid | 1042 | 0/87 | not in SR Legacy |
| Isoflavones | 1343 | 0/87 | not in SR Legacy |
| Total flavonoids | 1347 | 0/87 | not in SR Legacy |

**Decision needed.** Carotenoids are well covered and worth adding as-is.
**Phytosterols were specifically asked for but are only in 8 to 14 of 87 foods**,
so that column would be mostly "n/a". Options: include anyway and let the n/a
handling do its job; leave them out; or source them separately, since USDA
publishes standalone flavonoid and isoflavone databases that are not part of
SR Legacy and would need their own download and mapping.

Mechanically this is a `tools/usda.mjs pull` job once `KNOWN` gains entries for
the chosen ids, plus a new `GROUPS` entry, an icon, and a tint pair in
`styles.css` (`--t-plant` for light and dark). The `after` field controls
column order.

### 2. Filter by food category

Note that a category filter **already exists** as the `#catSel` dropdown in the
toolbar, covering Legumes, Soy, Grains, Nuts, Seeds, Vegetables, Fruit,
Algae & yeast. The ask is presumably to make it more prominent rather than to
build it from scratch. Given item 3 moves search into the sidebar, the natural
move is a category list in the sidebar under the nutrient groups, with counts,
matching the existing `.navbtn` styling. Keep one control per piece of state:
if it moves to the sidebar, remove the toolbar dropdown rather than having both,
which is the same reasoning that removed the pill row earlier.

### 3. Move search into the left menu

`#q` and `#qClear` currently sit in `.hero`. Moving them into `.side` above
"Nutrient groups" is mostly markup and CSS. Watch two things: the sidebar
becomes a static block under 820px, so the search must stay reachable there;
and `.side` is `position: sticky` with `overflow-y: auto`, so a long sidebar
scrolls independently.

### 4. Five more foods

Checked against SR Legacy:

| Food | Status |
|---|---|
| Kohlrabi | Present with full amino acids. `168425` cooked, `168424` raw. |
| Celeriac | Present, **no amino acids**. `169987` cooked without salt, `170400` raw. |
| Fennel | Present, **no amino acids**. `169385` bulb, raw only. |
| Romanesco | **Not in SR Legacy.** |
| Freekeh | **Not in SR Legacy.** |

The request was to "be sure to fill in all values for them", which is not
possible for four of the five. **Decision needed.** Romanesco is a cultivar of
the same species as cauliflower and broccoli, and freekeh is immature durum
wheat that has been roasted, so both could be approximated from a near relative
already in the table. That would be an estimate rather than a measurement, so
it should only be done if it is explicitly labelled as such, which is a new
kind of provenance the table does not currently carry. The alternative is to
add the three that exist and record the other two as unavailable, the way
textured pea protein and samphire already are in
`tools/food-additions.json` under `unavailable`.

### 5. One-pixel bleed behind the top of the table. Root cause found

Confirmed, with a concrete fix.

`styles.css` pins the second header row with a hardcoded offset:

```css
thead tr:nth-child(2) th{top:38px}
```

The first header row actually measures **36.813px**, so there is a **1.188px
gap** between the bottom of row one and the top of row two, and table rows
scroll visibly through it. Measured identically at device pixel ratio 1 and 2,
so it is not a rounding artefact of the display.

Fix by measuring rather than guessing: set a custom property from the real
height of the first header row after render, and use it for the offset. A
fixed height on `th.grp` would also work but breaks if the font or zoom
changes. Rounding down to `36px` would hide it behind a slight overlap, which
is safer than a gap but still guesswork.

### 6. Two Export CSV buttons

`#csvBtn` in the top bar and `#csvBtn2` in the "Build your own comparison"
box. Keep one, in the toolbar directly above the table, next to
"Show % daily value". Both currently call the same `csv()` function, so this is
markup only. Item 7 deletes the second one anyway.

### 7. Remove the "Build your own comparison" box

Delete the whole `.cta` block from `src/index.html`, which removes the
duplicate Export CSV and the "View favourites" button with it. The sidebar
Favourites toggle remains the single control for that state.

Check afterwards that no test or handler references `#csvBtn2` or the
`data-act="favs"` button inside `.cta`. The `clearfilters` and `favs` handlers
in the delegated click listener are shared, so they stay.

### 8. Fortification asterisk, and the nutritional yeast B12 figure

The observation is correct and worth acting on.

| Food | B12 per 100 g | Note |
|---|---|---|
| Nutritional yeast | **300 µg** | Also folate 3800 µg |
| Soy milk | 1.2 µg | Plus calcium 123 mg, vitamin D 1.2 µg |
| Miso, Tempeh | 0.08 µg | Trace, from fermentation |
| Nori, Kelp | 0 | See caveat below |

Nutritional yeast and soy milk are among the small set of foods with **no USDA
source row**, recorded as deliberately unmapped in `src/data/usda-map.json`;
those figures came from the original dataset. 300 µg is within range for a
heavily fortified product but is entirely a function of how much the maker
added, and unfortified nutritional yeast contains **none**. The same applies to
its folate, and to soy milk's B12, calcium and vitamin D.

Suggested approach: an optional per-value note keyed by food and nutrient,
rendered as a marker next to the figure with a key beneath the table, rather
than a per-food flag, since it is specific cells that vary. Candidates are the
fortification-dependent values above.

Worth covering in the same pass: **seaweed B12 is not a real source.** Nori and
kelp contain mostly inactive corrinoid analogues that assays count as B12 but
the body cannot use, and some analogues may block genuine B12. The table
currently shows 0 for both, which happens to avoid the trap, but the
Methodology dialog should say so, since a reader who sees seaweed in a vegan
reference may well assume otherwise.

### 9. Tooltips explaining what each nutrient does

Hovering a column header should explain that nutrient's function in the body.
The mechanism already exists and can be copied: the highlight lenses each carry
a `why` sentence, shown in `#lensNote` and set as the `title` on each `<option>`,
with a test asserting the two never drift apart.

Two things to get right. This is **55 sentences** to write, so budget for it and
keep them at the same length and register as the existing lens copy. And
`title` alone is not reachable by touch or by most screen readers, so pair it
with something visible, as the lens note does. The nutrient definitions in
`src/data/nutrients.json` are the natural home for the text, which means
`build.mjs` validation should be extended to require one per nutrient.

## Conventions worth preserving

These came up repeatedly and are easy to undo by accident.

- **No invented data.** Where USDA has no figure the table shows `n/a` and the
  detail panel says "not measured". Protein quality is withheld entirely rather
  than scoring absent amino acids as zeros, which is a bug that was fixed once
  already.
- **`tools/usda.mjs pull` refuses to write a value that contradicts a total
  already in the table**, and `build.mjs` enforces the same constraint. Six
  foods currently have omega-9 and omega-7 withheld for this reason. There is
  an open offer to re-pull the whole fat group from the mapped rows, which
  would resolve them but would change roughly 17 currently displayed values.
- **Food mappings are reviewed by a human and committed.** An early automated
  match paired Black beans with "Black pudding, boiled". `pull` will not run
  while any entry in `usda-map.json` has `"reviewed": false`.
- **Favourites are keyed by food name, not row index**, so the food list can be
  reordered or extended safely. Renaming a food orphans saved favourites.
- **One control per piece of state.** The duplicate pill row and the duplicate
  Export CSV button are both instances of the same problem.
- **No em dashes** anywhere in copy, comments or docs. Rewrite the sentence
  rather than swapping the punctuation.
