import fs from 'node:fs';
import xlsx from 'xlsx';

const wb = xlsx.readFile('tools/cache/fao_phytate.xlsx');

const plantSheets = wb.SheetNames.filter(s =>
  /^0[1-6]/.test(s) || /^15 /.test(s)
);
console.log('Processing sheets:', plantSheets);

const results = [];

for (const sheetName of plantSheets) {
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header:1});
  if (data.length < 3) continue;

  const headers = data[0].map(h => String(h || '').trim());
  const nameIdx = headers.indexOf('Food name in English');
  const procIdx = headers.indexOf('Processing / Influencing factors');
  const speciesIdx = headers.indexOf('Species/Subspecies');

  // Find phytate columns (prefer PHYTCPPD > PHYTCPP > PHYTCPPI > PHYTCA > PHYTC-)
  const phytCols = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h === 'PHYTCPPD(mg)') phytCols.push({idx: i, priority: 1, type: 'direct'});
    else if (h === 'PHYTCPP(mg)') phytCols.push({idx: i, priority: 2, type: 'direct'});
    else if (h === 'PHYTCPPI(mg)') phytCols.push({idx: i, priority: 3, type: 'direct'});
    else if (h === 'PHYTCA (mg)') phytCols.push({idx: i, priority: 4, type: 'direct'});
    else if (h === 'PHYTC-(mg)') phytCols.push({idx: i, priority: 5, type: 'direct'});
    else if (h === 'PPI(mg)') phytCols.push({idx: i, priority: 10, type: 'pp'});
    else if (h === 'PPD(mg)') phytCols.push({idx: i, priority: 11, type: 'pp'});
    else if (h === 'PP-(mg)') phytCols.push({idx: i, priority: 12, type: 'pp'});
  }
  phytCols.sort((a, b) => a.priority - b.priority);

  // Skip header row 1 (descriptions row)
  for (let r = 2; r < data.length; r++) {
    const row = data[r];
    if (!row || !row[nameIdx]) continue;

    const foodName = String(row[nameIdx]).trim();
    if (!foodName) continue;

    const processing = row[procIdx] ? String(row[procIdx]).trim() : '';
    const species = row[speciesIdx] ? String(row[speciesIdx]).trim() : '';

    let phytateVal = null;
    let method = null;
    for (const col of phytCols) {
      const raw = row[col.idx];
      if (raw !== undefined && raw !== null && raw !== '' && raw !== 'Tr' && raw !== '-') {
        const num = parseFloat(String(raw));
        if (!isNaN(num) && num >= 0) {
          if (col.type === 'direct') {
            phytateVal = Math.round(num * 100) / 100;
            method = headers[col.idx];
          } else if (col.type === 'pp') {
            // Convert phytate phosphorus to phytic acid: multiply by 3.55
            phytateVal = Math.round(num * 3.55 * 100) / 100;
            method = headers[col.idx] + ' (converted)';
          }
          break;
        }
      }
    }

    if (phytateVal !== null && phytateVal > 0) {
      results.push({
        food: foodName,
        processing,
        species,
        group: sheetName,
        phytate_mg_100g: phytateVal,
        method
      });
    }
  }
}

fs.writeFileSync('tools/evidence/fao-phytate.json', JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} phytate entries`);

// Quick summary
const groups = {};
for (const r of results) {
  groups[r.group] = (groups[r.group] || 0) + 1;
}
console.log('By group:', groups);
