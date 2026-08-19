# Biotin: the maps, and what was accepted into them

Written 2026-08-18, when the biotin column went from one national database to
three. Companion to `RECONCILIATION.md` rule 5, which said biotin does not
reconcile to a single value; this records the review that turned that claim
into a corpus.

**The finding: rule 5 holds across the whole column, not just its 14-food
sample.** 142 of 222 foods now carry a biotin cell against 102 before, 63 of
them resting on two or three national programmes against 13 before, and 30 of
those disagree beyond 2x and are shown as ranges.

A tool proposed candidate pairings and a human accepted or rejected every one.
`node tools/biotin.mjs propose <Category>` writes the proposals; it never
writes a map. Automated name matching stays refused, for the reason the README
already gives: a matcher once paired "Black beans" with "Black pudding,
boiled".

## What was accepted

| batch | sections read | CoFID pairs | AFCD pairs |
|---|---|---|---|
| Nuts and seeds | 19 | 8 | 6 |
| Legumes and soy | 21 | 2 | 2 |
| Grains | 10 | 7 | 0 |
| Vegetables | 46 | 20 | 19 |
| Fruit | 26 | 18 | 12 |
| Algae and yeast, fats and oils, herbs and spices | 11 | 7 | 0 |
| **total** | **133** | **62** | **39** |

`page-map-cofid.json` went from 13 entries to 75, `page-map-afcd.json` from 33
to 72. `page-map-mext.json` is unchanged at 102.

## The rules the review applied

Preparation before sourcing. A cooked page food matched to a dried row measures
hydration, not disagreement, and that refusal removed every AFCD grain row
offered: pearl barley at 12 dry against CoFID's trace for boiled would have
read as a spectacular conflict and been nothing but water.

A dish containing the food is not the food. Peanut brittle led the peanut
candidates at 24 ug where the kernel row holds 72.

A derivative is not what it came from, unless the page food says so. "Oil,
walnut" tied with "Walnuts, kernel only" at first, and a page food named
"Peanut butter" keeps CoFID's peanut butter row.

The plainest row wins where the page food names no variety. CoFID holds five
boiled white rice rows from 0.4 to 0.6, and long grain was taken over basmati
and Arborio.

## Batch: Nuts and seeds

Reviewed and decided 2026-08-18. These were the only pairs applied.

### Accepted into the CoFID map

| page | page_state | cofid_code | cofid_name | match |
|---|---|---|---|---|
| Almonds | (empty string) | 14-896 | Almonds, whole kernels | exact |
| Walnuts | (empty string) | 14-879 | Walnuts, kernel only | exact |
| Cashews | (empty string) | 14-811 | Cashew nuts, kernel only, plain | exact |
| Peanuts | (empty string) | 14-877 | Peanuts, kernel only, plain, unsalted | exact |
| Brazil nuts | (empty string) | 14-871 | Brazil nuts, kernel only | exact |
| Hazelnuts | (empty string) | 14-874 | Hazelnuts, kernel only | exact |
| Sesame seeds | (empty string) | 14-844 | Sesame seeds | exact |
| Peanut butter | smooth | 14-892 | Peanut butter, smooth | exact |

### Accepted into the AFCD map

| slug | key | match |
|---|---|---|
| pecans | F006111 | exact |
| macadamia-nuts-raw | F006099 | exact |
| chestnuts-roasted | F006096 | exact |
| coconut-raw | F002983 | exact |
| pine-nuts-dried | F006112 | close |
| tahini-from-roasted-kernels | F009076 | close |

Pine nuts is `close` because the page food says dried and AFCD's row says raw.
Tahini is `close` because the page food specifies roasted kernels and AFCD's
row does not say how the seed was treated.

### Rejected, with the reason

- **Pumpkin seeds**, both CoFID candidates. Both are pumpkin flesh at 0.4, a
  different part of the plant from the seed.
- **Macadamia nuts and Pine nuts from CoFID**, all candidates. Ginger nut
  biscuits, and other nuts entirely.
- **Almond butter**, every candidate from both sources. CoFID's row is ground
  almonds, which is an ingredient rather than the product, and this project
  does not map a page food to its ingredient. AFCD's almond meal is `Imputed`.
- **Peanut butter from AFCD**, both candidates. F006107 is the raw nut rather
  than the butter, and F006110 is `Imputed`.
- **Coconut grated and desiccated (F002987) and coconut cream (F002982)**. A
  dried basis and a concentrated one.
