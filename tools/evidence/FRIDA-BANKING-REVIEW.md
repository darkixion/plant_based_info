# Frida: reading every proposal against the corpus, banking 77, and wiring the pass

Written 2026-08-20 before any Frida pairing was banked, rewritten 2026-08-21
when they were. `FRIDA-MAP-REVIEW.md` is the generated companion and holds the
tables; this records what reading them one by one found, what was decided, and
who decided it. `page-map-frida.json` now holds **77 reviewed entries**.

**The finding of the first read was about method rather than about Frida.** Ten
of the 73 carried a generated "look twice" line. Reading those ten against the
corpus found that not one was a judgement call: every one was the scorer being
wrong, in four different ways. Reading the other 63 the same way found two more
of the same kind, and both were the wrong food entirely. Reading the scorer
would have found none of it. **Checking a generated proposal against its source
is how you find out the generator is wrong.**

**The finding of the second read was about the extraction, and then about the
scorer again.** Four questions were left open as a human's to decide. Three of
them were not judgement calls either: they were answered in fields the release
publishes and `extract_frida.mjs` was throwing away. And **five more page foods
Frida holds had never reached the review at all**, for the same reason the
strawberry had not: a plural that does not stem to its own singular cannot meet
it. The count went from 73 proposals to 78.

## Two columns the extraction had dropped

`FCDB_6.1_Dataset.xlsx` has a `Food` sheet the value sheet does not repeat, and
two of its columns decide pairings.

**`FødevareNavn`, the Danish name, says which row is which.** 24, 559 and 606
are all called "Carrot, raw" in English and they disagree on every component.
In Danish they are **"Gulerod, uspec."**, **"Gulerod, dansk"** and **"Gulerod,
importeret"**. The qualifier this page needed was dropped in translation rather
than absent, and with it back the carrot question and the generic-against-Danish
question are the same question with one answer. The same word settles
cauliflower, tomato, apple and brussels sprouts.

**`FoodEx2Description`, the EFSA classification, says what was analysed where
the name does not.** It found two pairings no name scorer could have caught,
one of them wrong. It is right on 416 of the 417 rows whose Danish name says
raw, which is what makes the one disagreement worth reading rather than worth a
rule.

Both are carried now, and neither is scored. FoodEx2 is a code someone
assigned, and 753's says "Canned or jarred legumes" of a vegetable that is not
a legume, so it belongs in front of a reviewer rather than in a matcher.

**Ask a database what it measured, and then check that the extraction kept the
field that answers.** This is the third time that second half has cost
something: the iodine release's footnote text, AFCD's derivation column, and
now Frida's own food sheet.

## Five foods Frida holds were being reported as unreached

The -ies bug's twin, and it was in the same three lines. `stem` stripped both
letters off every plural ending in -es, so **"Dates" became "dat" while "Date"
stayed "date"** and the two could not meet. The search then put dates in the
section headed "No Frida row reaches the food at all", which is the one answer
this document must never give wrongly: it says the database was asked and had
nothing, when the database had a row.

| page food | Frida holds | admits |
|---|---|---|
| Dates | 533 Date, dried | chromium 80 n=2, molybdenum, iodine 1.8 n=3 |
| Grapes, raw | 54 Grape, raw | biotin, chromium, molybdenum, iodine n=13 |
| Prunes, dried | 221 Prune, dried plum | chromium, molybdenum, iodine 0.8 n=4 |
| Nectarines, raw | 610 Nectarine, raw | biotin n=8, chromium, iodine |
| Jerusalem artichokes, raw | 950 Jerusalem artichoke, raw | chromium 6.4 n=7, iodine |

**The -es rule is only right where the -s rule would not do**, which is after a
sibilant or an o: radishes, boxes, tomatoes. Those still work and are held by a
test. Everything else takes the -s rule now, and all five foods above are
banked.

Two of the five are worth a second look on their own account. **221's Danish
name is "Sveske, rå"**, and the "rå" there means unstewed rather than undried;
it is one of only five rows in the release whose Danish name says raw while
the classification names a process, and four of the five agree rather than
conflict: a prune, a dried pasta, a dried brazil nut and a parboiled rice. The
fifth is the asparagus refused below. 221 is also the row that used to lead
raw plums. And **950 "Jordskok" beats 57 "Artiskok"**,
the globe artichoke, which the scorer ranks below it and grades proxy.

