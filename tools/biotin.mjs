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
 * The biotin cell for one food, from whichever of the four sources reach it.
 *
 * Frida arrives already reduced to a figure rather than as a row, because what
 * a Frida cell may contribute is decided by its own admission rule and not by
 * anything here: a value compiled from CoFID or AFCD is refused there, which is
 * what stops this page holding one table twice under two names. See
 * `fridaFigure` in tools/frida.mjs.
 *
 * @param {{
 *   mext?: { state: string, value: number|null },
 *   cofid?: { biotin_ug: string },
 *   afcd?: { biotin_ug: string, derivation: string },
 *   frida?: { source: string, value: number, derivation: string, n?: number },
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
  if (rows.frida) cands.push(rows.frida);

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
  "each", "per", "all"]);

/* A crude stem: enough to pair "Chickpeas" with "Chickpea" and "Almonds" with
   "Almond" without pulling in a stemmer. Deliberately conservative, because a
   stem that over-merges invents matches a reviewer then has to catch.

   The -ies rule is not decoration. Without it "Strawberries" stemmed to
   "strawberri" while "Strawberry" stemmed to itself, so Frida's "Strawberry,
   raw" scored zero against this page's strawberries and never reached review;
   the frozen row led on n=2 where the raw row holds n=7 to 10. Every berry on
   this page was one letter from the same fate.

   **The -es rule is only right where the -s rule would not do**, which is after
   a sibilant or an o: radishes, boxes, tomatoes. Stripping both letters off
   every plural took "Dates" to "dat" while "Date" stayed "date", so this page's
   dates scored zero against Frida's "Date, dried" and were reported as a food
   Frida does not hold. **Grapes, prunes, nectarines and tangerines were the
   same word away from the same fate**, and Frida has a row for each. The
   symptom is the -ies bug's, one class of plural at a time: a plural that does
   not stem to its own singular cannot meet it, and the search then says the
   database was asked and had nothing, which is the one answer this document
   must never give wrongly. */
const stem = w => w.length > 4 && w.endsWith("ies") ? `${w.slice(0, -3)}y`
  : w.length > 4 && /(?:ch|sh|s|x|z|o)es$/.test(w) ? w.slice(0, -2)
  : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;

/* Stopped on the stem rather than before it, or the list means one thing for a
   singular and another for its plural. It held "seeds" and "kernels" and not
   "seed" or "kernel", so "Pumpkin seeds" scored as "Pumpkin" and led the
   vegetable, which admits iodine alone against the seed row's four. Both words
   are gone from the list as well: a word that says which food this is was
   never a word that says nothing. */
const tokens = s => new Set(String(s).toLowerCase().split(/[^a-z]+/)
  .filter(w => w.length > 2).map(stem).filter(w => !STOP.has(w)));

const COOKED = ["cooked", "boiled", "baked", "roasted", "steamed", "grilled", "fried", "stewed"];
const RAW = ["raw", "dried", "dry", "uncooked"];

/* On a word boundary, for the reason the traps below carry one: without it
   "st-raw-berries" tested as a raw row, so "Strawberries, frozen" scored level
   with "Strawberry, raw" and led it on corpus order. The same substring sits
   in strawberry jam, strawberry ice cream and every straw-named row Frida
   holds, and none of them is a raw food. */
const says = (list, text) => list.some(w => new RegExp(`\\b${w}\\b`).test(text));

/* The two halves of RAW, kept apart for the one test that needs them apart. */
const SAYS_RAW = ["raw", "uncooked"];
const DRIED = ["dried", "dry"];
const FROZEN = ["frozen"];

/** Whether a source row names a cooking method at all. Exported because
 *  tools/frida.mjs's review needs it and must ask the same question this
 *  scorer does: its "look twice" line warned that "White beans, dried and
 *  boiled" says dried where the page food says cooked, of the one row that
 *  answers a cooked page food.
 *
 *  @param {string} row the source row's own name */
