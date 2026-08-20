# Frida map proposals, for review

Written by `node tools/frida.mjs propose`. **Every pair here is a suggestion
and none of them is mapped.** Automated name matching is refused in this
project, so nothing reaches `page-map-frida.json` until a person has read it.
The scorer is the one `BIOTIN-MAP-REVIEW.md` uses.

`FRIDA-PROVENANCE.md` is the companion and should be read first: it is why the
"admits" column exists at all. A row's borrowed, undetermined and compiled
values are already gone by the time they reach this table, so a component named
here is one Frida determined itself.

**`partial` marks a mean that sits below its own minimum**, which is not a
defect: the mean divides by every determination while min and max span only the
detections, so a figure that counted non-detects as zero lands under its own
floor. It understates, and the reader is owed the reason.

The old `page-map-frida.json` held 17 slug-to-id pairs in a shape with no
state, no grade and no review, predating the discipline `BIOTIN-MAP-REVIEW.md`
set. Each is quoted above its food below rather than carried across, because a
pairing nobody checked is not evidence that it is right.

## Worth a decision

73 page foods have at least one candidate graded above proxy. The first row of each is what `proposed-page-map-frida.json`
carries.

### Chickpeas, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1813 | Chickpeas, steamed, ready to eat | biotin 8.25 n=2; chromium 0 n=2; molybdenum 130 n=2; iodine 0 n=2 | 18 | close |
| 1812 | Chickpeas, boiled, canned | biotin 5 n=2; chromium 0 n=2; molybdenum 115 n=2; iodine 0 n=2 | 3 | proxy |

### Kidney beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 28 | exact |
| 1816 | Beans, red kidney, dried and boiled | biotin 4.78 n=1; chromium 0 n=1; molybdenum 13 n=1; iodine 0 n=1 | 28 | exact |
| 1809 | Chili beans (red kidney beans in chilisauce) | biotin 3.4 n=2; chromium 0 n=2; molybdenum 85 n=2; iodine 0 n=2 | 20 | close |

### Tofu, firm

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 272 | Tofu, soy bean curd | biotin 10.885 n=2; chromium 0 n=2; molybdenum 29 n=2; iodine 2.5 n=2 partial | 18 | close |

### Seitan

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1784 | Seitan | biotin 5.6925 n=8; chromium 4 n=8 partial; molybdenum 31.125 n=8; iodine 10 n=8 partial | 18 | close |

### Almonds

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 35 | Almond, raw | biotin 82.5 n=1; chromium 6.5 n=1; molybdenum 39.5 n=1; iodine 0.15 n=4 | 18 | close |

### Walnuts

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 647 | Walnuts, dried | biotin 18 n=1; chromium 0 n=1; molybdenum 19.5 n=1; iodine 0 n=1 | 18 | close |

### Peanuts

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 150 | Peanut, dried | chromium 8 n=1; iodine 0.5 n=3 | 18 | close |

### Pistachios

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 328 | Pistachio nuts, dried | biotin 45.5 n=1; chromium 0 n=1; molybdenum 16.5 n=1; iodine 0 n=1 | 18 | close |

### Brazil nuts

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 692 | Brazil nuts, dried, raw | iodine 0.05 n=2 | 28 | exact |
| 88 | Nut, coco, raw | chromium 1.4 n=5; iodine 0.3 n=4 | 18 | proxy |
| 328 | Pistachio nuts, dried | biotin 45.5 n=1; chromium 0 n=1; molybdenum 16.5 n=1; iodine 0 n=1 | 18 | proxy |

### Hazelnuts

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 302 | Hazelnut, dried | biotin 87.75 n=1; chromium 0 n=1; molybdenum 7.15 n=1; iodine 0.333333333333333 n=6 | 18 | close |

### Chia seeds

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1728 | Chia seeds | biotin 24.45 n=1; chromium 8.5 n=1; molybdenum 35.5 n=1; iodine 0 n=1 | 18 | close |

### Flaxseed

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 149 | Linseeds, raw | chromium 2.3 n=10 | 18 | close |

### Pumpkin seeds

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 366 | Pumpkin, raw | iodine 0.15 n=3 | 18 | close |
| 1507 | Pumpkin seed, dried | biotin 13.5 n=1; chromium 8 n=1; molybdenum 157.5 n=1; iodine 0 n=1 | 18 | close |
| 422 | Pumpkin, canned | chromium 3 n=3; molybdenum 0 n=1 partial; iodine 0.7 n=4 | 3 | proxy |

### Sunflower seeds

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 438 | Sunflower seeds, decorticated, dried | biotin 99.8 n=1; chromium 0 n=1; molybdenum 38 n=1 | 18 | close |

### Sesame seeds

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 370 | Sesame seeds, whole | biotin 14.15 n=1; chromium 12.5 n=1; molybdenum 140.5 n=1 | 18 | close |
| 471 | Sesame seed, decorticated | biotin 17.6 n=1; chromium 6 n=1; molybdenum 145.5 n=1 | 18 | close |

### Spinach, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 50 | Spinach, raw | biotin 1.6 n=4; chromium 9.3 n=11; molybdenum 0 n=1 partial; iodine 3.4 n=4 | 18 | close |
| 1741 | Baby spinach, raw | biotin 1.89875 n=8; chromium 11.625 n=8; molybdenum 6.31111111111111 n=9 | 18 | close |
| 843 | Spinach, chopped, frozen | chromium 5 n=4 | 10 | proxy |

### Kale, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 23 | Kale, raw | chromium 8.3 n=44; iodine 1.4 n=3 | 18 | close |
| 1391 | Kale, Danish, raw | biotin 7 n=8; chromium 0 n=8; molybdenum 47.5 n=8; iodine 0 n=8 | 18 | close |
| 888 | Kale, frozen | biotin 2.89 n=8; chromium 4 n=8; molybdenum 16.2875 n=8; iodine 0 n=8 | 10 | proxy |

### Mushrooms, white, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 961 | Mushroom, raw | chromium 0 n=8; molybdenum 1.2375 n=8; iodine 0 n=8 | 18 | close |

