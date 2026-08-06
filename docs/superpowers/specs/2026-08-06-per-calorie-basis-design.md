# A per-100-kcal basis, alongside per 100 g

Status: **built and shipped**, 2026-08-06. The durable parts now live in
`README.md` under "Per 100 g and per 100 kcal"; this file is the reasoning
behind them.

## Where the build diverged from this design

Three things, all decided while building:

1. **The detail panel's body was still reading `val()`** after its header had
   been changed to announce the basis, so the panel claimed per 100 kcal over
   per-100-g figures. The first test missed it by asserting the header text
   rather than a number, which is the weak-assertion trap this spec spent a
   section warning about in a different place. The panel now runs through
   `shown()` and the test reads the iron figure and the exempt energy row.
2. **A local `shown` Set in `renderDetail()` and `renderDayTotals()`** shadowed
   the new `shown()` helper. Harmless the day it was written, and a trap the
   first time anyone reaches for the basis inside either function. Both are
   `shownNotes` now, which is what the table render already called the same
   thing.
3. **CSV headings name the basis on every column, including per-100-g exports.**
   The spec said only that the CSV should state the basis; making it
   unconditional changes `"Protein (g)"` to `"Protein (g per 100 g)"` and broke
   an existing test, which is how it came to be a decision rather than a
   side effect.

## The problem

Every figure on the page is per 100 g, and the About dialog defends that
choice correctly: it is the only basis on which foods compare fairly. But it
answers "what is in this food" while quietly rewarding one property that has
nothing to do with nutrition, which is dryness. A food that has had its water
removed wins every column, and a food that is mostly water loses every column,
whatever either of them does for the person eating it.

The effect is not subtle. Ranking the current table both ways:

| | top 5 per 100 g | top 5 per 100 kcal |
|---|---|---|
| **Iron** | Spirulina, Sesame, Cocoa, TVP, Wheatgerm | Spinach, Spirulina, Swiss chard, Sauerkraut, Kelp |
| **Calcium** | Sesame, Tofu, Chia, Tahini, Almonds | Watercress, Pak choi, Rocket, Tofu, Spinach |
| **Protein** | Spirulina, TVP, Nutritional yeast, Hemp, Pumpkin seeds | Watercress, Spirulina, Seitan, Alfalfa, Nori |

The lists are nearly disjoint. Per 100 g, leafy greens look like nothing.

## Why this is a toggle and not a replacement

The per-calorie basis has its own bias, and it is exactly as large. Measured
against the current data, the foods that top those per-calorie columns need
portions nobody eats:

| food | energy | grams to reach 100 kcal |
|---|---|---|
| Watercress | 11 kcal/100 g | 909 g |
| Pak choi | 13 | 769 g |
| Celery | 14 | 714 g |
| Sauerkraut | 19 | 526 g |
| Spinach | 23 | 435 g |

Watercress leads calcium and protein per calorie because you would need most of
a kilogram of it. So per 100 kcal does not remove the per-100-g bias; it
inverts it. Per 100 g flatters dry dense foods, per 100 kcal flatters watery
ones, and neither is the truer basis.

**That is the argument for the toggle rather than against it.** Showing both
and declaring neither canonical is the move this project already makes with
partial totals, withheld amino acid scores and the flavonoid completeness rule.
What would be wrong is shipping per-calorie as "real nutrient density", or
replacing per 100 g with it. Either would be the page asserting the kind of
single settling number it refuses everywhere else.

## The two controls, and why they stay orthogonal

`S.basis` (`"g" | "kcal"`) joins the existing `S.dv`. Four states, all of which
mean something:

| | raw units | % DV |
|---|---|---|
| **per 100 g** | today's table | today's %DV table |
| **per 100 kcal** | nutrient per calorie | % DV per 100 kcal |

The bottom-right cell is the reason not to merge the two controls into one
three-way switch. On a 2000 kcal day, a % DV per 100 kcal figure scales by
exactly 20, so **5% per 100 kcal is adequate, for any nutrient**. That is one
reference number that makes every cell in the table readable without knowing a
single daily value, and it exists only while basis and units stay independent.
The `#meta` line already carries a "% daily value" hint and is where that line
should be stated when both are on.

