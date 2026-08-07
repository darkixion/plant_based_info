# The fat re-pull, and two new columns

Status: **designed, not yet built**, 2026-08-07.

Three open items in `HANDOVER.md` turn out to be one piece of work. Each is a
`KNOWN` entry in `tools/usda.mjs` followed by a `pull`, and each runs into the
same property of the tool: `pull` writes `null` where the mapped row has no
figure, so re-pulling a column that is already populated can take data off the
page. That property is what has kept the fat re-pull an open offer since it was
first written down. Fixing it is the spec; the three items are what it then
makes possible.

A fourth open item, proanthocyanidins, needs a data source this project does not
yet download and gets its own spec.

## The rule this whole change turns on

> `pull` may overwrite a figure with a figure, and may fill a gap. It may never
> replace a figure with nothing.

The tool today does the opposite: `f.v[col] = null` on any id the mapped row
does not carry. That is correct for a fresh column, where every cell starts
empty and `null` means "USDA has no figure". It is wrong for a re-pull, where
the cell may already hold a figure that came from somewhere the map does not
record, and a silent row is not evidence of absence.

**Measured, this is not hypothetical.** Four foods hold `ala`, `la`, `mufa`,
`pufa` and `satfat` today whose mapped row carries no fatty acid id at all:

| Food | Mapped row | Fat ids in that row |
|---|---|---|
| Amaranth | `170683` Amaranth grain, cooked | none of 12, out of 33 ids present |
| Soy milk | `null`, deliberately unmapped | not applicable |
| Seitan | `null`, deliberately unmapped | not applicable |
| Nutritional yeast | `null`, deliberately unmapped | not applicable |

Amaranth is the instructive one. It is mapped, reviewed and correct, and its
row simply has no fatty acid analysis. Under today's tool a re-pull blanks five
real values for it. Under the rule above it keeps them.

An earlier draft of this design used a food-level skip: if the mapped row
carries none of the ids being pulled, leave the food alone. The per-cell rule
replaces it because it is one condition rather than a special case about rows,
it needs no reasoning about why a row is silent, and it holds for every future
pull rather than for this one. It also makes the guarantee testable as a
property of the tool instead of as a fact about four foods.

The run reports what it preserved, in the same shape as the existing
`--fill-gaps` line, so the count is visible rather than implicit.

### What it does not change

`--fill-gaps` stays exactly as it is. It answers a different question: not "may
this figure be destroyed" but "should an existing figure be reconsidered at
all". A `--fill-gaps` run still leaves every populated cell untouched, including
ones this rule would have allowed to change.

The conflict check that withholds a value contradicting a total already in the
table also stays. It sets a cell this run wrote back to `null`, which is not the
case the rule above governs: that value was never on the page.

## Item 1: re-pull the fat group

**The tool cannot do this today, for a reason the open item does not mention.**
`mufa`, `pufa` and `satfat` are in `COLUMN_TO_USDA`, so a newly added food gets
them, but they are not in `KNOWN`, so `pull` cannot touch them. Re-pulling only
the fractions against stale totals would leave the conflicts in place, because
the conflicts are disagreements between fraction and total. All three need
`KNOWN` entries. Their `label`, `unit`, `dv`, `dp` and `why` come from the
committed column definitions in `nutrients.json`, unchanged.

`satfat` sits in the `macro` group rather than `fats`, and already exists, so it
takes the "already present, updating values" path and needs no `after` anchor.

**Then one run over all ten columns**, measured against the current data:

```
identical      1030
changed         164
gaps filled      24
blanked            0
conflicts    6 -> 0
```

The six standing disagreements the README records (Mung beans, Edamame, Lupin
beans, Natto, Buckwheat, Wholewheat pasta, each with `ala + la` slightly above
`pufa`) all resolve, because fraction and total then come from the same row.
That is the whole point of the item: they exist only because the values were
assembled from different sources at different times.

The 164 changes are real and some are large. Broccoli's ALA moves from 0.021 to
0.119 g, Kale's from 0.18 to 0.378, Wholewheat pasta's `pufa` from 0.22 to
0.574. These are not corrections of arithmetic; they are the mapped row
replacing an older derivation, which is what "re-pull" means and why it needed a
decision rather than a patch.

## Item 2: gamma-tocopherol

USDA id `1126`, `Tocopherol, gamma`, mg.

- **57 of 131 foods carry a figure, 43 of them non-zero.** The 14 measured zeros
  are figures, not gaps, and display as `0.00` the same as any other measured
  zero.
- **Every food with a gamma figure already has alpha**, so the column never
  appears beside an empty vitamin E cell.
- `group: "vitamin"`, `after: "vite"`, `dv: null`, `dp: 2`, matching `vite`'s
  own unit and decimal places.

**`dv: null` is not a shortcut.** Only alpha-tocopherol carries the vitamin E
daily value, and the % DV view sums what it is given. A daily value here would
add gamma milligrams to a target defined for alpha alone, which is the
double-counting the carotenoid columns already avoid for the same reason.

