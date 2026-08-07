#!/usr/bin/env node
/**
 * Portion weights for My day, from the SR Legacy food_portion.csv.
 *
 *   node tools/portions.mjs propose    write src/data/portions.json, report every drop
 *   node tools/portions.mjs coverage   report what shipped, write nothing
 *
 * Why a committed file rather than reading the CSV at build time: USDA's
 * portion descriptions are written for a database, not for a reader. They carry
 * regulatory serving sizes, purchase quantities and USDA's own disambiguation
 * notes, none of which can go on the page as written. So the filter below is
 * proposed by this tool and reviewed by a human, the same arrangement
 * usda-map.json has and for the same reason.
 *
 * The fdc ids come from two files. usda-map.json holds the 44 original foods;
 * tools/food-additions.json holds the other 87 across its `requested` and
 * `staples` arrays. Reading only the first finds a third of the table.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readCSV as readCSVAt } from "./csv.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CSV_DIR = join(ROOT, "tools", "cache", "FoodData_Central_sr_legacy_food_csv_2018-04");
const DATA = join(ROOT, "src", "data", "nutrients.json");
const MAP = join(ROOT, "src", "data", "usda-map.json");
const ADDITIONS = join(ROOT, "tools", "food-additions.json");
const OUT = join(ROOT, "src", "data", "portions.json");

/* A portion is a plausible single helping. Above the cap it is a purchase (a
   whole melon, a head of pak choi); below the floor it is one pistachio kernel,
   which nobody adds to a day and which clampG would round away in the app. */
const MAX_G = 500;
const MIN_G = 5;

/* Every CSV this tool reads lives in CSV_DIR, so the call site names a file
   rather than a path, the same shorthand usda.mjs keeps. */
const readCSV = name => readCSVAt(join(CSV_DIR, name));

const slugify = (name, state) => `${name} ${state || ""}`.toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Rows whose text disqualifies them whatever they weigh. NLEA is the
   regulatory label serving, and it disagrees with the natural portion where
   both exist: kiwi's NLEA is 148 g against "1 fruit" at 69 g. The second rule
   catches quantities describing a purchase rather than a helping, and USDA's
   internal "NS as to" disambiguation notes. */
const TEXT_DROPS = [
  [/\bNLEA\b/i, "regulatory NLEA serving"],
  [/\bas purchased\b|\byields\b|\bNS as to\b/i, "a purchase quantity, not a portion"],
];

/* Sweet potato is mapped to the baked row and its portion reads
   `1 medium (2" dia, 5" long, raw)`. The gram weight is right for the mapped
   row, but printing that descriptor beside a column headed "baked" reads as a
   contradiction the page cannot explain. */
const strip = s => s.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ")
  .replace(/[,\s]+$/, "").trim();

/* The only two fractional amounts that survive the filter, both legitimate:
   a quarter block of tofu and half a grapefruit. */
const AMOUNT = { "0.5": "1/2", "0.25": "1/4" };
const label = (amount, desc) => `${AMOUNT[amount] ?? amount} ${desc}`.trim();

/* Mirrors the app's clampG(), which is Math.round(): a stored quantity is
   always a whole number, so two portions that round to the same whole gram
   are indistinguishable to the control by construction. Named separately
   from the app's version so it is obvious this is the one place that has to
   agree with it, not a coincidence of two functions doing the same thing. */
const clampG = g => Math.round(g);

async function load() {
  const [portions, map, additions, data] = await Promise.all([
    readCSV("food_portion.csv"),
    readFile(MAP, "utf8").then(JSON.parse),
    readFile(ADDITIONS, "utf8").then(JSON.parse),
    readFile(DATA, "utf8").then(JSON.parse),
  ]);

  const fdcBySlug = new Map();
  for (const [slug, m] of Object.entries(map))
    if (m && m.fdc_id) fdcBySlug.set(slug, String(m.fdc_id));
  for (const key of ["requested", "staples"])
    for (const f of additions[key] || [])
      if (f.fdc_id) fdcBySlug.set(slugify(f.name, f.state), String(f.fdc_id));

  const byFdc = new Map();
  for (const p of portions) {
    if (!byFdc.has(p.fdc_id)) byFdc.set(p.fdc_id, []);
    byFdc.get(p.fdc_id).push(p);
  }
  return { data, fdcBySlug, byFdc };
}

