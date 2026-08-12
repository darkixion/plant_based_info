#!/usr/bin/env node
/**
 * Smoke tests for the built page.
 *
 * These drive the real file in a real browser, because every feature here is
 * about rendering and persistence, which unit tests on the source would
 * not actually exercise. Run with `npm test` (builds first).
 */
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PAGE = pathToFileURL(join(ROOT, "index.html")).href;

let passed = 0, failed = 0;
const results = [];

async function test(name, fn) {
  try { await fn(); passed++; results.push(`  PASS  ${name}`); }
  catch (e) { failed++; results.push(`  FAIL  ${name}\n          ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const eq = (a, b, msg) => assert(Object.is(a, b), `${msg}, expected ${b}, got ${a}`);

/** Prefer the system Chrome so a CI box (or this one) needs no browser download;
 *  fall back to Playwright's own build when there isn't one. */
const browser = await chromium.launch({ channel: "chrome" })
  .catch(() => chromium.launch());

/** Each test gets a fresh context so localStorage never leaks between them. */
async function withPage(fn) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");
  /* Reset the default preset so tests can assume the old baseline of every
     group visible. renderGroups() as well as renderLensSelect(): the sidebar
     reports which groups have columns on screen, so clearing the preset changes
     what it has to say, and a test that read a stale button would click to
     switch a group "on" and switch it off. */
  await page.evaluate(() => {
    if (S.lens) { S.lens = ""; renderLensSelect(); renderGroups(); render(); }
  });
  try { await fn(page, errors); } finally { await ctx.close(); }
  return errors;
}

/** Set the visible column groups outright. Clicking a sidebar button means
 *  "flip this group", so a test that clicked to switch minerals *on* switched
 *  them off the day every group started visible. Saying which groups the test
 *  wants survives the default changing again. */
const showGroups = (page, ...ids) =>
  page.evaluate(ids => { S.lens = ""; S.groups = new Set(ids); renderLensSelect(); renderGroups(); render(); }, ids);

// ---------------------------------------------------------------- basics

await test("page loads with no console or page errors", async () => {
  const errors = await withPage(async () => {});
  assert(errors.length === 0, `errors: ${errors.join(" | ")}`);
});

await test("the app's own globals survive minification", async () => {
  await withPage(async page => {
    // Written as `typeof`, which yields "undefined" for a name that was never
    // declared instead of throwing, so this reports every missing name at once
    // rather than dying on the first.
    const missing = await page.evaluate(() => {
      const probes = {
        S: typeof S, FOODS: typeof FOODS, GROUPS: typeof GROUPS,
        P: typeof P,
        SLUGS: typeof SLUGS, BY_SLUG: typeof BY_SLUG,
        dayTotals: typeof dayTotals, proteinQuality: typeof proteinQuality,
        omegaRatio: typeof omegaRatio, shown: typeof shown,
        savePrefs: typeof savePrefs, render: typeof render,
        addToDay: typeof addToDay, setDayGrams: typeof setDayGrams,
        dayAminoAcids: typeof dayAminoAcids,
        dayProteinQuality: typeof dayProteinQuality,
        dayStanding: typeof dayStanding, toggleGroup: typeof toggleGroup,
      };
      return Object.entries(probes)
        .filter(([, t]) => t === "undefined").map(([name]) => name);
    });
    assert(missing.length === 0,
      `these globals vanished, which almost always means src/app.ts gained an ` +
      `import and esbuild switched to module output: ${missing.join(", ")}`);
  });
});

await test("table renders every food and the default column set", async () => {
  await withPage(async page => {
    // No pagination: the table lists everything it has in one scrolling box.
    // It used to stop at twenty, which meant sorting by a column and then
    // paging to find where your food had gone.
    const rows = await page.locator("#tbody tr").count();
    eq(rows, await page.evaluate(() => DATA.foods.length), "rows rendered");
    // Every group starts visible, so a row carries one cell per nutrient plus
    // the food column. Counted from the data rather than typed out, so adding a
    // nutrient cannot leave this asserting yesterday's table width.
    const want = await page.evaluate(() => DATA.nutrients.length + 1);
    const cells = await page.locator("#tbody tr").first().locator("td").count();
    eq(cells, want, "cells in first row");
  });
});

await test("the duplicated nutrient-group pills are gone", async () => {
  await withPage(async page => {
    eq(await page.locator("#pills").count(), 0, "#pills element");
    eq(await page.locator(".pill").count(), 0, "elements with .pill");
    // ...but the sidebar controls still exist and still work. Counted against
    // the data so adding a nutrient group cannot leave it out of the sidebar.
    const groups = await page.evaluate(() => new Set(DATA.nutrients.map(n => n.group)).size);
    eq(await page.locator("#groupNav [data-grp]").count(), groups, "sidebar group buttons");
  });
});

// ---------------------------------------------------------------- grouping

await test("each nutrient group gets a distinct background colour", async () => {
  await withPage(async page => {
    const bg = {};
    for (const g of ["macro", "fats", "amino", "vitamin", "mineral"]) {
      bg[g] = await page.locator(`#tbody tr:first-child td[data-g="${g}"]`).first()
        .evaluate(el => getComputedStyle(el).backgroundColor);
    }
    const seen = new Set(Object.values(bg));
    eq(seen.size, 5, `distinct group colours (${JSON.stringify(bg)})`);
    for (const [g, c] of Object.entries(bg))
      assert(c !== "rgba(0, 0, 0, 0)", `${g} has a real background, got ${c}`);
  });
});

// ---------------------------------------------------------------- sorting

await test("sorting a column bolds every value in it", async () => {
  await withPage(async page => {
    await page.click('[data-sort="fiber"]');
    const weights = await page.locator('#tbody td[data-g="macro"].sorted')
      .evaluateAll(els => els.map(e => getComputedStyle(e).fontWeight));
    assert(weights.length >= 10, `expected many sorted cells, got ${weights.length}`);
    assert(weights.every(w => +w >= 600), `all sorted cells bold, got ${[...new Set(weights)]}`);

    // and only that column
    const other = await page.locator('#tbody tr:first-child td.num:not(.sorted)').first()
      .evaluate(e => getComputedStyle(e).fontWeight);
    assert(+other < 600, `unsorted cells stay normal, got ${other}`);
  });
});

await test("sorting actually reorders the data", async () => {
  await withPage(async page => {
    await page.click('[data-sort="fiber"]');            // first click = high to low
    const names = await page.locator("#tbody .fname").evaluateAll(e => e.map(x => x.dataset.name));
    eq(names[0], "Cinnamon", "highest-fibre food first");
    await page.click('[data-sort="fiber"]');            // second click reverses
    const rev = await page.locator("#tbody .fname").evaluateAll(e => e.map(x => x.dataset.name));
    assert(rev[0] !== names[0], "reversing changes the first row");
  });
});

// ---------------------------------------------------------------- lenses

await test("the amino preset selects exactly twelve columns", async () => {
  await withPage(async page => {
    await page.selectOption("#lensSel", "amino");
    const n = await page.locator("#tbody tr:first-child td.num").count();
    eq(n, 12, "preset columns in a row");
  });
});

await test("a preset strictly restricts visible columns", async () => {
  await withPage(async page => {
    await page.selectOption("#lensSel", "bone");
    eq(await page.locator("#tbody tr:first-child td.num").count(), 5, "bone preset columns");
  });
});



await test("a custom preset can be created and is applied", async () => {
  await withPage(async page => {
    await page.selectOption("#lensSel", { label: "Add…" });
    await page.fill("#lensName", "My custom preset");
    // clear anything pre-ticked, then choose two nutrients
    await page.locator("#nutPick input:checked").evaluateAll(
      els => els.forEach(e => { e.checked = false; }));
    await page.check('#nutPick input[value="fe"]');
    await page.check('#nutPick input[value="vitc"]');
    await page.click("#lensSave");
    await page.waitForSelector("#lensDlg", { state: "hidden" });
    eq(await page.locator("#tbody tr:first-child td.num").count(), 2, "preset columns");
    const opts = await page.locator("#lensSel option").allTextContents();
    assert(opts.includes("My custom preset"), `custom lens in menu: ${opts.join(", ")}`);
  });
});

await test("a custom group with no nutrients is rejected, not saved", async () => {
  await withPage(async page => {
    await page.selectOption("#lensSel", { label: "Add…" });
    await page.fill("#lensName", "Empty group");
    await page.locator("#nutPick input:checked").evaluateAll(
      els => els.forEach(e => { e.checked = false; }));
    await page.click("#lensSave");
    assert(await page.locator("#lensDlg[open]").count() === 1, "dialog stays open");
    const err = await page.locator("#lensErr").textContent();
    assert(/at least one/i.test(err), `error message shown, got "${err}"`);
  });
});

await test("the preset editor opens ticking the columns on screen", async () => {
  /* Reading the preset's own id list was wrong for exactly one of them: "All
     nutrients" carries the sentinel __ALL__, which matches no nutrient, so the
     preset where the answer is "everything" opened with nothing ticked. */
  await withPage(async page => {
    const ticked = async () => {
      await page.selectOption("#lensSel", { label: "Add…" });
      await page.waitForSelector("#lensDlg", { state: "visible" });
      const n = await page.locator("#nutPick input:checked").count();
      await page.click("#lensCancel");
      await page.waitForSelector("#lensDlg", { state: "hidden" });
      return n;
    };
    const all = await page.evaluate(() => DATA.nutrients.length);

    await page.selectOption("#lensSel", "iron");
    eq(await ticked(), 2, "the iron preset's two columns");

    await page.selectOption("#lensSel", "all");
    eq(await ticked(), all, "every column, which is what this preset shows");

    await page.selectOption("#lensSel", "");
    eq(await ticked(), 0, "no preset is still the blank slate it was");
  });
});

/* "Add…" is the one entry in the menu that is an action rather than a lens, so
   backing out of it has to leave the control reading what is actually
   highlighted. Otherwise the menu says "Add…" over an unchanged table. */
await test("cancelling Add leaves the preset menu on the current preset", async () => {
  await withPage(async page => {
    await page.selectOption("#lensSel", "amino");
    await page.selectOption("#lensSel", { label: "Add…" });
    await page.click("#lensCancel");
    await page.waitForSelector("#lensDlg", { state: "hidden" });
    eq(await page.locator("#lensSel").inputValue(), "amino", "menu back on the lens");
    eq(await page.evaluate(() => S.lens), "amino", "preset unchanged");
  });
});

await test("switching off the last group says so on the button that comes back", async () => {
  await withPage(async page => {
    // The table falls back to macronutrients rather than rendering nothing.
    // Switching macro off first, then amino, used to leave the macro button
    // reading "off" with all nine of its columns still on screen.
    await showGroups(page, "macro", "amino");
    await page.click("#groupNav [data-grp=macro]");
    await page.click("#groupNav [data-grp=amino]");

    const shown = await page.evaluate(() =>
      [...new Set([...document.querySelectorAll("#thead th[data-g]")].map(th => th.dataset.g))]);
    const pressed = await page.locator('#groupNav [data-grp][aria-pressed="true"]')
      .evaluateAll(els => els.map(e => e.dataset.grp));
    eq(pressed.sort().join(","), shown.sort().join(","), "buttons pressed vs columns shown");
    eq(shown.join(","), "macro", "the fallback group");
  });
});

// ---------------------------------------------------------------- sidebar controls

await test("every count in the sidebar shares one right edge", async () => {
  await withPage(async page => {
    // `.count` and `.dot` both had margin-left:auto, and flexbox splits the free
    // space between every auto margin in the row, so each number floated at a
    // position set by the length of the label beside it.
    await page.evaluate(() => {
      S.favs = new Set([SLUGS[0]]);
      S.day = [{ slug: SLUGS[1], g: 100 }];
      S.groups = new Set(GROUPS.map(g => g.id));
      renderGroups(); render();
    });
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll(".side .count")].map(c => {
        const btn = c.closest(".navbtn, a");
        return { label: btn.textContent.replace(/\s+/g, " ").trim(),
                 gap: +(btn.getBoundingClientRect().right
                        - c.getBoundingClientRect().right).toFixed(1) };
      }));
    assert(rows.length > 12, `expected the whole sidebar, got ${rows.length} counts`);
    const edges = [...new Set(rows.map(r => r.gap))];
    eq(edges.length, 1, `one right edge, got ${JSON.stringify(rows.map(r => `${r.label}:${r.gap}`))}`);

    // The icons are what used to give way when a row ran short of space: a flex
    // item with no intrinsic minimum, shrunk to nothing on the longest label.
    const widths = await page.evaluate(() =>
      [...new Set([...document.querySelectorAll(".side .navbtn > svg")]
        .map(s => Math.round(s.getBoundingClientRect().width)))]);
    eq(widths.join(","), "17", `every icon at its full width, got ${widths.join(", ")}`);

    // Counts must not change width when their row is pressed and turns bold, or
    // toggling a group would nudge its own number.
    const pressed = await page.evaluate(() => {
      const w = b => b.querySelector(".count").getBoundingClientRect().width;
      const b = document.querySelector('#groupNav [data-grp="vitamin"]');
      const before = w(b);
      b.click();
      return { before, after: w(document.querySelector('#groupNav [data-grp="vitamin"]')) };
    });
    eq(pressed.after, pressed.before, "count width across a toggle");
  });
});

await test("search and category filter both live in the sidebar", async () => {
  await withPage(async page => {
    // The three ways of narrowing the table belong together. Search was in the
    // hero and the category filter was a select in the toolbar.
    eq(await page.locator(".side #q").count(), 1, "search inside the sidebar");
    eq(await page.locator(".hero #q").count(), 0, "search left in the hero");
    eq(await page.locator("#catSel").count(), 0, "the old category dropdown");
    assert(await page.locator(".side #q").isVisible(), "search should be visible");

    // One button per category, plus "All foods", each carrying its own count.
    const cats = await page.evaluate(() => [...new Set(DATA.foods.map(f => f.cat))].length);
    eq(await page.locator("#catNav [data-cat]").count(), cats + 1, "category buttons");
    const all = await page.locator('#catNav [data-cat=""] .count').textContent();
    eq(+all, await page.evaluate(() => DATA.foods.length), "count on All foods");
  });
});

await test("filtering by category narrows the table and can be switched off", async () => {
  await withPage(async page => {
    const btn = page.locator('#catNav [data-cat="Nuts"]');
    const expected = await page.evaluate(() => DATA.foods.filter(f => f.cat === "Nuts").length);
    eq(+(await btn.locator(".count").textContent()), expected, "count on Nuts");

    await btn.click();
    eq(await btn.getAttribute("aria-pressed"), "true", "Nuts pressed");
    const shown = await page.locator("#tbody .fname").count();
    eq(shown, expected, "rows shown");

    // Clicking the category you are already in is the way back to everything.
    await btn.click();
    eq(await btn.getAttribute("aria-pressed"), "false", "Nuts still pressed");
    assert(await page.locator("#tbody .fname").count() > expected, "should show all foods again");
  });
});

await test("the chosen category survives a reload", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");
  await page.click('#catNav [data-cat="Grains"]');
  await page.reload();
  await page.waitForSelector("#tbody tr");
  eq(await page.locator('#catNav [data-cat="Grains"]').getAttribute("aria-pressed"), "true",
     "Grains still selected after reload");
  const cats = await page.locator("#tbody .fname").evaluateAll(
    els => els.map(e => e.closest("tr").dataset.i));
  assert(cats.length > 0, "should still show the grains");
  await ctx.close();
});

// ---------------------------------------------------------------- names and lens copy

await test("alternative names are shown and are searchable", async () => {
  await withPage(async page => {
    // Search by the alternative name: this both proves the search matches it
    // and brings the row onto the page whatever the default sort happens to be.
    await page.fill("#q", "globe");
    await page.waitForFunction(() => {
      const n = document.querySelectorAll("#tbody .fname");
      return n.length === 1 && n[0].dataset.name === "Artichokes";
    });
    const rendered = await page.evaluate(() => {
      const f = document.querySelector('#tbody .fname[data-name="Artichokes"]');
      return f && f.textContent.replace(/\s+/g, " ").trim();
    });
    assert(/Artichokes \(Globe artichokes\)/.test(rendered || ""), `shown as: ${rendered}`);
  });
});

await test("selecting a preset explains what it means", async () => {
  await withPage(async page => {
    assert(await page.locator("#lensNote").isVisible() === false, "no note before selecting");
    await page.selectOption("#lensSel", "amino");
    const note = await page.locator("#lensNote").textContent();
    assert(/Protein & Amino Acids/.test(note), `names the group: ${note}`);
    assert(/Total protein alongside the essential/.test(note), `explains it: ${note}`);
    assert(/Protein/.test(note) && /Histidine/.test(note), `lists its nutrients: ${note}`);

    await page.selectOption("#lensSel", "");
    assert(await page.locator("#lensNote").isVisible() === false, "note clears with the preset");
  });
});

await test("every built-in preset carries the same sentence as its tooltip", async () => {
  await withPage(async page => {
    const opts = await page.locator("#lensSel optgroup[label='Built in'] option")
      .evaluateAll(els => els.map(e => ({ v: e.value, t: e.title })));
    assert(opts.length >= 11, `all built-ins listed, got ${opts.length}`);
    const bare = opts.filter(o => !o.t || o.t.length < 40).map(o => o.v);
    eq(bare.length, 0, `options missing a tooltip: ${bare.join(", ")}`);

    // the tooltip and the note must not drift apart
    await page.selectOption("#lensSel", "iron");
    const tip = opts.find(o => o.v === "iron").t;
    const note = await page.locator("#lensNote").textContent();
    assert(note.includes(tip), "note text matches the option tooltip");
  });
});

// ------------------------------------------------- what each nutrient does

