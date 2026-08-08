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
import { gradeDerivation, reconcile } from "../tools/reconcile.mjs";
// build.mjs only builds when it is the process entry point, the same guard
// tools/usda.mjs carries. Importing it here must check its rules, not rebuild
// the page as a side effect of running the tests.
import { checkEvidence, checkGaps } from "../build.mjs";

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

// ------------------------------------------------------------ evidence checks

const NUTS = [{ id: "solfibre", evidence: true }, { id: "protein" }];
const FOODS = [{ name: "Oats", state: "rolled, dry" }];
const SRC = { "mext-2020": { title: "x", quality: "high", method: "ZETAAS" } };
/** One well-formed food mapping with one cell, so each test below varies
 *  exactly one thing. `prep` and `match` belong to the food; everything else
 *  belongs to the cell. */
const cell = ({ prep = "rolled, dry", match = "exact", ...over } = {}) => ({
  "oats-rolled-dry": { prep, match, cells: { solfibre: {
    state: "measured", value: 3.2, sources: ["mext-2020"], ...over } } },
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
  assertHas(checkEvidence(cell({ match: "roughly" }), NUTS, FOODS, SRC), "match");
});

test("a cell against an unknown food or component is refused", () => {
  const p1 = checkEvidence({ "no-such-food": { prep: "x", match: "exact", cells: { solfibre:
    { state: "measured", value: 1, sources: ["mext-2020"] } } } }, NUTS, FOODS, SRC);
  assertHas(p1, "unknown food");
  const p2 = checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", match: "exact", cells: { nosuch:
    { state: "measured", value: 1, sources: ["mext-2020"] } } } }, NUTS, FOODS, SRC);
  assertHas(p2, "unknown component");
});

test("a column not declared as evidence may not carry evidence", () => {
  // The lock in the other direction. A cell against `protein` would be a figure
  // living in two places at once, one of them outside every total.
  const p = checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", match: "exact", cells: { protein:
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
  const sources = { "mext-2020": { title: "t", quality: "high" } };

  // The shape the generator now writes: prep and match on the food, cells under
  // their own key, and no unit or basis anywhere.
  const good = {
    "oats-rolled-dry": {
      prep: "rolled, dry", match: "exact",
      cells: { solfibre: { state: "measured", value: 3.2, sources: ["mext-2020"] } },
    },
  };
  eq(checkEvidence(good, nutrients, foods, sources).length, 0,
     "the new shape must validate clean");

  // A food with no match grade is a mapping nobody graded, which is the thing
  // the reviewed-mapping rule exists to prevent.
  assertHas(checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", cells: {} } },
    nutrients, foods, sources), "no match grade");

  assertHas(checkEvidence({ "oats-rolled-dry": { prep: "rolled, dry", match: "guessed", cells: {} } },
    nutrients, foods, sources), "unknown match grade");

  // Preparation is still the sharpest edge in this data, and the check moves up
  // a level with the field rather than disappearing.
  assertHas(checkEvidence({ "oats-rolled-dry": { prep: "boiled", match: "exact", cells: {} } },
    nutrients, foods, sources), "disagrees with the food's state");
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

console.log(results.join("\n"));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
