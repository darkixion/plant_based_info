# FAO phytate: the pairings banked, and the ones refused

Written 2026-08-19, when the phytate column was extended and then cut back by
what the extension turned up. Companion to `FAO-PROVENANCE.md`, which records
the finding, and to `LICENCES.md`, which records what the release permits.

The order of events matters, because the second step invalidated most of the
first:

1. **54 pairings were proposed**, on a rule of same species at the same
   preparation, from FAO/INFOODS PhyFoodComp 1.0.
2. **The release was then asked where its figures came from**, which nobody had
   done. It is a compilation, and 291 of its 2,442 plant rows are IFCT 2017,
   a table this page cites in its own right. **30 of the 54 proposals rested
   entirely on IFCT rows and were refused**, and 7 more were trimmed.
3. **24 survived. 23 were banked**, wheat bran being declined by the owner.
4. The same check removed 14 pairings that had been on the page since August
   and trimmed 12 more. `FAO-PROVENANCE.md` has that half.

Net: the map went from 45 pairings to 54, phytate from 52 page foods to 58, and
every remaining cell rests on a primary analytical paper rather than on a table
this page already carries.

A tool proposed each pairing and a human accepted or rejected every one. A
matcher once paired "Black beans" with "Black pudding, boiled".

## The rule: same preparation, or nothing

The page cooks its pulses and the release mostly reports them dry. A dry-basis
figure against a cooked page food is not two laboratories disagreeing, it is
roughly a 2.5x water-content difference before any cooking loss, and a `proxy`
grade is a warning rather than a correction. So a pairing was proposed only
where the release holds the same species at the preparation the page shows.

That is why kidney beans, split peas, soybeans, edamame, broad beans and six
other pulses are refused below while black-eyed peas is banked: the release
boiled the cowpea and did not boil the others.

## Three foods where IFCT's figure was withdrawn, not reconciled

`RECONCILIATION.md` and the README both already recorded that IFCT reports
pulses dry while this page cooks them, and that lentils, chickpeas and mung
beans carried that mismatch under a `proxy` grade. The release answers all
three at the right preparation, from primary papers in Iran, Egypt and India:

| page food | was, IFCT, dry basis | now, FAO, cooked |
|---|---|---|
| `lentils-cooked` | 218 | 189.5 |
| `chickpeas-cooked` | 578 | 134.03 to 268.28 |
| `mung-beans-cooked` | 375 | 395.49 |

The two are not spanned into a range together. A range says laboratories
disagree; this difference is water, and a reader cannot tell the two apart from
the cell. IFCT's phytate for the three is in the `withdrawn` block of
`ifct-2017-cited.json` with its reason. IFCT's soluble and insoluble oxalate
for the same three foods is untouched, and so is the proxy grade those cells
still need: `tools/withdraw.mjs` decides that, because the withdrawal loop used
to delete a source's grade unconditionally and would have stripped it.

## And one the page had been missing

`black-eyed-peas-cooked` had carried no phytate since the IFCT B007 pairing was
withdrawn, that being a *Phaseolus* field bean matched to a *Vigna* cowpea on
the word "black". It now reads 349 to 496.1 from two boiled cowpea rows
measured in Nigeria and Malawi. Same species, same preparation, primary papers.