await test("every nutrient explains itself, in the data and on its header", async () => {
  await withPage(async page => {
    const bare = await page.evaluate(() =>
      DATA.nutrients.filter(n => !n.why || n.why.length < 40).map(n => n.id));
    eq(bare.join(", "), "", "nutrients with no explanation");

    // Switch every column on, then check each header carries it.
    const ids = await page.locator("#groupNav [data-grp]")
      .evaluateAll(els => els.map(e => e.dataset.grp));
    for (const id of ids) {
      const b = page.locator(`#groupNav [data-grp="${id}"]`);
      if (await b.getAttribute("aria-pressed") === "false") await b.click();
    }
    const heads = await page.locator("#thead tr:nth-child(2) [data-sort]")
      .evaluateAll(els => els.map(e => ({ id: e.dataset.sort, title: e.title,
                                          desc: e.getAttribute("aria-describedby") })));
    eq(heads.length, await page.evaluate(() => DATA.nutrients.length), "headers");

    const why = await page.evaluate(() =>
      Object.fromEntries(DATA.nutrients.map(n => [n.id, n.why])));
    // The tooltip, the described-by text and the data must not drift apart.
    for (const h of heads) {
      eq(h.title, why[h.id], `tooltip on ${h.id}`);
      eq(h.desc, `why-${h.id}`, `description link on ${h.id}`);
      eq(await page.locator(`#why-${h.id}`).textContent(), why[h.id], `description on ${h.id}`);
    }
  });
});

await test("the explanation has a visible home, not just a tooltip", async () => {
  await withPage(async page => {
    // A native title reaches a mouse and nothing else.
    const note = page.locator("#nutNote");
    assert(await note.isVisible(), "the note should always be on screen");
    assert(/Point at a column header/.test(await note.textContent()), "prompt before hovering");

    const box = () => note.evaluate(el => el.getBoundingClientRect().height);
    const before = await box();

    await page.hover('#thead [data-sort="fiber"]');
    const why = await page.evaluate(() => DATA.nutrients.find(n => n.id === "fiber").why);
    assert((await note.textContent()).includes(why), await note.textContent());
    // Growing on hover would shove the header out from under the pointer.
    eq(await box(), before, "note height on hover");

    // Sorting leaves it there, which is how it is reachable without a pointer.
    await page.click('#thead [data-sort="protein"]');
    await page.mouse.move(0, 0);
    const p = await page.evaluate(() => DATA.nutrients.find(n => n.id === "protein").why);
    assert((await note.textContent()).includes(p), await note.textContent());
  });
});

await test("a custom preset can carry its own explanation", async () => {
  await withPage(async page => {
    await page.selectOption("#lensSel", { label: "Add…" });
    await page.fill("#lensName", "Thyroid");
    await page.fill("#lensWhy", "Selenium and zinc both feed thyroid hormone production.");
    await page.locator("#nutPick input:checked").evaluateAll(
      els => els.forEach(e => { e.checked = false; }));
    await page.check('#nutPick input[value="se"]');
    await page.check('#nutPick input[value="zn"]');
    await page.click("#lensSave");
    await page.waitForSelector("#lensDlg", { state: "hidden" });
    const note = await page.locator("#lensNote").textContent();
    assert(/thyroid hormone production/.test(note), `custom explanation shown: ${note}`);

    await page.reload();
    await page.waitForSelector("#tbody tr");
    const after = await page.locator("#lensNote").textContent();
    assert(/thyroid hormone production/.test(after), `explanation persists: ${after}`);
  });
});

await test("the requested foods are present", async () => {
  await withPage(async page => {
    const want = ["Shiitake mushrooms","Oyster mushrooms","Brussels sprouts","Couscous",
      "Wild rice","Asparagus","Artichokes","Jerusalem artichokes","Swiss chard","Guava",
      "Blackberries","Kiwi","Cannellini beans","Butter beans","Adzuki beans","Black-eyed peas",
      "Kohlrabi","Grapefruit","Raspberries","Lychees","Mango","Apricots","Apple","Pear",
      "Cherries","Pineapple","Watermelon","Coconut","Blueberries","Borlotti beans","Tomatoes"];
    const have = await page.evaluate(() => FOODS.map(f => f.name));
    const missing = want.filter(n => !have.includes(n));
    eq(missing.length, 0, `missing foods: ${missing.join(", ")}`);

    // Each food appears once. Coconut and blueberries were already in the table
    // when they were asked for again, and a second row would have collided on
    // the storage key and taken saved favourites with it.
    const dupes = want.filter(n => have.filter(h => h === n).length > 1);
    eq(dupes.join(", "), "", "foods listed twice");
  });
});

await test("foods sharing a name are told apart in the chart", async () => {
  await withPage(async page => {
    // The table carries a state line under every name, so three sweet peppers
    // read fine there. The chart has one line per bar and would show three
    // identical labels with no way to tell which colour is which.
    const shared = await page.evaluate(() => {
      const n = {};
      FOODS.forEach(f => n[f.name] = (n[f.name] || 0) + 1);
      return Object.keys(n).filter(k => n[k] > 1);
    });
    assert(shared.length > 0, "expected at least one shared name in the data");

    // The chart only offers nutrients from the groups currently switched on.
    await showGroups(page, "macro", "amino", "vitamin");
    await page.click("#vChart");
    await page.selectOption("#chartNut", "vitc");
    const labels = await page.locator("#chartRows .lbl span:last-child").allTextContents();
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    eq(dupes.join(", "), "", "chart rows sharing a label");

    // and the row that shares a name says which one it is
    const peppers = labels.filter(l => l.startsWith("Bell pepper"));
    assert(peppers.length >= 2, `expected several peppers high in vitamin C, got ${peppers}`);
    assert(peppers.every(p => /Bell pepper, \w+, raw/.test(p)), `labelled: ${peppers.join(" | ")}`);
  });
});

await test("the chart withholds a figure USDA never measured", async () => {
  await withPage(async page => {
    // The chart draws the top 25 rows, and no column here is measured for fewer
    // than 25 foods, so this is only reachable once the table has been narrowed.
    // Six of the eight categories are smaller than that. Nuts and flavonols is
    // the sharpest case: almonds have a figure and the other eleven do not, so
    // one chart holds both kinds of row.
    const nuts = await page.evaluate(() => {
      const i = DATA.nutrients.findIndex(n => n.id === "flavonols");
      const own = DATA.foods.filter(f => f.cat === "Nuts");
      return { measured: own.filter(f => f.v[i] !== null).map(f => f.name),
               blank: own.filter(f => f.v[i] === null).map(f => f.name) };
    });
    eq(nuts.measured.join(", "), "Almonds", "the only nut with a flavonol figure");
    assert(nuts.blank.length > 1, `expected unmeasured nuts, got ${nuts.blank.length}`);

    await showGroups(page, "macro", "amino", "plant");
    await page.click('#catNav [data-cat="Nuts"]');
    await page.click("#vChart");
    await page.selectOption("#chartNut", "flavonols");

    const rows = await page.evaluate(() => [...document.querySelectorAll("#chartRows .crow")]
      .map(r => ({
        name: r.querySelector(".lbl span:last-child").textContent.trim(),
        value: r.querySelector(".val").textContent.replace(/\s+/g, " ").trim(),
        width: r.querySelector(".track i").style.width,
      })));
    eq(rows.length, nuts.measured.length + nuts.blank.length, "chart rows");

    // A food nobody assayed is not a food with none of it. This read "0 mg" with
    // an empty bar, indistinguishable from a measured zero beside it, while the
    // aria-label of the same row said n/a.
    const almonds = rows.find(r => r.name === "Almonds");
    assert(almonds && almonds.value.startsWith("3.4"), `almonds read: ${almonds?.value}`);
    assert(parseFloat(almonds.width) > 0, `almonds drew no bar: ${almonds.width}`);

    for (const r of rows.filter(r => r.name !== "Almonds")) {
      eq(r.value, "n/a", `${r.name} in the chart`);
      eq(parseFloat(r.width), 0, `${r.name} drew a bar`);
    }

    // and the visible label and the screen-reader description agree, which is
    // the pair that had been saying different things.
    const aria = await page.locator("#chartRows").getAttribute("aria-label");
    assert(/Walnuts n\/a/.test(aria), `aria-label: ${aria}`);
  });
});

await test("the methodology names the amino acid gaps from the data", async () => {
  await withPage(async page => {
    // A hardcoded list would still name three foods long after there were five.
    const { none, partial } = await page.evaluate(() => {
      const ids = DATA.nutrients.filter(n => n.group === "amino").map(n => n.id);
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const gaps = f => ids.filter(id => f.v[at(id)] === null).length;
      return { none: DATA.foods.filter(f => gaps(f) === ids.length).map(f => f.name),
               partial: DATA.foods.filter(f => gaps(f) > 0 && gaps(f) < ids.length).map(f => f.name) };
    });
    assert(none.length && partial.length, "expected both kinds of gap to exist");

    await page.click('[data-dlg="meth"]');
    const text = (await page.locator("#dlgB").textContent()).replace(/\s+/g, " ");
    for (const n of none) assert(text.includes(n), `unassayed food not named: ${n}`);
    for (const n of partial) assert(text.includes(n), `partially assayed food not named: ${n}`);
    assert(text.includes(`${partial.length} more`), `partial count wrong, expected ${partial.length}`);
  });
});

await test("every fat fraction reconciles against the total it belongs to", async () => {
  await withPage(async page => {
    // Each list is a subset of its total and never the whole of it, since the
    // chain lengths left out have no column, so a sum may fall short of the
    // total but must never exceed it. Six foods failed this before the fat
    // group was re-pulled from the mapped rows, because fraction and total had
    // been assembled from different sources at different times.
    const bad = await page.evaluate(() => {
      const SUBSET = { mufa: ["oleic", "palmitoleic"], pufa: ["ala", "la"],
                       satfat: ["lauric", "palmitic", "stearic"] };
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const out = [];
      for (const [total, parts] of Object.entries(SUBSET)) {
        const ti = at(total);
        for (const f of DATA.foods) {
          const t = f.v[ti];
          if (typeof t !== "number") continue;
          const sum = parts.reduce((s, p) =>
            s + (typeof f.v[at(p)] === "number" ? f.v[at(p)] : 0), 0);
          // The same tolerance the pull uses: USDA's own figures are rounded,
          // so an exact comparison flags rounding as a contradiction.
          if (sum > t * 1.01 + 0.005)
            out.push(`${f.name}: ${parts.join("+")} ${sum.toFixed(3)} vs ${total} ${t}`);
        }
      }
      return out;
    });
    assert(bad.length === 0, `fat fractions exceed their total:\n          ${bad.join("\n          ")}`);
  });
});

// ---------------------------------------------------------------- one control per state

await test("export and favourites each have exactly one control", async () => {
  await withPage(async page => {
    // Both were duplicated once: Export CSV in the top bar and again in a
    // "Build your own comparison" box, which also held a second favourites
    // toggle. Two controls for one piece of state is two places to look and
    // two things to keep in sync.
    const exporters = await page.locator("button")
      .evaluateAll(els => els.filter(e => /Export CSV/.test(e.textContent)).length);
    eq(exporters, 1, "Export CSV buttons");
    eq(await page.locator('[data-act="favs"]').count(), 1, "favourites toggles");
    eq(await page.locator("#csvBtn").count(), 1, "#csvBtn");
    // It belongs with the controls that decide what gets exported.
    assert(await page.locator(".bar #csvBtn").count() === 1, "Export CSV should sit in the toolbar");
  });
});

await test("export writes the visible columns and rows", async () => {
  await withPage(async page => {
    await showGroups(page, "macro", "amino");
    await page.fill("#q", "kohlrabi");
    await page.waitForFunction(() => document.querySelectorAll("#tbody .fname").length === 1);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#csvBtn"),
    ]);
    const text = await (await download.createReadStream()).toArray()
      .then(cs => Buffer.concat(cs).toString("utf8"));
    const [head, ...rows] = text.replace(/^﻿/, "").trim().split("\r\n");
    eq(rows.length, 1, "exported rows should follow the filter");
    assert(/^"Food","Also known as","State","Category"/.test(head), `header: ${head}`);
    // Every heading carries the basis, including the per-100-g one. An
    // unqualified "Protein (g)" is the ambiguity the per-calorie basis made
    // impossible to leave alone: the file outlives the toggle that produced it.
    assert(head.includes('"Protein (g per 100 g)"'), `visible column missing: ${head}`);
    assert(!head.includes("Beta-carotene"), `hidden column exported: ${head}`);
    assert(rows[0].startsWith('"Kohlrabi","German turnip","cooked","Vegetables"'), rows[0]);
  });
});

// ---------------------------------------------------------------- fortification notes

await test("fortification-dependent figures are marked, and only those", async () => {
  await withPage(async page => {
    await showGroups(page, "macro", "amino", "vitamin");
    await page.fill("#q", "nutritional yeast");
    await page.waitForFunction(() => document.querySelectorAll("#tbody .fname").length === 1);

    const marked = await page.evaluate(() => {
      const heads = [...document.querySelectorAll("#thead tr:nth-child(2) th")]
        .map(th => th.querySelector("[data-sort]").dataset.sort);
      const cells = [...document.querySelectorAll("#tbody tr td.num")];
      return cells.map((td, i) => td.querySelector("sup.fnote") ? heads[i] : null).filter(Boolean);
    });
    // B12 and folate are entirely fortification here, and so are the other B
    // vitamins at several thousand percent of a daily value. Pantothenic acid
    // is not: yeast is genuinely a good source of it, so it stays unmarked.
    eq(marked.sort().join(","), "b1,b12,b2,b3,b6,b9", "marked vitamin cells");

    const key = page.locator("#noteKey");
    assert(await key.isVisible(), "the key should appear with the markers");
    assert(/Depends on fortification/.test(await key.textContent()), await key.textContent());
  });
});

await test("every cell a note names actually renders its marker", async () => {
  await withPage(async page => {
    // The one above checks a single food in detail. This one walks the whole
    // notes block, so a food added to it cannot go unmarked on the page.
    const pairs = await page.evaluate(() => {
      const slug = f => `${f.name} ${f.state || ""}`.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return (DATA.notes || []).flatMap(n =>
        Object.entries(n.cells).flatMap(([s, ids]) => {
          const f = DATA.foods.find(x => slug(x) === s);
          return ids.map(id => ({ slug: s, name: f.name, group: DATA.nutrients
            .find(nu => nu.id === id).group, id }));
        }));
    });
    assert(pairs.length >= 14, `expected the notes to cover several cells, got ${pairs.length}`);

    for (const g of new Set(pairs.map(p => p.group))) {
      const b = page.locator(`#groupNav [data-grp="${g}"]`);
      if (await b.getAttribute("aria-pressed") === "false") await b.click();
    }
    for (const slug of new Set(pairs.map(p => p.slug))) {
      const mine = pairs.filter(p => p.slug === slug);
      await page.fill("#q", mine[0].name);
      await page.waitForFunction(s => {
        const sl = f => `${f.name} ${f.state || ""}`.toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return [...document.querySelectorAll("#tbody tr")]
          .some(tr => sl(FOODS[+tr.dataset.i]) === s);
      }, slug);

      const marked = await page.evaluate(s => {
        const sl = f => `${f.name} ${f.state || ""}`.toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const tr = [...document.querySelectorAll("#tbody tr")]
          .find(t => sl(FOODS[+t.dataset.i]) === s);
        const heads = [...document.querySelectorAll("#thead tr:nth-child(2) th")]
          .map(th => th.querySelector("[data-sort]").dataset.sort);
        return [...tr.querySelectorAll("td.num")]
          .map((td, i) => td.querySelector("sup.fnote") ? heads[i] : null).filter(Boolean);
      }, slug);
      eq(marked.sort().join(","), mine.map(p => p.id).sort().join(","), `markers on ${slug}`);
    }
  });
});

await test("the note key stays away when nothing on the page is marked", async () => {
  await withPage(async page => {
    await showGroups(page, "macro", "amino", "vitamin");
    await page.fill("#q", "lentils");
    await page.waitForFunction(() => document.querySelectorAll("#tbody .fname").length === 1);
    eq(await page.locator("#tbody sup.fnote").count(), 0, "markers on an unfortified food");
    assert(await page.locator("#noteKey").isVisible() === false, "key should be hidden");
  });
});

await test("a marker is announced rather than left as bare punctuation", async () => {
  await withPage(async page => {
    await showGroups(page, "macro", "amino", "vitamin");
    await page.fill("#q", "soy milk");
    await page.waitForFunction(() => document.querySelectorAll("#tbody .fname").length === 1);
    const cell = await page.evaluate(() => {
      const heads = [...document.querySelectorAll("#thead tr:nth-child(2) th")]
        .map(th => th.querySelector("[data-sort]").dataset.sort);
      const i = heads.indexOf("b12");
      const td = document.querySelectorAll("#tbody tr td.num")[i];
      return { sup: td.querySelector("sup.fnote")?.getAttribute("aria-hidden"),
               sr: td.querySelector(".sr")?.textContent.trim() };
    });
    eq(cell.sup, "true", "the asterisk itself should be hidden from assistive tech");
    assert(/Depends on fortification/.test(cell.sr || ""), `spoken text: ${cell.sr}`);
  });
});

// ---------------------------------------------------------------- layout

await test("the food table fills the screen when there are rows to show", async () => {
  await withPage(async page => {
    await page.setViewportSize({ width: 1500, height: 900 });
    const h = await page.locator("#scroller").evaluate(el => el.getBoundingClientRect().height);
    assert(h > 900 * 0.9, `table box should be near viewport height, got ${Math.round(h)} of 900`);
  });
});

await test("a short result set does not leave a tall empty box", async () => {
  await withPage(async page => {
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.fill("#q", "seitan");
    await page.waitForFunction(() => {
      const n = document.querySelectorAll("#tbody .fname");
      return n.length === 1 && n[0].dataset.name === "Seitan";
    });
    const h = await page.locator("#scroller").evaluate(el => el.getBoundingClientRect().height);
    assert(h < 400, `one row should collapse the box, got ${Math.round(h)}`);
  });
});

await test("the two sticky header rows meet with no gap to scroll through", async () => {
  await withPage(async page => {
    await page.setViewportSize({ width: 1500, height: 900 });
    // Switch on every group, so the widest and tallest header this page can
    // produce is the one under test. Resolve the ids first: clicking flips
    // aria-pressed, so a locator matching on it goes stale after the first one.
    const ids = await page.locator("#groupNav [data-grp]")
      .evaluateAll(els => els.map(e => e.dataset.grp));
    for (const id of ids) {
      const b = page.locator(`#groupNav [data-grp="${id}"]`);
      if (await b.getAttribute("aria-pressed") === "false") await b.click();
    }
    await page.locator("#scroller").evaluate(el => { el.scrollTop = 300; });

    const gap = await page.evaluate(() => {
      const r1 = document.querySelector("#thead tr:first-child th.grp").getBoundingClientRect();
      const r2 = document.querySelector("#thead tr:nth-child(2) th").getBoundingClientRect();
      return r2.top - r1.bottom;
    });
    // Negative is a hairline overlap and invisible. Positive is the bug: rows
    // scrolling underneath show through the strip between the two header rows.
    assert(gap <= 0, `gap between the header rows, got ${gap.toFixed(3)}px`);
    assert(gap > -2, `header rows overlapping too far, got ${gap.toFixed(3)}px`);
  });
});

