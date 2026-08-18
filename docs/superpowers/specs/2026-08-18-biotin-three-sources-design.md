# Biotin across three sources

Written 2026-08-18, after the Phenol-Explorer assessment closed and the range
rule settled. The parent design is `2026-08-07-evidence-columns-design.md` and
its cell model, six states and reconciliation rules are unchanged here.
`tools/evidence/RECONCILIATION.md` Rule 5 is the reason this work exists: biotin
does not reconcile to a single value, spreading up to 29x on analysed figures,
so it is the best genuine three-source range the page can carry.

## The column is not thin because of the data

Biotin reaches 102 of 222 page foods: 83 single values, 8 ranges, 11
not-measured. The eight ranges are the whole of what Rule 5 predicted, and the
83 single values are mostly one source speaking alone.

The sources are not the constraint. MEXT carries a biotin figure for 90 foods,
CoFID for 652 plant rows and AFCD for 194 analysed rows. The constraint is the
joins:

| Source | How biotin reaches it | Foods reached |
|---|---|---|
| MEXT | `page-map-mext.json` | 102 |
| CoFID | `page-map-cofid.json` | **13** |
| AFCD | a hardcoded `ALT` table in `evidence.mjs` | **5** |

`page-map-afcd.json` already holds 33 reviewed foods, banked for inulin and
oligosaccharides. Twenty-one of them carry an AFCD biotin figure and the
generator reads none of them, because the biotin pass looks at `ALT` instead.

## The generator and the checker already disagree

`loadAttested` in `build.mjs:338-348` attests AFCD biotin for **all 33** mapped
foods. The generator writes MEXT's 80 for sunflower seeds while the checker holds
AFCD's 29 for the same slug and the same component. Nothing fails, because a
cell naming one source is checked against that source alone, but the two halves
of the build already hold different views of what evidence exists for this
column. Reading the same three maps in both is the fix.

## The structural limit

The biotin block sits inside the loop over `page-map-mext.json`
(`tools/evidence.mjs:177-201`). A food MEXT never assayed therefore cannot have
a biotin cell at all, whatever the other two sources hold. Walnuts, pistachios,
brazil nuts and wholewheat pasta each carry an analysed AFCD figure and have no
route to the page.

This matters more after widening than before it. Most foods that gain a CoFID or
AFCD biotin figure will have no MEXT row, so widening the maps under the current
structure would buy nothing for the review it costs.

## What is built

### A pass over the union of the three maps

The biotin block leaves the MEXT loop and becomes its own pass, iterating the
union of slugs from `page-map-mext.json`, `page-map-cofid.json` and
`page-map-afcd.json`. For each slug it gathers whichever candidates exist, MEXT's
`biotin` field, CoFID's `biotin_ug` by code, AFCD's `biotin_ug` by key graded
through `gradeDerivation`, and hands them to `reconcile()` unchanged. Where no
source has a figure but MEXT has a state, the state passes through as now.

`reconcile()` is not touched. The rules are settled and this pass only feeds them
more candidates.

The cell-building half is extracted as a pure function, `biotinCell`, taking the
gathered candidates and the fallback state and returning the cell.
`tools/evidence.mjs` runs its loops at import, so nothing inside it can be tested
today; `biotinCell` is testable the way `reconcile` and `spanCell` are.

The `afcd` half of the `ALT` table is deleted. Its five pairs are already in
`page-map-afcd.json` or move into it.

### CoFID's trace marker stops being discarded

CoFID marks a component it did not measure `N` and a trace finding `Tr`. The
current code tests for `N` and sends everything else through `parseFloat`, so the
63 rows reading `Tr` become `NaN` and then no data. Trace is one of the six
states and it is a finding. `Tr` passes through as `trace` where no source has a
figure, and is ignored where one does, since a trace cannot bound a range.

### The AFCD map gains a match grade

`page-map-afcd.json` maps slug to a bare key string, and `evidence.mjs:268`
defaults those to `exact`. The README's mapping rule requires one grade per
source, and new entries added for biotin will include `close` and `proxy` pairs
that must be visible to a reader.

The map moves to `{ "key": "F005177", "match": "exact" }`. The 33 existing
entries take `exact` explicitly. This is what the code has been asserting and
what the page has been showing, so it needs no new review, only that the
assertion stop being implicit.

### The proposal tool

`tools/biotin.mjs propose <category>` writes candidate pairs for one category of
page foods into `tools/evidence/proposed-page-map-cofid.json` and
`proposed-page-map-afcd.json`, and a review table into
`tools/evidence/BIOTIN-MAP-REVIEW.md`: the page food, its top three candidate
rows, the biotin figure and derivation each candidate carries, and a suggested
match grade.

