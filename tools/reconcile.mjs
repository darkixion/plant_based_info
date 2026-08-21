/**
 * The reconciliation rules, as pure functions.
 *
 * Every one of them is a consequence of what cross-source comparison actually
 * found, recorded in tools/evidence/RECONCILIATION.md, rather than a choice
 * made in the abstract. Kept out of the generator so they can be tested without
 * a browser or a build, the way tools/csv.mjs is shared.
 *
 * Rules 1 to 4 are `reconcile` and `spanCell`, over figures alone. Rules 6 and
 * 7 are `nationalCell` at the foot of the file, and they exist because the
 * sources disagree about how to write down "none": MEXT marks an absence in
 * words and AFCD writes the number 0, so a cell built from both has to decide
 * what a zero means before it can decide what the figures mean. Rule 5 is
 * biotin's and lives in biotin.mjs.
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
   same thing twice. It was set on molybdenum agreeing at 0.7 to 1.5x against
   biotin's spinach disagreeing at 29x, and molybdenum has since stopped being
   the easy case: over all 27 foods MEXT and AFCD both reach, 10 fall outside
   it, unsweetened soy milk at 4.1 against 54. The limit stands and the claim
   behind it does not, which RECONCILIATION.md rule 2 now records. */
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

/* A state that carries meaning without carrying a figure. Which kind of
   nothing a cell holds is the most useful thing this dataset says, so these
   are never collapsed into each other. MEXT's "*" is a seventh thing, a food
   the table has no entry for at all, and says nothing. */
const passthrough = st =>
  st === "trace" || st === "not-detected" || st === "not-measured" ? st : null;

/* A trace says something was seen and not-detected says nothing was, so the
   trace is the stronger statement. Not-measured says nothing at all and can
   never outrank a finding. */
const RANK = { trace: 3, "not-detected": 2, "not-measured": 1 };

/**
 * A cell already on the page, read back as the figure it was built from.
 *
 * Passes here own a column and rebuild it, which works while one pass owns the
 * whole column. Boron is the first that does not: nine of its cells come from
 * two literature compilations and two from Frida, and a food could hold both.
 * Overwriting would throw away a measurement and skipping would refuse one.
 *
 * **Only a single-source measured cell can be unpicked.** A range was computed
 * from figures that are not in it any more, so its bounds are the output of a
 * reconciliation and not an input to one; feeding a bound back in would let a
 * spread widen itself on every run. A state carrying no figure has none to
 * give. Both come back null, and the caller keeps what it holds.
 *
 * @param {object} [cell] a cell from evidence.json
 * @param {string} [mine] the source the calling pass owns, which is never a
 *   figure to reconcile against: it is what this run is about to replace
 * @returns {{source: string, value: number, derivation: string}|null}
 */
export function heldAsFigure(cell, mine) {
  if (!cell || cell.state !== "measured" || typeof cell.value !== "number") return null;
  const sources = cell.sources || [];
  if (sources.length !== 1 || sources[0] === mine) return null;
  return { source: sources[0], value: cell.value, derivation: "analysed" };
}

/** Rules 6 and 7, which the iodine column forced and which every component
 *  drawn from several national tables needs.
 *
 *  MEXT marks an absence apart from a zero and AFCD does not, so the same
 *  finding arrives as the word "not detected" from one and the number 0 from
 *  the other. Two rules follow, and they are the same rule seen twice.
 *
 *  **Rule 6. A numeric zero corroborates a source's own finding and never
 *  overrides it.** Almonds are not-detected in Japan, 0 in Australia and 0
 *  over three FDA samples: the cell reads none detected and names all three.
 *  "None detected" is what a laboratory said; 0 is what a spreadsheet holds,
 *  and this page has spent a lot of effort keeping those apart. A trace is a
 *  finding of presence and outranks a zero on the same reading.
 *
 *  **Rule 7. A ratio says nothing near zero, so rules 3 and 4 need a floor.**
 *  0.2 against 0.4 is a factor of two and 0 against anything is infinite.
 *  Without a floor, raw apple's AFCD 0, FDA 0.1 at n=35 and MEXT not-detected
 *  reconciled to the range "0 to 0.1" and printed as "0 (0 to 0)"; twelve
 *  fruit were in that state and raw banana had Japan's finding dropped as a
 *  tenfold outlier over a fifth of a microgram. The floor belongs to the
 *  component, not here: it is where its assays stop and below what its column
 *  can print, so the caller supplies it.
 *
 *  Once an analysed figure reaches the floor the cell is an ordinary
 *  reconciliation, and then an analysed absence enters the span as zero. That
 *  is the oats rule, and it is what makes 0 to 74 rather than 74 alone.
 *
 *  @param {{source: string, value: number, derivation: string, n?: number}[]} figures
 *  @param {Record<string, string>} states source -> a state carrying no figure
 *  @param {number} floor the smallest difference that means anything here
 *  @returns {object|null} a cell, or null where no source says anything
 */
export function nationalCell(figures, states, floor) {
  const held = Object.entries(states).filter(([, st]) => passthrough(st));
  const analysed = figures.filter(f => f.derivation === "analysed");
  const found = held.filter(([, st]) => st !== "not-measured");

  /* Nothing numeric anywhere. The strongest finding held wins, and a food no
     source assayed comes back as the gap it is. */
  if (!figures.length) {
    if (!held.length) return null;
    const ranked = [...held].sort((a, b) => RANK[b[1]] - RANK[a[1]]);
    return { state: ranked[0][1], sources: [ranked[0][0]] };
  }

  if (!analysed.some(f => f.value >= floor)) {
    if (found.length) {
      const ranked = [...found].sort((a, b) => RANK[b[1]] - RANK[a[1]]);
      const [source, state] = ranked[0];
      /* Only the analysed sources corroborate. A Recipe zero is a calculation
         that inherited its ingredients' blanks, which is not a laboratory
         agreeing with anything. A trace is not corroborated at all: the other
         sources put a number on it, and naming them beside a cell that shows
         no number would credit them with a finding they did not report. */
      const agrees = state === "not-detected"
        ? analysed.map(f => f.source).filter(s => s !== source) : [];
      return { state, sources: [source, ...agrees] };
    }
    /* No source reported a finding in words, and every figure is below the
       floor. A figure cannot be shown: 0.2 ug of iodine in olive oil, over ten
       samples, prints as 0 on a column of whole micrograms, and 0 is what an
       absence looks like. The page already refuses that shape, in the test
       named "no measured evidence figure rounds away to zero".

       So the finding is written as the finding it is. A trace is a presence
       too small for the page to put a number on, which is exactly what these
       are, and it is the same statement MEXT makes in words about the same
       foods. A determination of exactly zero is a different claim and keeps
       its figure: the sources say none, and none is what 0 prints as. */
    const seen = analysed.filter(f => f.value > 0);
    if (seen.length) return { state: "trace", sources: seen.map(f => f.source) };
    /* Nothing analysed reached the floor or rose above zero. What is left is
       zeros, which print truthfully, and calculated figures, which are the
       only thing a food nobody assayed has and are shown marked. */
  }

  const span = [...figures];
  for (const [source, state] of held)
    if (state === "not-detected") span.push({ source, value: 0, derivation: "analysed" });

  return reconcile(span);
}