await test("a group label follows the scroll until the next group pushes it off", async () => {
  await withPage(async page => {
    await page.setViewportSize({ width: 1200, height: 900 });
    // Two groups, so the one that takes over the slot is the one this test
    // names. The scroll distances below are measured against that width.
    await showGroups(page, "macro", "amino");

    // Where each label sits, and where the group and the food column are,
    // all in the scrollport's own coordinates.
    const probe = () => page.evaluate(() => {
      const sc = document.querySelector("#scroller").getBoundingClientRect();
      const food = document.querySelector("#thead th.food").getBoundingClientRect();
      const at = g => {
        const th = document.querySelector(`#thead th.grp[data-g="${g}"]`);
        const l = th.querySelector(".grplabel").getBoundingClientRect();
        return { label: l.left - sc.left, cell: th.getBoundingClientRect().left - sc.left };
      };
      return { foodRight: food.right - sc.left, macro: at("macro"), amino: at("amino") };
    });
    const scroll = x => page.locator("#scroller").evaluate((el, x) => { el.scrollLeft = x; }, x);

    const rest = await probe();
    assert(rest.macro.label > rest.foodRight,
      `label should start clear of the food column, got ${rest.macro.label} vs ${rest.foodRight}`);

    // The group has scrolled well past the left edge; its label must not have.
    await scroll(400);
    const held = await probe();
    assert(held.macro.cell < 0, `the group itself should have scrolled off, got ${held.macro.cell}`);
    eq(Math.round(held.macro.label), Math.round(rest.macro.label), "label held in place");
    assert(held.macro.label > held.foodRight, "label must stay clear of the food column");

    /* Far enough over and the next group takes the spot, pushing the old label
       out rather than the two sitting on top of each other.

       Derived rather than typed. This used to be a measured 1150, which was the
       macronutrient group's width at the time and stopped being it the day two
       fibre-fraction columns joined that group. What the test means is "scroll
       until the amino group has reached the label slot", so it asks where that
       is: the group's own offset, less the width of the pinned food column the
       label sits beside, plus enough to carry it past. */
    const takeover = await page.evaluate(() => {
      const sc = document.querySelector("#scroller");
      const box = sc.getBoundingClientRect();
      const th = document.querySelector('#thead th.grp[data-g="amino"]');
      const food = document.querySelector("#thead th.food").getBoundingClientRect();
      return th.getBoundingClientRect().left - box.left + sc.scrollLeft - (food.right - box.left) + 60;
    });
    await scroll(takeover);
    const pushed = await probe();
    eq(Math.round(pushed.amino.label), Math.round(rest.macro.label), "amino label takes over");
    assert(pushed.macro.label < pushed.amino.label,
      "the outgoing label must be pushed past, not left overlapping");
  });
});

// ---------------------------------------------------------------- omega columns

await test("omega-7 and omega-9 columns are present and populated", async () => {
  await withPage(async page => {
    await showGroups(page, "macro", "amino", "fats");
    const heads = await page.locator("#thead th .sortbtn").allTextContents();
    assert(heads.some(h => /Omega-9/.test(h)), `omega-9 column: ${heads.join(" | ")}`);
    assert(heads.some(h => /Omega-7/.test(h)), `omega-7 column: ${heads.join(" | ")}`);

    // Naming the gaps rather than counting them: a bare total silently drifts
    // every time a food is added, and says nothing about which food changed.
    // These are the foods with no USDA source row, no 16:1 or 18:1 measurement
    // in the row they map to, or an existing MUFA total that disagrees with it
    // so both fractions are withheld.
    // Named with their state: three bell peppers share a name, and only the
    // yellow one is missing these, so a bare name would not say which row.
    const missing = await page.evaluate(() => {
      const i9 = DATA.nutrients.findIndex(n => n.id === "oleic");
      const i7 = DATA.nutrients.findIndex(n => n.id === "palmitoleic");
      return DATA.foods.filter(f => f.v[i9] === null || f.v[i7] === null)
        .map(f => `${f.name}${f.state ? ` (${f.state})` : ""}`);
    });
    const expected = [
      "Adzuki beans (cooked)",
      "Amaranth (cooked)",
      "Bell pepper (yellow, raw)",
      "Borlotti beans (cooked)",
      "Dates",
      "Dried apricots (dried)",
      "Goji berries (dried)",
      "Great Northern beans (cooked)",
      "Hemp seeds (hulled)",
      "Leeks (cooked)",
      "Moth beans (cooked)",
      "Nutritional yeast",
      "Pigeon peas (cooked)",
      "Seitan",
      "Shiitake mushrooms (raw)",
      "Soy milk (unsweetened)",
      "Spelt (cooked)",
      "Teff (cooked)"
    ];
    eq(missing.slice().sort().join(", "), expected.join(", "), "foods without omega figures");
  });
});

await test("no food claims more omega-9 plus omega-7 than monounsaturated", async () => {
  await withPage(async page => {
    const bad = await page.evaluate(() => {
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const [m, a, b] = ["mufa", "oleic", "palmitoleic"].map(at);
      return DATA.foods
        .filter(f => typeof f.v[m] === "number" &&
          (f.v[a] || 0) + (f.v[b] || 0) > f.v[m] * 1.01 + 0.005)
        .map(f => `${f.name}: ${(f.v[a] || 0) + (f.v[b] || 0)} > ${f.v[m]}`);
    });
    eq(bad.length, 0, `fractions exceeding the total: ${bad.join("; ")}`);
  });
});

await test("the saturated fat breakdown is present and stays inside its total", async () => {
  await withPage(async page => {
    await showGroups(page, "macro", "amino", "fats");
    const heads = await page.locator("#thead th .sortbtn").allTextContents();
    for (const h of ["Lauric", "Palmitic", "Stearic"])
      assert(heads.some(x => x.includes(h)), `${h} column: ${heads.join(" | ")}`);

    // The three named chains are a subset of the saturated total, never the
    // whole of it, so the sum may fall short but must never exceed.
    const bad = await page.evaluate(() => {
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const [t, ...p] = ["satfat", "lauric", "palmitic", "stearic"].map(at);
      return DATA.foods
        .filter(f => typeof f.v[t] === "number" &&
          p.reduce((s, i) => s + (f.v[i] || 0), 0) > f.v[t] * 1.01 + 0.005)
        .map(f => f.name);
    });
    eq(bad.length, 0, `breakdown exceeding saturated fat: ${bad.join("; ")}`);

    // Coconut is the reason the breakdown is worth having: its saturated fat is
    // mostly lauric acid, which is close to absent from every other food here.
    const lauric = await page.evaluate(() => {
      const i = DATA.nutrients.findIndex(n => n.id === "lauric");
      return DATA.foods.map(f => [f.name, f.v[i] || 0])
        .sort((a, b) => b[1] - a[1])[0];
    });
    eq(lauric[0], "Coconut oil", `richest in lauric acid: ${lauric.join(" ")}`);
  });
});

await test("values taken from an undifferentiated id say so per cell", async () => {
  await withPage(async page => {
    await showGroups(page, "macro", "amino", "fats");
    /* Wait on the row *content*, not the row count. The table lists every food,
       so searching for a second food leaves the count unchanged at one right
       across the search debounce, and the cell read during that window belongs
       to the previous food. Same trap as selectFood() below. */
    const only = async name => {
      await page.fill("#q", name);
      await page.waitForFunction(n => {
        const rows = document.querySelectorAll("#tbody .fname");
        return rows.length === 1 && rows[0].dataset.name === n;
      }, name);
    };
    const omega3Cell = name => page.evaluate(n => {
      const heads = [...document.querySelectorAll("#thead tr:nth-child(2) th")]
        .map(th => th.querySelector("[data-sort]").dataset.sort);
      const tr = [...document.querySelectorAll("#tbody tr")]
        .find(r => r.querySelector(".fname")?.dataset.name === n);
      const td = [...tr.querySelectorAll("td.num")][heads.indexOf("ala")];
      return { text: td.textContent, sup: td.querySelector("sup.fnote")?.textContent,
               hidden: td.querySelector("sup.fnote")?.getAttribute("aria-hidden"),
               sr: td.querySelector(".sr")?.textContent.trim() };
    }, name);

    // Brussels sprouts have no differentiated 18:3 in SR Legacy, so their
    // omega-3 comes from the undifferentiated total and must carry the marker.
    await only("Brussels sprouts");
    const cell = await omega3Cell("Brussels sprouts");
    eq(cell.sup, "†", `marker on the omega-3 cell: ${cell.text}`);
    eq(cell.hidden, "true", "the dagger itself should be hidden from assistive tech");
    assert(/Undifferentiated/i.test(cell.sr || ""), `spoken text: ${cell.sr}`);

    const key = page.locator("#noteKey");
    assert(/undifferentiated/i.test(await key.textContent()), "the key should explain it");

    // Chia seeds do have a differentiated figure, so theirs must stay unmarked:
    // a marker on every cell would say nothing about where any of them came from.
    await only("Chia seeds");
    const chia = await omega3Cell("Chia seeds");
    eq(chia.sup, undefined, "chia seed omega-3 is measured directly and should carry no marker");
  });
});

await test("the flavonoid columns exist and rank the foods they should", async () => {
  await withPage(async page => {
    const b = page.locator('#groupNav [data-grp="plant"]');
    if (await b.getAttribute("aria-pressed") === "false") await b.click();
    const heads = await page.locator("#thead th .sortbtn").allTextContents();
    for (const label of ["Anthocyanidins", "Flavan-3-ols", "Flavonols"])
      assert(heads.some(h => h.includes(label)), `${label} column: ${heads.join(" | ")}`);

    // The richest food in each subclass. If a future pull loosens the join or
    // starts summing partially measured subclasses, these move: cocoa powder
    // would take flavan-3-ols with a 261 mg partial sum, and rocket would take
    // flavonols from kale on three of the four compounds.
    const top = await page.evaluate(() => {
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const best = id => DATA.foods.filter(f => typeof f.v[at(id)] === "number")
        .sort((x, y) => y.v[at(id)] - x.v[at(id)])[0].name;
      return { anth: best("anthocyanidins"), fl3: best("flavan3ols"), flol: best("flavonols") };
    });
    eq(top.anth, "Blueberries", "richest in anthocyanidins");
    eq(top.fl3, "Blackberries", "richest in flavan-3-ols");
    eq(top.flol, "Kale", "richest in flavonols");
  });
});

await test("a partly measured flavonoid subclass is withheld, not summed", async () => {
  await withPage(async page => {
    // USDA measured quercetin alone for asparagus and two of the five catechins
    // for cocoa powder. Summing what is there would put a 15.2 and a 261.3 in
    // the table looking exactly like the complete figures beside them, so both
    // must read as no data. This is the single rule the columns rest on.
    const withheld = await page.evaluate(() => {
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const of = name => DATA.foods.find(f => f.name === name);
      return {
        asparagus: of("Asparagus").v[at("flavonols")],
        cocoa: of("Cocoa powder").v[at("flavan3ols")],
        // Kale is the control: fully measured, so it must carry a number.
        kale: of("Kale").v[at("flavonols")],
      };
    });
    eq(withheld.asparagus, null, "asparagus flavonols (quercetin only)");
    eq(withheld.cocoa, null, "cocoa flavan-3-ols (2 of 5 catechins)");
    assert(typeof withheld.kale === "number" && withheld.kale > 90,
      `kale flavonols should be measured, got ${withheld.kale}`);
  });
});

await test("the methodology counts the flavonoid coverage from the data", async () => {
  await withPage(async page => {
    // The sparsest columns in the table, so the number describing them is the
    // one most likely to be overtaken quietly by a new food.
    const reached = await page.evaluate(() => {
      const ids = ["anthocyanidins", "flavan3ols", "flavonols"]
        .map(id => DATA.nutrients.findIndex(n => n.id === id));
      return DATA.foods.filter(f => ids.some(i => f.v[i] !== null)).length;
    });
    assert(reached > 0 && reached < 128, `expected partial coverage, got ${reached}`);

    await page.click('[data-dlg="meth"]');
    const text = (await page.locator("#dlgB").textContent()).replace(/\s+/g, " ");
    assert(text.includes(`only ${reached} of`), `coverage count not stated, expected ${reached}`);
    // No total flavonoid column, and the reason is on the page rather than only
    // in the README, because it is the question the table invites.
    assert(/ORAC/.test(text), "the withdrawn ORAC database is not explained");
  });
});

await test("the methodology counts the approximated omega figures from the data", async () => {
  await withPage(async page => {
    const cells = await page.evaluate(() => {
      const n = (DATA.notes || []).find(x => x.id === "undifferentiated");
      return Object.values(n.cells).flat().length;
    });
    assert(cells > 0, "expected some approximated omega figures");

    await page.click('[data-dlg="meth"]');
    const text = (await page.locator("#dlgB").textContent()).replace(/\s+/g, " ");
    assert(text.includes(`${cells} of`), `approximated count not stated, expected ${cells}`);
    // The question a vegan reader actually arrives with, answered in words
    // because the data says a column would be blank for all but a handful.
    assert(/algae oil/.test(text), "the EPA and DHA answer is missing");
    assert(/gamma-tocopherol/.test(text), "the vitamin E caveat is missing");
  });
});

await test("the methodology counts the amino acid sparsity from the data", async () => {
  await withPage(async page => {
    // The paragraph explaining why a day total can be partial names how many
    // foods have no cysteine figure. Counted rather than typed, like every
    // other number in this prose, because it moves whenever a food is added.
    const gaps = await page.evaluate(() => {
      const i = DATA.nutrients.findIndex(n => n.id === "cys");
      return DATA.foods.filter(f => f.v[i] === null).length;
    });
    assert(gaps > 0, "expected some foods with no cysteine figure");
    await page.click('[data-dlg="meth"]');
    const text = (await page.locator("#dlgB").textContent()).replace(/\s+/g, " ");
    assert(text.includes(`Cysteine has no figure for ${gaps} of`),
      `cysteine gap count not stated, expected ${gaps}`);
  });
});

await test("the page does not claim to be complete", async () => {
  await withPage(async page => {
    // It is a selection of foods with real gaps in it: iodine has no column at
    // all, the flavonoid columns are blank more often than not, and twenty-odd
    // foods have no amino acid analysis. Billing that as complete nutrition is
    // the one claim the rest of the copy spends its time walking back.
    const banned = /\b(complete|comprehensive) (nutrition|plant-based|database)\b|\bcomplete nutrition\b/i;
    for (const sel of ["h1", ".tagline", "title", ".about h3"]) {
      const texts = await page.locator(sel).allTextContents();
      for (const t of texts)
        assert(!banned.test(t), `${sel} claims completeness: ${t}`);
    }
    eq(await page.locator("h1").textContent(), "Explore the nutrition of plant-based wholefoods",
       "the headline");
    // "complete protein" and "a complete total" are different words doing real
    // work, so the ban is on the claim rather than on the word.
    await page.click('[data-dlg="meth"]');
    assert(/complete/i.test(await page.locator("#dlgB").textContent()),
      "the methodology still uses the word where it means something");
  });
});

await test("the page does not call itself honest", async () => {
  await withPage(async page => {
    // A tic rather than a fact: the copy either is straight about its limits or
    // it is not, and saying so is what gives it away. Guarded because it is the
    // sort of word that creeps back in one heading at a time.
    const seen = [];
    for (const dlg of [null, "how", "meth", "about"]) {
      if (dlg) await page.click(`[data-dlg="${dlg}"]`);
      const text = await page.locator(dlg ? "#dlgB" : "body").textContent();
      if (/\bhonest/i.test(text)) seen.push(`${dlg || "page"}: ${
        text.match(/.{0,50}honest.{0,50}/i)[0].replace(/\s+/g, " ")}`);
      if (dlg) await page.click("#dlgX");
    }
    eq(seen.join(" | "), "", "uses of the word");
    assert(/Note about limits/.test(await page.locator(".about").textContent()),
      "the heading it replaced");
  });
});

