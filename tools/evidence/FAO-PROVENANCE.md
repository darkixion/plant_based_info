# FAO/INFOODS PhyFoodComp: what it measured, and what it copied

Written 2026-08-19, asking of PhyFoodComp the question `FRIDA-PROVENANCE.md`
exists to ask and `PHENOL-EXPLORER-MAP-REVIEW.md` taught us to ask first: is
this a programme with its own analytical work, or a compilation of tables
already on this page?

**It is a compilation, and 291 of its 2,442 plant rows are IFCT 2017.** This
page cites IFCT in its own right, so those rows put one table on the page twice
under two names. They are now refused.

The question was asked late. The release has carried cells here since August
2026, and 27 of the 45 pairings banked before this document rested partly or
wholly on an IFCT row.

`node tools/fao_phytate.mjs provenance` reproduces every count below from the
two committed files, with no network and without the workbook.

## The tell

IFCT reports Brussels sprouts at 18.32 mg of phytate and spinach at 12.01.
PhyFoodComp row 1871, "Brussels sprouts, raw", reads 18.32, and row 1964,
"Spinach, raw", reads 12.01. Both carry `Biblioid: IFCT` and `Country: India`.

The page was already citing IFCT's 18.32 directly on `brussels-sprouts-cooked`,
and a proposed pairing would have put the same 18.32 on `brussels-sprouts-raw`
citing FAO. One measurement, two page rows, two source names.

## What the release actually holds

| rows | source | admitted? |
|---|---|---|
| 2,075 | primary papers, each with a country and often a sample count | yes |
| 291 | Indian Food Composition Tables 2017 | **no** |
| 38 | Paul and McCrae (1996), Foods of Rural Gambia, MRC Dunn Nutrition Centre | yes |
| 37 | Shaheen et al (2013), Food Composition Table for Bangladesh | yes |
| 1 | Sehmi (1993), National Food Composition Tables, Kenya | yes |

The four tables were found by reading all 324 bibliography entries rather than
by pattern. A pattern cannot do it: several primary papers here are titled
"Nutritional composition of ...", and one of the admitted tables is called
"Foods of Rural Gambia".

## Where the line was drawn, and why there

**Only IFCT is refused.** The reason is double counting, not quality: IFCT is
the one table in that list this page holds under its own source key, so a cell
citing `fao-phytate` over an IFCT row would present one source as two. The
Gambian, Bangladeshi and Kenyan tables are foreign tables this page draws
nothing else from, so admitting a row from one counts nothing twice.

Frida's rule refused foreign composition tables outright, as EuroFIR type B.
That line was considered here and costs more for less: it would take millet and
orange off the page, whose only surviving rows are Gambian, while removing no
double count. The two rules answer different questions, and the difference is
recorded here rather than smoothed over.

Measured against the 45 pairings held before this pass:

| line | kept whole | reduced | lost |
|---|---|---|---|
| refuse IFCT only, **chosen** | 19 | 12 | 14 |
| refuse IFCT, Bangladesh and Kenya | 19 | 10 | 16 |
| refuse every table, Gambia included | 18 | 9 | 18 |

## What it cost, and what it corrected

Fourteen foods lost their phytate cell outright, each because every row it
rested on was IFCT: sunflower seeds, flaxseed, coconut, celery, cucumber,
green and red bell pepper, ginger root, apple, strawberries, dates, cooked
courgette, cooked pumpkin and cooked beetroot.

Twelve more were trimmed and their notes rewritten. Some of those were being
flattered by the copy: banana read 10.06 to 22 over five rows, of which four
were IFCT, and now reads a single Malawian 22. Carrots read 17.03 to 88.2 over
three rows, two of them IFCT, and now reads 88.2 alone. Neither was a
disagreement between laboratories; both were one table appearing several times.

One thing it corrected outright. Avocado carried a `disputed` entry for row
1987, a figure of 356 against 11 from the row beside it, 32x apart. Row 1987 is
IFCT. What looked like an outlier needing a reviewer's judgement was a
double-counted table, and it is now refused rather than disputed.

## Why it was missed

The first extraction, `scratch/extract_fao_phytate_v2.mjs`, kept the food name,
the processing code, the species and the figure. It dropped `Country, region`,
`n`, `Biblioid`, `Publication year` and the Bibliography sheet the ids resolve
against, so nothing in this repository could have answered the question.

`tools/extract_fao_phytate.mjs` replaces it and carries all of them. Row order
is unchanged, so the row indices already banked in `page-map-fao-phytate.json`
still point at the same foods; that was checked row by row against the previous
file before anything was rebuilt.

The general lesson is the one the README already gives about a dataset's terms,
pointed at its contents instead: **ask a database what it measured before
mapping it, and prefer a field the publisher supplies over an inference.** The
publisher supplied `Biblioid` all along.

## Still open

- **`n` is sparse.** 957 of 2,442 rows carry a sample count. Frida's admission
  rule could lean on determination counts because every value had one; here a
  missing `n` is not evidence of anything and is not treated as such.
- **The other FAO release on this page has not been checked.**
  `fao-oligosaccharides.json`, 4 cells, comes from BioFoodComp and AnFooD and
  is a compilation by the same publisher, on the same pattern. Its workbooks
  are in `tools/cache/`. This is the obvious next provenance question.
