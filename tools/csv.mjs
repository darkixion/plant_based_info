/**
 * The CSV reader the USDA tools share.
 *
 * Minimal RFC4180: a quoted field can contain a comma, and the USDA food
 * descriptions are full of them. Extracted from usda.mjs and flavonoids.mjs,
 * which each carried an identical copy before portions.mjs would have made a
 * third.
 *
 * `readCSV` takes a full path rather than a name, because the three tools read
 * from three different directories.
 */
import { readFile } from "node:fs/promises";

export function* parseCSV(text) {
  let i = 0, field = "", row = [], quoted = false;
  while (i < text.length) {
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

export async function readCSV(path) {
  const it = parseCSV(await readFile(path, "utf8"));
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
