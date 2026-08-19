# FAO/INFOODS BioFoodComp and AnFooD: what they measured

Written 2026-08-19, putting to the second FAO release the question
`FAO-PROVENANCE.md` put to the first. PhyFoodComp turned out to be a compiler
carrying 291 rows of a table this page cites in its own right, and
`fao-oligosaccharides.json` is the same publisher on the same pattern, so the
question had to be asked again rather than assumed answered.

**The answer is the other one. All 157 rows cite a primary paper.** No food
composition table appears anywhere in the pool, nothing is refused, no cell is
withdrawn, and the four figures the page carries stand as they are.

That is worth stating plainly, because a source that survives the question is
not the same as a source that was never asked, and until today this one had
only ever been the second.

## What the pool is

The extraction takes three columns, RAFS, STAS and VERS, and nothing else, so
the rows this page can ever draw on from these two workbooks are exactly the
157 in `fao-oligosaccharides.json`: 134 from BioFoodComp 4.0 and 23 from
AnFooD 2.0, 156 of them legumes and one brown rice. Between them they carry 412
readings, 405 measurements and 7 analysed absences.

They resolve to **25 references, every one a journal paper**, through 28
release-and-id pairs. Three ids appear in both workbooks and mean the same
paper in each. The largest:

| rows | reference |
|---|---|
| 20 | Longe (1980), carbohydrate composition of cowpea varieties, Food Chemistry |
| 16 | Katoch (2013), rice bean, Journal of Food Science |
| 13 | Barampama and Simard (1993), dry beans grown in Burundi, Food Chemistry |
| 9 | Attia et al (1994), cooking and decortication of chickpea, Food Chemistry |
| 8 | Campos-Vega et al (2009), chemical composition of common bean |
| 7 | Vadivel et al (2011), velvet bean meal, Animal |
| 7 | Mubarak (2005), mung bean under home processing, Food Chemistry |
| 6 | Sreerama et al (2010), milled fractions of chickpea and horse gram, Journal of Agricultural and Food Chemistry |

Every row names a country, and India, Nigeria and Egypt supply 113 of the 157
between them. 78 carry a sample count, better than the 957 of 2,442
`FAO-PROVENANCE.md` records for PhyFoodComp and still not enough to lean on: a
missing `n` is not evidence of anything, here as there.

None of the 25 is a paper this page cites under its own key, so there is
nothing counted twice at the paper level either. The page's other two sources
for this family, Biesiekierski (2011) and the USDA Foundation Foods, are
nowhere in the pool.

The bibliographies are now committed as `fao-oligosaccharides-sources.json`,
1,286 entries across the two releases, so the question can be re-asked here
without the workbooks. There is no command to run: `test/tools.mjs` holds the
property directly, asserting on every run that every row's reference resolves,
which is the check the 23 blanks below would have failed, and that every row
index banked in `page-map-fao-oligos.json` still exists and still carries the
component it was banked for.

## The 23 rows that could not have answered

The question was nearly unanswerable for a sixth of the pool, for the sake of
one capital letter.

AnFooD 2.0 heads its reference column `BiblioID` on sheets 03 through 06, 11
and 12, and `Biblioid` on sheets 01 and 02. BioFoodComp heads it `Biblioid`
throughout. `tools/extract_fao_oligos.mjs` matched the header exactly, so
**every one of the 23 AnFooD rows was extracted with a blank `biblioid`**, and
they are all on sheet 03.

Row 144 is one of them, and it is not an idle row: it is the Portuguese
pressure-cooked chickpea that two of the page's four oligosaccharide cells rest
on. Its reference is `pu248`, Sarmento et al (2014), which is what the map's own
note already said in prose when it called the row Portuguese. The prose was
right and the data was empty.

The header match is now case-insensitive. Re-extracting changes those 23 fields
and nothing else: row order, food names, figures, water, country and `n` are
byte-identical to what was committed, which is the property the banked row
indices in `page-map-fao-oligos.json` depend on. Nothing downstream moves
either, and for once that is the right outcome rather than a suspicious one.
A `biblioid` feeds no cell, so `evidence.json` and `index.html` are unchanged
by a data change that fills in a sixth of the file.

This is the same failure as PhyFoodComp's dropped `Biblioid` column, one step
smaller. There the field was never read; here it was read under a name only one
of the two workbooks uses. Both times the repository held a file that looked
complete and could not answer for itself, and both times the publisher had
supplied the answer all along.

## Why this release answers differently

Inference rather than finding, and recorded as such: national food composition
tables report phytate, which is why IFCT is all through PhyFoodComp, and they
almost never report the raffinose family split into its three members. A column
headed VERS is filled from the research literature because there is nowhere
else to fill it from. The property that made these workbooks worth extracting,
that verbascose carries its own INFOODS tag, is probably the same property that
keeps compiled rows out of them.

## What is still open

- **The check covers the pool, not the workbooks.** BioFoodComp holds 7,071
  plant rows and AnFooD 961, and at least one national table is in there:
  `fr55`, the Chinese Academy of Medical Sciences' 1991 tables, on 53 rows.
  None of those rows carries an oligosaccharide figure, so none is in the pool.
  If another component is ever taken from these workbooks, the question has to
  be asked again of whatever rows that pass returns, and the bibliographies are
  now committed so it can be.
- **Verbascose is banked and reaches nothing.** The map gives row 144's
  0.42 g per 100 g,
  and the column was removed from the page in an earlier pass because it had
  one value and no prospect of a second, every other source reporting the
  raffinose family on a dry-matter basis for raw seed. The finding survives in
  the data whether or not the column comes back, and the pass below now reports
  it on every run rather than passing over it: `chickpeas-cooked.verbascose:
  banked, and the page has no verbascose column`.
- **Only 5 of the 157 rows are mapped**, all of them legumes, against two page
  foods. Every row now names its paper and its country, so more pairings can be
  proposed against `page-map-fao-oligos.json`. A tool may propose one and only
  a human may bank one.

## What owning the column changed

The last open defect here, that the generator did not own these cells, is
closed. `tools/fao_oligos.mjs` holds the cell rule and `tools/evidence.mjs`
writes the columns from the map, so a mapping deleted from
`page-map-fao-oligos.json` now takes its cell with it instead of leaving it
standing. Deleting the cannellini bean entry and re-running drops both of its
cells and reports each one, which is what the phytate column has done since
`986209e` and what this one could not.

Three differences from the phytate pass, each forced by these releases rather
than chosen:

- **The mapping is per component**, so the withdrawal is too. A food may hold
  raffinose from here and stachyose from somewhere else, and only the cells
  this source is the sole author of are its to withdraw.
- **Nothing is refused.** There is no admission rule in `fao_oligos.mjs`
  because the answer above came back clean, and an empty refusal list would
  read as a rule that had been applied rather than as a question that had been
  answered.
- **An analysed absence enters the span as zero.** 7 of the 412 readings are
  `nd`, which is a finding and the widest disagreement there is; filtering it
  out with the blanks is how AFCD's 74 ug of iodine in rolled oats against
  MEXT's not detected once printed as 74 alone.

Regenerating changed three figures and no cell: `0.8027594999999998` became
`0.802759` and the chickpea raffinose bounds lost the same float artefact,
because the hand-written cells had never been through `spanCell`'s rounding.
A column that reproduces itself to the sixth decimal is the evidence that the
hand-written cells were right, which is the outcome worth having and not one
that could be claimed before the pass existed.
