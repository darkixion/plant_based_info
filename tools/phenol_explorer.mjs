#!/usr/bin/env node
/**
 * Phenol-Explorer: what it could fill, and whether it is a second source.
 *
 *   node tools/phenol_explorer.mjs publications [--dry-run]  fetch its paper list
 *   node tools/phenol_explorer.mjs coverage                  what it could fill
 *   node tools/phenol_explorer.mjs overlap                   is it a second source?
 *
 * `tools/evidence/phenol-explorer.json` holds 6,953 composition rows over 439
 * foods and has never filled a cell. Four of our five flavonoid columns line up
 * with it, because it stores aglycones as their own rows and the aglycones are
 * what those columns sum. Anthocyanidins does not: it reports anthocyanins as
 * glycosides and has nine aglycone rows in total.
 *
 * Three rules have to be settled before any of it can be read, and one of them
 * was not obvious.
 *
 * BASIS. Fresh weight only, which is the standing rule here. Its mg/100 ml and
 * dry weight rows are dropped.
 *
 * METHOD, and this is the one that matters. Phenol-Explorer stores two
 * chromatography methods and the choice changes the number by an order of
 * magnitude. The plain `Chromatography` rows report the FREE aglycone, which is
 * near zero in any food that carries the compound as a glycoside. The
 * `Chromatography after hydrolysis` rows report the aglycone total, which is
 * what USDA measures and what our columns sum. Blackberry quercetin is 0 by the
 * first and 0.87 by the second; yellow onion quercetin is 0.28 against 12.65.
 * So flavonols, flavones and flavanones come from the hydrolysis rows only.
 * Flavan-3-ols come from the plain rows, because catechins are not glycosides
 * and there are no hydrolysis rows for them; the `Normal phase HPLC` rows there
 * are the proanthocyanidin oligomers and belong to another column.
 *
 * COMPLETENESS. The same rule flavonoids.mjs applies to USDA, unchanged: a
 * subclass is withheld unless every required aglycone was measured, and only
 * the compounds USDA's own NUTR_DEF puts in each class are summed, so that the
 * two databases are summing the same thing.
 *
 * WHAT `overlap` IS FOR. Phenol-Explorer agrees with USDA Release 3.3 to the
 * decimal place on a run of foods, and the reason is not that two laboratories
 * found the same thing. Both are compilations and they compiled the same
 * papers: publication 655 here is Harnly 2006, which is reference R110 there;
 * 453 and 123 are Lugasi and Hovari 2000 and 2002, which are R170 and R171.
 * `overlap` reads both databases' own publication lists and reports, per food
 * and per column, whether the two rest on a shared paper. A figure that shares
 * its provenance is not a second opinion and must not be cited as one.
 *
 * Its PubMed ids do not settle this and cannot be trusted to. Phenol-Explorer's
 * composition file tags all 121 of publication 655's rows with PMID 22327611,
 * which is a 2012 review of diet and endothelial function. Harnly 2006 is PMID
 * 17177529. The mismatch is upstream, in the file as published, not in the
 * ingest here.
 */
