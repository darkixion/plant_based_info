# Mobile layout: making the table readable on a phone

Written 2026-08-07.

## The problem, measured

The page is unusable on a phone, and the food column is why. Measured against
the built `index.html` in a 360px viewport:

| | measured |
|---|---|
| food column width | 369px |
| viewport width | 360px |
| numeric column width | 127px |
| figures visible without scrolling sideways | 0 |
| y offset of the table | 1874px |
| `documentElement.scrollWidth` | 7394px |

The food column is wider than the whole screen. It is `position:sticky` at
`left:0`, so it covers the scrollport entirely and the reader sees a list of
food names and nothing else. The heart button is cut off at the right edge.

Two further faults sit between a phone and that table:

- **The sidebar stacks above the content.** Below 820px `.shell` collapses to
  one column, so the search box, three destinations, six categories and eight
  nutrient group toggles all sit above the table. That is about two and a half
  screens of scrolling before any data.
- **The page pans sideways into blank space.** `scrollTo(2000, 0)` moves the
  page, and a screenshot at that offset is blank white. This is *not*
  mobile-only: at 1440px `documentElement.scrollWidth` is 7680 against a 1440px
  viewport, and a screenshot at x=3000 is blank there too.

## What this does not change

Nothing above 820px changes, other than the pan fix in part 4. Desktop keeps
the 30px swatch, the heart in every row, the 210px minimum food column and the
sidebar as a fixed column. A test asserts this rather than leaving it to
inspection.

## Breakpoints

No new breakpoint values. The stylesheet already carries 1160, 900, 820 and
700, and this work reuses two of them:

- **820px** is where `.shell` already stops being two columns. That is where the
  sidebar goes behind a menu button.
- **700px** is where the totals grid already sheds its bar column. That is where
  the table compacts.

Adding a fifth value would mean five numbers to keep in step. Two are enough,
and each already means something.

## Part 1: the table below 700px

Pure CSS. `renderTable()` emits identical markup at every width, so there is no
second rendering path to keep in step with the first, and no width for the app
to know about.

- `th.food, td.food` become `width:150px; min-width:0; white-space:normal`. The
  wrap is the load-bearing part: with `nowrap` the column widens to the longest
  name whatever width is asked for.
- The swatch drops from 30px to 18px and the cell aligns to the top of the
  wrapped name rather than centring on it.
- **The heart is dropped** below the breakpoint. Favouriting stays reachable
  from the detail panel, which carries its own. `display:none` takes it out of
  the accessibility tree too, which is what is wanted: a control that is not
  there should not be announced.
- **The alternative name is dropped**, so Adzuki beans loses "(Aduki beans)" and
  Artichokes loses "(Globe artichokes)". In a wrapping 110px name column an alt
  costs two or three extra lines on the longest rows. The detail panel still
  says "also known as", and search still matches on it.
- Column headers wrap. "Vitamin B-12" over two lines is narrower than the same
  words on one. **Cell figures keep `nowrap`**, because a wrapped number is a
  misread number.
- Cell padding goes from 12px to 8px and the body font from 13.5px to 13px.

Measured with these rules applied to the built page at 360px: food column
**144px**, first two figure columns **85px** and **86px**, row height unchanged
at **54px**, and two full figures plus part of a third on screen.

`--foodw`, which positions the sticky group labels, is measured from the
rendered header by `syncHeadOffset()`, so the labels follow the narrower column
without being told.

### The caption

At 360px the caption reads `131 vegan foods, all 68 nutrient columns. Values p`
and then runs off the screen. The caption box is as wide as the table, 10,098px,
so its text has nowhere to wrap to and simply extends past the scrollport.

Its text moves into a `<span>` that is `position:sticky; left:0` with a width
capped to the scrollport, so the caption follows the horizontal scroll and wraps
within what can be seen. This is the same mechanism `.grplabel` already uses for
the group labels, for the same reason.

This is the one part of the table work that touches markup:
`<caption id="cap">` becomes `<caption><span id="cap"></span></caption>`.
`app.ts` keeps setting `.textContent` on `#cap` and does not change.

## Part 2: the sidebar behind a menu button, below 820px

A button at the left of the top bar, carrying a hamburger icon and the word
Menu, with `aria-expanded` and `aria-controls` pointing at the sidebar.

The state is one attribute on `.shell`:

```css
@media (max-width:820px){
  .side{display:none}
  .shell[data-nav=open] .side{display:block}
}
```

Above 820px neither rule applies, so the sidebar is shown whatever the attribute
says. That is the point of writing it this way: there is no resize listener to
get wrong, and no way for a state left over from a narrow window to strand the
sidebar off screen on a wide one. The button is itself `display:none` above the
breakpoint.

Choosing a **category** or a **destination** (Foods, Favourites, My day) closes
the menu, because the result of that choice is in the table behind it. Toggling
a **nutrient group** does not, because that is a multi-select someone works
through several at a time. Typing in **search** does not either.

**Search stays inside the menu.** With the menu closed there is no search box on
screen, which is a real cost, and the alternative is to move it out to sit
permanently above the table. That is more work and it changes the desktop layout,
which this spec is committed to leaving alone. One tap from the top of the page
is judged good enough for now. Recorded here so the next reader knows it was
weighed rather than missed.

## Part 3: the horizontal pan

The requirement, at every viewport width:

- the page does not scroll horizontally,
- `.tablewrap` still does,
- the sticky sidebar, the two sticky header rows and the sticky food column all
  still hold.

The mechanism is not yet known. `overflow-x:clip` was tried on `.split`, on
`.sect`, on `html` and on `html, body`, and **none of the four changed
`documentElement.scrollWidth`**. Bisecting by hiding elements puts the source in
the table's `<thead>`: hiding it drops the root scroll width from 7394 to 377.
Setting the header cells to `position:static` raises it to 10115 instead, so
sticky positioning is clamping the leak rather than causing it.

No fix is specified here, because writing down a guess would be worse than
writing down nothing. The cause gets found first, with systematic-debugging, and
the fix follows from it.

This one does change desktop, by removing a scroll into blank space that has
been there all along. That is a repair rather than a redesign, and it is in
scope by the owner's explicit decision.

## Part 4: verification

The handover's open list already carries the lesson this has to obey:

> A layout verification that names one viewport width will pass while a narrower
> common one breaks.

So the new browser tests run at **320px**, the narrowest common phone viewport,
not at the 360px or 390px this spec quotes measurements from.

- The food column is narrower than the viewport, and at least one figure cell
  has its left and right edges inside the scrollport.
- The page does not scroll horizontally, asserted at 320px **and at 1440px**,
  since the fault is present at both.
- The caption's full text lies within the scrollport.
- The menu button opens and closes the sidebar, and choosing a category closes
  it while toggling a nutrient group does not.
- **A desktop guard**: at 1440px the food column keeps its 210px minimum, the
  swatch is 30px, and the heart and the alternative name are both present. This
  is what holds the "desktop is untouched" promise to something a test run can
  disprove.

## Deliberately not done

So nobody wonders whether it was forgotten:

- No card or list view replacing the table on narrow screens. The table made to
  fit is what was asked for, and a second view would be a second thing to keep
  correct.
- No column chooser or "pin this column" control for phones. The sidebar's
  existing group toggles already narrow the table, and they work as they are.
- No change to the chart, My day or the detail panel beyond what falls out of
  the breakpoints already there.
- Search does not move out of the sidebar, for the reason given in part 2.
- No touch gesture handling. The table scrolls horizontally by touch already.
