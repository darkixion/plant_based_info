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
  app: join(SRC, "app.js"),
  data: join(SRC, "data", "nutrients.json"),
  icons: join(SRC, "data", "icons.json"),
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

function validate(data) {
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
    if (slugs.has(slug)) problems.push(`duplicate food key "${slug}" — saved favourites would collide`);
    slugs.add(slug);
  }
  return problems;
}

async function build() {
  for (const [name, path] of Object.entries(SOURCES))
    if (!existsSync(path)) throw new Error(`missing source: ${name} (${path})`);

  const [html, css, app, dataRaw, iconsRaw] = await Promise.all(
    Object.values(SOURCES).map(p => readFile(p, "utf8")));

  let data, icons;
  try { data = JSON.parse(dataRaw); }
  catch (e) { throw new Error(`nutrients.json is not valid JSON: ${e.message}`); }
  try { icons = JSON.parse(iconsRaw); }
  catch (e) { throw new Error(`icons.json is not valid JSON: ${e.message}`); }

  const problems = validate(data);
  if (problems.length)
    throw new Error(`data validation failed:\n  - ${problems.join("\n  - ")}`);

  let out = html;
  out = inject(out, "/*{{STYLES}}*/", css.trim());
  out = inject(out, "//{{DATA}}", `const DATA = ${safeJSON(data)};`);
  out = inject(out, "//{{ICONS}}", `const I = ${safeJSON(icons)};`);
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
  console.log("watching src/ — ctrl-c to stop");
  let timer;
  for await (const _ of watch(SRC, { recursive: true })) {
    clearTimeout(timer);              // editors fire several events per save
    timer = setTimeout(run, 60);
  }
}
