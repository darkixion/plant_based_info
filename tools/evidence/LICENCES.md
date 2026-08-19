# What each source permits, and the two places this repository exceeds it

Checked 2026-08-19, against each publisher's own terms rather than a summary of
them. This settles the note the phase 1 spec left open under "Deliberately not
done", which said licensing "must be settled before `evidence.json` is
committed". `evidence.json` was committed before it was settled, so this
document is late, and two of its findings need a decision rather than a record.

Per-source wording is in the `licence` field of `sources.json`. This file is the
summary and the two problems.

## The sources carrying cells on the page

| source | cells | terms | clear? |
|---|---|---|---|
| MEXT 2020, Japan | 1,553 | Government Standard Terms of Use, stated compatible with CC BY 4.0 | yes |
| AFCD R3, Australia | 114 | **CC BY-SA 3.0 AU**, ShareAlike, plus a required data statement | **no** |
| CoFID 2021, UK | 72 | Open Government Licence v3.0 | yes |
| USDA proanthocyanidins R2 | 62 | US government work, public domain | yes |
| FAO/INFOODS phytate | 54 | © FAO and CHRCO, **non-commercial only** | **no** |
| USDA/FDA/ODS-NIH iodine R4 | 38 | US government work, public domain | yes |
| IFCT 2017, India | 18 | © NIN; quoted with attribution, tables no longer held | resolved |
| USDA glucosinolates R1 | 14 | public domain | yes |
| USDA Foundation Foods | 9 | public domain | yes |
| TBCA 2019, Brazil | 5 | citation required, commercial use by arrangement | **no** |
| "eurofir" | 5 | not a EuroFIR download at all, see below | n/a |
| FAO/INFOODS oligosaccharides | 4 | the same FAO non-commercial terms | **no** |
| CNF, Canada | 3 | Open Government Licence, Canada | yes |
| Frida 6.1, Denmark | 0 | CC BY 4.0, see FRIDA-PROVENANCE.md | yes |

**PhyFoodComp is a compilation, and 291 of its 2,442 plant rows are IFCT 2017.**
Those rows are now refused, so no cell citing `fao-phytate` rests on a table
this page holds under another key. FAO has whatever right it needed to compile
IFCT; the problem this solves is double counting rather than licensing, but it
lands on the same table, and `FAO-PROVENANCE.md` records it. The IFCT count
above fell from 21 to 18 in the same pass, three dry-basis phytate figures
having been withdrawn in favour of cooked measurements from primary papers.

**BioFoodComp and AnFooD are compilations too, and neither carries a table
this page holds by another name.** All 157 rows behind the 4 oligosaccharide
cells resolve to primary papers, so the question that landed on IFCT above
finds nothing here. `FAO-OLIGOS-PROVENANCE.md` records it. The terms are
unchanged either way: both workbooks are © FAO and non-commercial, and so is
the bibliography now committed beside them.

Roughly 25 further cells cite individual journal papers. Those are numeric
findings quoted with attribution, which is ordinary scholarly citation rather
than redistribution of a dataset, and they are not treated here.

## Problem one: IFCT 2017, resolved 2026-08-19

Its front matter says, in full:

> The use and dissemination of the data in this book is encouraged. This
> publication can be reproduced for personal use with full acknowledgment of
> the source. However, no part of this publication can be stored or reproduced
> in any electronic format for creating a product without the prior written
> permission of the National Institute of Nutrition, Hyderabad.

The repository used to do both things that sentence names: `ifct-2017-table9.json`
held 312 rows and `ifct-2017-table11.json` held 304, the whole of both tables,
to use eight foods.

**Both files are deleted.** What remains is `ifct-2017-cited.json`, seven rows
carrying the twenty-one figures the page actually cites, each with the IFCT
code and name it came from and the full citation. That is quoting measured
values with attribution, which is what the 33 other single papers here already
do and what NIN's own sentence encourages. It is not storing the publication.

Searching for a replacement found no open re-release of IFCT by NIN or ICMR.
The GitHub, npm, Zenodo and Kaggle copies are third-party redistributions whose
own MIT or AGPL licences say nothing about NIN's rights, which is the same
mistake in a different coat. Independent measurements of the same components do
exist and some are CC BY, notably Margier 2018 for cooked lentil and chickpea
phytate, but none reaches all eight foods on an edible-portion fresh-weight
basis, and several otherwise good papers report dry matter, which this corpus
already refuses for the reason the USDA boron rows were refused.

