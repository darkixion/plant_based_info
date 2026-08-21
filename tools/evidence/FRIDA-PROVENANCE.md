# Frida: the provenance question, and the licence

Written 2026-08-19. Companion to `PHENOL-EXPLORER-MAP-REVIEW.md`, which is why
this question gets asked before any pairing work rather than after.

**The licence is settled: Frida 6.1 is CC BY 4.0, and its figures may be
republished with attribution.** The wording and the required credit are at the
end of this document.

**The provenance answer is that Frida is both, and it says which is which.** It
is a national programme publishing its own analytical work, and it is also a
compiler of other countries' tables, and every value carries a number of
determinations and a named source that separates the two. Of its 873 biotin
values, **473 are admitted and 400 are refused**.

That is a different answer from Phenol-Explorer's. Phenol-Explorer had to be
banked whole, because it compiled the same papers USDA compiled and nothing in
the file said so. Frida can be admitted in part, because the file says so.

`node tools/frida.mjs provenance` reproduces every figure below from
`frida-6.1.json` and `frida-6.1-sources.json`, with no network.

## What is admitted, and what is refused

| component | cells | admitted | borrowed | undetermined | compiled | malformed |
|---|---|---|---|---|---|---|
| biotin | 873 | **473** | 146 | 209 | 45 | 0 |
| chromium | 920 | 766 | 80 | 64 | 10 | 0 |
| molybdenum | 650 | 474 | 105 | 62 | 7 | 2 |
| iodine | 1,210 | **639** | 195 | 92 | 284 | 0 |
| boron | 49 | 21 | 7 | 21 | 0 | 0 |

Four refusals, in the order the rule applies them.

**Malformed.** Both corn flakes molybdenum rows report `min=20` against
`max=3`. Refused rather than repaired, because nothing here can say which of
the two numbers is wrong.

**Borrowed.** A cell with no source id is one Frida carried over from a
different food; the published workbook gives it a `SourceFood` instead. There
are 146 such biotin cells, which is exactly the count of biotin rows carrying a
`SourceFood` in the workbook. Their determinations were made on the other food,
so a large `n` is the most misleading thing about them: green peas chromium
cites `n=21`, every one of them made on food 1310.

**Undetermined.** `n=0` is Frida saying it determined nothing and took the
number from elsewhere. 209 biotin cells.

**Compiled.** The source is named and is not analytical work. This is the
finding, because of which tables they turn out to be:

| refused cells | source | what it is |
|---|---|---|
| 77 | 2135 | The Swedish Food Composition Database 2017 |
| 64 | 2197 | Calculation of iodine content in bread |
| 44 | 2136 | The Norwegian Food Composition Table 2017 |
| 34 | 1004 | Computer calculation based on recipe |
| 24 | 1002 | Estimated value based on data for similar product |
| 13 | 1655 | "Natural zero value for content. Not analyzed" |
| 11 | 2145 | **Australian Food Composition Database, Release 1.0** |
| 11 | 2288 | NutriData, Estonia |
| 8 | 2140 | FOODfiles, New Zealand |
| 8 | 2141 | **the extended dataset based on PHE's McCance and Widdowson** |

**Three of those are already on this page under their own names.** 2141 is
CoFID, 2145 is AFCD, and 2289 is the CNF. Admitting them would have put one
table on the page twice, which is precisely how Phenol-Explorer failed. Here it
is caught by name rather than by inference.

**Source 1344 is the sharpest case.** It is McCance and Widdowson's *The
Composition of Foods*, 4th revised edition, 1978, and CoFID is the same work at
its 7th. It carries 144 biotin values, every one `n=0`, putting 30 distinct
numbers on 144 foods: 0 appears 57 times, 2 appears 12 times, 1 appears 10
times. Its celery raw 0.1, red cabbage raw 0.1, Brussels sprouts 0.4 and
pumpkin 0.4 are the CoFID figures exactly, because they are the same book. The
celery 0.1 that `RECONCILIATION.md` already argues about would have gained a
second vote it has not earned.

**What is admitted** is source types R (DTU and Danish government reports), AJ
(journal papers), P (Danish laboratory data not published), AB and X. An
unknown id is refused rather than assumed analytical.

## Two things about the file, before anyone maps it