- **Peanuts dry roasted (14-878) at 130.0**. A real figure on a roasted basis
  where water has been driven off, not an error, but the page food is the
  plain kernel and preparation must match.
- **Almonds flaked and ground (14-870)**, in favour of whole kernels at the
  same 64.

## Batch: Legumes and soy

Reviewed and decided 2026-08-18. These were the only pairs applied.

Four pairs from twenty-one sections. The batch was weak because in legumes the
discriminating word is the cultivar and every row shares the head noun, so most
sections drew the same three wrong species.

### Accepted into the CoFID map

| page | page_state | cofid_code | cofid_name | match |
|---|---|---|---|---|
| Tempeh | (empty string) | 13-118 | Tempeh | exact |
| Edamame | cooked | 13-667 | Beans, edamame, frozen, boiled in unsalted water | close |

Edamame is `close` because CoFID's row is frozen and then boiled, where the
page food is cooked from fresh.

### Accepted into the AFCD map

| slug | key | match |
|---|---|---|
| haricot-beans-cooked | F000437 | exact |
| green-peas-raw | F006536 | exact |

Note the slug is `green-peas-raw`, the RAW page food, not `green-peas-cooked`.
AFCD's row is "Pea, green, fresh, raw" and the page carries green peas both
ways. Mapping it to the cooked food would measure hydration rather than
disagreement.

### Rejected, with the reason

- **Soy milk, unsweetened to CoFID 12-524.** Genuinely the right food and
  explicitly unsweetened, but the page food already maps to AFCD's unfortified
  soy beverage, and taking a fortified row alongside it would give one food two
  sources disagreeing about fortification in opposite directions.
- **Every other section, sixteen of them, as species substitution.** Haricot,
  lima or red kidney offered for black beans, pinto, cannellini, borlotti,
  butter beans, adzuki, Great Northern, moth beans and lupin beans. Chickpea or
  lentil offered for split peas and pigeon peas. Broccoli offered for green
  peas. Soy sauce and soy lecithin offered for soy protein isolate. Goat's
  cheese and goat's milk ranked above the soya milk row.
- **"Rice and black-eye beans" (15-855) for black beans.** A composite dish that
  the dish trap missed because it names two foods rather than a dish word, and
  blackeye beans are not black beans in any case.

## Batch: Grains

Reviewed and decided 2026-08-18. These were the only pairs applied.

Seven CoFID pairs, no AFCD pairs at all. Every AFCD grain row offered was
uncooked against a cooked page food.

### Accepted into the CoFID map

| page | page_state | cofid_code | cofid_name | match |
|---|---|---|---|---|
| Wheat bran | (empty string) | 11-906 | Bran, wheat | exact |
| Wild rice | cooked | 11-873 | Rice, wild, boiled in unsalted water | exact |
| Pearl barley | cooked | 11-003 | Barley, pearl, boiled | exact |
| Wholewheat pasta | cooked | 11-723 | Pasta, wholewheat, spaghetti, dried, boiled in unsalted water | exact |
| White rice | cooked | 11-862 | Rice, white, long grain, boiled in unsalted water | exact |
| Wheatgerm | toasted | 11-907 | Wheatgerm | close |
| Oats | rolled, dry | 11-788 | Porridge oats, unfortified | close |

Wheatgerm is `close` because the page food is toasted and CoFID's row does not
say. Oats is `close` because porridge oats names a use rather than a form,
though unfortified and uncooked it is the same product as rolled oats dry.

**White rice was chosen against the tool's suggestion.** The tool offered
basmati (11-858, 0.5) and Arborio (11-879, 0.6). CoFID holds five boiled white
rice rows spanning 0.4 to 0.6, and long grain is the plainest for a page food
that names no variety.

**Pearl barley's CoFID figure is `Tr`, a trace, not a number.** That is
deliberate and is the point of accepting it. CoFID assayed boiled pearl barley
and found biotin below the point where it would put a number on it, and this
is the first cell in the project to carry that finding through. It should
become a cell with `state: "trace"`, not a figure and not a gap.

### Rejected, with the reason

- **Every AFCD grain row offered**, all of them uncooked against a cooked page
  food: pearl barley at 12 dry, white rice at 1.7 dry, brown rice at 6.5 dry,
  and the instant wheat noodles. Taking any would record hydration as
  disagreement. AFCD's 12 for dry pearl barley against CoFID's trace for boiled
  would have read as a spectacular conflict and been nothing but water.
