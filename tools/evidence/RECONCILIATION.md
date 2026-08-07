# Cross-source reconciliation

First pass. Compares components measured by more than one source, to decide where a
single best value is defensible and where the spread demands a range.

**Nothing is reconciled into a final value yet.** This records the method, the rules
that fell out of it, and the conflicts found.

## Rule 1: derivation outranks source

The single most useful thing found in this pass. AFCD publishes a per-food
`derivation`, and it changes how a cell should be read:

| Derivation | Plant rows | Treat as |
|---|---|---|
| Analysed | 490 | measured |
| Recipe | 164 | **estimated** (calculated from ingredients and cooking factors) |
| Borrowed | 33 | estimated (taken from a similar food) |
| Imputed | 15 | estimated |
| Label Data | 6 | low quality |
| Estimated | 1 | estimated |

A `Recipe` value is not a measurement of that food. Grading by source alone would
have put 219 of 709 AFCD plant rows on the page as though they were assayed.

MEXT carries the same idea in its notation, where `(n)` means calculated. Any
reconciliation must compare **analysed against analysed**.

## Rule 2: most apparent conflicts are derivation artefacts

Biotin, AFCD versus MEXT, ug/100 g:

| Food | AFCD | AFCD derivation | MEXT | Ratio | Real conflict? |
|---|---|---|---|---|---|
| Brown rice, cooked | 2.9 | Analysed | 2.5 | 1.2x | no, agrees |
| Spinach, raw | 2.5 | Analysed | 2.9 | 0.9x | no, agrees |
| Chickpeas, cooked | 2.5 | **Recipe** | 8.9 | 0.3x | no, not a measurement |
| Split peas, cooked | 2.3 | Recipe | 5.7 | 0.4x | no |
| Kidney beans, cooked | 1.3 | Recipe | 3.7 | 0.4x | no |

Where both sources analysed the food, they agree within 20%. Every large biotin
"disagreement" was AFCD reporting a recipe calculation. Molybdenum behaves the same
way: tofu 68 versus 44 (1.5x) and brown rice 24 versus 34 (0.7x), both analysed,
both acceptable.

## Rule 3: some conflicts are real and must be preserved

Iodine, ug/100 g:

| Food | AFCD | AFCD derivation | MEXT | Verdict |
|---|---|---|---|---|
| **Oats, rolled** | **74** | **Analysed** | not detected | **genuine conflict** |
| Brown rice, cooked | 9.8 | Analysed | not detected | genuine conflict |
| Spinach, raw | 0 | Analysed | 3 | genuine conflict |
| Amaranth | 1 | Analysed | 1 | agrees |
| Buckwheat | 0.7 | Analysed | 1 | agrees |
| Millet, cooked | 0.6 | Recipe | not detected | artefact |

Oats is the sharp one: two national programmes, both analysed, differing by a factor
of at least 74. AFCD reports 74 for hulled and rolled oats independently, so it is
not a transcription slip. Iodine in plants tracks soil and irrigation water, and
Australian and Japanese soils differ, so this may be real geographic variation rather
than error. Either way it must be shown as a range with both sources named, never
averaged to 37.

**This is the case that justifies the whole range mechanism.** A single "best" iodine
value for oats would be wrong whichever number was picked.

## Rule 4: preparation still dominates

Before comparing anything, the preparation must match. Reconciling a dry IFCT legume
against a cooked MEXT row measures hydration, not disagreement. See the leaching
table in `README.md`.

## Coverage after grading by derivation

AFCD plant rows, `present` versus `analysed`:

