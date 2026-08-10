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
  
  // Find indices for ID and Name
  const headers = data[0];
  if (!headers) continue;
  
  const idIndex = headers.indexOf('Food Item ID');
  const nameIndex = headers.indexOf('Foodname in English');
  
  if (idIndex === -1 || nameIndex === -1) continue;
  
  for (let i = 3; i < data.length; i++) { // Skip headers (first 3 rows)
    const row = data[i];
    const id = row[idIndex];
    const name = row[nameIndex];
    if (id && name) {
      allFoods.push({ key: String(id), name: String(name) });
    }
  }
}

fs.writeFileSync('scratch/infoods_list.json', JSON.stringify(allFoods, null, 2));
console.log(`Extracted ${allFoods.length} foods from INFOODS.`);
