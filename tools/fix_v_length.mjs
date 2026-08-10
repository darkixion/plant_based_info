import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/data/nutrients.json'));
const vCount = data.nutrients.filter(n => !n.evidence).length;

for (const food of data.foods) {
  if (food.v.length > vCount) {
    food.v = food.v.slice(0, vCount);
  }
}

fs.writeFileSync('src/data/nutrients.json', JSON.stringify(data, null, 1) + "\n");
