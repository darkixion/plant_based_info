# Glucosinolates, myrosinase and preparation

Written 2026-08-14. Research and source verification are complete and recorded
here in full. The dataset records that follow from it are drafted at the foot,
along with one open design question that blocks them.

This document is deliberately longer than the records it supports, because a
food preparation guide is a likely future use of the same research and the
expensive part is the verification, not the writing.

## The question

Brassicas store glucosinolates and the enzyme myrosinase in separate cells. They
meet only when tissue is damaged, and only then does an isothiocyanate such as
sulforaphane form. Sulforaphane is therefore not a constituent of any food. It is
the yield of a reaction that happens on a chopping board, in a pan, or in the
gut.

The practical question a reader has is: **for the food in front of me, in the
state I am going to eat it, is there anything I should do?**

The popular answer is "chop it and leave it 40 minutes". That answer does not
survive checking.

## What was verified, and how

Five primary sources were pulled from NCBI E-utilities on 2026-08-14 and their
abstracts read in full. PubMed's web interface blocks the fetcher with a cookie
wall; `efetch.fcgi` with `rettype=abstract&retmode=text` returns clean text and
is the route to use again.

Every figure below is quoted from the abstract of the named paper. **None of the
full texts has been read**, so anything depending on a table rather than the
abstract is marked as such.

### 1. Okunade 2018, the human trial

> Okunade O, Niranjan K, Ghawi SK, Kuhnle G, Methven L. Supplementation of the
> Diet by Exogenous Myrosinase via Mustard Seeds to Increase the Bioavailability
> of Sulforaphane in Healthy Human Subjects after the Consumption of Cooked
> Broccoli. *Mol Nutr Food Res.* 2018 Sep;62(18):e1700980.
> doi:10.1002/mnfr.201700980. PMID 29806738. University of Reading.

- 12 healthy adults, randomised crossover design.
- 200 g cooked broccoli, with and without 1 g powdered brown mustard.
- All urine collected for 24 h. Sulforaphane N-acetyl-L-cysteine (SF-NAC) by HPLC.
- Broccoli alone: **9.8 ± 5.1 µmol SF-NAC per g creatinine**.
- Broccoli with mustard powder: **44.7 ± 33.9 µmol SF-NAC per g creatinine**.
- The paper's own conclusion: bioavailability "over four times greater".

This is the strongest evidence in the whole area. It is measured in people, on a
cooked food, with a household-scale intervention, and the effect is large. The
error term on the mustard arm is wide, which is what an interindividual response
looks like, not a weakness in the finding.

### 2. Matusheski 2004, the ESP window

> Matusheski NV, Juvik JA, Jeffery EH. Heating decreases epithiospecifier protein
> activity and increases sulforaphane formation in broccoli. *Phytochemistry.*
> 2004 May;65(9):1273-81. doi:10.1016/j.phytochem.2004.04.013. PMID 15184012.
> University of Illinois.

The sentence that matters most in this entire document is in this abstract:

> "a non-bioactive nitrile analog, sulforaphane nitrile, is the primary
> hydrolysis product when plant tissue is crushed at room temperature"

Findings:

- Heating fresh broccoli florets **or** sprouts to **60 °C** before homogenisation
  simultaneously increased sulforaphane formation and decreased sulforaphane
  nitrile formation.
- A significant loss of epithiospecifier protein (ESP) activity paralleled the
  decrease in nitrile.
- Heating to **70 °C and above** decreased formation of both products in florets,
  **but not in sprouts**.
- Quinone reductase induction in cultured mouse hepatoma Hepa 1c1c7 cells
  paralleled the increases in sulforaphane, so the chemistry tracks a bioactivity
  measure rather than only a chromatogram.

ESP is a non-catalytic cofactor of myrosinase that redirects hydrolysis to the
nitrile. It is more heat-sensitive than myrosinase, which is the whole basis of
the mild-heating strategy.

### 3. Wang, Farnham & Jeffery 2012, domestic cooking

> Wang GC, Farnham M, Jeffery EH. Impact of thermal processing on sulforaphane
> yield from broccoli (*Brassica oleracea* L. ssp. *italica*). *J Agric Food
> Chem.* 2012 Jul 11;60(27):6743-8. doi:10.1021/jf2050284. PMID 22471240.
> University of Illinois.

