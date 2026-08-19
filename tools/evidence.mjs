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
import { reconcile, spanCell } from "./reconcile.mjs";
import { biotinCell } from "./biotin.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EV = join(ROOT, "tools", "evidence");
const rd = f => JSON.parse(readFileSync(join(EV, f), "utf8"));

/* The same slug the page uses. app.ts and build.mjs each carry their own copy
   because neither may gain an import; this is the tools' copy. */
const slugify = (name, state) => `${name} ${state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const map = rd("page-map-mext.json");
/* IFCT is quoted rather than carried. Its terms forbid storing part of the
   publication in electronic format to make a product, and holding both tables
   whole, 616 rows, to use seven foods was exactly that. What is left is the
   figures actually cited, one row per page food, the same shape the 33 other
   single papers here already use. See LICENCES.md. */
const ifctCited = rd("ifct-2017-cited.json");
const cofid = rd("cofid-2021-plant.json");

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

const cnfMap = rd("page-map-cnf.json");
const afcdMap = rd("page-map-afcd.json");
const cnf = rd("cnf.json");
const afcdDB = rd("afcd-r3-plant.json");  // the only read of it; indexed by key below
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
/* Cells removed rather than written, each with the reason. Printed at the end
   because a value leaving the page is a bigger event than one arriving. */
const dropped = [];

for (const p of map) {
  const slug = slugify(p.page, p.page_state);
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

  if (Object.keys(cells).length) {
    const e = grade(slug, "mext-2020", p.match, p.page_state);
    Object.assign(e.cells, cells);
  }
}

/* Biotin, over the union of the three maps rather than inside the loop over
   one of them.
 *
 * This used to sit inside the MEXT loop, which meant a food Japan never
 * assayed could not have a biotin cell whatever Britain and Australia held.
 * Walnuts, pistachios, brazil nuts and wholewheat pasta each carry an analysed
 * AFCD figure and had no route to the page. loadAttested in build.mjs already
 * read all three maps, so the checker and the generator held different views
 * of what evidence existed for this column. */
const mextBySlug = Object.fromEntries(map.map(p => [slugify(p.page, p.page_state), p]));
const biotinSlugs = new Set([
  ...Object.keys(mextBySlug),
  ...Object.keys(COFID_ROW),
  ...Object.keys(afcdMap),
]);
const conflicts = [];

for (const slug of biotinSlugs) {
  const mp = mextBySlug[slug];
  const cm = COFID_ROW[slug];
  const cf = cm && cofidByCode[cm.cofid_code];
  const am = afcdMap[slug];
  const af = am && afcdKeyBy[am.key];

  const cell = biotinCell({
    mext: mp && mp.biotin,
    cofid: cf,
    afcd: af,
  });
  if (!cell) continue;

  if (cell.conflict) { conflicts.push(`${slug}: ${JSON.stringify(cell.conflict)}`); delete cell.conflict; }

  /* A grade per source that the cell actually cites. A grade for a source no
     cell names is stripped at the end of this file anyway, but writing one
     here would claim a mapping was used when it was not. */
  const named = new Set([...(cell.sources || []), ...(cell.disputed || []).map(d => d.source)]);
  const prep = mp ? mp.page_state : undefined;
  if (named.has("mext-2020") && mp) grade(slug, "mext-2020", mp.match, prep);
  if (named.has("cofid-2021") && cm) grade(slug, "cofid-2021", cm.match, prep);
  if (named.has("afcd-r3") && am) grade(slug, "afcd-r3", am.match, prep);

  entryFor(slug, prep).cells.biotin = cell;
  nCells++;
  if (cell.state === "range") ranges++;
  if (cell.disputed) disputes++;
}

for (const p of ifctCited.values) {
  const slug = slugify(p.page, p.page_state);

  /* IFCT's own grade, kept beside MEXT's rather than yielding to it. This is
     where the two used to collide: whichever pass ran first set the food's one
     grade and the other's mapping inherited it. */
  grade(slug, "ifct-2017", p.match, p.page_state);

  const put = (component, value) => {
    if (typeof value !== "number") return;
    out[slug].cells[component] =
      reconcile([{ source: "ifct-2017", value, derivation: "analysed" }]);
    nCells++;
  };

  put("phytate", p.phytate_mg);
  /* Milligrams, so these belong in oxalate_sol and oxalate_insol and not in
     `oxalate`, which is a gram column carrying MEXT's oxalic acid. */
  put("oxalate_sol", p.oxalate_soluble_mg);
  put("oxalate_insol", p.oxalate_insoluble_mg);
}

/* Withdrawing a pairing has to be explicit. `out` is seeded from what is
   already on the page, which is what lets a pass this tool does not implement
   survive a run, and the same property means deleting a mapping quietly leaves
   its cell behind. Black-eyed peas carried a phytate of 1.63 mg for a year that
   way. Only a cell resting on IFCT alone is removed: where another source also
   attests it, the figure is not IFCT's to withdraw. */
for (const w of ifctCited.withdrawn ?? []) {
  const entry = out[slugify(w.page, w.page_state)];
  if (!entry) continue;
  for (const component of Object.keys(w.was ?? {})) {
    const name = { phytate_mg: "phytate", oxalate_soluble_mg: "oxalate_sol",
                   oxalate_insoluble_mg: "oxalate_insol" }[component];
    const cell = entry.cells[name];
    if (cell && cell.sources && cell.sources.length === 1
        && cell.sources[0] === "ifct-2017") {
      delete entry.cells[name];
      nCells--;
    }
  }
  delete entry.matches["ifct-2017"];
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
for (const [slug, entry] of Object.entries(afcdMap)) {
  if (!entry) continue;
  const { key, match } = entry;
  if (!key) continue;
  grade(slug, "afcd-r3", match);
  const row = afcdKeyBy[key];
  if (row) {
    /* One shape, whether the cell is new or already there. The two branches
       this replaced wrote a first cell as a literal carrying min, max and
       derivation, and the next pass rewrote it to reconcile's plainer shape,
       so the file was not a fixed point of the generator that wrote it. No
       food had ever hit it: it takes a newly mapped food reaching its first
       inulin cell, which is what roasted chestnuts did. */
    if (row.inulin_g !== undefined) {
      const val = num(row.inulin_g);
      if (val !== null) {
        out[slug].cells.inulin = reconcile([{ source: "afcd-r3", value: val, derivation: "analysed" }]);
        nCells++;
      }
    }
    if (row.oligosaccharides_g !== undefined) {
      const val = num(row.oligosaccharides_g);
      if (val !== null) {
        out[slug].cells.oligosaccharides = reconcile([{ source: "afcd-r3", value: val, derivation: "analysed" }]);
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

/* Three melatonin cells that name a source which does not contain them.
   Arnao and Hernandez-Ruiz 2018 tabulates phytomelatonin in ng/g and its list
   has no walnut and no pistachio row at all, while its tomato is 0.3 to 114
   ng/g fresh weight, which is 30 to 11,400 ng/100 g and nothing like the
   0.0001 filed under it here. All three came from literature-misc.json, whose
   rows carry one source string for a whole row and which this tool stopped
   reading for exactly that reason; these survived the sweep because each had
   been given a per-value citation that was never checked against the paper.
   All three also printed as 0.0 on the page, being four orders of magnitude
   below anything a melatonin assay can see. Walnut is re-derived from Verde
   below. The other two are dropped rather than converted, because the unit
   they are in can be guessed at but not established. */
for (const [slug, why] of [
  ["tomatoes-raw", "Arnao gives tomato as 0.3 to 114 ng/g fresh weight, not 0.0001 ng/100 g"],
  ["pistachios", "Arnao's table has no pistachio row"],
]) {
  if (out[slug]?.cells?.melatonin) { delete out[slug].cells.melatonin; dropped.push(`${slug}.melatonin: ${why}`); }
}

/* Verde 2022, melatonin in nuts. Fresh weight as published, so the only
   conversion is pg/g to ng/100 g. Four walnut cultivars were assayed and no
   one of them is the walnut, so that cell is a range over the whole spread,
   the same shape the FAO phytate release forced for foods it samples by
   cultivar. This pass owns melatonin for the foods it maps. */
const verde = rd("verde-2022-melatonin.json");
const ngPer100g = pgPerG => Number((pgPerG * 0.1).toFixed(4));
const byPage = {};
for (const row of verde.rows) {
  if (!row.page || typeof row.melatonin_pg_g !== "number") continue;
  (byPage[row.page] ||= { figures: [], match: row.match }).figures.push(row.melatonin_pg_g);
}
for (const [page, { figures, match }] of Object.entries(byPage)) {
  grade(page, "verde-2022", match);
  out[page].cells.melatonin = spanCell(figures.map(ngPer100g), ["verde-2022"]);
  nCells++;
}

/* Tanaka 2026, fermented soybean products. Only the analysed absences are
   taken: the table is in phylloquinone equivalents and this store holds actual
   masses, so a measured figure would have to be back-converted on an assumed
   molar equivalence, while an nd is an nd in either unit.

   Where a homologue already carries a figure, the absence is recorded as a
   dispute rather than written over it. A detection and a non-detection are not
   symmetrical, since the second rests on a limit of detection, which is how
   sauerkraut MK-4 already treats Sim. */
const tanaka = rd("tanaka-2026-vitamin-k.json");
for (const row of tanaka.rows) {
  if (!row.page) continue;
  for (const id of ["mk4", "mk7", "mk8", "mk9"]) {
    if (row[id] !== "nd") continue;
    grade(row.page, "tanaka-2026", row.match);
    const held = out[row.page].cells[id];
    /* A cell already admitting the absence is corroborated, not disputed: an
       analysed absence and a range that reaches down to nothing are the same
       finding, and natto MK-4 is already 0 to 3.3 over three sources. Only a
       claim that excludes zero is in conflict with an nd. */
    const admitsNone = held
      && (held.state === "not-detected" || (held.state === "range" && held.low <= 0));
    if (!held) { out[row.page].cells[id] = { state: "not-detected", sources: ["tanaka-2026"] }; nCells++; }
    else if (admitsNone) {
      if (!held.sources.includes("tanaka-2026")) held.sources.push("tanaka-2026");
    } else {
      const d = (held.disputed ||= []);
      if (!d.some(x => x.source === "tanaka-2026")) { d.push({ source: "tanaka-2026", value: 0 }); disputes++; }
    }
  }
}

/* TBCA's carbohydrate profile, a component-specific supplementary release
   separate from Brazil's ordinary nutrient tables. Resistant starch by
   AOAC 2002.02, per 100 g of edible portion, and unusually it prints each
   sample's moisture in the column beside the analyte, so the basis is
   checkable per row rather than taken on trust.

   Several foods appear twice at different boiling times, which is a spread of
   the same preparation rather than two foods, so those become a range. Only
   resistant starch is taken: the release also carries total fructans, and
   total fructans is not inulin. */
const tbca = rd("tbca-carbohydrate-2019.json");
const byPageRS = {};
for (const r of tbca.rows) (byPageRS[r.page] ||= { match: r.match, v: [] }).v.push(r.resstarch);
for (const [page, { match, v }] of Object.entries(byPageRS)) {
  grade(page, "tbca-carb-2019", match);
  const held = out[page].cells.resstarch;
  if (held && (held.sources || []).includes("tbca-carb-2019")) continue;
  const cell = spanCell(v, ["tbca-carb-2019"]);
  /* MEXT measured green peas at 1.6 and this release at 1.55, which is
     agreement rather than disagreement, so the cell names both and spans them
     rather than picking one. Where MEXT only recorded not-measured there is
     nothing to reconcile and the figure simply replaces the blank. */
  if (held && typeof held.value === "number") {
    out[page].cells.resstarch = spanCell([...v, held.value],
      [...new Set([...(held.sources || []), "tbca-carb-2019"])]);
    ranges++;
    continue;
  }
  out[page].cells.resstarch = cell;
  if (cell.state === "range") ranges++; else nCells++;
}

/* Kawabata and Sawayama 1973, which ends four rounds of failing to fill the
   pectin column. Twenty-four vegetables assayed fresh, open on J-STAGE, and
   reported against the fresh edible portion, which is already this store's
   basis. Every other pectin candidate died on peel, pomace or dry matter.

   The catch worth carrying: the analyte is total pectin as calcium pectate,
   summed over three sequential extractions, so it is operationally defined
   rather than a modern pectin assay. That is what these cells mean.

   Only raw page foods are mapped. The table also holds pumpkin, okra,
   aubergine, green beans, edamame, lotus root, taro, potato and yam, all of
   them cooked on this page, and a fresh figure on a cooked row is the mismatch
   refused everywhere else here. */
const kawabata = rd("kawabata-1973-pectin.json");
for (const row of kawabata.rows) {
  grade(row.page, "kawabata-1973", row.match);
  const held = out[row.page].cells.pectin;
  // Daikon was assayed in three parts along the root rather than once.
  const parts = row.parts ? Object.values(row.parts) : [row.total];
  const cell = spanCell(parts, ["kawabata-1973"]);
  /* Carrot already had a figure, EuroFIR's 1.7 g against this paper's 0.628.
     Two methods rather than two samples, and neither is the other's error, so
     the cell spans both and names both. */
  if (held && !(held.sources || []).includes("kawabata-1973") && typeof held.value === "number") {
    out[row.page].cells.pectin = spanCell([...parts, held.value],
      [...new Set([...(held.sources || []), "kawabata-1973"])]);
    ranges++;
    continue;
  }
  if (held && (held.sources || []).includes("kawabata-1973")) continue;
  out[row.page].cells.pectin = cell;
  if (cell.state === "range") ranges++; else nCells++;
}

/* The USDA and ODS-NIH glucosinolate database, Release 1, May 2026. The
   glucoraphanin column had two figures in it, both from a paper that does not
   say how its vegetables were prepared. This release states everything that
   one left open: fresh weight on its own header row, a molecular weight per
   compound, the preparation in the food description, and a cultivar, an n and
   a spread per row.

   The molecular weight matters more than it looks. Every other candidate for
   this column reports umol and leaves the mass to be inferred, and
   glucoraphanin is 437.5 as the free acid against 475.6 as the potassium salt.
   This workbook prints 437, so its milligrams are its own rather than ours.

   A food maps to many rows because the release samples cultivars, locations
   and storage regimes rather than foods, so the cell is a range over the means,
   the same shape the FAO phytate release forced. Where a figure was already
   held from somewhere else it is not thrown away: it is recorded as disputed
   beside the range, because a value whose preparation is unstated cannot be
   reconciled with one whose preparation is the whole point. */
const gsl = rd("usda-glucosinolate-r1.json");
/* grade() creates the entry when there is none, which most of these foods need:
   the raw vegetables were added to the page days ago and this is the first
   evidence any of them has carried. */
for (const f of gsl.foods) {
  grade(f.page, "usda-glucosinolate-r1", f.match);
  const held = out[f.page].cells.glucoraphanin;
  const cell = spanCell(f.means, ["usda-glucosinolate-r1"]);
  /* The dissent has to survive a second run. This pass rewrites the cell from
     the corpus every time, so on the next run it would read back its own range,
     find no displaced figure to record, and drop the disputed source it wrote
     the first time. Carrying it forward is what makes the pass idempotent, and
     the store is tested for being a fixed point of its own generator. */
  const ours = held && (held.sources || []).includes("usda-glucosinolate-r1");
  if (ours && held.disputed) cell.disputed = held.disputed;
  else if (held && !ours && typeof held.value === "number") {
    cell.disputed = (held.sources || []).map(s => ({ source: s, value: held.value }));
    disputes++;
  }
  out[f.page].cells.glucoraphanin = cell;
  if (cell.state === "range") ranges++; else nCells++;
}

/* Jensen 2025, which has sat here unused since it was ingested because not one
   of its 88 composite samples was a food on this page. The page gained a rye
   bread and now one of them is.

   This is the source that makes MK-10 a column with a figure in it rather than
   a column of absences, and it was never a sourcing problem: the data has been
   in this directory the whole time and the food list was what was missing.

   An absent vitamer in this paper is a result below the 0.1 ug/100 g limit of
   quantification it states for every one of them, so it is an analysed absence
   and not a gap. That is what fills MK-4 and MK-7 here. */
const jensen25 = rd("jensen-2025-vitamin-k.json");
for (const row of jensen25.rows) {
  if (!row.page) continue;
  grade(row.page, "jensen-2025", row.match);
  for (const id of ["mk4", "mk7", "mk8", "mk9", "mk10"]) {
    if (out[row.page].cells[id]) continue;
    out[row.page].cells[id] = typeof row[id] === "number"
      ? { state: "measured", value: row[id], sources: ["jensen-2025"] }
      : { state: "not-detected", sources: ["jensen-2025"] };
    nCells++;
  }
}

/* USDA FoodData Central Foundation Foods. Not SR Legacy, which defines
   beta-glucan and publishes zero rows of it: this is a separate release of
   individually analysed samples, per 100 g of the food as sold, which is
   already this store's basis and needs no conversion.

   Where a component is new to a food the released figure is taken. Where the
   page already holds one from somewhere else the cell becomes a range over
   both, because these disagreements are large and real rather than clerical:
   oyster mushroom ergothioneine is 0.95 mg to Halliwell's review and 14.0 mg
   across eight analysed samples here, and shiitake 1.29 against 11.06. A
   fifteen-fold spread is what this component does across samples, and saying
   so is worth more than picking the source that was here first. */
const fdc = rd("fdc-foundation-2026.json");
const FDC_IDS = ["beta-glucan", "ergothioneine", "raffinose", "stachyose"];
for (const row of fdc.rows) {
  if (!row.page) continue;
  grade(row.page, "usda-fdc-foundation", row.match);
  for (const id of FDC_IDS) {
    const found = row[id];
    if (!found || typeof found.amount !== "number") continue;
    const held = out[row.page].cells[id];
    /* Already applied. Without this the pass is not idempotent and a second run
       quietly destroys data: it reads back the range it wrote, finds its own
       figure at the top of it, sees no disagreement and collapses the cell to a
       lone measurement, dropping the source it was reconciled against. That is
       how Halliwell fell out of the shiitake and oyster ergothioneine cells
       between two runs of this tool. */
    if (held && (held.sources || []).includes("usda-fdc-foundation")) continue;
    const previous = held && (held.state === "measured" ? held.value : held.state === "range" ? held.high : null);
    if (typeof previous === "number" && Math.abs(previous - found.amount) > 1e-9) {
      const lo = Math.min(previous, held.low ?? previous, found.amount);
      const hi = Math.max(previous, found.amount);
      out[row.page].cells[id] = { state: "range", low: lo, high: hi,
        sources: [...new Set([...(held.sources || []), "usda-fdc-foundation"])] };
      ranges++;
    } else {
      out[row.page].cells[id] = { state: "measured", value: found.amount, sources: ["usda-fdc-foundation"] };
      nCells++;
    }
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
for (const d of dropped) console.log(`dropped ${d}`);
for (const c of conflicts) console.log(`biotin findings disagree, ${c}`);
