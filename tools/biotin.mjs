#!/usr/bin/env node
/**
 * Biotin, the only component here that three databases measure and none of
 * them agree about.
 *
 * RECONCILIATION.md rule 5 is the reason this has a file of its own: biotin
 * spreads up to 29x on analysed figures, because it occurs largely
 * protein-bound and a figure depends on whether the assay hydrolysed it free.
 * It is the best genuine three-source range the page carries.
 *
 * The cell builder is here rather than in tools/evidence.mjs because that file
 * runs its loops at import, so nothing inside it can be tested.
 */
import { gradeDerivation, reconcile } from "./reconcile.mjs";

/* CoFID's two markers. N is a component it did not measure. Tr is a trace,
   which is a finding: something was there, below the point where the assay
   would put a number on it. Tr used to reach parseFloat, become NaN and then
   nothing at all, which threw the finding away on 63 rows. */
const num = v => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

/* A state that carries meaning without carrying a figure. Never collapse
   these: which kind of nothing a cell holds is the most useful thing this
   dataset says. */
const passthrough = s =>
  s === "trace" || s === "not-detected" || s === "not-measured" ? s : null;

/* Which of two findings to show where neither carries a figure. A trace says
   something was seen and not-detected says nothing was, so the trace is the
   stronger statement and printing not-detected over it would claim more than
   the evidence supports. The disagreement is recorded either way. */
const RANK = { trace: 3, "not-detected": 2, "not-measured": 1 };

/* Two of these are findings and one is a gap. Not-measured says nothing, so
   it cannot disagree with anything. */
const FINDING = new Set(["trace", "not-detected"]);

/**
 * The biotin cell for one food, from whichever of the three sources reach it.
 *
 * @param {{
 *   mext?: { state: string, value: number|null },
 *   cofid?: { biotin_ug: string },
 *   afcd?: { biotin_ug: string, derivation: string },
 * }} rows
 * @returns {object|null} a cell, or null where no source says anything
 */
export function biotinCell(rows) {
  const cands = [];
  const states = {};

  if (rows.mext) {
    if (rows.mext.state === "measured" && typeof rows.mext.value === "number")
      cands.push({ source: "mext-2020", value: rows.mext.value, derivation: "analysed" });
    else if (passthrough(rows.mext.state)) states.mext = rows.mext.state;
  }
  if (rows.cofid) {
    const raw = String(rows.cofid.biotin_ug ?? "").trim();
    if (raw === "Tr") states.cofid = "trace";
    else if (raw !== "N") {
      const v = num(raw);
      if (v !== null) cands.push({ source: "cofid-2021", value: v, derivation: "analysed" });
    }
  }
  if (rows.afcd) {
    const v = num(rows.afcd.biotin_ug);
    if (v !== null) cands.push({ source: "afcd-r3", value: v,
      derivation: gradeDerivation(rows.afcd.derivation) });
  }

  if (cands.length) return reconcile(cands);

  const held = Object.entries(states);
  if (!held.length) return null;
  held.sort((a, b) => RANK[b[1]] - RANK[a[1]]);
  const [who, state] = held[0];
  const cell = { state, sources: [who === "mext" ? "mext-2020" : "cofid-2021"] };
  /* Two sources reporting different findings is a disagreement no figure can
     express and no range can hold. Recorded rather than resolved. A finding
     against a gap is not a disagreement, so both have to be findings. */
  if (held.length > 1 && held[1][1] !== state && held.every(([, st]) => FINDING.has(st)))
    cell.conflict = Object.fromEntries(held);
  return cell;
}

/* Words that say nothing about which food this is. Preparation words are not
   here: they are scored separately, because getting them wrong is the one
   mistake that puts a plausible number on the wrong row. */
const STOP = new Set(["and", "with", "the", "in", "or", "no", "added", "whole",
  "fresh", "weighed", "flesh", "only", "commercial", "average", "type",
  "unfortified", "regular", "unsalted", "salt", "water", "drained", "from",
  "each", "per", "all", "kernels", "seeds"]);

/* A crude stem: enough to pair "Chickpeas" with "Chickpea" and "Almonds" with
   "Almond" without pulling in a stemmer. Deliberately conservative, because a
   stem that over-merges invents matches a reviewer then has to catch. */
const stem = w => w.length > 3 && w.endsWith("es") ? w.slice(0, -2)
  : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;

const tokens = s => new Set(String(s).toLowerCase().split(/[^a-z]+/)
  .filter(w => w.length > 2 && !STOP.has(w)).map(stem));

const COOKED = ["cooked", "boiled", "baked", "roasted", "steamed", "grilled", "fried", "stewed"];
const RAW = ["raw", "dried", "dry", "uncooked"];