## Seven leads were the wrong food

Each was fixed in the first read, and each fix is a rule in `tools/biotin.mjs`
rather than a hand correction, because the scorer is shared and the same fault
would have reached the next source.

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

## Five foods are refused, and one is withdrawn

**Frozen is blanched, not cooked.** Frida has no cooked row for green peas,
brussels sprouts or green beans, and its frozen one led all three; "Sweet
potato fries, frozen" led sweet potato baked. All four are refused outright
rather than ranked lower, the way a raw row already was for a cooked food. A
row that freezes something already cooked says so and keeps its bonus.

**Asparagus, raw is refused, and only the classification says why.** 753 is
called "Asparagus, all types, raw" in English and "Asparges, uspec., rå" in
Danish, and EFSA classifies it as **canned, sterilised in the package and
industry prepared**. It is the one row in 417 whose Danish name says raw and
whose classification disagrees, and its biotin is borrowed from 649, the canned
asparagus row. The code is itself defective, since asparagus is not a legume,
so the release cannot be asked which of the two is right. What is at stake is
one iodine cell at n=4 from 1982. **A row that cannot say what it is is not
worth one cell**, and the raw asparagus rows 64 and 878 admit nothing.

**Fig, raw is withdrawn.** Frida's "Figs, raw" exists and admits nothing, its
one iodine cell compiled from a table this page already cites, so the food
moves to the section that says so rather than pairing to a dried fig.

## The four decisions, and what decided them

### Kidney beans, cooked: 1816, not the row that led

Thom's rule: **a food must be paired on its own preparation, and a cooked page
food may not take a raw or uncooked row.** Frida has five red kidney bean rows
and the rule leaves two, which the classification cannot separate: 1811 and
1816 are both coded "Kidney bean (dry seeds), PROCESS = Boiling".

| FoodID | row | Danish | biotin | chromium | molybdenum | n |
|---|---|---|---|---|---|---|
| 1811 | Beans, red kidney, cooked, ready to eat | kogte, spiseklare | 4.85 | 13.0 | **205** | 2 |
| 1810 | Beans, red kidney, boiled, canned | kogte, konserves | 1.85 | 0 | 85.5 | 2 |
| 1816 | Beans, red kidney, dried and boiled | **tørret og kogt** | 4.78 | 0 | **13.0** | 1 |

The Danish separates them. **"Tørret og kogt" is dried and boiled**, which is
what this page's cooked legumes are: CoFID 13-659 is "dried, boiled in unsalted
water" and AFCD F000451 is "dried, boiled, drained". 1811 is a ready-to-eat
retail product. **1816 is banked**, and 1815 "Hvide bønner, tørrede og kogt" is
the exact parallel already banked for haricot beans.

Their molybdenum differs by 16x within one report on one bean, 13 against 205.
That is not a reason to prefer the larger figure. It is the measurement of what
choosing the wrong preparation costs, and it is the evidence behind the
chickpea decision below.

### Chickpeas, cooked: banked as a proxy

Frida has no chickpea boiled from dry. 1812 is "kogte, konserves", canned, and
1813 is "dampede, spiseklare", steamed and ready to eat. Steaming is cooking,
so Thom's rule admits 1813, but the kidney bean pair has just shown what a
ready-to-eat product is worth as a stand-in for a home-boiled one. **Banked as
`proxy`**, which is exactly what the grade is for: the figure was measured, and
the food it was measured in is the approximation. A proxy is the grade the
page marks with `~`.

### Rye bread: 413, and not for its boron

Frida has fourteen rye breads and no unspecified one, so the "take the
unqualified row" rule has nothing to take. The classification answers instead.

**This page's rye bread is SR Legacy 18060, "Bread, rye"**, an American
commercial loaf, which is a mixed wheat and rye bread rather than a Danish
wholemeal rugbrød. Of the fourteen, only 413 "Rugbrød, lyst" and 462
"Bondebrød, industrifremstillet" are coded **"Mixed wheat and rye bread and
rolls"**, and 462 adds a production place the page food does not name. Every
other row is coded "Rye only bread and rolls" or "Rye bread and rolls,
wholemeal", which is a different bread. **413 is banked, as `close`**: Jensen
2025's Danish rugbrød is already graded `close` against this same page food for
the same reason.

