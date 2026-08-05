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
  try { await fn(page, errors); } finally { await ctx.close(); }
  return errors;
}

// ---------------------------------------------------------------- basics

await test("page loads with no console or page errors", async () => {
  const errors = await withPage(async () => {});
  assert(errors.length === 0, `errors: ${errors.join(" | ")}`);
});

await test("table renders rows and the default column set", async () => {
  await withPage(async page => {
    const rows = await page.locator("#tbody tr").count();
    eq(rows, 20, "default page size");
    // macro (8) + amino (18) = 26 nutrient columns, plus the food column
    const cells = await page.locator("#tbody tr").first().locator("td").count();
    eq(cells, 27, "cells in first row");
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
    // turn everything on so all five groups are present at once
    for (const g of ["fats", "vitamin", "mineral"])
      await page.click(`#groupNav [data-grp="${g}"]`);
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
    eq(names[0], "Cocoa powder", "highest-fibre food first");
    await page.click('[data-sort="fiber"]');            // second click reverses
    const rev = await page.locator("#tbody .fname").evaluateAll(e => e.map(x => x.dataset.name));
    assert(rev[0] !== names[0], "reversing changes the first row");
  });
});

// ---------------------------------------------------------------- lenses

await test("essential amino acids lens highlights exactly nine columns", async () => {
  await withPage(async page => {
    await page.selectOption("#lensSel", "eaa");
    const n = await page.locator("#tbody tr:first-child td.lens").count();
    eq(n, 9, "highlighted cells in a row");
    const bg = await page.locator("#tbody tr:first-child td.lens").first()
      .evaluate(e => getComputedStyle(e).backgroundColor);
    const plain = await page.locator("#tbody tr:first-child td.num:not(.lens)").first()
      .evaluate(e => getComputedStyle(e).backgroundColor);
    assert(bg !== plain, "highlighted cells differ from plain ones");
  });
});

await test("a lens switches on the column groups it needs", async () => {
  await withPage(async page => {
    // minerals start hidden; the bone lens needs them
    eq(await page.locator('#tbody td[data-g="mineral"]').count(), 0, "minerals hidden initially");
    await page.selectOption("#lensSel", "bone");
    assert(await page.locator('#tbody td[data-g="mineral"]').count() > 0, "minerals now shown");
    assert(await page.locator('#tbody td[data-g="vitamin"]').count() > 0, "vitamins now shown");
    eq(await page.locator("#tbody tr:first-child td.lens").count(), 5, "bone lens columns");
  });
});

await test("highlighting survives a row being hovered", async () => {
  await withPage(async page => {
    await page.selectOption("#lensSel", "eaa");
    const cell = page.locator("#tbody tr:first-child td.lens").first();
    const before = await cell.evaluate(e => getComputedStyle(e).backgroundColor);
    await page.locator("#tbody tr:first-child td.food").hover();
    const after = await cell.evaluate(e => getComputedStyle(e).backgroundColor);
    eq(after, before, "highlight colour under hover");
  });
});

await test("a custom highlight group can be created and is applied", async () => {
  await withPage(async page => {
    await page.click("#lensEdit");
    await page.fill("#lensName", "My iron check");
    // clear anything pre-ticked, then choose two nutrients
    await page.locator("#nutPick input:checked").evaluateAll(
      els => els.forEach(e => { e.checked = false; }));
    await page.check('#nutPick input[value="fe"]');
    await page.check('#nutPick input[value="vitc"]');
    await page.click("#lensSave");
    await page.waitForSelector("#lensDlg", { state: "hidden" });
    eq(await page.locator("#tbody tr:first-child td.lens").count(), 2, "highlighted columns");
    const opts = await page.locator("#lensSel option").allTextContents();
    assert(opts.includes("My iron check"), `custom lens in menu: ${opts.join(", ")}`);
  });
});

await test("a custom group with no nutrients is rejected, not saved", async () => {
  await withPage(async page => {
    await page.click("#lensEdit");
    await page.fill("#lensName", "Empty group");
    await page.locator("#nutPick input:checked").evaluateAll(
      els => els.forEach(e => { e.checked = false; }));
    await page.click("#lensSave");
    assert(await page.locator("#lensDlg[open]").count() === 1, "dialog stays open");
    const err = await page.locator("#lensErr").textContent();
    assert(/at least one/i.test(err), `error message shown, got "${err}"`);
  });
});

await test("switching off the last group says so on the button that comes back", async () => {
  await withPage(async page => {
    // The table falls back to macronutrients rather than rendering nothing.
    // Switching macro off first, then amino, used to leave the macro button
    // reading "off" with all nine of its columns still on screen.
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
    await page.fill("#q", "linseed");
    await page.waitForFunction(() => {
      const n = document.querySelectorAll("#tbody .fname");
      return n.length === 1 && n[0].dataset.name === "Flaxseed";
    });
    const rendered = await page.evaluate(() => {
      const f = document.querySelector('#tbody .fname[data-name="Flaxseed"]');
      return f && f.textContent.replace(/\s+/g, " ").trim();
    });
    assert(/Flaxseed \(Linseed\)/.test(rendered || ""), `shown as: ${rendered}`);
  });
});

