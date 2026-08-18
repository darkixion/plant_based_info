#!/usr/bin/env node
/**
 * Reassembles src/ into a single self-contained index.html.
 *
 * The whole point of this project is a page you can open from disk, email to
 * someone, or serve from GitHub Pages with no server and no network calls. So
 * the build has no dependencies and does exactly one thing: inline everything.
 */
import { readFile, writeFile, watch } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "index.html");

const SOURCES = {
  html: join(SRC, "index.html"),
  // Compiled and minified by esbuild, like dist/app.js and for the same
  // reasons: build.mjs may import nothing but node:*, so the minifier runs as
  // its own npm script and this only inlines the result. `npm run watch`
  // watches src/, so editing styles.css during a watch session needs a fresh
  // `npm run compile` too, or this keeps inlining the stale build.
  css: join(ROOT, "dist", "styles.css"),
  // A separately compiled file, not read from src/. `npm run watch` only
  // watches src/, so editing the app's source during a watch session needs
  // a fresh `npm run compile` too, or this keeps inlining the stale build.
  app: join(ROOT, "dist", "app.js"),
  data: join(SRC, "data", "nutrients.json"),
  icons: join(SRC, "data", "icons.json"),
  portions: join(SRC, "data", "portions.json"),
  interactions: join(SRC, "data", "interactions.json"),
  preparation: join(SRC, "data", "preparation.json"),
  gaps: join(SRC, "data", "gaps.json"),
  evidence: join(SRC, "data", "evidence.json"),
  sourceList: join(SRC, "data", "sources.json"),
};

/** `</script>` inside an inlined string would close the tag early. `\/` is a
 *  valid JSON escape and an identical JS string, so this is safe to always do. */
