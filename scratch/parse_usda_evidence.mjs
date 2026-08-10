import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readCSV } from "../tools/csv.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EV_DIR = join(ROOT, "tools", "evidence");
const CACHE_DIR = join(ROOT, "tools", "cache");
const MAP_FILE = join(ROOT, "src", "data", "usda-map.json");
const SPEC_FILE = join(ROOT, "tools", "food-additions.json");
const SR_FILE = join(CACHE_DIR, "FoodData_Central_sr_legacy_food_csv_2018-04", "sr_legacy_food.csv");

const slugify = (name, state) => `${name} ${state || ""}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function getPageSlugMap() {
  const map = JSON.parse(await readFile(MAP_FILE, "utf8"));
  const spec = JSON.parse(await readFile(SPEC_FILE, "utf8"));
  const srRows = await readCSV(SR_FILE);
  const ndbOfFdc = new Map(srRows.map(r => [String(r.fdc_id), String(r.NDB_number).padStart(5, "0")]));

  const slugToNdb = new Map();
  for (const f of [...(spec.requested || []), ...(spec.staples || [])]) {
    if (f.fdc_id && ndbOfFdc.has(String(f.fdc_id))) {
      slugToNdb.set(slugify(f.name, f.state), ndbOfFdc.get(String(f.fdc_id)));
    }
  }
  for (const [slug, m] of Object.entries(map)) {
    if (m.fdc_id && ndbOfFdc.has(String(m.fdc_id))) {
      slugToNdb.set(slug, ndbOfFdc.get(String(m.fdc_id)));
    }
  }

  const ndbToSlugs = new Map();
  for (const [slug, ndb] of slugToNdb.entries()) {
    if (!ndbToSlugs.has(ndb)) ndbToSlugs.set(ndb, []);
    ndbToSlugs.get(ndb).push(slug);
  }
  return ndbToSlugs;
}

async function parseFlavonoids() {
  const dir = join(CACHE_DIR, "flav_r33");
  const foodDes = await readCSV(join(dir, "FOOD_DES.csv"));
  const fdGroup = await readCSV(join(dir, "FD_GROUP.csv"));
  const nutrDef = await readCSV(join(dir, "NUTR_DEF.csv"));
  const flavDat = await readCSV(join(dir, "FLAV_DAT.csv"));
  const ndbToSlugs = await getPageSlugMap();

  const groupMap = new Map(fdGroup.map(g => [g.FdGrp_CD, g.FdGrp_Desc]));
  const nutrMap = new Map(nutrDef.map(n => [n.Nutr_no, n]));

  const SUBCLASSES = {
    anthocyanidins: { name: "Anthocyanidins", require: ["731", "740", "741", "742", "743", "745"], all: ["731", "740", "741", "742", "743", "745"] },
    flavan3ols: { name: "Flavan-3-ols", require: ["749", "750", "751", "752", "753"], all: ["749", "750", "751", "752", "753", "755", "756", "791", "792", "793", "794"] },
    flavonols: { name: "Flavonols", require: ["786", "788", "789"], all: ["785", "786", "788", "789"] },
    flavanones: { name: "Flavanones", require: ["758", "759", "762"], all: ["758", "759", "762"] },
    flavones: { name: "Flavones", require: ["770", "773"], all: ["770", "773"] }
  };

  const datByNdb = new Map();
  for (const r of flavDat) {
    const ndb = String(r.NDB_No).padStart(5, "0");
    if (!datByNdb.has(ndb)) datByNdb.set(ndb, []);
    datByNdb.get(ndb).push(r);
  }

  const out = [];
  for (const f of foodDes) {
    const ndb = String(f.NDB_No).padStart(5, "0");
    const rows = datByNdb.get(ndb) || [];
    const compMap = new Map();
    for (const r of rows) {
      const def = nutrMap.get(r.Nutr_no);
      const val = parseFloat(r.Flav_Val);
      compMap.set(r.Nutr_no, {
        nutr_no: r.Nutr_no,
        name: def ? def["Nutrient name"].trim() : "",
        class: def ? def.Flav_Class.trim() : "",
        unit: def ? def.Unit.trim() : "mg",
        val: Number.isFinite(val) ? val : null,
        n: r.n ? parseInt(r.n, 10) : null,
        min: r.Min !== "" ? parseFloat(r.Min) : null,
        max: r.Max !== "" ? parseFloat(r.Max) : null,
        se: r.SE !== "" ? parseFloat(r.SE) : null,
        cc: r.CC || null
      });
    }

    const subclasses = {};
    for (const [subKey, subDef] of Object.entries(SUBCLASSES)) {
      const hasRequire = subDef.require.every(id => compMap.has(id) && compMap.get(id).val !== null);
      let sum = 0;
      let count = 0;
      for (const id of subDef.all) {
        if (compMap.has(id) && compMap.get(id).val !== null) {
          sum += compMap.get(id).val;
          count++;
        }
      }
      subclasses[subKey] = {
        name: subDef.name,
        complete: hasRequire,
        sum_mg: hasRequire ? Math.round(sum * 100) / 100 : null,
        measured_count: count
      };
    }

    out.push({
      ndb,
      group_code: f.FdGrp_Cd,
      group: groupMap.get(f.FdGrp_Cd) || "",
      desc: f.Long_Desc,
      sciname: f.SciName || "",
      page_slugs: ndbToSlugs.get(ndb) || [],
      subclasses,
      compounds: Object.fromEntries(compMap)
    });
  }

  await writeFile(join(EV_DIR, "usda-flavonoids.json"), JSON.stringify(out, null, 1) + "\n");
  console.log(`Wrote ${out.length} entries to usda-flavonoids.json`);
}

async function parseProanthocyanidins() {
  const dir = join(CACHE_DIR, "pa_r02");
  const foodDes = await readCSV(join(dir, "FOOD_DES.csv"));
  const fdGroup = await readCSV(join(dir, "FD_GROUP.csv"));
  const nutrDef = await readCSV(join(dir, "NUTR_DEF.csv"));
  const paDat = await readCSV(join(dir, "PA_DAT.csv"));
  const ndbToSlugs = await getPageSlugMap();

  const groupMap = new Map(fdGroup.map(g => [g.FdGrp_CD, g.FdGrp_Desc]));
  const nutrMap = new Map(nutrDef.map(n => [n.Nutr_No, n]));

  const REQUIRED_IDS = ["734", "735", "736", "737", "738"];

  const datByNdb = new Map();
  for (const r of paDat) {
    const ndb = String(r["NDB No"]).padStart(5, "0");
    if (!datByNdb.has(ndb)) datByNdb.set(ndb, []);
    datByNdb.get(ndb).push(r);
  }

  const out = [];
  for (const f of foodDes) {
    const ndbKey = f["NDB No"] || f.NDB_No;
    const ndb = String(ndbKey).padStart(5, "0");
    const rows = datByNdb.get(ndb) || [];
    const compMap = new Map();
    for (const r of rows) {
      const def = nutrMap.get(r.Nutr_No);
      const val = parseFloat(r.Flav_Val);
      compMap.set(r.Nutr_No, {
        nutr_no: r.Nutr_No,
        name: def ? def.NutrDesc.trim() : "",
        tagname: def ? def.Tagname.trim() : "",
        unit: def ? def.Units.trim() : "mg",
        val: Number.isFinite(val) ? val : null,
        n: r.N !== "" ? parseFloat(r.N) : null,
        min: r.Min !== "" ? parseFloat(r.Min) : null,
        max: r.Max !== "" ? parseFloat(r.Max) : null,
        sd: r.SD !== "" ? parseFloat(r.SD) : null,
        cc: r.CC || null
      });
    }

    const hasRequire = REQUIRED_IDS.every(id => compMap.has(id) && compMap.get(id).val !== null);
    let sum = 0, count = 0;
    for (const id of REQUIRED_IDS) {
      if (compMap.has(id) && compMap.get(id).val !== null) {
        sum += compMap.get(id).val;
        count++;
      }
    }

    out.push({
      ndb,
      group_code: f.FdGrp_Cd,
      group: groupMap.get(f.FdGrp_Cd) || "",
      desc: f.Long_Desc,
      sciname: f.SciName || "",
      page_slugs: ndbToSlugs.get(ndb) || [],
      subclasses: {
        proanthocyanidins: {
          name: "Proanthocyanidins",
          complete: hasRequire,
          sum_mg: hasRequire ? Math.round(sum * 100) / 100 : null,
          measured_count: count
        }
      },
      compounds: Object.fromEntries(compMap)
    });
  }

  await writeFile(join(EV_DIR, "usda-proanthocyanidins.json"), JSON.stringify(out, null, 1) + "\n");
  console.log(`Wrote ${out.length} entries to usda-proanthocyanidins.json`);
}

async function main() {
  await parseFlavonoids();
  await parseProanthocyanidins();
}

main().catch(console.error);