- **Bulgur wheat, oat bran, rye bread and pumpernickel.** Every candidate was
  bran, bread or instant noodles, never the food itself.
- **CoFID 11-975 Bread, wheatgerm** for wheatgerm. Bread containing it, not the
  germ.
- **CoFID 11-803 Biscuits, digestive, with oats** for oats and for oat bran.
- **The basmati and Arborio white rice rows**, in favour of long grain.

## Batch: Vegetables

Reviewed and decided 2026-08-18. The tables below record what was accepted and what was refused. The 8 AFCD cooked rows, all of them `Recipe`, are accepted and
mapped: Rule 1 excludes them from choosing a value automatically, and where a
food has no analysed source they yield an estimated cell, visibly marked.
Kale is accepted and its range widens to 0.5 to 4.

46 sections. 20 CoFID pairs and 19 AFCD pairs accepted, 6 sections rejected
outright, and 3 places where I overrode the tool's own suggestion.

### Accepted into the CoFID map (all exact unless marked)

| Page food | Row | Figure |
|---|---|---|
| Sweet potato, baked | 13-672 Sweet potato, baked | 3.3 |
| Brussels sprouts, cooked | 13-630 Brussels sprouts, boiled | 0.5 |
| Brussels sprouts, raw | 13-177 Brussels sprouts, raw | 0.4 |
| Butternut squash, baked | 13-644 Squash, butternut, baked | 0.9 |
| Spring onions, raw | 13-351 Spring onions, bulbs only, raw | 0.9 |
| Green beans, cooked | 13-515 Beans, green, boiled | 0.7 |
| Red cabbage, raw | 13-190 Cabbage, red, raw | 0.1 |
| Kale, raw | 13-234 Curly kale, raw | 0.5 |
| Cauliflower, cooked | 13-513 Cauliflower, boiled | 1.2 |
| Cauliflower, raw | 13-512 Cauliflower, raw | 1.7 |
| Broccoli, raw | 13-502 Broccoli, green, raw | 4.1 |
| Leeks, cooked | 13-625 Leeks, boiled | 0.7 |
| Celery, raw | 13-636 Celery, raw | 0.1 |
| Cucumber, raw, with peel | 13-523 Cucumber, raw, flesh and skin | 0.8 |
| Pumpkin, cooked | 13-549 Pumpkin, flesh only, boiled | 0.4 |
| Cabbage, raw | 13-582 Cabbage, average, raw | 0.1 |
| Tomatoes, raw | 13-517 Tomatoes, standard, raw | 1.4 |
| Bell pepper, red, raw | 13-524 Pepper, capsicum, red, raw | 3.3 |
| Bell pepper, yellow, raw | 13-526 Pepper, capsicum, yellow, raw | 3.9 |
| Romaine lettuce, raw | 13-520 Lettuce, average, raw | 0.7 (close) |

### Accepted into the AFCD map (all exact unless marked)

| Page food | Key | Row | Figure |
|---|---|---|---|
| Brussels sprouts, cooked | F001913 | Brussels sprout, boiled, drained | 0.8 |
| Brussels sprouts, raw | F001914 | Brussels sprout, fresh, raw | 0.8 |
| Alfalfa sprouts, raw | F008803 | Sprout, alfalfa, fresh, raw | 6.6 |
| Green beans, cooked | F000430 | Bean, green, fresh, boiled, drained | 2.5 |
| Asparagus, cooked | F000151 | Asparagus, green, boiled, drained | 4.9 |
| Asparagus, raw | F000155 | Asparagus, green, raw | 4.2 |
| Cauliflower, cooked | F002377 | Cauliflower, fresh, boiled, drained | 4.5 |
| Cauliflower, raw | F002378 | Cauliflower, fresh, raw | 4.3 |
| Broccoli, raw | F001905 | Broccoli, fresh, raw | 5.6 |
| Carrots, raw | F002276 | Carrot, mature, peeled, fresh, raw | 2.5 |
| Onions, raw | F006225 | Onion, mature, brown skinned, peeled, raw | 0.6 |
| Celery, raw | F002390 | Celery, fresh, raw | 1 |
| Romaine lettuce, raw | F005191 | Lettuce, cos, raw | 1.7 |
| Cabbage, raw | F002015 | Cabbage, white, raw | 1.4 (close) |
| Beetroot, cooked | F001013 | Beetroot, peeled, baked | 0 (close) |
| Beetroot, raw | F001015 | Beetroot, peeled, raw | 0 |
| Sweetcorn, cooked | F003213 | Sweetcorn, on cob, baked/roasted | 0.3 (close) |
| Parsnips, cooked | F006326 | Parsnip, peeled, baked | 0.2 (close) |
| Pumpkin, cooked | F007543 | Pumpkin, jarrahdale, peeled, baked | 0.8 (close) |

