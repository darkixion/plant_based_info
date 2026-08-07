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

/** Exported so test/tools.mjs can exercise it without a build. Every rule here
 *  refuses a shape that would render as plausible data rather than as an error,
 *  which is the same standard the notes and portions checks above are held to. */
export function checkEvidence(evidence, nutrients, foods, sources) {
  const problems = [];
  const slug = f => `${f.name} ${f.state || ""}`.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bySlug = new Map(foods.map(f => [slug(f), f]));
  const evIds = new Set(nutrients.filter(n => n.evidence).map(n => n.id));

  for (const [foodSlug, entry] of Object.entries(evidence || {})) {
    const food = bySlug.get(foodSlug);
    if (!food) { problems.push(`evidence for unknown food "${foodSlug}"`); continue; }

    /* The mapping, checked once per food rather than once per cell. Preparation
       is the sharpest edge in this data: a correct value against the wrong
       preparation is worse than none, because it looks right. */
    if (!entry.match) problems.push(`evidence ${foodSlug}: no match grade`);
    else if (!EV_MATCH.has(entry.match))
      problems.push(`evidence ${foodSlug}: unknown match grade "${entry.match}"`);
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
        else for (const s of c.sources)
          if (!sources[s]) problems.push(`${at}: unknown source "${s}"`);
      }
      if ((c.state === "measured" || c.state === "estimated") && typeof c.value !== "number")
        problems.push(`${at}: ${c.state} with no value`);
      if (c.state === "range") {
        if (typeof c.low !== "number" || typeof c.high !== "number")
          problems.push(`${at}: range with no bounds`);
        else if (!(c.high > c.low))
          problems.push(`${at}: range bounds are equal or inverted, which means reconciliation was skipped`);
      }
    }
  }
  return problems;
}

// `srcs` rather than `sources`, which the interactions block below already
// declares from `inter`. A parameter and a const of one name is a syntax error.
function validate(data, portions, inter, gaps, evidence, srcs) {
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
  // fall short but must never exceed. Polyunsaturated is deliberately absent:
  // the pull already checks it, and adding it here too would be redundant
  // rather than newly correct. The fat-group re-pull resolved the six foods
  // that used to disagree, so the check would pass if it were moved; doing so
  // is on the open list in HANDOVER.md rather than done here.
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
      if (!ids.has(id)) problems.push(`${at} names nutrient "${id}", which does not exist`);
      // A gap's evidence is counted over `v`: how many foods carry any, how
      // many were measured and found to contain none, how many were never
      // assayed. An evidence column has no `v` to count, so the entry would
      // render as a claim with nothing under it.
      else if (evIds.has(id))
        problems.push(`${at} names "${id}", which is an evidence column and has no figures to count`);
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

  problems.push(...checkEvidence(evidence, nutrients, foods, srcs));
  // A citation nobody uses is the same fault as an uncited claim, read from the
  // other end, and the same check the interactions and gaps sources get.
  for (const key of Object.keys(srcs || {}))
    if (!Object.values(evidence || {}).some(entry =>
        Object.values(entry.cells || {}).some(c => (c.sources || []).includes(key))))
      problems.push(`sources: "${key}" is cited by no evidence cell`);

  return problems;
}

async function build() {
  for (const [name, path] of Object.entries(SOURCES))
    if (!existsSync(path)) throw new Error(`missing source: ${name} (${path})`);

  const [html, css, app, dataRaw, iconsRaw, portionsRaw, interRaw, gapsRaw,
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

  let gaps;
  try { gaps = JSON.parse(gapsRaw); }
  catch (e) { throw new Error(`gaps.json is not valid JSON: ${e.message}`); }

  let evidence;
  try { evidence = JSON.parse(evidenceRaw); }
  catch (e) { throw new Error(`evidence.json is not valid JSON: ${e.message}`); }

  let srcs;
  try { srcs = JSON.parse(sourceRaw); }
  catch (e) { throw new Error(`sources.json is not valid JSON: ${e.message}`); }

  const problems = validate(data, portions, inter, gaps, evidence, srcs);
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
