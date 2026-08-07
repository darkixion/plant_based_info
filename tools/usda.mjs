#!/usr/bin/env node
/**
 * Pulls nutrient columns from the USDA SR Legacy bulk dataset.
 *
 *   node tools/usda.mjs match            propose food mappings -> src/data/usda-map.json
 *   node tools/usda.mjs pull <id>...     add those USDA nutrients as columns
 *   node tools/usda.mjs pull --dry-run   report what would change, write nothing
 *
 * Why a committed map rather than matching on the fly: automated food matching
 * is confidently wrong in ways that are hard to spot. An early fingerprint-only
 * run paired "Black beans" with "Black pudding, boiled" (blood sausage) purely
 * because the macros lined up. So matching is a one-off step whose output is
 * reviewed by a human and version-controlled, and the pull step only ever reads
 * that reviewed map.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCSV, readCSV as readCSVAt } from "./csv.mjs";

const exec = promisify(execFile);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CACHE = join(ROOT, "tools", "cache");
const CSV_DIR = join(CACHE, "FoodData_Central_sr_legacy_food_csv_2018-04");
const ZIP_URL = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip";
const DATA = join(ROOT, "src", "data", "nutrients.json");
const MAP = join(ROOT, "src", "data", "usda-map.json");

/* USDA nutrient ids we know how to describe. Extend as needed.
   Every definition carries its own `why`, because the build refuses a column
   without one: a pull that omitted it would write a dataset that cannot be
   built, which is a confusing way to find out. */