- Four broccoli cultivars, microwave heated, boiled or steamed for various times.
- Nitrile production during hydrolysis of **unheated** broccoli ranged from
  **91 to 52 %** of hydrolysis products across cultivars
  (Pinnacle > Marathon > Patriot > Brigadier).
- Boiling and microwaving caused an initial loss of nitrile with a concomitant
  rise in sulforaphane, followed by loss of sulforaphane, **all within 1 minute**.
- Steaming enhanced sulforaphane yield between **1.0 and 3.0 minutes** in all
  cultivars except Brigadier.
- The paper's own framing: proof of concept that steaming 1.0 to 3.0 min gives
  less nitrile and more sulforaphane from a broccoli meal.

The cultivar spread is the important caveat. Between Pinnacle and Brigadier the
fraction of the reaction going to the useless product nearly doubles, and a
shopper cannot know which cultivar they bought.

### 4. Wu 2018, hydrolysis before stir-frying

> Wu Y, Shen Y, Wu X, Zhu Y, Mupunga J, Bao W, Huang J, Mao J, Liu S, You Y.
> Hydrolysis before Stir-Frying Increases the Isothiocyanate Content of Broccoli.
> *J Agric Food Chem.* 2018 Feb 14;66(6):1509-1515.
> doi:10.1021/acs.jafc.7b05913. PMID 29357241. Zhejiang University of Science and
> Technology.

- Half-lives during stir-frying: sulforaphane **7.7 min**, total ITCs **5.9 min**.
- Myrosinase activity fell by **80 % after 3 minutes** of stir-frying.
- Therefore sulforaphane and total ITCs are **more stable than the enzyme**, and
  the loss during stir-frying is mostly enzyme destruction rather than product
  degradation.
- Hydrolysis for **90 minutes** followed by stir-frying, against direct
  stir-frying: sulforaphane **2.8x**, total ITCs **2.6x**.

This is an independent group from the Illinois lab behind sources 2, 3 and 5,
which matters: the two halves of the practical advice do not come from one
research programme.

### 5. Dosz & Jeffery 2013, frozen broccoli and the daikon rescue

> Dosz EB, Jeffery EH. Modifying the processing and handling of frozen broccoli
> for increased sulforaphane formation. *J Food Sci.* 2013 Sep;78(9):H1459-63.
> doi:10.1111/1750-3841.12221. PMID 23915112. University of Illinois.

- Industrial blanching normally targets peroxidase inactivation, although
  **lipoxygenase** is what actually degrades the product in frozen storage.
- Blanching at **86 °C or higher** inactivated peroxidase, lipoxygenase **and**
  myrosinase.
- Blanching at **76 °C** inactivated 92 % of lipoxygenase while costing only
  **18 %** of myrosinase-dependent sulforaphane formation. This is an industry
  recommendation, not a domestic one.
- Thawing frozen broccoli for **9 hours** did not support sulforaphane formation
  unless an exogenous source of myrosinase was added.
- Broccoli **root** was **not** more heat stable than floret as a myrosinase
  source. A useful negative.
- **Daikon radish root supported sulforaphane formation even when heated at
  125 °C for 10 minutes**, a time and temperature comparable to or greater than
  microwave cooking.
- **0.25 % daikon** added to frozen broccoli, then thawed, supported sulforaphane
  formation with no visible change to the product.

The 125 °C result is the strongest heat-stability finding here and was missed in
the first pass over this literature. It makes daikon a general rescue for cooked
brassicas, not only a frozen-broccoli trick, and we carry `daikon-raw`.

## The conflict, and how it resolves

Two recommendations fall out of these papers and they pull against each other.

**Chop and wait** runs the hydrolysis at room temperature. Matusheski says
plainly that room-temperature crushing makes the nitrile the *primary* product,
and Wang quantifies it at 52 to 91 % depending on cultivar. So the popular advice
runs the reaction under exactly the conditions that favour the inactive compound.

**Steam briefly** destroys ESP while sparing myrosinase, which is why Wang sees
more sulforaphane and less nitrile at 1 to 3 minutes.

Both are nonetheless real results, because **their comparators differ**:

| Study | Intervention | Compared against | Effect |
|---|---|---|---|
| Wu 2018 | 90 min hydrolysis, then stir-fry | direct stir-fry | SF 2.8x |
| Wang 2012 | steam 1 to 3 min | other methods and times | more SF, less nitrile |

Wu's comparator is the worst case: stir-frying immediately destroys 80 % of the
myrosinase in three minutes, so almost anything beats it. Wang's result is about
which product the surviving reaction makes.