import { readFile, writeFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EV = join(ROOT, "tools", "evidence");
const DATA = join(ROOT, "src", "data", "nutrients.json");
const PUBS_URL = "http://phenol-explorer.eu/system/downloads/current/publications.csv.zip";
const rd = async f => JSON.parse(await readFile(join(EV, f), "utf8"));

/* ---------- the subclasses, and how to read them out of this source ----------
   `sub` and `method` are Phenol-Explorer's own column values. `req` and `all`
   are USDA's, so that a figure from either database is the same sum. */
const SPEC = {
  flavonols: {
    sub: "Flavonols", method: "Chromatography after hydrolysis",
    req: ["Quercetin", "Kaempferol", "Myricetin"],
    all: ["Quercetin", "Kaempferol", "Myricetin", "Isorhamnetin"],
  },
  flavones: {
    sub: "Flavones", method: "Chromatography after hydrolysis",
    req: ["Apigenin", "Luteolin"], all: ["Apigenin", "Luteolin"],
  },
  flavan3ols: {
    sub: "Flavanols", method: "Chromatography",
    req: ["(+)-Catechin", "(-)-Epicatechin", "(-)-Epigallocatechin",
          "(-)-Epicatechin 3-O-gallate", "(-)-Epigallocatechin 3-O-gallate"],
    all: ["(+)-Catechin", "(-)-Epicatechin", "(-)-Epigallocatechin",
          "(-)-Epicatechin 3-O-gallate", "(-)-Epigallocatechin 3-O-gallate",
          "(+)-Gallocatechin"],
  },
  flavanones: {
    sub: "Flavanones", method: "Chromatography after hydrolysis",
    req: ["Eriodictyol", "Hesperetin", "Naringenin"],
    all: ["Eriodictyol", "Hesperetin", "Naringenin"],
  },
};
const KEYS = Object.keys(SPEC);

const slugify = f => `${f.name} ${f.state || ""}`.toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const surname = s => (s || "").trim().split(/[,\s]+/)[0].toLowerCase().replace(/[^a-z]/g, "");

/** Every fresh-weight flavonoid row, grouped by food. */
async function rowsByFood() {
  const all = Object.values(await rd("phenol-explorer.json"));
  const by = new Map();
  for (const r of all) {
    if (r.compound_group !== "Flavonoids") continue;
    if (!/fresh weight/i.test(r.units)) continue;
    (by.get(r.food) || by.set(r.food, []).get(r.food)).push(r);
  }
  return by;
}

/** One subclass for one Phenol-Explorer food, or null where it is not fully
 *  measured. Returns the publications behind it too, because a figure here is
 *  only usable once you know whose measurement it is. */
function subclass(rows, key) {
  const s = SPEC[key];
  const got = rows.filter(r => r.compound_sub_group === s.sub && r.method === s.method
    && s.all.includes(r.compound));
  const have = new Set(got.map(r => r.compound));
  if (!s.req.every(n => have.has(n))) return null;
  const split = field => [...new Set(got.flatMap(r =>
    String(r[field]).split(";").map(x => x.trim()).filter(Boolean)))];
  return {
    mg: Math.round(got.reduce((t, r) => t + (Number(r.mean) || 0), 0) * 100) / 100,
    publications: split("publication_ids"),
    pubmed: split("pubmed_ids"),
    n: Math.max(...got.map(r => Number(r.n) || 0)),
  };
}

/* ---------- publications ----------
   Phenol-Explorer's own paper list, which the composition download does not
   carry and without which a publication id is an opaque number. Fetched rather
   than typed, and stored, because `overlap` has to run without a network. */
function unzipSingle(buf) {
  // Minimal reader for a one-file archive: local header, then a raw deflate
  // stream. Enough for this download and not intended for anything else.
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error("not a zip file");
  const method = buf.readUInt16LE(8);
  const nameLen = buf.readUInt16LE(26), extraLen = buf.readUInt16LE(28);
  const start = 30 + nameLen + extraLen;
  const body = buf.subarray(start);
  if (method === 0) return body;
  if (method !== 8) throw new Error(`unsupported zip compression method ${method}`);
  return inflateRawSync(body);
}

function parseCSV(text) {
  const rows = []; let row = [], cur = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') { cur += c; continue; }
      if (text[i + 1] === '"') { cur += '"'; i++; continue; }
      quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

async function cmdPublications({ dry }) {
  process.stdout.write("downloading the Phenol-Explorer publication list... ");
  const res = await fetch(PUBS_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const csv = unzipSingle(Buffer.from(await res.arrayBuffer())).toString("utf8");
  console.log("done");

  const rows = parseCSV(csv);
  const at = Object.fromEntries(rows[0].map((h, i) => [h.trim(), i]));
  for (const need of ["id", "authors", "year_of_publication", "title", "journal_name"])
    if (at[need] === undefined) throw new Error(`the publication list has no "${need}" column`);

  const publications = {};
  for (const r of rows.slice(1)) {
    if (r.length < 4 || !r[at.id]) continue;
    publications[r[at.id]] = {
      authors: r[at.authors],
      author: surname(r[at.authors]),
      year: Number(r[at.year_of_publication]) || null,
      title: r[at.title],
      journal: r[at.journal_name],
    };
  }

  const out = {
    source: "phenol-explorer",
    note: "Phenol-Explorer's own publication list, which its composition download references " +
      "by id and does not name. Held here so a publication id can be read, and so the " +
      "provenance it shares with USDA Flavonoid Release 3.3 can be checked without a network. " +
      "The composition file's pubmed_ids column is not reliable: all 121 rows citing " +
      "publication 655, Harnly 2006, carry PMID 22327611, which is a 2012 review.",
    fetched_from: PUBS_URL,
    generated_by: "node tools/phenol_explorer.mjs publications",
    publications,
  };
  console.log(`${Object.keys(publications).length} publications`);
  if (dry) { console.log("\n--dry-run: nothing written"); return; }
  const path = join(EV, "phenol-explorer-publications.json");
  await writeFile(path, JSON.stringify(out, null, 1) + "\n");
  console.log(`\nwrote ${path}`);
}

/* ---------- coverage ---------- */
async function cmdCoverage() {
  const by = await rowsByFood();
  const complete = new Map();
  for (const [food, rows] of by) {
    const got = {};
    for (const k of KEYS) { const s = subclass(rows, k); if (s) got[k] = s; }
    if (Object.keys(got).length) complete.set(food, got);
  }
  console.log(`\n${by.size} foods have a fresh-weight flavonoid row`);
  console.log(`${complete.size} have at least one subclass measured in full\n`);
  for (const k of KEYS) {
    const has = [...complete.values()].filter(v => v[k]);
    const top = [...complete].filter(([, v]) => v[k]).sort((a, b) => b[1][k].mg - a[1][k].mg)[0];
    console.log(`  ${k.padEnd(12)} ${String(has.length).padStart(3)} foods, ` +
      `${has.filter(v => v[k].mg > 0).length} above zero, richest ${top ? `${top[0]} ${top[1][k].mg}` : "-"}`);
  }

  const map = await rd("proposed-page-map-phenol-explorer.json").catch(() => null);
  if (!map) return console.log("\nno page map, so nothing can be said about our foods yet");
  console.log(`\nagainst the proposed page map (${map.proposed.length} foods, NOT REVIEWED):`);
  const tally = { new: 0, "agrees-to-rounding": 0, differs: 0 };
  for (const p of map.proposed) for (const v of Object.values(p.would_fill)) tally[v.verdict]++;
  for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(20)} ${v}`);
}

/* ---------- overlap ----------
   The question this tool exists to answer. For every cell the proposed map
   would fill, do Phenol-Explorer and USDA rest on a shared paper? */
async function cmdOverlap() {
  const pubs = (await rd("phenol-explorer-publications.json")).publications;
  const refs = await rd("usda-flavonoids-references.json");
  const map = await rd("proposed-page-map-phenol-explorer.json");
  const corpus = await rd("usda-flavonoids.json");

  const ndbOf = new Map();
  for (const r of corpus) for (const s of r.page_slugs || []) ndbOf.set(s, String(r.ndb).padStart(5, "0"));

  /* Matched on surname and year, allowing a year either side, because the two
     databases disagree about the year of four papers and USDA's is scraped out
     of a run-together citation. Surname alone would be too loose: Lugasi has
     two papers here and they are different foods. */
  const usdaIndex = new Map();
  for (const [id, r] of Object.entries(refs.references))
    (usdaIndex.get(r.author) || usdaIndex.set(r.author, []).get(r.author)).push({ id, ...r });

  const shared = (peId, usdaIds) => {
    const p = pubs[String(peId)];
    if (!p) return null;
    for (const cand of usdaIndex.get(p.author) || [])
      if (usdaIds.has(cand.id) && cand.year !== null && Math.abs(cand.year - p.year) <= 1)
        return `${p.author} ${p.year}`;
    return null;
  };

  const rows = [];
  for (const p of [...map.proposed, ...(map.open_questions || [])]) {
    const ndb = ndbOf.get(p.page);
    const usdaIds = new Set(ndb ? refs.by_ndb[ndb] || [] : []);
    for (const [col, v] of Object.entries(p.would_fill)) {
      const hits = [...new Set(v.publications.map(id => shared(id, usdaIds)).filter(Boolean))];
      rows.push({ page: p.page, col, verdict: v.verdict, mg: v.phenol_explorer,
        page_now: v.page_now, shared: hits, usdaRow: Boolean(ndb),
        pubs: v.publications.map(id => pubs[id] ? `${pubs[id].author} ${pubs[id].year}` : `#${id}`) });
    }
  }

  const n = f => rows.filter(f).length;
  console.log(`\n${rows.length} cells the proposed map would fill\n`);
  console.log(`  share a paper with USDA's own reference list: ${n(r => r.shared.length)}`);
  console.log(`  independent of it:                            ${n(r => !r.shared.length && r.usdaRow)}`);
  console.log(`  food is not in Release 3.3 at all:            ${n(r => !r.usdaRow)}`);

  console.log(`\n  by what the cell would do:`);
  for (const v of ["new", "agrees-to-rounding", "differs"]) {
    const g = rows.filter(r => r.verdict === v);
    console.log(`    ${v.padEnd(20)} ${String(g.length).padStart(3)}   shared ${String(g.filter(r => r.shared.length).length).padStart(3)}` +
      `   independent ${String(g.filter(r => !r.shared.length && r.usdaRow).length).padStart(3)}` +
      `   no USDA row ${g.filter(r => !r.usdaRow).length}`);
  }

  /* The rule this supports. Shared provenance only matters where USDA already
     has a figure in the cell: there it would be one measurement cited twice.
     Where the cell is empty, Phenol-Explorer duplicates nothing. */
  const usable = rows.filter(r => r.verdict === "new" || !r.shared.length);
  console.log(`\n  cells that could be cited without printing one measurement twice: ${usable.length}`);
  console.log(`    of which carry a figure above zero: ${usable.filter(r => Number(r.mg) > 0 || Array.isArray(r.mg)).length}\n`);
  for (const r of usable.filter(r => Number(r.mg) > 0 || Array.isArray(r.mg)))
    console.log(`    ${r.page.padEnd(22)}${r.col.padEnd(12)}${String(r.mg).padStart(12)}  page now ${String(r.page_now).padStart(6)}  ${r.pubs.join(", ")}`);

  console.log(`\n  the papers the two databases share here:`);
  const tally = new Map();
  for (const r of rows) for (const s of r.shared) tally.set(s, (tally.get(s) || 0) + 1);
  for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1]))
    console.log(`    ${String(v).padStart(3)}  ${k}`);
  console.log();
}

