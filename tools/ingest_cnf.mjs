import fs from 'fs';
import { readCSV } from './csv.mjs';

function stripBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

async function main() {
  const foodsRaw = await readCSV('tools/cache/cnf/food_name.csv');
  const amountsRaw = await readCSV('tools/cache/cnf/nutrient_amount.csv');
  const nutrientsRaw = await readCSV('tools/cache/cnf/nutrient_name.csv');

  // Strip BOM from object keys if necessary
  const fixObj = (obj) => {
    const fixed = {};
    for (const [k, v] of Object.entries(obj)) {
      fixed[stripBOM(k)] = v;
    }
    return fixed;
  };
  
  const foods = foodsRaw.map(fixObj);
  const amounts = amountsRaw.map(fixObj);
  const nutrients = nutrientsRaw.map(fixObj);

  const nutrientMap = new Map();
  for (const n of nutrients) {
    nutrientMap.set(n.Nutrient_Code, n.Nutrient_Name_EN || n.Nutrient_Symbol);
  }

  const foodMap = new Map();
  for (const f of foods) {
    const id = f.Food_Code;
    foodMap.set(id, { key: String(id), name: f.Food_Description_EN || "Unknown" });
  }

  for (const a of amounts) {
    const food = foodMap.get(a.Food_Code);
    if (!food) continue;
    const nName = nutrientMap.get(a.Nutrient_Code);
    if (nName) {
      food[nName] = Number(a.Nutrient_Amount);
    }
  }

  const out = Array.from(foodMap.values());
  fs.writeFileSync('tools/evidence/cnf.json', JSON.stringify(out, null, 2));
  console.log(`Ingested ${out.length} foods into tools/evidence/cnf.json`);
}
main().catch(console.error);
