#!/usr/bin/env node
/**
 * Reassembles src/ into a single self-contained index.html.
 *
 * The whole point of this project is a page you can open from disk, email to
 * someone, or serve from GitHub Pages with no server and no network calls. So
 * the build has no dependencies and does exactly one thing: inline everything.
 */
import { readFile, writeFile, watch } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "index.html");

const SOURCES = {
  html: join(SRC, "index.html"),
  css: join(SRC, "styles.css"),
  // A separately compiled file, not read from src/. `npm run watch` only
  // watches src/, so editing the app's source during a watch session needs
  // a fresh `npm run compile` too, or this keeps inlining the stale build.
  app: join(ROOT, "dist", "app.js"),
  data: join(SRC, "data", "nutrients.json"),
  icons: join(SRC, "data", "icons.json"),
  portions: join(SRC, "data", "portions.json"),
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

function validate(data, portions) {
  const problems = [];
  const { nutrients, foods } = data;

  if (!Array.isArray(nutrients) || !nutrients.length) problems.push("no nutrients");
  if (!Array.isArray(foods) || !foods.length) problems.push("no foods");
  if (problems.length) return problems;

  const ids = new Set();
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

  // A short or long value array silently misaligns every column after the gap,
  // which looks like plausible data rather than an error. Always check.
  const slugs = new Set();
  for (const f of foods) {
    if (!Array.isArray(f.v)) { problems.push(`${f.name}: no values array`); continue; }
    if (f.v.length !== nutrients.length)
      problems.push(`${f.name}: ${f.v.length} values for ${nutrients.length} nutrients`);
    const bad = f.v.findIndex(v => v !== null && typeof v !== "number");
    if (bad !== -1) problems.push(`${f.name}: non-numeric value at ${nutrients[bad]?.id ?? bad}`);

    const slug = `${f.name} ${f.state || ""}`.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (slugs.has(slug)) problems.push(`duplicate food key "${slug}", saved favourites would collide`);
    slugs.add(slug);
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
      for (const n of nutIds || [])
        if (!ids.has(n)) problems.push(`note ${note.id}: "${slug}" names unknown nutrient "${n}"`);
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
  // fall short but must never exceed. Polyunsaturated is deliberately absent:
  // six foods have carried an ALA-plus-LA total slightly above their own
  // polyunsaturated figure since long before either was checked, and those
  // values are recorded in the README rather than deleted to satisfy a new rule.
  const subsets = [
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
      // 5 and 500 are forced duplicates of MIN_G and MAX_G in
      // tools/portions.mjs: build.mjs may import nothing but node:*, so the
      // literals cannot be shared and must not quietly become an import.
      // Zero or negative would render a portion that sets a quantity of
      // nothing, under the floor is precision clampG would round away, and
      // above the cap is a purchase rather than a helping.
      if (typeof p.g !== "number" || !(p.g > 0) || p.g < 5 || p.g > 500) {
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
  return problems;
}

async function build() {
  for (const [name, path] of Object.entries(SOURCES))
    if (!existsSync(path)) throw new Error(`missing source: ${name} (${path})`);

  const [html, css, app, dataRaw, iconsRaw, portionsRaw] = await Promise.all(
    Object.values(SOURCES).map(p => readFile(p, "utf8")));

  let data, icons;
  try { data = JSON.parse(dataRaw); }
  catch (e) { throw new Error(`nutrients.json is not valid JSON: ${e.message}`); }
  try { icons = JSON.parse(iconsRaw); }
  catch (e) { throw new Error(`icons.json is not valid JSON: ${e.message}`); }
  let portions;
  try { portions = JSON.parse(portionsRaw); }
  catch (e) { throw new Error(`portions.json is not valid JSON: ${e.message}`); }

  const problems = validate(data, portions);
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

await run();

if (process.argv.includes("--watch")) {
  console.log("watching src/, ctrl-c to stop");
  let timer;
  for await (const _ of watch(SRC, { recursive: true })) {
    clearTimeout(timer);              // editors fire several events per save
    timer = setTimeout(run, 60);
  }
}
