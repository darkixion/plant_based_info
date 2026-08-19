# The three iodine databases: what each of them measured

Written 2026-08-19, putting to iodine the question `FAO-PROVENANCE.md` put to
PhyFoodComp and `FAO-OLIGOS-PROVENANCE.md` put to BioFoodComp. The column had
carried MEXT alone since it was created, which meant `RECONCILIATION.md` rule 3
described a conflict the page had no way to show.

**All three sources are primary.** None of them is a compiler, none of them
carries a table this page already cites, and nothing is refused. What follows
is what each one can and cannot answer for.

## USDA, FDA and ODS-NIH Release 4.0, and why it had been sitting unread

`usda-iodine-r4.json` has been in this directory since the biotin work and
nothing read it: not `tools/evidence.mjs`, not `build.mjs`, and it was not in
`src/data/sources.json`. `README.md` in the repository root already described
it as the third source that settled the oats case. It had never reached a cell.

478 foods, in ug per 100 g. Every row names the programme that ran the assay
and the years it ran: **340 FDA, 85 USDA, 53 both**. 427 carry a standard
deviation and 440 a minimum and maximum. The years run from 2003 to 2023 and
cluster on 2016-2020, which is the FDA Total Diet Study window.

It is the only iodine source here that says **how many samples a figure rests
on**, and the only one that reaches this page without anyone matching a name.

### The join, which is three ids and no judgement

The release is keyed by NDB number. SR Legacy's own crosswalk maps `fdc_id` to
NDB, and every page food already carries a human-checked `fdc_id` in
`usda-map.json` or `tools/food-additions.json`. So the chain is page food ->
fdc_id, reviewed -> NDB, USDA's own -> release row, and a pairing it makes is
the same pairing three times over. Nothing is matched by name anywhere in it,
which is why `node tools/iodine.mjs map` may be run rather than reviewed by
hand. It is the chain `tools/flavonoids.mjs` already walks.

**40 of 222 page foods reach a row**, and all 40 are FDA rows carrying n and a
range, over **1,006 samples between them**. Six of the 40 have iodine from this
release and nowhere else: cannellini beans, collard greens, olive oil, olives,
pinto beans and rye bread.

The result is written into the corpus as a `page_slugs` list per row, the way
the proanthocyanidin release carries its mapping, so there is no map file to
drift from it.

### What the join cannot reach, and what that costs

**94 of the 478 rows carry no NDB at all** and are unreachable this way. Nori is
one of them, and it is the corroboration this column would most like to have:
the release gives dried nori **2,316.7 ug at n=3** against MEXT's 1,400, which
is agreement within a factor of two on the largest figure in the column. It is
a pairing a human may bank and a tool may not.

The rest are near misses of a kind no id can fix, and each is a real difference
rather than a defect:

| page food | release row | why it does not join |
|---|---|---|
| brown rice, cooked | Rice, brown, cooked, 0.0 at n=28 | the page's row is NDB 20037, long-grain; the release measured 20041, medium-grain |
| oats, rolled, dry | Cereal, oatmeal, plain, cooked, 0.2 at n=10 | the release has no dry oat row. Converting a cooked figure to a dry basis is the inference this repository refuses |
| tofu, firm | Tofu, firm, plain, drained, 0.0 at n=1 | different SR row, and n=1 |
| broccoli, cooked | Broccoli, fresh/frozen, boiled, 0.5 at n=35 | the page's fdc_id is a different boiled-broccoli row |

Brown rice and oats are the two cells the third source would have settled, and
neither is settled. They stand as ranges: **0 to 9.8** and **0 to 74**.

### The two traps in this release, and why neither reached a cell

Iodine in a processed food is often the salt rather than the food.

- **Iodate dough conditioner.** White bread reads 1.8 ug without it and
  **592** with; the hamburger bun 2.4 against **1,060**. The release marks these
  with an asterisk on the NDB number, `18069*` beside `18069`, which the
  padding in the join leaves six characters long and unable to collide with the
  plain row. No conditioner row reached a page food.
- **Iodised cooking salt.** Pasta boiled in it reads **22.4** against 0.0 for
  whole wheat pasta cooked without. The page's wholewheat pasta joins the
  plain row.

Two cells the page now carries are still salted foods and the figures should be
read as such: **canned ripe olives at 2.1** are brined, and **rye bread at 0.6**
is baked with salt of unknown origin.

### One thing the extraction dropped

The release carries footnotes, and eight of its descriptions still end in the
marker: `Potato, peeled, boiled1`, `Bread, multigrain5`, and so on. The
footnote text itself was not extracted. None of the eight reaches a page food,
so nothing here rests on a row whose qualification is missing, but the same
sentence has been written twice already in this directory about two other
releases and it belongs here too: **an extraction that keeps a footnote marker
and not the footnote has kept the question and thrown away the answer.**