Cos lettuce IS romaine, so that pair is exact despite the different name.

### Three places the tool was overridden

- **Tomatoes.** It offered cherry tomatoes at 1.8. CoFID also holds "Tomatoes,
  standard, raw" at 1.4, which is the plain row for a page food naming no
  variety.
- **Potato, baked, with skin.** It offered AFCD's **sweet potato**, a different
  food. CoFID's own "Potatoes, old, baked, flesh and skin" at 0.3 is the right
  row, and the page food is already mapped to it. Nothing to add.
- **Bell pepper, yellow.** It offered the RED row for all three colours. CoFID
  has a yellow row at 3.9. Green is `N`, not measured, so green pepper gets
  nothing and that is the correct outcome.

### Rejected, with the reason

- **All five speciality mushrooms** (shiitake, oyster, maitake, enoki,
  portabella). CoFID offers "Mushroom, dried", a dried basis, and AFCD offers
  "Mushroom, common", which is the white button mushroom. Wrong species and
  wrong basis.
- **Collard, mustard, turnip and dandelion greens**, raw and cooked. Every
  candidate was green beans, asparagus or a green apple.
- **Ginger root** (ginger nut biscuits) and **garlic** (garlic bread).
- **Red cabbage from AFCD**: it offered "Apple, red skin, peeled, raw".
- **Cucumber from AFCD**: peeled, where the page food is with peel.
- **Leeks from AFCD**: fried, where the page food is boiled.
- **Tomatoes from AFCD**: sundried, a concentrated basis.
- **Spring onions from AFCD**: the mature onion row, which is a different food
  and already mapped to Onions.
- **Bell pepper, green**: CoFID's green capsicum rows are all `N`.

## Batch: Fruit

Reviewed and decided 2026-08-18. These were the only pairs applied.

The cleanest batch of the plan. 16 CoFID pairs and 12 AFCD pairs.

### Accepted into the CoFID map

| page | page_state | cofid_code | match |
|---|---|---|---|
| Blackberries | raw | 14-388 | exact |
| Strawberries | raw | 14-324 | exact |
| Grapefruit | raw | 14-384 | exact |
| Raspberries | raw | 14-375 | exact |
| Mango | raw | 14-378 | exact |
| Pear | raw | 14-361 | exact |
| Cherries | sweet, raw | 14-382 | exact |
| Pineapple | raw | 14-376 | exact |
| Peaches | raw | 14-299 | exact |
| Plums | raw | 14-372 | exact |
| Mulberries | raw | 14-168 | exact |
| Blueberries | raw | 14-325 | exact |
| Grapes | raw | 14-350 | exact |
| Elderberries | raw | 14-089 | exact |
| Dates | (empty string) | 14-394 | exact |
| Watermelon | raw | 14-296 | exact |
| Dried apricots | dried | 14-392 | close |
| Dried figs | dried | 14-395 | close |

The two dried fruits are `close` because CoFID's rows are "ready-to-eat,
semi-dried", which is a different water content from fully dried, and water
content is the denominator of every figure per 100 g.

**Plums at 14-372 carries `Tr`, a trace.** Expect a `trace` state where no
other source has a figure, exactly as pearl barley did.

### Accepted into the AFCD map

| slug | key | row | match |
|---|---|---|---|
| dried-apricots-dried | F000130 | Apricot, dried | exact |
| orange-raw | F006276 | Orange, navel, peeled, raw | exact |
| grapefruit-raw | F011002 | Grapefruit, pink flesh, peeled, raw | exact |
| mango-raw | F005299 | Mango, peeled, raw | exact |
| apricots-raw | F000134 | Apricot, raw | exact |
| apple-raw-with-skin | F000092 | Apple, golden delicious, unpeeled, raw | exact |
| pear-raw | F006612 | Pear, William Bartlett, unpeeled, raw | exact |
| pineapple-raw | F006702 | Pineapple, peeled, raw | exact |
| watermelon-raw | F005520 | Melon, watermelon, peeled, raw | exact |
| peaches-raw | F006573 | Peach, yellow, unpeeled, raw | exact |
| plums-raw | F006832 | Plum, unpeeled, raw | exact |
| honeydew-melon-raw | F005515 | Melon, honey dew, peeled, raw | exact |

