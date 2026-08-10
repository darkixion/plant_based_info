#!/usr/bin/env node
/**
 * Pulls flavonoid columns from the USDA Database for the Flavonoid Content of
 * Selected Foods, Release 3.3.
 *
 *   node tools/flavonoids.mjs extract           .accdb -> tools/cache/flav_exp11/*.csv
 *   node tools/flavonoids.mjs coverage          report what the join reaches, write nothing
 *   node tools/flavonoids.mjs pull [--dry-run]  add those columns to nutrients.json
 *
 * Why this is not part of usda.mjs: the flavonoids are not in SR Legacy. SR
 * Legacy defines the nutrient ids (1348 anthocyanidins, 1347 flavonoids, 1343
 * isoflavones and the rest) but carries a value for none of them in any row.
 * The measurements live in a separate release on the ARS Beltsville site, not
 * on FoodData Central, and it ships as an MS Access database rather than CSV.
 *
 * The join is exact. Release 3.3 is keyed by NDB number, and SR Legacy's
 * sr_legacy_food.csv maps fdc_id to NDB_number, so every food resolves through
 * the row a human already reviewed. There is no fuzzy matching here and there
 * must not be: the near-misses are exactly the dangerous ones. USDA's raw
 * aubergine row carries 85.7 mg of anthocyanidins and its cooked row carries
 * 0.1, so reaching for "close enough" would be wrong by a factor of 800.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readCSV } from "./csv.mjs";

const exec = promisify(execFile);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CACHE = join(ROOT, "tools", "cache");
const ACCDB = join(CACHE, "FDB-EXP_R01-1.accdb");
const CSV_DIR = join(CACHE, "flav_exp11");
const SR_DIR = join(CACHE, "FoodData_Central_sr_legacy_food_csv_2018-04");
const ACCDB_URL = "https://www.ars.usda.gov/ARSUserFiles/80400535/Data/Flav/FDB-EXP_R01-1.accdb";
const DATA = join(ROOT, "src", "data", "nutrients.json");
const MAP = join(ROOT, "src", "data", "usda-map.json");

/* Tables worth extracting. FLAV_IND holds the 24,130 individual laboratory
   measurements behind FLAV_DAT; it is not needed to build columns but it is
   what you read when a figure looks wrong. */
const TABLES = ["FLAV_DAT", "NUTR_DEF", "FD_GROUP"];

/* ---------- what counts as a measured subclass ----------
   USDA publishes individual compounds, not subclass totals, so a column here is
   a sum. That is only honest when the food has the whole subclass measured.
   Summing whatever happens to be present produces a partial total that reads
   like a complete one: USDA measured quercetin alone for asparagus, and a
   15.2 mg "flavonols" figure built from it would sit in the table looking like
   the same kind of number as kale's 93.

   So each subclass names the compounds that must be present. A food missing any
   of them gets "no data" for that column, and minor compounds outside the list
   are added to the sum when they happen to be there. The lists are the
   compounds that carry the subclass in food, not every compound USDA defines:
     - Anthocyanidins: all six, none is negligible.
     - Flavan-3-ols: the five catechins. Gallocatechin is summed when present.
       The four theaflavins and thearubigins are deliberately excluded, being
       fermentation products that exist for twelve foods in the whole database,
       all of them tea, and none of them ours. Requiring them would empty the
       column by construction.
     - Flavonols: quercetin, kaempferol and myricetin. Isorhamnetin is summed
       when present but not required, since it is measured for under a quarter
       of the database and is negligible outside onions and brassicas.

   The cost of this rule is visible and worth stating. Cocoa powder has the
   largest flavan-3-ol figure in the source, 261 mg, but USDA measured only
   catechin and epicatechin for it, so it gets "no data" rather than a number
   that understates by an unknown amount. Rocket loses a 47 mg flavonol figure
   the same way, for want of myricetin. */
const SUBCLASS = {
  isoflavones: {
    class: "Isoflavones",
    require: ["Daidzein", "Genistein", "Glycitein"],
    col: {
      id: "isoflavones", label: "Isoflavones", group: "plant",
      unit: "mg", dv: null, dp: 1, after: "flavones",
      why: "The phytoestrogens found predominantly in soybeans and soy products. These compounds are structurally similar to estrogen and are actively researched for hormonal health.",
    },
  },
};

