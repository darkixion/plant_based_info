#!/usr/bin/env node
/**
 * Tests for tool logic that no browser can exercise.
 *
 * The smoke suite drives the built page, which is the right shape for every
 * feature that renders. The pull tools decide what reaches the page at all,
 * and a rule about what they may never do belongs here instead. Run with
 * `npm test`.
 */
import { nextValue } from "../tools/usda.mjs";
import { gradeDerivation, reconcile, spanCell } from "../tools/reconcile.mjs";
import { biotinCell, scoreCandidate } from "../tools/biotin.mjs";
// build.mjs only builds when it is the process entry point, the same guard
// tools/usda.mjs carries. Importing it here must check its rules, not rebuild
// the page as a side effect of running the tests.
import { checkEvidence, checkGaps } from "../build.mjs";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try { fn(); passed++; results.push(`  PASS  ${name}`); }
  catch (e) { failed++; results.push(`  FAIL  ${name}\n          ${e.message}`); }
}
const eq = (a, b, msg) => {
  if (!Object.is(a, b)) throw new Error(`${msg}, expected ${b}, got ${a}`);
};
/** A validator is only useful if it says which rule caught the data, so assert
 *  on the wording rather than on the count. */
const assertHas = (problems, needle) => {
  if (!problems.some(p => p.toLowerCase().includes(needle.toLowerCase())))
    throw new Error(`expected a problem mentioning "${needle}", got: ${problems.join("; ") || "none"}`);
};

// ---------------------------------------------------------------- pull rules

test("a pull never replaces a figure with nothing", () => {
  // The case this exists for: Amaranth is mapped and reviewed to 170683, whose
  // row carries 33 nutrient ids and not one of the 12 fatty acid ids. Under the
  // old rule a re-pull wrote null over five real values for it. A row that is
  // silent about a nutrient is not evidence that the nutrient is absent.
  eq(nextValue(0.043, undefined), 0.043, "an absent id must not destroy a figure");
  eq(nextValue(0.043, null), 0.043, "a null id must not destroy a figure");
  eq(nextValue(0, undefined), 0, "a measured zero is a figure, not a gap");
});

test("a pull still fills a gap and still updates a figure", () => {
  eq(nextValue(null, 0.119), 0.119, "a gap must be filled");
  eq(nextValue(undefined, 0.119), 0.119, "an unset cell must be filled");
  eq(nextValue(0.021, 0.119), 0.119, "an existing figure must be updated");
  eq(nextValue(0.119, 0), 0, "a figure must be updatable to a measured zero");
});

test("a pull leaves a gap as a gap when neither side has a figure", () => {
  eq(nextValue(null, undefined), null, "nothing on either side stays null");
  eq(nextValue(undefined, undefined), null, "unset with nothing incoming is null");
});

// ------------------------------------------------------- reconciliation rules

test("only analysed values reconcile", () => {
  // AFCD publishes a per-food derivation and only 490 of its 709 plant rows are
  // Analysed. Every large biotin gap against MEXT turned out to be AFCD
  // reporting a recipe calculation rather than a measurement.
  eq(gradeDerivation("Analysed"), "analysed", "Analysed is a measurement");
  eq(gradeDerivation("Recipe"), "estimated", "a recipe is a calculation");
  eq(gradeDerivation("Borrowed"), "estimated", "borrowed is not measured");
  eq(gradeDerivation("Imputed"), "estimated", "imputed is not measured");
  eq(gradeDerivation("Label Data"), "estimated", "label data is not measured");
});

test("agreement within 2x yields one value, not a range", () => {
  // Molybdenum sits at 0.7 to 1.5x across sources and is plainly the same
  // measurement twice.
  const c = reconcile([
    { source: "mext-2020", value: 44, derivation: "analysed" },
    { source: "afcd-r3", value: 68, derivation: "analysed" },
  ]);
  eq(c.state, "measured", "1.5x apart is agreement");
  eq(c.value, 56, "the value is the median of the analysed values");
  eq(c.sources.length, 2, "both sources are named");
});

test("disagreement beyond 2x yields a range", () => {
  // Kidney bean biotin: MEXT 3.7, CoFID 0.5, AFCD 1.3. Spread 7.4x, and no
  // single value is more than 10x from the median, so nothing is an outlier.
  const c = reconcile([
    { source: "mext-2020", value: 3.7, derivation: "analysed" },
    { source: "cofid-2021", value: 0.5, derivation: "analysed" },
    { source: "afcd-r3", value: 1.3, derivation: "analysed" },
  ]);
  eq(c.state, "range", "7.4x apart is disagreement");
  eq(c.low, 0.5, "the range runs from the lowest analysed value");
  eq(c.high, 3.7, "to the highest");
  eq(c.disputed, undefined, "nothing here is an outlier");
});