**No published study compares chop-and-wait against brief steaming.** That is the
comparison a reader needs and it does not exist. Until it does, the page can say
both beat cooking a brassica hard and immediately, and cannot rank them.

## What is not supported

- **The 40-minute figure has no traceable primary source.** It is repeated
  constantly in popular coverage. The only measured pre-hydrolysis interval found
  is Wu's 90 minutes, and that was chosen as an experimental condition, not
  identified as an optimum. Do not print 40 minutes.
- **Nothing here generalises beyond broccoli by measurement.** All five sources
  are broccoli, apart from the daikon and broccoli-root arms of Dosz & Jeffery.
  Every claim about cabbage, kale, sprouts, cauliflower, kohlrabi, collards,
  mustard greens, turnip, turnip greens, swede, pak choi, rocket, radish or
  watercress is generalisation from the family mechanism.
- **"Cooked brassicas give nothing" is false.** Gut microbiota carry
  thioglucosidase activity and cooked brassicas still yield isothiocyanates,
  reportedly in the range of a few per cent to about 30 % of the ingested dose
  with very wide interindividual variation. Sources for this were identified but
  **not verified**, so it is recorded here as a caution against overclaiming, not
  as a citable fact.
- **Myrosinase activity is not a composition figure.** Established separately on
  2026-08-14: published activity is assay-defined, changes with the substrate
  used, and one paper measuring four vegetables against two substrates reversed
  the rank order of two of them. There is no myrosinase column and should not be
  one. See `HANDOVER-2026-08.md`.

## What the evidence supports per food

The canonical food list is `src/data/nutrients.json` under `foods`, 222 of them.
**Not `src/data/portions.json`**, which covers only a subset and does not carry
the raw variants added in commit `8e70d8b`. Reading portions as the food list is
what produced the wrong inventory in the first draft of this document.

There are **26 brassica rows, 17 raw and 9 cooked**, and state decides
everything.

**Every cooked brassica also has a raw row.** No exceptions:

| vegetable | raw | cooked |
|---|---|---|
| broccoli | `broccoli-raw` | `broccoli-cooked` |
| brussels sprouts | `brussels-sprouts-raw` | `brussels-sprouts-cooked` |
| cauliflower | `cauliflower-raw` | `cauliflower-cooked` |
| kohlrabi | `kohlrabi-raw` | `kohlrabi-cooked` |
| turnip | `turnip-raw` | `turnip-cooked` |
| turnip greens | `turnip-greens-raw` | `turnip-greens-cooked` |
| collard greens | `collard-greens-raw` | `collard-greens-cooked` |
| mustard greens | `mustard-greens-raw` | `mustard-greens-cooked` |
| swede | `swede-raw` | `swede-cooked` |

with eight raw-only rows alongside: `cabbage-raw`, `red-cabbage-raw`,
`kale-raw`, `pak-choi-raw`, `radishes-raw`, `daikon-raw`, `rocket-raw`,
`watercress-raw`.

This pairing is the most useful structural fact here, and it was missed at first.
The glucosinolate-myrosinase story is precisely a story about **state**, and for
nine vegetables the page can put the two states side by side rather than
stranding the guidance on a cooked row with nothing to compare it against. A
reader looking at `broccoli-cooked` has `broccoli-raw` one row away.

**The 17 raw rows need no action.** Chewing is the tissue disruption, the enzyme
is intact, and chop-and-wait is only relevant when heat follows. What they need,
if anything, is the contrast: this row still has its enzyme, the cooked one does
not.

**`broccoli-cooked` carries the real evidence.** Steam 1 to 3 minutes; if cooking
harder, allow hydrolysis before heat; mustard powder if already cooked.

**The other 8 cooked rows** (`brussels-sprouts-cooked`, `cauliflower-cooked`,
`collard-greens-cooked`, `kohlrabi-cooked`, `mustard-greens-cooked`,
`turnip-cooked`, `turnip-greens-cooked`, `swede-cooked`) inherit the mechanism
and none of the measurements.

**Frozen broccoli** is a distinct case worth stating: commercial blanching can
destroy myrosinase, and thawing does not restore it.

## The alliums

Kept separate, because the mechanism is analogous and the evidence is not
interchangeable. Garlic holds alliin and alliinase apart; damage gives allicin.

