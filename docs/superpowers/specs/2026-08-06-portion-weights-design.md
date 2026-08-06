# Portion weights for My day

Status: **designed, not yet built**, 2026-08-06.

My day takes quantities in grams and nothing else. That was deliberate: the
open item that asked for this feature said inventing "1 medium banana" is the
one thing this dataset will not do. The reason it is now buildable is that
nobody has to invent it. USDA publishes the figure, in `food_portion.csv`,
inside the SR Legacy release this project already downloads.

## What the source actually holds

Measured against the current 131 foods rather than assumed, because the open
item's own framing turned out to be half right and the difference matters.

- **364 portion rows cover 128 of the 131 foods**, a mean of 2.8 each. The
  three misses are Seitan, Soy milk and Nutritional yeast, which have no
  `fdc_id` at all. They are deliberately unmapped for the reason recorded in
  `README.md`, so this is the existing gap showing through rather than a new
  one.
- **64 of the 131 offer a natural unit**: "1 medium" banana at 118 g, "1 leaf"
  of pak choi at 14 g, "1 date, pitted" at 24 g, "1 sprout" of Brussels at
  21 g. This is the half of the feature worth having.
- **The rest are volumes**, overwhelmingly `cup` (60 rows) and `tbsp` (17).
  Coverage falls from 128 foods to 64 without them, and a cup of cooked lentils
  is a real way people measure, so they ship too.
- **`measure_unit_id` is 9999, "undetermined", on every row.** The text lives in
  `modifier`. Anyone reaching for `measure_unit.csv` expecting to join on it
  will find nothing there.

**The fdc ids live in two files, not one.** `src/data/usda-map.json` holds 44,
the original foods. `tools/food-additions.json` holds the other 87 across its
`requested` and `staples` arrays. The open item said `usda.mjs` "already holds
the reviewed row for every food", which is what sent the first version of this
analysis looking in one place and finding a third of the table. The README
should say this where it describes the map.

## Why this is not just a pull

The open item called it "a pull rather than a judgement call". The pull is
mechanical and the judgement is the whole of the work, because the 187 distinct
descriptions are not shippable as written:

- `avocado, NS as to Florida or California`, an internal USDA disambiguation
  note that means nothing to a reader.
- `NLEA serving`, 13 rows. A regulatory label serving rather than a natural
  portion, and it disagrees with the natural one where both exist: kiwi's NLEA
  serving is 148 g against "1 fruit" at 69 g. Showing both invites the reader to
  wonder which is the kiwi.
- `1 melon (15" long x 7-1/2" dia)` at 4518 g, `1 head` of pak choi at 840 g,
  `1 pint as purchased, yields`. These describe a purchase, not a portion.
- Fractional amounts: `0.25 block` of tofu, `0.5 large` grapefruit.

So the design is the filter, and the filter is reviewed by a human and
committed, exactly as `usda-map.json` is and for the same reason.

## The rounding trap

This is the part that shapes the filter rather than following from it.

`clampG()` is `Math.round`, so a stored quantity is always an integer. USDA
publishes portions well below that resolution: 1 almond at 1.2 g, 1 pistachio
kernel at 0.7 g, 1 rocket leaf at 2 g. Store "1 almond" and the day holds 1 g,
which no longer equals 1.2, so a control that matches the stored grams against
the portion list finds no match and falls back to reading "custom" the instant
after the reader picked something.

A control that quietly forgets what it was told is worse than no control, and
it is the same species as the fabricated zeros the TypeScript conversion found:
a plausible-looking display that silently disagrees with what is true. Two
changes, both wanted:

1. **Drop portions under 5 g** in the propose step. Nobody adds one pistachio
   kernel to a day, and it removes the worst of the precision loss at source.
2. **Match on `clampG(portion.g)`**, never on the raw figure. Watercress at
   2.5 g rounds to 3 and still matches, so the comparison cannot be stranded by
   rounding even if the 5 g floor is later lowered.

## The tool

`tools/portions.mjs`, developer-side like `usda.mjs` and `flavonoids.mjs`, with
no reach into anything the page loads.

```
node tools/portions.mjs propose     write src/data/portions.json, report every drop
node tools/portions.mjs coverage    what shipped, per food and in total
```

`propose` reads the cached `food_portion.csv`, resolves each food's `fdc_id`
from both id sources above, applies the filter, and writes the result. Every
dropped row is printed with the rule that dropped it, so the output is
reviewable rather than merely trusted. `coverage` prints the same summary on
demand, the way `flavonoids.mjs coverage` does.

**The filter, in order:**