Scoring stems plurals, because a first crude pass scored chickpeas and cashews as
having no candidate in either database when both hold them. It refuses to cross
raw and cooked, since a cooked page food matched to a dried row measures
hydration rather than disagreement. It penalises the traps this corpus sets:
CoFID holds almonds four ways and "Almonds, weighed with shells" at 23.7 against
64 for kernels is a different basis, not a different figure. Juice against fruit
and syrup-canned against plain get the same treatment.

**The tool proposes and never merges.** Approved pairs are applied to the real
maps by hand, the way every other reviewed map here was built. Automated name
matching stays refused, and a proposal is not a mapping until it has been read.

## The review, which is the real cost of this work

A crude token-overlap count puts roughly 136 page foods within reach of a CoFID
biotin row and 85 of an AFCD one, and that count misses plurals, so the true pool
is nearer 150 and 110. That is the dominant cost here, not the code.

Review runs in six batches by category: legumes, grains, nuts and seeds,
vegetables, fruit, other. Each batch is a proposal, a review, a merge and a
commit. The first batch proves the pipeline before the bulk of the review is
spent on it.

The scope is **where biotin exists**. A page food is proposed into a map only
where the candidate row carries a biotin figure. The maps stay partial and the
next component needing them will pay again, which is accepted: an entry that
earns its place is worth more than a complete map nobody has checked.

## What a lone figure does

It is printed with its source named, which is what cooked lentils already do with
CoFID's 0.4. Widening will add many such cells, and Rule 5 records that CoFID
runs low on vegetables, spinach at 0.1 against MEXT's 2.9 and AFCD's 2.5. The
source mark is the reader's warning, and it is the same treatment every other
single-source column here gets. Holding lone figures back would strip the
existing MEXT-only cells too and take the column below where it stands now.

## What changes on the page

Foods with no MEXT row gain a biotin cell for the first time: walnuts 19,
pistachios 24, brazil nuts 9.7 and wholewheat pasta 4.5, all analysed AFCD, plus
whatever the review approves.

Single values become ranges where the sources disagree. Banana's 1.95 becomes 0.3
to 2.5 with a median of 1.4, and sunflower seeds, mushrooms and kale go the same
way.

Almonds is the case to watch, and it needs the nuts batch to approve a CoFID
pair, since almonds is not in the CoFID map today. AFCD's mapped figure is 0.5
against MEXT's 60, which on two sources can only read as a range from 0.5 to 60.
CoFID holds 64 for whole kernels. With three candidates the median is 60, AFCD
sits 120x from it, the remaining two agree at 1.07x, and Rule 4 fires: 62
measured, with AFCD's 0.5 recorded as `disputed`. Until that pair is approved,
almonds is a range no reader should trust, which is an argument for taking the
nuts batch early.

Chickpeas does **not** change. AFCD's 2.5 is a Recipe, Rule 1 excludes it, and
MEXT's 8.9 stands alone. A cell that does not move is the design working.

AFCD's 18 analysed biotin zeros are absences, and `reconcile` now ranges an
absence against a finding rather than averaging it away. That is the fix of
2026-08-18 meeting the case it was written for.

## Guards

Widening a map widens `reach()` in `loadAttested`, and a cell citing a source no
map connects it to fails the build. A map merge and a regenerate therefore land
in the same commit.

`checkEvidence` continues to hold the line it already holds: one source must be
reproduced exactly, several must be spanned, a range must contain every attested
figure, and a range over three or more must carry its median.

Preparation is the sharpest edge, not sourcing. Scoring refuses raw against
cooked, and anything surviving as `proxy` is for the reviewer to reject.

## Testing

Test-driven. New unit tests in `test/tools.mjs`, which stands at 41, for
`biotinCell`: a food absent from the MEXT map still gets a cell; an AFCD Recipe
figure never reconciles; CoFID's `Tr` passes through only where nothing else has
a figure; the union covers a food that only one map holds.

`npm run build` must report no problems, and `test/smoke.mjs`, which stands at
145, covers the rendered page.

## Documentation

`RECONCILIATION.md` records the new coverage and that Rule 5's range is now built
from three maps rather than one map and a hardcoded table.
`tools/evidence/README.md` records the AFCD map's new shape, CoFID's `Tr`
handling, and the corrected `page-map-mext.json` row count.

## Not in this work

A general source and component table, so molybdenum, iodine and oxalate could
follow the same route, is not built. AFCD holds 490 analysed iodine rows and
iodine is Rule 3's own case, so the table will earn itself later. It would be
machinery for components this pass does not deliver, and iodine needs its own
preparation review first. The union pass is the refactor that table would need
underneath it anyway.