## What was banked
| page food | rows | what the release calls them | where it was measured | the cell | grade |
|---|---|---|---|---|---|
| `tvp-dry` | 1683, 1800 | Soybean protein, textured vegetable, Red Mill brand; Soy-textured vegetable protein (TVP) | USA, Sri Lanka | 882.7 to 1879 | exact |
| `black-eyed-peas-cooked` | 1266, 1267 | Cowpea, boiled; Cowpea, boiled with salt | Nigeria, Malawi | 349 to 496.1 | exact |
| `lentils-cooked` | 1430 | Lentil, cooked whithout discarding the excessive water | Iran | 189.5 | exact |
| `chickpeas-cooked` | 1163, 1166, 1169 | Chickpea, Kabuli, Giza 1, boiled; Chickpea, Kabuli, Giza 2-L, boiled; Chickpea, Kabuli, Giza 2-U, boiled | Egypt | 134.03 to 268.28 (median 213.29) | exact |
| `mung-beans-cooked` | 1512 | Mung bean, ML-613, whole, pressure-cooked | India | 395.49 | exact |
| `oat-bran-raw` | 904 | Oat bran, raw | India | 2769 | exact |
| `white-rice-cooked` | 86, 274, 278, 279, 281, 283, 285 | Rice, Calrose, white, boiled; Rice, milled, steamed; Rice, milled, cooked | USA, Iran | 23.94 to 71.74 (median 29.72) | exact |
| `millet-cooked` | 716 | Millet, steamed | Gambia | 200 | close |
| `sorghum-grain` | 668, 670, 671, 674 | Sorghum, Fibmigou, white, raw; Sorghum, raw; Sorghum, red, whole grain, dried; Sorghum, white, whole grain, dried | Burkina Faso, China, Ethiopia | 427 to 1307.85 (median 809.94) | exact |
| `rye-bread` | 863, 864, 865, 866, 867 | Bread, rye-based; Bread, rye-based, continental rye; Bread, rye-based, original pure rye; Bread, rye-based, RySoy; Bread, rye-based, swiss rye | Europe (UK, New Zeland | 77 to 377.6 (median 330.6) | exact |
| `okra-cooked` | 2050 | Okra, boiled | Ghana | 13 | exact |
| `yam-cooked` | 1012 | Yam, root, boiled | Ghana | 50 | exact |
| `cassava-raw` | 955 | Cassava, raw, peeled | Nigeria | 9.3 | exact |
| `mustard-greens-raw` | 1940 | Mustard, leaves, raw | India | 9.18 | exact |
| `cauliflower-raw` | 1892 | Cauliflower, raw | India | 18.48 | exact |
| `mushrooms-white-raw` | 2039 | Mushroom, 'Agaricus bisporus', raw | India | 3.22 | exact |
| `oyster-mushrooms-raw` | 2042 | Mushroom, 'Pleurotus ostreatus', fresh, raw | Côte d'ivoire | 5.37 | exact |
| `portabella-mushrooms-raw` | 2039 | Mushroom, 'Agaricus bisporus', raw | India | 3.22 | close |
| `mango-raw` | 2106, 2107 | Mango, ripe, raw | Malawi, Gambia | 25 to 30 | exact |
| `fig-raw` | 2156 | Fig, ripe, raw | India | 9.6 | close |
| `cantaloupe-raw` | 2113 | Musk melon, light orange flesh, ripe, raw | Bangladesh | 9 | close |
| `guava-raw` | 2167 | Guava, fresh whole fruit, raw | Ethiopia | 13 | exact |
| `raisins` | 2209 | Raisins | Europe (UK | 11 | exact |

## What was refused, and why

Refusals are the part of this worth keeping, so the next sweep does not pay for
the search again.

### Refused because the release copied them from IFCT

Thirty proposals rested entirely on IFCT rows. Every one is a food this page
could carry a phytate figure for if a primary measurement is ever found, and
none of them is a gap in the release so much as a gap in what may be cited from
it:

bamboo shoots, cabbage, red cabbage, pak choi, collard greens, Brussels
sprouts, garlic, spring onions, radishes, daikon, beetroot, yellow bell pepper,
courgette, sweetcorn, romaine lettuce, parsley, grapes, pineapple, peaches,
pear, plums, blackberries, sweet cherries, jackfruit, lychees, pomegranate,
tamarind, dried apricots, ground turmeric and poppy seeds.

Seven more were banked in a trimmed form, their IFCT rows dropped: mustard
greens, raw cauliflower, mango, fig, cantaloupe, guava and raisins. Each note
in the map records what went and why.

### Declined by the owner

**Wheat bran**, whose eight raw untreated rows span 170.73 to 4174, a 24x
disagreement. No preparation rule excludes any of them and rule 4 cannot
dispute the low one, since the remaining seven still span 6x among themselves.
The honest cell was a range that wide, and it was judged not worth carrying.
The rows are 522, 523, 524, 526, 536, 537, 540 and 541 if that is ever revisited.

### The release has the species, but not at the page's preparation

| page food | what the release actually holds |
|---|---|
| `kidney-beans-cooked` | raw and irradiated raw rows, plus "Common bean stew, Kidney" at 168 and 325, a mixed dish diluted by its other ingredients |
| `split-peas-cooked`, `green-peas-cooked`, `green-peas-raw` | every *Pisum* row is the dried mature pea, 650 to 1025, a dry basis and a different food from a raw green pea |
| `soybeans-cooked`, `edamame-cooked` | 136 soybean rows and not one boiled; the edamame rows are raw |
| `broad-beans-cooked` | faba rows are roasted, dry-heated, or cooked and then oven-dried, which puts them back on a dry basis |
| `buckwheat-cooked` | grain, bran and flour, all dried |
| `pearl-barley-cooked`, `bulgur-wheat-cooked`, `wholewheat-pasta-cooked` | barley appears only in breads, bulgur only raw, pasta only uncooked |
| `teff-cooked` | teff appears only as injera, a fermented flatbread |
| `sweetcorn-cooked` | the boiled and steamed maize rows are field maize |
| `kale-raw` | rows 1928 and 1929 are boiled, and spiced and cooked |
| `broccoli-cooked`, `collard-greens-cooked`, `mustard-greens-cooked`, `turnip-greens-cooked` | raw leaf rows only |
| `lotus-root-cooked` | row 1025 is raw |
| `plantain-baked` | raw, and fried as chips |
| `butter-beans-cooked`, `pigeon-peas-cooked`, `moth-beans-cooked`, `lupin-beans-cooked` | raw seed, dehulled seed or flour |
| `seitan` | raw wheat gluten, and wheat with gluten fried |

### The row is a different species, or a different food

The B007 lesson, applied ahead of time rather than a year later.

| page food | the row that looked right | why not |
|---|---|---|
| `black-beans-cooked` | Black gram, whole, raw | *Vigna mungo*, not the black turtle bean, which is *Phaseolus vulgaris* |
| `shiitake-mushrooms-raw` | Mushroom, 'Lentinus brunneofloccosus', raw | not *Lentinula edodes* |
| `chestnuts-roasted` | Water chestnut, raw | *Eleocharis dulcis*, a sedge tuber, not *Castanea* |
| `honeydew-melon-raw` | Melon, orange flesh, ripe, raw | honeydew is green-fleshed; the orange-fleshed rows are the cantaloupe's |
| `olives-ripe-canned` | African black olive, raw | *Canarium schweinfurthii*, not *Olea europaea* |
| `basil-fresh` | African basil, raw | *Ocimum gratissimum*, not sweet basil |
| `cinnamon-ground` | Cinnamon, leaves, dried | the leaf, not the bark |
| `taro-cooked` | Cocoyam, root, boiled | cocoyam is used for both *Colocasia* and *Xanthosoma* and the release does not say which; a human who reads the source publication could bank this |
| `pumpkin-seeds` | Pumpkin, seed, dehulled, defatted | defatted seed is not the seed the page shows |
| `chia-seeds` | Rice, Chiang Phatthalung, soaked | a rice cultivar whose name contains "chia"; the release has no chia |
| `alfalfa-sprouts-raw` | Brussels sprouts, raw | matched on the word "sprouts" |
| `pumpernickel` | Bread, rye-based, five loaves | those five are `rye-bread`'s; none of them is pumpernickel |

### A derivative is not what it came from

Refused by the rule the README already applies to walnut oil: the ten oils,
`peanut-butter-smooth`, `almond-butter`, `cocoa-powder-unsweetened` and
`soy-protein-isolate`. Phytate sits in the seed, not in the oil pressed from
it.

### The release has no row for the food at all

Watercress, endive, chicory, kiwi, lemon, lime, grapefruit, blueberries,
cranberries, raspberries, mulberries, elderberries, asparagus, leeks, turnip,
swede, kohlrabi, celeriac, parsnips, shallots, mangetout, kumquat, starfruit,
artichokes, Jerusalem artichokes, green beans, adzuki beans, cannellini beans,
great northern beans, borlotti beans, spelt, wild rice, couscous, Swiss chard,
dandelion greens, turnip greens, hemp seeds, nori, kelp, wakame, spirulina,
nutritional yeast, oregano, goji berries, carob, persimmon, nectarines,
tangerines, radicchio, kimchi, sauerkraut, miso, natto, dried figs and prunes.

Two near misses worth recording: the release has fresh figs but no dried fig,
and fresh plums but no prune.

## A sweep that had to be run twice

The first sweep worked from `evidence.json` and found 39 candidate foods. But
`evidence.json` holds 177 entries against the page's 222 foods, and 45 page
foods have no entry at all, so they were invisible to it. Sweeping the page's
own food list instead added 15 more, of which guava, jackfruit, raisins,
lychees, pomegranate, cassava, bamboo shoots and TVP were the strongest, and
five survived the provenance check.

The canonical food list is `src/data/nutrients.json` under `foods`. A food with
no evidence entry is a gap, not the absence of one.

## How these cells are produced

Until this pass there was no FAO phytate pass in the generator at all.
`build.mjs` read the map only to check figures against it, and the 46 cells
were written by hand in commit `8dad864`, surviving each run because
`evidence.json` seeds the generator from itself. Deleting a mapping would have
left its cell standing.

Now `tools/fao_phytate.mjs` holds the admission rule and the cell rule,
`tools/evidence.mjs` owns the column, and a food dropped from the map loses its
cell and its grade and says so on the run. That is what let 14 pairings be
removed by editing a map rather than by hand-editing the page's data.
