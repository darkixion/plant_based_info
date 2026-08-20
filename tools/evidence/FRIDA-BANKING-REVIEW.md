# Frida: reading all 73 proposals against the corpus

Written 2026-08-20, before any Frida pairing was banked. `FRIDA-MAP-REVIEW.md`
is the generated companion and holds the tables; this records what reading them
one by one found, and what is left for a person to decide.

**The finding, and it is about method rather than about Frida.** Ten of the 73
carried a generated "look twice" line. Reading those ten against the corpus
found that **not one was a judgement call**: every one was the scorer being
wrong, in four different ways. Reading the other 63 the same way found **two
more of the same kind**, and both were the wrong food entirely. Reading the
scorer would have found none of it. **Checking a generated proposal against its
source is how you find out the generator is wrong.**

Nothing here is banked. `page-map-frida.json` is still empty and still carries
the shape an entry takes. A tool may propose a pairing and only a human may
bank one.

## Seven leads were the wrong food

Each is fixed, and each fix is a rule in `tools/biotin.mjs` rather than a hand
correction, because the scorer is shared and the same fault would have reached
the next source.

| page food | led | now | the fault |
|---|---|---|---|
| Strawberries, raw | 1819 Strawberries, frozen | **1 Strawberry, raw** | `stem` had no -ies rule |
| Apricots, raw | 458 Apricot, dried | **1851 Apricot, raw** | `RAW` lumps raw with dried |
| Peaches, raw | 1276 Peach, dried | **1853 Peach, raw** | the same |
| Plums, raw | 221 Prune, dried plum | **1852 Plum, raw** | the same |
| Haricot beans, cooked | 1822 Green beans (haricots verts), frozen | **1815 White beans, dried and boiled** | a synonym |
| Pumpkin seeds | 366 Pumpkin, raw | **1507 Pumpkin seed, dried** | `STOP` held "seeds" |
| Rye bread | 166 Rye bread crumbs with brown sugar | **413 Rye bread, light** | the trap read "with sugar" |

**The stem had no -ies rule**, so "Strawberries" stemmed to `strawberri` where
"Strawberry" stemmed to itself, and FoodID 1 scored zero and never appeared.
Fixing it also found **blackberries, raspberries, elderberries and cherries**,
four page foods Frida holds that the search had been reporting as unreached.

**"St-raw-berries" also tested as a raw row**, because the preparation words
were matched as substrings while the traps beside them have carried word
boundaries since "unsalted" matched "salted".

**`RAW` holds raw and dried together**, which is right for a stateless nut,
where "dried" is Frida's house style, and wrong for a food that says raw. Frida
holds both forms of apricot, peach, plum and fig; the two tied at 18 and the
dried row led all four on file order. Dried apricot's chromium is 80 where the
raw row's is 0.

**A name scorer cannot see through a synonym.** `ALIASES` is the hand-written
answer and holds two: flaxseed is Frida's linseed, and this page's haricot bean
is Denmark's white bean, while Frida's own "haricots verts" is a green bean
that beat the right row two shared words to one.

**`STOP` held "seeds" and was checked before the stem rather than after**, so
"seeds" was dropped and "seed" survived, and "Pumpkin seeds" scored as
"Pumpkin". The vegetable admits iodine alone; the seed row admits all four. A
word that says which food this is was never a word that says nothing.

**The sugar trap read "with sugar" and the row says "with brown sugar."** The
breadcrumb tied with all fourteen real rye breads at 28 and led them on file
order, admitting iodine alone where every real rye bread admits biotin and
chromium.

## Four foods are refused, and one is withdrawn

**Frozen is blanched, not cooked.** Frida has no cooked row for green peas,
brussels sprouts or green beans, and its frozen one led all three; "Sweet
potato fries, frozen" led sweet potato baked. All four are refused outright
rather than ranked lower, the way a raw row already was for a cooked food. A
row that freezes something already cooked says so and keeps its bonus.

