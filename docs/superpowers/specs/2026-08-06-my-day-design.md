# "My day": totalling a list of foods against daily requirements

Status: **built and shipped**, 2026-08-06. The durable parts now live in
`README.md` under "My day"; this file is the reasoning behind them.

## Where the build diverged from this design

Four changes, all decided while building:

1. **Pagination was removed from the food table** at the same time, on the
   grounds that the table lists everything it has and the scrollbar already did
   the job. Not part of the original design.
2. **Per-amino-acid percentages moved from the totals list into the summary.**
   The design put a percentage on each amino acid row, which cannot be done
   honestly: FAO pairs methionine with cysteine and phenylalanine with tyrosine,
   so a percentage on one of a pair reports a shortfall the body does not have,
   and printing the pair's figure on both rows says the same thing twice. The
   nine FAO entries are therefore a block in the summary, correctly paired, and
   the totals list shows all twenty amino acids in grams with a dash in the
   percentage column.
3. **`A_BUDGET` was added.** The first working version reported "Short on
   saturated fat 4%" and "Short on sodium 3%", which is the opposite of advice.
   Energy, carbohydrate, total fat, saturated fat and sodium are now excluded
   from shortfalls and get an "Above the guideline" list of their own.
4. **Following a shortfall back to the table switches its nutrient group on**,
   the same thing selecting a lens already did. Without it the jump landed on a
   table sorted by a column that was not being shown.
5. **My day ended up in the sidebar rather than in the segmented control.** The
   reasoning below for putting it in the segment still holds for *where the view
   is drawn*, but not for where it is switched: Table and Chart are two
   renderings of one food list, and My day is not one of those. It sits with
   Foods and Favourites, and the segment hides while you are there along with
   the rest of the toolbar that only describes the table.

## The problem

The table answers "what is in this food". Per 100 g is the only basis on which
foods compare fairly, and the About dialog already says so. But it is not the
basis anyone eats on, and three of the questions this dataset is best placed to
answer cannot be asked of a single row:

- **Is my day's protein adequate?** A per-food amino acid score is a property of
  that food. Complementation happens across a day, not within a meal, and the
  score of a day is not the score of any food in it. This is the single most
  common anxiety a new vegan arrives with, and the table currently answers it
  one food at a time, which is the wrong unit.
- **Where am I actually short?** Ranking foods by selenium tells you which foods
  have selenium. It does not tell you whether you got any.
- **Is 100 g of this a lot?** Nobody eats 100 g of spirulina, and cooked pulses
  are mostly water. Quantities are what make the figures concrete.

## What the two audiences want, and where this answers it

Both lists below informed the design rather than sitting beside it. The right
column is the part of this feature that answers the question.

**New to it**

| Wants to know | Answered by |
|---|---|
| Am I getting enough protein? | Day protein total, and the day's own amino acid score |
| Do I have to combine proteins at every meal? | The day score, which is computed across the whole list |
| What about B12? | A standing note, shown whatever the total says |
| Iron and calcium? | Totals, plus a standing note that intake is not absorption |
| Omega-3? | Day ALA total against its daily value, plus the existing EPA/DHA note |
| Vitamin D, iodine? | Vitamin D total (usually near zero, and said so); iodine is **not in the dataset** and the day view must say so |
| Is this a normal amount of food? | Day energy total in kcal |

**Experienced**

| Wants to know | Answered by |
|---|---|
| Is my day lysine-adequate? | Per-amino-acid totals against FAO requirements |
| What is my omega-6:3 across the day? | Day ratio, from the existing `omegaRatio` on day totals |
| Which single food best fixes this gap? | "Short on" entries link back to the table sorted by that nutrient |
| How far can I trust these totals? | Per-nutrient coverage counts, see "Partial totals" below |

The three standing notes (B12, iodine, absorption) are the part that makes this
safe to put in front of a beginner. A totals view is more authoritative-looking
than a reference table, and it is much easier to draw a wrong conclusion from.

## Shape

A third view, alongside Table and Chart.

