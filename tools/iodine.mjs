#!/usr/bin/env node
/**
 * Iodine, the component RECONCILIATION.md rule 3 was written about.
 *
 * Rolled oats are 74 ug in Australia and not detected in Japan, and that
 * conflict is the case that justifies the whole range mechanism: a single best
 * value would be wrong whichever number was picked. The column was MEXT alone
 * until 2026-08-19, so the conflict could not appear at all.
 *
 * Three sources reach it. MEXT holds an iodine entry for 102 of this page's
 * foods and marks an absence apart from a zero. AFCD reaches 72 through its
 * reviewed map. The USDA/FDA/ODS-NIH release reaches 40 through an id join
 * with no name matching anywhere in it, and is the only one that reports how
 * many samples each figure rests on. See USDA-IODINE-PROVENANCE.md for what
 * each of them measured.
 *
 * What is left here is the reading of the three files. The cell rule itself is
 * `nationalCell` in reconcile.mjs, because molybdenum and oxalate need the
 * same one: it was iodine that forced it, not iodine that owns it.
 *
 * This file is separate from tools/evidence.mjs because that file runs its
 * loops at import, so nothing inside it can be tested. Same reason biotin.mjs
 * exists, and the shape is deliberately its sibling.
 */
import { gradeDerivation, nationalCell } from "./reconcile.mjs";

const num = v => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

/* MEXT prints an estimated figure in parentheses and keeps `value` null for
   anything that is not a plain number, so the figure comes back off `raw`. */
const figureOf = c =>
  typeof c.value === "number" ? c.value
  : (m => (m ? Number(m[0]) : null))(/-?\d+(\.\d+)?/.exec(String(c.raw ?? "")));

/* Rule 6's floor for this column, in ug per 100 g, and the reason it is half a
   microgram is two reasons that agree. It is where the assays stop: the FDA's
   Total Diet Study reports iodine to a limit of detection around a tenth of a
   microgram per 100 g, so a figure of 0.1 is the instrument's floor rather
   than the food's content. And it is below what the column can print, `dp: 0`
   in nutrients.json, so a spread that lives entirely under it is a
   disagreement no reader could see. Nothing on this page sits awkwardly near
   it: the next figure up is celery at 1.7. */
export const IODINE_FLOOR = 0.5;

/**
 * The iodine cell for one food, from whichever of the four sources reach it.
 *
 * Frida is the fourth, reaching 62 foods through `page-map-frida.json`, and it
 * arrives already reduced to a figure by its own admission rule: 284 of its
 * 1,210 iodine cells are compiled from tables this page already cites and are
 * refused there rather than here. Note what that leaves: **its iodine is the
 * one component of the five where the refusals outnumber almost everything**,
 * so a Frida iodine figure that survives is Danish analytical work.
 *
 * @param {{
 *   mext?: { state: string, value: number|null, raw?: string },
 *   afcd?: { iodine_ug: string, derivation: string },
 *   usda?: { iodine_ug_100g: string, n: string },
 *   frida?: { source: string, value: number, derivation: string, n?: number },
 * }} rows
 * @returns {object|null} a cell, or null where no source says anything
 */
export function iodineCell(rows) {
  const figures = [];
  const states = {};

  if (rows.mext) {
    const st = rows.mext.state;
    if (st === "measured" || st === "estimated") {
      const v = figureOf(rows.mext);
      if (v !== null) figures.push({ source: "mext-2020", value: v,
        derivation: st === "estimated" ? "estimated" : "analysed" });
    } else states["mext-2020"] = st;
  }

  /* AFCD's derivation is per row rather than per component, so Analysed means
     the row was analysed and not that iodine specifically was. It is the only
     answer the release publishes at this grain; the limitation is recorded in
     USDA-IODINE-PROVENANCE.md rather than guessed around. */
  if (rows.afcd) {
    const v = num(rows.afcd.iodine_ug);
    if (v !== null) figures.push({ source: "afcd-r3", value: v,
      derivation: gradeDerivation(rows.afcd.derivation) });
  }

  /* Every row of the USDA release names the programme that ran the assay and
     the years it ran, so all of it is analysed. n comes with it, which no
     other source here supplies. */
  if (rows.usda) {
    const v = num(rows.usda.iodine_ug_100g);
    if (v !== null) {
      const n = num(rows.usda.n);
      const c = { source: "usda-iodine-r4", value: v, derivation: "analysed" };
      if (n) c.n = n;
      figures.push(c);
    }
  }

  if (rows.frida) figures.push(rows.frida);

  return nationalCell(figures, states, IODINE_FLOOR);
}