### Avocado

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 616 | Avocado, raw | biotin 4.7825 n=8; chromium 0 n=8; molybdenum 1.8125 n=8 | 18 | close |
| 1834 | Avocado, frozen | biotin 5.3 n=2; chromium 0 n=2; molybdenum 1.45 n=2; iodine 5 n=2 | 18 | close |

### Banana

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 3 | Banana, raw | biotin 1.57 n=10; chromium 0 n=10; iodine 0.0477 n=10 partial | 18 | close |

### Blackberries, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1849 | Blackberry, raw | biotin 1.055 n=8; chromium 0 n=8; molybdenum 10.8125 n=8; iodine 0 n=8 | 18 | close |

### Kiwi, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1858 | Kiwi fruit, raw | biotin 1.31 n=8; chromium 0 n=8; molybdenum 0.6625 n=8 partial; iodine 5.75 n=8 partial | 18 | close |

### Cocoa powder, unsweetened

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1256 | Cocoa, powder | chromium 173 n=3; iodine 2.8 n=5 | 28 | exact |
| 162 | Rose hip, dried, powder | chromium 6 n=2; molybdenum 0 n=1 partial; iodine 0.9 n=3 | 18 | proxy |
| 720 | Coffee, instant, powder | chromium 23 n=3 | 18 | proxy |

### Haricot beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 28 | exact |
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |

### Pine nuts, dried

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 806 | Pine nuts, dried | biotin 17.05 n=1; chromium 0 n=1; molybdenum 7.7 n=1 | 28 | exact |
| 88 | Nut, coco, raw | chromium 1.4 n=5; iodine 0.3 n=4 | 18 | proxy |
| 328 | Pistachio nuts, dried | biotin 45.5 n=1; chromium 0 n=1; molybdenum 16.5 n=1; iodine 0 n=1 | 18 | proxy |

### Orange, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 70 | Orange, raw | biotin 0.841818181818182 n=11; chromium 0 n=13; molybdenum 0 n=3 partial; iodine 0.14525 n=20 | 18 | close |
| 560 | Mandarin orange, raw | biotin 0.532 n=5; chromium 0 n=9; molybdenum 0 n=1 partial; iodine 0.0522222222222222 n=9 partial | 18 | close |
| 840 | Marmalade, orange | iodine 0.5 n=4 | 10 | proxy |

### Blueberries, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1848 | Blueberries, raw | biotin 1.36625 n=8; chromium 1 n=8 partial; molybdenum 3.2375 n=8 | 18 | close |
| 1817 | Blueberries, frozen | biotin 0 n=2; chromium 2.45 n=2; molybdenum 1.1 n=2; iodine 0 n=2 | 10 | proxy |

### Strawberries, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1 | Strawberry, raw | biotin 0.701428571428571 n=7; chromium 0.069 n=10 partial; molybdenum 0 n=2 partial; iodine 0.0503 n=10 partial | 18 | close |
| 1819 | Strawberries, frozen | biotin 2.45 n=2; chromium 2.3 n=2; molybdenum 5.3 n=2; iodine 0 n=2 | 10 | proxy |
| 1924 | Strawberry ice cream | biotin 1.9 n=2; chromium 4.8 n=2; molybdenum 5.5 n=2; iodine 12.5 n=2 | 10 | proxy |

### Dried figs, dried

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 348 | Fig, dried | chromium 0.069 n=1; iodine 1.1 n=3 | 28 | exact |
| 58 | Beans, mung, dried, raw | chromium 8.8 n=8 | 18 | proxy |
| 150 | Peanut, dried | chromium 8 n=1; iodine 0.5 n=3 | 18 | proxy |

### Grapefruit, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1856 | Grapefruit, raw | biotin 0 n=8; chromium 0 n=8; molybdenum 0.6875 n=8 partial; iodine 3.125 n=8 partial | 18 | close |

### Raspberries, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1850 | Raspberry, raw | biotin 3.71375 n=8; chromium 0 n=8; molybdenum 7.6375 n=8; iodine 0 n=8 | 18 | close |
| 1818 | Raspberries, frozen | biotin 6.2 n=2; chromium 0 n=2; molybdenum 1.65 n=2 partial; iodine 0 n=2 | 10 | proxy |
| 1927 | Sorbet, raspberry | biotin 2.25 n=2; chromium 5.05 n=2; molybdenum 1.35 n=2; iodine 0 n=2 | 10 | proxy |

### Mango, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1859 | Mango, raw | biotin 0.84375 n=8 partial; chromium 1.125 n=8 partial; molybdenum 0 n=8; iodine 6.5 n=8 partial | 18 | close |
| 1828 | Mango, frozen | biotin 0 n=2; chromium 0 n=2; molybdenum 0 n=2; iodine 0 n=2 | 10 | proxy |

### Apricots, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1851 | Apricot, raw | biotin 0 n=6; chromium 0 n=6; molybdenum 0.566666666666667 n=6 partial | 18 | close |

### Apple, raw, with skin

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 2 | Apple, raw, all varieties | biotin 0.996 n=15; chromium 0.111133333333333 n=15 partial; molybdenum 0 n=2 partial; iodine 0.0978 n=15 partial | 18 | close |
| 1882 | Apple cider, sugar added, alcohol<0.7% | biotin 0.088 n=1; chromium 0 n=2; iodine 0.923 n=10 | 10 | proxy |

### Pear, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 9 | Pear, raw | biotin 0.447 n=10; chromium 0.0230833333333333 n=12 partial; molybdenum 0 n=2 partial; iodine 0.165083333333333 n=12 partial | 18 | close |
| 1881 | Pear cider, sugar added, alcohol<0.7% | biotin 0.089 n=1; chromium 0 n=1; iodine 1.18333333333333 n=6 | 10 | proxy |
| 1883 | Pear cider, artificial sweetener added, alcohol<0.7% | chromium 0 n=1; iodine 1.8425 n=4 | 10 | proxy |

### Cherries, sweet, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1854 | Cherry, raw | biotin 0 n=6; chromium 1 n=6 partial; molybdenum 1.23333333333333 n=6; iodine 0 n=6 | 18 | close |