```
View by: [ Table | Chart | My day (6) ]

┌────────────────────────────────────────────────┬─────────────────────┐
│  Add a food…  [typeahead]                      │  Day summary        │
│                                                │  1,842 kcal         │
│  Rolled oats, dry           [  80 ] g    ×     │  Protein  71 g 142% │
│  Soy milk, unsweetened      [ 250 ] g    ×     │  Fibre    42 g 150% │
│  Banana                     [ 120 ] g    ×     │                     │
│  Lentils, cooked            [ 200 ] g    ×     │  Amino acid score   │
│  Brown rice, cooked         [ 180 ] g    ×     │  118%, no limiting  │
│  Broccoli, cooked           [ 150 ] g    ×     │  Omega-6:3  4.2 : 1 │
│                                                │                     │
│  [Clear day]                    980 g total    │  Short on           │
├────────────────────────────────────────────────┤   B12      0%   →   │
│  Totals, one row per nutrient                  │   Vit D    2%   →   │
│  grouped exactly as the table's columns are,   │   Selenium 31%  →   │
│  honouring the sidebar group toggles           │                     │
│                                                │  Standing notes     │
│  Iron        14.2 mg   79%  ███████░░░         │  B12 · iodine ·     │
│  Zinc         6.1 mg   55%  █████░░░░░  4 of 6 │  absorption         │
└────────────────────────────────────────────────┴─────────────────────┘
```

The totals run vertically rather than as a 66-column table, because there is
only one row of data and a wide table would waste the width that the bar and
the coverage note need.

### Why a third view rather than a drawer or a dialog

The totals need the same width the table has, and the day list needs to stay on
screen while you read them. A dialog would put the day and the table in two
places you cannot see at once, which is the wrong shape for "I am short on B12,
what has B12 in it".

### Resolving the existing duplicate control

`data-act="compare"` in the sidebar and `#vChart` in the toolbar both write
`S.view`. That is two controls for one piece of state, which the README's own
rule forbids, and adding a third view would make it three. So:

- The segmented control becomes the only view switcher: `Table | Chart | My day`.
- The sidebar's **Compare foods** item is removed.
- The sidebar keeps **Foods** (an anchor) and **Favourites** (a filter, not a
  view), so the sidebar list becomes navigation and filters only.
- The count lives on the segment itself, `My day (6)`, so discoverability does
  not cost a second control.

## Not crowding the table

**No new per-row button.** The row is already swatch, two-line name button and
heart; a second icon on 128 rows reads as a whole extra column of furniture, and
this is the thing to protect. Two ways in instead, neither of them in the row:

1. **A typeahead at the top of the day view.** Type "lent", pick Lentils, set
   the grams. Building a day never touches the table at all, which is how a
   person actually does this. Favourites sort to the top of the suggestions,
   which gives the hearts a second job rather than putting them in competition
   with a new control.
2. **An "Add to my day" control in the detail panel**, with a gram field. This
   is the browse-and-spot-something path, and the detail panel is where a food
   already has your attention and where a quantity belongs.

Two entry points to one *action* is not two controls holding one piece of state,
so this does not breach the rule above.

**Favourites and the day stay separate.** A favourite is a food you care about,
kept indefinitely and unquantified. A day is what you ate, quantified and
cleared often. Merging them means clearing today wipes a shortlist someone built
over weeks. They connect through the typeahead ordering and through the day's
empty state, which points at your favourites.

## Grams, not portions

Quantities are grams only, with `+`/`-` steppers. The dataset has no portion
weights, so "1 medium banana" would have to be invented, and this project does
not invent data. USDA publishes portion weights in SR Legacy's
`food_portion.csv` and `usda.mjs` already holds the row mapping for every food,
so sourcing them properly is a clean follow-up rather than a blocker.

Each entry shows its **state** ("cooked", "dry") next to the name. 100 g of dry
lentils is not 100 g of cooked lentils, and quantities are exactly where that
bites.

## Daily values, and the amino acid problem

Totals are shown in units for all 66 nutrients. Percentages are shown only where
a percentage means something:

- **The 31 nutrients with a `dv`**: percentage of the FDA Daily Value, the same
  figure the table's existing "Show % daily value" toggle uses.
- **The nine essential amino acids**: percentage of the FAO/WHO 2007 adult
  requirement. See below.
