#!/usr/bin/env node
/**
 * Adds to src/data/evidence.json from the corpora in tools/evidence/.
 *
 * Phase 1 covers three components: soluble fibre and insoluble fibre, which
 * come from one source and need no reconciliation, and biotin, which needs all
 * four rules including ranges. That pairing is deliberate: the fibres prove the
 * rendering, biotin proves the reconciliation.
 *
 * Adds rather than rebuilds. It reads the existing file first and only writes
 * the passes below, because it does not know every source the page now draws
 * on: FAO phytate and the USDA proanthocyanidin release are joined through
 * their own reviewed maps and would be deleted by a wholesale rewrite. A
 * generator that silently narrows the data it regenerates is worse than one
 * that has to be told what it covers.
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

const afcdBy = Object.fromEntries(afcd.map(r => [r.name, r]));

const cnfMap = rd("page-map-cnf.json");
const afcdMap = rd("page-map-afcd.json");
const cnf = rd("cnf.json");
const afcdDB = rd("afcd-r3-plant.json"); // separate from afcdBy which uses name
const cnfBy = Object.fromEntries(cnf.map(r => [r.key, r]));
const afcdKeyBy = Object.fromEntries(afcdDB.map(r => [r.key, r]));

/* Seeded from what is already on the page, so a pass this tool does not
   implement survives a run of it. */
const DEST = join(ROOT, "src", "data", "evidence.json");
const out = JSON.parse(readFileSync(DEST, "utf8"));

/* One grade per source rather than one per food. A food is mapped once into
   each database and those mappings are not equally good: cooked lentils are
   MEXT's boiled-lentil row and IFCT's dry dhal. The single grade this replaced
   could only be right about one of them, and it was recorded as "exact", so the
   dry-basis figure reached the page with no proxy mark on it. */
const entryFor = (slug, prep) =>
  (out[slug] ||= { prep: prep || "as listed", matches: {}, cells: {} });
const grade = (slug, source, g, prep) => {
  const e = entryFor(slug, prep);
  if (g) e.matches[source] = g;
  return e;
};


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

/* Reviewed page -> AFCD names, for the biotin comparison. MEXT is mapped in
   page-map-mext.json and CoFID in page-map-cofid.json; this holds only what has
   no map file of its own. Every pair here was checked by hand against the
   database; automated name matching stays refused. */
const ALT = {
  "kidney-beans cooked":   { afcd: "Bean, red kidney, dried, boiled, drained" },
  "brown-rice cooked":     { afcd: "Rice, brown, boiled, no added salt" },
  "spinach raw":           { afcd: "Spinach, Mature English, fresh, raw" },
  "chickpeas cooked":      { afcd: "Chickpea, dried, boiled, drained" },
  "split-peas cooked":     { afcd: "Pea, split, dried, boiled, drained" },
};
/* CoFID's reviewed mapping, read from the file the build checks values against
   rather than copied here. The copy this replaced had drifted: it picked
   CoFID's parboiled "easy cook" brown rice where the map picks wholegrain, so
   the generator and the checker disagreed about the same food. */
const COFID_ROW = {};
for (const m of rd("page-map-cofid.json"))
  COFID_ROW[slugify(m.page, m.page_state)] = m;
const cofidByCode = Object.fromEntries(cofid.map(r => [r.code, r]));

const num = v => { const n = parseFloat(v); return Number.isNaN(n) ? null : n; };

/* A source cell that is not a number still carries meaning, and which meaning
   it carries is the most useful thing in this dataset. Never collapse these. */
function passthrough(state) {
  return state === "trace" || state === "not-detected" || state === "not-measured" ? state : null;
}

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
  const cm = COFID_ROW[slug];
  const cf = cm && cofidByCode[cm.cofid_code];
  if (cf) {
    grade(slug, "cofid-2021", cm.match, p.page_state);
    // "N" is CoFID's marker for a component it did not measure.
    const v = cf.biotin_ug === "N" ? null : num(cf.biotin_ug);
    if (v !== null) cands.push({ source: "cofid-2021", value: v, derivation: "analysed" });
  }
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

  if (Object.keys(cells).length) {
    const e = grade(slug, "mext-2020", p.match, p.page_state);
    Object.assign(e.cells, cells);
  }
}