| Rule | Drops |
|---|---|
| `NLEA` in the description | 13 regulatory servings |
| `as purchased`, `yields`, `NS as to` | the pint rows, the avocado note |
| gram weight over 500 | whole melon, pak choi head, whole pineapple |
| gram weight under 5 | single kernels, single small leaves |

**Labels are normalised by stripping parenthetical dimensions.** Sweet potato
is mapped to the baked row and its portion reads `1 medium (2" dia, 5" long,
raw)`; the gram weight is right for the mapped row but the descriptor cites raw
dimensions, and printing that beside a column headed "baked" reads as a
contradiction the page cannot explain. Stripping gives `1 medium`.

**Collisions are reported, never resolved silently.** Pineapple has two `1
slice` rows, at 166 g and 84 g, distinguished only by the dimensions that
normalisation removes. Where stripping makes two kept portions in one food
share a label, `propose` reports it and keeps both verbatim, leaving the
decision to the review. Losing one silently would be the tool inventing a
simpler dataset than the source.

**Gram weights are copied exactly.** Never rounded, scaled or adjusted at any
point in the tool. The rounding in section "The rounding trap" happens in the
app, against the reader's stored quantity, not in the data.

## Data shape and the build

`src/data/portions.json`, keyed by the same food slug used by favourites, the
day list and the per-cell notes:

```json
{ "banana-raw": [ { "label": "1 medium", "g": 118 },
                  { "label": "1 large",  "g": 136 } ] }
```

`build.mjs` gains a fifth source and a `//{{PORTIONS}}` token in
`src/index.html`, injected as `const P = {...}` beside `DATA` and `I`, with a
matching ambient `declare const P` in `app.ts`. No import and no export, so the
seventeen top-level names stay in the global scope where the tests reach them.

`validate()` gains checks in the same spirit as the per-cell notes checks it
already carries, and for the same reason: a portion that points at nothing
renders nothing, and would sit in the data unnoticed.

- every key names a food that exists, so renaming a food fails the build
  loudly rather than dropping its portions;
- every label is non-empty, and unique within its food;
- every `g` is a number, greater than zero and within the cap.

## The app

A `<select data-dayportion>` inside `.dayqty`, after the `g` unit and before
the remove button, rendered only for foods that have portions. The first option
is "custom", then one option per portion showing its label and its grams.

Which option is selected is derived, not stored: the portion whose
`clampG(g)` equals the row's current grams, else "custom". The change handler
calls the existing `setDayGrams()` and `renderDay()`, so choosing a portion
goes through exactly the path the number input already uses. Typing grams or
using the steppers re-renders, matches nothing, and shows "custom" with no
extra logic anywhere.

**`S.day` keeps storing `{ slug, g }`.** The portion is an input convenience
and grams remain the stored truth, so `dayTotals()`, the CSV export, saved
preferences and every derived figure are untouched, and no saved day needs
migrating.

**Adding a food still sets 100 g.** One predictable default across all 131
foods, matching the per-100-g basis the rest of the page is built on, and it
needs no second per-food judgement about which portion is representative. The
select reads "custom" until the reader chooses otherwise.

The select carries an `aria-label` naming the food, following the pattern the
grams input beside it already uses.

## Testing

Browser tests in `test/smoke.mjs`, each watched failing against the current code
before the feature exists, and named for the rule rather than the fix:

- **a portion sets the grams it says it does**: choose "1 medium" banana,
  assert the input reads 118 and the day's energy total moves with it;
- **typing grams that match no portion says custom**;
- **a food USDA published no portion for offers no portion control**, against
  Seitan, which is one of the three with no `fdc_id`;
- **a portion changes nothing that typing the same grams would not**: choose a
  portion, then set the identical grams by hand, and assert every total is
  unchanged. This is the guard that the select stays an input convenience.

The build's own validation covers the data-integrity cases, so they are not
duplicated as browser tests.

## Deliberately not done

Named so none of it reads as an oversight:

- **No portion column in the CSV.** Grams stay the exchange unit, and a file
  outlives the control that produced it.
- **No representative-portion default**, for the reason in "The app".
- **Nothing in the table view.** Portions answer "how much did I eat", which is
  My day's question and not the table's.
- **No portions for the three unmapped foods**, which would mean inventing
  them.
- **No parsing of typed input** such as "2 medium". The select is the whole
  interface.

## Documentation to update when this ships

- `README.md` gains a portions section, and its description of `usda-map.json`
  is corrected to say the map covers the original foods while
  `tools/food-additions.json` carries the ids for the rest.
- `HANDOVER.md` loses the "Portion weights for the day view" open item, and its
  claim that `usda.mjs` holds the reviewed row for every food goes with it.