The control follows `#dvBtn` exactly, because there is no reason for a second
toggle on the same toolbar to behave differently: `aria-pressed`, a label naming
the state it would switch *to*, a `say()` announcement, persistence through
`savePrefs`, and clearing by `#resetBtn`, which resets the view and never the
user's own data.

## The data path, which is the whole correctness story

`val(f, id)` is read by the table, and also by `dayTotals()`,
`proteinQuality()` and `omegaRatio()`.

**`val()` must not change.** My day totals real grams against real daily
values; the amino acid score and the omega ratio are ratios, and a ratio is
basis-invariant. Rescaling reads at `val()` would leave all three looking
correct while silently corrupting them: a day's totals would be divided by an
energy figure that has nothing to do with what was eaten.

So the basis is a new `shown(f, n)`, used only where figures are displayed or
ordered:

- `fmtText` / `fmt` (`src/app.js:237`)
- the comparator in `rows()` (`src/app.js:470`)
- `csvTable()` (`src/app.js:1589`)
- the detail panel

Everything derived keeps reading `val()`. This boundary is the one thing in the
feature that can go wrong quietly, so it gets a test that asserts it directly
rather than being left to code review.

`shown()` divides by the food's energy and multiplies by 100. No food in the
data has a null or zero `kcal`, so there is no divide-by-zero to guard, but the
function should return `null` rather than `Infinity` if that ever changes, since
`null` is the value the whole table already knows how to render.

**`kcal` is exempt from the rescale.** `shown(f, kcal)` returns the stored
per-100-g figure in both bases. Rescaling it would print 100 in every row, and
the exemption belongs inside `shown()` rather than at each of its four call
sites, so that the display path, the sort comparator and the CSV cannot
disagree about the energy column.

## The grams column, and why it is pinned

Under the per-calorie basis, and only then, each row carries the grams that make
100 kcal, so watercress's leading calcium figure is read next to `909 g`. In the
per-100-g basis the cell is not rendered at all. The number that
makes the ranking misleading sits beside the ranking rather than in a dialog.
This is the same instinct as the coverage counts `dayTotals()` returns: do not
hide the thing that qualifies a figure, display it.

**It is pinned beside the food name with the group label, not placed in the
macronutrient group.** A normal column can be switched off from the sidebar,
and the first thing to disappear would be the number keeping the view honest.
Pinning it also means it survives every group being turned off, which is a
state the table already allows.

It sorts, which gives energy density as a sort order at no extra cost.

The energy column itself keeps showing kcal per 100 g in both bases. Energy per
100 kcal is 100 for every food in the table, and the grams figure already
carries that information in the form anyone would want to read.

## What does not need solving

**Rounding.** The concern was that per-nutrient `dp` values tuned for
per-100-g magnitudes would collapse under rescaling. Measured across the whole
table, 23 of 7,756 cells round to zero, which is 0.3%. Existing `dp` values
stand and no second table of decimal places is needed.

**My day.** It totals grams, so it is unaffected. The basis is a
table-display concern and the boundary is clean.

**Lenses, favourites, categories, search.** None of them read values.

## The rest of the surface

- The detail panel's `per 100 g` header follows the basis, so the panel and the
  table cannot disagree about what a number means.
- `csvTable()` states the basis in its header row. Exporting a rescaled figure
  under an unlabelled column heading would produce a file that cannot be
  interpreted later, which is the same failure the `%DV` unit suffix already
  avoids.
- `csvDay()` is untouched, for the same reason My day is.

## Testing

Five, in rough order of what they protect:

1. **My day, the amino acid score and the omega ratio are identical with the
   basis flipped.** This is the regression that would otherwise ship silently.
2. Each of the four states renders a known cell correctly.
3. Sorting under the per-calorie basis orders by the rescaled value, not the
   stored one.
4. The pinned grams column survives every nutrient group being switched off.
5. The basis persists across a reload and is cleared by "reset columns", while
   favourites and the day are not.

## Out of scope

- The other five ideas raised alongside this one: complementary protein
  pairing, absorption caveats as per-cell notes, rank context in the detail
  panel, a compare view, and sharper shortfall routing.
- Per-calorie shortfall routing in My day. It wants portion weights underneath
  it first, which is already recorded in the handover backlog.
- Any change to which foods or nutrients are in the data. This feature adds no
  source and asks no provenance question; it is arithmetic on columns that are
  already there.
