#!/usr/bin/env node
/**
 * Rebuild `frida-6.1.json` and `frida-6.1-sources.json` from the published
 * workbook.
 *
 * The earlier copy of `frida-6.1.json` was scraped from the old website, which
 * has since moved to fcdb.fooddata.dk. It lost two things the workbook carries
 * and the admission rule needs: `SourceFood`, which marks a value copied from a
 * different food, and the source table that says what each source id is. Both
 * are here now.
 *
 * The workbook is not committed, for the reason `.gitignore` gives: upstream
 * datasets are fetched rather than redistributed. Download it by hand from
 *
 *   https://doi.org/10.11583/DTU.32312844
 *
 * and put `FCDB_6.1_Dataset.xlsx` in `tools/cache/`. It is CC BY 4.0, so the
 * values derived from it may be republished with the credit recorded in
 * `sources.json` and FRIDA-PROVENANCE.md.
 */
import xlsx from "xlsx";
import fs from "fs";

const BOOK = "tools/cache/FCDB_6.1_Dataset.xlsx";

/* The twelve components this page reads, against their workbook names. Two of
   the fibre fractions carry a trailing space in the sheet, which is why these
   are matched on a trimmed name rather than written out verbatim. */
const COMPONENTS = new Map(Object.entries({
  "Biotin": "biotin_ug",
  "Chromium": "chromium_ug",
  "Molybdenum": "molybdenum_ug",
  "Iodine": "iodine_ug",
  "Boron": "boron_ug",
  "Raffinose": "raffinose_g",
  "Citric acid": "citric_acid_g",
  "Oxalic acid": "oxalic_acid_g",
  "Sum organic acids": "organic_acids_g",
  "Insoluble dietary fibers": "insoluble_fibre_g",
  "High molecular weight soluble dietary fibre": "soluble_fibre_hmw_g",
  "Low molecular weight soluble dietary fibre": "soluble_fibre_lmw_g",
}));

/* The sheet writes an absent cell as the literal string NULL. It is kept as
   written rather than dropped, because the shape of this file is already
   depended on and `fridaCell` is the one place that decides what NULL means. */
const cell = v => (v === undefined || v === null || v === "") ? "NULL" : String(v).trim();

if (!fs.existsSync(BOOK)) {
  console.error(`${BOOK} not found. See the comment at the top of this file.`);
  process.exit(1);
}

const wb = xlsx.readFile(BOOK);

/* ------------------------------------------------------------ the values --- */

const rows = xlsx.utils.sheet_to_json(wb.Sheets["Data_Normalised"], { defval: "" });
const foods = new Map();

for (const row of rows) {
  const key = COMPONENTS.get(String(row.ParameterName ?? "").trim());
  if (!key) continue;

  const id = String(row.FoodID ?? "").trim();
  if (!id) continue;

  if (!foods.has(id))
    foods.set(id, { FoodID: id, name: String(row.FoodName ?? "").trim() });

  foods.get(id)[key] = {
    val: cell(row.ResVal),
    min: cell(row.Min),
    max: cell(row.Max),
    median: cell(row.Median),
    n: cell(row.NumberOfDeterminations),
    source: cell(row.Source),
    /* The column the scrape lost. A value carrying one of these was copied
       from the food it names, and its determinations were made on that food. */
    sourceFood: cell(row.SourceFood),
  };
}

/* FoodID is a number in the sheet and a string here, and page-map-frida.json
   already keys on the string. Sorted numerically so the file is stable. */
const out = [...foods.values()].sort((a, b) => Number(a.FoodID) - Number(b.FoodID));
fs.writeFileSync("tools/evidence/frida-6.1.json", JSON.stringify(out, null, 1) + "\n");

/* ----------------------------------------------------------- the sources --- */

const sources = {};
for (const row of xlsx.utils.sheet_to_json(wb.Sheets["Source"], { defval: "" })) {
  const id = String(row.SourceID ?? "").trim();
  if (!id) continue;
  const rec = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "SourceID") continue;
    const s = String(v ?? "").trim();
    if (s && s !== "NULL") rec[k] = s;
  }
  sources[id] = rec;
}
fs.writeFileSync("tools/evidence/frida-6.1-sources.json", JSON.stringify(sources, null, 1) + "\n");

console.log(`frida-6.1.json: ${out.length} foods`);
console.log(`frida-6.1-sources.json: ${Object.keys(sources).length} sources`);
