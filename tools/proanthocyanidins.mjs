#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCSV } from "./csv.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CACHE = join(ROOT, "tools", "cache");
const CSV_DIR = join(CACHE, "pa_r02");
const SR_DIR = join(CACHE, "FoodData_Central_sr_legacy_food_csv_2018-04");
const DATA = join(ROOT, "src", "data", "nutrients.json");
const MAP = join(ROOT, "src", "data", "usda-map.json");

const SUBCLASS = {
  proanthocyanidins: {
    class: "Proanthocyanidins",
    require: ["Proanthocyanidin dimers", "Proanthocyanidin trimers", "Proanthocyanidin 4-6mers", "Proanthocyanidin 7-10mers", "Proanthocyanidin polymers (>10mers)"],
    col: {
      id: "proanthocyanidins", label: "Proantho-\ncyanidins", group: "plant",
      unit: "mg", dv: null, dp: 1, after: "isoflavones",
      why: "Condensed tannins. Found in berries, nuts, and legumes, they are powerful antioxidants.",
    }
  }
};

const column = ({ after, ...col }) => col;
const slugify = f => `${f.name} ${f.state || ""}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function sourceRows() {
  const map = JSON.parse(await readFile(MAP, "utf8"));
  const spec = JSON.parse(await readFile(join(ROOT, "tools", "food-additions.json"), "utf8"));
  const rows = new Map();
  for (const f of [...(spec.requested || []), ...(spec.staples || [])]) rows.set(slugify(f), f.fdc_id);
  for (const [slug, m] of Object.entries(map)) rows.set(slug, m.fdc_id);
  return rows;
}

async function computeValues() {
  const data = JSON.parse(await readFile(DATA, "utf8"));
  const rows = await sourceRows();
  
  const srLegacyRows = await readCSV(join(SR_DIR, "sr_legacy_food.csv"));
  const ndbOf = new Map(srLegacyRows.map(r => [r.fdc_id, String(r.NDB_number).padStart(5, "0")]));

  const defs = await readCSV(join(CSV_DIR, "NUTR_DEF.csv"));
  const nameOf = new Map(defs.map(d => [d.Nutr_No, d.NutrDesc.trim()]));
  
  const ids = { proanthocyanidins: { all: [], need: [] } };
  for (const d of defs) {
    const id = d.Nutr_No;
    const name = nameOf.get(id);
    if (SUBCLASS.proanthocyanidins.require.includes(name)) {
      ids.proanthocyanidins.all.push(id);
      ids.proanthocyanidins.need.push(id);
    }
  }

  const perNdb = new Map();
  for (const r of await readCSV(join(CSV_DIR, "PA_DAT.csv"))) {
    if (r.Flav_Val === "" || r.Flav_Val == null) continue;
    const v = Number(r.Flav_Val);
    if (!Number.isFinite(v)) continue;
    const m = perNdb.get(r["NDB No"]) || perNdb.set(r["NDB No"], new Map()).get(r["NDB No"]);
    m.set(r.Nutr_No, v);
  }

  const descOf = new Map((await readCSV(join(CSV_DIR, "FOOD_DES.csv"))).map(r => [r.NDB_No, r.Long_Desc]));

  return data.foods.map(f => {
    const fdc = rows.get(slugify(f));
    const ndb = fdc ? ndbOf.get(fdc) : undefined;
    const measured = ndb ? perNdb.get(ndb) : undefined;
    const out = { food: f, fdc, ndb, desc: ndb && descOf.get(ndb), values: {}, why: {} };
    for (const key of Object.keys(SUBCLASS)) {
      if (!measured) { out.values[key] = null; out.why[key] = ndb ? "food not in Release 2" : "no NDB number"; continue; }
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

async function cmdPull() {
  const all = await computeValues();
  const data = JSON.parse(await readFile(DATA, "utf8"));

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
      if (at === -1) at = data.nutrients.map((n, i) => [n, i]).filter(([n]) => n.group === def.group).pop()[1];
      data.nutrients.splice(at + 1, 0, column(def));
      data.foods.forEach(f => f.v.splice(at + 1, 0, null));
      console.log(`  + column ${def.id} (${def.label}) at ${at + 1}`);
      return false;
    });
    if (pending.length === before) throw new Error(`could not place column(s)`);
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
  await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
  console.log(`\nwrote ${DATA}`);
}

await cmdPull();