const safeJSON = (obj) => JSON.stringify(obj).replace(/<\//g, "<\\/");

/** Replacement must be a function: the CSS and JS both contain `$`, which
 *  String.replace would otherwise interpret as a capture-group reference. */
const inject = (src, token, value) => {
  if (!src.includes(token)) throw new Error(`template is missing ${token}`);
  return src.replace(token, () => value);
};

/* ---- evidence cells ----
   The states an evidence cell may carry. Six, because "no number" means six
   different things and collapsing them throws away the best thing this data
   says: a component assayed and found absent is a finding, and a component
   nobody assayed is evidence of nothing. A food with no entry at all has no
   data, which is a seventh thing again and is represented by absence. */
const EV_STATES = new Set(["measured", "range", "trace", "not-detected", "estimated", "not-measured"]);
const EV_MATCH = new Set(["exact", "close", "proxy"]);

/* Evidence columns that are a named part of another evidence column, as
   part -> total. Only pairs where one is definitionally inside the other: MK-7
   is one menaquinone among the total, glucoraphanin one glucosinolate among
   theirs. The sum may fall short of the total, since neither list is complete,
   but no part may exceed it. */
const EV_SUBSET = {
  glucoraphanin: "glucosinolates",
  mk4: "k2", mk7: "k2", mk8: "k2", mk9: "k2", mk10: "k2",
};

/* Two figures agree when they are the same figure. Tight on purpose: the cells
   this rule exists to catch missed their source by one to nine per cent, which
   is close enough to read as a rounding difference and far enough to be a
   different measurement. Only true rounding is forgiven. */
const attests = (mine, theirs) => Math.abs(mine - theirs) <= 0.0005 + Math.abs(theirs) * 1e-9;

/** Exported so test/tools.mjs can exercise it without a build. Every rule here
 *  refuses a shape that would render as plausible data rather than as an error,
 *  which is the same standard the notes and portions checks above are held to.
 *
 *  `attested` is what the corpora in tools/evidence actually say, as
 *  source -> food slug -> component -> figure, and is how a value gets held to
 *  the database it cites rather than only to its own plausibility. It is
 *  deliberately partial: a source absent from it has no corpus here and no cell
 *  citing it can be checked, which is a gap in the evidence rather than a fault
 *  in the data. Absence of the *food* under a source that is present is a
 *  fault, because it means the cell reached a database no reviewed map connects
 *  it to. */
export function checkEvidence(evidence, nutrients, foods, sources, attested = {}) {
  const problems = [];
  const slug = f => `${f.name} ${f.state || ""}`.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bySlug = new Map(foods.map(f => [slug(f), f]));
  const evIds = new Set(nutrients.filter(n => n.evidence).map(n => n.id));

  for (const [foodSlug, entry] of Object.entries(evidence || {})) {
    const food = bySlug.get(foodSlug);
    if (!food) { problems.push(`evidence for unknown food "${foodSlug}"`); continue; }

    /* The mappings, one per source rather than one per food. A food is mapped
       once into each database it draws on and those mappings are not equally
       good, so a single grade could only be right about one of them. Preparation
       is the sharpest edge in this data: a correct value against the wrong
       preparation is worse than none, because it looks right. */
    const grades = entry.matches || {};
    for (const [source, grade] of Object.entries(grades))
      if (!EV_MATCH.has(grade))
        problems.push(`evidence ${foodSlug}: unknown match grade "${grade}" for ${source}`);
    const state = (food.state || "as listed").toLowerCase();
    if (entry.prep && entry.prep.toLowerCase() !== state && entry.prep.toLowerCase() !== "as listed")
      problems.push(`evidence ${foodSlug}: prep "${entry.prep}" disagrees with the food's state "${food.state || ""}"`);

    for (const [id, c] of Object.entries(entry.cells || {})) {
      const at = `evidence ${foodSlug}.${id}`;
      // Unknown covers both halves deliberately: a component with no column and
      // a column that is not an evidence column are the same mistake, a figure
      // put somewhere the page will not read it from.
      if (!evIds.has(id)) { problems.push(`${at}: unknown component`); continue; }
      if (!EV_STATES.has(c.state)) { problems.push(`${at}: unknown state "${c.state}"`); continue; }

      const carries = c.state === "measured" || c.state === "range" || c.state === "estimated";
      if (carries) {
        if (!Array.isArray(c.sources) || !c.sources.length)
          problems.push(`${at}: a value with no source`);
        else for (const s of c.sources) {
          if (!sources[s]) problems.push(`${at}: unknown source "${s}"`);
          // The label the dialog prints beside the figure. Without one it fell
          // back to the source key, so the page read "· milder-2005" where it
          // meant to name a country or a paper.
          else if (!sources[s].short) problems.push(`${at}: source "${s}" has no short label`);
          /* Every source a figure rests on must be graded, because the page
             decides the proxy mark per cell from the cell's own sources. An
             ungraded one would show unmarked, which is the failure that let
             IFCT's dry-basis phytate sit on cooked rows looking exact. */
          if (!grades[s]) problems.push(`${at}: no match grade for ${s}`);
        }
      }
      if ((c.state === "measured" || c.state === "estimated") && typeof c.value !== "number")
        problems.push(`${at}: ${c.state} with no value`);
      /* A fraction of a total that exceeds it. The same check the fat columns
         in `v` already get, and for the same reason: the two figures look
         individually plausible and only disagree when compared, which is the
         signature of a food whose two cells came from samples that cannot both
         describe it. Evidence columns were outside that check until a
         glucoraphanin figure of 89 mg met a recorded 61.7 mg of total
         glucosinolates on the same row. */
      const total = EV_SUBSET[id] && entry.cells[EV_SUBSET[id]];
      // Compared at the top of each, since a range's upper bound is the most
      // the cell claims and the most the total is allowed to be short of.
      const most = x => (x?.state === "range" ? x.high : x?.value);
      /* Only within one source. A part exceeding its total is impossible in one
         set of samples and merely a disagreement across two: broccoli's total
         glucosinolates are a UK literature mean and its glucoraphanin a
         cultivar screen elsewhere, and holding the second against the first
         would refuse a real measurement on the strength of an unrelated one.
         Same source, though, and the food cannot contain more of a part than of
         the whole it belongs to. */
      const shared = total && (c.sources || []).some(s => (total.sources || []).includes(s));
      if (shared && typeof most(total) === "number" && typeof most(c) === "number"
          && most(c) > most(total) * 1.01 + 0.005)
        problems.push(`${at}: ${most(c)} exceeds ${EV_SUBSET[id]} ${most(total)}, which it is part of`);

      if (c.state === "range") {
        if (typeof c.low !== "number" || typeof c.high !== "number")
          problems.push(`${at}: range with no bounds`);
        else if (!(c.high > c.low))
          problems.push(`${at}: range bounds are equal or inverted, which means reconciliation was skipped`);
        /* A range may carry its own centre, and the page reads and sorts on
           that rather than on the midpoint of the bounds, which is wrong
           wherever the samples are not symmetric: raw broccoli's glucoraphanin
           spans 1.19 to 217.9 over 210 cultivar means with a median of 23.85,
           and it used to sort at 109.5, above every other food in the column,
           on a figure nobody measured. Required below, where the figures are
           known, since only three or more of them make a median. */
        if (c.median !== undefined && typeof c.median !== "number")
          problems.push(`${at}: median is not a number`);
        else if (typeof c.median === "number" && (c.median < c.low - 0.0005 || c.median > c.high + 0.0005))
          problems.push(`${at}: median ${c.median} is outside its own range ${c.low} to ${c.high}`);
      }

      /* What the sources this cell names actually say, for the ones a corpus
         here can answer for. Collected before any comparison because the rule
         differs by how many answered: one figure must be reproduced exactly,
         several are being reconciled and only bound the answer. */
      if (!carries) continue;
      const found = [];
      for (const s of c.sources || []) {
        const corpus = attested[s];
        if (!corpus) continue;
        const row = corpus[foodSlug];
        if (!row) { problems.push(`${at}: cites ${s} but there is no ${s} row mapped to this food`); continue; }
        /* An array where a corpus samples the same food many times over: FAO's
           phytate release carries a row per cultivar and treatment rather than
           one per food, so the source attests a spread rather than a figure and
           every part of it counts. */
        const figures = Array.isArray(row[id]) ? row[id] : [row[id]];
        if (!figures.length || figures.some(f => typeof f !== "number"))
          { problems.push(`${at}: the ${s} row for this food carries no ${id}`); continue; }
        for (const figure of figures) found.push({ source: s, figure });
      }
      if (!found.length) continue;

      if (c.state === "range") {
        // A range names the breadth of a disagreement, so it has to contain the
        // disagreement. One that excludes a source it credits has quietly
        // dropped that source's finding while keeping its name.
        for (const { source, figure } of found)
          if (figure < c.low - 0.0005 || figure > c.high + 0.0005)
            problems.push(`${at}: range ${c.low} to ${c.high} excludes ${source}'s ${figure}`);
        /* Three figures or more make a median, and then the cell must carry
           one: without it the page falls back to the midpoint of the bounds,
           which is the centre of the interval rather than of the evidence.
           Only required, never forbidden. This index is deliberately partial,
           so a cell can rest on more figures than are visible here: cooked
           green peas span TBCA's two samples and MEXT's one, and only MEXT is
           indexed, which makes its median look like it came from a single
           figure. Whether a median is meaningful is decided where the figures
           are, in spanCell and reconcile. */
        if (found.length > 2 && typeof c.median !== "number")
          problems.push(`${at}: a range over ${found.length} attested figures with no median, so the page would sort it on the midpoint of its bounds`);
      } else if (found.length === 1) {
        if (!attests(c.value, found[0].figure))
          problems.push(`${at}: ${c.value} disagrees with ${found[0].source}, which says ${found[0].figure}`);
      } else {
        // Several sources: the value is a reconciliation and equals none of
        // them by design, but it can never leave the span they establish.
        const lo = Math.min(...found.map(f => f.figure));
        const hi = Math.max(...found.map(f => f.figure));
        if (c.value < lo - 0.0005 || c.value > hi + 0.0005)
          problems.push(`${at}: ${c.value} is outside the ${lo} to ${hi} its sources attest`);
      }
    }
  }
  return problems;
}

/* ---------- what the corpora actually say ----------
   Reads tools/evidence back into the shape checkEvidence holds cells against:
   source -> food slug -> component -> figure. The evidence store is the raw
   material the page's cells are drawn from, so reading it here closes the loop
   between the two: a value can no longer drift from the row it came from, and
   a citation can no longer be attached to a database that never held it.

   Only sources with both a corpus file and a reviewed page map appear. That
   partiality is the point and is documented on checkEvidence: unlisted sources
   are single papers with nothing here to check them against, and inventing a
   verdict for them would be worse than admitting there is none. */
const EV_DIR = join(ROOT, "tools", "evidence");
const readCorpus = name => {
  const path = join(EV_DIR, name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
};
const evSlug = (page, state) => `${page} ${state || ""}`.toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/* MEXT prints an estimated figure in parentheses and a trace as "Tr", so the
   parsed rows keep `value` null for everything that is not a plain number and
   the figure has to come back off `raw`. A cell whose state carries no figure
   is never compared, so only the numeric states need to resolve. */
const rawFigure = field => {
  if (!field) return undefined;
  if (typeof field.value === "number") return field.value;
  const m = /-?\d+(\.\d+)?/.exec(String(field.raw ?? ""));
  return m ? Number(m[0]) : undefined;
};

export function loadAttested() {
  const out = {};
  const put = (source, slug, id, figure) => {
    if (typeof figure !== "number" || Number.isNaN(figure)) return;
    ((out[source] ||= {})[slug] ||= {})[id] = figure;
  };
  /* Registering the food even when no component resolves is deliberate: it is
     what separates "this database has nothing to say about that component"
     from "no reviewed map reaches this food at all", and those are different
     faults with different fixes. */
  const reach = (source, slug) => { (out[source] ||= {})[slug] ||= {}; };

  // MEXT, across its four tables, joined on the Japanese food code.
  const mextMap = readCorpus("page-map-mext.json");
  if (mextMap) {
    const table = (file, cols) => {
      const rows = readCorpus(file);
      if (!rows) return;
      const byCode = new Map(rows.map(r => [r.code, r]));
      for (const m of mextMap) {
        const slug = evSlug(m.page, m.page_state);
        reach("mext-2020", slug);
        const row = byCode.get(m.jp_code);
        if (!row) continue;
        for (const [id, field] of Object.entries(cols)) put("mext-2020", slug, id, rawFigure(row[field]));
      }
    };
    table("mext-2020-plant.json", { biotin: "biotin", mo: "mo", iodine: "iodine", cr: "cr" });
    table("mext-2020-fibre.json",
          { solfibre: "sol_prosky", insolfibre: "insol_prosky", resstarch: "resistant_starch" });
    table("mext-2020-sugars.json", { starch: "starch", glucose: "glucose", fructose: "fructose",
          sucrose: "sucrose", maltose: "maltose", sorbitol: "sorbitol", mannitol: "mannitol" });
    table("mext-2020-organic-acids.json",
          { organicacids: "total_oa", citric: "citric", malic: "malic", quinic: "quinic", oxalate: "oxalic" });
  }

  // IFCT, whose two tables share one code and one reviewed map.
  const ifctMap = readCorpus("page-map-ifct.json");
  if (ifctMap) {
    const t11 = new Map((readCorpus("ifct-2017-table11.json") || []).map(r => [r.code, r]));
    const t9 = new Map((readCorpus("ifct-2017-table9.json") || []).map(r => [r.code, r]));
    for (const m of ifctMap) {
      const slug = evSlug(m.page, m.page_state);
      reach("ifct-2017", slug);
      const a = t11.get(m.ifct_code);
      if (a) put("ifct-2017", slug, "phytate", a.phytate_mg?.mean);
      const b = t9.get(m.ifct_code);
      if (b) {
        put("ifct-2017", slug, "oxalate_sol", b.oxalate_soluble_mg?.mean ?? b.oxalate_soluble_mg);
        put("ifct-2017", slug, "oxalate_insol", b.oxalate_insoluble_mg?.mean ?? b.oxalate_insoluble_mg);
      }
    }
  }

  /* CoFID. Every cell citing it is a biotin reconciliation against MEXT, so
     without this the check would hold those values to MEXT alone and call a
     correct reconciliation a disagreement. */
  const cofidMap = readCorpus("page-map-cofid.json");
  if (cofidMap) {
    const rows = new Map((readCorpus("cofid-2021-plant.json") || []).map(r => [r.code, r]));
    for (const m of cofidMap) {
      const slug = evSlug(m.page, m.page_state);
      reach("cofid-2021", slug);
      const row = rows.get(m.cofid_code);
      // "N" is CoFID's own marker for a component it did not measure, and is
      // not a number however much it sits in a numeric column.
      if (row && row.biotin_ug !== "" && row.biotin_ug !== "N")
        put("cofid-2021", slug, "biotin", Number(row.biotin_ug));
    }
  }

  // AFCD, whose map is a plain slug -> key object rather than a row list.
  const afcdMap = readCorpus("page-map-afcd.json");
  if (afcdMap) {
    const rows = new Map((readCorpus("afcd-r3-plant.json") || []).map(r => [r.key, r]));
    for (const [slug, entry] of Object.entries(afcdMap)) {
      reach("afcd-r3", slug);
      const row = rows.get(entry && entry.key);
      if (!row) continue;
      const num = v => (v === "" || v == null ? undefined : Number(v));
      put("afcd-r3", slug, "inulin", num(row.inulin_g));
      put("afcd-r3", slug, "biotin", num(row.biotin_ug));
    }
  }

  /* FAO/INFOODS phytate, joined by a reviewed map from page food to row index.
     A list of rows rather than one, because the release samples cultivars and
     treatments rather than foods: "Cashew nut, raw" is three rows spanning 290
     to 929, and no single one of them is the cashew. */
  const faoMap = readCorpus("page-map-fao-phytate.json");
  if (faoMap) {
    const rows = readCorpus("fao-phytate.json") || [];
    for (const m of faoMap) {
      reach("fao-phytate", m.page);
      const figures = (m.rows || []).map(i => rows[i]?.phytate_mg_100g).filter(v => typeof v === "number");
      if (figures.length) (out["fao-phytate"][m.page].phytate = figures);
    }
  }

  /* FAO/INFOODS BioFoodComp and AnFooD, for the raffinose family. Rows per
     component rather than per food: a cooked chickpea row carrying verbascose
     and a boiled one carrying only raffinose are both the right food, and which
     components each can answer for differs. */
  const oligoMap = readCorpus("page-map-fao-oligos.json");
  if (oligoMap) {
    const rows = readCorpus("fao-oligosaccharides.json") || [];
    for (const m of oligoMap) {
      reach("fao-oligosaccharides", m.page);
      for (const [id, list] of Object.entries(m.components || {})) {
        const figures = list.map(i => rows[i]?.[id])
          .filter(c => c && typeof c.value === "number").map(c => c.value);
        if (figures.length) out["fao-oligosaccharides"][m.page][id] = figures;
      }
    }
  }

  /* Sim 2021, the Australian vitamin K database. Only its measured figures
     enter the index: a row reading ND is an analysed absence, which the cell
     records as not-detected and which carries no figure to compare against. */
  const simMap = readCorpus("page-map-sim-2021.json");
  if (simMap) {
    const corpus = readCorpus("sim-2021-vitamin-k.json");
    const rows = new Map((corpus?.rows || []).map(r => [r.food, r]));
    for (const m of simMap) {
      reach("sim-2021", m.page);
      const row = rows.get(m.row);
      if (!row) continue;
      for (const id of ["mk4", "mk7"]) {
        if (typeof row[id] === "number") { put("sim-2021", m.page, id, row[id]); continue; }
        /* One row prints a range with no median beside it, so the bounds are
           what the source attests and the cell has to be a range over them. */
        const span = row[`${id}_range`];
        if (Array.isArray(span)) { out["sim-2021"][m.page][id] = span; continue; }
        // An analysed absence attests zero. Not the same as a measured zero to
        // a reader, but for bounding a range it is exactly what the source
        // found, and a cell citing it must still contain that finding.
        if (row[id] === "ND") put("sim-2021", m.page, id, 0);
      }
    }
  }

  /* Walther's two menaquinone tables, 2013 and 2017, for the homologues. Two
     plant rows each and no map file: the row names are the page's own food
     names, so the mapping is the identity and a map would be a file with two
     lines in it. Both are indexed rather than only the later one, because a
     cell drawn from the pair has to hold against both. */
  for (const file of ["walther-2013-menaquinones.json", "walther-2017-menaquinones.json"]) {
    const corpus = readCorpus(file);
    if (!corpus) continue;
    const key = corpus.source;
    const rowFor = { natto: "Natto", "sauerkraut-canned": "Sauerkraut" };
    for (const [page, name] of Object.entries(rowFor)) {
      reach(key, page);
      // The 2017 table splits one food across its primary studies, so a food
      // can have several rows and each of them attests.
      for (const row of (corpus.rows || []).filter(r => r.food === name)) {
        for (const id of ["mk4", "mk7", "mk8", "mk9", "mk10"]) {
          const c = row[id];
          if (!c) continue;
          const seen = out[key][page][id] ||= [];
          if (typeof c.value === "number") seen.push(c.value);
          else if (c.state === "range") seen.push(c.low, c.high);
          else if (c.state === "not-detected") seen.push(0);
          if (!seen.length) delete out[key][page][id];
        }
      }
    }
  }

  /* Jensen 2022, a direct analysis of PK and MK-4 to MK-10 in five matrices.
     Each row names the page food it maps to, so no separate map file. Only its
     measured figures are indexed: a below-LOQ result carries no number to
     compare a cell against, and becomes an analysed absence instead. */
  const jensen = readCorpus("jensen-2022-vitamin-k.json");
  if (jensen) for (const row of jensen.rows || []) {
    reach("jensen-2022", row.page);
    for (const id of ["mk4", "mk7", "mk8", "mk9", "mk10"]) {
      if (row[id]?.state === "measured") put("jensen-2022", row.page, id, row[id].value);
      // Below the limit of quantification attests zero, for the same reason an
      // ND does: the source looked and found nothing to report.
      else if (row[id]?.state === "below-loq") put("jensen-2022", row.page, id, 0);
    }
  }

  /* The USDA glucosinolate release. Every row's mean is indexed, not just one:
     the release samples cultivars and treatments rather than foods, so what it
     attests for a food is the whole spread, and a range citing it has to
     contain all of it. */
  const gsl = readCorpus("usda-glucosinolate-r1.json");
  if (gsl) for (const f of gsl.foods || []) {
    reach("usda-glucosinolate-r1", f.page);
    if (f.means?.length) out["usda-glucosinolate-r1"][f.page].glucoraphanin = f.means;
  }

  /* Jensen 2025. Indexed once a row finally mapped to a page food, which took
     until the page gained a rye bread. Only the printed figures enter: a blank
     in Table S3 is a result below the 0.1 ug/100 g limit of quantification and
     carries no number, so the cell records it as an analysed absence instead. */
  const jensen25 = readCorpus("jensen-2025-vitamin-k.json");
  if (jensen25) for (const row of jensen25.rows || []) {
    if (!row.page) continue;
    reach("jensen-2025", row.page);
    for (const id of ["mk4", "mk7", "mk8", "mk9", "mk10"])
      if (typeof row[id] === "number") put("jensen-2025", row.page, id, row[id]);
  }

  /* FoodData Central Foundation Foods. Each row names the page food it maps
     to, so no separate map file. Only the released figure is indexed: the min,
     max and median beside it describe the spread of the samples behind that
     one value rather than separate attestations of the food. */
  const foundation = readCorpus("fdc-foundation-2026.json");
  if (foundation) for (const row of foundation.rows || []) {
    if (!row.page) continue;
    reach("usda-fdc-foundation", row.page);
    for (const id of ["beta-glucan", "ergothioneine", "raffinose", "stachyose"])
      put("usda-fdc-foundation", row.page, id, row[id]?.amount);
  }

  // The proanthocyanidin release carries its own reviewed mapping, as a list of
  // page slugs on each row, so it needs no separate map file.
  const pa = readCorpus("usda-proanthocyanidins.json");
  if (pa) for (const row of pa) for (const slug of row.page_slugs || []) {
    reach("usda-pa-r2", slug);
    put("usda-pa-r2", slug, "proanthocyanidins", row.subclasses?.proanthocyanidins?.sum_mg);
  }

  return out;
}

/** Exported so test/tools.mjs can exercise it without a build, the same as
 *  checkEvidence above. Takes the parsed gaps object, carrying `.sources` and
 *  `.gaps`, and the nutrients array. */
export function checkGaps(gaps, nutrients) {
  const problems = [];
  const allIds = new Set(nutrients.map(n => n.id));
  const evIds = new Set(nutrients.filter(n => n.evidence).map(n => n.id));

  /* ---- nutrient gaps ----
     Same shape of check as the interactions above, and the same reason: an
     entry naming a nutrient that does not exist renders as an entry with no
     evidence under it, which reads as a nutrient nothing is known about rather
     than as a mistake. */
  const gSources = gaps.sources || {}, gList = gaps.gaps || [];
  const TIERS = new Set(["gap", "plan", "unseen"]);
  if (!Array.isArray(gList) || !gList.length) problems.push("gaps: none");
  const gSeen = new Set();
  for (const g of Array.isArray(gList) ? gList : []) {
    const at = `gaps: "${g.id || "(no id)"}"`;
    if (!g.id) problems.push("gaps: an entry with no id");
    else if (gSeen.has(g.id)) problems.push(`${at} is listed twice`);
    gSeen.add(g.id);
    if (!TIERS.has(g.tier))
      problems.push(`${at} has tier "${g.tier}", not one of: ${[...TIERS].join(", ")}`);
    if (!g.label) problems.push(`${at} has no label`);
    if (!g.why || g.why.length < 40) problems.push(`${at} has no usable "why"`);
    if (!Array.isArray(g.nutrients))
      problems.push(`${at} has no nutrients array (use [] where there is no column)`);
    else for (const id of g.nutrients) {
      if (!allIds.has(id)) problems.push(`${at} names nutrient "${id}", which does not exist`);
      // A gap's evidence is counted over `v`: how many foods carry any, how
      // many were measured and found to contain none, how many were never
      // assayed. An evidence column has no `v` to count, so the entry would
      // render as a claim with nothing under it.
      else if (evIds.has(id))
        problems.push(`${at} names "${id}", which is an evidence column and has no figures to count`);
    }
    /* An entry may claim a component is not here at all, and the claim is
       checked rather than trusted. Two entries carried exactly this claim in
       prose and went false the day phase 1 shipped a column for what they said
       was missing, because `nutrients: []` meant nothing could catch it. */
    for (const id of g.absent || []) {
      if (allIds.has(id))
        problems.push(`${at} says "${id}" is absent, and it has a column`);
    }
    /* Cites are required for a gap and optional below it, which is a rule about
       what kind of claim each tier makes. A "gap" asserts something about the
       world and needs a source. A "plan" entry describes this table, and its
       evidence is computed from it at render time. An "unseen" entry says only
       that the data does not contain something, which the data itself shows. */
    if (g.tier === "gap" && (!Array.isArray(g.cites) || !g.cites.length))
      problems.push(`${at} is a gap and cites no source`);
    for (const key of g.cites || [])
      if (!gSources[key]) problems.push(`${at} cites unknown source "${key}"`);
  }
  for (const key of Object.keys(gSources))
    if (!gList.some(g => (g.cites || []).includes(key)))
      problems.push(`gaps: source "${key}" is cited by nothing`);

  return problems;
}

// `srcs` rather than `sources`, which the interactions block below already
// declares from `inter`. A parameter and a const of one name is a syntax error.
function validate(data, portions, inter, prep, gaps, evidence, srcs) {
  const problems = [];
  const { nutrients, foods } = data;

  if (!Array.isArray(nutrients) || !nutrients.length) problems.push("no nutrients");
  if (!Array.isArray(foods) || !foods.length) problems.push("no foods");
  if (problems.length) return problems;

  const ids = new Set();
  // The evidence columns, kept separate from `ids`: they are nutrients for
  // every purpose that concerns a column, and not nutrients for any purpose
  // that concerns a figure in `v`. Several checks below need the distinction.
  const evIds = new Set(nutrients.filter(n => n.evidence).map(n => n.id));
  for (const n of nutrients) {
    if (!n.id) problems.push(`nutrient with no id: ${JSON.stringify(n).slice(0, 60)}`);
    if (ids.has(n.id)) problems.push(`duplicate nutrient id: ${n.id}`);
    ids.add(n.id);
    if (typeof n.dp !== "number") problems.push(`${n.id}: missing decimal-places (dp)`);
    if (!n.group) problems.push(`${n.id}: missing group`);
    // The name every part of the page calls this nutrient by: the column header,
    // the detail rows, the day totals, the highlight groups and the CSV. An
    // empty one is not a missing column, it is a blank one everywhere at once,
    // which reads as a rendering fault rather than as data.
    if (!n.label) problems.push(`${n.id}: missing label, the name it is shown by`);
    // Every column header explains what its nutrient does. Required rather than
    // optional, because a column that quietly lacks one is a column whose header
    // silently stops doing something the others all do.
    if (!n.why) problems.push(`${n.id}: missing "why", the sentence explaining what it does`);
    else if (n.why.length < 40)
      problems.push(`${n.id}: "why" is too short to say anything useful`);
  }

  /* `after` is where a column sits on screen, as the id of the one it follows.
     A second pass, because it names a nutrient that may appear later in the
     file. An unresolvable one would silently leave the column where it was,
     which is the failure that put soluble fibre after the plant compounds. */
  for (const n of nutrients) {
    if (n.after === undefined) continue;
    const anchor = nutrients.find(x => x.id === n.after);
    if (!anchor) { problems.push(`${n.id}: sits after "${n.after}", which is not a nutrient`); continue; }
    if (n.after === n.id) problems.push(`${n.id}: sits after itself`);
    // A column can only be placed within its own group, since the header draws
    // one cell per group and a column that left its group would break the span.
    if (anchor.group !== n.group)
      problems.push(`${n.id}: sits after "${n.after}", which is in group "${anchor.group}" not "${n.group}"`);
  }

  // A short or long value array silently misaligns every column after the gap,
  // which looks like plausible data rather than an error. Always check.
  //
  // Counted over the non-evidence nutrients only, because an evidence column is
  // deliberately absent from `v`. That absence is the whole mechanism: a figure
  // that is not in `v` cannot reach dayTotals(), proteinQuality() or "Short on"
  // by any route, whatever a later edit does. app.ts builds IDX the same way.
  const vCount = nutrients.filter(n => !n.evidence).length;
  const slugs = new Set();
  // Which foods are seasonings, because their portions are held to a lower
  // floor below. Same string as SEASONINGS in tools/portions.mjs and app.ts,
  // and duplicated for the same reason the floor itself is.
  const seasonings = new Set();
  for (const f of foods) {
    if (!Array.isArray(f.v)) { problems.push(`${f.name}: no values array`); continue; }
    if (f.v.length !== vCount)
      problems.push(`${f.name}: ${f.v.length} values for ${vCount} nutrients`);
    const bad = f.v.findIndex(v => v !== null && typeof v !== "number");
    if (bad !== -1) problems.push(`${f.name}: non-numeric value at ${nutrients[bad]?.id ?? bad}`);

    const slug = `${f.name} ${f.state || ""}`.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (slugs.has(slug)) problems.push(`duplicate food key "${slug}", saved favourites would collide`);
    slugs.add(slug);
    if (f.cat === "Herbs & Spices") seasonings.add(slug);
  }

  // Per-cell notes point at a food and a nutrient by name. A typo in either
  // would simply never match, so the note would vanish from the page with
  // nothing to say it had gone.
  for (const note of data.notes || []) {
    for (const field of ["id", "marker", "short", "text"])
      if (!note[field]) problems.push(`note ${note.id || "?"}: missing ${field}`);
    for (const [slug, nutIds] of Object.entries(note.cells || {})) {
      if (!slugs.has(slug)) problems.push(`note ${note.id}: no food with key "${slug}"`);
      if (!Array.isArray(nutIds) || !nutIds.length)
        problems.push(`note ${note.id}: "${slug}" lists no nutrients`);
      for (const n of nutIds || []) {
        if (!ids.has(n)) problems.push(`note ${note.id}: "${slug}" names unknown nutrient "${n}"`);
        // The page draws a note's marker beside a figure in `v`. An evidence
        // cell carries its own provenance instead, as sources and a match
        // grade, so a note aimed at one would never be rendered.
        else if (evIds.has(n))
          problems.push(`note ${note.id}: "${slug}" marks "${n}", which is an evidence column and carries its own sources`);
      }
      // A note explains where a figure came from, so there has to be a figure.
      // The page only draws a marker next to a value, so an entry pointing at an
      // empty cell renders nothing at all and would sit in the data unnoticed.
      const food = foods.find(f => `${f.name} ${f.state || ""}`.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === slug);
      for (const n of nutIds || []) {
        const at = nutrients.findIndex(x => x.id === n);
        if (food && at !== -1 && (food.v[at] === null || food.v[at] === undefined))
          problems.push(`note ${note.id}: "${slug}" marks "${n}", which has no value to explain`);
      }
    }
  }

  // Cross-field checks. A fraction exceeding the total it belongs to is the
  // signature of a food mapped to the wrong source row, the values look
  // individually plausible and only disagree when compared with each other.
  const at = id => nutrients.findIndex(n => n.id === id);
  // Each list is a subset of its total and never the whole of it, so the sum may
  // fall short but must never exceed.
  const subsets = [
    { total: "pufa", parts: ["ala", "la"], label: "polyunsaturated" },
    { total: "mufa", parts: ["oleic", "palmitoleic"], label: "monounsaturated" },
    { total: "satfat", parts: ["lauric", "palmitic", "stearic"], label: "saturated fat" },
    { total: "fat", parts: ["satfat"], label: "total fat" },
  ];
  for (const { total, parts, label } of subsets) {
    const ti = at(total), pis = parts.map(at);
    if (ti === -1 || pis.some(i => i === -1)) continue;
    for (const f of foods) {
      const t = f.v[ti];
      if (typeof t !== "number") continue;
      const sum = pis.reduce((s, i) => s + (typeof f.v[i] === "number" ? f.v[i] : 0), 0);
      // 1% tolerance: the parts and the total are separate lab measurements.
      if (sum > t * 1.01 + 0.005)
        problems.push(`${f.name}: ${parts.join(" + ")} = ${sum.toFixed(3)} exceeds ${label} ${t}`);
    }
  }

  // A portion pointing at a food that does not exist renders nothing at all and
  // would sit in the data unnoticed, which is the same failure the per-cell
  // notes checks above exist to refuse. Renaming a food should fail the build
  // rather than silently drop its portions.
  for (const [slug, list] of Object.entries(portions)) {
    if (!slugs.has(slug)) problems.push(`portions: no food with key "${slug}"`);
    if (!Array.isArray(list) || !list.length) {
      problems.push(`portions: "${slug}" lists none`);
      continue;
    }
    const labels = new Set();
    // slug -> clamped gram -> the label already holding it, so a hand edit
    // that reintroduces the collision issue 1 removed from the data is
    // caught here rather than shipping a portion nothing can ever select.
    const clamped = new Map();
    for (const p of list) {
      if (!p.label) problems.push(`portions: "${slug}" has a portion with no label`);
      else if (labels.has(p.label))
        problems.push(`portions: "${slug}" lists "${p.label}" twice`);
      labels.add(p.label);
      // 5, 1 and 500 are forced duplicates of MIN_G, MIN_G_SEASONING and MAX_G
      // in tools/portions.mjs: build.mjs may import nothing but node:*, so the
      // literals cannot be shared and must not quietly become an import.
      // Zero or negative would render a portion that sets a quantity of
      // nothing, under the floor is precision clampG would round away, and
      // above the cap is a purchase rather than a helping. A seasoning gets the
      // lower floor because five grams of oregano is about two tablespoons: the
      // ordinary floor dropped every portion USDA publishes for it.
      const floor = seasonings.has(slug) ? 1 : 5;
      if (typeof p.g !== "number" || !(p.g > 0) || p.g < floor || p.g > 500) {
        problems.push(`portions: "${slug}" portion "${p.label}" has an impossible weight ${p.g}`);
        continue;
      }
      // Mirrors the app's clampG(), which is Math.round(): two portions that
      // round to the same whole gram are indistinguishable to the control by
      // construction, since the stored quantity is always a whole number.
      const g = Math.round(p.g);
      if (clamped.has(g))
        problems.push(`portions: "${slug}" "${p.label}" and "${clamped.get(g)}" both round to ${g} g`);
      else clamped.set(g, p.label);
    }
  }

  /* ---- bioavailability interactions ----
     These are explanation rather than measurement, so nothing here is ever
     applied to a figure. What the build can still enforce is that every record
     points at something real and carries its source: a record naming a nutrient
     that does not exist renders as nothing at all, which reads as a nutrient
     with no interactions rather than as an error, and a claim about absorption
     with no citation is exactly the kind of assertion this project refuses
     everywhere else. */
  const { sources = {}, interactions = [] } = inter;
  if (!Object.keys(sources).length) problems.push("interactions: no sources");
  if (!Array.isArray(interactions) || !interactions.length)
    problems.push("interactions: none");

  const seen = new Set();
  const DIRECTIONS = new Set(["up", "down"]);
  const WHENS = new Set(["same meal", "same day", "preparation"]);
  const KINDS = new Set(["nutrient", "substance", "food", "practice"]);
  for (const x of Array.isArray(interactions) ? interactions : []) {
    const at = `interactions: "${x.id || "(no id)"}"`;
    if (!x.id) problems.push("interactions: a record with no id");
    else if (seen.has(x.id)) problems.push(`${at} is listed twice`);
    seen.add(x.id);

    if (!Array.isArray(x.affects) || !x.affects.length)
      problems.push(`${at} affects nothing`);
    else for (const id of x.affects) {
      if (!ids.has(id)) problems.push(`${at} affects "${id}", which is not a nutrient`);
      // An interaction is shown against a food whose own figures make it a
      // meaningful source of the nutrient, which is a judgement about a figure
      // in `v`. An evidence column has none there and no daily value to be a
      // meaningful share of, so the page could never decide when to show it.
      else if (evIds.has(id))
        problems.push(`${at} affects "${id}", which is an evidence column and has no figure to rank`);
    }

    if (!DIRECTIONS.has(x.direction))
      problems.push(`${at} has direction "${x.direction}", not up or down`);
    if (!WHENS.has(x.when))
      problems.push(`${at} has when "${x.when}", which is not one of: ${[...WHENS].join(", ")}`);
    if (!x.short) problems.push(`${at} has no short label`);
    // The full sentence is what the dialog and the panel print. A stub would
    // render an entry that takes up space and says nothing.
    if (!x.text || x.text.length < 40) problems.push(`${at} has no usable text`);

    const a = x.agent || {};
    if (!KINDS.has(a.kind))
      problems.push(`${at} has agent kind "${a.kind}", which is not one of: ${[...KINDS].join(", ")}`);
    // The agent is the half of an interaction most likely to rot, because two
    // of its four kinds point into data that moves underneath it.
    if (a.kind === "nutrient" && !ids.has(a.id))
      problems.push(`${at} names nutrient "${a.id}" as its agent, which does not exist`);
    if (a.kind === "food" && !slugs.has(a.slug))
      problems.push(`${at} names food "${a.slug}" as its agent, which does not exist`);
    if ((a.kind === "substance" || a.kind === "practice") && !a.label)
      problems.push(`${at} has a ${a.kind} agent with no label`);

    // An array rather than one key: a record may rest on more than one paper,
    // and the first version of this data had a text quoting two studies while
    // naming only one of them. The check below is what found that.
    if (!Array.isArray(x.cites) || !x.cites.length) problems.push(`${at} cites no source`);
    else for (const key of x.cites)
      if (!sources[key]) problems.push(`${at} cites unknown source "${key}"`);
  }
  // A source nobody cites is a citation that has quietly lost the claim it was
  // supporting, which is worth knowing about before it misleads a reader of
  // the dialog's reference list.
  for (const key of Object.keys(sources))
    if (!interactions.some(x => (x.cites || []).includes(key)))
      problems.push(`interactions: source "${key}" is cited by nothing`);

  /* ---- preparation ----
     The same shape of check as the interactions above, and mostly the same
     reasons, with two deliberate differences.

     A preparation record MAY name an evidence column, where an interaction may
     not. The interaction rule exists because the detail panel picks entries by
     ranking a food's own figures, which an evidence column cannot be ranked by.
     This data picks by naming rows outright, so the rule it was protecting does
     not apply, and the one component this dataset is about is glucoraphanin,
     which is an evidence column.

     And `measuredIn` must be a subset of `applies`, because the page prints a
     record on every row in `applies` and marks it as generalised on every row
     outside `measuredIn`. A row that is measured but not applied would be a
     measurement the page never shows, and the only reason this dataset exists
     is that almost all of its literature is broccoli and saying so is the
     honest part. */
  const { sources: prepSrcs = {}, preparations = [] } = prep;
  if (!Object.keys(prepSrcs).length) problems.push("preparation: no sources");
  if (!Array.isArray(preparations) || !preparations.length)
    problems.push("preparation: none");

  const prepSeen = new Set();
  for (const x of Array.isArray(preparations) ? preparations : []) {
    const at = `preparation: "${x.id || "(no id)"}"`;
    if (!x.id) problems.push("preparation: a record with no id");
    else if (prepSeen.has(x.id)) problems.push(`${at} is listed twice`);
    prepSeen.add(x.id);

    /* A preparation record may be about something the table does not measure.
       Garlic is the case: crushing turns alliin into allicin, there is no
       allicin column and no data for one, and "crush it and let it stand before
       heating" is still the most useful thing the page can say about garlic.
       Adding an empty column to hold the advice would be worse than saying
       plainly that there is no column, which is what interactions.json already
       does for phytate and oxalate on its agent side.

       So exactly one of the two must be present. `component` names a real
       column and the record is grouped under it; `componentLabel` names a
       substance with no column and the page says so where it prints it. Both
       would leave the dialog with two headings for one record, and neither
       leaves it with none. */
    const named = x.component !== undefined && x.component !== null;
    const labelled = x.componentLabel !== undefined && x.componentLabel !== null;
    if (named && labelled)
      problems.push(`${at} has both a component and a componentLabel; it needs exactly one`);
    else if (!named && !labelled)
      problems.push(`${at} names no component and carries no componentLabel`);
    else if (named && !ids.has(x.component))
      problems.push(`${at} names component "${x.component}", which is not a nutrient. ` +
        `A substance with no column goes in componentLabel instead.`);
    else if (labelled && !String(x.componentLabel).trim())
      problems.push(`${at} has an empty componentLabel`);
    if (!DIRECTIONS.has(x.direction))
      problems.push(`${at} has direction "${x.direction}", not up or down`);
    if (!x.short) problems.push(`${at} has no short label`);
    if (!x.text || x.text.length < 40) problems.push(`${at} has no usable text`);

    const a = x.agent || {};
    if (!KINDS.has(a.kind))
      problems.push(`${at} has agent kind "${a.kind}", which is not one of: ${[...KINDS].join(", ")}`);
    if (a.kind === "nutrient" && !ids.has(a.id))
      problems.push(`${at} names nutrient "${a.id}" as its agent, which does not exist`);
    if (a.kind === "food" && !slugs.has(a.slug))
      problems.push(`${at} names food "${a.slug}" as its agent, which does not exist`);
    if ((a.kind === "substance" || a.kind === "practice") && !a.label)
      problems.push(`${at} has a ${a.kind} agent with no label`);

    // A record that applies to nothing renders nowhere, which reads as a food
    // with no preparation notes rather than as a record nobody finished.
    const applies = Array.isArray(x.applies) ? x.applies : [];
    if (!applies.length) problems.push(`${at} applies to no food`);
    for (const s of applies)
      if (!slugs.has(s)) problems.push(`${at} applies to "${s}", which is not a food`);

    const measured = Array.isArray(x.measuredIn) ? x.measuredIn : [];
    for (const s of measured) {
      if (!slugs.has(s)) problems.push(`${at} is measured in "${s}", which is not a food`);
      else if (!applies.includes(s))
        problems.push(`${at} is measured in "${s}" but does not apply to it`);
    }

    if (!Array.isArray(x.cites) || !x.cites.length) problems.push(`${at} cites no source`);
    else for (const key of x.cites)
      if (!prepSrcs[key]) problems.push(`${at} cites unknown source "${key}"`);
  }
  for (const key of Object.keys(prepSrcs))
    if (!preparations.some(x => (x.cites || []).includes(key)))
      problems.push(`preparation: source "${key}" is cited by nothing`);

  problems.push(...checkGaps(gaps, nutrients));

  problems.push(...checkEvidence(evidence, nutrients, foods, srcs, loadAttested()));
  // A citation nobody uses is the same fault as an uncited claim, read from the
  // other end, and the same check the interactions and gaps sources get.
  /* A disputed source counts as cited. The page prints it beside the figure it
     disagrees with, so it is doing work and a reader can follow it. Lee 2010 is
     the case that showed this up: its two glucoraphanin figures were replaced
     by a release that states its preparation, and Lee stayed on as the dissent,
     at which point this check called the source uncited and failed the build. */
  const cites = (c, key) =>
    (c.sources || []).includes(key) || (c.disputed || []).some(d => d.source === key);
  for (const key of Object.keys(srcs || {}))
    if (!Object.values(evidence || {}).some(entry =>
        Object.values(entry.cells || {}).some(c => cites(c, key))))
      problems.push(`sources: "${key}" is cited by no evidence cell`);

  return problems;
}

async function build() {
  for (const [name, path] of Object.entries(SOURCES))
    if (!existsSync(path)) throw new Error(`missing source: ${name} (${path})`);

  const [html, css, app, dataRaw, iconsRaw, portionsRaw, interRaw, prepRaw, gapsRaw,
         evidenceRaw, sourceRaw] = await Promise.all(
    Object.values(SOURCES).map(p => readFile(p, "utf8")));

  let data, icons;
  try { data = JSON.parse(dataRaw); }
  catch (e) { throw new Error(`nutrients.json is not valid JSON: ${e.message}`); }
  try { icons = JSON.parse(iconsRaw); }
  catch (e) { throw new Error(`icons.json is not valid JSON: ${e.message}`); }
  let portions;
  try { portions = JSON.parse(portionsRaw); }
  catch (e) { throw new Error(`portions.json is not valid JSON: ${e.message}`); }

  let inter;
  try { inter = JSON.parse(interRaw); }
  catch (e) { throw new Error(`interactions.json is not valid JSON: ${e.message}`); }

  let prep;
  try { prep = JSON.parse(prepRaw); }
  catch (e) { throw new Error(`preparation.json is not valid JSON: ${e.message}`); }

  let gaps;
  try { gaps = JSON.parse(gapsRaw); }
  catch (e) { throw new Error(`gaps.json is not valid JSON: ${e.message}`); }

  let evidence;
  try { evidence = JSON.parse(evidenceRaw); }
  catch (e) { throw new Error(`evidence.json is not valid JSON: ${e.message}`); }

  let srcs;
  try { srcs = JSON.parse(sourceRaw); }
  catch (e) { throw new Error(`sources.json is not valid JSON: ${e.message}`); }

  const problems = validate(data, portions, inter, prep, gaps, evidence, srcs);
  if (problems.length)
    throw new Error(`data validation failed:\n  - ${problems.join("\n  - ")}`);

  let out = html;
  // The meta description is the one piece of prose the page cannot fill in for
  // itself at runtime, since search engines read it before any script runs.
  out = inject(out, "{{FOODCOUNT}}", String(data.foods.length));
  out = inject(out, "/*{{STYLES}}*/", css.trim());
  out = inject(out, "//{{DATA}}", `const DATA = ${safeJSON(data)};`);
  out = inject(out, "//{{ICONS}}", `const I = ${safeJSON(icons)};`);
  out = inject(out, "//{{PORTIONS}}", `const P = ${safeJSON(portions)};`);
  out = inject(out, "//{{INTERACTIONS}}", `const X = ${safeJSON(inter)};`);
  out = inject(out, "//{{PREPARATION}}", `const PREP = ${safeJSON(prep)};`);
  out = inject(out, "//{{GAPS}}", `const G = ${safeJSON(gaps)};`);
  out = inject(out, "//{{EVIDENCE}}", `const EV = ${safeJSON(evidence)};`);
  out = inject(out, "//{{SOURCES}}", `const SRCS = ${safeJSON(srcs)};`);
  // The page carries "use strict" twice on purpose. esbuild emits one of its
  // own because it reads tsconfig.json, where `strict` implies `alwaysStrict`;
  // this one is prepended so the page's strictness does not depend on that
  // staying true. A compiler setting is a thing someone edits, and losing strict
  // mode would be silent. The duplicate costs two words in a 200 kB file, and
  // neither copy is the redundant one to delete.
  out = inject(out, "//{{APP}}", `"use strict";\n${app.trim()}`);

  await writeFile(OUT, out);
  const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
  console.log(`built index.html  ${kb} kB  ` +
    `(${data.nutrients.length} nutrients x ${data.foods.length} foods)`);
}

const run = () => build().catch(err => {
  console.error(`\nbuild failed: ${err.message}\n`);
  if (!process.argv.includes("--watch")) process.exitCode = 1;
});

/* Only build when this file is the thing that was run. test/tools.mjs imports
   checkEvidence to exercise the rules directly, and without this guard that
   import would rebuild the page as a side effect of running the tests. Same
   guard, and the same reason, as the CLI dispatch in tools/usda.mjs.
   `process.argv[1]` rather than `import.meta.main`, which is Node 24 while CI
   pins 20. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await run();

  if (process.argv.includes("--watch")) {
    console.log("watching src/, ctrl-c to stop");
    let timer;
    for await (const _ of watch(SRC, { recursive: true })) {
      clearTimeout(timer);            // editors fire several events per save
      timer = setTimeout(run, 60);
    }
  }
}