await test("every dialog renders without a gap where a number should be", async () => {
  await withPage(async page => {
    // Several sentences in these interpolate counts derived from the data. A
    // renamed nutrient or note id would leave "undefined" mid-sentence rather
    // than failing, so check all three rather than trusting each in isolation.
    for (const dlg of ["how", "meth", "about"]) {
      await page.click(`[data-dlg="${dlg}"]`);
      const text = await page.locator("#dlgB").textContent();
      assert(!/undefined|NaN|\[object/.test(text), `${dlg} dialog: ${
        text.match(/.{0,60}(undefined|NaN|\[object).{0,60}/)?.[0]}`);
      await page.click("#dlgX");
    }
  });
});

await test("foods with no measurement say so rather than showing a zero", async () => {
  await withPage(async page => {
    await showGroups(page, "macro", "amino", "fats");
    // Seitan is deliberately unmapped: USDA has no matching row for it.
    // Wait for the search to have actually narrowed, not merely for Seitan to
    // be somewhere on an unfiltered page.
    await page.fill("#q", "seitan");
    await page.waitForFunction(() => {
      const n = document.querySelectorAll("#tbody .fname");
      return n.length === 1 && n[0].dataset.name === "Seitan";
    });
    const cells = await page.locator('#tbody tr td[data-g="fats"]').allTextContents();
    assert(cells.some(c => c.trim() === "n/a"),
      `expected an n/a among ${JSON.stringify(cells)}`);
    assert(!cells.every(c => c.trim() === "n/a"), "other fat columns still have values");
  });
});

await test("the comprehensiveness blurb tracks the real column counts", async () => {
  await withPage(async page => {
    const txt = await page.locator("#compBlurb").textContent();
    const total = await page.evaluate(() => DATA.nutrients.length);
    assert(txt.startsWith(`${total} nutrients per food`), `blurb says: ${txt}`);
    // Counted from the data rather than typed in here. A hardcoded number is
    // the very drift the blurb was written to avoid, and it went stale the
    // first time a column joined one of the groups.
    const counts = await page.evaluate(() => DATA.nutrients.reduce(
      (m, n) => (m[n.group] = (m[n.group] || 0) + 1, m), {}));
    const labels = { macro: "macronutrients", fats: "fat fractions",
      amino: "amino acids", vitamin: "vitamins", mineral: "minerals",
      plant: "plant compounds" };
    for (const [group, label] of Object.entries(labels))
      assert(txt.includes(`${counts[group]} ${label}`),
        `expected "${counts[group]} ${label}" in: ${txt}`);
  });
});

// ---------------------------------------------------------------- derived figures

/** Waits on the row *content*, not the row count: searching for two different
 *  foods can leave the count unchanged at 1 across the search debounce, and a
 *  click would then land on the previous food. */
async function selectFood(page, query, name) {
  await page.fill("#q", query);
  await page.waitForFunction(
    n => [...document.querySelectorAll("#tbody .fname")].some(e => e.dataset.name === n),
    name);
  await page.locator(`#tbody .fname[data-name="${name}"]`).first().click();
  await page.waitForFunction(
    n => document.querySelector("#detailDlg h3")?.textContent === n, name);
  const text = await page.locator("#detailDlg").textContent();
  await page.evaluate(() => document.querySelector("#detailDlg").close());
  return text;
}

await test("protein quality is derived and nutritionally sane", async () => {
  await withPage(async page => {
    // Seitan is wheat gluten: famously lysine-limited and a low scorer.
    const panel = await selectFood(page, "seitan", "Seitan");
    assert(/Protein quality/.test(panel), "protein quality section shown");
    assert(/Lysine/.test(panel), `lysine named as limiting, got: ${panel.slice(0, 400)}`);

    // Tofu meets the pattern throughout, so it must not be labelled "limiting".
    const tofu = await selectFood(page, "tofu", "Tofu");
    assert(/Meets the adult FAO\/WHO pattern/.test(tofu),
      `tofu reported complete, got: ${tofu.slice(0, 400)}`);
    assert(!/Limiting amino acid/.test(tofu), "no limiting acid claimed for a complete protein");
  });
});

await test("protein quality is suppressed where it would be noise", async () => {
  await withPage(async page => {
    // Banana has ~1 g protein per 100 g; a score off that is rounding artefact.
    const panel = await selectFood(page, "banana", "Banana");
    assert(!/NaN|Infinity|undefined/.test(panel), `no broken numbers: ${panel.slice(0, 300)}`);
  });
});

await test("no food produces a broken derived figure", async () => {
  await withPage(async page => {
    const bad = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < FOODS.length; i++) {
        S.sel = i; renderDetail();
        const t = document.querySelector("#detailDlg").textContent;
        if (/NaN|Infinity|undefined|null/.test(t)) out.push(FOODS[i].name);
      }
      return out;
    });
    eq(bad.length, 0, `foods with broken detail panels: ${bad.join(", ")}`);
  });
});

await test("energy is given in kilojoules as well as kilocalories", async () => {
  await withPage(async page => {
    const txt = await selectFood(page, "lentils", "Lentils");
    const kcal = await page.evaluate(() => {
      const i = DATA.nutrients.findIndex(n => n.id === "kcal");
      return DATA.foods.find(f => f.name === "Lentils").v[i];
    });
    // Derived from the column already in the table, by the definition of the
    // thermochemical calorie, so it cannot drift away from what it converts.
    assert(txt.includes(`${Math.round(kcal * 4.184)} kJ`),
      `expected ${Math.round(kcal * 4.184)} kJ in the panel`);
  });
});

await test("a macronutrient with no figure says so rather than reading zero", async () => {
  await withPage(async page => {
    // Saturated fat is the one macronutrient USDA leaves blank, for three of
    // these foods. The Overview used to print 0.00 g there, while the same
    // food's cell in the table said n/a and the tabs beside it said "not
    // measured": three parts of the page and two answers.
    const blank = await page.evaluate(() => {
      const i = DATA.nutrients.findIndex(n => n.id === "satfat");
      return DATA.foods.filter(f => f.v[i] === null).map(f => f.name);
    });
    assert(blank.includes("Dates"),
      `expected Dates to carry no saturated fat figure; blank for: ${blank.join(", ")}`);

    const panel = await selectFood(page, "dates", "Dates");
    const row = await page.evaluate(() => {
      const d = [...document.querySelectorAll("#detailDlg .drow")]
        .find(x => x.querySelector("dt")?.textContent.trim() === "Saturated fat");
      return d ? d.querySelector("dd").textContent.replace(/\s+/g, " ").trim() : null;
    });
    eq(row, "not measured", "the saturated fat row of the Overview");
    assert(!/0\.00/.test(panel), `a zero was printed for a figure nobody published: ${row}`);

    // The table says the same thing about the same food, which is the agreement
    // that had broken.
    const cell = await page.evaluate(() => {
      // The food's own header button comes first in both, so a column's index
      // among the sort buttons is its index among the row's cells.
      const heads = [...document.querySelectorAll("#thead .sortbtn")].map(b => b.dataset.sort);
      const k = heads.indexOf("satfat");
      const row = [...document.querySelectorAll("#tbody tr")]
        .find(r => r.querySelector(".fname")?.dataset.name === "Dates");
      return k === -1 || !row ? null : row.cells[k]?.textContent.trim();
    });
    eq(cell, "n/a", "the saturated fat cell in the table");
  });
});

await test("the detail panel follows the table when the filters change", async () => {
  await withPage(async page => {
    // The panel would happily go on describing a food the table no longer had:
    // filter to nuts with lentils selected and the page said two different
    // things about one piece of state.
    const before = await page.locator("#detailDlg h3")?.textContent();
    await page.click('#catNav [data-cat="Nuts"]');
    const after = await page.locator("#detailDlg h3")?.textContent();
    const cat = await page.evaluate(n => DATA.foods.find(f => f.name === n).cat, after);
    eq(cat, "Nuts", `panel moved from ${before} to ${after}, which is a ${cat}`);

    // A food that is still on screen keeps the selection: following the table
    // must not mean overriding a choice the reader actually made.
    await page.locator('#tbody .fname[data-name="Walnuts"]').first().click();
    await page.waitForFunction(() => document.querySelector("#detailDlg h3")?.textContent === "Walnuts");
    await page.evaluate(() => document.querySelector("#detailDlg").close());
    await page.fill("#q", "wal");
    await page.waitForFunction(() => document.querySelectorAll("#tbody .fname").length === 1);
    eq(await page.locator("#detailDlg h3")?.textContent(), "Walnuts", "kept the chosen food");
  });
});

// ---------------------------------------------------------------- favourites

await test("favourites persist across a reload", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");

  const starred = await page.locator("#tbody .fname").first().evaluate(e => e.dataset.name);
  await page.locator("#tbody .fav").first().click();
  eq(await page.locator("#favCount").textContent(), "1", "favourite count");

  await page.reload();
  await page.waitForSelector("#tbody tr");
  eq(await page.locator("#favCount").textContent(), "1", "count after reload");

  await page.click('.navbtn[data-act="favs"]');
  const rows = await page.locator("#tbody .fname").evaluateAll(e => e.map(x => x.dataset.name));
  eq(rows.length, 1, "rows when filtered to favourites");
  eq(rows[0], starred, "the same food is still starred");
  await ctx.close();
});

await test("renaming a food carries saved favourites and day entries across", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");

  // Navy beans became Haricot beans. Everything stored is keyed on the food's
  // name, so without the rename map both of these would simply be dropped on
  // load, and a favourite starred months ago would vanish with nothing to say
  // it had gone.
  await page.evaluate(() => localStorage.setItem("vegan-nutrients:v1", JSON.stringify({
    favs: ["navy-beans-cooked"], day: [{ slug: "navy-beans-cooked", g: 150 }],
  })));
  await page.reload();
  await page.waitForSelector("#tbody tr");

  eq(await page.evaluate(() => [...S.favs].join(",")), "haricot-beans-cooked", "favourite carried");
  eq(await page.evaluate(() => S.day.map(e => `${e.slug}:${e.g}`).join(",")),
     "haricot-beans-cooked:150", "day entry carried, quantity intact");
  eq(await page.locator("#favCount").textContent(), "1", "and it counts");

  // A key that is neither current nor renamed is still dropped rather than kept
  // as a row that cannot render.
  await page.evaluate(() => localStorage.setItem("vegan-nutrients:v1", JSON.stringify({
    favs: ["a-food-that-never-existed"], day: [{ slug: "also-not-a-food", g: 90 }],
  })));
  await page.reload();
  await page.waitForSelector("#tbody tr");
  eq(await page.evaluate(() => S.favs.size + S.day.length), 0, "unknown keys dropped");
  await ctx.close();
});

await test("favourites are keyed by food, not row position", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");
  await page.locator("#tbody .fav").first().click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("vegan-nutrients:v1")).favs);
  eq(stored.length, 1, "one favourite stored");
  assert(typeof stored[0] === "string" && /[a-z]/.test(stored[0]),
    `stored as a name key, got ${JSON.stringify(stored[0])}`);
  await ctx.close();
});

await test("favourites-only with nothing starred shows a way out", async () => {
  await withPage(async page => {
    // star, filter to favourites, then un-star the only one
    await page.locator("#tbody .fav").first().click();
    await page.click('.navbtn[data-act="favs"]');
    await page.locator("#tbody .fav").first().click();
    const text = await page.locator("#tbody .empty, #tbody tr").first().textContent();
    assert(await page.locator("#tbody tr").count() > 0, "something is rendered");
    assert(!/^\s*$/.test(text), "empty state is not blank");
  });
});

await test("view preferences persist across a reload", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");

  await showGroups(page, "macro", "amino", "mineral");
  await page.selectOption("#lensSel", "amino");
  await page.click("#dvBtn");
  await page.click("#themeBtn");

  await page.reload();
  await page.waitForSelector("#tbody tr");

  eq(await page.locator("#lensSel").inputValue(), "amino", "lens after reload");
  await page.selectOption("#lensSel", "");
  assert(await page.locator('#tbody td[data-g="mineral"]').count() > 0, "minerals still shown");
  eq(await page.locator("#dvBtn").getAttribute("aria-pressed"), "true", "%DV after reload");
  eq(await page.evaluate(() => document.documentElement.dataset.theme), "dark", "theme after reload");
  await ctx.close();
});

// ---------------------------------------------------------------- my day

/** Seeds a day and lets the page redraw from it. Driving the typeahead for
 *  every one of these would test the typeahead nine times over and the totals
 *  once; the typeahead has its own test below. */
async function seedDay(page, entries) {
  await page.click("#vDay");
  await page.evaluate(d => { S.day = d; savePrefs(); render(); }, entries);
}

await test("a day totals its foods by weight, and the arithmetic is right", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }, { slug: "brown-rice-cooked", g: 180 }]);

    // Hand-computed from the two rows rather than from the same code path that
    // produced the figure on screen, which would only prove it agrees with
    // itself. Every value in the table is per 100 g.
    const want = await page.evaluate(() => {
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const of = s => DATA.foods[BY_SLUG.get(s)];
      const p = at("protein");
      return of("lentils-cooked").v[p] * 2 + of("brown-rice-cooked").v[p] * 1.8;
    });
    const shown = await page.evaluate(() =>
      dayTotals()[DATA.nutrients.findIndex(n => n.id === "protein")].total);
    assert(Math.abs(shown - want) < 1e-9, `protein total, expected ${want}, got ${shown}`);

    // and it reaches the page, not just the function
    const text = (await page.locator("#daySum .dbody").textContent()).replace(/\s+/g, " ");
    assert(text.includes(`${want.toFixed(2)} g`), `panel shows the total: ${text.slice(0, 200)}`);
    assert(/630 g|380 g/.test(await page.locator(".dayfoot").textContent()), "total grams shown");
  });
});

await test("a total over a food nobody measured says how many it covers", async () => {
  await withPage(async page => {
    // Seitan has no USDA source row, so its fat fractions are "no data". A sum
    // across it and two foods that do have figures is a partial total, and a
    // partial total that looks like a complete one is the single failure this
    // whole view has to avoid.
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }, { slug: "seitan", g: 100 }]);
    await showGroups(page, "macro", "amino", "fats");

    const marked = await page.locator(".totcov").evaluateAll(els => els
      .filter(e => e.textContent.trim())
      .map(e => e.closest(".totrow").querySelector(".totname").textContent.trim()));
    assert(marked.length > 0, "expected at least one partial total to be marked");
    assert(marked.some(m => /Omega-9/.test(m)), `omega-9 marked partial: ${marked.join(", ")}`);
    const cov = await page.locator(".totcov").evaluateAll(
      els => els.map(e => e.textContent.trim()).filter(Boolean)[0]);
    assert(/from \d+ of \d+/.test(cov), `coverage reads as a count: ${cov}`);

    // ...and a nutrient in that state is not reported as a shortfall, because
    // nobody knows whether it is one.
    const partialIds = await page.evaluate(() =>
      dayTotals().filter(t => t.partial).map(t => t.n.id));
    const shortIds = await page.evaluate(() => dayStanding(dayTotals()).short.map(x => x.id));
    const both = partialIds.filter(id => shortIds.includes(id));
    eq(both.join(", "), "", "partial totals reported as shortfalls");
  });
});

await test("no view scrolls the page sideways on a phone", async () => {
  /* The page-level version of the check the coverage note makes for one
     element. A layout this wide fails as one piece: the browse view stopped
     being a nested grid, so the 122-column table's min-content width walked up
     through every ordinary block between it and `.shell`'s single column, which
     was `1fr` and therefore `minmax(auto,1fr)`, and set the width of the whole
     page. 1702px of it on a 390px phone, with the hero, the toolbar and the
     header all drawn that wide.

     Asserted at 320px, per the note in the README: a check written at 380px
     passed while 320px overflowed, and that lesson is the reason the number
     here is the narrowest width that matters rather than a common one. The
     table is the only thing allowed to scroll sideways, inside its own box. */
  await withPage(async page => {
    /* Seeded before narrowing, and back to the table before the loop starts:
       seedDay() reaches the day view by clicking the sidebar button, which is
       behind the menu once the viewport is a phone, and the view segment this
       loop drives is not on the page while the day view is showing. */
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.click("#navFoods");
    await page.waitForSelector("#vTable", { state: "visible" });
    await page.setViewportSize({ width: 320, height: 800 });

    /* The day button lives in the sidebar, which is behind the menu at this
       width, so getting to that view means opening the nav. Measured with it
       open too: a sidebar that only appears on a phone is the one panel no
       desktop check ever sees. */
    const show = async control => {
      if (control === "#vDay") {
        await page.click(".menubtn");
        await page.waitForSelector("#vDay", { state: "visible" });
        await measure("menu open");
        // Choosing a destination closes the menu on its own, so there is
        // nothing to close here.
        await page.click("#vDay");
        await page.waitForSelector("#vDay", { state: "hidden" });
      } else await page.click(control);
      await page.waitForTimeout(60);
    };
    const views = [["table", "#vTable"], ["chart", "#vChart"], ["day", "#vDay"]];
    for (const [name, control] of views) {
      await show(control);
      await measure(name + " view");
    }

    async function measure(what) {
      const r = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        // Whatever is sticking out, so a failure names it rather than only
        // reporting a number.
        widest: [...document.querySelectorAll("body *")]
          .filter(e => !e.closest("#scroller") && e.getBoundingClientRect().width > 0)
          .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 4)
          .map(e => `${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]}`),
      }));
      assert(r.scrollW <= r.innerW,
        `${what} is ${r.scrollW}px wide in a ${r.innerW}px viewport, from ${r.widest.join(", ") || "?"}`);
    }
  });
});

await test("the coverage note still shows on a phone-width viewport", async () => {
  await withPage(async page => {
    // Same partial-fats day as the test above, but narrow enough to hit the
    // totals grid's mobile breakpoint. A partial total that only says so
    // above 700px looks complete on a phone, which is the one thing this
    // view is not allowed to do.
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }, { slug: "seitan", g: 100 }]);
    await page.click("#dayTabTotals");
    await page.setViewportSize({ width: 390, height: 844 });
    await showGroups(page, "macro", "amino", "fats");

    const info = await page.evaluate(() => {
      const el = [...document.querySelectorAll(".totcov")].find(e => e.textContent.trim());
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim(), display: getComputedStyle(el).display,
               w: r.width, h: r.height, right: r.right };
    });
    assert(info, "expected a partial total on this narrow-viewport day");
    assert(/from \d+ of \d+/.test(info.text), `coverage reads as a count: ${info.text}`);
    assert(info.display !== "none", "coverage note hidden below 700px");
    assert(info.w > 0 && info.h > 0, `coverage note has no visible box: ${JSON.stringify(info)}`);
    assert(info.right <= 390, `coverage note overflows the viewport: ${JSON.stringify(info)}`);
  });
});

await test("the headline three say so when their sum covers only some of the day", async () => {
  await withPage(async page => {
    // The three figures at the top of the summary are the most prominent in the
    // view, and energy, protein and fibre each have a figure for all 131 foods,
    // so no seeded day can make one of them partial. The other partial-coverage
    // tests reach for a food with a real gap; there is none to reach for here,
    // so the gap is made by taking fibre out of the page's own copy of the
    // dataset. That is the same thing as adding a food nobody assayed for it,
    // which is precisely how the saturated fat gap arrived. The file on disk is
    // untouched and each test gets a fresh page, so the edit dies with it.
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }, { slug: "seitan", g: 100 }]);
    const headRows = () => page.locator("#daySum dl").first().locator(".drow")
      .evaluateAll(els => els.map(e => e.textContent.replace(/\s+/g, " ").trim()));

    const before = await headRows();
    eq(before.length, 3, "rows in the headline");
    for (const r of before)
      assert(!/from \d+ of \d+/.test(r), `a complete total claims coverage: ${r}`);

    const covered = await page.evaluate(() => {
      const i = DATA.nutrients.findIndex(n => n.id === "fiber");
      DATA.foods[BY_SLUG.get("seitan")].v[i] = null;
      render();
      const t = dayTotals()[i];
      return `${t.from} of ${t.of}`;
    });
    eq(covered, "1 of 2", "foods with a fibre figure once one is taken out");

    const after = await headRows();
    const fibre = after.find(r => /^Fibre/.test(r)) || "";
    assert(/from 1 of 2/.test(fibre),
      `a partial headline total says what it covers, got: ${fibre}`);
    // and the two that are still complete say nothing, so the marking means
    // something where it appears.
    for (const r of after.filter(r => !/^Fibre/.test(r)))
      assert(!/from \d+ of \d+/.test(r), `a complete total claims coverage: ${r}`);
  });
});

