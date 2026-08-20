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
  "sauce", "concentrate", "sprouted", "enriched", "fortified"];

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

  const legacy = rd("page-map-frida.json");
  const legacyBy = new Map(Object.entries(legacy).map(([slug, id]) => [slug, String(id)]));
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

    const was = legacyBy.get(slug);
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
      const note = was ? ` (the old map held ${was}, `
        + `"${rowById.get(was)?.name ?? "which is not a row in this release"}")` : "";
      if (anyRow) silent.push(`${label} — Frida's "${anyRow.row.name}" matches and admits nothing${note}`);
      else unreached.push(label + note);
      continue;
    }

    let block = `\n### ${label}\n\n`;
    if (was) {
      const row = rowById.get(was);
      block += `The old map held **${was}${row ? `, "${row.name}"` : ", which is not a row in this release"}**. `
        + `It was never reviewed.\n\n`;
    }
    block += "| FoodID | Frida row | admits | score | grade |\n|---|---|---|---|---|\n";
    let best = null;
    for (const c of top) {
      const grade = suggestGrade(c.score, food.name, c.row.name);
      if (!best && grade !== "proxy") best = { c, grade };
      const admits = admitsOf.get(c.row);
      const what = Object.entries(admits)
        .map(([k, v]) => `${COMPONENT_LABEL[k]} ${show(v)}`).join("; ");
      block += `| ${c.row.FoodID} | ${c.row.name} | ${what} | ${c.score} | ${grade} |\n`;
    }
    /* Sorted into two piles rather than one list. A food whose every candidate
       is a proxy is one where the honest answer is probably no pairing at all,
       and mixing those in with the ones worth a nod is what makes a review
       document go unread. */
    if (best) {
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
and none of them is mapped.** Automated name matching is refused in this
project, so nothing reaches \`page-map-frida.json\` until a person has read it.
The scorer is the one \`BIOTIN-MAP-REVIEW.md\` uses.

\`FRIDA-PROVENANCE.md\` is the companion and should be read first: it is why the
"admits" column exists at all. A row's borrowed, undetermined and compiled
values are already gone by the time they reach this table, so a component named
here is one Frida determined itself.

**\`partial\` marks a mean that sits below its own minimum**, which is not a
defect: the mean divides by every determination while min and max span only the
detections, so a figure that counted non-detects as zero lands under its own
floor. It understates, and the reader is owed the reason.

The old \`page-map-frida.json\` held 17 slug-to-id pairs in a shape with no
state, no grade and no review, predating the discipline \`BIOTIN-MAP-REVIEW.md\`
set. Each is quoted above its food below rather than carried across, because a
pairing nobody checked is not evidence that it is right.
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
