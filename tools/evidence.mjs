#!/usr/bin/env node
/**
 * Builds src/data/evidence.json from the corpora in tools/evidence/.
 *
 * Phase 1 covers three components: soluble fibre and insoluble fibre, which
 * come from one source and need no reconciliation, and biotin, which needs all
 * four rules including ranges. That pairing is deliberate: the fibres prove the
 * rendering, biotin proves the reconciliation.
 *
 * Run: node tools/evidence.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gradeDerivation, reconcile } from "./reconcile.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EV = join(ROOT, "tools", "evidence");
const rd = f => JSON.parse(readFileSync(join(EV, f), "utf8"));

/* The same slug the page uses. app.ts and build.mjs each carry their own copy
   because neither may gain an import; this is the tools' copy. */
const slugify = (name, state) => `${name} ${state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const map = rd("page-map-mext.json");
const fibre = rd("mext-2020-fibre.json");
const cofid = rd("cofid-2021-plant.json");
const afcd = rd("afcd-r3-plant.json");

const fibreBy = Object.fromEntries(fibre.map(r => [r.code, r]));
const cofidBy = Object.fromEntries(cofid.map(r => [r.name, r]));
const afcdBy = Object.fromEntries(afcd.map(r => [r.name, r]));

/* Reviewed page -> CoFID and AFCD names, for the biotin comparison. MEXT is
   already mapped in page-map-mext.json. Every pair here was checked by hand
   against both databases; automated name matching stays refused. */
const ALT = {
  "lentils cooked":        { cofid: "Lentils, green and brown, whole, dried, boiled in unsalted water" },
  "kidney-beans cooked":   { cofid: "Beans, red kidney, dried, boiled in unsalted water",
                             afcd: "Bean, red kidney, dried, boiled, drained" },
  "mung-beans cooked":     { cofid: "Beans, mung, whole, dried, boiled in unsalted water" },
  "black-eyed-peas cooked":{ cofid: "Beans, blackeye, whole, dried, boiled in unsalted water" },
  "broad-beans cooked":    { cofid: "Beans, broad, whole, boiled in unsalted water" },
  "brown-rice cooked":     { cofid: "Rice, brown, easy cook, boiled in unsalted water",
                             afcd: "Rice, brown, boiled, no added salt" },
  "spinach raw":           { cofid: "Spinach, baby, raw", afcd: "Spinach, Mature English, fresh, raw" },
  "broccoli cooked":       { cofid: "Broccoli, green, boiled in unsalted water" },
  "banana":                { cofid: "Bananas, flesh only" },
  "avocado":               { cofid: "Avocado, Hass, flesh only" },
  "carrots raw":           { cofid: "Carrots, old, raw" },
  "onions raw":            { cofid: "Onions, raw" },
  "potato baked, with skin": { cofid: "Potatoes, old, baked, flesh and skin" },
  "chickpeas cooked":      { afcd: "Chickpea, dried, boiled, drained" },
  "split-peas cooked":     { afcd: "Pea, split, dried, boiled, drained" },
};

const num = v => { const n = parseFloat(v); return Number.isNaN(n) ? null : n; };

/* A source cell that is not a number still carries meaning, and which meaning
   it carries is the most useful thing in this dataset. Never collapse these. */
function passthrough(state) {
  return state === "trace" || state === "not-detected" || state === "not-measured" ? state : null;
}

const out = {};
// Named apart from the per-food `cells` object below, which needs the name
// the loop body reads and writes at every step.
let nCells = 0, ranges = 0, disputes = 0;

for (const p of map) {
  const slug = slugify(p.page, p.page_state);
  const alt = ALT[`${slugify(p.page, "")} ${p.page_state}`.trim()] || {};
  const cells = {};

  const fib = fibreBy[p.jp_code];
  for (const [id, field] of [["solfibre", "sol_prosky"], ["insolfibre", "insol_prosky"]]) {
    const c = fib && fib[field];
    if (!c) continue;
    const through = passthrough(c.state);
    if (through) { cells[id] = { state: through, sources: ["mext-2020"] }; nCells++; continue; }
    if (c.state !== "measured" && c.state !== "estimated") continue;
    const cell = reconcile([{ source: "mext-2020", value: c.value, derivation: c.state === "estimated" ? "estimated" : "analysed" }]);
    cells[id] = cell;
    nCells++;
  }

  // biotin, from up to three sources
  const cands = [];
  if (p.biotin.state === "measured") cands.push({ source: "mext-2020", value: p.biotin.value, derivation: "analysed" });
  const cf = alt.cofid && cofidBy[alt.cofid];
  if (cf) { const v = num(cf.biotin_ug); if (v !== null) cands.push({ source: "cofid-2021", value: v, derivation: "analysed" }); }
  const af = alt.afcd && afcdBy[alt.afcd];
  if (af) { const v = num(af.biotin_ug); if (v !== null) cands.push({ source: "afcd-r3", value: v, derivation: gradeDerivation(af.derivation) }); }

  if (cands.length) {
    const cell = reconcile(cands);
    cells.biotin = cell;
    nCells++;
    if (cell.state === "range") ranges++;
    if (cell.disputed) disputes++;
  } else {
    const through = passthrough(p.biotin.state);
    if (through) { cells.biotin = { state: through, sources: ["mext-2020"] }; nCells++; }
  }

  if (Object.keys(cells).length)
    out[slug] = { prep: p.page_state || "as listed", match: p.match, cells };
}

writeFileSync(join(ROOT, "src", "data", "evidence.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`${Object.keys(out).length} foods, ${nCells} cells, ${ranges} ranges, ${disputes} with a disputed source`);
