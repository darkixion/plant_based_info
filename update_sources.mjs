import fs from 'fs';
const s = JSON.parse(fs.readFileSync('src/data/sources.json'));
s['cnf'] = { title: "Canadian Nutrient File (CNF)", quality: "high" };
s['literature'] = { title: "Scientific Literature Compilation", quality: "high" };
s['existing'] = { title: "Existing Pre-compiled Data", quality: "high" };
fs.writeFileSync('src/data/sources.json', JSON.stringify(s, null, 2) + "\n");