/** `after` positions the column at build time; it is not page data, so it must
 *  not end up shipped inside nutrients.json. Mirrors usda.mjs. */
const column = ({ after, ...col }) => col;

const slugify = f => `${f.name} ${f.state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- extract ----------
   Release 3.3 is an .accdb, so getting at it needs a reader. This is a one-off
   developer step and its dependency must stay here: build.mjs has none by
   design, and adding one would break the promise that the page builds from a
   clean checkout with nothing but node.

   Two readers are tried because neither is reliably present. mdbtools is the
   conventional answer and needs a system package; uv runs a throwaway Python
   environment and needs no root. Whichever works, the CSVs it writes are the
   same and every later step reads only those. */
const PY_EXTRACT = `
import csv, sys
from access_parser import AccessParser
db = AccessParser(sys.argv[1])
for t in sys.argv[3:]:
    tb = db.parse_table(t)
    cols = list(tb.keys())
    with open(f"{sys.argv[2]}/{t}.csv", "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(cols)
        for i in range(len(tb[cols[0]])):
            w.writerow([tb[c][i] for c in cols])
`;

async function ensureAccdb() {
  try { await access(ACCDB); return; } catch {}
  await mkdir(CACHE, { recursive: true });
  process.stdout.write("downloading flavonoid Release 3.3 (~11 MB)... ");
  const res = await fetch(ACCDB_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(ACCDB));
  console.log("done");
}

async function cmdExtract() {
  await ensureAccdb();
  await mkdir(CSV_DIR, { recursive: true });

  try {
    await exec("mdb-tables", ["-1", ACCDB]);
    for (const t of TABLES) {
      const { stdout } = await exec("mdb-export", [ACCDB, t], { maxBuffer: 1 << 28 });
      await writeFile(join(CSV_DIR, `${t}.csv`), stdout);
    }
    console.log(`extracted ${TABLES.length} tables with mdbtools -> ${CSV_DIR}`);
    return;
  } catch { /* fall through to the Python reader */ }

  try {
    await exec("uv", ["run", "--quiet", "--with", "access-parser", "python3", "-c",
      PY_EXTRACT, ACCDB, CSV_DIR, ...TABLES], { maxBuffer: 1 << 28 });
    console.log(`extracted ${TABLES.length} tables with access-parser -> ${CSV_DIR}`);
    return;
  } catch (e) {
    throw new Error(
      `could not read ${ACCDB}.\n` +
      `  It is an MS Access database, so it needs one of:\n` +
      `    apt install mdbtools        (system package, needs root)\n` +
      `    uv                          (runs access-parser in a throwaway env)\n` +
      `  Underlying error: ${(e.stderr || e.message || "").toString().trim().slice(0, 300)}`);
  }
}

/* ---------- source rows ----------
   Which USDA row each food came from. Identical in spirit to usda.mjs: foods
   arrived by two routes and a lookup that read only one would silently leave
   most of the table empty. */
async function sourceRows() {
  const map = JSON.parse(await readFile(MAP, "utf8"));
  const unreviewed = Object.entries(map).filter(([, m]) => !m.reviewed);
  if (unreviewed.length)
    throw new Error(`${unreviewed.length} mapping(s) not reviewed: ` +
      `${unreviewed.slice(0, 4).map(([k]) => k).join(", ")}${unreviewed.length > 4 ? "…" : ""}\n` +
      `  Check them in ${MAP} and set "reviewed": true.`);

  const spec = JSON.parse(await readFile(join(ROOT, "tools", "food-additions.json"), "utf8"));
  const rows = new Map();
  for (const f of [...(spec.requested || []), ...(spec.staples || [])])
    rows.set(slugify(f), f.fdc_id);
  for (const [slug, m] of Object.entries(map)) rows.set(slug, m.fdc_id);
  return rows;
}

/* ---------- the join ---------- */
/** For every food: its subclass sums, or null where the subclass is not fully
 *  measured. Returns the detail too, so `coverage` can explain a refusal. */
async function computeValues() {
  try { await access(join(CSV_DIR, "FLAV_DAT.csv")); }
  catch { throw new Error(`no extracted data at ${CSV_DIR}. Run 'flavonoids.mjs extract' first.`); }
  try { await access(join(SR_DIR, "sr_legacy_food.csv")); }
  catch { throw new Error(`no SR Legacy crosswalk at ${SR_DIR}. Run 'usda.mjs match' once to fetch it.`); }

  const data = JSON.parse(await readFile(DATA, "utf8"));
  const rows = await sourceRows();

  /* fdc_id -> NDB number. The flavonoid database zero-pads to five digits and
     SR Legacy does not, so pad before comparing or nothing joins. */
  const ndbOf = new Map((await readCSV(join(SR_DIR, "sr_legacy_food.csv")))
    .map(r => [r.fdc_id, String(r.NDB_number).padStart(5, "0")]));

  const defs = await readCSV(join(CSV_DIR, "NUTR_DEF.csv"));
  const nameOf = new Map(defs.map(d => [d.Nutr_No, d["Nutrient name"].trim()]));
  const classOf = new Map(defs.map(d => [d.Nutr_No, d.Flav_Class]));

  /* Every compound is checked against a definition, so a release that renames
     one fails loudly here rather than quietly dropping it from a sum. */
  for (const [key, s] of Object.entries(SUBCLASS)) {
    const have = new Set([...nameOf.entries()]
      .filter(([id]) => classOf.get(id) === s.class).map(([, n]) => n));
    const gone = s.require.filter(n => !have.has(n));
    if (gone.length) throw new Error(
      `${key}: compound(s) not in this release's NUTR_DEF: ${gone.join(", ")}\n` +
      `  The required list in SUBCLASS is out of step with the data.`);
  }

  /* Compound ids per subclass, split into the ones a food must have and the
     whole set that contributes to the sum. Resolved once, by name, so the
     hot loop below compares ids rather than strings. */
  const ids = {};
  for (const [key, s] of Object.entries(SUBCLASS)) {
    const inClass = defs.filter(d => d.Flav_Class === s.class).map(d => d.Nutr_No);
    ids[key] = { all: inClass, need: inClass.filter(id => s.require.includes(nameOf.get(id))) };
  }

  const perNdb = new Map();
  for (const r of await readCSV(join(CSV_DIR, "FLAV_DAT.csv"))) {
    if (r.Flav_Val === "" || r.Flav_Val == null) continue;
    if (r.Deriv_Cd === "Z") continue; // skip imputed zeroes
    const v = Number(r.Flav_Val);
    if (!Number.isFinite(v)) continue;
    const m = perNdb.get(r.NDB_No) || perNdb.set(r.NDB_No, new Map()).get(r.NDB_No);
    m.set(r.Nutr_No, v);
  }

  const descOf = new Map();

  return data.foods.map(f => {
    const fdc = rows.get(slugify(f));
    const ndb = fdc ? ndbOf.get(fdc) : undefined;
    const measured = ndb ? perNdb.get(ndb) : undefined;
    const out = { food: f, fdc, ndb, desc: ndb && descOf.get(ndb), values: {}, why: {} };
    for (const key of Object.keys(SUBCLASS)) {
      if (!measured) { out.values[key] = null; out.why[key] = ndb ? "food not in Release 3.3" : "no NDB number"; continue; }
      const missing = ids[key].need.filter(id => !measured.has(id));
      if (missing.length) {
        out.values[key] = null;
        out.why[key] = `not measured: ${missing.map(id => nameOf.get(id)).join(", ")}`;
        continue;
      }
      const sum = ids[key].all.reduce((s, id) => s + (measured.get(id) ?? 0), 0);
      out.values[key] = Math.round(sum * 100) / 100;
    }
    return out;
  });
}