**One pairing was withdrawn rather than kept.** Black-eyed peas were paired to
IFCT B007, which is *Field bean, black (Phaseolus)*. Black-eyed peas are *Vigna
unguiculata*, which IFCT carries as B005 and B006, cowpea brown and white. The
pairing was made on the word "black", the exact failure the README warns about
with "Black beans" and "Black pudding, boiled", and it was banked against a row
whose name had not survived extraction, so no reviewer could see what they were
agreeing to. It put a phytate of 1.63 mg on the page beside cowpea's real 550
and 573. Re-pairing to B005 or B006 is a human's to bank.

## Problem three: AFCD carries ShareAlike, and a statement we do not ship

Corrected 2026-08-19, after a first pass read the FSANZ site-wide copyright page
and recorded CC BY 4.0. The database has its own Data User Licence Agreement and
it governs: **Creative Commons Attribution-ShareAlike 3.0 Australia**. Two
obligations follow that CC BY 4.0 would not have imposed.

**ShareAlike.** Any derivative work must be distributed only under the same
licence. 114 cells rest on AFCD, so `evidence.json` is arguably such a work, and
it currently ships under MIT. That count was 58 until the iodine column was
rebuilt over three databases on 2026-08-19 and AFCD's iodine reached 56 more
foods, which does not change the question but does double what rests on the
answer. It is the largest single unresolved licence exposure here.

**A required statement.** Every distributed copy must carry a Limitation of Data
Statement noting that the nutrient composition of foods and ingredients varies
substantially between batches and brands. The page does not carry it. That one
is cheap to fix and worth fixing whatever else is decided, because it is true and
the page is about exactly that variation.

The lesson generalises: a publisher's site-wide copyright page is not authority
for a specific dataset. Read the dataset's own terms.

## Problem two: the MIT licence promises more than the data allows

`LICENSE` is MIT and covers the repository as a whole. MIT grants anyone the
right to use, sell and sublicense the contents. Three of the sources inside do
not permit that:

- **FAO** phytate and oligosaccharides, 50 cells, are non-commercial, with
  commercial rights obtainable only from `copyright@fao.org`.
- **TBCA**, 5 cells, asks that commercial use be arranged with its coordinators.
- **IFCT**, above.

So a downstream user who took the repository at its word and built something
commercial would be relying on a permission this repository cannot give. The
usual fix is a short note in `README.md` and `LICENSE` saying that MIT covers
the code, and that files under `tools/evidence/` and `src/data/evidence.json`
carry their upstream terms, which `sources.json` records per source. That note
does not exist yet.

## A smaller thing, not a licensing one

The five cells citing `eurofir` are not from EuroFIR. They sit in
`research.json` with matches reading "Estimated from literature" and "Mean of
3.0-8.0g", against beta-glucan and ergothioneine for rolled oats and white
mushrooms. `eurofir` is being used as a label for a literature impression, which
is the one thing the evidence columns exist to stop. Worth a look on its own
account.

## What was verified, and how

Each was read from the publisher, not from a search summary:

- **MEXT**: the site terms at `mext.go.jp/b_menu/1351168.htm`, plus the food
  composition index page, which says the data may be used freely and asks for
  the edition to be named.
- **CoFID**: the gov.uk publication page's licence statement.
- **AFCD**: the FSANZ copyright page said CC BY 4.0, which was wrong for the database. The AFCD's own Data User Licence Agreement governs and is CC BY-SA 3.0 Australia. Corrected 2026-08-19; a site-wide copyright page is not authority for a specific dataset.
- **CNF**: the open.canada.ca dataset record.
- **FAO**: the front matter of PhyFoodComp 1.0 itself. FAO's CC BY 4.0 open
  data policy covers its corporate statistical databases; this is a food
  composition product and carries the older non-commercial permission instead.
- **IFCT**: page 2 of `IFCT2017.pdf`.
- **Frida**: the dataset's own Readme sheet and the DTU Data record.