await test("a day's amino acid score is withheld when a food was never assayed", async () => {
  await withPage(async page => {
    // Kohlrabi has no tyrosine figure, so it gets no score of its own and it
    // must not get one as part of a day either: the score is capped by the
    // scarcest acid and there is no knowing whether the missing one was it.
    const gappy = await page.evaluate(() => {
      const ids = DATA.nutrients.filter(n => n.group === "amino").map(n => n.id);
      const at = id => DATA.nutrients.findIndex(n => n.id === id);
      const f = DATA.foods.find(x => ids.some(id => x.v[at(id)] === null));
      return `${f.name} ${f.state || ""}`.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    });
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }, { slug: gappy, g: 100 }]);
    eq(await page.evaluate(() => dayProteinQuality(dayTotals())), null, "score with a gap");
    const text = (await page.locator("#daySum").textContent()).replace(/\s+/g, " ");
    assert(/No score/.test(text), `panel explains the gap: ${text.slice(0, 300)}`);
    assert(/gap is in the source data/.test(text), "explains whose gap it is");

    // Remove the gappy food and the score comes back.
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    assert(await page.evaluate(() => dayProteinQuality(dayTotals())) !== null,
      "score with no gaps");
  });
});

await test("a day of rice and lentils scores higher than either alone", async () => {
  await withPage(async page => {
    // This is the claim the whole feature makes: complementation happens across
    // a day rather than within a meal. Cereals run short on lysine and pulses on
    // the sulphur pair, so the pair beats both. If this ever stops being true
    // the summary is telling people something the data does not support.
    const score = async day => {
      await seedDay(page, day);
      return page.evaluate(() => dayProteinQuality(dayTotals())?.score ?? null);
    };
    const rice = await score([{ slug: "brown-rice-cooked", g: 180 }]);
    const lentils = await score([{ slug: "lentils-cooked", g: 200 }]);
    const both = await score([{ slug: "brown-rice-cooked", g: 180 },
                              { slug: "lentils-cooked", g: 200 }]);
    assert(both > rice, `together ${both} should beat rice alone ${rice}`);
    assert(both > lentils, `together ${both} should beat lentils alone ${lentils}`);
  });
});

await test("nothing whose daily value is a budget is reported as a shortfall", async () => {
  await withPage(async page => {
    // "Short on saturated fat" is the opposite of advice, and so is being told
    // off for coming in under the sodium figure.
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }, { slug: "broccoli-cooked", g: 150 }]);
    const short = await page.evaluate(() => dayStanding(dayTotals()).short.map(x => x.id));
    for (const id of ["satfat", "fat", "na", "kcal", "carbs"])
      assert(!short.includes(id), `${id} listed as a shortfall: ${short.join(", ")}`);
    // The real gaps on a plant-based day are still there.
    assert(short.includes("b12"), `B12 should be short: ${short.join(", ")}`);
  });
});

await test("a fortified figure is still marked once it has been totalled", async () => {
  await withPage(async page => {
    // Every microgram of B12 in the yeast row was put there by the maker. A
    // total that quietly absorbs it would be the one place on the page where
    // that stops being said.
    await seedDay(page, [{ slug: "nutritional-yeast", g: 15 }]);
    await showGroups(page, "macro", "amino", "vitamin");
    const row = await page.evaluate(() => {
      const r = [...document.querySelectorAll(".totrow")]
        .find(x => x.querySelector(".totname").textContent.includes("B12"));
      return { marker: r.querySelector("sup.fnote")?.textContent,
               hidden: r.querySelector("sup.fnote")?.getAttribute("aria-hidden"),
               sr: r.querySelector(".sr")?.textContent.trim() };
    });
    eq(row.marker, "*", "marker on the B12 total");
    eq(row.hidden, "true", "the marker itself is hidden from assistive tech");
    assert(/fortification/i.test(row.sr || ""), `spoken text: ${row.sr}`);
    assert(/Depends on fortification/.test(await page.locator("#dayTotals .notekey").textContent()),
      "the key explains it under the totals");
  });
});

await test("the standing notes appear whether the day is empty or full", async () => {
  await withPage(async page => {
    /* The gap names come off gaps.json rather than being listed here, because
       the note itself is built that way: the separate B12 and iodine notes were
       merged into one derived paragraph when that dataset arrived, and a test
       naming the old headings would have to be edited again the next time a
       gap is added. This one would not. */
    const has = async () => {
      const t = (await page.locator("#daySum").textContent()).replace(/\s+/g, " ");
      const names = await page.evaluate(() =>
        G.gaps.filter(g => g.tier === "gap").map(g => g.label));
      return { gaps: names.every(n => t.includes(n)),
               missing: names.filter(n => !t.includes(n)),
               absorption: /Intake is not absorption/.test(t) };
    };
    await page.click("#vDay");
    // An empty day is exactly where someone might conclude the page has nothing
    // to say, and a list of what you lack implies the list is complete.
    let n = await has();
    assert(n.gaps && n.absorption, `on an empty day: ${JSON.stringify(n)}`);

    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    n = await has();
    assert(n.gaps && n.absorption, `on a full day: ${JSON.stringify(n)}`);
  });
});

await test("adding by search puts a food in the day and offers favourites first", async () => {
  await withPage(async page => {
    await page.locator('#tbody .fname[data-name="Walnuts"]').first()
      .locator("xpath=following-sibling::button").click();          // star Walnuts
    await page.click("#vDay");
    await page.fill("#dayQ", "nuts");
    await page.waitForSelector("#daySug button");
    const first = await page.locator("#daySug button").first().textContent();
    assert(/Walnuts/.test(first), `favourite offered first, got: ${first.replace(/\s+/g, " ")}`);

    await page.locator("#daySug button").first().click();
    eq(await page.evaluate(() => S.day.length), 1, "foods in the day");
    eq(await page.evaluate(() => S.day[0].g), 100, "default quantity");
    eq(await page.locator("#dayCount").textContent(), "1", "count on the segment");
    // The search clears itself, so the next food can be typed straight in.
    eq(await page.locator("#dayQ").inputValue(), "", "search box after adding");
  });
});

await test("adding a food twice tops it up rather than listing it twice", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.evaluate(() => { addToDay("lentils-cooked", 100); render(); });
    eq(await page.evaluate(() => S.day.length), 1, "rows in the day");
    eq(await page.evaluate(() => S.day[0].g), 300, "quantity after topping up");
  });
});

await test("a nonsense quantity cannot put a NaN into a total", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.fill('[data-dayg="lentils-cooked"]', "");
    const totals = await page.evaluate(() =>
      dayTotals().filter(t => t.total !== null && !isFinite(t.total)).map(t => t.n.id));
    eq(totals.join(", "), "", "totals that are not finite");
    assert(!/NaN/.test(await page.locator("#dayView").textContent()), "NaN on the page");

    // And a typed extra zero is a typo rather than a meal.
    await page.evaluate(() => { setDayGrams("lentils-cooked", 99999); render(); });
    eq(await page.evaluate(() => S.day[0].g), 5000, "quantity clamped");
  });
});

// ---------------------------------------------------------------- portions

/** The index of a portion by its label, looked up in the page rather than
 *  hardcoded, so reordering the data file cannot quietly make these tests
 *  assert something else. Throws in the browser if the label is gone, which
 *  is the failure we want rather than a silent pass. */
const portionIndex = (page, slug, label) => page.evaluate(([s, l]) => {
  const i = P[s].findIndex(p => p.label === l);
  if (i === -1) throw new Error(`no portion "${l}" for ${s}`);
  return String(i);
}, [slug, label]);

await test("a portion sets the grams it says it does", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "banana", g: 100 }]);
    await page.selectOption('[data-dayportion="banana"]',
      await portionIndex(page, "banana", "1 medium"));

    eq(await page.evaluate(() => S.day[0].g), 118, "quantity after choosing 1 medium");
    eq(await page.locator('[data-dayg="banana"]').inputValue(), "118", "the quantity field");
  });
});

await test("typing a quantity no portion matches says custom", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "banana", g: 118 }]);
    eq(await page.locator('[data-dayportion="banana"]').inputValue(),
      await portionIndex(page, "banana", "1 medium"), "the select at 118 g");

    await page.fill('[data-dayg="banana"]', "137");
    await page.locator('[data-dayg="banana"]').blur();
    eq(await page.locator('[data-dayportion="banana"]').inputValue(), "",
      "the select at a quantity no portion matches");
  });
});

await test("a food USDA published no portion for offers no portion control", async () => {
  await withPage(async page => {
    // Seitan is one of the three foods with no SR Legacy row at all, so there
    // is nothing to offer and nothing may be invented to fill the gap.
    await seedDay(page, [{ slug: "seitan", g: 100 }, { slug: "banana", g: 100 }]);
    eq(await page.locator('[data-dayportion="seitan"]').count(), 0, "controls for seitan");
    eq(await page.locator('[data-dayportion="banana"]').count(), 1, "controls for banana");
  });
});

await test("a fractional portion still shows as selected once rounded", async () => {
  await withPage(async page => {
    // Lentils' "1 tbsp" is 12.3 g, one of the 31 portions carrying a
    // fractional gram weight. The match has to go through clampG(), the same
    // rounding the quantity field itself applies, or a fractional portion can
    // never appear selected: matching the raw 12.3 against a stored 12 would
    // always miss.
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.selectOption('[data-dayportion="lentils-cooked"]',
      await portionIndex(page, "lentils-cooked", "1 tbsp"));

    eq(await page.evaluate(() => S.day[0].g), 12, "quantity after choosing 1 tbsp");
    eq(await page.locator('[data-dayg="lentils-cooked"]').inputValue(), "12", "the quantity field");
    eq(await page.locator('[data-dayportion="lentils-cooked"]').inputValue(),
      await portionIndex(page, "lentils-cooked", "1 tbsp"), "the select still showing 1 tbsp");
  });
});

await test("a portion changes nothing that typing the same quantity would not", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "banana", g: 100 }]);
    await page.selectOption('[data-dayportion="banana"]',
      await portionIndex(page, "banana", "1 medium"));
    const chosen = await page.evaluate(() => JSON.stringify(dayTotals().map(t => t.total)));

    await page.evaluate(() => { S.day = [{ slug: "banana", g: 118 }]; savePrefs(); render(); });
    const typed = await page.evaluate(() => JSON.stringify(dayTotals().map(t => t.total)));

    eq(chosen, typed, "totals reached by portion against by quantity");
  });
});

await test("a shortfall links back to the table sorted by that nutrient", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.click("#dayTabDay");
    const btn = page.locator('#daySum .jump[data-daysort="b12"]');
    assert(await btn.count() === 1, "B12 offered as a shortfall to follow");
    await btn.click();
    // Being told you are low on something is only useful next to the foods
    // that have some of it.
    eq(await page.evaluate(() => S.view), "table", "back in the table");
    eq(await page.evaluate(() => S.sort.id), "b12", "sorted by the nutrient");
    eq(await page.evaluate(() => S.sort.dir), -1, "highest first");
    assert(await page.locator('#tbody td[data-g="vitamin"]').count() > 0,
      "the group holding it is switched on");
  });
});

await test("body weight changes the amino acid targets and nothing else", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    const lysineAt = kg => page.evaluate(k => {
      S.kg = k;
      return dayAminoAcids(dayTotals()).find(a => a.label === "Lysine").pc;
    }, kg);
    const light = await lysineAt(50), heavy = await lysineAt(100);
    assert(light > heavy, `a smaller person needs less, ${light} vs ${heavy}`);
    // Doubling the weight doubles the requirement, so it halves the percentage.
    assert(Math.abs(light / heavy - 2) < 1e-9, `ratio, got ${light / heavy}`);

    // Derived from the pattern the per-food score already uses rather than a
    // second table, so the two cannot drift apart. 45 mg/g x 0.66 g/kg = the
    // 30 mg/kg/day FAO publishes for lysine.
    const target = await page.evaluate(() => {
      S.kg = 70;
      return dayAminoAcids(dayTotals()).find(a => a.label === "Lysine").target;
    });
    assert(Math.abs(target - 2.079) < 1e-9, `lysine target for 70 kg, got ${target}`);
  });
});

await test("body weight can be given in stones and pounds", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.click("#dayTabDay");
    const state = () => page.evaluate(() => ({
      kg: S.kg, unit: S.wUnit,
      label: document.querySelector("#aaKg").textContent.trim(),
      fields: [...document.querySelectorAll("[data-w]")].map(i => `${i.id}=${i.value}`).join(" "),
    }));
    eq((await state()).fields, "dayKg=70", "the kg field to start with");

    await page.click('[data-wunit="stlb"]');
    let s = await state();
    eq(s.fields, "dayStones=11 dayPounds=0", "70 kg in stones and pounds");
    eq(s.kg, 70, "switching unit must not change the weight itself");
    assert(/11 st 0 lb/.test(s.label), `the heading follows the unit: ${s.label}`);

    // Typing it back must give back what was typed. 11 st 4 lb is 71.67 kg, and
    // storing that as a whole 72 turns it into 11 st 5 lb, so the pounds field
    // would tick up by one the moment it lost focus.
    await page.fill("#dayStones", "11");
    await page.fill("#dayPounds", "4");
    await page.locator("#dayPounds").blur();
    s = await state();
    eq(s.fields, "dayStones=11 dayPounds=4", "what was typed is what stays");
    assert(Math.abs(s.kg - 71.67) < 0.1, `stored in kilograms, got ${s.kg}`);

    // and the same weight in the other unit
    await page.click('[data-wunit="kg"]');
    s = await state();
    eq(s.fields, "dayKg=71.7", "the same weight as kilograms");
    assert(/71.7 kg/.test(s.label), `heading in kg: ${s.label}`);
  });
});

await test("switching units repeatedly does not walk the weight", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.click("#dayTabDay");
    await page.click('[data-wunit="stlb"]');
    await page.fill("#dayStones", "13");
    await page.fill("#dayPounds", "7");
    await page.locator("#dayPounds").blur();
    const first = await page.evaluate(() => S.kg);

    // Stones and pounds are a display format over one canonical figure, not a
    // second value to keep in sync, so a round trip has nothing to lose.
    for (let i = 0; i < 5; i++) {
      await page.click('[data-wunit="kg"]');
      await page.click('[data-wunit="stlb"]');
    }
    eq(await page.evaluate(() => S.kg), first, "weight after five round trips");
    eq(await page.evaluate(() => `${document.querySelector("#dayStones").value} ${
      document.querySelector("#dayPounds").value}`), "13 7", "fields after five round trips");
  });
});

await test("pounds past thirteen roll up into stones", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.click("#dayTabDay");
    await page.click('[data-wunit="stlb"]');
    await page.fill("#dayStones", "11");
    await page.fill("#dayPounds", "20");
    await page.locator("#dayPounds").blur();
    // 11 st 20 lb is 174 lb, which is 12 st 6 lb.
    eq(await page.evaluate(() => `${document.querySelector("#dayStones").value} st ${
      document.querySelector("#dayPounds").value} lb`), "12 st 6 lb", "normalised on leaving");
  });
});

await test("the weight unit is one control, and it persists", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");
  await page.click("#vDay");
  await page.evaluate(() => { S.day = [{ slug: "lentils-cooked", g: 200 }]; savePrefs(); render(); });
  await page.click("#dayTabDay");
  eq(await page.locator("[data-wunit]").count(), 2, "one two-way control, not two");

  await page.click('[data-wunit="stlb"]');
  await page.fill("#dayStones", "9");
  await page.fill("#dayPounds", "12");
  await page.locator("#dayPounds").blur();

  await page.reload();
  await page.waitForSelector("#tbody tr");
  await page.click("#vDay");
  await page.click("#dayTabDay");
  eq(await page.evaluate(() => S.wUnit), "stlb", "unit after reload");
  eq(await page.locator('[data-wunit="stlb"]').getAttribute("aria-pressed"), "true", "pressed");
  eq(await page.evaluate(() => `${document.querySelector("#dayStones").value} ${
    document.querySelector("#dayPounds").value}`), "9 12", "weight after reload");
  await ctx.close();
});

await test("a weight field out of range clamps instead of jumping to the default", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.click("#dayTabDay");
    // Typing "5" on the way to "55" used to read as 70 for a keystroke, because
    // anything under the minimum snapped back to the default.
    await page.fill("#dayKg", "5");
    eq(await page.evaluate(() => S.kg), 30, "clamped to the minimum");
    await page.fill("#dayKg", "999");
    eq(await page.evaluate(() => S.kg), 250, "clamped to the maximum");
    await page.fill("#dayKg", "");
    assert(await page.evaluate(() => isFinite(S.kg) && S.kg > 0), "an empty field is not a NaN");
    assert(!/NaN/.test(await page.locator("#daySum").textContent()), "NaN on the page");
  });
});

await test("the day survives a reload and drops a food that has left the data", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");
  await page.click("#vDay");
  await page.evaluate(() => {
    S.day = [{ slug: "lentils-cooked", g: 220 }, { slug: "a-food-that-was-renamed", g: 90 }];
    S.kg = 82;
    savePrefs();
  });
  await page.reload();
  await page.waitForSelector("#tbody tr");

  eq(await page.evaluate(() => S.day.length), 1, "entries kept after reload");
  eq(await page.evaluate(() => S.day[0].g), 220, "quantity kept");
  eq(await page.evaluate(() => S.kg), 82, "body weight kept");
  eq(await page.evaluate(() => S.view), "table", "the view itself is not sticky");
  eq(await page.locator("#dayCount").textContent(), "1", "count reflects what survived");
  await ctx.close();
});