413 is also the only rye bread admitting molybdenum and boron, and boron has
nine cells on the whole page. That is not why it was chosen, and it is worth
saying so: its molybdenum and boron come from source 1348, a 1980 Finnish
mineral survey, rather than from the Danish bread work that gives it its biotin
and chromium.

### The generic row against the Danish one: one rule, and the Danish name is it

For eight leads Frida carries both an unqualified row and an origin-qualified
twin, and they looked like two analytical campaigns: the generic rows carry
large n on chromium from source 1506, the qualified rows carry n of about 8
across biotin and molybdenum from source 2127, the 2020 DTU vegetable survey,
and report chromium as 0.

The Danish names say these are not two campaigns competing for one food. They
are a food and its subsets.

| page food | banked | its Danish name | passed over |
|---|---|---|---|
| Carrots, raw | **24** | Gulerod, **uspec.** | 559 dansk, 606 importeret, 1761, 1760 |
| Cauliflower, raw | **14** | Blomkål, **uspecificeret** | 799 dansk |
| Tomatoes, raw | **52** | Tomat, **uspec.** | 451 dansk, 624 importeret |
| Brussels sprouts, raw | **41** | Rosenkål, **uspec.** | |
| Apple, raw, with skin | **2** | Æble, **uspec.** | |
| Kale, raw | **23** | Grønkål | 1391 dansk |
| Celeriac, raw | **46** | Selleri, rod | 1485 dansk |
| Red cabbage, raw | **44** | Rødkål | 1750 dansk |
| Spinach, raw | **50** | Spinat | 1741 babyspinat |
| Romaine lettuce, raw | **600** | Salat, Romaine, romersk | 1743 Salat, hjerte |

**An unqualified page food takes the unqualified row.** Where Frida has an
unspecified row it says so in Danish, and where it does not, the unqualified
name is still the general one and the twin is the qualified subset. Frida
itself treats the general row as the parent: the Danish and imported tomato
rows borrow their biotin and iodine from 52, and both carrot subsets borrow
their iodine from 24.

Two of the eight are not origin twins at all and the Danish says so. **1741 is
babyspinat**, a different product, and **1743 is "Salat, hjerte"**, lettuce
hearts rather than a romaine head.

Kale is the case that decides whether Frida can second-source chromium at all,
since `sources.json` records FSANZ's own warning that AFCD's chromium "should be
used with caution". 23 reads **chromium 8.30 at n=44** where 1391 reads **0 at
n=8**, both admitted, both Frida's own. 23 is banked. The two are also
different kales: EFSA classifies 23 as **stem kale** and 1391 as **curly**.

### Carrots: the same rule, and no longer a separate question

24, 559 and 606 are all "Carrot, raw" in English and disagree: chromium 0.80 at
n=67, then 0 at n=6, then 0 at n=2; molybdenum 0, then 2.70, then 0. In Danish
they are unspecified, Danish and imported. **24 is banked**, and the answer the
first read said could only live in the release notes was in the release all
along.

## Two more the classification found

**Poppy seeds are banked as a proxy.** 1292 is called "Poppy seeds" and "Birkes,
frø", and neither name mentions preparation, but EFSA classifies it as
**roasted**. Eight of the ten rows Frida codes as roasted say so in their names
and this is one of the two that do not. This page's poppy seeds are the plain
seed. Its one cell is chromium 75.2 at n=7 over detections of 7.6 to 234.3, a
30x spread that is its own warning.

**Asparagus is refused**, above.

Neither was reachable from any field the earlier extraction kept, and both are
now reported by `foodEx2Flags` on every run.

## A figure can be admitted onto more than one food

`node tools/frida.mjs provenance` reports **64 groups over 202 cells** carrying
a figure, both detection bounds, a determination count and a source that all
agree across two or more foods. `FRIDA-PROVENANCE.md` has the mechanism: Frida
pools a determination across a group of foods and writes it onto each, and
`sourceFood` does not mark that, so the admission rule admits it once per food.

Six groups reach a proposal. **Two of them now land on two banked page foods
each**, and a test holds the list at exactly those two:

| what | across | on the page |
|---|---|---|
| iodine 0.5 (0.4 to 0.65) n=3, src 1055 | **peanuts**, **peanut butter** | **both banked, on Thom's decision** |
| chromium 80 (59 to 100) n=2, src 1079 | **dried apricots**, **dried dates** | **both banked, on the same reading of it** |
| chromium 6.8 (0 to 27.6) n=16, src 1506 | **olive oil**, corn oil, soyabean oil | refined soyabean oil is a page food and is not paired |
| iodine 0.5 (0.35 to 0.7) n=3, src 1055 | **swede**, instant mashed potato | the other is not a page food |
| molybdenum 130 (130 to 130) n=2, src 2184 | **chickpeas steamed**, edamame frozen | edamame is a page food, and its frozen row is refused |
| chromium 1 (1 to 2) n=3, src 1348 | **sweetcorn**, frozen strawberries, canned salmon | the page takes the raw strawberry row |

**Thom's decision on the peanut pair: the figure stands on both.** It is what
source 1055 measured for each food, so both are banked and the same 0.5 will
appear twice under two names. Peanut butter's only other cell, chromium, is
borrowed from the peanut row and is refused, so that entry rests on this one
determination alone.

**The apricot and date pair is banked on the same reading, and it is the one
place this document extends a decision Thom did not make himself.** The two
pairs are the same shape: one 1985 health-food-shop determination set, n=2
detected 59 to 100, carried on both foods, and one of the two foods rests on it
alone, dried apricots here as peanut butter does there. The difference worth
naming is that peanuts and peanut butter are one food in two forms while an
apricot and a date are not, so if the shared figure is a category mean rather
than two answers, this is the pair where it shows. **Reversing it means
unbanking dates or dried apricots, not both**: dried apricots would lose its
only cell, dates would keep its own iodine and molybdenum.

The other four are one banking decision away from the same shape. **The test
that guards this is `no Frida determination reaches the page twice under two
names`**, and it names both allowed pairs, so pairing refined soyabean oil or
edamame later will fail the suite rather than pass unnoticed.

## Small notes on the rest, several of which the new fields closed

**What the page names and the row does not.** Apple, raw, with skin pairs to
"Apple, raw, all varieties", classified W/o core and W/o stem, so the skin is
in it. Cucumber, raw, with peel pairs to "Cucumber, raw", classified
"Cucumbers" with no W/o peel facet, so the peel is in it. Sweetcorn, raw pairs
to "Sweetcorn, on-the-cob, raw", classified W/o cob, so the figure is for
kernels. All three were listed as probably right and are now settled.

**Where the row is more or less specific than the page.** Cherries, sweet, raw
pairs to "Cherry, raw", and EFSA classifies it "Cherries (sweet)", which
answers whether Denmark's cherry here is the sour one; it is graded `exact` on
that. Mushrooms, white, raw pairs to "Champignon, rå", classified "Common
mushrooms", which is Agaricus bisporus. Sesame seeds pairs to "Sesamfrø, hele",
the whole seed, against 471 "afskallede", the hulled one; both carry the same
EFSA code, so the Danish name is what separates them. Tofu, firm pairs to
Frida's only tofu, unqualified on firmness, which is water content against a
figure per 100 g. Cabbage, raw pairs to "Hvidkål", the Danish default.

**Leads resting on a single determination.** Brazil nuts admit iodine alone at
n=2; pumpkin seeds admit all four but every one at n=1; turnip admits chromium
and molybdenum, both n=1; watermelon admits iodine alone. All are honest, and a
single determination is what rules 3 and 4 have the least to say about.

**Wheat bran is the strongest lead on the page.** 617 admits all five
components, boron included, at n=10 to 13.

## What is banked

**77 entries, bringing 237 cells**: chromium 72, iodine 62, molybdenum 54,
biotin 47, boron 2. Not the 2,373 the corpus admits in total. That larger
number is what Frida holds across all 1,240 of its foods, most of which this
page does not name and many of which are meat, and it had been quoted in
planning notes in a way that read as though banking would deliver it. It would
not. A pairing reaches at most five cells.

By grade: **23 exact, 52 close, 2 proxy**. The two proxies are chickpeas and
poppy seeds, and a proxy is the grade the page marks with `~`.

One page food with a candidate above proxy is deliberately absent, and
`FRIDA-MAP-REVIEW.md` says **Not banked** above it: asparagus.

**The pass is wired and 225 of those cells are on the page.** It refuses an
entry without `"reviewed": true`, the way `tools/flavonoids.mjs` refuses an
unreviewed `usda-map.json`. FRIDA-PROVENANCE.md has what each column gained and
where the twelve figures that reached no cell went; the short version is that
chromium stopped being single-source, which is the change this whole exercise
was for.