| Component | Present | Analysed |
|---|---|---|
| iodine | 709 | 490 |
| starch | 709 | 490 |
| caffeine | 709 | 490 |
| beta-tocopherol | 366 | 261 |
| delta-tocopherol | 349 | 251 |
| citric acid | 354 | 243 |
| malic acid | 353 | 242 |
| quinic acid | 330 | 228 |
| molybdenum | 338 | 256 |
| biotin | 264 | 194 |
| fluoride | 241 | 180 |
| oxalic acid | 214 | 146 |
| chromium | 214 | 169 |
| sulphur | 167 | 133 |
| resistant starch | 104 | 88 |
| nickel | 79 | 62 |
| sorbitol | 77 | 56 |
| lutein | 52 | 31 |
| inulin | 46 | 33 |
| raffinose | 21 | 14 |
| stachyose | 16 | 11 |
| tocotrienols | 12 | 9 |
| cobalt | 1 | 1 |

## Rule 5: biotin does not reconcile to a single value

Biotin was the best-covered component of the nine and looked like the safest single
figure. Reconciled across MEXT, CoFID and AFCD it is the **worst**, and Rule 1 does
not explain it: these are analysed values.

| Food | MEXT | CoFID | AFCD (analysed) | Spread |
|---|---|---|---|---|
| Spinach, raw | 2.9 | 0.1 | 2.5 | **29x** |
| Carrots, raw | 2.8 | 0.3 | - | **9.3x** |
| Kidney beans, cooked | 3.7 | 0.5 | 1.3 | **7.4x** |
| Broad beans, cooked | 6.9 | 1.5 | - | 4.6x |
| Mung beans, cooked | 3.3 | 0.9 | - | 3.7x |
| Brown rice, cooked | 2.5 | 1.0 | 2.9 | 2.9x |
| Split peas, cooked | 5.7 | - | 2.3 | 2.5x |
| Avocado | 5.3 | 2.4 | - | 2.2x |
| Broccoli, cooked | 7.1 | 3.5 | - | 2.0x |
| Banana | 1.4 | 2.5 | - | 1.8x |
| Onions, raw | 0.6 | 1.0 | - | 1.7x |
| Black-eyed peas, cooked | 4.8 | 7.0 | - | 1.5x |

Only 4 of 14 agree within 2x. CoFID runs systematically low on vegetables.

The likely cause is method rather than sample: biotin occurs largely protein-bound,
so a figure depends on whether the assay hydrolysed it free, and microbiological
assay, LC-MS/MS and immunoassay do not agree with each other. None of the three
databases states its biotin method per food.

**Biotin must be shown as a range with sources named.** An earlier assessment in this
project called it the strongest single-value candidate of the nine; that was wrong,
and it was wrong because it rested on coverage counts before any cross-comparison had
been done. Coverage is not agreement.

## Status by component

| Component | Reconciles? | Treatment |
|---|---|---|
| Molybdenum | yes, 0.7-1.5x on analysed values | single value defensible |
| Soluble / insoluble fibre | single source (MEXT) | single value, source named |
| Inulin | single source (AFCD) | single value, source named |
| Raffinose / stachyose / verbascose | IFCT primary, AFCD thin | single value, dry basis stated |
| Phytate, saponins | single source (IFCT) | single value, source named |
| **Biotin** | **no, up to 29x** | **range** |
| **Iodine** | **no, oats 74 vs not detected** | **range** |
| **Oxalic acid** | **no, spinach 0.3 vs 0.7** | **range** |

## Still to do

- Reconcile biotin across **three** sources (MEXT, CoFID, AFCD). CoFID covers 1,925
  foods and has not been joined yet; it is the best candidate for a real three-source
  range.
- Reconcile oligosaccharides: IFCT (broken down, dry) against CoFID (lumped, both raw
  and boiled) against AFCD (undifferentiated, largely imputed and to be rejected).
- Reconcile oxalic acid: MEXT against AFCD against IFCT (which reports soluble and
  insoluble separately and is not yet extracted).
- Build reviewed page mappings for CoFID and IFCT. Only MEXT (81 foods) and AFCD
  (15 foods, this pass) exist so far.
- Decide the range rule: how far apart two analysed values may sit before the page
  shows a range rather than a value.