test("an outlier is excluded from the range rather than widening it", () => {
  // The rule the oats iodine case forced. AFCD reports rolled oats at 74 ug,
  // analysed, against MEXT's not detected and USDA's 0.2 at n=10. A rule that
  // only knew how to widen would publish "0.2 to 74" and call it honest.
  const c = reconcile([
    { source: "usda-iodine-r4", value: 0.2, derivation: "analysed", n: 10 },
    { source: "frida-6.1", value: 0.3, derivation: "analysed" },
    { source: "afcd-r3", value: 74, derivation: "analysed" },
  ]);
  eq(c.state, "measured", "two agreeing sources against one outlier is not a range");
  eq(c.value, 0.25, "the value is the median of what is left");
  eq(c.disputed.length, 1, "the outlier is recorded, not deleted");
  eq(c.disputed[0].source, "afcd-r3", "and it is named");
  eq(c.disputed[0].value, 74, "with its value kept");
});

test("two sources cannot produce an outlier, only a range", () => {
  // It takes a third source to say which of two is the odd one.
  const c = reconcile([
    { source: "mext-2020", value: 0.1, derivation: "analysed" },
    { source: "afcd-r3", value: 74, derivation: "analysed" },
  ]);
  eq(c.state, "range", "two sources disagreeing is disagreement");
  eq(c.disputed, undefined, "with nothing to arbitrate between them");
});

test("an analysed absence against a measurement is a range, never their midpoint", () => {
  /* The case RECONCILIATION.md rule 3 is written around, and the rule said in
     as many words that it "must be shown as a range with both sources named,
     never averaged to 37". It returned 37, because the spread was computed
     over the values above zero and a source that found nothing could not widen
     it. A midpoint neither laboratory measured is the one answer that cannot
     be defended, and it is the one the page would have printed. */
  const c = reconcile([
    { source: "mext-2020", value: 0, derivation: "analysed" },
    { source: "afcd-r3", value: 74, derivation: "analysed" },
  ]);
  eq(c.state, "range", "found nothing against found 74 is the widest disagreement there is");
  eq(c.low, 0, "the range runs from the absence");
  eq(c.high, 74, "to the finding");
});

test("two analysed absences agree rather than disagreeing", () => {
  // No ratio can be formed, and none is needed: both looked and found nothing.
  const c = reconcile([
    { source: "mext-2020", value: 0, derivation: "analysed" },
    { source: "afcd-r3", value: 0, derivation: "analysed" },
  ]);
  eq(c.state, "measured", "nothing and nothing is not a disagreement");
  eq(c.value, 0, "and the figure is zero");
});

test("a range over three or more figures carries its median", () => {
  /* The page reads and sorts a range on this. Without it it falls back to the
     midpoint of the bounds, which is the centre of the interval rather than of
     the evidence: raw broccoli's glucoraphanin runs 1.19 to 217.9 over 210
     cultivar means with a median of 23.85, and it sorted at 109.5, ahead of
     every other food in the column, on a figure nobody measured. */
  const c = reconcile([
    { source: "mext-2020", value: 3.7, derivation: "analysed" },
    { source: "cofid-2021", value: 0.5, derivation: "analysed" },
    { source: "afcd-r3", value: 1.3, derivation: "analysed" },
  ]);
  eq(c.state, "range", "7.4x apart is disagreement");
  eq(c.median, 1.3, "and the centre is the median, not the 2.1 midpoint of 0.5 and 3.7");
});

test("a range over two figures carries no median", () => {
  // Their median is their midpoint, and printing that is what rule 3 forbids.
  const c = reconcile([
    { source: "mext-2020", value: 0, derivation: "analysed" },
    { source: "afcd-r3", value: 74, derivation: "analysed" },
  ]);
  eq(c.median, undefined, "0 to 74 has no third figure to make a centre from");
});

test("spanned samples follow the same rule as reconciled sources", () => {
  /* evidence.mjs spans repeated samples of one food in four places and used to
     build those cells by hand, so a range written there arrived without the
     centre a reconciled one had. Daikon is the case: three parts along the
     root at 0.303, 0.333 and 0.319, whose median is 0.319 and whose midpoint
     is 0.318. */
  const many = spanCell([0.303, 0.333, 0.319], ["kawabata-1973"]);
  eq(many.state, "range", "three different figures are a spread");
  eq(many.median, 0.319, "and the centre is the middle sample");
  const two = spanCell([1.49, 1.61], ["tbca-carb-2019"]);
  eq(two.median, undefined, "two samples have no median distinct from their midpoint");
  const same = spanCell([1.55, 1.55], ["tbca-carb-2019"]);
  eq(same.state, "measured", "samples that agree are one figure, not a range");
  eq(same.value, 1.55, "with that figure");
});