### Pineapple, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1855 | Pineapple, raw | biotin 0 n=8; chromium 0 n=8; molybdenum 1.8625 n=8; iodine 5.625 n=8 partial | 18 | close |
| 1830 | Pineapple, frozen | biotin 0 n=2; chromium 0 n=2; molybdenum 0 n=2; iodine 0 n=2 | 10 | proxy |
| 1970 | Pizza with ham and pineapple, fast food | biotin 3.465 n=2; chromium 0 n=2; molybdenum 12.5 n=2; iodine 16 n=2 | 10 | proxy |

### Watermelon, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 36 | Watermelon, raw | iodine 0.15 n=4 | 18 | close |

### Radishes, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 39 | Radish, raw | chromium 1 n=5; molybdenum 0 n=2 partial; iodine 1 n=4 | 18 | close |
| 490 | Radish, white, raw | iodine 1.1 n=3 | 18 | close |
| 496 | Horse-radish, raw | chromium 3 n=2; molybdenum 0 n=1 partial; iodine 0.9 n=3 | 18 | close |

### Carrots, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 24 | Carrot, raw | biotin 3.4 n=4; chromium 0.8 n=67; molybdenum 0 n=1 partial; iodine 3 n=12 | 18 | close |
| 559 | Carrot, raw | biotin 2.54166666666667 n=6; chromium 0 n=6; molybdenum 2.7 n=6; iodine 0 n=6 | 18 | close |
| 606 | Carrot, raw | biotin 3.045 n=2; chromium 0 n=2; molybdenum 0 n=2; iodine 0 n=2 | 18 | close |

### Onions, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 716 | Onion, raw | biotin 0.953571428571429 n=14; chromium 0 n=14; molybdenum 0 n=1 partial; iodine 0.152642857142857 n=14 partial | 18 | close |
| 1837 | Pearl onion. frozen | biotin 1.4 n=2; chromium 0 n=2; molybdenum 2.9 n=2; iodine 0 n=2 | 10 | proxy |

### Celery, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 13 | Celery, raw | chromium 1.6 n=25; iodine 1.1 n=5 | 18 | close |
| 46 | Celeriac, celery root, raw | chromium 2.4 n=22; molybdenum 0 n=2 partial; iodine 1 n=6 | 18 | close |
| 767 | Celeriac, celery leaves, raw | iodine 10 n=3 | 18 | close |

### Cucumber, raw, with peel

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 388 | Cucumber, raw | biotin 0.786666666666667 n=9; chromium 0 n=14; molybdenum 0 n=1 partial; iodine 0.498157894736842 n=19 | 18 | close |
| 542 | Cucumber, large, pickled | molybdenum 0 n=4 partial; iodine 1 n=4 | 10 | proxy |

### Peaches, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1853 | Peach, raw | biotin 0 n=8; chromium 0 n=8; molybdenum 1.9625 n=8; iodine 0 n=8 | 18 | close |
| 1884 | Peach Icetea, sugar added | iodine 0.194 n=5 partial | 10 | proxy |
| 1886 | Peach Icetea, artificial sweetener added | iodine 0.243 n=1 | 10 | proxy |

### Plums, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1852 | Plum, raw | biotin 0 n=8; chromium 0 n=8; molybdenum 0.6625 n=8 partial; iodine 0 n=8 | 18 | close |

### Rocket, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1492 | Arugula, rocket, raw | biotin 2.85875 n=8; chromium 11.5714285714286 n=7; molybdenum 31.425 n=8; iodine 2 n=8 partial | 18 | close |

### Celeriac, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 46 | Celeriac, celery root, raw | chromium 2.4 n=22; molybdenum 0 n=2 partial; iodine 1 n=6 | 18 | close |
| 767 | Celeriac, celery leaves, raw | iodine 10 n=3 | 18 | close |
| 1485 | Celeriac, celery root, danish, raw | biotin 4.88571428571429 n=7; chromium 0 n=7; molybdenum 0 n=7; iodine 0 n=7 | 18 | close |

### Tomatoes, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 52 | Tomato, ripe, raw, origin unknown | biotin 2.26214285714286 n=14; chromium 0.0357142857142857 n=14 partial; iodine 0 n=14 | 18 | close |
| 451 | Tomato, Danish, ripe, raw | chromium 0.4 n=12 | 18 | close |
| 624 | Tomato, imported, ripe, raw | chromium 1.5 n=19 | 18 | close |

### Sunflower oil

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1382 | Sunflower oil | chromium 3.8 n=1 | 28 | exact |
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 438 | Sunflower seeds, decorticated, dried | biotin 99.8 n=1; chromium 0 n=1; molybdenum 38 n=1 | 18 | proxy |

### Olive oil, extra virgin

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1467 | Olive oil | chromium 6.8 n=16 | 28 | exact |
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 1382 | Sunflower oil | chromium 3.8 n=1 | 18 | proxy |

### Coconut oil

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1440 | Oil, coconut | chromium 0 n=1; molybdenum 0 n=1 | 28 | exact |
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 704 | Coconut meat, desiccated | biotin 8.45 n=1; chromium 5.86363636363636 n=11; molybdenum 18.5 n=1; iodine 0 n=1 | 18 | proxy |

### Wheat bran

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 617 | Wheat bran | biotin 24 n=4; chromium 4.4 n=2; molybdenum 20 n=10; iodine 2.4 n=13; boron 270 n=10 | 28 | exact |
| 665 | Wheat bread, with wheat bran | chromium 7 n=13 | 28 | exact |
| 189 | Wheat, kernels, whole/cracked | chromium 1.2 n=34; molybdenum 20 n=7; iodine 2.7 n=9 | 18 | proxy |

### Cabbage, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 26 | Cabbage, white, raw | biotin 1.2 n=4; chromium 1.7 n=26; molybdenum 0 n=3 partial; iodine 0.7 n=8 | 18 | close |
| 44 | Cabbage, red, raw | chromium 0.5 n=3; molybdenum 0 n=1 partial; iodine 0.1 n=5 | 18 | close |
| 49 | Cabbage, pointed, raw | iodine 0.3 n=5 | 18 | close |

### Red cabbage, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 44 | Cabbage, red, raw | chromium 0.5 n=3; molybdenum 0 n=1 partial; iodine 0.1 n=5 | 28 | exact |
| 1750 | Cabbage, red, Danish, raw | biotin 1.9275 n=8; chromium 0 n=8; molybdenum 50.475 n=8 | 28 | exact |
| 26 | Cabbage, white, raw | biotin 1.2 n=4; chromium 1.7 n=26; molybdenum 0 n=3 partial; iodine 0.7 n=8 | 18 | proxy |