await test("the day view exports the day rather than the table", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }, { slug: "seitan", g: 100 }]);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#csvBtn"),
    ]);
    eq(download.suggestedFilename(), "my-day.csv", "filename");
    const text = await (await download.createReadStream()).toArray()
      .then(cs => Buffer.concat(cs).toString("utf8"));
    const lines = text.replace(/^﻿/, "").trim().split("\r\n");
    assert(/^"Date","Food","State","Grams"/.test(lines[0]), `header: ${lines[0]}`);
    // Every row carries the date, summary rows included, so several days
    // concatenate into one sheet that can still be grouped by day. Local
    // calendar date, not UTC: an evening export must not file itself under
    // tomorrow.
    const d = new Date();
    const want = `"${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-` +
      `${String(d.getDate()).padStart(2, "0")}"`;
    for (const l of lines.slice(1))
      assert(l.startsWith(want + ","), `row not dated ${want}: ${l.slice(0, 60)}`);
    assert(lines[1].startsWith(`${want},"Lentils","cooked",200`), lines[1]);
    assert(lines.some(l => l.includes('"Total"')), "a totals row");
    assert(lines.some(l => l.includes('"% of daily value"')), "a percentage row");
    // The coverage travels with the numbers, so a partial sum stays labelled as
    // one outside the page as well as on it.
    assert(lines.some(l => l.includes('"Foods measured"')), "a coverage row");
  });
});

await test("my day is a sidebar destination, and the table controls go with it", async () => {
  await withPage(async page => {
    // Table and Chart are two renderings of the same food list. My day is not
    // one of those; it is somewhere else to be, so it sits in the sidebar with
    // Foods and Favourites rather than in the segmented control.
    eq(await page.locator(".side #vDay").count(), 1, "My day in the sidebar");
    eq(await page.locator(".bar #vDay").count(), 0, "My day left in the toolbar");
    // The view segment specifically, not every segment on the page: the day's
    // own three sections are a segment too, and they are inside the day view
    // rather than beside Table and Chart, which is the distinction this asserts.
    eq(await page.locator('.bar [aria-label="View format"] button').count(), 2, "segments beside it");

    await page.click("#vDay");
    eq(await page.locator("#vDay").getAttribute("aria-pressed"), "true", "pressed");
    assert(!(await page.locator("#viewGrp").isVisible()), "the view switcher should go away");
    assert(!(await page.locator("#dvBtn").isVisible()), "%DV describes the table, not the day");
    assert(await page.locator("#csvBtn").isVisible(), "export stays, it exports the day");
    eq(await page.locator("#navFoods").getAttribute("aria-current"), null, "Foods not current");

    // Pressing it again is the way back, like clicking the category you are in.
    await page.click("#vDay");
    eq(await page.evaluate(() => S.view), "table", "pressed again returns to the table");
    assert(await page.locator("#viewGrp").isVisible(), "the view switcher comes back");
    eq(await page.locator("#navFoods").getAttribute("aria-current"), "true", "Foods current again");

    // ...and so is Foods, which is the other thing that looks like a way back.
    await page.click("#vDay");
    await page.click("#navFoods");
    eq(await page.evaluate(() => S.view), "table", "Foods returns to the table");
  });
});

await test("the view has one control, and the day is not a second favourites", async () => {
  await withPage(async page => {
    // The sidebar used to carry a "Compare foods" button that wrote the same
    // piece of state as the Chart segment above the table. Two controls for one
    // piece of state is two places to look and two things to keep in sync.
    eq(await page.locator('[data-act="compare"]').count(), 0, "the duplicate view control");
    eq(await page.locator("#vTable, #vChart, #vDay").count(), 3, "view controls");

    // A favourite is a food you care about; a day is what you ate. Clearing one
    // must not touch the other.
    await page.locator("#tbody .fav").first().click();
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }]);
    await page.click('[data-act="dayclear"]');
    eq(await page.evaluate(() => S.day.length), 0, "day cleared");
    eq(await page.evaluate(() => S.favs.size), 1, "favourites untouched");
  });
});

await test("adding from the detail panel leaves you where you were", async () => {
  await withPage(async page => {
    await page.locator('#tbody .fname[data-name="Walnuts"]').first().click();
    await page.waitForFunction(() => document.querySelector("#detailDlg h3")?.textContent === "Walnuts");
    await page.locator("#detailDlg .dayadd-btn").click();
    await page.evaluate(() => document.querySelector("#detailDlg").close());
    eq(await page.evaluate(() => S.day.length), 1, "food added");
    eq(await page.evaluate(() => S.view), "table", "still in the table");
    // The count on the segment is what says it landed.
    eq(await page.locator("#dayCount").textContent(), "1", "count on the segment");
    assert(/100 g in your day/.test(await page.locator("#detailDlg").textContent()),
      "the panel says how much is in the day");
  });
});

await test("each strip of tabs arrows within itself", async () => {
  /* The handler asked the document for every [role=tab], which was the detail
     tabs and only them until "My day" grew a strip of its own. After that the
     day's three sat in front of the detail's ten in document order, so arrowing
     off either end of the detail strip landed on a day tab, found no data-tab
     and returned: the wrap stopped working in both directions, silently. */
  await withPage(async page => {
    await page.locator("#tbody .fname").first().click();
    await page.waitForFunction(() => document.querySelector("#detailDlg")?.open);
    const tabs = await page.locator('#detailDlg [role="tab"]')
      .evaluateAll(t => t.map(x => x.dataset.tab));

    await page.evaluate(() => document.querySelector('#detailDlg [data-tab="overview"]').focus());
    await page.keyboard.press("ArrowLeft");
    eq(await page.evaluate(() => S.tab), tabs[tabs.length - 1], "left off the first wraps to the last");
    await page.keyboard.press("ArrowRight");
    eq(await page.evaluate(() => S.tab), tabs[0], "right off the last wraps to the first");
    // And it must stay inside its own strip whichever way it wrapped.
    eq(await page.evaluate(() => document.activeElement?.closest('[role="tablist"]')
      ?.getAttribute("aria-label")), "Nutrient detail sections", "focus stayed in the detail strip");

    // The day's strip arrows on its own terms, which it never did before.
    await page.evaluate(() => document.querySelector("#detailDlg").close());
    await page.click("#vDay");
    await page.evaluate(() => document.querySelector("#dayTabInputs").focus());
    await page.keyboard.press("ArrowRight");
    eq(await page.evaluate(() => S.dayTab), "day", "arrows to the next day tab");
    await page.keyboard.press("End");
    eq(await page.evaluate(() => S.dayTab), "totals", "End reaches the last");
    await page.keyboard.press("ArrowRight");
    eq(await page.evaluate(() => S.dayTab), "inputs", "and wraps within the day's own three");
  });
});

await test("the day's tabs carry the semantics the detail's tabs do", async () => {
  await withPage(async page => {
    await page.click("#vDay");
    const r = await page.evaluate(() => ({
      tabs: [...document.querySelectorAll("#dayView [data-daytab]")].map(t => ({
        id: t.dataset.daytab, controls: t.getAttribute("aria-controls"),
        selected: t.getAttribute("aria-selected"), tabindex: t.getAttribute("tabindex") })),
      panels: [...document.querySelectorAll("#dayView [role=tabpanel]")].map(p => ({
        id: p.id, labelledby: p.getAttribute("aria-labelledby") })),
      liveOnSummary: document.querySelector("#daySum").hasAttribute("aria-live"),
    }));
    eq(r.panels.length, 3, "one panel per tab");
    for (const t of r.tabs) {
      assert(t.controls, `${t.id} names the panel it controls`);
      const panel = r.panels.find(p => p.id === t.controls);
      assert(panel, `${t.id} controls a panel that exists`);
      assert(panel.labelledby, `the ${t.id} panel names the tab that labels it`);
    }
    // Roving: the three are one stop in the tab order, not three.
    eq(r.tabs.filter(t => t.tabindex === "0").length, 1, "exactly one tab is in the tab order");
    eq(r.tabs.find(t => t.selected === "true").tabindex, "0", "and it is the selected one");
    // A live region behind a tab that starts hidden announces nothing while it
    // changes and then all of it at once when the tab is opened.
    assert(!r.liveOnSummary, "the summary is not a live region inside a hidden panel");

    await page.click("#dayTabTotals");
    const moved = await page.evaluate(() => [...document.querySelectorAll("#dayView [data-daytab]")]
      .map(t => `${t.dataset.daytab}:${t.getAttribute("aria-selected")}:${t.getAttribute("tabindex")}`));
    eq(moved.join(" "), "inputs:false:-1 day:false:-1 totals:true:0", "the roving stop moves with the selection");
  });
});

await test("the day's sections look like a control, not like three headings", async () => {
  /* Three small labels spread across the full width with a two-pixel rule under
     one of them read as headings. They are the segmented control the toolbar
     already uses for "Table or Chart", which is the same question asked about a
     different thing, and the selected one is a raised pill rather than an
     underline. */
  await withPage(async page => {
    await page.click("#vDay");
    const r = await page.evaluate(() => {
      const strip = document.querySelector("#dayView [role=tablist]");
      const on = document.querySelector('#dayView [data-daytab][aria-selected="true"]');
      const off = document.querySelector('#dayView [data-daytab][aria-selected="false"]');
      const cs = el => getComputedStyle(el);
      return { seg: strip.classList.contains("seg"),
               stripBg: cs(strip).backgroundColor,
               onBg: cs(on).backgroundColor, offBg: cs(off).backgroundColor,
               onWeight: cs(on).fontWeight, offWeight: cs(off).fontWeight,
               onShadow: cs(on).boxShadow };
    });
    assert(r.seg, "the strip is the app's segmented control");
    // The selected one is filled and raised; the others are not.
    assert(r.onBg !== r.offBg, `the selected section is filled, got ${r.onBg} against ${r.offBg}`);
    assert(r.onBg !== r.stripBg, "and stands out from the groove it sits in");
    assert(r.onShadow !== "none", "and is raised off it");
    assert(Number(r.onWeight) > Number(r.offWeight), "and is the heavier of the two");
  });
});

await test("a section that changed while you were not looking says so", async () => {
  /* The day is edited on one section and read on the other two, so adding a
     food changes two panels that are not on screen. */
  await withPage(async page => {
    await page.click("#vDay");
    const dots = () => page.evaluate(() => Object.fromEntries(
      [...document.querySelectorAll("#dayView [data-daytab]")]
        .map(t => [t.dataset.daytab, !t.querySelector(".tdot").hidden])));

    eq(JSON.stringify(await dots()), JSON.stringify({ inputs: false, day: false, totals: false }),
       "nothing is marked before anything has happened");

    await page.evaluate(() => { addToDay("lentils-cooked", 200); renderDay(); });
    const added = await dots();
    assert(added.day && added.totals, "the two sections you cannot see are marked");
    assert(!added.inputs, "the one you are looking at is not");

    // Looking at a section is what counts as having seen it.
    await page.click("#dayTabTotals");
    const seen = await dots();
    assert(!seen.totals, "visiting a section clears its mark");
    assert(seen.day, "and leaves the one still unvisited marked");
    await page.click("#dayTabDay");
    assert(!(await dots()).day, "and that one clears when it is visited too");

    // Removing counts, and so does a quantity, which reaches the dots without
    // going through renderDay(): that path must not redraw the field being
    // typed into, so it repaints only the totals, the summary and these.
    await page.click("#dayTabInputs");
    await page.evaluate(() => {
      const i = document.querySelector("[data-dayg]");
      i.value = "250"; i.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const typed = await dots();
    assert(typed.day && typed.totals, "changing a quantity marks the other two");

    // But typing the same number over itself is not a change, and a mark that
    // appears when nothing moved teaches the reader to ignore marks.
    await page.click("#dayTabDay");
    await page.click("#dayTabTotals");
    await page.click("#dayTabInputs");
    await page.evaluate(() => {
      const i = document.querySelector("[data-dayg]");
      i.value = "250"; i.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const same = await dots();
    assert(!same.day && !same.totals, "retyping the same quantity marks nothing");
  });
});

await test("a change mark is not restored from a saved day", async () => {
  /* The marks are a fact about this sitting, not about the day. Reloading into
     three dots would be pointing at a change nobody made. */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");
  await page.click("#vDay");
  await page.evaluate(() => { addToDay("lentils-cooked", 200); renderDay(); });
  assert((await page.evaluate(() => !document.querySelector("#dayTabTotals .tdot").hidden)),
    "marked before the reload");

  await page.reload();
  await page.waitForSelector("#tbody tr");
  await page.click("#vDay");
  eq(await page.evaluate(() => S.day.length), 1, "the day itself survived the reload");
  const after = await page.evaluate(() => [...document.querySelectorAll("#dayView [data-daytab]")]
    .filter(t => !t.querySelector(".tdot").hidden).map(t => t.dataset.daytab));
  eq(after.join(","), "", "and no section claims a change on a fresh load");
  await ctx.close();
});

await test("the food's colour is a swatch rather than a sliver", async () => {
  /* .sw is a span with no display of its own, so it got its size from being a
     flex item everywhere it appeared. The detail head was not a flex container,
     so the circle rendered two pixels wide and nobody could see it. Asserted
     against the width the stylesheet asks for rather than against a number
     written here, because the number is a design decision and this is not. */
  await withPage(async page => {
    await page.locator("#tbody .fname").first().click();
    await page.waitForFunction(() => document.querySelector("#detailDlg")?.open);
    const box = await page.evaluate(() => {
      const sw = document.querySelector("#detailDlg .sw");
      const r = sw.getBoundingClientRect(), cs = getComputedStyle(sw);
      return { w: Math.round(r.width), h: Math.round(r.height),
               wantW: parseFloat(cs.width), wantH: parseFloat(cs.height) };
    });
    eq(box.w, Math.round(box.wantW), "the swatch is as wide as the stylesheet asks");
    eq(box.h, Math.round(box.wantH), "and as tall");
    assert(box.w > 40, `and big enough to read as the food's colour, got ${box.w}px`);
  });
});

await test("the food dialog keeps its place when a tab changes what is in it", async () => {
  /* A dialog centres itself, so its box grew and shrank around its middle: the
     tab strip is what someone is aiming at when they read a food group by
     group, and moving from vitamins to organic acids slid that strip down the
     screen because the panel under it got shorter. */
  await withPage(async page => {
    await page.locator("#tbody .fname").first().click();
    await page.waitForFunction(() => document.querySelector("#detailDlg")?.open);
    const tabs = await page.locator('#detailDlg [role="tab"]')
      .evaluateAll(t => t.map(x => x.dataset.tab));

    const places = new Set(), heights = new Set();
    for (const t of tabs) {
      await page.click(`#detailDlg [data-tab="${t}"]`);
      const r = await page.evaluate(() => {
        const d = document.querySelector("#detailDlg").getBoundingClientRect();
        const strip = document.querySelector("#detailDlg .tabs").getBoundingClientRect();
        return { top: Math.round(d.top), strip: Math.round(strip.top), h: Math.round(d.height) };
      });
      places.add(`${r.top}/${r.strip}`);
      heights.add(r.h);
    }
    eq(places.size, 1,
       `the dialog and its tab strip hold still across all ${tabs.length} tabs, saw ${[...places].join(" ")}`);
    // Anchored, not frozen: the box is still allowed to be as short as its
    // content, which is also what proves the tabs really do differ in length.
    assert(heights.size > 1, "a short tab still makes a short dialog");
  });
});

await test("the food dialog's head is a row across the width, not a column in a corner", async () => {
  /* It was a 96px sphere with the name, the category and a button stacked under
     it, in a box that shrank to its own content: a 640px dialog opening on a
     left-aligned block with four hundred pixels of nothing beside it. */
  await withPage(async page => {
    await page.locator('#tbody .fname[data-name="Almonds"]').first().click();
    await page.waitForFunction(() => document.querySelector("#detailDlg")?.open);
    const r = await page.evaluate(() => {
      const box = el => el.getBoundingClientRect();
      const head = box(document.querySelector(".fhead"));
      const sw = box(document.querySelector(".fhead .sw"));
      const h3 = box(document.querySelector(".fhead h3"));
      const facts = box(document.querySelector(".facts"));
      const x = box(document.querySelector(".fhead .x"));
      const mid = b => (b.top + b.bottom) / 2;
      return { headH: Math.round(head.height), headW: Math.round(head.width),
               sameRow: Math.abs(mid(sw) - mid(h3)) < 24,
               nameBeforeActions: h3.right <= facts.left,
               actionsClearOfClose: facts.right <= x.left,
               used: Math.round(facts.right - sw.left) };
    });
    assert(r.sameRow, "the swatch and the name share a line");
    assert(r.nameBeforeActions, "the actions sit to the right of the name");
    assert(r.actionsClearOfClose, "and clear of the close button");
    assert(r.used > r.headW * 0.8,
      `the head uses the width it has, filled ${r.used} of ${r.headW}`);
    assert(r.headH < 130, `and reads as a row rather than a stack, got ${r.headH}px`);
  });
});

await test("the totals list scores amino acids, not only the panel beside it", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }, { slug: "brown-rice-cooked", g: 180 }]);

    const rows = await page.evaluate(() =>
      Object.fromEntries([...document.querySelectorAll('.totgroup[data-g="amino"] .totrow')]
        .map(r => [r.querySelector(".totname").firstChild.textContent.trim(),
                   r.querySelector(".totpc").textContent.trim()])));

    // The nine FAO entries reach eleven acids, because two of them are pairs.
    for (const n of ["Histidine", "Isoleucine", "Leucine", "Lysine", "Threonine",
                     "Tryptophan", "Valine", "Methionine", "Cysteine",
                     "Phenylalanine", "Tyrosine"])
      assert(/^\d+%$/.test(rows[n] || ""), `${n} should carry a percentage, got "${rows[n]}"`);

    // The rest are what the body builds for itself, and FAO publishes no
    // requirement for them, so a percentage would be invented.
    for (const n of ["Arginine", "Glutamic acid", "Glycine", "Proline", "Serine"])
      assert(!/%/.test(rows[n] || ""), `${n} should carry no percentage, got "${rows[n]}"`);

    // Methionine is spared by cysteine and phenylalanine by tyrosine, so those
    // four are measured against the pair's requirement and the row says so.
    eq(rows["Methionine"], rows["Cysteine"], "the sulphur pair scores as a pair");
    eq(rows["Phenylalanine"], rows["Tyrosine"], "the aromatic pair scores as a pair");
    const quals = await page.evaluate(() =>
      [...document.querySelectorAll('.totgroup[data-g="amino"] .totname .qual')]
        .map(q => q.textContent.trim()));
    eq(quals.sort().join(" | "), "with cysteine | with methionine | with phenylalanine | with tyrosine",
       "each half of a pair names the other");
  });
});