### The caveat that has been wrong for months

`src/app.ts` tells the reader, in the Methodology dialog:

> Most nuts and seeds contain more gamma-tocopherol than alpha, pumpkin seeds,
> pecans, walnuts and flaxseed especially

Measured against the source, **18 foods have more gamma than alpha**, not four.
The list omits pistachios at 20.41 against 2.86, pine nuts, Brazil nuts,
cashews, edamame, raspberries, blackberries, haricot beans, quinoa, green peas,
kidney beans, coconut, dried figs and sweetcorn.

This is prose describing the data that does not derive from it, which
`README.md` lists as a convention precisely because such prose drifts. It could
not derive from the data before, because the figure it describes was not in the
table. Adding the column is what makes the fix available, so the fix ships with
it: the list computes from the new column the way `FORTIFIED_FOODS` already
computes from the notes, and a test asserts it rather than pinning the current
wording.

The caveat's substance does not change. Vitamin E remains alpha only, and it is
still the form that carries a daily value and the one the body retains. What
changes is that the reader can now see the gamma figure in the column beside it
instead of being told a partial list of where it matters.

## Item 3: phytosterols

USDA id `1283`, `Phytosterols`, mg. `group: "plant"`, `after: "flavonols"`,
`dv: null`, `dp: 0`.

**The recorded reason for not shipping this was wrong twice over.** Both
`HANDOVER.md` and `README.md` said SR Legacy reaches "8 to 14" of these foods.
The handover already corrected that to 24. Measured against the mapped rows it
is **25, all non-zero**. Both figures need correcting where they appear, and the
"do not re-derive the 8 to 14" note in the open list goes with them.

**The real objection stands, and now has to go on the page.** The column is
dominated by three seeds and silent on three foods that certainly contain
phytosterols:

```
Sesame seeds     714 mg        Almonds    no figure
Sunflower seeds  534 mg        Walnuts    no figure
Pistachios       214 mg        Avocado    no figure
Macadamia nuts   116 mg
Coconut           47 mg
```

Sorting by this column ranks foods partly by who USDA assayed. That is true of
the flavonoid columns too, and the project's answer there was to ship the data
and state the limit rather than withhold it. Same answer here, on the same
terms: a caveat in the Methodology dialog naming the absences, computed from the
data rather than typed, so it cannot drift the way the vitamin E one did.

This is a reversal of a recorded decision, so the README says it was reversed
and why, rather than quietly appearing as though it had always been there.

## What is deliberately not in this spec

- **No total tocopherol column** and no combining alpha with gamma into one
  figure. They have different biological activity and only one has a daily
  value; a sum would be a number with no referent.
- **No beta or delta tocopherol, and no tocotrienols**, though SR Legacy carries
  all of them for these foods. Gamma earns a column because it is the dominant
  form in seeds and routinely exceeds alpha. The others do neither, and four
  more sparse columns would bury the one that matters.
- **No phytosterol breakdown** into beta-sitosterol, campesterol and
  stigmasterol, which SR Legacy also carries. The total is the figure with a
  dietary meaning, and the fractions are sparser still.
- **No change to `--fill-gaps`,** the conflict check, or the undifferentiated
  fallback marker.
- **No estimated rows.** Romanesco, freekeh and cavolo nero stay out, with the
  reasons already recorded in `tools/food-additions.json`. They would be the
  first invented figures in the table and `README.md`'s first convention forbids
  it.

## Tests

Each watched failing before it is trusted, per the project's convention.

1. **A pull never empties a cell.** Drive `cmdPull` against a food whose mapped
   row lacks the id, with a value already in the table, and assert the value
   survives. This is the rule as a property of the tool, and it fails against
   today's code with the destroyed value in the message.
2. **Every fat subset reconciles.** For all 131 foods, `oleic + palmitoleic` is
   at or below `mufa`, `ala + la` at or below `pufa`, and the three saturated
   fats at or below `satfat`. Fails today on six foods, which is the item being
   closed.
3. **The gamma-over-alpha list derives from the data.** Assert the rendered list
   contains pistachios, which the hand-written prose omits, and that its length
   matches a count computed from the table rather than a literal 18.
4. **Phytosterols read `n/a` for the 106 foods without a figure**, and the
   Methodology caveat names almonds, walnuts and avocado from the data.
5. **Both new columns carry a `why`,** which `build.mjs` already enforces, and
   appear in their intended group and position.

## Order of work

1. The never-blank rule in `cmdPull`, with test 1, before any data moves.
2. `mufa`, `pufa`, `satfat` into `KNOWN`; re-pull the fat group; test 2.
3. Gamma-tocopherol column; derive the vitamin E caveat; test 3.
4. Phytosterols column; its caveat; tests 4 and 5.
5. `README.md` and `HANDOVER.md`: the "8 to 14" and "24" corrections, the
   reversal of the phytosterol decision, the never-blank rule as a tool
   guarantee, and the fat re-pull moving off the open list.

Step 1 has to come first. Any other order does the destructive thing once
before the guard exists.