- **Nothing else.** The fat fractions (oleic, palmitoleic, MUFA, PUFA, lauric,
  palmitic, stearic) are subsets of totals that already carry a daily value, and
  the carotenoids are already counted through vitamin A, so a percentage on
  either would show the same intake twice. That is the reasoning the Methodology
  dialog already gives for those columns and it does not change here. Sugars,
  water, the flavonoids and the eleven non-essential amino acids have no
  reference figure at all.

### The amino acid targets are derived, not a second table

FAO/WHO 2007 publishes adult requirements as mg per kg of body weight per day.
The scoring pattern already in `app.js` as `FAO_PATTERN` is that same table
divided by the 0.66 g/kg/day average protein requirement. Multiplying back
recovers it exactly:

| | pattern (mg/g) | × 0.66 | published (mg/kg/day) |
|---|---|---|---|
| Histidine | 15 | 9.9 | 10 |
| Isoleucine | 30 | 19.8 | 20 |
| Leucine | 59 | 38.9 | 39 |
| Lysine | 45 | 29.7 | 30 |
| Met + cys | 22 | 14.5 | 15 |
| Phe + tyr | 38 | 25.1 | 25 |
| Threonine | 23 | 15.2 | 15 |
| Tryptophan | 6 | 4.0 | 4 |
| Valine | 39 | 25.7 | 26 |

So the day's amino acid targets are computed from the constant already in the
file, in keeping with the convention that derived figures come from the data
rather than being sourced separately. There is no second reference table to
drift out of agreement with the first.

That needs a body weight. **Default 70 kg, stated in words, with an optional
weight field in the day panel.** One input, and it is the difference between
"2.1 g of lysine" meaning nothing and meaning something. Protein itself stays on
its existing 50 g FDA daily value rather than gaining a second per-kg target,
since two protein targets would be two controls for one idea.

### The day's own amino acid score

Separately from the per-acid percentages, the summary shows the score of the day
as a whole: the day's totals treated as one food and run through the existing
`proteinQuality()`. No body weight needed, no new code beyond assembling a
synthetic food from the totals.

This is the figure that answers "do I have to combine proteins at every meal".
A day of rice and lentils scores higher than either, and seeing that happen is a
better explanation than the paragraph in the Methodology dialog.

## Partial totals: the constraint that governs the whole feature

**A sum over foods where some are `null` is a partial total that looks like a
complete one.** This is precisely the failure the flavonoid work refused, and a
totals view creates it everywhere rather than in one column. Cysteine is missing
for 19 of 128 foods, tyrosine for 16, palmitoleic acid for 17, and the flavonoid
columns for 90 or more.

So: **every total whose contributors include a `null` carries a coverage count**,
rendered beside it as "4 of 6". A total with no contributors at all shows "not
measured" rather than 0, the same distinction the detail panel already draws.

The consequences follow through:

- A nutrient cannot appear in **Short on** if its total is partial. Reporting
  someone as short on cysteine when a third of their list was never assayed for
  it is a fabricated conclusion, not a missing one.
- The day's amino acid score is withheld entirely if any contributing food is
  missing any of the nine, exactly as `proteinQuality()` already withholds it
  per food.
- **Per-cell notes propagate.** A total drawing on a fortified cell carries the
  fortification marker, and one drawing on an undifferentiated omega figure
  carries that marker. If someone's whole B12 total came from nutritional yeast,
  the day view has to say the maker put it there. The `noteFor` machinery
  already does this per cell and needs only to be collected across the list.

## The three standing notes

Shown whatever the numbers say, because each is a wrong conclusion the totals
actively invite:

1. **B12.** The one figure a new vegan most wants and the one this view can most
   easily mislead them about, in both directions: near zero because they have
   not listed a fortified food, or comfortable because they listed seaweed. The
   note says what the Methodology dialog already says, at the point of use.
2. **Iodine is not in this dataset.** A view that lists what you are short of
   implies the list is complete. It is not, and iodine is the gap that matters
   on a plant-based diet.
3. **Intake is not absorption.** Non-haem iron, calcium from oxalate-rich
   greens, zinc against phytates. "Iron 180%" from spinach and lentils overstates
   what you got. The existing "Iron & absorption" highlight lens is one click
   from here and is the natural link.