**A mean can sit below its own minimum, and that is not a defect.** The mean
divides by every determination; `min` and `max` span only those above
detection. So a mean that counted non-detects as zero understates and lands
under its own floor. Raw pear chromium is 0.0231 against a `min` and `max` of
0.277, and 0.277 / 12 is exactly its `n`. Of the 65 cases where `min` equals
`max` and the mean is below it, **62 divide to exactly `n`**; the other three
divide to 2, 2 and 3, which is what 2, 2 and 3 detections would give. These are
admitted and marked `partial`. They are real figures and they are lower bounds.

**`n=0` is not a measured zero.** The corpus holds that a zero beats a trace,
because a zero is a measurement and a trace is not. That only follows where
something was determined. A Frida zero with `n=0` is the absence of a
measurement and must never reach the page as an analysed absence. Source 1655
is literally titled "Natural zero value for content. Not analyzed".

**The estimates are not harmless.** Celeriac carries biotin 0.1 from source
1002, an estimate from a similar product, while the Danish row beside it
carries 4.89 from 7 determinations. Admitting estimates would have put a 49x
error on the page.

## Two fields the English name does not carry

Added to `frida-6.1.json` on 2026-08-21, from the workbook's `Food` sheet,
which the value sheet does not repeat. Both are carried as written and neither
is scored.

**`nameDanish` says which row is which.** 24, 559 and 606 are all called
"Carrot, raw" in English and disagree on every component. In Danish they are
"Gulerod, **uspec.**", "Gulerod, **dansk**" and "Gulerod, **importeret**". The
qualifier was dropped in translation rather than absent, and it decides the
pairing: an unqualified page food takes the unspecified row. Cauliflower,
tomato, apple, brussels sprouts and asparagus carry the same word. Without this
field `page-map-frida.json` could not even record which carrot was banked,
since `name` reads "Carrot, raw" for all three.

**`foodEx2` says what was analysed.** It is right on 416 of the 417 rows whose
Danish name says raw, and the exceptions are worth the reading. **1292 is called
"Poppy seeds" in both languages and classified `PROCESS = Roasting`**; eight of
the ten rows Frida codes as roasted say so in their names and this is one of the
two that do not. **753 is called "Asparagus, all types, raw" in both languages
and classified "Canned or jarred legumes, PROCESS = Statical sterilisation"**,
which is the one flat contradiction in the release and also botanically wrong,
since asparagus is not a legume. That row's biotin is borrowed from the canned
asparagus row beside it.

**Neither field is given to the matcher.** FoodEx2 is a code someone assigned,
and 753 is what an assigned code can be worth. `foodEx2Flags` in
`tools/frida.mjs` reports a preserving step always, and a cooking step only
where the page food names no preparation at all, so a dried and hulled seed
does not carry a flag that says nothing. What it reports goes in front of a
reviewer; nothing is refused for it.

## A correction to `sources.json`

The boron key finding rested on three figures. Two survive and one does not:

- Wheat bran 270, `n=10`, source 1348, a journal paper. Stands.
- Wheat germ 250, `n=7`, source 1348. Stands.
- **Buckwheat groats 530, `n=0`, source 1356. Refused.** Source 1356 is
  FINKOST, the Finnish food composition databank of 1986.

Boron falls from 49 cells to 21. It is still the only source here carrying
boron on a fresh weight basis, so the column is still unblocked, by 21 values.

## The licence, checked 2026-08-19

Frida 6.1 is published at DTU Data under **CC BY 4.0**, DOI
`10.11583/DTU.32312844`. The dataset's own Readme sheet says so:

> Datasets and documentation for the Danish Food Composition Database can be
> downloaded from DTU Data's repository at https://doi.org/10.11583/DTU.32312844.
> The dataset is published under the open source license CC-BY 4.0.

> Data and texts from http://fcdb.fooddata.dk may not be copied or otherwise
> reproduced without clear source information.

The file-level licences confirm it: `FCDB_6.1_Dataset.xlsx` and
`FCDB_6.1_Dataset.ods` are CC-BY 4.0, while only the two documentation PDFs are
`© Technical University of Denmark 2026`. The Readme notes that the Danish text
is the legally valid one; the above is DTU's own English translation.

**So redistribution of derived values is permitted, with attribution.** The
credit DTU asks for:

> The Danish Food Composition Database (http://fcdb.fooddata.dk), version 6.1,
> May 2026. The Food Institute, Technical University of Denmark.

Short form: `© The Danish Food Composition Database (http://fcdb.fooddata.dk),
version 6.1, May 2026.`

Two things follow. Any page carrying a Frida figure must show that credit,
which is stronger than the citation the other sources need. And the disclaimer
is worth reading beside the provenance finding above, because DTU says the same
thing about itself:

> Data has therefore to some extent been extracted from other countries' food
> composition databases. The Food Institute can therefore not provide
> guarantees regarding the accuracy, order, timeliness or completeness of these
> data.

## Status

The admission rule is implemented and tested, the map is banked and the pass is
wired. **225 cells on the page now rest on Frida**, which makes it the second
largest source here after MEXT.

`node tools/frida.mjs propose` writes `FRIDA-MAP-REVIEW.md` and
`proposed-page-map-frida.json`, on the scorer `BIOTIN-MAP-REVIEW.md` uses, over
the rows the admission rule leaves standing. Of 222 page foods: **78 have a
candidate worth a decision**, 67 have only proxies, 20 are foods Frida holds and
has determined nothing about, and 57 it does not reach at all. That last number
was 62 until the scorer's -es rule was fixed: it stripped both letters off every
plural, so "Dates" stemmed to "dat" where "Date" stemmed to "date", and dates,
grapes, prunes, nectarines and Jerusalem artichokes were all reported as foods
Frida does not hold. Ten carried a
"look twice" line on the name and every one was the scorer's fault rather than a
judgement call; the faults are fixed. Two more carry one on the classification,
and those are real: a poppy seed coded roasted and an asparagus coded canned.
What that cost, and what it says about reading a generated proposal, is in
`FRIDA-BANKING-REVIEW.md`.

`page-map-frida.json` holds **77 reviewed entries**, banked 2026-08-21, each
carrying the row's English and Danish names so that a FoodID meaning something
else after a release is visible rather than silent. 23 are graded exact, 52
close and 2 proxy. Together they would bring **237 cells**: chromium 72, iodine
62, molybdenum 54, biotin 47, boron 2. The 78th proposal, asparagus, is refused.

It previously held 17 slug-to-id pairs in a shape with no state, no `match` and
no review, predating the discipline `BIOTIN-MAP-REVIEW.md` set. Those were
quoted into the review document rather than carried across a change of standard.
One of them was knowledge the matcher does not have: **flaxseed is Frida's
"Linseeds, raw"**, which admits a chromium determination, and no name scorer is
going to find that. It is in `ALIASES` in `tools/biotin.mjs`, with this page's
haricot bean for Denmark's white bean.

**The pass, wired 2026-08-21.** `tools/evidence.mjs` reads the map, refuses any
entry that does not say `"reviewed": true`, and reduces each row to one figure
per column through `fridaFigure`. Four columns already had an owner and Frida
joins each of them as one more national table: `biotinCell`, `iodineCell` and
`pairedCell` take it as a figure rather than as a row, because what one of its
cells may contribute is this file's rule to decide and not theirs.

**Chromium had no owner, and that is the change worth naming.** It was a row of
the uniform single-source table in `evidence.mjs`, MEXT and nothing else on 102
cells, while AFCD's chromium column sat there unusable: FSANZ disclaims it, so
it cannot corroborate anyone. Frida is the honest second source and admits more
of chromium than of anything else, 766 cells of 920. The column is now 134 cells,
69 of them citing Frida, and **12 of the 34 foods both sources reach disagree
beyond 2x**: flaxseed 2.3 against 25, kale 1 against 8.3, spinach 2 against 9.3.
RECONCILIATION.md's status table records it.

What each column gained:

| column | cells before | cells after | citing Frida |
|---|---|---|---|
| chromium | 102 | **134** | 69 |
| iodine | 130 | **145** | 58 |
| molybdenum | 116 | **134** | 51 |
| biotin | 142 | **147** | 45 |
| boron | 9 | **11** | 2 |

Twelve admitted Frida figures reach no cell, and all twelve are the rules
working rather than a loss. **Seven** are a determined zero or a figure below
rule 7's floor meeting another source's trace: a trace outranks a zero, and a
cell that shows no number may not name a source that reported one. **Five** are
rule 4 finding Frida's zero to be the outlier now that a third source exists to
arbitrate, and every one of those is kept in `disputed`, where the page can show
it. Nothing goes missing silently.

**What to question next: source 2179's iodine.** Six page foods moved from an
analysed absence to a range when Frida joined the iodine column, and five of the
six rest on one report, DTU's 2023 *Næringsstofindhold i frugter*. Their
detections are the striking thing:

| food | mean | detected | n |
|---|---|---|---|
| grapefruit, raw | 3.125 | 25 to 25 | 8 |
| mango, raw | 6.5 | 24 to 28 | 8 |
| honeydew melon, raw | 2.875 | 23 to 23 | 8 |
| kiwi, raw | 5.75 | 21 to 25 | 8 |
| pineapple, raw | 5.625 | 18 to 27 | 8 |

**No other banked iodine cell detects above 10 except seitan at 40 and parsley
at 4.3 to 47**, so these five are the whole of a cluster with a gap under it.
Parsley is the one figure that spans the gap, and its own spread of 4.3 to 47
over eight determinations says the same thing about the method. Five unrelated fruits detecting at 18 to 28 ug per 100 g, each on
two or three determinations out of eight, is the shape of a limit of
quantification around 20 rather than of five fruits containing that much iodine;
MEXT, AFCD and the FDA release each assayed some of the same fruits and found
none. Nothing is refused for it. The admission rule asks where a figure came
from and not whether it is plausible, and the page's answer to a disagreement is
a range naming both sides, which is what these now show. **But the report is
worth reading before this column is quoted**, and it is not cached here.

`build.mjs` carries a duplicate of the admission rule, because it may import
nothing but `node:*` and a checker that attested a compiled or borrowed figure
would let one pass unexamined. `test/tools.mjs` holds the two copies against
each other over every mapped food and every column.

Both evidence files are now rebuilt from the published workbook rather than
scraped from the old website, by `node tools/extract_frida.mjs`. The workbook
itself is not committed, for the reason `.gitignore` gives: upstream datasets
are fetched rather than redistributed. Download it from the DOI above and put
`FCDB_6.1_Dataset.xlsx` in `tools/cache/`.

The rebuild reproduces the scraped file exactly, on all 1,240 foods and all
4,447 cells, with no disagreement on a single value, determination count or
source id. What it adds is `sourceFood`, the column the scrape lost, and the
two food-sheet columns above. 538 cells carry a `sourceFood`. Every one of them
also has no source id and no cell has one without the other, so the proxy this
document previously relied on was exact; it is now stated outright instead.

## A figure can be admitted onto more than one food

`sourceFood` marks a value Frida carried over from another food, and the
admission rule refuses those. **It does not mark a figure that was pooled
across a group of foods and written onto each of them**, and Frida does that a
great deal. `node tools/frida.mjs provenance` now reports it: **64 groups over
202 cells**, where a figure, both its detection bounds, its determination count
and its source all agree across two or more foods.

The mechanism is plainest where the group is largest. **Chromium 4, detected
0.4 to 44, at n=85 from source 1532, sits on nineteen cuts of beef**; chromium
5.3 at n=126 sits on the pork cuts; chromium 0.052 at n=18 sits on eighteen
milks, creams and yoghurts. Those are not nineteen determinations of nineteen
cuts. They are one pooled determination of beef, and **the count is the size of
the pool rather than of the food**, which matters to anything that reads `n`.

Six of those groups reach a proposed pairing, and the clearest is **chromium
6.8, detected 0 to 27.6, at n=16 from source 1506, on olive oil, corn oil and
refined soyabean oil alike** — one vegetable-oil determination behind three
foods, and source 1506 is "Unpublished data". Nothing about the cell says so.

**Nothing is refused for this**, and `repeatedFigures` is a report rather than a
rule. Two foods really may have been measured alike, and only a reviewer can
say which. The test it applies is strict on purpose: reading the mean alone
finds sixteen groups among the proposals, and most are round numbers at small n
where coincidence is ordinary. Raw plum and raw kiwi both mean 0.6625 at n=8
over detections of 1.7 to 3.6 and 1.1 to 1.7, and 5.3 divided by 8 twice over
is no more than chance. Zeros are left out for the same reason and there are a
great many of them: a zero is what many separate determinations at or below
detection all look like.