test("an estimated value is shown but never reconciles", () => {
  const c = reconcile([
    { source: "afcd-r3", value: 2.5, derivation: "estimated" },
  ]);
  eq(c.state, "estimated", "a lone calculation is still worth showing, marked");
  eq(c.value, 2.5, "with its figure");
});

test("estimates take no part in choosing a value", () => {
  // AFCD's cooked-chickpea biotin is Recipe-derived at 2.5 against MEXT's
  // analysed 8.9. Letting it in would drag the value toward a calculation.
  const c = reconcile([
    { source: "mext-2020", value: 8.9, derivation: "analysed" },
    { source: "afcd-r3", value: 2.5, derivation: "estimated" },
  ]);
  eq(c.state, "measured", "one analysed value stands alone");
  eq(c.value, 8.9, "and the estimate does not move it");
  eq(c.sources.length, 1, "only the analysed source is credited");
});

// ------------------------------------------------------------------- biotin

test("a food absent from MEXT still gets a biotin cell", () => {
  // The structural limit this work exists to remove. Walnuts, pistachios,
  // brazil nuts and wholewheat pasta each carry an analysed AFCD figure and
  // no Japanese row, so the old pass, which looped over the MEXT map, could
  // never reach them.
  const c = biotinCell({ afcd: { biotin_ug: "19", derivation: "Analysed" } });
  eq(c.state, "measured", "one analysed source is a measurement");
  eq(c.value, 19, "and it is that source's own figure");
  eq(c.sources[0], "afcd-r3", "named");
});

test("an AFCD recipe figure never reconciles against a measurement", () => {
  // Rule 1. Chickpeas is the case: AFCD's 2.5 is calculated from ingredients
  // and cooking factors, so MEXT's 8.9 stands alone rather than becoming a
  // range of 2.5 to 8.9 that no laboratory would recognise.
  const c = biotinCell({
    mext: { state: "measured", value: 8.9 },
    afcd: { biotin_ug: "2.5", derivation: "Recipe" },
  });
  eq(c.state, "measured", "a recipe cannot open a range");
  eq(c.value, 8.9, "the analysed figure stands");
  eq(c.sources.length, 1, "and cites one source");
});

test("three sources let the outlier be disputed rather than printed", () => {
  // Almonds. CoFID 64 and MEXT 60 agree at 1.07x, AFCD's 0.5 sits 120x from
  // the median, and rule 4 has the third source it needs to say which is odd.
  const c = biotinCell({
    mext: { state: "measured", value: 60 },
    cofid: { biotin_ug: "64" },
    afcd: { biotin_ug: "0.5", derivation: "Analysed" },
  });
  eq(c.state, "measured", "two agreeing sources against one outlier");
  eq(c.value, 62, "the median of what is left");
  eq(c.disputed[0].source, "afcd-r3", "the outlier is named");
});

test("CoFID's trace marker is a finding, not a gap", () => {
  // "Tr" went through parseFloat, became NaN and then no data, discarding the
  // finding on 63 rows. Trace is one of the six states.
  const c = biotinCell({ cofid: { biotin_ug: "Tr" } });
  eq(c.state, "trace", "a trace is what the source said");
  eq(c.sources[0], "cofid-2021", "and it is named");
});

test("a trace never bounds a range", () => {
  // A trace carries no figure, so it cannot be a low bound. Where a source has
  // a number, the number is the cell.
  const c = biotinCell({
    mext: { state: "measured", value: 2.5 },
    cofid: { biotin_ug: "Tr" },
  });
  eq(c.state, "measured", "the figure decides the cell");
  eq(c.value, 2.5, "at its own value");
  eq(c.sources.length, 1, "citing only the source that had a figure");
});

test("CoFID's N is no data and never a zero", () => {
  const c = biotinCell({ cofid: { biotin_ug: "N" } });
  eq(c, null, "a component nobody assayed says nothing");
});

test("a finding beats a gap when neither source has a figure", () => {
  // MEXT looked at nothing, CoFID saw a trace. The trace is the only
  // information here.
  const c = biotinCell({
    mext: { state: "not-measured", value: null },
    cofid: { biotin_ug: "Tr" },
  });
  eq(c.state, "trace", "the finding is the cell");
});

test("a gap does not disagree with a finding", () => {
  // Not-measured is nobody having looked. It has no quarrel with a trace, and
  // recording one would fill the conflict report with noise that hides the
  // real disagreements.
  const c = biotinCell({
    mext: { state: "not-measured", value: null },
    cofid: { biotin_ug: "Tr" },
  });
  eq(c.state, "trace", "the finding is still the cell");
  eq(c.conflict, undefined, "and nothing is reported as a conflict");
});