/* ---------- annotate ----------
   The proposed map is two things in one file. The pairings are judgement and
   are written by hand; everything under `would_fill` is arithmetic and is
   written by this. Keeping the second out of the file by hand would mean a
   review reading figures that had quietly drifted from the source. */
async function cmdAnnotate({ dry }) {
  const path = join(EV, "proposed-page-map-phenol-explorer.json");
  const map = JSON.parse(await readFile(path, "utf8"));
  const by = await rowsByFood();
  const data = JSON.parse(await readFile(DATA, "utf8"));
  const pubs = (await rd("phenol-explorer-publications.json")).publications;
  const refs = await rd("usda-flavonoids-references.json");
  const corpus = await rd("usda-flavonoids.json");

  const IDX = Object.fromEntries(KEYS.map(k => [k, data.nutrients.findIndex(n => n.id === k)]));
  const page = new Map(data.foods.map(f => [slugify(f), f]));
  const ndbOf = new Map();
  for (const r of corpus) for (const s of r.page_slugs || []) ndbOf.set(s, String(r.ndb).padStart(5, "0"));
  const usdaIndex = new Map();
  for (const [id, r] of Object.entries(refs.references))
    (usdaIndex.get(r.author) || usdaIndex.set(r.author, []).get(r.author)).push({ id, ...r });

  const problems = [];
  const annotate = p => {
    const food = page.get(p.page);
    if (!food) { problems.push(`no page food "${p.page}"`); return p; }
    const ndb = ndbOf.get(p.page);
    const usdaIds = new Set(ndb ? refs.by_ndb[ndb] || [] : []);
    const would = {};
    for (const k of KEYS) {
      const parts = p.pe_foods.map(f => {
        const rows = by.get(f);
        if (!rows) { problems.push(`no Phenol-Explorer food "${f}"`); return null; }
        return subclass(rows, k);
      }).filter(Boolean);
      if (!parts.length) continue;
      const mgs = parts.map(x => x.mg);
      const mean = Math.round(mgs.reduce((a, b) => a + b, 0) / mgs.length * 100) / 100;
      const now = food.v[IDX[k]] ?? null;
      const publications = [...new Set(parts.flatMap(x => x.publications))];
      const shared = [...new Set(publications.map(id => {
        const pub = pubs[String(id)];
        if (!pub) return null;
        for (const cand of usdaIndex.get(pub.author) || [])
          if (usdaIds.has(cand.id) && cand.year !== null && Math.abs(cand.year - pub.year) <= 1)
            return `${pub.author} ${pub.year}`;
        return null;
      }).filter(Boolean))];
      would[k] = {
        phenol_explorer: mgs.length > 1 ? mgs : mgs[0],
        page_now: now,
        verdict: now === null ? "new"
          : (Math.abs(mean - now) <= 0.06 || (now !== 0 && Math.abs(mean - now) / now <= 0.02)
            ? "agrees-to-rounding" : "differs"),
        publications: publications.map(id => pubs[id] ? `${id} ${pubs[id].author} ${pubs[id].year}` : `${id} unknown`),
        shared_with_usda: shared,
        /* The rule. Shared provenance only bites where USDA already has a
           figure in this cell, because that is where citing both would print
           one measurement twice. An empty cell duplicates nothing. */
        citable: now === null || shared.length === 0,
        n: Math.max(...parts.map(x => x.n)),
      };
    }
    p.would_fill = would;
    return p;
  };

  map.proposed = map.proposed.map(annotate);
  map.open_questions = (map.open_questions || []).map(annotate);
  map.annotated_on = new Date().toISOString().slice(0, 10);
  if (problems.length) throw new Error(`the map names things that do not exist:\n  - ${problems.join("\n  - ")}`);

  const cells = [...map.proposed, ...map.open_questions].flatMap(p => Object.values(p.would_fill));
  console.log(`${map.proposed.length} proposed foods, ${map.open_questions.length} open questions`);
  console.log(`${cells.length} cells, ${cells.filter(c => c.citable).length} citable without printing one measurement twice`);
  if (dry) { console.log("\n--dry-run: nothing written"); return; }
  await writeFile(path, JSON.stringify(map, null, 1) + "\n");
  console.log(`\nwrote ${path}`);
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === "publications") await cmdPublications({ dry: rest.includes("--dry-run") });
  else if (cmd === "coverage") await cmdCoverage();
  else if (cmd === "overlap") await cmdOverlap();
  else if (cmd === "annotate") await cmdAnnotate({ dry: rest.includes("--dry-run") });
  else {
    console.error("usage: phenol_explorer.mjs publications [--dry-run] | coverage | overlap | annotate [--dry-run]");
    process.exit(1);
  }
} catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
