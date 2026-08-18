/**
 * The four reconciliation rules, as pure functions.
 *
 * Every one of them is a consequence of what cross-source comparison actually
 * found, recorded in tools/evidence/RECONCILIATION.md, rather than a choice
 * made in the abstract. Kept out of the generator so they can be tested without
 * a browser or a build, the way tools/csv.mjs is shared.
 */

/* Rule 2. Only a measurement reconciles. Everything else is a calculation and
   is shown marked, never used to choose a value. AFCD's vocabulary is the
   widest of the sources, so it sets the list. */
const ESTIMATED = new Set(["recipe", "borrowed", "imputed", "estimated", "label data"]);

export function gradeDerivation(raw) {
  return ESTIMATED.has(String(raw ?? "").trim().toLowerCase()) ? "estimated" : "analysed";
}

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* Rounding: source figures carry at most three decimals, and a median of two of
   them can produce a float artefact (0.1 + 0.4 halved is 0.25000000000000006).
   Round to six places, which is far below any real precision here and removes
   the artefact without inventing significance. */
const tidy = x => Math.round(x * 1e6) / 1e6;

/* Rule 3. Where the spread is at or below this, the sources are measuring the
   same thing twice. Observed: molybdenum agrees at 0.7 to 1.5x, biotin's
   spinach disagrees at 29x. Nothing sits awkwardly near the boundary. */
const SPREAD_LIMIT = 2;

/* Rule 4. A value this far from the median, while the rest agree, is an error
   rather than the honest breadth of the evidence. */
const OUTLIER_FACTOR = 10;

/** A cell over figures that are being spanned rather than reconciled: repeated
 *  samples of one food, or two sources whose figures the cell names together
 *  rather than choosing between. Shared with the passes in evidence.mjs so that
 *  a range built there carries the same centre a reconciled one does.
 *
 *  The median is only set where three or more figures make one. Two have no
 *  median distinct from their midpoint, and printing that midpoint is what
 *  rule 3 forbids: AFCD's 74 ug of iodine in rolled oats against MEXT's not
 *  detected reads as 0 to 74, never as 37. */
export function spanCell(figures, sources) {
  const lo = Math.min(...figures), hi = Math.max(...figures);
  if (!(hi > lo)) return { state: "measured", value: tidy(lo), sources };
  return figures.length > 2
    ? { state: "range", low: tidy(lo), high: tidy(hi), median: tidy(median(figures)), sources }
    : { state: "range", low: tidy(lo), high: tidy(hi), sources };
}

export function reconcile(candidates) {
  const analysed = candidates.filter(c => c.derivation === "analysed");

  if (!analysed.length) {
    const e = candidates[0];
    if (!e) return { state: "not-measured", sources: [] };
    return { state: "estimated", value: tidy(e.value), sources: [e.source] };
  }

  let kept = analysed, disputed;

  /* Rule 4 needs a third source to arbitrate: with two, disagreement is just
     disagreement and there is nothing to say which one is odd. */
  if (analysed.length >= 3) {
    const med = median(analysed.map(c => c.value));
    const far = c => med > 0 && Math.max(c.value / med, med / c.value) > OUTLIER_FACTOR;
    const out = analysed.filter(far), rest = analysed.filter(c => !far(c));
    const restVals = rest.map(c => c.value).filter(v => v > 0);
    const restSpread = restVals.length > 1 ? Math.max(...restVals) / Math.min(...restVals) : 1;
    if (out.length && rest.length >= 2 && restSpread <= SPREAD_LIMIT) {
      kept = rest;
      disputed = out.map(c => ({ source: c.source, value: tidy(c.value) }));
    }
  }

  const vals = kept.map(c => c.value);
  /* An analysed absence is a finding, and the widest disagreement there is.
     This used to compare only the values above zero, so a source that looked
     and found nothing could not widen the spread and the cell collapsed to a
     midpoint neither source had measured. RECONCILIATION.md names the case in
     as many words: AFCD reports 74 ug of iodine in rolled oats where MEXT
     reports not detected, and "it must be shown as a range with both sources
     named, never averaged to 37". This returned exactly 37.

     Zero against zero is still agreement, so the guard is only against mixing
     an absence with a finding, which no ratio can express. */
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const spread = vals.length < 2 ? 1
    : (lo === 0 ? (hi === 0 ? 1 : Infinity) : hi / lo);
  const sources = kept.map(c => c.source);
  const n = kept.reduce((t, c) => c.n ? t + c.n : t, 0) || undefined;

  if (spread > SPREAD_LIMIT) {
    /* The median goes in the cell because the page reads and sorts a range on
       it. Only where three or more figures make one: the median of two is
       their midpoint, and printing that is the thing rule 3 forbids. AFCD's
       74 ug of iodine in rolled oats against MEXT's not detected must read as
       0 to 74 and never as 37. */
    const cell = vals.length > 2
      ? { state: "range", low: tidy(lo), high: tidy(hi), median: tidy(median(vals)), sources }
      : { state: "range", low: tidy(lo), high: tidy(hi), sources };
    if (n) cell.n = n;
    return cell;
  }
  const cell = { state: "measured", value: tidy(median(vals)), sources };
  if (n) cell.n = n;
  if (disputed) cell.disputed = disputed;
  return cell;
}
