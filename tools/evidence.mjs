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
const ifctMap = rd("page-map-ifct.json");
const ifct11 = rd("ifct-2017-table11.json");
const ifct9 = rd("ifct-2017-table9.json");
const ifct11By = Object.fromEntries(ifct11.map(r => [r.code, r]));
const ifct9By = Object.fromEntries(ifct9.map(r => [r.code, r]));
const cofid = rd("cofid-2021-plant.json");
const afcd = rd("afcd-r3-plant.json");

const CORPORA = {
  fibre:  rd("mext-2020-fibre.json"),
  plant:  rd("mext-2020-plant.json"),
  sugars: rd("mext-2020-sugars.json"),
  acids:  rd("mext-2020-organic-acids.json"),
};
/* All four Japanese corpora key on the same food code, which is what makes one
   loop over the reviewed mappings enough. */
const BY_CODE = Object.fromEntries(Object.entries(CORPORA)
  .map(([k, rows]) => [k, Object.fromEntries(rows.map(r => [r.code, r]))]));

const cofidBy = Object.fromEntries(cofid.map(r => [r.name, r]));
const afcdBy = Object.fromEntries(afcd.map(r => [r.name, r]));

const cnfMap = rd("page-map-cnf.json");
const afcdMap = rd("page-map-afcd.json");
const cnf = rd("cnf.json");
const afcdDB = rd("afcd-r3-plant.json"); // separate from afcdBy which uses name
const cnfBy = Object.fromEntries(cnf.map(r => [r.key, r]));
const afcdKeyBy = Object.fromEntries(afcdDB.map(r => [r.key, r]));
const literature = rd("literature.json");


/* The uniform components: one source, one field, one cell. Biotin is not here
   and stays hand-written below, because it is the only multi-source component
   and the shape of a multi-source declaration is not knowable until the AFCD
   and IFCT mappings exist. This table covers what is uniform. */
const COMPONENTS = [
  { id: "solfibre",     corpus: "fibre",  field: "sol_prosky" },
  { id: "insolfibre",   corpus: "fibre",  field: "insol_prosky" },
  { id: "resstarch",    corpus: "fibre",  field: "resistant_starch" },
  { id: "mo",           corpus: "plant",  field: "mo" },
  { id: "iodine",       corpus: "plant",  field: "iodine" },
  { id: "cr",           corpus: "plant",  field: "cr" },
  { id: "starch",       corpus: "sugars", field: "starch" },
  { id: "glucose",      corpus: "sugars", field: "glucose" },
  { id: "fructose",     corpus: "sugars", field: "fructose" },
  { id: "sucrose",      corpus: "sugars", field: "sucrose" },
  { id: "maltose",      corpus: "sugars", field: "maltose" },
  { id: "sorbitol",     corpus: "sugars", field: "sorbitol" },
  { id: "mannitol",     corpus: "sugars", field: "mannitol" },
  { id: "organicacids", corpus: "acids",  field: "total_oa" },
  { id: "citric",       corpus: "acids",  field: "citric" },
  { id: "malic",        corpus: "acids",  field: "malic" },
  { id: "quinic",       corpus: "acids",  field: "quinic" },
  { id: "oxalate",      corpus: "acids",  field: "oxalic" },
];

/* MEXT prints a calculated figure in parentheses and the extractor kept the
   string without parsing it, so every one of these arrived with value null.
   The parentheses are the source saying "calculated, not assayed", which is
   what state estimated means, so the figure is recovered here rather than
   dropped. Returns null for anything that is not a parenthesised number. */