const KNOWN = {
  // The two essential fatty acids. `after` puts them at the head of the fats
  // group, straight after the last macronutrient column.
  1404: { id: "ala", label: "Omega-3 (ALA)", group: "fats", unit: "g", dv: 1.6, dp: 3, after: "water",
    why: "The only omega-3 the body cannot make, and the form plant foods supply. Conversion into the long-chain EPA and DHA that the brain and eyes actually use is inefficient, so a high ALA intake is not the same thing." },
  1316: { id: "la", label: "Omega-6 (LA)", group: "fats", unit: "g", dv: 17, dp: 3, after: "ala",
    why: "The essential omega-6, plentiful in nuts, seeds and their oils. It competes with ALA for the same conversion enzymes, so a very high intake makes the little omega-3 conversion there is smaller still." },

  // The two long-chain omega-3s ALA is supposed to convert into. They are here
  // for the answer they give rather than the figures they carry: SR Legacy
  // assayed 113 of these 128 foods for each, and found DHA above zero in one
  // (quinoa, 0.015 g) and EPA in four (nori 0.08, sunflower seeds 0.014, kelp
  // 0.004, edamame 0.003).
  //
  // That is the point of the columns. A measured zero is not missing data, and
  // this table distinguishes the two everywhere: 113 foods were tested and
  // found to have essentially none, which is a far stronger statement than
  // having no column at all. Without them the page raises the conversion
  // question in the ALA note above and cannot answer it.
  //
  // No daily value. There is no established DV for EPA or DHA, and the omega-3
  // one belongs to ALA, which already has it. Giving these one would count the
  // same requirement three times over in the "% daily value" view, the same
  // double-counting the carotenoid and saturated-fat fraction columns avoid.
  1278: { id: "epa", label: "EPA (20:5)", group: "fats", unit: "g", dv: null, dp: 3, after: "la",
    why: "The long-chain omega-3 that ALA is meant to convert into, and one of the two the body actually uses. Conversion from ALA is poor, and it is close to absent from plant foods: of the foods here that USDA assayed, four carry any at all." },
  1272: { id: "dha", label: "DHA (22:6)", group: "fats", unit: "g", dv: null, dp: 3, after: "epa",
    why: "The omega-3 that makes up much of the brain and the retina. Plant foods essentially do not contain it: USDA assayed most of the foods here and found it above zero in one. Algal oil is the vegan source, since algae is where fish get it too." },

  // Named to match the existing "Omega-3 (ALA)" / "Omega-6 (LA)" columns.
  // 18:1 is undifferentiated in SR Legacy: it includes a little n-7 vaccenic
  // alongside the n-9 oleic, but in plant foods it is overwhelmingly oleic.
  // The Methodology dialog states this; the label should not overclaim.
  // `after` keeps the omegas in numeric order ahead of the totals they belong
  // to, so a fresh pull reproduces the committed column order.
  1268: { id: "oleic", label: "Omega-9 (oleic)", group: "fats", unit: "g", dv: null, dp: 3, after: "palmitoleic",
    why: "The main monounsaturated fat, and what makes olive oil what it is. The body can make it, so it is not essential, but replacing saturated fat with it is one of the better-supported dietary swaps." },
  1275: { id: "palmitoleic", label: "Omega-7 (palmitoleic)", group: "fats", unit: "g", dv: null, dp: 3, after: "la",
    why: "A monounsaturated fat concentrated in macadamias and sea buckthorn. Not essential, since the body makes its own, and counted inside the monounsaturated total rather than in addition to it." },

  // The three saturated fats worth separating. The macronutrient group carries
  // one saturated total; these say what it is made of, which is the difference
  // between coconut and everything else. They are a subset of that total and
  // never the whole of it, since the shorter and longer chains are left out.
  // No daily value: only the saturated total carries one, and giving these
  // their own would count the same grams twice in the "% daily value" view.
  1263: { id: "lauric", label: "Lauric (12:0)", group: "fats", unit: "g", dv: null, dp: 3, after: "pufa",
    why: "The 12-carbon saturated fat that coconut is largely made of and that is close to absent everywhere else. It raises LDL cholesterol but raises HDL alongside it, which is why coconut sits awkwardly in the usual saturated fat story." },
  1265: { id: "palmitic", label: "Palmitic (16:0)", group: "fats", unit: "g", dv: null, dp: 3, after: "lauric",
    why: "The most abundant saturated fat in both plants and animals, and the one dietary advice about saturated fat is mostly about. It is the fraction most consistently shown to raise LDL cholesterol." },
  1266: { id: "stearic", label: "Stearic (18:0)", group: "fats", unit: "g", dv: null, dp: 3, after: "palmitic",
    why: "The 18-carbon saturated fat of cocoa butter and shea. The body converts much of it into oleic acid, so unlike the shorter saturated fats it leaves LDL cholesterol roughly where it found it." },

  // The three totals the fractions above are checked against. They were in
  // COLUMN_TO_USDA, so a newly added food got them, and absent from KNOWN, so
  // `pull` could not touch them. That asymmetry is why re-pulling the fat group
  // could not resolve the fraction-versus-total disagreements: the fractions
  // came from the mapped row and the totals stayed as they were. Definitions
  // copied from the committed columns in nutrients.json, unchanged.
  // No `after`: all three columns already exist, so nothing is being placed.
  1292: { id: "mufa", label: "Monounsaturated", group: "fats", unit: "g", dv: null, dp: 2,
    why: "Fats with a single double bond, the omega-9 and omega-7 columns included. Stable enough to cook with, and the fraction Mediterranean diets are richest in." },
  1293: { id: "pufa", label: "Polyunsaturated", group: "fats", unit: "g", dv: null, dp: 2,
    why: "Fats with more than one double bond, including both of the essential fatty acids. They oxidise readily with heat and light, which is why cold-pressed seed oils need more careful handling." },
  1258: { id: "satfat", label: "Saturated fat", group: "macro", unit: "g", dv: 20, dp: 2,
    why: "The fraction with no double bonds, solid at room temperature. Plant foods are generally low in it, coconut and palm being the exceptions, and it is the fraction dietary guidance asks people to limit." },

  // Gamma-tocopherol, the vitamin E form the alpha-only column does not count.
  // 57 of the 131 foods have a figure and 43 are non-zero; the 14 measured
  // zeros are figures rather than gaps and display as such. Every food with a
  // gamma figure already has alpha, so the column never appears beside an empty
  // vitamin E cell.
  //
  // dv: null is not a shortcut. Only alpha-tocopherol carries the vitamin E
  // daily value, and the % DV view sums what it is given, so a daily value here
  // would add gamma milligrams to a target defined for alpha alone. Same
  // double-counting the carotenoid columns already avoid.
  1126: { id: "gammatoc", label: "Gamma-tocopherol", group: "vitamin", unit: "mg", dv: null, dp: 2, after: "vite",
    why: "The vitamin E form that dominates in seeds and most nuts, often several times the alpha figure beside it. It carries no daily value and the body excretes it faster, so it is not counted as vitamin E, but it is not nothing either." },

  // Carotenoids. No daily value exists for any of them individually: only
  // vitamin A carries a DV, and it already counts the provitamin-A ones through
  // its own column, so giving them a dv here would double-count them in the
  // "% daily value" view. Chained through `after` so a fresh pull reproduces
  // the committed column order; the first anchors to the last mineral, which is
  // what places the whole group at the end of the table.
  1107: { id: "betacar", label: "Beta-carotene", group: "plant", unit: "µg", dv: null, dp: 0, after: "se",
    why: "The orange pigment of carrots and the most important provitamin A in plant foods. The body converts it into retinol as it needs it, which is why it cannot be overdosed the way preformed vitamin A can." },
  1108: { id: "alphacar", label: "Alpha-carotene", group: "plant", unit: "µg", dv: null, dp: 0, after: "betacar",
    why: "A second provitamin-A carotenoid, converted at about half the rate of beta-carotene. It travels with beta-carotene in orange vegetables rather than appearing on its own." },
  1120: { id: "cryptox", label: "Beta-cryptoxanthin", group: "plant", unit: "µg", dv: null, dp: 0, after: "alphacar",
    why: "The provitamin-A carotenoid of oranges, tangerines and red peppers. Weaker than beta-carotene as a vitamin A source but absorbed more readily from the foods that carry it." },
  1123: { id: "luteinzea", label: "Lutein + zeaxanthin", group: "plant", unit: "µg", dv: null, dp: 0, after: "cryptox",
    why: "The two carotenoids that concentrate in the retina, where they filter blue light. Dark leaves are much the richest source, and USDA reports them as a single combined figure." },
  1122: { id: "lycopene", label: "Lycopene", group: "plant", unit: "µg", dv: null, dp: 0, after: "luteinzea",
    why: "The red pigment of tomatoes and watermelon. It makes no vitamin A at all, and unusually it becomes easier to absorb after cooking rather than harder." },

  // Phytosterols. This reverses a recorded decision, so the reasoning is worth
  // keeping: the objection on file was that SR Legacy reached "8 to 14" of
  // these foods, which was wrong. It reaches 25, all non-zero, the same
  // coverage as anthocyanidins, which shipped.
  //
  // The real limit is which 25. Sesame at 714 mg, sunflower at 534 and
  // pistachios at 214 dominate it, while almonds and walnuts are among fifteen
  // nuts and seeds with no figure at all, and four whole categories have none:
  // legumes, soy, grains and algae. Sorting by this column therefore ranks
  // foods partly by who USDA assayed. That is true of the flavonoid columns
  // too, and the answer is the same: ship the data and state the limit on the
  // page rather than withhold it.
  //
  // No daily value exists for phytosterols at all, so dv is null rather than
  // omitted for a double-counting reason.
  1283: { id: "phytosterols", label: "Phytosterols", group: "plant", unit: "mg", dv: null, dp: 0, after: "flavonols",
    why: "Plant cholesterol analogues that block some dietary cholesterol from being absorbed. Seeds and nuts carry by far the most, and USDA has assayed too few foods for this column to be read as a ranking." },
};

