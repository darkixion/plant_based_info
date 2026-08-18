# Phenol-Explorer: the page map, and why it is banked rather than used

Written 2026-08-17.

**The finding: Phenol-Explorer is not a second source for these columns.** It and
USDA Flavonoid Release 3.3 are both compilations, and for the foods this page
carries they compiled the same papers. **143 of the 178 cells a page map would
fill share at least one publication with USDA's own reference list for the same
food.** What is left after that, and after the preparation and completeness
rules, is 8 new figures and 2 genuine disagreements.

So the conversion of the five flavonoid columns to evidence columns is **not
done**, and the map is **proposed but not reviewed and not in use**. The
reasoning is at the end. Everything needed to change that decision in one
session is committed.

## What is committed

| file | what it is |
|---|---|
| `proposed-page-map-phenol-explorer.json` | 73 proposed pairs, 2 open questions, every entry `reviewed: false`, each cell annotated with what it would fill and whether it may be cited |
| `phenol-explorer-publications.json` | Phenol-Explorer's own list of the 1,308 papers behind it, which its composition download references by id and never names |
| `usda-flavonoids-references.json` | which paper each figure in USDA Release 3.3 rests on, 299 citations and a reference list per food |
| `tools/phenol_explorer.mjs` | `publications`, `coverage`, `overlap`, `annotate` |
| `tools/flavonoids.mjs refs` | rebuilds the USDA reference list from the cached `.accdb` |

`node tools/phenol_explorer.mjs overlap` reproduces the finding from those files
with no network.

## The map

**73 page foods matched, 2 open questions, 17 groups of rejections**, against 222
page foods and the 173 Phenol-Explorer foods with at least one complete flavonoid
subclass. The rejections are as much of the work as the matches, and three of
them are kinds rather than cases.

**Preparation.** Phenol-Explorer is almost entirely raw. Every cooked page food
is out: the cooked brassicas, the cooked roots, cooked green beans, baked potato,
cooked courgette. Its pulse rows are the dry seed, so every cooked legume is out
too, where the difference is mostly water.

**Completeness.** The rule `flavonoids.mjs` already applies to USDA, unchanged.
It withholds asparagus, globe artichoke, shallot, chestnut, ginger, chilli,
endive and cocoa powder, all of which have Phenol-Explorer rows. It also costs
two real figures: grapefruit reports 53 mg of naringenin and lime 43 mg of
hesperetin, and both are withheld for want of an eriodictyol row.

**The near-misses.** Chives against spring onion, napa cabbage against pak choi,
black radish against daikon, wild turnip tops against turnip greens, dark
chocolate against cocoa powder, maize grain against sweetcorn, dried oregano
against fresh. The "Pearl barley to pear" family. Each is named in the file with
its reason.

## The method rule, which had to be settled first

Phenol-Explorer stores two chromatography methods and the choice changes the
number by an order of magnitude. The plain `Chromatography` rows report the
**free aglycone**, near zero in any food that carries the compound as a
glycoside. The `Chromatography after hydrolysis` rows report the aglycone total,
which is what USDA measures and what our columns sum.

| | plain | after hydrolysis |
|---|---|---|
| Blackberry, quercetin | 0 | 0.87 |
| Yellow onion, quercetin | 0.28 | 12.65 |

So flavonols, flavones and flavanones come from the hydrolysis rows. Flavan-3-ols
come from the plain rows, because catechins are not glycosides and there are no
hydrolysis rows for them; the `Normal phase HPLC` rows there are the
proanthocyanidin oligomers and belong to another column.

Only the compounds USDA's own `NUTR_DEF` puts in each class are summed, so the
two databases sum the same thing. Phenol-Explorer's extra aglycones, galangin,
morin, rhamnetin, tangeretin and the rest, are left out.

## The provenance finding

Both databases publish the papers behind them, so this is checkable rather than
inferable, and `overlap` checks it: surname and year on both sides, allowing a
year either side.

```
178 cells the proposed map would fill
  share a paper with USDA's own reference list: 143
  independent of it:                            16
  food is not in Release 3.3 at all:            19
```

The shared papers, in order: Hertog 1992 (46 cells), Justesen 1998 (38), Harnly
2006 (33), Lugasi and Hovari 2000 (32) and 2002 (30), Arts 2000 (26), Mattila
2000 (15), then a tail.

It shows up as arithmetic. Phenol-Explorer's pecan is USDA's pecan to one decimal
place, on all eight compounds, because publication 655 there is Harnly 2006,
which is reference R110 here:

| pecan | Phenol-Explorer | USDA |
|---|---|---|
| (+)-Catechin | 7.2 | 7.24 |
| (-)-Epicatechin | 0.8 | 0.82 |
| (-)-Epigallocatechin | 5.6 | 5.63 |
| (-)-Epigallocatechin 3-gallate | 2.3 | 2.3 |

Hazelnut, pistachio and avocado do the same. Celeriac and kohlrabi agree
**exactly** with the page's current figures because both sides read Lugasi and
Hovari 2000, which is R170 here and publication 453 there.

**The rule this supports**, and it is written into the map as `citable` per cell:
a cell may cite Phenol-Explorer beside USDA only where the two do not share a
paper. Shared provenance bites only where USDA already has a figure, since that
is where citing both prints one measurement twice. An empty cell duplicates
nothing, so a new figure is citable whatever its provenance. **47 of the 178
cells pass.**

### Its PubMed ids cannot carry this

`sources.json` called Phenol-Explorer's 5,055 PubMed ids "the best provenance of
any source here". They are not, and the counter-example is exact: **all 121 rows
citing publication 655 carry PMID 22327611**, which is Landberg, Naidoo and van
Dam, *Diet and endothelial function*, Current Opinion in Lipidology 2012, a
narrative review that measured no food. Publication 655 is Harnly 2006, PMID
17177529.

The mismatch is **upstream**, in `composition-data.xlsx` as published, not in the
ingest here; the row was checked against the file downloaded fresh from
phenol-explorer.eu. A PubMed id here says the row can be traced, not that what it
traces to is a measurement. `sources.json` now says so.

## What is actually left

47 citable cells, of which 17 carry a figure above zero, of which four should be
refused: walnut flavonols, fig flavan-3-ols and the two open questions. That
leaves:

| page food | column | mg | from |
|---|---|---|---|
| grapes-raw | flavonols | 1.73 to 1.87 | Justesen 1998, Lugasi 2002, Hertog 1992 |
| grapes-raw | flavan-3-ols | 2.17 to 12.41 | Arts 2000, de Pascual-Teresa 2000, Karadeniz 2000 |
| grapefruit-raw | flavonols | 0.6 | Justesen 1998, Lugasi 2002 |
| lime-raw | flavonols | 0.4 | Justesen 1998 |
| **orange-raw** | **flavanones** | **44.83** | Mattila 2000, Justesen 1998 |
| persimmon-raw | flavan-3-ols | 0.8 | de Pascual-Teresa 2000 |
| cashews | flavan-3-ols | 1.1 | Harnly 2006 |
| pistachios | flavonols | 1.33 | Lugasi 2002, Harnly 2006 |

plus two genuine disagreements worth carrying as ranges, both from Bahorun 2004,
a Mauritian vegetable survey USDA did not use for this food:

| page food | column | Phenol-Explorer | page now |
|---|---|---|---|
| pak-choi-raw | flavonols | 48.7 | 6.42 |
| pak-choi-raw | flavones | 5.7 | 0.33 |

and about 30 analysed zeros, which are worth something: a measured absence is a
finding and a blank cell is not.

Two refusals, recorded so nobody pulls them later. **Walnut flavonols, 65.21 mg**,
is all myricetin from n = 2 with a minimum of 0 and a maximum of **456.5**, five
times kale's whole flavonol figure and unlike anything in either database.
**Fig flavan-3-ols, 0.12 against the page's 2.09**, is Phenol-Explorer's peeled
fig against our whole fresh one, which is a preparation difference wearing the
clothes of a disagreement.

## Why the columns were not converted

`RECONCILIATION.md` argued the conversion and the ingest belong in one pass, on
the grounds that converting alone changes 224 rendered cells and adds no data,
and that the second source is the entire point. That reasoning holds. What
changed is the second source.

The cost of converting, now that it has been looked at properly:

- 224 rendered cells change.
- **The five columns leave the chart.** `app.ts` offers only non-evidence columns
  there, deliberately: a bar length is a figure over the largest figure and a
  range has neither. Flavonols is chartable today and a smoke test is built on
  exactly that case, nuts against flavonols, where almonds have a figure and the
  other eleven do not.
- `FLAV_REACHED` in `app.ts` counts foods through `v`, which an evidence column
  is not in, so the sentence about how far the flavonoid data reaches would
  quietly go to zero.

Against 8 figures, 2 ranges and 30 zeros. **Not yet.** The columns and their
charts are left alone, and the work that would be hard to redo, the matching, the
two publication lists and the provenance rule, is committed so the decision costs
one session rather than five whenever it is next taken.

What would change the answer is a source that is **not** in USDA's reference
list. That is now a question this repo can ask directly, of any candidate, before
any of the work.