/* ---------- coverage ---------- */
async function cmdCoverage() {
  const all = await computeValues();
  const N = all.length;
  const keys = Object.keys(SUBCLASS);

  console.log(`\n${all.filter(r => r.ndb && r.desc).length} of ${N} foods have a row in Release 3.3\n`);
  console.log("  subclass          measured   non-zero   richest");
  for (const k of keys) {
    const has = all.filter(r => r.values[k] !== null);
    const top = has.slice().sort((a, b) => b.values[k] - a.values[k])[0];
    console.log(`  ${SUBCLASS[k].col.label.padEnd(16)}  ${String(has.length).padStart(5)}/${N}` +
      `  ${String(has.filter(r => r.values[k] > 0).length).padStart(5)}/${N}   ` +
      `${top ? `${top.food.name} ${top.values[k]} mg` : "-"}`);
  }

  console.log("\n  richest foods per subclass");
  for (const k of keys) {
    const has = all.filter(r => r.values[k] > 0).sort((a, b) => b.values[k] - a.values[k]);
    console.log(`\n  ${SUBCLASS[k].col.label} (${has.length} above zero)`);
    for (const r of has.slice(0, 10))
      console.log(`    ${`${r.food.name} ${r.food.state || ""}`.trim().slice(0, 26).padEnd(26)} ${String(r.values[k]).padStart(7)}`);
  }

  /* A food that has a flavonoid row but is refused on a missing compound is the
     interesting case: it is the difference between this tool and one that sums
     whatever it finds. Worth printing every time, so the cost stays visible. */
  const refused = all.filter(r => r.desc && keys.some(k => r.values[k] === null && !/no NDB|not in Release/.test(r.why[k])));
  console.log(`\n  ${refused.length} foods are in Release 3.3 but withheld on at least one subclass:`);
  for (const r of refused)
    for (const k of keys)
      if (r.values[k] === null && !/no NDB|not in Release/.test(r.why[k]))
        console.log(`    ${`${r.food.name} ${r.food.state || ""}`.trim().slice(0, 24).padEnd(24)} ${SUBCLASS[k].col.label.padEnd(15)} ${r.why[k]}`);
  console.log();
}

