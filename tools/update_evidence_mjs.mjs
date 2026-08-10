import fs from 'fs';

let content = fs.readFileSync('tools/evidence.mjs', 'utf8');

// Load new files
const loadStatements = `
const cnfMap = rd("page-map-cnf.json");
const afcdMap = rd("page-map-afcd.json");
const cnf = rd("cnf.json");
const afcdDB = rd("afcd-r3-plant.json"); // separate from afcdBy which uses name
const cnfBy = Object.fromEntries(cnf.map(r => [r.key, r]));
const afcdKeyBy = Object.fromEntries(afcdDB.map(r => [r.key, r]));
const literature = rd("literature.json");
`;

content = content.replace(/const afcdBy = [^\n]+/, match => match + '\n' + loadStatements);

const newLoops = `
// AFCD integration
for (const p of Object.entries(afcdMap)) {
  const [slug, key] = p;
  if (!key) continue;
  if (!out[slug]) out[slug] = { prep: "as listed", match: "exact", cells: {} };
  const row = afcdKeyBy[key];
  if (row) {
    if (row.inulin_g !== undefined) {
      const val = num(row.inulin_g);
      if (val !== null) {
        if (!out[slug].cells.inulin) out[slug].cells.inulin = { state: "measured", sources: [], value: val, min: val, max: val, derivation: "analysed" };
        else out[slug].cells.inulin = reconcile([{ source: "afcd-r3", value: val, derivation: "analysed" }, { source: out[slug].cells.inulin.sources[0] || "existing", value: out[slug].cells.inulin.value, derivation: "analysed" }]);
        nCells++;
      }
    }
    if (row.oligosaccharides_g !== undefined) {
      const val = num(row.oligosaccharides_g);
      if (val !== null) {
        if (!out[slug].cells.oligosaccharides) out[slug].cells.oligosaccharides = { state: "measured", sources: [], value: val, min: val, max: val, derivation: "analysed" };
        else out[slug].cells.oligosaccharides = reconcile([{ source: "afcd-r3", value: val, derivation: "analysed" }, { source: out[slug].cells.oligosaccharides.sources[0] || "existing", value: out[slug].cells.oligosaccharides.value, derivation: "analysed" }]);
        nCells++;
      }
    }
  }
}

// CNF integration
for (const p of Object.entries(cnfMap)) {
  const [slug, key] = p;
  if (!key) continue;
  if (!out[slug]) out[slug] = { prep: "as listed", match: "exact", cells: {} };
  const row = cnfBy[key];
  if (row) {
    if (row["Fructans (inulin)"] !== undefined) {
      const val = num(row["Fructans (inulin)"]);
      if (val !== null) {
        const existing = out[slug].cells.inulin ? [{ source: "existing", value: out[slug].cells.inulin.value, derivation: "analysed" }] : [];
        out[slug].cells.inulin = reconcile([...existing, { source: "cnf", value: val, derivation: "analysed" }]);
        nCells++;
      }
    }
    if (row["Vitamin K (menaquinone-4)"] !== undefined) {
      const val = num(row["Vitamin K (menaquinone-4)"]);
      if (val !== null) {
        const existing = out[slug].cells.k2 ? [{ source: "existing", value: out[slug].cells.k2.value, derivation: "analysed" }] : [];
        out[slug].cells.k2 = reconcile([...existing, { source: "cnf", value: val, derivation: "analysed" }]);
        nCells++;
      }
    }
  }
}

// Literature integration
for (const lit of literature) {
  const slug = lit.key;
  if (!out[slug]) out[slug] = { prep: "as listed", match: "exact", cells: {} };
  
  if (lit.boron !== undefined) {
    const existing = out[slug].cells.boron ? [{ source: "existing", value: out[slug].cells.boron.value, derivation: "analysed" }] : [];
    out[slug].cells.boron = reconcile([...existing, { source: "literature", value: lit.boron, derivation: "analysed" }]);
    nCells++;
  }
  if (lit.inositol !== undefined) {
    const existing = out[slug].cells["inositol-free"] ? [{ source: "existing", value: out[slug].cells["inositol-free"].value, derivation: "analysed" }] : [];
    out[slug].cells["inositol-free"] = reconcile([...existing, { source: "literature", value: lit.inositol, derivation: "analysed" }]);
    nCells++;
  }
  if (lit.lignans !== undefined) {
    const existing = out[slug].cells.lignans ? [{ source: "existing", value: out[slug].cells.lignans.value, derivation: "analysed" }] : [];
    out[slug].cells.lignans = reconcile([...existing, { source: "literature", value: lit.lignans, derivation: "analysed" }]);
    nCells++;
  }
}
`;

content = content.replace(/writeFileSync\(join\(ROOT, "src", "data", "evidence.json"\)/, match => newLoops + '\n' + match);

fs.writeFileSync('tools/evidence.mjs', content);
console.log('Modified tools/evidence.mjs');
