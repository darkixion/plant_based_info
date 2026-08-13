#!/usr/bin/env node
/**
 * Extracts the oligosaccharide columns from the two FAO/INFOODS workbooks into
 * tools/evidence/fao-oligosaccharides.json.
 *
 * Worth having because verbascose carries its own INFOODS tag here (VERS)
 * rather than being folded into a total. Every other source in this directory
 * either lumps the raffinose family into one figure or omits verbascose
 * entirely, which is why the column existed on the page with nothing in it.
 *
 * Raffinose and stachyose come along in the same pass: they are the other two
 * members of the family, they are measured by the same assay in the same rows,
 * and taking one without the others would leave the page unable to say whether
 * a verbascose figure is a large or a small part of what the food carries.
 *
 * Both workbooks are research compilations, not national tables. A row is one
 * cultivar of one species from one study, so the food name, the species, the
 * processing code and the bibliography id are all kept: choosing between rows
 * needs every one of them, and `page-map-fao-oligos.json` records the choice.
 *
 * The two workbooks live in tools/cache, which is not committed. Fetch them
 * with:
 *   curl -L -o tools/cache/BioFoodComp4.0.xlsx \
 *     https://www.fao.org/fileadmin/templates/food_composition/documents/BioFoodComp4.0.xlsx
 *   curl -L -o tools/cache/AnFooD2.0.xlsx \
 *     https://www.fao.org/fileadmin/templates/food_composition/documents/AnFooD2.0.xlsx
 *
 * Run: node tools/extract_fao_oligos.mjs [dir-holding-the-xlsx]
 */
import xlsx from "xlsx";
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = process.argv[2] || join(ROOT, "tools", "cache");
const OUT = join(ROOT, "tools", "evidence", "fao-oligosaccharides.json");

/* Sheet 07 through 10 are meat, eggs, fish and milk. Named by exclusion rather
   than by listing what to keep, because the two workbooks disagree about the
   spelling of several plant sheets ("10_Milk" against "10 Milk"). */
const ANIMAL = /^(07|08|09|10)/;

/* The INFOODS tags this pass wants, and the page column each becomes. The tag
   is the whole reason for preferring these workbooks: a column headed VERS(g)
   is verbascose by definition, with no inference from a food name or a total. */
const TAGS = {
  "RAFS": "raffinose",
  "STAS": "stachyose",
  "VERS": "verbascose",
};

/* INFOODS writes an unmeasured cell as a blank and an analysed absence as "nd",
   and those are different findings. "tr" is a trace. Anything else numeric is a
   figure; anything else at all is left for a human, because a value this pass
   cannot read is not a value it may quietly drop. */
function reading(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s || s === "-") return null;
  if (/^nd$/i.test(s)) return { state: "not-detected", raw: s };
  if (/^tr$/i.test(s)) return { state: "trace", raw: s };
  // A bracketed figure is INFOODS' own marker for a calculated value, the same
  // convention MEXT uses and the same state it maps to.
  const bracketed = /^\[\s*([\d.]+)\s*\]$/.exec(s);
  if (bracketed) return { state: "estimated", value: Number(bracketed[1]), raw: s };
  const n = Number(s);
  if (Number.isFinite(n)) return { state: "measured", value: n, raw: s };
  return { state: "unreadable", raw: s };
}

const rows = [];
let unreadable = 0;
for (const file of ["BioFoodComp4.0.xlsx", "AnFooD2.0.xlsx"]) {
  const path = join(SRC, file);
  if (!existsSync(path)) throw new Error(`missing workbook: ${path}`);
  const wb = xlsx.readFile(path);
  const release = file.replace(/\.xlsx$/, "");

  for (const sheet of wb.SheetNames) {
    if (!/^\d\d/.test(sheet) || ANIMAL.test(sheet)) continue;
    const grid = xlsx.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 });
    const head = grid[0] || [];
    const at = label => head.findIndex(c => String(c).trim() === label);
    const col = {};
    for (const tag of Object.keys(TAGS)) col[tag] = head.findIndex(c => new RegExp(`^${tag}\\(`).test(String(c)));
    if (Object.values(col).every(i => i < 0)) continue;

    const iName = at("Foodname in English"), iId = at("Food Item ID");
    /* Water is the check on preparation, and the only one that does not depend
       on reading a food name correctly. Both workbooks report per 100 g on a
       fresh weight basis, so a row calling itself cooked while carrying 2 g of
       water is a freeze-dried product and belongs nowhere near a cooked row on
       the page. The map is justified against this rather than against prose. */
    const iWater = head.findIndex(c => /^WATER\(/.test(String(c)));
    const iProc = at("Processing"), iSpecies = at("Species/Subspecies");
    const iCountry = at("Country, region"), iBib = at("Biblioid"), iN = at("n");

    /* Row 1 is a second header carrying each column's plain-English name, so
       data starts at row 2. Detected rather than assumed: a row whose id does
       not look like an id is still a header, and one slipped through as a food
       called "verbascose" the first time this was run by hand. */
    for (let r = 1; r < grid.length; r++) {
      const g = grid[r] || [];
      const id = String(g[iId] ?? "").trim();
      if (!/^\d{5,}$/.test(id)) continue;
      const out = {};
      let any = false;
      for (const [tag, component] of Object.entries(TAGS)) {
        if (col[tag] < 0) continue;
        const read = reading(g[col[tag]]);
        if (!read) continue;
        if (read.state === "unreadable") { unreadable++; continue; }
        out[component] = read;
        any = true;
      }
      if (!any) continue;
      rows.push({
        release, sheet, id,
        name: String(g[iName] ?? "").trim(),
        processing: String(g[iProc] ?? "").trim(),
        species: String(g[iSpecies] ?? "").trim(),
        country: String(g[iCountry] ?? "").trim(),
        biblioid: String(g[iBib] ?? "").trim(),
        n: Number.isFinite(Number(g[iN])) ? Number(g[iN]) : null,
        water: Number.isFinite(Number(g[iWater])) ? Number(g[iWater]) : null,
        ...out,
      });
    }
  }
}

writeFileSync(OUT, JSON.stringify(rows, null, 1) + "\n");
const count = c => rows.filter(r => r[c]).length;
console.log(`${rows.length} rows: ${count("raffinose")} raffinose, ` +
            `${count("stachyose")} stachyose, ${count("verbascose")} verbascose` +
            (unreadable ? `, ${unreadable} cells left unread` : ""));
