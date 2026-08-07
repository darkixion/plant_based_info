# Bioavailability: what helps and hinders absorption

Written 2026-08-07, and built the same day. See "What building it changed" at
the foot for where the design turned out to be wrong.

## Why this one is harder than it looks

Every other column on this page is a composition figure: somebody put a food in
a machine and measured it. Bioavailability is not that. How much of an iron
figure a person absorbs depends on the rest of the meal, on their iron status,
and on the individual, and the honest range is often several-fold wide.

That collides with the rule the whole project is built on: **no invented data**.
A page that prints "3.30 mg" and a page that prints "0.33 mg absorbable" are
making very different kinds of claim, and only the first one is a measurement.

So the shape of this feature follows from one decision, taken first: **it is
explanatory, and no figure on the page ever changes.** Nothing is multiplied by
an absorption factor. Nothing is recomputed. The table still says 3.30 mg. What
is added is the ability to find out what that figure does and does not mean.

**The knowledge is already here, scattered.** Nine `why` sentences in
`nutrients.json` carry bioavailability facts: iron names vitamin C and tea,
zinc names phytate, calcium names oxalate, vitamin K and total fat both say a
meal needs fat. Part of this work is promoting what was already written into
something findable, not authoring from nothing.

## What this is, and is not

| is | is not |
|---|---|
| relationships between nutrients, and between nutrients and substances, foods and practices | per-food absorption percentages |
| curated prose with a source per claim | a new data pull from a new database |
| shown beside the figures | applied to the figures |
| a dozen named food exceptions | coverage of all 131 foods |

Phytate and oxalate content per food would need a source outside USDA SR
Legacy, which is a separate project of the shape `flavonoids.mjs` already is. It
is deliberately not in scope here. See "Deliberately not done".

## The dataset: `src/data/interactions.json`

**One record per interaction, not lists hung off each nutrient.** An interaction
is a relationship, and writing it once is what stops the two sides drifting
apart: iron saying "vitamin C helps" while vitamin C's own entry says nothing
about iron. This project has been bitten by prose drifting behind data three
times already, the amino acid gap list, the fortified food list and the
flavonoid coverage count, and its stated convention is that prose describing the
data derives from the data. The same reasoning applies to prose describing a
relationship: derive both views from one record.

```json
{
  "affects": "fe",
  "direction": "down",
  "agent": { "kind": "substance", "label": "Phytate" },
  "short": "Phytate",
  "text": "Phytate in wholegrains, pulses, nuts and seeds binds iron in the gut. Soaking, sprouting and fermenting break it down and raise how much gets through.",
  "when": "same meal",
  "source": "Hurrell R, Egli I. Iron bioavailability and dietary reference values. Am J Clin Nutr 2010;91(5):1461S-1467S."
}
```

Fields:

- **`affects`** is a nutrient id in `nutrients.json`. The thing whose absorption
  changes. Note the ids are short and not always guessable: iron is `fe`,
  calcium `ca`, zinc `zn`, vitamin C `vitc`, beta-carotene `betacar`. Checked
  against the dataset while writing this, because `iron` was the first guess
  here and it does not exist.
- **`direction`** is `"up"` or `"down"`. Two values, not a magnitude, because a
  magnitude would be the invented number this design exists to avoid.
- **`agent`** is what does it, and **its kind is the part that earns its keep**,
  because the other side of an interaction is frequently not a column:
  - `{"kind":"nutrient","id":"vitc"}` for vitamin C, calcium, fat
  - `{"kind":"substance","label":"Phytate"}` for phytate, oxalate, tannins
  - `{"kind":"food","slug":"cocoa-powder"}` for a specific food in the table
  - `{"kind":"practice","label":"Soaking, sprouting, fermenting"}` for
    preparation
- **`short`** is the label for the compressed one-line view in the nutrient note.
- **`text`** is the full sentence for the dialog and the detail panel.
- **`when`** is `"same meal"`, `"same day"` or `"preparation"`. This is what the
  My day hint needs in order to be honest, and it is a field rather than prose
  so that the hint can be built from it rather than from a hand-written caveat
  per interaction.
- **`source`** is a citation. Required on every record.

### It renders from both ends for free

Iron's view lists vitamin C up, and calcium, tannins and phytate down. Vitamin
C's view says it raises absorption of non-haem iron. **Both come from the same
record**, and nothing is written twice. This is the main argument for the record
shape over per-nutrient lists, and it is worth stating because the per-nutrient
version looks simpler right up until the two halves disagree.

### Validation in `build.mjs`

The build already validates portions and per-cell notes and refuses a hand edit
that breaks them. Interactions join that list:

- every `affects` resolves to a nutrient id
- every `{"kind":"nutrient"}` agent id resolves to a nutrient id
- every `{"kind":"food"}` agent slug resolves to a food
- every record has a non-empty `source`
- `direction` is `up` or `down`, `when` is one of the three values