**Fig, raw is withdrawn.** Frida's "Figs, raw" exists and admits nothing, its
one iodine cell compiled from a table this page already cites, so the food
moves to the section that says so rather than pairing to a dried fig.

## Four decisions are a human's, and each is a real one

### Kidney beans, cooked: 16x on molybdenum

The page's cooked kidney beans are boiled from dry, and Frida has a row for
exactly that. It is not the one leading.

| FoodID | row | biotin | chromium | molybdenum | n |
|---|---|---|---|---|---|
| 1811 | Beans, red kidney, cooked, ready to eat | 4.85 | 13.0 | **205** | 2 |
| 1810 | Beans, red kidney, boiled, canned | 1.85 | 0 | 85.5 | 2 |
| 1816 | Beans, red kidney, dried and boiled | 4.78 | 0 | **13.0** | 1 |

1815, "White beans, dried and boiled", is what haricot beans now lead, so the
consistent answer is 1816. It is n=1, and its molybdenum is a sixteenth of the
leading row's. 1811 and 1810 are both packaged products.

Chickpeas have the same shape and it matters less: Frida has no dried-and-
boiled chickpea, only steamed ready-to-eat at molybdenum 130 and boiled canned
at 115.

### Rye bread: Frida has fourteen and the page has one

With the breadcrumb gone, "Rye bread, light" leads on file order alone; a dozen
dark ones score identically. **413 is the only rye bread that admits molybdenum
and boron**, and boron is a column with nine cells on the whole page. The dark
rows carry far larger n on chromium. Rye bread is also a salted food, and the
USDA release reads white bread at 1.8 without an iodate dough conditioner and
592 with.

### The generic row against the Danish one

**One rule, not eight decisions.** For eight leads Frida carries both an
unqualified row and an origin-qualified twin, and they look like two separate
analytical campaigns: the generic rows carry large n on chromium and iodine,
the Danish rows carry n of about 8 across biotin and molybdenum and report
chromium as 0.

| page food | generic | Danish or qualified |
|---|---|---|
| Kale, raw | 23, chromium **8.30 n=44** | 1391, chromium **0 n=8**, molybdenum 47.5 |
| Cauliflower, raw | 14, chromium 1.10 n=51 | 799, chromium 0 n=8, molybdenum 8.78 |
| Celeriac, raw | 46, chromium 2.40 n=22 | 1485, chromium 0 n=7 |
| Red cabbage, raw | 44, chromium 0.50 n=3 | 1750, chromium 0 n=8, molybdenum 50.5 |
| Spinach, raw | 50, chromium 9.30 n=11 | 1741 Baby spinach, chromium 11.6 n=8 |
| Tomatoes, raw | 52 origin unknown | 451 Danish, 624 imported |
| Romaine, raw | 600, n=14 | 1743 Salad, romaine, n=2 |
| Carrots, raw | 24, chromium 0.80 n=67 | 1761 Danish, 1760 imported |

Kale is the sharpest: **chromium 8.30 at n=44 against 0 at n=8**, both admitted,
both Frida's own. This decides whether Frida can second-source chromium at all,
which is the reason it was worth reading: `sources.json` records FSANZ's own
warning that AFCD's chromium "should be used with caution", so Frida is the
honest second source for that column.

### Carrots: three rows carry the same name

Not qualified rows that differ. **24, 559 and 606 are all named "Carrot, raw"**,
and they do not agree: chromium 0.80 at n=67, then 0 at n=6, then 0 at n=2;
molybdenum 0, then 2.70, then 0. No name can separate them, so the lead is file
order. The release notes are the only place an answer could live.

## A figure can be admitted onto more than one food

The finding that is not about pairing at all, and it is now reported by `node
tools/frida.mjs provenance`: **64 groups over 202 cells** carry a figure, both
detection bounds, a determination count and a source that all agree across two
or more foods. `FRIDA-PROVENANCE.md` has the mechanism. In short, Frida pools a
determination across a group of foods and writes it onto each, and `sourceFood`
does not mark that, so the admission rule admits it once per food.