**Four of these are analysed ZEROS**: apricots-raw, pineapple-raw, peaches-raw
and plums-raw all read 0. An analysed zero is a finding, never a gap. Expect
cells, and expect them to widen ranges against any other source's figure
rather than being averaged away.

### Rejected, with the reason

- **Raisins.** Its only candidates are "Peanuts and raisins" (41.2) and
  "Peanuts, raisins and chocolate chips". CoFID holds no plain raisin row, so
  raisins gets no figure.
- **Fig, raw.** Offered the semi-dried row. CoFID's own raw fig row, 14-091, is
  `N`, not measured. Raw figs gets no figure.
- **Olives, ripe, canned.** CoFID holds only green olives in brine, at `Tr`.
  Ripe and green olives are picked at different maturity and cured differently.
- **Honeydew melon from CoFID**, both rows. 14-357 is "weighed whole" and
  14-358 "weighed with skin", which put the rind in the denominator. AFCD's
  peeled raw row is the right basis and is accepted instead.
- **Apricots, raw to CoFID 14-392**, the semi-dried row, in favour of AFCD's
  proper raw apricot.
- **Orange, raw to CoFID 19-577**, "Sauce, duck a l'orange".
- **Passion fruit**, both sources: "Dried mixed fruit" and a muesli row.
- **Dried figs from AFCD**: a muesli row.

## Batch: Algae and yeast, fats and oils, herbs and spices

Reviewed and decided 2026-08-18. These were the only pairs applied.

Seven CoFID pairs and NO AFCD pairs. `tools/evidence/page-map-afcd.json` must
not change in this batch.

Algae and yeast produced no candidates at all, which is the correct answer:
neither database holds biotin for seaweed or for yeast extract.

### Accepted into the CoFID map

| page | page_state | cofid_code | match |
|---|---|---|---|
| Rapeseed oil | (empty string) | 17-041 | exact |
| Sesame oil | (empty string) | 17-043 | exact |
| Walnut oil | (empty string) | 17-047 | exact |
| Coconut oil | (empty string) | 17-031 | exact |
| Peanut oil | (empty string) | 17-040 | exact |
| Olive oil | extra virgin | 17-038 | close |
| Soybean oil | refined | 17-044 | close |

Olive oil is `close` because CoFID's row is "Oil, olive" and does not say extra
virgin. Soybean oil is `close` because CoFID's row is "Oil, soya" and does not
say refined.

**Every one of these seven carries `Tr`, a trace.** All seven cells should come
out as `state: "trace"` citing `cofid-2021`. None should carry a value and none
should be a zero. That is the expected and correct result for an oil: fat
carries essentially no biotin, and a trace says it was looked for and found
below the point where a number could be put on it.

**CoFID's "Oil, soya" (17-044) is soybean oil.** The tool missed it entirely
and offered fat spreads instead. This pair was found by hand.

### Rejected, with the reason

- **AFCD's analysed zeros for olive (F006177), peanut (F006183) and soybean
  (F006188) oil**, deliberately, and this is the decision of the batch. Britain
  found a trace in these oils and Australia found nothing, which are different
  findings. A zero is a figure and a trace is not, so mapping both would make
  the code take the zero and drop the trace silently, and those three oils
  would read 0 while four identical oils read trace. The difference would be an
  artefact of which country happened to assay which oil, not a fact about the
  oils. One source, consistently, across all seven.
- **Sunflower oil.** CoFID holds no sunflower oil row at all. Its candidates
  were fried haddock and nut cutlets.
- **Avocado oil and flaxseed oil.** AFCD's rows for both are `Borrowed` and
  carry no biotin value; CoFID has neither. Nothing to map.
- **Cinnamon, ground.** Its only candidate was AFCD's "Doughnut, dusted with
  cinnamon and sugar" at 3.8. A doughnut is not a spice. The composite-dish
  trap missed it because "doughnut" is not among its words.
- **Every cross-oil substitution**: AFCD's olive, peanut and soybean oil rows
  offered for rapeseed, sunflower, sesame, walnut, avocado, flaxseed and
  coconut oil. An olive oil figure is not a rapeseed oil figure.
- **Every fat spread and ghee row**, offered for most of the oils.
- **AFCD F006110**, roasted peanut with oil, `Imputed`, offered for peanut oil.
- **CoFID's avocado flesh rows** offered for avocado oil.
