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

let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try { fn(); passed++; results.push(`  PASS  ${name}`); }
  catch (e) { failed++; results.push(`  FAIL  ${name}\n          ${e.message}`); }
}
const eq = (a, b, msg) => {
  if (!Object.is(a, b)) throw new Error(`${msg}, expected ${b}, got ${a}`);
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

console.log(results.join("\n"));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
