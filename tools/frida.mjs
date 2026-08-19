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

  const refuse = reason => ({ admitted: false, refused: reason, sources: ids });

  /* Both corn flakes molybdenum rows report a minimum of 20 against a maximum
     of 3. Whatever that is, it is not a range, and nothing here can tell which
     of the two numbers is wrong. */
  if (min !== null && max !== null && min > max) return refuse("malformed");

  /* A cell with no source id at all is one Frida carried over from a different
     food: the published workbook gives it a SourceFood instead. 146 biotin
     cells are of this kind, and the count matches the workbook exactly. Their
     determinations were made on the other food, so a large n is the most
     misleading thing about them. */
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
}

if (process.argv[1] && process.argv[1].endsWith("frida.mjs")) {
  if (process.argv[2] === "provenance") provenance();
  else { console.log("usage: node tools/frida.mjs provenance"); process.exit(1); }
}