/* ---------- pull ---------- */
async function cmdPull(args) {
  const dry = args.includes("--dry-run");
  const all = await computeValues();
  const data = JSON.parse(await readFile(DATA, "utf8"));

  /* Insert each column after its anchor, or at the end of its group if the
     anchor is not placed yet. Same shape as usda.mjs, since the columns chain:
     flavonols sits after flavan-3-ols, which sits after anthocyanidins. */
  let pending = Object.values(SUBCLASS).map(s => s.col).filter(def => {
    if (!data.nutrients.some(n => n.id === def.id)) return true;
    console.log(`  ${def.id}: already present, updating values`);
    return false;
  });
  while (pending.length) {
    const before = pending.length;
    pending = pending.filter(def => {
      let at = def.after ? data.nutrients.findIndex(n => n.id === def.after) : -1;
      if (def.after && at === -1) return true;
      if (at === -1) at = data.nutrients.map((n, i) => [n, i])
        .filter(([n]) => n.group === def.group).pop()[1];
      data.nutrients.splice(at + 1, 0, column(def));
      data.foods.forEach(f => f.v.splice(at + 1, 0, null));
      console.log(`  + column ${def.id} (${def.label}) at ${at + 1}`);
      return false;
    });
    if (pending.length === before)
      throw new Error(`could not place column(s): ${pending.map(d => d.id).join(", ")}`);
  }

  const IDX = new Map(data.nutrients.map((n, i) => [n.id, i]));
  const bySlug = new Map(all.map(r => [slugify(r.food), r]));
  let filled = 0, blank = 0;
  for (const f of data.foods) {
    const r = bySlug.get(slugify(f));
    for (const key of Object.keys(SUBCLASS)) {
      const v = r ? r.values[key] : null;
      f.v[IDX.get(key)] = v;
      if (v === null) blank++; else filled++;
    }
  }

  console.log(`\n${filled} values filled, ${blank} left as "no data"`);
  for (const key of Object.keys(SUBCLASS)) {
    const has = all.filter(r => r.values[key] !== null);
    console.log(`  ${SUBCLASS[key].col.label.padEnd(16)} ${String(has.length).padStart(3)}/${all.length}` +
      ` measured, ${has.filter(r => r.values[key] > 0).length} above zero`);
  }
  if (dry) { console.log("\n--dry-run: nothing written"); return; }
  await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
  console.log(`\nwrote ${DATA}, run 'npm run build && npm test' to verify`);
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === "extract") await cmdExtract();
  else if (cmd === "coverage") await cmdCoverage();
  else if (cmd === "pull") await cmdPull(rest);
  else { console.error("usage: flavonoids.mjs extract | coverage | pull [--dry-run]"); process.exit(1); }
} catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