A fourth, situational: **selenium above roughly 300%** is worth a caution rather
than a congratulation, because Brazil nuts are the one food here where a large
percentage is a real upper-limit question. Upper limits are otherwise out of
scope, since the dataset carries none.

## Short on, and the way back to the table

**Short on** lists nutrients with a complete total under 50% of their reference,
lowest first. Each is a button that switches to the table view sorted by that
nutrient, descending. That closes the loop: "you are low on selenium" becomes
"here are the foods with the most selenium" in one click, and the day view stops
being a dead end.

Nutrients over 100% are listed in the same compact form under **Comfortable**,
which is the reassurance half and the reason a new vegan leaves less anxious
than they arrived.

## State and persistence

```js
S.day = [{ slug, g }]   // ordered as added
S.weight = 70           // kg, for amino acid targets only
```

Stored in the existing `vegan-nutrients:v1` blob alongside favourites. Slug-keyed
for the same reason favourites are: reordering or extending the food list must
not repoint someone's entries at the wrong food. Entries whose slug is no longer
in the dataset are dropped on load, exactly as favourites are. The shape is
purely additive, so the storage key does not need bumping.

The nutrient **group** toggles in the sidebar govern which nutrients the totals
list shows, so that control keeps its single meaning across all three views. The
search, category and favourites filters do not apply: they narrow the food
table, and the day list is not the food table.

## Export

In the day view, the existing **Export CSV** button writes the day: one row per
entry with its grams, then a totals row, then a percentage row. Same button, and
it already means "export what you can currently see", so this extends its
meaning rather than adding a control.

## Errors and edge cases

| Case | Behaviour |
|---|---|
| Empty day | Empty state pointing at the typeahead and at your favourites |
| Quantity 0, blank, or non-numeric | Treated as 0, entry kept, no NaN reaches a total |
| Quantity above a sane ceiling (say 5000 g) | Clamped, since a typo of 10000 for 1000 silently triples a day |
| Same food added twice | Quantities merge into the existing entry rather than a duplicate row |
| Every contributor to a nutrient is `null` | "not measured", never 0 |
| `localStorage` blocked | Day works for the session and is not persisted, as favourites already degrade |
| A stored slug no longer exists | Dropped on load, with the count in the segment reflecting what survived |

## Testing

Extending `test/smoke.mjs`, in the style of the existing 54:

- Adding a food and setting grams produces the arithmetic expected of it, checked
  against a hand-computed figure for one food at one weight.
- A total over a food with a `null` contributor renders the coverage count, and
  that nutrient does not appear in **Short on**.
- The day's amino acid score is withheld when a contributing food has an amino
  acid gap, and present when none does.
- Rice plus lentils scores higher than either alone. This is the complementation
  claim the feature makes and it should be asserted rather than assumed.
- The day survives a reload, and a stored entry for a slug not in the dataset is
  dropped rather than throwing.
- The fortification marker appears on a B12 total built from nutritional yeast.
- The three standing notes are present in an empty day as well as a full one.

## Deliberately not in this

- **Meals, days of the week, or a diary.** One list. Naming it "My day" says what
  the totals are a day of without building a calendar.
- **Age, sex, pregnancy or activity profiles.** One optional body weight, used
  for amino acid targets only. Everything else stays on the general adult
  reference figures the footer already disclaims.
- **A chart of the day.** The bars beside each total are the chart.
- **Upper limits**, beyond the single selenium caution. The dataset has none, so
  they would have to be sourced, which is its own piece of work.
- **Recipes or per-100-kcal normalisation.**

## Order of work, if approved

1. `S.day` state, persistence, and the slug-drop on load.
2. Totals computation with coverage counts and note propagation. This is the
   part everything else reads, and the part where getting partial sums wrong
   would be invisible.
3. The third view, and removing the duplicate sidebar control.
4. The day list: typeahead, grams, remove, clear.
5. The summary column: energy, protein, day amino acid score, omega ratio,
   Short on, Comfortable, standing notes.
6. The detail panel's "Add to my day".
7. CSV.
8. Prose: a "Your day" section in the How to use dialog, and a paragraph in
   Methodology on what a day total can and cannot tell you.
