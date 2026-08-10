import fs from 'fs';
const map1 = fs.existsSync('scratch/frida_map_1.json') ? JSON.parse(fs.readFileSync('scratch/frida_map_1.json', 'utf8')) : {};
const map2 = fs.existsSync('scratch/frida_map_2.json') ? JSON.parse(fs.readFileSync('scratch/frida_map_2.json', 'utf8')) : {};
const map3 = fs.existsSync('scratch/frida_map_3.json') ? JSON.parse(fs.readFileSync('scratch/frida_map_3.json', 'utf8')) : {};

const finalMap = { ...map1, ...map2, ...map3 };

// Filter out nulls
const cleaned = {};
for (const [k, v] of Object.entries(finalMap)) {
  if (v !== null) cleaned[k] = v;
}

fs.writeFileSync('tools/evidence/page-map-frida.json', JSON.stringify(cleaned, null, 2));
console.log('Merged into tools/evidence/page-map-frida.json');
