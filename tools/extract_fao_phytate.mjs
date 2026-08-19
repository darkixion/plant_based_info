#!/usr/bin/env node
/**
 * Rebuild `fao-phytate.json` and `fao-phytate-sources.json` from the published
 * workbook.
 *
 * The earlier copy, extracted in `scratch/extract_fao_phytate_v2.mjs`, kept the
 * food name, the processing code, the species and the figure, and dropped every
 * column that says where the figure came from: `Country, region`, `n`,
 * `Biblioid`, and the 324-entry Bibliography sheet the ids resolve against.
 *
 * That mattered. PhyFoodComp is a compilation, and 291 of its 2,442 plant rows
 * are the Indian Food Composition Tables copied in whole. IFCT is already cited
 * directly by this page, so a cell reading "fao-phytate" over one of those rows
 * puts one table on the page twice under two names. The provenance question
 * FRIDA-PROVENANCE.md exists to ask had never been asked here. See
 * FAO-PROVENANCE.md.
 *
 * Row order is unchanged from the earlier extraction, so the row indices in
 * `page-map-fao-phytate.json` still point at the same foods. Any change to the
 * filtering below breaks that, and the maps would have to be rebuilt with it.
 *
 * The workbook is not committed, for the reason `.gitignore` gives: upstream
 * datasets are fetched rather than redistributed. Download PhyFoodComp 1.0 from
 * FAO/INFOODS and put `fao_phytate.xlsx` in `tools/cache/`. Its terms are
 * non-commercial, recorded in LICENCES.md.
 */
import xlsx from "xlsx";
import fs from "node:fs";

const BOOK = "tools/cache/fao_phytate.xlsx";
const OUT = "tools/evidence/fao-phytate.json";
const SOURCES = "tools/evidence/fao-phytate-sources.json";

/* The plant sheets. Meat, fish, milk, insects and the rest of the workbook are
   not read. */
const PLANT = s => /^0[1-6]/.test(s) || /^15 /.test(s);

/* Phytate is reported in several ways and the workbook holds a column for each.
   Direct determinations first, most specific to least; the phytate phosphorus
   columns last, converted at the factor the release itself documents. This
   order is the earlier extraction's and is kept so the rows do not move. */
const COLUMNS = [
  { header: "PHYTCPPD(mg)", kind: "direct" },
  { header: "PHYTCPP(mg)",  kind: "direct" },
  { header: "PHYTCPPI(mg)", kind: "direct" },
  { header: "PHYTCA (mg)",  kind: "direct" },
  { header: "PHYTC-(mg)",   kind: "direct" },
  { header: "PPI(mg)",      kind: "phosphorus" },
  { header: "PPD(mg)",      kind: "phosphorus" },
  { header: "PP-(mg)",      kind: "phosphorus" },
];
const PHYTIC_ACID_PER_PHOSPHORUS = 3.55;

const round2 = x => Math.round(x * 100) / 100;
const text = v => (v === undefined || v === null ? "" : String(v).trim());

const wb = xlsx.readFile(BOOK);

/* The bibliography, which is what makes a row's origin answerable. Ids are the
   `Biblioid` column's values; the citation sits in the third column, with the
   second left empty in the published sheet. */
const sources = {};
for (const row of xlsx.utils.sheet_to_json(wb.Sheets["Bibliography"], { header: 1 })) {
  if (!row || !row[0]) continue;
  const id = text(row[0]);
  if (!id || id === "Reference ID") continue;
  const citation = text(row[2]) || text(row[1]);
  if (citation) sources[id] = citation;
}

const rows = [];
for (const sheet of wb.SheetNames.filter(PLANT)) {
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 });
  if (data.length < 3) continue;
  const headers = data[0].map(text);
  const at = name => headers.indexOf(name);
  const idx = {
    food: at("Food name in English"), processing: at("Processing / Influencing factors"),
    species: at("Species/Subspecies"), country: at("Country, region"),
    n: at("n"), biblioid: at("Biblioid"), year: at("Publication year"),
  };
  const cols = COLUMNS.map(c => ({ ...c, i: at(c.header) })).filter(c => c.i >= 0);

  /* Row 0 is the headers and row 1 the descriptions, so the data starts at 2. */
  for (let r = 2; r < data.length; r++) {
    const row = data[r];
    if (!row || !row[idx.food]) continue;
    const food = text(row[idx.food]);
    if (!food) continue;

    let phytate = null, method = null;
    for (const col of cols) {
      const raw = row[col.i];
      if (raw === undefined || raw === null || raw === "" || raw === "Tr" || raw === "-") continue;
      const n = parseFloat(String(raw));
      if (Number.isNaN(n) || n < 0) continue;
      phytate = col.kind === "direct" ? round2(n) : round2(n * PHYTIC_ACID_PER_PHOSPHORUS);
      method = col.kind === "direct" ? col.header : `${col.header} (converted)`;
      break;
    }
    if (phytate === null || !(phytate > 0)) continue;

    const determinations = parseInt(text(row[idx.n]), 10);
    rows.push({
      food,
      processing: text(row[idx.processing]),
      species: text(row[idx.species]),
      group: sheet,
      phytate_mg_100g: phytate,
      method,
      country: text(row[idx.country]),
      n: Number.isNaN(determinations) ? null : determinations,
      biblioid: text(row[idx.biblioid]),
      year: text(row[idx.year]),
    });
  }
}

fs.writeFileSync(OUT, JSON.stringify(rows, null, 2) + "\n");
fs.writeFileSync(SOURCES, JSON.stringify({
  source: "fao-phytate",
  note: "The Bibliography sheet of FAO/INFOODS PhyFoodComp 1.0, which is what makes each row's origin answerable. Ids are the Biblioid column of the food sheets.",
  citations: sources,
}, null, 1) + "\n");

const byTable = {};
for (const r of rows) if (!/^ph\d+$/i.test(r.biblioid)) byTable[r.biblioid] = (byTable[r.biblioid] || 0) + 1;
console.log(`${rows.length} plant rows, ${Object.keys(sources).length} bibliography entries`);
console.log(`rows citing IFCT: ${byTable.IFCT || 0}`);
