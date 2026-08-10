import fs from 'fs';

// Read CNF food names
// Format: FoodID,FoodCode,FoodGroupID,FoodSourceID,FoodDescription,FoodDescriptionF,FoodDateOfEntry,FoodDateOfPublication,CountryCode,ScientificName
const cnfCsv = fs.readFileSync('tools/cache/cnf/food_name.csv', 'latin1');
const lines = cnfCsv.split(/\r?\n/);
const cnfFoods = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;
  // Handle basic CSV splitting with quotes
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  
  if (parts.length >= 5) {
    cnfFoods.push({ key: parts[0], name: parts[4] });
  }
}

const validSlugs = fs.readFileSync('valid_foods.txt', 'utf8').split('\n').filter(Boolean);
const nutrients = JSON.parse(fs.readFileSync('src/data/nutrients.json', 'utf8')).foods;

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

if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
fs.writeFileSync('scratch/cnf_list.json', JSON.stringify(cnfFoods, null, 2));

const chunkSize = Math.ceil(targets.length / 3);
for (let i = 0; i < 3; i++) {
  const chunk = targets.slice(i * chunkSize, (i + 1) * chunkSize);
  fs.writeFileSync(`scratch/cnf_target_batch_${i+1}.json`, JSON.stringify(chunk, null, 2));
}

console.log('CNF batches created.');