for (const p of ifctMap) {
  if (!p.ifct_code) continue;
  const slug = slugify(p.page, p.page_state);
  
  /* IFCT's own grade, kept beside MEXT's rather than yielding to it. This is
     where the two used to collide: whichever pass ran first set the food's one
     grade and the other's mapping inherited it. */
  grade(slug, "ifct-2017", p.match, p.page_state);
  
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
         // Milligrams, so it belongs in oxalate_sol and not in `oxalate`,
         // which is a gram column carrying MEXT's oxalic acid.
         out[slug].cells.oxalate_sol = reconcile([{ source: "ifct-2017", value: val, derivation: "analysed" }]);
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

/* Single papers, each figure carrying the key of the paper it came from. An
   entry with no source key is skipped rather than filed under a catch-all: the
   catch-alls this replaced ("literature", "existing", "research-papers") were
   citations to nothing, and nothing in this repository could check them. */
const research = rd("research.json");
for (const [slug, cols] of Object.entries(research)) {
  for (const [colId, data] of Object.entries(cols)) {
    if (!data.source) continue;
    grade(slug, data.source, out[slug]?.matches?.[data.source] || "close");
    out[slug].cells[colId] = reconcile([{ source: data.source, value: data.v, derivation: "analysed" }]);
    nCells++;
  }
}


// AFCD integration
for (const p of Object.entries(afcdMap)) {
  const [slug, key] = p;
  if (!key) continue;
  grade(slug, "afcd-r3", out[slug]?.matches?.["afcd-r3"] || "exact");
  const row = afcdKeyBy[key];
  if (row) {
    if (row.inulin_g !== undefined) {
      const val = num(row.inulin_g);
      if (val !== null) {
        if (!out[slug].cells.inulin) out[slug].cells.inulin = { state: "measured", sources: ["afcd-r3"], value: val, min: val, max: val, derivation: "analysed" };
        else out[slug].cells.inulin = reconcile([{ source: "afcd-r3", value: val, derivation: "analysed" }]);
        nCells++;
      }
    }
    if (row.oligosaccharides_g !== undefined) {
      const val = num(row.oligosaccharides_g);
      if (val !== null) {
        if (!out[slug].cells.oligosaccharides) out[slug].cells.oligosaccharides = { state: "measured", sources: ["afcd-r3"], value: val, min: val, max: val, derivation: "analysed" };
        else out[slug].cells.oligosaccharides = reconcile([{ source: "afcd-r3", value: val, derivation: "analysed" }]);
        nCells++;
      }
    }
  }
}

// CNF integration
for (const p of Object.entries(cnfMap)) {
  const [slug, key] = p;
  if (!key) continue;
  grade(slug, "cnf", out[slug]?.matches?.cnf || "exact");
  const row = cnfBy[key];
  if (row) {
    if (row["Fructans (inulin)"] !== undefined) {
      const val = num(row["Fructans (inulin)"]);
      if (val !== null) {
        out[slug].cells.inulin = reconcile([{ source: "cnf", value: val, derivation: "analysed" }]);
        nCells++;
      }
    }
    if (row["Vitamin K (menaquinone-4)"] !== undefined) {
      const val = num(row["Vitamin K (menaquinone-4)"]);
      if (val !== null) {
        out[slug].cells.k2 = reconcile([{ source: "cnf", value: val, derivation: "analysed" }]);
        nCells++;
      }
    }
  }
}

/* Mattila 2001, the only food table here that carries CoQ9 as well as CoQ10,
   and the only source of either that reaches this page's vegetables and fruit
   rather than its oils. Printed in ug/g fresh weight and stored in mg/100 g,
   so every figure is scaled by a tenth and rounded back to kill the float
   noise that 0.04 * 0.1 otherwise leaves behind.

   Never writes over another paper's figure. Mattila's CoQ10 disagrees with
   Fine 2016 on rapeseed oil and with Kubo 2008 on orange, and neither
   disagreement is this pass's to settle: it takes the CoQ9 column, which no
   other source here has anything to say about, and leaves the CoQ10 cells to
   the sources that already hold them. The one exception is a cell already
   citing Mattila alone, which this pass owns and may correct. */
const mattila = rd("mattila-2001-coq.json");
const toPageUnit = ugPerG => Number((ugPerG * 0.1).toFixed(6));
for (const row of mattila.rows) {
  if (!row.page) continue;
  grade(row.page, "mattila-2001", row.match);
  for (const id of ["coq9", "coq10"]) {
    const c = row[id];
    if (!c) continue;
    const held = out[row.page].cells[id];
    const ours = held && (held.sources || []).length === 1 && held.sources[0] === "mattila-2001";
    if (held && !ours) continue;
    if (c.state === "measured")
      out[row.page].cells[id] = { state: "measured", value: toPageUnit(c.ug_g), sources: ["mattila-2001"] };
    /* An absence with no limit of detection behind it. Weaker than Jensen's
       below-LOQ results and recorded all the same, because a column of
       analysed absences is what CoQ9 in plant food actually looks like. */
    else if (c.state === "not-detected")
      out[row.page].cells[id] = { state: "not-detected", sources: ["mattila-2001"] };
    else continue;
    nCells++;
  }
}

/* literature.json and literature-misc.json used to be read here. Both were
   compilations with no citation per value: literature-misc.json recorded a
   source of "USDA/Milder2005/PhyFoodComp" for a whole row, and its figures
   disagreed with all three. Every value they supplied has been re-derived from
   a named source or dropped, and reading them again would put the unsourced
   ones straight back. */

/* A grade for a source no cell cites, and an entry with no cells at all, are
   both mappings that reach nothing. They accumulate every run, because a map
   file names foods this tool finds no figures for. */
for (const [slug, entry] of Object.entries(out)) {
  const cited = new Set();
  for (const c of Object.values(entry.cells)) for (const k of c.sources || []) cited.add(k);
  for (const c of Object.values(entry.cells)) for (const d of c.disputed || []) cited.add(d.source);
  for (const k of Object.keys(entry.matches)) if (!cited.has(k)) delete entry.matches[k];
  if (!Object.keys(entry.cells).length) delete out[slug];
}

writeFileSync(DEST, JSON.stringify(out, null, 1) + "\n");
console.log(`${Object.keys(out).length} foods, ${nCells} cells, ${ranges} ranges, ${disputes} with a disputed source`);