### Romaine lettuce, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 600 | Lettuce, Cos or romaine, raw | biotin 2.46 n=14; chromium 0.293928571428571 n=14; molybdenum 1.06 n=5 partial; iodine 0.460714285714286 n=14 | 28 | exact |
| 479 | Lettuce, iceberg (incl. crisphead types), raw | biotin 1.4 n=1; chromium 0 n=1 | 18 | proxy |
| 627 | Butterhead lettuce (US), cabbage lettuce (UK), raw | chromium 1.6 n=42; molybdenum 0 n=1 partial; iodine 0.6 n=5 | 18 | proxy |

### Honeydew melon, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1857 | Melon, honeydew, raw | biotin 0.61375 n=8 partial; chromium 0 n=8; molybdenum 0.4125 n=8 partial; iodine 2.875 n=8 partial | 28 | exact |
| 1694 | Galia melon, raw | biotin 0.1775 n=8 partial; chromium 0 n=8; molybdenum 1.1625 n=8; iodine 0 n=8 | 18 | proxy |

### Lemon, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 21 | Lemon, raw | chromium 0.2 n=5; iodine 0.3 n=3 | 18 | close |
| 541 | Lemon sole, raw | chromium 1.8 n=1 | 18 | close |
| 1885 | Lemon Icetea, sugar added | chromium 0 n=1; iodine 0 n=3 | 10 | proxy |

### Raisins

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 880 | Raisin , seedless | chromium 8.8 n=2; molybdenum 0 n=2 partial; iodine 2 n=4 | 18 | close |

### Dried apricots, dried

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 458 | Apricot, dried | chromium 80 n=2 | 28 | exact |
| 58 | Beans, mung, dried, raw | chromium 8.8 n=8 | 18 | proxy |
| 150 | Peanut, dried | chromium 8 n=1; iodine 0.5 n=3 | 18 | proxy |

### Parsley, fresh

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 8 | Parsley, raw | chromium 7 n=5; molybdenum 10 n=1; iodine 13.5 n=8 | 18 | close |
| 976 | Parsley root, raw | chromium 2.8 n=1; iodine 0.4 n=4 | 18 | close |

### Poppy seeds

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1292 | Poppy seeds | chromium 75.2 n=7 | 18 | close |

### Peanut butter, smooth

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1162 | Peanut butter | iodine 0.5 n=3 | 28 | exact |
| 150 | Peanut, dried | chromium 8 n=1; iodine 0.5 n=3 | 18 | proxy |
| 392 | Danish pastry, butter ring | iodine 5.9 n=5 | 18 | proxy |

### Rye bread

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 166 | Rye bread crumbs with brown sugar, average values | iodine 3.4 n=6 | 28 | exact |
| 413 | Rye bread, light | biotin 3.35 n=2; chromium 5.07333333333333 n=3; molybdenum 10 n=7 partial; boron 90 n=7 | 28 | exact |
| 418 | Rye bread, dark, pumpernickel | biotin 5 n=1; chromium 10.05 n=2 | 28 | exact |

### Pumpernickel

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 418 | Rye bread, dark, pumpernickel | biotin 5 n=1; chromium 10.05 n=2 | 18 | close |

### Elderberries, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 28 | Elderberry, raw | chromium 4.1 n=10; iodine 2.5 n=4 | 18 | close |

### Broccoli, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 17 | Broccoli, raw | biotin 7.35 n=8; chromium 0.3425 n=8; molybdenum 0 n=1 partial; iodine 0.1555 n=8 partial | 18 | close |
| 1824 | Broccoli, frozen | biotin 5.56 n=2; chromium 3.4 n=2; molybdenum 4.55 n=2; iodine 0 n=2 | 10 | proxy |

### Brussels sprouts, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 41 | Brussels sprouts, raw | chromium 0.4 n=2; iodine 0.25 n=6 | 28 | exact |
| 1825 | Brussel sprouts, frozen | biotin 7.18 n=2; chromium 1.35 n=2 partial; molybdenum 7.5 n=2; iodine 0 n=2 | 20 | close |

### Cauliflower, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 14 | Cauliflower, all varieties, raw | chromium 1.1 n=51; iodine 0.8 n=8 | 18 | close |
| 799 | Cauliflower, Danish, raw | biotin 6.25625 n=8; chromium 0 n=8; molybdenum 8.775 n=8; iodine 0 n=8 | 18 | close |
| 1005 | Cauliflower, imported, raw | chromium 0.6 n=20 | 18 | close |

### Turnip, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 381 | Turnip, raw | chromium 0.5 n=1; molybdenum 10 n=1 | 18 | close |

### Swede, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 519 | Swede, raw | molybdenum 0 n=2 partial; iodine 0.5 n=3 | 18 | close |

### Green peas, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 55 | Peas, green, raw | biotin 3 n=4; iodine 0.15 n=5 | 28 | exact |
| 1821 | Peas, green, frozen | biotin 6.085 n=2; chromium 4.9 n=2; molybdenum 47.5 n=2 | 20 | close |
| 37 | Pepper, sweet, green, raw | chromium 1.5 n=21; iodine 0.4 n=4 | 18 | proxy |

### Asparagus, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 753 | Asparagus, all types, raw | iodine 0.15 n=4 | 18 | close |

### Sweetcorn, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 31 | Sweetcorn, on-the-cob, raw | chromium 1 n=3; molybdenum 0 n=3 partial; iodine 0.5 n=6 | 18 | close |

## Nothing here rose above proxy

67 page foods, listed because a reviewer needs to see that the search happened and
came back empty rather than that it was skipped. Frida holds meat and dairy too, so
some of these are a page food meeting a food it has nothing to do with.

### Lentils, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1807 | Lentils, green, boiled, canned | biotin 3.7 n=2; chromium 9 n=2; molybdenum 190 n=2; iodine 0 n=2 | 3 | proxy |

