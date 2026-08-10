import fs from 'fs';

const validSlugs = fs.readFileSync('valid_foods.txt', 'utf8').split('\n').filter(Boolean);
const nutrients = JSON.parse(fs.readFileSync('src/data/nutrients.json', 'utf8')).foods;
const afcd = JSON.parse(fs.readFileSync('tools/evidence/afcd-r3-plant.json', 'utf8'));

const usdaNames = {};
for (const food of nutrients) {
  if (validSlugs.includes(food.slug)) {
    usdaNames[food.slug] = food.name;
  }
}

const targets = validSlugs.map(slug => ({
  slug,
  name: usdaNames[slug] || slug
}));

const afcdList = afcd.map(f => ({ key: f.key, name: f.name }));

if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
fs.writeFileSync('scratch/afcd_list.json', JSON.stringify(afcdList, null, 2));

const chunkSize = Math.ceil(targets.length / 3);
for (let i = 0; i < 3; i++) {
  const chunk = targets.slice(i * chunkSize, (i + 1) * chunkSize);
  fs.writeFileSync(`scratch/target_batch_${i+1}.json`, JSON.stringify(chunk, null, 2));
}

console.log('Batches created.');