/* Rows whose figure is on a different basis, or whose food is a different
   food, and which score well on words alone. Each of these was seen in the
   corpora rather than imagined.
   Word boundaries throughout, and they are not decoration. Without them
   /salted/ matched the tail of "unsalted", and every AFCD nut row names
   itself "raw, unsalted", so the rows this list exists to protect were the
   ones it pushed down. */
const TRAPS = [
  [/weighed with (shell|skin|stone|pod)/, 40],
  [/weighed as purchased/, 40],
  [/juice/, 30],
  /* A thing pressed, ground or milled from the food is not the food, and it
     scored level with the real row: "Oil, walnut" carries a trace and tied
     with "Walnuts, kernel only" at 19.0, first in corpus order, so the
     proposal would have carried the oil. The guard above is what keeps an
     oil page food matched to its own oil.

     `drink` and `beverage` joined `milk` when Frida was proposed against: its
     "Almond drink, unfortified" scored 18 and led "Almond, raw" at 10, so the
     proposal carried the drink. Frida names these EuroFIR-style rather than as
     milks, which is why the existing word did not catch them. */
  [/\boils?\b|\bbutter\b|\bmargarine\b|\bspread\b|\bpaste\b|\bflour\b|\bmilk\b|\bdrinks?\b|\bbeverage\b/, 35],
  [/\bin syrup\b|\bsweetened\b|\bwith sugar\b/, 25],
  [/canned/, 15],
  [/\bsalted\b|\btoasted\b|\bsmoked\b/, 15],
  /* A dish containing the food is not the food. Peanut brittle led the
     peanut candidates at 24 ug where the kernel row holds 72, and a figure
     for brittle is a figure for its sugar and butter as much as for its
     peanuts. */
  [/\b(brittle|yogurt|yoghurt|biscuit|cereal|bhaji|confectioner|chocolate|cake|brownie|pie|pudding|curry|soup|salad|sandwich|toast|takeaway|homemade|roast)\b/, 35],
];

/**
 * How well a source row matches a page food. Zero or below means no candidate.
 *
 * @param {string} name page food name, "Chickpeas"
 * @param {string} state page food state, "cooked" or ""
 * @param {string} row the source row's own name
 * @returns {number}
 */
export function scoreCandidate(name, state, row) {
  const want = tokens(name), have = tokens(row);
  let shared = 0;
  for (const w of want) if (have.has(w)) shared++;
  if (!shared) return 0;

  let score = shared * 10;
  const low = String(row).toLowerCase();
  const wantsCooked = COOKED.some(w => String(state).toLowerCase().includes(w));
  const wantsRaw = RAW.some(w => String(state).toLowerCase().includes(w));
  const rowCooked = COOKED.some(w => low.includes(w));
  const rowRaw = RAW.some(w => low.includes(w)) && !rowCooked;

  if (wantsCooked && rowCooked) score += 8;
  if (wantsRaw && rowRaw) score += 8;
  /* A page food carrying no state has nothing to disagree about with a row
     that names no preparation, and nothing to disagree about with one that
     names a raw or dried form either: an unstated food on this page is the
     whole, uncooked thing, which is why AFCD's raw rows are the ones its map
     points at. Without this, a whole nut and a raw fruit can never reach the
     score that suggests an exact grade, and every pair in those categories
     arrives at review marked proxy.
     The second half of it was added for Frida, which writes "Almond, raw" and
     "Walnuts, dried" where CoFID writes "Almonds, whole kernels". The same
     pairing was reaching review as a proxy from one source and a close match
     from the other, on nothing but the source's house style. */
  if (!wantsCooked && !wantsRaw && !rowCooked) score += 8;
  /* A preparation mismatch is not a weaker match, it is a different
     measurement. It takes the candidate out rather than ranking it lower. */
  if (wantsCooked && rowRaw) return 0;
  if (wantsRaw && rowCooked) return 0;

  for (const [re, penalty] of TRAPS)
    if (re.test(low) && !re.test(String(name).toLowerCase())) score -= penalty;

  return score;
}

/** How much of the page food's name the row's contains, which is a different
 *  question from the score: the score rewards a shared word and a matching
 *  preparation together, so one word of two can reach the same number as two
 *  of two. Exported because tools/frida.mjs grades on it, and it must be this
 *  tokeniser rather than another one that nearly agrees.
 *
 *  @returns {{ shared: number, of: number }} */
export function sharedTokens(name, row) {
  const want = tokens(name), have = tokens(row);
  let shared = 0;
  for (const w of want) if (have.has(w)) shared++;
  return { shared, of: want.size };
}

/* A grade is a claim about the pair, and the reviewer's to make. This suggests
   one so the common case is a nod rather than a decision. */