test("two sources reporting different findings record the conflict", () => {
  // Not-detected against trace is a disagreement no figure can express, and
  // the one thing that must not happen is silence about it.
  const c = biotinCell({
    mext: { state: "not-detected", value: null },
    cofid: { biotin_ug: "Tr" },
  });
  eq(c.state, "trace", "the more informative finding is shown");
  eq(c.conflict.mext, "not-detected", "and the other is recorded");
  eq(c.conflict.cofid, "trace", "with what it said");
});

test("MEXT's own state passes through when nothing has a figure", () => {
  const c = biotinCell({ mext: { state: "not-detected", value: null } });
  eq(c.state, "not-detected", "analysed and none found is a finding");
  eq(c.sources[0], "mext-2020", "named");
});

test("an analysed absence ranges against a finding", () => {
  // AFCD reports 18 analysed biotin zeros. The fix of 2026-08-18 meeting the
  // case it was written for: a source that looked and found nothing widens the
  // spread rather than being averaged away.
  const c = biotinCell({
    mext: { state: "measured", value: 4 },
    afcd: { biotin_ug: "0", derivation: "Analysed" },
  });
  eq(c.state, "range", "an absence against a finding is a range");
  eq(c.low, 0, "from nothing");
  eq(c.high, 4, "to the figure");
  eq(c.median, undefined, "and two figures get no median");
});

test("a plural page food still matches its singular source row", () => {
  // A first crude pass scored chickpeas and cashews as having no candidate in
  // either database when both hold them, because "Chickpeas" does not contain
  // "Chickpea, dried, boiled, drained".
  const s = scoreCandidate("Chickpeas", "cooked", "Chickpea, dried, boiled, drained");
  if (!(s > 0)) throw new Error(`expected a positive score, got ${s}`);
});

test("scoring refuses to cross raw and cooked", () => {
  // Preparation is the sharpest edge in this data. A cooked page food matched
  // to a dried row measures hydration, not disagreement.
  const cooked = scoreCandidate("Lentils", "cooked", "Lentils, green and brown, whole, dried, boiled in unsalted water");
  const dried = scoreCandidate("Lentils", "cooked", "Lentils, green and brown, whole, dried, raw");
  if (!(cooked > dried)) throw new Error(`cooked ${cooked} should beat dried ${dried}`);
  if (dried > 0) throw new Error(`a raw row for a cooked food should not score, got ${dried}`);
});

test("a food with no preparation is not penalised for having none", () => {
  // Nuts and most fruit carry no state, and neither do their rows.
  const s = scoreCandidate("Almonds", "", "Almonds, whole kernels");
  if (!(s >= 18)) throw new Error(`expected at least 18, got ${s}`);
});

test("a different basis scores below the same basis", () => {
  // CoFID holds almonds four ways. "Weighed with shells" at 23.7 against 64
  // for kernels is a different basis, not a different figure, and a reviewer
  // who accepted it would put a shell-diluted number on the page.
  const kernels = scoreCandidate("Almonds", "", "Almonds, whole kernels");
  const shells = scoreCandidate("Almonds", "", "Almonds, weighed with shells");
  if (!(kernels > shells)) throw new Error(`kernels ${kernels} should beat shells ${shells}`);
});

test("juice is not the fruit", () => {
  const fruit = scoreCandidate("Apples", "raw", "Apples, eating, raw, flesh only");
  const juice = scoreCandidate("Apples", "raw", "Apple juice, clear, ambient and chilled");
  if (!(fruit > juice)) throw new Error(`fruit ${fruit} should beat juice ${juice}`);
});

// ------------------------------------------------------------ evidence checks

const NUTS = [{ id: "solfibre", evidence: true }, { id: "protein" }];
const FOODS = [{ name: "Oats", state: "rolled, dry" }];
const SRC = { "mext-2020": { short: "Japan (MEXT)", title: "x", quality: "high", method: "ZETAAS" } };
/** One well-formed food mapping with one cell, so each test below varies
 *  exactly one thing. `prep` and `match` belong to the food; everything else
 *  belongs to the cell. */
const cell = ({ prep = "rolled, dry", matches = { "mext-2020": "exact" }, ...over } = {}) => ({
  "oats-rolled-dry": { prep, matches, cells: { solfibre: {
    state: "measured", value: 3.2, sources: ["mext-2020"], ...over } } },
});

