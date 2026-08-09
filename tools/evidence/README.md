# Evidence store

Extracted food-composition data for components USDA SR Legacy does not carry, kept
so that adding a food later costs nothing: the values are already here, for far more
foods than the page lists.

**Nineteen columns from this directory are on the page.** Phase 1 added three (soluble fibre, insoluble fibre and biotin), and phase 2a added 16 more. These 19 columns draw entirely on MEXT so far. The rest of the databases here remain raw material for phase 2b, which will map them to the page's foods to form ranges.

`sources.json` is the index. Every corpus file names its source by key, and every
source records country, year, method, quality and limitations.

## Why this exists

SR Legacy *defines* nutrient ids for chromium, molybdenum, boron, biotin, taurine,
inulin, pectin, beta-glucan, the oligosaccharides and soluble and insoluble fibre,
and publishes **zero rows of every one of them** across all 7,793 foods. That was
measured, not assumed: the same parser counts 7,793 rows for protein and 7,708 for
calcium. So every component here had to come from somewhere else.

## Files

| File | Rows | What it holds |
|---|---|---|
| `mext-2020-plant.json` | 1,125 | chromium, molybdenum, iodine, selenium, biotin |
| `mext-2020-fibre.json` | 1,106 | soluble, insoluble and total fibre by two methods, plus resistant starch |
| `mext-2020-sugars.json` | 717 | starch, glucose, fructose, galactose, sucrose, maltose, sorbitol, mannitol |
| `mext-2020-organic-acids.json` | 201 | 22 organic acids including oxalic |
| `afcd-r3-plant.json` | 612 | **inulin**, raffinose, stachyose, resistant starch, oxalic acid, iodine, molybdenum, biotin |
| `ifct-2017-table11.json` | 304 | **raffinose, stachyose, verbascose, ajugose**, phytate, saponins, phytosterol fractions, each with n and SD |
| `ifct-2017-table9.json` | 312 | **oxalate as total, soluble and insoluble**, plus citric, fumaric, malic, quinic, succinic and tartaric acids, each with n and SD |
| `cofid-2021-plant.json` | 456 | lumped oligosaccharide total, biotin |
| `usda-iodine-r4.json` | 478 | iodine with **n, mean, SD, min, max**; joins by NDB id |
| `frida-6.1.json` | 1,240 | **boron**, chromium, molybdenum, iodine, biotin, raffinose, fibre fractions, oxalic acid, each with min, max, median and n |
| `phenol-explorer.json` | 6,953 | 508 polyphenols over 458 foods, with mean, min, max, SD, n and **PubMed ids**; adds lignans and stilbenes |
| `page-map-mext.json` | 81 | reviewed mappings from this page's foods to MEXT rows |

## The evidence states

Every cell carries a `state`, because "no value" means several different things and
collapsing them throws away the most useful thing the data says:

- `measured` : a figure was reported
- `not-detected` : analysed, none found. **This is a finding, not a gap.**
- `trace` : the source says trace
- `estimated` : the source calculated or imputed it
- `not-measured` : nobody assayed it
- `no-data` : the source has no cell at all

A food with no entry has no data. Absence is never stored as zero.

## Mapping rule

Foods are joined to this page by **reviewed mapping only**, recorded in
`page-map-mext.json` with a `match` grade:

- `exact` : same species and same preparation (33 of 81)
- `close` : same species, preparation differs slightly (18)
- `proxy` : related species or notably different preparation (13). Must be visible
  to a reader if a value from one is ever shown.

None of these databases shares an id with SR Legacy, so there is no id join anywhere
here. Automated name matching is refused, for the reason the README already records
(Black beans paired with "Black pudding, boiled"). The Japanese data makes the same
point in a new alphabet: a substring search for `なし` (pear) matches `皮なし`
("without skin") in every sweet potato row.

## Preparation is the sharpest edge in this data

Not sourcing. Several components leach into cooking water or concentrate on drying,
so a correct value against the wrong preparation is worse than no value, because it
looks right:

| Component | Raw or dry | Cooked | Source |
|---|---|---|---|
| Oligosaccharides, red kidney bean | 3.6 g | trace | CoFID |
| Oligosaccharides, soya bean | 5.5 g | 1.1 g | CoFID |
| Inulin, chickpea | 1.7 g | 0.6 g | AFCD |
| Chromium, adzuki | 2 ug | 1 ug | MEXT |
| Chromium, tomato | trace (fresh) | 11 ug (dried) | MEXT |

Every legume on this page is cooked. IFCT and much of AFCD report foods dry.

## Known gaps and unfinished work

- **IFCT Table 9** (organic acids, with soluble and insoluble oxalic acid reported
  separately) and **Table 10** (individual polyphenols) are not extracted.
- **IFCT parsing covers 304 of 528 foods.** Rows whose names wrap in the PDF may be
  missing. Column anchors are read per page; an early global-anchor version shifted
  phytosterols one column left for rows with no oligosaccharide values, and was
  discarded rather than shipped. Eight rows were verified against raw text by hand.
- **No cross-source comparison has been done.** MEXT, AFCD, CoFID and IFCT overlap on
  many foods and have not been reconciled, so no "best value" or range has been
  chosen for anything. That is the next piece of work.
- **Not reachable from this environment**: Frida (Denmark), Fineli (Finland) and
  Ciqual (France) all blocked automated fetches. Each is known to carry relevant
  components and is worth a manual download.
- **Not yet checked**: NEVO (Netherlands), Korea, China, Brazil (TBCA), EuroFIR.
- **Full texts still unread**: Cabrera 2003 (legumes and nuts), Bratakos 2002 (Greek
  foods), Tinggi 1997 (Australian foods). Only abstracts were seen.
- **Chromium is parked** at the owner's request. The evidence is kept in
  `mext-2020-plant.json` and `sources.json`, and the finding is recorded below.

## Chromium, parked

Worth keeping because it took the most work and the conclusion is clean. Two modern
quality-controlled sources agree with each other and sit 10 to 50 times below the
older Western compilation, which is the signature of contamination rather than of
real variation:

| Food | Thor 2011 median (range) | Ręczajska 2005 | MEXT 2020 |
|---|---|---|---|
| Onion | 34.2 (1.67-134) | - | not detected |
| Celery | 7.0 (0.3-8.0) | - | not detected |
| Banana | 0.80 (0.001-16.4) | - | not detected |
| Apple | 3.25 (0.002-39.7) | 0.9 | not detected |
| Carrot | 1.74 (0.4-9.0) | 0.4 | 1 |

FSANZ says the same of its own chromium data: "Levels appear to be highly variable
and values presented in this database should be used with caution." Plant foods are
a poor chromium source and the high older figures are largely analytical artefact.
