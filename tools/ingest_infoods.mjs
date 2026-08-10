import xlsx from 'xlsx';
import fs from 'fs';

const wb = xlsx.readFile('tools/cache/infoods.xlsx');
const targetSheets = [
  '01 Cereals',
  '02 Starchy Roots & Tubers',
  '03 Legumes',
  '04 Nuts & Seeds',
  '05 Vegetables',
  '06 Fruits',
  '11 Herbs & Spices'
];

let allFoods = [];

for (const sheetName of targetSheets) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) continue;
  
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const headers = data[0];
  const units = data[1]; // some headers have units in row 1 or 2
  
  const idIndex = headers.indexOf('Food Item ID');
  const nameIndex = headers.indexOf('Foodname in English');
  if (idIndex === -1) continue;
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const id = row[idIndex];
    const name = row[nameIndex];
    if (id) {
      const food = { key: String(id), name: String(name || "Unknown") };
      for (let j = 0; j < headers.length; j++) {
        const val = row[j];
        if (j !== idIndex && j !== nameIndex && val !== undefined && val !== '' && val !== 'Tr') {
          // just store everything for now
          const header = String(headers[j]).trim();
          if (header) food[header] = val;
        }
      }
      allFoods.push(food);
    }
  }
}

fs.writeFileSync('tools/evidence/infoods.json', JSON.stringify(allFoods, null, 2));
console.log(`Ingested ${allFoods.length} foods into tools/evidence/infoods.json`);