export const namesCooking = row => says(COOKED, String(row).toLowerCase());

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
  /* "with sugar" did not read "with brown sugar", and "Rye bread crumbs with
     brown sugar" then tied with every plain rye bread at 28 and led them all.
     Not a bare /sugar/, which would take out Frida's "Sugar pea (Snow pea,
     Mangetout) raw", the row that answers this page's mangetout. */
  [/\bin syrup\b|\bsweetened\b|\bwith (brown |cane |raw )?sugar\b|\bsugar added\b/, 25],
  [/canned/, 15],
  [/\bsalted\b|\btoasted\b|\bsmoked\b/, 15],
  /* A dish containing the food is not the food. Peanut brittle led the
     peanut candidates at 24 ug where the kernel row holds 72, and a figure
     for brittle is a figure for its sugar and butter as much as for its
     peanuts. */
  [/\b(brittle|yogurt|yoghurt|biscuit|cereal|bhaji|confectioner|chocolate|cake|brownie|pie|pudding|curry|soup|salad|sandwich|toast|takeaway|homemade|roast|sauce)\b/, 35],
];

/* A name scorer cannot see through a synonym, and this page names its foods in
   British English where the tables do not. Every entry here is a fact about
   vocabulary rather than a judgement about a pairing: the alias only lets a row
   reach the review, and a person still decides it.

   Flaxseed is Frida's "Linseeds, raw", which admits a chromium determination
   and which no scorer will ever find; the old unreviewed map held that pairing
   and this search could not. Haricot beans are Denmark's white beans, and
   Frida's own "Green beans (haricots verts)" is a different bean that beat the
   right row two shared words to one.

   Keyed on the page food's whole name, not a word of it, so nothing here can
   fire on a food it was not written for. */
const ALIASES = new Map([
  ["flaxseed", ["Linseed"]],
  ["haricot beans", ["White beans"]],
]);

const aliasesOf = name => ALIASES.get(String(name).toLowerCase().trim()) ?? [];

/**
 * How well a source row matches a page food. Zero or below means no candidate.
 * Scored under the page food's own name and any synonym, best answer winning.
 *
 * @param {string} name page food name, "Chickpeas"
 * @param {string} state page food state, "cooked" or ""
 * @param {string} row the source row's own name
 * @returns {number}
 */
export function scoreCandidate(name, state, row) {
  return [name, ...aliasesOf(name)]
    .reduce((best, n) => Math.max(best, scoreOne(n, state, row)), 0);
}

function scoreOne(name, state, row) {
  const want = tokens(name), have = tokens(row);
  let shared = 0;
  for (const w of want) if (have.has(w)) shared++;
  if (!shared) return 0;

  let score = shared * 10;
  const low = String(row).toLowerCase();
  const said = String(state).toLowerCase();
  const wantsCooked = says(COOKED, said);
  const wantsRaw = says(RAW, said);
  const rowCooked = says(COOKED, low);
  const rowRaw = says(RAW, low) && !rowCooked;

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
  /* RAW holds raw and dried together, which is right for a page food carrying
     no state, where "dried" is only Frida's house style for a nut. It is wrong
     for one that says raw: Frida holds both forms of apricot, peach, plum and
     fig, and the dried row led all four, because the two scored level and the
     dried one came first in the file. Dried apricot's chromium is 80 where the
     raw row's is 0. A row that says both, as "Brazil nuts, dried, raw" does,
     is a nut sold dried rather than a food dried, and stays. */
  if (says(SAYS_RAW, said) && says(DRIED, low) && !says(SAYS_RAW, low)) return 0;
  /* Frozen is blanched, not cooked, and Frida has no cooked row for green
     peas, brussels sprouts or green beans; its frozen one led all three, and
     "Sweet potato fries, frozen" led sweet potato baked. Neither is the food
     the page names. A row that freezes something already cooked says so and
     keeps its bonus above, so this only takes the ones that claim nothing. */
  if (wantsCooked && !rowCooked && says(FROZEN, low)) return 0;

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
  const count = n => {
    const want = tokens(n), have = tokens(row);
    let shared = 0;
    for (const w of want) if (have.has(w)) shared++;
    return { shared, of: want.size };
  };
  /* Under a synonym too, and the most complete answer wins, for the reason
     scoreCandidate does the same: grading "Haricot beans" against "White
     beans, dried and boiled" on the page's own words alone finds one word of
     two and calls a right pairing a proxy. */
  return [name, ...aliasesOf(name)]
    .map(count)
    .reduce((best, c) => c.shared / c.of > best.shared / best.of ? c : best);
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