test("a source with no short label is refused", () => {
  // The label the dialog prints beside a figure. Without one it fell back to
  // the source key, so a reader was shown "· milder-2005" and "· fao-phytate"
  // where the code meant to name a country or a paper.
  assertHas(checkEvidence(cell({}), NUTS, FOODS, { "mext-2020": { title: "x", quality: "high" } }),
    "no short label");
});

test("a value with no resolvable source is refused", () => {
  assertHas(checkEvidence(cell({ sources: ["nope"] }), NUTS, FOODS, SRC), "unknown source");
  assertHas(checkEvidence(cell({ sources: [] }), NUTS, FOODS, SRC), "no source");
});

test("a cell whose prep disagrees with its food is refused", () => {
  // The trap that would otherwise put dry-bean figures on cooked rows. A right
  // value against the wrong preparation is worse than none, because it looks
  // right: red kidney bean oligosaccharides are 3.6 g raw and trace boiled.
  assertHas(checkEvidence(cell({ prep: "canned" }), NUTS, FOODS, SRC), "prep");
});

test("an unknown state is refused", () => {
  assertHas(checkEvidence(cell({ state: "probably" }), NUTS, FOODS, SRC), "state");
});

test("a range whose bounds are equal is refused", () => {
  // Equal bounds mean reconciliation was skipped rather than that the sources
  // agreed: agreement produces a single value, not a range of width zero.
  assertHas(checkEvidence(cell({ state: "range", value: undefined, low: 3.2, high: 3.2 }),
    NUTS, FOODS, SRC), "range");
  assertHas(checkEvidence(cell({ state: "range", value: undefined, low: 3.7, high: 0.5 }),
    NUTS, FOODS, SRC), "range");
  assertHas(checkEvidence(cell({ state: "range", value: undefined }), NUTS, FOODS, SRC), "range");
});

test("a measured cell with no figure is refused", () => {
  assertHas(checkEvidence(cell({ value: undefined }), NUTS, FOODS, SRC), "no value");
});

test("an unknown match grade is refused", () => {
  assertHas(checkEvidence(cell({ matches: { "mext-2020": "roughly" } }), NUTS, FOODS, SRC), "match");
});

test("a source a cell rests on must carry its own match grade", () => {
  // The fault this replaced: one grade per food, covering mappings of different
  // quality. Cooked lentils are MEXT's boiled-lentil row and IFCT's dry dhal,
  // and the single grade said "exact", so the dry figure showed unmarked.
  assertHas(checkEvidence(cell({ matches: { "cofid-2021": "exact" } }), NUTS, FOODS,
    { ...SRC, "cofid-2021": { short: "UK (CoFID)", title: "y" } }), "no match grade for mext-2020");
  assertHas(checkEvidence(cell({ matches: {} }), NUTS, FOODS, SRC), "no match grade for mext-2020");
});

test("a grade is kept for every source, not merged into one", () => {
  // Two sources of different quality on one food must stay separately graded,
  // because the page decides the proxy mark per cell from the cell's sources.
  const src = { ...SRC, "ifct-2017": { short: "India (IFCT)", title: "y" } };
  const two = { "oats-rolled-dry": { prep: "rolled, dry",
    matches: { "mext-2020": "exact", "ifct-2017": "proxy" },
    cells: { solfibre: { state: "measured", value: 3.2, sources: ["mext-2020"] },
             insolfibre: { state: "measured", value: 6.2, sources: ["ifct-2017"] } } } };
  const nuts = [...NUTS, { id: "insolfibre", evidence: true }];
  eq(checkEvidence(two, nuts, FOODS, src).length, 0,
     "differing grades on one food are the point, not an error");
});

test("a cell against an unknown food or component is refused", () => {
  const p1 = checkEvidence({ "no-such-food": { prep: "x", matches: { "mext-2020": "exact" }, cells: { solfibre:
    { state: "measured", value: 1, sources: ["mext-2020"] } } } }, NUTS, FOODS, SRC);
  assertHas(p1, "unknown food");
  const p2 = checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", matches: { "mext-2020": "exact" }, cells: { nosuch:
    { state: "measured", value: 1, sources: ["mext-2020"] } } } }, NUTS, FOODS, SRC);
  assertHas(p2, "unknown component");
});

test("a column not declared as evidence may not carry evidence", () => {
  // The lock in the other direction. A cell against `protein` would be a figure
  // living in two places at once, one of them outside every total.
  const p = checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", matches: { "mext-2020": "exact" }, cells: { protein:
    { state: "measured", value: 13, sources: ["mext-2020"] } } } }, NUTS, FOODS, SRC);
  assertHas(p, "unknown component");
});