**Not verified, and carrying a visible contradiction.** The second research pass
reported both that thiosulfinate formation is essentially complete within 10 to
60 seconds of crushing, and that a 10-minute stand before heating is needed.
Those cannot both be load-bearing. If formation finishes inside a minute, the
10-minute rule is not doing what popular advice says it does, and it deserves the
same scepticism that killed the 40-minute figure.

Do not write the garlic guidance until Song & Milner and the thiosulfinate
kinetics paper have been pulled and read the way the five above were.

## Integration: the blocker

The natural home is `src/data/interactions.json`, and the schema needs less
extending than expected. `build.mjs:724-725` already allows
`when: "preparation"` and `agent.kind: "practice"`.

The blocker is `build.mjs:740-741`, which refuses a record whose `affects` names
an evidence column. Glucoraphanin and glucosinolates are both evidence columns.

That guard is not arbitrary. `sourceOf()` in `src/app.ts:394` walks `VNUTS`,
which excludes evidence columns, so a record affecting glucoraphanin would never
appear in a food's detail panel. It would render only in the Absorption dialog,
which builds from every record regardless. The record would look added and be
invisible where a reader would look for it.

`dayPairings()` is unaffected: it filters to `when === "same meal"` at
`src/app.ts:2222`, so preparation records never reach the day view.

### The open question

A preparation record does not fit the `affects` plus `direction` model cleanly
even if the guard is relaxed. Chopping *lowers* glucoraphanin and *creates*
sulforaphane, which has no column. Recording `direction: "down"` on glucoraphanin
is literally true and reads to a user as a warning, which is the opposite of the
intended message.

Three options, in the order I would consider them:

1. **A separate `src/data/preparation.json`** with its own build check and its own
   dialog. Conceptually cleanest: this is not a bioavailability interaction, and
   it is the shape a future food preparation guide would want anyway.
2. **Relax the evidence-column guard for `when: "preparation"` only**, and give
   the detail panel a second rule so such records surface on brassica rows.
   Smallest data change, real app.ts work, and it stretches "absorption" to cover
   something that is not absorption.
3. **Attach the records to a valued nutrient instead.** Rejected: there isn't an
   honest one, and forcing it would put brassica prep advice under an unrelated
   column.

Recommendation: option 1, given the stated intention to build a preparation guide
later. Option 2 is the cheaper path if these claims are wanted on the existing
Absorption page in the near term.

## The records, drafted

Written in the existing `interactions.json` record shape, because the record
content is the same under options 1 and 2 and only its home differs. Five records
and five sources. Every `text` clears the 40-character minimum at
`build.mjs:751`, every `cites` key resolves, and every source is cited by at
least one record, which is the check at `build.mjs:775-777`.

`affects` names `glucoraphanin` throughout. Under option 2 this needs the guard
at `build.mjs:740-741` scoped to `when !== "preparation"`. Under option 1 the new
file's own check decides what `affects` may name.