await test("selecting a highlight explains what it means", async () => {
  await withPage(async page => {
    assert(await page.locator("#lensNote").isVisible() === false, "no note before selecting");
    await page.selectOption("#lensSel", "creatine");
    const note = await page.locator("#lensNote").textContent();
    assert(/Creatine precursors/.test(note), `names the group: ${note}`);
    assert(/synthesise it from these three amino acids/.test(note), `explains it: ${note}`);
    assert(/Glycine/.test(note) && /Arginine/.test(note), `lists its nutrients: ${note}`);

    await page.selectOption("#lensSel", "");
    assert(await page.locator("#lensNote").isVisible() === false, "note clears with the highlight");
  });
});

await test("every built-in highlight carries the same sentence as its tooltip", async () => {
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

await test("a custom highlight can carry its own explanation", async () => {
  await withPage(async page => {
    await page.click("#lensEdit");
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
      "Cherries","Pineapple","Watermelon","Coconut","Blueberries"];
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
    await page.click('#groupNav [data-grp="vitamin"]');
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
    assert(head.includes('"Protein (g)"'), `visible column missing: ${head}`);
    assert(!head.includes("Beta-carotene"), `hidden column exported: ${head}`);
    assert(rows[0].startsWith('"Kohlrabi","German turnip","cooked","Vegetables"'), rows[0]);
  });
});

// ---------------------------------------------------------------- fortification notes

await test("fortification-dependent figures are marked, and only those", async () => {
  await withPage(async page => {
    await page.click("#groupNav [data-grp=vitamin]");
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

await test("the note key stays away when nothing on the page is marked", async () => {
  await withPage(async page => {
    await page.click("#groupNav [data-grp=vitamin]");
    await page.fill("#q", "lentils");
    await page.waitForFunction(() => document.querySelectorAll("#tbody .fname").length === 1);
    eq(await page.locator("#tbody sup.fnote").count(), 0, "markers on an unfortified food");
    assert(await page.locator("#noteKey").isVisible() === false, "key should be hidden");
  });
});

await test("a marker is announced rather than left as bare punctuation", async () => {
  await withPage(async page => {
    await page.click("#groupNav [data-grp=vitamin]");
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
    await page.selectOption("#perPage", "All");
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
    await page.selectOption("#perPage", "All");
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

    // Far enough over and the next group takes the spot, pushing the old label
    // out rather than the two sitting on top of each other.
    await scroll(1150);
    const pushed = await probe();
    eq(Math.round(pushed.amino.label), Math.round(rest.macro.label), "amino label takes over");
    assert(pushed.macro.label < pushed.amino.label,
      "the outgoing label must be pushed past, not left overlapping");
  });
});

// ---------------------------------------------------------------- omega columns

await test("omega-7 and omega-9 columns are present and populated", async () => {
  await withPage(async page => {
    await page.click('#groupNav [data-grp="fats"]');
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
      "Adzuki beans (cooked)", "Amaranth (cooked)", "Bell pepper (yellow, raw)",
      "Broccoli (cooked)", "Brown rice (cooked)", "Dates", "Edamame (cooked)",
      "Hemp seeds (hulled)", "Kale (raw)", "Leeks (cooked)", "Nutritional yeast",
      "Seitan", "Shiitake mushrooms (raw)", "Soy milk (unsweetened)", "Teff (cooked)",
      "Tempeh", "Wholewheat pasta (cooked)"];
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

await test("foods with no measurement say so rather than showing a zero", async () => {
  await withPage(async page => {
    await page.click('#groupNav [data-grp="fats"]');
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
    assert(/6 fat fractions/.test(txt), `fat count updated: ${txt}`);
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
    n => document.querySelector("#detail h3")?.textContent === n, name);
  return page.locator("#detail").textContent();
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
        const t = document.querySelector("#detail").textContent;
        if (/NaN|Infinity|undefined|null/.test(t)) out.push(FOODS[i].name);
      }
      return out;
    });
    eq(bad.length, 0, `foods with broken detail panels: ${bad.join(", ")}`);
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

  await page.click('#groupNav [data-grp="mineral"]');
  await page.selectOption("#lensSel", "creatine");
  await page.click("#dvBtn");
  await page.click("#themeBtn");

  await page.reload();
  await page.waitForSelector("#tbody tr");

  eq(await page.locator("#lensSel").inputValue(), "creatine", "lens after reload");
  assert(await page.locator('#tbody td[data-g="mineral"]').count() > 0, "minerals still shown");
  eq(await page.locator("#dvBtn").getAttribute("aria-pressed"), "true", "%DV after reload");
  eq(await page.evaluate(() => document.documentElement.dataset.theme), "dark", "theme after reload");
  await ctx.close();
});

await test("reset restores the view but keeps favourites and custom groups", async () => {
  await withPage(async page => {
    await page.locator("#tbody .fav").first().click();
    await page.click("#lensEdit");
    await page.fill("#lensName", "Keep me");
    await page.locator("#nutPick input:checked").evaluateAll(
      els => els.forEach(e => { e.checked = false; }));
    await page.check('#nutPick input[value="fe"]');
    await page.click("#lensSave");
    await page.waitForSelector("#lensDlg", { state: "hidden" });

    await page.click("#resetBtn");

    eq(await page.locator("#favCount").textContent(), "1", "favourite kept");
    const opts = await page.locator("#lensSel option").allTextContents();
    assert(opts.includes("Keep me"), "custom group kept");
    eq(await page.locator("#lensSel").inputValue(), "", "highlight cleared");
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

await browser.close();

console.log(results.join("\n"));
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