## AFCD Release 3: analysed, but analysed at the wrong grain

AFCD reaches 72 page foods through `page-map-afcd.json` and now supplies iodine
to 58 cells. Its 709 extracted plant rows all carry an iodine figure, 490 of
them on rows marked `Analysed`.

**The derivation is per row, not per component.** `Analysed` means the row was
analysed, not that iodine specifically was, and this extraction holds no finer
answer. AFCD publishes two workbooks and the second, `AFCD Release 3 - Nutrient
details.xlsx`, is where a per-component answer would live if one exists. It is
not cached here and the question is open.

Two consequences, both live:

- Every cooked vegetable row is a `Recipe` and every raw one `Analysed`, so the
  derivation is close to a preparation flag. `gradeDerivation` demotes Recipe,
  Borrowed, Imputed, Estimated and Label Data to `estimated`, which is what
  keeps AFCD's calculated 0.6 for cooked millet from contradicting MEXT's
  assayed absence. RECONCILIATION.md rule 3 already called that one an
  artefact; the generator now agrees with it without being told.
- FSANZ's own caveat, quoted in `sources.json`: *"Blank and zero are not
  distinguished as cleanly as in MEXT: absence of a value is a blank cell, but a
  reported 0 may be an assumed zero."* 210 of the analysed rows read zero. The
  page cannot tell which of them were assayed, so it treats a zero as the
  figure the publisher printed and never as a claim of absence in its own
  right. Where MEXT says not-detected and AFCD says 0, the cell reads **none
  detected** and names both: the finding is MEXT's and AFCD corroborates it.
  Where AFCD's zero is alone against two findings, rule 4 has the third source
  it needs, and raw celery now carries `disputed: afcd-r3 0` against Japan's 1
  and the FDA's 1.7 at n=35.

## MEXT 2020: unchanged, and still the spine of the column

94 of the 130 cells name it, more than the other two together. It is the only
source of the three that marks an absence apart from a zero, which is what lets
the column say **none detected** for 44 foods rather than printing 0 and
leaving a reader to guess whether anyone looked. It is also the only source for
the two seaweeds, at 200,000 and 1,600 ug, and for nori at 1,400.

Its limitation is the one `nutrients.json` already states in the column's own
`why` text: iodine tracks the soil and the irrigation water, so Japanese
figures do not transfer. That is an argument for more sources, not fewer, and
it is the argument this work acts on.

## The two rules iodine forced, which turned out not to be iodine's

Both are `nationalCell` in `tools/reconcile.mjs`, as rules 6 and 7, and both
are the same rule seen twice. They were written here and moved the same day:
molybdenum and oxalate needed them the moment AFCD's columns for those were
read, because it is MEXT marking an absence in words against AFCD writing the
number 0 that forces them, not anything about iodine.

**A numeric zero corroborates a source's finding of absence and never
overrides it.** Almonds are not-detected in Japan, 0 in Australia and 0 over
three FDA samples: the cell reads none detected and names all three. Sesame
seeds are a trace in Japan against AFCD's 0, and a trace is a finding of
presence, so it stands. Written the other way round the column would have
turned 30-odd laboratory findings into the number 0.

**A ratio is meaningless near zero, so rule 3 needs a floor.** Half a
microgram, which is both where the FDA's assay stops and below what a column
with `dp: 0` can print. Without it every fruit in the release came out as a
conflict: raw apple was AFCD 0, FDA 0.1 at n=35 and MEXT not-detected, which
reconciled to the range 0 to 0.1 and printed as **"0 (0 to 0)"**. Twelve
ranges were in that state and nineteen figures printed as 0 without being one.
Rule 4 was equally confused: raw banana is AFCD 0.4, FDA 0.2 at n=35 and MEXT
not-detected, and it dropped Japan's finding as a tenfold outlier over a fifth
of a microgram.

Nothing on this page sits awkwardly near the floor; the next figure above it is
celery at 1.7. Celery is also the one disputed zero that survives, and it is
the real one.

A figure below the floor and above zero is written as a **trace**, because a
presence too small for the page to number is what a trace means, and printing
0.2 as "0" is a claim of absence the source did not make. `test/tools.mjs` has
refused that shape since the CoQ9 and melatonin cells were found in it.

The floor belongs to the component rather than to the rule, which is why
`nationalCell` takes it as an argument. Half a microgram is nothing for iodine
and everything for oxalate, whose column is measured in grams.

## What this changed

| | before | after |
|---|---|---|
| iodine cells | 102 | 130 |
| resting on more than one source | 0 | 45 |
| carrying a sample count | 0 | 21 |
| ranges | 0 | 16 |
| MEXT / AFCD / USDA r4 | 102 / 0 / 0 | 94 / 58 / 38 |

**Rolled oats now read 0 to 74, naming Australia and Japan.** That sentence has
been in `RECONCILIATION.md` since the rule was written and on the page since
today.
