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
 * run paired "Black beans" with "Black pudding, boiled" — blood sausage — purely
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

const exec = promisify(execFile);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CACHE = join(ROOT, "tools", "cache");
const CSV_DIR = join(CACHE, "FoodData_Central_sr_legacy_food_csv_2018-04");
const ZIP_URL = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip";
const DATA = join(ROOT, "src", "data", "nutrients.json");
const MAP = join(ROOT, "src", "data", "usda-map.json");

/* USDA nutrient ids we know how to describe. Extend as needed. */
const KNOWN = {
  // Named to match the existing "Omega-3 (ALA)" / "Omega-6 (LA)" columns.
  // 18:1 is undifferentiated in SR Legacy — it includes a little n-7 vaccenic
  // alongside the n-9 oleic — but in plant foods it is overwhelmingly oleic.
  // The Methodology dialog states this; the label should not overclaim.
  1268: { id: "oleic", label: "Omega-9 (oleic)", group: "fats", unit: "g", dv: null, dp: 3 },
  1275: { id: "palmitoleic", label: "Omega-7 (palmitoleic)", group: "fats", unit: "g", dv: null, dp: 3 },
};

/* Columns used to fingerprint a food. Deliberately wide: energy and macros
   alone collide across unrelated foods, minerals disambiguate them. */
const FINGERPRINT = [
  ["1008", "kcal"], ["1003", "protein"], ["1004", "fat"], ["1005", "carbs"],
  ["1079", "fiber"], ["1087", "ca"], ["1089", "fe"], ["1092", "k"], ["1093", "na"],
];

const slugify = f => `${f.name} ${f.state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- csv ---------- */
/** Minimal RFC4180 reader; the USDA files quote fields containing commas. */
function* parseCSV(text) {
  let i = 0, field = "", row = [], quoted = false;
  const end = text.length;
  while (i < end) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); yield row; row = []; field = ""; }
    else if (c !== "\r") field += c;
    i++;
  }
  if (field || row.length) { row.push(field); yield row; }
}

async function readCSV(name) {
  const text = await readFile(join(CSV_DIR, name), "utf8");
  const it = parseCSV(text);
  const head = it.next().value;
  const out = [];
  for (const r of it) {
    if (r.length === 1 && !r[0]) continue;
    const o = {};
    head.forEach((h, i) => { o[h] = r[i]; });
    out.push(o);
  }
  return out;
}

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
  catch { throw new Error(`could not unzip ${zip} — is 'unzip' installed?`); }
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
    if (!best) { report.push(["NONE", f.name, "—"]); continue; }
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
    `— check them, then set "reviewed": true on every entry you accept.`);
}

/* ---------- pull ---------- */
async function cmdPull(args) {
  const dry = args.includes("--dry-run");
  const ids = args.filter(a => /^\d+$/.test(a)).map(Number);
  if (!ids.length) throw new Error("give at least one USDA nutrient id, e.g. 1268 1275");
  for (const id of ids) if (!KNOWN[id]) throw new Error(`nutrient ${id} has no column definition in KNOWN`);

  await ensureDataset();
  const data = await readData();
  const map = JSON.parse(await readFile(MAP, "utf8"));
  const unreviewed = Object.entries(map).filter(([, m]) => !m.reviewed);
  if (unreviewed.length)
    throw new Error(`${unreviewed.length} mapping(s) not reviewed: ` +
      `${unreviewed.slice(0, 4).map(([k]) => k).join(", ")}${unreviewed.length > 4 ? "…" : ""}\n` +
      `  Check them in ${MAP} and set "reviewed": true.`);

  const vals = await loadNutrients(ids);

  // Insert new columns at the end of their group so the table order stays sane.
  for (const id of ids) {
    const def = KNOWN[id];
    if (data.nutrients.some(n => n.id === def.id)) { console.log(`  ${def.id}: already present, updating values`); continue; }
    const last = data.nutrients.map((n, i) => [n, i]).filter(([n]) => n.group === def.group).pop();
    data.nutrients.splice(last[1] + 1, 0, { ...def });
    data.foods.forEach(f => f.v.splice(last[1] + 1, 0, null));
    console.log(`  + column ${def.id} (${def.label}) after position ${last[1]}`);
  }

  const IDX = new Map(data.nutrients.map((n, i) => [n.id, i]));
  let filled = 0, missing = [];
  for (const f of data.foods) {
    const m = map[slugify(f)];
    for (const id of ids) {
      const col = IDX.get(KNOWN[id].id);
      const v = m && vals.get(m.fdc_id)?.[String(id)];
      if (v === undefined || v === null) { f.v[col] = null; missing.push(`${f.name}/${KNOWN[id].id}`); }
      else { f.v[col] = v; filled++; }
    }
  }

  /* Never write a value that contradicts a total already in the table. Where a
     food's existing fat fractions disagree with the USDA row we mapped it to,
     the honest result is "no data" for the new column rather than a number that
     visibly exceeds the total above it. Those foods are reported so the
     underlying disagreement can be dealt with deliberately. */
  const SUBSET = { mufa: ["oleic", "palmitoleic"] };
  const conflicts = [];
  for (const [total, parts] of Object.entries(SUBSET)) {
    const ti = IDX.get(total), pis = parts.map(p => IDX.get(p)).filter(i => i !== undefined);
    if (ti === undefined || !pis.length) continue;
    for (const f of data.foods) {
      const t = f.v[ti];
      if (typeof t !== "number") continue;
      const sum = pis.reduce((s, i) => s + (typeof f.v[i] === "number" ? f.v[i] : 0), 0);
      if (sum > t * 1.01 + 0.005) {
        conflicts.push(`${f.name} (${parts.join("+")} ${sum.toFixed(3)} vs ${total} ${t})`);
        pis.forEach(i => { if (typeof f.v[i] === "number") { f.v[i] = null; filled--; } });
      }
    }
  }

  console.log(`\n${filled} values filled, ${missing.length} left as "no data"`);
  if (missing.length) console.log(`  ${missing.join(", ")}`);
  if (conflicts.length) {
    console.log(`\n${conflicts.length} withheld — existing totals disagree with the mapped USDA row:`);
    conflicts.forEach(c => console.log(`  ${c}`));
    console.log(`  Left as "no data". Re-pulling the whole fat group from the mapped\n` +
                `  rows would resolve these, at the cost of changing existing values.`);
  }
  if (dry) { console.log("\n--dry-run: nothing written"); return; }
  await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
  console.log(`\nwrote ${DATA} — run 'npm test' to verify`);
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === "match") await cmdMatch();
  else if (cmd === "pull") await cmdPull(rest);
  else { console.error("usage: usda.mjs match | pull <nutrientId>... [--dry-run]"); process.exit(1); }
} catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
