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

The admission rule is implemented and tested. **Candidates are now proposed and
no Frida value has reached the page.**

`node tools/frida.mjs propose` writes `FRIDA-MAP-REVIEW.md` and
`proposed-page-map-frida.json`, on the scorer `BIOTIN-MAP-REVIEW.md` uses, over
the rows the admission rule leaves standing. Of 222 page foods: **73 have a
candidate worth a decision**, 69 have only proxies, 19 are foods Frida holds and
has determined nothing about, and 61 it does not reach at all. Ten of the 73
carry a "look twice" line where the leading row names a preparation the page
food does not.

`page-map-frida.json` is now empty. It held 17 slug-to-id pairs in the old
shape, with no state, no `match` and no review, predating the discipline
`BIOTIN-MAP-REVIEW.md` set. Each is quoted into the review document above the
food it was for, rather than carried across a change of standard. One of them
is knowledge the matcher does not have: **flaxseed is Frida's "Linseeds, raw"**,
which admits a chromium determination, and no name scorer is going to find that.

**Nothing reads the map yet, and that is deliberate.** A pass wired against an
empty map writes no cells and cannot be tested against anything, so it waits
until there are banked pairings to test it on. What exists is the rule, the
proposals and the file's shape.

Both evidence files are now rebuilt from the published workbook rather than
scraped from the old website, by `node tools/extract_frida.mjs`. The workbook
itself is not committed, for the reason `.gitignore` gives: upstream datasets
are fetched rather than redistributed. Download it from the DOI above and put
`FCDB_6.1_Dataset.xlsx` in `tools/cache/`.

The rebuild reproduces the scraped file exactly, on all 1,240 foods and all
4,447 cells, with no disagreement on a single value, determination count or
source id. What it adds is `sourceFood`, the column the scrape lost. 538 cells
carry one. Every one of them also has no source id and no cell has one without
the other, so the proxy this document previously relied on was exact; it is now
stated outright instead.