test("a state that carries no figure needs no source", () => {
  // Absence is a finding here, not a gap, and nobody has to be cited for it.
  const p = checkEvidence(cell({ state: "not-measured", value: undefined, sources: undefined }),
    NUTS, FOODS, SRC);
  eq(p.length, 0, `expected no problems, got ${p.join("; ")}`);
});

test("a well-formed cell passes", () => {
  const p = checkEvidence(cell({}), NUTS, FOODS, SRC);
  eq(p.length, 0, `expected no problems, got ${p.join("; ")}`);
});

test("a food's mapping is stored once, not on every cell", () => {
  const nutrients = [{ id: "solfibre", evidence: true, unit: "g" }];
  const foods = [{ name: "Oats", state: "rolled, dry", v: [] }];
  const sources = { "mext-2020": { short: "Japan (MEXT)", title: "t", quality: "high" } };

  // The shape the generator now writes: prep and match on the food, cells under
  // their own key, and no unit or basis anywhere.
  const good = {
    "oats-rolled-dry": {
      prep: "rolled, dry", matches: { "mext-2020": "exact" },
      cells: { solfibre: { state: "measured", value: 3.2, sources: ["mext-2020"] } },
    },
  };
  eq(checkEvidence(good, nutrients, foods, sources).length, 0,
     "the new shape must validate clean");

  // A source nobody graded is a mapping nobody reviewed, which is the thing the
  // reviewed-mapping rule exists to prevent. Checked against the sources a cell
  // actually cites, since that is what the page marks.
  assertHas(checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", cells: {
    solfibre: { state: "measured", value: 3.2, sources: ["mext-2020"] } } } },
    nutrients, foods, sources), "no match grade for mext-2020");

  assertHas(checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", matches: { "mext-2020": "guessed" }, cells: {} } },
    nutrients, foods, sources), "unknown match grade");

  // Preparation is still the sharpest edge in this data, and the check moves up
  // a level with the field rather than disappearing.
  assertHas(checkEvidence({ "oats-rolled-dry": { prep: "boiled", matches: { "mext-2020": "exact" }, cells: {} } },
    nutrients, foods, sources), "disagrees with the food's state");
});

/* ---------- values must be the source's own ----------
   The rule that would have caught the phytate and proanthocyanidin cells: a
   plausible number carrying a citation to a database that does not hold it. A
   figure is either the source's or it is invented, and only the former can be
   checked, so `attested` carries what each corpus actually says for the foods a
   reviewed map reaches. Sources with no corpus, and foods a corpus has no map
   entry for, are outside this check rather than failures of it. */
const ATT = { "mext-2020": { "oats-rolled-dry": { solfibre: 3.2, insolfibre: 6.2 } } };

test("a value the corpus it cites does not hold is refused", () => {
  // 3.4 is not a wrong-looking number for oat soluble fibre. That is exactly
  // why nothing but comparison with the row itself can catch it.
  assertHas(checkEvidence(cell({ value: 3.4 }), NUTS, FOODS, SRC, ATT),
    "disagrees with mext-2020");
  eq(checkEvidence(cell({ value: 3.2 }), NUTS, FOODS, SRC, ATT).length, 0,
     "the source's own figure passes");
});

test("a cell citing a corpus that carries no such figure is refused", () => {
  // Two ways to cite a database that cannot support the claim: it has no row
  // reachable for this food, or the row it has is silent on this component.
  const noRow = { "mext-2020": { "something-else": { solfibre: 3.2 } } };
  assertHas(checkEvidence(cell({}), NUTS, FOODS, SRC, noRow), "no mext-2020 row");

  const noCell = { "mext-2020": { "oats-rolled-dry": { insolfibre: 6.2 } } };
  assertHas(checkEvidence(cell({}), NUTS, FOODS, SRC, noCell), "carries no solfibre");
});

test("a source with no corpus is left alone rather than refused", () => {
  // Most of the evidence store is single papers that cannot be held in a file
  // here. Silence about them is honest; failing them would be a lie the other
  // way, and would make the check unusable.
  const other = { "afcd-r3": { "oats-rolled-dry": { solfibre: 9.9 } } };
  eq(checkEvidence(cell({}), NUTS, FOODS, SRC, other).length, 0,
     "mext-2020 has no corpus in this index, so the cell stands");
});