/* ---------- the join ----------
   The USDA release carries NDB numbers, and SR Legacy's own crosswalk maps
   fdc_id to NDB, so a page food reaches a release row through ids alone. The
   chain is the reviewed one tools/flavonoids.mjs already walks: page food ->
   fdc_id, from usda-map.json and food-additions.json, both human-checked ->
   NDB number, from SR Legacy -> release row. There is no name matching
   anywhere in it, which is why it may be run rather than reviewed by hand.

   Written into the corpus as a list of page slugs per row, the way the
   proanthocyanidin release carries its mapping, so no separate map file exists
   to drift from it. Run as `node tools/iodine.mjs map`; the SR Legacy
   crosswalk it needs is a gitignored cache, which is exactly why the result is
   committed rather than recomputed at build time.

   94 of the 478 rows carry no NDB at all and are unreachable by this chain.
   Nori is one of them, and pairing it is a human's to bank. */
import { readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SR_DIR = join(ROOT, "tools", "cache", "FoodData_Central_sr_legacy_food_csv_2018-04");
const CORPUS = join(ROOT, "tools", "evidence", "usda-iodine-r4.json");

const slugify = f => `${f.name} ${f.state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function cmdMap({ dry }) {
  try { await access(join(SR_DIR, "sr_legacy_food.csv")); }
  catch { throw new Error(`no SR Legacy crosswalk at ${SR_DIR}. Run 'usda.mjs match' once to fetch it.`); }

  const data = JSON.parse(await readFile(join(ROOT, "src", "data", "nutrients.json"), "utf8"));
  const map = JSON.parse(await readFile(join(ROOT, "src", "data", "usda-map.json"), "utf8"));
  const spec = JSON.parse(await readFile(join(ROOT, "tools", "food-additions.json"), "utf8"));

  const fdcOf = new Map();
  for (const f of [...(spec.requested || []), ...(spec.staples || [])])
    if (f.fdc_id) fdcOf.set(slugify(f), String(f.fdc_id));
  for (const [slug, m] of Object.entries(map))
    if (m.fdc_id) fdcOf.set(slug, String(m.fdc_id));

  /* Two columns and no quoted commas in either, so a split is enough. The
     project has a CSV reader in tools/csv.mjs and this stays with the simpler
     one the same file is read with elsewhere. */
  const lines = (await readFile(join(SR_DIR, "sr_legacy_food.csv"), "utf8")).split("\n");
  const head = lines[0].split(",").map(s => s.replace(/"/g, "").trim());
  const iFdc = head.indexOf("fdc_id"), iNdb = head.indexOf("NDB_number");
  const ndbOf = new Map();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const c = line.split(",").map(s => s.replace(/"/g, "").trim());
    ndbOf.set(c[iFdc], String(c[iNdb]).padStart(5, "0"));
  }

  const corpus = JSON.parse(await readFile(CORPUS, "utf8"));
  const byNdb = new Map();
  for (const r of corpus) {
    const ndb = String(r.ndb ?? "").trim();
    if (ndb) byNdb.set(ndb.padStart(5, "0"), r);
  }

  const before = corpus.filter(r => r.page_slugs?.length).length;
  /* Rebuilt rather than added to. A food that loses its fdc mapping has to
     lose its row here with it, and an append would leave the slug behind
     pointing at a row the reviewed chain no longer reaches. */
  for (const r of corpus) r.page_slugs = [];

  let placed = 0; const unreached = [];
  for (const f of data.foods) {
    const slug = slugify(f);
    const fdc = fdcOf.get(slug);
    const ndb = fdc ? ndbOf.get(fdc) : undefined;
    const row = ndb ? byNdb.get(ndb) : undefined;
    if (!row) { unreached.push(slug); continue; }
    row.page_slugs.push(slug);
    placed++;
  }
  for (const r of corpus) r.page_slugs.sort();

  const after = corpus.filter(r => r.page_slugs.length).length;
  console.log(`rows naming a page food: ${before} -> ${after}`);
  console.log(`page foods placed: ${placed} of ${data.foods.length}`);
  console.log(`${unreached.length} foods reach no release row (no fdc id, no NDB number, or not in Release 4.0)`);
  if (dry) { console.log("\n--dry-run: nothing written"); return; }
  await writeFile(CORPUS, JSON.stringify(corpus, null, 1) + "\n");
  console.log(`\nwrote ${CORPUS}`);
}

if (process.argv[1] && process.argv[1].endsWith("iodine.mjs")) {
  const args = process.argv.slice(2);
  const cmd = args.find(a => !a.startsWith("-"));
  if (cmd === "map") await cmdMap({ dry: args.includes("--dry-run") });
  else {
    console.log("usage: node tools/iodine.mjs map [--dry-run]\n");
    console.log("  map   rewrite page_slugs on tools/evidence/usda-iodine-r4.json");
    console.log("        from the reviewed page -> fdc_id -> NDB -> row chain.");
  }
}
