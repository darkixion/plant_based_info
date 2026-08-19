#!/usr/bin/env node
/**
 * Iodine, the component RECONCILIATION.md rule 3 was written about.
 *
 * Rolled oats are 74 ug in Australia and not detected in Japan, and that
 * conflict is the case that justifies the whole range mechanism: a single best
 * value would be wrong whichever number was picked. Until now the column was
 * MEXT alone, so the conflict could not appear at all.
 *
 * Three sources reach it. MEXT assayed 102 of this page's foods and marks an
 * absence apart from a zero. AFCD reaches 72 through its reviewed map. The
 * USDA/FDA/ODS-NIH release reaches 40 through an id join with no name matching
 * anywhere in it, and is the only one that reports how many samples each figure
 * rests on. See USDA-IODINE-PROVENANCE.md for what each of them measured.
 *
 * The cell builder is here rather than in tools/evidence.mjs because that file
 * runs its loops at import, so nothing inside it can be tested. Same reason
 * biotin.mjs exists, and the shape is deliberately its sibling.
 */
import { gradeDerivation, reconcile } from "./reconcile.mjs";

const num = v => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

/* MEXT prints an estimated figure in parentheses and keeps `value` null for
   anything that is not a plain number, so the figure comes back off `raw`. */
const figureOf = c =>
  typeof c.value === "number" ? c.value
  : (m => (m ? Number(m[0]) : null))(/-?\d+(\.\d+)?/.exec(String(c.raw ?? "")));

/* A state that carries meaning without carrying a figure. Which kind of
   nothing a cell holds is the most useful thing this dataset says, so these
   are never collapsed into each other. MEXT's "*" is a seventh thing, a food
   the table has no entry for at all, and says nothing. */
const passthrough = s =>
  s === "trace" || s === "not-detected" || s === "not-measured" ? s : null;

/* A trace says something was seen and not-detected says nothing was, so the
   trace is the stronger statement. Not-measured says nothing at all and can
   never outrank a finding. */
const RANK = { trace: 3, "not-detected": 2, "not-measured": 1 };

/* The floor below which these sources are not saying different things, in ug
   per 100 g. Rules 3 and 4 are both ratio tests, and a ratio is meaningless
   near zero: 0.2 against 0.4 is a factor of two and 0 against anything is
   infinite, so without a floor every fruit in the release comes out as a
   conflict. Apple raw was AFCD 0, USDA 0.1 over 35 samples and MEXT not
   detected, which reconciled to the range "0 to 0.1" and printed as
   "0 (0 to 0)".

   Half a microgram, for two reasons that agree. It is where the assays stop:
   the FDA's Total Diet Study reports iodine to a limit of detection around a
   tenth of a microgram per 100 g, so a figure of 0.1 is the instrument's floor
   rather than the food's content. And it is below what the column can print,
   `dp: 0` in nutrients.json, so a spread that lives entirely under it is a
   disagreement no reader could see. Nothing on this page sits awkwardly near
   it: the next figure up is celery at 1.7. */
const FLOOR = 0.5;

/**
 * The iodine cell for one food, from whichever of the three sources reach it.
 *
 * Two rules beyond the four in reconcile.mjs, and they are the same rule seen
 * twice: **a numeric zero corroborates a source's own finding of absence, and
 * never overrides it.**
 *
 * - Where nothing analysed reaches the floor and a source reported
 *   not-detected, the cell stays not-detected and names everyone who agrees.
 *   "None detected" is what a laboratory said; 0 is what a spreadsheet holds,
 *   and the page has spent a lot of effort keeping those apart.
 * - Where nothing analysed reaches the floor and a source reported a trace,
 *   the cell stays a trace. Something was seen. AFCD's cooked-pumpkin 0 is a
 *   Recipe figure and MEXT's trace is an assay, and the assay wins on more
 *   than derivation.
 *
 * Once an analysed figure reaches the floor the cell is a reconciliation, and
 * then an analysed absence enters the span as zero: that is the oats rule, and
 * it is what makes 0 to 74 rather than 74 alone.
 *
 * @param {{
 *   mext?: { state: string, value: number|null, raw?: string },
 *   afcd?: { iodine_ug: string, derivation: string },
 *   usda?: { iodine_ug_100g: string, n: string },
 * }} rows
 * @returns {object|null} a cell, or null where no source says anything
 */
