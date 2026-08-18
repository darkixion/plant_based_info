#!/usr/bin/env node
/**
 * Biotin, the only component here that three databases measure and none of
 * them agree about.
 *
 * RECONCILIATION.md rule 5 is the reason this has a file of its own: biotin
 * spreads up to 29x on analysed figures, because it occurs largely
 * protein-bound and a figure depends on whether the assay hydrolysed it free.
 * It is the best genuine three-source range the page carries.
 *
 * The cell builder is here rather than in tools/evidence.mjs because that file
 * runs its loops at import, so nothing inside it can be tested.
 */
import { gradeDerivation, reconcile } from "./reconcile.mjs";

/* CoFID's two markers. N is a component it did not measure. Tr is a trace,
   which is a finding: something was there, below the point where the assay
   would put a number on it. Tr used to reach parseFloat, become NaN and then
   nothing at all, which threw the finding away on 63 rows. */
const num = v => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

/* A state that carries meaning without carrying a figure. Never collapse
   these: which kind of nothing a cell holds is the most useful thing this
   dataset says. */
const passthrough = s =>
  s === "trace" || s === "not-detected" || s === "not-measured" ? s : null;

/* Which of two findings to show where neither carries a figure. A trace says
   something was seen and not-detected says nothing was, so the trace is the
   stronger statement and printing not-detected over it would claim more than
   the evidence supports. The disagreement is recorded either way. */
const RANK = { trace: 3, "not-detected": 2, "not-measured": 1 };

/* Two of these are findings and one is a gap. Not-measured says nothing, so
   it cannot disagree with anything. */
const FINDING = new Set(["trace", "not-detected"]);

/**
 * The biotin cell for one food, from whichever of the three sources reach it.
 *
 * @param {{
 *   mext?: { state: string, value: number|null },
 *   cofid?: { biotin_ug: string },
 *   afcd?: { biotin_ug: string, derivation: string },
 * }} rows
 * @returns {object|null} a cell, or null where no source says anything
 */
export function biotinCell(rows) {
  const cands = [];
  const states = {};

  if (rows.mext) {
    if (rows.mext.state === "measured" && typeof rows.mext.value === "number")
      cands.push({ source: "mext-2020", value: rows.mext.value, derivation: "analysed" });
    else if (passthrough(rows.mext.state)) states.mext = rows.mext.state;
  }
  if (rows.cofid) {
    const raw = String(rows.cofid.biotin_ug ?? "").trim();
    if (raw === "Tr") states.cofid = "trace";
    else if (raw !== "N") {
      const v = num(raw);
      if (v !== null) cands.push({ source: "cofid-2021", value: v, derivation: "analysed" });
    }
  }
  if (rows.afcd) {
    const v = num(rows.afcd.biotin_ug);
    if (v !== null) cands.push({ source: "afcd-r3", value: v,
      derivation: gradeDerivation(rows.afcd.derivation) });
  }

  if (cands.length) return reconcile(cands);

  const held = Object.entries(states);
  if (!held.length) return null;
  held.sort((a, b) => RANK[b[1]] - RANK[a[1]]);
  const [who, state] = held[0];
  const cell = { state, sources: [who === "mext" ? "mext-2020" : "cofid-2021"] };
  /* Two sources reporting different findings is a disagreement no figure can
     express and no range can hold. Recorded rather than resolved. A finding
     against a gap is not a disagreement, so both have to be findings. */
  if (held.length > 1 && held[1][1] !== state && held.every(([, st]) => FINDING.has(st)))
    cell.conflict = Object.fromEntries(held);
  return cell;
}