/** Returns { kept, drops, collisions }. Nothing is written here, so `coverage`
 *  and `propose` report on exactly the same computation. */
function compute({ data, fdcBySlug, byFdc }) {
  const kept = {}, drops = [], collisions = [];

  for (const f of data.foods) {
    const slug = slugify(f.name, f.state);
    const rows = byFdc.get(fdcBySlug.get(slug)) || [];
    const out = [];

    for (const p of rows) {
      const desc = (p.modifier || p.portion_description || "").trim();
      const g = Number(p.gram_weight);
      let reason = null;
      if (!desc) reason = "no description";
      for (const [re, why] of TEXT_DROPS) if (!reason && re.test(desc)) reason = why;
      if (!reason && !(g > 0)) reason = "no gram weight";
      if (!reason && g > MAX_G) reason = `${g} g, over the ${MAX_G} g cap`;
      if (!reason && g < MIN_G) reason = `${g} g, under the ${MIN_G} g floor`;
      // Two portions of one food that round to the same whole gram cannot be
      // told apart by clampG(), so the app could only ever show one of them
      // as selected. This is a data constraint, so it is enforced here rather
      // than in the control: the first in source order is kept, exactly as
      // every other drop rule above keeps source order.
      if (!reason) {
        const dupe = out.find(o => clampG(o.g) === clampG(g));
        if (dupe) reason = `rounds to ${clampG(g)} g, same as "${dupe.full}" already kept`;
      }
      if (reason) { drops.push({ slug, text: label(p.amount, desc), reason }); continue; }
      out.push({ label: label(p.amount, strip(desc)), g, full: label(p.amount, desc) });
    }

    /* Stripping the dimensions can make two kept portions collide: pineapple
       has a 166 g and an 84 g "1 slice", told apart only by the text that was
       stripped. Both revert to their full description rather than one being
       dropped, because losing it silently would be the tool inventing a
       simpler dataset than the source. */
    const seen = new Map();
    for (const o of out) seen.set(o.label, (seen.get(o.label) || 0) + 1);
    for (const o of out) {
      if (seen.get(o.label) > 1) {
        collisions.push({ slug, label: o.label, full: o.full, g: o.g });
        o.label = o.full;
      }
      delete o.full;
    }
    if (out.length) kept[slug] = out;
  }
  return { kept, drops, collisions, foods: data.foods.length };
}

function report({ kept, drops, collisions, foods }) {
  const rows = Object.values(kept).reduce((n, a) => n + a.length, 0);
  console.log(`${Object.keys(kept).length} of ${foods} foods have at least one portion, ` +
    `${rows} portions in total`);

  console.log(`\ndropped (${drops.length}):`);
  for (const d of drops) console.log(`  ${d.slug.padEnd(28)} "${d.text}"  ${d.reason}`);

  console.log(`\nlabel collisions, both kept with their full description (${collisions.length}):`);
  for (const c of collisions) console.log(`  ${c.slug}: "${c.label}" -> "${c.full}" at ${c.g} g`);
}

const cmd = process.argv[2];
const state = compute(await load());

if (cmd === "coverage") {
  report(state);
} else if (cmd === "propose") {
  report(state);
  await writeFile(OUT, JSON.stringify(state.kept, null, 1) + "\n");
  console.log(`\nwrote ${OUT}`);
} else {
  console.error("usage: node tools/portions.mjs propose | coverage");
  process.exitCode = 1;
}