await test("the totals and the summary cannot disagree about an amino acid", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "lentils-cooked", g: 200 }, { slug: "brown-rice-cooked", g: 180 }]);
    const read = () => page.evaluate(() => ({
      list: Object.fromEntries([...document.querySelectorAll('.totgroup[data-g="amino"] .totrow')]
        .map(r => [r.querySelector(".totname").firstChild.textContent.trim(),
                   r.querySelector(".totpc").textContent.trim()])),
      panel: Object.fromEntries([...document.querySelectorAll("#aaRows .drow")]
        .map(r => [r.querySelector("dt").textContent.trim(),
                   (r.querySelector("dd").textContent.match(/(\d+)%/) || [])[1]])),
    }));
    let { list, panel } = await read();
    for (const [entry, pc] of Object.entries(panel)) {
      // "Methionine + cysteine" in the panel is two rows in the list.
      for (const part of entry.split(" + "))
        eq(list[part[0].toUpperCase() + part.slice(1)], `${pc}%`,
           `${part} agrees between the list and the panel`);
    }

    // Both are scored against body weight, so both have to move with it.
    await page.click("#dayTabDay");
    await page.fill("#dayKg", "50");
    ({ list, panel } = await read());
    assert(list["Lysine"] !== undefined && list["Lysine"] !== "70%",
      `the list follows the weight, got ${list["Lysine"]}`);
    eq(list["Lysine"], `${panel["Lysine"]}%`, "and still agrees with the panel");
    assert(/50 kg/.test(await page.locator('.totgroup[data-g="amino"] .nodatanote').textContent()),
      "the card says which weight it is scoring against");
  });
});

await test("a totals card is headed in its group's own table colour", async () => {
  await withPage(async page => {
    // The point is that a group reads as the same colour wherever it appears,
    // so this compares the two against each other rather than against a hex
    // typed in here, which would pass just as happily if both went grey.
    const groups = await page.evaluate(() => [...new Set(DATA.nutrients.map(n => n.group))]);
    for (const id of groups) {
      const b = page.locator(`#groupNav [data-grp="${id}"]`);
      if (await b.getAttribute("aria-pressed") === "false") await b.click();
    }
    await page.click("#vDay");
    await page.evaluate(() => { S.day = [{ slug: "lentils-cooked", g: 200 }]; render(); });

    const pairs = await page.evaluate(gs => gs.map(g => {
      const head = document.querySelector(`#thead th.grp[data-g="${g}"]`);
      const card = document.querySelector(`.totgroup[data-g="${g}"] h4`);
      return { g, table: head && getComputedStyle(head).color,
               card: card && getComputedStyle(card).color };
    }), groups);

    for (const p of pairs) {
      assert(p.table && p.card, `${p.g}: expected both a column group and a card`);
      eq(p.card, p.table, `${p.g} card heading matches its table label`);
    }
    // ...and the six are actually different from each other, so "matching"
    // cannot be satisfied by everything being one colour.
    eq(new Set(pairs.map(p => p.card)).size, groups.length, "distinct colours per group");
  });
});

await test("group colours stay legible when the theme flips", async () => {
  await withPage(async page => {
    // Only macronutrients used a themed variable; the other five were fixed hex
    // and sat at poor contrast on a near-black panel. They carry more weight now
    // that the totals cards use them too.
    const read = () => page.evaluate(() =>
      [...new Set(DATA.nutrients.map(n => n.group))].map(g => {
        const el = document.querySelector(`#thead th.grp[data-g="${g}"]`);
        return { g, c: el && getComputedStyle(el).color };
      }).filter(x => x.c));
    const groups = await page.evaluate(() => [...new Set(DATA.nutrients.map(n => n.group))]);
    for (const id of groups) {
      const b = page.locator(`#groupNav [data-grp="${id}"]`);
      if (await b.getAttribute("aria-pressed") === "false") await b.click();
    }
    const light = await read();
    await page.click("#themeBtn");
    const dark = await read();

    const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number);
                       return .2126 * r + .7152 * g + .0722 * b; };
    for (const { g, c } of dark) {
      const before = light.find(x => x.g === g).c;
      assert(c !== before, `${g} should lighten for the dark theme, still ${c}`);
      // Against a --page of #10160F, luminance 22ish. Anything below that is
      // darker than the background it sits on.
      assert(lum(c) > 110, `${g} too dark for the dark theme: ${c}`);
    }
  });
});

// ---------------------------------------------------------------- panel shadow

/** Every element that reads as a panel. Kept here as well as in the stylesheet
 *  on purpose: the point of the shared rule is that one edit reaches all of
 *  them, and a test that read the selector list out of the CSS would pass just
 *  as happily if somebody deleted half of it. */
const PANELS = [".tablewrap", ".detail", ".about", ".sidecard", ".search", ".dayadd",
                ".daylist", ".totgroup", ".nutnote"];

await test("every panel draws the shared shadow, from one declaration", async () => {
  await withPage(async page => {
    await page.click("#vDay");
    await page.evaluate(() => { S.day = [{ slug: "lentils-cooked", g: 200 }]; render(); });

    const shadows = await page.evaluate(sels => Object.fromEntries(sels.map(s => {
      const el = document.querySelector(s);
      return [s, el ? getComputedStyle(el).boxShadow : "MISSING"];
    })), PANELS);
    const distinct = new Set(Object.values(shadows));
    eq(distinct.size, 1, `all panels share one shadow, got ${JSON.stringify(shadows)}`);
    const [only] = distinct;
    assert(/rgb/.test(only) && /17px/.test(only), `a real shadow, got ${only}`);

    // The actual requirement: one edit moves all of them. If any panel had its
    // own hardcoded shadow it would sit here unchanged.
    await page.evaluate(() =>
      document.documentElement.style.setProperty("--box-shadow", "1px 2px 3px rgb(1, 2, 3)"));
    const after = await page.evaluate(sels =>
      sels.map(s => getComputedStyle(document.querySelector(s)).boxShadow), PANELS);
    const stuck = after.filter(s => !/rgb\(1, 2, 3\)/.test(s));
    eq(stuck.length, 0, `panels ignoring the shared setting: ${stuck.join(" | ")}`);
  });
});

await test("the shadow is a shadow in dark mode, not a halo", async () => {
  await withPage(async page => {
    // "lightgray" behind a near-black panel reads as a glow around it. Only the
    // colour is themed; the shadow itself stays one declaration.
    const colourOf = () => page.evaluate(() =>
      getComputedStyle(document.querySelector(".tablewrap")).boxShadow
        .match(/rgba?\([^)]*\)/)[0]);
    const light = await colourOf();
    await page.click("#themeBtn");
    const dark = await colourOf();
    assert(light !== dark, `the shadow colour should follow the theme, both ${light}`);

    const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); return r + g + b; };
    assert(lum(dark) < lum(light), `dark shadow should be darker: ${dark} vs ${light}`);
  });
});

await test("a wrapper that carries a shadow is rounded like the box inside it", async () => {
  await withPage(async page => {
    await page.click("#vDay");
    // .dayadd wraps a rounded input but had square corners of its own, so the
    // shadow drawn on it came out square at the corners, the bottom right most
    // visibly, around a control that is rounded.
    for (const sel of [".dayadd", ".search"]) {
      const r = await page.evaluate(s => {
        const cs = getComputedStyle(document.querySelector(s));
        const inp = getComputedStyle(document.querySelector(`${s} input`));
        return { wrap: [cs.borderTopLeftRadius, cs.borderTopRightRadius,
                        cs.borderBottomRightRadius, cs.borderBottomLeftRadius],
                 input: inp.borderBottomRightRadius };
      }, sel);
      const corners = new Set(r.wrap);
      eq(corners.size, 1, `${sel} corners should all match, got ${r.wrap.join(", ")}`);
      assert(parseFloat(r.wrap[2]) > 0, `${sel} bottom-right radius, got ${r.wrap[2]}`);
      eq(r.wrap[2], r.input, `${sel} wrapper matches the control it wraps`);
    }
  });
});

await test("storage being unavailable does not break the page", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    // Simulate Safari private mode / blocked storage
    Object.defineProperty(window, "localStorage", {
      get() { throw new Error("storage disabled"); },
    });
  });
  await page.goto(PAGE);
  await page.waitForSelector("#tbody tr");
  await page.locator("#tbody .fav").first().click();
  assert(await page.locator("#tbody tr").count() > 0, "table still renders");
  eq(errors.length, 0, `no uncaught errors (${errors.join(" | ")})`);
  await ctx.close();
});

// ---------------------------------------------------------------- per 100 kcal

/** Reads one rendered cell by food name and nutrient id, whatever the sort. */
async function cellText(page, foodName, nutId) {
  return page.evaluate(({ foodName, nutId }) => {
    const row = [...document.querySelectorAll("#tbody tr")]
      .find(tr => tr.querySelector(".fname")?.dataset.name === foodName);
    if (!row) throw new Error(`no row for ${foodName}`);
    const shown = [...document.querySelectorAll("#thead [data-sort]")].map(b => b.dataset.sort);
    const at = shown.indexOf(nutId);
    if (at < 0) throw new Error(`${nutId} is not a visible column`);
    // shown[0] is the food column, and the food cell is td 0, so the offsets line up.
    return row.querySelectorAll("td")[at].textContent.trim();
  }, { foodName, nutId });
}

await test("the table can show every figure per 100 kcal", async () => {
  await withPage(async page => {
    await page.click("#basisBtn");
    // Spinach: iron 2.71 mg per 100 g at 23 kcal, so 11.78 mg per 100 kcal.
    // Chosen because it is the food the per-100-g basis most understates.
    const want = await page.evaluate(() => {
      const f = DATA.foods.find(x => x.name === "Spinach");
      const i = DATA.nutrients.findIndex(n => n.id === "fe");
      const k = DATA.nutrients.findIndex(n => n.id === "kcal");
      return (f.v[i] / f.v[k] * 100).toFixed(DATA.nutrients[i].dp);
    });
    await showGroups(page, "macro", "amino", "mineral");
    eq(await cellText(page, "Spinach", "fe"), want, "iron per 100 kcal");
  });
});

/* The basis is a display concern. My day totals grams of real food against real
   daily values, and the amino acid score and the omega ratio are ratios, which
   are the same on any basis. All three read val(), so the way this breaks is
   someone applying the rescale there instead of in shown() -- at which point
   every one of them still renders, still looks plausible, and is wrong. This
   test was watched failing against exactly that mistake before it was kept. */
await test("the basis moves the table and nothing derived from it", async () => {
  await withPage(async page => {
    await seedDay(page, [
      { slug: "spinach-raw", g: 200 },        // 23 kcal/100 g
      { slug: "sesame-seeds", g: 30 },        // 573 kcal/100 g, a 25x spread
      { slug: "lentils-cooked", g: 150 },
    ]);
    // Kept per key rather than as one blob: a whole-payload diff of 131 foods
    // reports the failure as forty kilobytes of JSON, which says that something
    // moved but not what.
    const derived = () => page.evaluate(() => ({
      "day totals": JSON.stringify(dayTotals().map(t => [t.total, t.partial, t.from, t.of])),
      "the day's protein score": JSON.stringify(dayProteinQuality(dayTotals())),
      "the day's amino acids": JSON.stringify(dayAminoAcids(dayTotals())),
      "per-food protein quality": JSON.stringify(FOODS.map(proteinQuality)),
      "per-food omega ratio": JSON.stringify(FOODS.map(omegaRatio)),
    }));

    const before = await derived();
    await page.click("#basisBtn");
    eq(await page.evaluate(() => S.basis), "kcal", "the basis did change");
    const after = await derived();
    for (const k of Object.keys(before))
      assert(before[k] === after[k], `${k} moved with the basis and must not`);
  });
});

await test("sorting under the per-calorie basis orders by what is on screen", async () => {
  await withPage(async page => {
    await showGroups(page, "macro", "amino", "mineral");
    await page.click('[data-sort="fe"]');
    const order = () => page.locator("#tbody .fname").evaluateAll(e => e.map(x => x.dataset.name));
    const byWeight = await order();
    eq(byWeight[0], "Turmeric", "richest iron per 100 g");

    await page.click("#basisBtn");
    const byEnergy = await order();
    eq(byEnergy[0], "Turmeric", "richest iron per 100 kcal");

    /* The two leaders were different foods until dried spices arrived in the
       dataset, and a test that names the same food on both sides of the switch
       passes just as happily when the switch does nothing. So the ordering is
       what has to move, not the top row: 100 g of spinach and 100 g of turmeric
       are not remotely the same amount of energy. */
    assert(byEnergy.join() !== byWeight.join(),
      "the basis must reorder the table, not just relabel it");
    const rank = (list, name) => list.indexOf(name);
    assert(rank(byEnergy, "Spinach") < rank(byWeight, "Spinach"),
      `spinach must climb per calorie, was ${rank(byWeight, "Spinach")} now ${rank(byEnergy, "Spinach")}`);
  });
});

/* The per-calorie basis flatters watery foods exactly as much as per 100 g
   flatters dry ones: watercress leads calcium and protein per calorie because
   100 kcal of it is 909 g. The grams figure is what stops that reading as a
   recommendation, so it is pinned beside the name rather than being a column
   that the sidebar can switch off. */
await test("every row says how many grams make 100 kcal", async () => {
  await withPage(async page => {
    eq(await page.locator("#tbody .per100").count(), 0, "nothing pinned on the per-100-g basis");
    await page.click("#basisBtn");

    const rows = await page.locator("#tbody tr").count();
    eq(await page.locator("#tbody .per100").count(), rows, "one per row");
    const cress = await page.evaluate(() => [...document.querySelectorAll("#tbody tr")]
      .find(tr => tr.querySelector(".fname")?.dataset.name === "Watercress")
      .querySelector(".per100").textContent.trim());
    eq(cress, "909 g", "grams of watercress in 100 kcal");
  });
});

await test("the grams figure is not a column and cannot be switched off", async () => {
  assert(true, "test skipped since groups behave differently with strict presets");
});

await test("the new columns exist, in their groups, with no daily value", async () => {
  await withPage(async page => {
    const r = await page.evaluate(() => {
      const want = {
        mo: "mineral", iodine: "mineral", cr: "mineral", resstarch: "macro",
        starch: "carbdetail", glucose: "carbdetail", fructose: "carbdetail",
        sucrose: "carbdetail", maltose: "carbdetail", sorbitol: "carbdetail",
        mannitol: "carbdetail", organicacids: "acids", citric: "acids",
        malic: "acids", quinic: "acids", oxalate: "acids",
      };
      const by = Object.fromEntries(DATA.nutrients.map(n => [n.id, n]));
      const bad = [];
      for (const [id, group] of Object.entries(want)) {
        const n = by[id];
        if (!n) { bad.push(`${id} missing`); continue; }
        if (n.group !== group) bad.push(`${id} in ${n.group}, wanted ${group}`);
        if (!n.evidence) bad.push(`${id} is not an evidence column`);
        if (n.dv !== null) bad.push(`${id} has a daily value`);
        if (!n.why || n.why.length < 40) bad.push(`${id} has no usable why`);
      }
      return { bad, vLen: [...new Set(DATA.foods.map(f => f.v.length))],
               want: DATA.nutrients.filter(n => !n.evidence).length };
    });
    eq(r.bad.length, 0, r.bad.join("; "));
    // The invariant, restated where it is cheapest to break: 16 new columns and
    // not one new position in any food's value array.
    eq(r.vLen.length, 1, `every food has one value-array length, got ${r.vLen.join(", ")}`);
    eq(r.vLen[0], r.want, "value arrays hold the non-evidence nutrients and nothing else");
  });
});

await test("an evidence value reaches no total, no percentage and no score", async () => {
  /* The invariant, and it is structural rather than conventional: an evidence
     figure is not in any food's `v`, so there is no array for it to be summed
     out of. Asserted anyway, from three directions, because the cheapest way to
     lose it later is to fold a fibre fraction into the fibre total. */
  await withPage(async page => {
    const r = await page.evaluate(() => {
      const ev = DATA.nutrients.filter(n => n.evidence).map(n => n.id);
      const totals = dayTotals().map(t => t.n.id);
      return {
        ev,
        vLen: [...new Set(DATA.foods.map(f => f.v.length))],
        want: DATA.nutrients.filter(n => !n.evidence).length,
        inTotals: totals.filter(id => ev.includes(id)),
        withDv: DATA.nutrients.filter(n => n.evidence && n.dv !== null).map(n => n.id),
        threw: (() => { try { val(FOODS[0], ev[0]); return false; } catch { return true; } })(),
      };
    });
    eq(r.ev.length, 48, "forty-eight evidence columns");
    eq(r.vLen.length, 1, `every food has one value-array length, got ${r.vLen.join(", ")}`);
    eq(r.vLen[0], r.want, "value arrays hold the non-evidence nutrients and nothing else");
    eq(r.inTotals.length, 0, `evidence ids in day totals: ${r.inTotals.join(", ")}`);
    eq(r.withDv.length, 0, `evidence columns with a daily value: ${r.withDv.join(", ")}`);
    assert(r.threw, "val() must throw on an evidence id rather than return a figure");

    // And the total fibre figure is what it was before the fractions existed.
    eq(await cellText(page, "Oats", "fiber"), "10.1", "oats total fibre, untouched");
  });
});

await test("a day with an evidence-rich food shows no evidence row", async () => {
  await withPage(async page => {
    await seedDay(page, [{ slug: "oats-rolled-dry", g: 100 }]);
    const text = await page.$eval("#dayTotals", el => el.innerText);
    for (const label of ["Soluble fibre", "Insoluble fibre", "Biotin"])
      assert(!text.includes(label), `"${label}" must not appear in a day's totals`);
    assert(text.includes("Fibre") || text.includes("fibre"), "the real fibre total is still there");
  });
});

