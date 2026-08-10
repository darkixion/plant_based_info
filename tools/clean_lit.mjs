import fs from 'fs';
const valids = fs.readFileSync('valid_foods.txt', 'utf8').split('\n').filter(Boolean);
const lit = JSON.parse(fs.readFileSync('tools/evidence/literature.json'));
const clean = lit.filter(f => valids.includes(f.key));
fs.writeFileSync('tools/evidence/literature.json', JSON.stringify(clean, null, 2));
