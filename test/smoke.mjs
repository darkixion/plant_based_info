#!/usr/bin/env node
/**
 * Smoke tests for the built page.
 *
 * These drive the real file in a real browser, because every feature here is
 * about rendering and persistence — things that unit tests on the source would
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
const eq = (a, b, msg) => assert(Object.is(a, b), `${msg} — expected ${b}, got ${a}`);

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
    // ...but the sidebar controls still exist and still work
    assert(await page.locator("#groupNav [data-grp]").count() === 5, "sidebar group buttons");
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
    const names = await page.locator("#tbody .fname b").allTextContents();
    eq(names[0], "Chia seeds", "highest-fibre food first");
    await page.click('[data-sort="fiber"]');            // second click reverses
    const rev = await page.locator("#tbody .fname b").allTextContents();
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

// ---------------------------------------------------------------- omega columns

await test("omega-7 and omega-9 columns are present and populated", async () => {
  await withPage(async page => {
    await page.click('#groupNav [data-grp="fats"]');
    const heads = await page.locator("#thead th .sortbtn").allTextContents();
    assert(heads.some(h => /Omega-9/.test(h)), `omega-9 column: ${heads.join(" | ")}`);
    assert(heads.some(h => /Omega-7/.test(h)), `omega-7 column: ${heads.join(" | ")}`);

    // 44 foods, less 5 with no USDA source row or no measurement, less 6 whose
    // existing MUFA total disagrees with the mapped row and are withheld.
    const filled = await page.evaluate(() => {
      const i9 = DATA.nutrients.findIndex(n => n.id === "oleic");
      const i7 = DATA.nutrients.findIndex(n => n.id === "palmitoleic");
      return DATA.foods.filter(f => f.v[i9] !== null && f.v[i7] !== null).length;
    });
    eq(filled, 33, "foods carrying both omega figures");
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

await test("foods with no measurement show a dash, not a zero", async () => {
  await withPage(async page => {
    await page.click('#groupNav [data-grp="fats"]');
    // Seitan is deliberately unmapped: USDA has no matching row for it.
    // Wait for the search to have actually narrowed, not merely for Seitan to
    // be somewhere on an unfiltered page.
    await page.fill("#q", "seitan");
    await page.waitForFunction(() => {
      const n = document.querySelectorAll("#tbody .fname b");
      return n.length === 1 && n[0].textContent === "Seitan";
    });
    const cells = await page.locator('#tbody tr td[data-g="fats"]').allTextContents();
    assert(cells.some(c => c.trim() === "—"),
      `expected a dash among ${JSON.stringify(cells)}`);
    assert(!cells.every(c => c.trim() === "—"), "other fat columns still have values");
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
    n => [...document.querySelectorAll("#tbody .fname b")].some(e => e.textContent === n),
    name);
  await page.locator("#tbody .fname", { hasText: name }).first().click();
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

  const starred = await page.locator("#tbody .fname b").first().textContent();
  await page.locator("#tbody .fav").first().click();
  eq(await page.locator("#favCount").textContent(), "1", "favourite count");

  await page.reload();
  await page.waitForSelector("#tbody tr");
  eq(await page.locator("#favCount").textContent(), "1", "count after reload");

  await page.click('.navbtn[data-act="favs"]');
  const rows = await page.locator("#tbody .fname b").allTextContents();
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
