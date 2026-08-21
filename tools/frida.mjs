#!/usr/bin/env node
/**
 * Frida 6.1, the Danish Food Composition Database, and the question
 * PHENOL-EXPLORER-MAP-REVIEW.md taught us to ask before any pairing work: is
 * this a programme with its own analytical work, or a compilation of tables
 * already on this page?
 *
 * For Frida the answer is both, and unusually it says which is which. Every
 * value carries a number of determinations and a source id, and the published
 * source table names all 502 of them. That is enough to take the analytical
 * part and refuse the rest, which is what this file does.
 *
 * The refusals matter more than the admissions. Source 1344 is McCance and
 * Widdowson 4th edition, 1978, and CoFID is the same work at its 7th. Source
 * 2141 is CoFID itself. Sources 2145 and 2289 are AFCD and the CNF. All three
 * are already cited directly by this page, so admitting them would put one
 * table on the page twice under two names. That is exactly how Phenol-Explorer
 * failed, and here it is caught by name rather than by inference.
 *
 * Licence: the dataset is CC BY 4.0, so its figures may be republished with
 * attribution. See FRIDA-PROVENANCE.md for the terms and the required credit.
 *
 * `node tools/frida.mjs provenance` reproduces every figure in that document
 * from the two committed files, with no network.
 */
import { readFileSync } from "node:fs";

/* Frida writes an absent number as the string NULL, which parseFloat turns
   into NaN. The same trap CoFID's Tr sprang, from the other direction. */