```json
{
  "sources": {
    "okunade2018": "Okunade O, Niranjan K, Ghawi SK, Kuhnle G, Methven L. Supplementation of the diet by exogenous myrosinase via mustard seeds to increase the bioavailability of sulforaphane in healthy human subjects after the consumption of cooked broccoli. Mol Nutr Food Res. 2018;62(18):e1700980.",
    "matusheski2004": "Matusheski NV, Juvik JA, Jeffery EH. Heating decreases epithiospecifier protein activity and increases sulforaphane formation in broccoli. Phytochemistry. 2004;65(9):1273-81.",
    "wang2012": "Wang GC, Farnham M, Jeffery EH. Impact of thermal processing on sulforaphane yield from broccoli (Brassica oleracea L. ssp. italica). J Agric Food Chem. 2012;60(27):6743-8.",
    "wu2018": "Wu Y, Shen Y, Wu X, Zhu Y, Mupunga J, Bao W, Huang J, Mao J, Liu S, You Y. Hydrolysis before stir-frying increases the isothiocyanate content of broccoli. J Agric Food Chem. 2018;66(6):1509-15.",
    "dosz2013": "Dosz EB, Jeffery EH. Modifying the processing and handling of frozen broccoli for increased sulforaphane formation. J Food Sci. 2013;78(9):H1459-63."
  },
  "interactions": [
    {
      "id": "glucoraphanin-mustard",
      "affects": ["glucoraphanin"],
      "direction": "up",
      "agent": { "kind": "practice", "label": "Mustard powder on cooked brassicas" },
      "short": "Mustard powder",
      "when": "preparation",
      "text": "Cooking destroys a brassica's own myrosinase, so its glucoraphanin arrives largely unconverted and the sulforaphane never forms. Mustard seed myrosinase survives better, and putting it back restores the reaction on the plate. Twelve adults ate 200 g of cooked broccoli with and without 1 g of powdered brown mustard: the mustard raised urinary sulforaphane metabolite from 9.8 to 44.7 micromoles per gram of creatinine, more than fourfold. Measured with cooked broccoli, so it is a reasonable expectation for the other cooked brassicas rather than a result in them.",
      "cites": ["okunade2018"]
    },
    {
      "id": "glucoraphanin-steam",
      "affects": ["glucoraphanin"],
      "direction": "up",
      "agent": { "kind": "practice", "label": "Steaming briefly" },
      "short": "Brief steaming",
      "when": "preparation",
      "text": "Steaming broccoli for one to three minutes gives more sulforaphane than eating it raw. The cofactor that diverts the reaction towards an inactive nitrile is destroyed by heat sooner than myrosinase is, so gentle heat removes the diversion while leaving the enzyme working. Heating to 60 C before crushing raises sulforaphane and lowers the nitrile together; at 70 C and above both fall away. Boiling and microwaving cross the same window but are through it inside a minute.",
      "cites": ["wang2012", "matusheski2004"]
    },
    {
      "id": "glucoraphanin-chop-first",
      "affects": ["glucoraphanin"],
      "direction": "up",
      "agent": { "kind": "practice", "label": "Chopping before cooking" },
      "short": "Chopping first",
      "when": "preparation",
      "text": "Chopping starts the reaction while the enzyme is still alive, so that something has formed before heat destroys it. Broccoli hydrolysed for 90 minutes before stir-frying gave 2.8 times the sulforaphane of broccoli stir-fried straight away, because myrosinase loses 80 per cent of its activity in three minutes of stir-frying while sulforaphane itself lasts far longer. The commonly repeated 40 minute figure has no traceable source. Note that crushing at room temperature still sends most of the reaction to the inactive nitrile, so this is better than cooking a brassica hard immediately, and has never been tested against steaming it briefly.",
      "cites": ["wu2018", "matusheski2004"]
    },
    {
      "id": "glucoraphanin-frozen",
      "affects": ["glucoraphanin"],
      "direction": "down",
      "agent": { "kind": "practice", "label": "Commercial freezing" },
      "short": "Commercial freezing",
      "when": "preparation",
      "text": "Commercially frozen broccoli is blanched before freezing, and blanching at 86 C or above destroys myrosinase along with the enzymes the blanching is aimed at. Thawing does not bring it back: nine hours of it produced no sulforaphane unless an enzyme source was added. The glucoraphanin survives, so the figure in this table is not wrong and gut bacteria still convert some of it, but the fast route on the plate has gone.",
      "cites": ["dosz2013"]
    },
    {
      "id": "glucoraphanin-daikon",
      "affects": ["glucoraphanin"],
      "direction": "up",
      "agent": { "kind": "food", "slug": "daikon-raw" },
      "short": "Daikon",
      "when": "preparation",
      "text": "Daikon myrosinase is unusually heat stable, still supporting sulforaphane formation after ten minutes at 125 C, which is hotter and longer than microwave cooking. A quarter of one per cent stirred into frozen broccoli restored the reaction as it thawed, with no visible change to the food. Broccoli's own root, tested alongside, was no more heat stable than its floret. Shown as a food processing intervention rather than a kitchen one.",
      "cites": ["dosz2013"]
    }
  ]
}
```

### Deliberately not written

- **Nothing for the seventeen raw brassica rows.** Chewing does the tissue damage
  and the enzyme is intact, so there is no action to recommend and a record
  saying so would be noise on seventeen rows. The contrast with their cooked
  twins is worth drawing somewhere, but it belongs in the preparation guide
  rather than in a per-row record.
- **Nothing food-specific for the eight non-broccoli cooked rows.** They inherit
  `glucoraphanin-mustard`, whose text already marks itself as measured in
  broccoli. A per-food record would be eight copies of one generalisation.
- **Nothing for garlic or the onions.** The 10-minute rule contradicts the
  reported reaction kinetics and neither source has been pulled. See The alliums
  above.
- **No myrosinase column, and no sulforaphane column.** Settled separately, for
  two different reasons, both recorded in `HANDOVER-2026-08.md`.