### Black beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Pinto beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Split peas, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1789 | Cold cuts, with soy and pea protein | biotin 4.63333333333333 n=6; chromium 0.833333333333333 n=6 partial; molybdenum 22.6666666666667 n=6; iodine 33 n=6 | 10 | proxy |
| 1790 | Mince, with pea protein | biotin 9.63666666666666 n=6; chromium 7.66666666666667 n=6; molybdenum 51.5 n=6; iodine 0 n=6 | 10 | proxy |
| 1791 | Sausage, with pea protein | biotin 12.3333333333333 n=6; chromium 8.66666666666667 n=6; molybdenum 55.3333333333333 n=6; iodine 9.5 n=6 | 10 | proxy |

### Mung beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Green peas, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1789 | Cold cuts, with soy and pea protein | biotin 4.63333333333333 n=6; chromium 0.833333333333333 n=6 partial; molybdenum 22.6666666666667 n=6; iodine 33 n=6 | 10 | proxy |
| 1790 | Mince, with pea protein | biotin 9.63666666666666 n=6; chromium 7.66666666666667 n=6; molybdenum 51.5 n=6; iodine 0 n=6 | 10 | proxy |
| 1791 | Sausage, with pea protein | biotin 12.3333333333333 n=6; chromium 8.66666666666667 n=6; molybdenum 55.3333333333333 n=6; iodine 9.5 n=6 | 10 | proxy |

### Lupin beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Soy milk, unsweetened

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 6 | Milk, whole, konventional (not organic), 3.5 % fat | biotin 1.55454545454545 n=11; chromium 0.05 n=7; molybdenum 5 n=4; iodine 10.7285714285714 n=7 | 18 | proxy |
| 32 | Milk, buttermilk | chromium 0.048 n=22; molybdenum 5 n=6; iodine 12.975 n=4 | 18 | proxy |
| 33 | Milk, partly skimmed, konventional (not organic), 1.5 % fat | biotin 2.1 n=3; chromium 0.123333333333333 n=3; molybdenum 5 n=19; iodine 10.2 n=3 | 18 | proxy |

### Oats, rolled, dry

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 59 | Oats, rolled, average values | biotin 19 n=4; chromium 2.5 n=70; molybdenum 10 n=8; iodine 0.5 n=13 | 10 | proxy |
| 444 | Oats, rolled, enriched | biotin 19 n=4; chromium 2.5 n=70; molybdenum 10 n=8; iodine 0.5 n=13 | 10 | proxy |
| 480 | Oats, rolled, not enriched | biotin 19 n=4; chromium 2.5 n=70; molybdenum 10 n=8; iodine 0.5 n=13 | 10 | proxy |

### Brown rice, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1973 | Rice, boiled | biotin 0 n=2; chromium 0 n=2; molybdenum 19.5 n=2; iodine 0 n=2 | 18 | proxy |
| 166 | Rye bread crumbs with brown sugar, average values | iodine 3.4 n=6 | 10 | proxy |
| 876 | Sugar, brown | chromium 0 n=5 | 10 | proxy |

### Sweet potato, baked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 903 | Sweets, boiled | molybdenum 0 n=4 partial | 18 | proxy |
| 132 | Potato crisps, coarse | biotin 1.3 n=18; chromium 18 n=18; iodine 0 n=18 | 10 | proxy |
| 199 | Pearl-sago (potato starch) | chromium 3 n=3; molybdenum 0 n=3 partial; iodine 0.7 n=4 | 10 | proxy |