Six of those groups reach a proposal:

| what | across | strength |
|---|---|---|
| chromium 6.8 (0 to 27.6) n=16, src 1506 "Unpublished data" | **olive oil**, corn oil, soyabean oil | conclusive |
| iodine 0.5 (0.4 to 0.65) n=3, src 1055 | **peanuts**, **peanut butter** | two page foods, one figure |
| chromium 80 (59 to 100) n=2, src 1079 | **dried apricots**, dried date | a health-food-store survey |
| iodine 0.5 (0.35 to 0.7) n=3, src 1055 | **swede**, instant mashed potato | a different set from the peanut one |
| molybdenum 130 (130 to 130) n=2, src 2184 | **chickpeas steamed**, edamame frozen | one legume report |
| chromium 1 (1 to 2) n=3, src 1348 | **sweetcorn**, frozen strawberries, canned salmon | weakest, a round number |

**The peanut pair is the one to settle first**: peanuts and peanut butter are
both page foods, so banking both puts one determination on the page twice under
two names. That is the failure Phenol-Explorer already cost, arriving from a
source that does its own analytical work.

## Small notes on the rest

**What the page names and the row does not.** Apple, raw, with skin pairs to
"Apple, raw, all varieties"; cucumber, raw, with peel to "Cucumber, raw";
sweetcorn, raw to "Sweetcorn, on-the-cob, raw". Frida normally reports edible
portion, so all three are probably right, and the sweetcorn row is the one that
names its basis explicitly.

**Where the row is more or less specific than the page.** Tofu, firm pairs to an
unqualified "Tofu, soy bean curd", and firmness is water content against a
figure per 100 g. Cabbage, raw pairs to "Cabbage, white, raw", the Danish
default. Cherries, sweet, raw pairs to "Cherry, raw", Frida's only raw cherry,
though Denmark's cherry is often the sour one. Sesame seeds pairs to "Sesame
seeds, whole" rather than "Sesame seed, decorticated". Mushrooms, white, raw
pairs to "Mushroom, raw", the only raw mushroom in the release.

**Leads resting on a single determination.** Brazil nuts admit iodine alone at
n=2; pumpkin seeds admit all four but every one at n=1; turnip admits chromium
and molybdenum, both n=1; watermelon and asparagus admit iodine alone. All are
honest, and a single determination is what rules 3 and 4 have the least to say
about.

**Wheat bran is the strongest lead on the page.** 617 admits all five
components, boron included, at n=10 to 13.

## The 46 that carry no question

Read against the corpus, each is the row that answers the page food, with no
closer row passed over and no figure shared with an unrelated food.

Almonds, apricots raw, asparagus raw, avocado, banana, blackberries raw,
blueberries raw, broccoli raw, brussels sprouts raw, celery raw, chia seeds,
cocoa powder, coconut oil, dried figs, elderberries raw, flaxseed, grapefruit
raw, green peas raw, haricot beans cooked, hazelnuts, honeydew melon raw, kiwi
raw, lemon raw, mango raw, onions raw, orange raw, parsley fresh, peaches raw,
pear raw, pine nuts dried, pineapple raw, pistachios, plums raw, poppy seeds,
pumpernickel, radishes raw, raisins, raspberries raw, rocket raw, seitan,
strawberries raw, sunflower oil, sunflower seeds, walnuts, watermelon raw,
wheat bran.

## Status

**Nothing is banked and the next move is a person's.**

**What all 73 would actually bring is 223 cells**: chromium 67, iodine 58,
molybdenum 51, biotin 45, boron 2. Not the 2,373 the corpus admits in total.
That larger number is what Frida holds across all 1,240 of its foods, most of
which this page does not name and many of which are meat, and it has been
quoted in planning notes in a way that reads as though banking would deliver
it. It would not. A pairing reaches at most five cells.

The pass that would read the map is still not written, for the reason
`FRIDA-PROVENANCE.md` gives: a pass against an empty map writes no cells and
cannot be tested on anything.