const suggestGrade = (score, name, row) => {
  const { shared, of } = sharedTokens(name, row);
  return shared === of && score >= 18 ? "exact" : score >= 18 ? "close" : "proxy";
};

/* Run as a command rather than imported: propose map pairs for review. The
   same entry-point guard tools/usda.mjs carries, so importing this file for
   biotinCell never runs a proposal. */
if (process.argv[1] && process.argv[1].endsWith("biotin.mjs")) {
  const [, , cmd, ...args] = process.argv;
  if (cmd !== "propose") {
    console.error("usage: node tools/biotin.mjs propose <Category> [<Category>...]");
    process.exit(1);
  }
  const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
  const EV = join(ROOT, "tools", "evidence");
  const rd = f => JSON.parse(readFileSync(join(EV, f), "utf8"));
  const slugify = (name, state) => `${name} ${state || ""}`
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const foods = JSON.parse(readFileSync(join(ROOT, "src", "data", "nutrients.json"), "utf8"))
    .foods.filter(f => args.includes(f.cat));
  if (!foods.length) {
    console.error(`no page foods in category ${args.join(", ")}`);
    process.exit(1);
  }

  const hasFigure = v => v != null && v !== "" && v !== "N" && !Number.isNaN(parseFloat(v));
  const cofidRows = rd("cofid-2021-plant.json")
    .filter(r => hasFigure(r.biotin_ug) || r.biotin_ug === "Tr");
  const afcdRows = rd("afcd-r3-plant.json").filter(r => hasFigure(r.biotin_ug));

  const cofidMapped = new Set(rd("page-map-cofid.json")
    .map(m => slugify(m.page, m.page_state)));
  const afcdMapped = new Set(Object.keys(rd("page-map-afcd.json")));

  const top = (rows, nameOf, food) => rows
    .map(r => ({ row: r, score: scoreCandidate(food.name, food.state, nameOf(r)) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const cofidOut = [], afcdOut = {};
  let lines = `\n## Batch: ${args.join(", ")}\n\nProposed ${new Date().toISOString().slice(0, 10)}. Nothing here is mapped until it is read.\n`;

  for (const food of foods) {
    const slug = slugify(food.name, food.state);
    const label = `${food.name}${food.state ? `, ${food.state}` : ""}`;
    const cofid = cofidMapped.has(slug) ? [] : top(cofidRows, r => r.name, food);
    const afcd = afcdMapped.has(slug) ? [] : top(afcdRows, r => r.name, food);
    if (!cofid.length && !afcd.length) continue;

    lines += `\n### ${label}\n\n| Source | Row | Biotin | Derivation | Score | Grade |\n|---|---|---|---|---|---|\n`;
    for (const c of cofid)
      lines += `| CoFID | ${c.row.code} ${c.row.name} | ${c.row.biotin_ug} | analysed | ${c.score} | ${suggestGrade(c.score, food.name, c.row.name)} |\n`;
    for (const c of afcd)
      lines += `| AFCD | ${c.row.key} ${c.row.name} | ${c.row.biotin_ug} | ${c.row.derivation} | ${c.score} | ${suggestGrade(c.score, food.name, c.row.name)} |\n`;

    if (cofid[0]) cofidOut.push({ page: food.name, page_state: food.state || "",
      cofid_code: cofid[0].row.code, cofid_name: cofid[0].row.name,
      match: suggestGrade(cofid[0].score, food.name, cofid[0].row.name),
      biotin_ug: cofid[0].row.biotin_ug });
    if (afcd[0]) afcdOut[slug] = { key: afcd[0].row.key, name: afcd[0].row.name,
      match: suggestGrade(afcd[0].score, food.name, afcd[0].row.name),
      biotin_ug: afcd[0].row.biotin_ug, derivation: afcd[0].row.derivation };
  }

  writeFileSync(join(EV, "proposed-page-map-cofid.json"), JSON.stringify(cofidOut, null, 1) + "\n");
  writeFileSync(join(EV, "proposed-page-map-afcd.json"), JSON.stringify(afcdOut, null, 1) + "\n");
  const doc = join(EV, "BIOTIN-MAP-REVIEW.md");
  const head = "# Biotin map proposals, for review\n\nWritten by `node tools/biotin.mjs propose`. Every pair here is a suggestion.\nAutomated name matching is refused in this project, so nothing reaches a\n`page-map-*.json` until it has been read.\n";
  writeFileSync(doc, (existsSync(doc) ? readFileSync(doc, "utf8") : head) + lines);
  console.log(`${cofidOut.length} CoFID and ${Object.keys(afcdOut).length} AFCD pairs proposed, for review in tools/evidence/BIOTIN-MAP-REVIEW.md`);
}