/* A second USDA id to fall back on when the first is absent.
   SR Legacy carries the two essential fatty acids under two different ids and
   populates them very differently. The differentiated isomer ids, 18:3 n-3 for
   ALA and 18:2 n-6 for LA, are published for about a third of our mapped rows.
   The undifferentiated 18:3 and 18:2 below are published for nearly all of
   them. Reading only the differentiated ids left omega-3 empty for 82 of 128
   foods and omega-6 for 84, including pecans, macadamias, tahini, coconut,
   cocoa powder and olives, while the figure sat in the same reviewed row.

   This is the convention the omega-9 column already uses: 1268 is 18:1
   undifferentiated, and the Methodology dialog says so. The catch specific to
   18:3 is that undifferentiated bundles the omega-6 GLA in with the omega-3
   ALA. In these foods that only matters for hemp, which already has a
   differentiated figure. Every food that takes the fallback is one where GLA
   is negligible.

   Values that came this way are marked per cell rather than silently mixed in,
   because a column drawn from two derivations with no way to tell them apart is
   exactly the kind of quiet inconsistency this dataset refuses elsewhere. */
const FALLBACK = { 1404: 1270, 1316: 1269 };

/* The per-cell note attached to any value that came from a fallback id. Merged
   into whatever notes the dataset already carries; the build checks every food
   and nutrient it names, so a stale entry cannot go unnoticed. */
const UNDIFF_NOTE = {
  id: "undifferentiated",
  marker: "†",
  short: "Undifferentiated figure",
  text: "USDA published no separate isomer figure for this food, so this value comes from its undifferentiated 18:2 or 18:3 total. In plant foods those are overwhelmingly LA and ALA respectively, so it is a close approximation and the convention the omega-9 column already follows, but it is not a direct measurement of the named fatty acid.",
};

/** Rewrites the fallback note to describe exactly the cells given, leaving any
 *  cells it already held for columns outside `owned` alone. Rebuilding rather
 *  than appending means a re-pull that now finds a differentiated figure drops
 *  the marker with it, instead of leaving one behind that no longer applies. */
function recordFallbacks(data, owned, pairs) {
  const notes = data.notes || (data.notes = []);
  let note = notes.find(n => n.id === UNDIFF_NOTE.id);
  if (!note) { note = { ...UNDIFF_NOTE, cells: {} }; notes.push(note); }
  else Object.assign(note, UNDIFF_NOTE, { cells: note.cells || {} });

  for (const [slug, ids] of Object.entries(note.cells)) {
    const keep = ids.filter(id => !owned.has(id));
    if (keep.length) note.cells[slug] = keep; else delete note.cells[slug];
  }
  for (const [slug, id] of pairs)
    (note.cells[slug] ||= []).push(id);
  for (const slug of Object.keys(note.cells))
    note.cells[slug].sort();
  if (!Object.keys(note.cells).length)
    data.notes = notes.filter(n => n !== note);
  return pairs.length;
}

