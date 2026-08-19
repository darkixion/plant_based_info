#!/usr/bin/env node
/**
 * The components Japan and Australia both carry, and neither reports the same
 * way.
 *
 * Molybdenum and oxalic acid were MEXT alone, on 102 and 40 cells, while
 * `page-map-afcd.json` had reached 72 foods since the biotin work and AFCD's
 * own columns for both sat unread. That is the same defect the USDA iodine
 * release turned out to have: a corpus in the repository, a reviewed map to it
 * already committed, and nothing joining the two.
 *
 * Both go through `nationalCell`, which iodine forced and which is the point
 * of putting it in reconcile.mjs: MEXT marks an absence in words and AFCD
 * writes the number 0, and a cell built from both has to know that a zero
 * corroborates a finding rather than replacing it.
 *
 * Chromium is deliberately not here. FSANZ says of its own chromium data that
 * "levels appear to be highly variable and values presented in this database
 * should be used with caution", which `sources.json` records as the one
 * exception to AFCD's quality, and a source that disclaims its own figures
 * cannot corroborate anyone else's.
 */
import { gradeDerivation, nationalCell } from "./reconcile.mjs";

/**
 * One entry per component both tables carry.
 *
 * Read by the generator and by `loadAttested` in build.mjs alike, so the pass
 * that writes a cell and the check that holds it to its source cannot disagree
 * about which AFCD column feeds which page column. They have disagreed before:
 * the generator once picked CoFID's parboiled brown rice where the map picked
 * wholegrain.
 *
 * `floor` is rule 7's, in the column's own unit. Molybdenum's is half a
 * microgram, the same reasoning as iodine's and against a column with the same
 * `dp: 0`. Oxalate's is a twentieth of a gram, which is the column's precision
 * alone rather than any assay's, `dp: 1` on a gram column being unable to show
 * less.
 *
 * `afcdLimit` is a different thing and only oxalate has one: the figure below
 * which AFCD's own column is not answering. **AFCD reports oxalic acid in
 * grams to one decimal place, and 205 of its 214 figures are 0.** A step of a
 * tenth of a gram cannot see an analyte usually quoted in tens of milligrams,
 * so a 0 there is the field's floor rather than the food's content, and the
 * database says so itself: **"Seed, sesame, unsalted" reads 0 and "Tahini,
 * sesame seed pulp" reads 0.6, both marked Analysed.** Tahini is ground sesame
 * seed and cannot contain six times the oxalate of what it is made of. The
 * derivation being per row rather than per component is how a row can be
 * Analysed while this component on it was not.
 *
 * So AFCD's oxalate zeros are refused as non-answers rather than admitted as
 * absences, uniformly and with the reason reported on every run. Its nine real
 * figures stand, and one of them is the disagreement RECONCILIATION.md's
 * status table has always named: raw spinach 0.3 against MEXT's 0.7.
 * Molybdenum needs no such limit, because its AFCD field carries 0.2, 0.7 and
 * 0.8 and can plainly see below the unit its column prints.
 */
export const PAIRED = [
  { id: "mo",      mextCorpus: "plant", mextField: "mo",     afcdField: "molybdenum_ug", floor: 0.5 },
  { id: "oxalate", mextCorpus: "acids", mextField: "oxalic", afcdField: "oxalic_acid_g", floor: 0.05,
    afcdLimit: 0.05 },
];

const num = v => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

/* MEXT prints an estimated figure in parentheses and keeps `value` null for
   anything that is not a plain number, so the figure comes back off `raw`.
   Molybdenum also prints an estimated trace, "(Tr)", which carries no digits
   and is a state rather than a figure either way. */
const figureOf = c =>
  typeof c.value === "number" ? c.value
  : (m => (m ? Number(m[0]) : null))(/-?\d+(\.\d+)?/.exec(String(c.raw ?? "")));

/**
 * One paired cell, from whichever of the two tables reach the food.
 *
 * @param {{ mext?: { state: string, value: number|null, raw?: string },
 *           afcd?: Record<string, string> & { derivation: string } }} rows
 * @param {{ afcdField: string, floor: number, afcdLimit?: number }} spec one
 *   entry of PAIRED
 * @returns {{ cell: object|null, refused: object|null }} the cell, or null
 *   where neither table says anything, and any AFCD figure turned away by
 *   `afcdLimit` so the generator can report it rather than dropping it in
 *   silence
 */
export function pairedCell(rows, spec) {
  const figures = [];
  const states = {};
  let refused = null;

  if (rows.mext) {
    const st = rows.mext.state;
    if (st === "measured" || st === "estimated") {
      const v = figureOf(rows.mext);
      if (v !== null) figures.push({ source: "mext-2020", value: v,
        derivation: st === "estimated" ? "estimated" : "analysed" });
    } else states["mext-2020"] = st;
  }

  /* AFCD's derivation is per row and not per component, so Analysed means the
     row was analysed rather than that this component was. Every cooked
     vegetable row is a Recipe and every raw one Analysed, which is close to a
     preparation flag, and gradeDerivation demoting the calculated ones is what
     keeps a recipe figure from contradicting an assay. */
  if (rows.afcd) {
    const v = num(rows.afcd[spec.afcdField]);
    if (v !== null && spec.afcdLimit !== undefined && v < spec.afcdLimit)
      refused = { source: "afcd-r3", value: v, limit: spec.afcdLimit };
    else if (v !== null) figures.push({ source: "afcd-r3", value: v,
      derivation: gradeDerivation(rows.afcd.derivation) });
  }

  return { cell: nationalCell(figures, states, spec.floor), refused };
}