### Nutritional yeast

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 319 | Yeast, baker`s, compressed | chromium 0 n=1 partial; molybdenum 0 n=1 partial; iodine 0.6 n=3 | 18 | proxy |
| 1199 | Yeast, dried | iodine 10 n=3 | 18 | proxy |

### Shiitake mushrooms, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 961 | Mushroom, raw | chromium 0 n=8; molybdenum 1.2375 n=8; iodine 0 n=8 | 18 | proxy |

### Oyster mushrooms, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 163 | Oyster, raw | biotin 41 n=2; chromium 12.3 n=1; iodine 60 n=3 | 18 | proxy |
| 961 | Mushroom, raw | chromium 0 n=8; molybdenum 1.2375 n=8; iodine 0 n=8 | 18 | proxy |

### Wild rice, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1973 | Rice, boiled | biotin 0 n=2; chromium 0 n=2; molybdenum 19.5 n=2; iodine 0 n=2 | 18 | proxy |

### Jerusalem artichokes, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 950 | Jerusalem artichoke, raw | chromium 6.4 n=7; iodine 0.1 n=3 | 18 | proxy |

### Swiss chard, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1062 | Swiss roll, unspecified | chromium 8 n=5; molybdenum 10 n=5 partial; boron 50 n=5 | 10 | proxy |

### Cannellini beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Butter beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Adzuki beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Black-eyed peas, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1789 | Cold cuts, with soy and pea protein | biotin 4.63333333333333 n=6; chromium 0.833333333333333 n=6 partial; molybdenum 22.6666666666667 n=6; iodine 33 n=6 | 10 | proxy |
| 1790 | Mince, with pea protein | biotin 9.63666666666666 n=6; chromium 7.66666666666667 n=6; molybdenum 51.5 n=6; iodine 0 n=6 | 10 | proxy |
| 1791 | Sausage, with pea protein | biotin 12.3333333333333 n=6; chromium 8.66666666666667 n=6; molybdenum 55.3333333333333 n=6; iodine 9.5 n=6 | 10 | proxy |

### Millet, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 331 | Millet, flakes | chromium 0.8 n=3 | 10 | proxy |
| 385 | Millet, whole-grain | chromium 3.2 n=14; molybdenum 10 n=2 partial; boron 50 n=2 | 10 | proxy |

### Pearl barley, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 199 | Pearl-sago (potato starch) | chromium 3 n=3; molybdenum 0 n=3 partial; iodine 0.7 n=4 | 10 | proxy |
| 1730 | Pearled barley | biotin 5.75 n=1; chromium 0 n=1; molybdenum 70 n=1 | 10 | proxy |

### Bulgur wheat, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 189 | Wheat, kernels, whole/cracked | chromium 1.2 n=34; molybdenum 20 n=7; iodine 2.7 n=9 | 10 | proxy |
| 615 | Wheat bread, with whole kernels | chromium 5.5 n=24 | 10 | proxy |
| 617 | Wheat bran | biotin 24 n=4; chromium 4.4 n=2; molybdenum 20 n=10; iodine 2.4 n=13; boron 270 n=10 | 10 | proxy |

### Broad beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Potato, baked, with skin

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 132 | Potato crisps, coarse | biotin 1.3 n=18; chromium 18 n=18; iodine 0 n=18 | 10 | proxy |
| 199 | Pearl-sago (potato starch) | chromium 3 n=3; molybdenum 0 n=3 partial; iodine 0.7 n=4 | 10 | proxy |
| 839 | Potato crisps | biotin 1.5 n=20; chromium 6 n=20; iodine 0 n=18 | 10 | proxy |

### Coconut, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 704 | Coconut meat, desiccated | biotin 8.45 n=1; chromium 5.86363636363636 n=11; molybdenum 18.5 n=1; iodine 0 n=1 | 10 | proxy |

### Macadamia nuts, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 88 | Nut, coco, raw | chromium 1.4 n=5; iodine 0.3 n=4 | 18 | proxy |
| 692 | Brazil nuts, dried, raw | iodine 0.05 n=2 | 18 | proxy |

### Bell pepper, green, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 37 | Pepper, sweet, green, raw | chromium 1.5 n=21; iodine 0.4 n=4 | 18 | proxy |
| 38 | Pepper, sweet, red, raw | biotin 1.62866666666667 n=6; chromium 0.116142857142857 n=7 partial; molybdenum 70 n=2; iodine 0.144 n=7 partial | 18 | proxy |
| 1721 | Pepper, sweet, yellow, raw | biotin 1.787 n=2; chromium 0 n=2; molybdenum 0.7 n=1; iodine 0.1015 n=2 partial | 18 | proxy |

### Bell pepper, red, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 37 | Pepper, sweet, green, raw | chromium 1.5 n=21; iodine 0.4 n=4 | 18 | proxy |
| 38 | Pepper, sweet, red, raw | biotin 1.62866666666667 n=6; chromium 0.116142857142857 n=7 partial; molybdenum 70 n=2; iodine 0.144 n=7 partial | 18 | proxy |
| 1721 | Pepper, sweet, yellow, raw | biotin 1.787 n=2; chromium 0 n=2; molybdenum 0.7 n=1; iodine 0.1015 n=2 partial | 18 | proxy |

### Bell pepper, yellow, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 37 | Pepper, sweet, green, raw | chromium 1.5 n=21; iodine 0.4 n=4 | 18 | proxy |
| 38 | Pepper, sweet, red, raw | biotin 1.62866666666667 n=6; chromium 0.116142857142857 n=7 partial; molybdenum 70 n=2; iodine 0.144 n=7 partial | 18 | proxy |
| 1721 | Pepper, sweet, yellow, raw | biotin 1.787 n=2; chromium 0 n=2; molybdenum 0.7 n=1; iodine 0.1015 n=2 partial | 18 | proxy |

### Spring onions, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 716 | Onion, raw | biotin 0.953571428571429 n=14; chromium 0 n=14; molybdenum 0 n=1 partial; iodine 0.152642857142857 n=14 partial | 18 | proxy |
| 1837 | Pearl onion. frozen | biotin 1.4 n=2; chromium 0 n=2; molybdenum 2.9 n=2; iodine 0 n=2 | 10 | proxy |
| 1972 | Spring roll with vegetables, deepfried, fast food | biotin 1.69 n=2; chromium 0 n=2; molybdenum 12 n=2; iodine 3 n=2 partial | 10 | proxy |

### Ginger root, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 46 | Celeriac, celery root, raw | chromium 2.4 n=22; molybdenum 0 n=2 partial; iodine 1 n=6 | 18 | proxy |
| 976 | Parsley root, raw | chromium 2.8 n=1; iodine 0.4 n=4 | 18 | proxy |
| 1485 | Celeriac, celery root, danish, raw | biotin 4.88571428571429 n=7; chromium 0 n=7; molybdenum 0 n=7; iodine 0 n=7 | 18 | proxy |

### Passion fruit, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1858 | Kiwi fruit, raw | biotin 1.31 n=8; chromium 0 n=8; molybdenum 0.6625 n=8 partial; iodine 5.75 n=8 partial | 18 | proxy |
| 1057 | Jam, fruit, average values | iodine 0.3 n=3 | 10 | proxy |
| 1118 | Fruit gums | chromium 4 n=1 | 10 | proxy |

### Pomegranate, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1829 | Pomegranate seeds, frozen | biotin 6.15 n=2; chromium 8.9 n=2; molybdenum 4.35 n=2; iodine 0 n=2 | 10 | proxy |

### Alfalfa sprouts, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 41 | Brussels sprouts, raw | chromium 0.4 n=2; iodine 0.25 n=6 | 18 | proxy |
| 1142 | Alfalfa seeds | chromium 9.1 n=1 | 10 | proxy |
| 1825 | Brussel sprouts, frozen | biotin 7.18 n=2; chromium 1.35 n=2 partial; molybdenum 7.5 n=2; iodine 0 n=2 | 10 | proxy |

### Yeast extract, spread

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 319 | Yeast, baker`s, compressed | chromium 0 n=1 partial; molybdenum 0 n=1 partial; iodine 0.6 n=3 | 18 | proxy |
| 1199 | Yeast, dried | iodine 10 n=3 | 18 | proxy |
| 1218 | Meat extract, cube | iodine 390 n=5 | 18 | proxy |

### Borlotti beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Goji berries, dried

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1831 | Mixed berries. frozen | biotin 2.94 n=2; chromium 3.6 n=2; molybdenum 2.5 n=2; iodine 0 n=2 | 10 | proxy |

### Rapeseed oil

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 1382 | Sunflower oil | chromium 3.8 n=1 | 18 | proxy |
| 1396 | Cod liver oil | iodine 400 n=2 | 18 | proxy |

### Sesame oil

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 370 | Sesame seeds, whole | biotin 14.15 n=1; chromium 12.5 n=1; molybdenum 140.5 n=1 | 18 | proxy |
| 471 | Sesame seed, decorticated | biotin 17.6 n=1; chromium 6 n=1; molybdenum 145.5 n=1 | 18 | proxy |