export function iodineCell(rows) {
  const figures = [];
  const states = {};

  if (rows.mext) {
    const st = rows.mext.state;
    if (st === "measured" || st === "estimated") {
      const v = figureOf(rows.mext);
      if (v !== null) figures.push({ source: "mext-2020", value: v,
        derivation: st === "estimated" ? "estimated" : "analysed" });
    } else if (passthrough(st)) states["mext-2020"] = st;
  }

  /* AFCD's derivation is per row rather than per component, so Analysed means
     the row was analysed and not that iodine specifically was. It is the only
     answer the release publishes at this grain; the limitation is recorded in
     USDA-IODINE-PROVENANCE.md rather than guessed around. */
  if (rows.afcd) {
    const v = num(rows.afcd.iodine_ug);
    if (v !== null) figures.push({ source: "afcd-r3", value: v,
      derivation: gradeDerivation(rows.afcd.derivation) });
  }

  /* Every row of the USDA release names the programme that ran the assay and
     the years it ran, so all of it is analysed. n comes with it, which no
     other source here supplies. */
  if (rows.usda) {
    const v = num(rows.usda.iodine_ug_100g);
    if (v !== null) {
      const n = num(rows.usda.n);
      const c = { source: "usda-iodine-r4", value: v, derivation: "analysed" };
      if (n) c.n = n;
      figures.push(c);
    }
  }

  const analysed = figures.filter(f => f.derivation === "analysed");
  const found = Object.entries(states).filter(([, s]) => s !== "not-measured");

  /* Nothing numeric anywhere. The strongest finding held wins, and a food no
     source assayed comes back as the gap it is. */
  if (!figures.length) {
    const held = Object.entries(states);
    if (!held.length) return null;
    held.sort((a, b) => RANK[b[1]] - RANK[a[1]]);
    return { state: held[0][1], sources: [held[0][0]] };
  }

  /* Detected, at a level this column can tell from nothing. Below the floor
     the sources agree that there is no iodine here to speak of, however much
     their ratios differ, and the finding a source reported in words is the
     better answer than a range across their noise. */
  if (!analysed.some(f => f.value >= FLOOR)) {
    if (found.length) {
      found.sort((a, b) => RANK[b[1]] - RANK[a[1]]);
      const [source, state] = found[0];
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

  for (const [source, state] of Object.entries(states))
    if (state === "not-detected") figures.push({ source, value: 0, derivation: "analysed" });

  return reconcile(figures);
}


/* ---------- the join ----------
   The USDA release carries NDB numbers, and SR Legacy's own crosswalk maps
   fdc_id to NDB, so a page food reaches a release row through ids alone. The
   chain is the reviewed one tools/flavonoids.mjs already walks: page food ->
   fdc_id, from usda-map.json and food-additions.json, both human-checked ->
   NDB number, from SR Legacy -> release row. There is no name matching
   anywhere in it, which is why it may be run rather than reviewed by hand.

   Written into the corpus as a list of page slugs per row, the way the
   proanthocyanidin release carries its mapping, so no separate map file exists
   to drift from it. Run as `node tools/iodine.mjs map`; the SR Legacy
   crosswalk it needs is a gitignored cache, which is exactly why the result is
   committed rather than recomputed at build time.

   94 of the 478 rows carry no NDB at all and are unreachable by this chain.
   Nori is one of them, and pairing it is a human's to bank. */
import { readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SR_DIR = join(ROOT, "tools", "cache", "FoodData_Central_sr_legacy_food_csv_2018-04");
const CORPUS = join(ROOT, "tools", "evidence", "usda-iodine-r4.json");

const slugify = f => `${f.name} ${f.state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function cmdMap({ dry }) {
  try { await access(join(SR_DIR, "sr_legacy_food.csv")); }
  catch { throw new Error(`no SR Legacy crosswalk at ${SR_DIR}. Run 'usda.mjs match' once to fetch it.`); }

  const data = JSON.parse(await readFile(join(ROOT, "src", "data", "nutrients.json"), "utf8"));
  const map = JSON.parse(await readFile(join(ROOT, "src", "data", "usda-map.json"), "utf8"));
  const spec = JSON.parse(await readFile(join(ROOT, "tools", "food-additions.json"), "utf8"));

  const fdcOf = new Map();
  for (const f of [...(spec.requested || []), ...(spec.staples || [])])
    if (f.fdc_id) fdcOf.set(slugify(f), String(f.fdc_id));
  for (const [slug, m] of Object.entries(map))
    if (m.fdc_id) fdcOf.set(slug, String(m.fdc_id));

  /* Two columns and no quoted commas in either, so a split is enough. The
     project has a CSV reader in tools/csv.mjs and this stays with the simpler
     one the same file is read with elsewhere. */
  const lines = (await readFile(join(SR_DIR, "sr_legacy_food.csv"), "utf8")).split("\n");
  const head = lines[0].split(",").map(s => s.replace(/"/g, "").trim());
  const iFdc = head.indexOf("fdc_id"), iNdb = head.indexOf("NDB_number");
  const ndbOf = new Map();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const c = line.split(",").map(s => s.replace(/"/g, "").trim());
    ndbOf.set(c[iFdc], String(c[iNdb]).padStart(5, "0"));
  }

  const corpus = JSON.parse(await readFile(CORPUS, "utf8"));
  const byNdb = new Map();
  for (const r of corpus) {
    const ndb = String(r.ndb ?? "").trim();
    if (ndb) byNdb.set(ndb.padStart(5, "0"), r);
  }

  const before = corpus.filter(r => r.page_slugs?.length).length;
  /* Rebuilt rather than added to. A food that loses its fdc mapping has to
     lose its row here with it, and an append would leave the slug behind
     pointing at a row the reviewed chain no longer reaches. */
  for (const r of corpus) r.page_slugs = [];

  let placed = 0; const unreached = [];
  for (const f of data.foods) {
    const slug = slugify(f);
    const fdc = fdcOf.get(slug);
    const ndb = fdc ? ndbOf.get(fdc) : undefined;
    const row = ndb ? byNdb.get(ndb) : undefined;
    if (!row) { unreached.push(slug); continue; }
    row.page_slugs.push(slug);
    placed++;
  }
  for (const r of corpus) r.page_slugs.sort();

  const after = corpus.filter(r => r.page_slugs.length).length;
  console.log(`rows naming a page food: ${before} -> ${after}`);
  console.log(`page foods placed: ${placed} of ${data.foods.length}`);
  console.log(`${unreached.length} foods reach no release row (no fdc id, no NDB number, or not in Release 4.0)`);
  if (dry) { console.log("\n--dry-run: nothing written"); return; }
  await writeFile(CORPUS, JSON.stringify(corpus, null, 1) + "\n");
  console.log(`\nwrote ${CORPUS}`);
}

if (process.argv[1] && process.argv[1].endsWith("iodine.mjs")) {
  const args = process.argv.slice(2);
  const cmd = args.find(a => !a.startsWith("-"));
  if (cmd === "map") await cmdMap({ dry: args.includes("--dry-run") });
  else {
    console.log("usage: node tools/iodine.mjs map [--dry-run]\n");
    console.log("  map   rewrite page_slugs on tools/evidence/usda-iodine-r4.json");
    console.log("        from the reviewed page -> fdc_id -> NDB -> row chain.");
  }
}