A typo fails the build rather than rendering an entry that silently says
nothing.

### Sourcing

**Every record carries a source, and that is not negotiable.** The rest of the
page cites a reviewed USDA row per figure. Bioavailability claims are softer
than composition ones, so they need their provenance more rather than less. The
dialog prints them.

Where a claim is genuinely contested, the record says so in `text` rather than
being dropped or stated flatly. The project's habit is to state a limit rather
than hide behind silence.

## Which entries a food shows

Two rules, because half the table has no reference intake to threshold against.
**37 of 68 nutrients have no daily value**, and that includes every carotenoid
and every flavonoid.

1. **Nutrient has a daily value:** show its interactions when the food ranks the
   nutrient highly by % of that value. This reuses the ranking `renderDetail`
   already computes for "Top nutrients", which excludes macronutrients, excludes
   anything with no daily value, and drops unmeasured figures rather than
   scoring them as zero. No new threshold is invented.
2. **Nutrient has no daily value:** show its interactions when the food is among
   the **top 10 of that column across all 131 foods**.

Both rules answer the same question, "is this food a meaningful source of this
nutrient", in the only two ways the data allows. Rule 2 is what lets
"carotenoids need fat in the meal" appear on carrots and sweet potato, which a
%DV rule could never do because no carotenoid has a daily value.

The 10 lives in one named constant and a test pins it. It is a judgement, not a
measurement, and it should be easy to find and change.

**Lentils gets the iron entry at 18% DV. Apple does not at 1%.** That pair is
the test.

## The curated exception notes

Eight to twelve records, carried on the **per-cell `notes` mechanism that
already exists** for fortification markers and the undifferentiated `†`. Same
shape, keyed by food slug and nutrient id, same validation, same rendering path.

The oxalate split among greens is most of the list, and it is the case that
justifies the whole idea:

| foods | note |
|---|---|
| Spinach, chard, beetroot | high oxalate; the calcium and iron figures overstate what is absorbed |
| Kale, pak choi, broccoli, watercress | low oxalate; roughly half the calcium is absorbed, which is high |
| Cocoa powder | tannins, the classic iron inhibitor |
| Soy foods | phytate, and the goitrogen and iodine interaction |

Phytate in grains, legumes, nuts and seeds is **not** on this list. It is true of
a whole class of foods, so it belongs in the nutrient-level text where it is
written once, not repeated across sixty foods where it would drift.

### Exceptions, not coverage

The dialog states plainly that these are named exceptions and that a food
without one has not necessarily been reviewed and found clean. Twelve notes must
not imply the other 119 were checked.

This is the same honesty the flavonoid columns already practise by stating their
sparseness rather than hiding it, and it is worth stating because the debt is
real: there is no way to distinguish "checked, nothing to say" from "never
checked", and the existing fortification notes have exactly the same property.

## The four surfaces

### The nutrient note, above the table

Already appears on hover, keyboard focus or sort of a column, and already
carries the nutrient's `why` sentence. One line is added beneath it:

```
Iron  Carries oxygen in the blood. Plant iron is the non-haem form...

      ↑ Vitamin C, same meal
      ↓ Calcium · Tea · Coffee · Phytate
```

Zero new UI, and it appears exactly when the reader is looking at that column.
This is the surface that does most of the work for least cost.

### The Bioavailability dialog

A new `data-dlg="bio"` entry beside How to use and Methodology in the sidebar.
Grouped by affected nutrient, every record in full with its mechanism and its
source, readable end to end. This is the complete reference; the other three
surfaces are contextual slices of it.

### The detail panel tab

A sixth tab, "Absorption", showing the records this food's own figures select by
the two rules above, plus any curated note on that food.

### My day

A card in `.dayadvice`, the block that already exists for caveats and is
deliberately shown whatever the numbers say. It **names the pairing and claims
nothing**:

> **Worth pairing.** Your lentils supply 6.6 mg iron, and your peppers supply
> vitamin C. That only helps if they are eaten in the same meal. This list
> cannot know whether they were.

The `when` field is what makes this possible without a hand-written hedge per
interaction. My day is a whole day and absorption is a per-meal effect, so a
`"same meal"` record can never be reported as having happened. This is the same
rule the view already lives by: **a total is not allowed to look more complete
than it is.**

## Decisions taken without an answer

Three questions were put and not answered before approval. They are decided here
so the spec is complete, each with its reasoning, and each is cheap to reverse.

- **The tab strip wraps to two rows below 700px.** Five tabs already needed
  their inline padding cut to 2px to cross a 320px screen; a sixth leaves about
  48px each and "Plant compounds" needs more. The alternative was a horizontally
  scrolling strip, rejected because it hides tabs off screen with no affordance,
  and folding Absorption into Overview, rejected because it buries the thing
  this project is adding. A wrapped strip keeps all six visible and costs two
  CSS declarations.