const num = v => {
  if (v === null || v === undefined || v === "NULL") return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

/**
 * EuroFIR reference types that are not analytical work.
 *
 * E is an estimate, and Frida says so in the title: "estimated value based on
 * data for similar product". B is a book, which for these components means a
 * foreign composition table. F and WW are other national databases, by name:
 * Swedish, Norwegian, Australian, Danish-adjacent Fineli, Ciqual, NEVO, the
 * CNF and CoFID. L is a food label.
 *
 * What is left, and admitted, is R (DTU and Danish government reports), AJ
 * (journal papers), P (Danish laboratory data not published), AB and X.
 */
const NOT_ANALYTICAL = new Set(["E", "B", "F", "WW", "L"]);

/**
 * What one Frida component cell may contribute, and why.
 *
 * @param {{ val: string, min?: string, max?: string, median?: string,
 *           n?: string, source?: string }} [cell] one component of one row
 * @param {Record<string, { EurofirRefType?: string }>} sources the published
 *   source table, `frida-6.1-sources.json`
 * @returns {object|null} an admission or a refusal, or null where Frida holds
 *   no cell for this component at all
 */
export function fridaCell(cell, sources = {}) {
  if (!cell) return null;

  const value = num(cell.val);
  const n = num(cell.n);
  const min = num(cell.min);
  const max = num(cell.max);
  const ids = String(cell.source ?? "")
    .split(",").map(s => s.trim()).filter(s => s && s !== "NULL");
  const from = cell.sourceFood && cell.sourceFood !== "NULL"
    ? String(cell.sourceFood) : null;

  const refuse = reason => ({ admitted: false, refused: reason, sources: ids });

  /* Both corn flakes molybdenum rows report a minimum of 20 against a maximum
     of 3. Whatever that is, it is not a range, and nothing here can tell which
     of the two numbers is wrong. */
  if (min !== null && max !== null && min > max) return refuse("malformed");

  /* A value Frida carried over from a different food. Its determinations were
     made on that other food, so a large n is the most misleading thing about
     it: green peas chromium cites n=21, every one made on food 1310.

     The workbook marks these with a SourceFood, and gives them no source id.
     The two coincide exactly, on all 538 such cells across twelve components,
     so the id test still stands in for the older extraction shape. */
  if (from) return { ...refuse("borrowed"), borrowedFrom: from };
  if (!ids.length) return refuse("borrowed");

  /* n = 0 is Frida saying it determined nothing. An absent n says no more than
     that, so it is read the same way. */
  if (n === null || n < 1) return refuse("undetermined");

  /* An unknown id is refused rather than assumed analytical: a source that
     cannot be identified cannot be graded. One compiled id among several is
     enough to refuse the cell, because the mean was taken across all of them
     and no part of it can be separated out again. */
  if (ids.some(id => !sources[id] || NOT_ANALYTICAL.has(sources[id].EurofirRefType)))
    return refuse("compiled");

  if (value === null) return refuse("undetermined");

  /* Frida's mean divides by every determination, while min and max span only
     those that came back above detection. A mean below its own minimum is
     therefore not a contradiction; it is a mean that counted non-detects as
     zero, and it understates. Raw pear chromium is 0.0231 against a min and
     max of 0.277, and 0.277 / 12 is exactly its n. It holds on 62 of the 65
     cases where min equals max, and the other three divide to 2, 2 and 3
     detections out of n. Marked rather than corrected: the figure is real and
     the reader is owed the reason it sits where it does. */
  const partial = min !== null && value < min;

  return {
    admitted: true,
    value,
    n,
    partial,
    detected: min !== null && max !== null ? { min, max } : null,
    median: num(cell.median),
    sources: ids,
  };
}

/* ------------------------------------------------------------ provenance ---
   The report behind FRIDA-PROVENANCE.md. Reads only committed files. */

const COMPONENTS = ["biotin_ug", "chromium_ug", "molybdenum_ug", "iodine_ug", "boron_ug"];
const REASONS = ["borrowed", "undetermined", "compiled", "malformed"];

/* ---------------------------------------------------------- the columns ---
   Which page column each Frida component feeds, and in what unit.

   `scale` is there for one component. Frida reports boron in micrograms and
   this page's boron column is milligrams, so the only conversion in the table
   is boron's thousandth. Everything else is already in the column's unit.

   `floor` is RECONCILIATION.md rule 7's, in the page column's unit: the
   smallest difference that means anything here, below which a ratio test says
   nothing. **It is only here for the two columns Frida arrived into without an
   owner.** Molybdenum's belongs to `PAIRED` in mext_afcd.mjs and iodine's to
   `IODINE_FLOOR` in iodine.mjs, where they were written and where they are
   read; repeating them here would be two places for one number to drift in.
   Chromium's is half a microgram against a column that prints whole ones, the
   reasoning USDA-IODINE-PROVENANCE.md gives for iodine. Boron's is five
   thousandths of a milligram, which is `dp: 2` and nothing else, the same way
   oxalate's floor is its column's precision alone. Biotin needs none, because
   `biotinCell` is rule 5's and does not take one.

   `loadAttested` in build.mjs carries a forced duplicate of the id, key and
   scale, on the same terms as the AFCD one: build.mjs may import nothing but
   `node:*`, so a test holds the two in step instead. */
export const FRIDA_COLUMNS = [
  { id: "biotin", key: "biotin_ug",     scale: 1 },
  { id: "cr",     key: "chromium_ug",   scale: 1,     floor: 0.5 },
  { id: "mo",     key: "molybdenum_ug", scale: 1 },
  { id: "iodine", key: "iodine_ug",     scale: 1 },
  { id: "boron",  key: "boron_ug",      scale: 0.001, floor: 0.005 },
];

/**
 * One Frida component as a figure the reconciliation rules can take.
 *
 * Everything the admission rule leaves standing is analytical work, by
 * construction: a compiled, borrowed, undetermined or malformed cell has
 * already been refused by the time this is called, and the four EuroFIR types
 * that survive are Danish government reports, journal papers, unpublished
 * Danish laboratory data and two small residual kinds. So the derivation is
 * always `analysed` and there is no grading to do here.
 *
 * **A `partial` mean is admitted as an ordinary figure.** 53 of the 237 cells
 * this page banks are means sitting below their own detection minimum, because
 * Frida divides by every determination while min and max span only the
 * detections. That is not a defect and not a different kind of number: it is
 * the mean content of the food, with non-detects counted as zero, which is how
 * a composition table reports. Seitan's iodine is 10 over eight determinations
 * of which two detected 40, and 10 is what someone eating it gets. Refusing
 * these would have cost a fifth of the column to a footnote about arithmetic.
 *
 * @param {object} row one food from `frida-6.1.json`
 * @param {{id: string, key: string, scale: number}} col one entry of FRIDA_COLUMNS
 * @param {object} sources the named source table
 * @returns {{source: string, value: number, derivation: string, n?: number}|null}
 */
export function fridaFigure(row, col, sources = {}) {
  const cell = fridaCell(row?.[col.key], sources);
  if (!cell || !cell.admitted) return null;
  const figure = {
    source: "frida-6.1",
    value: cell.value * col.scale,
    derivation: "analysed",
  };
  if (cell.n) figure.n = cell.n;
  return figure;
}

/**
 * Figures that appear verbatim on more than one food.
 *
 * Frida marks a value carried over from another food with a SourceFood, and
 * `fridaCell` refuses those; FRIDA-PROVENANCE.md says the marker "coincides
 * exactly, on all 538 such cells across twelve components". Some cells that
 * look carried over do not carry it. Olive oil, corn oil and refined soyabean
 * oil each read chromium 6.8, detected 0 to 27.6, at n=16 from source 1506,
 * which is one determination set admitted three times.
 *
 * Nothing is refused here. A repeat is a question about the corpus rather than
 * a property of the cell, and only a reviewer can say whether two foods really
 * were measured alike. The report exists so that a pairing is banked knowing.
 *
 * The test is deliberately strict: value, both detection bounds, the count and
 * the source must all agree. Reading the mean alone finds sixteen groups and
 * most are round numbers at small n, where coincidence is ordinary; raw plum
 * and raw kiwi both mean 0.6625 at n=8 over detections of 1.7 to 3.6 and 1.1
 * to 1.7, and 5.3 divided by 8 twice over is no more than that. Zeros are left
 * out for the same reason, and there are a great many of them: a zero is what
 * many separate determinations at or below detection all look like.
 *
 * @param {object[]} rows the release
 * @param {object} sources the named source table
 * @returns {{component: string, value: number, n: number, detected: {min: number, max: number}, sources: string[], rows: object[]}[]}
 */
export function repeatedFigures(rows, sources = {}) {
  const groups = new Map();
  for (const row of rows) for (const key of COMPONENTS) {
    const raw = row[key];
    if (!raw) continue;
    const cell = fridaCell(raw, sources);
    if (!cell || !cell.admitted || cell.value === 0 || !cell.detected) continue;
    const id = [key, cell.sources.join(","), cell.value,
      cell.detected.min, cell.detected.max, cell.n].join("|");
    if (!groups.has(id)) groups.set(id, { component: key, value: cell.value,
      n: cell.n, detected: cell.detected, sources: cell.sources, rows: [] });
    groups.get(id).rows.push(row);
  }
  return [...groups.values()]
    .filter(g => g.rows.length > 1)
    .sort((a, b) => b.rows.length - a.rows.length);
}

function provenance() {
  const rows = JSON.parse(readFileSync("tools/evidence/frida-6.1.json", "utf8"));
  const sources = JSON.parse(readFileSync("tools/evidence/frida-6.1-sources.json", "utf8"));

  console.log(`Frida 6.1: ${rows.length} foods, ${Object.keys(sources).length} named sources\n`);
  console.log("component        cells  admitted  borrowed  undeterm  compiled  malformed");
  for (const key of COMPONENTS) {
    let cells = 0, admitted = 0;
    const by = Object.fromEntries(REASONS.map(r => [r, 0]));
    for (const row of rows) {
      const c = fridaCell(row[key], sources);
      if (!c) continue;
      cells++;
      if (c.admitted) admitted++; else by[c.refused]++;
    }
    if (!cells) continue;
    console.log(`${key.padEnd(15)} ${String(cells).padStart(5)} ${String(admitted).padStart(9)} `
      + REASONS.map(r => String(by[r]).padStart(9)).join(" "));
  }

  /* Which named tables the refusals are, since that is the finding. */
  console.log("\nwhat the compiled refusals actually are, the ten largest:");
  const tally = new Map();
  for (const row of rows) for (const key of COMPONENTS) {
    const c = fridaCell(row[key], sources);
    if (!c || c.admitted || c.refused !== "compiled") continue;
    for (const id of c.sources) {
      if (sources[id] && !NOT_ANALYTICAL.has(sources[id].EurofirRefType)) continue;
      tally.set(id, (tally.get(id) || 0) + 1);
    }
  }
  for (const [id, count] of [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    const s = sources[id];
    const title = s ? (s.TitleEnglish || s.TitleOriginal || "") : "(not in the source table)";
    console.log(`${String(count).padStart(5)}  ${id} [${s ? s.EurofirRefType : "?"}] ${title.slice(0, 74)}`);
  }

  /* And the figures that are admitted more than once. Not a refusal: see
     repeatedFigures for why this is a reviewer's question rather than the
     admission rule's. */
  const repeats = repeatedFigures(rows, sources);
  const cells = repeats.reduce((n, g) => n + g.rows.length, 0);
  console.log(`\nfigures admitted verbatim on more than one food: `
    + `${repeats.length} groups over ${cells} cells`);
  for (const g of repeats) {
    console.log(`  ${COMPONENT_LABEL[g.component]} ${g.value} `
      + `(detected ${g.detected.min} to ${g.detected.max}) n=${g.n} `
      + `source ${g.sources.join(",")}`);
    for (const r of g.rows) console.log(`       ${String(r.FoodID).padStart(5)}  ${r.name}`);
  }
}

/* -------------------------------------------------------------- propose ---
   Candidate pairings for review. Nothing here reaches a map: automated name
   matching is refused in this project, and the reason is in the root README as
   a worked example, a matcher having once paired "Black beans" with "Black
   pudding, boiled". The scorer is the one biotin.mjs already uses, so the two
   proposal documents are comparable and a reviewer reads one kind of table.

   Only rows that admit something are offered. A pairing to a row whose every
   component is borrowed, undetermined or compiled buys nothing and would put a
   food in front of a reviewer for no reason. */
/* Preparation and processing words a row can carry that `scoreCandidate` does
   not refuse, because they are neither raw nor cooked. Each of these produced
   a proposal worth catching: "Sweet potato fries, frozen" led baked sweet
   potato, "Apricot, dried" led raw apricots, and "Green beans (haricots
   verts), frozen" led haricot beans, which are a different bean entirely. The
   scorer is not going to learn the difference between a navy bean and a French
   one, so the document says where to look instead. */
const WATCH = ["frozen", "canned", "dried", "fries", "juice", "powder", "brine",
  "sauce", "concentrate", "sprouted", "enriched", "fortified", "ready to eat"];

/**
 * What the EFSA classification says was analysed, where the row's own name does
 * not say it.
 *
 * `foodEx2` is carried by `extract_frida.mjs` and read here rather than scored,
 * for the reason that file gives: it is a code someone assigned, and 753's says
 * "Canned or jarred legumes" of a vegetable that is not a legume. It is right
 * on 416 of the 417 rows whose Danish name says raw, which is what makes the
 * one disagreement worth a reviewer's time rather than a rule.
 *
 * Two kinds are worth reporting and the rest are not. A preserving step is
 * always worth it, because the page food never means the preserved form unless
 * it says so: "Asparagus, all types, raw" is coded sterilised and industry
 * prepared. A cooking step is worth it only where the page food names no
 * preparation at all, which is this page's way of saying the plain, uncooked
 * thing: "Poppy seeds" is coded roasted. Drying, decortication, sifting and
 * seasoning are none of a nut's business and are left out, or every seed on the
 * page carries a flag that says nothing.
 *
 * @param {string} foodEx2 the row's FoodEx2Description
 * @param {string} said the page food's name and state, lowercased
 * @returns {string[]} terms to put in front of a reviewer, possibly empty
 */
export function foodEx2Flags(foodEx2, said) {
  const text = String(foodEx2 ?? "");
  if (!text || text === "NULL") return [];
  /* A description is a category followed by comma-separated `FACET = value`
     clauses. Both halves are reported whole, so the reviewer reads what the
     release says rather than the word that matched. */
  const clauses = text.split(",").map(s => s.trim()).filter(Boolean);
  const value = c => c.includes(" = ") ? c.slice(c.indexOf(" = ") + 3) : c;

  const PRESERVED = /\bcanned\b|\bjarred\b|sterilis|pasteuris|\bfrozen\b|\bfreezing\b/i;
  const COOKING = /\bboiling\b|\bsteaming\b|\broasting\b|\bfrying\b|\bbaking\b|\bgrilling\b/i;
  /* A page food that says nothing is this page's way of saying the plain,
     uncooked thing, and it is the only one a cooking term surprises. One that
     says cooked has already agreed to a method, and which method is a question
     the Danish name answers better than a classification code does. */
  const statesPreparation =
    /\b(raw|cooked|boiled|baked|roasted|steamed|grilled|fried|dried|dry|fresh)\b/.test(said);

  const out = [];
  for (const c of clauses) {
    const v = value(c);
    if (PRESERVED.test(v) && !PRESERVED.test(said)) out.push(v);
    else if (!statesPreparation && COOKING.test(v)) out.push(v);
  }
  return out;
}

const COMPONENT_LABEL = {
  biotin_ug: "biotin", chromium_ug: "chromium", molybdenum_ug: "molybdenum",
  iodine_ug: "iodine", boron_ug: "boron",
};

async function propose(categories) {
  const { readFileSync, writeFileSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const bio = await import("./biotin.mjs");
  const { scoreCandidate, namesCooking } = bio;
  sharedTokens = bio.sharedTokens;

  const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
  const EV = join(ROOT, "tools", "evidence");
  const rd = f => JSON.parse(readFileSync(join(EV, f), "utf8"));
  const slugify = (name, state) => `${name} ${state || ""}`
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const rows = rd("frida-6.1.json");
  const sources = rd("frida-6.1-sources.json");
  let foods = JSON.parse(readFileSync(join(ROOT, "src", "data", "nutrients.json"), "utf8")).foods;
  if (categories.length) foods = foods.filter(f => categories.includes(f.cat));
  if (!foods.length) throw new Error(`no page foods in category ${categories.join(", ")}`);

  /* What each row can actually answer for, decided by the admission rule
     rather than by whether the workbook holds a number. */
  const admitsOf = new Map();
  for (const row of rows) {
    const admits = {};
    for (const key of COMPONENTS) {
      const c = fridaCell(row[key], sources);
      if (c && c.admitted) admits[key] = c;
    }
    if (Object.keys(admits).length) admitsOf.set(row, admits);
  }
  const offerable = [...admitsOf.keys()];

  /* What is already banked, so the document says whether this run still agrees
     with it. Before 2026-08-21 this read a map of 17 unreviewed slug-to-id
     pairs and quoted each above its food; those are gone and the file now holds
     72 reviewed entries. A proposal that disagrees with a banked pairing is the
     interesting case and gets said so, because it means either the release
     moved or a reviewer overrode the scorer, and only one of those is fine. */
  const banked = rd("page-map-frida.json");
  const bankedBy = new Map(Object.entries(banked)
    .filter(([slug, e]) => !slug.startsWith("_") && e && typeof e === "object")
    .map(([slug, e]) => [slug, e]));
  const rowById = new Map(rows.map(r => [String(r.FoodID), r]));

  const show = c => {
    const parts = [`${c.value}`, `n=${c.n}`];
    if (c.partial) parts.push("partial");
    return parts.join(" ");
  };

  const out = {};
  let mapped = 0, thinCount = 0;
  const unreached = [], silent = [];
  let worth = "", thin = "";

  for (const food of foods) {
    const slug = slugify(food.name, food.state);
    const label = `${food.name}${food.state ? `, ${food.state}` : ""}`;
    const top = offerable
      .map(r => ({ row: r, score: scoreCandidate(food.name, food.state, r.name) }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const was = bankedBy.get(slug);
    if (!top.length) {
      /* Two different answers, and the page has spent a lot of effort keeping
         them apart everywhere else. Scoring against every row rather than only
         the ones that admit something says which this is: a food Frida holds
         and has determined nothing about, or a food it does not reach at all.
         Garlic is the first: Frida's "Garlic, raw" scores 18 and its only
         component is an iodine value borrowed from another food. */
      const anyRow = rows
        .map(r => ({ row: r, score: scoreCandidate(food.name, food.state, r.name) }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)[0];
      /* A banked pairing whose food no longer has a candidate is the one
         shape of drift that matters here: the map points at a row this search
         cannot reach, so something moved under it. */
      const note = was ? ` (**the map banks ${was.food_id}, "${was.name}"**, `
        + `which this search does not reach)` : "";
      if (anyRow) silent.push(`${label} — Frida's "${anyRow.row.name}" matches and admits nothing${note}`);
      else unreached.push(label + note);
      continue;
    }

    let block = `\n### ${label}\n\n`;
    /* The Danish name is a column rather than a footnote, because it is the one
       that says which row is which. Three rows are called "Carrot, raw" and
       the English name cannot separate them; "Gulerod, uspec.", "Gulerod,
       dansk" and "Gulerod, importeret" can, and the unqualified page food
       takes the unspecified row. */
    block += "| FoodID | Frida row | Danish name | admits | score | grade |\n"
      + "|---|---|---|---|---|---|\n";
    let best = null;
    for (const c of top) {
      const grade = suggestGrade(c.score, food.name, c.row.name);
      if (!best && grade !== "proxy") best = { c, grade };
      const admits = admitsOf.get(c.row);
      const what = Object.entries(admits)
        .map(([k, v]) => `${COMPONENT_LABEL[k]} ${show(v)}`).join("; ");
      block += `| ${c.row.FoodID} | ${c.row.name} | ${c.row.nameDanish} | ${what} `
        + `| ${c.score} | ${grade} |\n`;
    }
    /* Sorted into two piles rather than one list. A food whose every candidate
       is a proxy is one where the honest answer is probably no pairing at all,
       and mixing those in with the ones worth a nod is what makes a review
       document go unread. */
    if (best) {
      /* Where the map and this run disagree, say so. Each case is a reviewer
         overriding the scorer on something the scorer cannot see: a row that
         is a retail product rather than a cooked food, or one whose EFSA
         classification says it was preserved. A refusal shows up here as a
         food with a candidate and no banked entry at all. */
      if (!was)
        block += `\n**Not banked.** This food has a candidate above proxy and no `
          + `entry in \`page-map-frida.json\`.\n`;
      else if (was.food_id !== best.c.row.FoodID || was.match !== best.grade)
        block += `\n**The map banks ${was.food_id}, "${was.name}", as *${was.match}*`
          + `${was.food_id === best.c.row.FoodID ? "" : ", which is not the row leading here"}.**`
          + `${was.note ? ` ${was.note}` : ""}\n`;

      const state = String(food.state || "").toLowerCase();
      /* Against the whole page food, name and state, so "Cocoa powder,
         unsweetened" is not warned about a row that says powder. And a
         stateless page food is not warned about "dried": the scorer already
         treats those as agreeing, because Frida writes "Walnuts, dried" where
         CoFID writes "Walnuts, kernel only" and neither is a claim about
         preparation. */
      const said = `${food.name} ${state}`.toLowerCase();
      const flags = WATCH.filter(w =>
        best.c.row.name.toLowerCase().includes(w) && !said.includes(w)
        && !(w === "dried" && !state)
        /* And a row that says dried and then names a cooking method is a
           dried food someone cooked, which is the only kind of row Frida has
           for a cooked legume. "White beans, dried and boiled" was being
           flagged as saying dried where the page food says cooked. */
        && !(w === "dried" && namesCooking(best.c.row.name)));
      if (flags.length)
        block += `\n**Look twice.** The leading row says ${flags.map(f => `*${f}*`).join(" and ")}`
          + ` where the page food ${state ? `says *${state}*` : "says nothing"}.\n`;
      /* And what the row's name does not say. This is the only line in the
         document that reads a field other than the name, and it found the two
         the name hid: 753 is called "Asparagus, all types, raw" and classified
         as sterilised, 1292 is called "Poppy seeds" and classified as
         roasted. */
      const coded = foodEx2Flags(best.c.row.foodEx2, said);
      if (coded.length)
        block += `\n**Look twice.** The leading row's name says nothing about `
          + `preparation that disagrees, but EFSA's classification of it is `
          + `${coded.map(f => `*${f}*`).join(" and ")}: \`${best.c.row.foodEx2}\`.\n`;
      mapped++;
      worth += block;
      out[slug] = {
        food_id: String(best.c.row.FoodID),
        name: best.c.row.name,
        match: best.grade,
        admits: Object.keys(admitsOf.get(best.c.row)).map(k => COMPONENT_LABEL[k]),
      };
    } else {
      thin += block;
      thinCount++;
    }
  }

  writeFileSync(join(EV, "proposed-page-map-frida.json"), JSON.stringify(out, null, 1) + "\n");
  const head = `# Frida map proposals, for review

Written by \`node tools/frida.mjs propose\`. **Every pair here is a suggestion
and nothing here maps anything.** Automated name matching is refused in this
project, so nothing reaches \`page-map-frida.json\` until a person has read it.
The scorer is the one \`BIOTIN-MAP-REVIEW.md\` uses.

72 of these are now banked, and where the map disagrees with the row leading
here the entry and its reason are quoted above the table. \`FRIDA-BANKING-REVIEW.md\`
is the record of that reading.

\`FRIDA-PROVENANCE.md\` is the companion and should be read first: it is why the
"admits" column exists at all. A row's borrowed, undetermined and compiled
values are already gone by the time they reach this table, so a component named
here is one Frida determined itself.

**\`partial\` marks a mean that sits below its own minimum**, which is not a
defect: the mean divides by every determination while min and max span only the
detections, so a figure that counted non-detects as zero lands under its own
floor. It understates, and the reader is owed the reason.

**The Danish name is a column because the English one cannot always say which
row is which.** 24, 559 and 606 are all called "Carrot, raw"; in Danish they are
\`uspec.\`, \`dansk\` and \`importeret\`, and an unqualified page food takes the
unspecified row. Where the EFSA classification says a row was preserved, or
cooked where the page food names no preparation, that is quoted too: it is the
only field here that is not the name, and it found a raw-named asparagus
classified as sterilised and a plain-named poppy seed classified as roasted.
`;
  const doc = head
    + `\n## Worth a decision\n\n${mapped} page foods have at least one candidate `
    + `graded above proxy. The first row of each is what \`proposed-page-map-frida.json\`\ncarries.\n`
    + worth
    + `\n## Nothing here rose above proxy\n\n${thinCount} page foods, listed because a `
    + `reviewer needs to see that the search happened and\ncame back empty rather than that it was skipped. Frida holds meat and dairy too, `
    + `so\nsome of these are a page food meeting a food it has nothing to do with.\n`
    + thin
    + `\n## Frida holds the food and has determined nothing about it\n\n`
    + `${silent.length} page foods. A row matches, and every value on it is borrowed from\n`
    + `another food, undetermined, or compiled from a table this page already cites. This\n`
    + `is not the same answer as the section below and must not be read as one: the\n`
    + `database was asked and had nothing of its own to say.\n\n`
    + silent.map(u => `- ${u}`).join("\n") + "\n"
    + `\n## No Frida row reaches the food at all\n\n${unreached.length} of ${foods.length}. `
    + `Preparation does most of this: the page's legumes and\ngrains are cooked and Frida reports them dried, raw or frozen, which\n`
    + `\`scoreCandidate\` refuses outright rather than ranking lower.\n\n`
    + `**Some of it is vocabulary, and a name scorer cannot see through a synonym\n`
    + `by itself.** \`ALIASES\` in \`tools/biotin.mjs\` is the hand-written answer, and\n`
    + `it holds two: flaxseed is Frida's "Linseeds, raw" and this page's haricot bean\n`
    + `is Denmark's white bean. Both were found by hand and neither would ever be\n`
    + `found by a scorer. **Anything on this list that this page names in British or\n`
    + `American English and Denmark does not is worth looking up by hand before\n`
    + `believing the absence**, and belongs in \`ALIASES\` when it is.\n\n`
    + unreached.map(u => `- ${u}`).join("\n") + "\n";
  writeFileSync(join(EV, "FRIDA-MAP-REVIEW.md"), doc);
  console.log(`${mapped} worth a decision, ${thinCount} proxy only, `
    + `${silent.length} matched but silent, ${unreached.length} unreached, `
    + `of ${foods.length} page foods`);
  console.log(`proposals in tools/evidence/proposed-page-map-frida.json, `
    + `review in tools/evidence/FRIDA-MAP-REVIEW.md`);
}

/* A grade is a claim about the pair and the reviewer's to make. This suggests
   one so the common case is a nod rather than a decision, which means the
   suggestion has to be wrong in the safe direction.
 *
 * **Nothing rises above proxy unless every word of the page food's name is in
 * the row's.** The score alone is too generous to say more: one shared word
 * scores 10 and a matching preparation adds 8, so "Black beans, cooked"
 * against "Coffee bean, roasted, ground" reaches 18 on the word "bean" and was
 * being offered as close. That is the pairing this project's rule against
 * automated name matching exists to describe, and a reviewer skimming a column
 * of grades is exactly who it would catch out. */
let sharedTokens;  // bound by propose(), which is where biotin.mjs is loaded

const suggestGrade = (score, name, row) => {
  const { shared, of } = sharedTokens(name, row);
  /* Both tests, because each catches what the other misses. A short score with
     every word shared is a row the traps knocked down and usually a different
     preparation: "Lentils, cooked" against "Lentils, green, boiled, canned"
     shares every word and scores 3. A high score with a word missing is the
     coffee bean. */
  if (shared < of || score < 18) return "proxy";
  return score >= 26 ? "exact" : "close";
};

if (process.argv[1] && process.argv[1].endsWith("frida.mjs")) {
  const [, , cmd, ...args] = process.argv;
  if (cmd === "provenance") provenance();
  else if (cmd === "propose") await propose(args);
  else {
    console.log("usage: node tools/frida.mjs provenance");
    console.log("       node tools/frida.mjs propose [<Category>...]");
    process.exit(1);
  }
}