test("a reconciled value must lie between the figures it reconciles", () => {
  // A value drawn from several sources equals none of them by design: banana
  // biotin is 1.4 in Japan and 2.5 in the UK, and the page carries 1.95. What
  // it may never do is leave the span its own sources establish.
  const two = { "mext-2020": { "oats-rolled-dry": { solfibre: 1.4 } },
                "cofid-2021": { "oats-rolled-dry": { solfibre: 2.5 } } };
  const src = { ...SRC, "cofid-2021": { short: "UK (CoFID)", title: "y", quality: "high" } };
  const both = { sources: ["mext-2020", "cofid-2021"],
                 matches: { "mext-2020": "exact", "cofid-2021": "exact" } };
  eq(checkEvidence(cell({ ...both, value: 1.95 }), NUTS, FOODS, src, two).length, 0,
     "a midpoint between two attested figures is a reconciliation");
  assertHas(checkEvidence(cell({ ...both, value: 3.1 }), NUTS, FOODS, src, two),
    "outside the 1.4 to 2.5");
});

test("a source offering several samples is held to all of them", () => {
  // FAO's phytate corpus carries one row per cultivar and treatment rather than
  // one per food, so a single source can attest a spread on its own. Picking
  // the flattering end of that spread is the same fault as inventing a number.
  const many = { "fao-phytate": { "oats-rolled-dry": { solfibre: [871, 947.6] } } };
  const src = { ...SRC, "fao-phytate": { short: "FAO/INFOODS", title: "z", quality: "high" } };
  const from = { sources: ["fao-phytate"], matches: { "fao-phytate": "exact" } };
  eq(checkEvidence(cell({ ...from, state: "range", value: undefined, low: 871, high: 947.6 }),
     NUTS, FOODS, src, many).length, 0, "a range over the samples is the honest answer");
  assertHas(checkEvidence(cell({ ...from, state: "range", value: undefined, low: 871, high: 900 }),
    NUTS, FOODS, src, many), "excludes");
  assertHas(checkEvidence(cell({ ...from, value: 1200 }), NUTS, FOODS, src, many),
    "outside the 871 to 947.6");
});

test("a range must span every figure its sources attest", () => {
  // A range is the breadth of the disagreement. One that excludes a source it
  // names has dropped that source's finding while still crediting it.
  const two = { "mext-2020": { "oats-rolled-dry": { solfibre: 1.4 } },
                "cofid-2021": { "oats-rolled-dry": { solfibre: 2.5 } } };
  const src = { ...SRC, "cofid-2021": { short: "UK (CoFID)", title: "y", quality: "high" } };
  const range = { state: "range", value: undefined, sources: ["mext-2020", "cofid-2021"],
                  matches: { "mext-2020": "exact", "cofid-2021": "exact" } };
  eq(checkEvidence(cell({ ...range, low: 1.4, high: 2.5 }), NUTS, FOODS, src, two).length, 0,
     "the span of both figures is the range");
  assertHas(checkEvidence(cell({ ...range, low: 1.4, high: 2.0 }), NUTS, FOODS, src, two),
    "range 1.4 to 2 excludes");
});

test("a component may not exceed the total it is part of", () => {
  /* Glucoraphanin is one glucosinolate among several, so a food carrying more
     of it than of all of them together has taken its two figures from samples
     that cannot both describe the same food. The build already refuses this
     shape for the fat fractions in `v`; an evidence column is the same claim
     and was not covered, and the first glucoraphanin figure found for broccoli
     was 89 mg against a recorded 61.7 mg of total glucosinolates. */
  const nuts = [{ id: "glucosinolates", evidence: true }, { id: "glucoraphanin", evidence: true }];
  const src = { "a": { short: "A", title: "a", quality: "high" } };
  // Both cells cite source "a": one study cannot report a food as holding more
  // of a component than of the class that component belongs to.
  const pair = (total, part) => ({ "oats-rolled-dry": { prep: "rolled, dry",
    matches: { a: "exact" }, cells: {
      glucosinolates: { state: "measured", value: total, sources: ["a"] },
      glucoraphanin: { state: "measured", value: part, sources: ["a"] } } } });

  eq(checkEvidence(pair(61.7, 45), nuts, FOODS, src).length, 0, "a fraction under its total is fine");
  eq(checkEvidence(pair(61.7, 61.7), nuts, FOODS, src).length, 0, "a fraction may be the whole of it");
  assertHas(checkEvidence(pair(61.7, 89), nuts, FOODS, src), "exceeds");
});

test("a part and a total from different sources are not held against each other", () => {
  /* The rule above is a compositional identity and only holds within one set of
     samples. Broccoli's total glucosinolates here are a UK literature mean and
     its glucoraphanin a cultivar screen in another country: one exceeding the
     other is two studies disagreeing about broccoli, which the page shows by
     naming both, and not a food containing more of a part than of the whole. */
  const nuts = [{ id: "glucosinolates", evidence: true }, { id: "glucoraphanin", evidence: true }];
  const src = { a: { short: "A", title: "a", quality: "high" },
                b: { short: "B", title: "b", quality: "high" } };
  const split = { "oats-rolled-dry": { prep: "rolled, dry",
    matches: { a: "exact", b: "exact" }, cells: {
      glucosinolates: { state: "measured", value: 61.7, sources: ["a"] },
      glucoraphanin: { state: "measured", value: 89, sources: ["b"] } } } };
  eq(checkEvidence(split, nuts, FOODS, src).length, 0,
     "different sources may disagree; only one source may not contradict itself");
});