- **The curated marker does appear in the table**, as a distinct superscript
  with its own key line. The entire argument for curating these notes was that
  the bare number misleads, and spinach's calcium cell is where the misleading
  number is. The note key only lists markers currently on screen, so it stays
  self-limiting. If the table feels noisy in practice, the marker can be
  restricted to the panel without touching the data.
- **`.nutnote`'s `min-height` is recalculated, not removed.** It is 83px on
  purpose, so moving between column headers never resizes the box and nudges the
  table beneath it. A variable-length second line breaks that. The new value is
  measured against the longest `why` plus the longest interaction line, at the
  narrowest width the note is shown at.

## Testing

- **Structural:** the build rejects an interaction naming a nutrient, food or
  direction that does not exist, and one with no source. Watched failing.
- **Selection:** lentils selects the iron entry, apple does not. A carotenoid
  entry reaches carrots by rule 2, proving the no-daily-value path works.
- **Both ends:** the record for vitamin C raising iron absorption appears under
  iron and under vitamin C, from one record.
- **No arithmetic:** no figure rendered anywhere differs between the page with
  interactions and the page without. This is the structural guard on "the
  numbers never change", and it is stronger than reading the code.
- **My day:** the hint never states that a pairing happened, only that it could.
- **Layout:** at 320px the six tabs are all visible and the panel does not
  overflow, and the nutrient note does not change height between the longest and
  shortest entries.

## Build order

Each phase ships something usable on its own.

1. **The dataset, the nutrient note and the dialog.** Complete and useful
   without any per-food work at all.
2. **The curated notes and the detail panel tab**, including the tab strip wrap.
3. **The My day hint.**

## Deliberately not done

So nobody wonders whether it was forgotten:

- **No absorption percentages, and no "absorbable iron" style figures.** Every
  factor is a range that depends on the meal and the person, so a single number
  would be invented data wearing a measurement's clothes.
- **No phytate or oxalate columns.** They would need a source outside USDA SR
  Legacy, which is a separate project of the shape `tools/flavonoids.mjs`
  already is. If it is ever done, this feature is what it would feed.
- **No meal grouping in My day.** Assigning entries to meals would let the hint
  be accurate rather than hedged, and it changes the stored day shape, the
  export and the totals. That is a My day project, not a bioavailability one.
- **No advice on supplements, doses or timing beyond meals**, and no
  recommendations. The page describes foods.
- **No interactions involving drugs.**

## What building it changed

Corrected rather than left to mislead the next reader.

- **`source` became `cites`, an array.** The oxalate record quotes spinach from
  Heaney 1988 and kale from Heaney 1990, and a single-key field could name only
  one of them. Found by the "a source nothing cites" check within a minute of
  it being written, which is the best argument for that check there is.
- **The dialog groups by the affected *set*, not by one nutrient.** Grouping per
  nutrient printed the shared fat record four times word for word under vitamins
  A, D, E and K, and the carotenoid one five times. Keying on `affects.join()`
  prints each record once under a heading naming everything it covers.
- **The tab strip wraps at every width, not below 700px as this spec said.** The
  detail panel is a 300px column at all widths, so six tabs never fit one row
  anywhere. Scoping the wrap to phones left the desktop panel overflowing its
  column by 54px and the whole page panning sideways at 1440px. The narrow
  screen test from the previous session caught it.
- **The nutrient note's `min-height` went to 126px, not a recalculation of 83.**
  Measured across all 68 nutrients at 1200px and above. The agent-side list is
  capped at three names for the same reason: fat is the agent on both the
  carotenoid and fat-soluble vitamin records, so spelled out in full it listed
  nine nutrients and made that one box half as tall again as any other.
- **The set of interactions is 11 records from 8 sources, smaller than this spec
  implied.** Copper against zinc, oxalate against iron and cooking against
  lycopene were dropped because their sources were not checked. A thin sourced
  list is worth more than a full unsourced one, and the dialog states that a
  nutrient with no entry means nothing recorded rather than nothing to record.
- **The curated notes cover calcium only, not calcium and iron.** Oxalate's
  effect on calcium is what the checked sources establish; its effect on iron is
  weaker in the literature and was not claimed.
- **The hand-written "Intake is not absorption" day note was cut back.** It
  spelled out the iron, calcium and zinc interactions in prose, which became a
  second copy of the dataset the moment the dataset existed. It now points at
  the dialog.

## Open, after this ships

- Whether the nine `why` sentences that already carry bioavailability facts
  should be trimmed once the interaction records say the same thing in a
  findable place. They would then be saying it twice, which is the drift risk
  this design was shaped to avoid, so it is worth revisiting rather than leaving
  both.
- Whether a lens ("Iron absorption") is a natural fifth surface, highlighting
  the columns involved in one interaction story. Cheap if the dataset exists,
  and only worth it if the nutrient note turns out not to be enough.
