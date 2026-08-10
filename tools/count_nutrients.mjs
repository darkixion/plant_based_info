import fs from 'fs';

const nutrientsData = JSON.parse(fs.readFileSync('src/data/nutrients.json', 'utf8'));
const evidenceData = JSON.parse(fs.readFileSync('src/data/evidence.json', 'utf8'));

const foods = nutrientsData.foods;
const nutrients = nutrientsData.nutrients;

// Determine non-evidence vs evidence
const nonEvidenceNutrients = nutrients.filter(n => !n.evidence);

const counts = {};

for (const n of nutrients) {
  counts[n.name || n.label || n.id] = 0;
}

// 1. Count non-evidence nutrients from `foods[].v`
for (const food of foods) {
  for (let i = 0; i < nonEvidenceNutrients.length; i++) {
    const val = food.v[i];
    if (val !== null && val !== undefined) {
      const nName = nonEvidenceNutrients[i].name || nonEvidenceNutrients[i].label || nonEvidenceNutrients[i].id;
      counts[nName]++;
    }
  }
}

// 2. Count evidence nutrients from `evidence.json`
// evidence.json structure: { [slug]: { cells: { [nutrientId]: { value: ... } } } }
for (const slug in evidenceData) {
  const foodData = evidenceData[slug];
  if (foodData && foodData.cells) {
    for (const nutrientId in foodData.cells) {
      const cell = foodData.cells[nutrientId];
      // find the nutrient name
      const n = nutrients.find(n => n.id === nutrientId);
      if (n) {
        const nName = n.name || n.label || n.id;
        if (cell.value !== null && cell.value !== undefined) {
          counts[nName]++;
        }
      }
    }
  }
}

let md = "| Nutrient | Foods with Data |\n| :--- | :--- |\n";
const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
for (const key of sorted) {
  md += `| ${key} | ${counts[key]} |\n`;
}

fs.writeFileSync('/home/thom/.gemini/antigravity/brain/ea5f0575-789a-48d0-9899-0c8c6c4be091/nutrient_counts.md', md);