### Walnut oil

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 647 | Walnuts, dried | biotin 18 n=1; chromium 0 n=1; molybdenum 19.5 n=1; iodine 0 n=1 | 18 | proxy |
| 1382 | Sunflower oil | chromium 3.8 n=1 | 18 | proxy |

### Avocado oil

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 616 | Avocado, raw | biotin 4.7825 n=8; chromium 0 n=8; molybdenum 1.8125 n=8 | 18 | proxy |
| 1382 | Sunflower oil | chromium 3.8 n=1 | 18 | proxy |

### Peanut oil

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 150 | Peanut, dried | chromium 8 n=1; iodine 0.5 n=3 | 18 | proxy |
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 1162 | Peanut butter | iodine 0.5 n=3 | 18 | proxy |

### Flaxseed oil, cold pressed

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 1382 | Sunflower oil | chromium 3.8 n=1 | 18 | proxy |
| 1396 | Cod liver oil | iodine 400 n=2 | 18 | proxy |

### Soybean oil, refined

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 352 | Pop corn, oil and salt added | biotin 6.1 n=20; chromium 7 n=20; iodine 0 n=20 | 18 | proxy |
| 1382 | Sunflower oil | chromium 3.8 n=1 | 18 | proxy |
| 1396 | Cod liver oil | iodine 400 n=2 | 18 | proxy |

### Green beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Pigeon peas, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1789 | Cold cuts, with soy and pea protein | biotin 4.63333333333333 n=6; chromium 0.833333333333333 n=6 partial; molybdenum 22.6666666666667 n=6; iodine 33 n=6 | 10 | proxy |
| 1790 | Mince, with pea protein | biotin 9.63666666666666 n=6; chromium 7.66666666666667 n=6; molybdenum 51.5 n=6; iodine 0 n=6 | 10 | proxy |
| 1791 | Sausage, with pea protein | biotin 12.3333333333333 n=6; chromium 8.66666666666667 n=6; molybdenum 55.3333333333333 n=6; iodine 9.5 n=6 | 10 | proxy |

### Great Northern beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Moth beans, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1075 | Coffee bean, roasted, ground | chromium 10 n=13; iodine 0.5 n=2 | 18 | proxy |
| 1811 | Beans, red kidney, cooked, ready to eat | biotin 4.85 n=2; chromium 13 n=2; molybdenum 205 n=2; iodine 0 n=2 | 18 | proxy |
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |

### Spelt, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1729 | Pearled spelt | biotin 5.1 n=1; chromium 0 n=1; molybdenum 83 n=1 | 10 | proxy |

### White rice, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1815 | White beans, dried and boiled | biotin 5.43 n=1; chromium 0 n=1; molybdenum 17 n=1; iodine 0 n=1 | 18 | proxy |
| 1973 | Rice, boiled | biotin 0 n=2; chromium 0 n=2; molybdenum 19.5 n=2; iodine 0 n=2 | 18 | proxy |
| 77 | Sugar, sucrose, white | chromium 2 n=6; molybdenum 0 n=2 partial | 10 | proxy |

### Oat bran, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 59 | Oats, rolled, average values | biotin 19 n=4; chromium 2.5 n=70; molybdenum 10 n=8; iodine 0.5 n=13 | 10 | proxy |
| 444 | Oats, rolled, enriched | biotin 19 n=4; chromium 2.5 n=70; molybdenum 10 n=8; iodine 0.5 n=13 | 10 | proxy |
| 480 | Oats, rolled, not enriched | biotin 19 n=4; chromium 2.5 n=70; molybdenum 10 n=8; iodine 0.5 n=13 | 10 | proxy |

### Collard greens, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1807 | Lentils, green, boiled, canned | biotin 3.7 n=2; chromium 9 n=2; molybdenum 190 n=2; iodine 0 n=2 | 3 | proxy |

### Mustard greens, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1807 | Lentils, green, boiled, canned | biotin 3.7 n=2; chromium 9 n=2; molybdenum 190 n=2; iodine 0 n=2 | 3 | proxy |

### Turnip greens, cooked

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1807 | Lentils, green, boiled, canned | biotin 3.7 n=2; chromium 9 n=2; molybdenum 190 n=2; iodine 0 n=2 | 3 | proxy |

### Dandelion greens, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 37 | Pepper, sweet, green, raw | chromium 1.5 n=21; iodine 0.4 n=4 | 18 | proxy |
| 55 | Peas, green, raw | biotin 3 n=4; iodine 0.15 n=5 | 18 | proxy |
| 764 | Beans, green, raw | chromium 1.2 n=20; molybdenum 20 n=2; iodine 0.8 n=4 | 18 | proxy |

### Cranberries, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1876 | Cranberry cordial base, artificial sweetener added, dilution: 1+4 | biotin 1.21 n=1; iodine 0.67 n=1 | 10 | proxy |

### Almond butter

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 35 | Almond, raw | biotin 82.5 n=1; chromium 6.5 n=1; molybdenum 39.5 n=1; iodine 0.15 n=4 | 18 | proxy |
| 392 | Danish pastry, butter ring | iodine 5.9 n=5 | 18 | proxy |
| 1015 | Butter, salt not added | chromium 6 n=4 | 18 | proxy |

### Soy protein isolate

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 1786 | Mince, with soy protein | biotin 22.8875 n=8; chromium 6.125 n=8; molybdenum 79.875 n=8; iodine 5.625 n=8 partial | 28 | proxy |
| 1787 | Mince balls, with soy protein | biotin 15.3 n=2; chromium 0 n=2; molybdenum 57.5 n=2; iodine 0 n=2 | 28 | proxy |
| 1788 | Pieces, with soy protein | biotin 21.4666666666667 n=6; chromium 29.1666666666667 n=6; molybdenum 74.6666666666667 n=6; iodine 0 n=6 | 28 | proxy |

### Carob powder

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 162 | Rose hip, dried, powder | chromium 6 n=2; molybdenum 0 n=1 partial; iodine 0.9 n=3 | 18 | proxy |
| 720 | Coffee, instant, powder | chromium 23 n=3 | 18 | proxy |
| 1256 | Cocoa, powder | chromium 173 n=3; iodine 2.8 n=5 | 18 | proxy |