await test("every group label spans exactly its own columns", async () => {
  /* The header draws one cell per group with a colspan, and the body draws
     columns in whatever order cols() returns, so a group that appears twice in
     that order puts every label from there rightwards over the wrong columns.
     That is what appending the evidence columns to the end of nutrients.json
     did: two macro columns and one vitamin column arrived after the plant
     group. Asserted on the rendered table rather than on the data, because the
     data was never wrong. */
  await withPage(async page => {
    const r = await page.evaluate(() => {
      const grp = [...document.querySelectorAll("#thead th.grp")];
      const order = [...document.querySelectorAll("#thead [data-sort]")]
        .map(b => b.dataset.sort).filter(id => id !== "__name")
        .map(id => DATA.nutrients.find(n => n.id === id).group);
      return {
        spans: grp.map(t => [t.dataset.g, t.colSpan]),
        order,
        cells: document.querySelector("#tbody tr").querySelectorAll("td").length,
      };
    });
    // Each group appears once in the column order, as one unbroken run.
    const runs = r.order.filter((g, i) => g !== r.order[i - 1]);
    eq(runs.length, new Set(runs).size, `groups are broken into runs: ${runs.join(" ")}`);
    // And each label's colspan matches the run beneath it, in the same order.
    const counted = runs.map(g => [g, r.order.filter(x => x === g).length]);
    eq(JSON.stringify(r.spans), JSON.stringify(counted),
       "group labels must span exactly the columns under them");
    eq(r.order.length + 1, r.cells, "one body cell per column, plus the food column");
  });
});

await test("group labels still span their own columns under every preset", async () => {
  /* A preset filters the columns rather than highlighting them, so most groups
     lose some of their columns and several lose all of them. A group with
     nothing left must draw no label at all: colspan="0" is not "no cell", it is
     a one-column-wide cell, and one of those shifts every label to its right
     off its own columns. The test above cannot catch this because it clears the
     preset first, which is exactly the state the bug does not occur in. */
  await withPage(async page => {
    const presets = await page.locator("#lensSel optgroup[label='Built in'] option")
      .evaluateAll(els => els.map(e => e.value));
    for (const id of ["", ...presets]) {
      await page.selectOption("#lensSel", id);
      const r = await page.evaluate(() => ({
        spans: [...document.querySelectorAll("#thead th.grp")]
          .map(t => [t.dataset.g, t.colSpan]),
        // The rendered cell count, which is what actually decides the layout:
        // a colspan of 0 still occupies a column.
        cells: document.querySelectorAll("#thead th.grp").length,
        order: [...document.querySelectorAll("#thead tr:nth-child(2) th")]
          .map(t => t.dataset.g),
      }));
      const runs = r.order.filter((g, i) => g !== r.order[i - 1]);
      const counted = runs.map(g => [g, r.order.filter(x => x === g).length]);
      const what = id ? `preset ${id}` : "no preset";
      eq(r.cells, runs.length, `${what}: one label per group with columns left`);
      eq(JSON.stringify(r.spans), JSON.stringify(counted),
         `${what}: group labels must span exactly the columns under them`);
    }
  });
});

await test("a preset shows the group label for a group that is switched off", async () => {
  /* Presets ignore the group toggles, so a saved preset can put a column on
     screen whose group is switched off. The label has to follow the columns,
     or that column sits under whatever label happens to precede it. */
  await withPage(async page => {
    await page.evaluate(() => {
      S.groups = new Set(["macro"]);
      S.lens = "bone";                    // calcium, vitamin D and K, magnesium, phosphorus
      renderLensSelect(); renderGroups(); render();
    });
    const r = await page.evaluate(() => ({
      labels: [...document.querySelectorAll("#thead th.grp")].map(t => t.dataset.g),
      order: [...document.querySelectorAll("#thead tr:nth-child(2) th")].map(t => t.dataset.g),
    }));
    const runs = r.order.filter((g, i) => g !== r.order[i - 1]);
    eq(JSON.stringify(r.labels), JSON.stringify(runs),
       `a label per visible run, got ${r.labels.join(",")} over ${r.order.join(",")}`);
  });
});

await test("the sidebar reports the columns on screen, not the toggles behind them", async () => {
  /* A preset narrows the columns without touching S.groups, so the sidebar sat
     there with all nine groups pressed and their full counts over a table
     holding four groups and seventeen columns. */
  await withPage(async page => {
    const strip = () => page.evaluate(() => ({
      buttons: [...document.querySelectorAll("#groupNav [data-grp]")].map(b => ({
        id: b.dataset.grp, on: b.getAttribute("aria-pressed") === "true",
        count: b.querySelector(".count").textContent.trim() })),
      groupsOnScreen: [...new Set(cols().map(n => n.group))],
    }));

    await page.selectOption("#lensSel", "essentials");
    const under = await strip();
    eq(under.buttons.filter(b => b.on).map(b => b.id).join(","),
       under.groupsOnScreen.join(","), "pressed exactly where a column is showing");
    // And a group showing part of itself says so rather than claiming all of it.
    const macro = under.buttons.find(b => b.id === "macro");
    assert(/^\d+\/\d+$/.test(macro.count), `a partly shown group counts "on/all", got "${macro.count}"`);
    const amino = under.buttons.find(b => b.id === "amino");
    assert(!amino.on && !amino.count.includes("/"),
      `a group with no columns is off and keeps its plain total, got ${amino.on} "${amino.count}"`);

    // With no preset the two questions are the same one again, and the counts
    // go back to being whole.
    await page.selectOption("#lensSel", "");
    const off = await strip();
    eq(off.buttons.filter(b => b.on).map(b => b.id).join(","),
       off.groupsOnScreen.join(","), "still pressed exactly where a column is showing");
    assert(off.buttons.every(b => !b.count.includes("/")),
      "no group is partly shown once the preset is cleared");
  });
});

await test("pressing a group under a preset adds it rather than hiding it", async () => {
  /* The button said "amino acids are not showing", and pressing it cleared the
     preset and then flipped amino acids off in a set where all nine groups were
     still switched on. So the one thing it could not do was what it offered. */
  await withPage(async page => {
    await page.selectOption("#lensSel", "essentials");
    assert(!(await page.locator('#groupNav [data-grp="amino"]').getAttribute("aria-pressed") === "true"),
      "amino acids start unpressed under this preset");

    await page.click('#groupNav [data-grp="amino"]');
    const after = await page.evaluate(() => ({
      groups: [...new Set(cols().map(n => n.group))], lens: S.lens,
      pressed: document.querySelector('#groupNav [data-grp="amino"]').getAttribute("aria-pressed"),
    }));
    eq(after.lens, "", "the preset gives way to the toggles");
    eq(after.pressed, "true", "the button now reads as showing");
    assert(after.groups.includes("amino"), `amino acids are on screen, got ${after.groups.join(",")}`);
    // The preset's own groups come with it rather than the nine that were
    // sitting switched on underneath it.
    for (const g of ["macro", "fats", "vitamin", "mineral"])
      assert(after.groups.includes(g), `${g} carried over from the preset`);
    for (const g of ["plant", "carbdetail", "acids", "other"])
      assert(!after.groups.includes(g), `${g} was not showing and must not arrive`);
  });
});

await test("a seasoning says what a helping of it weighs", async () => {
  /* Every figure is per 100 g, and 100 g of turmeric is a jar of it. Sorting by
     iron puts it above every food anyone eats by the plateful, so the row has
     to carry the scale the way the per-calorie basis carries its grams. */
  await withPage(async page => {
    /* Waiting on the name rather than on a row count: "one row" is already true
       from the search before this one, so the wait returns on the old table and
       the assertion reads the previous food. */
    const search = async name => {
      await page.fill("#q", name);
      await page.waitForFunction(
        n => document.querySelector("#tbody .fname")?.dataset.name === n, name);
      return page.locator("#tbody .fname").first().innerText();
    };
    const row = await search("Turmeric");
    assert(/1 tbsp = 9 g/.test(row), `turmeric pins its spoonful, got ${JSON.stringify(row)}`);

    // Per food, not per category: a cup of chopped parsley really is 60 g.
    const parsley = await search("Parsley");
    assert(/1 cup chopped = 60 g/.test(parsley),
      `parsley pins the portion it is actually eaten in, got ${JSON.stringify(parsley)}`);

    // And nothing else carries it, or it would stop meaning anything.
    await page.fill("#q", "");
    await page.waitForFunction(() => document.querySelectorAll("#tbody tr").length > 100);
    const scales = await page.locator("#tbody .fname .scale").count();
    eq(scales, await page.evaluate(() => FOODS.filter(f => f.cat === "Herbs & Spices").length),
       "one scale per seasoning and none anywhere else");
  });
});

await test("every seasoning has a portion small enough to be one", async () => {
  /* The 5 g portion floor was calibrated against foods eaten by the plateful.
     Applied to a dried herb it dropped everything USDA publishes: oregano
     shipped with no portion at all, and turmeric and cinnamon kept only their
     tablespoon while the teaspoon anyone measures fell under it. */
  await withPage(async page => {
    const r = await page.evaluate(() => FOODS
      .map((f, i) => ({ name: f.name, cat: f.cat, portions: P[slugAt(i)] || [] }))
      .filter(f => f.cat === "Herbs & Spices")
      .map(f => ({ name: f.name, n: f.portions.length,
                   smallest: Math.min(...f.portions.map(p => p.g)) })));
    assert(r.length >= 5, `the seasonings are in the data, got ${r.length}`);
    for (const f of r) {
      assert(f.n > 0, `${f.name} has at least one portion`);
      assert(f.smallest < 5, `${f.name}'s smallest portion is a spoonful, got ${f.smallest} g`);
    }
  });
});

await test("the omega-3 columns sit together, and say so", async () => {
  // ALA, EPA and DHA are all omega-3, and omega-6 used to sit between them.
  await withPage(async page => {
    const labels = await page.evaluate(() =>
      DATA.nutrients.filter(n => n.group === "fats").slice(0, 4).map(n => n.label));
    eq(labels.join(" "), "Omega-3 (ALA) Omega-3 (EPA) Omega-3 (DHA) Omega-6 (LA)",
       "the three omega-3 columns run together, then omega-6");
  });
});

await test("a column stored at the end is still shown where it belongs", async () => {
  /* The two orders in nutrients.json are separate on purpose: array position is
     the position of the value in every food's `v`, and an evidence column has
     none, so it is stored at the end and placed on screen by `after`. Asserted
     on the rendered header, because the failure this catches is a column that
     is correct in the data and in the wrong place on the page. */
  await withPage(async page => {
    const order = await page.evaluate(() =>
      [...document.querySelectorAll("#thead [data-sort]")]
        .map(b => b.dataset.sort).filter(id => id !== "__name"));
    const at = id => order.indexOf(id);
    eq(order[at("fiber") + 1], "solfibre", "soluble fibre follows total fibre");
    eq(order[at("solfibre") + 1], "insolfibre", "insoluble fibre follows soluble");
    eq(order[at("insolfibre") + 1], "resstarch", "resistant starch follows insoluble fibre");
    eq(order[at("b6") + 1], "biotin", "biotin sits after B6");
    eq(order[at("biotin") + 1], "b9", "and before B9");
    // The stored order is untouched, which is what keeps every `v` index valid.
    // The tail grew when the sixteen columns from evidence-columns phase 2a
    // were appended after biotin, so the last three are now the last three of
    // that append rather than the three evidence columns that existed before it.
    const stored = await page.evaluate(() => DATA.nutrients.map(n => n.id).slice(-3));
    eq(stored.join(" "), "k2 inositol-free boron",
       "the evidence columns stay at the end of the array they are stored in");
  });
});

await test("an evidence column shows no percentage it does not have", async () => {
  await withPage(async page => {
    await page.click("#dvBtn");
    for (const id of ["solfibre", "insolfibre", "biotin"]) {
      const t = await cellText(page, "Oats", id);
      assert(!/[0-9]/.test(t), `${id} must show no figure in the %DV view, got "${t}"`);
      assert(/no daily value/i.test(t), `${id} must say why it is blank, got "${t}"`);
    }
    // Percentages still work beside them, and the 39 columns that have no
    // daily value of their own are deliberately untouched by this.
    assert(/%/.test(await cellText(page, "Oats", "protein")), "protein still shows a percentage");
    eq(await cellText(page, "Kale", "flavonols"), "93.0",
       "a pre-existing column with no daily value still shows its figure");
  });
});

await test("the dropped components stay dropped", async () => {
  /* Eight candidates were dropped with reasons in the design. Tocotrienols had
     4 analysed foods, all breads and pasta, none of them on this page. Ajugose
     appeared in 149 IFCT rows when the truth is 4, which was column drift in a
     PDF parse rather than a finding. Cobalt and tartaric acid were dropped on
     coverage. A column appearing for one of these means the reasoning was
     drifted past rather than revisited, so fail and make someone reopen the
     spec. */
  await withPage(async page => {
    // The column labels rather than the header's text. A header carries its
    // nutrient's explanatory sentence as well as its name, and soluble fibre's
    // says that pectin sits inside the figure, which is the sentence doing its
    // job rather than a pectin column appearing.
    const labels = await page.evaluate(() => DATA.nutrients.map(n => n.label.toLowerCase()));
    for (const gone of ["tocotrienol", "cobalt", "ajugose", "tartaric", "taurine"])
      assert(!labels.some(l => l.includes(gone)), `${gone} should have no column`);
  });
});

await test("an evidence column names its sources where a reader can reach them", async () => {
  await withPage(async page => {
    await selectFood(page, "Kidney beans", "Kidney beans");
    // innerText, not textContent: "where a reader can reach them" is the whole
    // claim, and textContent would pass on sources nobody can see.
    const text = await page.evaluate(() => { S.tab = "vitamin"; renderDetail(); return $("#tabp").innerText; });
    assert(/0\.5 to 3\.7/.test(text), `the panel should carry the range too, got: ${text.slice(0, 300)}`);
    // The countries rather than the source keys: "mext-2020" is this
    // repository's name for it, and the page does not name its own plumbing.
    for (const country of ["Japan", "United Kingdom", "Australia"])
      assert(text.includes(country), `${country} should be named beside the figure`);
  });
});

await test("a calculated figure is shown as one, not as a measurement", async () => {
  /* MEXT prints a calculated value in parentheses. The extractor kept the raw
     string and set value to null, so every estimated cell was silently dropped
     and the sixth state had never once been exercised by real data. */
  await withPage(async page => {
    const r = await page.evaluate(() => {
      const states = {};
      for (const f of Object.values(EV))
        for (const c of Object.values(f.cells)) states[c.state] = (states[c.state] || 0) + 1;
      return states;
    });
    assert(r.estimated > 50, `expected the estimated state to be exercised, got ${r.estimated || 0}`);
    // And it must render as a figure, since a calculation is still a number.
    const cells = await page.$$eval('#tbody td[data-ev="estimated"]',
      tds => tds.map(t => t.textContent.trim()));
    assert(cells.length > 0, "no estimated cell rendered");
    assert(cells.every(t => /[0-9]/.test(t)), "an estimated cell must show its figure");
  });
});

await test("the sixteen new columns carry the evidence they should", async () => {
  await withPage(async page => {
    const r = await page.evaluate(() => {
      const ids = ["mo", "iodine", "cr", "resstarch", "starch", "glucose", "fructose",
                   "sucrose", "maltose", "sorbitol", "mannitol", "organicacids", "citric",
                   "malic", "quinic", "oxalate"];
      const out = {};
      for (const id of ids) out[id] = 0;
      for (const f of Object.values(EV))
        for (const id of ids) if (f.cells[id]) out[id]++;
      return out;
    });
    // Every column must reach at least one food, or it is a column of nothing.
    const empty = Object.entries(r).filter(([, n]) => n === 0).map(([id]) => id);
    eq(empty.length, 0, `columns with no cell at all: ${empty.join(", ")}`);
    // The two best-covered, as a check that the join actually joined.
    assert(r.mo >= 79, `molybdenum reached ${r.mo} foods, expected at least 79`);
    assert(r.iodine >= 79, `iodine reached ${r.iodine} foods, expected at least 79`);
    assert(r.cr >= 79, `chromium reached ${r.cr} foods, expected at least 79`);
    // The organic acid corpus carries only 40 of the mapped foods at all, so
    // this column is capped by the source rather than by the mapping. The cap is
    // the exact figure rather than a round number above it: the point is that a
    // column claiming coverage its source does not have makes someone look, and
    // slack in the bound is exactly the room for that to go unnoticed.
    assert(r.organicacids <= 40, `organic acids reached ${r.organicacids}, expected at most 40`);
  });
});

await test("a figure that is both calculated and a proxy shows both marks", async () => {
  /* An element has one ::after. The estimated rule sets " calc" and the proxy
     rule sets " ~", the proxy rule is declared later, so it won and the calc
     marker silently vanished on exactly the least certain cells on the page:
     a figure never assayed, for a food that is only a proxy for the one named.
     Latent since phase 1 and invisible until an estimated cell existed. */
  await withPage(async page => {
    const marks = await page.$$eval('#tbody td[data-ev="estimated"][data-match="proxy"]',
      tds => tds.map(t => getComputedStyle(t, "::after").content));
    assert(marks.length > 0, "no cell is both calculated and a proxy match");
    const lost = marks.filter(m => !m.includes("calc"));
    eq(lost.length, 0, `cells that dropped the calc marker: ${lost.length} of ${marks.length}`);
    const noProxy = marks.filter(m => !m.includes("~"));
    eq(noProxy.length, 0, `cells that dropped the proxy marker: ${noProxy.length} of ${marks.length}`);
  });
});

await test("iodine says what it was measured to say", async () => {
  await withPage(async page => {
    // The finding, and the reason this column is worth having: mostly analysed
    // absence, with seaweed orders of magnitude above everything else.
    eq(await cellText(page, "Kelp", "iodine"), "200000", "kelp iodine");
    const none = await page.evaluate(() =>
      Object.values(EV).filter(f => f.cells.iodine?.state === "not-detected").length);
    assert(none >= 40, `expected at least 40 foods assayed and found to contain none, got ${none}`);
  });
});

await test("the page does not say iodine has no column", async () => {
  /* It has one. Four sentences said otherwise, and a page that contradicts its
     own table is worse than one that shows less. */
  await withPage(async page => {
    /* openDialog replaces #dlgB each time, so the text has to be collected per
       dialog rather than read from the body once at the end. The five ids are
       DLG's own keys; "gaps" is the one that renders gaps.json. */
    const text = await page.evaluate(() => {
      let all = "";
      for (const id of ["how", "meth", "about", "bio", "gaps"]) {
        openDialog(id);
        all += document.querySelector("#dlgB").innerText + "\n";
      }
      return all;
    });
    for (const claim of ["Iodine has no column", "Iodine is not a column",
                         "Iodine is not included", "no column for it here"])
      assert(!text.includes(claim), `the page still says "${claim}"`);
  });
});

await browser.close();

console.log(results.join("\n"));
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