const bracketed = raw => {
  const m = /^\(\s*([\d.]+)\s*\)$/.exec(String(raw ?? "").trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isNaN(n) ? null : n;
};

/* The figure a cell carries, whichever way the extractor recorded it. Never
   substitutes a value for a missing one: a null here means no figure, and the
   caller must drop the cell rather than write a zero. */
const figureOf = c => c.value !== null && c.value !== undefined ? c.value : bracketed(c.raw);

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

  for (const comp of COMPONENTS) {
    const row = BY_CODE[comp.corpus][p.jp_code];
    const c = row && row[comp.field];
    if (!c) continue;                        // no entry at all, which is no data
    const through = passthrough(c.state);
    if (through) { cells[comp.id] = { state: through, sources: ["mext-2020"] }; nCells++; continue; }
    if (c.state !== "measured" && c.state !== "estimated") continue;
    const value = figureOf(c);
    if (value === null) continue;            // a state that carries no figure
    cells[comp.id] = reconcile([{ source: "mext-2020", value,
      derivation: c.state === "estimated" ? "estimated" : "analysed" }]);
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

for (const p of ifctMap) {
  if (!p.ifct_code) continue;
  const slug = slugify(p.page, p.page_state);
  
  if (!out[slug]) {
    out[slug] = { prep: p.page_state || "as listed", match: p.match, cells: {} };
  } else if (p.match === "proxy") {
    // If the main food was exact but this is proxy, or both proxy, we just append to the existing object
    // Note: MEXT match might be "exact" and IFCT "proxy". For simplicity, we just use the existing one.
  }
  
  // extract from table 11
  const t11 = ifct11By[p.ifct_code];
  if (t11 && t11.phytate_mg) {
     const val = num(t11.phytate_mg.mean);
     if (val !== null) {
       out[slug].cells.phytate = reconcile([{ source: "ifct-2017", value: val, derivation: "analysed" }]);
       nCells++;
     }
  }

  // extract from table 9
  const t9 = ifct9By[p.ifct_code];
  if (t9) {
     if (t9.oxalate_soluble_mg) {
       const val = num(t9.oxalate_soluble_mg.mean);
       if (val !== null) {
         out[slug].cells.oxalate = reconcile([{ source: "ifct-2017", value: val, derivation: "analysed" }]);
         nCells++;
       }
     }
     if (t9.oxalate_insoluble_mg) {
       const val = num(t9.oxalate_insoluble_mg.mean);
       if (val !== null) {
         out[slug].cells.oxalate_insol = reconcile([{ source: "ifct-2017", value: val, derivation: "analysed" }]);
         nCells++;
       }
     }
  }
}

const research = rd("research.json");
for (const [slug, cols] of Object.entries(research)) {
  if (!out[slug]) {
    out[slug] = { prep: "as listed", match: "proxy", cells: {} };
  }
  for (const [colId, data] of Object.entries(cols)) {
    // We treat research data as analyzed literature values
    out[slug].cells[colId] = reconcile([{ source: data.source || "research-papers", value: data.v, derivation: "analysed" }]);
    nCells++;
  }
}


// AFCD integration
for (const p of Object.entries(afcdMap)) {
  const [slug, key] = p;
  if (!key) continue;
  if (!out[slug]) out[slug] = { prep: "as listed", match: "exact", cells: {} };
  const row = afcdKeyBy[key];
  if (row) {
    if (row.inulin_g !== undefined) {
      const val = num(row.inulin_g);
      if (val !== null) {
        if (!out[slug].cells.inulin) out[slug].cells.inulin = { state: "measured", sources: ["afcd-r3"], value: val, min: val, max: val, derivation: "analysed" };
        else out[slug].cells.inulin = reconcile([{ source: "afcd-r3", value: val, derivation: "analysed" }, { source: out[slug].cells.inulin.sources[0] || "existing", value: out[slug].cells.inulin.value, derivation: "analysed" }]);
        nCells++;
      }
    }
    if (row.oligosaccharides_g !== undefined) {
      const val = num(row.oligosaccharides_g);
      if (val !== null) {
        if (!out[slug].cells.oligosaccharides) out[slug].cells.oligosaccharides = { state: "measured", sources: ["afcd-r3"], value: val, min: val, max: val, derivation: "analysed" };
        else out[slug].cells.oligosaccharides = reconcile([{ source: "afcd-r3", value: val, derivation: "analysed" }, { source: out[slug].cells.oligosaccharides.sources[0] || "existing", value: out[slug].cells.oligosaccharides.value, derivation: "analysed" }]);
        nCells++;
      }
    }
  }
}

// CNF integration
for (const p of Object.entries(cnfMap)) {
  const [slug, key] = p;
  if (!key) continue;
  if (!out[slug]) out[slug] = { prep: "as listed", match: "exact", cells: {} };
  const row = cnfBy[key];
  if (row) {
    if (row["Fructans (inulin)"] !== undefined) {
      const val = num(row["Fructans (inulin)"]);
      if (val !== null) {
        const existing = out[slug].cells.inulin ? [{ source: "existing", value: out[slug].cells.inulin.value, derivation: "analysed" }] : [];
        out[slug].cells.inulin = reconcile([...existing, { source: "cnf", value: val, derivation: "analysed" }]);
        nCells++;
      }
    }
    if (row["Vitamin K (menaquinone-4)"] !== undefined) {
      const val = num(row["Vitamin K (menaquinone-4)"]);
      if (val !== null) {
        const existing = out[slug].cells.k2 ? [{ source: "existing", value: out[slug].cells.k2.value, derivation: "analysed" }] : [];
        out[slug].cells.k2 = reconcile([...existing, { source: "cnf", value: val, derivation: "analysed" }]);
        nCells++;
      }
    }
  }
}

// Literature integration
for (const lit of literature) {
  const slug = lit.key;
  if (!out[slug]) out[slug] = { prep: "as listed", match: "exact", cells: {} };
  
  if (lit.boron !== undefined) {
    const existing = out[slug].cells.boron ? [{ source: "existing", value: out[slug].cells.boron.value, derivation: "analysed" }] : [];
    out[slug].cells.boron = reconcile([...existing, { source: "literature", value: lit.boron, derivation: "analysed" }]);
    nCells++;
  }
  if (lit.inositol !== undefined) {
    const existing = out[slug].cells["inositol-free"] ? [{ source: "existing", value: out[slug].cells["inositol-free"].value, derivation: "analysed" }] : [];
    out[slug].cells["inositol-free"] = reconcile([...existing, { source: "literature", value: lit.inositol, derivation: "analysed" }]);
    nCells++;
  }
  if (lit.lignans !== undefined) {
    const existing = out[slug].cells.lignans ? [{ source: "existing", value: out[slug].cells.lignans.value, derivation: "analysed" }] : [];
    out[slug].cells.lignans = reconcile([...existing, { source: "literature", value: lit.lignans, derivation: "analysed" }]);
    nCells++;
  }
}

writeFileSync(join(ROOT, "src", "data", "evidence.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`${Object.keys(out).length} foods, ${nCells} cells, ${ranges} ranges, ${disputes} with a disputed source`);