### Maitake mushrooms, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 961 | Mushroom, raw | chromium 0 n=8; molybdenum 1.2375 n=8; iodine 0 n=8 | 18 | proxy |

### Enoki mushrooms, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 961 | Mushroom, raw | chromium 0 n=8; molybdenum 1.2375 n=8; iodine 0 n=8 | 18 | proxy |

### Portabella mushrooms, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 961 | Mushroom, raw | chromium 0 n=8; molybdenum 1.2375 n=8; iodine 0 n=8 | 18 | proxy |

### Mustard greens, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 37 | Pepper, sweet, green, raw | chromium 1.5 n=21; iodine 0.4 n=4 | 18 | proxy |
| 55 | Peas, green, raw | biotin 3 n=4; iodine 0.15 n=5 | 18 | proxy |
| 764 | Beans, green, raw | chromium 1.2 n=20; molybdenum 20 n=2; iodine 0.8 n=4 | 18 | proxy |

### Collard greens, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 37 | Pepper, sweet, green, raw | chromium 1.5 n=21; iodine 0.4 n=4 | 18 | proxy |
| 55 | Peas, green, raw | biotin 3 n=4; iodine 0.15 n=5 | 18 | proxy |
| 764 | Beans, green, raw | chromium 1.2 n=20; molybdenum 20 n=2; iodine 0.8 n=4 | 18 | proxy |

### Turnip greens, raw

| FoodID | Frida row | admits | score | grade |
|---|---|---|---|---|
| 37 | Pepper, sweet, green, raw | chromium 1.5 n=21; iodine 0.4 n=4 | 18 | proxy |
| 55 | Peas, green, raw | biotin 3 n=4; iodine 0.15 n=5 | 18 | proxy |
| 381 | Turnip, raw | chromium 0.5 n=1; molybdenum 10 n=1 | 18 | proxy |

## Frida holds the food and has determined nothing about it

20 page foods. A row matches, and every value on it is borrowed from
another food, undetermined, or compiled from a table this page already cites. This
is not the same answer as the section below and must not be read as one: the
database was asked and had nothing of its own to say.

- Wholewheat pasta, cooked — Frida's "Pasta, boiled" matches and admits nothing
- Cashews — Frida's "Cashew nuts, dry roasted" matches and admits nothing
- Pak choi, raw — Frida's "Pak choi (bok choy), raw" matches and admits nothing
- Watercress, raw — Frida's "Watercress, raw" matches and admits nothing
- Olives, ripe, canned — Frida's "Olives, black, without stones, in brine" matches and admits nothing
- Pecans — Frida's "Pecans, dried" matches and admits nothing
- Chestnuts, roasted — Frida's "Wheat bread, white, with cracked chestnuts" matches and admits nothing
- Papaya, raw — Frida's "Papaya, raw" matches and admits nothing
- Endive, raw — Frida's "Endive (escarole), raw" matches and admits nothing
- Garlic, raw — Frida's "Garlic, raw" matches and admits nothing
- Daikon, raw — Frida's "Radishes, oriental, daikon, Japanese radish, raw" matches and admits nothing
- Fig, raw — Frida's "Figs, raw" matches and admits nothing
- Persimmon, raw — Frida's "Persimmon, kaki fruit, raw" matches and admits nothing
- Lime, raw — Frida's "Lime, raw" matches and admits nothing
- Cinnamon, ground — Frida's "Danish pastry, cinnamon roll" matches and admits nothing
- Cassava, raw — Frida's "Cassava, raw" matches and admits nothing
- Bamboo shoots, raw — Frida's "Bamboo shoots, canned, nonsalted" matches and admits nothing
- Tamarind, raw — Frida's "Tamarind, Indian date, raw" matches and admits nothing
- Kohlrabi, raw — Frida's "Kohlrabi, raw" matches and admits nothing
- Mangetout, raw — Frida's "Sugar pea (Snow pea, Mangetout) raw" matches and admits nothing

## No Frida row reaches the food at all

62 of 222. Preparation does most of this: the page's legumes and
grains are cooked and Frida reports them dried, raw or frozen, which
`scoreCandidate` refuses outright rather than ranking lower.

**Some of it is vocabulary, and a name scorer cannot see through a synonym
by itself.** `ALIASES` in `tools/biotin.mjs` is the hand-written answer, and
it holds two: flaxseed is Frida's "Linseeds, raw" and this page's haricot bean
is Denmark's white bean. Both were found by hand and neither would ever be
found by a scorer. **Anything on this list that this page names in British or
American English and Denmark does not is worth looking up by hand before
believing the absence**, and belongs in `ALIASES` when it is.

- Edamame, cooked
- Tempeh
- Natto
- TVP, dry
- Quinoa, cooked
- Buckwheat, cooked
- Amaranth, cooked
- Hemp seeds, hulled
- Broccoli, cooked
- Spirulina, dried
- Brussels sprouts, cooked
- Couscous, cooked
- Asparagus, cooked
- Artichokes, cooked
- Guava, raw
- Nori, raw
- Kelp, raw
- Tahini, from roasted kernels
- Teff, cooked
- Cauliflower, cooked
- Beetroot, cooked
- Sweetcorn, cooked
- Butternut squash, baked
- Sauerkraut, canned
- Dates
- Miso
- Kohlrabi, cooked
- Lychees, raw
- Courgette, cooked
- Aubergine, cooked
- Parsnips, cooked
- Leeks, cooked
- Shallots, raw
- Turnip, cooked
- Swede, cooked
- Grapes, raw
- Pumpkin, cooked
- Wheatgerm, toasted
- Soybeans, cooked
- Sorghum, grain
- Okra, cooked
- Yam, cooked
- Taro, cooked
- Plantain, baked
- Lotus root, cooked
- Cantaloupe, raw
- Jackfruit, raw
- Kumquat, raw
- Starfruit, raw
- Prunes, dried
- Wakame, raw
- Turmeric, ground
- Basil, fresh
- Oregano, dried
- Kimchi
- Radicchio, raw
- Mangetout, cooked
- Nectarines, raw
- Tangerines, raw
- Mulberries, raw
- Courgette, raw
- Beetroot, raw