/* Columns used to fingerprint a food. Deliberately wide: energy and macros
   alone collide across unrelated foods, minerals disambiguate them. */
const FINGERPRINT = [
  ["1008", "kcal"], ["1003", "protein"], ["1004", "fat"], ["1005", "carbs"],
  ["1079", "fiber"], ["1087", "ca"], ["1089", "fe"], ["1092", "k"], ["1093", "na"],
];

const slugify = f => `${f.name} ${f.state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** `after` positions the column at build time; it is not page data, so it must
 *  not end up shipped inside nutrients.json. */
const column = ({ after, ...col }) => col;

/* Every CSV this tool reads lives in CSV_DIR, so the call sites name a file
   rather than a path. */
const readCSV = name => readCSVAt(join(CSV_DIR, name));

/* ---------- dataset ---------- */
async function ensureDataset() {
  try { await access(join(CSV_DIR, "food.csv")); return; } catch {}
  await mkdir(CACHE, { recursive: true });
  const zip = join(CACHE, "sr_legacy.zip");
  try { await access(zip); }
  catch {
    process.stdout.write(`downloading SR Legacy (~6 MB)... `);
    const res = await fetch(ZIP_URL);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(zip));
    console.log("done");
  }
  try { await exec("unzip", ["-o", "-q", zip, "-d", CACHE]); }
  catch { throw new Error(`could not unzip ${zip}. Is 'unzip' installed?`); }
}

/** Nutrient values per food, restricted to the ids we care about. */
async function loadNutrients(ids) {
  const want = new Set(ids.map(String));
  const text = await readFile(join(CSV_DIR, "food_nutrient.csv"), "utf8");
  const it = parseCSV(text);
  const head = it.next().value;
  const iFood = head.indexOf("fdc_id"), iNut = head.indexOf("nutrient_id"),
        iAmt = head.indexOf("amount");
  const out = new Map();
  for (const r of it) {
    if (!want.has(r[iNut]) || !r[iAmt]) continue;
    let m = out.get(r[iFood]);
    if (!m) out.set(r[iFood], m = {});
    m[r[iNut]] = Number(r[iAmt]);
  }
  return out;
}

const readData = async () => JSON.parse(await readFile(DATA, "utf8"));

/* ---------- match ---------- */
/** Content words from our food name, for a name-overlap check. */
const STOP = new Set(["and", "the", "with", "raw", "as", "is", "all", "dry"]);
/** Crude singularisation: USDA writes "Nuts, cashew nuts" where we write
 *  "Cashews", and a literal substring test misses on the plural alone. */
const stem = w => w.replace(/(?:ies)$/, "y").replace(/(?:es|s)$/, "");
const words = s => s.toLowerCase().split(/[^a-z0-9]+/)
  .filter(w => w.length > 2 && !STOP.has(w)).map(stem);

/* Preparation states, so "Kale, raw" does not match "Kale, cooked, boiled". */
const STATES = [
  ["raw", /\braw\b|\bfresh\b/], ["cooked", /\bcooked\b|\bboiled\b|\bbaked\b|\bsteamed\b|\bprepared\b/],
  ["dried", /\bdried\b|\bdry\b|\bdehydrated\b/], ["frozen", /\bfrozen\b/],
  ["canned", /\bcanned\b/], ["roasted", /\broasted\b/],
];
const stateOf = s => STATES.filter(([, re]) => re.test(s.toLowerCase())).map(([k]) => k);

async function cmdMatch() {
  await ensureDataset();
  const { nutrients, foods } = await readData();
  const IDX = new Map(nutrients.map((n, i) => [n.id, i]));
  const foodRows = await readCSV("food.csv");
  const names = new Map(foodRows.map(r => [r.fdc_id, r.description]));
  const vals = await loadNutrients(FINGERPRINT.map(([id]) => id));

  let existing = {};
  try { existing = JSON.parse(await readFile(MAP, "utf8")); } catch {}

  const out = {}, report = [];
  for (const f of foods) {
    const slug = slugify(f);
    // A reviewed mapping always wins; never silently re-decide it.
    if (existing[slug]?.reviewed) { out[slug] = existing[slug]; report.push(["kept", f.name, existing[slug].description]); continue; }

    const mine = FINGERPRINT.map(([, key]) => f.v[IDX.get(key)]);
    const myWords = words(f.name);
    const myState = stateOf(`${f.name} ${f.state || ""}`);
    let best = null;
    for (const [fdc, v] of vals) {
      const desc = names.get(fdc);
      if (!desc) continue;
      // Reject an outright state contradiction: a raw row must not match a
      // cooked one however well the macros happen to line up.
      const theirState = stateOf(desc);
      if (myState.length && theirState.length &&
          !myState.some(s => theirState.includes(s))) continue;
      // fingerprint distance, normalised per column so big numbers don't dominate
      let d = 0, n = 0;
      FINGERPRINT.forEach(([id], k) => {
        const a = mine[k], b = v[id];
        if (a === null || a === undefined || b === undefined) return;
        d += Math.abs(a - b) / Math.max(Math.abs(a), 1); n++;
      });
      if (n < 5) continue;
      d /= n;
      // require at least one shared content word: this is what stops a pure
      // macro coincidence pairing beans with black pudding
      const theirWords = words(desc);
      const overlap = myWords.some(w => theirWords.includes(w));
      if (!overlap) continue;
      if (!best || d < best.d) best = { d, fdc, desc };
    }
    if (!best) { report.push(["NONE", f.name, "(no match)"]); continue; }
    const confidence = best.d < 0.02 ? "exact" : best.d < 0.12 ? "close" : "weak";
    out[slug] = { fdc_id: best.fdc, description: best.desc, confidence,
                  distance: +best.d.toFixed(4), reviewed: false };
    report.push([confidence, f.name, best.desc]);
  }

  await writeFile(MAP, JSON.stringify(out, null, 1) + "\n");
  const w = report.filter(r => r[0] === "weak" || r[0] === "NONE");
  console.log(report.map(([c, a, b]) => `  ${c.padEnd(6)} ${a.padEnd(22)} ${b.slice(0, 52)}`).join("\n"));
  console.log(`\nwrote ${MAP}`);
  console.log(`${report.length - w.length} confident, ${w.length} need review ` +
    `Check them, then set "reviewed": true on every entry you accept.`);
}

/* ---------- source rows ----------
   Which USDA row each food came from. Two files answer that, because foods
   arrived by two routes: the original list was matched and reviewed into
   usda-map.json, while everything added later names its row directly in
   food-additions.json. Both are human-chosen, so a pull that read only the
   first would silently leave the 46 added foods empty in every new column.
   The reviewed map wins on a collision, since it is the record that was
   explicitly checked. */
async function sourceRows() {
  const map = JSON.parse(await readFile(MAP, "utf8"));
  const unreviewed = Object.entries(map).filter(([, m]) => !m.reviewed);
  if (unreviewed.length)
    throw new Error(`${unreviewed.length} mapping(s) not reviewed: ` +
      `${unreviewed.slice(0, 4).map(([k]) => k).join(", ")}${unreviewed.length > 4 ? "…" : ""}\n` +
      `  Check them in ${MAP} and set "reviewed": true.`);

  const spec = JSON.parse(await readFile(join(ROOT, "tools", "food-additions.json"), "utf8"));
  const rows = new Map();
  for (const f of [...(spec.requested || []), ...(spec.staples || [])])
    rows.set(slugify(f), f.fdc_id);
  // Deliberately unmapped foods carry a null fdc_id and a recorded reason.
  for (const [slug, m] of Object.entries(map)) rows.set(slug, m.fdc_id);
  return rows;
}

/* ---------- the rule a pull may not break ----------
   A pull may overwrite a figure with a figure, and may fill a gap. It may
   never replace a figure with nothing.

   Writing null wherever the mapped row lacks an id is right for a fresh
   column, where every cell starts empty and null means "USDA has no figure".
   It is wrong for a re-pull. Four foods hold fat values whose mapped row
   carries no fatty acid id at all: Amaranth, whose row 170683 simply has no
   fatty acid analysis, and Soy milk, Seitan and Nutritional yeast, which are
   deliberately unmapped. Their figures came from a source the map does not
   record, and a silent row is not evidence of absence.

   Exported so the rule can be tested as a property of the tool rather than as
   a fact about those four foods. */
export function nextValue(current, incoming) {
  if (incoming !== undefined && incoming !== null) return incoming;
  return typeof current === "number" ? current : null;
}

/* ---------- pull ---------- */
async function cmdPull(args) {
  const dry = args.includes("--dry-run");
  /* Fill only where the table has no figure, leaving every existing value
     exactly as it is. Adding a column is a clean slate, but filling the gaps in
     a column that is already populated is not: the values already there were
     derived from a per-protein profile or an earlier source, and re-deriving
     them from the mapped row is a separate decision with its own consequences.
     Without this flag a gap-filling pull silently becomes a re-pull, and on
     these foods it made things worse rather than better. The example that made
     the case for the flag has since been overtaken, and is kept here because it
     shows what the flag guards against. Pistachios used to reconcile at 13.454 g
     of ALA plus LA against a 13.46 g polyunsaturated total, while the mapped row
     gave 14.38, which exceeded it and would have been withheld by the check
     below, losing a good figure to fill a gap elsewhere. The fat-group re-pull
     now takes the total from that same row too, so the pair reconciles exactly
     and the flag matters for every column whose values still predate its
     mapped row. */
  const fillGaps = args.includes("--fill-gaps");
  const ids = args.filter(a => /^\d+$/.test(a)).map(Number);
  if (!ids.length) throw new Error("give at least one USDA nutrient id, e.g. 1268 1275");
  for (const id of ids) if (!KNOWN[id]) throw new Error(`nutrient ${id} has no column definition in KNOWN`);

  await ensureDataset();
  const data = await readData();
  const rows = await sourceRows();
  const vals = await loadNutrients([...ids, ...ids.map(id => FALLBACK[id]).filter(Boolean)]);

  /* Insert new columns after the nutrient named in `after`, falling back to the
     end of the group. Columns can depend on each other (omega-9 sits after
     omega-7), so keep passing until nothing more can be placed. */
  let pending = ids.map(id => KNOWN[id])
    .filter(def => {
      if (!data.nutrients.some(n => n.id === def.id)) return true;
      console.log(`  ${def.id}: already present, updating values`);
      return false;
    });
  while (pending.length) {
    const before = pending.length;
    pending = pending.filter(def => {
      let at = def.after ? data.nutrients.findIndex(n => n.id === def.after) : -1;
      if (def.after && at === -1) return true;           // its anchor is not placed yet
      if (at === -1) at = data.nutrients.map((n, i) => [n, i])
        .filter(([n]) => n.group === def.group).pop()[1];
      data.nutrients.splice(at + 1, 0, column(def));
      data.foods.forEach(f => f.v.splice(at + 1, 0, null));
      console.log(`  + column ${def.id} (${def.label}) at ${at + 1}`);
      return false;
    });
    if (pending.length === before) {                     // unresolvable anchors
      pending.forEach(def => {
        const at = data.nutrients.map((n, i) => [n, i])
          .filter(([n]) => n.group === def.group).pop()[1];
        data.nutrients.splice(at + 1, 0, column(def));
        data.foods.forEach(f => f.v.splice(at + 1, 0, null));
        console.log(`  + column ${def.id} appended to ${def.group} (anchor "${def.after}" not found)`);
      });
      break;
    }
  }

  const IDX = new Map(data.nutrients.map((n, i) => [n.id, i]));
  let filled = 0, held = 0, missing = [], preserved = [], viaFallback = [];
  // Which cells this run actually wrote, so the check below can tell a value it
  // is responsible for from one that was already in the table.
  const wrote = new Set();
  for (const f of data.foods) {
    const slug = slugify(f);
    const row = vals.get(rows.get(slug));
    for (const id of ids) {
      const col = IDX.get(KNOWN[id].id);
      if (fillGaps && f.v[col] !== null && f.v[col] !== undefined) { held++; continue; }
      let v = row?.[String(id)], fell = false;
      // The differentiated isomer id first, always. The fallback is a close
      // approximation and only worth having where there is nothing better.
      if ((v === undefined || v === null) && FALLBACK[id]) {
        v = row?.[String(FALLBACK[id])];
        fell = v !== undefined && v !== null;
      }
      const before = f.v[col];
      f.v[col] = nextValue(before, v);
      if (v === undefined || v === null) {
        // Preserved rather than missing: the cell keeps a figure this run could
        // not reproduce, which is a different thing from "USDA has no figure"
        // and is worth counting separately.
        if (typeof before === "number") preserved.push(`${f.name}/${KNOWN[id].id}`);
        else missing.push(`${f.name}/${KNOWN[id].id}`);
      } else {
        filled++;
        wrote.add(`${slug} ${col}`);
        if (fell) viaFallback.push([slug, KNOWN[id].id]);
      }
    }
  }

  /* Never write a value that contradicts a total already in the table. Where a
     food's existing fat fractions disagree with the USDA row we mapped it to,
     the honest result is "no data" for the new column rather than a number that
     visibly exceeds the total above it. Those foods are reported so the
     underlying disagreement can be dealt with deliberately.

     Each fraction is checked against the total it belongs to: the named omegas
     against monounsaturated and polyunsaturated, and the named saturated fats
     against the saturated total in the macronutrient group. None of these lists
     is the whole of its total, so the sum may fall short of it but must never
     exceed it. */
  const SUBSET = {
    mufa: ["oleic", "palmitoleic"],
    pufa: ["ala", "la"],
    satfat: ["lauric", "palmitic", "stearic"],
  };
  const conflicts = [], standing = [];
  for (const [total, parts] of Object.entries(SUBSET)) {
    const ti = IDX.get(total), pis = parts.map(p => IDX.get(p)).filter(i => i !== undefined);
    if (ti === undefined || !pis.length) continue;
    for (const f of data.foods) {
      const t = f.v[ti];
      if (typeof t !== "number") continue;
      const sum = pis.reduce((s, i) => s + (typeof f.v[i] === "number" ? f.v[i] : 0), 0);
      if (sum <= t * 1.01 + 0.005) continue;
      const where = `${f.name} (${parts.join("+")} ${sum.toFixed(3)} vs ${total} ${t})`;
      /* Withhold only what this run wrote. A disagreement between values that
         were already in the table is a real problem, but it is not this run's
         to resolve, and deleting a figure the tool did not put there would lose
         data on the way to filling a gap somewhere else. Report it instead. */
      const mine = pis.filter(i => wrote.has(`${slugify(f)} ${i}`));
      if (!mine.length) { standing.push(where); continue; }
      conflicts.push(where);
      mine.forEach(i => { f.v[i] = null; filled--; });
    }
  }

  /* Provenance is recorded last, so a value the check above withheld does not
     keep a marker explaining where a number that is no longer there came from. */
  const bySlug = new Map(data.foods.map(f => [slugify(f), f]));
  const kept = viaFallback.filter(([slug, col]) => bySlug.get(slug).v[IDX.get(col)] !== null);
  recordFallbacks(data, new Set(ids.map(id => KNOWN[id].id)), kept);

  console.log(`\n${filled} values filled, ${missing.length} left as "no data"` +
    (held ? `, ${held} existing values left untouched (--fill-gaps)` : ""));
  if (missing.length) console.log(`  ${missing.join(", ")}`);
  if (preserved.length) {
    console.log(`\n${preserved.length} existing figure(s) kept: the mapped row has no value ` +
      `for them.\n  A pull never replaces a figure with nothing, so these were left as they are.`);
    preserved.forEach(p => console.log(`  ${p}`));
  }
  if (kept.length)
    console.log(`\n${kept.length} came from an undifferentiated id and are marked ` +
      `"${UNDIFF_NOTE.marker}" per cell.`);
  if (conflicts.length) {
    console.log(`\n${conflicts.length} withheld, existing totals disagree with the mapped USDA row:`);
    conflicts.forEach(c => console.log(`  ${c}`));
    console.log(`  Left as "no data". Re-pulling the whole fat group from the mapped\n` +
                `  rows would resolve these, at the cost of changing existing values.`);
  }
  if (standing.length) {
    console.log(`\n${standing.length} disagreement(s) already in the table, left alone:`);
    standing.forEach(c => console.log(`  ${c}`));
    console.log(`  Nothing this run wrote is involved, so nothing was withheld.`);
  }
  if (dry) { console.log("\n--dry-run: nothing written"); return; }
  await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
  console.log(`\nwrote ${DATA}, run 'npm test' to verify`);
}

/* ---------- add foods ----------
   Every column for a new food comes from one USDA row. That matters for the
   amino acids: the existing rows derive them from a per-protein profile, which
   only differs from the source figures when the stored protein disagrees with
   USDA's. Sourcing a whole food from a single row makes the two identical, so
   no new methodology enters the table. */
const COLUMN_TO_USDA = {
  kcal: 1008, protein: 1003, carbs: 1005, fiber: 1079, sugars: 2000, fat: 1004,
  satfat: 1258, water: 1051, ala: 1404, la: 1316, epa: 1278, dha: 1272,
  palmitoleic: 1275, oleic: 1268,
  mufa: 1292, pufa: 1293, lauric: 1263, palmitic: 1265, stearic: 1266,
  his: 1221, ile: 1212, leu: 1213, lys: 1214, met: 1215,
  cys: 1216, phe: 1217, tyr: 1218, thr: 1211, trp: 1210, val: 1219, arg: 1220,
  alaa: 1222, asp: 1223, glu: 1224, gly: 1225, pro: 1226, ser: 1227, vita: 1106,
  vitc: 1162, vitd: 1114, vite: 1109, gammatoc: 1126, vitk: 1185, b1: 1165, b2: 1166, b3: 1167,
  b5: 1170, b6: 1175, b9: 1177, b12: 1178, chol: 1180, ca: 1087, fe: 1089,
  mg: 1090, p: 1091, k: 1092, na: 1093, zn: 1095, cu: 1098, mn: 1101, se: 1103,
  betacar: 1107, alphacar: 1108, cryptox: 1120, luteinzea: 1123, lycopene: 1122,
  phytosterols: 1283,
};

/* Columns SR Legacy cannot fill. It defines nutrient ids for the flavonoids but
   carries a value for none of them in any row, so these come from a separate
   release and a separate tool. A food added here gets "no data" for them until
   `flavonoids.mjs pull` runs, which is correct rather than a gap: most foods
   have no flavonoid measurement at all. Listing them explicitly, rather than
   letting the check ignore anything unmapped, keeps a genuinely forgotten
   column an error. */
const FROM_OTHER_SOURCE = {
  anthocyanidins: "flavonoids.mjs", flavan3ols: "flavonoids.mjs", flavonols: "flavonoids.mjs",
};

async function cmdAdd(args) {
  const dry = args.includes("--dry-run");
  await ensureDataset();
  const data = await readData();
  const spec = JSON.parse(await readFile(join(ROOT, "tools", "food-additions.json"), "utf8"));

  const unknown = data.nutrients
    .filter(n => !COLUMN_TO_USDA[n.id] && !FROM_OTHER_SOURCE[n.id]).map(n => n.id);
  if (unknown.length) throw new Error(`no USDA id mapped for column(s): ${unknown.join(", ")}`);

  const additions = [...(spec.requested || []), ...(spec.staples || [])];
  const names = await readCSV("food.csv");
  const desc = new Map(names.map(r => [r.fdc_id, r.description]));
  const primaries = Object.values(COLUMN_TO_USDA);
  const vals = await loadNutrients(
    [...primaries, ...primaries.map(id => FALLBACK[id]).filter(Boolean)]);

  const have = new Set(data.foods.map(slugify));
  let added = 0, skipped = 0;
  const thin = [], fellBack = [];
  for (const f of additions) {
    if (!desc.has(f.fdc_id)) throw new Error(`${f.name}: fdc_id ${f.fdc_id} is not in SR Legacy`);
    if (have.has(slugify(f))) { skipped++; continue; }
    const v = vals.get(f.fdc_id) || {};
    const row = data.nutrients.map(n => {
      const primary = COLUMN_TO_USDA[n.id];
      let a = v[String(primary)];
      // A new food gets the same fallback treatment as a pulled column, and the
      // same per-cell marker, so where a figure came from does not depend on
      // which route the food arrived by.
      if (a === undefined && FALLBACK[primary]) {
        a = v[String(FALLBACK[primary])];
        if (a !== undefined) fellBack.push([slugify(f), n.id]);
      }
      return a === undefined ? null : a;
    });
    const filled = row.filter(x => x !== null).length;
    if (filled < data.nutrients.length * 0.5)
      thin.push(`${f.name} (${filled}/${data.nutrients.length} values)`);
    const food = { name: f.name, state: f.state || "", cat: f.cat, colour: f.colour, v: row };
    if (f.alt) food.alt = f.alt;
    data.foods.push(food);
    have.add(slugify(f));
    added++;
    console.log(`  + ${f.name.padEnd(22)} ${String(filled).padStart(2)}/${data.nutrients.length}  ${desc.get(f.fdc_id).slice(0, 46)}`);
  }

  // Alternative names for foods that were already in the table.
  let alts = 0;
  for (const [slug, alt] of Object.entries(spec.alt_names_for_existing || {})) {
    const f = data.foods.find(x => slugify(x) === slug);
    if (!f) { console.log(`  ! no food matches "${slug}" for alt name "${alt}"`); continue; }
    if (f.alt !== alt) { f.alt = alt; alts++; }
  }

  // An empty `owned` set: this only ever adds provenance for the foods just
  // added, and must not disturb the markers already recorded for existing ones.
  recordFallbacks(data, new Set(), fellBack);

  console.log(`\n${added} foods added, ${skipped} already present, ${alts} alternative names set`);
  if (fellBack.length)
    console.log(`  ${fellBack.length} value(s) came from an undifferentiated id, marked per cell.`);
  if (added) {
    const others = [...new Set(Object.values(FROM_OTHER_SOURCE))];
    console.log(`  Columns SR Legacy cannot fill are left as "no data". Run ` +
      `${others.join(", ")} to\n  see whether the new foods have one.`);
  }
  if (thin.length) {
    console.log(`\n${thin.length} with sparse data (USDA has no figure for many columns):`);
    thin.forEach(t => console.log(`  ${t}`));
  }
  for (const [n, why] of Object.entries(spec.unavailable || {}))
    console.log(`\n  not added, ${n}: ${why}`);
  if (dry) { console.log("\n--dry-run: nothing written"); return; }
  await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
  console.log(`\nwrote ${DATA}, run 'npm test' to verify`);
}

/* Only dispatch when run as a script. Importing this module, which the tool
   tests do, must not execute a command. `import.meta.main` would say this more
   directly but landed in Node 24, and CI pins Node 20. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    if (cmd === "match") await cmdMatch();
    else if (cmd === "pull") await cmdPull(rest);
    else if (cmd === "add") await cmdAdd(rest);
    else {
      console.error("usage: usda.mjs match | pull <nutrientId>... [--fill-gaps] [--dry-run] | add [--dry-run]");
      process.exit(1);
    }
  } catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
}
