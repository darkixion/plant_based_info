import fs from 'fs';

const validSlugs = fs.readFileSync('valid_foods.txt', 'utf8').split('\n').filter(Boolean);
const nutrients = JSON.parse(fs.readFileSync('src/data/nutrients.json', 'utf8')).foods;
const frida = JSON.parse(fs.readFileSync('tools/evidence/frida-6.1.json', 'utf8'));

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

const fridaList = frida.map(f => ({ key: f.FoodID, name: f.name }));

if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
fs.writeFileSync('scratch/frida_list.json', JSON.stringify(fridaList, null, 2));

const chunkSize = Math.ceil(targets.length / 3);
for (let i = 0; i < 3; i++) {
  const chunk = targets.slice(i * chunkSize, (i + 1) * chunkSize);
  fs.writeFileSync(`scratch/frida_target_batch_${i+1}.json`, JSON.stringify(chunk, null, 2));
}

console.log('Frida batches created.');
