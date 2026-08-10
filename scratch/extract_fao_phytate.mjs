import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

const excelPath = 'tools/cache/fao_phytate.xlsx';
const targetUrl = 'https://www.fao.org/fileadmin/templates/food_composition/documents/PhyFoodComp_1.0.xlsx';
const outputPath = 'tools/evidence/fao-phytate.json';

if (!fs.existsSync(excelPath)) {
  console.log(`Downloading FAO Phytate Database from ${targetUrl}...`);
  const response = await fetch(targetUrl);
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  fs.mkdirSync(path.dirname(excelPath), { recursive: true });
  fs.writeFileSync(excelPath, Buffer.from(arrayBuffer));
}

const wb = xlsx.readFile(excelPath);
const plantSheets = [
  '01 Cereals',
  '02 Starchy Roots & Tubers',
  '03 Legumes',
  '04 Nuts & Seeds',
  '05 Vegetables',
  '06 Fruits',
  '11 Herbs & Spices'
];

const results = [];

for (const sheetName of plantSheets) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet missing: ${sheetName}`);
    continue;
  }

  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 2) continue;

  const headers = data[0].map(h => String(h || '').trim());
  const nameIdx = headers.findIndex(h => /foodname in english/i.test(h) || /^name$/i.test(h) || /food name/i.test(h));
  if (nameIdx === -1) {
    console.log(`Could not find food name column in ${sheetName}`);
    continue;
  }

  // Identify phytate column indices
  const phytCols = headers.map((h, idx) => {
    if (/^PHYT-|^PHYTCPPD|^PHYTC-|^PHYTCPP/i.test(h)) return { idx, type: 'direct' };
    if (/^PHYTCPPI/i.test(h)) return { idx, type: 'p' };
    return null;
  }).filter(Boolean);

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (!row || !row[nameIdx]) continue;

    const foodName = String(row[nameIdx]).trim();
    if (!foodName || foodName.toLowerCase().includes('foodname')) continue;

    let phytateVal = null;
    for (const col of phytCols) {
      const raw = row[col.idx];
      if (raw !== undefined && raw !== null && raw !== '' && raw !== 'Tr' && raw !== '-') {
        const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          if (col.type === 'direct') {
            phytateVal = num;
            break;
          } else if (col.type === 'p' && phytateVal === null) {
            phytateVal = Math.round(num * (660.04 / 185.88) * 100) / 100;
          }
        }
      }
    }

    if (phytateVal !== null) {
      results.push({
        food: foodName,
        phytate_mg_100g: phytateVal
      });
    }
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} phytate entries to ${outputPath}`);
