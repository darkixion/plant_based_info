/**
 * FAO/INFOODS PhyFoodComp 1.0, phytate: the provenance rule and the cell rule.
 *
 * Two properties of this release decide everything here.
 *
 * It samples cultivars and treatments, not foods. "Cashew nut, raw" is three
 * rows spanning 290 to 929 mg and no single one of them is the cashew, so a
 * food is mapped to a list of rows and the cell is the span of what they found.
 *
 * And it is a compilation. 2,075 of its 2,442 plant rows are primary papers,
 * each with a country and a sample count, which is analytical work this page
 * may cite. The other 367 are national food composition tables copied in whole,
 * and 291 of those are IFCT 2017. This page already cites IFCT directly, so a
 * cell reading "fao-phytate" over one of those rows puts one table on the page
 * twice under two names. IFCT gives Brussels sprouts 18.32 and so does FAO row
 * 1871, because row 1871 is IFCT.
 *
 * That question, whether a source measured a thing or copied it from a table
 * already here, is the one FRIDA-PROVENANCE.md exists to ask, and it had never
 * been asked of this release. The answer is FAO-PROVENANCE.md.
 *
 * The pairing itself is not a rule and is not here. It is banked by a human in
 * page-map-fao-phytate.json with a grade and a note, and the review that banked
 * it is FAO-PHYTATE-MAP-REVIEW.md.
 *
 * Licence: the release is © FAO and CHRCO and permits non-commercial use only.
 * See LICENCES.md.
 */
import { spanCell } from "./reconcile.mjs";

const SOURCE = "fao-phytate";

/**
 * Bibliography ids that are a whole food composition table this page already
 * cites under its own name, against the source key it is cited as.
 *
 * Only IFCT is here. The release also carries the Gambian, Bangladeshi and
 * Kenyan tables, 76 rows between them, and those are foreign tables this page
 * draws nothing else from, so admitting one is not counting anything twice.
 * FAO-PROVENANCE.md records that line and what it costs.
 */
const ALREADY_CITED = new Map([["IFCT", "ifct-2017"]]);

/**
 * Every bibliography id in this release that is a whole food composition table
 * rather than a paper, found by reading the 324 citations rather than by
 * pattern: several primary papers are titled "Nutritional composition of ...",
 * and a regular expression cannot tell those from a national table.
 *
 * Only IFCT is refused, because only IFCT is a table this page cites in its own
 * right. The other three are foreign tables this page draws nothing else from,
 * so admitting a row from one counts nothing twice. FAO-PROVENANCE.md records
 * what that line costs and what the stricter one would have cost.
 */
export const COMPOSITION_TABLES = {
  IFCT: "Indian Food Composition Tables, 2017",
  "1G": "Paul and McCrae (1996), Foods of Rural Gambia, MRC Dunn Nutrition Centre",
  BFCT: "Shaheen et al (2013), Food Composition Table for Bangladesh",
  KEN93: "Sehmi (1993), National Food Composition Tables, Kenya",
};

/** Whether a row is the release's own compilation of analytical work, rather
 *  than a table this page holds by another name. */
export function faoAdmits(row) {
  return !ALREADY_CITED.has(String(row?.biblioid ?? "").trim());
}

/**
 * The cell a banked mapping produces, with the rows that were refused.
 *
 * `disputed` rows are recorded beside the cell rather than spanned by it. The
 * case is avocado: row 1987 gives 356 against 11 from the row beside it, 32x
 * apart, and rule 4 already treats a figure that far out as an error rather
 * than the breadth of the evidence. Spanning it would print 11 to 356 as
 * though a reviewer believed both.
 */
export function faoPhytateCell(entry, rows) {
  const refused = [];
  const figures = i => {
    const row = rows[i];
    const v = row?.phytate_mg_100g;
    if (typeof v !== "number") return null;
    if (!faoAdmits(row)) {
      refused.push({ row: i, biblioid: String(row.biblioid).trim(),
                     source: ALREADY_CITED.get(String(row.biblioid).trim()), value: v });
      return null;
    }
    return v;
  };
  const admitted = (entry.rows ?? []).map(figures).filter(v => v !== null);
  if (!admitted.length) return { cell: null, refused };

  const cell = spanCell(admitted, [SOURCE]);
  const disputed = (entry.disputed ?? []).map(figures).filter(v => v !== null);
  if (disputed.length) cell.disputed = disputed.map(value => ({ source: SOURCE, value }));
  return { cell, refused };
}

/* `node tools/fao_phytate.mjs provenance` reproduces every count in
   FAO-PROVENANCE.md from the two committed files, with no network and without
   the workbook. Guarded on being the process entry point, the same way
   build.mjs and tools/usda.mjs are: importing this file, which the tests and
   the generator both do, must not execute a command. */
if (process.argv[1] === (await import("node:url")).fileURLToPath(import.meta.url)) {
  const { readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const EV = join(dirname(dirname(fileURLToPath(import.meta.url))), "tools", "evidence");
  const rd = f => JSON.parse(readFileSync(join(EV, f), "utf8"));

  if (process.argv[2] !== "provenance") {
    console.log("usage: node tools/fao_phytate.mjs provenance");
    process.exit(1);
  }
  const rows = rd("fao-phytate.json");
  const { citations } = rd("fao-phytate-sources.json");
  const map = rd("page-map-fao-phytate.json");

  const byId = {};
  for (const r of rows) byId[r.biblioid] = (byId[r.biblioid] || 0) + 1;
  const tables = Object.keys(COMPOSITION_TABLES)
    .map(id => [id, byId[id] || 0]).sort((a, b) => b[1] - a[1]);
  const compiled = tables.reduce((t, [, n]) => t + n, 0);

  console.log(`${rows.length} plant rows, ${Object.keys(citations).length} bibliography entries`);
  console.log(`${rows.length - compiled} rows cite a primary paper; ${compiled} cite a food composition table:`);
  for (const [id, n] of tables) {
    const refused = ALREADY_CITED.has(id) ? `refused, this page cites it as ${ALREADY_CITED.get(id)}` : "admitted";
    console.log(`  ${String(n).padStart(4)}  ${id.padEnd(6)} ${COMPOSITION_TABLES[id]}`);
    console.log(`        ${refused}`);
  }

  const refused = [];
  for (const m of map) {
    const { refused: r } = faoPhytateCell(m, rows);
    for (const x of r) refused.push(`${m.page} row ${x.row}`);
  }
  console.log(`\n${map.length} banked pairings, ${refused.length} naming a refused row` +
              (refused.length ? `: ${refused.join(", ")}` : ""));
  const admitted = rows.filter(faoAdmits).length;
  console.log(`${rows.length - admitted} rows the admission rule refuses outright, all of them IFCT`);
}