// ----------------------------------------------------------------- gap checks

test("a claim that something is absent fails once it is present", () => {
  const nutrients = [{ id: "biotin", evidence: true }, { id: "fiber" }];
  const sources = {};
  const entry = { id: "traces", tier: "unseen", nutrients: [], label: "Traces",
                  role: "r", why: "x".repeat(50), closing: "c", cites: [] };

  eq(checkGaps({ sources, gaps: [{ ...entry, absent: ["chromium"] }] }, nutrients).length, 0,
     "naming a component with no column is the whole point of the field");

  assertHas(checkGaps({ sources, gaps: [{ ...entry, absent: ["biotin"] }] }, nutrients),
    "biotin");
  assertHas(checkGaps({ sources, gaps: [{ ...entry, absent: ["biotin"] }] }, nutrients),
    "has a column");
});

// -------------------------------------------------- what a reader can be shown

test("no measured evidence figure rounds away to zero on the page", () => {
  /* The page prints an evidence cell with toFixed(dp), so a figure smaller than
     half of the column's last place reaches the reader as 0.0, which is what an
     absence looks like. Two columns have shipped in that state. CoQ9 carried
     cauliflower at 0.004 mg in a two-decimal column. Melatonin carried three
     cells around 0.0001 ng, which turned out not to be melatonin in nanograms
     at all but figures whose source did not contain them.

     This is the check that catches both, and it belongs here rather than in the
     browser suite because it is a fact about the data, not about the rendering:
     any cell that fails it is either in the wrong unit or in a column whose
     precision cannot show it. */
  const nutrients = JSON.parse(readFileSync(new URL("../src/data/nutrients.json", import.meta.url), "utf8"));
  const evidence = JSON.parse(readFileSync(new URL("../src/data/evidence.json", import.meta.url), "utf8"));
  const dp = Object.fromEntries(nutrients.nutrients.filter(n => n.evidence).map(n => [n.id, n.dp]));
  const zero = [];
  for (const [slug, entry] of Object.entries(evidence)) {
    for (const [id, cell] of Object.entries(entry.cells || {})) {
      if (!(id in dp)) continue;
      // A range shows both bounds, and its top is the most the cell claims.
      const shown = cell.state === "range" ? cell.high
        : (cell.state === "measured" || cell.state === "estimated") ? cell.value : null;
      /* A stored zero is left alone. MEXT reports 0 for maltose in dozens of
         foods and that is the source speaking, not a rounding: 47 cells here
         are measured zeros. What this catches is a figure that is not zero and
         prints as one. */
      if (typeof shown !== "number" || shown === 0) continue;
      if (Number(shown.toFixed(dp[id])) === 0) zero.push(`${slug}.${id} = ${shown} at dp ${dp[id]}`);
    }
  }
  eq(zero.length, 0, `these measured figures print as zero: ${zero.join("; ")}`);
});

test("running the evidence generator changes nothing", () => {
  /* The store is meant to be a fixed point of its own generator: the file in
     the repository is what the passes produce, so running them again produces
     it unchanged. This is not a tidiness check. A pass that reads back its own
     output and treats it as somebody else's can destroy data on a second run,
     and one did: the Foundation Foods pass found its own figure at the top of a
     range it had written, saw no disagreement, and collapsed the cell to a lone
     measurement, dropping Halliwell from the shiitake and oyster ergothioneine
     cells. The file is restored before the assertion so a failure here reports
     rather than damages. */
  const path = new URL("../src/data/evidence.json", import.meta.url);
  const before = readFileSync(path, "utf8");
  try {
    execSync("node tools/evidence.mjs", { stdio: "ignore" });
  } catch (e) {
    throw new Error("the evidence generator failed to run: " + e.message);
  }
  const after = readFileSync(path, "utf8");
  if (after !== before) writeFileSync(path, before);
  eq(after === before, true,
     "src/data/evidence.json is not a fixed point of tools/evidence.mjs: a pass is rewriting cells it has already written");
});

// ----------------------------------------------------------------- CLI checks

test("add --dry-run completes without error", () => {
  try {
    execSync("node tools/usda.mjs add --dry-run", { stdio: "ignore" });
  } catch (e) {
    throw new Error("add --dry-run failed: " + e.message);
  }
});

console.log(results.join("\n"));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
